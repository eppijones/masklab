/**
 * Transports. One interface, three implementations; the UI never knows which.
 *
 * The transport is deliberately DUMB — it moves lines and knows nothing about
 * verbs, sequence numbers or machine state. That is precisely what makes
 * WebSerial today and a Raspberry Pi over the network later a config change
 * rather than a rewrite.
 */

import { CYCLE_MS, IDLE_HOLD_PCT, LIMITS } from '../machine/thermal.ts';
import { decodeCommand, type MachineState } from './protocol.ts';

export type TransportState = 'closed' | 'opening' | 'open' | 'error';

export interface TransportInfo {
  kind: 'sim' | 'webserial' | 'ws';
  label: string;
  /** True if panic can bypass the send queue (serial BREAK, ws close code). */
  outOfBandPanic: boolean;
}

export interface Transport {
  readonly info: TransportInfo;
  readonly state: TransportState;
  open(): Promise<void>;
  send(line: string): Promise<void>;
  onLine(cb: (line: string, tRxMs: number) => void): () => void;
  onState(cb: (s: TransportState, err?: Error) => void): () => void;
  /** Must not queue behind send(). */
  panic(): Promise<void>;
  close(): Promise<void>;
}

/* --------------------------------------------------------------- helpers -- */

function emitter<T extends unknown[]>() {
  const subs = new Set<(...a: T) => void>();
  return {
    on(cb: (...a: T) => void) {
      subs.add(cb);
      return () => subs.delete(cb);
    },
    fire(...a: T) {
      for (const s of subs) s(...a);
    },
  };
}

/* ------------------------------------------------------------------- sim -- */

export interface SimFaults {
  /** Every Nth cycle reports the loop as missed. */
  missEveryN?: number;
  /** Motor temperature climbs this fast while running, deg C per minute. */
  heatCPerMin?: number;
  /** Add this many ms to the device clock, to exercise skew handling. */
  clockSkewMs?: number;
  /** Corrupt one in N outgoing lines, to exercise the CRC path. */
  corruptEveryN?: number;
  /**
   * Run the sim clock faster than real time. 1 is realtime; 60 makes a 4.8 s
   * cycle take 80 ms. The UI uses this to preview a whole hat in a minute, and
   * the harness uses it so a cycle test does not take five seconds.
   */
  speedup?: number;
}

/**
 * A firmware model good enough to develop the whole UI against.
 *
 * This is not a stub that echoes OK. It integrates each axis toward its target
 * at the declared velocity, runs cycles on a clock, heats up while it works and
 * cools when idle, and can be told to lie in specific ways. The point is that
 * the entire control app — including the thermal governor and the run log — can
 * be finished and tested before a single part arrives from Elefun.
 */
export class SimTransport implements Transport {
  readonly info: TransportInfo = { kind: 'sim', label: 'simulator', outOfBandPanic: true };
  state: TransportState = 'closed';

  private lines = emitter<[string, number]>();
  private states = emitter<[TransportState, Error?]>();
  private timer: ReturnType<typeof setInterval> | null = null;

  private axes: Record<string, number> = { W: 0, P: 0, F: 0 };
  private targets: Record<string, number> = { W: 0, P: 0, F: 0 };
  private machine: MachineState = 'boot';
  private temps: Record<string, number> = { Tm: 21, Td: 22 };
  private cycleLeft = 0;
  private cycleIdx = 0;
  private cycleElapsed = 0;
  private out = 0;

  constructor(private faults: SimFaults = {}) {}

  setFaults(f: SimFaults) {
    this.faults = { ...this.faults, ...f };
  }

  async open() {
    this.state = 'opening';
    this.states.fire('opening');
    await new Promise((r) => setTimeout(r, 120));
    this.state = 'open';
    this.machine = 'idle';
    this.states.fire('open');
    this.emit(`log info HEKLOMAT V1 sim, proto ${1}`);
    this.timer = setInterval(() => this.tick(50), 50);
  }

  private emit(line: string) {
    this.out++;
    let l = line;
    if (this.faults.corruptEveryN && this.out % this.faults.corruptEveryN === 0) {
      l = `${l.slice(0, Math.max(1, l.length - 2))}~~`;
    }
    this.lines.fire(l, performance.now());
  }

  private simMs = 0;

  private devMs() {
    return this.simMs + (this.faults.clockSkewMs ?? 0);
  }

