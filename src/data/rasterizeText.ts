import type { FontSpec } from './fonts/types';

/**
 * How a word is turned into stitches. Everything here is measured in stitches
 * and rows — there is no sub-stitch geometry, because there is no such thing
 * as half a stitch on a hat.
 */
export interface TextRasterOpts {
  slantDeg: number;
  letterSpacing: number;
  /** Whole-stitch magnification. 1 = the font's own master. */
  scaleX?: number;
  scaleY?: number;
  /** Widen every stroke by one stitch (a heavier weight of the same font). */
  bold?: boolean;
  /**
   * Bridge the shear seam, so a sheared stroke stays in one piece.
   *
   * See `shearMask`. Off by default because it adds stitches, and every
   * published pattern before NORWAY'26 was drawn against the unrepaired shear.
   */
  slantRepair?: boolean;
}

/** Clamp a scale to whole stitches — 1…6, never 0, never fractional. */
export function normScale(v: number | undefined): number {
  if (!Number.isFinite(v ?? NaN)) return 1;
  return Math.min(6, Math.max(1, Math.round(v as number)));
}

/**
 * Upright glyph run: letters laid side by side, scaled and optionally
 * emboldened, with no slant applied yet.
 */
export function rasterizeUpright(
  text: string,
  font: FontSpec,
  opts: Pick<TextRasterOpts, 'letterSpacing' | 'scaleX' | 'scaleY' | 'bold'>,
): boolean[][] {
  const sx = normScale(opts.scaleX);
  const sy = normScale(opts.scaleY);
  const h = font.cell.h * sy;
  const spacing = opts.letterSpacing;

  const ink: { row: number; col: number }[] = [];
  let x = 0;

  for (const ch of text.toUpperCase()) {
    const glyph = font.glyphs[ch] ?? font.glyphs[' '];
    if (!glyph) {
      x += font.cell.w * sx + spacing;
      continue;
    }
    const gw = glyph[0]?.length ?? font.cell.w;
    for (let r = 0; r < glyph.length; r++) {
      const line = glyph[r] ?? '';
      for (let c = 0; c < line.length; c++) {
        if (line[c] !== 'X') continue;
        for (let dy = 0; dy < sy; dy++) {
          for (let dx = 0; dx < sx; dx++) {
            ink.push({ row: r * sy + dy, col: x + c * sx + dx });
          }
        }
      }
    }
    x += gw * sx + spacing;
  }

  const width = Math.max(1, x + (opts.bold ? 1 : 0));
  const grid: boolean[][] = Array.from({ length: h }, () =>
    Array<boolean>(width).fill(false),
  );
  for (const p of ink) {
    if (p.row >= 0 && p.row < h && p.col >= 0 && p.col < width) {
      grid[p.row][p.col] = true;
    }
  }
  if (opts.bold) {
    for (let r = 0; r < h; r++) {
      for (let c = width - 1; c > 0; c--) {
        if (grid[r][c - 1]) grid[r][c] = true;
      }
    }
  }
  return grid;
}

/**
 * ITALIC = SHEAR AFTER RASTER:
 *   for mask row r of height h, shift right by round((h - 1 - r) * tan(slantDeg)).
 * A left-leaning slant shifts the whole block back into frame instead of
 * clipping the letters that would fall off column zero.
 */
