import type { FontSpec } from './types';

/**
 * «Lyn» — the heavy italic sports script from the NORWAY'26 kit photography.
 *
 * A 6×7 cell with two-stitch strokes and two-stitch counters, so stroke and
 * hole carry equal weight and the word does not close up into a picket fence
 * at crochet resolution. Seven rows is the floor: at six, arms and counters
 * have to share a row and the letters mush together at crochet resolution —
 * compare ØDEGAARD on the Martin hat, which reads cleanly because it gets ten.
 * On a 12-row wall seven rows plus the climb still leaves a clear band above
 * the brim, the way the lettering sits on the shirts.
 *
 * The masters are upright — every bit of the italic is applied downstream:
 *   · `rasterizeText` shears by `defaultSlantDeg`, which leans each letter;
 *   · the layer's `rise` walks the whole baseline upward as it runs right.
 * Both are needed. At 16° over seven rows the shear is barely two columns and the
 * letters read as uprights; 26° gives three, which is a real lean. This is the
 * same trick «Kursiv» plays on its 5×7 masters.
 *
 * Widths vary per glyph (M/W get 7 columns, E and I fewer than 6);
 * `rasterizeText` measures each glyph from its own row length, so narrow
 * letters take less room.
 *
 * Set it with letterSpacing ≥ 1. Several glyphs carry a full-width bar on a
 * terminal row, so at zero spacing neighbouring letters fuse into a slab.
 */
