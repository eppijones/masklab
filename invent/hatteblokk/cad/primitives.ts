/**
 * Parametric geometry primitives. Millimetres, Z up.
 *
 * Everything the machine is made of is built from these, driven by the `dims` record on
 * each PartDef — so one dimension feeds the twin, the STL export, the drawings, the BOM
 * and the build manual. No CSG library is installed, so parts are modelled additively
 * and the cutaway is done with THREE.Plane clipping rather than boolean subtraction.
 */

import * as THREE from 'three';

export function box(x: number, y: number, z: number, cz = 0): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(x, y, z);
  if (cz) g.translate(0, 0, cz);
  return g;
}

/** Cylinder with its axis along Z (three's default is Y). */
export function tube(r: number, h: number, seg = 32, cz = 0): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(r, r, h, seg);
  g.rotateX(Math.PI / 2);
  if (cz) g.translate(0, 0, cz);
  return g;
}

export function cone(r0: number, r1: number, h: number, seg = 24, cz = 0): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(r1, r0, h, seg);
  g.rotateX(Math.PI / 2);
  if (cz) g.translate(0, 0, cz);
  return g;
}

/** Cylinder along X — the natural axis for the needle, plunge shaft and rollers. */
export function tubeX(r: number, len: number, seg = 20, cx = 0): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(r, r, len, seg);
  g.rotateZ(Math.PI / 2);
  if (cx) g.translate(cx, 0, 0);
  return g;
}

/**
 * Surface of revolution about Z from a (z, r) profile — how the hat former and every
 * turned part is built. Points are resampled so the lathe is smooth.
 */
export function lathe(
  profile: ReadonlyArray<{ z: number; r: number }>,
  seg = 96,
): THREE.BufferGeometry {
  const pts = profile.map((p) => new THREE.Vector2(Math.max(p.r, 0.01), p.z));
  const g = new THREE.LatheGeometry(pts, seg);
  g.rotateX(Math.PI / 2); // lathe builds around +Y; our world is Z up
  return g;
}

/** A 2020 aluminium extrusion run along Z, with the T-slot suggestion cut in as facets. */
export function extrusion2020(len: number): THREE.BufferGeometry {
  const s = new THREE.Shape();
  const a = 10;
  const n = 3.1;
  s.moveTo(-a, -a);
  s.lineTo(-n, -a);
  s.lineTo(-n, -n);
  s.lineTo(n, -n);
  s.lineTo(n, -a);
  s.lineTo(a, -a);
  s.lineTo(a, -n);
  s.lineTo(n, -n);
  s.lineTo(n, n);
  s.lineTo(a, n);
  s.lineTo(a, a);
  s.lineTo(n, a);
  s.lineTo(n, n);
  s.lineTo(-n, n);
  s.lineTo(-n, a);
  s.lineTo(-a, a);
  s.lineTo(-a, n);
  s.lineTo(-n, n);
  s.lineTo(-n, -n);
  s.lineTo(-a, -n);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: len, bevelEnabled: false });
  return g;
}

/** Printed bracket plate with bevelled edges — bevelEnabled is our poor-man's fillet. */
export function plate(x: number, y: number, t: number): THREE.BufferGeometry {
  const s = new THREE.Shape();
  const r = Math.min(4, x / 4, y / 4);
  s.moveTo(-x / 2 + r, -y / 2);
  s.lineTo(x / 2 - r, -y / 2);
  s.quadraticCurveTo(x / 2, -y / 2, x / 2, -y / 2 + r);
  s.lineTo(x / 2, y / 2 - r);
  s.quadraticCurveTo(x / 2, y / 2, x / 2 - r, y / 2);
  s.lineTo(-x / 2 + r, y / 2);
  s.quadraticCurveTo(-x / 2, y / 2, -x / 2, y / 2 - r);
  s.lineTo(-x / 2, -y / 2 + r);
  s.quadraticCurveTo(-x / 2, -y / 2, -x / 2 + r, -y / 2);
  const g = new THREE.ExtrudeGeometry(s, {
    depth: t - 0.8,
    bevelEnabled: true,
    bevelSize: 0.4,
    bevelThickness: 0.4,
    bevelSegments: 1,
  });
  g.translate(0, 0, -t / 2);
  return g;
}

/** NEMA17-style stepper body: 42 mm square, shaft along +Z. */
export function stepper(len = 40, shaft = 20): THREE.BufferGeometry {
  const parts = [box(42, 42, len, len / 2), tube(2.5, shaft, 16, len + shaft / 2), tube(11, 2, 20, len + 1)];
  return merge(parts);
}

export function torusZ(r: number, tubeR: number, seg = 48): THREE.BufferGeometry {
  return new THREE.TorusGeometry(r, tubeR, 10, seg);
}

export function merge(gs: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const nonIndexed = gs.map((g) => (g.index ? g.toNonIndexed() : g));
  const attrNames = ['position', 'normal', 'uv'];
  const total: Record<string, number[]> = { position: [], normal: [], uv: [] };
  for (const g of nonIndexed) {
    for (const name of attrNames) {
      const a = g.getAttribute(name);
      if (!a) continue;
      const arr = a.array as ArrayLike<number>;
      for (let i = 0; i < arr.length; i++) total[name].push(arr[i]);
    }
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(total.position, 3));
  if (total.normal.length) out.setAttribute('normal', new THREE.Float32BufferAttribute(total.normal, 3));
  if (total.uv.length) out.setAttribute('uv', new THREE.Float32BufferAttribute(total.uv, 2));
  out.computeBoundingBox();
  out.computeBoundingSphere();
  return out;
}

/** Translate/rotate a geometry in place, degrees. */
export function place(
  g: THREE.BufferGeometry,
  pos: [number, number, number],
  rotDeg: [number, number, number] = [0, 0, 0],
): THREE.BufferGeometry {
  const d = Math.PI / 180;
  if (rotDeg[0]) g.rotateX(rotDeg[0] * d);
  if (rotDeg[1]) g.rotateY(rotDeg[1] * d);
  if (rotDeg[2]) g.rotateZ(rotDeg[2] * d);
  g.translate(pos[0], pos[1], pos[2]);
  return g;
}
