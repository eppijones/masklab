import type { ShapeLayer, TextLayer } from '../../data/chartLayers';
import { getFont } from '../../data/fonts/registry';
import type { FontId } from '../../data/fonts/types';
import { rasterizeText } from '../../data/rasterizeText';
import { getShape } from '../../data/shapes/catalog';
import type { YarnColor } from '../../data/types';
import { yarnContrast } from '../craftRules';
import { blankDesign, type StudioDesign } from '../design';
import type { Brief } from './brief';

/**
 * Composing a hat from a brief.
 *
 * Four layouts, each of which knows what a bucket hat band can hold: a wall
 * about 110 stitches around and ten to thirty-five rows high, seen from three
 * metres away. So: one big idea per hat, two or three yarns, and enough plain
 * ground around the artwork that the artwork reads. Everything that comes out
 * of here is an ordinary editable layer — there is nothing to "apply" and
 * nothing the user cannot then drag, recolour or delete.
 */

export type LayoutId = 'wordmark' | 'crest' | 'band' | 'icons';

export const LAYOUTS: { id: LayoutId; label: string; note: string }[] = [
  { id: 'wordmark', label: 'Ordmerke', note: 'Ett stort ord, foran og bak' },
  { id: 'crest', label: 'Merke', note: 'Emblem foran, tekst under' },
  { id: 'band', label: 'Bord', note: 'Nordisk bord rundt hele' },
  { id: 'icons', label: 'Motivrekke', note: 'Motiv rundt, tekst foran' },
];

/** Deterministic per-seed randomness, so a variation can be reproduced. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(list: T[], r: () => number): T {
  return list[Math.floor(r() * list.length) % list.length];
}

// ------------------------------------------------------------------ palette

export interface Palette {
  ground: YarnColor;
  ink: YarnColor;
  accent: YarnColor;
  edge: YarnColor;
}

const THEME_PALETTES: Record<string, [YarnColor, YarnColor, YarnColor][]> = {
  nordic: [
    ['red', 'white', 'blue'],
    ['white', 'blue', 'red'],
    ['blue', 'white', 'red'],
  ],
  football: [
    ['red', 'white', 'blue'],
    ['blue', 'yellow', 'white'],
    ['black', 'white', 'red'],
  ],
  retro: [
    ['peach', 'red', 'blue'],
    ['gold', 'black', 'white'],
    ['stone', 'red', 'slate'],
  ],
  default: [
    ['white', 'blue', 'red'],
    ['blue', 'white', 'gold'],
    ['black', 'white', 'yellow'],
  ],
};

/**
 * Three yarns that can actually be told apart at arm's length, honouring the
 * colours the user named and filling the gaps from the theme.
 */
export function buildPalette(brief: Brief, r: () => number): Palette {
  const theme = brief.themes.has('nordic')
    ? 'nordic'
    : brief.themes.has('football')
      ? 'football'
      : brief.themes.has('retro')
        ? 'retro'
        : 'default';
  const fallback = pick(THEME_PALETTES[theme], r);

  const named = [...brief.colors];
  const ground = named[0] ?? fallback[0];
  // The ink has to fight the ground; if the user's second colour cannot, take
  // the one from the theme that can.
  const inkCandidates = [...named.slice(1), ...fallback, 'white' as YarnColor];
  const ink =
    inkCandidates.find((c) => c !== ground && yarnContrast(c, ground) > 0.22) ??
    (yarnContrast('white', ground) > yarnContrast('black', ground) ? 'white' : 'black');
  const accent =
    [...named, ...fallback].find(
      (c) => c !== ground && c !== ink && yarnContrast(c, ground) > 0.08,
    ) ?? ink;
  const edge =
    [...named.slice(1), ...fallback].find((c) => c !== ground) ?? ink;

  return { ground, ink, accent, edge };
}

// ---------------------------------------------------------------- auto-fit

