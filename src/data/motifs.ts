import type { YarnColor } from './types';
import {
  buildSlashes,
  buildStreaks,
  slashAt,
  slashParamsDefaults,
  streakAt,
  stripeColorAt,
  type SlashBundleSpec,
  type SlashParams,
  type StreakParams,
  type StripeBand,
  type StripeParams,
} from './streaks';

export type MotifKind =
  | 'stripe'
  | 'chevron'
  | 'checker'
  | 'border'
  | 'dots'
  | 'streaks'
  | 'slash'
  | 'diagonalStripes';

export interface KeepOutRect {
  row: number;
  col: number;
  rows: number;
  cols: number;
}

/** Encode/decode keep-out rects to a flat string so layer params stay JSON-simple. */
export function encodeKeepOut(rects: KeepOutRect[]): string {
  return rects.map((r) => `${r.row},${r.col},${r.rows},${r.cols}`).join(';');
}

export function decodeKeepOut(s: string | undefined): KeepOutRect[] {
  if (!s) return [];
  return s
    .split(';')
    .filter(Boolean)
    .map((part) => {
      const [row, col, rows, cols] = part.split(',').map(Number);
      return { row, col, rows, cols };
    });
}

export function inKeepOut(rects: KeepOutRect[], row: number, col: number): boolean {
  return rects.some(
    (k) =>
      row >= k.row && row < k.row + k.rows && col >= k.col && col < k.col + k.cols,
  );
}

/**
 * Size-independent keep-out zone — the clean panel a wordmark stands on.
 *
 * IT IS DESCRIBED THE WAY A TEXT PLACEMENT IS DESCRIBED, and that is the whole
 * trick. The obvious shape for this is a centre and a half-width, and it is off
 * by half a stitch: `textPlacements` puts a block's LEFT edge at
 * `round(frac·cols − blockW/2)`, and that `round` moves the word up to half a
 * stitch off the fraction it was asked for. A panel centred on the fraction
 * itself therefore hangs half a stitch to one side of the word — which sounds
 * like nothing until it is a stitch of margin on the left, none on the right,
 * and a light-blue slash sitting against the back of the E. That was real, and
 * it is what these fields exist to make impossible: the panel resolves its left
 * edge with the same expression the placement does, so the two round the same
 * way, at every size, always.
 *
 * Nothing here is meant to be typed by hand. `keepOutFromTextPlacement` in
 * `textKeepOut.ts` reads all of it off the text layer's own resolved placement.
 */
export interface KeepOutZone {
  centerFrac: number;
  /** Width of the text BLOCK the placement centres — not of the ink in it. */
  blockW: number;
  /** Where the ink starts inside that block, and how wide it is. */
  inkLeft: number;
  inkW: number;
  /** Stitches of clean ground beyond the ink, each side. */
  pad: number;
  rowStart: number;
  rowEnd: number;
  /**
   * The ragged edge, one entry per panel column, when the wordmark asked for
   * one. `rowStart`/`rowEnd` stay as the straight fallback — a column past the
   * end of the profile, or a zone that never had one, uses them — so every
   * pattern drawn before the panel could follow the letters is unaffected.
   * See `mergeRows` in `textKeepOut.ts` for what these buy.
   */
  rowStarts?: number[];
  rowEnds?: number[];
  /** Number of evenly spaced panels (matches a text layer's repeat). */
  repeat: number;
  /**
   * Rows the panel climbs per stitch, matching the text layer's `rise`. With
   * it the zone is a parallelogram that tracks the rising wordmark; without it
   * a flat rectangle would have to be tall enough to contain the whole climb,
   * and would clear most of the wall of pattern for no reason.
   */
  rise: number;
}

/** "1,1,3,9,11" → [1, 1, 3, 9, 11]. Non-numeric entries drop out. */
function decodeRowProfile(s: string): number[] {
  return s
    .split(',')
    .map((v) => Number(v))
    .filter((v) => Number.isFinite(v));
}

