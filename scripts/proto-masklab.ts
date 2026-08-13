/**
 * Two prototype hats, drafted straight onto the existing pipeline.
 *
 * These are STUDIO DESIGNS, not registered patterns — the point of the
 * exercise is to find out whether the pattern system can already draw the two
 * reference photos, so the honest test is to build them out of nothing but
 * `StudioDesign` and let `derivePattern` do the rest. Nothing in
 * `src/patterns` is touched; if a prototype is wrong, the collection is
 * untouched, and if it is right it is one file to promote.
 *
 *   npx tsx scripts/proto-masklab.ts [outDir]
 *
 * Writes, per hat: a flat SVG of the wall band (what the type actually does,
 * stitch for stitch) and the share URL that opens the same design in the app.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deriveDesign, type StudioDesign } from '../src/studio/design';
import { blankDesign } from '../src/studio/design';
import { encodeDesign } from '../src/studio/serialize';
import { emptyOverride } from '../src/data/chartLayers';
import { YARN_HEX, type YarnColor } from '../src/data/types';
import {
  NORWAY_BAND_ROWS,
  norgeFieldProtection,
  norgeWordmark,
} from '../src/patterns/norwayKit';

const OUT = process.argv[2] ?? '/tmp/masklab-proto';
const BASE = process.env.PROTO_BASE ?? 'http://127.0.0.1:5173';

/* ------------------------------------------------------------------ shared */

/**
 * Both hats keep RO's silhouette: `brimStyle: 'wave'` takes Helene's brim
 * schedule round for round, and `brimFinish` drops her blue wave chart off it
 * so the flare is ours to colour. Same move the NORWAY'26 kits make.
 */
const EDGE_ROUNDS = 2;

/**
 * ONE HUNDRED STITCHES, PINNED — and this was NOT the first answer.
 *
 * Both hats were drafted at the gauge's own 110, on the reasoning that the
 * block wordmark wants the extra circumference and Espen had said the size
 * could move. It renders wrong, and the reason is worth writing down: the brim
 * schedule is built by SCALING Helene's, so a 110 body walks out 110 → 120 →
 * 130 → 132 → 132 → 132 → 144 → 156 instead of stopping at her 144. Twelve
 * more stitches in the last round spreads the rim past what the instanced
 * stitch mesh covers, and the cream backdrop shows through the gaps as
 * concentric rings all round the flare — which reads, in a screenshot, exactly
 * like the ring stripes that were cut from the collection for banding the brim.
 *
 * It is a rendering fault, not a pattern fault: the derived rounds are clean
 * navy with a two-round cream edge, and a crocheter following the recipe would
 * get the right hat. But the preview is the thing being judged here, and RO's
 * brim is the silhouette the collection is drafted against anyway. `sourceId`
 * borrows the NORWAY'26 size pin — nothing else — so at dame + 4.0 mm these
 * come out at 100 like the rest of the collection, and change size or hook and
 * they fall through to the gauge exactly as a published kit would.
 */
const SIZE_PIN = 'norway26' as const;

/**
 * Field params shared by the wall motif layer and the crown resolver.
 *
 * They have to be the SAME VALUES or a stroke changes direction at the
 * shoulder: the wall samples the field in chart space and the crown samples it
 * in (u, v), and they only line up stitch for stitch if they were handed
 * identical parameters.
 *
 * WHICH IS WHY EACH FIELD IS DECLARED ONCE, BELOW, AND READ TWICE.
 *
 * Writing the params out at both call sites is the obvious way to do this and
 * it is wrong — it survives exactly as long as nobody tunes the field. Tuning
 * Skifer's bands and dither, the wall got the edit and the crown kept the old
 * numbers, so the hat had a fourteen-row wall of clean wide bands sitting under
 * a crown still dithered at 3 on a different band rhythm. It does not throw and
 * it does not fail validate; it just quietly stops being one gesture, and the
 * seam is at the shoulder where it is hardest to see in a screenshot. One
 * object, two readers.
 */
