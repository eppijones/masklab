import type { PatternDefinition, PatternId } from './types';
import type { ChartLayer } from '../data/chartLayers';
import type { YarnColor } from '../data/types';
import { YARN_HEX, YARN_NAME } from '../data/types';
import { emptyOverride } from '../data/chartLayers';

/**
 * NORWAY'26 — the MASKLAB collection for the 2026 national-team kit.
 *
 * Five hats, one silhouette — Helene Spilling's RO-hatt, round for round: her
 * 19-round domed crown, a 12-round wall, and her brim schedule out to 144. Two
 * solid rounds finish the rim and nothing else on the hat is a plain round. The
 * NORGE wordmark is set in «Norge26», our runic italic, stamped twice, front
 * and back, so the hat reads from any angle.
 *
 * The fabric is one idea per kit, not one idea in five colourways: bundles of
 * long lightning slashes that start at the crown's centre and sweep down across
 * the wall and out over the brim. The COLOURS change, and so does the gesture —
 * see `NorwayFieldSpec`'s slope/curve/kink block, which is what keeps Trening's
 * dense chevron from being Drakt in red. The field params are shared between
 * the wall motif layer and the crown resolver, so a stroke runs unbroken from
 * the crown centre, down the wall, and out to the last two rounds.
 */

/**
 * The collection is RO's hat in our colours: Helene's 19-round domed crown, a
 * 12-round wall, and — from this cut on — her brim schedule round for round,
 * 100 → 110 → 120 → 132 → 144. Only the colourwork is ours. Her blue wave
 * chart is not: see `brimFinish` below.
 */
export const NORWAY_BAND_ROWS = 14;
/**
 * Baseline row of the word — the row the FIRST letter stands on, since the rest
 * climb above it.
 *
 * «Norge26» is ten rows and the climb adds two, so the block is twelve and the
 * two-stitch contour needs a wall of fourteen. That is a taller hat than the
 * flat cut, and it is the trade the climb costs: a rising baseline is the one
 * thing that makes a sports wordmark look drawn rather than typed, and there
 * is nowhere to put it but rows.
 */
const TEXT_ROW = 3;
/**
 * Rows the baseline climbs per stitch travelled right.
 *
 * The step is taken per GLYPH — a whole letter is what stands on a baseline —
 * so over the 46-stitch run this spends its two rows as a staircase across the
 * five letters rather than tilting them individually.
 */
const TEXT_RISE = 0.065;
/**
 * The italic, and the one thing that has to travel with it.
 *
 * 24° moves the cap line four columns right of the baseline over the ten rows
 * of the face. `slantRepair` bridges the shear's rounding step so the runic
 * diagonals — the lozenge O worst of all — stay in one piece; without it NORGE
 * shears into loose cells and reads as a zigzag rather than a word.
 */
const TEXT_SLANT_DEG = 24;
/** Front of the hat, as a fraction of the circumference. */
const TEXT_CENTER_FRAC = 0.095;
/** Wordmark copies around the hat (front + back). */
const TEXT_REPEAT = 2;
/**
 * Solid rounds at the very rim, counting the final round — the ONLY coloured
 * rounds on the brim.
 *
 * TWO, NOT THREE. Three rounds is a binding, and on a hat whose brim is
 * otherwise unbroken colourwork a binding reads as a cuff that was added
 * afterwards — Svart showed it worst, three white rounds under a black hat.
 * Two is a finish.
 */
const EDGE_ROUNDS = 2;

export interface NorwayFieldSpec {
  seed: number;
  /**
   * Bundle inks, cycled in order. The core of bundle i takes `strokes[i]`, its
   * companions the ones after it — so listing a colour twice weights it, and
   * listing it once keeps it to an accent.
   */
  strokes: YarnColor[];
  /** Thin companion stroke alongside some of the main ones. */
  echo?: YarnColor;
  /** Bundle positions around the whole hat (default 7). */
  count?: number;
  /** Core belly half-width in stitches (default 2.6 → a 5-stitch core). */
  width?: number;
  /** Every Nth stroke drawn thin, for a thick/thin rhythm. */
  thinEvery?: number;
  /** Thin strokes travelling with each core (default 3). */
  companions?: number;
  /** Sideways step between companions, in stitches (default 3.2). */
  spread?: number;
  /**
   * Shortest a companion may be, as a fraction of the field height (default
   * 0.68). Lower values break the bundle up into travelling marks.
   */
  lenMin?: number;

  // ---- Gesture. This is what stops the five kits being one hat recoloured ----
  /**
   * Sideways travel per row (default 1.05 ≈ 51° off vertical, since a stitch is
   * 1 wide and 0.85 tall). Higher lays the strokes over toward the horizontal.
   */
  slope?: number;
  /** How much the stroke bows as it travels (default 0.22). 0 is a ruled line. */
  curve?: number;
  /** Depth of the staircase kink, in stitches (default 0.4). */
  kinkAmp?: number;
  /**
   * How sharply the ends come to a point (default 0.45). Lower is blunter — the
   * stroke keeps its width almost to the tip.
   */
  tipSharp?: number;
}

