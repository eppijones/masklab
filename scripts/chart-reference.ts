/**
 * Dev helper: renders the RO RO RO chart as an HTML page (two orientations)
 * so it can be screenshotted and compared against photos of the real work.
 * Usage: npx tsx scripts/chart-reference.ts [rowsDone]
 */
import { writeFileSync } from 'node:fs';
import { CHART_GRID, CHART_ROWS, CHART_COLS } from '../src/data/chart';

const rowsDone = Number(process.argv[2] ?? 6);
const CELL = 16;

const RED = '#b3122e';
const CREAM = '#f2e9d8';
const DIM_RED = '#e0b7bd';
const DIM_CREAM = '#faf6ee';

function panel(title: string, rows: number[], rotate180: boolean, dimAfter: number | null): string {
  let cells = '';
  const rowList = rotate180 ? [...rows].reverse() : rows;
  rowList.forEach((r, ri) => {
    const cols = Array.from({ length: CHART_COLS }, (_, c) => c);
    const colList = rotate180 ? [...cols].reverse() : cols;
    colList.forEach((c, ci) => {
      const red = CHART_GRID[r][c];
      const dim = dimAfter !== null && r >= dimAfter;
      const fill = red ? (dim ? DIM_RED : RED) : dim ? DIM_CREAM : CREAM;
      cells += `<rect x="${ci * CELL + 30}" y="${ri * CELL + 10}" width="${CELL - 1}" height="${CELL - 1}" fill="${fill}" />`;
    });
    cells += `<text x="24" y="${ri * CELL + 10 + CELL * 0.72}" font-size="10" text-anchor="end" fill="#666">${r + 1}</text>`;
  });
  const w = CHART_COLS * CELL + 40;
  const h = rowList.length * CELL + 20;
  return `<h2>${title}</h2><svg width="${w}" height="${h}">${cells}</svg>`;
}

const allRows = Array.from({ length: CHART_ROWS }, (_, i) => i);
const doneRows = allRows.slice(0, rowsDone);

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
body { font-family: -apple-system, sans-serif; background: #fff; padding: 20px; }
h2 { font-size: 15px; margin: 18px 0 4px; }
p { font-size: 12px; color: #555; margin: 2px 0 8px; }
</style></head><body>
${panel(`FASIT: hele diagrammet sett UTENFRA på ferdig hatt (rad 1–10, rad ${rowsDone + 1}–10 nedtonet = ikke heklet ennå)`, allRows, false, rowsDone)}
<p>Rad 1 = runde 14 (øverst, nærmest pullen). Du hekler fra høyre mot venstre.</p>
${panel(`SLIK SKAL DE ${rowsDone} FERDIGE RADENE SE UT I HENDENE DINE NÅ (arbeidet holdt med pullen ned = snudd 180°)`, doneRows, true, null)}
<p>Dette er samme masker som over, bare rotert 180° — sånn ser stoffet ut mens du jobber.</p>
</body></html>`;

writeFileSync('/tmp/chart-reference.html', html);
console.log('wrote /tmp/chart-reference.html');
