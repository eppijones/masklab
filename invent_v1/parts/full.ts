/**
 * HEKLO M1 — the parts the bench rig grows into.
 *
 * The Station (bench track) is not replaced by any of this. It bolts onto the
 * Z/R carriage exactly as assembled, and everything here goes around it: a
 * turntable and mandrel underneath, a full comb arc beside it, a yarn turret
 * behind it, and the frame that carries the lot.
 *
 * The mandrel is lathed from the app's OWN hat profile — the same buildProfile()
 * rings that draw the 3D hat in the product. The former the machine crochets
 * onto is therefore the shape the pattern actually makes, by construction, not
 * by a modeller's eye.
 */

import { MANDREL_RINGS } from '../data/mandrel-profile.ts';
import {
  at,
  bore,
  circle,
  cyl,
  extrude,
  nutPocket,
  poly,
  revolve,
  ringOf,
  roundedRect,
  slot2,
  subtract,
  union,
  at2,
} from '../cad/ops.ts';
import type { Pt2, Solid } from '../cad/solid.ts';
import { CLEARANCE, NEMA17_HOLES, NUT_AF, NUT_THICK } from './dims.ts';
import {
  COMB_GATES,
  COMB_ROW_DZ_MM,
  COMB_ROW_OFFSET_MM,
  COMB_ROW_TILT_DEG,
  GATE_WALL_MM,
  GATE_W_MM,
  MAX_PART_MM,
  MIN_WALL_MM,
  STITCH_W_MM,
  WHEEL_TEETH,
} from '../machine/units.ts';
import type { PartDef } from './types.ts';

const petg = (o: Partial<NonNullable<PartDef['print']>> = {}): PartDef['print'] =>
  ({
    material: 'PETG' as const,
    layerMm: 0.2,
    walls: 4,
    infillPct: 30,
    supports: false,
    minWallMm: MIN_WALL_MM,
    slicedMinutes: null,
    slicedAt: null,
    ...o,
  }) as PartDef['print'];

/* ------------------------------------------------------------------------- */
/* The mandrel — three bayoneted sections of the app's own hat profile        */
/* ------------------------------------------------------------------------- */

/**
 * The brim flares to 257 mm diameter, which does not fit a 256 mm plate, so
 * the radius is capped. The fabric brim simply hangs past the former's edge —
 * the mandrel is a take-down datum, not a mould, and it does not need to
 * support the last few rounds.
 */
const R_CAP = (MAX_PART_MM - 10) / 2; // 120 mm

/** Split heights, chosen where the profile is closest to vertical. */
const SPLIT_CROWN_Y = 108;
const SPLIT_WALL_Y = 26;

interface Ring {
  r: number;
  y: number;
}

/**
 * Turn a ring list into a closed shell section for revolve(): out along the
 * outer surface, back along an inner surface offset by the wall thickness.
 * Points are [radius, height] — revolve spins them about Z.
 */
function shellSection(rings: readonly Ring[], wall: number, yLo: number, yHi: number): Pt2[] {
  const outer = rings
    .filter((p) => p.y >= yLo - 0.01 && p.y <= yHi + 0.01)
    .map((p) => ({ r: Math.min(p.r, R_CAP), y: p.y }))
    .sort((a, b) => a.y - b.y);

  if (outer.length < 2) throw new Error(`mandrel section ${yLo}..${yHi} has too few rings`);

  const pts: Pt2[] = [];
  for (const p of outer) pts.push([Math.max(p.r, 0.6), p.y]);
  for (let i = outer.length - 1; i >= 0; i--) {
    const p = outer[i];
    pts.push([Math.max(p.r - wall, 0.4), p.y]);
  }
  return pts;
}

/** Outer radius of the former at height y, linearly interpolated. */
function radiusAt(y: number): number {
  const rs = [...MANDREL_RINGS].map((p) => ({ r: Math.min(p.r, R_CAP), y: p.y })).sort((a, b) => a.y - b.y);
  if (y <= rs[0].y) return rs[0].r;
  if (y >= rs[rs.length - 1].y) return rs[rs.length - 1].r;
  for (let i = 1; i < rs.length; i++) {
    if (rs[i].y >= y) {
      const t = (y - rs[i - 1].y) / (rs[i].y - rs[i - 1].y || 1);
      return rs[i - 1].r + t * (rs[i].r - rs[i - 1].r);
    }
  }
  return rs[rs.length - 1].r;
}

