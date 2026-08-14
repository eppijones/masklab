import { buildNorwayKit } from './norwayKit';

/**
 * NORWAY'26 — Svart.
 *
 * Black ground, white NORGE, and six broad grey strokes moving across the crown,
 * through the corridors and out over the brim. White rim.
 *
 * PURE WHITE IS THE TYPE AND THE EDGE. NOTHING ELSE ON THE HAT IS PURE WHITE.
 *
 * That rule is the kit, and it has now survived two changes of materials. The
 * field started as white strokes on black — the same yarn as the wordmark, at
 * the same maximum contrast — so the letters and the fabric competed for the
 * same job and the loudest thing on a black hat was never the word. Two greys
 * fixed that but were not on the shelf, so the field went to sand and cream:
 * the same three-step ladder, warm instead of cold.
 *
 * IT IS ONE GREY NOW. Espen has black, grey and white in hand and nothing else,
 * so the hat is those three and no fourth. `slate` sits almost exactly halfway
 * up the ladder — black 0.02, slate 0.24, white 0.87 in relative luminance — so
 * the field reads clearly on the ground and the type still stands a full step
 * brighter than the field. The warm variant needed two field yarns to build that
 * middle; one true grey is the middle, which is why dropping a colour costs the
 * design nothing.
 *
 * AND IT MAKES SVART THE EASY HAT IN FACT, NOT JUST IN GESTURE. Three yarns, one
 * of them only for the wordmark and the last two rounds: the body is black and
 * grey, two ends to carry, the fewest colour changes of the five. Six broad
 * strokes, no red, no cool colour, no noise — sophisticated rather than chaotic
 * was the brief, and the shortest yarn list on the shelf now serves it.
 */
export const NORWAY26_BLACK = buildNorwayKit({
  id: 'norway26-black',
  title: "NORWAY'26 Svart",
  titleNo: "NORWAY'26 Svart",
  palette: ['black', 'white', 'slate'],
  ground: 'black',
  textColor: 'white',
  edge: 'white',
  field: {
    seed: 7,
    // One ink for the whole field: cores and companions alike. `white` stays
    // out of it — that yarn is the lettering and the rim, and nothing else.
    strokes: ['slate'],
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
     * drawn broadest of the five, in one grey and no second colour. Same shape
     * as the loud hats, a quarter of the incident.
     */
    curve: 0.28,
    kinkRows: 6,
    kinkAmp: 0.6,
  },
});
