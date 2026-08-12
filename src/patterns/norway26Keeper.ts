import { buildNorwayKit } from './norwayKit';

/**
 * NORWAY'26 — Keeper.
 *
 * The goalkeeper shirt is strong yellow with a coral zigzag across the
 * shoulders. This is that, in yarn: yellow ground under stripes in a deeper
 * gold, orange and pink. Black NORGE front and back, and a black rim.
 *
 * NO GREY AT ALL. The first cut carried the zigzag in two greys, which on
 * yellow goes muddy the moment the two share a round — the hat read as a dirty
 * yellow rather than a bright one. The second kept one grey as a separator
 * between gold and orange, which are close in value. That is a real job and it
 * was still the wrong yarn for it: a cool grey stripe on a warm hat reads as
 * dirt, not as structure. Pink does the separating now, and every yarn on the
 * hat is warm except the black.
 *
 * The gesture is the shallowest in the collection — a low `slope` and a big
 * `kinkAmp`, so the bundles lie over toward the horizontal and zigzag hard.
 * That is the shirt's graphic, and it is what stops Keeper looking like Drakt
 * in yellow.
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
    // Gold twice: it is the tonal note the shirt is built on, and one turn as a
    // core is not enough for it to register against the yellow ground.
    strokes: ['gold', 'orange', 'pink', 'gold', 'orange'],
    count: 12,
    width: 1.05,
    slope: 0.82,
    kinkAmp: 0.7,
    curve: 0.16,
  },
});
