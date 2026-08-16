/**
 * The bench rig: the station module of the finished machine, built first and
 * run standalone.
 *
 * This is NOT a jig. Every purchased item here migrates into the full build
 * untouched — the needle carriage, the latch drive, the camera pod, the LED,
 * the thermal sensors, the ESP32, the drivers and the PSU. The only bench-only
 * items are printed (a few kroner of filament) and one temporary mount that the
 * final deck replaces. Every source line carries usedInFull, and the harness
 * fails the build if a bench purchase is not reused.
 *
 * What it answers, in order, each with a stop rule:
 *   T0  the latch hook catches and releases DK cotton
 *   T1  a printed throat holds a hand-made V open at a known pose
 *   T2  the wheel tooth picks a V out of the TENSIONED COMB   <- the new step
 *   T3  one fastmaske: draw-through-two, loop count 1 at the end
 *
 * T2 is the one nobody in any of the four predecessor dossiers tested, and it
 * is the step the whole gate-wheel idea rests on.
 */

import {
  at,
  at2,
  bore,
  cube,
  cyl,
  extrude,
  filletOut,
  insertPocket,
  poly,
  rect,
  roundedRect,
  slot2,
  subtract,
  subtract2,
  union,
  union2,
} from '../cad/ops.ts';
import type { Solid } from '../cad/solid.ts';
import {
  CLEARANCE,
  INSERT_BORE,
  INSERT_DEPTH,
  MGN9,
  MGN9_HOLES,
  NEMA17,
  NEMA17_HOLES,
  NTC,
} from './dims.ts';
import {
  COMB_GATES_BENCH,
  GATE_D_MM,
  GATE_H_MM,
  GATE_THROAT_SWEEP_MM,
  GATE_W_MM,
  GATE_WALL_MM,
  MIN_WALL_MM,
  NEEDLE_DIA_MM,
  STITCH_W_MM,
} from '../machine/units.ts';
import type { PartDef } from './types.ts';

const CHECKED = '2026-08-17';

/** Shared print defaults. Structural parts are PETG: it creeps far less than
 *  PLA under a belt held in tension for hours, and it does not soften at the
 *  temperature a warm stepper puts into its own mount. */
const petg = (overrides: Partial<PartDef['print']> = {}) =>
  ({
    material: 'PETG' as const,
    layerMm: 0.2,
    walls: 4,
    infillPct: 40,
    supports: false,
    minWallMm: MIN_WALL_MM,
    slicedMinutes: null,
    slicedAt: null,
    ...overrides,
  }) as PartDef['print'];

/* ------------------------------------------------------------------------- */
/* 1. The gate throat — the piece the whole project turns on                  */
/* ------------------------------------------------------------------------- */

/**
 * A single gate: a U-shaped throat that clamps one stitch mouth open at a
 * known pose. Taken from HEKLO, which is the one genuinely good mechanism in
 * the four dossiers.
 *
 * The throat is printed in five widths (3.8 / 4.0 / 4.2 / 4.6 / 5.0 mm) so T2
 * can find the one that actually holds cotton. That sweep is a `for` loop over
 * dims, and it produces five validated STLs, five BOM rows and five guide
 * lines for free — which is the entire argument for building a registry
 * instead of hand-modelling parts.
 */
