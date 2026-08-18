/**
 * The bench rig: the station module of the finished machine, built first and
 * run standalone.
 *
 * This is NOT a jig. Every purchased item here migrates into the full build
 * untouched — the hook carriage, the wheel drive, the camera pod, the LED, the
 * thermal sensors, the ESP32, the drivers and the PSU. The only bench-only
 * items are printed (a few kroner of filament) and one temporary mount that the
 * final deck replaces. Every source line carries usedInFull, and the harness
 * fails the build if a bench purchase is not reused.
 *
 * What it answers, in order, each with a stop rule:
 *   G0  a printed gate CATCHES a live stitch off a moving fabric edge
 *   G1  the gate holds it while a printed hook passes through
 *   G2  the wheel tooth picks a V out of the TENSIONED COMB
 *   G3  one fastmaske: draw-through-two, loop count 1 at the end
 *
 * G0 comes first because it is the question every predecessor skipped and the
 * only one that can be answered for the price of filament. If a gate cannot
 * take a stitch off a turning tube by hand, no amount of motion hardware will
 * make it take one at speed — and that is worth knowing before 6 124 kr of
 * motors, rails and drivers arrive in the post. See machine/reliability.ts.
 *
 * Nothing on this rig is sharp and nothing is soldered. The hook is printed
 * (there is no latch needle) and every threaded hole in plastic is a captive
 * nut (there are no heat-set inserts).
 */

