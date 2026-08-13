import { derivePattern } from '../src/patterns/buildFromDefinition';
import { getPattern } from '../src/patterns/registry';
import { textPlacements } from '../src/data/layerGeometry';
import type { TextLayer } from '../src/data/chartLayers';

const def = getPattern('norway26' as any);
const d = derivePattern(def);
const tl = def.chartLayers.find((l) => l.kind === 'text') as TextLayer;
const cols = d.chart.cols;
const letterCells = new Set<string>();
for (const p of textPlacements(tl, cols)) {
  p.mask.forEach((row, r) => row.forEach((on, c) => {
    if (!on) return; const rr = p.row + r; let cc = (p.col + c) % cols; if (cc < 0) cc += cols;
    if (rr >= 0 && rr < d.chart.rows) letterCells.add(`${rr},${cc}`);
  }));
}
const clearance = 1;
d.chart.grid.forEach((row, r) => row.forEach((v, c) => {
  if (v === def.background || letterCells.has(`${r},${c}`)) return;
  for (let dr = -clearance; dr <= clearance; dr++)
    for (let dc = -clearance; dc <= clearance; dc++) {
      let cc = (c + dc) % cols; if (cc < 0) cc += cols;
      if (letterCells.has(`${r + dr},${cc}`)) { console.log(`intruder r${r} c${c} = ${v}  (near letter r${r+dr} c${cc})`); return; }
    }
}));
console.log('placements:', textPlacements(tl, cols).map((p) => p.col).join(', '));
