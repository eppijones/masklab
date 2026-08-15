import { useMemo } from 'react';
import { YARN_HEX } from '../data/types';
import type { Round, Stitch } from '../data/types';
import { increaseRole } from '../data/pattern';
import { inkOn } from '../lib/yarnInk';
import { t } from '../i18n/ui';
import type { Locale } from '../i18n/locale';

/**
 * The round drawn the way it is actually worked: one group per V of the round
 * below, holding the one — or two — stitches that go into it.
 *
 * An increase is two stitches in one hole, and that is the single fact a
 * crocheter loses. Saying it in prose ("2+3 i samme V") or with an arrow on a
 * colour chip both ask the reader to rebuild the picture in their head. Here
 * the two stitches sit on one bracket, numbered 1 and 2 in the order they are
 * made, and when the pair straddles a colour change the bracket carries two
 * different colours — which is exactly what the hook has to do.
 */

/** Stitch numbers (1-based) grouped by the V of the previous round they enter. */
export function roundHoles(
  round: Pick<Round, 'count' | 'increaseEvery' | 'num'>,
): number[][] {
  const holes: number[][] = [];
  for (let n = 1; n <= round.count; n++) {
    const role = increaseRole(n - 1, round.increaseEvery, round.num);
    if (role === 'first-of-two' && n < round.count) {
      holes.push([n, n + 1]);
      n++;
    } else {
      holes.push([n]);
    }
  }
  return holes;
}

/** Does this round put two stitches in one V anywhere? */
export function hasSameVPairs(
  round: Pick<Round, 'count' | 'increaseEvery' | 'num'>,
): boolean {
  return round.increaseEvery !== null && round.num !== 1 && round.count > 1;
}

function VBracket() {
  return (
    <svg
      className="vmap-v"
      viewBox="0 0 24 8"
      preserveAspectRatio="none"
      aria-hidden
    >
      <path
        d="M1.6 1.2 L12 6.6 L22.4 1.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function VMap({
  round,
  stitches,
  cursor,
  locale,
  onPick,
}: {
  round: Round;
  /** This round's stitches, in working order. */
  stitches: Stitch[];
  /** Stitches already worked; the next stitch is cursor + 1. */
  cursor: number;
  locale: Locale;
  onPick: (cursorValue: number) => void;
}) {
  const ui = t(locale);
  const holes = useMemo(() => roundHoles(round), [round]);
  const pairs = hasSameVPairs(round);

  // Every stitch carries its own number, so a cell has to be wide enough for
  // the widest number in the round. Three digits need the room; two do not.
  const wide = round.count >= 100;
  // A round with no increases has nothing to bracket — one stitch, one V all
  // the way round — so the bracket row is dropped and the map gets shorter.
  const cls = ['vmap', wide ? 'wide' : '', pairs ? '' : 'flat']
    .filter(Boolean)
    .join(' ');

  return (
    <div className="vmap-wrap">
      <p className="vmap-head">
        <span>{ui.vmapTitle}</span>
        <span className="vmap-head-sub">
          {pairs ? ui.vmapLead : ui.vmapLeadPlain}
        </span>
      </p>
      <div className={cls}>
        {holes.map((hole) => {
          const pair = hole.length === 2;
          const last = hole[hole.length - 1];
          const holdsNext = cursor + 1 >= hole[0] && cursor + 1 <= last;
          return (
            <span
              key={hole[0]}
              className={`vmap-hole ${pair ? 'pair' : ''} ${
                holdsNext ? 'here' : ''
              }`}
            >
              <span className="vmap-cells">
                {hole.map((n, j) => {
                  const st = stitches[n - 1];
                  if (!st) return null;
                  const isNext = cursor + 1 === n;
                  return (
                    <button
                      key={n}
                      type="button"
                      className={`vmap-cell ${cursor >= n ? 'done' : ''} ${
                        isNext ? 'next' : ''
                      }`}
                      style={{
                        background: YARN_HEX[st.color],
                        color: inkOn(st.color),
                      }}
                      onClick={() => onPick(n - 1)}
                      title={
                        pair
                          ? ui.vmapPairTitle(hole[0], hole[1], j + 1)
                          : ui.vmapSingleTitle(n)
                      }
                    >
                      {n}
                    </button>
                  );
                })}
              </span>
              {pairs && (pair ? <VBracket /> : <span className="vmap-tick" aria-hidden />)}
            </span>
          );
        })}
      </div>
      {pairs && (
        <p className="vmap-legend">
          <span className="vmap-legend-key" aria-hidden>
            <VBracket />
          </span>
          {ui.vmapLegend}
        </p>
      )}
    </div>
  );
}
