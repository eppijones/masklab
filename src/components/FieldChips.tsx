import { YARN_HEX } from '../data/types';
import type { YarnColor } from '../data/types';
import { runIncreases, runText, type StitchRun } from '../data/pattern';
import type { Round } from '../data/types';
import { t } from '../i18n/ui';
import type { Locale } from '../i18n/locale';

/**
 * The colour-field map of one round — the "Maske for maske" overview.
 *
 * A field chip on an increase round cannot just say "4 røde": two of those
 * four go into the same V. Every chip therefore carries its own V-map, and a
 * pair that straddles a colour change (two colours into one V) is called out
 * on both chips, because that is the one the eye slides straight past.
 */

/** Dark yarns need light text; the pale end of the palette needs ink. */
function inkOn(color: YarnColor): string {
  const hex = YARN_HEX[color];
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luma = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luma > 0.62 ? '#201D18' : '#FDFAF3';
}

export default function FieldChips({
  runs,
  round,
  cursor,
  locale,
  onPick,
}: {
  runs: StitchRun[];
  round: Round;
  /** Stitches already worked; the next stitch is cursor + 1. */
  cursor: number;
  locale: Locale;
  onPick: (cursorValue: number) => void;
}) {
  const ui = t(locale);
  const hasIncreases = round.increaseEvery !== null && round.num !== 1;
  const anyLinked = runs.some((r) => {
    const inc = runIncreases(r, round);
    return inc.opensInSameV || inc.closesIntoNextV || inc.inside.length > 0;
  });

  return (
    <>
      <div className="runs stitch-runs">
        {runs.map((r, i) => {
          const inc = runIncreases(r, round);
          const current = cursor + 1 >= r.from && cursor + 1 <= r.to;
          const range = r.from === r.to ? `${r.from}` : `${r.from}–${r.to}`;
          const linked = inc.opensInSameV || inc.closesIntoNextV;
          const title = [
            `${ui.stitchWord} ${range}`,
            inc.opensInSameV ? ui.chipOpensSameV(r.from - 1, r.from) : null,
            ...inc.inside.map(([a, b]) => ui.chipPairSameV(a, b)),
            inc.closesIntoNextV ? ui.chipClosesSameV(r.to, r.to + 1) : null,
            // Only worth saying when the field spans fewer V's than stitches;
            // "covers 0 V" on a shared-V single stitch is noise.
            hasIncreases && inc.holes > 0 && inc.holes < r.count
              ? ui.chipHoles(inc.holes)
              : null,
          ]
            .filter(Boolean)
            .join(' · ');

          return (
            <button
              key={i}
              type="button"
              className={`run-chip ${current ? 'current' : ''} ${
                cursor + 1 > r.to ? 'done' : ''
              } ${linked ? 'linked' : ''}`}
              style={{ background: YARN_HEX[r.color], color: inkOn(r.color) }}
              title={title}
              onClick={() => onPick(r.from - 1)}
            >
              {runText(r, locale)}
              <span className="run-range">
                {inc.opensInSameV && (
                  <span className="run-link in" aria-hidden>
                    ↰
                  </span>
                )}
                {range}
                {inc.closesIntoNextV && (
                  <span className="run-link out" aria-hidden>
                    ↱
                  </span>
                )}
              </span>
              {inc.inside.length > 0 && (
                <span className="run-pairs">
                  {inc.inside.map(([a, b]) => `${a}+${b}`).join(' ')}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {hasIncreases && anyLinked && (
        <p className="runs-legend">
          <span className="runs-legend-key">2+3</span> {ui.legendPair}
          <span className="runs-legend-sep">·</span>
          <span className="runs-legend-key">↰ ↱</span> {ui.legendLink}
        </p>
      )}
    </>
  );
}
