/**
 * The bought hardware, declared so the picture is a MACHINE.
 *
 * Until now the 3D showed printed parts only — twenty-three cream shapes
 * floating in the right relative positions with nothing between them. That is
 * an accurate drawing of what you print and a misleading drawing of what you
 * build, and it is the main reason the assembly steps were unreadable: a step
 * that says "rail to the brackets" showed two brackets and no rail.
 *
 * So the extrusion, the rail, the motors, the bearings, the belt, the supply,
 * the controller, the camera, the E-stop and the yarn are declared here, in the
 * same frame system as everything else, and the viewer builds them procedurally
 * from these numbers. They are not printed, they have no STL, and they are
 * deliberately simple solids — the point is legibility, not a render.
 *
 * Everything here carries the `step` that introduces it, so the build animation
 * can bring in a motor at the step where you bolt on a motor.
 */

import type { FrameId } from './axes.ts';
import type { Vec3 } from './mat4.ts';

export type HardwareKind =
  | 'extrusion'
  | 'rail'
  | 'block'
  | 'motor'
  | 'bearing'
  | 'belt'
  | 'psu'
  | 'mcu'
  | 'driver'
  | 'camera'
  | 'estop'
  | 'leadscrew'
  | 'lazysusan'
  | 'skein'
  | 'plate';

export interface HardwareDef {
  id: string;
  kind: HardwareKind;
  frame: FrameId;
  position: Vec3;
  rotationDeg?: Vec3;
  /** Kind-specific: length for extrusion/rail/leadscrew, diameter for round things. */
  size?: Vec3;
  /** Build step that introduces it. */
  step: number;
  track: 'station' | 'machine';
  /** Palette key the viewer resolves. */
  tone?: 'alu' | 'steel' | 'black' | 'board' | 'yarn0' | 'yarn1' | 'yarn2' | 'yarn3';
  label: string;
  labelNo: string;
}

