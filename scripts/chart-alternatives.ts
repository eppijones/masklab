/**
 * Three alternatives for rows 7-10 of the LAST word (rounds 20-23),
 * with rows 1-6 locked to the fabric. Writes /tmp/chart-alts.html.
 */
import { writeFileSync } from 'node:fs';

const LETTERS: Record<string, string[]> = {
  R: ['XXXXXX.','XX...XX','XX...XX','XX...XX','XXXXXX.','XX.XX..','XX..XX.','XX..XX.','XX...XX','XX...XX'],
  O: ['.XXXXX.','XX...XX','XX...XX','XX...XX','XX...XX','XX...XX','XX...XX','XX...XX','XX...XX','.XXXXX.'],
  B: ['XXXXXX.','XX...XX','XX...XX','XX...XX','XXXXXX.','XX...XX','XX...XX','XX...XX','XX...XX','XXXXXX.'],
};
const ROWS = 10, COLS = 80, LETTER_W = 7;
const slant = (r: number) => Math.floor((9 - r) / 4);
const SPAN = LETTER_W + slant(0);
const WORDS = ['RO', 'BO', 'RO'] as const;
const STARTS = [4, 31, 54];

/** extraShift: per-row extra offset for word 0 (the last word worked). */
function build(extraShift: number[]): boolean[][] {
  const grid: boolean[][] = Array.from({ length: ROWS }, () => Array<boolean>(COLS).fill(false));
  WORDS.forEach((word, w) => {
    let x = STARTS[w];
    for (const ch of word) {
      const bitmap = LETTERS[ch];
      for (let r = 0; r < ROWS; r++) {
        const off = slant(r) + (w === 0 ? extraShift[r] : 0);
        for (let c = 0; c < LETTER_W; c++) {
          if (bitmap[r][c] === 'X') grid[r][(x + off + c) % COLS] = true;
        }
      }
      x += SPAN + 1;
    }
  });
  return grid;
}

// Rows 1-6 locked: [0,0,0,0,1,1]. Rows 7-10 vary:
const ALT_A = [0,0,0,0,1,1,1,1,1,1]; // dagens: bunnen ett hakk inn
const ALT_B = [0,0,0,0,1,1,2,2,2,2]; // rett bunn: hele bunnhalvdelen på linje
const ALT_C = [0,0,0,0,1,1,1,1,0,0]; // mest kursiv: rad 9-10 skyves videre

const CELL = 13;
function panel(title: string, sub: string, grid: boolean[][], hi: boolean): string {
  let cells = '';
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      cells += `<rect x="${c * CELL + 26}" y="${r * CELL + 8}" width="${CELL - 1}" height="${CELL - 1}" fill="${grid[r][c] ? '#B3122E' : '#F2E9D8'}"/>`;
    }
    cells += `<text x="20" y="${r * CELL + 8 + CELL * 0.75}" font-size="9" text-anchor="end" fill="#777">${r + 1}</text>`;
  }
  const w = COLS * CELL + 34;
  const h = ROWS * CELL + 16;
  return `<div class="p ${hi ? 'hi' : ''}"><h2>${title}</h2><p>${sub}</p><svg width="${w}" height="${h}">${cells}</svg></div>`;
}

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
body { font-family: -apple-system, sans-serif; background: #fff; padding: 16px; }
h2 { font-size: 14.5px; margin: 0 0 2px; }
p { font-size: 11px; color: #666; margin: 0 0 5px; }
.p { margin-bottom: 14px; padding: 8px; border-radius: 8px; }
.hi { background: #EFF7F0; outline: 2px solid #2FBF56; }
</style></head><body>
${panel('ALTERNATIV A — dagens innstilling', 'Rad 7–10 ett hakk inn. O-en får to innsnevringer (8-tallslooken du så).', build(ALT_A), false)}
${panel('ALTERNATIV B — rett bunn (anbefalt)', 'Rad 7–10 på linje med rad 5–6. Bare den ene låste knekken ved rad 5 — O-en blir en ren O, R-beina står rett.', build(ALT_B), true)}
${panel('ALTERNATIV C — mest kursiv (ditt forslag)', 'Rad 9–10 skyves videre ut. Mer helning, men O-en får knekk både ved rad 7 og rad 9.', build(ALT_C), false)}
</body></html>`;
writeFileSync('/tmp/chart-alts.html', html);
console.log('wrote /tmp/chart-alts.html');
