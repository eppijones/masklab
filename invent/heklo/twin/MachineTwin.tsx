import { useMemo, useRef, type ReactNode, type RefObject } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { KIND_COLOR, PARTS, type PartDef } from '../cad/parts.ts';
import { frames, localMatrix } from '../engine/kinematics.ts';
import { axesAt, type Program } from '../engine/program.ts';
import { GateRing, GrowingHat } from './GrowingHat.tsx';

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
}

let mountedProg: Program | null = null;

function PartMesh({
  part,
  view,
  local,
}: {
  part: PartDef;
  view: RefObject<TwinView>;
  local: { position: [number, number, number]; rotation?: [number, number, number] };
}) {
  const ref = useRef<THREE.Group>(null);
  const base = useMemo(
    () => localMatrix(local.position, local.rotation ?? [0, 0, 0]),
    [local],
  );
  const tmp = useMemo(() => new THREE.Matrix4(), []);
  const ex = useMemo(() => new THREE.Matrix4(), []);
  const geom = geomFor(part);
  const color = KIND_COLOR[part.kind];

  useFrame(() => {
    const g = ref.current;
    const v = view.current;
    if (!g || !v) return;
    const f = frames(axesAt(mountedProg!, v.pos));
    const d = part.explodeDir ?? [0, 0, 1];
    const k = v.explode * 85;
    ex.makeTranslation(d[0] * k, d[1] * k, d[2] * k);
    tmp.copy(f[part.mount.frame]).multiply(ex).multiply(base);
    g.matrix.copy(tmp);
  });

  return (
    <group ref={ref} matrixAutoUpdate={false}>
      <mesh geometry={geom} castShadow={false}>
        <meshStandardMaterial
          color={color}
          roughness={part.kind === 'motor' ? 0.5 : part.kind === 'cots' ? 0.32 : 0.7}
          metalness={part.kind === 'cots' || part.kind === 'extrusion' ? 0.65 : 0.04}
        />
      </mesh>
    </group>
  );
}

function MachineParts({ view, prog }: { view: RefObject<TwinView>; prog: Program }) {
  mountedProg = prog;
const nodes: ReactNode[] = [];
  for (const part of PARTS) {
    const locals = [
      { position: part.mount.position, rotation: part.mount.rotation },
      ...(part.repeats ?? []),
    ];
    locals.forEach((local, i) => {
      nodes.push(
        <PartMesh
          key={`${part.id}-${i}`}
          part={part}
          view={view}
          local={{
            position: local.position,
            rotation: local.rotation,
          }}
        />,
      );
    });
  }
  return <>{nodes}</>;
}

function YarnCones({ prog }: { prog: Program }) {
  const stands: [number, number][] = [
    [80, -210],
    [30, -230],
    [-20, -230],
    [-70, -210],
  ];
  return (
    <group>
      {prog.hat.palette.slice(0, 4).map((c, i) => (
        <mesh key={c.id} position={[stands[i][0], stands[i][1], 78]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[16, 10, 64, 16]} />
          <meshStandardMaterial color={c.hex} roughness={0.85} />
        </mesh>
      ))}
    </group>
  );
}

function Lights() {
  return (
    <>
      <hemisphereLight args={['#fff4e0', '#1a1814', 0.55]} />
      <directionalLight position={[180, -220, 320]} intensity={1.15} />
      <directionalLight position={[-160, 120, 180]} intensity={0.35} color="#9ad4d2" />
    </>
  );
}

function Floor() {
  return (
    <mesh position={[0, 0, -18]} rotation={[0, 0, 0]}>
      <circleGeometry args={[420, 64]} />
      <meshStandardMaterial color="#1c1a16" roughness={0.9} />
    </mesh>
  );
}

function Cutaway({ view }: { view: RefObject<TwinView> }) {
  const clip = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 8), []);
  useFrame(({ gl }) => {
    if (view.current.cutaway) {
      gl.clippingPlanes = [clip];
      gl.localClippingEnabled = true;
    } else {
      gl.clippingPlanes = [];
      gl.localClippingEnabled = false;
    }
  });
  return null;
}

export function MachineCanvas({
  prog,
  view,
  className,
}: {
  prog: Program;
  view: RefObject<TwinView>;
  className?: string;
}) {
  const posRef = view;
  return (
    <Canvas
      className={className}
      dpr={[1, 1.6]}
      gl={{ antialias: true }}
      camera={{ position: [280, -420, 260], fov: 40, near: 2, far: 4000, up: [0, 0, 1] }}
      onCreated={({ camera, gl }) => {
        camera.up.set(0, 0, 1);
        camera.lookAt(0, 0, 140);
        gl.localClippingEnabled = true;
      }}
    >
      <color attach="background" args={['#161410']} />
      <Lights />
      <Floor />
      <Cutaway view={view} />
      <MachineParts view={view} prog={prog} />
      <YarnCones prog={prog} />
      <group>
        {/* hat + gates ride C — applied each frame via a small wrapper */}
        <CFollower view={view} prog={prog}>
          <GrowingHat prog={prog} posRef={posRef} />
          <GateRing prog={prog} posRef={posRef} />
        </CFollower>
      </group>
      <OrbitControls makeDefault enableDamping dampingFactor={0.08} target={[0, 0, 140]} />
    </Canvas>
  );
}

function CFollower({
  view,
  prog,
  children,
}: {
  view: RefObject<TwinView>;
  prog: Program;
  children: ReactNode;
}) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    const g = ref.current;
    if (!g) return;
    const a = axesAt(prog, view.current.pos);
    g.rotation.z = (a.C * DEG);
  });
  return <group ref={ref}>{children}</group>;
}

export function ExplodeCanvas({
  prog,
  explode,
}: {
  prog: Program;
  explode: number;
}) {
  const view = useRef<TwinView>({ pos: 40, explode, cutaway: false, labels: true });
  view.current.explode = explode;
  return <MachineCanvas prog={prog} view={view} />;
}
