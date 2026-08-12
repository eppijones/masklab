import type { FontSpec } from './types';

/**
 * «Runik» — the NORWAY'26 wordmark face.
 *
 * A Nordic sports italic, drawn the way runes are cut rather than the way a
 * brush writes: every stroke is straight, every corner is chamfered instead of
 * rounded, and the terminals are cut on the diagonal. No horns, no dragons —
 * the reference is a modern federation crest, not a Viking cartoon.
 *
 * 8 rows. Widths vary per glyph (G/M/N/W take 7 columns, E/F/L 5, I 4);
 * `rasterizeText` measures each glyph from its own row length, so narrow
 * letters take less room.
 *
 * MODULATED, NOT MONOLINE. The first cut of Runik drew every stroke two
 * stitches wide, and at eight rows that is a quarter of the cap height in every
 * direction: the letters came out as slabs with slots cut in them, and NORGE
 * read as a black bar before it read as a word. This cut carries the weight the
 * way an italic actually does — one stressed stroke per letter, everything else
 * thin:
 *
 *   · the STEM — the stroke the shear leans forward onto — stays TWO stitches.
 *     It is the only thing holding the letter up and one stitch is too thin to
 *     survive the halo;
 *   · every TRAILING vertical (the right side of O/D/G, the second stem of
 *     H/M/N/U) is ONE stitch. It is never alone: it runs into a bar at both
 *     ends, so it reads as the far side of a counter, not as a stray line;
 *   · every HORIZONTAL is ONE row — including the interior crossbars of A, H
 *     and the middle of B/E/F, which the first cut drew two rows deep;
 *   · DIAGONALS are one stitch, except the down-strokes that carry weight (A's
 *     right stem, K's and R's leg), which stay two.
 *
 * NORGE comes out at 136 stitches against the old cut's 162 — sixteen per cent
 * less ink — and the counters roughly double: O's hole goes from two stitches
 * wide to three, R's bowl from a two-row scratch to a three-row eye.
 *
 * NO GLYPH ENDS IN A LONE STITCH. A stroke that tapers to one stitch mid-air is
 * not a chamfer at this size, it is a dropped stitch: it survives the halo as a
 * single dot floating off the letter. Thin strokes are fine — thin *terminals*
 * are not, so every stem, leg and spur finishes against a bar or two stitches
 * wide.
 *
 * The masters are upright. The italic is applied downstream, in two parts:
 *   · `rasterizeText` shears by `defaultSlantDeg` — 24°, which moves the cap
 *     line THREE full columns right of the baseline over eight rows. The first
 *     cut's 16° only bought two, and two columns on a 38-stitch word is a
 *     lean you have to be told about;
 *   · the layer's `rise` walks the whole baseline upward as the word runs
 *     right. The slimmer letters are what made this affordable: the wordmark
 *     now has the headroom for a real two-row climb (see `norwayKit.ts`).
 *
 * Set it with letterSpacing ≥ 1: several glyphs carry a full-width bar on a
 * terminal row, so at zero spacing neighbouring letters fuse into a slab.
 */
