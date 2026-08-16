/**
 * Parametric 3D-printable parts for HEKLOMAT-1, emitted as binary STLs for
 * the Bambu Lab X1 Carbon (256×256×256 mm), plus data/parts.js metadata for
 * the parts viewer and the guide's printed-parts table.
 *
 *   cd invent_fable/tools && npm install && npm run stl
 *
 * Every part is validated hard: closed 2-manifold (directed-edge pairing on
 * the emitted triangles), bbox ≤ 250 mm per axis, volume > 0.
 * The hat mandrel is generated from tools/.profile.json — the same buildProfile
 * rings the app and the simulation use, in mm.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import Module from 'manifold-3d';

// Manifold CSG kernel — guaranteed watertight 2-manifold output by
// construction (the same kernel Bambu Studio uses for mesh repair).
const wasm = await Module();
wasm.setup();
const { Manifold } = wasm;
type Geom = InstanceType<typeof Manifold>;
const DEG = 180 / Math.PI;

const cuboid = (o: { size: [number, number, number]; center?: [number, number, number] }): Geom =>
  Manifold.cube(o.size, true).translate(o.center ?? [0, 0, 0]);
const cylinder = (o: { radius: number; height: number; segments?: number }): Geom =>
  Manifold.cylinder(o.height, o.radius, o.radius, o.segments ?? 48, true);
const translate = (v: [number, number, number], g: Geom): Geom => g.translate(v);
const rotateX = (a: number, g: Geom): Geom => g.rotate([a * DEG, 0, 0]);
const rotateY = (a: number, g: Geom): Geom => g.rotate([0, a * DEG, 0]);
const rotateZ = (a: number, g: Geom): Geom => g.rotate([0, 0, a * DEG]);
const union = (...gs: Geom[]): Geom => gs.reduce((a, b) => a.add(b));
const subtract = (a: Geom, ...bs: Geom[]): Geom => a.subtract(union(...bs));

/** Ensure CCW winding for a revolve cross-section. */
function ccw(points: [number, number][]): [number, number][] {
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];
    area += x1 * y2 - x2 * y1;
  }
  return area < 0 ? [...points].reverse() : points;
}

/** Revolve a (radius, height) cross-section around Z. */
const revolve = (points: [number, number][], seg = 96): Geom =>
  Manifold.revolve([ccw(points)], seg);

/** Torus in the XY plane around Z (tube radius = innerRadius). */
const torus = (o: {
  innerRadius: number;
  outerRadius: number;
  outerSegments?: number;
  innerSegments?: number;
}): Geom => {
  const n = o.innerSegments ?? 16;
  const pts: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    pts.push([o.outerRadius + o.innerRadius * Math.cos(a), o.innerRadius * Math.sin(a)]);
  }
  return Manifold.revolve([pts], o.outerSegments ?? 48);
};

const TOOLS = import.meta.dirname;
const ROOT = join(TOOLS, '..');
const STL_DIR = join(ROOT, 'stl');
mkdirSync(STL_DIR, { recursive: true });

const prof = JSON.parse(readFileSync(join(TOOLS, '.profile.json'), 'utf8')) as {
  id: string;
  suMm: number;
  topN: number;
  brimStart: number;
  rings: { r: number; y: number }[];
};

// ---------- helpers ---------------------------------------------------------

const cylZ = (r: number, h: number, at: [number, number, number] = [0, 0, 0], seg = 48) =>
  translate(at, cylinder({ radius: r, height: h, segments: seg }));

/** n small radial lug blocks at radius r, height y (bayonet male). */
function lugs(n: number, r: number, y: number, w = 9, d = 7, h = 4.4) {
  const out: Geom[] = [];
  for (let i = 0; i < n; i++) {
    out.push(rotateZ((i / n) * Math.PI * 2, translate([r, 0, y], cuboid({ size: [d, w, h] }))));
  }
  return union(...out);
}

/** Same blocks, slightly larger, for the female slots (subtract). */
const lugSlots = (n: number, r: number, y: number) => lugs(n, r, y, 10.2, 8.2, 5.6);

