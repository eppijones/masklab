import type { PatternDefinition, PatternId } from './types';
import type { ChartLayer, TextLayer } from '../data/chartLayers';
import type { YarnColor } from '../data/types';
import { YARN_HEX, YARN_NAME } from '../data/types';
import { emptyOverride } from '../data/chartLayers';
import { keepOutFromTextPlacement } from '../data/textKeepOut';

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
 *
 * ── THE WALL, READ ROUND THE HAT ────────────────────────────────────────────
 *
 *   [ NORGE, on clean ground ] [ corridor ] [ NORGE ] [ corridor ]
 *          36 stitches            12              36        12
 *
 * The wordmark is set in «NorgeKursiv26», italic, with two-stitch uprights and
 * one-stitch bars, and the field is SUBTRACTED from its footprint — letters,
 * counters, the gaps between letters, a stitch of margin, and one round above
 * and below. What is left between the two copies is not slack. It is the
 * transition corridor, and the field is deliberately aimed down it: the widest
 * route colour has from the crown to the brim, at two places round the head.
 * Graphic crown, lettered wall, colour breaking through at the E→N gap, graphic
 * brim. That is the collection.
 *
 * The panel no longer runs the full height of the wall. It stops one round
 * above the letters and one below, and its lower edge FOLLOWS them — see
 * `TEXT_MERGE_ROWS`. So the field also crosses the word's own columns, top and
 * bottom, and climbs into the open ground under the short letters. The
 * lettering sits in the fabric rather than on it.
 */

/**
 * The collection is RO's hat in our colours: Helene's 19-round domed crown, a
 * 12-round wall, and — from this cut on — her brim schedule round for round,
 * 100 → 110 → 120 → 132 → 144. Only the colourwork is ours. Her blue wave
 * chart is not: see `brimFinish` below.
 */
export const NORWAY_BAND_ROWS = 14;
/**
 * Top row of the ten-row wordmark block.
 *
 * Two rows of wall above it and two below, which is what makes the arithmetic
 * of the protected panel come out exactly at the wall: see `TEXT_ROW_MARGIN`.
 * The wall stays fourteen rows — the published stitch count of every hat in the
 * collection — and the face was drawn to fit that, rather than the wall being
 * grown to fit a face.
 */
const TEXT_ROW = 2;
/**
 * ITALIC, BUT NOT SHEARED HERE. AND STILL NO CLIMB.
 *
 * The lean is back — it is what the collection wanted all along — but it is
 * drawn into «NorgeKursiv26» as an explicit staircase rather than applied
 * downstream, so `slantDeg` stays at ZERO and must. Shearing an already-italic
 * face would lean it twice, and the second lean would be the `round(tan θ)`
 * one: it steps wherever the arithmetic tips, which on the last italic cut was
 * straight through N's diagonal and R's leg. That is the whole of «the
 * letterforms are inconsistent, some strokes feel thin while others feel
 * heavy», and it is why the previous pass gave up on the italic instead of
 * fixing it. The fix was the staircase, not the upright.
 *
 * The climb stays gone, and for its own reason. A rising baseline is drawn per
 * glyph, so the block grows two rows and the protected panel has to become a
 * parallelogram approximating a staircase with a continuous slope — the ±1 row
 * of disagreement between the two is precisely where accent colour used to land
 * against the letters. Flat, the panel tracks the letters exactly, which is what
 * `mergeRows` below now depends on.
 */
const TEXT_RISE = 0;
const TEXT_SLANT_DEG = 0;
/**
 * One stitch. The sidebearings are drawn into the cells of «NorgeDisplay26», so
 * this is a gap between letters and not a substitute for one — at 0 the bowls
 * touch, at 2 the word runs to forty-three stitches and the corridor is gone.
 */
