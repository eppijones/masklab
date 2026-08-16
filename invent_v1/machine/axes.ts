/**
 * The degrees of freedom, declared once.
 *
 * Frames listed here are the ONLY places a part may mount. If it is not an
 * axis, the twin cannot move it — and a part that cannot move cannot pretend
 * to do something the machine could not do.
 *
 * The declaration is the single source: machine/frames.ts DERIVES the matrix
 * chain by walking this table. There is deliberately no second, hand-written
 * chain anywhere. HEKLO had one, and it had already drifted — its axes table
 * declares T at [18,-28,22] while its kinematics builds it at (18,-32,26), and
 * I at [8,18,0] against (6,22,4). Two numbers, silently wrong, in a file whose
 * whole job is to be right. Deriving removes the class of bug.
 */

import type { Vec3 } from './mat4.ts';

export type AxisId = 'C' | 'Z' | 'R' | 'P' | 'W' | 'F' | 'T';
export type FrameId = 'base' | AxisId;

/** Distance from the platter axis to the station column. */
export const COLUMN_R_MM = 210;

/** Height of the working line above the deck at the brim (the lowest round). */
export const WORK_Z_MM = 40;

export interface AxisDef {
  id: AxisId;
  name: string;
  nameNo: string;
  role: string;
  type: 'linear' | 'rotary';
  unit: 'mm' | 'deg';
  min: number;
  max: number;
  home: number;
  /** mm/s or deg/s. The governor may lower the effective rate; it never raises it above this. */
  maxVel: number;
  actuator: string;
  /** Present on every powered axis. Drives the thermal model and the BOM. */
  thermal: { sensorId: string; holdCurrentPct: number } | null;
  /** Which build tracks include this axis. */
  tracks: ('bench' | 'full')[];
  frame: { parent: FrameId; axis: Vec3; origin: Vec3 };
}

export const AXES: readonly AxisDef[] = [
  {
    id: 'C',
    name: 'Platter index',
    nameNo: 'Dreieskive',
    role: 'Rotates the mandrel so the next stitch arrives at the station. One step = one stitch pitch.',
    type: 'rotary',
    unit: 'deg',
    min: -1e7,
    max: 1e7,
    home: 0,
    maxVel: 90,
    actuator: 'NEMA17 + GT2 5:1, 200 step, x16 -> 0.0225 deg',
    thermal: { sensorId: 'T_MOT_C', holdCurrentPct: 30 },
    tracks: ['full'],
    frame: { parent: 'base', axis: [0, 0, 1], origin: [0, 0, 0] },
  },
  {
    id: 'Z',
    name: 'Station lift',
    nameNo: 'Stasjonsheis',
    role: 'Carries the whole station up the mandrel as rounds accumulate. Brim to crown is ~158 mm.',
    type: 'linear',
    unit: 'mm',
    min: 0,
    max: 220,
    home: 0,
    maxVel: 25,
    actuator: 'NEMA17 + T8x8 leadscrew',
    thermal: { sensorId: 'T_MOT_Z', holdCurrentPct: 50 },
    tracks: ['full'],
    frame: { parent: 'base', axis: [0, 0, 1], origin: [COLUMN_R_MM, 0, WORK_Z_MM] },
  },
  {
    id: 'R',
    name: 'Station radial',
    nameNo: 'Radialslede',
    role: 'Tracks the mandrel profile as the radius falls from 128 mm at the brim to 5 mm at the crown.',
    type: 'linear',
    unit: 'mm',
    min: 0,
    max: 175,
    home: 0,
    maxVel: 40,
    actuator: 'NEMA17 + MGN9 + GT2',
    thermal: { sensorId: 'T_MOT_R', holdCurrentPct: 40 },
    tracks: ['full'],
    // -X points inward, toward the platter axis.
    frame: { parent: 'Z', axis: [-1, 0, 0], origin: [0, 0, 0] },
  },
  {
    id: 'W',
    name: 'Gate wheel',
    nameNo: 'Portehjul',
    role: 'Eight gated teeth. Picks each V out of the retention comb, holds it open at the work point, releases it behind the hook. The invention.',
    type: 'rotary',
    unit: 'deg',
    min: -1e7,
    max: 1e7,
    home: 0,
    maxVel: 180,
    actuator: 'NEMA17 + GT2 3:1',
    thermal: { sensorId: 'T_MOT_W', holdCurrentPct: 40 },
    tracks: ['bench', 'full'],
    frame: { parent: 'R', axis: [0, 1, 0], origin: [-26, 0, -8] },
  },
  {
    id: 'P',
    name: 'Hook plunge',
    nameNo: 'Nalestempel',
    role: 'The loop-drawing axis. Retract stroke length IS the loop height, so gauge is programmable per stitch.',
    type: 'linear',
    unit: 'mm',
    min: 0,
    max: 26,
    home: 0,
    maxVel: 60,
    actuator: 'NEMA17 + T8x2 leadscrew',
    thermal: { sensorId: 'T_MOT_P', holdCurrentPct: 40 },
    tracks: ['bench', 'full'],
    frame: { parent: 'R', axis: [-1, 0, 0], origin: [0, 0, 0] },
  },
  {
    id: 'F',
    name: 'Yarn-over finger',
    nameNo: 'Garnfinger',
    role: 'Lays yarn into the hook throat, twice per stitch. Also the colour-change moment: the turret indexes on the second yarn-over.',
    type: 'rotary',
    unit: 'deg',
    min: -20,
    max: 110,
    home: 0,
    maxVel: 300,
    actuator: 'MG90S metal-gear servo',
    thermal: null, // a 9 g servo stalls before it heats; the fuse covers it
    tracks: ['bench', 'full'],
    frame: { parent: 'R', axis: [0, 1, 0], origin: [14, 0, -6] },
  },
  {
    id: 'T',
    name: 'Yarn turret',
    nameNo: 'Garnkarusell',
    role: 'Four colours at 0/90/180/270. Must change BETWEEN the two draw-throughs of one stitch, up to 1328 times per hat.',
    type: 'rotary',
    unit: 'deg',
    min: -1e7,
    max: 1e7,
    home: 0,
    maxVel: 240,
    actuator: 'NEMA17 direct',
    thermal: { sensorId: 'T_MOT_T', holdCurrentPct: 30 },
    tracks: ['full'],
    frame: { parent: 'base', axis: [0, 0, 1], origin: [-150, -120, 30] },
  },
];

export const AXIS_BY_ID: Record<AxisId, AxisDef> = Object.fromEntries(
  AXES.map((a) => [a.id, a]),
) as Record<AxisId, AxisDef>;

export type AxisValues = Record<AxisId, number>;

export function homeValues(): AxisValues {
  return Object.fromEntries(AXES.map((a) => [a.id, a.home])) as AxisValues;
}

export function axesFor(track: 'bench' | 'full'): readonly AxisDef[] {
  return AXES.filter((a) => a.tracks.includes(track));
}

/** Clamp a commanded value into the declared envelope. Returns null if in range. */
export function outOfRange(id: AxisId, v: number): string | null {
  const a = AXIS_BY_ID[id];
  if (v < a.min || v > a.max) {
    return `${id}=${v}${a.unit} outside [${a.min}, ${a.max}]`;
  }
  return null;
}
