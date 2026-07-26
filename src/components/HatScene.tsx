import { useLayoutEffect, useMemo, useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Billboard, Html } from '@react-three/drei';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { useApp, getModel, computeVisible } from '../store';
import {
  buildProfile,
  buildStitchTransforms,
  makeStitchGeometry,
  makeGhostGeometry,
  stitchTheta,
} from '../lib/hatGeometry';
import { targetHole } from '../data/pattern';
import { YARN_HEX, YARN_NAME } from '../data/types';
import type { DeviceClass } from '../lib/device';

const BG = '#EDE7DA';

const COLORS = {
  white: new THREE.Color(YARN_HEX.white),
  red: new THREE.Color(YARN_HEX.red),
  blue: new THREE.Color(YARN_HEX.blue),
};

/** Objects the HTML labels raycast against to fade out behind the hat. */
type Occluder = React.RefObject<THREE.Object3D>[];

/**
 * A crisp HTML label anchored to a 3D point (the "CSS2D" pattern from the
 * design note): real HTML over the canvas, always sharp, same Karla font
 * as the rest of the UI, hidden when the anchor is behind the hat.
 */
function Label3D({
  position,
  occlude,
  children,
}: {
  position: [number, number, number];
  occlude: Occluder;
  children: React.ReactNode;
}) {
  return (
    <Html
      position={position}
      center
      occlude={occlude}
      wrapperClass="l3d-wrap"
      zIndexRange={[3, 0]}
    >
      {children}
    </Html>
  );
}

/**
 * Stitch numbers (toggled with the "Maskenummer" button). Per the design
 * note we mark LESS: only the ~7 stitches around the insertion point in
 * the previous round get a number chip, anchored at the V you insert
 * into. The target chip takes the colour of the yarn you are about to
 * crochet with, so the number itself tells you which colour to use.
 */
function StitchNumberLabels({
  transforms,
  shown,
  curRound,
  stitchStepping,
  occlude,
}: {
  transforms: { position: THREE.Vector3; quaternion: THREE.Quaternion }[];
  shown: number;
  curRound: number | null;
  stitchStepping: boolean;
  occlude: Occluder;
}) {
  const showNumbers = useApp((s) => s.showNumbers);
  const model = getModel();
  if (!showNumbers || !stitchStepping || curRound === null || curRound === 0) return null;

  const before = model.cumCounts[curRound - 1];
  const roundEnd = model.cumCounts[curRound];
  if (shown >= roundEnd) return null;

  const prevStart = curRound > 1 ? model.cumCounts[curRound - 2] : 0;
  const P = model.rounds[curRound - 1].count;
  const hole = Math.max(0, Math.min(targetHole(model.stitches, before, shown), P - 1));
  const nextColor = model.stitches[shown].color;

  const items: React.ReactNode[] = [];
  for (let d = -3; d <= 3; d++) {
    const i = (((hole + d) % P) + P) % P;
    const t = transforms[prevStart + i];
    // Anchor at the V where the hook goes in: the edge between this stitch
    // and the round being made (local -y), pushed slightly outward so the
    // chip doesn't sink into the yarn.
    const v = t.position
      .clone()
      .add(new THREE.Vector3(0, 1, 0).applyQuaternion(t.quaternion).multiplyScalar(-0.45));
    const radial = Math.hypot(v.x, v.z) || 1;
    const pos: [number, number, number] = [
      v.x + (v.x / radial) * 0.45,
      v.y,
      v.z + (v.z / radial) * 0.45,
    ];
    items.push(
      <Label3D key={i} position={pos} occlude={occlude}>
        <span
          className={`num-chip ${d === 0 ? 'target' : ''}`}
          style={
            d === 0
              ? {
                  background: YARN_HEX[nextColor],
                  color: nextColor === 'white' ? '#201D18' : '#FDFAF3',
                }
              : undefined
          }
        >
          {i + 1}
        </span>
      </Label3D>,
    );
  }
  return <group>{items}</group>;
}

/**
 * Translucent preview of the stitches you are ABOUT to make: from the next
 * stitch up to and including the next colour change (or the end of the
 * round). Makes "til fargebytte" visible directly on the hat.
 */
