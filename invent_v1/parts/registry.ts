/**
 * The registry. Everything downstream — STLs, the twin, the BOM, the guide's
 * fastener callouts — is derived from here.
 */

import { BENCH_PARTS } from './bench.ts';
import type { Mate, PartDef, Track } from './types.ts';

export const PARTS: readonly PartDef[] = [...BENCH_PARTS];

export const PART_BY_ID: Record<string, PartDef> = Object.fromEntries(
  PARTS.map((p) => [p.id, p]),
);

export function partsFor(track: Track): readonly PartDef[] {
  return PARTS.filter((p) => p.tracks.includes(track));
}

export function printedParts(track?: Track): readonly PartDef[] {
  return PARTS.filter((p) => p.print && (!track || p.tracks.includes(track)));
}

/**
 * Fit contracts between parts. Each one states WHY, because a failure message
 * that only says "0.05 < 0.15" tells you a number is wrong but not what will
 * happen to you in the workshop.
 */
export const MATES: readonly Mate[] = [
  {
    a: 'wheel-tooth#seat',
    b: 'gate-4p2#throat',
    type: 'passage',
    why: 'The gate tongue seats in the tooth. Too tight and you cannot swap a gate without a vice; too loose and the throat pose drifts between cycles, which is the whole thing we are trying to make repeatable.',
    tolMm: 0.4,
  },
  {
    a: 'comb-segment#seat',
    b: 'gate-4p2#throat',
    type: 'passage',
    why: 'Same gate part drops into the comb and into the wheel. One part, two homes — that is what keeps the printed inventory small.',
    tolMm: 0.4,
  },
  {
    a: 'needle-collet#needle',
    b: 'gate-4p2#throat',
    type: 'clearance',
    why: 'The needle must pass through the throat with two yarn thicknesses beside it. If this fails, T2 cannot succeed no matter how good the mechanism is.',
  },
  {
    a: 'needle-collet#carriage',
    b: 'rail-bracket#rail',
    type: 'pattern',
    why: 'Both bolt to the MGN9 block on its 20x20 pattern. A mismatch here is discovered with the printer already cold.',
    tolMm: 0.3,
  },
];
