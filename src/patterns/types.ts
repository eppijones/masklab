import type { Round, Stitch, YarnColor } from '../data/types';
import type {
  ChartLayer,
  ColorGrid,
  OverrideLayer,
} from '../data/chartLayers';
import type { HookMm, HookSpec } from '../sizing/hooks';
import type { SizeId, SizeSpec } from '../sizing/sizes';
import type { MaterialsEstimate } from '../sizing/materials';

export type PatternId =
  | 'ro-ro-ro'
  | 'flagget'
  | 'martin'
  | 'norway26'
  | 'norway26-white'
  | 'norway26-black'
  | 'norway26-training'
  | 'norway26-keeper'
  | 'custom';

export function isPatternId(s: string): s is PatternId {
  return (
    s === 'custom' ||
    s === 'ro-ro-ro' ||
    s === 'flagget' ||
    s === 'martin' ||
    s === 'norway26' ||
    s === 'norway26-white' ||
    s === 'norway26-black' ||
    s === 'norway26-training' ||
    s === 'norway26-keeper'
  );
}

export interface PatternPaletteColor {
  id: YarnColor;
  hex: string;
  nameNo: string;
}

export interface ChartDef {
  rows: number;
  cols: number;
  grid: ColorGrid;
  layers?: ChartLayer[];
  override?: OverrideLayer;
}

export interface WaveDef {
  rowsAsPrinted: string[];
  blocks: number;
  expand: 'helene-wave';
}

export interface PatternLayout {
  frontAnchorStitch: number;
  frontTheta: number;
  workingFlipZOnly: true;
  /**
   * 3D-only: stack columns of this yarn colour at fixed angles as the
   * circumference grows (Flagget blue spokes). Does not alter chart/recipe
   * stitch indices.
   */
  lockSpokeColor?: YarnColor;
}

/**
 * Classic bucket brim used when includeWave is false: `incRounds` rounds in
 * `color`, then the finalBrim round. Target circumference grows to ~1.35x the
 * body, matching a gentle bucket flare.
 *
 * The brim is worked in up to three parts, top to rim: an optional straight
 * BREAK round in `breakColor` at the fold, the FLARE rounds that carry all the
 * shaping, and a RIM of `edgeRounds` solid rounds worked straight. Increases
 * are packed into the flare so the rim lies flat instead of fluting — see
 * `buildPlainBrimRounds`.
 */
export interface PlainBrimSpec {
  incRounds: number;
  color: YarnColor;
  /**
   * A single round worked in a third colour at the TOP of the rim band — the
   * thin collar-trim line the away shirt carries above its piping. It replaces
   * an edge round rather than adding one, so the rim stays `edgeRounds` deep
   * whether or not a kit has an accent. Solid crochet: the field leaves it be.
   */
  edgeAccent?: YarnColor;
  /** Target circumference as a factor of the body (default 1.35). */
  flare?: number;
  /**
   * Solid rounds at the rim, counting the final round (default 1 — just the
   * final round). 3 gives a binding deep enough to read as structure.
   */
  edgeRounds?: number;
  /**
   * One straight round in this colour at the very start of the brim — the fold
   * where the wall stops and the flare begins. It frames the wall from below
   * and stops the colorwork bleeding round the corner. Omitted, the brim starts
   * straight out of the wall as before.
   */
  breakColor?: YarnColor;
}

/**
 * How the brim FINISHES, on the wave-brim path.
 *
 * Two jobs, and the first is the reason this exists at all: it suppresses
 * Helene's blue-and-white wave chart. Her round schedule is the hat's
 * silhouette and we keep every count and increase of it, but the chart those
 * rounds carry is her design, not ours.
 *
 * The second is the edge. An earlier cut of this spec also carried ring
 * stripes across the brim — three solid rounds at an even beat — and they were
 * wrong in exactly the way the single break line before them was wrong: every
 * ring is a hard stop the colourwork runs into, so the brim came out banded
 * and the pattern looked like it had been interrupted three times on its way
 * down. The field has to reach the edge in one piece. So the only solid rounds
 * left are the last `rimRounds`, and everything above them is fabric.
 */
export interface BrimFinishSpec {
  /** Solid rounds at the rim, counting the final round. */
  rimRounds: number;
}

/**
 * Procedural crown colorwork. Samples the SAME seeded field as the wall
 * motif layer (in polar coordinates) so the design flows continuously
 * from the crown disc into the side wall.
 */
export interface CrownColorSpec {
  kind: 'streaks' | 'slash' | 'diagonalStripes';
  /** Streak ink color (streaks only). */
  colorId?: YarnColor;
  /** Stroke colours, cycled in order (slash only). */
  colorIds?: YarnColor[];
  /** Params — same shape as the corresponding motif layer params. */
  params: Record<string, number | string | boolean>;
}

export interface PatternDefinition {
  id: PatternId;
  version: number;
  title: string;
  titleNo: string;
  palette: PatternPaletteColor[];
  bandRows: number;
  chartLayers: ChartLayer[];
  chartOverride?: OverrideLayer;
  includeWave: boolean;
  finalBrim: { color: YarnColor };
  /** Non-wave bucket brim (NUSA kits). Ignored when includeWave is true. */
  brim?: PlainBrimSpec;
  /**
   * How the brim finishes. Only read on the wave path, where it also suppresses
   * Helene's blue wave chart: her counts and increases stay (that is the hat's
   * shape) but the rounds colour like any other.
   */
  brimFinish?: BrimFinishSpec;
  /** Procedural crown colorwork (NUSA kits). */
  crown?: CrownColorSpec;
  /**
   * Scripted pattern: explicit round schedule transcribed from a published
   * recipe (Helene's PDFs). When present, sizing is fixed and rounds/stitches
   * come from the script; chartLayers still color the text band.
   */
  script?: import('./script').ScriptRound[];
  layout: PatternLayout;
  defaults: { hookMm: HookMm; sizeId: SizeId };
  background: YarnColor;
  /** Crown (top disc) yarn when it differs from the band background. */
  crownBase?: YarnColor;
  /**
   * Borrow another pattern's size pinning.
   *
   * RO and the NORWAY'26 kits are drafted on exactly 100 stitches at dame +
   * 4.0 mm; the gauge on its own would put them at 110. The pin is keyed on
   * `id`, so a studio design derived FROM one of them — whose id is 'custom' —
   * came out 110 stitches wide and 41 rounds tall while its own recipe said
   * 100 and 40. Same design, two different hats, which is the one thing «Åpne
   * i studio» must never do. Setting this to the source pattern makes the
   * studio inherit the pin, and only the pin: change size or hook and it falls
   * through to the gauge exactly as the published pattern would.
   */
  sizePinId?: PatternId;
}

export interface DerivedPattern {
  definition: PatternDefinition;
  size: SizeSpec;
  hook: HookSpec;
  bodyCount: number;
  bandRows: number;
  rounds: Round[];
  stitches: Stitch[];
  chart: ChartDef;
  materials: MaterialsEstimate;
}

export type { HookSpec, SizeSpec, MaterialsEstimate, HookMm, SizeId };