export interface FitResult {
  fontId: FontId;
  scaleX: number;
  scaleY: number;
  letterSpacing: number;
  bold: boolean;
  /** Rendered size at these settings. */
  w: number;
  h: number;
}

/** Width of a word at given settings, in stitches. */
export function measureText(
  text: string,
  fontId: FontId,
  scaleX: number,
  scaleY: number,
  letterSpacing: number,
  bold: boolean,
  slantDeg = 0,
): { w: number; h: number } {
  const m = rasterizeText(text, getFont(fontId), {
    slantDeg,
    letterSpacing,
    scaleX,
    scaleY,
    bold,
  });
  return { w: m[0]?.length ?? 0, h: m.length };
}

/** Cap height below which a word stops being a word. */
export const MIN_CAP_ROWS = 5;

/**
 * Auto-fit: the largest setting of a word that still fits the space it has.
 *
 * Tries the biggest first and walks down, because a wordmark on a hat wants
 * to be as large as the band allows — and stops at the point where the letters
 * would be too small to read, rather than shrinking into illegibility.
 */
export function fitText(
  text: string,
  maxW: number,
  maxH: number,
  opts: { fonts?: FontId[]; slantDeg?: number; bold?: boolean } = {},
): FitResult | null {
  const fonts = opts.fonts ?? (['blokk', 'smal', 'lyn'] as FontId[]);
  const slantDeg = opts.slantDeg ?? 0;
  let best: FitResult | null = null;

  for (const fontId of fonts) {
    const cap = getFont(fontId).cell.h;
    for (let scaleY = 4; scaleY >= 1; scaleY--) {
      if (cap * scaleY > maxH) continue;
      if (cap * scaleY < MIN_CAP_ROWS && scaleY > 1) continue;
      for (let scaleX = Math.min(4, scaleY + 1); scaleX >= 1; scaleX--) {
        for (const letterSpacing of [1, 0, 2]) {
          for (const bold of opts.bold != null ? [opts.bold] : [false, true]) {
            const m = measureText(text, fontId, scaleX, scaleY, letterSpacing, bold, slantDeg);
            if (m.w > maxW || m.h > maxH) continue;
            const area = m.w * m.h;
            if (!best || area > best.w * best.h) {
              best = { fontId, scaleX, scaleY, letterSpacing, bold, w: m.w, h: m.h };
            }
          }
        }
      }
    }
  }
  return best;
}

// ----------------------------------------------------------------- layers

let seq = 0;
function nid(prefix: string): string {
  return `${prefix}-a${Date.now().toString(36)}-${seq++}`;
}

function textLayer(p: Partial<TextLayer> & { text: string; colorId: YarnColor }): TextLayer {
  return {
    kind: 'text',
    id: nid('text'),
    fontId: 'blokk',
    slantDeg: 0,
    anchor: { row: 0, col: 0 },
    repeat: 2,
    mirror: false,
    letterSpacing: 1,
    centerFrac: 0.095,
    scaleX: 1,
    scaleY: 1,
    ...p,
  };
}

function shapeLayer(p: Partial<ShapeLayer> & { shapeId: string }): ShapeLayer {
  return {
    kind: 'shape',
    id: nid('shape'),
    w: 12,
    h: 10,
    rotationDeg: 0,
    anchor: { row: 0, col: 0 },
    centerFrac: 0.095,
    colorIds: ['red'],
    repeatX: 1,
    repeatY: 1,
    spacingX: 4,
    spacingY: 1,
    simplify: true,
    ...p,
  };
}

/** Colour slots for a shape, drawn from the palette in a sensible order. */
function shapeColors(shapeId: string, pal: Palette): YarnColor[] {
  const inks = getShape(shapeId)?.inks ?? 1;
  if (shapeId === 'flag-no') return ['red', 'white', 'blue'];
  if (inks >= 3) return [pal.ink, pal.ground, pal.accent];
  if (inks === 2) return [pal.ink, pal.accent];
  return [pal.ink];
}