export function shearMask(
  mask: boolean[][],
  slantDeg: number,
  repair = false,
  lean?: number[],
): boolean[][] {
  const h = mask.length;
  if (h === 0) return mask;
  const tanSlant = Math.tan((slantDeg * Math.PI) / 180);
  if (!lean?.length && tanSlant === 0) return mask;
  const w = mask[0]?.length ?? 0;

  /**
   * A DRAWN lean wins over a derived one.
   *
   * `round` is the whole problem this escape hatch exists for: it holds an
   * offset for a row or two and then jumps a column, wherever the arithmetic
   * happens to tip. A face with two-stitch strokes and travelling diagonals
   * cannot absorb a jump landing on one of its own steps — see the note under
   * `repair`, and `norgeKursiv26.ts`, which spells its staircase out instead.
   */
  const shearOf = lean?.length
    ? (r: number) => lean[Math.min(r, lean.length - 1)] ?? 0
    : (r: number) => Math.round((h - 1 - r) * tanSlant);
  let minShear = 0;
  let maxShear = 0;
  for (let r = 0; r < h; r++) {
    const s = shearOf(r);
    if (s < minShear) minShear = s;
    if (s > maxShear) maxShear = s;
  }
  const width = Math.max(1, w + maxShear - minShear);
  const out: boolean[][] = Array.from({ length: h }, () =>
    Array<boolean>(width).fill(false),
  );
  for (let r = 0; r < h; r++) {
    const shift = shearOf(r) - minShear;
    for (let c = 0; c < w; c++) {
      if (!mask[r][c]) continue;
      const dc = c + shift;
      if (dc >= 0 && dc < width) out[r][dc] = true;
    }
  }
  /**
   * THE SEAM.
   *
   * `shearOf` rounds, so the offset holds for a row or two and then jumps a
   * whole column. A stroke that is vertical in the master survives that — it
   * just steps. A stroke that already travels a column per row does not: going
   * one way the shear cancels it flat, going the other it doubles into a
   * two-column jump, and a two-column jump between consecutive rows is a stroke
   * in pieces. That is what tore the lozenge O of «Norge26» into loose cells
   * and made NORGE read as a zigzag instead of a word.
   *
   * The bridge: wherever the offset steps between two rows, any ink the master
   * had in the SAME column on both of them gets a cell at the upper row's
   * offset as well. It is the minimum that reconnects the stroke — one stitch
   * at each step, on the lower row, so the letter thickens where a hand-cut
   * italic thickens anyway and nowhere else.
   */
  if (repair) {
    for (let r = 0; r + 1 < h; r++) {
      const a = shearOf(r) - minShear;
      const b = shearOf(r + 1) - minShear;
      if (a === b) continue;
      for (let c = 0; c < w; c++) {
        if (!mask[r][c]) continue;
        // Every cell the master had touching this one on the row below.
        for (let dc = -1; dc <= 1; dc++) {
          const c2 = c + dc;
          if (c2 < 0 || c2 >= w || !mask[r + 1][c2]) continue;
          const x0 = c + a;
          const x1 = c2 + b;
          if (Math.abs(x1 - x0) <= 1) continue;
          // They have been pulled apart. Close the run on the LOWER row, which
          // is where an italic thickens anyway.
          const from = Math.min(x0, x1);
          const to = Math.max(x0, x1);
          for (let x = from; x <= to; x++) {
            if (x >= 0 && x < width) out[r + 1][x] = true;
          }
        }
      }
    }
  }
  return out;
}

/**
 * Rasterize text into a boolean mask (true = ink): upright glyph run, scaled,
 * then sheared. At scaleX = scaleY = 1 and bold = false this is byte-identical
 * to the original per-glyph shear for every slant the published patterns use.
 */
export function rasterizeText(
  text: string,
  font: FontSpec,
  opts: TextRasterOpts,
): boolean[][] {
  return shearMask(
    rasterizeUpright(text, font, opts),
    opts.slantDeg,
    opts.slantRepair,
    scaledLean(font, opts.scaleY),
  );
}

/**
 * A drawn face's lean, stretched to match a magnified master.
 *
 * `lean` has one entry per MASTER row; `rasterizeUpright` has by then turned
 * each master row into `scaleY` chart rows. Repeating each entry keeps the
 * staircase on the same letters it was drawn against instead of leaving the
 * lean on row 9 of a block that is now eighteen rows tall.
 */
