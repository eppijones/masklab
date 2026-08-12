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
 * Size-independent keep-out zone (the clean area behind the front text):
 * centered at `keepOutCenterFrac` of the circumference, `keepOutHalfW`
 * stitches to each side, rows keepOutRowStart..keepOutRowEnd (inclusive).
 */
export interface KeepOutZone {
  centerFrac: number;
  halfW: number;
  rowStart: number;
  rowEnd: number;
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

export function keepOutZoneFromParams(
  params: Record<string, number | string | boolean>,
): KeepOutZone | null {
  if (params.keepOutHalfW == null) return null;
  return {
    centerFrac: Number(params.keepOutCenterFrac ?? 0.095),
    halfW: Number(params.keepOutHalfW),
    rowStart: Number(params.keepOutRowStart ?? 0),
    rowEnd: Number(params.keepOutRowEnd ?? 999),
    repeat: Math.max(1, Number(params.keepOutRepeat ?? 1)),
    rise: Number(params.keepOutRise ?? 0),
  };
}

export function inKeepOutZone(
  zone: KeepOutZone | null,
  cols: number,
  row: number,
  col: number,
): boolean {
  if (!zone) return false;
  for (let k = 0; k < zone.repeat; k++) {
    const center = (zone.centerFrac + k / zone.repeat) * cols;
    // Signed offset from the panel centre, wrapped onto the cylinder.
    let d = ((col + 0.5 - center) % cols + cols) % cols;
    if (d > cols / 2) d -= cols;
    if (Math.abs(d) > zone.halfW) continue;
    // Distance from the panel's LEFT edge — where the wordmark starts.
    const shift = Math.round((d + zone.halfW) * zone.rise);
    if (row >= zone.rowStart - shift && row <= zone.rowEnd - shift) return true;
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
    echoGap: Number(params.echoGap ?? d.echoGap),
    echoWidth: Number(params.echoWidth ?? d.echoWidth),
    vMin: Number(params.vMin ?? -20),
    vMax: Number(params.vMax ?? rows),
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
          const ci = slashAt(slashes, cols, col + 0.5, r + 0.5);
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
  return grid;
}
