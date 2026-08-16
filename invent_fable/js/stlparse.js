/**
 * Minimal binary-STL → THREE.BufferGeometry parser. The viewer loads the very
 * same files you print, so what you see is what Bambu Studio gets.
 * Classic script; publishes window.HEKLOMAT.parseSTL.
 */
(() => {
  const NS = (window.HEKLOMAT = window.HEKLOMAT || {});

  NS.parseSTL = function parseSTL(arrayBuffer) {
    const THREE = window.THREE;
    const dv = new DataView(arrayBuffer);
    const tris = dv.getUint32(80, true);
    const pos = new Float32Array(tris * 9);
    let o = 84;
    for (let t = 0; t < tris; t++) {
      o += 12; // skip stored normal — recomputed below
      for (let k = 0; k < 9; k++) {
        pos[t * 9 + k] = dv.getFloat32(o, true);
        o += 4;
      }
      o += 2; // attribute byte count
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.computeVertexNormals(); // non-indexed → flat facets, print-preview look
    return geo;
  };
})();