export interface NorwayKitSpec {
  id: PatternId;
  title: string;
  titleNo: string;
  /** Yarns listed in the materials panel, most-used first. */
  palette: YarnColor[];
  /** Ground colour — also the panel behind the lettering. */
  ground: YarnColor;
  textColor: YarnColor;
  /** The finish: the last two rounds of the hat, and nothing else. */
  edge: YarnColor;
  /** Statement fabric. Solid kits leave it out. */
  field?: NorwayFieldSpec;
}

function fieldParams(
  field: NorwayFieldSpec,
): Record<string, number | string | boolean> {
  return {
    seed: field.seed,
    coverBrim: true,
    edgeSolid: true,
    // The field runs the whole brim and stops exactly at the rim — the same
    // two rounds `brimFinish` works solid, so the fabric and the edge agree.
    edgeSolidRounds: EDGE_ROUNDS,
    /**
     * On the brim a stroke keeps a third of its sideways travel, so it runs OUT
     * to the rim rather than round the hat. See `brimSlopeGain` in
     * `buildCrownResolver`: at 1 the higher-slope kits came out with concentric
     * arcs across the flare, which is the banded look the ring stripes were
     * removed to get rid of.
     */
    brimSlopeGain: 0.35,
    /**
     * THE SPIRAL GOES ALL THE WAY IN.
     *
     * This was 40 once — the field only switched on at round five of nineteen,
     * so every hat wore a plain roundel on the crown like a lid. Then 31, which
     * still left the 10-, 20- and two 30-stitch rounds bare: from directly
     * above, which is how you see a hat on someone's head, that is a third of
     * the disc's radius with nothing on it and the strokes visibly stopping
     * short of the middle.
     *
     * 20 is the floor. The crown plan is 10, 20, 30, 30, 40 …, so only the
     * ten-stitch first round stays plain — the knot at the centre that every
     * crocheted disc has and no chart can cover — and the strokes run in to
     * meet it. That is what makes the crown read as a pinwheel rather than as a
     * patterned ring around a plain cap.
     */
    crownFieldMinCount: 20,

    // ---- Bundle geometry ----
    // Bundle positions round the hat, each a core plus thinner companions at
    // irregular gaps in the other inks. FOUR is the default and it is a
    // deliberate one: a bundle needs a clear run of ground on either side of
    // it, or the field closes up and reads as camouflage. Trening is the
    // exception at nine, because the shirt it comes from has no ground showing
    // anywhere and the hat is meant to be the hard one. Every bundle runs the
    // whole height, crown centre → wall → rim, so the hat reads as one gesture.
    count: field.count ?? 13,
    // ~51° off vertical at the default: a stitch is 1 wide and 0.85 tall, so
    // the drawn angle is atan(slope / 0.85). 2.4 used to give a near-horizontal
    // 70°. Per kit from here — five hats, five gestures.
    slope: field.slope ?? 1.05,
    /**
     * MANY THIN STRIPES, NOT A FEW THICK BUNDLES.
     *
     * The first cut drew four positions round the hat, each a five-stitch core
     * with three companions crowded against it at a spread of 2.4. That reads
     * as four clusters with a lot of bare ground between them — the colour
     * arrives in clumps, and on a hat you see one clump at a time. Thirteen
     * positions of one- and two-stitch strokes at nearly double the spread put
     * the same amount of ink on the hat as an even rhythm instead, so it reads
     * as colourful from any angle rather than striped on one side and plain on
     * the other.
     */
    width: field.width ?? 1.05,
    widthVary: 0.15,
    thinEvery: field.thinEvery ?? 0,
    curve: field.curve ?? 0.22,
    // Controlled kinks on the same integer staircase the diagonal-stripe motif
    // uses — each stroke gets its own phase, so the fabric flexes without
    // banding into one chevron.
    kinkRows: 8,
    kinkAmp: field.kinkAmp ?? 0.4,
    // Pointed where it starts, at the crown centre; blunt where it leaves the
    // hat. See `tipSharpEnd` — the brim is the last quarter of every stroke's
    // length, so a symmetric taper empties it out exactly where the wordmark
    // stops and the eye is looking for the pattern to continue.
    tipSharp: field.tipSharp ?? 0.45,
    tipSharpEnd: 0.06,
    bundleCompanions: field.companions ?? 2,
    bundleSpread: field.spread ?? 4.2,
    // Companions close to the core's own weight: a bundle of one thick and
    // three hairlines reads as a cluster, three near-equal stripes read as
    // stripes.
    bundleWidthMin: 0.7,
    bundleWidthMax: 1,
    bundleStagger: 4,
    bundleLenMin: field.lenMin ?? 0.68,
    echoGap: 3,
    echoWidth: 0.9,
    ...(field.echo ? { echoColor: field.echo } : {}),
  };
}