function gateThroat(d: Record<string, number>): Solid {
  const { throat, w, dep, h, wall } = d;

  // 2D profile, looking down the gate's height: x runs across the throat,
  // y runs from the closed floor (-y) to the open mouth (+y).
  const mouthY = dep / 2;
  const slotDepth = dep - wall; // leaves `wall` of floor under the V
  const lead = 0.7; // how much wider the mouth is than the throat
  const leadDepth = 1.4; // over what depth it tapers back to the throat

  const body = roundedRect(w, dep, 1.0);

  // The slot proper, cut clean out through the mouth face.
  const slot = at2(rect(throat, slotDepth + 1), [0, mouthY - slotDepth / 2 + 0.5]);

  // A V lead-in at the mouth. A stitch that arrives a few tenths off centre
  // gets guided in instead of snagged on the lip; without it the tooth has to
  // hit the throat dead-centre, which is the tolerance we are trying to avoid
  // depending on in the first place.
  const leadIn = poly([
    [-(throat / 2 + lead), mouthY + 1],
    [+(throat / 2 + lead), mouthY + 1],
    [+throat / 2, mouthY - leadDepth],
    [-throat / 2, mouthY - leadDepth],
  ]);

  // Subtract the slot and the lead-in as ONE merged region. Removing them in
  // two steps leaves their shared boundary as a coincident edge, and coincident
  // faces are where zero-area triangles come from.
  return union(
    extrude(subtract2(body, union2(slot, leadIn)), h),
    // Locating tongue. The SAME tongue seats this gate in the comb rail and in
    // a wheel tooth, so one printed part serves both homes — which is what
    // keeps the inventory at 8 gates plus 10, instead of HEKLO's 180.
    //
    // Deliberately INSET from the body's back face and overlapped 1 mm in z:
    // a flush face would be tangent, and tangent unions produce degenerate
    // facets rather than a clean weld.
    at(cube(w - 2 * wall, 2 * wall, 5, true), [0, -dep / 2 + wall + 0.2, -1.5]),
  );
}

const gateVariants: PartDef[] = GATE_THROAT_SWEEP_MM.map((throat, i) => ({
  id: `gate-${String(throat).replace('.', 'p')}`,
  name: `Stitch gate — ${throat.toFixed(1)} mm throat`,
  nameNo: `Maskeport — ${throat.toFixed(1)} mm hals`,
  kind: 'printed',
  group: 'comb',
  tracks: ['bench', ...(throat === 4.2 ? (['full'] as const) : [])],
  dims: { throat, w: GATE_W_MM, dep: GATE_D_MM, h: GATE_H_MM, wall: GATE_WALL_MM },
  qty: i === 2 ? 12 : 4, // print more of the nominal; 4 each of the others
  mount: { frame: 'W', position: [0, 0, 0] },
  build: gateThroat,
  print: petg({
    walls: 5,
    infillPct: 60,
    orientationDeg: [0, 0, 0],
    orientationWhy:
      'Throat axis vertical so layer lines run ACROSS the clamping load. Printed flat, the throat splits along a layer the first time a V pulls on it.',
  }),
  interfaces: [
    { kind: 'throat', id: 'throat', width: throat, depth: GATE_D_MM, at: [0, 2.4, 0] },
  ],
  note:
    throat === 4.2
      ? 'Nominal. Carried into the full machine unless T2 says otherwise.'
      : 'Sweep variant — printed so T2 can find the throat that actually holds DK cotton.',
}));

/* ------------------------------------------------------------------------- */
/* 2. The retention comb — the bridge between the two parent designs          */
/* ------------------------------------------------------------------------- */

/**
 * A fixed arc of gate seats that holds the most recent stitch mouths open.
 *
 * This is the part that makes the merge work. On HEKLO a gate holds one mouth
 * for a whole round, which needs 180 gates and an injector. On a recirculating
 * wheel alone, each gate releases its loop after the hook passes and the fabric
 * relaxes — so the next round's pickup is a search again, which is exactly
 * HEKLOMAT's unsolved problem. A fixed comb holds the last few V's open so the
 * wheel picks up from a KNOWN POSE. Ten gates, no chain, no injector.
 *
 * Both predecessor dossiers reach for a comb as a fallback and neither promotes
 * it to the primary mechanism.
 */
