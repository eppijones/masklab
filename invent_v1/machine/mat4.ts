/**
 * Column-major 4x4 matrices, degrees in, no dependencies.
 *
 * This exists so machine/ can compute the frame chain in Node (the harness and
 * the STL builder) and in the browser (the twin) from the same code. Importing
 * three here would put a 600 kB renderer in the verification harness.
 *
 * Layout matches THREE.Matrix4.elements exactly, so twin/ can hand the array
 * straight to `Matrix4.fromArray()` with no transposition.
 */

export type Mat4 = Float64Array;
export type Vec3 = readonly [number, number, number];

const DEG = Math.PI / 180;

export function identity(): Mat4 {
  const m = new Float64Array(16);
  m[0] = m[5] = m[10] = m[15] = 1;
  return m;
}

export function translation(t: Vec3): Mat4 {
  const m = identity();
  m[12] = t[0];
  m[13] = t[1];
  m[14] = t[2];
  return m;
}

/** Rotation about an arbitrary unit axis, angle in DEGREES (Rodrigues). */
export function rotationAxisDeg(axis: Vec3, deg: number): Mat4 {
  const len = Math.hypot(axis[0], axis[1], axis[2]) || 1;
  const x = axis[0] / len;
  const y = axis[1] / len;
  const z = axis[2] / len;
  const a = deg * DEG;
  const c = Math.cos(a);
  const s = Math.sin(a);
  const t = 1 - c;

  const m = identity();
  m[0] = t * x * x + c;
  m[1] = t * x * y + s * z;
  m[2] = t * x * z - s * y;
  m[4] = t * x * y - s * z;
  m[5] = t * y * y + c;
  m[6] = t * y * z + s * x;
  m[8] = t * x * z + s * y;
  m[9] = t * y * z - s * x;
  m[10] = t * z * z + c;
  return m;
}

/** Intrinsic XYZ Euler, degrees. Matches THREE's default 'XYZ' order. */
export function rotationEulerDeg(r: Vec3): Mat4 {
  return multiply(
    multiply(rotationAxisDeg([1, 0, 0], r[0]), rotationAxisDeg([0, 1, 0], r[1])),
    rotationAxisDeg([0, 0, 1], r[2]),
  );
}

/** a then b, i.e. the matrix product a * b in column-major convention. */
export function multiply(a: Mat4, b: Mat4): Mat4 {
  const o = new Float64Array(16);
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 4; r++) {
      o[c * 4 + r] =
        a[r] * b[c * 4] +
        a[4 + r] * b[c * 4 + 1] +
        a[8 + r] * b[c * 4 + 2] +
        a[12 + r] * b[c * 4 + 3];
    }
  }
  return o;
}

export function applyPoint(m: Mat4, p: Vec3): Vec3 {
  return [
    m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12],
    m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13],
    m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14],
  ];
}

export function originOf(m: Mat4): Vec3 {
  return [m[12], m[13], m[14]];
}

export function isFiniteMat(m: Mat4): boolean {
  for (let i = 0; i < 16; i++) if (!Number.isFinite(m[i])) return false;
  return true;
}
