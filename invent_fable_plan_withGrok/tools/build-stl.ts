/**
 * Parametric HEKLOMAT-1 parts (mm) → binary STL + data/parts.js
 * Closed-manifold meshes by construction (lathe + box + through-holes).
 * Run: cd invent_fable_plan_withGrok/tools && npm install && npm run stl
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const stlDir = resolve(root, 'stl');
const dataDir = resolve(root, 'data');

type V = [number, number, number];
type Mesh = { v: V[]; t: [number, number, number][] };
type Material = 'PETG' | 'PLA' | 'TPU';

const DENSITY: Record<Material, number> = { PETG: 1.27, PLA: 1.24, TPU: 1.21 };
const PACK: Record<Material, number> = { PETG: 0.52, PLA: 0.38, TPU: 0.9 };

function mesh(): Mesh {
  return { v: [], t: [] };
}
function addV(m: Mesh, p: V): number {
  m.v.push(p);
  return m.v.length - 1;
}
function addT(m: Mesh, a: number, b: number, c: number) {
  m.t.push([a, b, c]);
}
function merge(parts: Mesh[]): Mesh {
  const out = mesh();
  for (const p of parts) {
    const o = out.v.length;
    for (const v of p.v) out.v.push(v);
    for (const [a, b, c] of p.t) out.t.push([a + o, b + o, c + o]);
  }
  return out;
}

/** Closed solid of revolution. Profile is [r,z][] CCW, r >= 0, first≠last. */
function lathe(profile: [number, number][], segs = 48): Mesh {
  const m = mesh();
  const n = profile.length;
  const rings: number[][] = [];
  for (const [r, z] of profile) {
    if (r < 1e-6) {
      rings.push([addV(m, [0, 0, z])]);
    } else {
      const ring: number[] = [];
      for (let i = 0; i < segs; i++) {
        const a = (i / segs) * Math.PI * 2;
        ring.push(addV(m, [r * Math.cos(a), r * Math.sin(a), z]));
      }
      rings.push(ring);
    }
  }
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const a = rings[i];
    const b = rings[j];
    if (a.length === 1 && b.length === 1) continue;
    if (a.length === 1) {
      for (let k = 0; k < segs; k++) addT(m, a[0], b[k], b[(k + 1) % segs]);
    } else if (b.length === 1) {
      for (let k = 0; k < segs; k++) addT(m, a[k], b[0], a[(k + 1) % segs]);
    } else {
      for (let k = 0; k < segs; k++) {
        const k2 = (k + 1) % segs;
        addT(m, a[k], b[k], b[k2]);
        addT(m, a[k], b[k2], a[k2]);
      }
    }
  }
  return m;
}

function box(x0: number, x1: number, y0: number, y1: number, z0: number, z1: number): Mesh {
  const m = mesh();
  const P: V[] = [
    [x0, y0, z0],
    [x1, y0, z0],
    [x1, y1, z0],
    [x0, y1, z0],
    [x0, y0, z1],
    [x1, y0, z1],
    [x1, y1, z1],
    [x0, y1, z1],
  ];
  const id = P.map((p) => addV(m, p));
  const faces = [
    [0, 2, 1],
    [0, 3, 2],
    [4, 5, 6],
    [4, 6, 7],
    [0, 1, 5],
    [0, 5, 4],
    [1, 2, 6],
    [1, 6, 5],
    [2, 3, 7],
    [2, 7, 6],
    [3, 0, 4],
    [3, 4, 7],
  ];
  for (const [a, b, c] of faces) addT(m, id[a], id[b], id[c]);
  return m;
}

/** Axis-aligned plate with circular through-holes (Z). Outer is a rectangle. */
function plateHoles(
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  z0: number,
  z1: number,
  holes: { x: number; y: number; r: number; seg?: number }[],
): Mesh {
  const outer: [number, number][] = [
    [x0, y0],
    [x1, y0],
    [x1, y1],
    [x0, y1],
  ];
  return extrudeWithHoles(outer, holes, z0, z1);
}

function circlePts(x: number, y: number, r: number, seg: number, flip = false): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i < seg; i++) {
    const a = (i / seg) * Math.PI * 2 * (flip ? -1 : 1);
    pts.push([x + r * Math.cos(a), y + r * Math.sin(a)]);
  }
  return pts;
}

