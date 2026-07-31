import { useApp, getModel, isPatterned } from '../store';
import { nextRhythmStep, rhythmProgress } from '../data/pattern';
import { t } from '../i18n/ui';

/**
 * Fixed bottom control bar for phone (and portrait tablet).
 * On increase rounds the green button advances by rhythm unit
 * (1 plain / 2 in same) so you can stay in flow without +1×N.
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
  let c = 0;
  let roundCount = 0;
  let rhythm: ReturnType<typeof nextRhythmStep> = null;
  let progress: ReturnType<typeof rhythmProgress> = null;
  let useRhythm = false;

  if (counting && step.roundIdx !== null) {
    const round = model.rounds[step.roundIdx];
    roundCount = round.count;
    c = Math.min(cursor!, round.count);
    done = c >= round.count;
    // Colour/text rounds stay stitch-by-stitch; increase rounds use rhythm units.
    useRhythm = !done && !isPatterned(round) && round.increaseEvery !== null && round.num !== 1;
    if (useRhythm) {
      rhythm = nextRhythmStep(c, round);
      progress = rhythmProgress(c, round);
    }
  }

  const rhythmLabel =
    rhythm?.kind === 'two-in-same'
      ? ui.rhythmTwoSame
      : rhythm?.kind === 'finish-two'
        ? ui.rhythmFinishTwo
        : rhythm?.kind === 'plain'
          ? ui.rhythmPlain
          : ui.plusOne;

  const advance = () => {
    if (!counting || done) return;
    if (useRhythm && rhythm) {
      setCursor(Math.min(roundCount, c + rhythm.delta));
      return;
    }
    setCursor(Math.min(roundCount, c + 1));
  };

  return (
    <div
      className="mobile-dock"
      role="toolbar"
      aria-label={locale === 'en' ? 'Work controls' : 'Arbeidsknapper'}
    >
      {counting && (
        <div className={`mobile-dock-count-row ${useRhythm ? 'rhythm-mode' : ''}`}>
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
                {progress && (
                  <em className="mobile-dock-rhythm-meta">
                    {ui.rhythmOf(progress.done, progress.total)}
                  </em>
                )}
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
              className={`mobile-dock-pm plus ${useRhythm ? 'rhythm' : ''} ${
                rhythm?.kind === 'two-in-same' || rhythm?.kind === 'finish-two' ? 'inc' : ''
              }`}
              onClick={advance}
              title={useRhythm ? rhythmLabel : ui.plusOne}
              aria-label={useRhythm ? rhythmLabel : ui.plusOne}
            >
              {useRhythm ? rhythmLabel : ui.plusOne}
            </button>
          )}
        </div>
      )}

      {counting && useRhythm && !done && (
        <button
          type="button"
          className="mobile-dock-fine"
          onClick={() => setCursor(Math.min(roundCount, c + 1))}
          title={ui.plusOneStitchShort}
        >
          {ui.plusOneStitchShort}
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
