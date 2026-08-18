/**
 * HEKLO 3D viewer.
 *
 * Three jobs, one WebGL budget:
 *   1. parts   — every STL, in the colour the filament actually is;
 *   2. build   — 24 animated assembly steps, machine included, not just prints;
 *   3. sim     — the reference hat being crocheted, stitch by real stitch.
 *
 * The context budget is the design constraint. Browsers cap live WebGL contexts
 * at about sixteen and this page has fifty-odd canvases, so the galleries share
 * ONE offscreen renderer that blits into ordinary 2D canvases. Only the hero,
 * the part modal and the simulator hold a context of their own.
 *
 * Placement comes from assembly.json, which is computed from the machine's own
 * frame chain — so the picture cannot drift from the design. Geometry comes
 * from the same binary STLs the download buttons serve.
 */

import * as THREE from './vendor/three.module.js';

/* ------------------------------------------------------------- palette --- */

/**
 * Real filament and real metal.
 *
 * The previous viewer painted all 23 parts one shade of beige, which made the
 * assembly diagrams unreadable — you cannot tell a bracket from a bearing when
 * both are the same putty colour. These are Bambu's own filament colours for
 * the printed parts and honest metal tones for the bought hardware, sitting on
 * MASKLAB's cream. The mechanism — gates, comb, wheel, hook — is crimson,
 * because those are the parts the whole project is about.
 */
export const TONE = {
  // Bambu Matte Ivory White. Structure, brackets, formers.
  shell: 0xf2ede0,
  // MASKLAB crimson, near Bambu Red. The invention.
  mech: 0xba0c2f,
  // Bambu Matte Charcoal. PLA parts.
  charcoal: 0x33322e,
  // Bambu Grey. TPU.
  flex: 0x8e9089,
  // Aluminium extrusion and enclosures.
  alu: 0xb9bdbf,
  // Ground steel: rail, screws, bearings.
  steel: 0x9aa1a6,
  // Motors, belts, rubber.
  black: 0x24262a,
  // PCB.
  board: 0x1f6f4a,
  ink: 0x201d18,
  ghost: 0xdfd8c6,
};

/** Which tone a printed part wears, by id. Mechanism parts read crimson. */
const MECHANISM = /^(gate-|comb-|wheel-|crochet-hook|hook-collet)/;
const FLEX = /takedown-skirt/;
const PLA = /camera-pod/;

function toneForPart(id) {
  if (MECHANISM.test(id)) return TONE.mech;
  if (FLEX.test(id)) return TONE.flex;
  if (PLA.test(id)) return TONE.charcoal;
  return TONE.shell;
}

const YARN_FALLBACK = [0xf6f0e1, 0xba0c2f, 0x00205b, 0xa89a7e];
function toneForHardware(tone, yarnPalette) {
  if (tone && tone.startsWith('yarn')) {
    const i = Number(tone.slice(4)) || 0;
    return (yarnPalette && yarnPalette[i]) ?? YARN_FALLBACK[i % YARN_FALLBACK.length];
  }
  return TONE[tone] ?? TONE.alu;
}

/* ------------------------------------------------------------- STL parse -- */

const cache = new Map();

export async function loadSTL(file) {
  if (cache.has(file)) return cache.get(file);
  const p = fetch(`stl/${file}`)
    .then((r) => r.arrayBuffer())
    .then((buf) => {
      const dv = new DataView(buf);
      const tris = dv.getUint32(80, true);
      const pos = new Float32Array(tris * 9);
      const nor = new Float32Array(tris * 9);
      let o = 84;
      for (let i = 0; i < tris; i++) {
        const nx = dv.getFloat32(o, true);
        const ny = dv.getFloat32(o + 4, true);
        const nz = dv.getFloat32(o + 8, true);
        o += 12;
        for (let v = 0; v < 3; v++) {
          const k = i * 9 + v * 3;
          pos[k] = dv.getFloat32(o, true);
          pos[k + 1] = dv.getFloat32(o + 4, true);
          pos[k + 2] = dv.getFloat32(o + 8, true);
          nor[k] = nx;
          nor[k + 1] = ny;
          nor[k + 2] = nz;
          o += 12;
        }
        o += 2;
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
      g.computeBoundingBox();
      g.computeBoundingSphere();
      return g;
    });
  cache.set(file, p);
  return p;
}

/* --------------------------------------------------------------- shading -- */

function lights(scene) {
  scene.add(new THREE.HemisphereLight(0xfffaf0, 0x8d8574, 1.15));
  const key = new THREE.DirectionalLight(0xfff8ec, 2.0);
  key.position.set(1, 0.8, 1.4);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xd2dbe8, 0.7);
  fill.position.set(-1.2, -0.35, -0.9);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffffff, 0.5);
  rim.position.set(-0.4, 1.2, -1.1);
  scene.add(rim);
}

const matCache = new Map();
function solid(color, opts = {}) {
  const key = `${color}|${JSON.stringify(opts)}`;
  if (matCache.has(key)) return matCache.get(key);
  const m = new THREE.MeshStandardMaterial({
    color,
    roughness: opts.rough ?? 0.62,
    metalness: opts.metal ?? 0.04,
    flatShading: opts.flat ?? false,
    transparent: opts.opacity != null,
    opacity: opts.opacity ?? 1,
    depthWrite: opts.opacity == null,
  });
  matCache.set(key, m);
  return m;
}

