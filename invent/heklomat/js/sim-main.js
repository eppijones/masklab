/**
 * Simulation glue: scene, camera harness (lifted from the app's proven
 * yarn-compare page), the 7-phase stitch-cycle animator, high-speed batching,
 * HUD and controls. Scene state is a pure function of clock.simTime.
 */
(() => {
  const H = (window.HEKLOMAT = window.HEKLOMAT || {});
  const THREE = window.THREE;
  H.data = window.HEKLOMAT_DATA;

  const HAT_Y = 7; // turntable (5) + hatMount (2)
  const STEP8 = (Math.PI * 2) / 8; // wheel tooth pitch
  const STEP6 = (Math.PI * 2) / 6; // carousel station pitch
  const CYCLE_ANIM_MAX_SPEED = 10;

  const $ = (id) => document.getElementById(id);
  const smooth = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));
  const win = (q, a, b) => smooth((q - a) / (b - a));
  const bell = (q, a, b) => (q <= a || q >= b ? 0 : Math.sin(((q - a) / (b - a)) * Math.PI));

  // ---- renderer / scene ---------------------------------------------------
  const canvas = $('sim-canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
  renderer.setClearColor(0xc6c2ba, 1);
  renderer.localClippingEnabled = true;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 1, 800);
  scene.add(new THREE.HemisphereLight(0xfff6e8, 0x6a6358, 1.5));
  const key = new THREE.DirectionalLight(0xfff3e2, 2.0);
  key.position.set(60, 90, 55);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xdce4f2, 0.7);
  fill.position.set(-70, 25, -45);
  scene.add(fill);

  const machine = H.machine.build(scene);
  H.machineApi = machine;
  const WP_AZ = H.machine.WP_AZ;

  // ---- camera harness -----------------------------------------------------
  const cam = { az: WP_AZ + 2.3, el: 0.34, dist: 165, tx: 0, ty: 24, tz: 0 };
  const VIEWS = {
    overview: { az: WP_AZ + 2.3, el: 0.34, dist: 165, tx: 0, ty: 24, tz: 0 },
    hook: { az: WP_AZ + 0.85, el: 0.16, dist: 46, tx: 0, ty: 0, tz: 0 }, // target tracks WP
    top: { az: WP_AZ + 2.3, el: 1.25, dist: 130, tx: 0, ty: 20, tz: 0 },
    hat: { az: WP_AZ + 2.3, el: 0.28, dist: 78, tx: 0, ty: HAT_Y + 11, tz: 0 },
  };
  let target = { ...VIEWS.overview };
  let activeView = 'overview';
  let spin = false;

  function setView(name) {
    activeView = name;
    const v = VIEWS[name];
    const twoPi = Math.PI * 2;
    let az = v.az;
    while (az - cam.az > Math.PI) az -= twoPi;
    while (cam.az - az > Math.PI) az += twoPi;
    target = { ...v, az };
    document.querySelectorAll('[data-view]').forEach((b) =>
      b.setAttribute('aria-pressed', b.dataset.view === name ? 'true' : 'false'),
    );
  }

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
    target.el = Math.max(-0.4, Math.min(1.45, cam.el + (e.clientY - ly) * 0.006));
    target.dist = cam.dist;
    cam.az = target.az;
    cam.el = target.el;
    lx = e.clientX;
    ly = e.clientY;
  });
  const stopDrag = () => {
    dragging = false;
  };
  canvas.addEventListener('pointerup', stopDrag);
  canvas.addEventListener('pointercancel', stopDrag);
  canvas.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      target.dist = cam.dist = Math.max(14, Math.min(320, cam.dist * (1 + Math.sign(e.deltaY) * 0.09)));
    },
    { passive: false },
  );

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

  // ---- state --------------------------------------------------------------
  let pattern = null;
  let hat = null;
  let clock = null;
  let finishedShown = false;
  let wheelVis = 0; // accumulated visual wheel angle at high speed

  function loadPattern(id) {
    if (hat) hat.dispose();
    pattern = H.data.patterns.find((p) => p.id === id) || H.data.patterns[0];
    hat = new H.HatGrowth(machine.hatMount, pattern, H.data.yarnHex);
    clock = new H.SimClock(hat.ex);
    clock.speed = currentSpeed;
    machine.setPalette(pattern.palette.map((y) => H.data.yarnHex[y]));
    finishedShown = false;
    wheelVis = 0;
    $('banner').classList.remove('show');
    $('hud-title').textContent = pattern.title;
    $('hud-meta').textContent =
      `${pattern.totals.rounds} rounds · ${pattern.totals.stitches} stitches · ` +
      `${pattern.totals.colorChanges} color changes · hook ${pattern.hookMm} mm · ` +
      `size ${pattern.sizeCm} cm`;
    $('hud-machine-time').textContent = clock.fmtHMS(clock.total);
    $('hud-hand-time').textContent = pattern.handTime || '—';
  }

  // ---- pose from clock ----------------------------------------------------
  function computePose(a, t, wallT, dtWall) {
    const ex = hat.ex;
    const prof = hat.profile;
    const sRef = Math.max(0, Math.min(a.s ?? 0, ex.N - 1));
    const ri = ex.roundOf(sRef);
    const ring = prof[ri];
    const colorNow = ex.colorIdx[sRef];
    const highSpeed = clock.speed > CYCLE_ANIM_MAX_SPEED;

    const pose = {
      cAngle: clock.angleAt(t),
      headY: HAT_Y + ring.y + 18.8,
      toolR: ring.r + 0.6,
      plunge: 0,
      twist: 0,
      fingerA: 0,
      wheelA: -STEP8 * (sRef % 8),
      latchOpen: 0,
      carouselA: -STEP6 * colorNow,
      activeSpool: colorNow,
      yarnColor: H.data.yarnHex[pattern.palette[colorNow]],
      yarnVisible: !highSpeed && a.stage === 'stitch',
      ledPulse: (Math.sin(wallT * 5) + 1) / 2,
    };

    if (a.stage === 'mr') {
      // Magic-ring setup: small deliberate fussing of the hook.
      pose.plunge = 0.35 + 0.3 * Math.sin(a.progress * Math.PI * 8);
      pose.toolR = prof[0].r + 0.6;
      pose.headY = HAT_Y + prof[0].y + 18.8;
      return pose;
    }

    if (a.stage === 'finish' || a.stage === 'done') {
      const lift = a.stage === 'done' ? 1 : smooth(a.progress);
      pose.headY += lift * 10;
      pose.cAngle = clock.angleAt(clock.total);
      return pose;
    }

    // stage === 'stitch'
    if (highSpeed) {
      // Canned continuous motion: honest rates, visually capped.
      const stitchRate = clock.speed / H.SimClock.SECONDS_PER_STITCH; // st/s
      const bobHz = Math.min(stitchRate, 3);
      pose.plunge = 0.5 + 0.48 * Math.sin(wallT * Math.PI * 2 * bobHz);
      const revS = Math.min(stitchRate / 8, 4);
      wheelVis -= dtWall * revS * Math.PI * 2;
      pose.wheelA = wheelVis;
      return pose;
    }

    // Full 7-phase cycle (1× and 10×).
    const s = a.s;
    const hasCol = ex.changeAfter[s] === 1;
    const mainFrac = hasCol ? 8 / 12 : 1;
    pose.wheelA = -STEP8 * (s % 8);

    if (a.phaseT < mainFrac) {
      const q = a.phaseT / mainFrac;
      // 1. wheel indexes one tooth; latch opens
      pose.wheelA = -STEP8 * ((s % 8) + win(q, 0, 0.12) - 1);
      pose.latchOpen = q < 0.86 ? win(q, 0, 0.12) : 1 - win(q, 0.86, 1);
      // 2/4/6. plunge down, half up, full up
      pose.plunge = win(q, 0.12, 0.26) - 0.45 * win(q, 0.4, 0.55) - 0.55 * win(q, 0.68, 0.86);
      // 4/6. twist to catch, untwist on pull-through
      pose.twist = (win(q, 0.4, 0.55) - win(q, 0.68, 0.86)) * 0.55;
      // 3/5. yarn-over sweeps
      pose.fingerA = -(bell(q, 0.26, 0.4) + bell(q, 0.55, 0.68)) * 2.2;
    } else {
      // COL segment: pull the new color through in the last pull-through.
      const u = (a.phaseT - mainFrac) / (1 - mainFrac);
      const from = -STEP6 * ex.colorIdx[s];
      const to = -STEP6 * ex.colorIdx[s + 1];
      pose.carouselA = from + smooth(u) * (to - from);
      pose.fingerA = -Math.sin(u * Math.PI) * 1.4;
      pose.plunge = 0.15 * Math.sin(u * Math.PI);
      if (u > 0.5) {
        const next = ex.colorIdx[s + 1];
        pose.activeSpool = next;
        pose.yarnColor = H.data.yarnHex[pattern.palette[next]];
      }
    }
    return pose;
  }

  // ---- HUD ----------------------------------------------------------------
  let lastHud = 0;
  function updateHud(a, t) {
    const ex = hat.ex;
    const sDone = clock.stitchesDone(t);
    const sRef = Math.max(0, Math.min(a.s ?? 0, ex.N - 1));
    const ri = ex.roundOf(sRef);
    const inRound = sRef - ex.roundStart[ri];
    const count = ex.roundStart[ri + 1] - ex.roundStart[ri];

    $('hud-round').textContent = `${pattern.rounds[ri].num} / ${pattern.totals.rounds}`;
    $('hud-stitch').textContent = `${Math.min(inRound + 1, count)} / ${count}`;
    $('hud-total').textContent = `${sDone} / ${ex.N}`;
    $('hud-changes').textContent = `${ex.changesBefore[Math.min(sDone, ex.N)]} / ${ex.totalChanges}`;
    $('hud-op').textContent =
      a.stage === 'mr' ? 'MR — magic ring' : a.stage === 'finish' ? 'SLST · FO' : a.stage === 'done' ? 'DONE' : ex.opLabel(a.s);
    $('hud-clock').textContent = clock.fmtHMS(t);
    $('hud-eta').textContent = clock.fmtHMS(clock.total - t);
    $('progress-fill').style.width = `${((t / clock.total) * 100).toFixed(2)}%`;
    if (!scrubbing) $('scrub').value = String(Math.round((t / clock.total) * 1000));
    $('hud-phase').textContent =
      pattern.rounds[ri].phase === 'top'
        ? 'crown (increasing)'
        : pattern.rounds[ri].phase === 'text'
          ? 'wall (colorwork)'
          : pattern.rounds[ri].phase === 'wave'
            ? 'wave brim'
            : pattern.rounds[ri].phase.startsWith('brim')
              ? 'brim'
              : pattern.rounds[ri].phase;
  }

  function showBanner() {
    $('banner-text').textContent =
      `FINISHED — ${pattern.title}: ${hat.ex.N} stitches, ` +
      `${hat.ex.totalChanges} color changes, ${clock.fmtHMS(clock.total)} at 1×.`;
    $('banner').classList.add('show');
    setView('hat');
    spin = true;
  }

  // ---- controls -----------------------------------------------------------
  let currentSpeed = 60;
  document.querySelectorAll('[data-speed]').forEach((b) => {
    b.addEventListener('click', () => {
      if (b.dataset.speed === 'end') {
        clock.simTime = clock.total;
        return;
      }
      currentSpeed = Number(b.dataset.speed);
      clock.speed = currentSpeed;
      document.querySelectorAll('[data-speed]').forEach((o) =>
        o.setAttribute('aria-pressed', o === b ? 'true' : 'false'),
      );
    });
  });
  $('btn-pause').addEventListener('click', () => {
    clock.paused = !clock.paused;
    $('btn-pause').textContent = clock.paused ? '▶' : '⏸';
    $('btn-pause').setAttribute('aria-pressed', clock.paused ? 'true' : 'false');
  });
  let scrubbing = false;
  const scrub = $('scrub');
  scrub.addEventListener('pointerdown', () => (scrubbing = true));
  scrub.addEventListener('pointerup', () => (scrubbing = false));
  scrub.addEventListener('input', () => {
    clock.simTime = (Number(scrub.value) / 1000) * clock.total;
    if (clock.simTime < clock.total) {
      finishedShown = false;
      $('banner').classList.remove('show');
    }
  });
  document.querySelectorAll('[data-view]').forEach((b) =>
    b.addEventListener('click', () => setView(b.dataset.view)),
  );
  $('btn-restart').addEventListener('click', () => {
    clock.simTime = 0;
    finishedShown = false;
    $('banner').classList.remove('show');
    setView('overview');
    spin = false;
  });
  const sel = $('sel-pattern');
  for (const p of H.data.patterns) {
    const o = document.createElement('option');
    o.value = p.id;
    o.textContent = `${p.title} — ${p.totals.stitches} sts`;
    sel.appendChild(o);
  }
  sel.value = 'norway26-black';
  sel.addEventListener('change', () => loadPattern(sel.value));

  // ---- main loop ----------------------------------------------------------
  loadPattern(sel.value);
  setView('overview');
  document.querySelector('[data-speed="60"]').setAttribute('aria-pressed', 'true');

  let lastWall = performance.now() / 1000;
  function tick() {
    const wallT = performance.now() / 1000;
    const dtWall = Math.min(0.1, wallT - lastWall);
    lastWall = wallT;

    const t = clock.tick(dtWall);
    const a = clock.at(t);

    const pose = computePose(a, t, wallT, dtWall);
    machine.setPose(pose);

    const sDone = clock.stitchesDone(t);
    const ri = hat.ex.roundOf(Math.max(0, Math.min(sDone, hat.ex.N - 1)));
    hat.setProgress(sDone, HAT_Y + hat.profile[ri].y);

    if (activeView === 'hook') {
      // Track the work point.
      const r = pose.toolR;
      target.tx = machine.U.x * r;
      target.tz = machine.U.z * r;
      target.ty = pose.headY - 17;
    }

    if (clock.done && !finishedShown) {
      finishedShown = true;
      showBanner();
    }

    if (wallT - lastHud > 0.1) {
      lastHud = wallT;
      updateHud(a, t);
    }

    if (spin) target.az += 0.0022;
    cam.az += (target.az - cam.az) * 0.09;
    cam.el += (target.el - cam.el) * 0.09;
    cam.dist += (target.dist - cam.dist) * 0.09;
    cam.tx += (target.tx - cam.tx) * 0.09;
    cam.ty += (target.ty - cam.ty) * 0.09;
    cam.tz += (target.tz - cam.tz) * 0.09;

    resize();
    // On narrow viewports, back the camera off so the whole machine stays
    // in frame (vertical FOV is fixed; horizontal shrinks with aspect).
    const aspectBoost = camera.aspect < 1 ? Math.min(2.6, 1 / camera.aspect) : 1;
    const dist = cam.dist * aspectBoost;
    const ce = Math.cos(cam.el);
    const se = Math.sin(cam.el);
    camera.position.set(
      cam.tx + dist * ce * Math.cos(cam.az),
      cam.ty + dist * se,
      cam.tz + dist * ce * Math.sin(cam.az),
    );
    camera.lookAt(cam.tx, cam.ty, cam.tz);
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  tick();
})();
