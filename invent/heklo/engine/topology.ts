/**
 * Why HEKLO is crochet, not knitting and not Raschel "crochet".
 * Topology only — no motors, no React.
 */

export type TopologyKind = 'weft-crochet' | 'weft-knit' | 'warp-raschel';

export interface Topology {
  id: TopologyKind;
  name: string;
  liveLoops: string;
  drawThrough: string;
  shaping: string;
  colourwork: string;
  heklo: string;
}

export const TOPOLOGIES: readonly Topology[] = [
  {
    id: 'weft-crochet',
    name: 'Weft crochet (fastmaske / single crochet)',
    liveLoops: 'Exactly one live loop on the tool.',
    drawThrough: 'New bight is drawn through TWO loops: the target V and the working loop.',
    shaping: 'Increase = two new stitches in one V. Decrease = two V’s drawn together.',
    colourwork: 'Switch yarn on the second yarn-over of a stitch (tapestry).',
    heklo: 'This is the stitch HEKLO forms. Phase 5 of the cycle is the crochet move.',
  },
  {
    id: 'weft-knit',
    name: 'Weft knitting (circular sock / Sentro / Addi)',
    liveLoops: 'One live loop per needle — typically 100+ at once.',
    drawThrough: 'New bight is drawn through exactly ONE old loop, forever.',
    shaping: 'Needle selection / held stitches. Crown of a hat is a different machine.',
    colourwork: 'Stranding or intarsia, but the fabric is knit, not crochet V’s.',
    heklo: 'Rejected. The catalog hats are written and gauged as crochet.',
  },
  {
    id: 'warp-raschel',
    name: 'Raschel / galloon “crochet machine”',
    liveLoops: 'A full bar of latch needles, warp-fed.',
    drawThrough: 'Warp chains joined by weft inlay. Not a hook into a previous V.',
    shaping: 'Guide-bar pattern. Cannot follow a magic-ring bucket-hat recipe.',
    colourwork: 'Warp stripes, not per-stitch tapestry letters.',
    heklo: 'Name only. Industry “crochet machines” are warp knitters.',
  },
];

/** Loops on the needle at the end of each named fastmaske phase. */
export const SC_LOOP_TRACE = [1, 1, 2, 2, 1, 1] as const;