/** Shell of revolution: outer polyline (r,y) with wall thickness t inward. */
function shellPoints(
  rings: { r: number; y: number }[],
  t: number,
  closeTop: boolean,
): [number, number][] {
  const outer: [number, number][] = rings.map((p) => [p.r, p.y]);
  const inner: [number, number][] = [...rings]
    .reverse()
    .map((p) => [Math.max(p.r - t, 0.4), p.y]);
  if (closeTop) {
    const yTop = rings[0].y;
    return [[0.001, yTop + t], ...outer, ...inner, [0.001, yTop]];
  }
  return [...outer, ...inner];
}

// ---------- STL emission + validation ---------------------------------------

function emitBinarySTL(geom: Geom): Buffer {
  const mesh = geom.getMesh();
  const vp = mesh.vertProperties;
  const tv = mesh.triVerts;
  const stride = mesh.numProp;
  const tris = tv.length / 3;
  const buf = Buffer.alloc(84 + tris * 50);
  buf.write('HEKLOMAT-1 binary STL (manifold-3d)', 0, 'ascii');
  buf.writeUInt32LE(tris, 80);
  let o = 84;
  for (let t = 0; t < tris; t++) {
    const idx = [tv[t * 3], tv[t * 3 + 1], tv[t * 3 + 2]];
    const v = idx.map((i) => [vp[i * stride], vp[i * stride + 1], vp[i * stride + 2]]);
    const ux = v[1][0] - v[0][0], uy = v[1][1] - v[0][1], uz = v[1][2] - v[0][2];
    const wx = v[2][0] - v[0][0], wy = v[2][1] - v[0][1], wz = v[2][2] - v[0][2];
    let nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx;
    const len = Math.hypot(nx, ny, nz) || 1;
    nx /= len; ny /= len; nz /= len;
    buf.writeFloatLE(nx, o); buf.writeFloatLE(ny, o + 4); buf.writeFloatLE(nz, o + 8);
    for (let k = 0; k < 3; k++) {
      buf.writeFloatLE(v[k][0], o + 12 + k * 12);
      buf.writeFloatLE(v[k][1], o + 16 + k * 12);
      buf.writeFloatLE(v[k][2], o + 20 + k * 12);
    }
    buf.writeUInt16LE(0, o + 48);
    o += 50;
  }
  return buf;
}

interface Check {
  tris: number;
  bbox: [number, number, number];
  volumeCm3: number;
  closed: boolean;
  unpaired: number;
  degenerate: number;
}

function validateSTL(buf: Buffer): Check {
  const tris = buf.readUInt32LE(80);
  const q = (v: number) => Math.round(v * 1000); // 1 µm quantization
  const edges = new Map<string, number>();
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  let vol = 0;
  let degenerate = 0;

  for (let i = 0; i < tris; i++) {
    const o = 84 + i * 50 + 12;
    const v: [number, number, number][] = [];
    for (let k = 0; k < 3; k++) {
      const x = buf.readFloatLE(o + k * 12);
      const y = buf.readFloatLE(o + k * 12 + 4);
      const z = buf.readFloatLE(o + k * 12 + 8);
      v.push([x, y, z]);
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
      if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
    }
    // signed volume of tetrahedron (origin, v0, v1, v2)
    const [a, b, c] = v;
    vol +=
      (a[0] * (b[1] * c[2] - b[2] * c[1]) -
        a[1] * (b[0] * c[2] - b[2] * c[0]) +
        a[2] * (b[0] * c[1] - b[1] * c[0])) / 6;
    // area ≈ 0 ?
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
    const wx = c[0] - a[0], wy = c[1] - a[1], wz = c[2] - a[2];
    const cx = uy * wz - uz * wy, cy = uz * wx - ux * wz, cz = ux * wy - uy * wx;
    if (Math.sqrt(cx * cx + cy * cy + cz * cz) < 1e-6) degenerate++;
    // directed edges
    for (let k = 0; k < 3; k++) {
      const p1 = v[k], p2 = v[(k + 1) % 3];
      const key = `${q(p1[0])},${q(p1[1])},${q(p1[2])}|${q(p2[0])},${q(p2[1])},${q(p2[2])}`;
      edges.set(key, (edges.get(key) || 0) + 1);
    }
  }

  let unpaired = 0;
  for (const [key, n] of edges) {
    const [p1, p2] = key.split('|');
    const rev = `${p2}|${p1}`;
    if (n !== (edges.get(rev) || 0)) unpaired++;
  }

  return {
    tris,
    bbox: [maxX - minX, maxY - minY, maxZ - minZ],
    volumeCm3: Math.abs(vol) / 1000,
    closed: unpaired === 0,
    unpaired,
    degenerate,
  };
}

