import { YARN_HEX } from '../data/types';
import { runIncreases, runText, type StitchRun } from '../data/pattern';
import type { Round } from '../data/types';
import { inkOn } from '../lib/yarnInk';
import { t } from '../i18n/ui';
import type { Locale } from '../i18n/locale';

/**
 * The colour-field map of one round — the "Maske for maske" overview.
 *
 * The chips answer "what colour, how many, where am I". Which two stitches
 * share a V is a different question and it now has its own picture underneath
 * (see VMap); a chip only keeps a dashed edge to say "this boundary is inside
 * a shared V, look at the bracket below". Carrying both the arrows and the
 * pair numbers up here as well made the chip row something to decode.
 */

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

  return (
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
              <span className="run-range">{range}</span>
            </button>
          );
        })}
    </div>
  );
}
