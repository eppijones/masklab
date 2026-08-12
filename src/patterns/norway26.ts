import { buildNorwayKit } from './norwayKit';

/**
 * NORWAY'26 — Drakt (the statement kit).
 *
 * Navy ground under five bundles of flag red, off-white and light blue, each a
 * thick core with three thinner companions travelling beside it from the crown
 * disc, down the wall and out over the brim. Off-white NORGE front and back,
 * off-white rings and rim. The bundle rotation gives all three inks a turn as
 * core and as companion, which is what keeps it reading as directional energy
 * instead of camouflage.
 *
 * This is the reference gesture — the one the other four are set against — so
 * it keeps the factory defaults and states none of its own.
 */
export const NORWAY26 = buildNorwayKit({
  id: 'norway26',
  title: "NORWAY'26 Drakt",
  titleNo: "NORWAY'26 Drakt",
  palette: ['blue', 'white', 'red', 'lightblue'],
  ground: 'blue',
  textColor: 'white',
  edge: 'white',
  field: {
    seed: 2026,
    strokes: ['red', 'white', 'lightblue'],
    count: 4,
    width: 2.5,
    companions: 3,
  },
});
