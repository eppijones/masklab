/**
 * The one place stitch units become millimetres, and the one place the hat's shape is
 * derived from its stitch counts.
 *
 * StrikkeApp works in arbitrary stitch units (STITCH_W = 1, STITCH_H = 0.85 in
 * src/lib/hatGeometry.ts). The machine works in mm. Every conversion goes through this
 * file so the twin, the CAD, the BOM and the emitted G-code cannot disagree about how
 * big a stitch is.
 */

/** Scene + CAD unit. 1 three.js unit === 1 mm, everywhere, no exceptions. */
export const MM = 1;

/**
 * Width of one fastmaske in the sidewall, mm.
 *
 * [REPO FACT] The app pins bodyCount = 100 at size `dame` (omkrets 56 cm) with a 4.0 mm
 * hook (src/sizing/derive.ts BODY_100_PINNED, src/sizing/sizes.ts). 560 mm / 100 st =
 * 5.6 mm. We use the pin rather than the 0.63 cm constant in src/data/steps.ts, because
 * that one is calibrated against a FLAT disc and the former needs the in-the-round value.
 */
export const STITCH_W_MM = 5.6;

/** Height of one round, mm. Parent uses STITCH_H = 0.85 × STITCH_W. */
export const STITCH_H_MM = 0.85 * STITCH_W_MM;

/** Hook diameter the patterns default to, mm. [REPO FACT] */
export const HOOK_MM = 4.0;

/** Radius of a round holding `count` stitches, mm. Mirrors hatGeometry.radiusFor(). */
export function radiusForMm(count: number): number {
  return (count * STITCH_W_MM) / (2 * Math.PI);
}

/** Angular pitch of one stitch in a round of `count`, degrees. */
export function stitchPitchDeg(count: number): number {
  return 360 / count;
}

/**
 * Yarn consumed by one fastmaske, mm — the basis of the machine's primary
 * stitch-verification signal (see the sensing table in the site's Electronics section).
 *
 * [ENGINEERING INFERENCE] A sc draws two bights, each roughly one loop circumference.
 * Modelled as k × stitch width; k is calibrated at experiment P2. The band is
 * deliberately wide until we have real data. [HYPOTHESIS]
 */
export const YARN_PER_SC_MM = 3.05 * STITCH_W_MM;
export const YARN_PER_SC_TOLERANCE = 0.18;

/**
 * NORGE · Home stitch counts, IN MACHINE ORDER (rim first, crown last).
 *
 * [REPO FACT] This is the app's own 42-round schedule for `norway26-training` at
 * dame + 4.0 mm — 3694 stitches, 134 shaping events — reversed. The app works
 * crown-down and only ever increases; the machine works rim-up and only ever decreases,
 * which turns the magic-ring start (the operation that stopped Croche-Matic) into a
 * plain 144-chain ring the machine can make in free air.
 *
 * Phase 2 replaces this literal with compiler output read from a frozen snapshot of
 * derivePattern(); it is inlined here so the twin runs before the compiler exists.
 */
export const MACHINE_ROUNDS: readonly number[] = [
  // brim, rim edge first (app rounds 42 -> 34)
  144, 144, 144, 132, 120, 120, 120, 120, 110,
  // sidewall — the 14 rounds carrying the NORGE colour chart (app rounds 33 -> 20)
  100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100,
  // crown, closing to 10 (app rounds 19 -> 1)
  100, 90, 90, 90, 80, 80, 80, 70, 70, 70, 60, 50, 40, 40, 40, 30, 30, 20, 10,
];

export const TOTAL_STITCHES = MACHINE_ROUNDS.reduce((a, b) => a + b, 0);
export const TOTAL_ROUNDS = MACHINE_ROUNDS.length;

export interface RingPos {
  /** Round index in machine order, 0 = rim. */
  idx: number;
  count: number;
  r: number;
  z: number;
  /** Surface angle from vertical, degrees. 0 = sidewall, 90 = flat brim/crown. */
  tiltDeg: number;
}

/**
 * The former's profile, DERIVED from the stitch counts rather than drawn by hand.
 *
 * Same integration the app uses in buildProfile(): the round-to-round rise is
 * dz = sqrt(h² − dr²), so a round that grows a lot in radius rises very little (the flat
 * brim) and a round with constant radius rises a full stitch height (the sidewall).
 * A floor keeps the brim from becoming perfectly flat and pinching the needle.
 */
export function formerProfile(): RingPos[] {
  const out: RingPos[] = [];
  let z = 0;
  for (let i = 0; i < MACHINE_ROUNDS.length; i++) {
    const count = MACHINE_ROUNDS[i];
    const r = radiusForMm(count);
    if (i > 0) {
      const dr = Math.abs(r - out[i - 1].r);
      const h = STITCH_H_MM;
      z += Math.max(Math.sqrt(Math.max(h * h - dr * dr, 0)), 0.18 * h);
    }
    out.push({ idx: i, count, r, z, tiltDeg: 0 });
  }
  // Smooth the radius the way the app's buildProfile() does: the raw stitch counts step
  // in blocks of ten, which would give the former a wedding-cake silhouette rather than a
  // hat. Three passes is enough to blend the steps without moving any round's radius by
  // more than a fraction of a stitch.
  for (let pass = 0; pass < 3; pass++) {
    const r = out.map((p) => p.r);
    for (let i = 1; i < out.length - 1; i++) out[i].r = r[i - 1] * 0.25 + r[i] * 0.5 + r[i + 1] * 0.25;
  }
  // Re-integrate the rise against the smoothed radii.
  out[0].z = 0;
  for (let i = 1; i < out.length; i++) {
    const dr = Math.abs(out[i].r - out[i - 1].r);
    const h = STITCH_H_MM;
    out[i].z = out[i - 1].z + Math.max(Math.sqrt(Math.max(h * h - dr * dr, 0)), 0.18 * h);
  }

  // Surface angle from the local slope: atan2(|dr|, dz).
  for (let i = 0; i < out.length; i++) {
    const a = out[Math.max(i - 1, 0)];
    const b = out[Math.min(i + 1, out.length - 1)];
    const dr = a.r - b.r;
    const dz = b.z - a.z;
    out[i].tiltDeg = Math.max(-15, Math.min(95, (Math.atan2(dr, Math.max(dz, 1e-3)) * 180) / Math.PI));
  }
  return out;
}

export const FORMER = formerProfile();
export const BLOCK_HEIGHT_MM = FORMER[FORMER.length - 1].z;
export const BLOCK_MAX_R_MM = Math.max(...FORMER.map((p) => p.r));

/** (z, r) pairs for the lathe, plus a small closing cap at the crown. */
export const BLOCK_PROFILE: ReadonlyArray<{ z: number; r: number }> = [
  { z: -14, r: BLOCK_MAX_R_MM },
  ...FORMER.map((p) => ({ z: p.z, r: p.r })),
  { z: BLOCK_HEIGHT_MM + 3, r: 4 },
  { z: BLOCK_HEIGHT_MM + 4, r: 0.5 },
];