/**
 * Bayonet lugs, anchored to the wall at the join height rather than to a
 * guessed radius. A lug placed at a fixed radius on a profile that changes
 * from 80 mm to 100 mm between two sections simply floats in mid-air — which
 * the build gate correctly reported as four disconnected bodies.
 *
 * The lug spans from `wall + 2` INSIDE the outer surface to 2.5 mm proud of
 * it, so it is always welded to the shell whatever the local radius is.
 */
function bayonetLugs(n: number, atY: number, wall: number, w: number, h: number, grow = 0): Solid {
  const rOuter = radiusAt(atY);
  const depth = wall + 4.5 + grow;
  const rMid = rOuter - wall - 2 + depth / 2;
  return ringOf(at(extrude(roundedRect(w, depth, 1), h), [0, 0, 0]), n, rMid, 0);
}

function mandrelSection(d: Record<string, number>): Solid {
  const { wall, yLo, yHi, lugsOut, lugsIn } = d;
  const shell = revolve(poly(shellSection(MANDREL_RINGS, wall, yLo, yHi)), 128, 360);

  let g: Solid = shell;
  if (lugsOut > 0.5) {
    g = union(g, at(bayonetLugs(3, yHi - 6, wall, 9, 4), [0, 0, yHi - 6]));
  }
  if (lugsIn > 0.5) {
    // Oversized so the mating lug twists in without a file.
    g = subtract(g, at(bayonetLugs(3, yLo + 1, wall, 10.4, 5.4, 0.7), [0, 0, yLo + 1]));
  }
  return g;
}

const mandrelCrown: PartDef = {
  id: 'mandrel-crown',
  name: 'Mandrel — crown dome',
  nameNo: 'Mandrell — kronedel',
  kind: 'printed',
  group: 'former',
  tracks: ['full'],
  dims: { wall: 2.4, yLo: SPLIT_CROWN_Y, yHi: 160, lugsOut: 0, lugsIn: 1 },
  qty: 1,
  mount: { frame: 'C', position: [0, 0, 12] },
  build: mandrelSection,
  print: petg({
    infillPct: 15,
    orientationWhy: 'Dome up, no supports. The inside is never seen and never touched by yarn.',
  }),
  note: 'Lathed from the app’s own buildProfile() rings, so the former is the shape the pattern makes.',
};

const mandrelWall: PartDef = {
  id: 'mandrel-wall',
  name: 'Mandrel — wall section',
  nameNo: 'Mandrell — veggdel',
  kind: 'printed',
  group: 'former',
  tracks: ['full'],
  dims: { wall: 2.4, yLo: SPLIT_WALL_Y, yHi: SPLIT_CROWN_Y, lugsOut: 1, lugsIn: 1 },
  qty: 1,
  mount: { frame: 'C', position: [0, 0, 12] },
  build: mandrelSection,
  print: petg({ infillPct: 15, orientationWhy: 'Open cylinder, printed as-is. Bayonets top and bottom.' }),
  note: 'Carries the 14 chart rounds — the part of the hat the lettering lands on.',
};

const mandrelBrim: PartDef = {
  id: 'mandrel-brim',
  name: 'Mandrel — brim skirt',
  nameNo: 'Mandrell — bremskjørt',
  kind: 'printed',
  group: 'former',
  tracks: ['full'],
  dims: { wall: 3.0, yLo: 0, yHi: SPLIT_WALL_Y, lugsOut: 1, lugsIn: 0 },
  qty: 1,
  mount: { frame: 'C', position: [0, 0, 12] },
  build: mandrelSection,
  print: petg({
    infillPct: 20,
    orientationWhy: 'Largest part on the plate at 240 mm. Slow first layer — a warped brim tilts every round above it.',
  }),
  note: `Radius capped at ${R_CAP} mm so it fits the plate; the fabric brim hangs past the edge, which is fine because this is a datum, not a mould.`,
};

/* ------------------------------------------------------------------------- */
/* Turntable                                                                  */
/* ------------------------------------------------------------------------- */

function platter(d: Record<string, number>): Solid {
  const { dia, t, hubDia, beltGroove } = d;
  const disc = extrude(circle(dia / 2, 160), t);
  // GT2 belt groove around the rim: the C axis is driven on the platter edge,
  // which gives a big reduction for free without a gearbox.
  const groove = revolve(
    at2(roundedRect(beltGroove, 3.2, 0.6), [dia / 2 - beltGroove / 2 + 0.4, t / 2]),
    160,
    360,
  );
  const hub = at(bore(hubDia, t + 4), [0, 0, 0]);
  const bolts = ringOf(at(bore(CLEARANCE.M5, t + 4), [0, 0, 0]), 6, dia / 2 - 18);
  const lighten = ringOf(at(bore(26, t + 4), [0, 0, 0]), 8, dia / 2 - 52);
  return subtract(disc, groove, hub, bolts, lighten);
}

