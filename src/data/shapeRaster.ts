import { getShape, type Ink, type ShapeId, type ShapeSpec } from './shapes/catalog';

/**
 * Turning a shape into stitches.
 *
 * The catalogue holds geometry; this is where it becomes fabric. Every shape
 * is re-sampled at the exact stitch count it will be worked at, so a football
 * eleven stitches wide is drawn as an eleven-stitch football rather than a
 * big one squeezed down. Rotation and flipping happen to the sample point,
 * not to the finished pixels, for the same reason.
 */

export type InkGrid = Ink[][];

export interface RasterOpts {
  w: number;
  h: number;
  rotationDeg?: number;
  flipX?: boolean;
  flipY?: boolean;
  /** Drop detail the stitch grid cannot hold. */
  simplify?: boolean;
}

const SUB = 3;

function emptyGrid(w: number, h: number): InkGrid {
  return Array.from({ length: h }, () => Array<Ink>(w).fill(0));
}

/** Sample an authored master with nearest-neighbour. */
function samplePixels(spec: ShapeSpec, x: number, y: number): Ink {
  const rows = spec.pixels!;
  const mh = rows.length;
  const mw = Math.max(...rows.map((r) => r.length));
  const mx = Math.min(mw - 1, Math.max(0, Math.floor(x * mw)));
  const my = Math.min(mh - 1, Math.max(0, Math.floor(y * mh)));
  const ch = rows[my]?.[mx] ?? '.';
  return ch === '1' ? 1 : ch === '2' ? 2 : ch === '3' ? 3 : 0;
}

/**
 * Rasterize a shape to an ink grid.
 *
 * Rotation turns the sampling frame and shrinks it so the corners stay in
 * frame — a rotated motif that quietly lost its points would be worse than no
 * rotation at all.
 */
export function rasterizeShape(id: ShapeId, opts: RasterOpts): InkGrid {
  const spec = getShape(id);
  const w = Math.max(1, Math.round(opts.w));
  const h = Math.max(1, Math.round(opts.h));
  if (!spec) return emptyGrid(w, h);

  const theta = ((opts.rotationDeg ?? 0) * Math.PI) / 180;
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  const fit = Math.abs(cos) + Math.abs(sin);
  const rotated = theta !== 0;

  const out = emptyGrid(w, h);
  const sample = spec.pixels
    ? (x: number, y: number) => samplePixels(spec, x, y)
    : spec.fn!;
  // Authored masters are already stitch art: sampling them nine times per
  // stitch only blurs the edges the author placed deliberately.
  const sub = spec.pixels ? 1 : SUB;

  for (let r = 0; r < h; r++) {
    for (let c = 0; c < w; c++) {
      const tally = [0, 0, 0, 0];
      for (let sy = 0; sy < sub; sy++) {
        for (let sx = 0; sx < sub; sx++) {
          let x = (c + (sx + 0.5) / sub) / w;
          let y = (r + (sy + 0.5) / sub) / h;
          if (opts.flipX) x = 1 - x;
          if (opts.flipY) y = 1 - y;
          if (rotated) {
            const u = x - 0.5;
            const v = y - 0.5;
            x = (u * cos + v * sin) / fit + 0.5;
            y = (-u * sin + v * cos) / fit + 0.5;
            if (x < 0 || x >= 1 || y < 0 || y >= 1) continue;
          }
          tally[sample(x, y)]++;
        }
      }
      const total = sub * sub;
      const inked = tally[1] + tally[2] + tally[3];
      if (inked * 2 < total) continue;
      // Whichever colour won the cell takes it — no blending, there is no
      // such thing as half a stitch of red.
      let best: Ink = 1;
      for (const v of [1, 2, 3] as Ink[]) if (tally[v] > tally[best]) best = v;
      out[r][c] = best;
    }
  }

  return opts.simplify ? simplifyForKnit(out) : out;
}

/** 4-neighbour components of equal value. */
function components(grid: InkGrid): { cells: [number, number][]; value: Ink }[] {
  const h = grid.length;
  const w = grid[0]?.length ?? 0;
  const seen = Array.from({ length: h }, () => Array<boolean>(w).fill(false));
  const out: { cells: [number, number][]; value: Ink }[] = [];
  for (let r = 0; r < h; r++) {
    for (let c = 0; c < w; c++) {
      if (seen[r][c]) continue;
      const value = grid[r][c];
      const cells: [number, number][] = [];
      const stack: [number, number][] = [[r, c]];
      seen[r][c] = true;
      while (stack.length) {
        const [cr, cc] = stack.pop()!;
        cells.push([cr, cc]);
        for (const [dr, dc] of [
          [-1, 0],
          [1, 0],
          [0, -1],
          [0, 1],
        ] as const) {
          const nr = cr + dr;
          const nc = cc + dc;
          if (nr < 0 || nr >= h || nc < 0 || nc >= w) continue;
          if (seen[nr][nc] || grid[nr][nc] !== value) continue;
          seen[nr][nc] = true;
          stack.push([nr, nc]);
        }
      }
      out.push({ cells, value });
    }
  }
  return out;
}

