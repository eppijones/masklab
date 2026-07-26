import { useApp, getModel, isPatterned } from '../store';
import { t } from '../i18n/ui';

/**
 * Fixed bottom control bar for phone (and portrait tablet).
 * −1 / +1 and step prev/next stay thumb-reachable while the recipe scrolls.
 */
export default function MobileDock({
  pulseRecipe = false,
  /** Before round 1, Oppskrift jumps the step list (text is already on screen). */
  recipeOpensJump = false,
}: {
  pulseRecipe?: boolean;
  recipeOpensJump?: boolean;
}) {
  const locale = useApp((s) => s.locale);
  const ui = t(locale);
  const stepIndex = useApp((s) => s.stepIndex);
  const cursor = useApp((s) => s.stitchCursor);
  const setCursor = useApp((s) => s.setStitchCursor);
  const showFinished = useApp((s) => s.showFinished);
  const next = useApp((s) => s.next);
  const prev = useApp((s) => s.prev);
  const setRecipeOpen = useApp((s) => s.setRecipeOpen);
  const setJumpOpen = useApp((s) => s.setJumpOpen);

  const model = getModel();
  const steps = model.steps;
  const step = steps[stepIndex];
  const isLast = stepIndex === steps.length - 1;

  const counting =
    !!step &&
    step.kind === 'round' &&
    step.roundIdx !== null &&
    cursor !== null &&
    !showFinished;

  let done = false;
  let jumpTo: number | null = null;
  let jumpLabel = '';
  let c = 0;
  let roundCount = 0;

  if (counting && step.roundIdx !== null) {
    const round = model.rounds[step.roundIdx];
    roundCount = round.count;
    c = Math.min(cursor!, round.count);
    done = c >= round.count;

    const patterned = isPatterned(round);
    if (patterned && !done) {
      const before = step.roundIdx > 0 ? model.cumCounts[step.roundIdx - 1] : 0;
      let changeIdx: number | null = null;
      for (let i = before + c; i < before + round.count; i++) {
        if (model.stitches[i].changeColorAfter) {
          changeIdx = i;
          break;
        }
      }
      const changeIn = changeIdx !== null ? changeIdx - (before + c) + 1 : null;
      const changeIsNow = changeIn === 1;
      if (changeIdx !== null) {
        if (!changeIsNow) {
          jumpTo = changeIdx - before;
          jumpLabel = ui.toColorChange;
        } else {
          for (let i = before + c + 1; i < before + round.count; i++) {
            if (model.stitches[i].changeColorAfter) {
              jumpTo = i - before;
              break;
            }
          }
          if (jumpTo === null) jumpTo = round.count;
          jumpLabel = ui.nextColorChange;
        }
      }
    }
  }

  return (
    <div
      className="mobile-dock"
      role="toolbar"
      aria-label={locale === 'en' ? 'Work controls' : 'Arbeidsknapper'}
    >
      {counting && (
        <div className="mobile-dock-count-row">
          <button
            type="button"
            className="mobile-dock-pm minus"
            onClick={() => setCursor(Math.max(0, c - 1))}
            title={ui.minusOne}
            aria-label={ui.minusOne}
          >
            {ui.minusOne}
          </button>
          <div className="mobile-dock-count" aria-live="polite">
            {done ? (
              <strong>{ui.roundDone}</strong>
            ) : (
              <>
                <strong>{c}</strong>
                <span>
                  {ui.of} {roundCount}
                </span>
              </>
            )}
          </div>
          {done ? (
            <button
              type="button"
              className="mobile-dock-pm plus"
              onClick={next}
              disabled={isLast}
            >
              {ui.next}
            </button>
          ) : (
            <button
              type="button"
              className="mobile-dock-pm plus"
              onClick={() => setCursor(Math.min(roundCount, c + 1))}
              title={ui.plusOne}
              aria-label={ui.plusOne}
            >
              {ui.plusOne}
            </button>
          )}
        </div>
      )}

      {counting && !done && jumpTo !== null && (
        <button
          type="button"
          className="mobile-dock-jump"
          onClick={() => setCursor(Math.min(roundCount, jumpTo))}
        >
          {jumpLabel}
        </button>
      )}

      <div className="mobile-dock-nav">
        <button
          type="button"
          className={`mobile-dock-nav-btn jump ${pulseRecipe ? 'pulse' : ''}`}
          onClick={() => (recipeOpensJump ? setJumpOpen(true) : setRecipeOpen(true))}
          title={recipeOpensJump ? ui.jumpList : ui.tapRecipeHint}
        >
          {recipeOpensJump ? ui.jumpList : ui.jumpOpen}
        </button>
        <button
          type="button"
          className="mobile-dock-nav-btn prev"
          onClick={prev}
          disabled={stepIndex === 0}
        >
          {ui.prev}
        </button>
        <button
          type="button"
          className="mobile-dock-nav-btn next"
          onClick={next}
          disabled={isLast}
        >
          {isLast ? ui.done : ui.nextShort}
        </button>
      </div>
    </div>
  );
}
