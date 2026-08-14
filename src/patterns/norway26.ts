import { buildNorwayKit } from './norwayKit';

/**
 * NORWAY'26 — Hjemme (the home kit).
 *
 * Deep marine ground, warm off-white NORGE, and the collection's zigzag in flag
 * red and light blue running from the crown's centre, down through the two
 * transition corridors, and out over the brim. Off-white rim.
 *
 * IT USED TO BE «DRAKT», AND IT USED TO BE THE ONE THAT STATED NOTHING. The kit
 * carried the factory's bare defaults — a seed, three inks and a count — on the
 * theory that the reference gesture should be undisguised so a change to the
 * collection's fabric showed up here first. What that actually produced was the
 * only hat of the five with no gesture of its own: broad diagonals falling at a
 * default angle with a default kink, which read as stripes next to Trening's
 * chevron and Keeper's coral zigzag. The home shirt is not the plainest thing
 * Nike made for this federation and the home hat should not be either.
 *
 * So it takes TRENING'S GEOMETRY and keeps its own colours. Twelve bundles, the
 * deep five-row kink, the same broad strokes — but navy under red, off-white and
 * light blue instead of red under navy, off-white and light blue. The two kits
 * are the same fabric in the two shirt colourways, which is what a home and a
 * pre-match top are, and the seed differs so the bundles do not land in the same
 * places twice.
 *
 * The colour is strongest where the design wants it — through the corridor.
 * That is not a per-kit setting: the corridor is the widest part of the wall the
 * field is allowed into, so on every hat in the collection the ink concentrates
 * there by construction.
 */
export const NORWAY26 = buildNorwayKit({
  id: 'norway26',
  title: "NORGE Marineblå",
  titleNo: "NORGE Marineblå",
  palette: ['blue', 'white', 'red', 'lightblue'],
  ground: 'blue',
  textColor: 'white',
  edge: 'white',
  field: {
    // Trening's seed is 47; this one keeps its own so the same geometry does
    // not drop its bundles in the same twelve places on both hats.
    seed: 2026,
    strokes: ['red', 'white', 'lightblue', 'red'],
    count: 12,
    width: 1.35,
    companions: 2,
    spread: 4.4,
    lenMin: 0.62,
    slope: 0.34,
    // The collection's zigzag, five rows to a leg. See `norway26Training.ts`:
    // at eight rows this amplitude wanders further than the corridor is wide,
    // so the stroke meant to carry the crown down to the brim leaves it first.
    kinkRows: 5,
    kinkAmp: 0.75,
    curve: 0.28,
    tipSharp: 0.3,
  },
});
