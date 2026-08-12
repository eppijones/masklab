import { buildNorwayKit } from './norwayKit';

/**
 * NORWAY'26 — Svart.
 *
 * The minimal one. Three white bundles cross the crown, wall and brim and
 * nothing else does: narrow cores, two short companions each, broken so they
 * travel rather than rule. White NORGE front and back, three white rings on the
 * brim and a two-round white rim. Everything the other kits do, done four times
 * more quietly.
 *
 * The steepest gesture of the five — the strokes fall almost vertically and
 * bow hard, so on a black ground they read as light catching an edge rather
 * than as stripes.
 */
export const NORWAY26_BLACK = buildNorwayKit({
  id: 'norway26-black',
  title: "NORWAY'26 Svart",
  titleNo: "NORWAY'26 Svart",
  palette: ['black', 'white'],
  ground: 'black',
  textColor: 'white',
  edge: 'white',
  field: {
    seed: 7,
    strokes: ['white'],
    count: 3,
    width: 1.8,
    companions: 2,
    // Everything here is white on black, so the companions need real air
    // around them to stay legible as separate marks.
    spread: 5,
    /** Short companions: the marks read as broken, not as ruled tramlines. */
    lenMin: 0.42,
    slope: 0.85,
    curve: 0.4,
    kinkAmp: 0.25,
  },
});