  private tick(realDtMs: number) {
    const dtMs = realDtMs * (this.faults.speedup ?? 1);
    const dt = dtMs / 1000;
    this.simMs += dtMs;

    // Integrate axes toward target at a fixed rate.
    for (const k of Object.keys(this.axes)) {
      const rate = k === 'F' ? 300 : k === 'W' ? 180 : 60;
      const d = this.targets[k] - this.axes[k];
      const step = Math.sign(d) * Math.min(Math.abs(d), rate * dt);
      this.axes[k] += step;
    }

    const working = this.machine === 'running' || this.machine === 'homing';

    // Thermal model. Degrees per SECOND while working, plus Newtonian cooling
    // toward ambient. Keep the units honest here: an earlier version folded dt
    // in twice and reached the cutout in a single tick, which looked exactly
    // like a working safety system and was in fact a broken clock.
    const AMBIENT_C = 21;
    const COOL_PER_S = 0.01;
    const risePerS = working ? (this.faults.heatCPerMin ?? 0.9) / 60 : 0;

    for (const k of Object.keys(this.temps)) {
      this.temps[k] += risePerS * dt;
      this.temps[k] -= (this.temps[k] - AMBIENT_C) * COOL_PER_S * dt;

      const limit = k === 'Td' ? LIMITS.driver.hardC : LIMITS.motor.hardC;
      if (this.temps[k] >= limit && this.machine !== 'fault') {
        this.machine = 'fault';
        this.cycleLeft = 0;
        this.emit(`ev thermal.trip sensor=${k} c=${this.temps[k].toFixed(1)} limit=${limit}`);
      }
    }

    // Cycle runner.
    if (this.machine === 'running' && this.cycleLeft > 0) {
      this.cycleElapsed += dtMs;
      const dur = CYCLE_MS.nominal * (0.94 + Math.random() * 0.12);
      if (this.cycleElapsed >= dur) {
        this.cycleElapsed = 0;
        this.cycleIdx++;
        this.cycleLeft--;
        const missed =
          this.faults.missEveryN && this.cycleIdx % this.faults.missEveryN === 0 ? 1 : 0;
        this.emit(`ev shutter seq=${this.cycleIdx}`);
        this.emit(
          `ev cycle.done n=${this.cycleIdx} ms=${Math.round(dur)} v=${missed ? 'fail' : 'ok'}`,
        );
        if (this.cycleLeft === 0) {
          this.machine = 'idle';
          this.emit(`ev run.done n=${this.cycleIdx}`);
        }
      }
    }

    // Telemetry once per real tick — the UI redraws at screen rate, not at
    // simulated rate, so speedup must not multiply the telemetry flood.
    {
      this.emit(
        `tel t=${Math.round(this.devMs())} ` +
          Object.entries(this.axes)
            .map(([k, v]) => `${k}=${v.toFixed(2)}`)
            .join(' ') +
          ` st=${this.machine} q=${this.cycleLeft} ` +
          Object.entries(this.temps)
            .map(([k, v]) => `${k}=${v.toFixed(1)}`)
            .join(' '),
      );
    }
  }

  async send(line: string) {
    const c = decodeCommand(line);
    if (!c) {
      this.emit('nak 0 reason=crc');
      return;
    }
    const a = c.args ?? {};

    switch (c.verb) {
      case 'hello':
        this.emit(`ok ${c.seq} proto=1 dev=heklomat-sim`);
        return;
      case 'cfg':
        this.emit(`ok ${c.seq} axes=WPF hold=${IDLE_HOLD_PCT} tmax=${LIMITS.motor.hardC}`);
        return;
      case 'home':
        this.machine = 'homing';
        this.targets = { W: 0, P: 0, F: 0 };
        this.emit(`ok ${c.seq}`);
        setTimeout(() => {
          this.machine = 'idle';
          this.emit('ev home.done');
        }, 700);
        return;
      case 'jog':
      case 'move': {
        const ax = String(a.ax ?? '');
        if (!(ax in this.axes)) {
          this.emit(`nak ${c.seq} reason=unknown`);
          return;
        }
        this.targets[ax] =
          c.verb === 'jog' ? this.targets[ax] + Number(a.d ?? 0) : Number(a.p ?? 0);
        this.emit(`ok ${c.seq}`);
        return;
      }
      case 'run':
        if (this.machine === 'fault' || this.machine === 'estopped') {
          this.emit(`nak ${c.seq} reason=estop`);
          return;
        }
        this.cycleLeft = Number(a.n ?? 1);
        this.cycleIdx = 0;
        this.machine = 'running';
        this.emit(`ok ${c.seq}`);
        return;
      case 'cycle':
        this.cycleLeft = 1;
        this.machine = 'running';
        this.emit(`ok ${c.seq}`);
        return;
      case 'stop':
        this.cycleLeft = 0;
        this.machine = 'idle';
        this.emit(`ok ${c.seq}`);
        return;
      case 'abort':
        this.cycleLeft = 0;
        this.machine = 'estopped';
        this.emit(`ok ${c.seq}`);
        return;
      case 'tel':
      case 'lamp':
      case 'verdict':
        this.emit(`ok ${c.seq}`);
        return;
      default:
        this.emit(`nak ${c.seq} reason=unknown`);
    }
  }