function combSegment(d: Record<string, number>): Solid {
  const { gates, pitch, wall, h, seatW, seatD, ear } = d;
  // Gate section plus a mounting ear at each end. The ears exist because the
  // three-gate bench comb is only 21 mm of gate rail — nowhere near enough
  // material to also carry two M3 slots without cutting the rail in half.
  const gateLen = gates * pitch + 2 * wall;
  const len = gateLen + 2 * ear;
  const depth = seatD + 2 * wall;

  const rail = extrude(roundedRect(len, depth, 1.5), h);

  const seats: Solid[] = [];
  const pocket = 5; // matches the gate tongue
  for (let i = 0; i < gates; i++) {
    const x = -gateLen / 2 + wall + pitch * (i + 0.5);
    // A BLIND pocket from the top face, so the gate has a shoulder to sit on
    // rather than dropping straight through...
    seats.push(at(cube(seatW, seatD, pocket + 2, true), [x, 0, h - pocket / 2 + 1]));
    // ...and a through hole, so a seized gate comes out with a 2 mm pin from
    // below instead of a knife from above. You will do this a lot during T2.
    seats.push(at(cyl(h + 4, 1.1, 24), [x, 0, h / 2]));
  }

  // Slotted mounts on the ears, clear of the gate pockets. Slotted rather than
  // drilled because comb height against the wheel is THE calibration that
  // decides whether the machine works — it needs travel, not a fixed hole.
  const mounts = [-(gateLen / 2 + ear / 2), +(gateLen / 2 + ear / 2)].map((x) =>
    at(extrude(slot2(CLEARANCE.M3, 4), h + 4), [x, 0, h / 2], [0, 0, 90]),
  );

  return subtract(rail, ...seats, ...mounts);
}

const comb: PartDef = {
  id: 'comb-segment',
  name: 'Retention comb — 3-gate bench segment',
  nameNo: 'Holdekam — 3 porter',
  kind: 'printed',
  group: 'comb',
  tracks: ['bench'],
  dims: {
    gates: COMB_GATES_BENCH,
    pitch: STITCH_W_MM,
    wall: 2.4,
    h: 10,
    ear: 16,
    seatW: GATE_W_MM - 2 * GATE_WALL_MM + 0.25,
    seatD: 2 * GATE_WALL_MM + 0.25,
  },
  qty: 1,
  mount: { frame: 'base', position: [0, 0, 0] },
  build: combSegment,
  print: petg({
    walls: 5,
    orientationWhy: 'Flat on the bed. The seats are the accurate feature and want no support.',
  }),
  interfaces: [
    { kind: 'throat', id: 'seat', width: GATE_W_MM - 2 * GATE_WALL_MM + 0.25, depth: 10, at: [0, 0, 0] },
    {
      kind: 'boltPattern',
      id: 'feet',
      thread: 'M3',
      holeDia: CLEARANCE.M3,
      positions: [
        [-(COMB_GATES_BENCH * STITCH_W_MM) / 2 - 0.4, -3.9],
        [+(COMB_GATES_BENCH * STITCH_W_MM) / 2 + 0.4, -3.9],
      ],
      at: [0, 0, 0],
      normal: [0, 0, 1],
      gripMm: 10,
    },
  ],
  fasteners: [{ sku: 'M3x16-SHCS', qty: 2 }, { sku: 'M3-NUT', qty: 2 }],
  note: 'The bench slice. The full machine uses a 10-gate arc on the same pitch and the same seat.',
};

/* ------------------------------------------------------------------------- */
/* 3. Wheel tooth and hub                                                     */
/* ------------------------------------------------------------------------- */

function wheelTooth(d: Record<string, number>): Solid {
  const { len, w, h, seatW, seatD, hubDia } = d;

  // A tapered arm: stiff at the root where the bending moment is, thin at the
  // tip so it can enter a stitch mouth without spreading it.
  const arm = extrude(
    filletOut(
      subtract2(
        rect(len, w, false),
        at2(rect(len * 0.5, w), [len * 0.85, w * 0.62]),
        at2(rect(len * 0.5, w), [len * 0.85, -w * 0.62]),
      ),
      0.8,
    ),
    h,
  );

  const seat = at(cube(seatW, seatD, h + 2, true), [len - 6, 0, 0]);
  const hubBore = at(bore(hubDia, h + 4), [0, 0, 0]);
  const grubHole = at(
    cyl(w + 4, CLEARANCE.M3 / 2, 24),
    [0, 0, h * 0.5],
    [90, 0, 0],
  );

  return subtract(at(arm, [0, 0, 0]), seat, hubBore, grubHole);
}