export function keepOutZoneFromParams(
  params: Record<string, number | string | boolean>,
): KeepOutZone | null {
  if (params.keepOutInkW == null) return null;
  return {
    centerFrac: Number(params.keepOutCenterFrac ?? 0.095),
    blockW: Number(params.keepOutBlockW ?? params.keepOutInkW),
    inkLeft: Number(params.keepOutInkLeft ?? 0),
    inkW: Number(params.keepOutInkW),
    pad: Number(params.keepOutPad ?? 0),
    rowStart: Number(params.keepOutRowStart ?? 0),
    rowEnd: Number(params.keepOutRowEnd ?? 999),
    ...(typeof params.keepOutRowStartProfile === 'string'
      ? { rowStarts: decodeRowProfile(params.keepOutRowStartProfile) }
      : {}),
    ...(typeof params.keepOutRowEndProfile === 'string'
      ? { rowEnds: decodeRowProfile(params.keepOutRowEndProfile) }
      : {}),
    repeat: Math.max(1, Number(params.keepOutRepeat ?? 1)),
    rise: Number(params.keepOutRise ?? 0),
  };
}

/** Width of one panel, in stitches. */
export function keepOutZoneWidth(zone: KeepOutZone): number {
  return zone.inkW + 2 * zone.pad;
}

export function inKeepOutZone(
  zone: KeepOutZone | null,
  cols: number,
  row: number,
  col: number,
): boolean {
  if (!zone) return false;
  const width = keepOutZoneWidth(zone);
  for (let k = 0; k < zone.repeat; k++) {
    // The placement's own arithmetic, to the letter — see the note above.
    const blockLeft = Math.round(
      (zone.centerFrac + k / zone.repeat) * cols - zone.blockW / 2,
    );
    const left = blockLeft + zone.inkLeft - zone.pad;
    // Stitches from the panel's LEFT edge, wrapped onto the cylinder.
    const d = (((col - left) % cols) + cols) % cols;
    if (d >= width) continue;
    const shift = Math.round(d * zone.rise);
    const start = zone.rowStarts?.[d] ?? zone.rowStart;
    const end = zone.rowEnds?.[d] ?? zone.rowEnd;
    if (row >= start - shift && row <= end - shift) return true;
  }
  return false;
}

/** "red:5,white:1,blue:5" → StripeBand[] */
export function decodeBands(s: string | undefined): StripeBand[] {
  if (!s) return [{ color: 'red', w: 5 }, { color: 'blue', w: 5 }];
  return s
    .split(',')
    .filter(Boolean)
    .map((part) => {
      const [color, w] = part.split(':');
      return { color: color as YarnColor, w: Number(w) || 1 };
    });
}

export function streakParamsFromLayer(
  params: Record<string, number | string | boolean>,
  rows: number,
): StreakParams {
  return {
    seed: Number(params.seed ?? 20),
    density: Number(params.density ?? 14),
    slope: Number(params.slope ?? 2.4),
    minLen: Number(params.minLen ?? 5),
    maxLen: Number(params.maxLen ?? 12),
    thickness: Number(params.thickness ?? 2.4),
    minHalfW: Number(params.minHalfW ?? 0.28),
    vMin: Number(params.vMin ?? -20),
    vMax: Number(params.vMax ?? rows),
  };
}

export function slashParamsFromLayer(
  params: Record<string, number | string | boolean>,
  rows: number,
): SlashParams {
  const d = slashParamsDefaults();
  // Layer params stay flat and JSON-simple (the studio serialises them), so the
  // bundle is spelled out as `bundle*` keys and folded back into one object.
  const companions = Math.max(0, Math.round(Number(params.bundleCompanions ?? 0)));
  const bundle: SlashBundleSpec | undefined =
    companions > 0
      ? {
          companions,
          spread: Number(params.bundleSpread ?? 3),
          widthMin: Number(params.bundleWidthMin ?? 0.28),
          widthMax: Number(params.bundleWidthMax ?? 0.6),
          stagger: Number(params.bundleStagger ?? 3),
          lenMin: Math.min(1, Math.max(0.1, Number(params.bundleLenMin ?? 0.7))),
        }
      : undefined;
  return {
    seed: Number(params.seed ?? 20),
    count: Number(params.count ?? d.count),
    slope: Number(params.slope ?? d.slope),
    width: Number(params.width ?? d.width),
    thinEvery: Number(params.thinEvery ?? d.thinEvery),
    widthVary: Number(params.widthVary ?? d.widthVary),
    curve: Number(params.curve ?? d.curve),
    kinkRows: Number(params.kinkRows ?? d.kinkRows),
    kinkAmp: Number(params.kinkAmp ?? d.kinkAmp),
    tipSharp: Number(params.tipSharp ?? d.tipSharp),
    tipSharpEnd: Number(params.tipSharpEnd ?? params.tipSharp ?? d.tipSharp),
    echoGap: Number(params.echoGap ?? d.echoGap),
    echoWidth: Number(params.echoWidth ?? d.echoWidth),
    minHalfW: Number(params.minHalfW ?? 0),
    vMin: Number(params.vMin ?? -20),
    vMax: Number(params.vMax ?? rows),
    anchorFrac: params.anchorFrac == null ? null : Number(params.anchorFrac),
    anchorV: Number(params.anchorV ?? 0),
    bundle,
  };
}

