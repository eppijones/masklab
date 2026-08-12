/**
 * Wordmark proof sheet.
 *
 * Renders the NORGE band exactly as `derivePattern` composites it — same
 * shear, same contour, same twelve rows of wall — for each face given on the
 * command line, and writes one SVG per face plus a stacked comparison.
 *
 *   npx tsx scripts/shot-wordmark.ts [outDir] [fontId ...]
 *
 * There is no browser and no dev server involved: this reads the chart data
 * straight out of the pattern layer, so what you see is what gets crocheted.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { derivePattern } from '../src/patterns/buildFromDefinition';
import { getPattern } from '../src/patterns/registry';
import type { ChartLayer, TextLayer } from '../src/data/chartLayers';
import type { FontId } from '../src/data/fonts/registry';
import { YARN_HEX, type YarnColor } from '../src/data/types';

const outDir = process.argv[2] ?? '/tmp/norge-wordmark';
const fontIds = (process.argv.slice(3).length > 0
  ? process.argv.slice(3)
  : ['runik', 'norge26']) as FontId[];

const CELL = 22;
const PAD = 14;

/** The band for one face, cropped to the first copy plus a little air. */
function bandFor(fontId: FontId): {
  grid: YarnColor[][];
  ground: YarnColor;
  ink: YarnColor;
  col0: number;
  width: number;
} {
  const base = getPattern('norway26');
  const wordmark = base.chartLayers.find(
    (l): l is TextLayer => l.kind === 'text',
  );
  if (!wordmark) throw new Error('norway26 has no text layer');

  // The new face is ten rows and sits flat; the old one is eight and climbs.
  const flat = fontId !== 'runik';
  const layer: ChartLayer = {
    ...wordmark,
    fontId,
    // One copy, parked mid-band, so the crop below can't straddle the seam.
    repeat: 1,
    centerFrac: 0.5,
    ...(flat ? { rise: 0, anchor: { row: 1, col: 0 } } : {}),
  };
  const d = derivePattern({ ...base, chartLayers: [layer] });
  const grid = d.chart.grid;
  const ink = wordmark.colorId;

  // Crop to the inked columns of the first copy, with two stitches of air.
  let lo = Infinity;
  let hi = -Infinity;
  for (const row of grid) {
    for (let c = 0; c < d.bodyCount; c++) {
      if (row[c] !== base.background) {
        lo = Math.min(lo, c);
        hi = Math.max(hi, c);
      }
    }
  }
  const col0 = Math.max(0, lo - 2);
  return {
    grid,
    ground: base.background,
    ink,
    col0,
    width: Math.min(d.bodyCount - col0, hi - col0 + 3),
  };
}

function svgFor(fontId: FontId): { svg: string; rows: number; cols: number } {
  const { grid, col0, width } = bandFor(fontId);
  const rows = grid.length;
  const w = width * CELL + PAD * 2;
  const h = rows * CELL + PAD * 2 + 26;
  const cells: string[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < width; c++) {
      const yarn = grid[r][col0 + c];
      cells.push(
        `<rect x="${PAD + c * CELL}" y="${PAD + r * CELL}" width="${CELL}" height="${CELL}" fill="${YARN_HEX[yarn]}" stroke="#00000022" stroke-width="1"/>`,
      );
    }
  }
  const label = `${fontId} — ${rows} rader × ${width} masker`;
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`,
    `<rect width="${w}" height="${h}" fill="#EFE9DE"/>`,
    ...cells,
    `<text x="${PAD}" y="${h - PAD}" font-family="ui-monospace,monospace" font-size="14" fill="#3A342B">${label}</text>`,
    `</svg>`,
  ].join('\n');
  return { svg, rows, cols: width };
}

mkdirSync(outDir, { recursive: true });

const parts: { fontId: FontId; svg: string; w: number; h: number }[] = [];
for (const fontId of fontIds) {
  const { svg, rows, cols } = svgFor(fontId);
  const file = join(outDir, `wordmark-${fontId}.svg`);
  writeFileSync(file, svg);
  console.log(`${file}  (${rows} rader × ${cols} masker)`);
  parts.push({
    fontId,
    svg,
    w: cols * CELL + PAD * 2,
    h: rows * CELL + PAD * 2 + 26,
  });
}

// Stacked comparison, one face per row.
const totalW = Math.max(...parts.map((p) => p.w));
const totalH = parts.reduce((a, p) => a + p.h, 0);
let y = 0;
const stacked = [
  `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${totalH}" viewBox="0 0 ${totalW} ${totalH}">`,
  `<rect width="${totalW}" height="${totalH}" fill="#EFE9DE"/>`,
];
for (const p of parts) {
  const inner = p.svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
  stacked.push(`<g transform="translate(0 ${y})">${inner}</g>`);
  y += p.h;
}
stacked.push('</svg>');
const cmp = join(outDir, 'wordmark-compare.svg');
writeFileSync(cmp, stacked.join('\n'));
console.log(cmp);
