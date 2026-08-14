import { useApp, getModel, isPatterned } from '../store';
import type { YarnColor } from '../data/types';
import {
  nextRhythmStep,
  nextRunStep,
  prevRunCursor,
  rhythmProgress,
  roundRuns,
  runText,
} from '../data/pattern';
import { t } from '../i18n/ui';

/**
 * Fixed bottom control bar for phone (and portrait tablet).
 * Increase rounds → rhythm units (1 / 2 i samme).
 * Patterned rounds → colour-block units (2 hvite / 2 røde …).
 */
export default function MobileDock({
  pulseRecipe = false,
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
  let useRhythm = false;
  let useBlocks = false;
  let rhythm: ReturnType<typeof nextRhythmStep> = null;
  let runStep: ReturnType<typeof nextRunStep> = null;
  let progressLabel: string | null = null;
  let blockColor: YarnColor | null = null;

  if (counting && step.roundIdx !== null) {
    const round = model.rounds[step.roundIdx];
    roundCount = round.count;
    c = Math.min(cursor!, round.count);
    done = c >= round.count;
    const patterned = isPatterned(round);

    if (!done && patterned) {
      const runs = roundRuns(model.stitches, step.roundIdx);
      if (runs.length > 1) {
        useBlocks = true;
        runStep = nextRunStep(c, runs, roundCount);
        if (runStep) {
          progressLabel = ui.fieldOf(runStep.runIndex + 1, runStep.runsTotal);
          blockColor = runStep.run.color;
        }
      }
    } else if (!done && !patterned && round.increaseEvery !== null && round.num !== 1) {
      useRhythm = true;
      rhythm = nextRhythmStep(c, round);
      const progress = rhythmProgress(c, round);
      if (progress) progressLabel = ui.rhythmOf(progress.done, progress.total);
    }
  }

  const unitMode = useRhythm || useBlocks;

  const primaryLabel = useBlocks && runStep
    ? runText(runStep.run, locale)
    : rhythm?.kind === 'two-in-same'
      ? ui.rhythmTwoSame
      : rhythm?.kind === 'finish-two'
        ? ui.rhythmFinishTwo
        : rhythm?.kind === 'plain'
          ? ui.rhythmPlain
          : ui.plusOne;

  const advance = () => {
    if (!counting || done) return;
    if (useBlocks && runStep) {
      setCursor(Math.min(roundCount, c + runStep.delta));
      return;
    }
    if (useRhythm && rhythm) {
      setCursor(Math.min(roundCount, c + rhythm.delta));
      return;
    }
    setCursor(Math.min(roundCount, c + 1));
  };

  const rewind = () => {
    if (!counting) return;
    if (useBlocks && step?.roundIdx != null) {
      const runs = roundRuns(model.stitches, step.roundIdx);
      setCursor(prevRunCursor(c, runs));
      return;
    }
    setCursor(Math.max(0, c - 1));
  };

  return (
    <div
      className="mobile-dock"
      role="toolbar"
      aria-label={locale === 'en' ? 'Work controls' : 'Arbeidsknapper'}
    >
      {counting && (
        <div className={`mobile-dock-count-row ${unitMode ? 'rhythm-mode' : ''}`}>
          <button
            type="button"
            className="mobile-dock-pm minus"
            onClick={rewind}
            title={useBlocks ? ui.minusBlock : ui.minusOne}
            aria-label={useBlocks ? ui.minusBlock : ui.minusOne}
          >
            {useBlocks ? ui.minusBlock : ui.minusOne}
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
                {progressLabel && (
                  <em className="mobile-dock-rhythm-meta">{progressLabel}</em>
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
              className={`mobile-dock-pm plus ${unitMode ? 'rhythm' : ''} ${
                useBlocks && blockColor ? `yarn-${blockColor}` : ''
              } ${
                !useBlocks &&
                (rhythm?.kind === 'two-in-same' || rhythm?.kind === 'finish-two')
                  ? 'inc'
                  : ''
              }`}
              onClick={advance}
              title={unitMode ? primaryLabel : ui.plusOne}
              aria-label={unitMode ? primaryLabel : ui.plusOne}
            >
              {unitMode ? primaryLabel : ui.plusOne}
            </button>
          )}
        </div>
      )}

      {/* The big button moves a whole field or rhythm unit. These walk one
          stitch at a time — the only way to take an increase pair in two
          presses, or to back out of a miscount without losing the field. */}
      {counting && unitMode && !done && (
        <div className="mobile-dock-fine-row">
          <button
            type="button"
            className="mobile-dock-fine"
            onClick={() => setCursor(Math.max(0, c - 1))}
            disabled={c === 0}
            title={ui.minusOneStitchShort}
          >
            {ui.minusOneStitchShort}
          </button>
          <button
            type="button"
            className="mobile-dock-fine"
            onClick={() => setCursor(Math.min(roundCount, c + 1))}
            title={ui.plusOneStitchShort}
          >
            {ui.plusOneStitchShort}
          </button>
        </div>
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
