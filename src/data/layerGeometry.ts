import type { ImageLayer, ShapeLayer, TextLayer } from './chartLayers';
import { getFont } from './fonts/registry';
import { rasterizeShape, withOutline } from './shapeRaster';
import type { YarnColor } from './types';
import { normScale, rasterizeGlyphRun, rasterizeText } from './rasterizeText';

/**
 * Where a piece of colorwork actually lands on the chart.
 *
 * One shared truth for the renderer and the editor: `compositeChart` stamps
 * placements, and the studio hit-tests, boxes and drags the very same ones.
 * If the two ever drifted apart you would grab a letter and watch a different
 * letter move — so nothing is allowed to compute placement on its own.
 */
export interface Placement {
  /** Top row in chart space. May be negative — the paint step clips. */
  row: number;
  /** Left column, wrapped into [0, cols). The mask may run past the seam. */
  col: number;
  /** true = ink. */
  mask: boolean[][];
  /** Per-cell yarn, for artwork that carries more than one colour. */
  colors?: (YarnColor | null)[][];
}

export interface PlacementBox {
  row0: number;
  row1: number;
  col0: number;
  /** Width in stitches; col0 + width may exceed cols (wraps at the seam). */
  width: number;
}

/** The lift, in rows, that a `rise` gives across a block `width` wide. */
export function riseLift(rise: number, width: number): number {
  if (!rise || width <= 0) return 0;
  return Math.abs(Math.round((width - 1) * rise));
}

/**
 * One copy of a text layer as a flat mask: scale, weight, slant and baseline
 * climb all baked in.
 *
 * `rowOffset` is where the mask's row 0 sits relative to `anchor.row`. A
 * climbing baseline lifts the tail of the word above the anchor, so the mask
 * grows upward and the offset goes negative.
 *
 * THE CLIMB IS PER LETTER, NOT PER COLUMN. Lifting each column by
 * `round(c * rise)` is the obvious reading of "rows per stitch", and it is
 * wrong: a 0.03 rise steps at stitch 17, which on NORGE falls between the two
 * columns of R's stem — so the letter was rendered with one half of its stem a
 * row above the other. A baseline is something whole letters stand on, so the
 * step is taken from each glyph's own left edge and the glyph moves as a unit.
 *
 * A CLIMBING LETTER ALSO TRAVELS RIGHT. A glyph lifted one row shows, at any
 * given row of the finished block, a row of ITSELF that is one lower — and one
 * row lower down an italic is up to one column less sheared. So the lifted
 * letter hangs back into its neighbour: this is what used to push G left into R
 * until the two touched, and it is why the wordmark could not have a rise and a
 * real slant at the same time. Sliding each glyph right by the rows it has
 * climbed puts it back on the italic axis. One column per row over-pays the
 * shear a little (tan 24° is under half that), and deliberately so: the excess
 * lands as a stitch of extra air at exactly the letter pairs the step falls
 * between, which is where a rising word wants to open up anyway.
 */
export function textPiece(layer: TextLayer): {
  mask: boolean[][];
  rowOffset: number;
} {
  const rise = layer.rise ?? 0;
  const arc = layer.arcRows ?? 0;
  if (!rise && !arc) {
    const font = getFont(layer.fontId);
    return {
      mask: rasterizeText(layer.text, font, {
        slantDeg: layer.slantDeg,
        letterSpacing: layer.letterSpacing ?? 1,
        scaleX: layer.scaleX,
        scaleY: layer.scaleY,
        bold: layer.bold,
        slantRepair: layer.slantRepair,
      }),
      rowOffset: 0,
    };
  }

  const { glyphs, width, height, rowOffset } = textGlyphPieces(layer);
  const out: boolean[][] = Array.from({ length: height }, () =>
    Array<boolean>(width).fill(false),
  );
  for (const g of glyphs) {
    for (let r = 0; r < g.mask.length; r++) {
      const row = g.mask[r];
      for (let c = 0; c < row.length; c++) {
        if (!row[c]) continue;
        const dc = g.col + c;
        if (dc >= 0 && dc < width) out[g.row + r][dc] = true;
      }
    }
  }
  return { mask: out, rowOffset };
}