const matGhost = () => solid(TONE.ghost, { rough: 0.95, opacity: 0.16 });

function withEdges(geo, material, angle = 34) {
  const g = new THREE.Group();
  const mesh = new THREE.Mesh(geo, material);
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(geo, angle),
    new THREE.LineBasicMaterial({ color: TONE.ink, transparent: true, opacity: 0.2 }),
  );
  g.add(mesh, edges);
  g.userData = { mesh, edges };
  return g;
}

function place(camera, radius, az, el, k) {
  const d = radius * k;
  camera.position.set(
    d * Math.cos(el) * Math.sin(az),
    d * Math.sin(el),
    d * Math.cos(el) * Math.cos(az),
  );
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
}

/* ------------------------------------------------- procedural hardware --- */

/**
 * The bought parts, built from numbers rather than downloaded as meshes.
 *
 * A step that says "rail to the brackets" used to show two brackets and empty
 * air. These are deliberately simple — an extrusion is a slotted bar, a motor
 * is a chamfered box with a shaft — because the job is to make the step legible,
 * not to render a catalogue photo.
 */
function hardwareMesh(kind, size, color) {
  const g = new THREE.Group();
  const [a, b, c] = size;
  const m = solid(color, { rough: kind === 'belt' ? 0.9 : 0.45, metal: kind === 'motor' ? 0.5 : 0.35 });

  const box = (x, y, z, mat = m) => new THREE.Mesh(new THREE.BoxGeometry(x, y, z), mat);
  const cyl = (r, h, seg = 24, mat = m) =>
    new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), mat);

  switch (kind) {
    case 'extrusion': {
      // A 2020 bar with its four face slots suggested by shallow grooves.
      const body = box(a, b, c);
      g.add(body);
      const dark = solid(0x8f9396, { rough: 0.6, metal: 0.4 });
      for (const [dx, dy, sx, sy] of [
        [0, b / 2, a, 6],
        [0, -b / 2, a, 6],
      ]) {
        const s = new THREE.Mesh(new THREE.BoxGeometry(sx, 2.4, sy), dark);
        s.position.set(dx, dy, 0);
        g.add(s);
      }
      break;
    }
    case 'rail': {
      g.add(box(a, b, c));
      const cap = solid(0x7f868b, { metal: 0.6, rough: 0.35 });
      const groove = new THREE.Mesh(new THREE.BoxGeometry(a, b + 0.6, 1.6), cap);
      groove.position.z = 0;
      g.add(groove);
      break;
    }
    case 'block': {
      g.add(box(a, b, c));
      const top = box(a * 0.7, b * 1.05, 2.5, solid(0x7f868b, { metal: 0.6, rough: 0.3 }));
      top.position.z = c / 2;
      g.add(top);
      break;
    }
    case 'motor': {
      // Body plus end bells plus shaft — enough to read as a stepper at a glance.
      const body = box(a, b, c);
      g.add(body);
      const bell = solid(0x9aa1a6, { metal: 0.7, rough: 0.35 });
      for (const s of [1, -1]) {
        const e = box(a * 0.98, b * 0.98, 5, bell);
        e.position.z = s * (c / 2 - 2.5);
        g.add(e);
      }
      const shaft = cyl(2.5, 22, 20, bell);
      shaft.rotation.x = Math.PI / 2;
      shaft.position.z = c / 2 + 11;
      shaft.rotation.set(0, 0, 0);
      shaft.position.set(0, 0, c / 2 + 11);
      g.add(shaft);
      break;
    }
    case 'bearing': {
      const outer = cyl(a / 2, c, 32, solid(TONE.steel, { metal: 0.8, rough: 0.25 }));
      outer.rotation.x = Math.PI / 2;
      const inner = cyl(a / 4, c + 0.4, 24, solid(0x6f767b, { metal: 0.8, rough: 0.3 }));
      inner.rotation.x = Math.PI / 2;
      g.add(outer, inner);
      break;
    }
    case 'belt': {
      const t = new THREE.Mesh(
        new THREE.TorusGeometry(a / 2, 1.6, 8, 48),
        solid(TONE.black, { rough: 0.9, metal: 0 }),
      );
      g.add(t);
      break;
    }
    case 'leadscrew': {
      const s = cyl(b / 2, a, 16, solid(TONE.steel, { metal: 0.75, rough: 0.3 }));
      s.rotation.x = Math.PI / 2;
      g.add(s);
      break;
    }
    case 'lazysusan': {
      const d = new THREE.Mesh(
        new THREE.CylinderGeometry(a / 2, a / 2, c, 48),
        solid(TONE.steel, { metal: 0.7, rough: 0.35 }),
      );
      d.rotation.x = Math.PI / 2;
      g.add(d);
      break;
    }
    case 'psu': {
      g.add(box(a, b, c, solid(TONE.alu, { metal: 0.55, rough: 0.4 })));
      const vent = box(a * 0.9, 1, c * 0.6, solid(0x8f9396, { rough: 0.7 }));
      vent.position.y = b / 2;
      g.add(vent);
      break;
    }
    case 'mcu':
    case 'driver': {
      g.add(box(a, b, c, solid(TONE.board, { rough: 0.65, metal: 0.1 })));
      const chip = box(a * 0.35, b * 0.5, c * 0.6, solid(0x1a1c1e, { rough: 0.5 }));
      chip.position.z = c * 0.5;
      g.add(chip);
      break;
    }
    case 'camera': {
      g.add(box(a, b, c, solid(TONE.black, { rough: 0.5 })));
      const lens = cyl(6, 6, 24, solid(0x11131a, { rough: 0.2, metal: 0.5 }));
      lens.rotation.x = Math.PI / 2;
      lens.position.z = -c / 2 - 3;
      g.add(lens);
      break;
    }
    case 'estop': {
      const base = cyl(a / 2, 10, 24, solid(TONE.black, { rough: 0.6 }));
      base.rotation.x = Math.PI / 2;
      const head = cyl(a / 2.1, 12, 24, solid(0xc0231f, { rough: 0.45 }));
      head.rotation.x = Math.PI / 2;
      head.position.z = 14;
      g.add(base, head);
      break;
    }
    case 'skein': {
      // A ball of yarn: a squat capsule in the colour of the strand it feeds.
      const ball = new THREE.Mesh(
        new THREE.CapsuleGeometry(a / 2, c * 0.35, 8, 24),
        solid(color, { rough: 0.95, metal: 0 }),
      );
      ball.rotation.x = Math.PI / 2;
      g.add(ball);
      break;
    }
    default:
      g.add(box(a, b, c));
  }
  return g;
}

