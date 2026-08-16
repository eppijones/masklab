import { useMemo, type RefObject } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { chainRadius, CHAIN_Z_MM, STITCH_H_MM, stitchTheta } from '../engine/units.ts';
import type { Program } from '../engine/program.ts';
import { opAt } from '../engine/program.ts';
import type { HatSnap } from '../engine/hats.ts';

const MAX = 4200;
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3(1, 1, 1);
const _c = new THREE.Color();

interface Packed {
  n: number;
  round: Uint16Array;
  i: Uint16Array;
  count: Uint16Array;
  color: Float32Array;
}

function pack(hat: HatSnap): Packed {
  const n = hat.totalStitches;
  const round = new Uint16Array(n);
  const i = new Uint16Array(n);
  const count = new Uint16Array(n);
  const color = new Float32Array(n * 3);
  let k = 0;
  for (const r of hat.rounds) {
    for (let s = 0; s < r.count; s++) {
      round[k] = r.num;
      i[k] = s;
      count[k] = r.count;
      _c.set(hat.palette[r.colors[s]]?.hex ?? '#ccc');
      color[k * 3] = _c.r;
      color[k * 3 + 1] = _c.g;
      color[k * 3 + 2] = _c.b;
      k++;
    }
  }
  return { n, round, i, count, color };
}

function stitchGeom(): THREE.BufferGeometry {
  const g = new THREE.TorusGeometry(2.15, 1.05, 5, 10);
  g.rotateX(Math.PI / 2);
  return g;
}

export function GrowingHat({
  prog,
  posRef,
}: {
  prog: Program;
  posRef: RefObject<{ pos: number }>;
}) {
  const packed = useMemo(() => pack(prog.hat), [prog.hat]);
  const geom = useMemo(() => stitchGeom(), []);
  const mesh = useMemo(() => {
    const m = new THREE.InstancedMesh(
      geom,
      new THREE.MeshStandardMaterial({ roughness: 0.72, metalness: 0.04 }),
      MAX,
    );
    m.frustumCulled = false;
    m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 3), 3);
    m.instanceColor.array.set(packed.color);
    m.instanceColor.needsUpdate = true;
    return m;
  }, [geom, packed]);

  const last = { fabric: -1, round: -1 };

  useFrame(() => {
    const pos = posRef.current.pos;
    const { op } = opAt(prog, pos);
    const fabric = Math.min(packed.n, op.fabric);
    const working = Math.max(1, op.round);
    if (fabric === last.fabric && working === last.round) return;
    last.fabric = fabric;
    last.round = working;

    for (let k = 0; k < fabric; k++) {
      const cnt = packed.count[k];
      const r = chainRadius(cnt);
      const th = stitchTheta(packed.i[k], cnt);
      const hang = (working - packed.round[k]) * STITCH_H_MM;
      _p.set(Math.cos(th) * r, Math.sin(th) * r, -Math.max(0, hang));
      _q.setFromAxisAngle(new THREE.Vector3(0, 0, 1), th);
      _s.set(1, 1, 1);
      _m.compose(_p, _q, _s);
      mesh.setMatrixAt(k, _m);
    }
    mesh.count = fabric;
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <group position={[0, 0, CHAIN_Z_MM]}>
      <primitive object={mesh} />
    </group>
  );
}

export function GateRing({
  prog,
  posRef,
}: {
  prog: Program;
  posRef: RefObject<{ pos: number }>;
}) {
  const geom = useMemo(() => {
    const g = new THREE.BoxGeometry(5.2, 6.4, 8.8);
    return g;
  }, []);
  const mesh = useMemo(() => {
    const m = new THREE.InstancedMesh(
      geom,
      new THREE.MeshStandardMaterial({
        color: '#0F8F8C',
        roughness: 0.45,
        metalness: 0.15,
      }),
      160,
    );
    m.frustumCulled = false;
    return m;
  }, [geom]);

  useFrame(() => {
    const { op } = opAt(prog, posRef.current.pos);
    const n = op.gates;
    const r = chainRadius(n);
    for (let s = 0; s < n; s++) {
      const th = (s / n) * Math.PI * 2;
      _p.set(Math.cos(th) * r, Math.sin(th) * r, CHAIN_Z_MM);
      _q.setFromAxisAngle(new THREE.Vector3(0, 0, 1), th);
      _m.compose(_p, _q, _s.set(1, 1, 1));
      mesh.setMatrixAt(s, _m);
    }
    mesh.count = n;
    mesh.instanceMatrix.needsUpdate = true;
  });

  return <primitive object={mesh} />;
}