import {
  at,
  at2,
  bore,
  circle,
  cone,
  cube,
  cyl,
  extrude,
  filletOut,
  hull,
  nutPocket,
  poly,
  rect,
  roundedRect,
  slot2,
  sphere,
  subtract,
  subtract2,
  union,
  union2,
} from '../cad/ops.ts';
import type { Solid } from '../cad/solid.ts';
import {
  BEARING_608,
  CLEARANCE,
  MG90S,
  MGN9,
  MGN9_HOLES,
  NEMA17,
  NEMA17_HOLES,
  NTC,
  NUT_AF,
  NUT_THICK,
} from './dims.ts';
import {
  COMB_GATES_BENCH,
  COMB_ROW_DZ_MM,
  COMB_ROW_OFFSET_MM,
  COMB_ROW_TILT_DEG,
  GATE_D_MM,
  GATE_H_MM,
  GATE_THROAT_MM,
  GATE_THROAT_SWEEP_MM,
  GATE_W_MM,
  GATE_WALL_MM,
  HOOK_FREE_LEN_MM,
  HOOK_GROOVE_MM,
  HOOK_NOSE_MM,
  HOOK_SHAFT_MM,
  MIN_WALL_MM,
  STITCH_W_MM,
  WHEEL_TEETH,
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
 * The throat is printed across a sweep of widths so T2 can find the one that
 * actually holds cotton. That sweep is a `map` over dims, and it produces a
 * validated STL, a BOM row and a guide line per variant for free — which is
 * the entire argument for building a registry instead of hand-modelling parts.
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

/** Stable id for a gate of a given throat width. Shared so mates can derive it. */
export const gateId = (throat: number): string => `gate-${String(throat).replace('.', 'p')}`;

const gateVariants: PartDef[] = GATE_THROAT_SWEEP_MM.map((throat) => ({
  id: gateId(throat),
  name: `Stitch gate — ${throat.toFixed(1)} mm throat`,
  nameNo: `Maskeport — ${throat.toFixed(1)} mm hals`,
  kind: 'printed',
  group: 'comb',
  tracks: ['bench', ...(throat === GATE_THROAT_MM ? (['full'] as const) : [])],
  dims: { throat, w: GATE_W_MM, dep: GATE_D_MM, h: GATE_H_MM, wall: GATE_WALL_MM },
  qty: throat === GATE_THROAT_MM ? 12 : 4, // more of the nominal, 4 of each sweep step
  mount: { frame: 'W', position: [28, 0, 0] },
  repeats: Array.from({ length: WHEEL_TEETH }, (_, i) => ({
    position: [28, 0, 0] as const,
    rotationDeg: [0, (360 * i) / WHEEL_TEETH, 0] as const,
  })),
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
    // The tongue is what seats in the comb rail and in a wheel tooth. It is a
    // different feature from the throat, and conflating the two is how a mate
    // check ends up comparing a socket against an aperture.
    {
      kind: 'throat',
      id: 'tongue',
      width: GATE_W_MM - 2 * GATE_WALL_MM,
      depth: 2 * GATE_WALL_MM,
      at: [0, -GATE_D_MM / 2 + GATE_WALL_MM, -1.5],
    },
  ],
  note:
    throat === GATE_THROAT_MM
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
  const { gates, pitch, wall, h, seatW, seatD, ear, rowOffset, rowDz, rowTilt } = d;
  // Gate section plus a mounting ear at each end. The ears exist because the
  // bench comb is a short rail — nowhere near enough material to also carry
  // two M3 slots without cutting it in half.
  const gateLen = gates * pitch + 2 * wall;
  const len = gateLen + 2 * ear;
  // Deep enough for two staggered rows plus walls.
  const depth = rowOffset + seatD + 2 * wall;

  const rail = extrude(roundedRect(len, depth, 1.5), h);

  const seats: Solid[] = [];
  const pocket = 5; // matches the gate tongue
  for (let i = 0; i < gates; i++) {
    const x = -gateLen / 2 + wall + pitch * (i + 0.5);
    const upper = i % 2 === 0;

    // THE STAGGER, and the thing it must not do.
    //
    // An 8 mm aperture cannot repeat every 5.6 mm, so alternate gates need
    // separate rows. The previous revision put those rows 10.2 mm apart
    // RADIALLY, which asked every second stitch on the working edge to be
    // dragged 10 mm out of the circle its neighbours sit on. No edge of DK
    // cotton does that without distorting the round, and nothing in the harness
    // was comparing the offset against anything, so it passed 203 checks.
    //
    // The rows are now separated in HEIGHT and tilted back toward a common
    // mouth line: every throat presents at the same radius, and the fabric is
    // asked for +/- 3 mm of height across one stitch instead of 10 mm of reach.
    const z = h / 2 + (upper ? +rowDz : -rowDz) / 2;
    const tilt = upper ? -rowTilt : +rowTilt;
    // Seat depth position follows from the tilt, so the two rows converge
    // rather than merely sitting at different heights.
    const y = (upper ? +1 : -1) * (rowOffset / 2 - seatD / 2 - wall);

    // A BLIND pocket, angled with its row, so the gate has a shoulder to sit on
    // rather than dropping straight through...
    seats.push(at(cube(seatW, seatD, pocket + 2, true), [x, y, z], [tilt, 0, 0]));
    // ...and a through hole, so a seized gate comes out with a 2 mm pin from
    // below instead of a knife from above. You will do this a lot during T2.
    seats.push(at(cyl(h + 8, 1.1, 24), [x, y, h / 2], [tilt, 0, 0]));
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
    h: 14,
    ear: 16,
    rowOffset: COMB_ROW_OFFSET_MM,
    rowDz: COMB_ROW_DZ_MM,
    rowTilt: COMB_ROW_TILT_DEG,
    seatW: GATE_W_MM - 2 * GATE_WALL_MM + 0.25,
    seatD: 2 * GATE_WALL_MM + 0.25,
  },
  qty: 1,
  mount: { frame: 'base', position: [178, 0, 26] },
  build: combSegment,
  print: petg({
    walls: 5,
    orientationWhy: 'Flat on the bed. The seats are the accurate feature and want no support.',
  }),
  interfaces: [
    {
      kind: 'throat',
      id: 'seat',
      width: GATE_W_MM - 2 * GATE_WALL_MM + 0.25,
      depth: 10,
      at: [0, 0, 0],
    },
    {
      kind: 'boltPattern',
      id: 'feet',
      thread: 'M3',
      holeDia: CLEARANCE.M3,
      positions: [
        [-(COMB_GATES_BENCH * STITCH_W_MM) / 2 - 8, 0],
        [+(COMB_GATES_BENCH * STITCH_W_MM) / 2 + 8, 0],
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

const TOOTH_DIMS = {
  len: 34,
  w: GATE_W_MM + 3, // must carry the full-width staggered gate
  h: 6,
  seatW: GATE_W_MM - 2 * GATE_WALL_MM + 0.25,
  seatD: 2 * GATE_WALL_MM + 0.25,
  hubDia: 8.25,
};

const tooth: PartDef = {
  id: 'wheel-tooth',
  name: 'Gate wheel tooth',
  nameNo: 'Portehjultann',
  kind: 'printed',
  group: 'wheel',
  tracks: ['bench', 'full'],
  dims: TOOTH_DIMS,
  qty: 8,
  mount: { frame: 'W', position: [0, 0, -3] },
  repeats: Array.from({ length: WHEEL_TEETH }, (_, i) => ({
    position: [0, 0, -3] as const,
    rotationDeg: [0, (360 * i) / WHEEL_TEETH, 0] as const,
  })),
  build: wheelTooth,
  print: petg({
    walls: 5,
    infillPct: 60,
    orientationWhy:
      'Flat, arm in the XY plane. The bending load is in-plane, so layer lines never see peel.',
  }),
  interfaces: [
    // Derived from TOOTH_DIMS, never retyped. A second copy of a number is a
    // second thing that can be wrong, and only one of them gets printed.
    {
      kind: 'bore',
      id: 'hub',
      dia: TOOTH_DIMS.hubDia,
      depth: TOOTH_DIMS.h,
      at: [0, 0, 0],
      axis: [0, 0, 1],
      fit: 'slip',
    },
    {
      kind: 'throat',
      id: 'seat',
      width: TOOTH_DIMS.seatW,
      depth: TOOTH_DIMS.h,
      at: [TOOTH_DIMS.len - 6, 0, 0],
    },
  ],
  fasteners: [{ sku: 'M3x10-SHCS', qty: 1 }],
  note: 'Carries one gate. Eight per wheel; the bench runs two so pickup and release can both be watched.',
};

/* ------------------------------------------------------------------------- */
/* 4. The hook — printed, and the reason nothing here is sharp                */
/* ------------------------------------------------------------------------- */

/**
 * A crochet hook, printed.
 *
 * Every predecessor design bought a latch needle, because a latch is how a
 * knitting machine holds a loop closed while the next one goes past. This
 * machine does not need one: the GATE holds the loop open at a known pose,
 * which is the entire reason the gate exists. Keeping a latch as well would be
 * two mechanisms doing one job — and it would leave the only sharp steel part
 * in a machine that is otherwise printed plastic and screws.
 *
 * Three things follow, and all three are improvements:
 *   - nothing on the machine can stab anybody, which changes what it is
 *     reasonable to leave running in a room where people live;
 *   - the nose diameter becomes a number we choose rather than whatever the
 *     craft shop stocked, and nose diameter is one of two terms in the throat
 *     inequality that decides whether the mechanism is possible at all;
 *   - it is a consumable. Cotton polishes and then abrades a printed nose, so
 *     print five, swap when the yarn starts catching, and write down the round.
 *
 * Printed nose-up so the hook curve is built in-plane: laid flat, the throat
 * undercut needs support exactly where the yarn runs, and support scars are
 * what turn a smooth draw into a snag.
 */
function crochetHook(d: Record<string, number>): Solid {
  const { nose, shaft, len, groove, shankLen } = d;

  // Working nose: a cylinder capped with a hemisphere, so nothing presents an
  // edge to the yarn on the way in.
  const noseRod = at(cyl(len, nose / 2, 48), [0, 0, len / 2]);
  const tip = at(sphere(nose / 2, 32), [0, 0, len]);

  // The throat: a spherical scoop just under the tip. It has to swallow ONE
  // strand and refuse two — a groove deep enough for two is how a hook picks up
  // the wrong yarn and pulls a colour change into the previous stitch.
  const throat = at(sphere(groove / 2, 32), [nose / 2 - groove / 2 + 0.35, 0, len - nose * 0.62]);
  // Lead-out under the throat so the caught strand rides up and out rather than
  // wedging against the shoulder.
  const ramp = at(
    cone(nose * 1.5, groove / 2, 0.2, 32),
    [nose / 2 - groove / 2 + 0.35, 0, len - nose * 1.35],
  );

  // Shank: thicker, because a 3 mm printed beam 42 mm long is a lever that
  // breaks. It never enters the gate, so it costs nothing to make it stiff.
  const shank = at(cyl(shankLen, shaft / 2, 48), [0, 0, -shankLen / 2]);
  // Blend nose to shank rather than stepping — a step is a stress riser and it
  // is also somewhere for a strand to hang up.
  const blend = at(cone(4, shaft / 2, nose / 2, 48), [0, 0, 2]);
  // A flat on the shank so the collet clamps against something that cannot
  // rotate. Hook orientation IS the yarn-over geometry; a hook that creeps
  // round in its clamp mis-presents the throat and the stitch fails silently.
  const flat = at(cube(shaft, shaft, shankLen + 2, true), [0, shaft * 0.72, -shankLen / 2]);

  return subtract(union(noseRod, tip, blend, shank), throat, ramp, flat);
}

const HOOK_DIMS = {
  nose: HOOK_NOSE_MM,
  shaft: HOOK_SHAFT_MM,
  len: HOOK_FREE_LEN_MM * 0.42,
  groove: HOOK_GROOVE_MM,
  shankLen: HOOK_FREE_LEN_MM,
};

const hook: PartDef = {
  id: 'crochet-hook',
  name: `Printed crochet hook — ${HOOK_NOSE_MM.toFixed(1)} mm nose`,
  nameNo: `Printet heklekrok — ${HOOK_NOSE_MM.toFixed(1)} mm spiss`,
  kind: 'printed',
  group: 'head',
  tracks: ['bench', 'full'],
  dims: HOOK_DIMS,
  qty: 5,
  mount: { frame: 'P', position: [0, 0, 26], rotationDeg: [90, 0, 0] },
  build: crochetHook,
  print: petg({
    layerMm: 0.12,
    walls: 6,
    infillPct: 100,
    orientationDeg: [0, 0, 0],
    orientationWhy:
      'Nose up, solid, 0.12 mm layers. This is the one part where surface finish is a function and not a preference — every layer line is something cotton can catch on.',
  }),
  interfaces: [
    {
      kind: 'shaft',
      id: 'shank',
      dia: HOOK_SHAFT_MM,
      len: HOOK_FREE_LEN_MM,
      at: [0, 0, 0],
      axis: [0, 0, 1],
    },
    // The nose is what has to fit through a gate throat, so it is declared
    // separately from the shank. Conflating them is how a check ends up
    // comparing the wrong diameter against the aperture.
    {
      kind: 'blade',
      id: 'nose',
      dia: HOOK_NOSE_MM,
      at: [0, 0, HOOK_DIMS.len],
    },
  ],
  note: 'A consumable. Five per spool of filament, and the round number where one starts snagging is data worth keeping.',
};

/* ------------------------------------------------------------------------- */
/* 4b. Hook collet — the swappable part                                       */
/* ------------------------------------------------------------------------- */

/**
 * Clamps the hook shank to the plunge carriage. Its own 12 g part so that
 * changing nose diameter — the experiment that fixes a failing T2 — is a
 * reprint of one small piece rather than a redesign of the head.
 */
function hookCollet(d: Record<string, number>): Solid {
  const { dia, len, w } = d;

  const body = extrude(roundedRect(w, w, 1.5), len);
  const boreHole = at(cyl(len + 4, dia / 2 + 0.075, 32), [0, 0, len / 2]);
  // Matching flat, so the hook seats one way round and stays there.
  const key = at(cube(dia, dia, len + 4, true), [0, dia * 0.72, len / 2]);
  // Clamp slit plus a cross bolt: tightening pinches the bore instead of
  // relying on a printed interference fit, which cracks.
  const slit = at(cube(0.9, w + 2, len + 2, true), [0, 0, len / 2]);
  const clampBolt = at(cyl(w + 4, CLEARANCE.M3 / 2, 24), [0, 0, len * 0.7], [0, 90, 0]);
  const clampNut = at(
    nutPocket(NUT_AF.M3, NUT_THICK.M3, w / 2, CLEARANCE.M3),
    [-w / 2 + 2.6, 0, len * 0.7],
    [0, 90, 0],
  );

  const mount = at(
    subtract(
      extrude(roundedRect(MGN9.blockW + 6, MGN9.blockL - 8, 2), 5),
      ...MGN9_HOLES.map(([x, y]) => at(bore(CLEARANCE.M3, 8), [x, y, 0])),
    ),
    [0, 0, -2.5],
  );

  return subtract(union(body, mount), boreHole, key, slit, clampBolt, clampNut);
}

const collet: PartDef = {
  id: 'hook-collet',
  name: 'Hook collet',
  nameNo: 'Krokholder',
  kind: 'printed',
  group: 'head',
  tracks: ['bench', 'full'],
  dims: { dia: HOOK_SHAFT_MM, len: 26, w: 14 },
  qty: 2,
  mount: { frame: 'P', position: [0, 0, 6], rotationDeg: [90, 0, 0] },
  build: hookCollet,
  print: petg({
    walls: 5,
    infillPct: 60,
    orientationWhy: 'Bore axis vertical. The clamp slit must not fall on a layer boundary.',
  }),
  interfaces: [
    {
      kind: 'bore',
      id: 'shank',
      dia: HOOK_SHAFT_MM + 0.15,
      depth: 26,
      at: [0, 0, 13],
      axis: [0, 0, 1],
      fit: 'slip',
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
  note: 'Swapping hook nose diameter is a reprint of this and the hook — no other part moves.',
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
  mount: { frame: 'base', position: [166, 0, -6] },
  repeats: [
    { position: [166, 0, -6] as const },
    { position: [254, 0, -6] as const },
  ],
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
  mount: { frame: 'base', position: [262, 0, 4] },
  repeats: [
    { position: [262, 0, 4] as const },
    { position: [184, 52, 30] as const, rotationDeg: [90, 0, 0] as const },
  ],
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

  // Lid ears. The nut pockets used to be sunk into the shell corners, where
  // there is 1.5 mm of wall and a hex pocket needs 3.3 — so the subtraction cut
  // the corners clean off and the build gate reported three separate bodies.
  // Two ears give the nuts somewhere to live that is not structural wall.
  const ears = [1, -1].map((sgn) =>
    at(
      extrude(roundedRect(13, 12, 2.5), 7),
      [sgn * (camW / 2 + t + 4.5), sgn * (camD / 2 - 3), camH + t - 7],
    ),
  );
  const clamp = at(
    subtract(
      extrude(roundedRect(20, 24, 2), 8),
      at(extrude(slot2(CLEARANCE.M5, 8), 12), [0, 0, 0], [0, 0, 90]),
    ),
    [-(armLen + camW / 2), 0, 4],
  );

  // Captive nuts so the lid can be opened repeatedly without stripping PETG —
  // and without a soldering iron. Tapped PETG survives about two assemblies;
  // you will open this pod every time the camera needs re-aiming.
  const inserts = [1, -1].map((sgn) =>
    at(
      nutPocket(NUT_AF.M3, NUT_THICK.M3, 9, CLEARANCE.M3),
      [sgn * (camW / 2 + t + 4.5), sgn * (camD / 2 - 3), camH + t - 3.5],
      [0, 0, sgn > 0 ? 90 : -90],
    ),
  );

  return subtract(union(shell, arm, clamp, ...ears), ...inserts);
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
  mount: { frame: 'base', position: [196, -74, 34], rotationDeg: [0, 0, 68] },
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
        [23.5, 13],
        [-23.5, -13],
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
  mount: { frame: 'base', position: [272, 54, 22] },
  build: tensionDancer,
  print: petg({ infillPct: 40, orientationWhy: 'Flat. The arm is a beam; keep layers in-plane.' }),
  interfaces: [
    { kind: 'bore', id: 'pivot', dia: 3.2, depth: 5, at: [-27, 0, 0], axis: [0, 0, 1], fit: 'slip' },
  ],
  fasteners: [{ sku: 'M3x20-SHCS', qty: 1 }, { sku: 'M3-NUT', qty: 1 }],
  note: 'The dancer is what turns "yarn feed" into a measurable quantity. Without it, T3 loop height is luck.',
};

/* ------------------------------------------------------------------------- */
/* 7b. Yarn-over finger — rides axis F                                        */
/* ------------------------------------------------------------------------- */

/**
 * Lays yarn into the hook throat, twice per stitch. On the second yarn-over it
 * is also the colour-change moment, which happens up to 1328 times in a single
 * hat — so this little arm moves more than anything else on the machine.
 *
 * Printed as a servo horn adapter plus a wire finger: the finger itself is a
 * length of 1.75 mm filament or spring steel, because a printed tip at that
 * diameter snaps and a metal one costs nothing.
 */
function yarnFinger(d: Record<string, number>): Solid {
  const { armLen, w, t, hornDia, wireDia } = d;

  const arm = extrude(roundedRect(armLen, w, 2), t);
  const hornPocket = at(cyl(t + 2, hornDia / 2, 32), [-armLen / 2 + 8, 0, 0]);
  const hornScrew = at(cyl(t + 4, 1.2, 16), [-armLen / 2 + 8, 0, 0]);
  // Cross-drilled seat for the wire finger, with a grub screw to pinch it.
  const wireSeat = at(cyl(20, wireDia / 2 + 0.05, 16), [armLen / 2 - 6, 0, t / 2], [0, 90, 0]);
  const grub = at(cyl(w + 4, CLEARANCE.M3 / 2, 16), [armLen / 2 - 6, 0, t / 2], [90, 0, 0]);

  return subtract(arm, hornPocket, hornScrew, wireSeat, grub);
}

const finger: PartDef = {
  id: 'yarn-finger',
  name: 'Yarn-over finger arm',
  nameNo: 'Garnfingerarm',
  kind: 'printed',
  group: 'head',
  tracks: ['bench', 'full'],
  dims: { armLen: 46, w: 12, t: 5, hornDia: MG90S.hornDia, wireDia: 1.75 },
  qty: 1,
  mount: { frame: 'F', position: [0, 0, 2] },
  build: yarnFinger,
  print: petg({
    infillPct: 50,
    orientationWhy: 'Flat. This part reverses direction twice per stitch — keep layers out of the bending plane.',
  }),
  interfaces: [
    { kind: 'bore', id: 'horn', dia: MG90S.hornDia, depth: 5, at: [-15, 0, 0], axis: [0, 0, 1], fit: 'slip' },
  ],
  fasteners: [{ sku: 'M3x10-SHCS', qty: 1 }],
  note: 'The wire tip is 1.75 mm filament or spring steel. A printed tip at that diameter snaps within a round.',
};

/* ------------------------------------------------------------------------- */
/* 7c. Wheel shaft — bought, not printed                                      */
/* ------------------------------------------------------------------------- */

/**
 * An 8 mm ground steel rod through two 608 bearings. Declared as a part with
 * no geometry of its own because it is bought stock — but it carries a `shaft`
 * interface, which is the whole point: without something for the wheel hub bore
 * to be checked AGAINST, a wrong bore diameter sails through the harness. It
 * did, once, which is why this exists.
 */
const shaft: PartDef = {
  id: 'wheel-shaft',
  name: 'Wheel shaft, 8 mm ground rod',
  nameNo: 'Hjulaksel 8 mm',
  kind: 'cots',
  group: 'wheel',
  tracks: ['bench', 'full'],
  dims: { dia: 8, len: 60 },
  qty: 1,
  mount: { frame: 'W', position: [0, 0, 0], rotationDeg: [90, 0, 0] },
  interfaces: [{ kind: 'shaft', id: 'journal', dia: 8, len: 60, at: [0, 0, 0], axis: [0, 0, 1] }],
  note: '608 bearings have an 8 mm bore, so the shaft is set by the bearing, not by preference.',
};

/* ------------------------------------------------------------------------- */
/* 7d. The yarn spinner — how a shop skein becomes machine feed               */
/* ------------------------------------------------------------------------- */

/**
 * Yarn does not arrive machine-ready, and every earlier revision of this design
 * quietly assumed it did.
 *
 * A ball of DK cotton pulled from the outside rolls around the floor; pulled
 * from the centre it collapses into a tangle somewhere around the third hour.
 * Either way the strand picks up one twist per revolution, and cotton is a
 * plied yarn — feed it enough same-direction twist and the plies either bind or
 * unwind, which changes the yarn's diameter, which changes the one number the
 * whole gate inequality is built on.
 *
 * So the yarn turns instead of the strand: the skein sits on a spindle that
 * spins on a 608, and the strand leaves it sideways with zero added twist. This
 * is what a shop calls a garnvinde and what the linked search calls a yarn
 * spinner, and it costs one bearing you have already bought four of.
 *
 * Three printed parts per colour. Four colours on the full machine, one on the
 * bench — and the bench one is the same part, so nothing is thrown away.
 */
function swiftBase(d: Record<string, number>): Solid {
  const { dia, t, bearingOd, bearingW } = d;

  const plate = extrude(roundedRect(dia, dia, 8), t);
  // Bearing seat, blind, so the outer race lands on a shoulder and the spindle
  // cannot walk down under the weight of a full 200 g skein.
  const seat = at(cyl(bearingW + 0.4, bearingOd / 2 + 0.1, 64), [0, 0, t - bearingW / 2 + 0.2]);
  // Clearance under the inner race so the spindle boss has somewhere to go.
  const relief = at(cyl(t, bearingOd / 2 - 4, 48), [0, 0, (t - bearingW) / 2 - 1]);
  // Slotted feet: the spinner wants to sit wherever the bench has room, and
  // "wherever there is room" is not a hole you can drill in advance.
  const feet = [-1, 1].map((s) =>
    at(extrude(slot2(CLEARANCE.M5, 10), t + 4), [s * (dia / 2 - 9), 0, t / 2], [0, 0, 90]),
  );

  return subtract(plate, seat, relief, ...feet);
}

const swiftBasePart: PartDef = {
  id: 'swift-base',
  name: 'Yarn spinner base',
  nameNo: 'Garnsnurrer — fot',
  kind: 'printed',
  group: 'yarn',
  tracks: ['bench', 'full'],
  dims: { dia: 78, t: 10, bearingOd: BEARING_608.od, bearingW: BEARING_608.w },
  qty: 4,
  mount: { frame: 'base', position: [300, 74, -14] },
  repeats: [
    { position: [300, 74, -14] as const },
    { position: [300, 146, -14] as const },
    { position: [372, 74, -14] as const },
    { position: [372, 146, -14] as const },
  ],
  build: swiftBase,
  print: petg({
    infillPct: 30,
    orientationWhy: 'Flat, bearing seat up. Print the seat last so its first layer is not the one fighting the bed.',
  }),
  interfaces: [
    { kind: 'bore', id: 'bearing', dia: BEARING_608.od + 0.2, depth: BEARING_608.w, at: [0, 0, 5], axis: [0, 0, 1], fit: 'press' },
  ],
  fasteners: [
    { sku: 'M5x10-BHCS', qty: 2 },
    { sku: 'M5-TNUT', qty: 2 },
  ],
  note: 'One 608 per spinner. You already bought four for the wheel and the dancer, so this is the cheapest subsystem on the machine.',
};

/**
 * The spindle the skein rides on.
 *
 * Sprung fingers rather than a fixed cone, because Norwegian shop yarn is not
 * one shape: a Cotton 8/8 nøste has no core at all, a cake has a 25 mm hollow,
 * and a cone has a 40 mm base. Four fingers that flex take all three, and a
 * skein that is slightly loose on the spindle is fine — it is being unwound,
 * not driven.
 */
function swiftSpindle(d: Record<string, number>): Solid {
  const { boreDia, shaftDia, hgt, fingers, fingerW, flange, taper } = d;

  // The boss that presses into the bearing's inner race.
  const boss = at(cyl(BEARING_608.w + 3, shaftDia / 2, 48), [0, 0, -(BEARING_608.w + 3) / 2]);
  const plate = at(extrude(circle(flange / 2, 64), 3), [0, 0, 0]);

  // Fingers: a tapered blade each, leaning inward at the top so a skein drops
  // on and centres itself instead of being lined up by hand every colour change.
  //
  // Each blade is one hull from a slab buried IN the flange to a sphere at the
  // tip. Two details the build gate insisted on: the bottom slab starts below
  // the flange top so it welds rather than rests on it, and the taper is applied
  // along local X — the radial direction after the rotation — because along Y it
  // moved the tip sideways and left the rounded cap floating in space beside the
  // blade it was meant to finish.
  const blades: Solid[] = [];
  for (let i = 0; i < fingers; i++) {
    const a = (360 * i) / fingers;
    const rad = (a * Math.PI) / 180;
    const rIn = boreDia / 2;
    blades.push(
      at(
        hull(
          at(cube(4.5, fingerW, 2.4, true), [0, 0, -1.2]),
          at(sphere(2.0, 24), [-taper, 0, hgt]),
        ),
        [rIn * Math.cos(rad), rIn * Math.sin(rad), 2.4],
        [0, 0, a],
      ),
    );
  }

  return union(plate, boss, ...blades);
}

const swiftSpindlePart: PartDef = {
  id: 'swift-spindle',
  name: 'Yarn spinner spindle',
  nameNo: 'Garnsnurrer — spindel',
  kind: 'printed',
  group: 'yarn',
  tracks: ['bench', 'full'],
  dims: {
    boreDia: 44,
    shaftDia: BEARING_608.id,
    hgt: 62,
    fingers: 4,
    fingerW: 9,
    flange: 62,
    taper: 5,
  },
  qty: 4,
  mount: { frame: 'base', position: [300, 74, -4] },
  repeats: [
    { position: [300, 74, -4] as const },
    { position: [300, 146, -4] as const },
    { position: [372, 74, -4] as const },
    { position: [372, 146, -4] as const },
  ],
  build: swiftSpindle,
  print: petg({
    walls: 3,
    infillPct: 20,
    orientationWhy:
      'Fingers up, flange on the bed. Printed on its side the fingers become cantilevers across the layers and snap off the first time a skein is dropped on.',
  }),
  interfaces: [
    { kind: 'shaft', id: 'boss', dia: BEARING_608.id, len: BEARING_608.w + 3, at: [0, 0, 0], axis: [0, 0, 1] },
  ],
  note: 'Takes a nøste, a cake or a cone. Four sprung fingers, no adjustment, no fasteners.',
};

/**
 * The guide that takes the strand off the top of the spinning skein and turns
 * it into a fixed, repeatable feed line into the dancer.
 *
 * Ceramic eyelet, not a printed hole: cotton cuts a groove into PETG within a
 * few hundred stitches and then runs in that groove, which is a slowly
 * tightening feed path that nobody notices until loop heights start drifting.
 */
function swiftGuide(d: Record<string, number>): Solid {
  const { hgt, armLen, w, t, eyelet } = d;

  // Nothing here shares a plane with anything else, and that is the whole
  // design note. Three prisms that happen to start and stop at the same z is
  // how a union produces zero-area facets, and the build gate rejects the part
  // rather than letting a sliver reach a slicer. So the arm hangs BELOW the
  // post top, and the eyelet ring is thicker than the arm and centred on it.
  const armZ = hgt - t - 3;

  const post = at(extrude(roundedRect(w, w, 2), hgt), [0, 0, 0]);
  const arm = at(extrude(roundedRect(armLen, w - 1.5, 2), t), [armLen / 2 - w / 2, 0, armZ]);
  const ring = at(
    subtract(
      extrude(circle(eyelet / 2 + 3.4, 40), t + 3),
      at(cyl(t + 8, eyelet / 2, 40), [0, 0, (t + 3) / 2]),
    ),
    [armLen - w / 2, 0, armZ - 1.5],
  );

  // Foot bolts into the same T-slot the base uses, so guide and base stay a set.
  // Deliberately deeper than the post in y, for the same reason.
  const foot = at(extrude(roundedRect(w + 16, w + 5, 2.5), 6), [0, 0, 0]);
  const bolts = [-1, 1].map((sgn) => at(bore(CLEARANCE.M5, 12), [sgn * (w / 2 + 5), 0, 3]));

  return subtract(union(post, foot, arm, ring), ...bolts);
}

const swiftGuidePart: PartDef = {
  id: 'swift-guide',
  name: 'Yarn spinner guide arm',
  nameNo: 'Garnsnurrer — føringsarm',
  kind: 'printed',
  group: 'yarn',
  tracks: ['bench', 'full'],
  dims: { hgt: 118, armLen: 46, w: 14, t: 6, eyelet: 8.2 },
  qty: 4,
  mount: { frame: 'base', position: [258, 74, -14] },
  repeats: [
    { position: [258, 74, -14] as const },
    { position: [258, 146, -14] as const },
    { position: [330, 74, -14] as const },
    { position: [330, 146, -14] as const },
  ],
  build: swiftGuide,
  print: petg({
    walls: 4,
    infillPct: 25,
    orientationWhy: 'Upright, no supports — the arm is a 46 mm overhang that bridges cleanly at this width.',
  }),
  fasteners: [
    { sku: 'M5x10-BHCS', qty: 2 },
    { sku: 'M5-TNUT', qty: 2 },
  ],
  note: 'The eyelet sits above and inboard of the skein, so the strand leaves the top of the roll and never rubs the spindle.',
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
  // Captive M4 nuts, side-entry. No inserts, no iron, no fumes.
  const feet = [
    [-len / 2 + 12, -wide / 2 + 12],
    [len / 2 - 12, -wide / 2 + 12],
    [-len / 2 + 12, wide / 2 - 12],
    [len / 2 - 12, wide / 2 - 12],
  ].map(([x, y]) =>
    at(nutPocket(NUT_AF.M4, NUT_THICK.M4, 14, CLEARANCE.M4), [x, y, t / 2], [0, 0, x < 0 ? 90 : -90]),
  );
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
  mount: { frame: 'base', position: [210, 0, -18] },
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
  hook,
  collet,
  bracket,
  motorMount,
  camera,
  dancer,
  finger,
  swiftBasePart,
  swiftSpindlePart,
  swiftGuidePart,
  shaft,
  base,
];

export const BENCH_CHECKED_AT = CHECKED;
