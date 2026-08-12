import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Round, Stitch, YarnColor } from '../data/types';

/**
 * Maps the pattern onto a bucket-hat surface.
 *
 * Units: 1 = one stitch width. A fastmaske with 4.0 mm hook is roughly
 * one stitch-width unit; stitch height H = 0.85 widths.
 * Radius of a round follows directly from its stitch count:
 * r = count / (2 * PI) (circumference = count stitch-widths).
 */

export const STITCH_W = 1;
export const STITCH_H = 0.85;

/**
 * Rotates the whole colour layout so a chosen chart column faces the
 * default camera direction (the front of the hat).
 */
export const FRONT_THETA = 0.85;
/** Stitch number at the centre of the first RO word (chart column ~9,
 *  and with the corrected direction stitch s = column s-1, so s = 10). */
const RO_CENTER_STITCH = 10;
/** Text-field stitch count — used to place the RO front facing the camera. */
const TEXT_COLS = 100;

export interface HatLayoutOpts {
  /** 1-based chart stitch that should face the camera (RO uses 10). */
  frontAnchorStitch?: number;
  /** Wall circumference used for the front-offset (RO / Martin = 100). */
  textCols?: number;
  /**
   * Rotate each round in 3D (not the recipe/chart indices) so columns of
   * this colour stack at fixed angles. Needed for Flagget: as red sections
   * grow, blue pairs drift ~½ stitch per increase round and read as a
   * broken pinwheel if placed by raw stitch index alone.
   */
  lockSpokeColor?: YarnColor;
  /**
   * Per-round fractional azimuth shift (0..1 of the circle), precomputed
   * by computeSpokeFracDeltas when lockSpokeColor is set.
   */
  spokeFracDeltas?: number[];
}

/** Angle where every round STARTS (stitch 1 / the marker "seam"). */
export function seamTheta(opts?: HatLayoutOpts): number {
  const front = opts?.frontAnchorStitch ?? RO_CENTER_STITCH;
  const cols = opts?.textCols ?? TEXT_COLS;
  return FRONT_THETA + ((front - 1) / cols) * Math.PI * 2;
}

/** @deprecated Prefer seamTheta({ frontAnchorStitch, textCols }). */
export const SEAM_THETA = seamTheta();

export interface RingPos {
  r: number;
  y: number;
}

/**
 * Midpoint (in stitch index space) of the first contiguous run of `lock`
 * that is not the entire round. Returns null when the round is solid or
 * has no stitches of that colour.
 */
function firstSpokeCenter(colors: YarnColor[], lock: YarnColor): number | null {
  if (colors.length === 0) return null;
  let first = -1;
  let nLock = 0;
  for (let i = 0; i < colors.length; i++) {
    if (colors[i] === lock) {
      nLock++;
      if (first < 0) first = i;
    }
  }
  if (first < 0 || nLock === colors.length) return null;
  let end = first;
  while (end + 1 < colors.length && colors[end + 1] === lock) end++;
  return (first + end) / 2;
}

/**
 * Per-round fractional azimuth shifts so `lockColor` columns share angles
 * across rounds with different stitch counts. Recipe/chart stitch order is
 * unchanged — only 3D placement rotates.
 */
export function computeSpokeFracDeltas(
  rounds: Round[],
  stitches: Stitch[],
  lockColor: YarnColor,
): number[] {
  const byRound: YarnColor[][] = rounds.map((r) =>
    Array<YarnColor>(r.count).fill(r.color),
  );
  for (const s of stitches) {
    byRound[s.roundIdx][s.i] = s.color;
  }

  let targetFrac: number | null = null;
  for (let r = 0; r < rounds.length; r++) {
    if (rounds[r].phase !== 'text') continue;
    const mid = firstSpokeCenter(byRound[r], lockColor);
    if (mid == null) continue;
    targetFrac = (mid + 0.5) / byRound[r].length;
    break;
  }
  if (targetFrac == null) {
    for (let r = rounds.length - 1; r >= 0; r--) {
      const mid = firstSpokeCenter(byRound[r], lockColor);
      if (mid == null) continue;
      targetFrac = (mid + 0.5) / byRound[r].length;
      break;
    }
  }
  if (targetFrac == null) return rounds.map(() => 0);

  const deltas: number[] = [];
  let prev = 0;
  for (let r = 0; r < rounds.length; r++) {
    const colors = byRound[r];
    const mid = firstSpokeCenter(colors, lockColor);
    if (mid == null) {
      deltas.push(prev);
      continue;
    }
    const cur = (mid + 0.5) / colors.length;
    let d = targetFrac - cur;
    d -= Math.round(d);
    deltas.push(d);
    prev = d;
  }
  return deltas;
}