export const HARDWARE: readonly HardwareDef[] = [
  /* ---------------------------------------------------------- station ---- */
  {
    id: 'bench-rail',
    kind: 'rail',
    frame: 'base',
    position: [210, 0, -8],
    size: [200, 9, 6.5],
    step: 4,
    track: 'station',
    tone: 'steel',
    label: 'MGN9 rail, 200 mm',
    labelNo: 'MGN9-skinne, 200 mm',
  },
  {
    id: 'bench-block',
    kind: 'block',
    frame: 'base',
    position: [210, 0, -1],
    size: [39, 20, 10],
    step: 4,
    track: 'station',
    tone: 'steel',
    label: 'MGN9C carriage',
    labelNo: 'MGN9C vogn',
  },
  {
    id: 'bench-beam-l',
    kind: 'extrusion',
    frame: 'base',
    position: [210, -52, -26],
    size: [230, 20, 20],
    step: 4,
    track: 'station',
    tone: 'alu',
    label: '2020 bench rail',
    labelNo: '2020 benkeskinne',
  },
  {
    id: 'bench-beam-r',
    kind: 'extrusion',
    frame: 'base',
    position: [210, 52, -26],
    size: [230, 20, 20],
    step: 4,
    track: 'station',
    tone: 'alu',
    label: '2020 bench rail',
    labelNo: '2020 benkeskinne',
  },
  {
    id: 'motor-P',
    kind: 'motor',
    frame: 'base',
    position: [300, 0, 4],
    rotationDeg: [0, -90, 0],
    size: [42.3, 42.3, 40],
    step: 8,
    track: 'station',
    tone: 'black',
    label: 'NEMA17 — hook plunge',
    labelNo: 'NEMA17 — krokstempel',
  },
  {
    id: 'leadscrew-P',
    kind: 'leadscrew',
    frame: 'base',
    position: [252, 0, 4],
    rotationDeg: [0, 90, 0],
    size: [80, 8, 8],
    step: 8,
    track: 'station',
    tone: 'steel',
    label: 'T8 lead screw',
    labelNo: 'T8 trapesskrue',
  },
  {
    id: 'motor-W',
    kind: 'motor',
    frame: 'base',
    position: [184, 74, 30],
    rotationDeg: [90, 0, 0],
    size: [42.3, 42.3, 40],
    step: 8,
    track: 'station',
    tone: 'black',
    label: 'NEMA17 — gate wheel',
    labelNo: 'NEMA17 — portehjul',
  },
  {
    id: 'belt-W',
    kind: 'belt',
    frame: 'base',
    position: [184, 30, 31],
    rotationDeg: [90, 0, 0],
    size: [44, 6, 1.5],
    step: 8,
    track: 'station',
    tone: 'black',
    label: 'GT2 belt 3:1',
    labelNo: 'GT2 rem 3:1',
  },
  {
    id: 'bearing-W1',
    kind: 'bearing',
    frame: 'W',
    position: [0, 12, 0],
    rotationDeg: [90, 0, 0],
    size: [22, 22, 7],
    step: 8,
    track: 'station',
    tone: 'steel',
    label: '608ZZ',
    labelNo: '608ZZ',
  },
  {
    id: 'bearing-W2',
    kind: 'bearing',
    frame: 'W',
    position: [0, -12, 0],
    rotationDeg: [90, 0, 0],
    size: [22, 22, 7],
    step: 8,
    track: 'station',
    tone: 'steel',
    label: '608ZZ',
    labelNo: '608ZZ',
  },
  {
    id: 'psu',
    kind: 'psu',
    frame: 'base',
    position: [140, -86, -8],
    size: [110, 60, 32],
    step: 9,
    track: 'station',
    tone: 'alu',
    label: '12 V PSU, enclosed',
    labelNo: '12 V strømforsyning',
  },
  {
    id: 'mcu',
    kind: 'mcu',
    frame: 'base',
    position: [232, -86, -18],
    size: [45, 22, 6],
    step: 9,
    track: 'station',
    tone: 'board',
    label: 'Arduino Nano ESP32',
    labelNo: 'Arduino Nano ESP32',
  },
  {
    id: 'drivers',
    kind: 'driver',
    frame: 'base',
    position: [274, -86, -18],
    size: [20, 15, 12],
    step: 9,
    track: 'station',
    tone: 'board',
    label: 'TMC2209 x2',
    labelNo: 'TMC2209 x2',
  },
  {
    id: 'estop',
    kind: 'estop',
    frame: 'base',
    position: [104, -86, -8],
    size: [30, 30, 34],
    step: 9,
    track: 'station',
    tone: 'black',
    label: 'Latching E-stop',
    labelNo: 'Nødstopp med lås',
  },
  {
    id: 'webcam',
    kind: 'camera',
    frame: 'base',
    position: [196, -74, 40],
    rotationDeg: [0, 0, 68],
    size: [30, 30, 22],
    step: 10,
    track: 'station',
    tone: 'black',
    label: 'USB camera',
    labelNo: 'USB-kamera',
  },
  {
    id: 'skein-0',
    kind: 'skein',
    frame: 'base',
    position: [300, 74, 22],
    size: [58, 58, 60],
    step: 7,
    track: 'station',
    tone: 'yarn0',
    label: 'Cotton skein',
    labelNo: 'Bomullsnøste',
  },

  /* ---------------------------------------------------------- machine ---- */
  {
    id: 'deck-front',
    kind: 'extrusion',
    frame: 'base',
    position: [0, -210, -40],
    size: [520, 20, 20],
    step: 13,
    track: 'machine',
    tone: 'alu',
    label: '2020 deck',
    labelNo: '2020 dekk',
  },
  {
    id: 'deck-back',
    kind: 'extrusion',
    frame: 'base',
    position: [0, 210, -40],
    size: [520, 20, 20],
    step: 13,
    track: 'machine',
    tone: 'alu',
    label: '2020 deck',
    labelNo: '2020 dekk',
  },
  {
    id: 'deck-left',
    kind: 'extrusion',
    frame: 'base',
    position: [-250, 0, -40],
    rotationDeg: [0, 0, 90],
    size: [420, 20, 20],
    step: 13,
    track: 'machine',
    tone: 'alu',
    label: '2020 deck',
    labelNo: '2020 dekk',
  },
  {
    id: 'deck-right',
    kind: 'extrusion',
    frame: 'base',
    position: [250, 0, -40],
    rotationDeg: [0, 0, 90],
    size: [420, 20, 20],
    step: 13,
    track: 'machine',
    tone: 'alu',
    label: '2020 deck',
    labelNo: '2020 dekk',
  },
  {
    id: 'lazysusan',
    kind: 'lazysusan',
    frame: 'base',
    position: [0, 0, -22],
    size: [130, 130, 8],
    step: 14,
    track: 'machine',
    tone: 'steel',
    label: 'Lazy-susan bearing',
    labelNo: 'Dreielager',
  },
  {
    id: 'motor-C',
    kind: 'motor',
    frame: 'base',
    position: [-150, 0, -18],
    size: [42.3, 42.3, 40],
    step: 15,
    track: 'machine',
    tone: 'black',
    label: 'NEMA17 — platter',
    labelNo: 'NEMA17 — dreieskive',
  },
  {
    id: 'belt-C',
    kind: 'belt',
    frame: 'C',
    position: [0, 0, 5],
    size: [240, 6, 1.5],
    step: 15,
    track: 'machine',
    tone: 'black',
    label: 'GT2 rim belt',
    labelNo: 'GT2 kantrem',
  },
  {
    id: 'column',
    kind: 'extrusion',
    frame: 'base',
    position: [210, 0, 60],
    size: [20, 20, 220],
    step: 17,
    track: 'machine',
    tone: 'alu',
    label: '2020 Z column',
    labelNo: '2020 Z-søyle',
  },
  {
    id: 'motor-Z',
    kind: 'motor',
    frame: 'base',
    position: [210, 0, 190],
    rotationDeg: [180, 0, 0],
    size: [42.3, 42.3, 40],
    step: 17,
    track: 'machine',
    tone: 'black',
    label: 'NEMA17 — Z lift',
    labelNo: 'NEMA17 — Z-heis',
  },
  {
    id: 'leadscrew-Z',
    kind: 'leadscrew',
    frame: 'base',
    position: [210, 0, 80],
    size: [190, 8, 8],
    rotationDeg: [0, 0, 0],
    step: 17,
    track: 'machine',
    tone: 'steel',
    label: 'T8 Z screw',
    labelNo: 'T8 Z-skrue',
  },
  {
    id: 'motor-R',
    kind: 'motor',
    frame: 'Z',
    position: [72, 0, 0],
    rotationDeg: [0, 90, 0],
    size: [42.3, 42.3, 40],
    step: 23,
    track: 'machine',
    tone: 'black',
    label: 'NEMA17 — R slide',
    labelNo: 'NEMA17 — R-slede',
  },
  {
    id: 'motor-T',
    kind: 'motor',
    frame: 'base',
    position: [-150, -120, 4],
    size: [42.3, 42.3, 40],
    step: 21,
    track: 'machine',
    tone: 'black',
    label: 'NEMA17 — turret',
    labelNo: 'NEMA17 — karusell',
  },
  {
    id: 'skein-1',
    kind: 'skein',
    frame: 'base',
    position: [-232, -120, 40],
    size: [58, 58, 60],
    step: 21,
    track: 'machine',
    tone: 'yarn1',
    label: 'Colour 2',
    labelNo: 'Farge 2',
  },
  {
    id: 'skein-2',
    kind: 'skein',
    frame: 'base',
    position: [-232, -46, 40],
    size: [58, 58, 60],
    step: 21,
    track: 'machine',
    tone: 'yarn2',
    label: 'Colour 3',
    labelNo: 'Farge 3',
  },
  {
    id: 'skein-3',
    kind: 'skein',
    frame: 'base',
    position: [-232, 28, 40],
    size: [58, 58, 60],
    step: 21,
    track: 'machine',
    tone: 'yarn3',
    label: 'Colour 4',
    labelNo: 'Farge 4',
  },
];

export const HARDWARE_BY_STEP = (n: number): readonly HardwareDef[] =>
  HARDWARE.filter((h) => h.step === n);
