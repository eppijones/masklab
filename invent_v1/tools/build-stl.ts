/**
 * Registry -> manifold -> validate -> write.
 *
 * Run from invent_v1/tools:   npm run stl
 *
 * The predecessor (invent/heklomat/tools/build-stl.ts) wrote every STL to disk
 * at line 813 and only reached its validation gate at line 823 — so a failing
 * part still landed in stl/ and only the generated manifest was protected. This
 * version buffers everything and writes ALL OR NOTHING, because the build guide
 * references a set of parts: a half-updated stl/ directory is worse than an
 * empty one, since it looks fine.
 */

import { createHash } from 'node:crypto';
import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// The one place the kernel is resolved. cad/eval-manifold.ts takes it as an
// argument so that nothing outside tools/ depends on this install location.
// @ts-expect-error -- the isolated toolchain ships no types we consume
import ManifoldModule from 'manifold-3d';

import {
  emitBinarySTL,
  emitTwinMesh,
  evalSolid,
  initKernel,
  toMesh,
  type RawMesh,
} from '../cad/eval-manifold.ts';
import { PARTS } from '../parts/registry.ts';
import { MAX_PART_MM, NOZZLE_MM } from '../machine/units.ts';
import type { PartDef } from '../parts/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const STL_DIR = join(ROOT, 'stl');
const MESH_DIR = join(ROOT, 'data', 'twin-meshes');
const REPORT = join(ROOT, 'data', 'parts.build.json');

/* ---------------------------------------------------------- validation --- */

export interface Check {
  tris: number;
  bbox: [number, number, number];
  volumeCm3: number;
  closed: boolean;
  unpairedEdges: number;
  degenerate: number;
  bodies: number;
  genus: number;
}

/**
 * Re-parse the bytes we just produced, rather than trusting the in-memory
 * model. The artifact is what goes to the printer, so the artifact is what
 * gets checked.
 */
export function validateSTL(buf: Buffer): Check {
  const tris = buf.readUInt32LE(80);
  const q = (v: number) => Math.round(v * 1000); // 1 um
  const edges = new Map<string, number>();
  const verts = new Set<string>();
  let degenerate = 0;
  let vol = 0;
  const lo = [Infinity, Infinity, Infinity];
  const hi = [-Infinity, -Infinity, -Infinity];

  for (let i = 0; i < tris; i++) {
    const o = 84 + i * 50 + 12;
    const p: number[][] = [];
    for (let j = 0; j < 3; j++) {
      const v = [
        buf.readFloatLE(o + j * 12),
        buf.readFloatLE(o + j * 12 + 4),
        buf.readFloatLE(o + j * 12 + 8),
      ];
      p.push(v);
      for (let k = 0; k < 3; k++) {
        if (v[k] < lo[k]) lo[k] = v[k];
        if (v[k] > hi[k]) hi[k] = v[k];
      }
    }

    const [a, b, c] = p;
    const ux = b[0] - a[0];
    const uy = b[1] - a[1];
    const uz = b[2] - a[2];
    const wx = c[0] - a[0];
    const wy = c[1] - a[1];
    const wz = c[2] - a[2];
    const cx = uy * wz - uz * wy;
    const cy = uz * wx - ux * wz;
    const cz = ux * wy - uy * wx;
    if (Math.hypot(cx, cy, cz) < 1e-6) {
      degenerate++;
      continue;
    }

    vol +=
      (a[0] * (b[1] * c[2] - b[2] * c[1]) -
        a[1] * (b[0] * c[2] - b[2] * c[0]) +
        a[2] * (b[0] * c[1] - b[1] * c[0])) /
      6;

    const keys = p.map((v) => `${q(v[0])},${q(v[1])},${q(v[2])}`);
    keys.forEach((k) => verts.add(k));
    for (let j = 0; j < 3; j++) {
      const k = `${keys[j]}|${keys[(j + 1) % 3]}`;
      edges.set(k, (edges.get(k) ?? 0) + 1);
    }
  }

  // Directed-edge pairing: every half-edge must have exactly one twin running
  // the other way. This catches both holes and duplicated faces.
  let unpaired = 0;
  for (const [k, n] of edges) {
    const [p1, p2] = k.split('|');
    if (n !== (edges.get(`${p2}|${p1}`) ?? 0)) unpaired++;
  }

  // Euler characteristic gives genus for a closed surface: V - E + F = 2 - 2g.
  const E = edges.size / 2;
  const V = verts.size;
  const F = tris - degenerate;
  const genus = unpaired === 0 ? (2 - (V - E + F)) / 2 : NaN;

  return {
    tris,
    bbox: [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]],
    volumeCm3: Math.abs(vol) / 1000,
    closed: unpaired === 0,
    unpairedEdges: unpaired,
    degenerate,
    bodies: 1, // filled in from the kernel below
    genus,
  };
}

/* -------------------------------------------------------------- weight --- */

const DENSITY = { PETG: 1.27, PLA: 1.24, TPU: 1.21 } as const;

/**
 * Solid fraction from the DECLARED walls and infill, not a flat fudge.
 * Rough shell model: a part of volume V and surface area A has roughly
 * A * wallThickness of solid skin, and the remainder at the infill fraction.
 * Good to about 15%, which is honest for a filament estimate — and unlike the
 * predecessor's constant, it actually responds when you change the settings.
 */
