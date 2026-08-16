/**
 * Solid IR -> manifold-3d. Node only; never imported by the browser bundle.
 *
 * manifold-3d is a WASM CSG kernel with real booleans, and it guarantees
 * 2-manifold output by construction. That guarantee is why the STL gate can be
 * strict: if a part fails `closed`, the cause is almost always a subtract whose
 * tool never actually touched the base, not a kernel bug.
 *
 * This file is the ONLY place radians appear.
 */

import type { Pt2, Section, Solid } from './solid.ts';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Any = any;

/**
 * The kernel is INJECTED, not imported.
 *
 * manifold-3d is installed only in invent_v1/tools/node_modules, but this file
 * lives in invent_v1/cad/ — so a bare `import 'manifold-3d'` here resolves
 * upward from cad/ and never finds it. Taking the module factory as an
 * argument keeps cad/ free of any dependency on where the kernel is installed,
 * which also means the harness can evaluate solids without the toolchain
 * present.
 */
export type ManifoldModuleFactory = () => Promise<Any>;

let wasm: Any = null;

export async function initKernel(factory: ManifoldModuleFactory): Promise<void> {
  if (wasm) return;
  wasm = await factory();
  wasm.setup();
}

function kernel(): Any {
  if (!wasm) throw new Error('call initKernel() before evaluating');
  return wasm;
}

/* ---------------------------------------------------------------- 2D ------ */

/** Shoelace winding fix — manifold wants CCW outer loops. */
function ccw(pts: readonly Pt2[]): Pt2[] {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % pts.length];
    a += x1 * y2 - x2 * y1;
  }
  return a < 0 ? [...pts].reverse() : [...pts];
}

function evalSection(s: Section): Any {
  const { CrossSection } = kernel();

  switch (s.op) {
    case 'circle':
      return CrossSection.circle(s.r, s.seg);
    case 'rect':
      return CrossSection.square([s.size[0], s.size[1]], s.center);
    case 'poly':
      return new CrossSection([ccw(s.pts).map(([x, y]) => [x, y])], 'Positive');
    case 'union2':
      return s.children.map(evalSection).reduce((a: Any, b: Any) => a.add(b));
    case 'subtract2':
      return s.tools.map(evalSection).reduce((a: Any, b: Any) => a.subtract(b), evalSection(s.base));
    case 'intersect2':
      return s.children.map(evalSection).reduce((a: Any, b: Any) => a.intersect(b));
    case 'hull2':
      return CrossSection.hull(s.children.map(evalSection));
    case 'offset2':
      // simplify() after an offset chain, or the vertex count explodes and
      // every downstream boolean gets slower for no visual gain.
      return evalSection(s.child).offset(s.delta, s.join, 2.0, s.seg).simplify(1e-4);
    case 'at2': {
      let g = evalSection(s.child);
      if (s.rDeg) g = g.rotate(s.rDeg);
      if (s.t) g = g.translate(s.t as unknown as number[]);
      return g;
    }
  }
}

/* ---------------------------------------------------------------- 3D ------ */

export function evalSolid(s: Solid): Any {
  const { Manifold } = kernel();

  switch (s.op) {
    case 'cube':
      return Manifold.cube(s.size as unknown as number[], s.center);
    case 'cylinder':
      return Manifold.cylinder(s.h, s.r0, s.r1, s.seg, s.center);
    case 'sphere':
      return Manifold.sphere(s.r, s.seg);
    case 'extrude':
      return Manifold.extrude(
        evalSection(s.section),
        s.h,
        s.div,
        s.twistDeg,
        s.scaleTop as unknown as number[],
      );
    case 'revolve':
      return Manifold.revolve(evalSection(s.section), s.seg, s.deg);
    case 'union':
      return s.children.map(evalSolid).reduce((a: Any, b: Any) => a.add(b));
    case 'subtract':
      return s.tools.map(evalSolid).reduce((a: Any, b: Any) => a.subtract(b), evalSolid(s.base));
    case 'intersect':
      return s.children.map(evalSolid).reduce((a: Any, b: Any) => a.intersect(b));
    case 'hull':
      return Manifold.hull(s.children.map(evalSolid));
    case 'at': {
      let g = evalSolid(s.child);
      if (s.rDeg) g = g.rotate(s.rDeg as unknown as number[]);
      if (s.t) g = g.translate(s.t as unknown as number[]);
      return g;
    }
  }
}

/* -------------------------------------------------------------- mesh ------ */

export interface RawMesh {
  positions: Float32Array;
  triVerts: Uint32Array;
}

export function toMesh(geom: Any): RawMesh {
  const m = geom.getMesh();
  const stride: number = m.numProp;
  const n = m.vertProperties.length / stride;
  const positions = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    positions[i * 3] = m.vertProperties[i * stride];
    positions[i * 3 + 1] = m.vertProperties[i * stride + 1];
    positions[i * 3 + 2] = m.vertProperties[i * stride + 2];
  }
  return { positions, triVerts: new Uint32Array(m.triVerts) };
}

/** Binary STL. Hand-rolled — a serializer dependency buys nothing here. */
export function emitBinarySTL(mesh: RawMesh, header: string): Buffer {
  const tris = mesh.triVerts.length / 3;
  const buf = Buffer.alloc(84 + tris * 50);
  buf.write(header.slice(0, 79), 0, 'ascii');
  buf.writeUInt32LE(tris, 80);

  let o = 84;
  for (let t = 0; t < tris; t++) {
    const ia = mesh.triVerts[t * 3] * 3;
    const ib = mesh.triVerts[t * 3 + 1] * 3;
    const ic = mesh.triVerts[t * 3 + 2] * 3;
    const p = mesh.positions;

    const ux = p[ib] - p[ia];
    const uy = p[ib + 1] - p[ia + 1];
    const uz = p[ib + 2] - p[ia + 2];
    const vx = p[ic] - p[ia];
    const vy = p[ic + 1] - p[ia + 1];
    const vz = p[ic + 2] - p[ia + 2];

    let nx = uy * vz - uz * vy;
    let ny = uz * vx - ux * vz;
    let nz = ux * vy - uy * vx;
    const len = Math.hypot(nx, ny, nz) || 1;
    nx /= len;
    ny /= len;
    nz /= len;

    buf.writeFloatLE(nx, o);
    buf.writeFloatLE(ny, o + 4);
    buf.writeFloatLE(nz, o + 8);
    o += 12;
    for (const i of [ia, ib, ic]) {
      buf.writeFloatLE(p[i], o);
      buf.writeFloatLE(p[i + 1], o + 4);
      buf.writeFloatLE(p[i + 2], o + 8);
      o += 12;
    }
    buf.writeUInt16LE(0, o);
    o += 2;
  }
  return buf;
}

/**
 * Quantized mesh for the twin: positions at 1 um, indices as-is. The twin
 * renders THIS for every printed part, so what you see is the mesh that goes
 * to the printer — not a second, additive approximation that can drift.
 */
export function emitTwinMesh(mesh: RawMesh): Buffer {
  const head = Buffer.alloc(12);
  head.write('HKM1', 0, 'ascii');
  head.writeUInt32LE(mesh.positions.length / 3, 4);
  head.writeUInt32LE(mesh.triVerts.length / 3, 8);
  const pos = Buffer.from(mesh.positions.buffer, mesh.positions.byteOffset, mesh.positions.byteLength);
  const idx = Buffer.from(mesh.triVerts.buffer, mesh.triVerts.byteOffset, mesh.triVerts.byteLength);
  return Buffer.concat([head, pos, idx]);
}