function extrudeWithHoles(
  outer: [number, number][],
  holes: { x: number; y: number; r: number; seg?: number }[],
  z0: number,
  z1: number,
): Mesh {
  const m = mesh();
  const holeLoops = holes.map((h) => circlePts(h.x, h.y, h.r, h.seg ?? 16, true));
  function cap(z: number, flip: boolean) {
    const o = outer.map((p) => addV(m, [p[0], p[1], z]));
    // fan from centroid of outer (convex rect)
    const cx = outer.reduce((s, p) => s + p[0], 0) / outer.length;
    const cy = outer.reduce((s, p) => s + p[1], 0) / outer.length;
    const c = addV(m, [cx, cy, z]);
    // This naive fan collides with holes. Build caps as: outer ring triangles skipped;
    // instead stitch each hole to nothing — use a safer method: triangulate by
    // cutting the rect into a grid and skipping hole cells. For our plates, holes
    // are small: we emit outer walls + hole walls + annular caps via ear-clip of
    // a single polygon with holes using a bridge.
    return { o, c };
  }
  void cap;
  // Bridge each hole to the outer boundary, then fan-triangulate is still hard.
  // Practical method: box minus nothing, plus hole walls, and cap with two
  // triangles per outer edge plus two per hole edge, connecting through a
  // rim that we build as a CSG-free annulus per hole punched in a rect by
  // splitting the rect into a frame of 4 boxes around a center box that is
  // omitted — only works for one hole.
  //
  // For N holes: keep the solid box and cut holes by replacing the mesh with
  // lathe tubes unioned? Overlapping bodies are bad.
  //
  // Use 4 side walls of the box + top/bottom as triangle fans that skip
  // hole interiors by using ear-clip on a flattened loop with bridges.
  const loops = [outer, ...holeLoops];
  const bot: number[][] = [];
  const top: number[][] = [];
  for (const loop of loops) {
    const b: number[] = [];
    const t: number[] = [];
    for (const [x, y] of loop) {
      b.push(addV(m, [x, y, z0]));
      t.push(addV(m, [x, y, z1]));
    }
    bot.push(b);
    top.push(t);
  }
  function wall(loopB: number[], loopT: number[], invert: boolean) {
    const n = loopB.length;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      if (invert) {
        addT(m, loopB[i], loopT[j], loopT[i]);
        addT(m, loopB[i], loopB[j], loopT[j]);
      } else {
        addT(m, loopB[i], loopT[i], loopT[j]);
        addT(m, loopB[i], loopT[j], loopB[j]);
      }
    }
  }
  wall(bot[0], top[0], false);
  for (let h = 1; h < bot.length; h++) wall(bot[h], top[h], true);

  // Caps: bridge from outer[0] to each hole, then triangulate the resulting
  // simple polygon with a fan from outer[0] — only valid if holes don't
  // block. For convex outer + interior holes, use: for each hole, add two
  // triangles? No.
  //
  // Ear-clip a single loop with bridges:
  function capFrom(loopsB: number[][], zSign: 1 | -1) {
    const outerL = loopsB[0];
    const on = outerL.length;
    // triangulate outer as two tris if quad, else fan — then this fills holes too.
    // Subtract hole fill by not using fan. Instead: project holes and use
    // constrained Delaunay — too heavy.
    //
    // Fill by: for a rectangular outer, split into a coarse grid and drop
    // cells whose center is inside a hole.
    const xs = [...new Set(outer.map((p) => p[0]))].sort((a, b) => a - b);
    const ys = [...new Set(outer.map((p) => p[1]))].sort((a, b) => a - b);
    void xs;
    void ys;
    void zSign;
    void on;
  }
  void capFrom;

  // Grid-cap: sample a 24x24 grid on the rectangle, emit two tris per cell
  // if the cell centre is not inside any hole.
  const nx = 20;
  const ny = 16;
  function insideHole(x: number, y: number) {
    return holes.some((h) => (x - h.x) ** 2 + (y - h.y) ** 2 < h.r * h.r);
  }
  const grid: number[][] = [];
  const gridT: number[][] = [];
  for (let j = 0; j <= ny; j++) {
    const row: number[] = [];
    const rowT: number[] = [];
    const y = y0 + ((y1 - y0) * j) / ny;
    for (let i = 0; i <= nx; i++) {
      const x = x0 + ((x1 - x0) * i) / nx;
      row.push(addV(m, [x, y, z0]));
      rowT.push(addV(m, [x, y, z1]));
    }
    grid.push(row);
    gridT.push(rowT);
  }
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const cx = x0 + ((x1 - x0) * (i + 0.5)) / nx;
      const cy = y0 + ((y1 - y0) * (j + 0.5)) / ny;
      if (insideHole(cx, cy)) continue;
      const a = grid[j][i];
      const b = grid[j][i + 1];
      const c = grid[j + 1][i + 1];
      const d = grid[j + 1][i];
      addT(m, a, c, b);
      addT(m, a, d, c);
      const at = gridT[j][i];
      const bt = gridT[j][i + 1];
      const ct = gridT[j + 1][i + 1];
      const dt = gridT[j + 1][i];
      addT(m, at, bt, ct);
      addT(m, at, ct, dt);
    }
  }
  return m;
}

