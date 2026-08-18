/**
 * The registry. Everything downstream — STLs, the twin, the BOM, the guide's
 * fastener callouts — is derived from here.
 */

import { GATE_THROAT_MM } from '../machine/units.ts';
import { BENCH_PARTS, gateId } from './bench.ts';
import { FULL_PARTS } from './full.ts';
import type { Mate, PartDef, Track } from './types.ts';

/**
 * The nominal gate, derived rather than typed. Hardcoding `gate-7` here meant
 * that moving the nominal throat width left the mate silently pointing at a
 * sweep variant — the harness caught it, but only because it happened to
 * compare the wrong number. Deriving removes the possibility.
 */
const NOMINAL_GATE = gateId(GATE_THROAT_MM);

export const PARTS: readonly PartDef[] = [...BENCH_PARTS, ...FULL_PARTS];

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
    b: `${NOMINAL_GATE}#tongue`,
    type: 'passage',
    why: 'The gate TONGUE seats in the tooth — not the throat, which is the aperture on the other end of the part. Too tight and you cannot swap a gate without a vice; too loose and the throat pose drifts between cycles, which is the one thing this whole mechanism exists to make repeatable.',
    tolMm: 0.4,
  },
  {
    a: 'comb-segment#seat',
    b: `${NOMINAL_GATE}#tongue`,
    type: 'passage',
    why: 'The same gate part drops into the comb and into a wheel tooth. One part, two homes — that is what keeps the printed inventory at 8 plus 10 instead of HEKLO’s 180.',
    tolMm: 0.4,
  },
  {
    a: 'wheel-tooth#hub',
    b: 'wheel-shaft#journal',
    type: 'clearance',
    why: 'The wheel hub turns on an 8 mm shaft set by the 608 bearing bore. Too tight and the printed hub splits when the shaft is pressed in; too loose and the tooth tip wanders, which shows up as a pickup that works on the bench and fails in a round.',
  },
  {
    a: 'crochet-hook#nose',
    b: `${NOMINAL_GATE}#throat`,
    type: 'clearance',
    why: 'The hook NOSE must pass through the throat with both legs of the stitch mouth beside it. This is the inequality that forced the comb into two rows — at one row a gate has to be narrower than the stitch pitch, which caps the throat below the diameter of the tool alone. If this check fails, G2 cannot succeed no matter how good the mechanism is. Note it is the nose, not the shank: the shank is 5 mm and never enters a gate, and comparing the wrong one makes an impossible machine look fine.',
  },
  {
    a: 'hook-collet#shank',
    b: 'crochet-hook#shank',
    type: 'clearance',
    why: 'The hook is a consumable and gets swapped mid-run with cold hands. A slip fit plus a clamp slit means you change it in ten seconds; a press fit means you change it with pliers and re-aim the camera afterwards.',
  },
];
