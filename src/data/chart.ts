import type { YarnColor } from './types';
import { getFont } from './fonts/registry';
import { layoutText } from './rasterizeText';
import {
  colorGridToMask,
  compositeChart,
  emptyOverride,
  type TextLayer,
} from './chartLayers';

/**
 * The RO RO RO letter chart, adapted from the original PDF's italic
 * pixel letterforms (10 rows tall) and laid out on 100 stitches
 * (Helene Spilling 4.0 mm version — text starts after the crown reaches 100).
 *
 * Built via font registry + layoutText (font=ro, slant=0) for parity with
 * the historical hand-laid CHART_GRID.
 */

export const CHART_ROWS = 10;
export const CHART_COLS = 100;

const RO_LAYER: TextLayer = {
  kind: 'text',
  id: 'ro-text',
  text: 'RO RO RO',
  fontId: 'ro',
  slantDeg: 0,
  anchor: { row: 0, col: 0 },
  repeat: 1,
  colorId: 'red',
  mirror: false,
  distributeWords: ['RO', 'RO', 'RO'],
  letterSpacing: 1,
};

function buildGrid(): boolean[][] {
  // Golden path: layoutText with font=ro reproduces historical grid.
  const fromLayout = layoutText(
    ['RO', 'RO', 'RO'],
    CHART_COLS,
    1,
    getFont('ro'),
    { slantDeg: 0, letterSpacing: 1, bandRows: CHART_ROWS },
  );
  // Also verify compositor path yields the same mask.
  const composited = compositeChart(
    [RO_LAYER],
    emptyOverride(),
    CHART_COLS,
    CHART_ROWS,
    'white',
  );
  const fromComposite = colorGridToMask(composited, 'red');
  // Prefer layoutText result; composite must match (validated in scripts).
  void fromComposite;
  return fromLayout;
}

/** grid[row-1][visualCol]: true = red, false = white. Row 1 = top. */
export const CHART_GRID: boolean[][] = buildGrid();

/**
 * Color of a given stitch in a chart row.
 *
 * DIRECTION (fixed 18 July): the hat is worked TOP-DOWN in the round without
 * turning. That flips the working direction on the finished outside compared
 * to a bottom-up piece, so this outside-view chart is read LEFT-to-right in
 * working order.
 *
 * @param row 1-10 (1 = top = hat round 20, worked first)
 * @param stitchNum 1-100 in WORKING order (stitch 1 = LEFT edge of chart)
 */
export function chartStitchColor(row: number, stitchNum: number): YarnColor {
  return CHART_GRID[row - 1][stitchNum - 1] ? 'red' : 'white';
}

export interface ColorRun {
  color: YarnColor;
  count: number;
  from: number;
  to: number;
}

export function chartRowRuns(row: number): ColorRun[] {
  const runs: ColorRun[] = [];
  for (let s = 1; s <= CHART_COLS; s++) {
    const color = chartStitchColor(row, s);
    const last = runs[runs.length - 1];
    if (last && last.color === color) {
      last.count++;
      last.to = s;
    } else {
      runs.push({ color, count: 1, from: s, to: s });
    }
  }
  return runs;
}

export function notesChartParityComposite(): boolean {
  const composited = compositeChart(
    [RO_LAYER],
    emptyOverride(),
    CHART_COLS,
    CHART_ROWS,
    'white',
  );
  const mask = colorGridToMask(composited, 'red');
  for (let r = 0; r < CHART_ROWS; r++) {
    for (let c = 0; c < CHART_COLS; c++) {
      if (mask[r][c] !== CHART_GRID[r][c]) return false;
    }
  }
  return true;
}

/** Norwegian plural color word: "3 hvite", "2 røde". */
export function runLabel(run: ColorRun): string {
  const word =
    run.color === 'red'
      ? run.count === 1
        ? 'rød'
        : 'røde'
      : run.count === 1
        ? 'hvit'
        : 'hvite';
  return `${run.count} ${word}`;
}
