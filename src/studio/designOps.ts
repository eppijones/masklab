import {
  emptyOverride,
  type ChartLayer,
  type ShapeLayer,
  type TextLayer,
} from '../data/chartLayers';
import type { YarnColor } from '../data/types';
import type { StudioDesign } from './design';

/**
 * Pure design operations: the clamps, the wraps and the patch resolver.
 *
 * Kept out of the store so they can be exercised without React or
 * localStorage — these are the rules that make a design impossible to break,
 * so they are the rules that most need their own tests.
 */

export const LIMITS = {
  scale: [1, 6],
  letterSpacing: [0, 8],
  slantDeg: [-30, 30],
  repeat: [1, 8],
  rise: [-0.3, 0.3],
  arc: [-12, 12],
  shapeW: [1, 200],
  shapeH: [1, 40],
  rotation: [-180, 180],
  repeatX: [1, 24],
  repeatY: [1, 8],
  spacing: [0, 60],
  outline: [0, 2],
  bandRows: [6, 35],
  omkrets: [44, 64],
} as const;

function clampNum(v: unknown, lo: number, hi: number, fallback: number): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(hi, Math.max(lo, n));
}

function clampInt(v: unknown, lo: number, hi: number, fallback: number): number {
  return Math.round(clampNum(v, lo, hi, fallback));
}

/** Wrap a position around the hat: 0.99 + 0.03 comes back out at 0.02. */
export function wrapFrac(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return ((v % 1) + 1) % 1;
}

/**
 * Every value a control, a drag, a share code or an old localStorage entry can
 * produce, forced back into the range the crochet pipeline can actually build.
 * Nothing reaches the chart without passing through here.
 */
export function normalizeLayer(layer: ChartLayer): ChartLayer {
  if (layer.kind === 'text') {
    return {
      ...layer,
      text: typeof layer.text === 'string' ? layer.text.slice(0, 40) : '',
      slantDeg: clampInt(layer.slantDeg, ...LIMITS.slantDeg, 0),
      repeat: clampInt(layer.repeat, ...LIMITS.repeat, 1),
      letterSpacing: clampInt(
        layer.letterSpacing ?? 1,
        ...LIMITS.letterSpacing,
        1,
      ),
      scaleX: clampInt(layer.scaleX ?? 1, ...LIMITS.scale, 1),
      scaleY: clampInt(layer.scaleY ?? 1, ...LIMITS.scale, 1),
      arcRows: clampInt(layer.arcRows ?? 0, ...LIMITS.arc, 0),
      rise: Number(clampNum(layer.rise ?? 0, ...LIMITS.rise, 0).toFixed(3)),
      haloWidth: layer.haloColorId ? clampInt(layer.haloWidth ?? 1, 1, 2, 1) : undefined,
      // Rounded to a ten-thousandth: finer than a stitch on any hat, and it
      // keeps repeated wrapping from drifting into float dust.
      centerFrac:
        layer.centerFrac == null
          ? undefined
          : Math.round(wrapFrac(layer.centerFrac) * 1e4) / 1e4,
      anchor: {
        row: clampInt(layer.anchor?.row, -40, 40, 0),
        col: clampInt(layer.anchor?.col, -400, 400, 0),
      },
    };
  }
  if (layer.kind === 'shape') {
    const colorIds = (Array.isArray(layer.colorIds) ? layer.colorIds : [])
      .slice(0, 3)
      .filter(Boolean);
    return {
      ...layer,
      w: clampInt(layer.w, ...LIMITS.shapeW, 12),
      h: clampInt(layer.h, ...LIMITS.shapeH, 8),
      rotationDeg: clampInt(layer.rotationDeg ?? 0, ...LIMITS.rotation, 0),
      repeatX: clampInt(layer.repeatX ?? 1, ...LIMITS.repeatX, 1),
      repeatY: clampInt(layer.repeatY ?? 1, ...LIMITS.repeatY, 1),
      spacingX: clampInt(layer.spacingX ?? 2, ...LIMITS.spacing, 2),
      spacingY: clampInt(layer.spacingY ?? 1, ...LIMITS.spacing, 1),
      outlineWidth: layer.outlineColorId
        ? clampInt(layer.outlineWidth ?? 1, 1, LIMITS.outline[1], 1)
        : undefined,
      colorIds: colorIds.length > 0 ? colorIds : ['red'],
      centerFrac:
        layer.centerFrac == null
          ? undefined
          : Math.round(wrapFrac(layer.centerFrac) * 1e4) / 1e4,
      anchor: {
        row: clampInt(layer.anchor?.row, -40, 40, 0),
        col: clampInt(layer.anchor?.col, -400, 400, 0),
      },
    };
  }
  if (layer.kind === 'image') {
    return {
      ...layer,
      cols: clampInt(layer.cols, 1, 400, 1),
      rows: clampInt(layer.rows, 1, 40, 1),
      contrast: clampInt(layer.contrast, -50, 50, 0),
      brightness: clampInt(layer.brightness ?? 0, -50, 50, 0),
      anchor: {
        row: clampInt(layer.anchor?.row, -40, 40, 0),
        col: clampInt(layer.anchor?.col, -400, 400, 0),
      },
    };
  }
  return layer;
}