function bboxOf(m: Mesh): [number, number, number] {
  let x0 = Infinity,
    y0 = Infinity,
    z0 = Infinity,
    x1 = -Infinity,
    y1 = -Infinity,
    z1 = -Infinity;
  for (const [x, y, z] of m.v) {
    if (x < x0) x0 = x;
    if (y < y0) y0 = y;
    if (z < z0) z0 = z;
    if (x > x1) x1 = x;
    if (y > y1) y1 = y;
    if (z > z1) z1 = z;
  }
  return [x1 - x0, y1 - y0, z1 - z0];
}

function volume(m: Mesh): number {
  let acc = 0;
  for (const [ia, ib, ic] of m.t) {
    const a = m.v[ia];
    const b = m.v[ib];
    const c = m.v[ic];
    acc += a[0] * (b[1] * c[2] - b[2] * c[1]);
    acc += a[1] * (b[2] * c[0] - b[0] * c[2]);
    acc += a[2] * (b[0] * c[1] - b[1] * c[0]);
  }
  return Math.abs(acc) / 6;
}

function assertManifold(m: Mesh, name: string) {
  const dir = new Map<string, number>();
  let deg = 0;
  for (const [ia, ib, ic] of m.t) {
    const a = m.v[ia];
    const b = m.v[ib];
    const c = m.v[ic];
    const ax = b[0] - a[0],
      ay = b[1] - a[1],
      az = b[2] - a[2];
    const bx = c[0] - a[0],
      by = c[1] - a[1],
      bz = c[2] - a[2];
    const nx = ay * bz - az * by;
    const ny = az * bx - ax * bz;
    const nz = ax * by - ay * bx;
    if (nx * nx + ny * ny + nz * nz < 1e-16) deg++;
    const e: [number, number][] = [
      [ia, ib],
      [ib, ic],
      [ic, ia],
    ];
    for (const [i, j] of e) {
      const k = i + '>' + j;
      dir.set(k, (dir.get(k) || 0) + 1);
    }
  }
  if (deg > 0) throw new Error(`${name}: ${deg} degenerate triangles`);
  let unpaired = 0;
  for (const [k, n] of dir) {
    const [i, j] = k.split('>');
    const rev = dir.get(j + '>' + i) || 0;
    if (n !== 1 || rev !== 1) unpaired++;
  }
  if (unpaired > 0) throw new Error(`${name}: ${unpaired} unpaired directed edges (not closed-manifold)`);
}