/** The value most common around a set of cells. */
function surroundingValue(grid: InkGrid, cells: [number, number][]): Ink {
  const h = grid.length;
  const w = grid[0]?.length ?? 0;
  const tally = [0, 0, 0, 0];
  const inside = new Set(cells.map(([r, c]) => `${r},${c}`));
  for (const [r, c] of cells) {
    for (const [dr, dc] of [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ] as const) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nr >= h || nc < 0 || nc >= w) continue;
      if (inside.has(`${nr},${nc}`)) continue;
      tally[grid[nr][nc]]++;
    }
  }
  let best: Ink = 0;
  for (const v of [0, 1, 2, 3] as Ink[]) if (tally[v] > tally[best]) best = v;
  return best;
}

/**
 * Simplify for knit.
 *
 * Detail below about three stitches does not survive contact with a crochet
 * hook: it reads as a smudge, or as a mistake. This drops specks and fills
 * pinholes, merging each into whatever surrounds it, and shaves the
 * single-stitch spurs that scaling and rotation leave behind.
 */
export function simplifyForKnit(grid: InkGrid, minCells = 3): InkGrid {
  const h = grid.length;
  const w = grid[0]?.length ?? 0;
  if (h === 0 || w === 0) return grid;
  const out = grid.map((row) => [...row]);

  for (const comp of components(out)) {
    if (comp.cells.length >= minCells) continue;
    // A shape that spans the whole grid IS the artwork — a one-stitch rule or
    // a hairline stripe — not a speck left over from scaling.
    const spansW = new Set(comp.cells.map(([, c]) => c)).size === w;
    const spansH = new Set(comp.cells.map(([r]) => r)).size === h;
    if (spansW || spansH) continue;
    // Touching the border is a legitimate crop, not a speck — unless it is a
    // single stitch, which is a speck wherever it sits.
    const touchesEdge = comp.cells.some(
      ([r, c]) => r === 0 || c === 0 || r === h - 1 || c === w - 1,
    );
    if (touchesEdge && comp.cells.length > 1) continue;
    const fill = surroundingValue(out, comp.cells);
    for (const [r, c] of comp.cells) out[r][c] = fill;
  }

  // Lone stitches: ink with no orthogonal neighbour of its own colour.
  for (let r = 0; r < h; r++) {
    for (let c = 0; c < w; c++) {
      const v = out[r][c];
      if (v === 0) continue;
      if (w === 1 || h === 1) continue;
      let friends = 0;
      for (const [dr, dc] of [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
      ] as const) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr < 0 || nr >= h || nc < 0 || nc >= w) continue;
        if (out[nr][nc] === v) friends++;
      }
      if (friends === 0) out[r][c] = surroundingValue(out, [[r, c]]);
    }
  }

  return out;
}

/** Boolean silhouette of an ink grid. */
export function inkMask(grid: InkGrid): boolean[][] {
  return grid.map((row) => row.map((v) => v > 0));
}

/**
 * Add an outline ring around the silhouette, growing the grid by `width` on
 * every side. Ink slot 4 is used for the outline so the caller can map it to
 * its own yarn; the returned grid is one size larger in both directions.
 */
export function withOutline(
  grid: InkGrid,
  width: number,
): { grid: number[][]; pad: number } {
  const pad = Math.max(0, Math.round(width));
  if (pad === 0) return { grid: grid.map((r) => [...r]), pad: 0 };
  const h = grid.length;
  const w = grid[0]?.length ?? 0;
  const H = h + pad * 2;
  const W = w + pad * 2;
  const out: number[][] = Array.from({ length: H }, () => Array<number>(W).fill(0));

  for (let r = 0; r < h; r++) {
    for (let c = 0; c < w; c++) {
      if (grid[r][c] === 0) continue;
      for (let dr = -pad; dr <= pad; dr++) {
        for (let dc = -pad; dc <= pad; dc++) {
          out[r + pad + dr][c + pad + dc] = 4;
        }
      }
    }
  }
  for (let r = 0; r < h; r++) {
    for (let c = 0; c < w; c++) {
      if (grid[r][c] !== 0) out[r + pad][c + pad] = grid[r][c];
    }
  }
  return { grid: out, pad };
}
