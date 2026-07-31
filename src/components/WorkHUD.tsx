import { useApp, getModel, isPatterned } from '../store';
import { YARN_HEX } from '../data/types';
import type { YarnColor } from '../data/types';
import {
  roundRuns,
  targetHole,
  increaseRole,
  rhythmCells,
  nextRhythmStep,
  nextRunStep,
  prevRunCursor,
  runText,
  rhythmProgress,
} from '../data/pattern';
import { t } from '../i18n/ui';

function MarkerIcon() {
  return (
    <svg className="hud-marker-icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden>
      <path
        d="M8 3.5 C5 3.5 4 6 4 9 L4 15 C4 18.5 6.5 20.5 9.5 20.5 C12.5 20.5 15 18.5 15 15 L15 8 C15 6.8 16 6 17.2 6 C18.4 6 19.4 6.8 19.4 8 L19.4 10.5"
        fill="none"
        stroke="#2F6B4F"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <circle cx="19.4" cy="12.4" r="1.9" fill="#2F6B4F" />
    </svg>
  );
}

function Dot({ color, big }: { color: YarnColor; big?: boolean }) {
  return (
    <span
      className={`hud-dot ${big ? 'big' : ''}`}
      style={{ background: YARN_HEX[color] }}
    />
  );
}

/**
 * Compact HUD: count + instruction (+ marker in the right of that box),
 * then −1/+1 underneath. No separate marker banner.
 */