/* -------------------------------------------------- shared thumb renderer - */

let shared = null;

function sharedRenderer() {
  if (shared) return shared;
  const canvas = document.createElement('canvas');
  canvas.width = 660;
  canvas.height = 660;
  // preserveDrawingBuffer is REQUIRED here, not an optimisation to skip.
  //
  // Everything on this page except the hero, the modal and the simulator is a
  // still image copied out of this one context with drawImage. Without the
  // flag the browser is free to clear the drawing buffer as soon as the frame
  // ends, and drawImage then copies nothing — which showed up as every OTHER
  // step diagram coming out blank, because whether the copy won the race
  // depended on how the draws happened to be spaced.
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    preserveDrawingBuffer: true,
  });
  renderer.setPixelRatio(1);
  renderer.setSize(660, 660, false);

  const mk = () => {
    const scene = new THREE.Scene();
    lights(scene);
    const root = new THREE.Group();
    root.rotation.x = -Math.PI / 2; // machine is Z-up, three is Y-up
    scene.add(root);
    return { scene, root };
  };

  const part = mk();
  const asm = mk();
  const camera = new THREE.PerspectiveCamera(36, 1, 0.5, 12000);
  shared = { canvas, renderer, camera, part, asm };
  return shared;
}

function fitShared(target) {
  const sh = sharedRenderer();
  const w = target.clientWidth || 240;
  const h = target.clientHeight || 240;
  const long = 560;
  const rw = w >= h ? long : Math.round((long * w) / h);
  const rh = w >= h ? Math.round((long * h) / w) : long;
  if (sh.canvas.width !== rw || sh.canvas.height !== rh) sh.renderer.setSize(rw, rh, false);
  sh.camera.aspect = rw / rh;
  return sh;
}

/**
 * Every draw through the shared renderer takes this lock.
 *
 * One context, several callers: a part thumbnail, a step animation frame, a
 * resize repaint. Without a mutex the sequence "render A, render B, blit A"
 * happens whenever two of them are in flight, and canvas A gets B's picture —
 * or, if B left the scene framed elsewhere, nothing at all. Callers already
 * chain through one queue for ORDER; this guarantees ATOMICITY, which is a
 * different property and the one that was missing.
 */
let sharedLock = Promise.resolve();
function withShared(fn) {
  const run = sharedLock.then(fn, fn);
  sharedLock = run.catch(() => {});
  return run;
}

function blit(target, source) {
  const dpr = Math.min(devicePixelRatio, 2);
  const w = Math.round((target.clientWidth || 240) * dpr);
  const h = Math.round((target.clientHeight || 240) * dpr);
  if (target.width !== w || target.height !== h) {
    target.width = w;
    target.height = h;
  }
  const ctx = target.getContext('2d');
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(source, 0, 0, w, h);
}

/** Static three-quarter view of one part, in its filament colour. */
export async function thumbPart(target, file, partId) {
  const geo = await loadSTL(file);
  return withShared(() => {
  const sh = fitShared(target);
  const { root, scene } = sh.part;
  root.clear();
  root.position.set(0, 0, 0);

  const g = withEdges(geo, solid(toneForPart(partId ?? file.replace('.stl', ''))));
  const c = geo.boundingBox.getCenter(new THREE.Vector3());
  g.position.set(-c.x, -c.y, -c.z);
  root.add(g);

  place(sh.camera, geo.boundingSphere.radius, 0.85, 0.52, 3.3);
  sh.renderer.render(scene, sh.camera);
  blit(target, sh.canvas);
  });
}

/* --------------------------------------------------- animated build steps - */

