import type { FontSpec } from './types';

/**
 * «Taakeferd» — the MASKLAB take on the runic display face Nike drew for the
 * Norway 2026 kit. Elder Futhark energy on a 5×7 crochet grid: everything is
 * built from straight strokes and hard diagonals, counters come to points, the
 * O/0 is a rune-like lozenge, and the 2 is the sharp lightning zig from the
 * shirt numbers. No curves anywhere — a crochet chart can't do curves anyway,
 * which is exactly why the style fits.
 */
const G: Record<string, string[]> = {
  A: ['..X..', '.X.X.', 'X...X', 'X...X', 'XXXXX', 'X...X', 'X...X'],
  B: ['XXXX.', 'X...X', 'X..X.', 'XXX..', 'X..X.', 'X...X', 'XXXX.'],
  C: ['..XXX', '.X...', 'X....', 'X....', 'X....', '.X...', '..XXX'],
  D: ['XXX..', 'X..X.', 'X...X', 'X...X', 'X...X', 'X..X.', 'XXX..'],
  E: ['XXXXX', 'X....', 'X....', 'XXX..', 'X....', 'X....', 'XXXXX'],
  F: ['XXXXX', 'X....', 'X....', 'XXX..', 'X....', 'X....', 'X....'],
  G: ['..XXX', '.X...', 'X....', 'X..XX', 'X...X', '.X..X', '..XXX'],
  H: ['X...X', 'X...X', 'X...X', 'XXXXX', 'X...X', 'X...X', 'X...X'],
  I: ['XXX', '.X.', '.X.', '.X.', '.X.', '.X.', 'XXX'],
  J: ['..XXX', '...X.', '...X.', '...X.', '...X.', 'X..X.', '.XX..'],
  K: ['X...X', 'X..X.', 'X.X..', 'XX...', 'X.X..', 'X..X.', 'X...X'],
  L: ['X....', 'X....', 'X....', 'X....', 'X....', 'X....', 'XXXXX'],
  M: ['X...X', 'XX.XX', 'X.X.X', 'X.X.X', 'X...X', 'X...X', 'X...X'],
  N: ['X...X', 'XX..X', 'XX..X', 'X.X.X', 'X..XX', 'X..XX', 'X...X'],
  O: ['..X..', '.X.X.', 'X...X', 'X...X', 'X...X', '.X.X.', '..X..'],
  P: ['XXXX.', 'X...X', 'X...X', 'XXXX.', 'X....', 'X....', 'X....'],
  R: ['XXXX.', 'X...X', 'X...X', 'XXX..', 'X.X..', 'X..X.', 'X...X'],
  S: ['.XXXX', 'X....', 'X....', '.XXX.', '....X', '....X', 'XXXX.'],
  T: ['XXXXX', '..X..', '..X..', '..X..', '..X..', '..X..', '..X..'],
  U: ['X...X', 'X...X', 'X...X', 'X...X', 'X...X', '.X.X.', '..X..'],
  V: ['X...X', 'X...X', 'X...X', '.X.X.', '.X.X.', '..X..', '..X..'],
  W: ['X...X', 'X...X', 'X...X', 'X.X.X', 'X.X.X', 'XX.XX', 'X...X'],
  Y: ['X...X', 'X...X', '.X.X.', '..X..', '..X..', '..X..', '..X..'],
  '0': ['..X..', '.X.X.', 'X...X', 'X...X', 'X...X', '.X.X.', '..X..'],
  '1': ['..X..', '.XX..', '..X..', '..X..', '..X..', '..X..', 'XXXXX'],
  '2': ['XXXXX', '....X', '...X.', '..X..', '.X...', 'X....', 'XXXXX'],
  '3': ['XXXX.', '....X', '...X.', '..XX.', '....X', '....X', 'XXXX.'],
  '6': ['..XX.', '.X...', 'X....', 'XXXX.', 'X...X', 'X...X', '.XXX.'],
  ' ': ['.....', '.....', '.....', '.....', '.....', '.....', '.....'],
};

export const FONT_TAAKEFERD: FontSpec = {
  id: 'taakeferd',
  cell: { w: 5, h: 7 },
  defaultSlantDeg: 10,
  glyphs: G,
};