/** One glyph of a placed run: its bitmap, and where it sits in the block. */
export interface PlacedGlyph {
  mask: boolean[][];
  row: number;
  col: number;
}

/**
 * The same block `textPiece` returns, but with the letters kept apart — the one
 * place that decides where a glyph lands once slant, climb and arch are all in
 * play. `textPiece` is this, merged; anything that needs to reason about the
 * letters as letters (spacing checks, a studio handle per glyph) reads this,
 * so there is never a second opinion about where an R actually is.
 */
export function textGlyphPieces(layer: TextLayer): {
  glyphs: PlacedGlyph[];
  width: number;
  height: number;
  rowOffset: number;
} {
  const font = getFont(layer.fontId);
  const opts = {
    slantDeg: layer.slantDeg,
    letterSpacing: layer.letterSpacing ?? 1,
    scaleX: layer.scaleX,
    scaleY: layer.scaleY,
    bold: layer.bold,
    slantRepair: layer.slantRepair,
  };
  const rise = layer.rise ?? 0;
  const arc = layer.arcRows ?? 0;

  const { pieces, width, height: h } = rasterizeGlyphRun(layer.text, font, opts);

  // Only inked glyphs matter — a trailing space must not inflate the box.
  const inked = pieces.filter((p) => p.mask.some((row) => row.some(Boolean)));
  // Each glyph steps as a unit: a climb is a baseline the letters stand on,
  // and an arch is that baseline bent into a curve. Both are measured from
  // the glyph's own left edge, never per column, or a stem would be sheared
  // in half between two rows.
  const shiftOf = (col: number, w: number) => {
    const climb = -Math.round(col * rise);
    if (!arc) return climb;
    // Parabola through the ends, peaking in the middle.
    const t = w > 1 ? (col + 0.5) / w : 0.5;
    const bend = -Math.round(arc * (1 - (2 * t - 1) ** 2));
    return climb + bend;
  };

  let shiftMin = 0;
  let shiftMax = 0;
  for (const p of inked) {
    const s = shiftOf(p.col, width);
    if (s < shiftMin) shiftMin = s;
    if (s > shiftMax) shiftMax = s;
  }

  /** Rows between the lowest glyph of the block and the highest. */
  const lift = shiftMax - shiftMin;
  const glyphs: PlacedGlyph[] = inked.map((p) => {
    const shift = shiftOf(p.col, width);
    return {
      mask: p.mask,
      row: shift - shiftMin,
      /** Columns this glyph travels along the italic axis for its climb. */
      col: p.col + (shiftMax - shift),
    };
  });
  return {
    glyphs,
    // The climb is paid for sideways as well as upward, so the block needs the
    // same number of extra columns as it has rows of lift.
    width: width + lift,
    height: h + lift,
    rowOffset: shiftMin,
  };
}

/** Ink height of a text layer in rows, climb included. */
export function textHeight(layer: TextLayer): number {
  return textPiece(layer).mask.length;
}

/** Height of the font master alone, without the baseline climb. */
export function fontHeight(layer: TextLayer): number {
  const font = getFont(layer.fontId);
  return font.cell.h * normScale(layer.scaleY);
}

/**
 * The copies of a text layer, evenly spaced around the circumference.
 * Only the explicit (centerFrac / anchor) path has placements — the legacy
 * "distribute the words across the band" path stays inside `layoutText`.
 */