export default function WorkHUD({ hideControls = false }: { hideControls?: boolean }) {
  const locale = useApp((s) => s.locale);
  const ui = t(locale);
  const NAME_UPPER: Record<YarnColor, string> = {
    white: ui.white,
    red: ui.red,
    blue: ui.blue,
  };
  const NAME_PLURAL: Record<YarnColor, string> = {
    white: ui.whitePlural,
    red: ui.redPlural,
    blue: ui.bluePlural,
  };
  const stepIndex = useApp((s) => s.stepIndex);
  const cursor = useApp((s) => s.stitchCursor);
  const setCursor = useApp((s) => s.setStitchCursor);
  const showFinished = useApp((s) => s.showFinished);
  const next = useApp((s) => s.next);

  const model = getModel();
  const step = model.steps[stepIndex];
  if (!step || step.kind !== 'round' || step.roundIdx === null) return null;
  if (cursor === null || showFinished) return null;

  const round = model.rounds[step.roundIdx];
  const patterned = isPatterned(round);
  const c = Math.min(cursor, round.count);
  const before = step.roundIdx > 0 ? model.cumCounts[step.roundIdx - 1] : 0;
  const done = c >= round.count;
  const nextStitch = !done ? model.stitches[before + c] : null;
  const role = !done
    ? increaseRole(c, round.increaseEvery, round.num)
    : null;

  let changeIdx: number | null = null;
  if (!done) {
    for (let i = before + c; i < before + round.count; i++) {
      if (model.stitches[i].changeColorAfter) {
        changeIdx = i;
        break;
      }
    }
  }
  const changeIn = changeIdx !== null ? changeIdx - (before + c) + 1 : null;
  const newColor =
    changeIdx !== null ? model.stitches[changeIdx].changeColorAfter! : null;
  const changeIsNow = changeIn === 1;

  let jumpTo: number | null = null;
  if (!done && changeIdx !== null) {
    if (!changeIsNow) jumpTo = changeIdx - before;
    else {
      for (let i = before + c + 1; i < before + round.count; i++) {
        if (model.stitches[i].changeColorAfter) {
          jumpTo = i - before;
          break;
        }
      }
      if (jumpTo === null) jumpTo = round.count;
    }
  }

  const runs = patterned ? roundRuns(model.stitches, step.roundIdx) : [];
  const curRun = !done ? runs.find((r) => c + 1 >= r.from && c + 1 <= r.to) : undefined;

  let belowColor: YarnColor | null = null;
  if (!done && step.roundIdx > 0) {
    const prevStart = step.roundIdx > 1 ? model.cumCounts[step.roundIdx - 2] : 0;
    const P = model.rounds[step.roundIdx - 1].count;
    const hole = targetHole(model.stitches, before, before + c);
    belowColor = model.stitches[prevStart + Math.max(0, Math.min(hole, P - 1))].color;
  }

  const k = round.increaseEvery;
  const showRhythm = !done && !patterned && k !== null && round.num !== 1;
  const cells = k !== null ? rhythmCells(k) : [];
  const cellIdx =
    k === null ? -1 : k === 1 ? 0 : Math.min(c % (k + 1), k - 1);
  const repeats = k !== null ? Math.floor(round.count / (k + 1)) : 0;
  const showMarker = !done && c > 0 && c % 10 === 0;
  const showJump = !hideControls && patterned && !done && jumpTo !== null;
  const nowClass = changeIsNow
    ? 'change'
    : role === 'second-of-two'
      ? 'inc'
      : role === 'first-of-two'
        ? 'pair'
        : '';

  const useBlocks = patterned && runs.length > 1 && !done;
  const runStep = useBlocks ? nextRunStep(c, runs, round.count) : null;
  const useRhythm =
    !done && !patterned && round.increaseEvery !== null && round.num !== 1;
  const rhythm = useRhythm ? nextRhythmStep(c, round) : null;
  const rProgress = useRhythm ? rhythmProgress(c, round) : null;
  const unitMode = useBlocks || useRhythm;

  const primaryLabel = useBlocks && runStep
    ? runText(runStep.run, locale)
    : rhythm?.kind === 'two-in-same'
      ? ui.rhythmTwoSame
      : rhythm?.kind === 'finish-two'
        ? ui.rhythmFinishTwo
        : rhythm?.kind === 'plain'
          ? ui.rhythmPlain
          : ui.plusOneStitch;

  const advance = () => {
    if (done) return;
    if (useBlocks && runStep) {
      setCursor(Math.min(round.count, c + runStep.delta));
      return;
    }
    if (useRhythm && rhythm) {
      setCursor(Math.min(round.count, c + rhythm.delta));
      return;
    }
    setCursor(Math.min(round.count, c + 1));
  };

  const rewind = () => {
    if (useBlocks) {
      setCursor(prevRunCursor(c, runs));
      return;
    }
    setCursor(Math.max(0, c - 1));
  };

  return (
    <div className={`workhud ${hideControls ? 'msgs-only' : ''}`}>
      <div className="workhud-top">
        {!hideControls && (
          <div className="workhud-count">
            <strong>{c}</strong>
            <span>
              {ui.of} {round.count}
            </span>
          </div>
        )}

        <div className={`workhud-panel ${showMarker ? 'has-marker' : ''}`}>
          <div className="workhud-msgs">
            {hideControls && round.num === 1 && c < 4 && !done && (
              <p className="workhud-recipe-hint">{ui.seeRecipeHint}</p>
            )}
            {done ? (
              <div className="workhud-now">
                <strong>{ui.hudRoundDone}</strong> {ui.hudRoundDoneHint}
              </div>
            ) : (
              <div className={`workhud-now ${nowClass}`}>
                {changeIsNow && newColor ? (
                  <>
                    <span className="workhud-alert">{ui.hudColorChange}</span>
                    <span className="workhud-line">
                      {locale === 'en' ? 'Crochet with' : 'Hekle med'}{' '}
                      <Dot color={nextStitch!.color} big /> {NAME_UPPER[nextStitch!.color]},{' '}
                      {locale === 'en' ? 'pull' : 'trekk'} <Dot color={newColor} big />{' '}
                      <strong>{NAME_UPPER[newColor]}</strong>{' '}
                      {locale === 'en'
                        ? 'through the last two loops.'
                        : 'gjennom siste to løkker.'}
                    </span>
                  </>
                ) : role === 'second-of-two' ? (
                  <>
                    <span className="workhud-alert inc">
                      <span className="workhud-frac">2/2</span>
                      {ui.hudIncSame}
                    </span>
                    <span className="workhud-line">{ui.hudIncSecond(c + 1, c)}</span>
                  </>
                ) : role === 'first-of-two' ? (
                  <>
                    <span className="workhud-alert pair">
                      <span className="workhud-frac">1/2</span>
                      {ui.hudPairFirst}
                    </span>
                    <span className="workhud-line">
                      {locale === 'en' ? 'No.' : 'Nr.'} {c + 1}:{' '}
                      <Dot color={nextStitch!.color} big />{' '}
                      <strong>{NAME_UPPER[nextStitch!.color]}</strong>{' '}
                      {locale === 'en' ? 'in the next V. Next = same hole.' : 'i neste V. Neste = samme hull.'}
                    </span>
                  </>
                ) : (
                  <span className="workhud-line">
                    {ui.hudPlain(c + 1, NAME_UPPER[nextStitch!.color])}
                  </span>
                )}
              </div>
            )}

            {showRhythm && (
              <div className="workhud-rhythm">
                <span className="rhythm-label">{ui.hudRepeat}</span>
                <span className="rhythm-cells">
                  {cells.map((label, h) => {
                    const isTwo = label !== '1';
                    const on = h === cellIdx;
                    const text =
                      isTwo && on
                        ? role === 'second-of-two'
                          ? '2/2'
                          : '1/2'
                        : label;
                    return (
                      <span
                        key={h}
                        className={`rhythm-cell ${isTwo ? 'two' : ''} ${on ? 'on' : ''} ${isTwo && on ? 'frac' : ''}`}
                      >
                        {text}
                      </span>
                    );
                  })}
                </span>
                <span className="rhythm-repeat">× {repeats}</span>
              </div>
            )}

            {!done && patterned && (curRun || belowColor) && (
              <div className="workhud-verify">
                {curRun && (
                  <span>
                    {ui.hudField} <Dot color={curRun.color} /> {NAME_PLURAL[curRun.color]}{' '}
                    <strong>
                      {c + 1 - curRun.from + 1}/{curRun.to - curRun.from + 1}
                    </strong>
                    {belowColor && <> · </>}
                  </span>
                )}
                {belowColor && (
                  <span>
                    {ui.hudInsertIn} <Dot color={belowColor} />{' '}
                    <strong>{NAME_UPPER[belowColor]} V</strong>
                  </span>
                )}
              </div>
            )}
          </div>

          {showMarker && (
            <aside className="workhud-marker-aside">
              <MarkerIcon />
              <span className="workhud-marker-text">
                <strong>{ui.hudSetMarker}</strong> {ui.hudSetMarkerHint(c)}
                <span className="workhud-marker-sub">
                  {ui.hudMarkerOf(c / 10, Math.floor(round.count / 10))}
                </span>
              </span>
            </aside>
          )}
        </div>
      </div>

      {!hideControls && (
        <div className="workhud-controls">
          <button
            type="button"
            className="workhud-pm minus"
            onClick={rewind}
            title={useBlocks ? ui.minusBlock : ui.minusOne}
          >
            {useBlocks ? ui.minusBlock : ui.minusOne}
          </button>
          {done ? (
            <button type="button" className="workhud-pm plus" onClick={next}>
              {ui.next}
            </button>
          ) : (
            <button
              type="button"
              className={`workhud-pm plus ${unitMode ? 'unit' : ''} ${
                useBlocks && runStep ? `yarn-${runStep.run.color}` : ''
              } ${
                !useBlocks &&
                (rhythm?.kind === 'two-in-same' || rhythm?.kind === 'finish-two')
                  ? 'inc'
                  : ''
              }`}
              onClick={advance}
              title={primaryLabel}
            >
              {primaryLabel}
              {useBlocks && runStep && (
                <span className="workhud-unit-meta">
                  {ui.fieldOf(runStep.runIndex + 1, runStep.runsTotal)}
                </span>
              )}
              {useRhythm && rProgress && (
                <span className="workhud-unit-meta">
                  {ui.rhythmOf(rProgress.done, rProgress.total)}
                </span>
              )}
            </button>
          )}
          {unitMode && !done && (
            <button
              type="button"
              className="workhud-pm fine"
              onClick={() => setCursor(Math.min(round.count, c + 1))}
              title={ui.plusOneStitchShort}
            >
              {ui.plusOneStitchShort}
            </button>
          )}
          {showJump && !useBlocks && (
            <button
              type="button"
              className="workhud-pm jump"
              onClick={() => setCursor(Math.min(round.count, jumpTo!))}
            >
              {changeIsNow ? ui.nextColorShort : ui.toColorChange}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
