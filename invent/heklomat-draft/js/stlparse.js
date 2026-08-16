/* Binary STL → THREE.BufferGeometry */
(function (H) {
  const THREE = globalThis.THREE;
  function parseStl(buf) {
    const dv = new DataView(buf);
    const n = dv.getUint32(80, true);
    const pos = new Float32Array(n * 9);
    const nrm = new Float32Array(n * 9);
    let o = 84;
    for (let i = 0; i < n; i++) {
      const nx = dv.getFloat32(o, true);
      const ny = dv.getFloat32(o + 4, true);
      const nz = dv.getFloat32(o + 8, true);
      o += 12;
      for (let v = 0; v < 3; v++) {
        const ix = i * 9 + v * 3;
        nrm[ix] = nx;
        nrm[ix + 1] = ny;
        nrm[ix + 2] = nz;
        pos[ix] = dv.getFloat32(o, true);
        pos[ix + 1] = dv.getFloat32(o + 4, true);
        pos[ix + 2] = dv.getFloat32(o + 8, true);
        o += 12;
      }
      o += 2;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
    geo.computeBoundingBox();
    return geo;
  }
  H.parseStl = parseStl;
})(window.HEKLOMAT = window.HEKLOMAT || {});