function UpcomingPreview({
  transforms,
  shown,
  curRound,
  stitchStepping,
}: {
  transforms: { position: THREE.Vector3; quaternion: THREE.Quaternion }[];
  shown: number;
  curRound: number | null;
  stitchStepping: boolean;
}) {
  const model = getModel();
  const geo = useMemo(() => makeStitchGeometry(), []);
  const meshRef = useRef<THREE.InstancedMesh>(null!);

  const MAX_PREVIEW = 140;

  let count = 0;
  let start = 0;
  if (stitchStepping && curRound !== null) {
    const roundEnd = model.cumCounts[curRound];
    if (shown < roundEnd) {
      start = shown;
      let end = roundEnd;
      for (let i = shown; i < roundEnd; i++) {
        if (model.stitches[i].changeColorAfter) {
          end = i + 1;
          break;
        }
      }
      count = Math.min(end - start, MAX_PREVIEW);
    }
  }

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    const scale = new THREE.Vector3(0.92, 0.92, 0.92);
    for (let j = 0; j < count; j++) {
      const t = transforms[start + j];
      m.compose(t.position, t.quaternion, scale);
      mesh.setMatrixAt(j, m);
      mesh.setColorAt(j, COLORS[model.stitches[start + j].color]);
    }
    mesh.count = count;
    if (count > 0) {
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  }, [start, count, transforms, model]);

  return (
    <instancedMesh ref={meshRef} args={[geo, undefined, MAX_PREVIEW]} frustumCulled={false}>
      <meshStandardMaterial roughness={0.9} transparent opacity={0.32} depthWrite={false} />
    </instancedMesh>
  );
}

/**
 * The physical stitch markers (plastic clips) rendered in 3D: a pink clip in
 * the round's first stitch and a green clip in every 10th made stitch —
 * mirroring exactly where they should hang on the real work. Toggleable.
 */
const MARKER_GREEN = '#2FBF56';
const MARKER_PINK = '#F27BA6';

function MarkerClip({
  position,
  color,
  label,
  hangDir,
  occlude,
}: {
  position: THREE.Vector3;
  color: string;
  label: string;
  hangDir: number;
  occlude: Occluder;
}) {
  // The clip sits IN the V on top of the stitch — exactly where you clip the
  // real marker — with the clasp reaching down into the V.
  const radial = Math.hypot(position.x, position.z) || 1;
  const out = { x: position.x / radial, z: position.z / radial };
  const px = position.x + out.x * 0.3;
  const pz = position.z + out.z * 0.3;
  const py = position.y + hangDir * 0.62;
  return (
    <group>
      <Billboard position={[px, py, pz]}>
        {/* the loop */}
        <mesh>
          <torusGeometry args={[0.3, 0.085, 8, 24]} />
          <meshStandardMaterial color={color} roughness={0.35} />
        </mesh>
        {/* the clasp, pointing down into the V of the stitch */}
        <mesh position={[0, hangDir * -0.3, 0]}>
          <sphereGeometry args={[0.13, 10, 10]} />
          <meshStandardMaterial color={color} roughness={0.35} />
        </mesh>
      </Billboard>
      <Label3D position={[px, py + hangDir * 1.0, pz]} occlude={occlude}>
        <span className="clip-chip">
          <span className="l3d-dot" style={{ background: color }} />
          {label}
        </span>
      </Label3D>
    </group>
  );
}

function MarkerClips({
  transforms,
  shown,
  curRound,
  flipped,
  occlude,
}: {
  transforms: { position: THREE.Vector3 }[];
  shown: number;
  curRound: number | null;
  flipped: boolean;
  occlude: Occluder;
}) {
  const showMarkers = useApp((s) => s.showMarkers);
  const model = getModel();
  if (!showMarkers || curRound === null) return null;

  const before = curRound > 0 ? model.cumCounts[curRound - 1] : 0;
  const made = Math.min(shown, model.cumCounts[curRound]) - before;
  if (made <= 0) return null;

  // The clip sits in the TOP V of the stitch. The group is flipped in
  // working view, so local "up" must flip too.
  const hangDir = flipped ? -1 : 1;

  const clips: React.ReactNode[] = [
    <MarkerClip
      key="start"
      position={transforms[before].position}
      color={MARKER_PINK}
      label="START"
      hangDir={hangDir}
      occlude={occlude}
    />,
  ];
  for (let i = 10; i <= made; i += 10) {
    clips.push(
      <MarkerClip
        key={i}
        position={transforms[before + i - 1].position}
        color={MARKER_GREEN}
        label={String(i)}
        hangDir={hangDir}
        occlude={occlude}
      />,
    );
  }
  return <group>{clips}</group>;
}

