import { buildNorwayKit } from './norwayKit';
import type { OverrideLayer } from '../data/chartLayers';

/**
 * NORWAY'26 — Trening.
 *
 * Rich red ground, off-white NORGE, navy and light blue cutting through it, and
 * a navy rim like the shirt's collar and cuff bands.
 *
 * STRUCTURED, NOT COVERED. The pre-match top is the loudest garment Nike has
 * made for this federation and the hat used to answer that literally: sixteen
 * bundles packed at a narrow spread with red in its own stroke rotation as well
 * as underneath, so no plain ground showed anywhere and the fabric read as one
 * interlocking mass. It was the hardest hat in the collection to crochet and it
 * was also the noisiest — four yarns in nearly every round, colour runs down to
 * a stitch, and a wordmark fighting a field that never let up.
 *
 * Twelve bundles now, drawn broad, with red taken OUT of the stroke rotation.
 * Red is the ground and only the ground; navy, off-white and light blue are
 * what flare across it. The zigzag stays — this kit still carries the deepest
 * kink in the collection, which is the shirt's own graphic — but it is a rhythm
 * you can follow across the hat rather than an all-over texture. Athletic and
 * geometric, and every stroke at least two stitches wide.
 */
/**
 * RUNDE 30, CLOSED SOLID RED FROM MASK 80 — a hand finish on ONE round's tail.
 *
 * Espen worked rounds 1–29 and the first 79 masker of round 30 to the printed
 * pattern before this override existed, so those are on the hook and cannot
 * move: nothing here touches the field, the seed or any round but 30, and mask
 * 79 stays navy exactly as the pattern already drew it. From mask 80 to the end
 * of round 30 the four inks give way to plain red — he closes the round in one
 * colour and carries the other three unbroken down the rest of the hat rather
 * than keep changing yarn to the chart. Rounds 31→rim are left as generated.
 *
 * BUT THE CAMOUFLAGE HAS TO STAY CONNECTED, OR THE HAT STOPS LOOKING WOVEN.
 * The transition corridor sits at mask ~84–85, and three of the field's strokes
 * pass straight down it through round 30 — they are the «camouflage between the
 * NORGE copies», and each one runs unbroken round 29 → 30 → 31 → brim:
 *
 *   • the NAVY core, masks 85–88 above and 84–87 below — the main corridor stroke;
 *   • a thin LIGHT-BLUE companion at mask 82, carrying on into 82–83 below;
 *   • a thin WHITE companion at mask 90, running mask 90 the whole way down.
 *
 * Flooding 80–100 red the first time cut all three at round 30, so the corridor
 * dead-ended and the field read as a solid red band with strokes stopping dead
 * against it — not believable. `RUNDE30_STROKES` keeps those masker in their own
 * colour so every stroke passes through: the navy trimmed one stitch to 85–87
 * (a believable 4→3→4 taper down its leftward-drifting centreline, not the old
 * four-wide block), the two companions at their natural single-stitch width.
 * Those are the FEW coloured stitches on the tail; everything else is red.
 *
 * The override is keyed on the WALL grid: round 30 is chart row 11, i.e. grid
 * row index 10 (`derivePattern` reads `textGrid[chartRow-1][mask-1]`), and mask
 * M sits at column M-1. Setting the whole 80–100 span — not only the masker that
 * changed — makes the intent a complete statement of the round rather than a
 * diff against a field that must not be re-read to understand it. Every colour
 * here matches what the field itself drew, so the corridor is the original
 * design, not an invention laid on top of it.
 */
const RUNDE30_GRID_ROW = 10; // chartRow 11 → grid row index 10
/** The corridor's camouflage strokes, kept in their own colour so the field
 *  reads continuous through round 30. Colours match the generated field. */
const RUNDE30_STROKES: Record<number, 'blue' | 'white' | 'lightblue'> = {
  82: 'lightblue',
  85: 'blue',
  86: 'blue',
  87: 'blue',
  90: 'white',
};
function closeRunde30Red(): OverrideLayer {
  const cells: OverrideLayer['cells'] = {};
  for (let mask = 80; mask <= 100; mask++) {
    cells[`${RUNDE30_GRID_ROW},${mask - 1}`] = RUNDE30_STROKES[mask] ?? 'red';
  }
  return { kind: 'override', cells };
}

export const NORWAY26_TRAINING = buildNorwayKit({
  id: 'norway26-training',
  title: "NORGE Home",
  titleNo: "NORGE Home",
  palette: ['red', 'blue', 'white', 'lightblue'],
  ground: 'red',
  textColor: 'white',
  // Navy, like the collar and cuff bands — and the only colour on the shirt
  // dark enough to close a red hat off.
  edge: 'blue',
  field: {
    seed: 47,
    // Navy twice: it is the structural colour on the shirt, and the one that
    // has to carry the corridor from the crown to the rim.
    strokes: ['blue', 'white', 'lightblue', 'blue'],
    count: 12,
    width: 1.35,
    companions: 2,
    spread: 4.4,
    lenMin: 0.62,
    slope: 0.34,
    // The deepest kink of the five, and the tightest: this is the shirt's
    // zigzag, and it is what stops Trening being Drakt in red. Five rows a leg
    // rather than eight — at eight the same amplitude wanders five stitches
    // from end to end, which is wider than the transition corridor, so the
    // stroke that is supposed to carry the crown down to the brim walks out of
    // it before it gets there.
    kinkRows: 5,
    kinkAmp: 0.75,
    curve: 0.28,
    tipSharp: 0.3,
  },
  /**
   * A SHORTER BRIM THAN HELENE'S — Espen's own finish, four rounds off the end.
   * On the head at round 31 the hat already sat where he wanted it, so instead of
   * her nine-round brim it takes the collection's five-round `SHORT_BRIM_TAIL`
   * (see `norwayKit.ts`): still shapes 100 → 110 → 120 at the fold, one flare
   * round to 144, two navy rim rounds, ending at Runde 36 not 40. `fieldRows` is
   * pinned, so dropping brim rounds cannot move the crown or wall he has already
   * crocheted — and he was on round 31 when this was cut, all of it still ahead.
   */
  shortBrim: true,
});

NORWAY26_TRAINING.chartOverride = closeRunde30Red();
