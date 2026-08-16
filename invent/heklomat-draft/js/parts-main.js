/* Single shared STL viewer + part cards. */
(function () {
  const THREE = globalThis.THREE;
  const H = window.HEKLOMAT;
  const DATA = window.HEKLOMAT_PARTS;
  const err = document.getElementById('err');
  const meta = document.getElementById('meta');
  const list = document.getElementById('list');
  const canvas = document.getElementById('cv');
  if (!THREE || !DATA) {
    err.hidden = false;
    err.textContent = 'Missing THREE or HEKLOMAT_PARTS';
    return;
  }

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
  renderer.setClearColor(0xc9c3b6, 1);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.5, 800);
  scene.add(new THREE.HemisphereLight(0xfff6e8, 0x5a554c, 1.2));
  const key = new THREE.DirectionalLight(0xffffff, 1.4);
  key.position.set(80, 120, 60);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xdde4f0, 0.5);
  fill.position.set(-60, 20, -40);
  scene.add(fill);
  const grid = new THREE.GridHelper(240, 12, 0x8a8376, 0xc2b9a8);
  scene.add(grid);

  let mesh = null;
  const cam = { az: 0.7, el: 0.45, dist: 180, ty: 20 };
  let target = { ...cam };
  const CENTER = new THREE.Vector3(0, 0, 0);

  function resize() {
    const r = canvas.getBoundingClientRect();
    const w = Math.max(1, Math.round(r.width));
    const h = Math.max(1, Math.round(r.height));
    if (canvas.width !== w * renderer.getPixelRatio() || canvas.height !== h * renderer.getPixelRatio()) {
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
  }

  function showPart(part) {
    document.querySelectorAll('.part-card').forEach((c) => {
      c.setAttribute('aria-selected', c.dataset.id === part.id ? 'true' : 'false');
    });
    meta.textContent =
      part.nameEn +
      ' · ' +
      part.bbox.join(' × ') +
      ' mm · ' +
      part.grams +
      ' g · ' +
      part.material +
      ' · ~' +
      part.minutes +
      ' min';
    fetch('stl/' + part.file)
      .then((r) => {
        if (!r.ok) throw new Error('STL ' + part.file + ' ' + r.status);
        return r.arrayBuffer();
      })
      .then((buf) => {
        const geo = H.parseStl(buf);
        if (mesh) {
          scene.remove(mesh);
          mesh.geometry.dispose();
          mesh.material.dispose();
        }
        const mat = new THREE.MeshStandardMaterial({
          color: part.material === 'TPU' ? 0x2a2a2e : part.material === 'PLA' ? 0xe8dcc4 : 0x4a585c,
          roughness: 0.55,
          metalness: 0.05,
        });
        mesh = new THREE.Mesh(geo, mat);
        const bb = geo.boundingBox;
        const cx = (bb.min.x + bb.max.x) / 2;
        const cy = (bb.min.y + bb.max.y) / 2;
        const cz = (bb.min.z + bb.max.z) / 2;
        mesh.position.set(-cx, -cz, -cy);
        mesh.rotation.x = -Math.PI / 2;
        scene.add(mesh);
        const size = Math.max(bb.max.x - bb.min.x, bb.max.y - bb.min.y, bb.max.z - bb.min.z);
        target.dist = cam.dist = Math.max(40, size * 2.2);
        target.ty = cam.ty = size * 0.15;
      })
      .catch((e) => {
        err.hidden = false;
        err.textContent = String(e);
        console.error(e);
      });
  }

  const fil = DATA.filamentG;
  document.getElementById('fil').textContent =
    'Print plan: PETG ~' + fil.petg + ' g · PLA ~' + fil.pla + ' g · TPU ~' + fil.tpu + ' g  ·  Bambu Lab X1 Carbon Combo';

  for (const p of DATA.parts) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'part-card';
    card.dataset.id = p.id;
    card.innerHTML =
      '<strong>' +
      p.nameEn +
      '</strong><div class="note">' +
      p.nameNo +
      '</div><div class="meta">qty ' +
      p.qty +
      ' · ' +
      p.bbox.join('×') +
      ' mm · ' +
      p.grams +
      ' g · ' +
      p.material +
      (p.support ? ' · supports' : '') +
      '</div><div class="note">' +
      p.notes +
      '</div><a href="stl/' +
      p.file +
      '" download>Download ' +
      p.file +
      '</a>';
    card.addEventListener('click', (e) => {
      if (e.target.tagName === 'A') return;
      showPart(p);
    });
    list.appendChild(card);
  }

  let dragging = false;
  let lx = 0;
  let ly = 0;
  canvas.addEventListener('pointerdown', (e) => {
    dragging = true;
    lx = e.clientX;
    ly = e.clientY;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    target.az = cam.az - (e.clientX - lx) * 0.01;
    target.el = Math.max(0.05, Math.min(1.4, cam.el + (e.clientY - ly) * 0.007));
    cam.az = target.az;
    cam.el = target.el;
    lx = e.clientX;
    ly = e.clientY;
  });
  const stop = () => {
    dragging = false;
  };
  canvas.addEventListener('pointerup', stop);
  canvas.addEventListener('pointercancel', stop);
  canvas.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      target.dist = cam.dist = Math.max(20, Math.min(400, cam.dist * (1 + Math.sign(e.deltaY) * 0.09)));
    },
    { passive: false },
  );

  function tick() {
    cam.az += (target.az - cam.az) * 0.12;
    cam.el += (target.el - cam.el) * 0.12;
    cam.dist += (target.dist - cam.dist) * 0.12;
    cam.ty += (target.ty - cam.ty) * 0.12;
    resize();
    const ce = Math.cos(cam.el);
    const se = Math.sin(cam.el);
    camera.position.set(cam.dist * ce * Math.cos(cam.az), cam.ty + cam.dist * se, cam.dist * ce * Math.sin(cam.az));
    CENTER.set(0, cam.ty, 0);
    camera.lookAt(CENTER);
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  tick();
  showPart(DATA.parts[0]);
})();