const platterPart: PartDef = {
  id: 'platter',
  name: 'Turntable platter (GT2 rim groove)',
  nameNo: 'Dreieskive med remspor',
  kind: 'printed',
  group: 'frame',
  tracks: ['full'],
  dims: { dia: 240, t: 10, hubDia: 102, beltGroove: 7 },
  qty: 1,
  mount: { frame: 'C', position: [0, 0, 0] },
  build: platter,
  print: petg({
    walls: 5,
    infillPct: 25,
    orientationWhy: 'Flat. This is the concentricity datum for the whole machine — check it with a dial indicator before you trust it.',
  }),
  interfaces: [
    { kind: 'bore', id: 'hub', dia: 102, depth: 10, at: [0, 0, 0], axis: [0, 0, 1], fit: 'clear' },
  ],
  fasteners: [{ sku: 'M5x10-BHCS', qty: 6 }],
  note: 'Driven by GT2 on the rim, so the reduction is ~34:1 with no gearbox. One stitch is 8.4 motor steps.',
};

function hubAdapter(d: Record<string, number>): Solid {
  const { od, id, t } = d;
  const ring = extrude(roundedRect(od, od, 6), t);
  const centre = at(bore(id, t + 4), [0, 0, 0]);
  const toPlatter = ringOf(at(bore(CLEARANCE.M5, t + 4), [0, 0, 0]), 6, od / 2 - 12);
  const toBearing = ringOf(at(bore(CLEARANCE.M4, t + 4), [0, 0, 0]), 4, id / 2 + 9);
  return subtract(ring, centre, toPlatter, toBearing);
}

const hub: PartDef = {
  id: 'hub-adapter',
  name: 'Hub adapter — lazy-susan to platter',
  nameNo: 'Navadapter',
  kind: 'printed',
  group: 'frame',
  tracks: ['full'],
  dims: { od: 130, id: 84, t: 8 },
  qty: 1,
  mount: { frame: 'C', position: [0, 0, -10] },
  build: hubAdapter,
  print: petg({ walls: 5, infillPct: 40, orientationWhy: 'Flat, 5 walls. It carries the whole rotating mass.' }),
  fasteners: [
    { sku: 'M5x10-BHCS', qty: 6 },
    { sku: 'M4x12-SHCS', qty: 4 },
  ],
  note: 'The lazy-susan bearing is BOUGHT, never printed — it sets the machine’s concentricity.',
};

/* ------------------------------------------------------------------------- */
/* Full comb arc and wheel hub                                                */
/* ------------------------------------------------------------------------- */

function combArc(d: Record<string, number>): Solid {
  const { gates, pitch, wall, h, seatW, seatD, rowOffset, rowDz, rowTilt, ear } = d;
  const gateLen = gates * pitch + 2 * wall;
  const len = gateLen + 2 * ear;
  const depth = rowOffset + seatD + 2 * wall;

  const rail = extrude(roundedRect(len, depth, 2), h);
  const cuts: Solid[] = [];
  const pocket = 5;
  for (let i = 0; i < gates; i++) {
    const x = -gateLen / 2 + wall + pitch * (i + 0.5);
    // Same convergent stagger as the bench segment: rows separated in HEIGHT
    // and tilted back to a common mouth line, so all ten throats present at one
    // radius. Ten gates on two radii would ask the working edge to zig-zag
    // 10 mm in and out ten times per round, which is not a thing cotton does.
    const upper = i % 2 === 0;
    const z = h / 2 + (upper ? +rowDz : -rowDz) / 2;
    const tilt = upper ? -rowTilt : +rowTilt;
    const y = (upper ? +1 : -1) * (rowOffset / 2 - seatD / 2 - wall);
    cuts.push(
      at(
        extrude(roundedRect(seatW, seatD, 0.3), pocket + 2),
        [x, y, z - (pocket + 2) / 2 + pocket / 2],
        [tilt, 0, 0],
      ),
    );
    cuts.push(at(cyl(h + 8, 1.1, 20), [x, y, h / 2], [tilt, 0, 0]));
  }
  const mounts = [-(gateLen / 2 + ear / 2), +(gateLen / 2 + ear / 2)].map((x) =>
    at(extrude(slot2(CLEARANCE.M4, 6), h + 4), [x, 0, h / 2], [0, 0, 90]),
  );
  return subtract(rail, ...cuts, ...mounts);
}

