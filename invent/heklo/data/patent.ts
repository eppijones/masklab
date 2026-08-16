export interface PriorArt {
  id: string;
  title: string;
  year: string;
  who: string;
  what: string;
  gap: string;
  url: string;
}

export const PRIOR_ART: PriorArt[] = [
  {
    id: 'crochematic',
    title: 'Croche-Matic',
    year: '2023',
    who: 'Perry et al., Harvard GSD, ICRA',
    what: 'Radial 9-axis machine that copies the human magic-ring motion with a real crochet hook. Four stitch types in the round. 50.7% single-crochet success on ~12-stitch tubes.',
    gap: 'The hook still has to find a floppy V. HEKLO never hunts: every mouth is a printed gate. HEKLO also does 10→144 stitches and tapestry colourwork.',
    url: 'https://ieeexplore.ieee.org/document/10160345/',
  },
  {
    id: 'cromat',
    title: 'CroMat',
    year: '2024',
    who: 'Storck, HSBI Bielefeld / MTex³',
    what: 'Flat bed of latch needles holding the last row; a travelling needle forms ch, sl st, sc, hdc, increases and decreases. Insertion is geometric.',
    gap: 'Flat. 3D shapes are re-hung by hand. No colourwork. HEKLO keeps CroMat’s “hold the V” insight and makes the holder a growing circular chain so a bucket hat is one setup.',
    url: 'https://www.hsbi.de/publikationsserver/download/4792/4793/Dissertation_Storck.pdf',
  },
  {
    id: 'de102016015204',
    title: 'Häkelmaschine',
    year: '2016',
    who: 'FH Bielefeld, DE102016015204A1',
    what: 'First true weft-crochet patent: staggered opposing latch needles on a flat bed.',
    gap: 'Explicitly linear. No garment, no round, no colour.',
    url: 'https://patents.google.com/patent/DE102016015204A1/en',
  },
  {
    id: 'loom',
    title: 'Loom-based mechanized crochet',
    year: '2025',
    who: 'Smith et al., ACM SCF',
    what: 'Robotic arm + latch-needle end effector on a constrained fabric matrix so stitches can be built from arbitrary points.',
    gap: 'Requires a UR-class arm. HEKLO is a sewing-machine station and a €15 stepper, not a six-axis robot.',
    url: 'https://doi.org/10.1145/3774746.3779255',
  },
  {
    id: 'raschel',
    title: 'Raschel / galloon “crochet machines”',
    year: '1993–',
    who: 'Comez, Jakob Müller, etc.',
    what: 'Warp knitting with a latch-needle bar. The trade calls the lace “crochet.”',
    gap: 'Wrong topology. Cannot execute a fastmaske into a previous V, cannot follow Helene’s recipe.',
    url: 'https://patents.google.com/patent/US5327750',
  },
  {
    id: 'sentro',
    title: 'Addi / Sentro circular knitters',
    year: 'hobby',
    who: 'consumer',
    what: 'Cheap cylinder of latch needles. Makes tubes. People felt hats on them.',
    gap: 'Knitting: N live loops, draw-through-one. The catalog hats are gauged as crochet V-fabric with tapestry letters.',
    url: '',
  },
];

export interface Claim {
  n: string;
  kind: 'independent' | 'dependent';
  text: string;
}

export const CLAIMS: Claim[] = [
  {
    n: '1',
    kind: 'independent',
    text: 'An apparatus for forming weft-crochet fabric in the round, comprising a closed chain of identical stitch-gate links whose cardinality equals the working stitch count, a station fixed in azimuth that inserts a latch needle through a gated stitch mouth, and an injector that adds or removes exactly one gate link at the station when the pattern increases or decreases.',
  },
  {
    n: '2',
    kind: 'independent',
    text: 'A method of forming a single crochet stitch by drawing a new yarn bight through two loops — the gated mouth of a previous stitch and a working loop carried on a latch needle — while the mouth is held at a predetermined spatial pose by a removable gate link.',
  },
  {
    n: '3',
    kind: 'independent',
    text: 'A method of tapestry colourwork in automated weft crochet, wherein a yarn turret indexes to a new colour on the second yarn-over of a stitch so the colour change is locked inside that stitch.',
  },
  {
    n: '4',
    kind: 'dependent',
    text: 'The apparatus of claim 1, wherein the chain is started by chaining a seed of N loops (N ≈ 10) into N gates and joining them, so a magic ring is not required.',
  },
  {
    n: '5',
    kind: 'dependent',
    text: 'The apparatus of claim 1, wherein completed fabric hangs below the chain under gravity and a take-down skirt, so a bucket-hat crown, wall and brim are formed in one orientation without a hat last as stitch datum.',
  },
  {
    n: '6',
    kind: 'dependent',
    text: 'The method of claim 2, wherein insertion of the needle is a single linear degree of freedom along a radial axis of a polar working plane.',
  },
];

export const ABSTRACT =
  'A garage-scale weft-crochet engine forms true single-crochet (fastmaske) fabric in the round by holding every live stitch mouth in a 3D-printed gate. The gates are links of a closed chain whose length grows from a ten-stitch seed to a hundred-stitch hat wall and a flared brim. A fixed sewing-machine station plunges a latch needle through the gated mouth, yarn-overs, and draws one new bight through two loops. Colour is selected by a four-yarn turret on the second yarn-over. The working circumference is the stitch count, so the crown-start problem that kills a fixed needle cylinder does not arise. The machine is built from printed gates, NEMA17 steppers, a Raspberry Pi, and off-the-shelf latch needles.';

export const TITLE =
  'Apparatus and method for automated weft crochet using a variable-cardinality circular stitch-gate chain';
