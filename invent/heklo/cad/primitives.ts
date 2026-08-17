/**
 * Additive millimetre primitives. Z up. No CSG — cutaway is a clip plane.
 */

import * as THREE from 'three';

export function box(x: number, y: number, z: number, cz = 0): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(x, y, z);
  if (cz) g.translate(0, 0, cz);
  return g;
}

export function rodZ(r: number, h: number, seg = 24, cz = 0): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(r, r, h, seg);
  g.rotateX(Math.PI / 2);
  if (cz) g.translate(0, 0, cz);
  return g;
}

export function rodX(r: number, len: number, seg = 16, cx = 0): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(r, r, len, seg);
  g.rotateZ(Math.PI / 2);
  if (cx) g.translate(cx, 0, 0);
  return g;
}

export function rodY(r: number, len: number, seg = 16, cy = 0): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(r, r, len, seg);
  if (cy) g.translate(0, cy, 0);
  return g;
}

export function coneZ(r0: number, r1: number, h: number, seg = 20, cz = 0): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(r1, r0, h, seg);
  g.rotateX(Math.PI / 2);
  if (cz) g.translate(0, 0, cz);
  return g;
}

export function torusZ(r: number, tube: number, seg = 48): THREE.BufferGeometry {
  const g = new THREE.TorusGeometry(r, tube, 10, seg);
  return g;
}

export function hexPlate(r: number, t: number): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, { depth: t, bevelEnabled: false });
  return g;
}

/** U-shaped stitch gate, opening along +X (station-facing when at 0°). */
export function gateClip(w = 5.4, d = 7.2, h = 9.5, thick = 1.3): THREE.BufferGeometry {
  const parts = [
    box(thick, d, h),
    box(w, d, thick, -h / 2 + thick / 2),
    box(w, d, thick, h / 2 - thick / 2),
  ];
  parts[0].translate(-w / 2 + thick / 2, 0, 0);
  const geo = merge(parts);
  geo.translate(w * 0.15, 0, 0);
  return geo;
}

export function stepper(size = 42, len = 40): THREE.BufferGeometry {
  return merge([box(size, size, len, 0), rodZ(2.5, 22, 12, len / 2 + 11)]);
}

export function merge(geoms: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const merged = new THREE.BufferGeometry();
  const pos: number[] = [];
  const nrm: number[] = [];
  for (const g of geoms) {
    if (!g.getAttribute('normal')) g.computeVertexNormals();
    const p = g.getAttribute('position');
    const n = g.getAttribute('normal');
    for (let i = 0; i < p.count; i++) {
      pos.push(p.getX(i), p.getY(i), p.getZ(i));
      nrm.push(n.getX(i), n.getY(i), n.getZ(i));
    }
  }
  merged.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  merged.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  return merged;
}

export function place(
  g: THREE.BufferGeometry,
  pos: [number, number, number],
  rotDeg: [number, number, number] = [0, 0, 0],
): THREE.BufferGeometry {
  const c = g.clone();
  const e = new THREE.Euler(
    (rotDeg[0] * Math.PI) / 180,
    (rotDeg[1] * Math.PI) / 180,
    (rotDeg[2] * Math.PI) / 180,
  );
  c.rotateX(e.x);
  c.rotateY(e.y);
  c.rotateZ(e.z);
  c.translate(pos[0], pos[1], pos[2]);
  return c;
}
