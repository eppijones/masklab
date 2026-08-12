import type { PatternDefinition } from './types';
import type { ScriptRound, ScriptRun } from './script';
import { YARN_HEX, YARN_NAME } from '../data/types';
import { emptyOverride } from '../data/chartLayers';

/**
 * "Flagget til topps" — hatten av Helene Spilling.
 * Transcribed round for round from the official PDF
 * (references/Flagget-til-topps-HATTEN.pdf), 3.5/4.0 mm, small-medium (~55-57 cm).
 *
 * The advanced one: vertical flag-stripe colorwork through crown, midsection
 * AND brim — every colorwork round is expressed as explicit color runs, with
 * the increases sitting INSIDE the colored segments exactly as in the PDF.
 *
 * Note on round 28: the PDF prints "til sammen 102 fm", but its own repeat
 * math gives 104 (96 consumed + 8 increases), and round 29's repeat of 13
 * consumed stitches x 8 = 104 confirms it. We encode the consistent 104.
 */
const w = (n: number, incLast = false): ScriptRun => ({ color: 'white', n, incLast });
const r = (n: number, incLast = false): ScriptRun => ({ color: 'red', n, incLast });
const b = (n: number, incLast = false): ScriptRun => ({ color: 'blue', n, incLast });

const S = (
  count: number,
  color: 'red' | 'white' | 'blue',
  k: number | null,
  phase: ScriptRound['phase'],
  runs?: ScriptRun[],
  chartRow: number | null = null,
): ScriptRound => ({ phase, count, color, increaseEvery: k, runs, chartRow });

const FLAGGET_SCRIPT: ScriptRound[] = [
  // Toppen, runde 1-14 (PDF page 3).
  S(10, 'red', null, 'top'), // 1: magisk ring
  S(20, 'red', 1, 'top'), // 2   (bytt til hvit i siste maske)
  S(30, 'white', 2, 'top'), // 3 (bytt farge)
  S(30, 'blue', null, 'top'), // 4
  S(40, 'blue', 3, 'top'), // 5  (bytt farge)
  S(40, 'white', null, 'top', [w(3), b(2)]), // 6: 3 hvite, 2 blå
  S(48, 'white', null, 'top', [w(1), r(2, true), w(1), b(2)]), // 7: 8 økninger
  S(56, 'white', null, 'top', [w(1), r(3, true), w(1), b(2)]), // 8
  S(64, 'white', null, 'top', [w(1), r(4, true), w(1), b(2)]), // 9
  S(72, 'white', null, 'top', [w(1), r(5, true), w(1), b(2)]), // 10
  S(80, 'white', null, 'top', [w(1), r(6, true), w(1), b(2)]), // 11
  S(88, 'white', null, 'top', [w(1), r(7, true), w(1), b(2)]), // 12: 7 røde
  S(88, 'white', null, 'top', [w(1), r(7), w(1), b(2)]), // 13: uten økning
  S(88, 'white', null, 'top', [w(1), r(7), w(1), b(2)]), // 14
  // Midtpartiet, runde 15-27 — the wall chart, row for row.
  S(88, 'white', null, 'text', [w(9), b(2)], 1), // 15
  S(88, 'blue', null, 'text', [b(11)], 2), // 16
  S(88, 'blue', null, 'text', [b(11)], 3), // 17
  S(88, 'white', null, 'text', [w(9), b(2)], 4), // 18
  S(88, 'white', null, 'text', [w(1), r(7), w(1), b(2)], 5), // 19
  S(88, 'white', null, 'text', [w(1), r(7), w(1), b(2)], 6), // 20
  S(88, 'white', null, 'text', [w(1), r(7), w(1), b(2)], 7), // 21
  S(88, 'white', null, 'text', [w(1), r(7), w(1), b(2)], 8), // 22
  // 23: økningen kommer i midten blant de røde fm → 96.
  S(96, 'white', null, 'text', [w(1), r(5, true), r(3), w(1), b(2)], 9),
  S(96, 'white', null, 'text', [w(1), r(8), w(1), b(2)], 10), // 24
  S(96, 'white', null, 'text', [w(1), r(8), w(1), b(2)], 11), // 25
  S(96, 'white', null, 'text', [w(10), b(2)], 12), // 26
  S(96, 'blue', null, 'text', [b(12)], 13), // 27
  // Kanten / bremmen, runde 28-34.
  S(104, 'blue', null, 'brim-inc', [b(13, true)]), // 28: økning i hver 12. maske
  S(112, 'white', null, 'brim-inc', [w(6), w(2, true), w(4), b(2)]), // 29
  S(112, 'white', null, 'brim-inc', [w(1), r(10), w(1), b(2)]), // 30
  S(120, 'white', null, 'brim-inc', [w(1), r(2, true), r(9), w(1), b(2)]), // 31
  S(128, 'white', null, 'brim-inc', [w(1), r(12, true), w(1), b(2)]), // 32
  S(128, 'white', null, 'brim-inc', [w(1), r(12), w(1), b(2)]), // 33
  S(136, 'white', null, 'brim', [w(1), r(7, true), r(6), w(1), b(2)]), // 34
];

export const FLAGGET: PatternDefinition = {
  id: 'flagget',
  version: 1,
  title: 'Flagget til topps',
  titleNo: 'Flagget til topps',
  palette: (['red', 'white', 'blue'] as const).map((id) => ({
    id,
    hex: YARN_HEX[id],
    nameNo: YARN_NAME[id],
  })),
  bandRows: 13,
  background: 'white',
  chartLayers: [],
  chartOverride: emptyOverride(),
  includeWave: false,
  finalBrim: { color: 'blue' },
  script: FLAGGET_SCRIPT,
  layout: {
    frontAnchorStitch: 10,
    frontTheta: 0.85,
    workingFlipZOnly: true,
    lockSpokeColor: 'blue',
  },
  defaults: { hookMm: 4.0, sizeId: 'dame' },
};