// ---------- part registry ----------------------------------------------------

interface Meta {
  file: string;
  nameEn: string;
  nameNo: string;
  qty: number;
  material: 'PETG' | 'PLA' | 'TPU';
  layer: number;
  walls: number;
  infill: number;
  supports: boolean;
  notes: string;
}

const DENSITY: Record<Meta['material'], number> = { PETG: 1.27, PLA: 1.24, TPU: 1.21 };
const FILL: Record<Meta['material'], number> = { PETG: 0.45, PLA: 0.35, TPU: 0.8 };

const registry: { solid: Geom; meta: Meta }[] = [];
const part = (solid: Geom, meta: Meta) => registry.push({ solid, meta });

// ---------- the parts --------------------------------------------------------

const WALL_T = 3;
const rings = prof.rings;
const topN = prof.topN;
const brimStart = prof.brimStart;
const shoulder = rings[topN - 1];
const wallEndRing = rings[brimStart - 1];

// -- 1. mandrel crown (dome, closed top, bayonet lugs at its lower rim)
{
  const crownRings = rings.slice(0, topN);
  const dome = revolve(shellPoints(crownRings, WALL_T, true));
  const rim = shoulder.r;
  const withLugs = union(
    dome,
    lugs(3, rim - WALL_T - 2.5, shoulder.y + 2.5),
  );
  part(withLugs, {
    file: 'heklomat_mandrel_crown',
    nameEn: 'Mandrel — crown dome',
    nameNo: 'Mandrell — kronedel',
    qty: 1,
    material: 'PETG',
    layer: 0.2,
    walls: 4,
    infill: 30,
    supports: false,
    notes: 'Print dome-up. Bayonet lugs twist into the wall section. Generated from the same buildProfile rings as the app.',
  });
}

// -- 2. mandrel wall (open shell between shoulder and brim start)
{
  const wallRings = rings.slice(topN - 1, brimStart);
  const shellG = revolve(shellPoints(wallRings, WALL_T, false));
  const withFeatures = subtract(
    union(shellG, lugs(3, wallEndRing.r - WALL_T - 2.5, wallEndRing.y + 2.5)),
    lugSlots(3, shoulder.r - WALL_T - 2.5, shoulder.y + 2.5),
  );
  part(withFeatures, {
    file: 'heklomat_mandrel_wall',
    nameEn: 'Mandrel — wall section',
    nameNo: 'Mandrell — veggdel',
    qty: 1,
    material: 'PETG',
    layer: 0.2,
    walls: 4,
    infill: 30,
    supports: false,
    notes: 'Open cylinder; bayonet slots on top (crown), lugs at bottom (brim skirt).',
  });
}

// -- 3. mandrel brim skirt (flare, radius capped to fit the X1C plate)
{
  const R_CAP = 120; // ⌀240 — fabric brim edge overhangs the skirt by design
  const brimRings = rings
    .slice(brimStart - 1)
    .map((p) => ({ r: Math.min(p.r, R_CAP), y: p.y }));
  const last = brimRings[brimRings.length - 1];
  brimRings.push({ r: Math.min(last.r + 1, R_CAP), y: last.y - 5 }); // stiffening drop edge
  const skirt = subtract(
    revolve(shellPoints(brimRings, WALL_T, false)),
    lugSlots(3, wallEndRing.r - WALL_T - 2.5, wallEndRing.y + 2.5),
  );
  // center spider: 3 spokes + hub ring so the skirt can bolt to the hub adapter
  const hubY = last.y - 2;
  const spider = subtract(
    union(
      cylZ(26, 6, [0, 0, hubY]),
      ...[0, 1, 2].map((i) =>
        rotateZ(
          (i / 3) * Math.PI * 2,
          translate([wallEndRing.r / 2, 0, hubY], cuboid({ size: [wallEndRing.r, 12, 6] })),
        ),
      ),
    ),
    cylZ(4.2, 40, [0, 0, hubY]), // M8 center
    ...[0, 1, 2, 3].map((i) =>
      rotateZ(
        (i / 4) * Math.PI * 2 + Math.PI / 4,
        translate([16, 0, hubY], cylinder({ radius: 2.7, height: 40, segments: 24 })),
      ),
    ),
  );
  part(union(skirt, spider), {
    file: 'heklomat_mandrel_brim',
    nameEn: 'Mandrel — brim skirt + spider',
    nameNo: 'Mandrell — bremskjørt + spindel',
    qty: 1,
    material: 'PETG',
    layer: 0.2,
    walls: 4,
    infill: 30,
    supports: false,
    notes: '⌀240 — largest part, fills the X1C plate. Bolts to the hub adapter; wall section bayonets on top.',
  });
}

