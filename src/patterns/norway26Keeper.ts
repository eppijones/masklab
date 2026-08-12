import { buildNorwayKit } from './norwayKit';

/**
 * NORWAY'26 — Keeper.
 *
 * The goalkeeper shirt is strong yellow with a coral zigzag across the
 * shoulders. This is that, in yarn: yellow ground under bundles in a deeper
 * gold, orange and pink, with light grey as the one cool note holding them
 * apart. Black NORGE front and back, and a black rim.
 *
 * NO GREY BUNDLES. The first cut carried the zigzag in two greys with the warm
 * tones as companions, and grey on yellow goes muddy the moment the two share a
 * round — the hat read as a dirty yellow rather than a bright one. The warm
 * inks lead now and grey is down to a single accent, which is the job it can
 * actually do here: it separates gold from orange, which are close enough in
 * value to fuse.
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
  palette: ['yellow', 'gold', 'orange', 'pink', 'stone', 'black'],
  ground: 'yellow',
  textColor: 'black',
  edge: 'black',
  field: {
    seed: 1926,
    // Gold twice: it is the tonal note the shirt is built on, and one turn as a
    // core is not enough for it to register against the yellow ground.
    strokes: ['gold', 'orange', 'gold', 'pink', 'stone'],
    count: 5,
    width: 2.2,
    companions: 3,
    slope: 1.45,
    kinkAmp: 0.7,
    curve: 0.16,
  },
});