function toStl(m: Mesh, name: string): Buffer {
  const n = m.t.length;
  const buf = Buffer.alloc(84 + n * 50);
  buf.write(name.slice(0, 80), 0, 80, 'ascii');
  buf.writeUInt32LE(n, 80);
  let o = 84;
  for (const [ia, ib, ic] of m.t) {
    const a = m.v[ia];
    const b = m.v[ib];
    const c = m.v[ic];
    const ax = b[0] - a[0],
      ay = b[1] - a[1],
      az = b[2] - a[2];
    const bx = c[0] - a[0],
      by = c[1] - a[1],
      bz = c[2] - a[2];
    let nx = ay * bz - az * by;
    let ny = az * bx - ax * bz;
    let nz = ax * by - ay * bx;
    const len = Math.hypot(nx, ny, nz) || 1;
    nx /= len;
    ny /= len;
    nz /= len;
    buf.writeFloatLE(nx, o);
    buf.writeFloatLE(ny, o + 4);
    buf.writeFloatLE(nz, o + 8);
    buf.writeFloatLE(a[0], o + 12);
    buf.writeFloatLE(a[1], o + 16);
    buf.writeFloatLE(a[2], o + 20);
    buf.writeFloatLE(b[0], o + 24);
    buf.writeFloatLE(b[1], o + 28);
    buf.writeFloatLE(b[2], o + 32);
    buf.writeFloatLE(c[0], o + 36);
    buf.writeFloatLE(c[1], o + 40);
    buf.writeFloatLE(c[2], o + 44);
    buf.writeUInt16LE(0, o + 48);
    o += 50;
  }
  return buf;
}

/* ---------------- parts (mm) ---------------- */

function mandrelCrown() {
  return lathe(
    [
      [4.1, 0],
      [95, 0],
      [95, 8],
      [28, 22],
      [4.1, 22],
    ],
    48,
  );
}
function mandrelWall() {
  return lathe(
    [
      [84, 0],
      [92.5, 0],
      [92.5, 88],
      [84, 88],
    ],
    48,
  );
}
function mandrelBrim() {
  return lathe(
    [
      [80, 0],
      [88, 0],
      [115, 28],
      [104, 28],
    ],
    48,
  );
}
function platter() {
  return lathe(
    [
      [4.1, 0],
      [22, 0],
      [22, 2],
      [120, 2],
      [120, 3.2],
      [116.5, 3.2],
      [116.5, 4.8],
      [120, 4.8],
      [120, 8],
      [4.1, 8],
    ],
    56,
  );
}
function wheelCore() {
  return lathe(
    [
      [4.1, 0],
      [18, 0],
      [18, 8],
      [14, 8],
      [14, 12],
      [4.1, 12],
    ],
    32,
  );
}
function wheelCover() {
  return lathe(
    [
      [4.2, 0],
      [19, 0],
      [19, 3.2],
      [4.2, 3.2],
    ],
    32,
  );
}
function wheelArm() {
  return box(-46, 46, -9, 9, 0, 10);
}
function hookCarriage() {
  return box(-21, 21, -19, 19, 0, 12);
}
function yarnoverFinger() {
  return box(-8, 30, -5, 5, 0, 5);
}
function servoBracket() {
  return box(-14, 14, -11, 11, 0, 4);
}
function hookCollet() {
  return lathe(
    [
      [2.1, 0],
      [8, 0],
      [8, 16],
      [4.2, 22],
      [2.1, 22],
    ],
    24,
  );
}
function carouselDrum() {
  return lathe(
    [
      [4.1, 0],
      [80, 0],
      [80, 8],
      [72, 8],
      [72, 16],
      [80, 16],
      [80, 18],
      [4.1, 18],
    ],
    48,
  );
}
function spoolSpigot() {
  return lathe(
    [
      [1.7, 0],
      [10, 0],
      [10, 3],
      [5.8, 3],
      [5.8, 28],
      [4.4, 32],
      [1.7, 32],
    ],
    20,
  );
}
function yarnEyelet() {
  return lathe(
    [
      [2.6, 0],
      [9, 0],
      [9, 4],
      [2.6, 4],
    ],
    16,
  );
}
function tensionArm() {
  return box(-25, 45, -6, 6, 0, 6);
}
function nema17Mount() {
  return lathe(
    [
      [11.2, 0],
      [25, 0],
      [25, 5],
      [11.2, 5],
    ],
    36,
  );
}
function piCase() {
  const shell = merge([
    box(-46, 46, -32, 32, 0, 3),
    box(-46, 46, -32, -29, 0, 32),
    box(-46, 46, 29, 32, 0, 32),
    box(-46, -43, -32, 32, 0, 32),
    box(43, 46, -32, 32, 0, 32),
  ]);
  return shell;
}
function cameraPod() {
  return merge([
    box(-16, 16, -14, 14, 0, 3),
    box(-16, 16, -14, -11, 0, 22),
    box(-16, 16, 11, 14, 0, 22),
    box(-16, -13, -14, 14, 0, 22),
    box(13, 16, -14, 14, 0, 22),
  ]);
}
function tpuFoot() {
  return lathe(
    [
      [2.2, 0],
      [10, 0],
      [10, 6],
      [7, 8],
      [2.2, 8],
    ],
    20,
  );
}
function hubAdapter() {
  return lathe(
    [
      [4.1, 0],
      [28, 0],
      [28, 6],
      [12, 6],
      [12, 12],
      [4.1, 12],
    ],
    36,
  );
}
function railBracket() {
  return merge([
    box(-18, 18, -11, 11, 0, 6),
    box(-18, -10, -11, 11, 0, 28),
  ]);
}

