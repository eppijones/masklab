import { buildNorwayKit } from './norwayKit';

/**
 * NORWAY'26 — Keeper.
 *
 * Mustard ground, black NORGE, and the goalkeeper shirt's coral zigzag as broad
 * gestures in gold, orange and dusty pink. Black rim.
 *
 * PLAYFUL, NOT SCATTERED. The previous cut ran twelve narrow bundles with five
 * entries in the stroke rotation, which on a yellow ground is confetti: gold
 * against yellow is a tonal step you only see at width, so at two stitches it
 * read as speckle, and the pink and orange landed as flecks between the letters
 * rather than as a graphic. Eight bundles, drawn broadest-but-one in the
 * collection, and the zigzag arrives as a shape instead of a texture.
 *
 * THE BLACK STANDS ON UNINTERRUPTED MUSTARD. Black is the type and the rim and
 * nothing else touches the hat, so inside the wordmark's panel there are exactly
 * two colours: black letters, yellow ground. No pink, no orange, not between the
 * N and the O and not inside the counters. The warm colours take the corridor —
 * the strongest path on the hat, crown to brim, twice round the head.
 *
 * NO GREY, STILL. Every yarn here is warm except the black; a cool grey stripe
 * on a warm hat reads as dirt rather than as structure.
 */
export const NORWAY26_KEEPER = buildNorwayKit({
  id: 'norway26-keeper',
  title: "NORWAY'26 Keeper",
  titleNo: "NORWAY'26 Keeper",
  palette: ['yellow', 'gold', 'orange', 'pink', 'black'],
  ground: 'yellow',
  textColor: 'black',
  edge: 'black',
  field: {
    seed: 1926,
    // Gold twice: it is the tonal note the shirt is built on, and against a
    // yellow ground one turn as a core is not enough for it to register.
    strokes: ['gold', 'orange', 'pink', 'gold'],
    count: 8,
    width: 1.7,
    spread: 5,
    slope: 0.32,
    // A hard zigzag, but a large one — the shirt's graphic at the scale of a
    // hat rather than at the scale of a stitch.
    kinkAmp: 0.6,
    curve: 0.16,
  },
});