const G: Record<string, string[]> = {
  A: ['..XXXX', '..X.XX', '.X..XX', '.X..XX', 'XXXXXX', 'X...XX', 'X...XX', 'X...XX'],
  B: ['XXXXX.', 'XX...X', 'XX...X', 'XXXXX.', 'XX...X', 'XX...X', 'XX...X', 'XXXXX.'],
  C: ['.XXXX.', 'XX...X', 'XX....', 'XX....', 'XX....', 'XX....', 'XX...X', '.XXXX.'],
  D: ['XXXXX.', 'XX...X', 'XX...X', 'XX...X', 'XX...X', 'XX...X', 'XX...X', 'XXXXX.'],
  E: ['XXXXX', 'XX...', 'XX...', 'XXXX.', 'XX...', 'XX...', 'XX...', 'XXXXX'],
  F: ['XXXXX', 'XX...', 'XX...', 'XXXX.', 'XX...', 'XX...', 'XX...', 'XX...'],
  G: ['.XXXXX.', 'XX....X', 'XX.....', 'XX.....', 'XX..XXX', 'XX....X', 'XX....X', '.XXXXX.'],
  H: ['XX...X', 'XX...X', 'XX...X', 'XXXXXX', 'XX...X', 'XX...X', 'XX...X', 'XX...X'],
  I: ['XXXX', '.XX.', '.XX.', '.XX.', '.XX.', '.XX.', '.XX.', 'XXXX'],
  J: ['..XXXX', '....XX', '....XX', '....XX', '....XX', 'X...XX', 'XX..XX', '.XXXX.'],
  K: ['XX...X', 'XX..X.', 'XX.X..', 'XXXX..', 'XXXX..', 'XX.XX.', 'XX..XX', 'XX..XX'],
  L: ['XX...', 'XX...', 'XX...', 'XX...', 'XX...', 'XX...', 'XX...', 'XXXXX'],
  M: ['XX....X', 'XXX..XX', 'XX.XX.X', 'XX....X', 'XX....X', 'XX....X', 'XX....X', 'XX....X'],
  N: ['XX....X', 'XXX...X', 'XXX...X', 'XX.X..X', 'XX.X..X', 'XX..X.X', 'XX...XX', 'XX....X'],
  O: ['.XXXX.', 'XX...X', 'XX...X', 'XX...X', 'XX...X', 'XX...X', 'XX...X', '.XXXX.'],
  P: ['XXXXX.', 'XX...X', 'XX...X', 'XX...X', 'XXXXX.', 'XX....', 'XX....', 'XX....'],
  Q: ['.XXXX.', 'XX...X', 'XX...X', 'XX...X', 'XX...X', 'XX...X', 'XX..XX', '.XXXXX'],
  R: ['XXXX..', 'XX..X.', 'XX...X', 'XX...X', 'XX..X.', 'XXXX..', 'XX.XX.', 'XX..XX'],
  S: ['.XXXXX', 'XX....', 'XX....', '.XXXX.', '....XX', '....XX', 'X...XX', 'XXXXX.'],
  T: ['XXXXXX', '..XX..', '..XX..', '..XX..', '..XX..', '..XX..', '..XX..', '..XX..'],
  U: ['XX...X', 'XX...X', 'XX...X', 'XX...X', 'XX...X', 'XX...X', 'XX...X', '.XXXX.'],
  W: ['XX....X', 'XX....X', 'XX....X', 'XX.X..X', 'XX.X..X', 'XX.X.X.', '.XXX.X.', '.XX..X.'],
  V: ['XX...X', 'XX...X', 'XX...X', 'XX...X', '.XX.X.', '.XX.X.', '..XX..', '..XX..'],
  X: ['XX...X', 'XX..X.', '.XXX..', '..XX..', '..XX..', '.XX.X.', 'XX...X', 'XX...X'],
  Y: ['XX...X', 'XX..X.', '.XXX..', '..XX..', '..XX..', '..XX..', '..XX..', '..XX..'],
  Z: ['XXXXXX', '....XX', '...XX.', '..XX..', '..XX..', '.XX...', 'XX....', 'XXXXXX'],
  'Æ': ['..XXXXX', '..XXX..', '.X.XX..', '.X.XXXX', 'XXXXX..', 'X..XX..', 'X..XX..', 'X..XXXX'],
  'Ø': ['.XXXX.', 'XX..XX', 'XX.X.X', 'XX.X.X', 'XXX..X', 'XXX..X', 'XX...X', '.XXXX.'],
  'Å': ['..XX..', '..XX..', '..XXXX', '.X..XX', 'XXXXXX', 'X...XX', 'X...XX', 'X...XX'],
  '0': ['.XXXX.', 'XX...X', 'XX...X', 'XX...X', 'XX...X', 'XX...X', 'XX...X', '.XXXX.'],
  '1': ['.XX..', 'XXX..', 'XXX..', '.XX..', '.XX..', '.XX..', '.XX..', 'XXXXX'],
  '2': ['.XXXX.', 'X...XX', '....XX', '...XX.', '..XX..', '.XX...', 'XX....', 'XXXXXX'],
  '3': ['XXXXX.', '....XX', '....XX', '.XXXX.', '....XX', '....XX', 'X...XX', 'XXXXX.'],
  '4': ['...XX.', '..XXX.', '.X.XX.', 'X..XX.', 'XXXXXX', '...XX.', '...XX.', '...XX.'],
  '5': ['XXXXXX', 'XX....', 'XX....', 'XXXXX.', '....XX', '....XX', 'X...XX', 'XXXXX.'],
  '6': ['..XXXX', '.XX...', 'XX....', 'XXXXX.', 'XX...X', 'XX...X', 'XX...X', '.XXXX.'],
  '7': ['XXXXXX', '....XX', '...XX.', '...XX.', '..XX..', '..XX..', '.XX...', '.XX...'],
  '8': ['.XXXX.', 'XX...X', 'XX...X', '.XXXX.', 'XX...X', 'XX...X', 'XX...X', '.XXXX.'],
  '9': ['.XXXX.', 'XX...X', 'XX...X', '.XXXXX', '....XX', '...XX.', '..XX..', '.XX...'],
  "'": ['XX', 'XX', 'XX', '..', '..', '..', '..', '..'],
  '-': ['....', '....', '....', 'XXXX', '....', '....', '....', '....'],
  ' ': ['...', '...', '...', '...', '...', '...', '...', '...'],
};

export const FONT_RUNIK: FontSpec = {
  id: 'runik',
  cell: { w: 6, h: 8 },
  /** Three columns of shear over eight rows — a jersey lean you can see. */
  defaultSlantDeg: 24,
  glyphs: G,
};