/**
 * The assembly, built ONCE, then drawn at any step and any point in that step's
 * animation. Rebuilding 105 instances and their edge geometry for each of 24
 * steps is about two thousand EdgesGeometry builds; this is a material swap and
 * a few transforms.
 *
 * `t` runs 0..1 through the step: new pieces start offset along their explode
 * direction and fly home, which is the thing that makes an IKEA diagram legible
 * — you see where a part comes FROM, not just where it ends up.
 */
export async function prepareSteps(data) {
  const sh = sharedRenderer();
  const { root, scene } = sh.asm;
  if (sh.asm.draw) return sh.asm.draw;
  root.position.set(0, 0, 0);

  const yarn = (data.hatPalette ?? []).map((h) => new THREE.Color(h).getHex());
  const items = [];

  for (const inst of data.instances) {
    const geo = await loadSTL(`${inst.partId}.stl`);
    const g = withEdges(geo, solid(toneForPart(inst.partId)));
    const m = new THREE.Matrix4().fromArray(inst.m);
    g.matrixAutoUpdate = false;
    root.add(g);
    items.push({
      id: inst.partId,
      g,
      home: m,
      dir: new THREE.Vector3(...(inst.dir ?? [0, 0, 1])).normalize(),
      tone: toneForPart(inst.partId),
      radius: geo.boundingSphere.radius,
    });
  }

  for (const hw of data.hardware ?? []) {
    const color = toneForHardware(hw.tone, yarn);
    const g = hardwareMesh(hw.kind, hw.size, color);
    const m = new THREE.Matrix4().fromArray(hw.m);
    g.matrixAutoUpdate = false;
    root.add(g);
    items.push({
      id: hw.id,
      g,
      home: m,
      dir: new THREE.Vector3(0, 0, 1),
      tone: color,
      hardware: true,
      radius: Math.max(...hw.size) / 2,
    });
  }

  const tmp = new THREE.Matrix4();
  const off = new THREE.Vector3();

  function paint(it, mode, t) {
    const mesh = it.g.userData?.mesh;
    const edges = it.g.userData?.edges;
    if (mode === 'ghost') {
      it.g.visible = true;
      if (mesh) mesh.material = matGhost();
      else it.g.traverse((o) => { if (o.isMesh) o.material = matGhost(); });
      if (edges) edges.visible = false;
      it.g.matrix.copy(it.home);
      return;
    }
    it.g.visible = true;
    if (mode === 'new') {
      // Crimson while it is being fitted, its own colour once it is home.
      const c = t >= 1 ? it.tone : TONE.mech;
      if (mesh) mesh.material = solid(c);
      else it.g.traverse((o) => { if (o.isMesh) o.material = solid(c, { metal: 0.35 }); });
      const ease = 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
      const d = (1 - ease) * Math.max(26, it.radius * 2.4);
      off.copy(it.dir).multiplyScalar(d);
      tmp.makeTranslation(off.x, off.y, off.z);
      it.g.matrix.multiplyMatrices(tmp, it.home);
    } else {
      if (mesh) mesh.material = solid(it.tone);
      else it.g.traverse((o) => { if (o.isMesh) o.material = solid(it.tone, { metal: 0.35 }); });
      it.g.matrix.copy(it.home);
    }
    if (edges) edges.visible = true;
  }

  const byId = new Map();
  for (const it of items) {
    if (!byId.has(it.id)) byId.set(it.id, []);
    byId.get(it.id).push(it);
  }

  /**
   * Lay a print step out like a build plate: one of each part, in a row, sized
   * so they read at thumbnail scale. Drawing "print these six things" at their
   * final mounted poses inside a machine that does not exist yet is a picture
   * of the wrong moment.
   */
  /**
   * Reset the group to a known world transform before anything measures it.
   *
   * Every bounding box on this page is computed by walking parent.matrixWorld,
   * and root.matrixWorld is only refreshed by a render. Setting root.position
   * back to zero at the end of a draw therefore leaves the CACHED world matrix
   * holding the previous step's centring offset, and the next box comes out
   * shifted by it. With one code path that error is small and self-cancelling;
   * with two it compounds until the subject is framed off-screen entirely,
   * which is what turned every step after a print step blank.
   */
  function resetRoot() {
    root.position.set(0, 0, 0);
    root.updateMatrix();
    root.updateMatrixWorld(true);
  }

  function plateLayout(ids, focus) {
    const picked = ids
      .map((id) => (byId.get(id) ?? [])[0])
      .filter(Boolean)
      .sort((a, b) => b.radius - a.radius);
    if (!picked.length) return false;

    // A grid, not a row. Six parts in a line makes a 6:1 strip inside a 4:3
    // card, and everything shrinks to nothing to fit the width.
    const gap = 10;
    const cols = Math.ceil(Math.sqrt(picked.length));
    const cellW = Math.max(...picked.map((it) => it.radius * 2)) + gap;
    const rows = Math.ceil(picked.length / cols);
    const m = new THREE.Matrix4();
    picked.forEach((it, i) => {
      const cx = (i % cols) - (cols - 1) / 2;
      const cy = Math.floor(i / cols) - (rows - 1) / 2;
      m.makeTranslation(cx * cellW, cy * cellW, it.radius * 0.6);
      it.g.matrix.copy(m);
      it.g.visible = true;
      it.g.updateMatrixWorld(true);
      focus.expandByObject(it.g);
    });
    // Everything else stays out of the shot: a plate is a plate.
    for (const it of items) if (!picked.includes(it)) it.g.visible = false;
    return true;
  }

  const draw = function drawStep(target, n, t = 1) {
    return withShared(() => drawNow(target, n, t));
  };

  function drawNow(target, n, t) {
    const step = data.steps.find((s) => s.n === n);
    const track = step ? step.track : 'station';

    const built = new Set();
    const added = new Set();
    const relevant = new Set();
    for (const s of data.steps) {
      const ids = [...s.parts, ...(s.hardware ?? [])];
      if (s.track === track) ids.forEach((p) => relevant.add(p));
      if (s.n < n) ids.forEach((p) => built.add(p));
      else if (s.n === n) ids.forEach((p) => added.add(p));
    }
    const showAll = added.size === 0;

    const focus = new THREE.Box3();
    let any = false;
    resetRoot();

    if (step && step.layout === 'plate') {
      // One geometry per part, centred on its own mesh, so a 240 mm mandrel and
      // a 5 mm hook can share a row without one of them becoming a speck.
      for (const it of items) it.g.visible = false;
      const ids = [...(step.parts ?? []), ...(step.hardware ?? [])];
      if (plateLayout(ids, focus)) {
        for (const id of ids) {
          const it = (byId.get(id) ?? [])[0];
          if (!it) continue;
          const mesh = it.g.userData?.mesh;
          const c = t >= 1 ? it.tone : TONE.mech;
          if (mesh) mesh.material = solid(c);
          if (it.g.userData?.edges) it.g.userData.edges.visible = true;
        }
        const sp = fitShared(target);
        const cc = focus.getCenter(new THREE.Vector3());
        root.position.set(-cc.x, -cc.y, -cc.z);
        const rr = Math.max(focus.getSize(new THREE.Vector3()).length() / 2, 26);
        place(sp.camera, rr, 0.35 + t * 0.35, 0.85, 2.15);
        sp.renderer.render(scene, sp.camera);
        blit(target, sp.canvas);
        for (const it of items) it.g.matrix.copy(it.home);
        resetRoot();
        return;
      }
    }

    for (const it of items) {
      const isNew = added.has(it.id);
      const isBuilt = built.has(it.id);
      const isGhost = !isNew && !isBuilt && relevant.has(it.id);
      if (!isNew && !isBuilt && !isGhost) {
        it.g.visible = false;
        continue;
      }
      paint(it, isNew ? 'new' : isBuilt ? 'built' : 'ghost', t);
      it.g.updateMatrixWorld(true);
      if (isNew || isBuilt || showAll) {
        focus.expandByObject(it.g);
        any = true;
      }
    }

    const s2 = fitShared(target);
    if (any) {
      const c = focus.getCenter(new THREE.Vector3());
      root.position.set(-c.x, -c.y, -c.z);
    }
    // A floor AND a margin. Step 1 introduces four 10 mm gates and a 54 mm
    // comb; framing that tightly put a single crimson gate across the whole
    // card, which is a photograph of a colour rather than an instruction.
    const radius = any ? Math.max(focus.getSize(new THREE.Vector3()).length() / 2, 70) : 150;

    // Slow drift through the step so the shot is never quite static.
    place(s2.camera, radius, 0.86 + t * 0.22, 0.44, 2.6);
    s2.renderer.render(scene, s2.camera);
    blit(target, s2.canvas);
    resetRoot();
  }

  sh.asm.draw = draw;
  return draw;
}

