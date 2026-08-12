import type { PatternDefinition } from './types';
import type { ScriptRound } from './script';
import { YARN_HEX, YARN_NAME } from '../data/types';
import { emptyOverride } from '../data/chartLayers';
import {
  ODEGAARD_BITMAP,
  ODEGAARD_COLS,
  ODEGAARD_FRONT_STITCH,
  ODEGAARD_ROWS,
} from '../data/odegaardChart';

/**
 * "VI SOM ELSKER MARTIN" — hatten av Helene Spilling.
 * Transcribed round for round from the official PDF
 * (references/VI-SOM-ELSKER-MARTIN-HATTEN-1.pdf), 4.0 mm hook, small (~55-56 cm).
 *
 * Crown rounds 1-19 (striped red/white/blue), ØDEGAARD text band rounds
 * 20-29 (exact PDF chart, white on red), brim rounds 30-39 (red, final round white).
 */
const R = (
  count: number,
  color: 'red' | 'white' | 'blue',
  k: number | null,
  phase: ScriptRound['phase'],
  chartRow: number | null = null,
): ScriptRound => ({ phase, count, color, increaseEvery: k, chartRow });

const MARTIN_SCRIPT: ScriptRound[] = [
  // Toppen, runde 1-19 (PDF page 3).
  R(10, 'red', null, 'top'), // 1: magisk ring
  R(20, 'red', 1, 'top'), // 2
  R(30, 'red', 2, 'top'), // 3
  R(30, 'red', null, 'top'), // 4
  R(40, 'red', 3, 'top'), // 5
  R(40, 'red', null, 'top'), // 6
  R(40, 'red', null, 'top'), // 7
  R(50, 'red', 4, 'top'), // 8
  R(60, 'red', 5, 'top'), // 9
  R(70, 'red', 6, 'top'), // 10
  R(70, 'red', null, 'top'), // 11
  R(70, 'red', null, 'top'), // 12  (bytt til hvit i siste maske)
  R(80, 'white', 7, 'top'), // 13  (bytt til blå i siste maske)
  R(80, 'blue', null, 'top'), // 14
  R(80, 'blue', null, 'top'), // 15  (bytt til hvit i siste maske)
  R(90, 'white', 8, 'top'), // 16  (bytt til rød i siste maske)
  R(90, 'red', null, 'top'), // 17
  R(90, 'red', null, 'top'), // 18
  R(100, 'red', 9, 'top'), // 19
  // ØDEGAARD, runde 20-29 — exact PDF bitmap (white on red).
  ...Array.from({ length: 10 }, (_, i) =>
    R(100, 'red', null, 'text', i + 1),
  ),
  // Kanten / brem, runde 30-39.
  R(110, 'red', 10, 'brim-inc'), // 30
  R(110, 'red', null, 'brim-inc'), // 31
  R(110, 'red', null, 'brim-inc'), // 32
  R(110, 'red', null, 'brim-inc'), // 33
  R(120, 'red', 11, 'brim-inc'), // 34
  R(130, 'red', 12, 'brim-inc'), // 35
  R(130, 'red', null, 'brim-inc'), // 36
  R(140, 'red', 13, 'brim-inc'), // 37
  R(150, 'red', 14, 'brim-inc'), // 38  (bytt til hvit i siste maske)
  R(150, 'white', null, 'brim'), // 39
];

export const MARTIN: PatternDefinition = {
  id: 'martin',
  version: 2,
  title: 'Vi som elsker Martin',
  titleNo: 'Vi som elsker Martin',
  palette: (['red', 'white', 'blue'] as const).map((id) => ({
    id,
    hex: YARN_HEX[id],
    nameNo: YARN_NAME[id],
  })),
  bandRows: ODEGAARD_ROWS,
  background: 'red',
  chartLayers: [
    {
      kind: 'image',
      id: 'odegaard-pdf',
      srcRef: 'references/VI-SOM-ELSKER-MARTIN-HATTEN-1.pdf',
      anchor: { row: 0, col: 0 },
      cols: ODEGAARD_COLS,
      rows: ODEGAARD_ROWS,
      dither: false,
      contrast: 1,
      bitmap: ODEGAARD_BITMAP,
      colorId: 'white',
    },
  ],
  chartOverride: emptyOverride(),
  includeWave: false,
  finalBrim: { color: 'white' },
  script: MARTIN_SCRIPT,
  layout: {
    frontAnchorStitch: ODEGAARD_FRONT_STITCH,
    frontTheta: 0.85,
    workingFlipZOnly: true,
  },
  defaults: { hookMm: 4.0, sizeId: 'dame' },
};
