/**
 * The machine's degrees of freedom.
 *
 * `frame` is what makes the digital twin a simulation rather than a drawing: the twin
 * builds its scene graph FROM this chain, so setting an axis value moves exactly the
 * parts the real machine moves, and nothing else. There is nowhere to hardcode a pose.
 */

export type AxisId = 'C' | 'Z' | 'R' | 'B' | 'P' | 'G' | 'S' | 'F1';

export type Vec3 = readonly [number, number, number];

export interface AxisDef {
  id: AxisId;
  name: string;
  nameNo: string;
  type: 'linear' | 'rotary';
  unit: 'mm' | 'deg';
  min: number;
  max: number;
  home: number;
  homingSensor: 'endstop' | 'index' | 'none';
  maxVel: number;
  maxAccel: number;
  actuator: {
    partId: string;
    stepsPerRev: number;
    microsteps: number;
    leadMm?: number;
    gearRatio?: number;
  };
  /** Derived; validate.ts recomputes this and compares. */
  stepsPerUnit: number;
  frame: { parent: AxisId | 'base'; axis: Vec3; origin: Vec3 };
  role: string;
}

export const AXES: readonly AxisDef[] = [
  {
    id: 'C',
    name: 'Block rotation',
    nameNo: 'Blokkrotasjon',
    type: 'rotary',
    unit: 'deg',
    min: -1e6,
    max: 1e6,
    home: 0,
    homingSensor: 'index',
    maxVel: 120,
    maxAccel: 400,
    actuator: { partId: 'motor-c', stepsPerRev: 200, microsteps: 16, gearRatio: 5 },
    stepsPerUnit: (200 * 16 * 5) / 360, // 44.44 steps/deg -> 0.0225 deg -> 0.057 mm at the rim
    frame: { parent: 'base', axis: [0, 0, 1], origin: [0, 0, 0] },
    role: 'Indexes the workpiece by exactly one stitch pitch. The only axis that advances between stitches.',
  },
  {
    id: 'Z',
    name: 'Station lift',
    nameNo: 'Stasjonsheis',
    type: 'linear',
    unit: 'mm',
    min: -10,
    max: 200,
    home: -10,
    homingSensor: 'endstop',
    maxVel: 40,
    maxAccel: 300,
    actuator: { partId: 'motor-z', stepsPerRev: 200, microsteps: 16, leadMm: 8 },
    stepsPerUnit: (200 * 16) / 8,
    frame: { parent: 'base', axis: [0, 0, 1], origin: [0, 0, 0] },
    role: 'Follows the working line up the former as rounds accumulate. Rim to crown is 158 mm.',
  },
  {
    id: 'R',
    name: 'Station radial',
    nameNo: 'Radialmating',
    type: 'linear',
    unit: 'mm',
    min: 20,
    max: 210,
    home: 210,
    homingSensor: 'endstop',
    maxVel: 40,
    maxAccel: 300,
    actuator: { partId: 'motor-r', stepsPerRev: 200, microsteps: 16, leadMm: 8 },
    stepsPerUnit: (200 * 16) / 8,
    frame: { parent: 'Z', axis: [1, 0, 0], origin: [0, 0, 0] },
    role: 'Tracks the former profile as the radius falls from 144 mm at the rim to 6 mm at the crown.',
  },
  {
    id: 'B',
    name: 'Station tilt',
    nameNo: 'Stasjonsvinkel',
    type: 'rotary',
    unit: 'deg',
    min: -15,
    max: 95,
    home: 0,
    homingSensor: 'endstop',
    maxVel: 90,
    maxAccel: 400,
    actuator: { partId: 'motor-b', stepsPerRev: 200, microsteps: 16, gearRatio: 40 },
    stepsPerUnit: (200 * 16 * 40) / 360,
    frame: { parent: 'R', axis: [0, 1, 0], origin: [0, 0, 0] },
    role: 'Keeps the needle normal to the fabric surface. Without it the needle enters the crown dome obliquely and splits the yarn.',
  },
  {
    id: 'P',
    name: 'Needle plunge',
    nameNo: 'Nålestempel',
    type: 'linear',
    unit: 'mm',
    min: -2,
    max: 30,
    home: 0,
    homingSensor: 'endstop',
    maxVel: 120,
    maxAccel: 2500,
    actuator: { partId: 'motor-p', stepsPerRev: 200, microsteps: 16, leadMm: 2 },
    stepsPerUnit: (200 * 16) / 2,
    frame: { parent: 'B', axis: [-1, 0, 0], origin: [0, 0, 0] },
    role: 'The loop-drawing axis. Retract stroke length IS the loop height, so gauge is programmable per stitch.',
  },
  {
    id: 'G',
    name: 'Presenter',
    nameNo: 'Presenter',
    type: 'linear',
    unit: 'mm',
    min: 0,
    max: 12,
    home: 0,
    homingSensor: 'none',
    maxVel: 90,
    maxAccel: 2000,
    actuator: { partId: 'servo-g', stepsPerRev: 0, microsteps: 0 },
    stepsPerUnit: 0,
    frame: { parent: 'B', axis: [-1, 0, 0], origin: [0, 12, 0] },
    role: 'Compliant tapered finger. Finds the target V and spreads it open — the mechanism that replaces a 144-needle retention bed.',
  },
  {
    id: 'S',
    name: 'Yarn selector',
    nameNo: 'Garnvelger',
    type: 'rotary',
    unit: 'deg',
    min: 0,
    max: 360,
    home: 0,
    homingSensor: 'index',
    maxVel: 720,
    maxAccel: 4000,
    actuator: { partId: 'motor-s', stepsPerRev: 200, microsteps: 16, gearRatio: 1 },
    stepsPerUnit: (200 * 16) / 360,
    frame: { parent: 'B', axis: [0, 0, 1], origin: [14, -10, 0] },
    role: 'Four detents at 0/90/180/270. Must be able to switch BETWEEN the two draw-throughs of one stitch — 1412 times per hat.',
  },
  {
    id: 'F1',
    name: 'Yarn feed',
    nameNo: 'Garnmating',
    type: 'rotary',
    unit: 'deg',
    min: -1e6,
    max: 1e6,
    home: 0,
    homingSensor: 'none',
    maxVel: 900,
    maxAccel: 3000,
    actuator: { partId: 'motor-f', stepsPerRev: 200, microsteps: 16, gearRatio: 1 },
    stepsPerUnit: (200 * 16) / 360,
    frame: { parent: 'base', axis: [0, 1, 0], origin: [-190, 150, 300] },
    role: 'Driven feed roller, closed loop on the dancer encoder. One per colour; also the odometer for yarn-length metering.',
  },
];

export const AXIS_BY_ID: Record<AxisId, AxisDef> = Object.fromEntries(
  AXES.map((a) => [a.id, a]),
) as Record<AxisId, AxisDef>;

export type AxisValues = Record<AxisId, number>;

export function homeValues(): AxisValues {
  return Object.fromEntries(AXES.map((a) => [a.id, a.home])) as AxisValues;
}