const tooth: PartDef = {
  id: 'wheel-tooth',
  name: 'Gate wheel tooth',
  nameNo: 'Portehjultann',
  kind: 'printed',
  group: 'wheel',
  tracks: ['bench', 'full'],
  dims: {
    len: 30,
    w: 9,
    h: 6,
    seatW: GATE_W_MM - 2 * GATE_WALL_MM + 0.25,
    seatD: 2 * GATE_WALL_MM + 0.25,
    hubDia: 8.25,
  },
  qty: 8,
  mount: { frame: 'W', position: [0, 0, 0] },
  build: wheelTooth,
  print: petg({
    walls: 5,
    infillPct: 60,
    orientationWhy:
      'Flat, arm in the XY plane. The bending load is in-plane, so layer lines never see peel.',
  }),
  interfaces: [
    { kind: 'bore', id: 'hub', dia: 8.25, depth: 6, at: [0, 0, 0], axis: [0, 0, 1], fit: 'slip' },
    { kind: 'throat', id: 'seat', width: GATE_W_MM - 2 * GATE_WALL_MM + 0.25, depth: 6, at: [24, 0, 0] },
  ],
  fasteners: [{ sku: 'M3x10-SHCS', qty: 1 }],
  note: 'Carries one gate. Eight per wheel; the bench runs two so pickup and release can both be watched.',
};

/* ------------------------------------------------------------------------- */
/* 4. Needle collet — the swappable part                                      */
/* ------------------------------------------------------------------------- */

/**
 * Clamps the latch needle. Deliberately its own 3 g part: the bench rig starts
 * with a Panduro ryanal (a rya latch hook, ~3 mm, on the shelf in a high-street
 * shop) and may end up on a knitting-machine needle (~1.8 mm, a specialist
 * order). Swapping is a reprint of this one piece rather than a redesign.
 */
function needleCollet(d: Record<string, number>): Solid {
  const { dia, len, w } = d;

  const body = extrude(roundedRect(w, w, 1.5), len);
  const boreHole = at(cyl(len + 4, dia / 2 + 0.05, 32), [0, 0, len / 2]);
  // Clamp slit plus a cross bolt: tightening pinches the bore instead of
  // relying on a printed interference fit, which cracks.
  const slit = at(cube(0.9, w + 2, len + 2, true), [0, 0, len / 2]);
  const clampBolt = at(cyl(w + 4, CLEARANCE.M3 / 2, 24), [0, 0, len * 0.7], [0, 90, 0]);
  const clampNut = at(cube(5.6, 2.6, 6, true), [-w / 2 + 2.6, 0, len * 0.7], [0, 0, 0]);

  const mount = at(
    subtract(
      extrude(roundedRect(MGN9.blockW + 6, MGN9.blockL - 8, 2), 5),
      ...MGN9_HOLES.map(([x, y]) => at(bore(CLEARANCE.M3, 8), [x, y, 0])),
    ),
    [0, 0, -2.5],
  );

  return subtract(union(body, mount), boreHole, slit, clampBolt, clampNut);
}