/**
 * "Stikk inn her"-marker: highlights the exact stitch in the PREVIOUS round
 * that the next stitch goes INTO — a teal ring around the target V plus an
 * arrow pointing at it. Follows the counter stitch by stitch.
 */
const INSERT_COLOR = '#0FA8A3';

function InsertTargetMarker({
  transforms,
  shown,
  curRound,
  stitchStepping,
  flipped,
  occlude,
}: {
  transforms: { position: THREE.Vector3; quaternion: THREE.Quaternion }[];
  shown: number;
  curRound: number | null;
  stitchStepping: boolean;
  flipped: boolean;
  occlude: Occluder;
}) {
  const model = getModel();
  const ringRef = useRef<THREE.Mesh>(null!);
  const arrowRef = useRef<THREE.Mesh>(null!);

  let targetIdx: number | null = null;
  if (stitchStepping && curRound !== null && curRound > 0) {
    const before = model.cumCounts[curRound - 1];
    const roundEnd = model.cumCounts[curRound];
    if (shown < roundEnd) {
      const prevRound = model.rounds[curRound - 1];
      const prevStart = curRound > 1 ? model.cumCounts[curRound - 2] : 0;
      const P = prevRound.count;
      const hole = targetHole(model.stitches, before, shown);
      targetIdx = prevStart + Math.max(0, Math.min(hole, P - 1));
    }
  }

  // You insert the hook under the V of the target stitch — on the edge
  // BETWEEN the previous round and the round you are making. The stitch's
  // local +y points towards the crown (its own previous round), so the
  // insertion edge is at local -y. Anchoring the ring/arrow there keeps it
  // from reading one row too low.
  const vPosOf = (t: { position: THREE.Vector3; quaternion: THREE.Quaternion }) =>
    t.position
      .clone()
      .add(new THREE.Vector3(0, 1, 0).applyQuaternion(t.quaternion).multiplyScalar(-0.45));

  useFrame(({ clock }) => {
    const ring = ringRef.current;
    const arrow = arrowRef.current;
    if (!ring || !arrow) return;
    if (targetIdx === null) {
      ring.visible = false;
      arrow.visible = false;
      return;
    }
    const t = transforms[targetIdx];
    const vPos = vPosOf(t);
    ring.visible = true;
    arrow.visible = true;
    ring.position.copy(vPos);
    ring.quaternion.copy(t.quaternion);
    const pulse = 1 + 0.1 * Math.sin(clock.elapsedTime * 5);
    ring.scale.setScalar(pulse);
    // Arrow hovers outside/above the target V and points straight at it.
    const radial = Math.hypot(vPos.x, vPos.z) || 1;
    const out = new THREE.Vector3(vPos.x / radial, 0, vPos.z / radial);
    const bob = 0.15 * Math.sin(clock.elapsedTime * 5);
    const tip = vPos.clone().addScaledVector(out, 0.8);
    tip.y += 1.0 + bob;
    arrow.position.copy(tip);
    const dir = vPos.clone().sub(tip).normalize();
    arrow.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  });

  // Label sits BELOW the target ring (the fargebytte label lives above the
  // edge, so this keeps the two from overlapping when they share a stitch).
  const labelPos: [number, number, number] =
    targetIdx !== null
      ? (() => {
          const v = vPosOf(transforms[targetIdx]);
          return [v.x * 1.08, v.y + (flipped ? 1.15 : -1.15), v.z * 1.08];
        })()
      : [0, 0, 0];

  return (
    <group>
      <mesh ref={ringRef} visible={false}>
        <torusGeometry args={[0.72, 0.085, 10, 40]} />
        <meshStandardMaterial
          color={INSERT_COLOR}
          emissive={INSERT_COLOR}
          emissiveIntensity={1.1}
          transparent
          opacity={0.95}
          depthWrite={false}
        />
      </mesh>
      <mesh ref={arrowRef} visible={false}>
        <coneGeometry args={[0.28, 0.85, 14]} />
        <meshStandardMaterial
          color={INSERT_COLOR}
          emissive={INSERT_COLOR}
          emissiveIntensity={1.2}
        />
      </mesh>
      {targetIdx !== null && (
        <Label3D position={labelPos} occlude={occlude}>
          <span className="label3d lead-up">
            <span className="l3d-dot" style={{ background: INSERT_COLOR }} />
            STIKK INN HER
          </span>
        </Label3D>
      )}
    </group>
  );
}

