import type { PatternDefinition } from './types';
import { YARN_HEX, YARN_NAME } from '../data/types';
import { emptyOverride } from '../data/chartLayers';

export const RO_RO_RO: PatternDefinition = {
  id: 'ro-ro-ro',
  version: 1,
  title: 'RO RO RO',
  titleNo: 'RO RO RO',
  palette: (['white', 'red', 'blue'] as const).map((id) => ({
    id,
    hex: YARN_HEX[id],
    nameNo: YARN_NAME[id],
  })),
  bandRows: 10,
  background: 'white',
  chartLayers: [
    {
      kind: 'text',
      id: 'ro-text',
      text: 'RO RO RO',
      fontId: 'ro',
      slantDeg: 0,
      anchor: { row: 0, col: 0 },
      repeat: 1,
      colorId: 'red',
      mirror: false,
      distributeWords: ['RO', 'RO', 'RO'],
      letterSpacing: 1,
    },
  ],
  chartOverride: emptyOverride(),
  includeWave: true,
  finalBrim: { color: 'blue' },
  layout: {
    frontAnchorStitch: 10,
    frontTheta: 0.85,
    workingFlipZOnly: true,
  },
  defaults: { hookMm: 4.0, sizeId: 'dame' },
};