function scaledLean(font: FontSpec, scaleY?: number): number[] | undefined {
  if (!font.lean?.length) return undefined;
  const sy = normScale(scaleY);
  if (sy === 1) return font.lean;
  return font.lean.flatMap((v) => Array<number>(sy).fill(v));
}

/** Columns the shear travels sideways over a block `h` rows tall. */
function shearTravel(h: number, slantDeg: number, lean?: number[]): number {
  if (h <= 0) return 0;
  if (lean?.length) return Math.max(...lean) - Math.min(...lean);
  const tanSlant = Math.tan((slantDeg * Math.PI) / 180);
  if (tanSlant === 0) return 0;
  let min = 0;
  let max = 0;
  for (let r = 0; r < h; r++) {
    const s = Math.round((h - 1 - r) * tanSlant);
    if (s < min) min = s;
    if (s > max) max = s;
  }
  return max - min;
}

/** One glyph of a run: its own sheared bitmap, and where its cell starts. */
export interface GlyphPiece {
  mask: boolean[][];
  col: number;
}

/**
 * The same run as `rasterizeText`, but with the glyphs kept apart.
 *
 * OR the pieces together at their `col` and you get `rasterizeText` back
 * stitch for stitch: the shear offset depends only on the row, and every glyph
 * spans the same rows, so shearing each glyph on its own is the same operation
 * as shearing the finished run. Keeping them separate is what lets a caller
 * move one letter — a climbing baseline, say — without tearing it in half.
 */
export function rasterizeGlyphRun(
  text: string,
  font: FontSpec,
  opts: TextRasterOpts,
): { pieces: GlyphPiece[]; width: number; height: number } {
  const sx = normScale(opts.scaleX);
  const sy = normScale(opts.scaleY);
  const height = font.cell.h * sy;
  const lean = scaledLean(font, opts.scaleY);
  const pieces: GlyphPiece[] = [];
  let x = 0;

  for (const ch of text.toUpperCase()) {
    const glyph = font.glyphs[ch] ?? font.glyphs[' '];
    if (!glyph) {
      x += font.cell.w * sx + opts.letterSpacing;
      continue;
    }
    const upright = rasterizeUpright(ch, font, {
      letterSpacing: 0,
      scaleX: opts.scaleX,
      scaleY: opts.scaleY,
      bold: opts.bold,
    });
    pieces.push({
      mask: shearMask(upright, opts.slantDeg, opts.slantRepair, lean),
      col: x,
    });
    x += (glyph[0]?.length ?? font.cell.w) * sx + opts.letterSpacing;
  }

  const runWidth = Math.max(1, x + (opts.bold ? 1 : 0));
  return {
    pieces,
    width: runWidth + shearTravel(height, opts.slantDeg, lean),
    height,
  };
}

/** Legacy Helene row slant (exact RO RO RO chart). */
function heleneSlantOffset(rowFromTop: number): number {
  return Math.floor((9 - rowFromTop) / 4);
}

/**
 * Exact RO RO RO layout on 100 cols — byte-compatible with historical CHART_GRID.
 * Uses WORD_STARTS [0,33,66] and Helene per-row slantOffset (not tan-shear).
 */
export function layoutRoLegacy(
  words: string[],
  cols: number,
  font: FontSpec,
): boolean[][] {
  const rows = font.cell.h;
  const letterW = font.cell.w;
  const maxSlant = heleneSlantOffset(0);
  const letterSpan = letterW + maxSlant;
  const letterGap = 1;
  const grid: boolean[][] = Array.from({ length: rows }, () =>
    Array<boolean>(cols).fill(false),
  );

  // Historical fixed starts for the canonical 3×RO on 100 stitches.
  const wordStarts =
    words.length === 3 &&
    words.every((w) => w === 'RO') &&
    cols === 100
      ? [0, 33, 66]
      : evenlyDistributeStarts(words, cols, letterSpan, letterGap, font);

  words.forEach((word, w) => {
    let x = wordStarts[w] ?? 0;
    for (const ch of word.toUpperCase()) {
      const bitmap = font.glyphs[ch];
      if (!bitmap) continue;
      for (let rowTop = 0; rowTop < rows; rowTop++) {
        const off = heleneSlantOffset(rowTop);
        const line = bitmap[rowTop] ?? '';
        for (let c = 0; c < letterW; c++) {
          if (line[c] === 'X') {
            const col = (x + off + c) % cols;
            grid[rowTop][col < 0 ? col + cols : col] = true;
          }
        }
      }
      x += letterSpan + letterGap;
    }
  });
  return grid;
}