const comb: PartDef = {
  id: 'comb-arc',
  name: `Retention comb — ${COMB_GATES} gates`,
  nameNo: `Holdekam — ${COMB_GATES} porter`,
  kind: 'printed',
  group: 'comb',
  tracks: ['full'],
  dims: {
    gates: COMB_GATES,
    pitch: STITCH_W_MM,
    wall: 3,
    h: 16,
    ear: 18,
    rowOffset: COMB_ROW_OFFSET_MM,
    rowDz: COMB_ROW_DZ_MM,
    rowTilt: COMB_ROW_TILT_DEG,
    seatW: GATE_W_MM - 2 * GATE_WALL_MM + 0.25,
    seatD: 2 * GATE_WALL_MM + 0.25,
  },
  qty: 1,
  mount: { frame: 'R', position: [-40, 0, -14] },
  build: combArc,
  print: petg({ walls: 5, infillPct: 50, orientationWhy: 'Flat. The seats are the accurate feature; no supports near them.' }),
  fasteners: [
    { sku: 'M4x12-SHCS', qty: 2 },
    { sku: 'M4-NUT', qty: 2 },
  ],
  note: `The bench 3-gate segment scaled to ${COMB_GATES}. Same pitch, same seat, same gate part — nothing relearned.`,
};

function wheelHub(d: Record<string, number>): Solid {
  const { teeth, bossDia, boreDia, t, armSeatW, armSeatD, armR } = d;
  const boss = cyl(t, bossDia / 2, 64);
  const seats = ringOf(at(extrude(roundedRect(armSeatW, armSeatD, 0.4), t + 4), [0, 0, -(t + 4) / 2 + t / 2]), teeth, armR);
  const grub = ringOf(at(cyl(bossDia, CLEARANCE.M3 / 2, 16), [0, 0, 0], [0, 90, 0]), teeth, armR - 4);
  const centre = at(bore(boreDia, t + 4), [0, 0, 0]);
  return subtract(boss, seats, grub, centre);
}

const wheelHubPart: PartDef = {
  id: 'wheel-hub',
  name: `Gate wheel hub (${WHEEL_TEETH} teeth)`,
  nameNo: `Portehjulnav (${WHEEL_TEETH} tenner)`,
  kind: 'printed',
  group: 'wheel',
  tracks: ['full'],
  dims: {
    teeth: WHEEL_TEETH,
    bossDia: 54,
    boreDia: 8.25,
    t: 10,
    armSeatW: 9.2,
    armSeatD: GATE_W_MM + 3.4,
    armR: 20,
  },
  qty: 1,
  mount: { frame: 'W', position: [0, 0, 0] },
  build: wheelHub,
  print: petg({ walls: 5, infillPct: 60, orientationWhy: 'Flat, bore vertical. Every tooth registers off this face.' }),
  interfaces: [
    { kind: 'bore', id: 'hub', dia: 8.25, depth: 10, at: [0, 0, 0], axis: [0, 0, 1], fit: 'slip' },
  ],
  fasteners: [{ sku: 'M3x10-SHCS', qty: WHEEL_TEETH }],
  note: `Takes the same ${WHEEL_TEETH} teeth the bench rig used two of. Nothing about the tooth changes.`,
};

/* ------------------------------------------------------------------------- */
/* Yarn turret and take-down                                                  */
/* ------------------------------------------------------------------------- */

function turretDrum(d: Record<string, number>): Solid {
  const { dia, t, ports, boreDia } = d;
  const drum = extrude(circle(dia / 2, 96), t);
  const feeds = ringOf(at(bore(5.2, t + 4), [0, 0, 0]), ports, dia / 2 - 12);
  const eyelets = ringOf(at(bore(8.2, 6), [0, 0, t - 3]), ports, dia / 2 - 12);
  const centre = at(bore(boreDia, t + 4), [0, 0, 0]);
  const detents = ringOf(at(cyl(4, 2.2, 16), [0, 0, 0]), ports, dia / 2 - 3);
  return subtract(drum, feeds, eyelets, centre, detents);
}