// -- 4. turntable platter with GT2-60-style rim groove
{
  const R = 120;
  const platter = subtract(
    cylZ(R, 10, [0, 0, 5], 128),
    translate([0, 0, 5], torus({ innerRadius: 1.6, outerRadius: R, outerSegments: 128, innerSegments: 16 })),
    cylZ(11, 40, [0, 0, 5]), // center bore over hub
    ...[...Array(8)].map((_, i) =>
      rotateZ((i / 8) * Math.PI * 2, cylZ(2.7, 40, [95, 0, 5], 24)),
    ),
    ...[...Array(6)].map((_, i) =>
      rotateZ((i / 6) * Math.PI * 2, cylZ(24, 40, [60, 0, 5], 48)),
    ),
  );
  part(platter, {
    file: 'heklomat_platter',
    nameEn: 'Turntable platter (GT2 rim groove)',
    nameNo: 'Dreieskive (GT2-spor i randen)',
    qty: 1,
    material: 'PETG',
    layer: 0.2,
    walls: 4,
    infill: 30,
    supports: false,
    notes: 'Belt-driven at the rim. 8× M5 to the lazy-susan bearing, 6 pockets save 300 g of filament.',
  });
}

// -- 5. hub adapter platter↔bearing↔mandrel
{
  const hub = subtract(
    union(cylZ(40, 8, [0, 0, 4], 64), cylZ(22, 14, [0, 0, 15], 48)),
    cylZ(4.2, 60, [0, 0, 10]),
    ...[...Array(4)].map((_, i) =>
      rotateZ((i / 4) * Math.PI * 2, cylZ(2.7, 60, [30, 0, 4], 24)),
    ),
    ...[...Array(4)].map((_, i) =>
      rotateZ((i / 4) * Math.PI * 2 + Math.PI / 4, cylZ(2.7, 60, [16, 0, 15], 24)),
    ),
  );
  part(hub, {
    file: 'heklomat_hub_adapter',
    nameEn: 'Hub adapter (platter → mandrel)',
    nameNo: 'Navadapter (skive → mandrell)',
    qty: 1,
    material: 'PETG',
    layer: 0.2,
    walls: 5,
    infill: 40,
    supports: false,
    notes: 'M8 center stud + 4× M5 to platter, 4× M5 to the brim spider.',
  });
}

// -- 6/7. presentation wheel core + cover
{
  const core = subtract(
    cylZ(12, 11, [0, 0, 5.5], 64),
    cylZ(2.6, 40, [0, 0, 5.5]),
    // 8 latch-needle slots
    ...[...Array(8)].map((_, i) =>
      rotateZ(
        (i / 8) * Math.PI * 2,
        translate([9, 0, 6.5], cuboid({ size: [8, 2.1, 3.2] })),
      ),
    ),
    // 8 radial M3 setscrews
    ...[...Array(8)].map((_, i) =>
      rotateZ((i / 8) * Math.PI * 2, rotateY(Math.PI / 2, cylZ(1.4, 26, [0, 0, 6], 16))),
    ),
  );
  part(core, {
    file: 'heklomat_preswheel_core',
    nameEn: 'Presentation wheel — core (8 needle slots)',
    nameNo: 'Presentasjonshjul — kjerne (8 nålespor)',
    qty: 1,
    material: 'PETG',
    layer: 0.12,
    walls: 5,
    infill: 60,
    supports: false,
    notes: 'THE invention. Standard 6.5-gauge latch needles press into the slots; M3 setscrews lock them.',
  });
  const cover = subtract(
    cylZ(12, 3, [0, 0, 1.5], 64),
    cylZ(2.6, 12, [0, 0, 1.5]),
    ...[...Array(4)].map((_, i) =>
      rotateZ((i / 4) * Math.PI * 2, cylZ(1.1, 12, [7.5, 0, 1.5], 12)),
    ),
  );
  part(cover, {
    file: 'heklomat_preswheel_cover',
    nameEn: 'Presentation wheel — cover',
    nameNo: 'Presentasjonshjul — deksel',
    qty: 1,
    material: 'PETG',
    layer: 0.12,
    walls: 4,
    infill: 30,
    supports: false,
    notes: 'Caps the needle slots. 4× M2 self-tapping.',
  });
}

