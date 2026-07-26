/** Shows the calibrated chart normally and rotated 180° (working position). */
import { writeFileSync } from 'node:fs';
import { CHART_GRID, CHART_ROWS, CHART_COLS } from '../src/data/chart';

const CELL = 13;
function panel(title: string, sub: string, rotate: boolean, dimAfterRow: number | null): string {
  let cells = '';
  for (let r = 0; r < CHART_ROWS; r++) {
    for (let c = 0; c < CHART_COLS; c++) {
      const rr = rotate ? CHART_ROWS - 1 - r : r;
      const cc = rotate ? CHART_COLS - 1 - c : c;
      const red = CHART_GRID[rr][cc];
      const dim = dimAfterRow !== null && rr >= dimAfterRow;
      const fill = red ? (dim ? '#E4B6BE' : '#B3122E') : dim ? '#FAF6EE' : '#F2E9D8';
      cells += `<rect x="${c * CELL + 8}" y="${r * CELL + 8}" width="${CELL - 1}" height="${CELL - 1}" fill="${fill}"/>`;
    }
  }
  const w = CHART_COLS * CELL + 16;
  const h = CHART_ROWS * CELL + 16;
  return `<h2>${title}</h2><p>${sub}</p><svg width="${w}" height="${h}">${cells}</svg>`;
}

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
body { font-family: -apple-system, sans-serif; background: #fff; padding: 16px; }
h2 { font-size: 15px; margin: 12px 0 2px; }
p { font-size: 11.5px; color: #666; margin: 0 0 5px; }
</style></head><body>
${panel('SLIK BLIR HATTEN: pullen (toppen) OPP, sett rett forfra utenfra', 'Bleke ruter = rad 8–10 som du ikke har heklet ennå.', false, 7)}
${panel('SLIK SER DU DEN NÅ: arbeidsstilling, åpningen opp / pullen ned (rotert 180°)', 'Samme masker! Leser som «OR OB OR» med kursiv motsatt vei — det er dette du ser.', true, 7)}
</body></html>`;
writeFileSync('/tmp/chart-rotate.html', html);
console.log('ok');