/**
 * THE DRAFTS ARE UNDER THE COLLECTION'S TYPOGRAPHY, NOT BESIDE IT.
 *
 * Both of these were drawn before the master pass, and each solved the
 * wordmark its own way: Lyn in a slab face of its own on a sixteen-row wall,
 * Skifer in the runic face set `bold` with a wider letter gap and a black
 * contour. Three lettering systems across seven hats, and the two drafts were
 * the two that looked least like the collection they are drafts for.
 *
 * They now take `norgeWordmark` and `norgeFieldProtection` verbatim — the same
 * face at the same size in the same place, the same protected panel, the same
 * transition corridor. What is still theirs is the fabric: Lyn's six broad
 * periwinkle sweeps and Skifer's diagonal grey bands. That is the split the
 * collection is built on.
 */
const WORDMARK_A = norgeWordmark('cream');
const WORDMARK_B = norgeWordmark('white');

function shared(
  wordmark: typeof WORDMARK_A,
  extra: Record<string, number | string | boolean>,
) {
  return {
    coverBrim: true,
    edgeSolid: true,
    edgeSolidRounds: EDGE_ROUNDS,
    crownFieldMinCount: 20,
    brimSlopeGain: 0.35,
    ...norgeFieldProtection(wordmark),
    ...extra,
  };
}

/* ------------------------------------------------- A — «Lyn» (navy / block) */

/**
 * Reference photo 1: navy ground, a heavy cream NORGE across the front, broad
 * periwinkle sweeps and thin flag-red ones running crown → wall → rim.
 *
 * THE SLABBIEST OF THE SEVEN, AND IT GETS THERE WITHOUT A FACE OF ITS OWN.
 * «NorgeDisplay26» is the slab the draft's own face was trying to be — the
 * draft is where it was first cut — so what used to be this hat's private
 * lettering is now the collection's, and Lyn reads as the boldest version of a
 * shared idea rather than as a different hat that says the same word.
 */
/** Periwinkle twice, red once — the light blue is the fabric, the red cuts it. */
const LYN_INKS: YarnColor[] = ['lightblue', 'lightblue', 'red'];

const LYN_FIELD = shared(WORDMARK_A, {
  seed: 8261,
  /**
   * SIX BROAD SWEEPS, NOT THIRTEEN THIN ONES.
   *
   * The collection runs eight to twelve. This photo is the opposite hat: a
   * handful of wide periwinkle strokes with a lot of navy showing between them,
   * and the red arriving as a thin companion on the edge of a sweep rather than
   * as a stripe of its own. Six, and even — an odd count would put a sweep
   * through one transition corridor and nothing through the other.
   */
  count: 6,
  // A five-stitch belly. The companions ride at a third of that.
  width: 2.6,
  widthVary: 0.2,
  // Shallow enough to hold the corridor: a sweep pinned at the middle of the
  // wall drifts 7·slope stitches by the time it reaches the shoulder, and the
  // corridor is nine wide with a five-stitch sweep in it.
  slope: 0.28,
  curve: 0.3,
  kinkRows: 9,
  kinkAmp: 0.5,
  tipSharp: 0.4,
  tipSharpEnd: 0.06,
  bundleCompanions: 2,
  bundleSpread: 4.6,
  // Companions well under the core's weight — that thick/thin pairing is what
  // makes a broad sweep read as a sweep and not as a stripe. The floor in
  // `norgeFieldProtection` still keeps them at two stitches.
  bundleWidthMin: 0.3,
  bundleWidthMax: 0.5,
  bundleStagger: 5,
  bundleLenMin: 0.72,
});