  onLine(cb: (l: string, t: number) => void) {
    return this.lines.on(cb);
  }
  onState(cb: (s: TransportState, e?: Error) => void) {
    return this.states.on(cb);
  }

  async panic() {
    this.cycleLeft = 0;
    this.machine = 'estopped';
    this.emit('ev estop source=host');
  }

  async close() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.state = 'closed';
    this.states.fire('closed');
  }

  /** Test hooks, used by the harness. */
  get debugState(): MachineState {
    return this.machine;
  }
  get debugTemps(): Record<string, number> {
    return { ...this.temps };
  }
}

/* ------------------------------------------------------------- webserial -- */

/**
 * Chrome and Edge only, and only in a secure context. http://localhost:5473
 * qualifies; a LAN IP from `vite --host` does NOT, and navigator.serial simply
 * will not exist there — which looks exactly like a broken Connect button.
 */
export class SerialTransport implements Transport {
  readonly info: TransportInfo = { kind: 'webserial', label: 'USB serial', outOfBandPanic: true };
  state: TransportState = 'closed';

  private lines = emitter<[string, number]>();
  private states = emitter<[TransportState, Error?]>();
  private port: SerialPort | null = null;
  private writer: WritableStreamDefaultWriter<Uint8Array> | null = null;
  private reading = false;

  static get available(): boolean {
    return typeof navigator !== 'undefined' && 'serial' in navigator;
  }

  async open() {
    if (!SerialTransport.available) {
      throw new Error(
        'WebSerial is unavailable. Use Chrome or Edge, over http://localhost — not a LAN address.',
      );
    }
    this.state = 'opening';
    this.states.fire('opening');
    this.port = await navigator.serial.requestPort();
    await this.port.open({ baudRate: 115200 });
    this.writer = this.port.writable!.getWriter();
    this.state = 'open';
    this.states.fire('open');
    void this.readLoop();
  }

  private async readLoop() {
    this.reading = true;
    const reader = this.port!.readable!.getReader();
    const dec = new TextDecoder();
    let buf = '';
    try {
      while (this.reading) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let i: number;
        // Reassembling partial lines is the transport's job, so nothing above
        // it ever sees half a message.
        while ((i = buf.indexOf('\n')) >= 0) {
          const line = buf.slice(0, i).replace(/\r$/, '');
          buf = buf.slice(i + 1);
          if (line) this.lines.fire(line, performance.now());
        }
      }
    } catch (e) {
      this.state = 'error';
      this.states.fire('error', e as Error);
    } finally {
      reader.releaseLock();
    }
  }

  async send(line: string) {
    await this.writer?.write(new TextEncoder().encode(`${line}\n`));
  }

  onLine(cb: (l: string, t: number) => void) {
    return this.lines.on(cb);
  }
  onState(cb: (s: TransportState, e?: Error) => void) {
    return this.states.on(cb);
  }

  async panic() {
    // Out of band: a BREAK reaches the firmware's RX interrupt even if the
    // command queue is backed up. The '!' is a belt-and-braces follow-up.
    try {
      await this.port?.setSignals({ break: true });
      await new Promise((r) => setTimeout(r, 12));
      await this.port?.setSignals({ break: false });
    } catch {
      /* not every driver supports BREAK; the '!' below still goes */
    }
    await this.writer?.write(new TextEncoder().encode('!\n'));
  }

  async close() {
    this.reading = false;
    try {
      this.writer?.releaseLock();
      await this.port?.close();
    } finally {
      this.state = 'closed';
      this.states.fire('closed');
    }
  }
}