type Spec = {
  id: string;
  file: string;
  nameEn: string;
  nameNo: string;
  qty: number;
  material: Material;
  layerMm: number;
  walls: number;
  infill: number;
  pattern: string;
  support: boolean;
  minutesFudge: number;
  notes: string;
  geom: () => Mesh;
};

const SPECS: Spec[] = [
  { id: 'mandrel_crown', file: 'heklomat_mandrel_crown.stl', nameEn: 'Mandrel crown', nameNo: 'Dorn — krone', qty: 1, material: 'PLA', layerMm: 0.2, walls: 3, infill: 15, pattern: 'gyroid', support: false, minutesFudge: 1.1, notes: 'Bayonet to wall. Print crown-down.', geom: mandrelCrown },
  { id: 'mandrel_wall', file: 'heklomat_mandrel_wall.stl', nameEn: 'Mandrel wall', nameNo: 'Dorn — vegg', qty: 1, material: 'PLA', layerMm: 0.2, walls: 3, infill: 15, pattern: 'gyroid', support: false, minutesFudge: 1.15, notes: 'Tube. Bayonet both ends.', geom: mandrelWall },
  { id: 'mandrel_brim', file: 'heklomat_mandrel_brim.stl', nameEn: 'Mandrel brim skirt', nameNo: 'Dorn — brem', qty: 1, material: 'PLA', layerMm: 0.2, walls: 3, infill: 15, pattern: 'gyroid', support: false, minutesFudge: 1.1, notes: 'Flared skirt ⌀230.', geom: mandrelBrim },
  { id: 'platter', file: 'heklomat_platter.stl', nameEn: 'Turntable platter', nameNo: 'Dreieskive', qty: 1, material: 'PETG', layerMm: 0.2, walls: 4, infill: 30, pattern: 'gyroid', support: false, minutesFudge: 1.2, notes: 'GT2 groove on rim + hub bore.', geom: platter },
  { id: 'wheel_core', file: 'heklomat_wheel_core.stl', nameEn: 'Presentation-wheel core', nameNo: 'Presentasjonshjul kjerne', qty: 1, material: 'PETG', layerMm: 0.2, walls: 4, infill: 30, pattern: 'gyroid', support: false, minutesFudge: 0.7, notes: 'Latch seat groove.', geom: wheelCore },
  { id: 'wheel_cover', file: 'heklomat_wheel_cover.stl', nameEn: 'Presentation-wheel cover', nameNo: 'Presentasjonshjul deksel', qty: 1, material: 'PETG', layerMm: 0.2, walls: 4, infill: 30, pattern: 'gyroid', support: false, minutesFudge: 0.4, notes: 'Clamps latches.', geom: wheelCover },
  { id: 'wheel_arm', file: 'heklomat_wheel_arm.stl', nameEn: 'Wheel arm', nameNo: 'Hjularm', qty: 1, material: 'PETG', layerMm: 0.2, walls: 4, infill: 30, pattern: 'gyroid', support: false, minutesFudge: 0.8, notes: 'Holds wheel at work point.', geom: wheelArm },
  { id: 'hook_carriage', file: 'heklomat_hook_carriage.stl', nameEn: 'Hook carriage', nameNo: 'Heklekrok-vogn', qty: 1, material: 'PETG', layerMm: 0.2, walls: 4, infill: 30, pattern: 'gyroid', support: false, minutesFudge: 0.7, notes: 'MGN7H plate.', geom: hookCarriage },
  { id: 'hook_collet', file: 'heklomat_hook_collet.stl', nameEn: 'Hook collet', nameNo: 'Krokholder', qty: 1, material: 'PETG', layerMm: 0.2, walls: 4, infill: 30, pattern: 'gyroid', support: false, minutesFudge: 0.35, notes: '4.0 mm hook clamp.', geom: hookCollet },
  { id: 'yarnover_finger', file: 'heklomat_yarnover_finger.stl', nameEn: 'Yarn-over finger', nameNo: 'Kast-finger', qty: 1, material: 'PETG', layerMm: 0.2, walls: 4, infill: 30, pattern: 'gyroid', support: false, minutesFudge: 0.3, notes: 'MG90S horn.', geom: yarnoverFinger },
  { id: 'servo_bracket', file: 'heklomat_servo_bracket.stl', nameEn: 'Servo bracket', nameNo: 'Servobrakett', qty: 2, material: 'PETG', layerMm: 0.2, walls: 4, infill: 30, pattern: 'gyroid', support: false, minutesFudge: 0.35, notes: 'One for finger, one spare/tension.', geom: servoBracket },
  { id: 'carousel_drum', file: 'heklomat_carousel_drum.stl', nameEn: 'Yarn carousel drum', nameNo: 'Garnkarusell', qty: 1, material: 'PETG', layerMm: 0.2, walls: 4, infill: 30, pattern: 'gyroid', support: false, minutesFudge: 1.15, notes: '⌀160, 6 stations.', geom: carouselDrum },
  { id: 'spool_spigot', file: 'heklomat_spool_spigot.stl', nameEn: 'Spool spigot', nameNo: 'Snellepigg', qty: 6, material: 'PLA', layerMm: 0.2, walls: 3, infill: 15, pattern: 'gyroid', support: false, minutesFudge: 0.25, notes: 'Press into drum.', geom: spoolSpigot },
  { id: 'yarn_eyelet', file: 'heklomat_yarn_eyelet.stl', nameEn: 'Yarn eyelet', nameNo: 'Garnøye', qty: 4, material: 'PETG', layerMm: 0.2, walls: 4, infill: 30, pattern: 'gyroid', support: false, minutesFudge: 0.2, notes: 'Guide path.', geom: yarnEyelet },
  { id: 'tension_arm', file: 'heklomat_tension_arm.stl', nameEn: 'Tension arm', nameNo: 'Strammearm', qty: 1, material: 'PETG', layerMm: 0.2, walls: 4, infill: 30, pattern: 'gyroid', support: false, minutesFudge: 0.4, notes: 'Carry-strand take-up.', geom: tensionArm },
  { id: 'nema17_mount', file: 'heklomat_nema17_mount.stl', nameEn: 'NEMA17 mount', nameNo: 'NEMA17-feste', qty: 3, material: 'PETG', layerMm: 0.2, walls: 4, infill: 30, pattern: 'gyroid', support: false, minutesFudge: 0.45, notes: 'C / Z / wheel.', geom: nema17Mount },
  { id: 'pi_case', file: 'heklomat_pi_case.stl', nameEn: 'Pi + SKR case', nameNo: 'Pi-kasse', qty: 1, material: 'PETG', layerMm: 0.2, walls: 4, infill: 30, pattern: 'gyroid', support: false, minutesFudge: 0.9, notes: 'Pi 4B + SKR Mini E3.', geom: piCase },
  { id: 'camera_pod', file: 'heklomat_camera_pod.stl', nameEn: 'Camera pod', nameNo: 'Kamerahus', qty: 1, material: 'PETG', layerMm: 0.2, walls: 4, infill: 30, pattern: 'gyroid', support: true, minutesFudge: 0.55, notes: 'Pi Camera 3. Print with supports.', geom: cameraPod },
  { id: 'tpu_foot', file: 'heklomat_tpu_foot.stl', nameEn: 'TPU foot pad', nameNo: 'TPU-fot', qty: 4, material: 'TPU', layerMm: 0.2, walls: 3, infill: 15, pattern: 'gyroid', support: false, minutesFudge: 0.2, notes: 'Under 2020 corners.', geom: tpuFoot },
  { id: 'hub_adapter', file: 'heklomat_hub_adapter.stl', nameEn: 'Hub adapter', nameNo: 'Navadapter', qty: 1, material: 'PETG', layerMm: 0.2, walls: 4, infill: 30, pattern: 'gyroid', support: true, minutesFudge: 0.5, notes: 'Platter to lazy-susan. Supports.', geom: hubAdapter },
  { id: 'rail_bracket', file: 'heklomat_rail_bracket.stl', nameEn: 'Rail bracket', nameNo: 'Skinnebrakett', qty: 2, material: 'PETG', layerMm: 0.2, walls: 4, infill: 30, pattern: 'gyroid', support: false, minutesFudge: 0.4, notes: 'MGN7H to cross-arm.', geom: railBracket },
];

