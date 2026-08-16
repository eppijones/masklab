/**
 * Six degrees of freedom. Frames listed here are the only places parts may mount.
 * If it is not an axis, the twin cannot move it.
 */

export type AxisId = 'C' | 'Z' | 'H' | 'L' | 'T' | 'I';
export type FrameId = 'base' | AxisId;
export type Vec3 = readonly [number, number, number];

export interface AxisDef {
  id: AxisId;
  name: string;
  role: string;
  type: 'linear' | 'rotary';
  unit: 'mm' | 'deg';
  min: number;
  max: number;
  home: number;
  maxVel: number;
  actuator: string;
  frame: { parent: FrameId; axis: Vec3; origin: Vec3 };
}

export const AXES: readonly AxisDef[] = [
  {
    id: 'C',
    name: 'Chain index',
    role: 'Rotates the gate chain so the next V sits at the station. One step = one gate pitch.',
    type: 'rotary',
    unit: 'deg',
    min: -1e7,
    max: 1e7,
    home: 0,
    maxVel: 90,
    actuator: 'NEMA17 + 5:1 belt, 200 step, ×16 → 0.0225°',
    frame: { parent: 'base', axis: [0, 0, 1], origin: [0, 0, 0] },
  },
  {
    id: 'Z',
    name: 'Take-down',
    role: 'Lowers a sprung skirt so hanging fabric does not climb back into the gates.',
    type: 'linear',
    unit: 'mm',
    min: 0,
    max: 220,
    home: 8,
    maxVel: 25,
    actuator: 'NEMA17 + T8×8 lead screw',
    frame: { parent: 'base', axis: [0, 0, -1], origin: [0, 0, 0] },
  },
  {
    id: 'H',
    name: 'Needle plunge',
    role: 'Radial slide. Retracted outside the largest brim; plunged through the gated V toward −X.',
    type: 'linear',
    unit: 'mm',
    min: 40,
    max: 210,
    home: 195,
    maxVel: 80,
    actuator: 'NEMA17 + MGN9 + GT2, 20 mm pulley',
    frame: { parent: 'base', axis: [1, 0, 0], origin: [0, 0, 0] },
  },
  {
    id: 'L',
    name: 'Latch / looper',
    role: 'Opens and closes the latch so yarn is captured, then both loops are drawn through.',
    type: 'rotary',
    unit: 'deg',
    min: -20,
    max: 110,
    home: 0,
    maxVel: 400,
    actuator: 'NEMA17 (direct) or 9g servo on the latch cam',
    frame: { parent: 'H', axis: [0, 1, 0], origin: [0, 0, 0] },
  },
  {
    id: 'T',
    name: 'Yarn turret',
    role: 'Four-colour selector. Indexes on the second yarn-over when the next stitch changes colour.',
    type: 'rotary',
    unit: 'deg',
    min: 0,
    max: 360,
    home: 0,
    maxVel: 180,
    actuator: 'NEMA17, 4 detents at 90°',
    frame: { parent: 'H', axis: [0, 0, 1], origin: [18, -28, 22] },
  },
  {
    id: 'I',
    name: 'Link injector',
    role: 'Pushes one printed gate from the magazine into the chain (increase) or pulls one out (decrease).',
    type: 'linear',
    unit: 'mm',
    min: 0,
    max: 28,
    home: 0,
    maxVel: 40,
    actuator: 'NEMA17 + rack, or a 25 kg servo',
    frame: { parent: 'H', axis: [0, 1, 0], origin: [8, 18, 0] },
  },
];

export type AxisValues = Record<AxisId, number>;

export const AXIS_HOME: AxisValues = {
  C: 0,
  Z: 8,
  H: 195,
  L: 0,
  T: 0,
  I: 0,
};

export function axisById(id: AxisId): AxisDef {
  return AXES.find((a) => a.id === id)!;
}