const collet: PartDef = {
  id: 'needle-collet',
  name: 'Latch-needle collet',
  nameNo: 'Nalholder',
  kind: 'printed',
  group: 'head',
  tracks: ['bench', 'full'],
  dims: { dia: NEEDLE_DIA_MM, len: 26, w: 14 },
  qty: 2,
  mount: { frame: 'P', position: [0, 0, 0] },
  build: needleCollet,
  print: petg({
    walls: 5,
    infillPct: 60,
    orientationWhy: 'Bore axis vertical. The clamp slit must not fall on a layer boundary.',
  }),
  interfaces: [
    {
      kind: 'bore',
      id: 'needle',
      dia: NEEDLE_DIA_MM + 0.1,
      depth: 26,
      at: [0, 0, 13],
      axis: [0, 0, 1],
      fit: 'press',
    },
    {
      kind: 'boltPattern',
      id: 'carriage',
      thread: 'M3',
      holeDia: CLEARANCE.M3,
      positions: MGN9_HOLES,
      at: [0, 0, -2.5],
      normal: [0, 0, -1],
      gripMm: 5,
    },
  ],
  fasteners: [
    { sku: 'M3x10-SHCS', qty: 4 },
    { sku: 'M3x20-SHCS', qty: 1 },
    { sku: 'M3-NUT', qty: 1 },
  ],
  note: 'Print one for the ryanal (3.0 mm) and one for a machine needle (1.8 mm) — change dims.dia and reprint.',
};

/* ------------------------------------------------------------------------- */
/* 5. Rail bracket, motor mount                                               */
/* ------------------------------------------------------------------------- */

function railBracket(d: Record<string, number>): Solid {
  const { len, h, t } = d;
  const web = extrude(roundedRect(len, 26, 2), t);
  const foot = at(extrude(roundedRect(len, t, 1.5), h), [0, -13 + t / 2, 0], [90, 0, 0]);

  // Rail bolts along the centreline at MGN9's 20 mm hole pitch.
  const railHoles = [-20, 0, 20].map((x) => at(bore(CLEARANCE.M3, t + 4), [x, 0, 0]));
  // Slotted feet into the 2020 T-slot, so the rail can be squared before lock-down.
  const footSlots = [-len / 2 + 10, len / 2 - 10].map((x) =>
    at(extrude(slot2(CLEARANCE.M5, 5), t + 4), [x, -13 - t, h / 2], [90, 0, 0]),
  );

  return subtract(union(web, foot), ...railHoles, ...footSlots);
}

const bracket: PartDef = {
  id: 'rail-bracket',
  name: 'MGN9 rail bracket to 2020',
  nameNo: 'Skinnebrakett',
  kind: 'printed',
  group: 'frame',
  tracks: ['bench', 'full'],
  dims: { len: 70, h: 24, t: 6 },
  qty: 2,
  mount: { frame: 'base', position: [0, 0, 0] },
  build: railBracket,
  print: petg({
    walls: 5,
    infillPct: 50,
    orientationWhy: 'Web flat on the bed; the foot then prints as a bridge-free upstand.',
  }),
  interfaces: [
    {
      kind: 'boltPattern',
      id: 'rail',
      thread: 'M3',
      holeDia: CLEARANCE.M3,
      positions: [
        [-20, 0],
        [0, 0],
        [20, 0],
      ],
      at: [0, 0, 0],
      normal: [0, 0, 1],
      gripMm: 6,
    },
  ],
  fasteners: [
    { sku: 'M3x10-SHCS', qty: 3 },
    { sku: 'M5x10-BHCS', qty: 2 },
    { sku: 'M5-TNUT', qty: 2 },
  ],
  note: 'Slotted feet so the rail can be squared to the comb before lock-down.',
};

function nema17Mount(d: Record<string, number>): Solid {
  const { t, ear } = d;
  const plate = extrude(roundedRect(NEMA17.body + 2 * ear, NEMA17.body, 3), t);
  const boss = at(bore(NEMA17.bossDia + 0.6, t + 4), [0, 0, 0]);
  const faceHoles = NEMA17_HOLES.map(([x, y]) => at(bore(CLEARANCE.M3, t + 4), [x, y, 0]));
  const earSlots = [-(NEMA17.body / 2 + ear / 2), NEMA17.body / 2 + ear / 2].map((x) =>
    at(extrude(slot2(CLEARANCE.M5, 6), t + 4), [x, 0, 0], [0, 0, 90]),
  );
  // Thermistor cartridge pocket, pressed against the motor face. Every powered
  // axis gets one; this is layer 2 of the thermal design, and it is not optional.
  const ntc = at(
    cyl(NTC.cartridgeLen + 2, NTC.cartridgeDia / 2, 24),
    [NEMA17.body / 2 - 4, NEMA17.body / 2 - 5, t / 2],
    [0, 90, 0],
  );
  return subtract(plate, boss, ...faceHoles, ...earSlots, ntc);
}