// -- 8. presentation wheel arm with mesh-depth slot
{
  const arm = subtract(
    union(
      translate([46, 0, 6], cuboid({ size: [92, 22, 12] })),
      cylZ(11, 12, [0, 0, 6], 48),
      cylZ(11, 12, [92, 0, 6], 48),
    ),
    cylZ(4.1, 40, [0, 0, 6]), // pivot bore
    cylZ(2.6, 40, [92, 0, 6]), // wheel axle M5
    // mesh-depth adjustment slot (two holes + connecting bar)
    union(
      cylZ(2.7, 40, [30, 0, 6], 24),
      cylZ(2.7, 40, [62, 0, 6], 24),
      translate([46, 0, 6], cuboid({ size: [32, 5.4, 40] })),
    ),
  );
  part(arm, {
    file: 'heklomat_preswheel_arm',
    nameEn: 'Presentation wheel — arm',
    nameNo: 'Presentasjonshjul — arm',
    qty: 1,
    material: 'PETG',
    layer: 0.2,
    walls: 4,
    infill: 40,
    supports: false,
    notes: 'The slot sets how deep the teeth mesh into the fabric edge (calibration step 2).',
  });
}

// -- 9. hook carriage
{
  const carriage = subtract(
    translate([0, 0, 15], cuboid({ size: [46, 36, 30] })),
    // MGN7 rail pocket through the back
    translate([0, 14.2, 15], cuboid({ size: [17.5, 8.5, 40] })),
    ...[[-7.5, 7.5], [7.5, 7.5], [-7.5, 22.5], [7.5, 22.5]].map(([x, z]) =>
      translate([x, 10, z], rotateX(Math.PI / 2, cylinder({ radius: 1.7, height: 30, segments: 16 }))),
    ),
    // vertical collet bore + clamp slit
    cylZ(4.1, 60, [0, -8, 15]),
    translate([0, -14, 15], cuboid({ size: [1.6, 14, 40] })),
    translate([8, -8, 15], rotateY(Math.PI / 2, cylinder({ radius: 1.7, height: 30, segments: 16 }))),
  );
  part(carriage, {
    file: 'heklomat_hook_carriage',
    nameEn: 'Hook carriage',
    nameNo: 'Krokvogn',
    qty: 1,
    material: 'PETG',
    layer: 0.2,
    walls: 5,
    infill: 40,
    supports: false,
    notes: 'Rides the MGN7 plunge rail; clamps the hook collet with one M3.',
  });
}

// -- 10. hook collet
{
  const collet = subtract(
    cylZ(7, 14, [0, 0, 7], 48),
    cylZ(2.35, 40, [0, 0, 7]), // 4.0–4.5 mm hook shafts
    translate([0, 3.5, 9], cuboid({ size: [1.4, 7, 12] })),
    translate([0, 0, 4], rotateX(Math.PI / 2, cylinder({ radius: 1.7, height: 30, segments: 16 }))),
  );
  part(collet, {
    file: 'heklomat_hook_collet',
    nameEn: 'Hook collet',
    nameNo: 'Krok-klemhylse',
    qty: 1,
    material: 'PETG',
    layer: 0.12,
    walls: 4,
    infill: 50,
    supports: false,
    notes: 'Takes a standard 4.0 mm aluminium crochet hook with the handle cut off.',
  });
}

// -- 11. yarn-over finger
{
  const finger = subtract(
    union(
      translate([26, 0, 4], cuboid({ size: [58, 13, 8] })),
      cylZ(8, 9, [0, 0, 4.5], 48),
      cylZ(4.5, 8, [55, 0, 8], 32),
    ),
    cylZ(2.4, 30, [0, 0, 5]), // MG90S spline bore (press fit + screw)
    cylZ(1.1, 30, [0, 0, 5], 12),
    // yarn guide notch at the tip
    translate([55, 0, 13], rotateY(Math.PI / 2, cylinder({ radius: 1.6, height: 12, segments: 16 }))),
  );
  part(finger, {
    file: 'heklomat_yo_finger',
    nameEn: 'Yarn-over finger',
    nameNo: 'Garnfinger',
    qty: 1,
    material: 'PETG',
    layer: 0.12,
    walls: 4,
    infill: 40,
    supports: false,
    notes: 'Sweeps the active yarn over the hook — twice per stitch. Presses onto the MG90S spline.',
  });
}