/** Height a shape needs to keep its own proportions at a given width. */
function shapeSize(shapeId: string, w: number): { w: number; h: number } {
  const spec = getShape(shapeId);
  const aspect = spec?.aspect ?? 1;
  const h = Math.max(spec?.minH ?? 4, Math.round(w / aspect));
  return { w: Math.max(spec?.minW ?? 4, Math.round(w)), h };
}

// ---------------------------------------------------------------- layouts

export interface ComposeOpts {
  cols: number;
  seed: number;
}

/**
 * Build a complete, valid design from a brief.
 *
 * Band height is chosen by the layout rather than left at the default: a crest
 * needs room to be a crest, a wordmark band does not.
 */
export function composeDesign(
  brief: Brief,
  layout: LayoutId,
  opts: ComposeOpts,
): StudioDesign {
  const r = rng(opts.seed);
  const pal = buildPalette(brief, r);
  const cols = opts.cols;
  const word = brief.words[0] ?? (brief.themes.has('nordic') ? 'NORGE' : 'HEIA');
  const second = brief.words[1] ?? null;
  const motif = brief.motifs[0] ?? (brief.themes.has('football') ? 'ball' : 'selbu');
  const minimal = brief.themes.has('minimal');
  const bold = brief.themes.has('bold');
  const retro = brief.themes.has('retro');

  const base: StudioDesign = {
    ...blankDesign(),
    title: word ? `${word}-hatten` : 'Ny hatt',
    baseColor: pal.ground,
    crownColor: pal.ground,
    brimColor: pal.edge,
    brimStyle: 'bucket',
  };

  const layers: (TextLayer | ShapeLayer)[] = [];

  if (layout === 'wordmark') {
    const bandRows = minimal ? 12 : 14;
    const room = bandRows - (minimal ? 2 : 4);
    const fit = fitText(word, Math.floor(cols / 2.4), room, {
      slantDeg: retro ? 12 : 0,
      bold: bold || undefined,
    });
    if (!minimal) {
      // A rule above and below turns a floating word into a proper band.
      for (const row of [0, bandRows - 1]) {
        layers.push(
          shapeLayer({
            shapeId: 'rect',
            w: cols,
            h: 1,
            anchor: { row, col: 0 },
            centerFrac: 0.5,
            colorIds: [pal.accent],
            wrap: true,
          }),
        );
      }
    }
    if (fit) {
      layers.push(
        textLayer({
          text: word,
          colorId: pal.ink,
          fontId: fit.fontId,
          scaleX: fit.scaleX,
          scaleY: fit.scaleY,
          letterSpacing: fit.letterSpacing,
          bold: fit.bold,
          slantDeg: retro ? 12 : 0,
          anchor: { row: Math.max(1, Math.round((bandRows - fit.h) / 2)), col: 0 },
          repeat: 2,
        }),
      );
    }
    return { ...base, bandRows, layers };
  }

  if (layout === 'crest') {
    const bandRows = 20;
    const badge = brief.themes.has('football') ? 'badge-shield' : 'badge-circle';
    const size = shapeSize(badge, 16);
    layers.push(
      shapeLayer({
        shapeId: badge,
        ...size,
        anchor: { row: 1, col: 0 },
        colorIds: shapeColors(badge, pal),
        simplify: true,
      }),
    );
    const inner = shapeSize(motif, 9);
    layers.push(
      shapeLayer({
        shapeId: motif,
        ...inner,
        anchor: { row: 1 + Math.round((size.h - inner.h) / 2), col: 0 },
        colorIds: shapeColors(motif, { ...pal, ink: pal.ground, accent: pal.ink }),
        simplify: true,
      }),
    );
    const room = bandRows - size.h - 3;
    const fit = fitText(word, Math.floor(cols / 2.6), Math.max(5, room));
    if (fit) {
      layers.push(
        textLayer({
          text: word,
          colorId: pal.ink,
          fontId: fit.fontId,
          scaleX: fit.scaleX,
          scaleY: fit.scaleY,
          letterSpacing: fit.letterSpacing,
          bold: fit.bold,
          anchor: { row: bandRows - fit.h - 1, col: 0 },
          repeat: 2,
        }),
      );
    }
    return { ...base, bandRows, layers };
  }

  if (layout === 'band') {
    const bandRows = 18;
    const border = retro ? 'p-diamonds' : minimal ? 'p-stripes' : 'p-nordic';
    layers.push(
      shapeLayer({
        shapeId: border,
        w: cols,
        h: 7,
        anchor: { row: 0, col: 0 },
        centerFrac: 0.5,
        colorIds: [pal.ink, pal.ground],
        wrap: true,
      }),
    );
    const roseTop = 9;
    const rose = shapeSize(motif, 9);
    // The motif sits under the border, so it only gets the rows that are left.
    rose.h = Math.min(rose.h, bandRows - roseTop);
    layers.push(
      shapeLayer({
        shapeId: motif,
        ...rose,
        anchor: { row: roseTop, col: 0 },
        centerFrac: 0,
        colorIds: shapeColors(motif, pal),
        repeatX: Math.max(2, Math.round(cols / (rose.w + 6))),
        spacingX: 6,
        wrap: true,
        altColorId: minimal ? undefined : pal.accent,
        simplify: true,
      }),
    );
    if (!minimal && second) {
      const fit = fitText(second, Math.floor(cols / 3), 6);
      if (fit) {
        layers.push(
          textLayer({
            text: second,
            colorId: pal.ink,
            fontId: fit.fontId,
            scaleX: fit.scaleX,
            scaleY: fit.scaleY,
            letterSpacing: fit.letterSpacing,
            anchor: { row: bandRows - fit.h - 1, col: 0 },
            repeat: 2,
          }),
        );
      }
    }
    return { ...base, bandRows, layers };
  }

  // icons
  const bandRows = 16;
  const size = shapeSize(motif, bold ? 13 : 10);
  const count = Math.max(2, Math.floor(cols / (size.w + 8)));
  layers.push(
    shapeLayer({
      shapeId: motif,
      ...size,
      anchor: { row: Math.max(0, Math.round((bandRows - size.h) / 2)), col: 0 },
      centerFrac: 0,
      colorIds: shapeColors(motif, pal),
      repeatX: count,
      spacingX: 8,
      wrap: true,
      altColorId: pal.accent === pal.ink ? undefined : pal.accent,
      mirrorAlt: brief.themes.has('nordic'),
      simplify: true,
    }),
  );
  const fit = fitText(word, Math.floor(cols / 3.2), bandRows - 4);
  if (fit) {
    layers.push(
      textLayer({
        text: word,
        colorId: pal.ink,
        fontId: fit.fontId,
        scaleX: fit.scaleX,
        scaleY: fit.scaleY,
        letterSpacing: fit.letterSpacing,
        bold: true,
        haloColorId: pal.ground,
        haloWidth: 1,
        anchor: { row: Math.max(0, Math.round((bandRows - fit.h) / 2)), col: 0 },
        repeat: 2,
      }),
    );
  }
  return { ...base, bandRows, layers };
}

/**
 * Four takes on the same brief.
 *
 * Four, not one, because a brief is never precise enough to have a single
 * right answer — and because choosing between hats is a thing anyone can do,
 * while critiquing one hat is not.
 */
export function fourVariations(
  brief: Brief,
  cols: number,
  seed = Date.now(),
): { id: LayoutId; label: string; note: string; design: StudioDesign }[] {
  return LAYOUTS.map((l, i) => ({
    ...l,
    design: composeDesign(brief, l.id, { cols, seed: seed + i * 7919 }),
  }));
}
