import { useApp, getModel, isPatterned } from '../store';
import { roundRuns, increaseRole, runText } from '../data/pattern';
import { t } from '../i18n/ui';

/**
 * Color-run jump grid + quick jumps — used inside Oppskrift on phone
 * so it does not cover the 3D stage.
 */
export default function StitchJumpPanel({ onPicked }: { onPicked?: () => void }) {
  const locale = useApp((s) => s.locale);
  const ui = t(locale);
  const stepIndex = useApp((s) => s.stepIndex);
  const cursor = useApp((s) => s.stitchCursor);
  const setCursor = useApp((s) => s.setStitchCursor);
  const showFinished = useApp((s) => s.showFinished);

  const model = getModel();
  const step = model.steps[stepIndex];
  const round = step?.roundIdx !== null && step ? model.rounds[step.roundIdx] : null;
  const patterned = round ? isPatterned(round) : false;

  if (!step || step.kind !== 'round' || !round || showFinished) return null;
  if (cursor === null) return null;

  const c = Math.min(cursor, round.count);
  const before = step.roundIdx! > 0 ? model.cumCounts[step.roundIdx! - 1] : 0;
  const runs = patterned ? roundRuns(model.stitches, step.roundIdx!) : [];
  const role = c < round.count ? increaseRole(c, round.increaseEvery, round.num) : null;
  const curRun = runs.find((r) => c + 1 >= r.from && c + 1 <= r.to);
  const hasIncreases = round.increaseEvery !== null && round.num !== 1;

  const nextColorBoundary = (() => {
    const cur = before + c;
    if (!model.stitches[cur]?.changeColorAfter) {
      for (let i = cur; i < before + round.count; i++) {
        if (model.stitches[i].changeColorAfter) return i - before;
      }
      return round.count;
    }
    for (let i = cur + 1; i < before + round.count; i++) {
      if (model.stitches[i].changeColorAfter) return i - before;
    }
    return round.count;
  })();

  const nextIncrease = (() => {
    const start =
      role === 'first-of-two' || role === 'second-of-two' ? before + c + 1 : before + c;
    for (let i = start; i < before + round.count; i++) {
      if (increaseRole(i - before, round.increaseEvery, round.num) === 'first-of-two') {
        return i - before;
      }
    }
    return round.count;
  })();

  const pick = (n: number) => {
    setCursor(n);
    onPicked?.();
  };

  return (
    <section className="stitch-jump-panel" aria-label={ui.stitchByStitch}>
      <div className="stitch-jump-head">
        <span className="label">{ui.stitchByStitch}</span>
        <span className="sub">
          {c} / {round.count}
        </span>
      </div>
      <p className="stitch-jump-lead">
        {patterned || runs.length > 1
          ? ui.stitchJumpLead
          : locale === 'en'
            ? 'Quick jumps for this round:'
            : 'Hurtighopp i denne runden:'}
      </p>

      <div className="stitch-controls stitch-controls-slim">
        {patterned ? (
          <button
            type="button"
            className="stitch-btn jump"
            onClick={() => pick(Math.min(round.count, nextColorBoundary))}
          >
            {ui.toColorChange}
          </button>
        ) : hasIncreases ? (
          <button
            type="button"
            className="stitch-btn jump"
            onClick={() => pick(Math.min(round.count, nextIncrease))}
          >
            {locale === 'en' ? 'To next increase' : 'Til neste økning'}
          </button>
        ) : null}
        <button type="button" className="stitch-btn secondary" onClick={() => pick(round.count)}>
          {locale === 'en' ? 'Whole round' : 'Hele runden'}
        </button>
      </div>

      {runs.length > 1 && (
        <div className="runs stitch-runs">
          {runs.map((r, i) => (
            <button
              key={i}
              type="button"
              className={`run-chip ${r.color} ${r === curRun ? 'current' : ''} ${c + 1 > r.to ? 'done' : ''}`}
              title={`${locale === 'en' ? 'Stitch' : 'Maske'} ${r.from}–${r.to}`}
              onClick={() => pick(r.from - 1)}
            >
              {runText(r, locale)}
              <span className="run-range">
                {r.from === r.to ? r.from : `${r.from}–${r.to}`}
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
