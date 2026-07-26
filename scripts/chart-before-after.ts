/**
 * Renders the ideal chart vs the fabric-calibrated chart side by side
 * so the user can judge legibility. Writes /tmp/chart-compare.html.
 */
import { writeFileSync } from 'node:fs';
import { CHART_GRID, CHART_ROWS, CHART_COLS } from '../src/data/chart';

// Reconstruct the ORIGINAL ideal grid (before any fabric calibration).
const LETTERS: Record<string, string[]> = {
  R: ['XXXXXX.','XX...XX','XX...XX','XX...XX','XXXXXX.','XX.XX..','XX..XX.','XX..XX.','XX...XX','XX...XX'],
  O: ['.XXXXX.','XX...XX','XX...XX','XX...XX','XX...XX','XX...XX','XX...XX','XX...XX','XX...XX','.XXXXX.'],
  B: ['XXXXXX.','XX...XX','XX...XX','XX...XX','XXXXXX.','XX...XX','XX...XX','XX...XX','XX...XX','XXXXXX.'],
};
const LETTER_W = 7;
const slantOffset = (rowFromTop: number) => Math.floor((9 - rowFromTop) / 4);
const LETTER_SPAN = LETTER_W + slantOffset(0);
const WORDS = ['RO', 'BO', 'RO'] as const;

function buildIdeal(): boolean[][] {
  const grid: boolean[][] = Array.from({ length: CHART_ROWS }, () => Array<boolean>(CHART_COLS).fill(false));
  const starts = [0, 27, 54];
  WORDS.forEach((word, w) => {
    let x = starts[w];
    for (const ch of word) {
      const bitmap = LETTERS[ch];
      for (let rowTop = 0; rowTop < CHART_ROWS; rowTop++) {
        const off = slantOffset(rowTop);
        for (let c = 0; c < LETTER_W; c++) {
          if (bitmap[rowTop][c] === 'X') grid[rowTop][(x + off + c) % CHART_COLS] = true;
        }
      }
      x += LETTER_SPAN + 1;
    }
  });
  return grid;
}

const CELL = 13;
function panel(title: string, sub: string, grid: boolean[][]): string {
  let cells = '';
  for (let r = 0; r < CHART_ROWS; r++) {
    for (let c = 0; c < CHART_COLS; c++) {
      cells += `<rect x="${c * CELL + 26}" y="${r * CELL + 8}" width="${CELL - 1}" height="${CELL - 1}" fill="${grid[r][c] ? '#B3122E' : '#F2E9D8'}"/>`;
    }
    cells += `<text x="20" y="${r * CELL + 8 + CELL * 0.75}" font-size="9" text-anchor="end" fill="#777">${r + 1}</text>`;
  }
  const w = CHART_COLS * CELL + 34;
  const h = CHART_ROWS * CELL + 16;
  return `<h2>${title}</h2><p>${sub}</p><svg width="${w}" height="${h}">${cells}</svg>`;
}

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
body { font-family: -apple-system, sans-serif; background: #fff; padding: 18px; }
h2 { font-size: 15px; margin: 14px 0 2px; }
p { font-size: 11.5px; color: #666; margin: 0 0 6px; }
</style></head><body>
${panel('FØR: det ideelle diagrammet (slik det opprinnelig var tegnet)', 'Sett utenfra på ferdig hatt. Jevne mellomrom mellom ordene.', buildIdeal())}
${panel('ETTER: kalibrert til hatten din (slik den faktisk blir)', 'BO og siste RO flyttet noen masker (usynlig på rund hatt), og siste ords rad 5–10 ligger én maske forskjøvet.', CHART_GRID)}
</body></html>`;
writeFileSync('/tmp/chart-compare.html', html);
console.log('wrote /tmp/chart-compare.html');
