import { useMemo, useRef, useState } from 'react';
import { HATS, hatById, DEFAULT_HAT_ID } from '../engine/hats.ts';
import { compile, currentPhase, opAt } from '../engine/program.ts';
import { jobSpeed, useJobClock } from '../engine/clock.ts';
import { MachineCanvas, type TwinView } from '../twin/MachineTwin.tsx';
import { TOPOLOGIES } from '../engine/topology.ts';

export function TwinPage() {
  const [hatId, setHatId] = useState(DEFAULT_HAT_ID);
  const hat = useMemo(() => hatById(hatId), [hatId]);
  const prog = useMemo(() => compile(hat), [hat]);
  const clock = useJobClock(prog);
  const [explode, setExplode] = useState(0);
  const [cutaway, setCutaway] = useState(false);
  const job = jobSpeed(prog, 90);

  const view = useRef<TwinView>({
    pos: 0,
    explode: 0,
    cutaway: false,
    labels: true,
  });
  view.current.pos = clock.pos;
  view.current.explode = explode;
  view.current.cutaway = cutaway;

  const { op, t, index } = opAt(prog, clock.pos);
  const { phase, cycle } = currentPhase(prog, clock.pos);
  const elapsed =
    (prog.prefixMs[index] ?? 0) + t * (prog.durations[index] ?? cycle.durationMs ?? 0);
  const leftMs = Number.isFinite(elapsed) ? Math.max(0, prog.totalMs - elapsed) : prog.totalMs;
  const wallLeft = leftMs / 1000 / Math.max(0.01, clock.speed);
  const pct = (elapsed / prog.totalMs) * 100;

  return (
    <div className="hk-twin">
      <div className="hk-stage">
        <MachineCanvas prog={prog} view={view} />
      </div>
      <aside className="hk-hud">
        <label className="hk-field">
          <span>Hat</span>
          <select value={hatId} onChange={(e) => setHatId(e.target.value)}>
            {HATS.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name} · {h.totalStitches} st
              </option>
            ))}
          </select>
        </label>

        <div className="hk-readout">
          <b>{op.kind === 'bind' ? 'Bind off' : phase.label}</b>
          <small>
            Round {op.round}/{hat.totalRounds} · stitch {op.stitch + 1} · {op.gates}{' '}
            gates · {op.fabric}/{hat.totalStitches} on the hook
          </small>
          <small>
            Loops on needle: {phase.loops} · {cycle.name} · {phase.note}
          </small>
        </div>

        <div className="hk-bar">
          <i style={{ width: `${pct}%` }} />
        </div>
        <div className="hk-times">
          <span>machine {fmtH(elapsed)} / {fmtH(prog.totalMs)}</span>
          <span>wall {fmtS(wallLeft)} left at {clock.speed.toFixed(0)}×</span>
        </div>

        <div className="hk-transport">
          <button type="button" onClick={clock.toggle}>
            {clock.playing ? 'Pause' : 'Play'}
          </button>
          <button type="button" onClick={() => clock.stepPhase(-1)}>
            ◂ phase
          </button>
          <button type="button" onClick={() => clock.stepPhase(1)}>
            phase ▸
          </button>
          <button type="button" onClick={() => clock.stepStitch(-1)}>
            ◂ st
          </button>
          <button type="button" onClick={() => clock.stepStitch(1)}>
            st ▸
          </button>
          <button type="button" onClick={clock.reset}>
            Reset
          </button>
        </div>

        <div className="hk-speeds">
          {[
            { s: 1, l: '1× realtime' },
            { s: 10, l: '10×' },
            { s: 60, l: '60×' },
            { s: job, l: 'job ~90s' },
          ].map((x) => (
            <button
              key={x.l}
              type="button"
              data-on={Math.abs(clock.speed - x.s) < 0.5 ? 1 : 0}
              onClick={() => clock.setSpeed(x.s)}
            >
              {x.l}
            </button>
          ))}
        </div>

        <label className="hk-field">
          <span>Explode</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={explode}
            onChange={(e) => setExplode(Number(e.target.value))}
          />
        </label>
        <label className="hk-check">
          <input
            type="checkbox"
            checked={cutaway}
            onChange={(e) => setCutaway(e.target.checked)}
          />
          Cutaway (station plane)
        </label>

        <p className="hk-blurb">
          Fabric hangs from the gate chain, crown down, brim at the working ring.
          Draw-through-two is the crochet move — knitting never does it. Handmade{' '}
          {hat.time}; this cycle is {fmtH(prog.totalMs)} machine time.
        </p>
        <p className="hk-blurb faint">{TOPOLOGIES[0].heklo}</p>
      </aside>
    </div>
  );
}

function fmtH(ms: number): string {
  if (!Number.isFinite(ms)) return '—';
  const s = Math.round(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h) return `${h}h ${m}m`;
  if (m) return `${m}m ${sec}s`;
  return `${sec}s`;
}

function fmtS(s: number): string {
  if (!Number.isFinite(s)) return '—';
  if (s > 90) return `${Math.round(s / 60)} min`;
  return `${Math.max(0, Math.round(s))} s`;
}
