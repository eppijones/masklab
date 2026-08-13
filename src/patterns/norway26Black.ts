import { buildNorwayKit } from './norwayKit';

/**
 * NORWAY'26 — Svart.
 *
 * Black ground, white NORGE, and a warm monochrome field in sand and cream that
 * moves across the crown, through the corridors and out over the brim. White
 * rim.
 *
 * PURE WHITE IS THE TYPE AND THE EDGE. NOTHING ELSE ON THE HAT IS PURE WHITE.
 *
 * That rule is the kit, and it survived a change of materials. The field used to
 * be white strokes on black — the same yarn as the wordmark, at the same maximum
 * contrast — so the letters and the fabric competed for the same job and the
 * loudest thing on a black hat was never the word. Two greys took the field
 * instead, and that worked, but grey is not a yarn Espen keeps in stock, so a
 * hat nobody can actually crochet is not a design.
 *
 * SO IT IS THREE WHITES NOW, NOT TWO GREYS. `sand` is the mid tone the fabric is
 * built on, `cream` is the highlight that arrives once per bundle, and `white`
 * is still reserved for the lettering and the rim. Same three-step ladder the
 * greys gave — black, mid, light, and then the type a clear step brighter than
 * any of them — but warm rather than cold, which suits a hat that is otherwise
 * pure black, and every step of it is on the shelf.
 *
 * Svart stays the collection's simplest hat by GESTURE — six broad strokes, the
 * fewest of the five, no red, no cool colour, no noise. Sophisticated rather
 * than chaotic was the brief, and monochrome camouflage is what a field of white
 * speckle on black actually was.
 */
export const NORWAY26_BLACK = buildNorwayKit({
  id: 'norway26-black',
  title: "NORWAY'26 Svart",
  titleNo: "NORWAY'26 Svart",
  palette: ['black', 'white', 'sand', 'cream'],
  ground: 'black',
  textColor: 'white',
  edge: 'white',
  field: {
    seed: 7,
    // Sand twice: it is the mid tone the hat is built on, and cream is the
    // highlight that arrives once per bundle. Neither is `white` — that yarn is
    // the lettering and the rim, and nothing else.
    strokes: ['sand', 'cream', 'sand'],
    count: 6,
    // The broadest strokes in the collection. Six of them, so there is a clear
    // run of black either side of every one.
    width: 1.9,
    companions: 1,
    spread: 6,
    /** Short companions: the marks read as broken, not as ruled tramlines. */
    lenMin: 0.5,
    slope: 0.34,
    /**
     * THE ZIGZAG, AT SVART'S OWN VOLUME.
     *
     * `kinkAmp` was 0.2 — a near-ruled stroke — and against Trening and Keeper
     * the hat read as six diagonal bands rather than as the same fabric in
     * monochrome. The kink is what the collection is; the restraint has to come
     * from somewhere else.
     *
     * It comes from where it always did: six bundles, the fewest of the five,
     * drawn broadest of the five, in two greys and no third colour. Same shape
     * as the loud hats, a quarter of the incident.
     */
    curve: 0.28,
    kinkRows: 6,
    kinkAmp: 0.6,
  },
});