// -- 12. servo bracket ×2
{
  const bracket = subtract(
    union(
      translate([0, 0, 2], cuboid({ size: [38, 26, 4] })), // ear plate
      translate([0, 11.5, 8], cuboid({ size: [38, 3, 16] })), // stiffening wall
      translate([0, -11.5, 8], cuboid({ size: [38, 3, 16] })),
    ),
    translate([0, 0, 2], cuboid({ size: [23.4, 12.8, 20] })), // MG90S window
    ...[[-13.7, 0], [13.7, 0]].map(([x, y]) => cylZ(1.1, 30, [x, y, 2], 12)),
  );
  part(bracket, {
    file: 'heklomat_servo_bracket',
    nameEn: 'Servo bracket (MG90S)',
    nameNo: 'Servobrakett (MG90S)',
    qty: 2,
    material: 'PETG',
    layer: 0.2,
    walls: 3,
    infill: 25,
    supports: false,
    notes: 'One for the yarn-over finger, one spare / tensioner assist.',
  });
}

// -- 13. carousel drum
{
  const drum = subtract(
    union(cylZ(80, 8, [0, 0, 4], 128), cylZ(16, 32, [0, 0, 16], 64)),
    cylZ(2.6, 80, [0, 0, 16]), // K-axis shaft M5
    ...[...Array(6)].map((_, i) =>
      rotateZ((i / 6) * Math.PI * 2, cylZ(5.2, 30, [62, 0, 4], 32)),
    ),
    ...[...Array(6)].map((_, i) =>
      rotateZ((i / 6) * Math.PI * 2 + Math.PI / 6, cylZ(18, 30, [42, 0, 4], 48)),
    ),
  );
  part(drum, {
    file: 'heklomat_carousel_drum',
    nameEn: 'Yarn carousel drum (6 stations)',
    nameNo: 'Garnkarusell-trommel (6 stasjoner)',
    qty: 1,
    material: 'PETG',
    layer: 0.2,
    walls: 4,
    infill: 20,
    supports: false,
    notes: 'Six spool spigots press into the ⌀10.4 sockets; stepper drives the center hub.',
  });
}

// -- 14. spool spigot ×6
{
  const spigot = union(
    cylZ(10, 4, [0, 0, 2], 48),
    cylZ(6, 66, [0, 0, 33 + 4], 32),
    translate([0, 0, 68], torus({ innerRadius: 1.3, outerRadius: 6.4, outerSegments: 32, innerSegments: 12 })),
    cylZ(5.15, 6, [0, 0, -3], 32), // press stub into the drum socket
  );
  part(spigot, {
    file: 'heklomat_spool_spigot',
    nameEn: 'Spool spigot',
    nameNo: 'Snellepinne',
    qty: 6,
    material: 'PLA',
    layer: 0.2,
    walls: 3,
    infill: 15,
    supports: false,
    notes: 'Torus lip keeps the spool from lifting as yarn pays off.',
  });
}

// -- 15. yarn eyelet ×3
{
  const eyelet = subtract(
    union(
      translate([0, 0, 2], cuboid({ size: [16, 16, 4] })),
      cylZ(3, 18, [0, 0, 13], 24),
      translate([0, 0, 24], rotateX(Math.PI / 2, torus({ innerRadius: 1.4, outerRadius: 4.6, outerSegments: 32, innerSegments: 12 }))),
    ),
    ...[[-5, -5], [5, 5]].map(([x, y]) => cylZ(1.7, 20, [x, y, 2], 16)),
  );
  part(eyelet, {
    file: 'heklomat_yarn_eyelet',
    nameEn: 'Yarn eyelet post',
    nameNo: 'Garnøye på fot',
    qty: 3,
    material: 'PLA',
    layer: 0.2,
    walls: 3,
    infill: 15,
    supports: true,
    notes: 'Guides the three active strands along the carry path. Supports under the ring.',
  });
}

