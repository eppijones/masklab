/**
 * Parts catalog: card list + ONE shared WebGL viewer (browsers cap live WebGL
 * contexts, so 21 canvases is not an option). Clicking a card fetches its STL
 * — the same file you download and print.
 */
(() => {
  const H = (window.HEKLOMAT = window.HEKLOMAT || {});
  const THREE = window.THREE;
  const DATA = window.HEKLOMAT_PARTS;
  const $ = (id) => document.getElementById(id);

  const MAT_COLOR = { PETG: 0xe2661e, PLA: 0x6e86c0, TPU: 0x2b2723 };

  // ---- viewer -------------------------------------------------------------
  const canvas = $('part-canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
  renderer.setClearColor(0xc6c2ba, 1);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.5, 2000);
  scene.add(new THREE.HemisphereLight(0xfff6e8, 0x6a6358, 1.4));
  const key = new THREE.DirectionalLight(0xfff3e2, 1.9);
  key.position.set(60, 90, 55);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xdce4f2, 0.6);
  fill.position.set(-70, 25, -45);
  scene.add(fill);
  // Build-plate grid for scale.
  const plate = new THREE.Mesh(
    new THREE.BoxGeometry(256, 1.5, 256),
    new THREE.MeshStandardMaterial({ color: 0x8f8b82, roughness: 0.95 }),
  );
  plate.position.y = -0.8;
  scene.add(plate);
  const grid = new THREE.GridHelper(256, 16, 0x6b675f, 0xa39e93);
  grid.position.y = 0.01;
  scene.add(grid);

  let mesh = null;
  const material = new THREE.MeshStandardMaterial({ color: 0xe2661e, roughness: 0.6, metalness: 0.05 });

  const cam = { az: 0.8, el: 0.42, dist: 260, ty: 30 };
  let target = { ...cam };
  let spin = true;

  let dragging = false, lx = 0, ly = 0;
  canvas.addEventListener('pointerdown', (e) => {
    dragging = true; lx = e.clientX; ly = e.clientY;
    canvas.setPointerCapture(e.pointerId);
    spin = false;
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    target.az = cam.az - (e.clientX - lx) * 0.008;
    target.el = Math.max(-0.2, Math.min(1.45, cam.el + (e.clientY - ly) * 0.006));
    cam.az = target.az; cam.el = target.el;
    lx = e.clientX; ly = e.clientY;
  });
  const stop = () => (dragging = false);
  canvas.addEventListener('pointerup', stop);
  canvas.addEventListener('pointercancel', stop);
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    target.dist = cam.dist = Math.max(30, Math.min(900, cam.dist * (1 + Math.sign(e.deltaY) * 0.09)));
  }, { passive: false });

  async function show(part) {
    const res = await fetch(`stl/${part.file}.stl`);
    const geo = H.parseSTL(await res.arrayBuffer());
    if (mesh) {
      scene.remove(mesh);
      mesh.geometry.dispose();
    }
    // Center on the plate: X/Z centered, Z-up STL → Y-up scene.
    geo.computeBoundingBox();
    const bb = geo.boundingBox;
    const cx = (bb.min.x + bb.max.x) / 2;
    const cy = (bb.min.y + bb.max.y) / 2;
    geo.translate(-cx, -cy, -bb.min.z);
    geo.rotateX(-Math.PI / 2);
    material.color.set(MAT_COLOR[part.material] || 0xe2661e);
    mesh = new THREE.Mesh(geo, material);
    scene.add(mesh);
    const size = Math.max(part.bbox[0], part.bbox[1], part.bbox[2]);
    target.dist = Math.max(90, size * 2.6);
    target.ty = part.bbox[2] / 2 + 8;
    spin = true;

    $('v-name').textContent = `${part.nameEn} · ${part.nameNo}`;
    $('v-dims').textContent =
      `${part.bbox[0]} × ${part.bbox[1]} × ${part.bbox[2]} mm · ${part.tris} triangles · ` +
      `~${part.grams} g ${part.material}`;
    const dl = $('v-download');
    dl.href = `stl/${part.file}.stl`;
    dl.download = `${part.file}.stl`;
    document.querySelectorAll('.part-card').forEach((c) =>
      c.classList.toggle('active', c.dataset.file === part.file),
    );
  }

  // ---- cards --------------------------------------------------------------
  const list = $('part-list');
  for (const p of DATA.parts) {
    const card = document.createElement('button');
    card.className = 'part-card';
    card.dataset.file = p.file;
    card.innerHTML =
      `<span class="pc-name">${p.nameEn}</span>` +
      `<span class="pc-no">${p.nameNo}</span>` +
      `<span class="pc-specs">${p.qty}× · ${p.material} · ${p.bbox[0]}×${p.bbox[1]}×${p.bbox[2]} mm · ~${p.grams} g · ~${Math.round(p.timeMin / 60 * 10) / 10} h</span>` +
      `<span class="pc-print">${p.layer} mm / ${p.walls} walls / ${p.infill}% ${p.supports ? '· supports' : ''}</span>`;
    card.addEventListener('click', () => show(p));
    list.appendChild(card);
  }
  $('parts-summary').textContent =
    `${DATA.parts.length} printable parts for the ${DATA.printer} · ` +
    `filament: ${DATA.totals.PETG} g PETG · ${DATA.totals.PLA} g PLA · ${DATA.totals.TPU} g TPU`;

  show(DATA.parts[0]);

  // ---- loop ---------------------------------------------------------------
  function resize() {
    const r = canvas.getBoundingClientRect();
    const w = Math.max(1, Math.round(r.width));
    const h = Math.max(1, Math.round(r.height));
    const pr = renderer.getPixelRatio();
    if (canvas.width !== w * pr || canvas.height !== h * pr) {
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
  }
  function tick() {
    if (spin) target.az += 0.004;
    cam.az += (target.az - cam.az) * 0.09;
    cam.el += (target.el - cam.el) * 0.09;
    cam.dist += (target.dist - cam.dist) * 0.09;
    cam.ty += (target.ty - cam.ty) * 0.09;
    resize();
    const ce = Math.cos(cam.el), se = Math.sin(cam.el);
    camera.position.set(cam.dist * ce * Math.cos(cam.az), cam.ty + cam.dist * se, cam.dist * ce * Math.sin(cam.az));
    camera.lookAt(0, cam.ty, 0);
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  tick();
})();
