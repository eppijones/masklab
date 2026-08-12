import { buildNorwayKit } from './norwayKit';

/**
 * NORWAY'26 — Trening.
 *
 * The pre-match top, and it is the loudest garment Nike has made for this
 * federation: a dense chevron zigzag that covers the whole shirt edge to edge,
 * red on red on red with navy and off-white flaring through it, and navy at the
 * collar and cuffs. There is no plain area anywhere on it.
 *
 * COVERED, NOT DECORATED. The other four kits are a ground with strokes across
 * it — you can point at the navy or the yellow and say that is the colour of
 * the hat. This one must not read that way. Nine bundles instead of four, drawn
 * narrow and packed at a spread of 1.4, so the strokes overlap and interlock
 * and the red underneath shows as one more colour in the mix rather than as the
 * background it technically is. Hard slope and deep kink give the chevron.
 *
 * This is deliberately the hardest hat in the collection to crochet — four
 * yarns live in nearly every round of it and the colour changes never let up.
 * That is the point: the shirt is the loud one, so the hat is the difficult one.
 */
export const NORWAY26_TRAINING = buildNorwayKit({
  id: 'norway26-training',
  title: "NORWAY'26 Trening",
  titleNo: "NORWAY'26 Trening",
  palette: ['red', 'blue', 'white', 'lightblue'],
  ground: 'red',
  textColor: 'white',
  // Navy, like the collar and cuff bands — and the only colour on the shirt
  // dark enough to close a red hat off.
  edge: 'blue',
  field: {
    seed: 47,
    // Red twice in the rotation as well as underneath: on the shirt the zigzag
    // is mostly red-on-red, and the navy and off-white are what flare through
    // it rather than the other way round.
    strokes: ['red', 'blue', 'white', 'red', 'lightblue'],
    count: 9,
    width: 2.4,
    companions: 4,
    spread: 1.9,
    lenMin: 0.55,
    slope: 1.7,
    kinkAmp: 0.9,
    curve: 0.3,
    tipSharp: 0.25,
  },
});
