import type { YarnColor } from './types';
import type { ShapeId } from './shapes/catalog';
import type { FontId } from './fonts/types';
import { getFont } from './fonts/registry';
import { layoutText } from './rasterizeText';
import {
  imagePlacement,
  shapePlacements,
  textPlacements,
  type Placement,
} from './layerGeometry';
import { paintMotif, type MotifKind } from './motifs';
import { hash2 } from './streaks';

export type ColorGrid = YarnColor[][];

export interface TextLayer {
  kind: 'text';
  id: string;
  /** Studio: temporarily hide the layer without deleting it. */
  hidden?: boolean;
  /** Studio: pinned — selection and drags pass straight through it. */
  locked?: boolean;
  text: string;
  fontId: FontId;
  slantDeg: number;
  anchor: { row: number; col: number };
  repeat: number;
  colorId: YarnColor;
  mirror: boolean;
  /** When set, distribute words evenly across full band (RO-style). */
  distributeWords?: string[];
  letterSpacing?: number;
  /**
   * Size-independent horizontal placement: center the text block at this
   * fraction of the circumference (0.095 ≈ the camera-front of the hat).
   * Overrides anchor.col; anchor.row still sets the vertical position.
   */
  centerFrac?: number;
  /**
   * Rows the word climbs per stitch travelled to the right. The glyph shear
   * makes each letter italic; this tilts the whole BASELINE, which is what
   * gives sports lettering its lift. 0.09 ≈ three rows across a 36-stitch
   * wordmark. Only honoured on the explicit (anchor/centerFrac) path.
   */
  rise?: number;
  /**
   * Whole-stitch magnification of the font master. There is no fractional
   * scale: a stitch is the pixel, so 2 means every stitch becomes two.
   */
  scaleX?: number;
  scaleY?: number;
  /** Widen every stroke by one stitch — a bolder cut of the same font. */
  bold?: boolean;
  /**
   * Keep sheared strokes in one piece. Needed by any face whose letterforms
   * carry diagonals of their own — see `shearMask`.
   */
  slantRepair?: boolean;
  /**
   * Bend the baseline into an arch: the middle of the word lifts this many
   * rows above its ends (negative dips it into a smile). Applied per letter,
   * like `rise`, so no glyph is ever split across two rows.
   */
  arcRows?: number;
  /**
   * Outline the letters in a second yarn. On a busy ground this is what keeps
   * a wordmark readable, and it is how the shoulder of a real jacquard letter
   * is worked. Width is in stitches (1 or 2).
   */
  haloColorId?: YarnColor;
  haloWidth?: number;
  /**
   * Fraction of the contour left UNPAINTED, so whatever is underneath shows
   * through (0 = a solid ring, the old behaviour; 0.4 = two stitches in five
   * skipped).
   *
   * A solid contour is a clean, unbroken edge of ground colour all the way
   * round the wordmark, and on a hat with a stroke field that edge is the
   * thing the eye latches onto: the strokes visibly STOP at it, five letters
   * in a row, which reads as one hard line dividing the type from the pattern.
   * Skipping part of the ring gives every stroke somewhere to cross, so the
   * fabric passes behind the letters instead of being cut off by them — while
   * the remaining three-fifths still carry the separation the glyphs need.
   *
   * The choice is a stable hash of the CELL, not a random draw, so a chart
   * renders identically every time and the crocheter's printed diagram matches
   * the 3D preview stitch for stitch.
   */
  haloDither?: number;
}

export interface MotifLayer {
  kind: 'motif';
  id: string;
  hidden?: boolean;
  locked?: boolean;
  motif: MotifKind;
  params: Record<string, number | string | boolean>;
  anchor: { row: number; col: number };
  colorIds: YarnColor[];
}

export interface ImageLayer {
  kind: 'image';
  id: string;
  hidden?: boolean;
  locked?: boolean;
  srcRef: string;
  anchor: { row: number; col: number };
  cols: number;
  rows: number;
  dither: boolean;
  contrast: number;
  /** Studio photo levels, −50…50. */
  brightness?: number;
  /** Pre-rasterized mask from import (true = ink). */
  bitmap?: boolean[][];
  colorId?: YarnColor;
}

/**
 * A catalogue shape placed on the band.
 *
 * Size is in stitches and rows because that is what it will be crocheted at;
 * there is no scale factor hiding a "real" size underneath. Repeats, mirroring
 * and alternating colours live on the layer rather than in duplicated layers,
 * so a Scandinavian band stays one editable thing.
 */
