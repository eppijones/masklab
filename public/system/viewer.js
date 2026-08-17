/**
 * HEKLO 3D viewer.
 *
 * Loads the same binary STL files the download buttons serve, so what you see
 * is byte-for-byte what goes to the printer. Placement comes from
 * assembly.json, computed from the machine's own frame chain.
 *
 * ONE WebGL context does all the thumbnails. Browsers cap live contexts at
 * around sixteen and this page wants forty-eight, so the parts gallery and the
 * step strip are drawn by a single offscreen renderer and blitted into ordinary
 * 2D canvases. Only the hero and the click-through modal hold a context.
 */

import * as THREE from './vendor/three.module.js';

const INK = 0x201d18;
const RED = 0xba0c2f;
const PART = 0xd7cdb5;
const GHOST = 0xe8e0cd;

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
  scene.add(new THREE.HemisphereLight(0xfffaf0, 0x968c78, 1.45));
  const key = new THREE.DirectionalLight(0xffffff, 2.1);
  key.position.set(1, 0.75, 1.5);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xd2dbe8, 0.75);
  fill.position.set(-1.2, -0.35, -0.9);
  scene.add(fill);
}

const matPart = () =>
  new THREE.MeshStandardMaterial({ color: PART, roughness: 0.6, metalness: 0.03, flatShading: true });
const matNew = () =>
  new THREE.MeshStandardMaterial({ color: RED, roughness: 0.5, metalness: 0.04, flatShading: true });
const matGhost = () =>
  new THREE.MeshStandardMaterial({
    color: GHOST,
    roughness: 0.95,
    transparent: true,
    opacity: 0.25,
    flatShading: true,
  });

