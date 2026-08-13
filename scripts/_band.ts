import { derivePattern } from '../src/patterns/buildFromDefinition';
import { getPattern } from '../src/patterns/registry';
import { textPlacements } from '../src/data/layerGeometry';
import type { TextLayer } from '../src/data/chartLayers';

const CH: Record<string,string> = { blue:'b', white:'w', red:'r', lightblue:'l', black:'k', yellow:'y', gold:'g', orange:'o', pink:'p', cream:'c', slate:'s', stone:'n' };
const id = (process.argv[2] ?? 'norway26') as any;
const def = getPattern(id);
const d = derivePattern(def);
const tl = def.chartLayers.find((l) => l.kind === 'text') as TextLayer;
const letter = new Set<string>();
for (const p of textPlacements(tl, d.bodyCount)) {
  p.mask.forEach((row, r) => row.forEach((on, c) => { if (!on) return; const rr = p.row + r; let cc = (p.col + c) % d.bodyCount; if (cc<0) cc+=d.bodyCount; letter.add(`${rr},${cc}`); }));
}
const off = Number(process.argv[3] ?? 89);
console.log(`${id} — wall band rotated to col ${off}; █ = wordmark ink`);
let ruler = '   ';
for (let k = 0; k < d.bodyCount; k++) ruler += (k % 10 === 0 ? String((k/10)%10) : '·');
console.log(ruler);
for (let r = 0; r < d.bandRows; r++) {
  let line = '';
  for (let k = 0; k < d.bodyCount; k++) {
    const c = (k + off) % d.bodyCount;
    line += letter.has(`${r},${c}`) ? '█' : (CH[d.chart.grid[r][c]] ?? '?');
  }
  console.log(String(r).padStart(2) + ' ' + line);
}