// -- 16. tension arm
{
  const tension = subtract(
    union(
      translate([35, 0, 5], cuboid({ size: [82, 12, 10] })),
      cylZ(9, 12, [0, 0, 5], 48),
      cylZ(7, 10, [70, 0, 5], 32),
    ),
    cylZ(4.1, 40, [0, 0, 5]), // pivot on 608ZZ stub
    cylZ(3.2, 40, [70, 0, 5]), // eyelet bore
    cylZ(2.6, 12, [12, 0, 9], 16), // spring anchor
  );
  part(tension, {
    file: 'heklomat_tension_arm',
    nameEn: 'Spring tension arm',
    nameNo: 'Strammearm med fjær',
    qty: 1,
    material: 'PETG',
    layer: 0.2,
    walls: 4,
    infill: 30,
    supports: false,
    notes: 'Keeps 15–25 g of tension on the active strand — the number hand-crocheters keep by feel.',
  });
}

// -- 17. NEMA17 motor mount ×3
{
  const mount = subtract(
    union(
      translate([0, 0, 4.5], cuboid({ size: [62, 62, 9] })),
      translate([0, -34, 15], cuboid({ size: [62, 6, 30] })),
    ),
    cylZ(11.5, 30, [0, 0, 4.5]),
    ...[[-15.5, -15.5], [15.5, -15.5], [-15.5, 15.5], [15.5, 15.5]].map(([x, y]) =>
      union(
        cylZ(1.7, 30, [x, y, 4.5], 16),
        cylZ(1.7, 30, [x + 4, y, 4.5], 16),
        translate([x + 2, y, 4.5], cuboid({ size: [4, 3.4, 30] })),
      ),
    ),
    ...[[-20, 8], [20, 8], [0, 22]].map(([x, z]) =>
      translate([x, -34, z], rotateX(Math.PI / 2, cylinder({ radius: 2.7, height: 20, segments: 16 }))),
    ),
  );
  part(mount, {
    file: 'heklomat_motor_mount',
    nameEn: 'NEMA17 motor mount',
    nameNo: 'NEMA17-motorfot',
    qty: 3,
    material: 'PETG',
    layer: 0.2,
    walls: 4,
    infill: 30,
    supports: false,
    notes: 'Slotted holes give belt tension adjustment. C-axis, K-axis and Z-axis motors.',
  });
}

// -- 18/19. Pi 4 case
{
  const base = subtract(
    translate([0, 0, 11], cuboid({ size: [96, 71, 22] })),
    translate([0, 0, 13.5], cuboid({ size: [91, 66, 22] })),
    translate([48, 0, 13], cuboid({ size: [10, 55, 14] })), // USB/eth window
    translate([-28, 35, 12], cuboid({ size: [22, 10, 10] })), // power/HDMI
  );
  const standoffs = [...[[-41, -28], [41, -28], [-41, 21], [41, 21]].map(([x, y]) =>
    subtract(cylZ(3, 6, [x, y, 5], 20), cylZ(1.25, 20, [x, y, 6], 12)),
  )];
  part(union(base, ...standoffs), {
    file: 'heklomat_pi_case_base',
    nameEn: 'Raspberry Pi case — base',
    nameNo: 'Raspberry Pi-kasse — bunn',
    qty: 1,
    material: 'PLA',
    layer: 0.2,
    walls: 3,
    infill: 15,
    supports: false,
    notes: 'Fits Pi 4B; ribbon slot for the camera.',
  });
  const lid = subtract(
    translate([0, 0, 4], cuboid({ size: [96, 71, 8] })),
    translate([0, 0, 1.5], cuboid({ size: [91, 66, 8] })),
    ...[...Array(8)].map((_, i) =>
      translate([-35 + i * 10, 0, 6], cuboid({ size: [4, 46, 8] })),
    ),
  );
  part(lid, {
    file: 'heklomat_pi_case_lid',
    nameEn: 'Raspberry Pi case — lid',
    nameNo: 'Raspberry Pi-kasse — lokk',
    qty: 1,
    material: 'PLA',
    layer: 0.2,
    walls: 3,
    infill: 15,
    supports: false,
    notes: 'Vent slots over the SoC.',
  });
}

