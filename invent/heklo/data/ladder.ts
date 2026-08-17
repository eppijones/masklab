export interface LadderStep {
  id: string;
  name: string;
  proves: string;
  pass: string;
  fail: string;
  eur: number;
}

export const LADDER: LadderStep[] = [
  {
    id: 'P0',
    name: 'Yarn capture',
    proves: 'The latch can catch and release DK cotton.',
    pass: '100/100 captures on a hand-held needle.',
    fail: 'Yarn splits or slips. Change needle brand before designing anything else.',
    eur: 15,
  },
  {
    id: 'P1',
    name: 'Gated V',
    proves: 'A printed gate holds a hand-made stitch mouth open at a known pose.',
    pass: 'Needle through the throat 50/50 with the gate in a vice.',
    fail: 'Throat geometry is wrong. Reprint, do not add vision.',
    eur: 5,
  },
  {
    id: 'P2',
    name: 'One fastmaske',
    proves: 'Draw-through-two with loops = 1 at the end.',
    pass: '50 consecutive sc into the same gated V, loop height σ < 0.6 mm.',
    fail: 'If you cannot do this on a bench, the architecture is dead. Stop.',
    eur: 40,
  },
  {
    id: 'P3',
    name: 'Recapture',
    proves: 'The new V seats in the same gate.',
    pass: '50/50 recapture while the yarn is still tensioned.',
    fail: 'Add a trailing comb. If that also fails, stop.',
    eur: 20,
  },
  {
    id: 'P4',
    name: 'Index a round',
    proves: 'C axis + 20-gate necklace, no drift.',
    pass: '3 rounds × 20 st, seam marker returns to the station.',
    fail: 'Belt or bearing. Not firmware.',
    eur: 80,
  },
  {
    id: 'P5',
    name: 'Inject',
    proves: 'A link can be added without dropping a V.',
    pass: '20 → 30 gates, fabric still on the chain.',
    fail: 'Magazine geometry. The chain idea is still sound; the injector is not.',
    eur: 35,
  },
  {
    id: 'P6',
    name: 'Colour change',
    proves: 'Turret on second yarn-over.',
    pass: '100 changes, ≤2 defects, floats not pulling.',
    fail: 'Tune dancers. Do not give up on tapestry — it is the product.',
    eur: 50,
  },
  {
    id: 'P7',
    name: 'Crown',
    proves: '10 → 100 on the real increase schedule.',
    pass: 'A flat-ish disc, count matches the recipe.',
    fail: 'If inject works at P5, this is a program bug.',
    eur: 0,
  },
  {
    id: 'P8',
    name: 'Wall with NORGE',
    proves: 'Tapestry letters at 100 stitches.',
    pass: 'Readable NORGE, 14 rounds.',
    fail: 'Colour tension. Camera audit per round.',
    eur: 20,
  },
  {
    id: 'P9',
    name: 'Brim + one hat',
    proves: 'The whole profile, wearable.',
    pass: 'A bucket hat that matches the catalog silhouette.',
    fail: 'Then you know what to fix. You have not spent a fortune.',
    eur: 40,
  },
];

export const LADDER_TOTAL = LADDER.reduce((s, s0) => s + s0.eur, 0);

export const SIM_PROVES = [
  'Stitch topology is weft crochet (one live loop, draw-through-two).',
  'Six axes can reach every pose the cycle asks for.',
  'Gate cardinality tracks the catalog increase schedule from 10 to ~144.',
  'A NORGE Home job is ~3 700 stitches, ~3.7 h at 3.6 s/stitch.',
  'Parts list is under €750 with a Raspberry Pi class controller.',
];

export const SIM_DOES_NOT = [
  'Cotton-on-latch friction, lint, humidity.',
  'Whether a printed gate holds a V under 1–2 N of yarn tension for 4 000 stitches.',
  'Whether inject can be done in 0.6 s without dropping a neighbour.',
  'Hand-feel of the fabric versus Helene’s hand-crocheted hats.',
  'Legal patentability. This is a draft disclosure, not a filing.',
];
