import { buildNorwayKit } from './norwayKit';

/**
 * NORWAY'26 — Hvit (away).
 *
 * Off-white ground with navy bundles falling from the crown and light blue
 * running with them. Navy NORGE front and back — and the shirt's red collar
 * trim taken all the way round the finish: three red rings and a two-round red
 * rim, which is the only thing that frames an off-white hat.
 *
 * LIGHT BLUE IS A PARTNER, NOT AN ACCENT. It used to be one ink in four, which
 * on a white ground is invisible: navy is so much darker that a single
 * periwinkle stroke in the bundle just reads as a navy one that has faded. At
 * an even share it separates the bundles into two depths and the field gets the
 * dimension the away shirt has.
 *
 * The most upright gesture in the collection — a low `slope` and almost no
 * kink, so the strokes fall nearly straight down the hat. Against Trening's
 * jagged noise and Keeper's flat zigzag, this one is the calm one.
 */
export const NORWAY26_WHITE = buildNorwayKit({
  id: 'norway26-white',
  title: "NORWAY'26 Hvit",
  titleNo: "NORWAY'26 Hvit",
  palette: ['white', 'blue', 'lightblue', 'red'],
  ground: 'white',
  textColor: 'blue',
  edge: 'red',
  field: {
    seed: 2015,
    strokes: ['blue', 'lightblue', 'blue', 'lightblue'],
    count: 4,
    width: 2.0,
    companions: 3,
    // Wide spread: navy and periwinkle read as one mass when they touch, so the
    // bundle needs air inside it to stay two colours.
    spread: 3.8,
    // Thick, thin, thick — the alternating rhythm on the away shirt.
    thinEvery: 2,
    slope: 0.72,
    kinkAmp: 0.15,
    curve: 0.1,
    tipSharp: 0.7,
  },
});
