/**
 * One part declaration, four outputs: an STL, a twin body, a BOM row, and the
 * fastener callouts in the build guide.
 *
 * Nothing today links a print manifest to a machine model — invent/heklomat has
 * a flat list of print settings with no idea where a part sits, and the two
 * twins know where everything sits but emit geometry no printer can use. This
 * type is the join.
 */

import type { Solid } from '../cad/solid.ts';
import type { FrameId } from '../machine/axes.ts';
import type { FitClass } from '../machine/units.ts';

export type Vec3 = readonly [number, number, number];
export type Pt2 = readonly [number, number];
export type IsoDate = string;
export type Track = 'bench' | 'full';

/* ---------------------------------------------------------------- print --- */

export interface PrintSpec {
  material: 'PETG' | 'PLA' | 'TPU';
  layerMm: number;
  walls: number;
  infillPct: number;
  supports: boolean;
  /** Applied BEFORE the build-volume check, because orientation decides fit. */
  orientationDeg?: Vec3;
  /** Why this orientation — layer lines vs the load path. Printed in the guide. */
  orientationWhy?: string;
  minWallMm: number;
  /**
   * Null until a human actually slices the file and records the number.
   * The predecessor estimated time as grams x 2.2 while ignoring the walls and
   * infill declared two lines above it. A fabricated print time in a build
   * guide costs somebody their Saturday, so this stays honest or stays empty.
   */
  slicedMinutes: number | null;
  slicedAt: IsoDate | null;
}

/* --------------------------------------------------------------- source --- */

export interface SourceSpec {
  sku: string;
  vendor: string;
  url: string;
  priceNok: number;
  packQty?: number;
  inStock: boolean | null;
  checkedAt: IsoDate;
  /**
   * True if this exact purchase carries over into the full machine.
   * The bench rig is the station module of the finished machine, not a jig —
   * nothing bought for the test is meant to be thrown away. The harness
   * enforces it on every bench-track line.
   */
  usedInFull: boolean;
  substituteFor?: string;
}

/* ------------------------------------------------------------ interfaces -- */

/**
 * The machine-checkable fit contract. This is what "all pieces are verified"
 * means beyond "the mesh is watertight": a closed 2-manifold part can still be
 * one that does not fit its neighbour.
 */
export type PartInterface =
  | { kind: 'bore'; id: string; dia: number; depth: number; at: Vec3; axis: Vec3; fit: FitClass }
  | { kind: 'shaft'; id: string; dia: number; len: number; at: Vec3; axis: Vec3 }
  | { kind: 'throat'; id: string; width: number; depth: number; at: Vec3 }
  | { kind: 'blade'; id: string; dia: number; at: Vec3 }
  | {
      kind: 'boltPattern';
      id: string;
      thread: 'M3' | 'M4' | 'M5';
      holeDia: number;
      positions: readonly Pt2[];
      at: Vec3;
      normal: Vec3;
      /** Total stack the bolt must clamp, mm. Drives the length check. */
      gripMm: number;
    };

export interface Mate {
  a: string; // "partId#interfaceId"
  b: string;
  type: 'clearance' | 'passage' | 'pattern';
  /** Free text, printed verbatim in the failure message. Say WHY, not what. */
  why: string;
  tolMm?: number;
}

/* --------------------------------------------------------------- part ----- */

export interface FastenerUse {
  sku: string;
  qty: number;
}

export interface PartDef {
  id: string;
  name: string;
  nameNo: string;
  kind: 'printed' | 'cots' | 'extrusion' | 'motor' | 'electronic' | 'yarn' | 'workpiece' | 'sensor';
  group: 'frame' | 'former' | 'comb' | 'wheel' | 'head' | 'yarn' | 'control' | 'sensing';
  tracks: Track[];

  /** Millimetres and degrees. The only place a dimension is written down. */
  dims: Record<string, number>;
  qty: number;

  /** Motion comes from the frame, never a baked transform. */
  mount: { frame: FrameId; position: Vec3; rotationDeg?: Vec3 };
  repeats?: readonly { position: Vec3; rotationDeg?: Vec3 }[];
  explodeDir?: Vec3;

  /** Omit for pure-BOM items with no geometry (wire, filament, fasteners). */
  build?: (d: Record<string, number>) => Solid;
  /** Present -> an STL is emitted and gated. */
  print?: PrintSpec;
  /** Present -> a BOM row. */
  source?: SourceSpec;
  interfaces?: readonly PartInterface[];
  /** Fasteners this part consumes where it mounts. Cross-checked against the guide. */
  fasteners?: readonly FastenerUse[];

  note: string;
}

export interface FastenerDef {
  sku: string;
  label: string;
  thread: 'M3' | 'M4' | 'M5' | 'none';
  lenMm: number | null;
  vendor: string;
  url: string;
  priceNok: number;
  packQty: number;
  checkedAt: IsoDate;
  inStock: boolean | null;
}