/** The same treatment for the design as a whole. */
export function normalizeDesign(d: StudioDesign): StudioDesign {
  return {
    ...d,
    title: (d.title ?? '').slice(0, 60) || 'Min bøttehatt',
    bandRows: clampInt(d.bandRows, ...LIMITS.bandRows, 10),
    omkrets_cm: clampInt(d.omkrets_cm, ...LIMITS.omkrets, 56),
    brimStyle: d.brimStyle === 'wave' ? 'wave' : 'bucket',
    // Pass-through: the studio cannot author these, only inherit them.
    crown: d.crown,
    brimFinish: d.brimFinish,
    sourceId: d.sourceId,
    layers: (Array.isArray(d.layers) ? d.layers : []).map(normalizeLayer),
    override:
      d.override && typeof d.override === 'object' && d.override.cells
        ? d.override
        : emptyOverride(),
  };
}

/**
 * Layer patches arrive from generic controls, so they are keyed loosely
 * ('color', 'row', 'param:cell') and resolved per layer kind here.
 */
export function applyLayerPatch(
  layer: ChartLayer,
  patch: Record<string, unknown>,
): ChartLayer {
  let next: ChartLayer = { ...layer };
  for (const [key, value] of Object.entries(patch)) {
    if (key === 'color') {
      if (next.kind === 'text') next = { ...next, colorId: value as YarnColor };
      else if (next.kind === 'image') next = { ...next, colorId: value as YarnColor };
      else if (next.kind === 'motif') {
        next = { ...next, colorIds: [value as YarnColor, next.colorIds[1]] };
      } else if (next.kind === 'shape') {
        next = { ...next, colorIds: [value as YarnColor, ...next.colorIds.slice(1)] };
      }
      continue;
    }
    // 'ink:1' … 'ink:3' address a shape's individual colour slots.
    if (key.startsWith('ink:') && next.kind === 'shape') {
      const slot = Number(key.slice(4)) - 1;
      const colorIds = [...next.colorIds];
      while (colorIds.length <= slot) colorIds.push(colorIds[0]);
      colorIds[slot] = value as YarnColor;
      next = { ...next, colorIds };
      continue;
    }
    if (key === 'bgColor' && next.kind === 'motif') {
      next = { ...next, colorIds: [next.colorIds[0], value as YarnColor] };
      continue;
    }
    if (key === 'row') {
      next = { ...next, anchor: { ...next.anchor, row: Number(value) } };
      continue;
    }
    if (key === 'col') {
      next = { ...next, anchor: { ...next.anchor, col: Number(value) } };
      continue;
    }
    if (key.startsWith('param:') && next.kind === 'motif') {
      next = {
        ...next,
        params: { ...next.params, [key.slice(6)]: value as number | string | boolean },
      };
      continue;
    }
    if ((key === 'outlineColorId' || key === 'altColorId') && value === null) {
      const rest = { ...(next as ShapeLayer) } as Record<string, unknown>;
      delete rest[key];
      if (key === 'outlineColorId') delete rest.outlineWidth;
      next = rest as unknown as ChartLayer;
      continue;
    }
    if (key === 'haloColorId' && value === null) {
      // Explicit "no outline" — dropping the key is what clears it.
      const { haloColorId: _drop, haloWidth: _dropW, ...rest } = next as TextLayer;
      next = rest as ChartLayer;
      continue;
    }
    next = { ...next, [key]: value } as ChartLayer;
  }
  return normalizeLayer(next);
}