function gramsOf(volumeMm3: number, material: Material): number {
  return volumeMm3 * DENSITY[material] * PACK[material] * 0.001;
}
function minutesOf(grams: number, spec: Spec): number {
  const gPerHour = spec.material === 'TPU' ? 12 : spec.material === 'PLA' ? 28 : 22;
  return Math.max(6, Math.round((grams / gPerHour) * 60 * spec.minutesFudge));
}

function main() {
  mkdirSync(stlDir, { recursive: true });
  mkdirSync(dataDir, { recursive: true });
  const parts = [];
  let petg = 0;
  let pla = 0;
  let tpu = 0;
  for (const spec of SPECS) {
    const t0 = Date.now();
    const g = spec.geom();
    assertManifold(g, spec.id);
    const vol = volume(g);
    if (!(vol > 0)) throw new Error(`${spec.id}: volume ${vol}`);
    const bb = bboxOf(g);
    if (bb.some((d) => d > 250.01)) {
      throw new Error(`${spec.id}: bbox ${bb.map((n) => n.toFixed(1))} exceeds 250 mm`);
    }
    writeFileSync(resolve(stlDir, spec.file), toStl(g, spec.id));
    const unitG = gramsOf(vol, spec.material);
    const grams = unitG * spec.qty;
    if (spec.material === 'PETG') petg += grams;
    if (spec.material === 'PLA') pla += grams;
    if (spec.material === 'TPU') tpu += grams;
    const minutes = minutesOf(unitG, spec);
    parts.push({
      id: spec.id,
      file: spec.file,
      nameEn: spec.nameEn,
      nameNo: spec.nameNo,
      qty: spec.qty,
      material: spec.material,
      layerMm: spec.layerMm,
      walls: spec.walls,
      infill: spec.infill,
      pattern: spec.pattern,
      support: spec.support,
      bbox: bb.map((n) => Math.round(n * 10) / 10),
      volumeMm3: Math.round(vol),
      grams: Math.round(unitG * 10) / 10,
      minutes,
      notes: spec.notes,
    });
    console.log(
      `${spec.file.padEnd(32)} ${bb.map((n) => n.toFixed(0).padStart(4)).join('×')} mm  ${unitG.toFixed(1).padStart(6)} g  ${Date.now() - t0} ms`,
    );
  }
  if (SPECS.length !== 21) throw new Error(`expected 21 parts, got ${SPECS.length}`);
  const payload = {
    generatedAt: new Date().toISOString(),
    printer: 'Bambu Lab X1 Carbon Combo',
    bedMm: [256, 256, 256],
    filamentG: { petg: Math.round(petg), pla: Math.round(pla), tpu: Math.round(tpu) },
    parts,
  };
  writeFileSync(
    resolve(dataDir, 'parts.js'),
    `/* generated by tools/build-stl.ts — do not edit */\nwindow.HEKLOMAT_PARTS = ${JSON.stringify(payload)};\n`,
  );
  console.log(`filament ≈ PETG ${payload.filamentG.petg} g / PLA ${payload.filamentG.pla} g / TPU ${payload.filamentG.tpu} g`);
  console.log(`wrote ${SPECS.length} STLs + data/parts.js`);
}

main();
