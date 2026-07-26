import { useApp, getModel, isPatterned } from '../store';
import { YARN_HEX } from '../data/types';
import type { YarnColor } from '../data/types';
import { roundRuns, targetHole, increaseRole, rhythmCells } from '../data/pattern';

const NAME_UPPER: Record<YarnColor, string> = { white: 'HVIT', red: 'RØD', blue: 'BLÅ' };
const NAME_PLURAL: Record<YarnColor, string> = { white: 'hvite', red: 'røde', blue: 'blå' };

/** Little locking stitch marker icon (like the plastic ones in the kit). */
function MarkerIcon() {
  return (
    <svg className="hud-marker-icon" viewBox="0 0 24 24" width="22" height="22" aria-hidden>
      <path
        d="M8 3.5 C5 3.5 4 6 4 9 L4 15 C4 18.5 6.5 20.5 9.5 20.5 C12.5 20.5 15 18.5 15 15 L15 8 C15 6.8 16 6 17.2 6 C18.4 6 19.4 6.8 19.4 8 L19.4 10.5"
        fill="none"
        stroke="#1E9E45"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <circle cx="19.4" cy="12.4" r="1.9" fill="#1E9E45" />
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
 * The work HUD, docked in the stage foot: live stitch count and exactly
 * what to do next. For increase rounds the next action is one of three
 * clear roles (én / første av to / andre i samme) — never a countdown
 * to "økning" that people misread against the recipe.
 */
export default function WorkHUD() {
  const stepIndex = useApp((s) => s.stepIndex);
  const cursor = useApp((s) => s.stitchCursor);
  const showFinished = useApp((s) => s.showFinished);

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

  // First upcoming stitch that carries a colour change (inclusive).
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

  // Which run (colour field) the next stitch belongs to, and where in it.
  const runs = patterned ? roundRuns(model.stitches, step.roundIdx) : [];
  const curRun = !done ? runs.find((r) => c + 1 >= r.from && c + 1 <= r.to) : undefined;

  // The stitch in the round BELOW that the next stitch is worked into —
  // shown so app and fabric can be verified against each other per stitch.
  let belowColor: YarnColor | null = null;
  if (!done && step.roundIdx > 0) {
    const prevStart = step.roundIdx > 1 ? model.cumCounts[step.roundIdx - 2] : 0;
    const P = model.rounds[step.roundIdx - 1].count;
    const hole = targetHole(model.stitches, before, before + c);
    belowColor = model.stitches[prevStart + Math.max(0, Math.min(hole, P - 1))].color;
  }

  // Rhythm strip: one cell per hole in the recipe (1 · 1 · 2 i samme).
  const k = round.increaseEvery;
  const showRhythm = !done && !patterned && k !== null && round.num !== 1;
  const cells = k !== null ? rhythmCells(k) : [];
  // Which recipe-cell the NEXT stitch belongs to (0-based into cells).
  const cellIdx =
    k === null ? -1 : k === 1 ? 0 : Math.min(c % (k + 1), k - 1);
  const repeats = k !== null ? Math.floor(round.count / (k + 1)) : 0;

  const nowClass = changeIsNow
    ? 'change'
    : role === 'second-of-two'
      ? 'inc'
      : role === 'first-of-two'
        ? 'pair'
        : '';

  return (
    <div className="workhud">
      <div className="workhud-top">
        <div className="workhud-count">
          <strong>{c}</strong>
          <span>av {round.count}</span>
        </div>

        <div className="workhud-msgs">
          {done ? (
            <div className="workhud-now">
              <strong>Runden er ferdig!</strong> Kjedemaske i masken med markøren.
            </div>
          ) : (
            <div className={`workhud-now ${nowClass}`}>
              {changeIsNow && newColor ? (
                <>
                  <span className="workhud-alert">FARGEBYTTE I DENNE MASKEN</span>
                  Hekle masken med <Dot color={nextStitch!.color} big />{' '}
                  {NAME_UPPER[nextStitch!.color]}, men trekk{' '}
                  <Dot color={newColor} big /> <strong>{NAME_UPPER[newColor]}</strong> gjennom
                  de to siste løkkene.
                </>
              ) : role === 'second-of-two' ? (
                <>
                  <span className="workhud-alert inc">
                    <span className="workhud-frac">2/2</span>
                    ØKNING — SAMME V
                  </span>
                  <span className="workhud-line">
                    Nr. {c + 1}: <strong>den andre</strong> i samme V som nr. {c}. Ikke gå videre.
                  </span>
                </>
              ) : role === 'first-of-two' ? (
                <>
                  <span className="workhud-alert pair">
                    <span className="workhud-frac">1/2</span>
                    TO I SAMME — FØRSTE
                  </span>
                  <span className="workhud-line">
                    Nr. {c + 1}: <Dot color={nextStitch!.color} big />{' '}
                    <strong>{NAME_UPPER[nextStitch!.color]}</strong> i neste V. Neste = samme hull.
                  </span>
                </>
              ) : (
                <span className="workhud-line">
                  Nr. {c + 1}: <Dot color={nextStitch!.color} big />{' '}
                  <strong>{NAME_UPPER[nextStitch!.color]} fastmaske</strong>
                  {role === 'plain' ? ' — én vanlig, ny maske under' : ''}.
                </span>
              )}
            </div>
          )}

          {showRhythm && (
            <div className="workhud-rhythm" title="Én celle = én gammel maske under">
              <span className="rhythm-label">Gjenta:</span>
              <span className="rhythm-cells">
                {cells.map((label, h) => {
                  const isTwo = label !== '1';
                  const on = h === cellIdx;
                  // On the «2 i samme» hole: show 1/2 or 2/2 instead of a vague label.
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

          {!done && c > 0 && c % 10 === 0 && (
            <div className="workhud-marker">
              <MarkerIcon />
              <span className="workhud-marker-text">
                <strong>SETT MARKØR NÅ</strong> — i V-en på masken du nettopp laget (nr. {c}).
                <span className="workhud-marker-sub">
                  Markør {c / 10} av {Math.floor(round.count / 10)} i denne runden.
                </span>
              </span>
            </div>
          )}

          {!done && changeIn !== null && newColor && !changeIsNow && (
            <div className="workhud-upcoming">
              <span
                className="workhud-bignum"
                style={{
                  color:
                    YARN_HEX[nextStitch!.color] === YARN_HEX.white
                      ? '#4A4033'
                      : YARN_HEX[nextStitch!.color],
                }}
              >
                {changeIn}
              </span>
              <span className="workhud-upcoming-text">
                {NAME_PLURAL[nextStitch!.color]} igjen — så bytt til{' '}
                <strong
                  style={{
                    color:
                      YARN_HEX[newColor] === YARN_HEX.white ? '#4A4033' : YARN_HEX[newColor],
                  }}
                >
                  {NAME_UPPER[newColor]}
                </strong>
              </span>
              <span className="workhud-pips">
                {Array.from({ length: Math.min(changeIn, 12) }, (_, i) => (
                  <Dot key={i} color={nextStitch!.color} />
                ))}
                {changeIn > 12 && <span className="workhud-more">…</span>}
                <span className="workhud-arrow">→</span>
                <Dot color={newColor} />
              </span>
            </div>
          )}

          {/* colour verification matters only in the patterned rounds */}
          {!done && patterned && (curRun || belowColor) && (
            <div className="workhud-verify">
              {curRun && (
                <span>
                  Felt: <Dot color={curRun.color} /> {NAME_PLURAL[curRun.color]}{' '}
                  <strong>
                    {c + 1 - curRun.from + 1} av {curRun.to - curRun.from + 1}
                  </strong>{' '}
                  · maske {curRun.from}–{curRun.to}
                  {belowColor && <> · </>}
                </span>
              )}
              {belowColor && (
                <span>
                  Du stikker i en <Dot color={belowColor} />{' '}
                  <strong>{NAME_UPPER[belowColor]} V</strong> under (den turkise ringen).
                </span>
              )}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
