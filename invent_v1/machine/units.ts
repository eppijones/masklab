/**
 * Millimetres, degrees, Z up. The only place a physical constant is written.
 *
 * Every number here is either derived from the parent app's own gauge or
 * measured off a real part. Where a value is a guess, it says so and carries
 * the experiment that will replace it.
 *
 * Dependency-free on purpose: this module is imported by the browser twin, the
 * Node STL builder and the verification harness. Adding `three` here would
 * break two of the three.
 */

/* ---------------------------------------------------------------- gauge --- */

/**
 * One stitch width. The parent app derives this per hat as
 *   suMm = omkrets_cm * 10 / bodyCount
 * which for the standard dame/56 cm/100-stitch hat is exactly 5.6 mm.
 * (invent/heklomat/tools/dump-patterns.ts writes the same number into
 * .profile.json, so the mandrel and the machine agree by construction.)
 */
export const STITCH_W_MM = 5.6;

/** Row height as a fraction of width — matches src/lib/hatGeometry.ts STITCH_H. */
export const STITCH_H_RATIO = 0.85;
export const STITCH_H_MM = STITCH_W_MM * STITCH_H_RATIO;

/** Hook the catalog patterns are written for. */
export const HOOK_MM = 4.0;

/** DK / Cotton 8-8 doubled, measured relaxed. Replaced by a caliper reading at T0. */
export const YARN_DIA_MM = 2.1;

/* ------------------------------------------------------------ the gates --- */

/**
 * Gate throat width. HEKLO used 4.2 mm (invent/heklo/cad/primitives.ts:60).
 * The throat must clear the needle plus two yarn thicknesses plus a working
 * margin, and that inequality is asserted by the verification harness rather
 * than trusted:
 *
 *   throat >= needleDia + 2 * yarnDia + THROAT_MARGIN_MM
 *
 * The bench rig prints five variants around this value; whichever wins at T2
 * becomes the constant. Until then 4.2 is a starting point, not a result.
 */
export const GATE_THROAT_MM = 4.2;
export const GATE_THROAT_SWEEP_MM = [3.8, 4.0, 4.2, 4.6, 5.0] as const;
export const THROAT_MARGIN_MM = 0.6;

/** Printed gate body, from HEKLO's gateClip(w, d, h, thick). */
export const GATE_W_MM = 5.4;
export const GATE_D_MM = 7.2;
export const GATE_H_MM = 9.5;
export const GATE_WALL_MM = 1.3;

/** Teeth on the presentation wheel. Eight, inherited from HEKLOMAT. */
export const WHEEL_TEETH = 8;

/**
 * Gates in the fixed retention comb — the part that makes this machine
 * different from either parent. Ten is one full magic-ring's worth, so the
 * comb can hold an entire crown start.
 */
export const COMB_GATES = 10;

/** Bench rig builds a three-gate slice of the comb. */
export const COMB_GATES_BENCH = 3;

/* --------------------------------------------------------------- needle --- */

/**
 * Latch needle shank. Two candidate sources, both Norwegian:
 *   - knitting-machine spare (Silver Reed / Brother), ~1.8 mm
 *   - Panduro ryanal / latch hook, ~3.0 mm at the shank
 * The bench rig is dimensioned for the ryanal because it is in stock in a
 * high-street shop; the collet is a separate printed part so swapping to a
 * machine needle is a reprint of one 2 g piece.
 */
export const NEEDLE_DIA_MM = 3.0;
export const NEEDLE_FREE_LEN_MM = 42;

/* ----------------------------------------------------------- envelope ----- */

/** Bambu Lab X1 Carbon. The 250 limit leaves 6 mm of brim clearance. */
export const PLATE_MM = 256;
export const MAX_PART_MM = 250;

/** Standard nozzle. Minimum wall is two extrusions. */
export const NOZZLE_MM = 0.4;
export const MIN_WALL_MM = NOZZLE_MM * 2;

/* ------------------------------------------------------------- fit class -- */

/**
 * Diametral clearance, hole minus shaft, in millimetres. PETG on a well-tuned
 * X1C comes out ~0.1 mm undersize on holes, which is already absorbed here.
 *
 * `press` is deliberately generous compared with a metal press fit: an
 * interference fit in PETG splits the part instead of gripping it.
 */
export const FIT = {
  press: { min: 0.05, max: 0.15 },
  slip: { min: 0.15, max: 0.35 },
  clear: { min: 0.4, max: 1.2 },
} as const;
export type FitClass = keyof typeof FIT;

/* ---------------------------------------------------------------- radii --- */

/** Radius of a round of n stitches. Same relation as src/lib/hatGeometry.ts. */
export function ringRadius(n: number): number {
  return (n * STITCH_W_MM) / (2 * Math.PI);
}

/** Angular pitch of one stitch in a round of n, degrees. */
export function stitchPitchDeg(n: number): number {
  return 360 / Math.max(1, n);
}
