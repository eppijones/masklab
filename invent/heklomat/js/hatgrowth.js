/**
 * The growing hat: one InstancedMesh with a per-instance color attribute
 * (one instance per stitch, in working order — growth is literally
 * `mesh.count = stitchesDone`), a dark backing shell revealed by a world-space
 * clipping plane at the current working edge, and the printed mandrel it all
 * forms around.
 *
 * Classic script; publishes window.HEKLOMAT.HatGrowth. Requires THREE,
 * hatmath, opcode.
 */
(() => {
  const NS = (window.HEKLOMAT = window.HEKLOMAT || {});

  class HatGrowth {
    /**
     * @param mount    parent group (machine.hatMount — rotates with C axis)
     * @param pattern  one entry of HEKLOMAT_DATA.patterns
     * @param yarnHex  HEKLOMAT_DATA.yarnHex
     */
    constructor(mount, pattern, yarnHex) {
      const THREE = window.THREE;
      const hm = NS.hatmath;
      this.mount = mount;

      this.ex = NS.opcode.expandPattern(pattern);
      this.profile = hm.buildProfile(pattern.rounds);
      const tr = hm.buildTransforms(pattern.rounds, this.ex, this.profile);

      // ---- stitches -------------------------------------------------------
      this.stitchGeo = hm.makeStitchGeometry();
      this.stitchMat = new THREE.MeshStandardMaterial({ roughness: 0.86, metalness: 0 });
      const mesh = new THREE.InstancedMesh(this.stitchGeo, this.stitchMat, this.ex.N);
      const m = new THREE.Matrix4();
      const p = new THREE.Vector3();
      const q = new THREE.Quaternion();
      const sc = new THREE.Vector3(1, 1, 1);
      for (let i = 0; i < this.ex.N; i++) {
        p.set(tr.pos[i * 3], tr.pos[i * 3 + 1], tr.pos[i * 3 + 2]);
        q.set(tr.quat[i * 4], tr.quat[i * 4 + 1], tr.quat[i * 4 + 2], tr.quat[i * 4 + 3]);
        m.compose(p, q, sc);
        mesh.setMatrixAt(i, m);
      }
      mesh.instanceMatrix.needsUpdate = true;

      const colors = new Float32Array(this.ex.N * 3);
      const c = new THREE.Color();
      for (let i = 0; i < this.ex.N; i++) {
        c.set(yarnHex[pattern.palette[this.ex.colorIdx[i]]] || '#888888');
        colors[i * 3] = c.r;
        colors[i * 3 + 1] = c.g;
        colors[i * 3 + 2] = c.b;
      }
      mesh.instanceColor = new THREE.InstancedBufferAttribute(colors, 3);
      mesh.count = 0;
      mesh.frustumCulled = false;
      this.mesh = mesh;
      mount.add(mesh);

      // ---- backing shell (revealed by clipping plane) ---------------------
      this.clipPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      this.shellGeo = hm.makeShellGeometry(this.profile);
      this.shellMat = new THREE.MeshStandardMaterial({
        color: 0x2b2723,
        roughness: 1,
        side: THREE.DoubleSide,
        clippingPlanes: [this.clipPlane],
      });
      this.shell = new THREE.Mesh(this.shellGeo, this.shellMat);
      this.shell.scale.set(0.955, 1, 0.955);
      mount.add(this.shell);

      // ---- printed mandrel (always fully visible) -------------------------
      this.mandrelGeo = hm.makeShellGeometry(this.profile);
      this.mandrel = new THREE.Mesh(this.mandrelGeo, NS.machineApi ? NS.machineApi.mandrelMaterial : new THREE.MeshStandardMaterial({ color: 0xece5d6, roughness: 0.8 }));
      this.mandrel.scale.set(0.92, 0.995, 0.92);
      mount.add(this.mandrel);
    }

    /** ringYWorld = world-space y of the current working edge. */
    setProgress(stitchesDone, ringYWorld) {
      this.mesh.count = stitchesDone;
      // Keep shell only where fabric already exists: y >= ringYWorld.
      this.clipPlane.constant = -ringYWorld;
      if (stitchesDone <= 0) this.clipPlane.constant = -1e6; // fully hidden
      if (stitchesDone >= this.ex.N) this.clipPlane.constant = 1e6; // fully shown
    }

    dispose() {
      this.mount.remove(this.mesh, this.shell, this.mandrel);
      this.stitchGeo.dispose();
      this.stitchMat.dispose();
      this.shellGeo.dispose();
      this.shellMat.dispose();
      this.mandrelGeo.dispose();
      this.mesh.dispose();
    }
  }

  NS.HatGrowth = HatGrowth;
})();
