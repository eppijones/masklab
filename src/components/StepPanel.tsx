import { useApp, getModel } from '../store';
import { YARN_HEX, YARN_NAME } from '../data/types';
import { WAVE_CHART_DISPLAY } from '../data/waves';
import StartChapterArt from './StartChapterArt';

/** Mini wave chart shown in the panel during the wave rounds. */
function WaveMiniChart({ activeRow }: { activeRow: number }) {
  const CELL = 22;
  const rows = WAVE_CHART_DISPLAY.length;
  const cols = WAVE_CHART_DISPLAY[0].length;
  const fill = (ch: string) =>
    ch === 'W' ? YARN_HEX.white : ch === 'B' ? YARN_HEX.blue : '#D8342C';
  return (
    <div>
      <svg
        viewBox={`0 0 ${(cols + 1.6) * CELL} ${(rows + 1) * CELL}`}
        style={{ width: '100%', display: 'block' }}
      >
        {WAVE_CHART_DISPLAY.map((row, rIdx) =>
          row.split('').map((ch, cIdx) => (
            <rect
              key={`${rIdx}-${cIdx}`}
              x={(cIdx + 0.2) * CELL}
              y={rIdx * CELL + CELL * 0.2}
              width={CELL}
              height={CELL}
              fill={fill(ch)}
              stroke={rIdx + 1 === activeRow ? '#00205B' : '#C9BFA8'}
              strokeWidth={rIdx + 1 === activeRow ? 2 : 0.7}
            />
          )),
        )}
        {Array.from({ length: rows }, (_, r) => (
          <text
            key={r}
            x={(cols + 0.5) * CELL}
            y={r * CELL + CELL * 0.9}
            fontSize={CELL * 0.55}
            fontWeight={r + 1 === activeRow ? 800 : 600}
            fill={r + 1 === activeRow ? '#BA0C2F' : '#8A8070'}
          >
            {r + 1}
          </text>
        ))}
      </svg>
      <p style={{ margin: '4px 0 0', fontSize: 11.5, color: 'var(--ink-faint)', fontWeight: 700 }}>
        Én bølgeblokk utenfra (gjentas 10 ganger). Rad 1 øverst — du jobber nedover. Rød rute =
        to blå fm i samme maske.
      </p>
    </div>
  );
}

export default function StepPanel({ hideFoot = false }: { hideFoot?: boolean }) {
  const stepIndex = useApp((s) => s.stepIndex);
  const confirmed = useApp((s) => s.confirmed);
  const toggleConfirm = useApp((s) => s.toggleConfirm);
  const next = useApp((s) => s.next);
  const prev = useApp((s) => s.prev);
  const setJumpOpen = useApp((s) => s.setJumpOpen);

  const model = getModel();
  const steps = model.steps;
  const step = steps[stepIndex];
  if (!step) return null;

  const round = step.roundIdx !== null ? model.rounds[step.roundIdx] : null;
  const isText = round?.phase === 'text';
  const isWave = round?.phase === 'wave';
  const isLast = stepIndex === steps.length - 1;

  return (
    <section className="card panel">
      <div className="card-head">
        <span className="label">Oppskriften</span>
        <span className="sub">
          Steg {stepIndex + 1} av {steps.length}
        </span>
      </div>

      <div className="panel-body">
        <div className="step-eyebrow">
          <span
            className={`step-num ${
              step.eyebrow === 'Startkapittel'
                ? 'start'
                : step.kind === 'done'
                  ? 'finale'
                  : ''
            }`}
          >
            {step.eyebrow}
          </span>
        </div>

        <h2 className="step-title">{step.title}</h2>

        <StartChapterArt step={step} />

        {step.body.map((p, i) => (
          <p className="step-body" key={i}>
            {p}
          </p>
        ))}

        {step.bullets && (
          <ul className="step-bullets">
            {step.bullets.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        )}

        {step.checklist && (
          <div className="checklist">
            {step.checklist.map((item, i) => {
              const key = `check:${step.id}:${i}`;
              const on = !!confirmed[key];
              return (
                <label key={i} className={on ? 'checked' : ''}>
                  <input type="checkbox" checked={on} onChange={() => toggleConfirm(key)} />
                  {item}
                </label>
              );
            })}
          </div>
        )}

        {isWave && round?.waveRow != null && <WaveMiniChart activeRow={round.waveRow} />}

        {step.confirm && (
          <label className={`confirm-box ${confirmed[step.id] ? 'ok' : ''}`}>
            <input
              type="checkbox"
              checked={!!confirmed[step.id]}
              onChange={() => toggleConfirm(step.id)}
            />
            {step.confirm}
          </label>
        )}

        <div className="step-meta">
          {step.yarn && (
            <span className="chip">
              <span className="swatch" style={{ background: YARN_HEX[step.yarn] }} />
              {isText ? 'Hvit + rød' : isWave ? 'Hvit + blå' : YARN_NAME[step.yarn]}
            </span>
          )}
          {step.countChip && <span className="chip">{step.countChip}</span>}
          <span className="chip">4,0 mm nål</span>
        </div>
      </div>

      {!hideFoot && (
        <div className="panel-foot">
          <button type="button" className="btn prev" onClick={prev} disabled={stepIndex === 0}>
            ← Forrige
          </button>
          <button
            type="button"
            className="btn jump-open"
            onClick={() => setJumpOpen(true)}
            title="Vis hele oppskriften og hopp til et steg"
          >
            Oppskrift
          </button>
          <button type="button" className="btn next" onClick={next} disabled={isLast}>
            {isLast ? 'Ferdig!' : 'Neste steg →'}
          </button>
        </div>
      )}
    </section>
  );
}