export interface ShapeLayer {
  kind: 'shape';
  id: string;
  hidden?: boolean;
  locked?: boolean;
  shapeId: ShapeId;
  /** Size of ONE copy, in stitches and rows. */
  w: number;
  h: number;
  rotationDeg: number;
  flipX?: boolean;
  flipY?: boolean;
  anchor: { row: number; col: number };
  /** Size-independent placement around the circumference. */
  centerFrac?: number;
  /** Yarn for ink slots 1–3 of the shape. */
  colorIds: YarnColor[];
  outlineColorId?: YarnColor;
  outlineWidth?: number;
  /** Copies around the hat and down the band. */
  repeatX: number;
  repeatY: number;
  /** Gap between copies, in stitches / rows. */
  spacingX: number;
  spacingY: number;
  /** Every other copy in this yarn — the Nordic two-colour band. */
  altColorId?: YarnColor;
  /** Every other copy flipped: a mirrored repeat. */
  mirrorAlt?: boolean;
  /** Spread the copies evenly across the whole circumference. */
  wrap?: boolean;
  /** Drop detail the stitch grid cannot hold. */
  simplify?: boolean;
}

export interface OverrideLayer {
  kind: 'override';
  cells: Record<`${number},${number}`, YarnColor>;
}

export type ChartLayer = TextLayer | MotifLayer | ImageLayer | ShapeLayer;

export function emptyOverride(): OverrideLayer {
  return { kind: 'override', cells: {} };
}

function mirrorRow(row: boolean[]): boolean[] {
  return [...row].reverse();
}

/** Does this layer place explicit copies, or distribute words across the band? */
export function isFreeText(layer: TextLayer): boolean {
  if (layer.distributeWords && layer.distributeWords.length > 0) return false;
  return layer.centerFrac != null || (layer.repeat <= 1 && layer.anchor.col !== 0);
}

/** Grow a mask by `w` stitches in all directions (the halo ring source). */
function dilate(mask: boolean[][], w: number): boolean[][] {
  const h = mask.length;
  const width = mask[0]?.length ?? 0;
  const out: boolean[][] = Array.from({ length: h + 2 * w }, () =>
    Array<boolean>(width + 2 * w).fill(false),
  );
  for (let r = 0; r < h; r++) {
    for (let c = 0; c < width; c++) {
      if (!mask[r][c]) continue;
      for (let dr = -w; dr <= w; dr++) {
        for (let dc = -w; dc <= w; dc++) {
          out[r + w + dr][c + w + dc] = true;
        }
      }
    }
  }
  return out;
}

/** Stamp a placement that carries its own colours (shapes). */
function stampColors(
  p: Placement,
  cols: number,
  rows: number,
  dest: ColorGrid,
): void {
  if (!p.colors) return;
  for (let r = 0; r < p.colors.length; r++) {
    const dr = p.row + r;
    if (dr < 0 || dr >= rows) continue;
    const line = p.colors[r];
    for (let c = 0; c < line.length; c++) {
      const v = line[c];
      if (!v) continue;
      let dc = (p.col + c) % cols;
      if (dc < 0) dc += cols;
      dest[dr][dc] = v;
    }
  }
}

function paintShapeLayer(
  layer: ShapeLayer,
  cols: number,
  rows: number,
  dest: ColorGrid,
): void {
  for (const p of shapePlacements(layer, cols)) {
    stampColors(p, cols, rows, dest);
  }
}

/** Stamp one placement's ink into the chart, wrapping at the seam. */
function stamp(
  p: Placement,
  color: YarnColor,
  cols: number,
  rows: number,
  dest: ColorGrid,
  rowOffset = 0,
  colOffset = 0,
  /** Fraction of cells to skip, chosen by a stable per-cell hash (0 = none). */
  dither = 0,
  /** When set, only overwrite cells that currently hold this colour. */
  onlyOver?: YarnColor,
): void {
  for (let r = 0; r < p.mask.length; r++) {
    const dr = p.row + rowOffset + r;
    if (dr < 0 || dr >= rows) continue;
    const line = p.mask[r];
    for (let c = 0; c < line.length; c++) {
      if (!line[c]) continue;
      let dc = (p.col + colOffset + c) % cols;
      if (dc < 0) dc += cols;
      // Hash the DESTINATION cell, not the mask cell: the second copy of a
      // repeated wordmark must not inherit the first copy's holes, or the two
      // sides of the hat wear the same broken outline in the same places.
      if (dither > 0 && hash2(0x9e37, dr, dc) < dither) continue;
      if (onlyOver !== undefined && dest[dr][dc] !== onlyOver) continue;
      dest[dr][dc] = color;
    }
  }
}

