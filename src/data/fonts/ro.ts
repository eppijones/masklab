import type { FontSpec } from './types';

/** Exact 7×10 R/O bitmaps from the original chart.ts (Helene RO RO RO). */
export const FONT_RO: FontSpec = {
  id: 'ro',
  cell: { w: 7, h: 10 },
  defaultSlantDeg: 0,
  glyphs: {
    R: [
      'XXXXXX.',
      'XX...XX',
      'XX...XX',
      'XX...XX',
      'XXXXXX.',
      'XX.XX..',
      'XX..XX.',
      'XX..XX.',
      'XX...XX',
      'XX...XX',
    ],
    O: [
      '.XXXXX.',
      'XX...XX',
      'XX...XX',
      'XX...XX',
      'XX...XX',
      'XX...XX',
      'XX...XX',
      'XX...XX',
      'XX...XX',
      '.XXXXX.',
    ],
    ' ': [
      '.......',
      '.......',
      '.......',
      '.......',
      '.......',
      '.......',
      '.......',
      '.......',
      '.......',
      '.......',
    ],
  },
};
