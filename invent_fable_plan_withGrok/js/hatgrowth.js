/* Growing hat: instanced stitches + clipped fabric shell. */
(function (H) {
  const THREE = globalThis.THREE;

  function hexColor(hex) {
    return new THREE.Color(hex);
  }

  function createHatGrowth(prog, profile, yarnHex) {
    const stitchGeo = H.makeStitchGeometry();
    const xf = H.buildStitchTransforms(prog.rounds, prog.stitches, profile);
    const N = prog.N;
    const mat = new THREE.MeshStandardMaterial({
      roughness: 0.86,
      metalness: 0,
    });
    const mesh = new THREE.InstancedMesh(stitchGeo, mat, N);
    mesh.frustumCulled = false;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.renderOrder = 2;
    const m = new THREE.Matrix4();
    const sc = new THREE.Vector3(1, 1, 1);
    const colors = new Float32Array(N * 3);
    const c = new THREE.Color();
    for (let i = 0; i < N; i++) {
      m.compose(xf[i].position, xf[i].quaternion, sc);
      mesh.setMatrixAt(i, m);
      c.set(yarnHex[prog.palette[prog.colorIdx[i]]] || '#cccccc');
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.instanceColor = new THREE.InstancedBufferAttribute(colors, 3);
    mesh.instanceColor.needsUpdate = true;
    mesh.count = 0;

    const shellGeo = H.makeGhostGeometry(profile);
    const clipPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const shellMat = new THREE.MeshStandardMaterial({
      color: 0x2b2723,
      roughness: 1,
      metalness: 0,
      side: THREE.DoubleSide,
      clippingPlanes: [clipPlane],
    });
    const shell = new THREE.Mesh(shellGeo, shellMat);
    shell.scale.set(0.955, 1, 0.955);
    shell.renderOrder = 0;

    const group = new THREE.Group();
    group.name = 'hat';
    group.add(shell);
    group.add(mesh);

    function setCompleted(s, roundIdx) {
      mesh.count = Math.max(0, Math.min(N, s));
      const ring = profile[Math.max(0, Math.min(profile.length - 1, roundIdx))];
      clipPlane.constant = -(ring.y - H.STITCH_H * 0.15);
    }

    function dispose() {
      stitchGeo.dispose();
      shellGeo.dispose();
      mat.dispose();
      shellMat.dispose();
    }

    return { group, mesh, shell, clipPlane, xf, setCompleted, dispose };
  }

  H.createHatGrowth = createHatGrowth;
})(window.HEKLOMAT = window.HEKLOMAT || {});