/* ---------------------------------------------------- interactive viewers - */

function orbit(canvas, state, onChange) {
  let down = false;
  let px = 0;
  let py = 0;
  canvas.addEventListener('pointerdown', (e) => {
    down = true;
    px = e.clientX;
    py = e.clientY;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!down) return;
    state.az -= (e.clientX - px) * 0.01;
    state.el = Math.max(-1.35, Math.min(1.35, state.el - (e.clientY - py) * 0.01));
    px = e.clientX;
    py = e.clientY;
    onChange();
  });
  const up = () => (down = false);
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);
  canvas.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      state.dist = Math.max(0.35, Math.min(3, state.dist * (1 + Math.sign(e.deltaY) * 0.12)));
      onChange();
    },
    { passive: false },
  );
}

function liveScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const scene = new THREE.Scene();
  lights(scene);
  const root = new THREE.Group();
  root.rotation.x = -Math.PI / 2;
  scene.add(root);
  const camera = new THREE.PerspectiveCamera(36, 1, 0.5, 12000);
  return { renderer, scene, root, camera };
}

/** Interactive single part — the click-through modal. */
export async function livePart(canvas, file, partId) {
  const geo = await loadSTL(file);
  const { renderer, scene, root, camera } = liveScene(canvas);
  const g = withEdges(geo, solid(toneForPart(partId ?? file.replace('.stl', ''))));
  const c = geo.boundingBox.getCenter(new THREE.Vector3());
  g.position.set(-c.x, -c.y, -c.z);
  root.add(g);

  const radius = geo.boundingSphere.radius;
  const state = { az: 0.85, el: 0.5, dist: 1 };
  let spin = true;
  let alive = true;

  function draw() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    place(camera, radius, state.az, state.el, 2.9 * state.dist);
    renderer.render(scene, camera);
  }

  orbit(canvas, state, draw);
  canvas.addEventListener('pointerdown', () => (spin = false));
  new ResizeObserver(draw).observe(canvas);
  draw();

  (function loop() {
    if (!alive) return;
    if (spin) {
      state.az += 0.005;
      draw();
    }
    requestAnimationFrame(loop);
  })();

  return {
    draw,
    dispose() {
      alive = false;
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}

/** Interactive assembly — the hero. Printed parts and bought hardware together. */
export async function liveAssembly(canvas, data) {
  const { renderer, scene, root, camera } = liveScene(canvas);
  const groups = new Map();
  const yarn = (data.hatPalette ?? []).map((h) => new THREE.Color(h).getHex());

  const push = (id, g) => {
    if (!groups.has(id)) groups.set(id, []);
    groups.get(id).push(g);
  };

  for (const inst of data.instances) {
    const geo = await loadSTL(`${inst.partId}.stl`);
    const g = withEdges(geo, solid(toneForPart(inst.partId)));
    g.matrixAutoUpdate = false;
    g.matrix.fromArray(inst.m);
    g.updateMatrixWorld(true);
    root.add(g);
    push(inst.partId, g);
  }
  for (const hw of data.hardware ?? []) {
    const g = hardwareMesh(hw.kind, hw.size, toneForHardware(hw.tone, yarn));
    g.matrixAutoUpdate = false;
    g.matrix.fromArray(hw.m);
    g.updateMatrixWorld(true);
    root.add(g);
    push(hw.id, g);
  }

  const state = { az: 0.92, el: 0.44, dist: 1 };
  let radius = 220;

  function frameVisible() {
    root.position.set(0, 0, 0);
    const b = new THREE.Box3();
    let any = false;
    for (const list of groups.values()) {
      for (const g of list) {
        if (!g.visible) continue;
        b.expandByObject(g);
        any = true;
      }
    }
    if (!any) return;
    const c = b.getCenter(new THREE.Vector3());
    root.position.set(-c.x, -c.y, -c.z);
    radius = Math.max(b.getSize(new THREE.Vector3()).length() / 2, 30);
  }

  function draw() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    place(camera, radius, state.az, state.el, 2.1 * state.dist);
    renderer.render(scene, camera);
  }

  function showTrack(track) {
    const keep = new Set();
    for (const s of data.steps) {
      if (track === 'all' || s.track === track) {
        s.parts.forEach((p) => keep.add(p));
        (s.hardware ?? []).forEach((p) => keep.add(p));
      }
    }
    for (const [id, list] of groups) {
      for (const g of list) g.visible = track === 'all' || keep.has(id);
    }
    frameVisible();
    draw();
  }

  orbit(canvas, state, draw);
  new ResizeObserver(draw).observe(canvas);

  let spin = true;
  let onScreen = true;
  canvas.addEventListener('pointerdown', () => (spin = false));
  // Idle rotation is decoration; it should not cost a frame budget once the
  // hero has scrolled away and something heavier is on screen.
  new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; }).observe(canvas);
  (function loop() {
    requestAnimationFrame(loop);
    if (!spin || !onScreen) return;
    state.az += 0.0026;
    draw();
  })();

  frameVisible();
  draw();
  return { draw, showTrack };
}

