import type { FontSpec } from './types';

/**
 * «Norge26» — the NORWAY'26 wordmark face, second cut.
 *
 * Transcribed from Espen's own chart sketch. Two things changed from «Runik»,
 * and both were faults he named:
 *
 *   ONE STITCH, NOT TWO. Runik drew a stressed stem two stitches wide on every
 *   letter. At eight rows that is a quarter of the cap height, and NORGE read
 *   as a black bar before it read as a word — «too bold with two masker». Here
 *   every stroke is ONE stitch. Nothing is doubled anywhere: the weight comes
 *   from the letters being taller, not fatter, which is how a runic face on a
 *   flag or a jersey number actually carries.
 *
 *   TEN ROWS, NOT EIGHT PLUS A CLIMB. Runik was an eight-row face that spent
 *   two more rows walking its baseline upward, so the block filled all twelve
 *   rows of the wall and the halo had nowhere to sit. This face IS ten rows —
 *   two rows more letter — and it sits flat, so the one-stitch contour lands
 *   exactly on rows 0 and 11 and the wall still reads edge to edge.
 *
 * The skeletons are «Taakeferd» — the face Nike drew for the 2026 kit, elder
 * futhark by way of a sports number: straight strokes, hard diagonals, counters
 * that come to a point, and a lozenge O. Taakeferd's own masters in this repo
 * are 5×7, too small to carry a wall this tall, so these are the same shapes
 * redrawn at ten rows.
 *
 * WIDE SPACING IS PART OF THE FACE. Runic letters are cut, not written, and cut
 * letters stand apart — at `letterSpacing: 1` these forms close up into a fence
 * of verticals and NORGE stops having five letters in it. Set at 2 or more.
 *
 * The masters are UPRIGHT, and must be set with `slantRepair` on. The italic is
 * applied downstream by `rasterizeText`, which shears the whole run by the
 * layer's `slantDeg` — 24°, four columns of lean over the ten rows.
 *
 * SHEAR THE RUN, NOT THE LETTERS. Pre-shearing the masters was tried, and it
 * draws beautifully — but a pre-sheared glyph's box is a parallelogram's
 * bounding rectangle, four columns wider than the letter, and glyphs laid out
 * box after box cannot nest. NORGE came out sixty-one stitches wide, which does
 * not fit twice round a hundred-stitch hat. Sheared as one run the letters
 * interlock the way an italic is supposed to and it lands at forty-six.
 *
 * `slantRepair` is what makes that safe: without it the rounding step in the
 * shear cuts these letterforms' own diagonals into loose cells.
 */
