import type { ChartLayer, ShapeLayer, TextLayer } from '../../data/chartLayers';
import { placementBox, textPlacements } from '../../data/layerGeometry';
import { getShape } from '../../data/shapes/catalog';
import type { YarnColor } from '../../data/types';
import { yarnContrast } from '../craftRules';
import { designColors, type StudioDesign } from '../design';
import type { Brief, Theme } from './brief';
import { composeDesign, fitText, LAYOUTS, rng, type LayoutId } from './compose';

/**
 * Remixing a hat you already have.
 *
 * Each control is one clear editorial move — fewer things, bigger things,
 * more Nordic — applied to the layers that are already there rather than
 * starting over. That is the difference between a design tool and a slot
 * machine: you can see what changed and undo it.
 */

export type RemixId =
  | 'minimal'
  | 'bold'
  | 'nordic'
  | 'football'
  | 'retro'
  | 'simplify'
  | 'layout';

export const REMIXES: { id: RemixId; label: string }[] = [
  { id: 'minimal', label: 'Mer minimal' },
  { id: 'bold', label: 'Mer kraftig' },
  { id: 'nordic', label: 'Mer nordisk' },
  { id: 'football', label: 'Mer fotball' },
  { id: 'retro', label: 'Mer retro' },
  { id: 'simplify', label: 'Forenkle' },
  { id: 'layout', label: 'Ny layout' },
];

/** Read a design back into a brief, so it can be recomposed. */
export function briefFromDesign(d: StudioDesign): Brief {
  const words = d.layers
    .filter((l): l is TextLayer => l.kind === 'text')
    .map((l) => l.text)
    .filter(Boolean);
  const motifs = d.layers
    .filter((l): l is ShapeLayer => l.kind === 'shape')
    .map((l) => l.shapeId)
    .filter((id) => !getShape(id)?.tiling && id !== 'rect');
  return {
    words: words.slice(0, 2),
    colors: designColors(d).slice(0, 3),
    themes: new Set<Theme>(),
    motifs,
    source: '',
  };
}

function isDecoration(l: ChartLayer): boolean {
  if (l.kind !== 'shape') return false;
  return l.shapeId === 'rect' || getShape(l.shapeId)?.tiling === true;
}

/** Biggest text layer — the one the hat is actually about. */
function headline(d: StudioDesign, cols: number): TextLayer | null {
  let best: TextLayer | null = null;
  let bestArea = -1;
  for (const l of d.layers) {
    if (l.kind !== 'text') continue;
    const box = textPlacements(l, cols).map(placementBox)[0];
    const area = box ? box.width * (box.row1 - box.row0 + 1) : 0;
    if (area > bestArea) {
      bestArea = area;
      best = l;
    }
  }
  return best;
}

/** Recolour a design onto a new three-yarn palette, keeping the roles. */
function repaint(
  d: StudioDesign,
  ground: YarnColor,
  ink: YarnColor,
  accent: YarnColor,
): StudioDesign {
  const remap = (c: YarnColor): YarnColor => {
    if (c === d.baseColor) return ground;
    if (c === d.brimColor) return accent;
    return yarnContrast(c, ground) < 0.15 ? ink : c === d.crownColor ? ground : ink;
  };
  return {
    ...d,
    baseColor: ground,
    crownColor: ground,
    brimColor: accent,
    layers: d.layers.map((l) => {
      if (l.kind === 'text') {
        return {
          ...l,
          colorId: remap(l.colorId),
          haloColorId: l.haloColorId ? ground : undefined,
        };
      }
      if (l.kind === 'shape') {
        return {
          ...l,
          colorIds: l.colorIds.map((_, i) => (i === 0 ? ink : i === 1 ? accent : ground)),
          altColorId: l.altColorId ? accent : undefined,
          outlineColorId: l.outlineColorId ? ground : undefined,
        };
      }
      return l;
    }),
  };
}