function Hat({ preview = false }: { preview?: boolean }) {
  const stepIndex = useApp((s) => s.stepIndex);
  const stitchCursor = useApp((s) => s.stitchCursor);
  const showFinished = useApp((s) => s.showFinished);
  const viewMode = useApp((s) => s.viewMode);

  const model = useMemo(() => getModel(), []);
  const profile = useMemo(() => buildProfile(model.rounds), [model]);
  // With the physical working direction fixed (18 July), the working view is
  // ONLY the upside-down flip — no mirroring. The flip alone reproduces
  // exactly what you see in your hands: text upside down, work advancing
  // to the left.
  const transforms = useMemo(
    () => buildStitchTransforms(model.rounds, model.stitches, profile),
    [model, profile],
  );
  const stitchGeo = useMemo(() => makeStitchGeometry(), []);
  const ghostGeo = useMemo(() => makeGhostGeometry(profile), [profile]);

  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const total = model.stitches.length;

  const step = model.steps[stepIndex];
  const finale =
    preview ||
    showFinished ||
    step?.kind === 'finish' ||
    step?.kind === 'done';
  const visible = computeVisible(model, stepIndex, stitchCursor, finale);
  const shown = visible.shownStitches;

  // Reveal animation bookkeeping
  const revealRef = useRef({ from: 0, to: 0, t0: 0 });
  const prevShownRef = useRef(0);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    const m = new THREE.Matrix4();
    for (let i = 0; i < total; i++) {
      const t = transforms[i];
      m.compose(t.position, t.quaternion, new THREE.Vector3(1, 1, 1));
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, COLORS[model.stitches[i].color]);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [model, transforms, total]);

  useEffect(() => {
    const prev = prevShownRef.current;
    if (shown > prev) {
      revealRef.current = { from: prev, to: shown, t0: performance.now() };
    }
    prevShownRef.current = shown;
  }, [shown]);

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    mesh.count = shown;
    const rev = revealRef.current;
    if (rev.to > rev.from) {
      const k = Math.min(1, (performance.now() - rev.t0) / 420);
      const e = 1 - Math.pow(1 - k, 3);
      const s = 0.35 + 0.65 * e;
      const m = new THREE.Matrix4();
      const scale = new THREE.Vector3(s, s, s);
      for (let i = rev.from; i < rev.to && i < total; i++) {
        const t = transforms[i];
        m.compose(t.position, t.quaternion, scale);
        mesh.setMatrixAt(i, m);
      }
      mesh.instanceMatrix.needsUpdate = true;
      if (k >= 1) rev.from = rev.to;
    }
  });

  // Highlight ring for the current round
  const ringRef = useRef<THREE.Mesh>(null!);
  const ringMat = useRef<THREE.MeshStandardMaterial>(null!);
  const curRound = visible.currentRoundIdx;

  useFrame(({ clock }) => {
    const ring = ringRef.current;
    if (!ring) return;
    if (curRound === null) {
      ring.visible = false;
      return;
    }
    ring.visible = true;
    const p = profile[curRound];
    ring.position.y = p.y - 0.18;
    const rr = p.r + 0.55;
    ring.scale.set(rr, rr, 1);
    const pulse = 0.5 + 0.5 * Math.sin(clock.elapsedTime * 3.2);
    if (ringMat.current) ringMat.current.opacity = 0.14 + 0.18 * pulse;
  });

  // Marker for the NEXT stitch when stepping through a patterned round
  const markerRef = useRef<THREE.Mesh>(null!);
  const markerMat = useRef<THREE.MeshStandardMaterial>(null!);
  useFrame(({ clock }) => {
    const marker = markerRef.current;
    if (!marker) return;
    if (!visible.stitchStepping || shown >= total) {
      marker.visible = false;
      return;
    }
    const round = curRound !== null ? model.rounds[curRound] : null;
    const before = curRound !== null && curRound > 0 ? model.cumCounts[curRound - 1] : 0;
    if (!round || shown - before >= round.count) {
      marker.visible = false;
      return;
    }
    marker.visible = true;
    const t = transforms[shown];
    marker.position.copy(t.position);
    const pulse = 0.85 + 0.25 * Math.sin(clock.elapsedTime * 5);
    marker.scale.setScalar(pulse);
    // Marker takes the colour of the stitch you are about to make.
    if (markerMat.current) {
      const col = COLORS[model.stitches[shown].color];
      markerMat.current.color.copy(col);
      markerMat.current.emissive.copy(col);
    }
  });

  // The stitch where the NEXT colour change happens (computed per render —
  // cheap, and the component re-renders whenever the cursor moves).
  const roundEndIdx = curRound !== null ? model.cumCounts[curRound] : 0;
  let changeIdx: number | null = null;
  if (visible.stitchStepping && curRound !== null && shown < roundEndIdx) {
    for (let i = shown; i < roundEndIdx; i++) {
      if (model.stitches[i].changeColorAfter) {
        changeIdx = i;
        break;
      }
    }
  }
  const changeStitch = changeIdx !== null ? model.stitches[changeIdx] : null;
  const changeIsNext = changeIdx !== null && changeIdx === shown;

  const crownY = profile[0].y;

  // "Sy-visning": flip the whole hat upside down — the way it actually sits
  // in your hands / on the table while you crochet (a bowl growing upwards).
  // Finale / landing / preview always show the worn hat upright.
  const flipped = !finale && viewMode === 'working';
  const flipH = profile[0].y + profile[profile.length - 1].y;

  // Invisible full-hat silhouette that the HTML labels raycast against, so
  // text anchored on the far side fades out instead of shining through.
  const occluderRef = useRef<THREE.Mesh>(null!);
  const occluder = useMemo<Occluder>(() => [occluderRef], []);

  return (
    <group
      rotation={flipped ? [0, 0, Math.PI] : [0, 0, 0]}
      position={flipped ? [0, flipH, 0] : [0, 0, 0]}
    >
      <mesh ref={occluderRef} geometry={ghostGeo}>
        <meshBasicMaterial colorWrite={false} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <instancedMesh
        ref={meshRef}
        args={[stitchGeo, undefined, total]}
        frustumCulled={false}
      >
        <meshStandardMaterial roughness={0.94} metalness={0} vertexColors={false} />
      </instancedMesh>

      {/* small fabric plug closing the very centre of the crown (luftmaske 1) */}
      <mesh position={[0, crownY - 0.12, 0]} scale={[1.1, 0.36, 1.1]} visible={shown > 0}>
        <sphereGeometry args={[1, 32, 16]} />
        <meshStandardMaterial color={YARN_HEX.white} roughness={0.95} />
      </mesh>

      <StitchNumberLabels
        transforms={transforms}
        shown={shown}
        curRound={curRound}
        stitchStepping={visible.stitchStepping}
        occlude={occluder}
      />
      <UpcomingPreview
        transforms={transforms}
        shown={shown}
        curRound={curRound}
        stitchStepping={visible.stitchStepping}
      />
      <InsertTargetMarker
        transforms={transforms}
        shown={shown}
        curRound={curRound}
        stitchStepping={visible.stitchStepping}
        flipped={flipped}
        occlude={occluder}
      />
      <MarkerClips
        transforms={transforms}
        shown={shown}
        curRound={curRound}
        flipped={flipped}
        occlude={occluder}
      />

      {/* Flag on the exact stitch where the next colour change happens */}
      {changeIdx !== null && changeStitch?.changeColorAfter && (
        <group>
          <mesh position={transforms[changeIdx].position}>
            <sphereGeometry args={[0.62, 18, 18]} />
            <meshStandardMaterial
              color={YARN_HEX[changeStitch.changeColorAfter]}
              emissive={YARN_HEX[changeStitch.changeColorAfter]}
              emissiveIntensity={changeIsNext ? 1.4 : 0.7}
              transparent
              opacity={changeIsNext ? 0.95 : 0.55}
            />
          </mesh>
          <Label3D
            position={[
              transforms[changeIdx].position.x * 1.12,
              transforms[changeIdx].position.y + (flipped ? -1.6 : 1.6),
              transforms[changeIdx].position.z * 1.12,
            ]}
            occlude={occluder}
          >
            <span className={`label3d lead-down ${changeIsNext ? 'big pulse' : ''}`}>
              <span
                className="l3d-dot"
                style={{ background: YARN_HEX[changeStitch.changeColorAfter] }}
              />
              {changeIsNext ? (
                <>FARGEBYTTE · {YARN_NAME[changeStitch.changeColorAfter].toUpperCase()}</>
              ) : (
                <>fargebytte om {changeIdx - shown + 1}</>
              )}
            </span>
          </Label3D>
        </group>
      )}

      {/* ghost silhouette of the finished hat */}
      <mesh geometry={ghostGeo} visible={shown < total}>
        <meshBasicMaterial
          color="#9A8F79"
          transparent
          opacity={0.09}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1, 0.035, 10, 90]} />
        <meshStandardMaterial
          ref={ringMat}
          color="#BA0C2F"
          emissive="#BA0C2F"
          emissiveIntensity={0.8}
          transparent
          opacity={0.3}
          depthWrite={false}
        />
      </mesh>

      <mesh ref={markerRef} visible={false}>
        <sphereGeometry args={[0.55, 18, 18]} />
        <meshStandardMaterial
          ref={markerMat}
          color="#00205B"
          emissive="#3B63C4"
          emissiveIntensity={0.9}
          transparent
          opacity={0.85}
        />
      </mesh>
    </group>
  );
}