export function buildNorwayKit(spec: NorwayKitSpec): PatternDefinition {
  const params = spec.field ? fieldParams(spec.field) : null;
  const motifLayers: ChartLayer[] = [];
  if (spec.field && params) {
    motifLayers.push({
      kind: 'motif',
      id: 'norge-slashes',
      motif: 'slash',
      params: { ...params },
      anchor: { row: 0, col: 0 },
      colorIds: spec.field.strokes,
    });
  }
  return {
    id: spec.id,
    version: 3,
    title: spec.title,
    titleNo: spec.titleNo,
    palette: spec.palette.map((id) => ({
      id,
      hex: YARN_HEX[id],
      nameNo: YARN_NAME[id],
    })),
    bandRows: NORWAY_BAND_ROWS,
    background: spec.ground,
    chartLayers: [
      ...motifLayers,
      {
        kind: 'text',
        id: 'norge-wordmark',
        text: 'NORGE',
        fontId: 'norge26',
        slantDeg: TEXT_SLANT_DEG,
        slantRepair: true,
        anchor: { row: TEXT_ROW, col: 0 },
        centerFrac: TEXT_CENTER_FRAC,
        repeat: TEXT_REPEAT,
        colorId: spec.textColor,
        mirror: false,
        // One column between glyphs: several terminal rows are full-width, so
        // without it NORGE fuses into a slab.
        letterSpacing: 2,
        rise: TEXT_RISE,
        /**
         * THE CONTOUR, AND WHY IT IS NOT A HALO ANY MORE.
         *
         * A letter on a busy field needs a stitch of separation or the strokes
         * run into its counters. The obvious way to get one is to ring the
         * glyph in the ground colour — and that is what this used to do, with
         * `haloColorId: spec.ground`. It is also what produced the fault: the
         * ring is a solid band of GROUND, so wherever a stroke arrived at a
         * letter it hit a clean edge of navy (or white, or yellow) and simply
         * stopped. Five letters' worth of that, side by side, is a continuous
         * line across the hat — the hard division between the type and the
         * pattern. The strokes did not pass behind NORGE, they were cut off by
         * a wordmark-shaped hole with a bright rim.
         *
         * `haloDither` breaks the rim. The contour is still drawn, but roughly
         * two stitches in five are left as whatever the field already put
         * there, chosen by a stable per-cell hash. That is enough to keep the
         * letters legible — the separation still reads, because the eye
         * completes an interrupted outline — while every stroke now runs INTO
         * the letter and continues out the other side. There is no longer an
         * unbroken edge anywhere for the eye to read as a line, so the fabric
         * passes behind the word the way it does on the shirt.
         */
        haloColorId: spec.ground,
        haloWidth: 2,
        haloDither: 0,
      },
    ],
    chartOverride: emptyOverride(),
    /**
     * HELENE'S BREM, ROUND FOR ROUND.
     *
     * The collection used to approximate it: a plain bucket brim tuned to reach
     * the same final circumference, 1.44× the body, through eight increase
     * rounds of our own. Same number, different hat — the shaping was spread
     * differently, so the brim came off the wall at a different angle and hung
     * where Helene's stands. Now the kits take her actual schedule: two
     * increase rounds to 110 and 120, three straight, then 132 and 144. It is
     * the recipe Espen already knows works, and the silhouette is hers.
     *
     * WHAT IT DOES NOT TAKE is the blue-and-white wave chart those last rounds
     * carry on her hat. That is her design; ours is the slash field and the
     * rings. `brimFinish` keeps the counts and drops the chart.
     */
    includeWave: true,
    /**
     * The brim is fabric all the way down, and then it stops.
     *
     * Two earlier cuts put solid rounds in the middle of it — first a single
     * «break line» at the fold, then three ring stripes at an even beat — and
     * both failed the same way. A solid round is a wall: the strokes arrive at
     * it and end, and the brim reads as a series of bands with pattern trapped
     * between them instead of as the wall carrying on over the fold. The field
     * has to run from under the wordmark straight out to the edge in one piece,
     * and the only colour that interrupts it is the edge itself.
     */
    brimFinish: { rimRounds: EDGE_ROUNDS },
    finalBrim: { color: spec.edge },
    ...(spec.field && params
      ? {
          crown: {
            kind: 'slash' as const,
            colorIds: spec.field.strokes,
            params: { ...params },
          },
        }
      : {}),
    layout: {
      frontAnchorStitch: 10,
      frontTheta: 0.85,
      workingFlipZOnly: true,
    },
    defaults: { hookMm: 4.0, sizeId: 'dame' },
  };
}