function paintTextLayer(
  layer: TextLayer,
  cols: number,
  rows: number,
  dest: ColorGrid,
): void {
  const font = getFont(layer.fontId);
  const spacing = layer.letterSpacing ?? 1;

  if (isFreeText(layer)) {
    const halo = layer.haloColorId;
    const haloW = Math.min(2, Math.max(1, Math.round(layer.haloWidth ?? 1)));
    const haloDither = Math.min(0.8, Math.max(0, layer.haloDither ?? 0));
    for (const p of textPlacements(layer, cols)) {
      if (halo) {
        /**
         * TWO RINGS, AND THE OUTER ONE IS PICKY.
         *
         * One stitch of ground is enough to hold a letter apart from the field
         * — as long as what it is being held apart FROM is a different colour.
         * Where a kit strokes its field in the same yarn as its type, and three
         * of the five do, a stroke arriving one stitch away merges with the
         * letter and NORGE stops reading: Keeper was the only kit that stayed
         * crisp, because black is its type and nothing else on the hat.
         *
         * So the inner ring is one stitch of ground against everything, which
         * keeps the field running right up to the letters and through the gaps
         * between them; and the outer ring is a second stitch that only clears
         * cells already holding the TYPE's own colour. Contrasting strokes come
         * as close as they like. Same-coloured ones are held back one further,
         * which is exactly where the ambiguity was.
         */
        stamp(
          { ...p, mask: dilate(p.mask, haloW + 1) },
          halo,
          cols,
          rows,
          dest,
          -(haloW + 1),
          -(haloW + 1),
          haloDither,
          layer.colorId,
        );
        stamp(
          { ...p, mask: dilate(p.mask, haloW) },
          halo,
          cols,
          rows,
          dest,
          -haloW,
          -haloW,
          haloDither,
        );
      }
      // The glyph itself is never dithered — only the contour around it. A
      // letter with holes in it is a damaged letter; a contour with holes in it
      // is a letter sitting in a field.
      stamp(p, layer.colorId, cols, rows, dest);
    }
    return;
  }

  // Legacy band layout: words distributed across the full circumference.
  const words =
    layer.distributeWords && layer.distributeWords.length > 0
      ? layer.distributeWords
      : layer.text.trim()
        ? [layer.text.trim()]
        : [];
  if (words.length === 0) return;
  let mask = layoutText(words, cols, layer.repeat, font, {
    slantDeg: layer.slantDeg,
    letterSpacing: spacing,
    bandRows: rows,
  });
  if (layer.mirror) mask = mask.map(mirrorRow);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (mask[r]?.[c]) dest[r][c] = layer.colorId;
    }
  }
}

function paintMotifLayer(
  layer: MotifLayer,
  cols: number,
  rows: number,
  dest: ColorGrid,
): void {
  const painted = paintMotif(layer.motif, cols, rows, layer.colorIds, layer.params);
  // Studio motifs can be limited to a horizontal band of the chart
  // (rowStart..rowEnd inclusive, bottom-up rows as stored).
  const rowStart = Math.max(0, Number(layer.params.rowStart ?? 0));
  const rowEnd = Math.min(rows - 1, Number(layer.params.rowEnd ?? rows - 1));
  for (let r = rowStart; r <= rowEnd; r++) {
    for (let c = 0; c < cols; c++) {
      const v = painted[r][c];
      if (v !== null) dest[r][c] = v;
    }
  }
}

function paintImageLayer(
  layer: ImageLayer,
  cols: number,
  rows: number,
  dest: ColorGrid,
): void {
  const p = imagePlacement(layer, cols);
  if (!p) return;
  stamp(p, layer.colorId ?? 'red', cols, rows, dest);
}

/**
 * Composite layers bottom→top, then apply override cells (always win).
 */
export function compositeChart(
  layers: ChartLayer[],
  override: OverrideLayer,
  cols: number,
  rows: number,
  background: YarnColor = 'white',
): ColorGrid {
  const dest: ColorGrid = Array.from({ length: rows }, () =>
    Array<YarnColor>(cols).fill(background),
  );

  for (const layer of layers) {
    if (layer.hidden) continue;
    if (layer.kind === 'text') paintTextLayer(layer, cols, rows, dest);
    else if (layer.kind === 'motif') paintMotifLayer(layer, cols, rows, dest);
    else if (layer.kind === 'image') paintImageLayer(layer, cols, rows, dest);
    else if (layer.kind === 'shape') paintShapeLayer(layer, cols, rows, dest);
  }

  for (const [key, color] of Object.entries(override.cells)) {
    const [rs, cs] = key.split(',');
    const r = Number(rs);
    const c = Number(cs);
    if (r >= 0 && r < rows && c >= 0 && c < cols) dest[r][c] = color;
  }

  return dest;
}

/** Boolean red-mask view of a ColorGrid (foreground !== background). */
export function colorGridToMask(
  grid: ColorGrid,
  foreground: YarnColor = 'red',
): boolean[][] {
  return grid.map((row) => row.map((c) => c === foreground));
}