/** Brim rounds flare nearly flat — camera must look from above to see stitches face-on. */
function isBrimPhase(phase: string): boolean {
  return phase === 'brim-inc' || phase === 'wave' || phase === 'brim';
}

/** Smoothly flies the camera to a preset per phase; user drag cancels the tween. */
function CameraDirector({
  controls,
  preview,
  device = 'desktop',
}: {
  controls: React.RefObject<OrbitControlsImpl | null>;
  preview?: boolean;
  device?: DeviceClass;
}) {
  const stepIndex = useApp((s) => s.stepIndex);
  const viewMode = useApp((s) => s.viewMode);
  const stitchCursor = useApp((s) => s.stitchCursor);
  const showFinished = useApp((s) => s.showFinished);
  const autoRotate = useApp((s) => s.autoRotate);
  const { camera } = useThree();
  const goal = useRef(new THREE.Vector3());
  const goalTarget = useRef(new THREE.Vector3(0, 9, 0));
  const active = useRef(false);
  const lastPresetKey = useRef('');
  /**
   * Phone: pull back so surrounding stitches stay readable (IMG_5282 framing).
   * Values scale camera distance — higher = further away.
   */
  const close = device === 'phone' ? 1.18 : device === 'tablet' ? 0.95 : 1;

  useEffect(() => {
    const model = getModel();
    const step = model.steps[stepIndex];
    const celebrate =
      showFinished || step?.kind === 'finish' || step?.kind === 'done';

    // Endless snurring owns the camera orbit — don't fight it with tweens.
    // For the finale, snap once to a flattering finished-hat overview first.
    if (autoRotate || preview) {
      if (celebrate && !preview) {
        camera.position.set(44 * close, 26 * close, 52 * close);
        const c = controls.current;
        if (c) {
          c.target.set(0, 9, 0);
          c.update();
        }
      }
      active.current = false;
      return;
    }
    const profile = buildProfile(model.rounds);
    const topY = profile[0].y;
    if (!step) return;
    // Every +1 re-aims the camera to the standard front view of the next
    // stitch (manual drag still overrides until the next +1).
    const presetKey = `${stepIndex}|${viewMode}|${stitchCursor ?? 'x'}|${showFinished}|${device}`;
    if (viewMode !== 'working' && presetKey === lastPresetKey.current) return;
    lastPresetKey.current = presetKey;
    if (showFinished) {
      // "Ferdig hatt": overview of the whole finished hat.
      goal.current.set(44 * close, 26 * close, 52 * close);
      goalTarget.current.set(0, 9, 0);
      active.current = true;
      return;
    }
    if (viewMode === 'working') {
      const vis = computeVisible(model, stepIndex, stitchCursor, showFinished);
      if (vis.stitchStepping && vis.currentRoundIdx !== null) {
        // Follow the work: keep the camera at the azimuth of the NEXT stitch,
        // so the marker stays centred as you crochet your way around.
        const roundIdx = vis.currentRoundIdx;
        const round = model.rounds[roundIdx];
        const before = roundIdx > 0 ? model.cumCounts[roundIdx - 1] : 0;
        const nextIdx = Math.min(vis.shownStitches, model.cumCounts[roundIdx] - 1);
        const theta = stitchTheta(nextIdx - before, round.count);
        // The hat group is flipped (rotZ = PI) in working view:
        // local (r cos, y, r sin) -> world azimuth = PI - theta.
        const wTheta = Math.PI - theta;
        const ring = profile[roundIdx];
        const flipH = profile[0].y + profile[profile.length - 1].y;
        const sy = flipH - ring.y;
        const cx = Math.cos(wTheta);
        const cz = Math.sin(wTheta);
        const tx = ring.r * cx;
        const tz = ring.r * cz;
        if (isBrimPhase(round.phase)) {
          // Brim flares flat in sy-visning: look from BELOW up at the
          // working edge so the stitch faces point at the camera.
          goal.current.set(tx + 3.6 * close * cx, sy - 9.2 * close, tz + 3.6 * close * cz);
          goalTarget.current.set(tx, sy - 0.15, tz);
        } else if (round.phase === 'top') {
          // Flat crown: after the sy-flip, stitch faces point downward.
          // Sit under the working stitch and look up — same clear "face-on"
          // read as runde 22, while azimuth follows the work right → left.
          goal.current.set(tx + 6.2 * close * cx, sy - 7.4 * close, tz + 6.2 * close * cz);
          goalTarget.current.set(tx, sy - 0.12, tz);
        } else {
          // Text / vertical side: ALSO look from below the working edge.
          // A high side-on camera made +1 appear left→right on phone; the
          // under-edge framing keeps right→left like the crown rounds.
          goal.current.set(tx + 7.4 * close * cx, sy - 5.6 * close, tz + 7.4 * close * cz);
          goalTarget.current.set(tx, sy + 0.15, tz);
        }
        active.current = true;
        return;
      }
      // Working view without counting.
      if (step.roundIdx !== null && isBrimPhase(model.rounds[step.roundIdx].phase)) {
        // Look up at the brim disc from underneath.
        const ring = profile[step.roundIdx];
        const flipH = profile[0].y + profile[profile.length - 1].y;
        const sy = flipH - ring.y;
        goal.current.set(8, sy - 18, 10);
        goalTarget.current.set(0, sy, 0);
      } else if (step.roundIdx !== null && model.rounds[step.roundIdx].phase === 'top') {
        // Crown overview from under the disc (not bird's-eye foreshortening).
        const ring = profile[step.roundIdx];
        const flipH = profile[0].y + profile[profile.length - 1].y;
        const sy = flipH - ring.y;
        goal.current.set(ring.r * 0.35 + 6, sy - 14, ring.r * 0.55 + 8);
        goalTarget.current.set(0, sy, 0);
      } else {
        // Vertical side overview — same eye height as stitch-follow.
        goal.current.set(28, 12, 32);
        goalTarget.current.set(0, topY * 0.35, 0);
      }
      active.current = true;
      return;
    }
    let pos: [number, number, number];
    let target: [number, number, number] = [0, 9, 0];
    if (step.roundIdx === null) {
      pos = [20, 30, 26];
    } else {
      const round = model.rounds[step.roundIdx];
      // Standard view while counting on the side of the hat: face the next
      // stitch straight on, so marker, ring and colours are always in front.
      const vis = computeVisible(model, stepIndex, stitchCursor, showFinished);
      if (vis.stitchStepping && vis.currentRoundIdx !== null) {
        const before = step.roundIdx > 0 ? model.cumCounts[step.roundIdx - 1] : 0;
        const nextIdx = Math.min(vis.shownStitches, model.cumCounts[step.roundIdx] - 1);
        const theta = stitchTheta(nextIdx - before, round.count);
        const ring = profile[step.roundIdx];
        const cx = Math.cos(theta);
        const cz = Math.sin(theta);
        const tx = ring.r * cx;
        const tz = ring.r * cz;
        if (isBrimPhase(round.phase)) {
          // Finished hat: brim flares down/out — sit just outside the plane
          // of the brim so the stitch faces face the camera.
          goal.current.set(tx + 8.5 * cx, ring.y - 2.8, tz + 8.5 * cz);
          goalTarget.current.set(tx * 0.96, ring.y, tz * 0.96);
        } else if (round.phase === 'top') {
          // Face-on to crown stitches (from above in ferdig-visning).
          goal.current.set(tx + 4.2 * cx, ring.y + 6.8, tz + 4.2 * cz);
          goalTarget.current.set(tx, ring.y + 0.15, tz);
        } else {
          const dist = ring.r + 7.5;
          goal.current.set(dist * cx, ring.y + 2.0, dist * cz);
          goalTarget.current.set(tx * 0.98, ring.y - 0.2, tz * 0.98);
        }
        active.current = true;
        return;
      }
      if (round.phase === 'top' && step.kind !== 'size-check') {
        // Angled face-on over the working rim — not a distant bird's-eye.
        const r = profile[step.roundIdx].r;
        pos = [r * 0.55 + 8, topY + 9, r * 0.75 + 10];
        target = [r * 0.35, topY, r * 0.2];
      } else if (round.phase === 'top') {
        pos = [18, 22, 22];
        target = [0, topY - 1, 0];
      } else if (round.phase === 'text') {
        pos = [30, 20, 34];
      } else if (isBrimPhase(round.phase)) {
        // Top-down overview of the flaring brim.
        const ring = profile[step.roundIdx];
        pos = [4, ring.y + 28, 6];
        target = [0, ring.y, 0];
      } else {
        pos = [34, 9, 38];
        target = [0, 5, 0];
      }
    }
    if (step.kind === 'finish' || step.kind === 'done') {
      pos = [44 * close, 26 * close, 52 * close];
    }
    goal.current.set(...pos);
    goalTarget.current.set(...target);
    active.current = true;
  }, [stepIndex, viewMode, stitchCursor, showFinished, autoRotate, preview, device, close, controls, camera]);

  useEffect(() => {
    const c = controls.current;
    if (!c) return;
    const cancel = () => (active.current = false);
    c.addEventListener('start', cancel);
    return () => c.removeEventListener('start', cancel);
  }, [controls]);

  useFrame(() => {
    if (autoRotate || preview || !active.current) return;
    camera.position.lerp(goal.current, 0.04);
    const c = controls.current;
    if (c) {
      c.target.lerp(goalTarget.current, 0.04);
      c.update();
    }
    if (
      camera.position.distanceTo(goal.current) < 0.15 &&
      (!c || c.target.distanceTo(goalTarget.current) < 0.1)
    ) {
      active.current = false;
    }
  });

  return null;
}

