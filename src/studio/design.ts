import {
  emptyOverride,
  type ChartLayer,
  type OverrideLayer,
} from '../data/chartLayers';
import type { MotifKind } from '../data/motifs';
import { YARN_HEX, YARN_NAME, type YarnColor } from '../data/types';
import type { HookMm } from '../sizing/hooks';
import type { SizeId } from '../sizing/sizes';
import type {
  BrimFinishSpec,
  CrownColorSpec,
  PatternDefinition,
  PatternId,
} from '../patterns/types';
import { derivePattern } from '../patterns/buildFromDefinition';
import { modelFromParts, type PatternModel } from '../store';
import type { Locale } from '../i18n/locale';
import { SIZES } from '../sizing/sizes';

/**
 * A studio design: everything the user can change, and nothing else.
 * Snapshots of this object are what undo/redo, autosave and share codes move
 * around, so it stays plain JSON.
 */
export interface StudioDesign {
  title: string;
  /** Band background — the "bunnfarge" of the patterned middle. */
  baseColor: YarnColor;
  /** Crown (top disc). */
  crownColor: YarnColor;
  /** Final edge round. */
  brimColor: YarnColor;
  /**
   * The studio only makes bucket brims. 'wave' still exists so Helene's
   * published patterns and designs saved before the change keep rendering.
   */
  brimStyle: 'wave' | 'bucket';
  bandRows: number;
  hookMm: HookMm;
  sizeId: SizeId;
  omkrets_cm: number;
  layers: ChartLayer[];
  override: OverrideLayer;
  /**
   * The procedural crown/brim field, and how the brim finishes, carried
   * VERBATIM from a published pattern.
   *
   * These are not things the studio's controls can build — they are the
   * NORWAY'26 slash field and its two-round edge, and before they were carried
   * here «Åpne i studio» quietly showed a different hat than the recipe: no
   * field on the crown or brim, and Helene's blue-and-white wave chart back on
   * the flare, because `includeWave` was true and nothing was left to suppress
   * it. What the studio shows has to be the thing you are going to crochet.
   */
  crown?: CrownColorSpec;
  brimFinish?: BrimFinishSpec;
  /**
   * Which published pattern this design was opened from, for sizing only —
   * see `PatternDefinition.sizePinId`. Nothing else reads it, and a design
   * built from blank never has one.
   */
  sourceId?: PatternId;
}

export const MOTIF_KINDS: { id: MotifKind; label: string }[] = [
  { id: 'stripe', label: 'Striper' },
  { id: 'chevron', label: 'Sikksakk' },
  { id: 'checker', label: 'Sjakkrute' },
  { id: 'dots', label: 'Prikker' },
  { id: 'border', label: 'Kant' },
  { id: 'slash', label: 'Lyn' },
];

export function blankDesign(): StudioDesign {
  return {
    title: 'Min bøttehatt',
    baseColor: 'white',
    crownColor: 'white',
    brimColor: 'blue',
    brimStyle: 'bucket',
    bandRows: 10,
    hookMm: 4.0,
    sizeId: 'dame',
    omkrets_cm: 56,
    layers: [],
    override: emptyOverride(),
  };
}

/**
 * A published pattern as a studio design.
 *
 * One function, because there is exactly one right answer and two callers: the
 * store's «Åpne i studio», and the check that proves the two hats are the same
 * hat. When this lived inline in the store it quietly dropped the procedural
 * field and the size pin, and the studio showed a 110-stitch hat with Helene's
 * wave brim next to a recipe for a 100-stitch hat with ours.
 */
