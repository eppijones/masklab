/**
 * The growing hat. Same trick the parent app uses in HatScene.tsx: one InstancedMesh for
 * every stitch, with `mesh.count = stitchesCompleted` for a progressive reveal.
 *
 * Colours are the NORGE · Home palette. Until the compiler lands (Phase 2) the colourwork
 * is a stand-in band pattern rather than the real per-stitch chart; the geometry and the
 * stitch ordering are already the real thing.
 */

import * as THREE from 'three';
import { FORMER, MACHINE_ROUNDS, STITCH_W_MM, STITCH_H_MM } from '../machine/units.ts';
import { addressOf, TOTAL } from '../machine/program.ts';

export const YARN = {
  red: '#BA0C2F',
  blue: '#00205B',
  lightblue: '#6E8BC8',
  white: '#F2ECDD',
} as const;

/** One fastmaske: two legs and a top V, as a cheap merged tube. */
export function stitchGeometry(): THREE.BufferGeometry {
  const w = STITCH_W_MM * 0.46;
  const h = STITCH_H_MM * 0.52;
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-w, -h, 0),
    new THREE.Vector3(-w * 0.75, 0, 0.5),
    new THREE.Vector3(0, h * 0.85, 0.9),
    new THREE.Vector3(w * 0.75, 0, 0.5),
    new THREE.Vector3(w, -h, 0),
  ]);
  return new THREE.TubeGeometry(curve, 10, STITCH_W_MM * 0.2, 6, false);
}

/** Sidewall rounds carry the colour chart; index 9..22 in machine order. */
const WALL_START = 9;
const WALL_END = 23;

function colorFor(roundIdx: number, i: number, count: number): string {
  if (roundIdx < 2) return YARN.blue;
  if (roundIdx < 4) return YARN.white;
  if (roundIdx < WALL_START) return roundIdx % 2 === 0 ? YARN.red : YARN.blue;
  if (roundIdx < WALL_END) {
    // stand-in wordmark band: five blocky glyph columns around the wall
    const u = (i / count) * 100;
    const row = roundIdx - WALL_START;
    const inBand = row > 2 && row < 11;
    const glyph = Math.floor(u / 20) % 2 === 0 ? (u % 20) > 4 && (u % 20) < 16 : (u % 20) > 8;
    return inBand && glyph ? YARN.white : YARN.red;
  }
  const k = (roundIdx * 7 + i) % 11;
  if (k < 2) return YARN.blue;
  if (k < 4) return YARN.lightblue;
  if (k < 6) return YARN.white;
  return YARN.red;
}

export interface StitchInstance {
  matrix: THREE.Matrix4;
  color: THREE.Color;
}

/** Deterministic ±4.5% tone jitter so flat colour does not read as plastic. */
function shade(hex: string, seed: number): THREE.Color {
  const c = new THREE.Color(hex);
  const n = Math.sin(seed * 12.9898) * 43758.5453;
  const j = 1 + ((n - Math.floor(n)) - 0.5) * 0.09;
  return c.multiplyScalar(j);
}

export function buildWorkpiece(): { matrices: Float32Array; colors: Float32Array } {
  const matrices = new Float32Array(TOTAL * 16);
  const colors = new Float32Array(TOTAL * 3);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const pos = new THREE.Vector3();
  const scl = new THREE.Vector3(1, 1, 1);
  const up = new THREE.Vector3();
  const tangent = new THREE.Vector3();
  const out = new THREE.Vector3();
  const basis = new THREE.Matrix4();

  for (let g = 0; g < TOTAL; g++) {
    const a = addressOf(g);
    const ring = FORMER[a.roundIdx];
    const prev = FORMER[Math.max(a.roundIdx - 1, 0)];
    const theta = (a.indexInRound / a.count) * Math.PI * 2;
    const cos = Math.cos(theta);
    const sin = Math.sin(theta);
    const r = ring.r + 1.6; // sit the yarn on the former surface

    pos.set(r * cos, r * sin, ring.z);
    // Local basis: x = circumferential tangent, z = up along the surface, y = outward.
    tangent.set(-sin, cos, 0).normalize();
    up.set((ring.r - prev.r) * cos, (ring.r - prev.r) * sin, ring.z - prev.z).normalize();
    if (!isFinite(up.x) || up.lengthSq() < 1e-6) up.set(0, 0, 1);
    out.crossVectors(tangent, up).normalize();
    up.crossVectors(out, tangent).normalize();
    basis.makeBasis(tangent, up, out);
    q.setFromRotationMatrix(basis);
    m.compose(pos, q, scl);
    m.toArray(matrices, g * 16);

    const c = shade(colorFor(a.roundIdx, a.indexInRound, a.count), g);
    colors[g * 3] = c.r;
    colors[g * 3 + 1] = c.g;
    colors[g * 3 + 2] = c.b;
  }
  return { matrices, colors };
}

export const ROUND_COUNT = MACHINE_ROUNDS.length;
export const STITCH_TOTAL = TOTAL;
