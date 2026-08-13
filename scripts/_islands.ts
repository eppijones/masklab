import { derivePattern } from '../src/patterns/buildFromDefinition';
import { getPattern } from '../src/patterns/registry';
import { textPlacements } from '../src/data/layerGeometry';
import type { TextLayer } from '../src/data/chartLayers';

for (const id of ['norway26-training','norway26-keeper','norway26','norway26-white','norway26-black']) {
  const def = getPattern(id as any);
  const d = derivePattern(def);
  const cols = d.chart.cols, rows = d.chart.rows;
  const tl = def.chartLayers.find((l) => l.kind === 'text') as TextLayer;
  const letter = new Set<string>();
  for (const p of textPlacements(tl, cols)) p.mask.forEach((row,r)=>row.forEach((on,c)=>{ if(!on) return; const rr=p.row+r; let cc=(p.col+c)%cols; if(cc<0)cc+=cols; letter.add(`${rr},${cc}`); }));
  const out: string[] = [];
  for (let r=0;r<rows;r++) for (let c=0;c<cols;c++) {
    const v = d.chart.grid[r][c];
    if (v === def.background || letter.has(`${r},${c}`)) continue;
    const same = [[r-1,c],[r+1,c],[r,(c+1)%cols],[r,(c-1+cols)%cols]].some(([rr,cc])=>rr>=0&&rr<rows&&d.chart.grid[rr][cc]===v);
    if (!same) out.push(`r${r}c${c}=${v}`);
  }
  console.log(id.padEnd(20), out.length, out.join(' '));
}
