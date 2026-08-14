import { useEffect } from 'react';
import { useApp, getModel, isPatterned } from '../store';
import { YARN_NAME } from '../data/types';
import { roundRuns, increaseRole } from '../data/pattern';
import FieldChips from './FieldChips';

/** One repeat of the increase rhythm — matches the written recipe. */
function rhythmChip(round: { increaseEvery: number | null; count: number; num: number }) {
  const k = round.increaseEvery;
  if (k === null || round.num === 1) return null;
  const repeats = Math.floor(round.count / (k + 1));
  if (k === 1) return `To fastmasker i HVER maske under — gjenta ${repeats} ganger.`;
  if (k === 2) return `Rytmen: én, så TO I SAMME. Gjenta ${repeats} ganger.`;
  return `Rytmen: ${k - 1} vanlige, så TO I SAMME. Gjenta ${repeats} ganger.`;
}

/**
 * Desktop/tablet-landscape: Maske-for-maske overlay on the 3D stage.
 * On phone (hiddenOnMobile) the jump grid lives in Oppskrift instead.
 */
export default function StitchOverlay({ hiddenOnMobile = false }: { hiddenOnMobile?: boolean }) {
  const locale = useApp((s) => s.locale);
  const stepIndex = useApp((s) => s.stepIndex);
  const cursor = useApp((s) => s.stitchCursor);
  const setCursor = useApp((s) => s.setStitchCursor);
  const showFinished = useApp((s) => s.showFinished);
  const open = useApp((s) => s.stitchPanelOpen);
  const setOpen = useApp((s) => s.setStitchPanelOpen);

  const model = getModel();
  const step = model.steps[stepIndex];
  const round = step?.roundIdx !== null && step ? model.rounds[step.roundIdx] : null;
  const patterned = round ? isPatterned(round) : false;

  useEffect(() => {
    if (step?.kind === 'round' && round && cursor === null) setCursor(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex]);

  if (hiddenOnMobile) return null;
  if (!step || step.kind !== 'round' || !round || showFinished) return null;
  if (cursor === null) return null;

  const c = Math.min(cursor, round.count);
  const before = step.roundIdx! > 0 ? model.cumCounts[step.roundIdx! - 1] : 0;
  const runs = patterned ? roundRuns(model.stitches, step.roundIdx!) : [];
  const nextStitch = c < round.count ? model.stitches[before + c] : null;
  const role = nextStitch ? increaseRole(c, round.increaseEvery, round.num) : null;
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

  const colorName = (col: string) =>
    col === 'red' ? 'RØD' : col === 'blue' ? 'BLÅ' : 'hvit';
  const colorCss = (col: string) =>
    col === 'red' ? 'var(--red)' : col === 'blue' ? 'var(--blue)' : 'var(--ink)';
  const rhythm = rhythmChip(round);

  return (
    <div className={`stitch-overlay ${open ? '' : 'collapsed'}`}>
      <button
        type="button"
        className="stitch-overlay-toggle"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <span>Maske for maske</span>
        <span className="stitch-overlay-count">
          {c} / {round.count}
        </span>
        <span className="stitch-overlay-chevron" aria-hidden>
          {open ? '▾' : '▸'}
        </span>
      </button>

      {open && (
        <div className="stitch-overlay-body">
          {rhythm && <p className="stepper-rhythm">{rhythm}</p>}

          <div className="stitch-controls stitch-controls-slim">
            {patterned ? (
              <button
                type="button"
                className="stitch-btn jump"
                onClick={() => setCursor(Math.min(round.count, nextColorBoundary))}
              >
                Til fargebytte
              </button>
            ) : hasIncreases ? (
              <button
                type="button"
                className="stitch-btn jump"
                onClick={() => setCursor(Math.min(round.count, nextIncrease))}
              >
                Til neste økning
              </button>
            ) : null}
            <button
              type="button"
              className="stitch-btn secondary"
              onClick={() => setCursor(round.count)}
            >
              Hele runden
            </button>
          </div>

          {nextStitch ? (
            <p className="stepper-next">
              {role === 'second-of-two' ? (
                <>
                  Neste (nr. {c + 1}): <strong>2/2</strong> — økning i{' '}
                  <strong>samme V</strong> som nr. {c}.
                </>
              ) : role === 'first-of-two' ? (
                <>
                  Neste (nr. {c + 1}): <strong>1/2</strong> —{' '}
                  <strong style={{ color: colorCss(nextStitch.color) }}>
                    {colorName(nextStitch.color)} fastmaske
                  </strong>{' '}
                  (neste = samme hull)
                </>
              ) : (
                <>
                  Neste (nr. {c + 1}):{' '}
                  <strong style={{ color: colorCss(nextStitch.color) }}>
                    {colorName(nextStitch.color)} fastmaske
                  </strong>
                </>
              )}
              {nextStitch.changeColorAfter && (
                <>
                  {' '}
                  — bytt til{' '}
                  <strong style={{ color: colorCss(nextStitch.changeColorAfter) }}>
                    {YARN_NAME[nextStitch.changeColorAfter].toLowerCase()}
                  </strong>{' '}
                  på siste gjennomtrekk.
                </>
              )}
            </p>
          ) : (
            <p className="stepper-next">
              Runden er ferdig — husk kjedemasken i masken med markøren.
            </p>
          )}

          {runs.length > 1 && (
            <FieldChips
              runs={runs}
              round={round}
              cursor={c}
              locale={locale}
              onPick={setCursor}
            />
          )}
        </div>
      )}
    </div>
  );
}