/* ------------------------------------------------------- stitch simulator - */

/**
 * The reference hat being crocheted, one real stitch at a time.
 *
 * Every number here comes from the pattern the app actually ships: round
 * counts, per-stitch colours and the ring profile are read from hat.json,
 * which is a projection of the app's own snapshot. So the fabric grows where
 * the pattern says it grows, in the colour the pattern says, and the stitch
 * counter is counting the stitches the machine would really have to make.
 *
 * What is HONEST about this simulation, and what is not, stated plainly because
 * a convincing animation of a machine that has never worked is the single most
 * misleading thing this whole page could contain:
 *
 *   REAL  — stitch count, round structure, increases, colour sequence, the hat
 *           profile, the cycle time, and therefore the total hours.
 *   REAL  — the axis motions: C indexes one stitch pitch, W indexes one tooth,
 *           P plunges and retracts, F lays yarn twice. Those are the machine's
 *           declared axes moving through their declared ranges.
 *   NOT   — the yarn. Each stitch is drawn as an interlocked loop at the pose
 *           the pattern puts it at; it is not a physical simulation of cotton,
 *           and nothing here proves a real strand would behave that way.
 *           Whether it does is exactly what gate G0 exists to find out.
 *
 * A simulation that runs perfectly is not evidence. It is the specification.
 */
