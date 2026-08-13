import { buildNorwayKit } from './norwayKit';

/**
 * NORWAY'26 — Svart.
 *
 * Black ground, white NORGE, and a monochrome field in slate and stone that
 * moves across the crown, through the corridors and out over the brim. White
 * rim.
 *
 * WHITE IS THE TYPE AND THE EDGE. NOTHING ELSE ON THE HAT IS WHITE.
 *
 * This is the one real change of materials in the pass, and it is the change
 * that makes the kit work. The field used to be white strokes on black — the
 * same yarn as the wordmark, at the same maximum contrast — so the letters and
 * the fabric were competing for the same job, and on a black hat the loudest
 * thing was never the word. Two greys from the palette (`slate`, `stone`) carry
 * the field instead. They read as light catching an edge, the letters are the
 * only pure white on the hat, and the strongest contrast in the design lands
 * exactly where the corridor is.
 *
 * It costs the kit two yarns, from two to four. Svart was the collection's
 * simplest hat by yarn count and it stays its simplest hat by GESTURE — six
 * broad strokes, the fewest of the five, no red, no third colour, no noise.
 * Sophisticated rather than chaotic was the brief, and monochrome camouflage is
 * what a field of white speckle on black actually was.
 */
export const NORWAY26_BLACK = buildNorwayKit({
  id: 'norway26-black',
  title: "NORWAY'26 Svart",
  titleNo: "NORWAY'26 Svart",
  palette: ['black', 'white', 'slate', 'stone'],
  ground: 'black',
  textColor: 'white',
  edge: 'white',
  field: {
    seed: 7,
    // Slate twice: it is the mid tone the hat is built on, and stone is the
    // highlight that arrives once per bundle.
    strokes: ['slate', 'stone', 'slate'],
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
