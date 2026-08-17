/* HEKLOMAT-1 simulation glue: 7-phase stitch cycle, HUD, presets, finish. */
(function () {
  const THREE = globalThis.THREE;
  const H = window.HEKLOMAT;
  const DATA = window.HEKLOMAT_DATA;
  const errEl = document.getElementById('err');
  function fail(e) {
    errEl.hidden = false;
    errEl.textContent = (e && e.stack) || String(e);
    console.error(e);
  }
  try {
    if (!THREE) throw new Error('THREE missing');
    if (!DATA) throw new Error('HEKLOMAT_DATA missing');

    const canvas = document.getElementById('cv');
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    renderer.setClearColor(0x2c2924, 1);
    renderer.localClippingEnabled = true;
    renderer.shadowMap.enabled = false;
    if (THREE.ACESFilmicToneMapping) renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.2, 400);
    scene.add(new THREE.HemisphereLight(0xfff4e8, 0x4a453c, 1.35));
    const key = new THREE.DirectionalLight(0xfff3e2, 2.15);
    key.position.set(28, 48, 36);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xdce4f2, 0.85);
    fill.position.set(-36, 18, -24);
    scene.add(fill);
    const rim = new THREE.DirectionalLight(0xffe8c8, 0.55);
    rim.position.set(8, 12, -40);
    scene.add(rim);
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(48, 48),
      new THREE.MeshStandardMaterial({ color: 0x2a2622, roughness: 1 }),
    );
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    const machine = H.buildMachine();
    scene.add(machine.root);

    const FRONT_AZ = 0.82;
    const VIEWS = {
      overview: { az: FRONT_AZ + 0.45, el: 0.36, dist: 52, ty: 14 },
      hook: { az: 0.12, el: 0.1, dist: 16, ty: 17 },
      top: { az: FRONT_AZ, el: 1.12, dist: 48, ty: 18 },
      hat: { az: FRONT_AZ, el: 0.22, dist: 42, ty: 12 },
    };
    const cam = { az: VIEWS.overview.az, el: VIEWS.overview.el, dist: VIEWS.overview.dist, tx: 0, ty: VIEWS.overview.ty };
    let target = { ...VIEWS.overview };
    let spin = false;

    const sel = document.getElementById('pattern');
    for (const p of DATA.patterns) {
      const o = document.createElement('option');
      o.value = p.id;
      o.textContent = p.titleNo + ' / ' + p.title;
      sel.appendChild(o);
    }
    const prefer = DATA.patterns.find((p) => p.id === 'norway26-training') || DATA.patterns[0];
    sel.value = prefer.id;

    let prog, clock, hat, profile, yarnHexes;
    let simTime = 0;
    let speed = 1;
    let paused = false;
    let finished = false;
    let lastTs = performance.now();
    let changesDone = 0;

    const $ = (id) => document.getElementById(id);
    const roundEl = $('round');
    const stitchEl = $('stitch');
    const totalEl = $('total');
    const colsEl = $('cols');
    const clockEl = $('clock');
    const etaEl = $('eta');
    const opEl = $('op');
    const bar = $('bar');
    const scrub = $('scrub');
    const banner = $('banner');
    const bannerBody = $('bannerBody');
    const bannerTitle = $('bannerTitle');

    function ease(a, b, t) {
      t = t * t * (3 - 2 * t);
      return a + (b - a) * t;
    }
    function smooth01(t) {
      t = Math.min(1, Math.max(0, t));
      return t * t * (3 - 2 * t);
    }
    function seg(t, a, b) {
      if (b <= a) return t >= b ? 1 : 0;
      return smooth01((t - a) / (b - a));
    }

    function loadPattern(id) {
      const raw = DATA.patterns.find((p) => p.id === id);
      if (!raw) throw new Error('unknown pattern ' + id);
      if (hat) {
        machine.turntable.remove(hat.group);
        hat.dispose();
      }
      prog = H.expand(raw);
      clock = H.buildClock(prog);
      profile = H.buildProfile(prog.rounds);
      hat = H.createHatGrowth(prog, profile, DATA.yarnHex);
      machine.turntable.add(hat.group);
      machine.setMandrel(profile);
      yarnHexes = prog.palette.map((c) => DATA.yarnHex[c]);
      machine.setSpoolColors(yarnHexes);
      simTime = 0;
      finished = false;
      banner.classList.remove('show');
      spin = false;
      target = { ...VIEWS.overview };
      document.querySelectorAll('[data-view]').forEach((b) => {
        b.classList.toggle('active', b.dataset.view === 'overview');
      });
      etaEl.innerHTML = 'ETA at 1× <span>' + H.formatDuration(clock.total) + '</span>';
      totalEl.innerHTML = 'Total <span>0/' + prog.N + '</span>';
    }

    function phasePose(at, xf) {
      const { s, phaseT, kind } = at;
      const N = prog.N;
      const hi = speed > 10;
      const workS = Math.min(N - 1, s);
      const xfNow = xf[workS];
      const ring = profile[prog.roundOf[workS]];
      const workX = ring.r + 1.8;
      const workY = ring.y + 1.2;
      const turn = kind === 'done' || kind === 'finish' ? clock.angBase[N - 1] : clock.angBase[workS];
      const stitchTheta = xfNow.theta;
      let turntable = -stitchTheta;
      let wheelAng = -(workS * (Math.PI * 2)) / 8;
      let latchOpen = 0;
      let hookPlunge = 0;
      let hookTwist = 0;
      let fingerAng = 0;
      let carY = 0;
      const yarnHex = DATA.yarnHex[prog.palette[prog.colorIdx[workS]]];
      const activeSpool = prog.colorIdx[workS] % 6;
      let carousel = -(activeSpool / 6) * Math.PI * 2;

      if (kind === 'mr') {
        hookPlunge = -0.4 + phaseT * 0.2;
        wheelAng = phaseT * 0.4;
      } else if (kind === 'col') {
        const from = (prog.colorIdx[Math.max(0, s - 1)] % 6) / 6;
        const to = (prog.colorIdx[s] % 6) / 6;
        carousel = -ease(from, to, phaseT) * Math.PI * 2;
        fingerAng = Math.sin(phaseT * Math.PI) * 0.9;
      } else if (kind === 'stitch' && !hi) {
        const t = phaseT;
        // (a) wheel index + latch opens 0–0.12
        const idx = seg(t, 0, 0.12);
        if (!prog.isInc[s]) wheelAng -= (idx * Math.PI * 2) / 8;
        latchOpen = seg(t, 0.02, 0.12) * 0.9 * (1 - seg(t, 0.86, 0.98));
        // (b) plunge 0.12–0.28
        hookPlunge = -seg(t, 0.12, 0.28) * 2.4;
        // (c) yarn-over 0.28–0.40
        fingerAng = seg(t, 0.28, 0.40) * 1.15 * (1 - seg(t, 0.40, 0.48));
        // (d) lift + twist 0.40–0.55
        hookPlunge += seg(t, 0.40, 0.55) * 1.5;
        hookTwist = seg(t, 0.42, 0.55) * 0.7;
        // (e) second yarn-over 0.55–0.68
        fingerAng += seg(t, 0.55, 0.68) * 1.05 * (1 - seg(t, 0.68, 0.76));
        // (f) lift 0.68–0.82
        hookPlunge += seg(t, 0.68, 0.82) * 1.1;
        hookTwist *= 1 - seg(t, 0.7, 0.82);
        // (g) turntable ease + release 0.82–1.0
        const adv = seg(t, 0.82, 1);
        if (!prog.isInc[Math.min(N - 1, s + 1)]) {
          const nextS = Math.min(N - 1, s + 1);
          turntable = ease(-xf[s].theta, -xf[nextS].theta, adv);
        }
        latchOpen *= 1 - adv;
      } else if (kind === 'stitch' && hi) {
        hookPlunge = Math.sin(simTime * 14) * 0.35;
        wheelAng = -(s * Math.PI * 2) / 8 - phaseT * (Math.PI * 2) / 8;
        turntable = -xfNow.theta;
      } else if (kind === 'finish' || kind === 'done') {
        hookPlunge = 0.4;
        latchOpen = 0;
      }

      const spool = machine.carousel.children[activeSpool + 1];
      const yarnPts = [
        new THREE.Vector3(-22, 6.5, 14),
        new THREE.Vector3(-12, 12, 8),
        new THREE.Vector3(workX + 1.2, workY + 2.2, 1.4),
        new THREE.Vector3(workX, workY + 0.4, 0.2),
      ];
      if (spool && spool.position) {
        yarnPts[0] = new THREE.Vector3(-22 + spool.position.x * 0.2, 6.5, 14);
      }

      return {
        turntable,
        carX: 8.5 - ring.r * 0.15,
        carY,
        hookPlunge,
        hookTwist,
        wheelAng,
        latchOpen,
        fingerX: workX + 2.4,
        fingerY: workY + 2.6,
        fingerZ: 1.6,
        fingerAng,
        carousel,
        ledOn: Math.sin(simTime * 7) > 0,
        showYarn: speed <= 10 && kind !== 'done',
        yarnPts,
        yarnHex,
        workX,
        workY,
      };
    }

    function hud(at) {
      const N = prog.N;
      const s = Math.min(N, at.s);
      const ri = s >= N ? prog.rounds.length - 1 : prog.roundOf[Math.min(N - 1, s)];
      const round = prog.rounds[ri];
      const i = s >= N ? round.count : prog.iInRound[Math.min(N - 1, s)] + 1;
      roundEl.innerHTML = 'Round <span>' + round.num + '/' + prog.rounds.length + '</span>';
      stitchEl.innerHTML = 'Stitch <span>' + i + '/' + round.count + '</span>';
      totalEl.innerHTML = 'Total <span>' + s + '/' + N + '</span>';
      changesDone = 0;
      for (let k = 0; k < s; k++) if (prog.changeAfter[k]) changesDone++;
      colsEl.innerHTML = 'Color changes <span>' + changesDone + '/' + prog.colorChanges + '</span>';
      clockEl.innerHTML = 'Elapsed <span>' + H.formatDuration(simTime) + '</span>';
      opEl.textContent = prog.opLabel(Math.min(N - 1, s), at.kind);
      const pct = Math.min(1, simTime / clock.total);
      bar.style.width = (pct * 100).toFixed(2) + '%';
      if (!scrub._dragging) scrub.value = String(Math.round(pct * 1000));
    }

    function apply(at) {
      const completed = at.kind === 'stitch' || at.kind === 'col' ? at.s : at.s;
      const doneCount = at.kind === 'finish' || at.kind === 'done' ? prog.N : at.s;
      const ri = Math.min(prog.rounds.length - 1, at.s >= prog.N ? prog.rounds.length - 1 : prog.roundOf[Math.min(prog.N - 1, at.s)]);
      hat.setCompleted(doneCount, ri);
      machine.applyPose(phasePose(at, hat.xf));
      hud(at);
      if ((at.kind === 'done' || at.kind === 'finish') && at.kind === 'done' && !finished) {
        finished = true;
        spin = true;
        target = { ...VIEWS.hat };
        document.querySelectorAll('[data-view]').forEach((b) => {
          b.classList.toggle('active', b.dataset.view === 'hat');
        });
        bannerTitle.textContent = 'FINISHED — ' + prog.title;
        bannerBody.textContent =
          prog.N +
          ' stitches, ' +
          prog.colorChanges +
          ' color changes, ' +
          H.formatDuration(clock.total) +
          ' at 1×';
        banner.classList.add('show');
      }
      if (at.kind !== 'done' && finished) {
        finished = false;
        banner.classList.remove('show');
      }
    }

    loadPattern(sel.value);

    sel.addEventListener('change', () => {
      loadPattern(sel.value);
    });
    document.querySelectorAll('[data-speed]').forEach((b) => {
      b.addEventListener('click', () => {
        speed = Number(b.dataset.speed);
        document.querySelectorAll('[data-speed]').forEach((o) => o.classList.toggle('active', o === b));
      });
    });
    $('end').addEventListener('click', () => {
      simTime = clock.total;
    });
    $('pause').addEventListener('click', () => {
      paused = !paused;
      $('pause').setAttribute('aria-pressed', paused ? 'true' : 'false');
      $('pause').textContent = paused ? 'Play' : 'Pause';
    });
    $('restart').addEventListener('click', () => {
      simTime = 0;
      finished = false;
      banner.classList.remove('show');
      spin = false;
    });
    scrub.addEventListener('pointerdown', () => {
      scrub._dragging = true;
    });
    const endDrag = () => {
      scrub._dragging = false;
    };
    scrub.addEventListener('pointerup', endDrag);
    scrub.addEventListener('pointercancel', endDrag);
    scrub.addEventListener('input', () => {
      simTime = (Number(scrub.value) / 1000) * clock.total;
      paused = true;
      $('pause').setAttribute('aria-pressed', 'true');
      $('pause').textContent = 'Play';
    });
    document.querySelectorAll('[data-view]').forEach((b) => {
      b.addEventListener('click', () => {
        document.querySelectorAll('[data-view]').forEach((o) => o.classList.toggle('active', o === b));
        const v = VIEWS[b.dataset.view];
        let az = v.az;
        const twoPi = Math.PI * 2;
        while (az - cam.az > Math.PI) az -= twoPi;
        while (cam.az - az > Math.PI) az += twoPi;
        target = { ...v, az };
        spin = false;
      });
    });

    let dragging = false;
    let lx = 0;
    let ly = 0;
    canvas.addEventListener('pointerdown', (e) => {
      dragging = true;
      lx = e.clientX;
      ly = e.clientY;
      canvas.setPointerCapture(e.pointerId);
      spin = false;
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      target.az = cam.az - (e.clientX - lx) * 0.008;
      target.el = Math.max(-0.2, Math.min(1.45, cam.el + (e.clientY - ly) * 0.006));
      target.dist = cam.dist;
      target.ty = cam.ty;
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
        target.dist = cam.dist = Math.max(12, Math.min(160, cam.dist * (1 + Math.sign(e.deltaY) * 0.09)));
      },
      { passive: false },
    );

    const CENTER = new THREE.Vector3(0, 14, 0);
    const stage = document.getElementById('stage');
    function resize() {
      const r = stage.getBoundingClientRect();
      const w = Math.max(1, Math.round(r.width));
      const h = Math.max(1, Math.round(r.height));
      const pr = renderer.getPixelRatio();
      if (canvas.width !== Math.round(w * pr) || canvas.height !== Math.round(h * pr)) {
        renderer.setSize(w, h, false);
        canvas.style.width = w + 'px';
        canvas.style.height = h + 'px';
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      }
    }

    function tick(now) {
      const dt = Math.min(0.08, (now - lastTs) / 1000);
      lastTs = now;
      if (!paused) simTime = Math.min(clock.total, simTime + dt * speed);
      const at = clock.stitchAt(simTime);
      apply(at);
      if (spin) target.az += 0.0022;
      cam.az += (target.az - cam.az) * 0.09;
      cam.el += (target.el - cam.el) * 0.09;
      cam.dist += (target.dist - cam.dist) * 0.09;
      cam.ty += (target.ty - cam.ty) * 0.09;
      if (at.kind === 'stitch' || at.kind === 'col') {
        const ring = profile[prog.roundOf[Math.min(prog.N - 1, at.s)]];
        if (document.querySelector('[data-view="hook"]').classList.contains('active')) {
          target.ty = ring.y + 2;
        }
      }
      resize();
      const ce = Math.cos(cam.el);
      const se = Math.sin(cam.el);
      camera.position.set(
        cam.tx + cam.dist * ce * Math.cos(cam.az),
        cam.ty + cam.dist * se,
        cam.tx + cam.dist * ce * Math.sin(cam.az),
      );
      CENTER.set(0, cam.ty, 0);
      camera.lookAt(CENTER);
      renderer.render(scene, camera);
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  } catch (e) {
    fail(e);
  }
})();