const motorMount: PartDef = {
  id: 'nema17-mount',
  name: 'NEMA17 mount with thermistor pocket',
  nameNo: 'Motorfeste med temperaturfoler',
  kind: 'printed',
  group: 'frame',
  tracks: ['bench', 'full'],
  dims: { t: 8, ear: 14 },
  qty: 2,
  mount: { frame: 'base', position: [0, 0, 0] },
  build: nema17Mount,
  print: petg({
    walls: 5,
    infillPct: 50,
    orientationWhy:
      'Flat. PETG not PLA here specifically because this part touches a motor that runs warm for hours.',
  }),
  interfaces: [
    {
      kind: 'boltPattern',
      id: 'face',
      thread: 'M3',
      holeDia: CLEARANCE.M3,
      positions: NEMA17_HOLES,
      at: [0, 0, 0],
      normal: [0, 0, 1],
      gripMm: 8,
    },
  ],
  fasteners: [
    { sku: 'M3x16-SHCS', qty: 4 },
    { sku: 'M5x10-BHCS', qty: 2 },
    { sku: 'M5-TNUT', qty: 2 },
  ],
  note: 'The thermistor pocket is a safety feature, not a convenience. Fit the sensor before first power-on.',
};

/* ------------------------------------------------------------------------- */
/* 6. Camera pod and lamp                                                     */
/* ------------------------------------------------------------------------- */

function cameraPod(d: Record<string, number>): Solid {
  const { camW, camH, camD, t, armLen } = d;

  const shell = subtract(
    extrude(roundedRect(camW + 2 * t, camD + 2 * t, 2), camH + t),
    at(cube(camW, camD, camH + 2, true), [0, 0, (camH + t) / 2 + 1]),
    at(cyl(t + 4, 9, 32), [0, 0, t / 2]), // lens aperture
  );

  const arm = at(extrude(roundedRect(armLen, 14, 2), 6), [-(armLen / 2 + camW / 2), 0, 3]);
  const clamp = at(
    subtract(
      extrude(roundedRect(20, 24, 2), 8),
      at(extrude(slot2(CLEARANCE.M5, 8), 12), [0, 0, 0], [0, 0, 90]),
    ),
    [-(armLen + camW / 2), 0, 4],
  );

  // Insert pockets so the lid can be opened repeatedly without stripping PETG.
  const inserts = [
    [camW / 2 + t / 2, camD / 2 + t / 2],
    [-(camW / 2 + t / 2), -(camD / 2 + t / 2)],
  ].map(([x, y]) => at(insertPocket(INSERT_BORE.M3, INSERT_DEPTH.M3), [x, y, camH + t]));

  return subtract(union(shell, arm, clamp), ...inserts);
}

const camera: PartDef = {
  id: 'camera-pod',
  name: 'Camera pod',
  nameNo: 'Kamerahus',
  kind: 'printed',
  group: 'sensing',
  tracks: ['bench', 'full'],
  dims: { camW: 32, camH: 24, camD: 32, t: 3, armLen: 60 },
  qty: 1,
  mount: { frame: 'base', position: [0, 0, 0] },
  build: cameraPod,
  print: petg({
    material: 'PLA',
    infillPct: 25,
    orientationWhy: 'Open side up so the aperture needs no support. PLA is fine — nothing here gets warm.',
  }),
  interfaces: [
    {
      kind: 'boltPattern',
      id: 'lid',
      thread: 'M3',
      holeDia: CLEARANCE.M3,
      positions: [
        [19, 19],
        [-19, -19],
      ],
      at: [0, 0, 27],
      normal: [0, 0, 1],
      gripMm: 3,
    },
  ],
  fasteners: [
    { sku: 'M3x8-SHCS', qty: 2 },
    { sku: 'M3-INSERT', qty: 2 },
    { sku: 'M5x10-BHCS', qty: 1 },
    { sku: 'M5-TNUT', qty: 1 },
  ],
  note: 'Aimed square at the throat. The slotted clamp is how you set the ROI without moving the machine.',
};

