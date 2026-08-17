/**
 * Forward kinematics. Parts mount on these frames; the twin cannot pose
 * anything the axes cannot reach.
 */

import * as THREE from 'three';
import type { AxisId, AxisValues, FrameId } from './axes.ts';
import { CHAIN_Z_MM } from './units.ts';

const DEG = Math.PI / 180;

const F: Record<FrameId, THREE.Matrix4> = {
  base: new THREE.Matrix4(),
  C: new THREE.Matrix4(),
  Z: new THREE.Matrix4(),
  H: new THREE.Matrix4(),
  L: new THREE.Matrix4(),
  T: new THREE.Matrix4(),
  I: new THREE.Matrix4(),
};

const tmp = new THREE.Matrix4();

export function frames(v: AxisValues): Record<FrameId, THREE.Matrix4> {
  F.base.identity();
  F.C.makeRotationZ(v.C * DEG);

  F.Z.makeTranslation(0, 0, CHAIN_Z_MM - 28 - v.Z);

  // H is the X of the needle carrier. World station sits on +X.
  F.H.makeTranslation(v.H, 0, CHAIN_Z_MM);

  F.L.copy(F.H).multiply(tmp.makeRotationY(v.L * DEG));

  F.T.copy(F.H)
    .multiply(tmp.makeTranslation(18, -32, 26))
    .multiply(new THREE.Matrix4().makeRotationZ(v.T * DEG));

  F.I.copy(F.H)
    .multiply(tmp.makeTranslation(6, 22, 4))
    .multiply(new THREE.Matrix4().makeTranslation(0, v.I, 0));

  return F;
}

const _p = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();

export function decompose(m: THREE.Matrix4): { position: THREE.Vector3; quaternion: THREE.Quaternion } {
  m.decompose(_p, _q, _s);
  return { position: _p.clone(), quaternion: _q.clone() };
}

export function localMatrix(
  position: readonly [number, number, number],
  rotationDeg: readonly [number, number, number] = [0, 0, 0],
): THREE.Matrix4 {
  return new THREE.Matrix4()
    .makeRotationFromEuler(
      new THREE.Euler(rotationDeg[0] * DEG, rotationDeg[1] * DEG, rotationDeg[2] * DEG),
    )
    .setPosition(position[0], position[1], position[2]);
}

export type { FrameId };
