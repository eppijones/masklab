import { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';

import { PARTS, KIND_COLOR, type PartDef } from '../machine/parts.ts';
import { frames } from '../machine/kinematics.ts';
import { axesAt, addressOf, TOTAL } from '../machine/program.ts';
import { BLOCK_HEIGHT_MM, BLOCK_MAX_R_MM } from '../machine/units.ts';
import { buildWorkpiece, stitchGeometry } from './workpiece.ts';

// The machine is modelled Z-up in millimetres, like the CAD. Tell three the same.
THREE.Object3D.DEFAULT_UP = new THREE.Vector3(0, 0, 1);

const DEG = Math.PI / 180;

const geomCache = new Map<string, THREE.BufferGeometry>();
function geomFor(p: PartDef): THREE.BufferGeometry {
  let g = geomCache.get(p.id);
  if (!g) {
    g = p.build(p.dims);
    if (!g.getAttribute('normal')) g.computeVertexNormals();
    geomCache.set(p.id, g);
  }
  return g;
}

export interface TwinView {
  pos: number;
  explode: number;
  cutaway: boolean;
  labels: boolean;
  ghost: boolean;
  yarnPort: number;
  focus: string | null;
}

/** One part instance: rides its axis frame, offset by its local mount + explode vector. */
function PartMesh({
  part,
  view,
  local,
}: {
  part: PartDef;
  view: React.RefObject<TwinView>;
  local: { position: [number, number, number]; rotation?: [number, number, number] };
}) {
  const ref = useRef<THREE.Group>(null);
  const base = useMemo(() => {
    const e = new THREE.Euler(
      (local.rotation?.[0] ?? 0) * DEG,
      (local.rotation?.[1] ?? 0) * DEG,
      (local.rotation?.[2] ?? 0) * DEG,
    );
    return new THREE.Matrix4()
      .makeRotationFromEuler(e)
      .setPosition(local.position[0], local.position[1], local.position[2]);
  }, [local]);

  const tmp = useMemo(() => new THREE.Matrix4(), []);
  const ex = useMemo(() => new THREE.Matrix4(), []);
  const geom = geomFor(part);
  const color = KIND_COLOR[part.kind];

  useFrame(() => {
    const g = ref.current;
    const v = view.current;
    if (!g || !v) return;
    const f = frames(axesAt(v.pos, v.pos - Math.floor(v.pos), v.yarnPort));
    const d = part.explodeDir ?? [0, 0, 1];
    const k = v.explode * 90;
    ex.makeTranslation(d[0] * k, d[1] * k, d[2] * k);
    tmp.copy(f[part.mount.frame]).multiply(ex).multiply(base);
    g.matrix.copy(tmp);
    const dim = v.focus !== null && v.focus !== part.group;
    const mat = (g.children[0] as THREE.Mesh | undefined)?.material as
      | THREE.MeshStandardMaterial
      | undefined;
    if (mat) {
      const target = dim ? 0.12 : v.ghost && part.kind !== 'printed' ? 0.35 : 1;
      mat.opacity += (target - mat.opacity) * 0.2;
      mat.transparent = mat.opacity < 0.99;
    }
  });

  return (
    <group ref={ref} matrixAutoUpdate={false}>
      <mesh geometry={geom} castShadow={false}>
        <meshStandardMaterial
          color={color}
          roughness={part.kind === 'motor' ? 0.55 : part.kind === 'cots' ? 0.35 : 0.72}
          metalness={part.kind === 'cots' || part.kind === 'extrusion' ? 0.7 : 0.05}
          transparent
          opacity={1}
        />
      </mesh>
    </group>
  );
}

/** The hat itself, growing stitch by stitch on the former. */
function Workpiece({ view }: { view: React.RefObject<TwinView> }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geom = useMemo(() => stitchGeometry(), []);
  const data = useMemo(() => buildWorkpiece(), []);

  const init = useRef(false);
  useFrame(() => {
    const m = ref.current;
    const v = view.current;
    if (!m || !v) return;
    if (!init.current) {
      m.instanceMatrix.array.set(data.matrices);
      m.instanceMatrix.needsUpdate = true;
      const ca = (m.instanceColor ??= new THREE.InstancedBufferAttribute(
        new Float32Array(TOTAL * 3),
        3,
      ));
      ca.array.set(data.colors);
      ca.needsUpdate = true;
      init.current = true;
    }
    m.count = Math.max(1, Math.floor(v.pos));
    // the workpiece turns with the former
    m.rotation.z = axesAt(v.pos, 0, v.yarnPort).C * DEG;
  });

  return (
    <instancedMesh ref={ref} args={[geom, undefined, TOTAL]} frustumCulled={false}>
      <meshStandardMaterial roughness={0.92} metalness={0} vertexColors />
    </instancedMesh>
  );
}

function YarnStrand({ view }: { view: React.RefObject<TwinView> }) {
  const ref = useRef<THREE.Line>(null!);
  const geom = useMemo(() => new THREE.BufferGeometry().setFromPoints(Array.from({ length: 24 }, () => new THREE.Vector3())), []);
  const pts = useMemo(() => Array.from({ length: 24 }, () => new THREE.Vector3()), []);

  useFrame(() => {
    const v = view.current;
    if (!v) return;
    const av = axesAt(v.pos, v.pos - Math.floor(v.pos), v.yarnPort);
    const f = frames(av);
    const tip = new THREE.Vector3(-46, 0, 0).applyMatrix4(f.P);
    const eye = new THREE.Vector3(0, 0, 0).applyMatrix4(f.S);
    const cone = new THREE.Vector3(-160, 150, 110);
    const dancer = new THREE.Vector3(-150, 150, 250);
    const curve = new THREE.CatmullRomCurve3([cone, dancer, new THREE.Vector3(-40, 90, 300), eye, tip]);
    curve.getPoints(23).forEach((p, i) => pts[i].copy(p));
    geom.setFromPoints(pts);
  });

  return (
    // @ts-expect-error three's Line is a valid R3F intrinsic
    <line ref={ref} geometry={geom}>
      <lineBasicMaterial color="#BA0C2F" linewidth={2} />
    </line>
  );
}

function Lights() {
  return (
    <>
      <hemisphereLight args={['#fdfcf8', '#8f8b84', 1.05]} />
      <directionalLight position={[-340, -260, 460]} intensity={1.8} color="#fffdf6" />
      <directionalLight position={[300, 200, 180]} intensity={0.5} color="#dae2f0" />
      <directionalLight position={[0, -400, -120]} intensity={0.3} color="#f4efe6" />
    </>
  );
}

function Ground() {
  return (
    <mesh position={[0, 0, -24]} receiveShadow={false}>
      <circleGeometry args={[430, 64]} />
      <meshStandardMaterial color="#E2DACA" roughness={1} />
    </mesh>
  );
}

const LABELS: { group: PartDef['group']; text: string; at: [number, number, number] }[] = [
  { group: 'former', text: 'Hatteblokk — the datum the fabric cannot supply', at: [0, 0, 40] },
  { group: 'head', text: 'Maskehode — latch needle · presenter · 4-garns velger', at: [175, -60, 110] },
  { group: 'station', text: 'Z / R / B — følger blokkprofilen', at: [250, 60, 250] },
  { group: 'yarn', text: 'Garnvei — danser, drevet mating, garnlengdemåling', at: [0, -318, 330] },
  { group: 'sensing', text: 'Kamera — én kontroll per runde, ikke per maske', at: [120, 0, 452] },
  { group: 'control', text: 'Styring — Pi + Klipper + 8× TMC2209', at: [-110, 292, 70] },
];

function Rig({ view }: { view: React.RefObject<TwinView> }) {
  const { gl } = useThree();
  gl.localClippingEnabled = true;
  return null;
}

export function MachineTwin({ view, labelsOn = true }: { view: React.RefObject<TwinView>; labelsOn?: boolean }) {
  const [ready, setReady] = useState(false);
  const parts = useMemo(() => {
    const out: { part: PartDef; local: { position: [number, number, number]; rotation?: [number, number, number] }; key: string }[] = [];
    for (const p of PARTS) {
      out.push({ part: p, local: { position: p.mount.position, rotation: p.mount.rotation }, key: p.id });
      p.repeats?.forEach((r, i) =>
        out.push({ part: p, local: { position: r.position, rotation: r.rotation }, key: `${p.id}-${i}` }),
      );
    }
    return out;
  }, []);

  return (
    <Canvas
      dpr={[1, 1.75]}
      onCreated={() => setReady(true)}
      camera={{ fov: 30, near: 10, far: 6000, position: [1080, -1420, 900], up: [0, 0, 1] }}
      gl={{ antialias: true, alpha: false, toneMapping: THREE.NeutralToneMapping }}
    >
      <color attach="background" args={['#EDE7DA']} />
      <fog attach="fog" args={['#EDE7DA', 1100, 2600]} />
      <Rig view={view} />
      <Lights />
      <Ground />
      {parts.map((x) => (
        <PartMesh key={x.key} part={x.part} view={view} local={x.local} />
      ))}
      <Workpiece view={view} />
      <YarnStrand view={view} />
      {ready &&
        labelsOn &&
        LABELS.map((l) => (
          <Html key={l.text} position={l.at} center zIndexRange={[6, 0]} occlude={false}>
            <div className="iv-label" data-group={l.group}>
              {l.text}
            </div>
          </Html>
        ))}
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        target={[0, 0, BLOCK_HEIGHT_MM * 0.5 + 60]}
        minDistance={180}
        maxDistance={3200}
      />
    </Canvas>
  );
}

export { BLOCK_MAX_R_MM, addressOf };