export function textPlacements(layer: TextLayer, cols: number): Placement[] {
  if (cols <= 0 || !layer.text.trim()) return [];
  const { mask: piece, rowOffset } = textPiece(layer);
  const pieceW = piece[0]?.length ?? 0;
  if (pieceW === 0) return [];

  const copies =
    layer.centerFrac != null ? Math.max(1, Math.round(layer.repeat)) : 1;
  const out: Placement[] = [];
  for (let k = 0; k < copies; k++) {
    const rawCol =
      layer.centerFrac != null
        ? Math.round((layer.centerFrac + k / copies) * cols - pieceW / 2)
        : layer.anchor.col;
    let col = ((rawCol % cols) + cols) % cols;
    let mask = piece;
    if (layer.mirror) {
      // Mirroring the finished band is the same as mirroring each copy and
      // reflecting its start column — done here so a mirrored layer still has
      // grabbable, correctly positioned boxes.
      mask = piece.map((row) => [...row].reverse());
      col = (((cols - col - pieceW) % cols) + cols) % cols;
    }
    out.push({ row: layer.anchor.row + rowOffset, col, mask });
  }
  return out;
}

/** The single placement of a photo layer, if it has pixels yet. */
export function imagePlacement(layer: ImageLayer, cols: number): Placement | null {
  if (!layer.bitmap || cols <= 0) return null;
  const mask = layer.bitmap
    .slice(0, layer.rows)
    .map((row) => row.slice(0, layer.cols));
  if (mask.length === 0 || (mask[0]?.length ?? 0) === 0) return null;
  let col = layer.anchor.col % cols;
  if (col < 0) col += cols;
  return { row: layer.anchor.row, col, mask };
}

/**
 * One copy of a shape, with its colours resolved.
 *
 * Ink slots 1–3 come from the layer's palette, slot 4 is the outline. An
 * alternate colour swaps slot 1 on every second copy, which is the whole
 * mechanism behind a two-colour Nordic band.
 */
function shapeCopy(
  layer: ShapeLayer,
  odd: boolean,
): { mask: boolean[][]; colors: (YarnColor | null)[][] } {
  const raster = rasterizeShape(layer.shapeId, {
    w: layer.w,
    h: layer.h,
    rotationDeg: layer.rotationDeg,
    flipX: layer.mirrorAlt && odd ? !layer.flipX : layer.flipX,
    flipY: layer.flipY,
    simplify: layer.simplify,
  });
  const { grid } = withOutline(raster, layer.outlineColorId ? (layer.outlineWidth ?? 1) : 0);

  const slot1 = odd && layer.altColorId ? layer.altColorId : layer.colorIds[0];
  const palette: (YarnColor | null)[] = [
    null,
    slot1 ?? null,
    layer.colorIds[1] ?? null,
    layer.colorIds[2] ?? null,
    layer.outlineColorId ?? null,
  ];

  const colors = grid.map((row) => row.map((v) => palette[v] ?? null));
  const mask = colors.map((row) => row.map((v) => v != null));
  return { mask, colors };
}

/**
 * Every copy of a shape layer.
 *
 * `wrap` spreads the copies evenly around the whole circumference so the band
 * closes on itself with no seam; otherwise they sit shoulder to shoulder with
 * `spacingX` stitches between them, anchored at `centerFrac`.
 */
export function shapePlacements(layer: ShapeLayer, cols: number): Placement[] {
  if (cols <= 0 || layer.w <= 0 || layer.h <= 0) return [];
  const nx = Math.max(1, Math.round(layer.repeatX));
  const ny = Math.max(1, Math.round(layer.repeatY));
  const even = shapeCopy(layer, false);
  const odd =
    layer.altColorId || layer.mirrorAlt ? shapeCopy(layer, true) : even;
  const pieceW = even.mask[0]?.length ?? 0;
  const pieceH = even.mask.length;
  if (pieceW === 0 || pieceH === 0) return [];

  const stepX = layer.wrap ? cols / nx : pieceW + Math.max(0, layer.spacingX);
  const stepY = pieceH + Math.max(0, layer.spacingY);
  const frac = layer.centerFrac;

  // Anchor the run so the first copy sits where the user put it: wrapped runs
  // start at the anchor and march around, un-wrapped runs centre on it.
  const spanW = layer.wrap ? cols : (nx - 1) * stepX + pieceW;
  const baseCol =
    frac != null
      ? Math.round(frac * cols - (layer.wrap ? pieceW / 2 : spanW / 2))
      : layer.anchor.col;

  const out: Placement[] = [];
  for (let iy = 0; iy < ny; iy++) {
    for (let ix = 0; ix < nx; ix++) {
      const src = (ix + iy) % 2 === 1 ? odd : even;
      const rawCol = Math.round(baseCol + ix * stepX);
      const col = ((rawCol % cols) + cols) % cols;
      out.push({
        row: layer.anchor.row + iy * stepY,
        col,
        mask: src.mask,
        colors: src.colors,
      });
    }
  }
  return out;
}

