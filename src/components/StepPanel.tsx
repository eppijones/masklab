import { useApp, getModel } from '../store';
import { YARN_HEX } from '../data/types';
import { WAVE_CHART_DISPLAY } from '../data/waves';
import StartChapterArt from './StartChapterArt';
import { t } from '../i18n/ui';

/** Mini wave chart shown in the panel during the wave rounds. */
function WaveMiniChart({ activeRow, locale }: { activeRow: number; locale: 'no' | 'en' }) {
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
        {locale === 'en'
          ? 'One wave block from the outside (repeat 10 times). Row 1 at the top — you work downwards. Red square = two blue sc in the same stitch.'
          : 'Én bølgeblokk utenfra (gjentas 10 ganger). Rad 1 øverst — du jobber nedover. Rød rute = to blå fm i samme maske.'}
      </p>
    </div>
  );
}

export default function StepPanel({
  hideFoot = false,
  variant = 'inline',
}: {
  hideFoot?: boolean;
  /** `sheet` = body only inside RecipeSheet (no outer card chrome). */
  variant?: 'inline' | 'sheet';
}) {
  const locale = useApp((s) => s.locale);
  const ui = t(locale);
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
  const startChapter = step.eyebrow === 'Startkapittel' || step.eyebrow === 'Getting started';

  // Patterned rounds show all colors actually present in the round.
  const patterned = isText || isWave || round?.patterned === true;
  let yarnLabel: string | null = null;
  if (patterned && step.roundIdx !== null) {
    const seen: string[] = [];
    for (const st of model.stitches) {
      if (st.roundIdx !== step.roundIdx) continue;
      const name = ui.yarnName[st.color];
      if (!seen.includes(name)) seen.push(name);
    }
    yarnLabel = seen.join(' + ');
  } else if (step.yarn) {
    yarnLabel = ui.yarnName[step.yarn];
  }

  const body = (
    <>
      <div className="step-eyebrow">
        <span
          className={`step-num ${
            startChapter ? 'start' : step.kind === 'done' ? 'finale' : ''
          }`}
        >
          {step.eyebrow}
        </span>
        {variant === 'sheet' && (
          <span className="sub">{ui.stepOf(stepIndex + 1, steps.length)}</span>
        )}
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

      {/* Helene's blue wave chart only applies when the flare IS the wave motif;
          kits that carry their own colorwork out over the brim get the generic
          stitch-by-stitch treatment instead. */}
      {isWave && round?.waveRow != null && round?.patterned !== true && (
        <WaveMiniChart activeRow={round.waveRow} locale={locale} />
      )}

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
        {step.yarn && yarnLabel && (
          <span className="chip">
            <span className="swatch" style={{ background: YARN_HEX[step.yarn] }} />
            {yarnLabel}
          </span>
        )}
        {step.countChip && <span className="chip">{step.countChip}</span>}
        {!step.countChip && <span className="chip">{ui.needleChip}</span>}
      </div>
    </>
  );

  if (variant === 'sheet') {
    return <div className="panel-body sheet-body">{body}</div>;
  }

  return (
    <section className="card panel">
      <div className="card-head">
        <span className="label">{ui.patternLabel}</span>
        <span className="sub">{ui.stepOf(stepIndex + 1, steps.length)}</span>
      </div>

      <div className="panel-body">{body}</div>

      {!hideFoot && (
        <div className="panel-foot">
          <button
            type="button"
            className="btn jump-open"
            onClick={() => setJumpOpen(true)}
            title={ui.jumpList}
          >
            {ui.jumpList}
          </button>
          <button type="button" className="btn prev" onClick={prev} disabled={stepIndex === 0}>
            {ui.prev}
          </button>
          <button type="button" className="btn next" onClick={next} disabled={isLast}>
            {isLast ? ui.done : ui.next}
          </button>
        </div>
      )}
    </section>
  );
}