/**
 * Slash colour table. The layer's `colorIds` are the stroke colours, cycled in
 * order; the optional `echoColor` param is appended as one extra entry used
 * only by the thin companion strokes, so it never enters the main rotation.
 */
export function slashColorList(
  colorIds: YarnColor[],
  params: Record<string, number | string | boolean>,
): { colors: YarnColor[]; mainCount: number; echoIdx: number } {
  const colors = colorIds.length > 0 ? [...colorIds] : (['red'] as YarnColor[]);
  const mainCount = colors.length;
  const echo = typeof params.echoColor === 'string' ? (params.echoColor as YarnColor) : null;
  if (!echo) return { colors, mainCount, echoIdx: -1 };
  colors.push(echo);
  return { colors, mainCount, echoIdx: colors.length - 1 };
}

export function stripeParamsFromLayer(
  params: Record<string, number | string | boolean>,
): StripeParams {
  return {
    seed: Number(params.seed ?? 20),
    slope: Number(params.slope ?? 2),
    bands: decodeBands(typeof params.bands === 'string' ? params.bands : undefined),
    dither: Number(params.dither ?? 1),
    zigRows: Number(params.zigRows ?? 0),
  };
}

/**
 * Clear any cell of a stroke field that is alone — no 4-neighbour of its own
 * colour, columns wrapping at the seam.
 *
 * THIS IS MASK REPAIR, NOT TASTE. A stroke motif floors its own width, so it
 * does not draw single stitches on its own. What draws them is the keep-out
 * panel: a stroke passing the edge of the wordmark's panel gets sliced by it,
 * and what survives in the corridor can be one stitch of red between the
 * mask and the stroke's own edge. Six of them across Trening, three across
 * Keeper, every one within a stitch or two of a panel boundary. In yarn that
 * is a join and a cut for a mark nobody will ever see.
 *
 * One pass, and deliberately not to convergence: clearing a sliver can leave
 * its neighbour alone in turn, and chasing that cascade would eat the tapered
 * end of a legitimate stroke. One pass removes what the mask cut and nothing
 * else.
 */
function pruneSingleCells(
  grid: (YarnColor | null)[][],
  off: YarnColor | null,
): void {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  const src = grid.map((row) => [...row]);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const v = src[r][c];
      if (v == null || v === off) continue;
      const kept =
        src[r - 1]?.[c] === v ||
        src[r + 1]?.[c] === v ||
        src[r][(c + 1) % cols] === v ||
        src[r][(c - 1 + cols) % cols] === v;
      if (!kept) grid[r][c] = off;
    }
  }
}

