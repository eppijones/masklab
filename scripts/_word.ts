import { getPattern } from '../src/patterns/registry';
import { textPiece, textGlyphPieces } from '../src/data/layerGeometry';
import type { TextLayer } from '../src/data/chartLayers';
import { getFont } from '../src/data/fonts/registry';
import { rasterizeUpright } from '../src/data/rasterizeText';

const def = getPattern('norway26' as any);
const tl = def.chartLayers.find((l) => l.kind === 'text') as TextLayer;
console.log('--- upright master run (letterSpacing 2) ---');
const up = rasterizeUpright('NORGE', getFont('norge26'), { letterSpacing: 2 });
up.forEach((r, i) => console.log(String(i).padStart(2), r.map(v => v ? '█' : '·').join('')));
console.log('width', up[0].length);
console.log('--- placed piece (slant 24 + rise) ---');
const p = textPiece(tl);
p.mask.forEach((r, i) => console.log(String(i).padStart(2), r.map(v => v ? '█' : '·').join('')));
console.log('width', p.mask[0].length, 'height', p.mask.length);