const HAT_A: StudioDesign = {
  ...blankDesign(),
  title: 'MASKLAB · Lyn',
  baseColor: 'blue',
  crownColor: 'blue',
  brimColor: 'cream',
  brimStyle: 'wave',
  /**
   * Fourteen rows, the collection's wall — it was sixteen.
   *
   * The extra two paid for a climbing baseline and a contour, and the master
   * pass dropped both: the face is upright, so the block is exactly its own ten
   * rows, and the protected panel does what the contour used to. Fourteen puts
   * two rows of ground above the word and two below, and the panel covers all
   * of them, which is what makes the wall read as clean where the word is.
   */
  bandRows: NORWAY_BAND_ROWS,
  hookMm: 4.0,
  sizeId: 'dame',
  omkrets_cm: 56,
  layers: [
    {
      kind: 'motif',
      id: 'lyn-field',
      motif: 'slash',
      anchor: { row: 0, col: 0 },
      colorIds: LYN_INKS,
      params: LYN_FIELD,
    },
    { ...WORDMARK_A, id: 'lyn-wordmark' },
  ],
  override: emptyOverride(),
  brimFinish: { rimRounds: EDGE_ROUNDS },
  sourceId: SIZE_PIN,
  crown: { kind: 'slash', colorIds: LYN_INKS, params: LYN_FIELD },
};

/* ---------------------------------------------- B — «Skifer» (black / grey) */

/**
 * Reference photo 2: a black hat cut into broad diagonal bands of charcoal and
 * two greys, with a cream runic NORGE laid over them.
 *
 * This one needed nothing new at all. `diagonalStripes` already draws exactly
 * this — repeating bands whose width is stretched to divide the circumference
 * so they meet themselves at the seam, with a dithered staircase at every
 * boundary instead of a ruled edge — and the crown resolver already speaks it,
 * so the bands run over the dome and out to the rim in one piece.
 *
 * THE PALETTE IS THREE GREYS, NOT FOUR. The photo has near-black, charcoal,
 * mid and light; the yarn palette has `black`, `slate` and `stone`. The band
 * rhythm below leans on width instead — a wide black, a mid slate, a narrow
 * black, a light stone — which gives the same restless read without a fourth
 * yarn. A charcoal would need adding to the palette to match it exactly.
 */
const SKIFER_FIELD = shared(WORDMARK_B, {
  seed: 41,
  /**
   * Band widths in stitches, measured along the diagonal. The rhythm is
   * deliberately uneven — 22/13/9/16 — because four equal bands read as a
   * barber pole. `stripeColorAt` rescales the whole period so it divides the
   * circumference exactly, so these are proportions, not absolute counts, and
   * they survive a change of size.
   */
  bands: 'black:22,slate:13,black:9,stone:16',
  /**
   * Shallow, where the photo leans hard — and this is the one place the draft
   * gives ground to the collection.
   *
   * At 1.1 a band drifted twelve stitches across the fourteen rows of the wall,
   * which is more than the nine-stitch corridor is wide: a band entered the gap
   * at the crown seam and was behind the wordmark's panel by the fold, so the
   * two halves of it did not line up and the hat read as a striped crown over a
   * separately striped brim. At 0.3 a band crosses the wall four stitches over
   * and comes out where the eye expects it. The bands still stair-step — the
   * staircase is the edge, the same as before — they just do it at the angle
   * the corridor can carry.
   */
  slope: 0.3,
  /**
   * NO DITHER. This one went wrong twice before it went right.
   *
   * At three the fuzz is as wide as it is deep — `dither` is a WIDTH and the
   * blend probability ramps across it — so the two greys trade cells for a
   * third of a band and four broad bands come out as one field of speckle with
   * no edges in it at all.
   *
   * At one it is worse in the way that matters, and the wall chart hides it:
   * the ramp means only a few per cent of cells flip at the outside of the
   * zone, and a cell that flips alone is ONE STITCH of grey in the middle of
   * black. On the crown it is everywhere, because the crown samples the field
   * at `cols / count` per stitch, so neighbouring stitches get uncorrelated
   * hashes and there is no run length left at all. A single isolated stitch is
   * a yarn join and a yarn cut for one stitch; `validate.ts` has a
   * `maxFieldSingles` guard for exactly this, and it is the rule this motif has
   * to answer to as much as any other.
   *
   * At zero the boundary is the diagonal's own staircase — at slope 1.1 that is
   * a step of about one stitch per round, which is the jagged edge the photo
   * shows anyway, and every run is workable.
   */
  dither: 0,
  /**
   * Straight, not chevroned. `zigRows` would reverse the drift and turn the
   * bands into lightning; the photo's bands run one way from crown to rim, and
   * that single direction is what makes the hat read as carved rather than as
   * camouflage.
   */
  zigRows: 0,
});

