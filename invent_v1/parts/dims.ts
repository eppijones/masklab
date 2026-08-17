/**
 * Shared parametric geometry. Numbers that more than one part needs live here
 * so a change propagates instead of drifting.
 */

import { at2, circle, filletOut, rect, subtract2, union2 } from '../cad/ops.ts';
import type { Section } from '../cad/solid.ts';

/* ------------------------------------------------------------- profiles --- */

/**
 * 2020 T-slot cross-section, centred on the origin.
 *
 * Built as a square minus four slots rather than as one traced outline. The
 * inherited version (invent/hatteblokk/cad/primitives.ts:56) walks a polyline
 * that revisits the same vertices repeatedly — THREE's triangulator tolerates
 * that, but manifold's Positive fill rule does not, and it would come out as a
 * self-intersecting mess. Constructive is also just easier to read.
 *
 * We never print extrusion; it is bought aluminium. This exists so the twin can
 * show the frame and so brackets can be dimensioned against a real profile.
 */
export const PROFILE_2020: Section = (() => {
  const half = 10;
  const slotMouth = 6.2; // opening at the face
  const slotDepth = 5.8; // to the inner channel
  const boreDia = 4.2; // the central through-hole

  const faceSlot = (rotDeg: number): Section =>
    at2(rect(slotMouth, slotDepth * 2, true), [0, 0], rotDeg);

  // Each slot is a rectangle straddling a face; only the outer half cuts.
  const slots = union2(
    at2(faceSlot(0), [0, half]),
    at2(faceSlot(0), [0, -half]),
    at2(faceSlot(90), [half, 0]),
    at2(faceSlot(90), [-half, 0]),
  );

  return subtract2(filletOut(rect(half * 2, half * 2), 1.2), slots, circle(boreDia / 2, 24));
})();

/* --------------------------------------------------------------- bolts ---- */

/** Clearance holes. Metric close fit — a snug bolt is a located bolt. */
export const CLEARANCE = { M3: 3.4, M4: 4.5, M5: 5.5 } as const;

/** Socket-head cap screw head diameters, for counterbores. */
export const CAP_HEAD = { M3: 5.5, M4: 7.0, M5: 8.5 } as const;

/** Heat-set brass insert bores. Standard knurled inserts for PETG. */
export const INSERT_BORE = { M3: 4.0, M4: 5.6, M5: 6.4 } as const;
export const INSERT_DEPTH = { M3: 5.7, M4: 8.1, M5: 9.5 } as const;

/* ------------------------------------------------------------- hardware --- */

/** NEMA17 face: 31 mm bolt circle on a 42.3 mm body, 5 mm shaft, 22 mm boss. */
export const NEMA17 = {
  body: 42.3,
  len: 40,
  shaftDia: 5,
  shaftLen: 22,
  bossDia: 22,
  bossH: 2,
  boltPitch: 31,
  boltDia: 3,
} as const;

export const NEMA17_HOLES: readonly (readonly [number, number])[] = [
  [-NEMA17.boltPitch / 2, -NEMA17.boltPitch / 2],
  [+NEMA17.boltPitch / 2, -NEMA17.boltPitch / 2],
  [+NEMA17.boltPitch / 2, +NEMA17.boltPitch / 2],
  [-NEMA17.boltPitch / 2, +NEMA17.boltPitch / 2],
];

/** MGN9 carriage block: 4 x M3 on a 20 x 20 pattern, 10 mm above the rail. */
export const MGN9 = {
  railW: 9,
  railH: 6.5,
  blockW: 20,
  blockL: 39,
  blockH: 10,
  boltX: 20,
  boltY: 20,
  boltDia: 3,
} as const;

export const MGN9_HOLES: readonly (readonly [number, number])[] = [
  [-MGN9.boltX / 2, -MGN9.boltY / 2],
  [+MGN9.boltX / 2, -MGN9.boltY / 2],
  [+MGN9.boltX / 2, +MGN9.boltY / 2],
  [-MGN9.boltX / 2, +MGN9.boltY / 2],
];

/** 608ZZ skate bearing — the cheapest precision object in any hardware shop. */
export const BEARING_608 = { od: 22, id: 8, w: 7 } as const;

/** MG90S metal-gear servo. */
export const MG90S = { body: [22.8, 12.2, 22.5], hornDia: 20, boltPitch: 32, boltDia: 2 } as const;

/** NTC 100k glass-bead thermistor in a 3 mm heatsink cartridge. */
export const NTC = { cartridgeDia: 3.2, cartridgeLen: 12 } as const;
