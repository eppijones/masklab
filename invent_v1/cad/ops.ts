/**
 * Constructors for the solid IR. Part builders import only this file.
 *
 * Everything is millimetres and DEGREES. There is no radians escape hatch.
 */

import type { Pt2, Section, Solid, Vec3 } from './solid.ts';

/* -------------------------------------------------------------- 2D -------- */

export const circle = (r: number, seg = 48): Section => ({ op: 'circle', r, seg });

export const rect = (w: number, h: number, center = true): Section => ({
  op: 'rect',
  size: [w, h],
  center,
});

export const poly = (pts: readonly Pt2[]): Section => ({ op: 'poly', pts });

export const union2 = (...children: Section[]): Section => ({ op: 'union2', children });
export const subtract2 = (base: Section, ...tools: Section[]): Section => ({
  op: 'subtract2',
  base,
  tools,
});
export const intersect2 = (...children: Section[]): Section => ({ op: 'intersect2', children });
export const hull2 = (...children: Section[]): Section => ({ op: 'hull2', children });

export const offset2 = (
  child: Section,
  delta: number,
  join: 'Round' | 'Miter' | 'Square' = 'Round',
  seg = 24,
): Section => ({ op: 'offset2', child, delta, join, seg });

export const at2 = (child: Section, t?: Pt2, rDeg?: number): Section => ({
  op: 'at2',
  child,
  t,
  rDeg,
});

/** Round every inner corner of a profile by r. The workhorse fillet. */
export const filletIn = (s: Section, r: number, seg = 24): Section =>
  offset2(offset2(s, -r, 'Round', seg), +r, 'Round', seg);

/** Round every outer corner of a profile by r. */
export const filletOut = (s: Section, r: number, seg = 24): Section =>
  offset2(offset2(s, +r, 'Round', seg), -r, 'Round', seg);

/**
 * A slotted hole: an obround of width `dia` and total length `dia + travel`.
 * Every adjustable bracket on this machine needs one, and neither predecessor
 * toolkit could express it at all.
 */
export const slot2 = (dia: number, travel: number, seg = 32): Section =>
  hull2(
    at2(circle(dia / 2, seg), [-travel / 2, 0]),
    at2(circle(dia / 2, seg), [+travel / 2, 0]),
  );

/** Rounded rectangle with a real, dimensioned corner radius. */
export const roundedRect = (w: number, h: number, r: number, seg = 24): Section =>
  filletOut(rect(w, h), Math.min(r, w / 2 - 0.01, h / 2 - 0.01), seg);

/* -------------------------------------------------------------- 3D -------- */

export const cube = (x: number, y: number, z: number, center = true): Solid => ({
  op: 'cube',
  size: [x, y, z],
  center,
});

export const cyl = (h: number, r: number, seg = 48, center = true): Solid => ({
  op: 'cylinder',
  h,
  r0: r,
  r1: r,
  seg,
  center,
});

export const cone = (h: number, r0: number, r1: number, seg = 48, center = true): Solid => ({
  op: 'cylinder',
  h,
  r0,
  r1,
  seg,
  center,
});

export const sphere = (r: number, seg = 32): Solid => ({ op: 'sphere', r, seg });

export const extrude = (
  section: Section,
  h: number,
  opts: { div?: number; twistDeg?: number; scaleTop?: Pt2 } = {},
): Solid => ({
  op: 'extrude',
  section,
  h,
  div: opts.div ?? 0,
  twistDeg: opts.twistDeg ?? 0,
  scaleTop: opts.scaleTop ?? [1, 1],
});

export const revolve = (section: Section, seg = 96, deg = 360): Solid => ({
  op: 'revolve',
  section,
  seg,
  deg,
});

export const union = (...children: Solid[]): Solid => ({ op: 'union', children });
export const subtract = (base: Solid, ...tools: Solid[]): Solid => ({ op: 'subtract', base, tools });
export const intersect = (...children: Solid[]): Solid => ({ op: 'intersect', children });
export const hull = (...children: Solid[]): Solid => ({ op: 'hull', children });

/** Position and orient a subtree. Degrees, XYZ order. Never mutates. */
export const at = (child: Solid, t?: Vec3, rDeg?: Vec3): Solid => ({ op: 'at', child, t, rDeg });

/* ------------------------------------------------------------ helpers ----- */

/** A through-hole tool: a cylinder long enough to punch clean out both sides. */
export const bore = (dia: number, depth: number, seg = 48): Solid =>
  cyl(depth + 2, dia / 2, seg);

/**
 * A counterbored socket-head cap screw pocket, as a subtraction tool.
 * Origin is the seating face; the shaft runs toward -Z.
 */
export const capScrewPocket = (
  shaftDia: number,
  headDia: number,
  headDepth: number,
  shaftDepth: number,
): Solid =>
  union(
    at(cyl(headDepth + 2, headDia / 2, 32), [0, 0, headDepth / 2 - 1]),
    at(cyl(shaftDepth + 2, shaftDia / 2, 32), [0, 0, -shaftDepth / 2]),
  );

/**
 * A captive hex-nut pocket, entered from the side. The replacement for every
 * heat-set brass insert on this machine.
 *
 * Inserts want a soldering iron at 240 C, a steady hand, and molten plastic
 * fumes in a room somebody lives in — and a crooked insert is the commonest way
 * a printed assembly ends up scrap. A nut dropped into a slot needs a nut.
 *
 * Three details make this print and hold without support:
 *   - the pocket is a hex PRISM lying on its flats, so its roof is two 30-degree
 *     faces rather than a flat bridge over a hole;
 *   - a 0.2 mm squeeze on the across-flats means the nut goes in with thumb
 *     pressure and stays there while you line the part up, upside down;
 *   - the entry slot runs out to the nearest face, so the nut slides in after
 *     printing instead of being paused into place mid-print.
 *
 * Origin is the bolt axis at the pocket's mid-plane; the bolt runs along Z, and
 * the nut enters along +Y.
 */
export const nutPocket = (
  acrossFlats: number,
  thickness: number,
  entryLen: number,
  boltDia: number,
): Solid => {
  const af = acrossFlats + 0.2;
  const r = af / Math.sqrt(3); // circumradius of a hex given across-flats
  const t = thickness + 0.15;
  return union(
    // The nut seat: a 6-sided prism, axis along Z, flat side up.
    at(cyl(t, r, 6), [0, 0, 0], [0, 0, 30]),
    // Entry slot out to the face, same height so the nut slides straight in.
    at(cube(af, entryLen, t, true), [0, entryLen / 2, 0]),
    // The bolt passes clean through the pocket.
    at(cyl(t + 40, boltDia / 2, 32), [0, 0, 0]),
  );
};

/** Radially repeat a subtree n times about Z at radius r. */
export const ringOf = (child: Solid, n: number, r: number, phaseDeg = 0): Solid =>
  union(
    ...Array.from({ length: n }, (_, i) => {
      const a = phaseDeg + (360 * i) / n;
      const rad = (a * Math.PI) / 180;
      return at(child, [r * Math.cos(rad), r * Math.sin(rad), 0], [0, 0, a]);
    }),
  );
