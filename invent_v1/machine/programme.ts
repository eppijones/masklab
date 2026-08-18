/**
 * The hat as a PARAMETER, not a constant.
 *
 * Every number the site quotes — stitches, hours, metres of yarn, mandrel
 * height — was previously written for exactly one hat: 56 cm, 42 rounds,
 * 3 694 stitches. That made the machine look like a machine for making one
 * object, which is not what it is. The pattern app already ships 52 / 56 / 60
 * plus custom, and the machine's only size-dependent physical part is the
 * mandrel.
 *
 * So: give this module a circumference and a round count and it returns the
 * programme — the round-by-round stitch counts the machine would actually run.
 *
 * WHY NOT IMPORT THE APP'S DERIVATION DIRECTLY: `src/sizing/derive.ts` pulls in
 * chart repeats, wave blocks, colour layout and THREE. This module has to stay
 * dependency-free so the browser twin, the Node builder and the harness can all
 * read it. So it reimplements the *counts* — and then the harness replays all
 * eight snapshotted hats through it and fails if the reimplementation and the
 * app disagree. A second implementation that is checked against the first is a
 * safety net; one that is not checked is just a second thing to be wrong.
 */

import { STITCH_H_MM, STITCH_W_MM, ROUNDS, SIZE_CM } from './units.ts';

/** The app's canonical crown schedule for a 100-stitch body. */
const CROWN_100: readonly { count: number; inc: boolean }[] = [
  { count: 10, inc: false },
  { count: 20, inc: true },
  { count: 30, inc: true },
  { count: 30, inc: false },
  { count: 40, inc: true },
  { count: 40, inc: false },
  { count: 40, inc: false },
  { count: 50, inc: true },
  { count: 60, inc: true },
  { count: 70, inc: true },
  { count: 70, inc: false },
  { count: 70, inc: false },
  { count: 80, inc: true },
  { count: 80, inc: false },
  { count: 80, inc: false },
  { count: 90, inc: true },
  { count: 90, inc: false },
  { count: 90, inc: false },
  { count: 100, inc: true },
];

export interface ProgrammeRound {
  num: number;
  phase: 'crown' | 'wall' | 'brim';
  count: number;
  /** Stitches in this round that are increases. */
  increases: number;
}

export interface Programme {
  circCm: number;
  rounds: number;
  suMm: number;
  bodyCount: number;
  crownRounds: number;
  wallRounds: number;
  brimRounds: number;
  totalStitches: number;
  /** Metres of yarn. One single crochet consumes about 4.2 stitch widths. */
  yarnM: number;
  /** Height of the former, crown to brim, mm. */
  mandrelHmm: number;
  /** Widest radius the fabric reaches, mm. Compared against the print plate. */
  maxRmm: number;
  list: ProgrammeRound[];
}

/** Stitch width for a given hook, matching the app's gauge relation. */
export function stitchWidthFor(hookMm = 4.0): number {
  return (STITCH_W_MM * hookMm) / 4.0;
}

/**
 * Body stitch count for a circumference.
 *
 * Snapped to an EVEN count, not to a multiple of ten. Ten was the obvious
 * choice because the canonical crown schedule steps in tens — and it quietly
 * made the machine offer three sizes instead of a range: at 5.6 mm per stitch,
 * ten stitches is 5.6 cm of head, so 60 cm and 62 cm both landed on 110 and
 * came out as the same hat. Even is enough for increases to distribute
 * symmetrically, and it gives about 1 cm of resolution.
 */
export function bodyCountFor(circCm: number, suMm = STITCH_W_MM): number {
  const raw = (circCm * 10) / suMm;
  return Math.max(60, Math.round(raw / 2) * 2);
}

/** The crown schedule scaled from the canonical 100 to any body count. */
export function crownFor(bodyCount: number): ProgrammeRound[] {
  const k = bodyCount / 100;
  const out: ProgrammeRound[] = [];
  let prev = 0;
  for (let i = 0; i < CROWN_100.length; i++) {
    const target = i === CROWN_100.length - 1 ? bodyCount : Math.round(CROWN_100[i].count * k);
    // A round can never shrink: the crown only ever grows or holds.
    const count = Math.max(prev, Math.max(10, target));
    out.push({
      num: i + 1,
      phase: 'crown',
      count,
      increases: Math.max(0, count - prev === count ? 0 : count - prev),
    });
    prev = count;
  }
  // The first round is the magic ring: every stitch in it is a new stitch, but
  // none of them is an increase worked into a previous round.
  out[0].increases = 0;
  return out;
}

/**
 * The brim, as the published patterns actually work it: increase rounds with
 * plateaus between them, not a smooth flare. Nine rounds, and the plateaus are
 * what stop the brim ruffling.
 *
 * Taken from NORGE Away round-for-round (110, 120, 120, 120, 120, 132, 144,
 * 144, 144 on a 100-stitch body) and expressed as ratios so it scales. The
 * harness replays all eight snapshotted hats through this and fails on drift.
 */
const BRIM_STEPS = [1.1, 1.2, 1.2, 1.2, 1.2, 1.32, 1.44, 1.44, 1.44] as const;

export function programme(
  circCm: number = SIZE_CM.nominal,
  totalRounds: number = ROUNDS.nominal,
  hookMm = 4.0,
): Programme {
  const suMm = stitchWidthFor(hookMm);
  const bodyCount = bodyCountFor(circCm, suMm);

  const crown = crownFor(bodyCount);
  const brim: ProgrammeRound[] = BRIM_STEPS.map((f, i) => {
    const count = Math.round(bodyCount * f);
    const prev = i === 0 ? bodyCount : Math.round(bodyCount * BRIM_STEPS[i - 1]);
    return { num: 0, phase: 'brim' as const, count, increases: Math.max(0, count - prev) };
  });

  const wallRounds = Math.max(1, totalRounds - crown.length - brim.length);
  const wall: ProgrammeRound[] = Array.from({ length: wallRounds }, () => ({
    num: 0,
    phase: 'wall' as const,
    count: bodyCount,
    increases: 0,
  }));

  const list = [...crown, ...wall, ...brim].map((r, i) => ({ ...r, num: i + 1 }));
  const totalStitches = list.reduce((s, r) => s + r.count, 0);
  const maxRmm = (list[list.length - 1].count * suMm) / (2 * Math.PI);

  return {
    circCm,
    rounds: list.length,
    suMm,
    bodyCount,
    crownRounds: crown.length,
    wallRounds,
    brimRounds: brim.length,
    totalStitches,
    // A single crochet eats roughly 4.2 stitch widths of yarn: two legs, the
    // top V, and the draw-through. Measured off a swatch, not derived.
    yarnM: (totalStitches * suMm * 4.2) / 1000,
    mandrelHmm: Math.round(list.length * STITCH_H_MM * (suMm / STITCH_W_MM) * 10) / 10,
    maxRmm: Math.round(maxRmm * 10) / 10,
    list,
  };
}

/** The size range the machine can actually build, as discrete offerings. */
export const SIZE_PRESETS = [
  { id: 'barn', label: 'Barn', labelNo: 'Barn', circCm: 52 },
  { id: 'dame', label: 'Women', labelNo: 'Dame', circCm: 56 },
  { id: 'herre', label: 'Men', labelNo: 'Herre', circCm: 60 },
] as const;
