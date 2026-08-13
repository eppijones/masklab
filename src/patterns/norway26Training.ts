import { buildNorwayKit } from './norwayKit';

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
});
