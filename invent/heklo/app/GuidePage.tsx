import { useMemo, useState } from 'react';
import { GUIDE } from '../data/guide.ts';
import { compile } from '../engine/program.ts';
import { hatById, DEFAULT_HAT_ID } from '../engine/hats.ts';
import { ExplodeCanvas } from '../twin/MachineTwin.tsx';

export function GuidePage() {
  const prog = useMemo(() => compile(hatById(DEFAULT_HAT_ID)), []);
  const [explode, setExplode] = useState(0.55);
  const [step, setStep] = useState(0);
  const s = GUIDE[step];

  return (
    <div className="hk-guide">
      <div className="hk-guide-stage">
        <ExplodeCanvas prog={prog} explode={explode} />
        <label className="hk-explode-lbl">
          Exploded view
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={explode}
            onChange={(e) => setExplode(Number(e.target.value))}
          />
        </label>
      </div>
      <div className="hk-guide-sheet">
        <p className="hk-ikea-kicker">HEKLO · assembly · {GUIDE.length} steps</p>
        <h1>
          <span className="hk-ikea-n">{String(s.n).padStart(2, '0')}</span>
          {s.title}
        </h1>
        <p>{s.body}</p>
        <ul>
          {s.parts.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
        <p className="hk-muted">Time {s.time}</p>
        <div className="hk-transport">
          <button type="button" disabled={step === 0} onClick={() => setStep(step - 1)}>
            Previous
          </button>
          <button
            type="button"
            disabled={step === GUIDE.length - 1}
            onClick={() => setStep(step + 1)}
          >
            Next
          </button>
        </div>
        <ol className="hk-stepper">
          {GUIDE.map((g, i) => (
            <li key={g.n}>
              <button type="button" data-on={i === step ? 1 : 0} onClick={() => setStep(i)}>
                {g.n} {g.title}
              </button>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