const TEXT_LETTER_SPACING = 1;
/** Front of the hat, as a fraction of the circumference. */
const TEXT_CENTER_FRAC = 0.095;
/** Wordmark copies around the hat (front + back). */
const TEXT_REPEAT = 2;
/**
 * Stitches of clean ground beyond the word's ink, and rows above and below it.
 *
 * ONE STITCH SIDEWAYS, AND IT IS NOT MEANNESS. The panel is a hard mask, so a
 * stitch of margin puts the nearest cell the field can reach two stitches from
 * the nearest ink — and every stitch added here costs TWO from each transition
 * corridor, which at 39 stitches of word on a 100-stitch hat is the difference
 * between a corridor the pattern can run down and a seam.
 *
 * ONE ROW VERTICALLY, WHICH IS NO LONGER THE WHOLE WALL — AND THAT IS THE
 * POINT.
 *
 * It was two, and two rows of margin under a ten-row word at row 2 of fourteen
 * came to exactly the height of the wall: the panel ran edge to edge, and the
 * field could not cross the word's columns anywhere. The wall was calm where the
 * word was and busy where it was not, with a hard vertical seam between the two.
 * Read on the hat rather than on the chart, that is a label laid over the hat.
 * Nothing in the fabric ever reached the lettering.
 *
 * Nine rows of letter at row 2 with ONE row of margin protects rows 1–11, so the
 * top round of the wall and the last two before the fold are the field's, right
 * through the word's own columns. One clear round above the letters and one
 * below, and then the pattern. `TEXT_MERGE_ROWS` does the rest.
 */
const TEXT_MARGIN = 1;
const TEXT_ROW_MARGIN = 1;
/**
 * How far the field may climb past that clean round, where the letters leave
 * room for it.
 *
 * The margin above is a straight line; this is what makes the line ragged. Under
 * the open half of an R, in the gap between two letters, under the tail of a G —
 * wherever a column's own ink stops early — the field comes up two rounds
 * further than the straight edge would allow, and the stripes and the lettering
 * visibly interlock instead of meeting at a seam.
 *
 * TWO. At one the raggedness is not readable as anything; it is just an
 * irregular edge. At three a stroke arrives beside the letters at letter height
 * and starts tying one letter to the next, which is the exact fault the
 * protected panel exists to stop — colour in the counter of the O, an accent
 * stitch bridging the R and the G. Two rounds is the whole usable range, and it
 * is clamped per column so a letter gap can never open further than a short
 * letter does.
 */
const TEXT_MERGE_ROWS = 2;
/**
 * Where the transition corridor is, as a fraction of the circumference.
 *
 * Two copies of the word sit half a circumference apart, so the gaps between
 * them sit a quarter turn from each word's centre. This is the number the field
 * is aimed at — see `anchorFrac` in `buildSlashes`.
 */
const CORRIDOR_CENTER_FRAC = TEXT_CENTER_FRAC + 1 / (2 * TEXT_REPEAT);
/**
 * The row the corridor lock is solved at: the middle of the wall.
 *
 * Not the crown and not the brim. A stroke drifts as it falls, so it can only
 * be pinned at one depth, and the depth that matters is the one where the gap
 * between the two words is narrowest in the eye — level with the letters. Pin
 * it at the crown instead and the stroke has drifted into the back of the E by
 * the time it reaches the wall.
 */
const CORRIDOR_ANCHOR_ROW = (NORWAY_BAND_ROWS - 1) / 2;
/**
 * NOTHING NARROWER THAN TWO STITCHES. The strokes used to feather away at the
 * tips through every width between full and nothing, and the widths under a
 * stitch are not a soft edge in yarn — they are a yarn change for one stitch.
 * This is the structural version of «remove single-stitch noise»: not a cap on
 * how many are tolerated, but a floor under the width so they are never drawn.
 */
const FIELD_MIN_HALF_W = 0.9;
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
  /** Rows per zigzag leg (default 8). Shorter is tighter, not smaller. */
  kinkRows?: number;
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

/**
 * The NORGE wordmark layer — identical on all seven hats but for its colour.
 *
 * One function, and the whole of §2: same face, same size, same spacing, same
 * upright setting, same placement, same repeat. A kit chooses the yarn and
 * nothing else, which is what makes the collection read as a collection rather
 * than as seven hats that happen to say the same word.
 *
 * NO HALO. The wordmark used to be ringed in the ground colour, one stitch of
 * it against everything and a second stitch against strokes in the type's own
 * yarn, because the field ran right up to the letters and something had to hold
 * it off. Nothing runs up to the letters now — the protected panel below takes
 * the field out of the word's whole footprint — so a contour would be a ring of
 * ground drawn on ground. It reads because the face is heavy, the colour
 * contrasts, and the panel is clean; that is §12, and it is the right way round.
 */
