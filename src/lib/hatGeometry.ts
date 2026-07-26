import * as THREE from 'three';
import type { Round, Stitch } from '../data/types';

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
 * Rotates the whole colour layout so the first "RO" word faces the
 * default camera direction (the front of the hat).
 */
export const FRONT_THETA = 0.85;
/** Stitch number at the centre of the first RO word (chart column ~9,
 *  and with the corrected direction stitch s = column s-1, so s = 10). */
const RO_CENTER_STITCH = 10;
/** Text-field stitch count — used to place the RO front facing the camera. */
const TEXT_COLS = 100;

/** Angle where every round STARTS (stitch 1 / the marker "seam"). */
export const SEAM_THETA =
  FRONT_THETA + ((RO_CENTER_STITCH - 1) / TEXT_COLS) * Math.PI * 2;

export interface RingPos {
  r: number;
  y: number;
}

/** Azimuth angle of stitch i (0-based) in a round of `count` stitches.
 *  Matches the theta used in buildStitchTransforms (mod 2*PI). */
export function stitchTheta(i: number, count: number): number {
  const frac = ((i + 0.5) / count) * Math.PI * 2;
  // Physical direction (fixed 18 July): right-handed top-down crochet runs
  // counterclockwise seen from above the crown = decreasing theta in three.js.
  return SEAM_THETA - frac;
}

export function radiusFor(count: number): number {
  return (count * STITCH_W) / (2 * Math.PI);
}

/** Profile of the hat: one ring (radius, y) per round, crown at the top. */
export function buildProfile(rounds: Round[]): RingPos[] {
  const h = STITCH_H;
  const targets = rounds.map((r) => radiusFor(r.count));
  // Tiny centre opening: 10 fm squeezed into one chain stitch.
  targets[0] = 0.8;
  // The crown is a flat disc: each round of the real fabric sits one stitch
  // further out than the previous, regardless of where the increases land
  // (the fabric averages them out). Ramp the radii evenly from the centre to
  // the full crown radius so there are no jumps and no bald rings.
  const topN = rounds.filter((r) => r.phase === 'top').length;
  const smoothed = [...targets];
  const crownR = targets[topN - 1];
  for (let i = 1; i < topN; i++) {
    smoothed[i] = targets[0] + (i / (topN - 1)) * (crownR - targets[0]);
  }
  // The brim flares the same way: increases land on single rounds, but the
  // fabric spreads them into a smooth cone. Ramp the radii linearly from the
  // last text round out to the final edge so the brim has no flat terraces.
  const brimStart = rounds.findIndex((r) => r.phase === 'brim-inc');
  if (brimStart > 0) {
    const rFrom = smoothed[brimStart - 1];
    const rTo = targets[targets.length - 1];
    const n = smoothed.length - brimStart;
    for (let i = 0; i < n; i++) {
      smoothed[brimStart + i] = rFrom + ((i + 1) / n) * (rTo - rFrom);
    }
  }
  // Round off the shoulder where the flat disc turns into the vertical side,
  // like real fabric does (the letters curl slightly over the edge, exactly
  // as on Helene's hat).
  for (let pass = 0; pass < 3; pass++) {
    const src = [...smoothed];
    for (let i = topN - 3; i <= topN + 1 && i < smoothed.length - 1; i++) {
      smoothed[i] = (src[i - 1] + src[i] + src[i + 1]) / 3;
    }
  }

  // Vertical drop per round follows the fabric itself: consecutive rounds sit
  // one stitch height apart ALONG THE SURFACE, so dy = sqrt(h^2 - dr^2).
  // While the crown disc grows a full stitch outwards per round (dr ~ h) the
  // rounds barely drop at all -> flat disc. As the increases stop, dr shrinks
  // and the surface rolls smoothly into vertical sides. No artificial clamps,
  // so there are no terraces.
  const rings: RingPos[] = [];
  let y = 0;
  let prevR = smoothed[0];
  rounds.forEach((round, idx) => {
    const r = smoothed[idx];
    const dr = Math.min(r - prevR, h * 0.98);
    let dy = Math.sqrt(Math.max(0, h * h - dr * dr));
    if (round.phase === 'top') {
      // gentle dome: the disc sags a touch more towards its edge
      dy = Math.max(dy * 0.9, h * (0.05 + 0.12 * (idx / Math.max(1, topN - 1))));
      if (idx === 0) dy = 0;
    } else if (round.phase !== 'text') {
      // brim: flare outward-and-down at a gentle bucket-hat angle
      dy = Math.max(dy, 0.4 * h) * 0.9;
    }
    y -= dy;
    rings.push({ r, y });
    prevR = r;
  });
  // Shift so the brim edge sits just above the origin.
  const minY = rings[rings.length - 1].y;
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
): StitchTransform[] {
  const out: StitchTransform[] = [];
  const m = new THREE.Matrix4();
  const xAxis = new THREE.Vector3();
  const yAxis = new THREE.Vector3();
  const zAxis = new THREE.Vector3();

  // Angle offset so the first RO word is centred at FRONT_THETA.
  const thetaOffset =
    FRONT_THETA + ((RO_CENTER_STITCH - 0.5) / TEXT_COLS) * Math.PI * 2;

  for (const st of stitches) {
    const round = rounds[st.roundIdx];
    const ring = profile[st.roundIdx];
    const prev: RingPos =
      st.roundIdx > 0 ? profile[st.roundIdx - 1] : { r: 0, y: ring.y + STITCH_H * 0.5 };

    // Joined rounds: every round starts at the same angle so chart columns
    // stack vertically. PHYSICAL working direction (fixed 18 July, verified
    // against the user's real hat): right-handed top-down crochet advances
    // counterclockwise seen from above the crown, i.e. stitch numbers grow
    // LEFT-to-right on the finished outside = decreasing theta in three.js.
    const frac = ((st.i + 0.5) / round.count) * Math.PI * 2;
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

/**
 * One stitch as a plump little loop of yarn (an upside-down U), like the
 * "maske" you actually see in crochet fabric — not a sharp V.
 */
export function makeStitchGeometry(): THREE.BufferGeometry {
  const pts: THREE.Vector3[] = [
    new THREE.Vector3(-0.3, -0.52, -0.02),
    new THREE.Vector3(-0.37, -0.12, 0.03),
    new THREE.Vector3(-0.22, 0.24, 0.09),
    new THREE.Vector3(0, 0.37, 0.13),
    new THREE.Vector3(0.22, 0.24, 0.09),
    new THREE.Vector3(0.37, -0.12, 0.03),
    new THREE.Vector3(0.3, -0.52, -0.02),
  ].map((p) => p.multiplyScalar(STITCH_H * 1.22));
  const curve = new THREE.CatmullRomCurve3(pts);
  const geo = new THREE.TubeGeometry(curve, 24, 0.205, 8, false);
  // Small vertical offset so the loop sits over the round below.
  geo.translate(0, -STITCH_H * 0.05, 0);
  return geo;
}

/** Smooth silhouette of the finished hat for the ghost preview. */
export function makeGhostGeometry(profile: RingPos[]): THREE.BufferGeometry {
  const pts: THREE.Vector2[] = [new THREE.Vector2(0.001, profile[0].y + STITCH_H * 0.4)];
  for (const ring of profile) pts.push(new THREE.Vector2(ring.r, ring.y));
  const last = profile[profile.length - 1];
  pts.push(new THREE.Vector2(last.r + 0.15, last.y - 0.1));
  return new THREE.LatheGeometry(pts, 72);
}
