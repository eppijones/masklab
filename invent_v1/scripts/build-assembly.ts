/**
 * Emits public/system/assembly.json — one world matrix per part instance.
 *
 * The browser never recomputes kinematics. It gets a flat list of
 * {partId, matrix} and places the STL it already downloaded. That keeps the
 * viewer small and means the picture is driven by the SAME frame chain the
 * machine uses, not by a modeller's second guess.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ALL_STEPS } from '../guide/steps.ts';
import { homeValues } from '../machine/axes.ts';
import { frames } from '../machine/frames.ts';
import { HARDWARE } from '../machine/hardware.ts';
import { programme } from '../machine/programme.ts';
import { multiply, rotationEulerDeg, translation, type Mat4, type Vec3 } from '../machine/mat4.ts';
import { PARTS } from '../parts/registry.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, '..', 'public', 'system');

export interface Instance {
  partId: string;
  /** 16 floats, column-major — hand straight to THREE.Matrix4.fromArray(). */
  m: number[];
  /** Which direction this piece travels in when the step animation explodes it. */
  dir?: number[];
}

export interface HardwareInstance {
  id: string;
  kind: string;
  m: number[];
  size: number[];
  tone: string;
  step: number;
  track: string;
  label: string;
  labelNo: string;
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
      instances.push({
        partId: p.id,
        m: Array.from(world, (v) => Number(v.toFixed(4))),
        // Explode direction for the assembly animation. Declared per part where
        // it matters; otherwise a piece flies in from straight above, which is
        // right for anything that drops onto a face and wrong for nothing much.
        dir: (p.explodeDir ?? [0, 0, 1]) as number[],
      });
    }
  }

  // The bought hardware, placed through the same frame chain. Without this the
  // build steps show brackets with no rail in them and a motor mount with no
  // motor — which is exactly why they did not read as instructions.
  const hardware: HardwareInstance[] = HARDWARE.map((h) => {
    const world = multiply(f[h.frame], placement(h.position, h.rotationDeg));
    return {
      id: h.id,
      kind: h.kind,
      m: Array.from(world, (v) => Number(v.toFixed(4))),
      size: (h.size ?? [10, 10, 10]) as number[],
      tone: h.tone ?? 'alu',
      step: h.step,
      track: h.track,
      label: h.label,
      labelNo: h.labelNo,
    };
  });

  // Which parts each step introduces, so the viewer can build up the assembly
  // one step at a time and highlight what is new.
  const steps = ALL_STEPS.map((s) => ({
    n: s.n,
    track: s.track,
    parts: s.parts.filter((id) => PARTS.some((p) => p.id === id && p.print)),
    hardware: HARDWARE.filter((h) => h.step === s.n).map((h) => h.id),
    layout: s.layout ?? null,
  }));

  // The reference hat, so the simulation and the page agree on what is being
  // made without either of them holding its own copy of the numbers.
  const ref = programme();

  mkdirSync(OUT, { recursive: true });
  writeFileSync(
    join(OUT, 'assembly.json'),
    `${JSON.stringify({ instances, hardware, steps, ref }, null, 0)}\n`,
  );

  // The reference hat, per stitch, for the simulation. Emitted separately
  // because it is a different shape of data and about 60 kB — the assembly
  // viewer should not have to download a colour stream to draw a bracket.
  //
  // This is a straight projection of the app's own snapshot: round counts,
  // per-stitch colour indices, increase positions and the ring profile. The
  // simulation therefore shows the pattern that exists, not a plausible one.
  const snap = JSON.parse(readFileSync(join(ROOT, 'data', 'hats.json'), 'utf8')) as {
    hats: {
      id: string;
      name: string;
      suMm: number;
      totalStitches: number;
      totalRounds: number;
      colorChanges: number;
      palette: { id: string; hex: string }[];
      rounds: { num: number; count: number; colors: number[]; inc: number[] }[];
      profile: { r: number; y: number }[];
    }[];
  };
  const hats = snap.hats.map((h) => ({
    id: h.id,
    name: h.name,
    suMm: h.suMm,
    totalStitches: h.totalStitches,
    totalRounds: h.totalRounds,
    colorChanges: h.colorChanges,
    palette: h.palette.map((p) => p.hex),
    // Flat colour stream plus round boundaries: one array of 3 694 small ints
    // packs far tighter than 42 nested arrays and is what the sim iterates.
    counts: h.rounds.map((r) => r.count),
    colors: h.rounds.flatMap((r) => r.colors),
    inc: h.rounds.map((r) => r.inc),
    profile: h.profile.map((p) => [Number(p.r.toFixed(2)), Number(p.y.toFixed(2))]),
  }));
  writeFileSync(join(OUT, 'hat.json'), `${JSON.stringify({ hats }, null, 0)}\n`);

  const byPart = new Map<string, number>();
  for (const i of instances) byPart.set(i.partId, (byPart.get(i.partId) ?? 0) + 1);
  console.log(
    `wrote assembly.json — ${instances.length} instances of ${byPart.size} printed parts, ` +
      `${hardware.length} hardware items, ${steps.length} steps`,
  );
  console.log(`wrote hat.json — ${hats.length} patterns, ${hats[0].colors.length} stitch colours in the reference`);
}

main();