function grammes(p: PartDef, volumeCm3: number, areaCm2: number): number {
  const print = p.print!;
  const skinCm = (print.walls * NOZZLE_MM) / 10;
  const skinVol = Math.min(areaCm2 * skinCm, volumeCm3 * 0.95);
  const coreVol = Math.max(0, volumeCm3 - skinVol);
  const solid = skinVol + coreVol * (print.infillPct / 100);
  return solid * DENSITY[print.material];
}

/* --------------------------------------------------------------- build --- */

interface Built {
  part: PartDef;
  stl: Buffer;
  mesh: Buffer;
  check: Check;
  grams: number;
  problems: string[];
}

async function main() {
  await initKernel(ManifoldModule);

  const built: Built[] = [];
  let failed = 0;

  for (const part of PARTS) {
    if (!part.print || !part.build) continue;

    const problems: string[] = [];
    let geom: ReturnType<typeof evalSolid>;
    let mesh: RawMesh;

    try {
      geom = evalSolid(part.build(part.dims));
      if (part.print.orientationDeg) {
        geom = geom.rotate(part.print.orientationDeg as unknown as number[]);
      }
      mesh = toMesh(geom);
    } catch (e) {
      console.error(`  ${part.id.padEnd(22)} EVAL FAILED  ${(e as Error).message}`);
      failed++;
      continue;
    }

    const stl = emitBinarySTL(mesh, `HEKLOMAT V1 ${part.id} (manifold-3d)`);
    const check = validateSTL(stl);
    check.bodies = geom.decompose().length;

    const areaCm2 = geom.surfaceArea() / 100;
    const grams = grammes(part, check.volumeCm3, areaCm2);

    if (!check.closed) problems.push(`${check.unpairedEdges} unpaired edges — not watertight`);
    if (check.degenerate > 0) problems.push(`${check.degenerate} degenerate triangles`);
    if (check.volumeCm3 <= 0) problems.push('non-positive volume');
    if (check.bodies !== 1) {
      problems.push(
        `${check.bodies} disconnected bodies — a subtract tool probably never touched the base`,
      );
    }
    const maxDim = Math.max(...check.bbox);
    if (maxDim > MAX_PART_MM) {
      problems.push(`${maxDim.toFixed(1)} mm exceeds the ${MAX_PART_MM} mm build volume`);
    }

    if (problems.length) failed++;

    built.push({ part, stl, mesh: emitTwinMesh(mesh), check, grams, problems });

    const flag = problems.length ? 'FAIL' : 'ok  ';
    console.log(
      `  ${flag} ${part.id.padEnd(22)} ${String(check.tris).padStart(6)} tris  ` +
        `${check.bbox.map((v) => v.toFixed(1).padStart(6)).join(' x ')} mm  ` +
        `${grams.toFixed(1).padStart(6)} g` +
        (problems.length ? `\n         ${problems.join('\n         ')}` : ''),
    );
  }

  console.log('');

  // ---- the gate. Nothing is written unless every part passed. -------------
  if (failed) {
    console.error(
      `${failed} part(s) failed validation. Nothing written — stl/ is unchanged.\n` +
        `A half-updated parts directory looks fine and is not, so this build is all or nothing.`,
    );
    process.exit(1);
  }

  mkdirSync(STL_DIR, { recursive: true });
  mkdirSync(MESH_DIR, { recursive: true });
  for (const dir of [STL_DIR, MESH_DIR]) {
    for (const f of readdirSync(dir)) rmSync(join(dir, f));
  }

  const manifest = built.map((b) => ({
    id: b.part.id,
    file: `${b.part.id}.stl`,
    sha256: createHash('sha256').update(b.stl).digest('hex'),
    tris: b.check.tris,
    bbox: b.check.bbox.map((v) => Number(v.toFixed(2))),
    volumeCm3: Number(b.check.volumeCm3.toFixed(3)),
    closed: b.check.closed,
    degenerate: b.check.degenerate,
    bodies: b.check.bodies,
    genus: b.check.genus,
    grams: Number(b.grams.toFixed(1)),
    material: b.part.print!.material,
    qty: b.part.qty,
  }));

  for (const b of built) {
    writeFileSync(join(STL_DIR, `${b.part.id}.stl`), b.stl);
    writeFileSync(join(MESH_DIR, `${b.part.id}.bin`), b.mesh);
  }

  const totals: Record<string, number> = {};
  for (const m of manifest) totals[m.material] = (totals[m.material] ?? 0) + m.grams * m.qty;

  writeFileSync(
    REPORT,
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString().slice(0, 10),
        printer: `Bambu Lab X1 Carbon (${MAX_PART_MM} mm part limit)`,
        totalsGrams: Object.fromEntries(
          Object.entries(totals).map(([k, v]) => [k, Number(v.toFixed(1))]),
        ),
        parts: manifest,
      },
      null,
      2,
    )}\n`,
  );

  const pieces = manifest.reduce((a, m) => a + m.qty, 0);
  const gTotal = Object.values(totals).reduce((a, v) => a + v, 0);
  console.log(
    `wrote ${manifest.length} STLs (${pieces} pieces, ${gTotal.toFixed(0)} g) + twin meshes + parts.build.json`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
