/**
 * Forward kinematics. Pure geometry, no React.
 *
 * The twin, the stitch animation and the G-code emitter all call this. Because parts
 * attach to FRAMES rather than carrying baked transforms, there is no way for the
 * animation to show motion the machine cannot perform.
 */

import * as THREE from 'three';
import type { AxisId, AxisValues, Vec3 } from './axes.ts';

export type FrameId = 'base' | AxisId;

export interface Pose {
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
}

const DEG = Math.PI / 180;

/**
 * Frame chain:
 *   base
 *    +- C   Rz(C)                       the rotating former
 *    +- Z   T(0,0,Z)                    station lift
 *        +- R   T(R,0,0)                station radial (station sits on +X, faces -X)
 *            +- B   Ry(-B)              tilt, keeps the needle normal to the fabric
 *                +- P   T(-P,0,0)       needle plunge, toward the workpiece
 *                +- G   T(0,12,0)T(-G,0,0)   presenter finger
 *                +- S   T(14,-10,0)Rz(S)     yarn selector carousel
 *    +- F1  T(-190,150,300)             yarn feed roller
 */
export function frames(v: AxisValues): Record<FrameId, THREE.Matrix4> {
  const base = new THREE.Matrix4();

  const C = new THREE.Matrix4().makeRotationZ(v.C * DEG);
  const Z = new THREE.Matrix4().makeTranslation(0, 0, v.Z);
  const R = Z.clone().multiply(new THREE.Matrix4().makeTranslation(v.R, 0, 0));
  const B = R.clone().multiply(new THREE.Matrix4().makeRotationY(-v.B * DEG));

  const P = B.clone().multiply(new THREE.Matrix4().makeTranslation(-v.P, 0, 0));
  const G = B.clone()
    .multiply(new THREE.Matrix4().makeTranslation(0, 12, 0))
    .multiply(new THREE.Matrix4().makeTranslation(-v.G, 0, 0));
  const S = B.clone()
    .multiply(new THREE.Matrix4().makeTranslation(14, -10, 0))
    .multiply(new THREE.Matrix4().makeRotationZ(v.S * DEG));

  const F1 = new THREE.Matrix4()
    .makeTranslation(-150, -318, 236)
    .multiply(new THREE.Matrix4().makeRotationY(v.F1 * DEG));

  return { base, C, Z, R, B, P, G, S, F1 };
}

const _p = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();

export function decompose(m: THREE.Matrix4): Pose {
  m.decompose(_p, _q, _s);
  return { position: _p.clone(), quaternion: _q.clone() };
}

/** Where the needle tip is, in world mm. The yarn spline is built from this. */
export function hookTip(v: AxisValues): THREE.Vector3 {
  const f = frames(v);
  return new THREE.Vector3(-NEEDLE_LEN, 0, 0).applyMatrix4(f.P);
}

/** Tip of the presenter finger, world mm. */
export function presenterTip(v: AxisValues): THREE.Vector3 {
  const f = frames(v);
  return new THREE.Vector3(-PRESENTER_LEN, 0, 0).applyMatrix4(f.G);
}

export const NEEDLE_LEN = 46;
export const PRESENTER_LEN = 26;

export function localMatrix(position: Vec3, rotationDeg: Vec3 = [0, 0, 0]): THREE.Matrix4 {
  const e = new THREE.Euler(rotationDeg[0] * DEG, rotationDeg[1] * DEG, rotationDeg[2] * DEG);
  return new THREE.Matrix4()
    .makeRotationFromEuler(e)
    .setPosition(position[0], position[1], position[2]);
}