/** Azimuth angle of stitch i (0-based) in a round of `count` stitches.
 *  Matches the theta used in buildStitchTransforms (mod 2*PI). */
export function stitchTheta(
  i: number,
  count: number,
  opts?: HatLayoutOpts,
  roundIdx?: number,
): number {
  const spoke =
    roundIdx != null && opts?.spokeFracDeltas
      ? (opts.spokeFracDeltas[roundIdx] ?? 0)
      : 0;
  const frac = ((i + 0.5) / count + spoke) * Math.PI * 2;
  return seamTheta(opts) - frac;
}

export function radiusFor(count: number): number {
  return (count * STITCH_W) / (2 * Math.PI);
}

/** Deterministic [0,1) hash of one integer — the spiral's per-round wobble. */
function hash01(n: number): number {
  let h = Math.imul(n + 0x9e37, 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Profile of the hat: one ring (radius, y) per round, crown at the top. */
export function buildProfile(rounds: Round[]): RingPos[] {
  const h = STITCH_H;
  const n = rounds.length;
  if (n === 0) return [];

  const targets = rounds.map((r) => radiusFor(r.count));
  // Tiny centre opening: 10 fm squeezed into one chain stitch.
  targets[0] = 0.8;

  const topN = rounds.filter((r) => r.phase === 'top').length;
  const brimStart = rounds.findIndex(
    (r) => r.phase === 'brim-inc' || r.phase === 'wave' || r.phase === 'brim',
  );
  const wallEnd = brimStart > 0 ? brimStart - 1 : n - 1;

  // 1) Recipe radii with even crown disc + soft mid-wall + eased brim.
  const smoothed = [...targets];
  const crownR = targets[Math.max(0, topN - 1)];
  for (let i = 1; i < topN; i++) {
    smoothed[i] = targets[0] + (i / Math.max(1, topN - 1)) * (crownR - targets[0]);
  }
  // Soft mid-wall circumference jumps (Flagget 88→96): diffuse the step into
  // a gentle cone across the wall interior. The wall's first and last rounds
  // stay pinned, so the shoulder and brim joins are unaffected. Per-round
  // deviation from the recipe radius stays within ~3% of circumference —
  // visually invisible at stitch scale, but it removes the barrel bulge the
  // single-round step used to produce.
  if (brimStart > topN + 2) {
    for (let pass = 0; pass < 8; pass++) {
      const src = [...smoothed];
      for (let i = topN + 1; i < brimStart - 1; i++) {
        smoothed[i] = (src[i - 1] + src[i] * 2 + src[i + 1]) / 4;
      }
    }
  }
  if (brimStart > 0) {
    const rFrom = smoothed[wallEnd];
    const rTo = targets[n - 1];
    const bn = n - brimStart;
    for (let i = 0; i < bn; i++) {
      const t = (i + 1) / bn;
      const ease = t * t * (3 - 2 * t);
      smoothed[brimStart + i] = rFrom + ease * (rTo - rFrom);
    }
  }

  // 2) Round the shoulder + wall→brim joins (radius only — keep extents).
  for (let pass = 0; pass < 6; pass++) {
    const src = [...smoothed];
    for (let i = 1; i < n - 1; i++) {
      const nearShoulder = i >= topN - 4 && i <= Math.min(n - 2, topN + 3);
      const nearBrim =
        brimStart > 0 && i >= brimStart - 3 && i <= Math.min(n - 2, brimStart + 4);
      if (nearShoulder || nearBrim) {
        smoothed[i] = (src[i - 1] + src[i] * 2 + src[i + 1]) / 4;
      }
    }
  }

  // 3) Continuous bucket tangents: dome → soft shoulder → wall → eased brim.
  const rings: RingPos[] = [];
  let y = 0;
  let prevR = smoothed[0];
  for (let idx = 0; idx < n; idx++) {
    const r = Math.max(smoothed[idx], prevR); // never shrink mid-profile
    const actualDr = Math.max(0, r - prevR);
    let dy: number;

    if (idx === 0) {
      dy = 0;
    } else if (idx < topN) {
      // Soft dome: flat centre, accelerating roll into the shoulder.
      const t = idx / Math.max(1, topN - 1);
      const roll = t * t;
      const targetDy = h * (0.08 + 0.7 * roll);
      const drCap = Math.min(actualDr, h * (0.95 - 0.55 * roll));
      dy = Math.max(targetDy, Math.sqrt(Math.max(0, h * h - drCap * drCap)));
    } else if (brimStart < 0 || idx < brimStart) {
      const fromShoulder = Math.min(1, (idx - topN) / 4);
      const drCap = Math.min(actualDr, h * (0.45 * (1 - fromShoulder) + 0.12));
      dy = Math.sqrt(Math.max(h * 0.6, h * h - drCap * drCap));
    } else {
      const brimI = idx - brimStart;
      const brimN = Math.max(1, n - brimStart - 1);
      const t = Math.min(1, brimI / brimN);
      const flare = 0.25 + 0.65 * (t * t * (3 - 2 * t));
      const drCap = Math.min(actualDr, h * flare);
      dy = Math.sqrt(Math.max(h * 0.32, h * h - drCap * drCap));
    }

    y -= dy;
    rings.push({ r, y });
    prevR = r;
  }

  // 4) Soften y kinks at shoulder + brim; keep strictly descending.
  for (let pass = 0; pass < 4; pass++) {
    const srcY = rings.map((ring) => ring.y);
    for (let i = 1; i < n - 1; i++) {
      const nearShoulder = i >= topN - 4 && i <= Math.min(n - 2, topN + 3);
      const nearBrim =
        brimStart > 0 && i >= brimStart - 3 && i <= Math.min(n - 2, brimStart + 4);
      if (nearShoulder || nearBrim) {
        rings[i] = {
          r: rings[i].r,
          y: (srcY[i - 1] + srcY[i] * 2 + srcY[i + 1]) / 4,
        };
      }
    }
  }
  for (let i = 1; i < n; i++) {
    if (rings[i].y > rings[i - 1].y - 0.04) {
      rings[i] = { r: rings[i].r, y: rings[i - 1].y - 0.04 };
    }
  }

  const minY = rings[n - 1].y;
  const lift = -minY + 0.4;
  return rings.map(({ r, y: yy }) => ({ r, y: yy + lift }));
}

export interface StitchTransform {
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
}

/**
 * Position + orientation for every stitch, in the same working order
 * as the stitches array. Local axes of the stitch geometry:
 * x = circumferential tangent, y = up along the hat surface, z = outward.
 *
 * There is exactly ONE layout: the physical hat. The working (sy) view
 * never mirrors anything — it only flips the whole group upside down,
 * which by itself reproduces what you see in your own hands (text upside
 * down, work advancing to the left).
 */
export function buildStitchTransforms(
  rounds: Round[],
  stitches: Stitch[],
  profile: RingPos[],
  opts?: HatLayoutOpts,
): StitchTransform[] {
  const out: StitchTransform[] = [];
  const m = new THREE.Matrix4();
  const xAxis = new THREE.Vector3();
  const yAxis = new THREE.Vector3();
  const zAxis = new THREE.Vector3();

  const front = opts?.frontAnchorStitch ?? RO_CENTER_STITCH;
  const cols = opts?.textCols ?? TEXT_COLS;
  const thetaOffset = FRONT_THETA + ((front - 0.5) / cols) * Math.PI * 2;
  const spokeDeltas =
    opts?.spokeFracDeltas ??
    (opts?.lockSpokeColor
      ? computeSpokeFracDeltas(rounds, stitches, opts.lockSpokeColor)
      : null);

  for (const st of stitches) {
    const round = rounds[st.roundIdx];
    const ring = profile[st.roundIdx];
    const prev: RingPos =
      st.roundIdx > 0
        ? profile[st.roundIdx - 1]
        : { r: 0, y: ring.y + STITCH_H * 0.5 };

    const spoke = spokeDeltas?.[st.roundIdx] ?? 0;
    // Spiral phase drift. Real crochet worked in a spiral never stacks its
    // stitches in dead-straight columns; the mechanical grid is what made the
    // fabric read as machine knit. A deterministic ±0.2-stitch wobble per round
    // breaks the columns without accumulating — accumulating drift would shear
    // the wordmark off vertical over twelve rounds.
    const drift = (hash01(st.roundIdx) - 0.5) * 0.4;
    const frac = ((st.i + 0.5 + drift) / round.count + spoke) * Math.PI * 2;
    const theta = thetaOffset - frac;

    const cos = Math.cos(theta);
    const sin = Math.sin(theta);

    const pos = new THREE.Vector3(ring.r * cos, ring.y, ring.r * sin);

    // Up along the surface: towards where the previous round's ring is.
    yAxis
      .set((prev.r - ring.r) * cos, prev.y - ring.y, (prev.r - ring.r) * sin)
      .normalize();
    if (yAxis.lengthSq() < 0.5) yAxis.set(0, 1, 0);
    // Circumferential tangent:
    xAxis.set(-sin, 0, cos);
    zAxis.crossVectors(xAxis, yAxis).normalize();
    // Re-orthogonalize x:
    xAxis.crossVectors(yAxis, zAxis).normalize();

    m.makeBasis(xAxis, yAxis, zAxis);
    const q = new THREE.Quaternion().setFromRotationMatrix(m);
    out.push({ position: pos, quaternion: q });
  }
  return out;
}

/** One tube along a Catmull-Rom curve through `pts`, scaled to stitch height. */
function yarnTube(
  pts: [number, number, number][],
  radius: number,
  segments = 16,
): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3(
    pts.map(([x, y, z]) => new THREE.Vector3(x, y, z).multiplyScalar(STITCH_H * 1.22)),
  );
  return new THREE.TubeGeometry(curve, segments, radius, 7, false);
}

/**
 * One FASTMASKE (single crochet), worked in a spiral.
 *
 * A single crochet is not the plump arch a knit stitch makes, and drawing it as
 * one was what gave the fabric its knit/chainmail read. It is three things:
 *
 *   · a heavy vertical POST — the body of the stitch, pulled up through the
 *     round below, and the thickest yarn on the face of the fabric;
 *   · the two loops that close over the top of it, seen from the front as a
 *     shallow V — the V you put the hook into on the next round;
 *   · a slight lean to the right, because a spiral pulls every stitch a little
 *     way round the hat as it is worked.
 *
 * Three tubes merged into one geometry, so the instanced draw call is unchanged.
 */
export function makeStitchGeometry(): THREE.BufferGeometry {
  // The two legs. This is the part that has to TILE — it carries the mass of
  // the fabric, and if it is thin the hat reads as chainmail instead of cloth.
  const legs = yarnTube(
    [
      [-0.31, -0.54, -0.03],
      [-0.36, -0.16, 0.03],
      [-0.21, 0.2, 0.08],
      [0.01, 0.32, 0.11],
      [0.23, 0.2, 0.08],
      [0.38, -0.16, 0.03],
      [0.33, -0.54, -0.03],
    ],
    0.195,
    22,
  );
  // The post: the heavy bar of yarn pulled up through the round below, sitting
  // proud between the legs. A single crochet is a squat, solid stitch — this is
  // what closes the lattice a knit stitch leaves open.
  const post = yarnTube(
    [
      [-0.02, -0.5, 0.07],
      [0.01, -0.24, 0.14],
      [0.04, 0.02, 0.17],
      [0.06, 0.2, 0.14],
    ],
    0.205,
    12,
  );
  // The top loops, seen from the front as a shallow V — the V the hook goes
  // into on the next round. Set forward of the post so it reads as a ridge.
  const topV = yarnTube(
    [
      [-0.33, 0.33, 0.09],
      [-0.14, 0.22, 0.16],
      [0.06, 0.18, 0.19],
      [0.26, 0.24, 0.16],
      [0.42, 0.35, 0.09],
    ],
    0.14,
    14,
  );

  const geo = mergeGeometries([legs, post, topV], false) ?? legs;
  legs.dispose();
  post.dispose();
  topV.dispose();
  // The spiral lean: about 6° of right tilt on every stitch.
  geo.rotateZ(-0.105);
  // Small vertical offset so the loop sits over the round below.
  geo.translate(0, -STITCH_H * 0.05, 0);
  geo.computeVertexNormals();
  return geo;
}

/** Smooth silhouette of the finished hat for the ghost preview. */
export function makeGhostGeometry(profile: RingPos[]): THREE.BufferGeometry {
  const pts: THREE.Vector2[] = [
    new THREE.Vector2(0.001, profile[0].y + STITCH_H * 0.4),
  ];
  for (const ring of profile) pts.push(new THREE.Vector2(ring.r, ring.y));
  const last = profile[profile.length - 1];
  pts.push(new THREE.Vector2(last.r + 0.15, last.y - 0.1));
  return new THREE.LatheGeometry(pts, 72);
}

/** Alias kept for older call sites — same as ghost silhouette. */
export function makeFabricShellGeometry(
  profile: RingPos[],
  _inset = 0,
): THREE.BufferGeometry {
  return makeGhostGeometry(profile);
}
