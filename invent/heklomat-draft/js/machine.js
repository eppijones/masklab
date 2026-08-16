/* HEKLOMAT-1 machine model — ~14 named groups, units = stitch-widths (1 su ≈ 5.8 mm). */
(function (H) {
  const THREE = globalThis.THREE;
  const SU = 1;
  const MM = 1 / 5.8;

  function mat(opts) {
    return new THREE.MeshStandardMaterial(opts);
  }

  function mesh(geo, material) {
    const m = new THREE.Mesh(geo, material);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  }

  function box(w, h, d, material) {
    return mesh(new THREE.BoxGeometry(w, h, d), material);
  }

  function cyl(rTop, rBot, h, segs, material) {
    return mesh(new THREE.CylinderGeometry(rTop, rBot, h, segs), material);
  }

  H.buildMachine = function buildMachine() {
    const petg = mat({ color: 0x3a4146, roughness: 0.45, metalness: 0.08 });
    const alu = mat({ color: 0x9aa3a8, roughness: 0.35, metalness: 0.65 });
    const black = mat({ color: 0x1a1a1a, roughness: 0.6, metalness: 0.2 });
    const steel = mat({ color: 0x8d9398, roughness: 0.25, metalness: 0.8 });
    const pla = mat({ color: 0x4a4540, roughness: 0.78, metalness: 0.08 });
    const accent = mat({ color: 0xb5522a, roughness: 0.4, metalness: 0.15 });
    const pcb = mat({ color: 0x1f4d32, roughness: 0.55, metalness: 0.1 });
    const tpu = mat({ color: 0x222226, roughness: 0.9, metalness: 0 });

    const root = new THREE.Group();
    root.name = 'heklomat';

    /* ---- base frame (2020 extrusion rectangle) ---- */
    const base = new THREE.Group();
    base.name = 'base';
    const railLen = 52;
    const railW = 42;
    const ext = 0.7;
    const longA = box(railLen, ext, ext, alu);
    longA.position.set(0, ext / 2, railW / 2);
    const longB = box(railLen, ext, ext, alu);
    longB.position.set(0, ext / 2, -railW / 2);
    const shortA = box(ext, ext, railW, alu);
    shortA.position.set(railLen / 2, ext / 2, 0);
    const shortB = box(ext, ext, railW, alu);
    shortB.position.set(-railLen / 2, ext / 2, 0);
    base.add(longA, longB, shortA, shortB);
    for (const [x, z] of [
      [-24, -19],
      [24, -19],
      [-24, 19],
      [24, 19],
    ]) {
      const foot = cyl(1.1, 1.3, 0.5, 16, tpu);
      foot.position.set(x, 0.25, z);
      base.add(foot);
    }
    const deck = box(48, 0.25, 38, petg);
    deck.position.set(0, 1.05, 0);
    base.add(deck);
    root.add(base);

    /* ---- turntable + C-axis stepper ---- */
    const turntable = new THREE.Group();
    turntable.name = 'turntable';
    const bearing = cyl(16, 16, 0.7, 48, steel);
    bearing.position.y = 1.6;
    const platter = cyl(20.7, 20.7, 0.85, 64, petg);
    platter.position.y = 2.25;
    const groove = cyl(20.2, 20.2, 0.22, 64, black);
    groove.position.y = 2.55;
    turntable.add(bearing, platter, groove);
    const cMotor = new THREE.Group();
    cMotor.name = 'motorC';
    const nema = box(4.3, 4.3, 4.3, black);
    nema.position.set(-18, 3.4, 16);
    const pulley = cyl(1.4, 1.4, 1.1, 20, alu);
    pulley.position.set(-18, 5.8, 16);
    cMotor.add(nema, pulley);
    root.add(turntable, cMotor);

    /* ---- mandrel (rebuilt per pattern) ---- */
    const mandrel = new THREE.Group();
    mandrel.name = 'mandrel';
    turntable.add(mandrel);

    /* ---- column + cross-arm ---- */
    const column = new THREE.Group();
    column.name = 'column';
    const post = box(1.4, 36, 1.4, alu);
    post.position.set(26, 19, 0);
    const brace = box(8, 0.6, 0.6, alu);
    brace.position.set(22, 4, 0);
    brace.rotation.z = -0.35;
    column.add(post, brace);
    const arm = new THREE.Group();
    arm.name = 'crossArm';
    const beam = box(22, 1.2, 1.2, alu);
    beam.position.set(16, 28, 0);
    arm.add(beam);
    column.add(arm);
    root.add(column);

    /* ---- rails + hook carriage ---- */
    const carriage = new THREE.Group();
    carriage.name = 'carriage';
    const railA = box(0.35, 10, 0.35, steel);
    railA.position.set(0, 0, 1.1);
    const railB = box(0.35, 10, 0.35, steel);
    railB.position.set(0, 0, -1.1);
    const plate = box(3.2, 2.4, 3.6, petg);
    const collet = cyl(0.55, 0.7, 1.4, 16, black);
    collet.position.set(0, -1.8, 0);
    carriage.add(railA, railB, plate, collet);
    const hook = new THREE.Group();
    hook.name = 'hook';
    const shaft = cyl(0.18, 0.18, 4.2, 10, steel);
    shaft.position.y = -3.6;
    const throat = mesh(new THREE.TorusGeometry(0.42, 0.09, 8, 16, Math.PI * 1.2), steel);
    throat.rotation.x = Math.PI / 2;
    throat.position.set(0.2, -5.7, 0);
    const tip = cyl(0.04, 0.12, 0.7, 8, steel);
    tip.position.set(0.55, -6.05, 0);
    tip.rotation.z = -1.1;
    hook.add(shaft, throat, tip);
    carriage.add(hook);
    arm.add(carriage);

    const zMotor = new THREE.Group();
    zMotor.name = 'motorZ';
    const zNema = box(3.6, 3.6, 3.6, black);
    zNema.position.set(24, 28, 3.4);
    zMotor.add(zNema);
    root.add(zMotor);

    /* ---- presentation wheel (8 latch teeth) ---- */
    const wheelArm = new THREE.Group();
    wheelArm.name = 'wheelArm';
    const wBeam = box(8, 0.7, 0.7, petg);
    wBeam.position.set(0, 0, 0);
    wheelArm.add(wBeam);
    const wheel = new THREE.Group();
    wheel.name = 'wheel';
    const hub = cyl(1.15, 1.15, 0.7, 24, petg);
    hub.rotation.x = Math.PI / 2;
    const cover = cyl(1.35, 1.35, 0.18, 24, accent);
    cover.rotation.x = Math.PI / 2;
    cover.position.z = 0.4;
    wheel.add(hub, cover);
    const latches = [];
    for (let i = 0; i < 8; i++) {
      const tooth = new THREE.Group();
      const body = box(0.22, 1.15, 0.18, steel);
      body.position.y = 1.55;
      const latch = new THREE.Group();
      latch.name = 'latch';
      const blade = box(0.08, 0.55, 0.12, steel);
      blade.position.set(0.18, 0.2, 0);
      latch.add(blade);
      latch.position.set(0, 2.05, 0);
      tooth.add(body, latch);
      const a = (i / 8) * Math.PI * 2;
      tooth.position.set(Math.sin(a) * 0.15, 0, 0);
      tooth.rotation.z = a;
      wheel.add(tooth);
      latches.push(latch);
    }
    wheel.position.set(-3.6, 0, 0);
    wheelArm.add(wheel);
    const wMotor = new THREE.Group();
    wMotor.name = 'motorW';
    const wNema = box(3.4, 3.4, 3.4, black);
    wNema.position.set(4.2, 0, 2.2);
    wMotor.add(wNema);
    wheelArm.add(wMotor);
    root.add(wheelArm);

    /* ---- yarn-over servo finger ---- */
    const finger = new THREE.Group();
    finger.name = 'finger';
    const servo = box(2.0, 1.6, 1.1, black);
    const horn = box(2.4, 0.18, 0.4, alu);
    horn.position.set(0.9, 0.2, 0);
    const pad = cyl(0.22, 0.22, 0.5, 10, accent);
    pad.rotation.z = Math.PI / 2;
    pad.position.set(2.1, 0.2, 0);
    finger.add(servo, horn, pad);
    root.add(finger);

    /* ---- 6-station carousel ---- */
    const carousel = new THREE.Group();
    carousel.name = 'carousel';
    const drum = cyl(6.9, 6.9, 1.2, 32, petg);
    drum.position.y = 0.6;
    carousel.add(drum);
    const spools = [];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const g = new THREE.Group();
      const spigot = cyl(0.45, 0.45, 2.2, 12, pla);
      spigot.position.y = 1.8;
      const spool = cyl(1.35, 1.55, 2.6, 18, mat({ color: 0x888888, roughness: 0.8 }));
      spool.position.y = 2.4;
      g.add(spigot, spool);
      g.position.set(Math.cos(a) * 5.1, 0, Math.sin(a) * 5.1);
      carousel.add(g);
      spools.push({ group: g, mesh: spool, mat: spool.material });
    }
    carousel.position.set(-22, 3.2, 14);
    root.add(carousel);

    const tension = new THREE.Group();
    tension.name = 'tension';
    const tArm = box(4.5, 0.28, 0.28, petg);
    tArm.position.set(0, 0, 0);
    const eye = cyl(0.35, 0.35, 0.2, 12, steel);
    eye.rotation.z = Math.PI / 2;
    eye.position.set(2.2, 0, 0);
    tension.add(tArm, eye);
    tension.position.set(-12, 12, 8);
    root.add(tension);

    /* ---- yarn path (Line) ---- */
    const yarnGeo = new THREE.BufferGeometry();
    yarnGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(12 * 3), 3));
    const yarnMat = new THREE.LineBasicMaterial({ color: 0xba0c2f });
    const yarnPath = new THREE.Line(yarnGeo, yarnMat);
    yarnPath.name = 'yarnPath';
    root.add(yarnPath);

    /* ---- Pi + SKR box ---- */
    const piBox = new THREE.Group();
    piBox.name = 'pi';
    const caseM = box(8.5, 3.2, 6.2, petg);
    const board = box(7.4, 0.2, 5.0, pcb);
    board.position.y = 0.6;
    const led = cyl(0.18, 0.18, 0.12, 8, mat({ color: 0x22cc66, emissive: 0x116622, emissiveIntensity: 1.4 }));
    led.rotation.x = Math.PI / 2;
    led.position.set(3.6, 1.2, 3.2);
    piBox.add(caseM, board, led);
    piBox.position.set(18, 3.2, 16);
    root.add(piBox);

    /* ---- camera pod ---- */
    const cameraPod = new THREE.Group();
    cameraPod.name = 'camera';
    const pod = box(2.4, 1.6, 2.8, petg);
    const lens = cyl(0.55, 0.7, 0.8, 16, black);
    lens.rotation.x = Math.PI / 2;
    lens.position.set(0, 0, -1.6);
    cameraPod.add(pod, lens);
    cameraPod.position.set(14, 22, 8);
    root.add(cameraPod);

    let mandrelMesh = null;

    function setMandrel(profile) {
      if (mandrelMesh) {
        mandrel.remove(mandrelMesh);
        mandrelMesh.geometry.dispose();
        mandrelMesh.material.dispose();
        mandrelMesh = null;
      }
      const pts = [new THREE.Vector2(0.05, profile[0].y + 0.3)];
      for (const ring of profile) {
        pts.push(new THREE.Vector2(Math.max(0.2, ring.r * 0.82), ring.y));
      }
      const last = profile[profile.length - 1];
      pts.push(new THREE.Vector2(last.r * 0.82 + 0.25, last.y - 0.35));
      pts.push(new THREE.Vector2(0.2, last.y - 0.35));
      const geo = new THREE.LatheGeometry(pts, 48);
      mandrelMesh = new THREE.Mesh(geo, pla.clone());
      mandrelMesh.name = 'mandrelBody';
      mandrel.add(mandrelMesh);
    }

    function setSpoolColors(hexes) {
      for (let i = 0; i < 6; i++) {
        const hex = hexes[i];
        spools[i].mat.color.set(hex || 0x6a6a6a);
        spools[i].mesh.visible = Boolean(hex);
      }
    }

    const _wp = new THREE.Vector3();
    const _c = new THREE.Color();

    function applyPose(pose) {
      turntable.rotation.y = pose.turntable;
      carriage.position.set(pose.carX, pose.carY, 0);
      hook.rotation.y = pose.hookTwist;
      hook.position.y = pose.hookPlunge;
      wheel.rotation.z = pose.wheelAng;
      for (let i = 0; i < latches.length; i++) {
        latches[i].rotation.z = pose.latchOpen;
      }
      finger.position.set(pose.fingerX, pose.fingerY, pose.fingerZ);
      finger.rotation.z = pose.fingerAng;
      carousel.rotation.y = pose.carousel;
      led.material.emissiveIntensity = pose.ledOn ? 2.2 : 0.15;
      yarnPath.visible = pose.showYarn;
      if (pose.showYarn && pose.yarnPts) {
        const arr = yarnPath.geometry.getAttribute('position').array;
        for (let i = 0; i < 12; i++) {
          const p = pose.yarnPts[Math.min(i, pose.yarnPts.length - 1)];
          arr[i * 3] = p.x;
          arr[i * 3 + 1] = p.y;
          arr[i * 3 + 2] = p.z;
        }
        yarnPath.geometry.getAttribute('position').needsUpdate = true;
        yarnPath.geometry.computeBoundingSphere();
        if (pose.yarnHex) {
          yarnMat.color.set(pose.yarnHex);
        }
      }
      wheelArm.position.set(pose.workX + 3.2, pose.workY + 1.4, 0);
      wheelArm.rotation.z = -0.15;
      cameraPod.lookAt(pose.workX, pose.workY, 0);
    }

    return {
      root,
      turntable,
      mandrel,
      carriage,
      hook,
      wheel,
      wheelArm,
      finger,
      carousel,
      yarnPath,
      cameraPod,
      setMandrel,
      setSpoolColors,
      applyPose,
    };
  };
})(window.HEKLOMAT = window.HEKLOMAT || {});
