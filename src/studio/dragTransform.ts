import { LIMITS, wrapFrac } from './designOps';

/**
 * What a drag on the chart does to a layer.
 *
 * Pulled out of the canvas component on purpose: this is the arithmetic that
 * decides whether grabbing a corner feels honest, and it is much easier to
 * trust when it can be checked directly instead of through a browser.
 * Everything here is measured in stitches and rows.
 */

export type HandleId = 'move' | 'scale' | 'scale-x' | 'scale-y' | 'slant' | 'rise';

/** The layer values at the moment the pointer went down. */
export interface DragStart {
  row: number;
  col: number;
  /** null for layers positioned by absolute column (photos). */
  centerFrac: number | null;
  scaleX: number;
  scaleY: number;
  slantDeg: number;
  rise: number;
}

export interface DragBox {
  row0: number;
  row1: number;
  col0: number;
  width: number;
}

export interface DragInput {
  handle: HandleId;
  start: DragStart;
  box: DragBox;
  /** Pointer at grab, in chart cells (fractional). */
  fromRow: number;
  fromCol: number;
  /** Pointer now, in chart cells (fractional). */
  toRow: number;
  toCol: number;
  cols: number;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

function clampScale(v: number): number {
  const n = Number.isFinite(v) ? Math.round(v) : 1;
  return clamp(n, LIMITS.scale[0], LIMITS.scale[1]);
}

/**
 * The patch a drag produces. Row clamping is the caller's job — it needs the
 * band height and the layer's own ink to know the real limits.
 */
export function dragPatch(d: DragInput): Record<string, unknown> {
  const boxW = Math.max(1, d.box.width);
  const boxH = Math.max(1, d.box.row1 - d.box.row0 + 1);
  const dRow = Math.round(d.toRow - d.fromRow);
  const dCol = Math.round(d.toCol - d.fromCol);

  switch (d.handle) {
    case 'move': {
      const patch: Record<string, unknown> = { row: d.start.row + dRow };
      if (d.start.centerFrac != null) {
        // Same rounding the normalizer uses, so a drag and its saved value
        // are the same number rather than one float-dust apart.
        patch.centerFrac =
          Math.round(wrapFrac(d.start.centerFrac + dCol / d.cols) * 1e4) / 1e4;
      } else {
        patch.col = d.start.col + dCol;
      }
      return patch;
    }

    case 'scale':
    case 'scale-x':
    case 'scale-y': {
      // Whole-stitch magnification: how much bigger the box got, rounded,
      // is the multiplier the font master gets. A stitch is the pixel here,
      // so there is no such thing as 1.5×.
      const wantW = Math.max(1, d.toCol - d.box.col0);
      const wantH = Math.max(1, d.toRow - d.box.row0);
      const patch: Record<string, unknown> = {};
      if (d.handle !== 'scale-y') {
        patch.scaleX = clampScale((d.start.scaleX * wantW) / boxW);
      }
      if (d.handle !== 'scale-x') {
        patch.scaleY = clampScale((d.start.scaleY * wantH) / boxH);
      }
      return patch;
    }

    case 'slant': {
      // Sliding the top edge sideways IS a shear: the angle is the one whose
      // tangent is "sideways travel over box height", which keeps the letters
      // under the pointer instead of racing ahead of it.
      const dx = d.toCol - d.fromCol;
      const deg = Math.round((Math.atan2(dx, boxH) * 180) / Math.PI);
      return {
        slantDeg: clamp(
          d.start.slantDeg + deg,
          LIMITS.slantDeg[0],
          LIMITS.slantDeg[1],
        ),
      };
    }

    case 'rise': {
      // Lifting the knob lifts the tail of the word: rows climbed per stitch
      // travelled, so the same drag means the same tilt at any word length.
      const dy = d.fromRow - d.toRow;
      const rise = clamp(
        d.start.rise + dy / boxW,
        LIMITS.rise[0],
        LIMITS.rise[1],
      );
      return { rise: Math.round(rise * 100) / 100 };
    }
  }
}

/** The readout shown under the pointer while a drag is live. */
export function dragHint(
  handle: HandleId,
  patch: Record<string, unknown>,
  start: DragStart,
): string {
  switch (handle) {
    case 'move':
      return patch.centerFrac != null
        ? `rad ${Number(patch.row) + 1} · ${Math.round(Number(patch.centerFrac) * 100)} % rundt`
        : `rad ${Number(patch.row) + 1} · maske ${patch.col}`;
    case 'scale':
    case 'scale-x':
    case 'scale-y':
      return `skala ${patch.scaleX ?? start.scaleX}× / ${patch.scaleY ?? start.scaleY}×`;
    case 'slant':
      return `skråning ${patch.slantDeg}°`;
    case 'rise':
      return `stigning ${Math.round(Number(patch.rise) * 100)} %`;
  }
}
