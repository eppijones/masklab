/**
 * Emits public/system/assembly.json — one world matrix per part instance.
 *
 * The browser never recomputes kinematics. It gets a flat list of
 * {partId, matrix} and places the STL it already downloaded. That keeps the
 * viewer small and means the picture is driven by the SAME frame chain the
 * machine uses, not by a modeller's second guess.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ALL_STEPS } from '../guide/steps.ts';
import { homeValues } from '../machine/axes.ts';
import { frames } from '../machine/frames.ts';
import { multiply, rotationEulerDeg, translation, type Mat4, type Vec3 } from '../machine/mat4.ts';
import { PARTS } from '../parts/registry.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, '..', 'public', 'system');

export interface Instance {
  partId: string;
  /** 16 floats, column-major — hand straight to THREE.Matrix4.fromArray(). */
  m: number[];
}

function placement(pos: Vec3, rotDeg?: Vec3): Mat4 {
  const t = translation(pos);
  return rotDeg ? multiply(t, rotationEulerDeg(rotDeg)) : t;
}

function main() {
  const f = frames(homeValues());
  const instances: Instance[] = [];

  for (const p of PARTS) {
    if (!p.print) continue; // only printed parts have an STL to show
    const parent = f[p.mount.frame];
    const seats = p.repeats?.length
      ? p.repeats.map((r) => ({ position: r.position, rotationDeg: r.rotationDeg }))
      : [{ position: p.mount.position, rotationDeg: p.mount.rotationDeg }];

    for (const s of seats) {
      const world = multiply(parent, placement(s.position, s.rotationDeg));
      instances.push({ partId: p.id, m: Array.from(world, (v) => Number(v.toFixed(4))) });
    }
  }

  // Which parts each step introduces, so the viewer can build up the assembly
  // one step at a time and highlight what is new.
  const steps = ALL_STEPS.map((s) => ({
    n: s.n,
    track: s.track,
    parts: s.parts.filter((id) => PARTS.some((p) => p.id === id && p.print)),
  }));

  mkdirSync(OUT, { recursive: true });
  writeFileSync(
    join(OUT, 'assembly.json'),
    `${JSON.stringify({ instances, steps }, null, 0)}\n`,
  );

  const byPart = new Map<string, number>();
  for (const i of instances) byPart.set(i.partId, (byPart.get(i.partId) ?? 0) + 1);
  console.log(
    `wrote assembly.json — ${instances.length} instances of ${byPart.size} printed parts, ${steps.length} steps`,
  );
}

main();
