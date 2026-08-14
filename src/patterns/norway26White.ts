import { buildNorwayKit } from './norwayKit';

/**
 * NORWAY'26 — Hvit (away).
 *
 * Warm white ground, dark navy NORGE, navy and light blue falling from the
 * crown — and the shirt's red collar trim taken to the finish as a two-round
 * red rim.
 *
 * THE CLEANEST ONE, AND THE MOST NEGATIVE SPACE. Eight bundle positions where
 * Drakt runs ten and Trening twelve, at the widest spread in the collection: on
 * a white ground the eye reads the gaps as much as the strokes, and crowding
 * them is what turns an away kit into a grey one.
 *
 * RED IS PUNCTUATION, NOT A FIELD. It takes one turn in five in the rotation
 * against navy's two, so it arrives as a single stroke through a corridor
 * rather than as a colour the hat is made of. Light blue stays a full partner —
 * at one turn in four it was invisible, because next to navy on white a lone
 * periwinkle stroke just reads as navy that has faded.
 */
export const NORWAY26_WHITE = buildNorwayKit({
  id: 'norway26-white',
  title: "NORGE Hvit",
  titleNo: "NORGE Hvit",
  palette: ['white', 'blue', 'lightblue', 'red'],
  ground: 'white',
  textColor: 'blue',
  edge: 'red',
  field: {
    seed: 2015,
    strokes: ['blue', 'lightblue', 'blue', 'lightblue', 'red'],
    count: 8,
    width: 1.45,
    // Wide spread: navy and periwinkle read as one mass when they touch, so the
    // stripes need air between them to stay two colours.
    spread: 5.4,
    /**
     * THE ZIGZAG, AT HVIT'S OWN VOLUME.
     *
     * This kit used to run the most upright gesture of the five — `kinkAmp` at
     * 0.15, `curve` at 0.1, which is a ruled line with a wobble in it — and next
     * to Trening and Keeper it read as banding rather than as a graphic. The
     * kink is the collection's shape, so Hvit carries it too.
     *
     * What stays Hvit's is everything around it: eight bundles rather than
     * twelve, the widest spread in the collection, and red still taking one turn
     * in five. The zigzag arrives on plenty of white ground instead of covering
     * it, which is the difference between an away kit and a grey one.
     */
    slope: 0.3,
    kinkRows: 6,
    kinkAmp: 0.6,
    curve: 0.24,
    tipSharp: 0.35,
  },
});