export function norgeWordmark(colorId: YarnColor): TextLayer {
  return {
    kind: 'text',
    id: 'norge-wordmark',
    text: 'NORGE',
    fontId: NORGE_TEXT.fontId,
    slantDeg: NORGE_TEXT.slantDeg,
    anchor: { row: NORGE_TEXT.row, col: 0 },
    centerFrac: NORGE_TEXT.centerFrac,
    repeat: NORGE_TEXT.repeat,
    colorId,
    mirror: false,
    letterSpacing: NORGE_TEXT.letterSpacing,
    rise: NORGE_TEXT.rise,
  };
}

/**
 * The collection's typographic settings, in one object, so «the same NORGE
 * lettering system on all seven hats» is a thing that can be READ rather than a
 * thing seven files are trusted to have copied correctly. The two draft hats in
 * `scripts/proto-masklab.ts` build their wordmarks from it, and `validate.ts`
 * checks every hat against it.
 */
export const NORGE_TEXT = {
  fontId: 'norgeKursiv26',
  slantDeg: TEXT_SLANT_DEG,
  rise: TEXT_RISE,
  letterSpacing: TEXT_LETTER_SPACING,
  centerFrac: TEXT_CENTER_FRAC,
  repeat: TEXT_REPEAT,
  row: TEXT_ROW,
  bandRows: NORWAY_BAND_ROWS,
} as const;

/** Margins the protected panel is built with — see `TEXT_MARGIN`. */
export const NORGE_KEEP_OUT = {
  margin: TEXT_MARGIN,
  rowMargin: TEXT_ROW_MARGIN,
  mergeRows: TEXT_MERGE_ROWS,
} as const;

/**
 * Everything a field has to be told about the wordmark standing in front of it:
 * the panel to keep out of, the corridor to aim down, and the floor under its
 * stroke widths.
 *
 * ONE FUNCTION, SEVEN HATS. This is the piece that stops the collection being
 * seven configurations of the same idea that drift apart — the five kits get it
 * through `fieldParams`, the two drafts spread it straight into their own field
 * params, and none of them can have a slightly different notion of where the
 * word is or how wide the gap between the words should be.
 */
export function norgeFieldProtection(
  wordmark: TextLayer,
): Record<string, number | string | boolean> {
  return {
    ...keepOutFromTextPlacement(wordmark, NORGE_KEEP_OUT),
    anchorFrac: CORRIDOR_CENTER_FRAC,
    anchorV: CORRIDOR_ANCHOR_ROW,
    minHalfW: FIELD_MIN_HALF_W,
    /**
     * The mask cuts strokes, and a cut stroke can leave one stitch stranded in
     * the corridor. `pruneSingleCells` clears those; it belongs here rather
     * than in the motif's defaults because it is a consequence of masking a
     * wordmark out of a field, which is a thing only these seven hats do.
     */
    pruneSingles: true,
  };
}