/* ------------------------------------------------------------------------- */
/* 7. Yarn path                                                               */
/* ------------------------------------------------------------------------- */

function tensionDancer(d: Record<string, number>): Solid {
  const { armLen, w, t, pivotDia } = d;
  const arm = extrude(roundedRect(armLen, w, 2), t);
  const pivot = at(bore(pivotDia, t + 4), [-armLen / 2 + 8, 0, 0]);
  const eyelet = at(bore(4.2, t + 4), [armLen / 2 - 8, 0, 0]);
  const springPost = at(cyl(6, 2, 16), [-armLen / 2 + 22, 0, t / 2 + 3]);
  return union(subtract(arm, pivot, eyelet), springPost);
}

const dancer: PartDef = {
  id: 'tension-dancer',
  name: 'Yarn tension dancer',
  nameNo: 'Garnstrammer',
  kind: 'printed',
  group: 'yarn',
  tracks: ['bench', 'full'],
  dims: { armLen: 70, w: 12, t: 5, pivotDia: 3.2 },
  qty: 1,
  mount: { frame: 'base', position: [0, 0, 0] },
  build: tensionDancer,
  print: petg({ infillPct: 40, orientationWhy: 'Flat. The arm is a beam; keep layers in-plane.' }),
  interfaces: [
    { kind: 'bore', id: 'pivot', dia: 3.2, depth: 5, at: [-27, 0, 0], axis: [0, 0, 1], fit: 'slip' },
  ],
  fasteners: [{ sku: 'M3x20-SHCS', qty: 1 }, { sku: 'M3-NUT', qty: 1 }],
  note: 'The dancer is what turns "yarn feed" into a measurable quantity. Without it, T3 loop height is luck.',
};

/* ------------------------------------------------------------------------- */
/* 8. Bench base — the one deliberately throwaway printed part                */
/* ------------------------------------------------------------------------- */

function benchBase(d: Record<string, number>): Solid {
  const { len, wide, t } = d;
  const plate = extrude(roundedRect(len, wide, 4), t);
  const slots = [-len / 4, 0, len / 4].map((x) =>
    at(extrude(slot2(CLEARANCE.M5, 20), t + 4), [x, 0, 0], [0, 0, 90]),
  );
  const feet = [
    [-len / 2 + 12, -wide / 2 + 12],
    [len / 2 - 12, -wide / 2 + 12],
    [-len / 2 + 12, wide / 2 - 12],
    [len / 2 - 12, wide / 2 - 12],
  ].map(([x, y]) => at(insertPocket(INSERT_BORE.M4, INSERT_DEPTH.M4), [x, y, t]));
  return subtract(plate, ...slots, ...feet);
}

const base: PartDef = {
  id: 'bench-base',
  name: 'Bench base plate',
  nameNo: 'Benkeplate',
  kind: 'printed',
  group: 'frame',
  tracks: ['bench'],
  dims: { len: 220, wide: 120, t: 8 },
  qty: 1,
  mount: { frame: 'base', position: [0, 0, 0] },
  build: benchBase,
  print: petg({
    infillPct: 25,
    orientationWhy: 'Flat, obviously. Slow first layer — a warped base makes every calibration lie.',
  }),
  fasteners: [{ sku: 'M4-INSERT', qty: 4 }],
  note: 'The only part of the bench rig that does not carry into the full machine. Filament, not money.',
};

/* ------------------------------------------------------------------------- */

export const BENCH_PARTS: readonly PartDef[] = [
  ...gateVariants,
  comb,
  tooth,
  collet,
  bracket,
  motorMount,
  camera,
  dancer,
  base,
];

export const BENCH_CHECKED_AT = CHECKED;