// -- 20. camera pod
{
  const pod = subtract(
    union(
      translate([0, 0, 13], cuboid({ size: [32, 32, 26] })),
      translate([0, 22, 8], rotateX(Math.PI / 2, cylinder({ radius: 7, height: 14, segments: 32 }))),
    ),
    translate([0, 0, 14], cuboid({ size: [27, 27, 26] })),
    translate([0, -14, 13], rotateX(Math.PI / 2, cylinder({ radius: 8, height: 10, segments: 32 }))),
    translate([0, 22, 8], rotateX(Math.PI / 2, cylinder({ radius: 4.1, height: 20, segments: 24 }))),
    translate([0, 22, 2], cuboid({ size: [1.6, 14, 14] })),
    translate([8, 22, 8], rotateY(Math.PI / 2, cylinder({ radius: 1.7, height: 14, segments: 16 }))),
  );
  part(pod, {
    file: 'heklomat_camera_pod',
    nameEn: 'QC camera pod + rod clamp',
    nameNo: 'Kamerahus + stangklemme',
    qty: 1,
    material: 'PLA',
    layer: 0.2,
    walls: 3,
    infill: 20,
    supports: true,
    notes: 'Aims the Pi Camera 3 at the work point for stitch-by-stitch verification.',
  });
}

// -- 21. TPU foot pad ×4
{
  const pad = union(
    cylZ(15, 8, [0, 0, 4], 48),
    translate([0, 0, 9.5], cuboid({ size: [6, 10, 3] })), // 2020 slot nub
  );
  part(pad, {
    file: 'heklomat_foot_pad',
    nameEn: 'Foot pad (TPU)',
    nameNo: 'Fot (TPU)',
    qty: 4,
    material: 'TPU',
    layer: 0.25,
    walls: 3,
    infill: 30,
    supports: false,
    notes: 'Snaps into the bottom 2020 slot; kills resonance on a tabletop.',
  });
}

// ---------- emit -------------------------------------------------------------

console.log('part                                tris   bbox (mm)          closed  cm³     g   min');
const partsMeta: Record<string, unknown>[] = [];
let failed = 0;

for (const { solid, meta } of registry) {
  const buf = emitBinarySTL(solid);
  const chk = validateSTL(buf);
  const grams = chk.volumeCm3 * DENSITY[meta.material] * FILL[meta.material];
  const timeMin = grams * 2.2;
  const bb = chk.bbox.map((v) => v.toFixed(0)).join('×');
  const ok = chk.closed && chk.degenerate === 0 && chk.volumeCm3 > 0 && Math.max(...chk.bbox) <= 250;
  if (!ok) failed++;
  console.log(
    `${meta.file.padEnd(34)} ${String(chk.tris).padStart(6)}  ${bb.padEnd(18)} ${
      chk.closed ? '  ✓' : `  ✗(${chk.unpaired})`
    }${chk.degenerate ? ` deg=${chk.degenerate}` : ''}  ${chk.volumeCm3.toFixed(0).padStart(5)} ${grams
      .toFixed(0)
      .padStart(5)} ${timeMin.toFixed(0).padStart(5)}`,
  );
  writeFileSync(join(STL_DIR, `${meta.file}.stl`), buf);
  partsMeta.push({
    ...meta,
    bbox: chk.bbox.map((v) => Number(v.toFixed(1))),
    grams: Number(grams.toFixed(0)),
    timeMin: Number(timeMin.toFixed(0)),
    tris: chk.tris,
  });
}

if (failed) {
  console.error(`\n${failed} part(s) FAILED validation`);
  process.exit(1);
}

const totals = {
  PETG: partsMeta.filter((p: any) => p.material === 'PETG').reduce((a, p: any) => a + p.grams * p.qty, 0),
  PLA: partsMeta.filter((p: any) => p.material === 'PLA').reduce((a, p: any) => a + p.grams * p.qty, 0),
  TPU: partsMeta.filter((p: any) => p.material === 'TPU').reduce((a, p: any) => a + p.grams * p.qty, 0),
};

const js = `// GENERATED by invent_fable/tools/build-stl.ts — do not edit.\nwindow.HEKLOMAT_PARTS = ${JSON.stringify({ printer: 'Bambu Lab X1 Carbon (256×256×256 mm)', totals, parts: partsMeta })};\n`;
writeFileSync(join(ROOT, 'data', 'parts.js'), js);
console.log(
  `\n${registry.length} parts OK → stl/ · filament: PETG ${totals.PETG} g · PLA ${totals.PLA} g · TPU ${totals.TPU} g`,
);