const G: Record<string, string[]> = {
  A: ['..XX..', '.XXXX.', 'XX..XX', 'XX..XX', 'XXXXXX', 'XX..XX', 'XX..XX'],
  B: ['XXXXX.', 'XX..XX', 'XX..XX', 'XXXXX.', 'XX..XX', 'XX..XX', 'XXXXX.'],
  C: ['.XXXX.', 'XX..XX', 'XX....', 'XX....', 'XX....', 'XX..XX', '.XXXX.'],
  D: ['XXXXX.', 'XX..XX', 'XX..XX', 'XX..XX', 'XX..XX', 'XX..XX', 'XXXXX.'],
  E: ['XXXXX', 'XX...', 'XX...', 'XXXX.', 'XX...', 'XX...', 'XXXXX'],
  F: ['XXXXX', 'XX...', 'XX...', 'XXXX.', 'XX...', 'XX...', 'XX...'],
  G: ['.XXXX.', 'XX..XX', 'XX....', 'XX.XXX', 'XX..XX', 'XX..XX', '.XXXX.'],
  H: ['XX..XX', 'XX..XX', 'XX..XX', 'XXXXXX', 'XX..XX', 'XX..XX', 'XX..XX'],
  I: ['XXXX', '.XX.', '.XX.', '.XX.', '.XX.', '.XX.', 'XXXX'],
  J: ['..XXXX', '....XX', '....XX', '....XX', '....XX', 'XX..XX', '.XXXX.'],
  K: ['XX..XX', 'XX.XX.', 'XXXX..', 'XXX...', 'XXXX..', 'XX.XX.', 'XX..XX'],
  L: ['XX...', 'XX...', 'XX...', 'XX...', 'XX...', 'XX...', 'XXXXX'],
  M: ['XX...XX', 'XXX.XXX', 'XXXXXXX', 'XX.X.XX', 'XX...XX', 'XX...XX', 'XX...XX'],
  N: ['XX..XX', 'XXX.XX', 'XXX.XX', 'XXXXXX', 'XX.XXX', 'XX.XXX', 'XX..XX'],
  O: ['.XXXX.', 'XX..XX', 'XX..XX', 'XX..XX', 'XX..XX', 'XX..XX', '.XXXX.'],
  P: ['XXXXX.', 'XX..XX', 'XX..XX', 'XXXXX.', 'XX....', 'XX....', 'XX....'],
  Q: ['.XXXX.', 'XX..XX', 'XX..XX', 'XX..XX', 'XX.XXX', 'XX..XX', '.XXXXX'],
  R: ['XXXXX.', 'XX..XX', 'XX..XX', 'XXXXX.', 'XX.XX.', 'XX..XX', 'XX..XX'],
  S: ['.XXXXX', 'XX....', 'XX....', '.XXXX.', '....XX', '....XX', 'XXXXX.'],
  T: ['XXXXXX', '..XX..', '..XX..', '..XX..', '..XX..', '..XX..', '..XX..'],
  U: ['XX..XX', 'XX..XX', 'XX..XX', 'XX..XX', 'XX..XX', 'XX..XX', '.XXXX.'],
  V: ['XX..XX', 'XX..XX', 'XX..XX', 'XX..XX', '.XXXX.', '.XXXX.', '..XX..'],
  W: ['XX...XX', 'XX...XX', 'XX...XX', 'XX.X.XX', 'XXXXXXX', 'XXXXXXX', '.XX.XX.'],
  X: ['XX..XX', 'XX..XX', '.XXXX.', '..XX..', '.XXXX.', 'XX..XX', 'XX..XX'],
  Y: ['XX..XX', 'XX..XX', '.XXXX.', '..XX..', '..XX..', '..XX..', '..XX..'],
  Z: ['XXXXXX', '....XX', '...XX.', '..XX..', '.XX...', 'XX....', 'XXXXXX'],
  'Æ': ['..XXXXX', '.XX.XX.', 'XX..XX.', 'XX..XXX', 'XXXXXX.', 'XX..XX.', 'XX..XXX'],
  'Ø': ['.XXXXX', 'XX.XXX', 'XX.XXX', 'XXXXXX', 'XXX.XX', 'XXX.XX', 'XXXXX.'],
  'Å': ['.XXXX.', '..XX..', '.XXXX.', 'XX..XX', 'XXXXXX', 'XX..XX', 'XX..XX'],
  '0': ['.XXXX.', 'XX..XX', 'XX..XX', 'XX..XX', 'XX..XX', 'XX..XX', '.XXXX.'],
  '1': ['.XX..', 'XXX..', '.XX..', '.XX..', '.XX..', '.XX..', 'XXXXX'],
  '2': ['.XXXX.', 'XX..XX', '...XX.', '..XX..', '.XX...', 'XX....', 'XXXXXX'],
  '3': ['XXXXX.', '....XX', '..XXX.', '..XXX.', '....XX', 'XX..XX', 'XXXXX.'],
  '4': ['...XX.', '..XXX.', '.XX.XX', 'XX..XX', 'XXXXXX', '...XX.', '...XX.'],
  '5': ['XXXXXX', 'XX....', 'XXXXX.', '....XX', '....XX', 'XX..XX', 'XXXXX.'],
  '6': ['.XXXX.', 'XX....', 'XXXXX.', 'XX..XX', 'XX..XX', 'XX..XX', '.XXXX.'],
  '7': ['XXXXXX', '....XX', '...XX.', '...XX.', '..XX..', '..XX..', '..XX..'],
  '8': ['.XXXX.', 'XX..XX', 'XX..XX', '.XXXX.', 'XX..XX', 'XX..XX', '.XXXX.'],
  '9': ['.XXXX.', 'XX..XX', 'XX..XX', '.XXXXX', '....XX', 'XX..XX', '.XXXX.'],
  "'": ['XX', 'XX', 'XX', '..', '..', '..', '..'],
  '-': ['....', '....', '....', 'XXXX', 'XXXX', '....', '....'],
  ' ': ['...', '...', '...', '...', '...', '...', '...'],
};

export const FONT_LYN: FontSpec = {
  id: 'lyn',
  cell: { w: 6, h: 7 },
  /** Three columns of lean across seven rows — a real sports italic. */
  defaultSlantDeg: 26,
  glyphs: G,
};