function evenlyDistributeStarts(
  words: string[],
  cols: number,
  letterSpan: number,
  letterGap: number,
  font: FontSpec,
): number[] {
  const wordWidths = words.map((word) => {
    let w = 0;
    for (const ch of word.toUpperCase()) {
      const g = font.glyphs[ch];
      const gw = g?.[0]?.length ?? font.cell.w;
      w += letterSpan + letterGap;
      void gw;
    }
    // last gap not needed inside word width for span calc — match RO: each letter uses span+gap
    return Math.max(0, word.length * (letterSpan + letterGap) - letterGap);
  });
  const used = wordWidths.reduce((a, b) => a + b, 0);
  const gaps = cols - used;
  const n = words.length;
  const gapEach = n > 0 ? Math.floor(gaps / n) : 0;
  const starts: number[] = [];
  let x = 0;
  for (let i = 0; i < n; i++) {
    starts.push(x % cols);
    x += wordWidths[i] + gapEach;
  }
  return starts;
}

/**
 * Distribute word(s) across `cols` with even gaps / optional reps.
 * Golden: font=ro, words=['RO','RO','RO'], cols=100, slantDeg=0
 *   → deep-equal today's CHART_GRID (boolean red mask).
 */
export function layoutText(
  words: string[],
  cols: number,
  reps: number,
  font: FontSpec,
  opts: { slantDeg: number; letterSpacing: number; bandRows: number },
): boolean[][] {
  const expanded: string[] = [];
  for (let r = 0; r < Math.max(1, reps); r++) {
    for (const w of words) expanded.push(w);
  }

  if (font.id === 'ro' && opts.slantDeg === 0) {
    const legacy = layoutRoLegacy(expanded, cols, font);
    return padOrCropRows(legacy, opts.bandRows, cols);
  }

  const pieces = expanded.map((w) =>
    rasterizeText(w, font, {
      slantDeg: opts.slantDeg,
      letterSpacing: opts.letterSpacing,
    }),
  );
  const pieceWidths = pieces.map((p) => p[0]?.length ?? 0);
  const used = pieceWidths.reduce((a, b) => a + b, 0);
  const gaps = Math.max(0, cols - used);
  const gapEach = expanded.length > 0 ? Math.floor(gaps / expanded.length) : 0;

  const grid: boolean[][] = Array.from({ length: opts.bandRows }, () =>
    Array<boolean>(cols).fill(false),
  );

  let x = 0;
  const rowPad = Math.max(0, Math.floor((opts.bandRows - font.cell.h) / 2));
  for (let i = 0; i < pieces.length; i++) {
    const piece = pieces[i];
    for (let r = 0; r < piece.length; r++) {
      const destRow = rowPad + r;
      if (destRow < 0 || destRow >= opts.bandRows) continue;
      for (let c = 0; c < piece[r].length; c++) {
        if (piece[r][c]) {
          const col = (x + c) % cols;
          grid[destRow][col] = true;
        }
      }
    }
    x += pieceWidths[i] + gapEach;
  }
  return grid;
}

function padOrCropRows(
  grid: boolean[][],
  bandRows: number,
  cols: number,
): boolean[][] {
  if (grid.length === bandRows) return grid;
  const out: boolean[][] = Array.from({ length: bandRows }, (_, r) =>
    r < grid.length ? [...grid[r]] : Array<boolean>(cols).fill(false),
  );
  return out;
}