export function designFromPattern(def: PatternDefinition): StudioDesign {
  return {
    ...blankDesign(),
    title: def.titleNo,
    layers: structuredClone(def.chartLayers),
    override: structuredClone(def.chartOverride ?? emptyOverride()),
    bandRows: def.bandRows,
    hookMm: def.defaults.hookMm,
    sizeId: def.defaults.sizeId,
    omkrets_cm: SIZES.find((x) => x.id === def.defaults.sizeId)?.omkrets_cm ?? 56,
    baseColor: def.background,
    crownColor: def.crownBase ?? def.background,
    brimColor: def.finalBrim.color,
    brimStyle: def.includeWave ? 'wave' : 'bucket',
    crown: def.crown ? structuredClone(def.crown) : undefined,
    brimFinish: def.brimFinish ? structuredClone(def.brimFinish) : undefined,
    sourceId: def.id,
  };
}

/** Yarns actually used by a design — drives the materials list and palette. */
export function designColors(d: StudioDesign): YarnColor[] {
  const used = new Set<YarnColor>([d.baseColor, d.crownColor, d.brimColor]);
  for (const l of d.layers) {
    if (l.hidden) continue;
    if (l.kind === 'text') used.add(l.colorId);
    else if (l.kind === 'motif') for (const c of l.colorIds) used.add(c);
    else if (l.kind === 'image' && l.colorId) used.add(l.colorId);
  }
  for (const c of Object.values(d.override.cells)) used.add(c);
  return [...used];
}

/**
 * The design as a PatternDefinition, so it runs through exactly the same
 * derivation as the published patterns — same rounds, stitches, chart,
 * materials and 3D geometry.
 */
export function customDefinition(d: StudioDesign): PatternDefinition {
  return {
    id: 'custom',
    version: 1,
    title: d.title,
    titleNo: d.title,
    palette: designColors(d).map((id) => ({
      id,
      hex: YARN_HEX[id],
      nameNo: YARN_NAME[id],
    })),
    bandRows: d.bandRows,
    chartLayers: d.layers,
    chartOverride: d.override,
    includeWave: d.brimStyle === 'wave',
    brim:
      d.brimStyle === 'bucket'
        ? { incRounds: 4, color: d.baseColor, flare: 1.35, edgeRounds: 2 }
        : undefined,
    ...(d.crown ? { crown: d.crown } : {}),
    ...(d.brimFinish ? { brimFinish: d.brimFinish } : {}),
    ...(d.sourceId ? { sizePinId: d.sourceId } : {}),
    finalBrim: { color: d.brimColor },
    layout: {
      frontAnchorStitch: 10,
      frontTheta: 0.85,
      workingFlipZOnly: true,
    },
    defaults: { hookMm: d.hookMm, sizeId: d.sizeId },
    background: d.baseColor,
    crownBase: d.crownColor,
  };
}

type Derived = ReturnType<typeof derivePattern>;

let derivedCacheKey: StudioDesign | null = null;
let derivedCache: Derived | null = null;

/** Derive a design (memoised on the snapshot identity — snapshots are immutable). */
export function deriveDesign(d: StudioDesign): Derived {
  if (derivedCacheKey === d && derivedCache) return derivedCache;
  const derived = derivePattern(customDefinition(d), {
    sizeId: d.sizeId,
    hookMm: d.hookMm,
    omkrets_cm: d.omkrets_cm,
    bandRows: d.bandRows,
    layers: d.layers,
    override: d.override,
  });
  derivedCacheKey = d;
  derivedCache = derived;
  return derived;
}

let modelCacheKey: StudioDesign | null = null;
let modelCacheLocale: Locale = 'no';
let modelCache: PatternModel | null = null;

/** 3D/guide model for a design (memoised the same way). */
export function designModel(d: StudioDesign, locale: Locale = 'no'): PatternModel {
  if (modelCacheKey === d && modelCacheLocale === locale && modelCache) {
    return modelCache;
  }
  const derived = deriveDesign(d);
  const model = modelFromParts(
    derived.rounds,
    derived.stitches,
    locale,
    'custom',
    derived.definition,
  );
  modelCacheKey = d;
  modelCacheLocale = locale;
  modelCache = model;
  return model;
}