const G: Record<string, string[]> = {
  A: ['..XXXX.', '..X...X', '.X....X', '.X....X', 'XXXXXXX', 'X.....X', 'X.....X', 'X.....X', 'X.....X', 'X.....X'],
  B: ['XXXX..', 'X...X.', 'X...X.', 'X...X.', 'XXXX..', 'X...X.', 'X....X', 'X....X', 'X...X.', 'XXXX..'],
  C: ['.XXXXX.', 'X.....X', 'X......', 'X......', 'X......', 'X......', 'X......', 'X......', 'X.....X', '.XXXXX.'],
  D: ['XXXXX..', 'X....X.', 'X.....X', 'X.....X', 'X.....X', 'X.....X', 'X.....X', 'X.....X', 'X....X.', 'XXXXX..'],
  E: ['.XXXX', 'X....', 'X....', 'X....', 'XXX..', 'X....', 'X....', 'X....', 'X....', '.XXXX'],
  F: ['XXXXX', 'X....', 'X....', 'X....', 'XXXX.', 'X....', 'X....', 'X....', 'X....', 'X....'],
  G: ['.XXXX.', 'X....X', 'X.....', 'X.....', 'X.....', 'X..XXX', 'X....X', 'X....X', 'X....X', '.XXXX.'],
  H: ['X.....X', 'X.....X', 'X.....X', 'X.....X', 'XXXXXXX', 'X.....X', 'X.....X', 'X.....X', 'X.....X', 'X.....X'],
  I: ['XXX', '.X.', '.X.', '.X.', '.X.', '.X.', '.X.', '.X.', '.X.', 'XXX'],
  J: ['...XXXX', '.....X.', '.....X.', '.....X.', '.....X.', '.....X.', '.....X.', 'X....X.', 'X...X..', '.XXX...'],
  K: ['X.....X', 'X....X.', 'X...X..', 'X..X...', 'XXX....', 'X..X...', 'X...X..', 'X....X.', 'X.....X', 'X.....X'],
  L: ['X....', 'X....', 'X....', 'X....', 'X....', 'X....', 'X....', 'X....', 'X....', 'XXXXX'],
  M: ['X.....X', 'XX...XX', 'X.X.X.X', 'X..X..X', 'X.....X', 'X.....X', 'X.....X', 'X.....X', 'X.....X', 'X.....X'],
  N: ['X....X', 'XX...X', 'XX...X', 'X.X..X', 'X.X..X', 'X..X.X', 'X..X.X', 'X...XX', 'X....X', 'X....X'],
  O: ['...X...', '..X.X..', '.X...X.', 'X.....X', 'X.....X', 'X.....X', 'X.....X', '.X...X.', '..X.X..', '...X...'],
  P: ['XXXX..', 'X...X.', 'X...X.', 'X...X.', 'XXXX..', 'X.....', 'X.....', 'X.....', 'X.....', 'X.....'],
  Q: ['.XXXXX.', 'X.....X', 'X.....X', 'X.....X', 'X.....X', 'X.....X', 'X.....X', 'X...X.X', 'X....X.', '.XXXXXX'],
  R: ['XXXX..', 'X...X.', 'X...X.', 'X...X.', 'XXXX..', 'X.X...', 'X..X..', 'X...X.', 'X....X', 'X....X'],
  S: ['.XXXXX', 'X.....', 'X.....', 'X.....', '.XXXX.', '.....X', '.....X', '.....X', 'X....X', 'XXXXX.'],
  T: ['XXXXXXX', '...X...', '...X...', '...X...', '...X...', '...X...', '...X...', '...X...', '...X...', '...X...'],
  U: ['X.....X', 'X.....X', 'X.....X', 'X.....X', 'X.....X', 'X.....X', 'X.....X', 'X.....X', 'X.....X', '.XXXXX.'],
  V: ['X.....X', 'X.....X', 'X.....X', '.X...X.', '.X...X.', '.X...X.', '..X.X..', '..X.X..', '..X.X..', '...X...'],
  W: ['X.....X', 'X.....X', 'X.....X', 'X.....X', 'X..X..X', 'X..X..X', 'X.X.X.X', 'X.X.X.X', 'XX...XX', '.X...X.'],
  X: ['X.....X', '.X...X.', '..X.X..', '...X...', '...X...', '...X...', '..X.X..', '.X...X.', 'X.....X', 'X.....X'],
  Y: ['X.....X', '.X...X.', '..X.X..', '...X...', '...X...', '...X...', '...X...', '...X...', '...X...', '...X...'],
  Z: ['XXXXXXX', '.....X.', '....X..', '...X...', '...X...', '..X....', '.X.....', 'X......', 'X......', 'XXXXXXX'],
  'Æ': ['..XXXXX', '..X....', '.X.X...', '.X.X...', 'X..XXXX', 'XXXX...', 'X..X...', 'X..X...', 'X..X...', 'X..XXXX'],
  'Ø': ['.XXXXX.', 'X....XX', 'X....XX', 'X...X.X', 'X..X..X', 'X..X..X', 'X.X...X', 'XX....X', 'XX....X', '.XXXXX.'],
  'Å': ['..X.X..', '...X...', '..XXXX.', '..X...X', '.X....X', 'XXXXXXX', 'X.....X', 'X.....X', 'X.....X', 'X.....X'],
  '0': ['.XXXXX.', 'X.....X', 'X....XX', 'X...X.X', 'X..X..X', 'X..X..X', 'X.X...X', 'XX....X', 'X.....X', '.XXXXX.'],
  '1': ['..X..', '.XX..', 'X.X..', '..X..', '..X..', '..X..', '..X..', '..X..', '..X..', 'XXXXX'],
  '2': ['.XXXXX.', 'X.....X', '......X', '.....X.', '....X..', '...X...', '..X....', '.X.....', 'X......', 'XXXXXXX'],
  '3': ['XXXXXX.', '.....X.', '....X..', '...X...', '..XXX..', '.....X.', '......X', '......X', 'X.....X', '.XXXXX.'],
  '4': ['.....X.', '....XX.', '...X.X.', '..X..X.', '.X...X.', 'X....X.', 'XXXXXXX', '.....X.', '.....X.', '.....X.'],
  '5': ['XXXXXX', 'X.....', 'X.....', 'X.....', 'XXXXX.', '.....X', '.....X', '.....X', 'X....X', '.XXXX.'],
  '6': ['...XXX', '..X...', '.X....', 'X.....', 'XXXXX.', 'X....X', 'X....X', 'X....X', 'X....X', '.XXXX.'],
  '7': ['XXXXXXX', '.....X.', '....X..', '....X..', '...X...', '...X...', '..X....', '..X....', '.X.....', '.X.....'],
  '8': ['.XXXX.', 'X....X', 'X....X', 'X....X', '.XXXX.', 'X....X', 'X....X', 'X....X', 'X....X', '.XXXX.'],
  '9': ['.XXXX.', 'X....X', 'X....X', 'X....X', 'X....X', '.XXXXX', '....X.', '...X..', '..X...', '.X....'],
  "'": ['X', 'X', 'X', '.', '.', '.', '.', '.', '.', '.'],
  '-': ['....', '....', '....', '....', 'XXXX', '....', '....', '....', '....', '....'],
  ' ': ['...', '...', '...', '...', '...', '...', '...', '...', '...', '...'],
};

export const FONT_NORGE26: FontSpec = {
  id: 'norge26',
  cell: { w: 7, h: 10 },
  /** Four columns of lean over ten rows. Shear it with `slantRepair` on. */
  defaultSlantDeg: 24,
  glyphs: G,
};
