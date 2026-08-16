/**
 * Millimetres. Z up. One stitch width is the gate pitch.
 *
 * Fastmaske with a 4.0 mm hook in Cotton 8/8 (DK) is ~0.63 cm wide in the
 * parent app’s gauge note. Height is 0.85 widths, same as hatGeometry.ts.
 */

export const STITCH_W_MM = 6.3;
export const STITCH_H_MM = STITCH_W_MM * 0.85;
export const MIN_GATES = 10;
export const MAX_GATES = 160;
export const CHAIN_Z_MM = 188;
export const BASE_Z_MM = 0;
export const STATION_Y_MM = 0;
export const NEEDLE_LEN_MM = 42;
export const GATE_THROAT_MM = 4.2;
export const SEED_GATES = 10;

/** Radius of a closed chain of n gates. Circumference = n * pitch. */
export function chainRadius(n: number): number {
  return (Math.max(MIN_GATES, n) * STITCH_W_MM) / (2 * Math.PI);
}

export function stitchTheta(i: number, count: number): number {
  return -((i + 0.5) / Math.max(1, count)) * Math.PI * 2;
}
