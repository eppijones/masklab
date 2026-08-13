import { derivePattern } from '../src/patterns/buildFromDefinition';
import { getPattern, listPatterns } from '../src/patterns/registry';
import { textPlacements } from '../src/data/layerGeometry';
import { keepOutFromTextPlacement, keepOutMetrics } from '../src/data/textKeepOut';
import { keepOutZoneFromParams, inKeepOutZone } from '../src/data/motifs';
import type { TextLayer } from '../src/data/chartLayers';

for (const def of listPatterns().filter((p) => p.id.startsWith('norway26'))) {
  const d = derivePattern(def);
  const tl = def.chartLayers.find((l) => l.kind === 'text') as TextLayer;
  const cols = d.bodyCount;
  const params = keepOutFromTextPlacement(tl, { margin: 1, rowMargin: 2 });
  const zone = keepOutZoneFromParams(params as any);
  const m = keepOutMetrics(tl, cols, { margin: 1, rowMargin: 2 });

  // Cells inside a protected panel that are neither text colour nor ground.
  let bad = 0; const samples: string[] = [];
  let panelCells = 0, corridorCells = 0, corridorInk = 0;
  const letter = new Set<string>();
  for (const p of textPlacements(tl, cols)) {
    p.mask.forEach((row, r) => row.forEach((on, c) => {
      if (!on) return; const rr = p.row + r; let cc = (p.col + c) % cols; if (cc < 0) cc += cols;
      letter.add(`${rr},${cc}`);
    }));
  }
  let letterWrong = 0;
  for (let r = 0; r < d.bandRows; r++) {
    for (let c = 0; c < cols; c++) {
      const v = d.chart.grid[r][c];
      const inPanel = inKeepOutZone(zone, cols, r, c);
      if (inPanel) {
        panelCells++;
        if (letter.has(`${r},${c}`)) { if (v !== tl.colorId) letterWrong++; }
        else if (v !== def.background) { bad++; if (samples.length < 6) samples.push(`r${r}c${c}=${v}`); }
      } else {
        corridorCells++;
        if (v !== def.background) corridorInk++;
      }
    }
  }
  console.log(
    `${def.id.padEnd(20)} panel ${m.width} corridor ${m.corridor} | panelCells ${panelCells} intruders ${bad} letterWrong ${letterWrong} | corridor ink ${corridorInk}/${corridorCells} (${(corridorInk/corridorCells*100).toFixed(0)}%)`,
    samples.length ? samples.join(' ') : '');
}