export async function liveSim(canvas, hat, opts = {}) {
  const { renderer, scene, root, camera } = liveScene(canvas);

  const su = hat.suMm;
  const counts = hat.counts;
  const profile = hat.profile;
  const palette = hat.palette.map((h) => new THREE.Color(h));
  const total = hat.totalStitches;

  // Where every stitch in the hat sits, precomputed once. This is the same
  // relation the app's own 3D uses: a round of n stitches has radius
  // n * su / 2pi, and the ring heights come from the snapshot profile.
  const starts = [];
  let acc = 0;
  for (const c of counts) {
    starts.push(acc);
    acc += c;
  }

  /* --------------------------------------------------------- the fabric -- */

  const loop = new THREE.TorusGeometry(su * 0.36, Math.max(0.55, su * 0.115), 6, 10);
  const fabric = new THREE.InstancedMesh(
    loop,
    solid(0xffffff, { rough: 0.94, metal: 0 }),
    total,
  );
  fabric.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  fabric.count = 0;
  root.add(fabric);

  const dummy = new THREE.Object3D();
  const stitchPos = new Float32Array(total * 3);

  let k = 0;
  for (let r = 0; r < counts.length; r++) {
    const n = counts[r];
    const ring = profile[Math.min(r, profile.length - 1)];
    const rad = ring[0];
    const y = ring[1];
    for (let j = 0; j < n; j++) {
      const th = (2 * Math.PI * j) / n;
      const x = rad * Math.cos(th);
      const z = rad * Math.sin(th);
      stitchPos[k * 3] = x;
      stitchPos[k * 3 + 1] = z;
      stitchPos[k * 3 + 2] = y;

      dummy.position.set(x, z, y);
      // The loop plane holds the radial and vertical directions, so the V faces
      // outward the way a stitch on a hat does.
      dummy.rotation.set(0, 0, 0);
      dummy.rotateZ(th);
      dummy.rotateY(Math.PI / 2);
      dummy.updateMatrix();
      fabric.setMatrixAt(k, dummy.matrix);
      const c = palette[hat.colors[k] ?? 0] ?? palette[0];
      fabric.setColorAt(k, c);
      k++;
    }
  }
  fabric.instanceMatrix.needsUpdate = true;
  if (fabric.instanceColor) fabric.instanceColor.needsUpdate = true;

  /* -------------------------------------------------------- the mandrel -- */

  const lathe = new THREE.LatheGeometry(
    profile.map(([r, y]) => new THREE.Vector2(Math.max(0.6, r - su * 0.55), y)),
    72,
  );
  // Opaque. A translucent former reads as grey haze behind the fabric and
  // makes the whole shot look like a clay render rather than a hat on a jig.
  const mandrel = new THREE.Mesh(lathe, solid(TONE.shell, { rough: 0.85 }));
  mandrel.rotation.x = Math.PI / 2;
  root.add(mandrel);

  // The platter is a datum, not the subject. At its true 240 mm it fills the
  // bottom half of a 16:9 frame with a grey ellipse and the hat has to fight it
  // for attention, so it is drawn as a small hub. The machine section shows the
  // real one at the real size; this section is about the fabric.
  const platter = new THREE.Mesh(
    new THREE.CylinderGeometry(74, 74, 6, 48),
    solid(0xd8d2c2, { rough: 0.75 }),
  );
  platter.rotation.x = Math.PI / 2;
  platter.position.z = -14;
  root.add(platter);

  /* -------------------------------------------------------- the station -- */

  // Comb, wheel and hook, simplified to the three things you need to see: a bar
  // of gates holding the edge, a wheel carrying one loop to the work point, and
  // a hook going through it.
  const station = new THREE.Group();
  root.add(station);

  const comb = new THREE.Mesh(new THREE.BoxGeometry(56, 14, 11), solid(TONE.mech));
  comb.position.set(30, 0, 0);
  station.add(comb);
  for (let i = 0; i < 10; i++) {
    const gate = new THREE.Mesh(new THREE.BoxGeometry(3.6, 9, 9), solid(TONE.mech));
    gate.position.set(2 + i * 5.6, -8, i % 2 ? 3 : -3);
    comb.add(gate);
  }

  const wheel = new THREE.Group();
  wheel.position.set(34, 0, 15);
  station.add(wheel);
  const hubMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(11, 11, 8, 24),
    solid(TONE.mech, { rough: 0.5 }),
  );
  hubMesh.rotation.z = Math.PI / 2;
  wheel.add(hubMesh);
  for (let i = 0; i < 8; i++) {
    const tooth = new THREE.Mesh(new THREE.BoxGeometry(20, 6, 5), solid(TONE.mech));
    const a = (i / 8) * Math.PI * 2;
    tooth.position.set(0, Math.cos(a) * 15, Math.sin(a) * 15);
    tooth.rotation.x = -a;
    wheel.add(tooth);
  }

  const hookGrp = new THREE.Group();
  station.add(hookGrp);
  const hookShaft = new THREE.Mesh(
    new THREE.CylinderGeometry(2.5, 2.5, 42, 12),
    solid(TONE.mech, { rough: 0.35, metal: 0.15 }),
  );
  hookShaft.rotation.z = Math.PI / 2;
  hookShaft.position.set(22, 0, 0);
  hookGrp.add(hookShaft);
  const hookNose = new THREE.Mesh(
    new THREE.SphereGeometry(1.5, 12, 10),
    solid(TONE.mech, { rough: 0.35 }),
  );
  hookNose.position.set(1, 0, 0);
  hookGrp.add(hookNose);

  // The live strand: finger to work point, recoloured on every colour change.
  const strandMat = new THREE.MeshStandardMaterial({ color: palette[0], roughness: 0.95 });
  const strand = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 60, 8), strandMat);
  station.add(strand);

  const finger = new THREE.Mesh(new THREE.BoxGeometry(26, 4, 4), solid(TONE.shell));
  finger.position.set(34, 14, 10);
  station.add(finger);

  /* ------------------------------------------------------------- motion -- */

  const state = { az: 0.95, el: 0.42, dist: 1 };
  let radius = 200;
  let index = 0; // stitches completed
  let phase = 0; // 0..1 within the current stitch
  let speed = opts.speed ?? 1;
  let running = false;
  let last = performance.now();
  const cycleMs = opts.cycleMs ?? 4800;

  function roundOf(i) {
    let r = 0;
    while (r + 1 < starts.length && starts[r + 1] <= i) r++;
    return r;
  }

  function apply() {
    fabric.count = Math.min(index, total);
    fabric.instanceMatrix.needsUpdate = true;

    const r = roundOf(Math.min(index, total - 1));
    const n = counts[r];
    const ring = profile[Math.min(r, profile.length - 1)];
    const jIn = Math.min(index, total - 1) - starts[r];
    const th = (2 * Math.PI * jIn) / n;

    // C: the platter turns so the next stitch arrives at the station. The
    // station itself only moves in R and Z — which is the machine's actual
    // architecture, and the reason the picture is worth showing.
    const cAngle = -th - (phase * 2 * Math.PI) / n;
    mandrel.rotation.z = cAngle;
    fabric.rotation.z = cAngle;
    platter.rotation.z = cAngle;

    // R and Z track the working ring.
    station.position.set(ring[0], 0, ring[1]);

    // W indexes one tooth per stitch.
    wheel.rotation.x = -phase * (Math.PI * 2) / 8 - (index * Math.PI * 2) / 8;

    // P: the four-phase single crochet. Plunge, yarn over, draw through two.
    // 0.00-0.30 plunge in   0.30-0.45 yarn over   0.45-0.70 draw through
    // 0.70-0.85 second yarn over   0.85-1.00 draw through two, index
    const p = phase;
    let plunge;
    if (p < 0.3) plunge = 1 - p / 0.3;
    else if (p < 0.7) plunge = 0.08;
    else plunge = Math.min(1, (p - 0.7) / 0.3);
    hookGrp.position.set(-4 + plunge * 22, 0, 0);

    // F lays yarn twice per stitch, which is what the two humps are.
    const fA = p > 0.3 && p < 0.5 ? Math.sin(((p - 0.3) / 0.2) * Math.PI) : 0;
    const fB = p > 0.7 && p < 0.9 ? Math.sin(((p - 0.7) / 0.2) * Math.PI) : 0;
    finger.rotation.z = -(fA + fB) * 0.9;

    const ci = hat.colors[Math.min(index, total - 1)] ?? 0;
    strandMat.color.copy(palette[ci] ?? palette[0]);
    strand.position.set(24, 8 - (fA + fB) * 6, 8);
    strand.rotation.z = Math.PI / 2.6;

    if (opts.onTick) {
      opts.onTick({
        index: Math.min(index, total),
        total,
        round: r + 1,
        rounds: counts.length,
        color: ci,
        speed,
        // Machine time, not animation time.
        elapsedMs: Math.min(index, total) * cycleMs,
        remainMs: Math.max(0, total - index) * cycleMs,
      });
    }
  }

  /**
   * Frame the HAT, not the machine around it. Sizing the shot from the whole
   * scene puts the platter and the station in the frame and shrinks the thing
   * the section is about to a third of the height.
   */
  function frame() {
    root.position.set(0, 0, 0);
    const b = new THREE.Box3().setFromObject(mandrel);
    const c = b.getCenter(new THREE.Vector3());
    root.position.set(-c.x, -c.y, -c.z);
    radius = Math.max(b.getSize(new THREE.Vector3()).length() / 2, 40);
  }

  function draw() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    place(camera, radius, state.az, state.el, 2.75 * state.dist);
    renderer.render(scene, camera);
  }

  // Draw on demand, not on a timer. A third WebGL context repainting 3 694
  // instanced loops sixty times a second while PAUSED is enough to make the
  // whole page unresponsive, and it buys nothing — a still image does not need
  // redrawing.
  let dirty = true;
  const invalidate = () => { dirty = true; };

  orbit(canvas, state, invalidate);
  new ResizeObserver(invalidate).observe(canvas);
  frame();
  apply();
  draw();

  let alive = true;
  (function loop(now) {
    if (!alive) return;
    requestAnimationFrame(loop);
    const t = now || performance.now();
    const dt = Math.min(200, t - last);
    last = t;
    if (running) {
      phase += (dt * speed) / cycleMs;
      while (phase >= 1) {
        phase -= 1;
        index = Math.min(total, index + 1);
        if (index >= total) {
          running = false;
          phase = 0;
          if (opts.onDone) opts.onDone();
        }
      }
      apply();
      dirty = true;
    }
    if (dirty) {
      dirty = false;
      draw();
    }
  })(performance.now());

  return {
    play() {
      running = true;
      last = performance.now();
    },
    pause() {
      running = false;
    },
    toggle() {
      running = !running;
      last = performance.now();
      return running;
    },
    get running() {
      return running;
    },
    setSpeed(v) {
      speed = v;
    },
    seek(frac) {
      index = Math.round(Math.max(0, Math.min(1, frac)) * total);
      phase = 0;
      apply();
      invalidate();
    },
    reset() {
      index = 0;
      phase = 0;
      apply();
      invalidate();
    },
    dispose() {
      alive = false;
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