export function paintMotif(
  kind: MotifKind,
  cols: number,
  rows: number,
  colorIds: YarnColor[],
  params: Record<string, number | string | boolean> = {},
): (YarnColor | null)[][] {
  const fg = colorIds[0] ?? 'red';
  // Studio layers can leave the "off" cells transparent so a motif reads as
  // ink on whatever is underneath instead of repainting the whole band.
  // Stroke motifs are always transparent — they mark a ground, never own it.
  const transparent =
    params.transparent === true || kind === 'streaks' || kind === 'slash';
  const bg = transparent ? null : (colorIds[1] ?? null);
  const off: YarnColor | null = transparent ? null : (colorIds[1] ?? 'white');
  const grid: (YarnColor | null)[][] = Array.from({ length: rows }, () =>
    Array<YarnColor | null>(cols).fill(bg),
  );

  switch (kind) {
    case 'stripe': {
      const stripeH = Number(params.stripeH ?? 2);
      const colors: YarnColor[] = colorIds.length
        ? colorIds
        : ['red', 'white', 'blue'];
      for (let r = 0; r < rows; r++) {
        const c = colors[Math.floor(r / stripeH) % colors.length];
        for (let col = 0; col < cols; col++) grid[r][col] = c;
      }
      break;
    }
    case 'checker': {
      const cell = Number(params.cell ?? 2);
      for (let r = 0; r < rows; r++) {
        for (let col = 0; col < cols; col++) {
          const on =
            (Math.floor(r / cell) + Math.floor(col / cell)) % 2 === 0;
          grid[r][col] = on ? fg : off;
        }
      }
      break;
    }
    case 'chevron': {
      const period = Number(params.period ?? 10);
      for (let r = 0; r < rows; r++) {
        for (let col = 0; col < cols; col++) {
          const phase = (col + r * 2) % period;
          const on = phase < period / 2;
          grid[r][col] = on ? fg : off;
        }
      }
      break;
    }
    case 'border': {
      const t = Number(params.thickness ?? 1);
      for (let r = 0; r < rows; r++) {
        for (let col = 0; col < cols; col++) {
          const edge =
            r < t || r >= rows - t || col < t || col >= cols - t;
          grid[r][col] = edge ? fg : off;
        }
      }
      break;
    }
    case 'dots': {
      const spacing = Number(params.spacing ?? 4);
      for (let r = 0; r < rows; r++) {
        for (let col = 0; col < cols; col++) {
          const on = r % spacing === 0 && col % spacing === 0;
          grid[r][col] = on ? fg : off;
        }
      }
      break;
    }
    case 'streaks': {
      // Seeded diagonal brush strokes (transparent background).
      const p = streakParamsFromLayer(params, rows);
      const streaks = buildStreaks(cols, p);
      const keepOut = decodeKeepOut(
        typeof params.keepOut === 'string' ? params.keepOut : undefined,
      );
      const zone = keepOutZoneFromParams(params);
      for (let r = 0; r < rows; r++) {
        for (let col = 0; col < cols; col++) {
          if (inKeepOut(keepOut, r, col)) continue;
          if (inKeepOutZone(zone, cols, r, col)) continue;
          if (streakAt(streaks, cols, p.seed, col + 0.5, r + 0.5, p.minHalfW)) {
            grid[r][col] = fg;
          }
        }
      }
      break;
    }
    case 'slash': {
      // A few long, clean, double-tapered strokes (transparent background).
      const p = slashParamsFromLayer(params, rows);
      const { colors, mainCount, echoIdx } = slashColorList(colorIds, params);
      const slashes = buildSlashes(cols, p, mainCount, echoIdx);
      const keepOut = decodeKeepOut(
        typeof params.keepOut === 'string' ? params.keepOut : undefined,
      );
      const zone = keepOutZoneFromParams(params);
      for (let r = 0; r < rows; r++) {
        for (let col = 0; col < cols; col++) {
          if (inKeepOut(keepOut, r, col)) continue;
          if (inKeepOutZone(zone, cols, r, col)) continue;
          const ci = slashAt(slashes, cols, col + 0.5, r + 0.5, p.minHalfW ?? 0);
          if (ci >= 0) grid[r][col] = colors[ci] ?? fg;
        }
      }
      break;
    }
    case 'diagonalStripes': {
      // Full-surface repeating diagonal bands with dithered boundaries.
      const p = stripeParamsFromLayer(params);
      const keepOut = decodeKeepOut(
        typeof params.keepOut === 'string' ? params.keepOut : undefined,
      );
      const zone = keepOutZoneFromParams(params);
      for (let r = 0; r < rows; r++) {
        for (let col = 0; col < cols; col++) {
          if (inKeepOut(keepOut, r, col)) continue;
          if (inKeepOutZone(zone, cols, r, col)) continue;
          grid[r][col] = stripeColorAt(cols, p, col + 0.5, r + 0.5);
        }
      }
      break;
    }
  }
  // Opt-in, and only the designs that mask a wordmark out of the field ask for
  // it — see `pruneSingleCells`. Off elsewhere, so a studio motif still draws
  // exactly what its parameters say.
  // `bg`, not `off`: the target is whatever an UNPAINTED cell of this motif
  // holds — null for a stroke field, so the cell falls through to the design's
  // own ground exactly as a masked cell does.
  if (params.pruneSingles === true) pruneSingleCells(grid, bg);
  return grid;
}
