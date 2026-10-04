import { createHash } from 'node:crypto';

/** Reparse the delivered bytes; require exactly one opposing pair per edge. */
export function inspectSTL(buf: Buffer) {
  const triangles = buf.readUInt32LE(80);
  if (buf.length !== 84 + triangles * 50) throw new Error('STL byte length mismatch');
  const low = [Infinity, Infinity, Infinity], high = [-Infinity, -Infinity, -Infinity];
  const edges = new Map<string, { count: number; balance: number }>();
  let volume = 0, degenerate = 0;
  for (let i = 0; i < triangles; i++) {
    const v = Array.from({ length: 3 }, (_, j) => Array.from({ length: 3 }, (_, k) => {
      const n = buf.readFloatLE(84 + i * 50 + 12 + j * 12 + k * 4);
      if (!Number.isFinite(n)) throw new Error('Non-finite vertex');
      low[k] = Math.min(low[k], n); high[k] = Math.max(high[k], n); return n;
    }));
    const [a, b, c] = v;
    const cross = [
      (b[1]-a[1])*(c[2]-a[2])-(b[2]-a[2])*(c[1]-a[1]),
      (b[2]-a[2])*(c[0]-a[0])-(b[0]-a[0])*(c[2]-a[2]),
      (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]),
    ];
    if (Math.hypot(...cross) < 1e-7) degenerate++;
    volume += (a[0]*(b[1]*c[2]-b[2]*c[1]) + a[1]*(b[2]*c[0]-b[0]*c[2]) + a[2]*(b[0]*c[1]-b[1]*c[0]))/6;
    const keys = v.map(p => p.map(n => Math.round(n * 10000)).join(','));
    for (let j = 0; j < 3; j++) {
      const from = keys[j], to = keys[(j+1)%3];
      const key = [from, to].sort().join('|');
      const e = edges.get(key) ?? { count: 0, balance: 0 };
      e.count++; e.balance += from < to ? 1 : -1; edges.set(key, e);
    }
  }
  const invalidEdges = [...edges.values()].filter(e => e.count !== 2 || e.balance !== 0).length;
  return { triangles, low, high, bbox: low.map((n, k) => high[k] - n),
    volumeCm3: Math.abs(volume) / 1000, degenerate, invalidEdges,
    sha256: createHash('sha256').update(buf).digest('hex') };
}