const HAT_B: StudioDesign = {
  ...blankDesign(),
  title: 'MASKLAB · Skifer',
  baseColor: 'black',
  crownColor: 'black',
  brimColor: 'white',
  brimStyle: 'wave',
  bandRows: NORWAY_BAND_ROWS,
  hookMm: 4.0,
  sizeId: 'dame',
  omkrets_cm: 56,
  layers: [
    {
      kind: 'motif',
      id: 'skifer-bands',
      motif: 'diagonalStripes',
      anchor: { row: 0, col: 0 },
      colorIds: ['black'],
      params: SKIFER_FIELD,
    },
    /**
     * NO CONTOUR, AND NO `bold` — because neither is needed any more.
     *
     * This wordmark used to carry both, and for a reason that has since been
     * removed rather than solved: `diagonalStripes` is an OPAQUE motif, so the
     * ground under the word changed tone three times across its width, and a
     * one-stitch cream stroke crossing `stone` disappeared into it. `bold`
     * widened the strokes, a black ring held the bands off, and the letter
     * spacing had to go to three to stop the fattened glyphs fusing.
     *
     * The protected panel takes the bands out of the word's footprint entirely,
     * so the ground under NORGE is one colour — the design's own black — from
     * the N to the E. Nothing to disappear into, nothing to hold off, and the
     * face is two stitches thick as drawn.
     */
    { ...WORDMARK_B, id: 'skifer-wordmark' },
  ],
  override: emptyOverride(),
  brimFinish: { rimRounds: EDGE_ROUNDS },
  sourceId: SIZE_PIN,
  crown: { kind: 'diagonalStripes', params: SKIFER_FIELD },
};

/* ------------------------------------------------------------------ output */

const CELL = 16;
const PAD = 12;

/** The whole wall, seam to seam, as the crocheter would read it. */
function bandSvg(design: StudioDesign): string {
  const d = deriveDesign(design);
  const { grid } = d.chart;
  const cols = d.bodyCount;
  const rows = d.bandRows;
  const w = cols * CELL + PAD * 2;
  const h = rows * CELL + PAD * 2;
  const cells: string[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const hex = YARN_HEX[grid[r][c] as YarnColor];
      cells.push(
        `<rect x="${PAD + c * CELL}" y="${PAD + r * CELL}" width="${CELL}" height="${CELL}" fill="${hex}" stroke="#00000018" stroke-width="0.5"/>`,
      );
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="#EDEAE4"/>${cells.join('')}</svg>`;
}

function report(name: string, design: StudioDesign) {
  const d = deriveDesign(design);
  writeFileSync(join(OUT, `${name}-band.svg`), bandSvg(design));
  const url = `${BASE}/oppskrift/custom?d=${encodeDesign(design)}`;
  writeFileSync(join(OUT, `${name}-url.txt`), url);
  const byColor = new Map<string, number>();
  for (const s of d.stitches) byColor.set(s.color, (byColor.get(s.color) ?? 0) + 1);
  const changes = d.stitches.filter((s) => s.changeColorAfter !== null).length;
  console.log(`\n${design.title}`);
  console.log(`  ${d.bodyCount} masker i runden · ${d.rounds.length} runder · ${d.bandRows} rader vegg`);
  console.log(`  ${d.stitches.length} masker · ${changes} fargeskift`);
  console.log(
    '  ' +
      [...byColor.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([c, n]) => `${c} ${n}`)
        .join(' · '),
  );
  console.log(`  → ${name}-band.svg`);
}

// `shot-proto.ts` imports the two designs from here, so only write files when
// this file is the one that was run.
if (/proto-masklab/.test(process.argv[1] ?? '')) {
  mkdirSync(OUT, { recursive: true });
  report('a-lyn', HAT_A);
  report('b-skifer', HAT_B);
  console.log(`\ndone → ${OUT}`);
}

export { HAT_A, HAT_B };
