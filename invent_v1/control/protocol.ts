/**
 * HKP/1 — the wire protocol. Pure functions, no I/O, fully testable.
 *
 *   host -> dev :  <seq> <verb> [k=v ...] *<crc8>
 *   dev  -> host:  ok  <seq> [k=v ...]
 *                  nak <seq> reason=crc|range|busy|estop|unknown|seq
 *                  ev  <name> [k=v ...]
 *                  tel t=<ms> W=.. P=.. F=.. st=<state> q=<n> Tm=<c> Td=<c>
 *                  log <lvl> <text>
 *
 * Newline-delimited ASCII, not G-code. The reasons, in order of how much they
 * actually matter:
 *
 *  1. The machine's atoms are stitch cycles, a gate index, a colour and a
 *     per-cycle verdict. `G1 X.. Y..` throws away exactly the semantics the run
 *     log and the camera audit need to line up.
 *  2. G-code has no per-command ack. GRBL bolts on planner-buffer character
 *     counting; Marlin bolts on N.. *checksum plus Resend:. You would
 *     reimplement both, worse. Sequence numbers are here from line one.
 *  3. There is no free interpreter to inherit — the firmware is being written
 *     either way, so G-code buys nothing and costs a parser.
 *  4. You can type it into `screen` at 2 a.m. when the UI is broken, and the
 *     log is greppable.
 */

export const PROTO_VERSION = 1;

/* ----------------------------------------------------------------- crc8 --- */

/**
 * CRC-8/MAXIM (poly 0x31 reflected -> 0x8C). The one idea worth stealing from
 * Marlin: a dropped or mangled byte on a cheap CH340 cable becomes a `nak
 * reason=crc` and a resend, instead of a motor moving somewhere unplanned.
 */
export function crc8(s: string): number {
  let crc = 0;
  for (let i = 0; i < s.length; i++) {
    let b = s.charCodeAt(i) & 0xff;
    for (let j = 0; j < 8; j++) {
      const mix = (crc ^ b) & 0x01;
      crc = (crc >> 1) & 0xff;
      if (mix) crc ^= 0x8c;
      b >>= 1;
    }
  }
  return crc & 0xff;
}

/* -------------------------------------------------------------- commands -- */

export type Verb =
  | 'hello'
  | 'cfg'
  | 'home'
  | 'jog'
  | 'move'
  | 'cycle'
  | 'run'
  | 'tel'
  | 'lamp'
  | 'verdict'
  | 'stop'
  | 'abort';

export interface Command {
  seq: number;
  verb: Verb;
  args?: Record<string, string | number>;
}

export function encode(c: Command): string {
  const parts = [String(c.seq), c.verb];
  for (const [k, v] of Object.entries(c.args ?? {})) parts.push(`${k}=${v}`);
  const body = parts.join(' ');
  return `${body}*${crc8(body).toString(16).padStart(2, '0')}`;
}

/* ---------------------------------------------------------------- events -- */

export type MachineState = 'boot' | 'idle' | 'homing' | 'running' | 'paused' | 'estopped' | 'fault';

export type Event =
  | { kind: 'ok'; seq: number; args: Record<string, string> }
  | { kind: 'nak'; seq: number; reason: string }
  | { kind: 'ev'; name: string; args: Record<string, string> }
  | {
      kind: 'tel';
      tDevMs: number;
      axes: Record<string, number>;
      state: MachineState;
      queue: number;
      temps: Record<string, number>;
    }
  | { kind: 'log'; level: string; text: string }
  | { kind: 'garbage'; raw: string };

function kv(tokens: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const t of tokens) {
    const i = t.indexOf('=');
    if (i > 0) out[t.slice(0, i)] = t.slice(i + 1);
  }
  return out;
}

/**
 * Never throws. A malformed line from a device with a flaky cable must not be
 * able to take down the UI — it becomes `garbage` and gets logged.
 */
export function parse(line: string): Event {
  const raw = line.trim();
  if (!raw) return { kind: 'garbage', raw };

  const [head, ...rest] = raw.split(' ');

  switch (head) {
    case 'ok': {
      const seq = Number(rest[0]);
      if (!Number.isFinite(seq)) return { kind: 'garbage', raw };
      return { kind: 'ok', seq, args: kv(rest.slice(1)) };
    }
    case 'nak': {
      const seq = Number(rest[0]);
      if (!Number.isFinite(seq)) return { kind: 'garbage', raw };
      return { kind: 'nak', seq, reason: kv(rest.slice(1)).reason ?? 'unknown' };
    }
    case 'ev': {
      if (!rest.length) return { kind: 'garbage', raw };
      return { kind: 'ev', name: rest[0], args: kv(rest.slice(1)) };
    }
    case 'log': {
      if (rest.length < 2) return { kind: 'garbage', raw };
      return { kind: 'log', level: rest[0], text: rest.slice(1).join(' ') };
    }
    case 'tel': {
      const a = kv(rest);
      const axes: Record<string, number> = {};
      const temps: Record<string, number> = {};
      for (const [k, v] of Object.entries(a)) {
        const n = Number(v);
        if (!Number.isFinite(n)) continue;
        if (k.startsWith('T') && k.length > 1) temps[k] = n;
        else if (/^[A-Z]$/.test(k)) axes[k] = n;
      }
      const t = Number(a.t);
      if (!Number.isFinite(t)) return { kind: 'garbage', raw };
      return {
        kind: 'tel',
        tDevMs: t,
        axes,
        state: (a.st as MachineState) ?? 'idle',
        queue: Number(a.q ?? 0) || 0,
        temps,
      };
    }
    default:
      return { kind: 'garbage', raw };
  }
}

/** Round-trip helper used by the harness: encode then strip the CRC. */
export function decodeCommand(line: string): Command | null {
  const star = line.lastIndexOf('*');
  if (star < 0) return null;
  const body = line.slice(0, star);
  const got = parseInt(line.slice(star + 1), 16);
  if (crc8(body) !== got) return null;

  const [seqS, verb, ...rest] = body.split(' ');
  const seq = Number(seqS);
  if (!Number.isFinite(seq) || !verb) return null;

  const args: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(kv(rest))) {
    const n = Number(v);
    args[k] = Number.isFinite(n) && v.trim() !== '' ? n : v;
  }
  return { seq, verb: verb as Verb, args: Object.keys(args).length ? args : undefined };
}