export function remixDesign(
  d: StudioDesign,
  id: RemixId,
  cols: number,
  seed = Date.now(),
): StudioDesign {
  const r = rng(seed);
  const head = headline(d, cols);

  switch (id) {
    case 'minimal': {
      // Keep the headline and at most one motif; strip rules, outlines and
      // alternate colours. Negative space is the point.
      const motif = d.layers.find(
        (l): l is ShapeLayer => l.kind === 'shape' && !isDecoration(l),
      );
      const layers: ChartLayer[] = [];
      if (motif) {
        layers.push({
          ...motif,
          outlineColorId: undefined,
          outlineWidth: undefined,
          altColorId: undefined,
          repeatX: Math.min(motif.repeatX, 2),
        });
      }
      if (head) layers.push({ ...head, haloColorId: undefined, haloWidth: undefined });
      return { ...d, layers, override: { kind: 'override', cells: {} } };
    }

    case 'bold': {
      const layers = d.layers.map((l) => {
        if (l.kind === 'text') {
          const fit = fitText(l.text, Math.floor(cols / 2.2), d.bandRows - 2, {
            fonts: [l.fontId],
            slantDeg: l.slantDeg,
            bold: true,
          });
          return fit
            ? {
                ...l,
                scaleX: fit.scaleX,
                scaleY: fit.scaleY,
                letterSpacing: fit.letterSpacing,
                bold: true,
                anchor: {
                  ...l.anchor,
                  row: Math.max(0, Math.round((d.bandRows - fit.h) / 2)),
                },
              }
            : { ...l, bold: true };
        }
        if (l.kind === 'shape' && !isDecoration(l)) {
          const grow = 1.35;
          const spec = getShape(l.shapeId);
          const w = Math.min(Math.round(l.w * grow), Math.floor(cols / 3));
          return {
            ...l,
            w,
            h: Math.min(d.bandRows, Math.round(w / (spec?.aspect ?? 1))),
          };
        }
        return l;
      });
      return { ...d, layers };
    }

    case 'nordic': {
      const next = repaint(d, 'red', 'white', 'blue');
      const hasBand = next.layers.some(
        (l) => l.kind === 'shape' && getShape(l.shapeId)?.tiling,
      );
      if (hasBand) return next;
      const band: ShapeLayer = {
        kind: 'shape',
        id: `shape-nordic-${Math.floor(r() * 1e6)}`,
        shapeId: 'p-nordic',
        w: cols,
        // Never below the pattern's own minimum: a squashed Nordic border is
        // just noise.
        h: Math.max(getShape('p-nordic')?.minH ?? 7, Math.floor(next.bandRows / 3)),
        rotationDeg: 0,
        anchor: { row: 0, col: 0 },
        centerFrac: 0.5,
        colorIds: ['white', 'red'],
        repeatX: 1,
        repeatY: 1,
        spacingX: 0,
        spacingY: 0,
        wrap: true,
        simplify: true,
      };
      // The band goes underneath the wordmark, never over it.
      return { ...next, layers: [band, ...next.layers] };
    }

    case 'football': {
      const next = repaint(d, d.baseColor, d.brimColor, d.crownColor);
      const hasCrest = next.layers.some(
        (l) => l.kind === 'shape' && ['ball', 'shield', 'badge-shield', 'trophy'].includes(l.shapeId),
      );
      if (hasCrest) return next;
      const size = 10;
      const crest: ShapeLayer = {
        kind: 'shape',
        id: `shape-crest-${Math.floor(r() * 1e6)}`,
        shapeId: 'ball',
        w: size,
        h: size,
        rotationDeg: 0,
        anchor: { row: Math.max(0, Math.round((next.bandRows - size) / 2)), col: 0 },
        centerFrac: 0,
        colorIds: ['white', 'black'],
        repeatX: Math.max(2, Math.floor(cols / (size + 14))),
        repeatY: 1,
        spacingX: 14,
        spacingY: 0,
        wrap: true,
        simplify: true,
      };
      return { ...next, layers: [crest, ...next.layers] };
    }

    case 'retro': {
      const next = repaint(d, 'peach', 'red', 'blue');
      return {
        ...next,
        layers: next.layers.map((l) => {
          if (l.kind !== 'text') return l;
          const slantDeg = l.slantDeg === 0 ? 12 : 0;
          // A serif is wider than a block: re-fit, or the wordmark that used
          // to go twice round the hat suddenly collides with itself.
          const fit = fitText(
            l.text,
            Math.floor(cols / Math.max(1, l.repeat)) - 4,
            d.bandRows - 2,
            { fonts: ['serif'], slantDeg },
          );
          return fit
            ? {
                ...l,
                slantDeg,
                fontId: 'serif' as const,
                scaleX: fit.scaleX,
                scaleY: fit.scaleY,
                letterSpacing: fit.letterSpacing,
                bold: fit.bold,
                anchor: {
                  ...l.anchor,
                  row: Math.max(0, Math.round((d.bandRows - fit.h) / 2)),
                },
              }
            : { ...l, slantDeg };
        }),
      };
    }

    case 'simplify': {
      // Everything the grid cannot hold, gone: sub-stitch detail, third
      // colours, stacked repeats.
      const layers = d.layers
        .map((l) =>
          l.kind === 'shape'
            ? {
                ...l,
                simplify: true,
                colorIds: l.colorIds.slice(0, 2),
                repeatY: 1,
                outlineColorId: undefined,
                outlineWidth: undefined,
              }
            : l,
        )
        .filter((l) => {
          if (l.kind !== 'shape') return true;
          const spec = getShape(l.shapeId);
          return l.w >= (spec?.minW ?? 3) && l.h >= (spec?.minH ?? 3);
        });
      return { ...d, layers };
    }

    case 'layout': {
      const brief = briefFromDesign(d);
      const current = d.layers.length;
      const next = LAYOUTS[Math.floor(r() * LAYOUTS.length) % LAYOUTS.length];
      const built = composeDesign(brief, next.id as LayoutId, { cols, seed });
      void current;
      return { ...built, title: d.title, sizeId: d.sizeId, hookMm: d.hookMm, omkrets_cm: d.omkrets_cm };
    }
  }
}
