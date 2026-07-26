import type { YarnColor } from './types';

/**
 * The RO RO RO letter chart, adapted from the original PDF's italic
 * pixel letterforms (10 rows tall) and laid out on 100 stitches
 * (Helene Spilling 4.0 mm version — text starts after the crown reaches 100).
 *
 * Conventions:
 * - The chart shows the OUTSIDE of the finished hat (worn upright), exactly
 *   as the world sees it.
 * - 10 rows. Row 1 is the TOP chart row (= hat round 20): the hat is
 *   crocheted from the crown downwards, so you work the chart from the
 *   top row down to row 10 (= hat round 29).
 * - Working order: stitch 1 = LEFT edge of the chart, read towards the
 *   right. (Top-down right-handed crochet without turning advances
 *   left-to-right on the finished outside; in your hands the work moves
 *   to the left — same thing, since the piece is upside down while worked.)
 */

export const CHART_ROWS = 10;
export const CHART_COLS = 100;

/** Letter bitmaps, rows listed top -> bottom, 7 columns wide. */
const LETTERS: Record<string, string[]> = {
  R: [
    'XXXXXX.',
    'XX...XX',
    'XX...XX',
    'XX...XX',
    'XXXXXX.',
    'XX.XX..',
    'XX..XX.',
    'XX..XX.',
    'XX...XX',
    'XX...XX',
  ],
  O: [
    '.XXXXX.',
    'XX...XX',
    'XX...XX',
    'XX...XX',
    'XX...XX',
    'XX...XX',
    'XX...XX',
    'XX...XX',
    'XX...XX',
    '.XXXXX.',
  ],
};

const LETTER_W = 7;
/** Italic slant: how far right each row is shifted (top rows lean right). */
const slantOffset = (rowFromTop: number) => Math.floor((9 - rowFromTop) / 4);
const MAX_SLANT = slantOffset(0); // 2
/** Effective letter width including slant. */
const LETTER_SPAN = LETTER_W + MAX_SLANT; // 9
const LETTER_GAP = 1;

const WORDS = ['RO', 'RO', 'RO'] as const;
// Three words of 19 = 57 stitches; 43 remaining, split into gaps of 14/14/15
// (the 15 is the wrap-around gap between the last O and the first R).
const WORD_STARTS = [0, 33, 66];

function buildGrid(): boolean[][] {
  const grid: boolean[][] = Array.from({ length: CHART_ROWS }, () =>
    Array<boolean>(CHART_COLS).fill(false),
  );
  WORDS.forEach((word, w) => {
    let x = WORD_STARTS[w];
    for (const ch of word) {
      const bitmap = LETTERS[ch];
      for (let rowTop = 0; rowTop < CHART_ROWS; rowTop++) {
        const off = slantOffset(rowTop);
        const line = bitmap[rowTop];
        for (let c = 0; c < LETTER_W; c++) {
          if (line[c] === 'X') {
            const col = x + off + c;
            // chart row 1 (index 0) is the TOP = first row worked
            grid[rowTop][col % CHART_COLS] = true;
          }
        }
      }
      x += LETTER_SPAN + LETTER_GAP;
    }
  });
  return grid;
}

/** grid[row-1][visualCol]: true = red, false = white. Row 1 = top. */
export const CHART_GRID: boolean[][] = buildGrid();

/**
 * Color of a given stitch in a chart row.
 *
 * DIRECTION (fixed 18 July): the hat is worked TOP-DOWN in the round without
 * turning. That flips the working direction on the finished outside compared
 * to a bottom-up piece, so this outside-view chart is read LEFT-to-right in
 * working order. (Equivalent to Helene's own instruction: right-handers read
 * her printed working-view chart from the RIGHT — her chart is the mirror of
 * this outside view.)
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
  /** 1-based stitch number where the run starts (working order). */
  from: number;
  /** 1-based stitch number where the run ends (inclusive). */
  to: number;
}

/** Run-length instruction for one chart row, in working order (stitch 1..100). */
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