const turret: PartDef = {
  id: 'turret-drum',
  name: 'Yarn turret — 4 colours',
  nameNo: 'Garnkarusell — 4 farger',
  kind: 'printed',
  group: 'yarn',
  tracks: ['full'],
  dims: { dia: 86, t: 14, ports: 4, boreDia: 5.2 },
  qty: 1,
  mount: { frame: 'T', position: [0, 0, 0] },
  build: turretDrum,
  print: petg({ walls: 4, infillPct: 30, orientationWhy: 'Flat. The four feed bores must stay parallel or the yarn rubs.' }),
  fasteners: [{ sku: 'M3x10-SHCS', qty: 2 }],
  note: 'Indexes on the SECOND yarn-over, so the colour change is locked inside the stitch. Up to 1 412 times per hat.',
};

function takedownSkirt(d: Record<string, number>): Solid {
  const { dia, t, fingers, fingerL } = d;
  const ring = subtract(extrude(circle(dia / 2, 96), t), at(bore(dia - 16, t + 4), [0, 0, 0]));
  const finger = at(extrude(roundedRect(fingerL, 5, 1.5), 2.4), [fingerL / 2, 0, 0]);
  const arms = ringOf(finger, fingers, dia / 2 - 6);
  const bolts = ringOf(at(bore(CLEARANCE.M3, t + 4), [0, 0, 0]), 3, dia / 2 - 4);
  return subtract(union(ring, arms), bolts);
}

const skirt: PartDef = {
  id: 'takedown-skirt',
  name: 'Take-down skirt',
  nameNo: 'Nedtrekkskjørt',
  kind: 'printed',
  group: 'former',
  tracks: ['full'],
  dims: { dia: 150, t: 6, fingers: 12, fingerL: 34 },
  qty: 1,
  mount: { frame: 'Z', position: [0, 0, -60] },
  build: takedownSkirt,
  print: petg({
    material: 'TPU',
    infillPct: 20,
    orientationWhy: 'TPU, flat. The fingers must flex — printed rigid, they scar the fabric instead of tensioning it.',
  }),
  fasteners: [{ sku: 'M3x16-SHCS', qty: 3 }],
  note: 'Keeps finished fabric hanging clear of the gates. Without it the hat climbs back into the comb around round 20.',
};

/* ------------------------------------------------------------------------- */
/* Frame                                                                      */
/* ------------------------------------------------------------------------- */

function columnBracket(d: Record<string, number>): Solid {
  const { w, hgt, t } = d;
  const plate = extrude(roundedRect(w, hgt, 3), t);
  const toDeck = [-(w / 2 - 12), w / 2 - 12].map((x) =>
    at(extrude(slot2(CLEARANCE.M5, 6), t + 4), [x, -(hgt / 2 - 12), 0]),
  );
  const toColumn = NEMA17_HOLES.map(([x, y]) => at(bore(CLEARANCE.M5, t + 4), [x, y + 12, 0]));
  // Captive M4 nuts, entered from the top edge. The column bolts pull the
  // bracket against the extrusion, so the nut is loaded in shear-free tension
  // and a printed thread is never asked to hold anything.
  const inserts = [
    [-(w / 2 - 12), hgt / 2 - 10],
    [w / 2 - 12, hgt / 2 - 10],
  ].map(([x, y]) => at(nutPocket(NUT_AF.M4, NUT_THICK.M4, 12, CLEARANCE.M4), [x, y, t / 2]));
  return subtract(plate, ...toDeck, ...toColumn, ...inserts);
}

const column: PartDef = {
  id: 'column-bracket',
  name: 'Station column bracket',
  nameNo: 'Søylebrakett',
  kind: 'printed',
  group: 'frame',
  tracks: ['full'],
  dims: { w: 90, hgt: 110, t: 8 },
  qty: 2,
  mount: { frame: 'base', position: [210, -62, 0] },
  repeats: [
    { position: [210, -62, 0] as const },
    { position: [210, 62, 0] as const },
  ],
  build: columnBracket,
  print: petg({ walls: 5, infillPct: 45, orientationWhy: 'Flat. Slotted to the deck so the column can be trammed vertical.' }),
  fasteners: [
    { sku: 'M5x10-BHCS', qty: 4 },
    { sku: 'M5-TNUT', qty: 4 },
    { sku: 'M4x12-SHCS', qty: 4 },
    { sku: 'M4-NUT', qty: 4 },
  ],
  note: 'Carries the Z column. Tram this vertical before anything above it is trusted.',
};

/* ------------------------------------------------------------------------- */

export const FULL_PARTS: readonly PartDef[] = [
  mandrelCrown,
  mandrelWall,
  mandrelBrim,
  platterPart,
  hub,
  comb,
  wheelHubPart,
  turret,
  skirt,
  column,
];

export const MANDREL_R_CAP = R_CAP;
