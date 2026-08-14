import { buildNorwayKit } from './norwayKit';

/**
 * NORGE — Away. (Formerly "Svart"; the pattern id stays `norway26-black` so
 * saved progress and shared links keep working.)
 *
 * Black ground, white NORGE, and twelve zigzag strokes alternating grey and
 * white across the crown, through the corridors and out over the brim. White
 * rim.
 *
 * THE FIELD IS A LADDER, AND WHITE IS THE TOP RUNG OF IT — SPARINGLY.
 *
 * The rule used to be absolute: pure white was the type and the edge and nothing
 * else. It was written after the first draft, where the whole field was white
 * strokes on black — the same yarn as the wordmark, at the same maximum
 * contrast — so the letters and the fabric competed for one job and the loudest
 * thing on a black hat was never the word. Sand and cream fixed it by moving the
 * field off white entirely.
 *
 * BUT IT WAS THE QUANTITY THAT BROKE THAT DRAFT, NOT THE COLOUR. One flat tone on
 * black is a stripe; two alternating is a fabric. Black 0.02, slate 0.24, white
 * 0.87 in relative luminance — three rungs with real air between them. The
 * wordmark survives the brightest rung because the field is masked out of the
 * word's whole footprint: every letter stands on clean black, whatever the fabric
 * is doing two stitches away.
 *
 * IT IS THE SAME CAMOUFLAGE AS THE REST OF THE COLLECTION NOW, NOT A CALMER ONE.
 * This hat used to run six broad bundles against the others' twelve, which
 * measured 23 colour fields per round where every other kit sits between 33 and
 * 36 — it had stopped being the same fabric in monochrome and become a few clean
 * diagonal sweeps. It takes Home's field geometry now, a touch slimmer (1.25
 * against 1.35, so more ground shows between the marks and black stays the
 * largest colour), and lets the palette do the quietening: 32.9 fields per round
 * and a 2.59-stitch mean patch, both Keeper's numbers to the decimal.
 *
 * AND IT IS STILL THE EASY HAT. Three yarns — black, grey, white — the shortest
 * list in the collection, no red and no cool colour. The pattern is busy; the
 * shopping list is not.
 */
export const NORWAY26_BLACK = buildNorwayKit({
  id: 'norway26-black',
  title: "NORGE Away",
  titleNo: "NORGE Away",
  palette: ['black', 'white', 'slate'],
  ground: 'black',
  textColor: 'white',
  edge: 'white',
  field: {
    seed: 7,
    /**
     * Grey and white alternating, on a five-step cycle. The alternation is the
     * point: weighting grey three-to-one was tried first and it made grey pool
     * into broad regions with the odd white mark in them, which is stripes with
     * extra steps, not camouflage.
     *
     * Five rather than a flat two because of the ground rule. Strict
     * alternation splits the field evenly, and since white also carries the
     * wordmark and the rim it pushed white past black — 40 % to 38 % — and the
     * kit check that says the ground must be the largest colour failed, rightly.
     * Odd cycle length against twelve bundles keeps the ink walking (no two
     * rounds of the hat repeat the same bundle-to-ink mapping) while leaving
     * grey the majority of the strokes.
     *
     * Measured: field 62 grey / 38 white, whole hat black 39 %, white 37 %,
     * grey 24 %. Mean pattern patch 2.59 stitches and 32.9 colour fields per
     * round — both exactly Keeper's numbers, which is the texture this is
     * chasing.
     */
    strokes: ['slate', 'white', 'slate', 'white', 'slate'],
    /** Home's field geometry, slimmed a notch — see the note at the top. */
    count: 12,
    width: 1.25,
    companions: 2,
    spread: 4.4,
    lenMin: 0.62,
    slope: 0.34,
    curve: 0.28,
    kinkRows: 5,
    kinkAmp: 0.75,
    tipSharp: 0.3,
  },
});
