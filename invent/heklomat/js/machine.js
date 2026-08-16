/**
 * The HEKLOMAT-1 machine as named THREE primitive groups, in stitch units
 * (1 su ≈ 5.6 mm). Pure geometry — no time logic. sim-main.js computes a pose
 * from the clock each frame and calls setPose().
 *
 * Machine axes (matching the patent):
 *   C  turntable rotation            R  toolhead radial position
 *   Z  head height                   P  hook plunge   T  hook twist
 *   W  presentation-wheel rotation   F  yarn-over finger sweep
 *   K  carousel station
 *
 * Classic script; publishes window.HEKLOMAT.machine. Requires window.THREE.
 */
(() => {
  const NS = (window.HEKLOMAT = window.HEKLOMAT || {});
  const WP_AZ = 0.85; // work-point azimuth = THETA_OFFSET in hatmath.js

  function build(scene) {
    const THREE = window.THREE;
    const U = new THREE.Vector3(Math.cos(WP_AZ), 0, Math.sin(WP_AZ)); // radial →WP
    const V = new THREE.Vector3(-Math.sin(WP_AZ), 0, Math.cos(WP_AZ)); // tangent

    // ---- materials --------------------------------------------------------
    const mFrame = new THREE.MeshStandardMaterial({ color: 0x3a3f45, roughness: 0.55, metalness: 0.6 });
    const mAlu = new THREE.MeshStandardMaterial({ color: 0xb9bec6, roughness: 0.4, metalness: 0.75 });
    const mPetg = new THREE.MeshStandardMaterial({ color: 0xe2661e, roughness: 0.55, metalness: 0.05 });
    const mPetgDark = new THREE.MeshStandardMaterial({ color: 0x9c460f, roughness: 0.6, metalness: 0.05 });
    const mSteel = new THREE.MeshStandardMaterial({ color: 0xd0d4da, roughness: 0.3, metalness: 0.9 });
    const mBlack = new THREE.MeshStandardMaterial({ color: 0x17181c, roughness: 0.7, metalness: 0.2 });
    const mMandrel = new THREE.MeshStandardMaterial({ color: 0xece5d6, roughness: 0.8, metalness: 0 });
    const mLed = new THREE.MeshStandardMaterial({ color: 0x1c281c, emissive: 0x2fd04a, emissiveIntensity: 0 });

    const box = (w, h, d, mat) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    const cyl = (rT, rB, h, mat, seg = 32) =>
      new THREE.Mesh(new THREE.CylinderGeometry(rT, rB, h, seg), mat);

    const root = new THREE.Group();
    root.name = 'heklomat';
    scene.add(root);

    // ---- 1. base frame (2020 extrusion square, 88×88) ---------------------
    const frame = new THREE.Group();
    frame.name = 'frame';
    for (const [x, z, horiz] of [
      [0, -44, true],
      [0, 44, true],
      [-44, 0, false],
      [44, 0, false],
    ]) {
      const rail = horiz ? box(92, 3.5, 3.5, mFrame) : box(3.5, 3.5, 85, mFrame);
      rail.position.set(x, 1.75, z);
      frame.add(rail);
    }
    for (const [x, z] of [[-44, -44], [-44, 44], [44, -44], [44, 44]]) {
      const foot = box(5, 4.6, 5, mPetgDark);
      foot.position.set(x, 2.3, z);
      frame.add(foot);
    }
    root.add(frame);

    // ---- 2. turntable (C axis) -------------------------------------------
    const pedestal = cyl(7, 8.5, 5, mFrame);
    pedestal.position.y = 2.5;
    root.add(pedestal);

    const turntable = new THREE.Group();
    turntable.name = 'turntable';
    turntable.position.y = 5;
    const platter = cyl(26, 26, 2, mPetg, 64);
    platter.position.y = 1;
    turntable.add(platter);
    // GT2 ring groove suggestion: darker band under the rim.
    const ringBelt = new THREE.Mesh(new THREE.TorusGeometry(25.2, 0.55, 8, 64), mBlack);
    ringBelt.rotation.x = Math.PI / 2;
    ringBelt.position.y = 0.4;
    turntable.add(ringBelt);
    for (let k = 0; k < 8; k++) {
      const stud = cyl(0.5, 0.5, 0.6, mSteel, 12);
      const a = (k / 8) * Math.PI * 2;
      stud.position.set(Math.cos(a) * 22, 2.3, Math.sin(a) * 22);
      turntable.add(stud);
    }
    // Mount point for mandrel + fabric (hatgrowth.js parents its objects here).
    const hatMount = new THREE.Group();
    hatMount.name = 'hatMount';
    hatMount.position.y = 2;
    turntable.add(hatMount);
    root.add(turntable);

    // C-axis stepper + belt run to the platter rim.
    const cStepper = box(5.2, 5.2, 5.2, mBlack);
    cStepper.position.set(-33, 2.6, 8);
    root.add(cStepper);
    const cPulley = cyl(1.2, 1.2, 1.4, mAlu, 16);
    cPulley.position.set(-33, 5.9, 8);
    root.add(cPulley);

    // ---- 3. column + head (Z axis) ---------------------------------------
    const colPos = U.clone().multiplyScalar(44);
    const column = box(6, 58, 6, mFrame);
    column.position.set(colPos.x, 29, colPos.z);
    column.lookAt(new THREE.Vector3(0, 29, 0)); // face the center
    root.add(column);
    const zStepper = box(5, 5, 5, mBlack);
    zStepper.position.set(colPos.x, 60.5, colPos.z);
    root.add(zStepper);

    const COLUMN_R = 44; // head sits at this radius; +Z_local points at the hat axis
    const head = new THREE.Group();
    head.name = 'head';
    head.position.copy(colPos); // y set per frame
    // lookAt puts local +Z toward the target, so +Z_local = inward (radial).
    head.lookAt(new THREE.Vector3(0, 0, 0).setY(head.position.y));
    root.add(head);

    // Cross-arm reaching from the column in over the turntable (local +z).
    const arm = box(5, 4.5, 46, mFrame);
    arm.position.set(0, 0, 21);
    head.add(arm);
    // Radial rail on the arm's underside.
    const radRail = box(1.4, 0.8, 44, mAlu);
    radRail.position.set(0, -2.6, 21);
    head.add(radRail);

    // ---- 4. toolhead (R axis carriage on the arm) -------------------------
    const tool = new THREE.Group();
    tool.name = 'tool';
    head.add(tool); // local z set per frame (-toolR)

    const toolBody = box(7, 5, 6, mPetg);
    toolBody.position.y = -1;
    tool.add(toolBody);

    // Hook carriage: vertical mini-rails + plunging block.
    for (const dx of [-2.2, 2.2]) {
      const mini = cyl(0.35, 0.35, 12, mSteel, 10);
      mini.position.set(dx, -7.5, 0);
      tool.add(mini);
    }
    const hookCarriage = new THREE.Group();
    hookCarriage.name = 'hookCarriage';
    hookCarriage.position.y = -6; // plunge offset added per frame
    tool.add(hookCarriage);
    const carriageBlock = box(6, 3, 4, mPetg);
    hookCarriage.add(carriageBlock);

    // The hook itself: collet + shaft + a bent tip.
    const collet = cyl(0.9, 1.1, 1.8, mPetgDark, 16);
    collet.position.y = -2.2;
    hookCarriage.add(collet);
    const hook = new THREE.Group();
    hook.name = 'hook';
    hook.position.y = -2.8;
    hookCarriage.add(hook);
    const shaft = cyl(0.32, 0.32, 7.5, mAlu, 12);
    shaft.position.y = -3.75;
    hook.add(shaft);
    const tip = new THREE.Mesh(
      new THREE.TorusGeometry(0.55, 0.28, 8, 12, Math.PI * 1.25),
      mAlu,
    );
    tip.position.y = -7.6;
    tip.rotation.z = Math.PI * 0.15;
    hook.add(tip);

    // ---- 5. presentation wheel (the invention) ----------------------------
    // Axis radial (local z of head); teeth sweep tangentially along the
    // fabric's top edge just upstream of the hook.
    const wheelArm = box(1.8, 8, 1.6, mPetgDark);
    wheelArm.position.set(-4.2, -6, 0);
    tool.add(wheelArm);
    const wheel = new THREE.Group();
    wheel.name = 'wheel';
    wheel.position.set(-4.2, -10.3, 0);
    tool.add(wheel);
    const wheelCore = cyl(2.2, 2.2, 1.5, mPetg, 24);
    wheelCore.rotation.x = Math.PI / 2; // axis along local z (radial)
    wheel.add(wheelCore);
    const latches = [];
    for (let k = 0; k < 8; k++) {
      const toothG = new THREE.Group();
      const a = (k / 8) * Math.PI * 2;
      toothG.rotation.z = a;
      const tooth = box(0.5, 1.9, 0.42, mSteel);
      tooth.position.y = 2.9;
      toothG.add(tooth);
      const latch = box(0.32, 1.1, 0.3, mSteel);
      latch.position.set(0.28, 3.15, 0);
      latch.rotation.z = -0.35; // closed pose; opened per frame
      toothG.add(latch);
      latches.push(latch);
      wheel.add(toothG);
    }

    // ---- 6. yarn-over finger (servo F) ------------------------------------
    const servo = box(2.2, 1.9, 1.6, mBlack);
    servo.position.set(3.8, -3.2, -1);
    tool.add(servo);
    const finger = new THREE.Group();
    finger.name = 'finger';
    finger.position.set(3.8, -4.2, -1);
    tool.add(finger);
    const fingerArm = cyl(0.18, 0.18, 4.6, mSteel, 8);
    fingerArm.position.y = -2.3;
    finger.add(fingerArm);
    const fingerTipMesh = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.14, 6, 10), mSteel);
    fingerTipMesh.position.y = -4.6;
    finger.add(fingerTipMesh);

    // ---- 7. yarn carousel (K axis) ----------------------------------------
    const carPos = U.clone().multiplyScalar(-36).add(V.clone().multiplyScalar(-14));
    const carPost = cyl(2.4, 3, 8, mFrame);
    carPost.position.set(carPos.x, 4, carPos.z);
    root.add(carPost);
    const kStepper = box(4.6, 4.6, 4.6, mBlack);
    kStepper.position.set(carPos.x + 5.5, 2.3, carPos.z);
    root.add(kStepper);

    const carousel = new THREE.Group();
    carousel.name = 'carousel';
    carousel.position.set(carPos.x, 8, carPos.z);
    root.add(carousel);
    const drum = cyl(10, 10, 3, mPetg, 48);
    carousel.add(drum);
    const spools = [];
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      const spigot = cyl(0.5, 0.5, 6.5, mPetgDark, 10);
      spigot.position.set(Math.cos(a) * 6.5, 4.5, Math.sin(a) * 6.5);
      carousel.add(spigot);
      const spool = cyl(2.3, 2.3, 4.6, new THREE.MeshStandardMaterial({ color: 0x8a8578, roughness: 0.85 }), 20);
      spool.position.set(Math.cos(a) * 6.5, 4.2, Math.sin(a) * 6.5);
      carousel.add(spool);
      spools.push(spool);
    }

    // Tension arm + eyelet post between carousel and head.
    const eyePos = U.clone().multiplyScalar(-6).add(V.clone().multiplyScalar(-26));
    const eyePost = cyl(0.5, 0.5, 26, mFrame, 10);
    eyePost.position.set(eyePos.x, 13, eyePos.z);
    root.add(eyePost);
    const tensionArm = new THREE.Group();
    tensionArm.name = 'tensionArm';
    tensionArm.position.set(eyePos.x, 25, eyePos.z);
    const tArm = cyl(0.22, 0.22, 7, mSteel, 8);
    tArm.position.y = 2.2;
    tArm.rotation.z = 0.5;
    tensionArm.add(tArm);
    const tEye = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.14, 6, 10), mSteel);
    tEye.position.set(2.1, 4.6, 0);
    tensionArm.add(tEye);
    root.add(tensionArm);
    const tensionTip = new THREE.Vector3(eyePos.x + 2.1, 29.6, eyePos.z);

    // ---- 8. electronics ---------------------------------------------------
    const pi = box(8, 2.2, 5.5, mBlack);
    pi.position.set(38, 4.2, -32);
    root.add(pi);
    const led = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.4, 0.7), mLed);
    led.position.set(41.2, 5.5, -30);
    root.add(led);
    const psu = box(9, 4, 5, mFrame);
    psu.position.set(30, 4, -38);
    root.add(psu);

    // Camera QC pod on a stalk from the head, aimed at the work point.
    const camStalk = cyl(0.35, 0.35, 6, mFrame, 8);
    camStalk.position.set(4.6, -5.5, 3.2);
    camStalk.rotation.x = -0.5;
    tool.add(camStalk);
    const camPod = box(2, 2, 2.4, mBlack);
    camPod.position.set(4.6, -8.3, 4.8);
    camPod.rotation.x = -0.7; // aimed down at the work point
    tool.add(camPod);
    const camLens = cyl(0.5, 0.5, 0.9, mSteel, 14);
    camLens.position.set(4.6, -9.4, 3.9);
    camLens.rotation.x = -0.7 + Math.PI / 2;
    tool.add(camLens);

    // ---- 9. yarn line -----------------------------------------------------
    const yarnGeo = new THREE.BufferGeometry();
    yarnGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(5 * 3), 3));
    const yarnMat = new THREE.LineBasicMaterial({ color: 0xba0c2f });
    const yarnLine = new THREE.Line(yarnGeo, yarnMat);
    yarnLine.frustumCulled = false;
    root.add(yarnLine);

    // ---- floor ------------------------------------------------------------
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(90, 64),
      new THREE.MeshStandardMaterial({ color: 0xa9a49a, roughness: 1 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.05;
    root.add(floor);

    // ---- pose application -------------------------------------------------
    const api = {
      root,
      turntable,
      hatMount,
      head,
      tool,
      hookCarriage,
      hook,
      wheel,
      latches,
      finger,
      carousel,
      spools,
      yarnLine,
      yarnMat,
      led: mLed,
      mandrelMaterial: mMandrel,
      U,
      V,
      WP_AZ,

      /** Color the first palette.length spools; the rest read as empty. */
      setPalette(hexes) {
        spools.forEach((sp, i) => {
          sp.material.color.set(i < hexes.length ? hexes[i] : 0x8a8578);
          sp.material.needsUpdate = true;
        });
      },

      /**
       * pose = { cAngle, headY, toolR, plunge (0..1), twist (rad),
       *          fingerA (rad), wheelA (rad), latchOpen (0..1),
       *          carouselA (rad), yarnColor, yarnVisible, ledPulse (0..1) }
       */
      setPose(pose) {
        turntable.rotation.y = pose.cAngle;
        head.position.y = pose.headY;
        // pose.toolR is measured from the hat axis; the head sits at COLUMN_R.
        tool.position.z = COLUMN_R - pose.toolR;
        hookCarriage.position.y = -6 - pose.plunge * 3.2;
        hook.rotation.y = pose.twist;
        finger.rotation.z = pose.fingerA;
        wheel.rotation.z = pose.wheelA;
        for (const l of latches) l.rotation.z = -0.35 + pose.latchOpen * 0.85;
        carousel.rotation.y = pose.carouselA;
        mLed.emissiveIntensity = 0.25 + pose.ledPulse * 1.6;
        yarnLine.visible = pose.yarnVisible;
        if (pose.yarnColor) yarnMat.color.set(pose.yarnColor);
        if (pose.yarnVisible) {
          // spool → tension eye → head → finger tip → hook tip
          const p = yarnGeo.attributes.position.array;
          const active = pose.activeSpool ?? 0;
          const sp = spools[Math.min(active, spools.length - 1)];
          const a = new THREE.Vector3();
          sp.getWorldPosition(a);
          a.y += 2.6;
          const b = tensionTip;
          const c = new THREE.Vector3();
          tool.getWorldPosition(c);
          c.y += 2.4;
          const d = new THREE.Vector3();
          finger.getWorldPosition(d);
          d.y -= 4.4;
          const e = new THREE.Vector3();
          hook.getWorldPosition(e);
          e.y -= 7.6;
          [a, b, c, d, e].forEach((v, i) => {
            p[i * 3] = v.x;
            p[i * 3 + 1] = v.y;
            p[i * 3 + 2] = v.z;
          });
          yarnGeo.attributes.position.needsUpdate = true;
        }
      },
    };

    return api;
  }

  NS.machine = { build, WP_AZ };
})();