/**
 * The vertical room a layer has: the anchor rows at which its ink still sits
 * inside the band. Dragging or nudging past these would push the artwork off
 * the hat, which is never what anyone means — the field is only ten rows tall
 * and there is nothing above or below it to crochet on.
 */
export function rowRange(
  layer: TextLayer | ImageLayer | ShapeLayer,
  cols: number,
  rows: number,
): { min: number; max: number } {
  const boxes = (
    layer.kind === 'text'
      ? textPlacements(layer, cols)
      : layer.kind === 'shape'
        ? shapePlacements(layer, cols)
        : [imagePlacement(layer, cols)].filter((p): p is Placement => p != null)
  )
    .map(placementBox)
    .filter((b): b is PlacementBox => b != null);
  if (boxes.length === 0) return { min: 0, max: Math.max(0, rows - 1) };

  const top = Math.min(...boxes.map((b) => b.row0));
  const bottom = Math.max(...boxes.map((b) => b.row1));
  // How far the ink reaches from the anchor, in both directions.
  const above = layer.anchor.row - top;
  const below = bottom - layer.anchor.row;
  const min = above;
  const max = rows - 1 - below;
  // Artwork taller than the band: pin it to the top rather than inverting.
  return max < min ? { min, max: min } : { min, max };
}

/** Keep an anchor row inside `rowRange`. */
export function clampRow(
  layer: TextLayer | ImageLayer | ShapeLayer,
  cols: number,
  rows: number,
  desired: number,
): number {
  const { min, max } = rowRange(layer, cols, rows);
  return Math.min(max, Math.max(min, Math.round(desired)));
}

/** Bounding box of a placement, trimmed to the rows/columns that carry ink. */
export function placementBox(p: Placement): PlacementBox | null {
  let top = Infinity;
  let bottom = -Infinity;
  let left = Infinity;
  let right = -Infinity;
  for (let r = 0; r < p.mask.length; r++) {
    for (let c = 0; c < (p.mask[r]?.length ?? 0); c++) {
      if (!p.mask[r][c]) continue;
      if (r < top) top = r;
      if (r > bottom) bottom = r;
      if (c < left) left = c;
      if (c > right) right = c;
    }
  }
  if (top === Infinity) return null;
  return {
    row0: p.row + top,
    row1: p.row + bottom,
    col0: p.col + left,
    width: right - left + 1,
  };
}

/** Does a placement have ink at this chart cell? (Columns wrap at the seam.) */
export function placementHit(
  p: Placement,
  row: number,
  col: number,
  cols: number,
): boolean {
  const r = row - p.row;
  if (r < 0 || r >= p.mask.length) return false;
  const w = p.mask[r]?.length ?? 0;
  let dc = (col - p.col) % cols;
  if (dc < 0) dc += cols;
  if (dc >= w) return false;
  return p.mask[r][dc] === true;
}

/**
 * Grab tolerance: a one-stitch halo around the ink, so you can pick up a thin
 * letter without hitting the exact stitch. `slack` is in stitches.
 */
export function placementNear(
  p: Placement,
  row: number,
  col: number,
  cols: number,
  slack: number,
): boolean {
  for (let dr = -slack; dr <= slack; dr++) {
    for (let dc = -slack; dc <= slack; dc++) {
      if (placementHit(p, row + dr, col + dc, cols)) return true;
    }
  }
  return false;
}