function fieldParams(
  field: NorwayFieldSpec,
  wordmark: TextLayer,
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

    /**
     * THE WORDMARK GETS CLEAN GROUND, AND THE WORDMARK IS WHAT SAYS SO.
     *
     * Every one of these numbers used to be typed in — «half the 46-stitch
     * wordmark, plus a stitch of air» — and every one of them was a guess
     * against a word whose width nobody had measured since the face last
     * changed. That is the whole of the fault: the panel and the word were two
     * independent opinions about where NORGE is, and where they disagreed the
     * field arrived. Colour inside the counter of the O, an accent stitch in the
     * gap between R and G tying the two letters together, and five letters that
     * had stopped being five letters.
     *
     * `keepOutFromTextPlacement` reads the panel off `textPiece` — the same
     * function that puts the ink on the chart. Face, spacing, scale, weight,
     * shear and climb are all resolved before it measures, so there is no
     * second opinion left to disagree with. Change the font and the panel
     * changes; there is nothing here to keep in step by hand.
     *
     * WHAT IT PROTECTS is the word's whole footprint — the strokes, every
     * counter, every gap from the N to the E, a stitch of margin round the
     * outside, and the full height of the wall. WHAT IT DOES NOT PROTECT is the
     * gap between one copy of the word and the next. That gap is the design.
     *
     * AND THE FIELD IS AIMED AT IT.
     *
     * With the wall masked over both wordmarks, the corridors either side are
     * the only route a stroke has from the crown to the brim — so the hat
     * either reads as one gesture running top to bottom through them, or as a
     * patterned crown and a patterned brim with a lettered band stuck between.
     * Which of the two you got was, until now, down to where the seed happened
     * to drop a bundle. `anchorFrac` aims a core through the corridor's centre
     * at the middle row of the wall and rotates the whole ring to suit.
     */
    ...norgeFieldProtection(wordmark),

    // ---- Bundle geometry ----
    /**
     * Bundle positions round the hat, each a core plus thinner companions at
     * irregular gaps in the other inks. Every bundle runs the whole height,
     * crown centre → wall → rim, so the hat reads as one gesture.
     *
     * ALWAYS EVEN, AND THE FACTORY ENFORCES IT RATHER THAN TRUSTING IT. An odd
     * count puts a core through one transition corridor and nothing through the
     * other, so one side of the head gets the design and the other gets a plain
     * seam — and it is invisible in any single photograph, which is exactly the
     * kind of fault that ships. Rounding up costs one more stroke; getting it
     * wrong costs half the hat.
     */
    count: evenCount(field.count ?? 12),
    /**
     * ~19° off vertical at the default: a stitch is 1 wide and 0.85 tall, so
     * the drawn angle is atan(slope / 0.85). 2.4 used to give a near-horizontal
     * 70°, 1.05 about 51°, and 0.6 about 35°.
     *
     * THE CORRIDOR SETS THE CEILING NOW. A stroke aimed down the E→N gap is
     * pinned at the middle row of the wall and drifts `slope` stitches per row
     * either side of that — so over the seven rows to the crown seam it wanders
     * 7·slope stitches sideways. The corridor is twelve wide since the wordmark
     * went italic and the core is three, which leaves four and a half stitches
     * of play each way, and anything past `slope ≈ 0.6` walks the stroke out of
     * the corridor and into the masked
     * panel before it reaches the shoulder. It does not look like a steep line
     * when that happens; it looks like the line stopped.
     *
     * So the whole range moved down again, to 0.22–0.38. What the kits differ by
     * is no longer mostly angle — it is width, count, spread, kink and curve,
     * which is a better set of dials anyway: they change the fabric rather than
     * just tilting it.
     */
    slope: field.slope ?? 0.3,
    /**
     * MANY STRIPES, BUT NONE OF THEM THIN.
     *
     * The rhythm stays: a dozen positions round the hat rather than four thick
     * bundles, because four clusters read as striped on one side of the head
     * and plain on the other. What changed is the floor. At 1.05 the core is
     * two stitches at the belly and ONE for most of its length, and a one-stitch
     * stroke is a yarn change per round for a mark you can barely see — the
     * confetti this pass was asked to get rid of. At 1.3 the core is three
     * stitches through the middle and never under two; with `minHalfW` under it
     * the companions cannot go under two either. Broad strokes, fewer of them
     * dissolving, the same amount of colour on the hat.
     */
    width: field.width ?? 1.3,
    widthVary: 0.15,
    thinEvery: field.thinEvery ?? 0,
    curve: field.curve ?? 0.22,
    /**
     * Controlled kinks on the same integer staircase the diagonal-stripe motif
     * uses — each stroke gets its own phase, so the fabric flexes without
     * banding into one chevron.
     *
     * THE PERIOD IS PART OF THE KINK'S REACH, and per kit for that reason: a
     * stroke wanders `kinkAmp × (kinkRows − 1)` stitches from end to end of its
     * zigzag, so eight rows at Trening's amplitude is five stitches of travel —
     * more than the corridor is wide, and the corridor stroke leaves it. A
     * shorter period at the same amplitude is a TIGHTER zigzag, not a smaller
     * one, which is also closer to what the pre-match shirt actually does.
     */
    kinkRows: field.kinkRows ?? 8,
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

/** Round a bundle count up to the next even number — see `count` above. */
function evenCount(n: number): number {
  return 2 * Math.max(1, Math.round(n / 2));
}

export function buildNorwayKit(spec: NorwayKitSpec): PatternDefinition {
  const wordmark = norgeWordmark(spec.textColor);
  const params = spec.field ? fieldParams(spec.field, wordmark) : null;
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
    chartLayers: [...motifLayers, wordmark],
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
