import { derivePattern } from '../src/patterns/buildFromDefinition';
import { getPattern } from '../src/patterns/registry';
import { textPlacements, textPiece, placementBox } from '../src/data/layerGeometry';
import { keepOutMetrics } from '../src/data/textKeepOut';
import type { TextLayer } from '../src/data/chartLayers';

const ids = ['norway26','norway26-white','norway26-black','norway26-training','norway26-keeper'] as const;
for (const id of ids) {
  const def = getPattern(id as any);
  const d = derivePattern(def);
  const tl = def.chartLayers.find((l) => l.kind === 'text') as TextLayer;
  const piece = textPiece(tl);
  const ps = textPlacements(tl, d.bodyCount);
  const boxes = ps.map(placementBox);
  const m = keepOutMetrics(tl, d.bodyCount, { margin: 1, rowMargin: 2 });
  console.log(id, 'body', d.bodyCount, 'rows', d.bandRows,
    '| block', (piece.mask[0]?.length ?? 0) + 'x' + piece.mask.length,
    '| ink', boxes[0]!.width, `(${(boxes[0]!.width/d.bodyCount*100).toFixed(0)}%)`,
    'rows', boxes[0]!.row0 + '..' + boxes[0]!.row1,
    '| panel', m.width, 'corridor', m.corridor);
}