function withEdges(geo, material, angle = 32) {
  const g = new THREE.Group();
  const mesh = new THREE.Mesh(geo, material);
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(geo, angle),
    new THREE.LineBasicMaterial({ color: INK, transparent: true, opacity: 0.22 }),
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

/* -------------------------------------------------- shared thumb renderer - */

let shared = null;

/**
 * One context, TWO scenes. The context is the scarce resource; scenes are
 * cheap. Keeping the parts scene and the assembly scene both resident means
 * alternating between a part card and a step card is a camera change, not a
 * rebuild of 61 instances and their edge geometry.
 */
function sharedRenderer() {
  if (shared) return shared;
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 640;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(1);
  renderer.setSize(640, 640, false);

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
  const camera = new THREE.PerspectiveCamera(36, 1, 0.5, 8000);
  shared = { canvas, renderer, camera, part, asm };
  return shared;
}

/** Size the shared render to the target's shape, so wide cards are not
 *  letterboxed into a square and half the card left empty. */
function fitShared(target) {
  const sh = sharedRenderer();
  const w = target.clientWidth || 240;
  const h = target.clientHeight || 240;
  const long = 660;
  const rw = w >= h ? long : Math.round((long * w) / h);
  const rh = w >= h ? Math.round((long * h) / w) : long;
  if (sh.canvas.width !== rw || sh.canvas.height !== rh) {
    sh.renderer.setSize(rw, rh, false);
  }
  sh.camera.aspect = rw / rh;
  return sh;
}

function blit(target, source) {
  const dpr = Math.min(devicePixelRatio, 2);
  target.width = Math.round((target.clientWidth || 240) * dpr);
  target.height = Math.round((target.clientHeight || 240) * dpr);
  const ctx = target.getContext('2d');
  ctx.clearRect(0, 0, target.width, target.height);
  ctx.drawImage(source, 0, 0, target.width, target.height);
}

/** Static three-quarter view of one part. */
export async function thumbPart(target, file) {
  const geo = await loadSTL(file);
  const sh = fitShared(target);
  const { root, scene } = sh.part;
  root.clear();
  root.position.set(0, 0, 0);

  const g = withEdges(geo, matPart());
  const c = geo.boundingBox.getCenter(new THREE.Vector3());
  g.position.set(-c.x, -c.y, -c.z);
  root.add(g);

  place(sh.camera, geo.boundingSphere.radius, 0.85, 0.52, 3.4);
  sh.renderer.render(scene, sh.camera);
  blit(target, sh.canvas);
}

/**
 * Prepare the assembly ONCE in the shared context, then draw any step by
 * swapping materials. Rebuilding 61 instances (and their edge geometry) for
 * each of 24 steps is roughly fifteen hundred EdgesGeometry builds and takes
 * long enough to watch; this is two dozen renders instead.
 */
export async function prepareSteps(data) {
  const sh = sharedRenderer();
  const { root, scene } = sh.asm;
  if (root.children.length) return sh.asm.draw; // already built
  root.position.set(0, 0, 0);

  const items = [];
  for (const inst of data.instances) {
    const geo = await loadSTL(`${inst.partId}.stl`);
    const g = withEdges(geo, matPart(), 34);
    g.matrixAutoUpdate = false;
    g.matrix.fromArray(inst.m);
    g.updateMatrixWorld(true);
    root.add(g);
    items.push({ id: inst.partId, g });
  }

  const mPart = matPart();
  const mNew = matNew();
  const mGhost = matGhost();

  const draw = async function drawStep(target, n) {
    const step = data.steps.find((s) => s.n === n);
    const track = step ? step.track : 'station';

    const built = new Set();
    const added = new Set();
    // Ghosts are limited to the SAME track. During a Station step, ghosting the
    // 240 mm mandrel puts a huge translucent drum in the shot and shrinks the
    // thing the step is actually about.
    const relevant = new Set();
    for (const s of data.steps) {
      if (s.track === track) s.parts.forEach((p) => relevant.add(p));
      if (s.n < n) s.parts.forEach((p) => built.add(p));
      else if (s.n === n) s.parts.forEach((p) => added.add(p));
    }
    // Steps that add no printed part — wiring, testing — still need a picture:
    // show everything standing at that point.
    const showAll = added.size === 0;

    const focus = new THREE.Box3();
    let any = false;
    root.position.set(0, 0, 0);

    for (const it of items) {
      const isNew = added.has(it.id);
      const isBuilt = built.has(it.id);
      it.g.visible = isNew || isBuilt || relevant.has(it.id);
      it.g.userData.mesh.material = isNew ? mNew : isBuilt ? mPart : mGhost;
      it.g.userData.edges.visible = isNew || isBuilt;
      if (isNew || isBuilt || (showAll && it.g.visible)) {
        focus.expandByObject(it.g);
        any = true;
      }
    }

    const s2 = fitShared(target);
    if (any) {
      const c = focus.getCenter(new THREE.Vector3());
      root.position.set(-c.x, -c.y, -c.z);
    }
    const radius = any ? Math.max(focus.getSize(new THREE.Vector3()).length() / 2, 25) : 120;

    place(s2.camera, radius, 0.92, 0.46, 2.6);
    s2.renderer.render(scene, s2.camera);
    blit(target, s2.canvas);
    root.position.set(0, 0, 0);
  };

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
      state.dist = Math.max(0.4, Math.min(3, state.dist * (1 + Math.sign(e.deltaY) * 0.12)));
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
  const camera = new THREE.PerspectiveCamera(36, 1, 0.5, 8000);
  return { renderer, scene, root, camera };
}

/** Interactive single part — the click-through modal. */
export async function livePart(canvas, file) {
  const geo = await loadSTL(file);
  const { renderer, scene, root, camera } = liveScene(canvas);
  const g = withEdges(geo, matPart());
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

/** Interactive assembly — the hero. */
export async function liveAssembly(canvas, data) {
  const { renderer, scene, root, camera } = liveScene(canvas);
  const groups = new Map();

  for (const inst of data.instances) {
    const geo = await loadSTL(`${inst.partId}.stl`);
    const g = withEdges(geo, matPart(), 34);
    g.matrixAutoUpdate = false;
    g.matrix.fromArray(inst.m);
    g.updateMatrixWorld(true);
    root.add(g);
    if (!groups.has(inst.partId)) groups.set(inst.partId, []);
    groups.get(inst.partId).push(g);
  }

  const state = { az: 0.92, el: 0.44, dist: 1 };
  let radius = 200;

  /**
   * Frame only what is visible. Framing the whole bounding box would size the
   * shot around the mandrel even when the view is the bench rig, leaving the
   * subject small and off to one side.
   */
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
    radius = Math.max(b.getSize(new THREE.Vector3()).length() / 2, 25);
  }

  function draw() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    place(camera, radius, state.az, state.el, 2.15 * state.dist);
    renderer.render(scene, camera);
  }

  function showTrack(track) {
    const keep = new Set();
    for (const s of data.steps) {
      if (track === 'all' || s.track === track) s.parts.forEach((p) => keep.add(p));
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
  canvas.addEventListener('pointerdown', () => (spin = false));
  (function loop() {
    if (spin) {
      state.az += 0.0028;
      draw();
    }
    requestAnimationFrame(loop);
  })();

  frameVisible();
  draw();
  return { draw, showTrack };
}
