import { useEffect } from 'react';
import { useApp, getModel, isPatterned } from '../store';
import { YARN_NAME } from '../data/types';
import { roundRuns, increaseRole, runText } from '../data/pattern';

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
 * Maske-for-maske overlay docked on the 3D stage — never in the left panel.
 * Pointer events only on the panel so the canvas stays usable around it.
 */
export default function StitchOverlay() {
  const stepIndex = useApp((s) => s.stepIndex);
  const cursor = useApp((s) => s.stitchCursor);
  const setCursor = useApp((s) => s.setStitchCursor);
  const showFinished = useApp((s) => s.showFinished);
  const open = useApp((s) => s.stitchPanelOpen);
  const setOpen = useApp((s) => s.setStitchPanelOpen);
  const next = useApp((s) => s.next);

  const model = getModel();
  const step = model.steps[stepIndex];
  const round = step?.roundIdx !== null && step ? model.rounds[step.roundIdx] : null;
  const patterned = round ? isPatterned(round) : false;

  useEffect(() => {
    if (step?.kind === 'round' && round && patterned && cursor === null) setCursor(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex]);

  if (!step || step.kind !== 'round' || !round || showFinished) return null;

  if (cursor === null) {
    return (
      <div className={`stitch-overlay ${open ? '' : 'collapsed'}`}>
        <button
          type="button"
          className="stitch-overlay-toggle"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
        >
          <span>Tell med appen</span>
          <span className="stitch-overlay-count">0 / {round.count}</span>
          <span className="stitch-overlay-chevron" aria-hidden>
            {open ? '▾' : '▸'}
          </span>
        </button>
        {open && (
          <div className="stitch-overlay-body stitch-overlay-start">
            <p className="stepper-next">
              Trykk «+1 maske» for hver maske du lager — appen husker hvor du var.
            </p>
            <button className="stitch-start-btn" onClick={() => setCursor(0)}>
              Start telling fra 0
            </button>
          </div>
        )}
      </div>
    );
  }

  const c = Math.min(cursor, round.count);
  const before = step.roundIdx! > 0 ? model.cumCounts[step.roundIdx! - 1] : 0;
  const runs = patterned ? roundRuns(model.stitches, step.roundIdx!) : [];
  const nextStitch = c < round.count ? model.stitches[before + c] : null;
  const role = nextStitch ? increaseRole(c, round.increaseEvery, round.num) : null;
  const curRun = runs.find((r) => c + 1 >= r.from && c + 1 <= r.to);
  const hasIncreases = round.increaseEvery !== null && round.num !== 1;
  const done = c >= round.count;

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

          <div className="stitch-controls">
            <button
              type="button"
              className="stitch-btn minus"
              onClick={() => setCursor(Math.max(0, c - 1))}
              title="−1 (← ↓ Backspace)"
            >
              −1
            </button>
            {done ? (
              <button type="button" className="stitch-btn plus" onClick={next}>
                Neste steg →
              </button>
            ) : (
              <button
                type="button"
                className="stitch-btn plus"
                onClick={() => setCursor(Math.min(round.count, c + 1))}
                title="+1 (Space Enter → ↑)"
              >
                +1 maske
              </button>
            )}
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
            ) : (
              <span className="stitch-btn-spacer" />
            )}
            <button
              type="button"
              className="stitch-btn secondary"
              onClick={() => setCursor(round.count)}
            >
              Hele runden
            </button>
          </div>

          {c > 0 && (
            <button type="button" className="stepper-reset" onClick={() => setCursor(0)}>
              ⟲ Start runden fra 0
            </button>
          )}

          {nextStitch ? (
            <p className="stepper-next">
              {role === 'second-of-two' ? (
                <>
                  Neste (nr. {c + 1}): <strong>2/2</strong> — økning i{' '}
                  <strong>samme V</strong> som nr. {c}. Ikke gå videre.
                </>
              ) : role === 'first-of-two' ? (
                <>
                  Neste (nr. {c + 1}): <strong>1/2</strong> —{' '}
                  <strong style={{ color: colorCss(nextStitch.color) }}>
                    {colorName(nextStitch.color)} fastmaske
                  </strong>{' '}
                  i neste V (første av to; neste = samme hull)
                </>
              ) : (
                <>
                  Neste (nr. {c + 1}):{' '}
                  <strong style={{ color: colorCss(nextStitch.color) }}>
                    {colorName(nextStitch.color)} fastmaske
                  </strong>
                  {role === 'plain' ? ' — én vanlig i neste V' : ''}
                </>
              )}
              {nextStitch.changeColorAfter && (
                <>
                  {' '}
                  — og i DENNE masken bytter du til{' '}
                  <strong style={{ color: colorCss(nextStitch.changeColorAfter) }}>
                    {YARN_NAME[nextStitch.changeColorAfter].toLowerCase()}
                  </strong>{' '}
                  på siste gjennomtrekk (se «Fargebytte» i Maskeskolen).
                </>
              )}
            </p>
          ) : (
            <p className="stepper-next">
              Runden er ferdig — husk kjedemasken i masken med markøren.
            </p>
          )}

          {runs.length > 1 && (
            <div className="runs stitch-runs">
              {runs.map((r, i) => (
                <button
                  key={i}
                  type="button"
                  className={`run-chip ${r.color} ${r === curRun ? 'current' : ''} ${c + 1 > r.to ? 'done' : ''}`}
                  title={`Maske ${r.from}–${r.to}`}
                  onClick={() => setCursor(r.from - 1)}
                >
                  {runText(r)}
                  <span className="run-range">
                    {r.from === r.to ? r.from : `${r.from}–${r.to}`}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