function GroundShadow() {
  const tex = useMemo(() => {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 256;
    const g = cv.getContext('2d')!;
    const grad = g.createRadialGradient(128, 128, 12, 128, 128, 128);
    grad.addColorStop(0, 'rgba(96,84,60,0.30)');
    grad.addColorStop(1, 'rgba(96,84,60,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(cv);
  }, []);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.35, 0]}>
      <circleGeometry args={[32, 48]} />
      <meshBasicMaterial map={tex} transparent depthWrite={false} />
    </mesh>
  );
}

/** Exposes a camera setter for the screenshot scripts. */
function CameraDevHook({ controls }: { controls: React.RefObject<OrbitControlsImpl | null> }) {
  const { camera } = useThree();
  useEffect(() => {
    (window as unknown as Record<string, unknown>).__roboCam = (
      px: number, py: number, pz: number, ty: number,
    ) => {
      const c = controls.current;
      if (c) {
        c.autoRotate = false;
        // cancel the CameraDirector tween (it listens for user interaction)
        c.dispatchEvent({ type: 'start' } as never);
        c.target.set(0, ty, 0);
        c.update();
      }
      camera.position.set(px, py, pz);
    };
  }, [camera, controls]);
  return null;
}

export default function HatScene({
  preview = false,
  device = 'desktop',
}: {
  preview?: boolean;
  device?: DeviceClass;
}) {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const autoRotateStore = useApp((s) => s.autoRotate);
  const spinning = preview || autoRotateStore;
  const fov = device === 'phone' ? 42 : device === 'tablet' ? 40 : 36;
  const dpr: [number, number] = device === 'phone' ? [1, 1.5] : [1, 2];
  const startPos: [number, number, number] = preview
    ? [44, 26, 52]
    : device === 'phone'
      ? [24, 28, 28]
      : [20, 30, 26];
  return (
    <div id="scene-root" className={preview ? 'scene-preview' : undefined}>
      <Canvas
        dpr={dpr}
        camera={{
          fov,
          near: 0.5,
          far: 300,
          position: startPos,
        }}
        gl={{ antialias: true }}
      >
        <color attach="background" args={[BG]} />
        <fog attach="fog" args={[BG, 70, 150]} />
        <hemisphereLight args={['#fff6e6', '#cbbfa4', 1.15]} />
        <directionalLight position={[30, 45, 25]} intensity={1.5} />
        <directionalLight position={[-38, 22, -30]} intensity={0.5} color="#dfe8ff" />
        <Hat preview={preview} />
        <GroundShadow />
        <CameraDirector controls={controlsRef} preview={preview} device={device} />
        {!preview && <CameraDevHook controls={controlsRef} />}
        <OrbitControls
          ref={controlsRef}
          target={[0, 9, 0]}
          enableDamping
          dampingFactor={0.06}
          autoRotate={spinning}
          autoRotateSpeed={1.2}
          minDistance={device === 'phone' ? 6 : 5}
          maxDistance={90}
          // Allow near-overhead (brim in sy-visning) and slightly under-horizon
          // (brim in ferdig-visning) so stitches can face the camera.
          maxPolarAngle={Math.PI * 0.92}
          enablePan={false}
        />
      </Canvas>
    </div>
  );
}
