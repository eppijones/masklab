import type { FontSpec } from './types';

/**
 * «NorgeKursiv26» — the NORWAY'26 wordmark face, italic, and the only face any
 * hat in the collection is set in.
 *
 * THE LEAN IS DRAWN, NOT COMPUTED. This is the whole reason the face exists.
 * `shearMask` normally derives each row's offset as `round((h − 1 − r)·tan θ)`,
 * and that expression is what wrecked the two italic cuts before this one. Two
 * separate faults, both of them fatal:
 *
 *   IT LEANS TOO FAR FOR THE WIDTH. At 24° a ten-row block travels four columns.
 *   On «Norge26»'s seven-wide letters that is survivable; on a condensed face
 *   whose bowls are six, the lean is two thirds of the letter and the letters do
 *   not lean, they fall over. Nothing downstream can fix a letterform that has
 *   been pushed past its own width.
 *
 *   IT STEPS WHERE THE LETTERS STEP. `round` holds an offset for a row or two
 *   and then jumps a column, and wherever that jump lands on a stroke that is
 *   already travelling — N's diagonal, R's leg, K's arms — the two cancel. The
 *   stroke goes flat for a row, or doubles into a two-column jump. That is the
 *   «some strokes feel thin while others feel heavy» fault, and it is not a
 *   weight problem at all; it is a shear landing on a diagonal.
 *
 * So `lean` below is an explicit staircase: three rows at +2, three at +1, three
 * at 0. Two columns over nine rows is ≈15° once a stitch's 0.85 row height is
 * accounted for — a real italic angle, and gentle enough that a six-wide bowl
 * keeps its shape. The steps fall between rows 2/3 and 5/6, and every travelling
 * stroke in the face is drawn to step somewhere else, so no stroke and no shear
 * step ever land on the same row boundary.
 *
 * WEIGHT IS STRESSED, NOT UNIFORM. Uprights are TWO stitches, bars and diagonals
 * are ONE. «NorgeDisplay26» made everything two because its faults were thin
 * strokes appearing at random, and the cure was right for an upright face — but
 * two stitches everywhere is also what made it 39 stitches wide and unable to
 * lean. Modulation is what an italic is for: the eye reads a letter off its
 * stems, so the stems carry the weight and the bars can give a stitch back. It
 * is systematic — every upright is two, every bar is one, with no exceptions —
 * which is the difference between contrast and inconsistency.
 *
 * COUNTERS ARE TWO, AND THAT IS THE ONE COMPROMISE IN HERE. «NorgeDisplay26»
 * held a three-stitch floor because ground inside an O closes up in the crochet
 * below it. This face's bowls are 2 + 2 + 2, so the counters are two — but they
 * are two wide by SEVEN tall, a slot rather than a hole, and a slot that tall
 * does not close the way a three-by-six one did. Watch the first hat off the
 * hook: if the O fills in, the fix is bowls at seven and a word four stitches
 * wider, not a thinner wall.
 *
 * NORGE lays out at THIRTY-SIX stitches at `letterSpacing: 1` — 7 + 6 + 6 + 6 +
 * 5 of letter, four of gap, two of lean. Stamped front and back on a
 * hundred-stitch hat that leaves TWELVE stitches of transition corridor between
 * the E of one word and the N of the next, where the upright face left nine.
 * That gap is the route the field runs from crown to brim; see `norwayKit.ts`.
 */
const G: Record<string, string[]> = {
  A: ['.XXXX.', 'XX..XX', 'XX..XX', 'XX..XX', 'XXXXXX', 'XX..XX', 'XX..XX', 'XX..XX', 'XX..XX'],
  B: ['XXXXX.', 'XX..XX', 'XX..XX', 'XX..XX', 'XXXXX.', 'XX..XX', 'XX..XX', 'XX..XX', 'XXXXX.'],
  C: ['.XXXX.', 'XX..XX', 'XX....', 'XX....', 'XX....', 'XX....', 'XX....', 'XX..XX', '.XXXX.'],
  D: ['XXXXX.', 'XX..XX', 'XX..XX', 'XX..XX', 'XX..XX', 'XX..XX', 'XX..XX', 'XX..XX', 'XXXXX.'],
  /**
   * Five wide, not six: the arms enclose nothing, so the sixth column would be
   * air on the letter the eye needs most at the end of the word. The middle arm
   * stops a stitch short of the other two — the one place a grotesque E gives,
   * and the only asymmetry allowed in it.
   */
  E: ['XXXXX', 'XX...', 'XX...', 'XX...', 'XXXX.', 'XX...', 'XX...', 'XX...', 'XXXXX'],
  F: ['XXXXX', 'XX...', 'XX...', 'XX...', 'XXXX.', 'XX...', 'XX...', 'XX...', 'XX...'],
  /**
   * A G, not a C and not an O. The right wall is OPEN at rows 2–3 where a C is
   * open and an O is closed; the bar arrives from the right at row 4 and stops
   * two stitches short of the left wall, so it is a bar and not a second bowl;
   * and the right wall picks up UNDER it at row 5 and runs into the bottom
   * curve. Close rows 2–3 and it is an O. Drop the bar and it is a C.
   */
  G: ['.XXXX.', 'XX..XX', 'XX....', 'XX....', 'XX.XXX', 'XX..XX', 'XX..XX', 'XX..XX', '.XXXX.'],
  H: ['XX..XX', 'XX..XX', 'XX..XX', 'XX..XX', 'XXXXXX', 'XX..XX', 'XX..XX', 'XX..XX', 'XX..XX'],
  I: ['XXXX', '.XX.', '.XX.', '.XX.', '.XX.', '.XX.', '.XX.', '.XX.', 'XXXX'],
  J: ['..XXX', '...XX', '...XX', '...XX', '...XX', '...XX', 'XX.XX', 'XX.XX', '.XXX.'],
  K: ['XX..XX', 'XX.XX.', 'XXXX..', 'XXX...', 'XXX...', 'XXXX..', 'XX.XX.', 'XX..XX', 'XX..XX'],
  L: ['XX...', 'XX...', 'XX...', 'XX...', 'XX...', 'XX...', 'XX...', 'XX...', 'XXXXX'],
  M: ['XX....XX', 'XXX..XXX', 'XXXXXXXX', 'XX.XX.XX', 'XX....XX', 'XX....XX', 'XX....XX', 'XX....XX', 'XX....XX'],
  /**
   * SEVEN WIDE, AND THE DIAGONAL STEPS *WITH* THE LEAN — NOT AGAINST IT.
   *
   * This is the one letter in the face where the rule inverts, and getting it
   * wrong is subtle enough to survive a render. Every other travelling stroke
   * here is drawn to step at row boundaries `lean` does NOT step at, so the two
   * never cancel. N's diagonal is the opposite case: it has to stay put in
   * ABSOLUTE columns while the stems lean away from it, because that is what a
   * sheared N is — a middle stroke that leaves the left stem at the top and
   * arrives at the right stem at the bottom purely because the stems have moved
   * out from under it.
   *
   * So the master steps exactly where `lean` steps, and the two cancel BY
   * DESIGN: columns 2,2,2 / 3,3,3 / 4,4,4 against offsets 2,2,2 / 1,1,1 / 0,0,0
   * put the diagonal at absolute column 4 on all nine rows. The draft this
   * replaced stepped at rows 1→2 and 4→5 instead, half a beat out of phase, and
   * the diagonal came out at absolute 4,4,5,4,4,5,4 — a zigzag reading as a
   * loose notch in the middle of the letter rather than as a stroke, and it
   * stopped two rows short of the right stem so the bottom of the N was two
   * bare stems with nothing between them.
   *
   * It runs the full nine rows for the same reason: joined to the left stem at
   * rows 0–2 and into the right stem at rows 6–8, the same weld at both ends,
   * which is what makes it symmetrical instead of top-heavy.
   */
  N: ['XXX..XX', 'XXX..XX', 'XXX..XX', 'XX.X.XX', 'XX.X.XX', 'XX.X.XX', 'XX..XXX', 'XX..XXX', 'XX..XXX'],
  /**
   * The reference bowl: two-stitch walls, a two-by-seven counter, and the
   * corners cut by one stitch top and bottom so the ring reads round rather
   * than rectangular. C, D, G, Q, S and U are all built on this one.
   */
  O: ['.XXXX.', 'XX..XX', 'XX..XX', 'XX..XX', 'XX..XX', 'XX..XX', 'XX..XX', 'XX..XX', '.XXXX.'],
  P: ['XXXXX.', 'XX..XX', 'XX..XX', 'XX..XX', 'XXXXX.', 'XX....', 'XX....', 'XX....', 'XX....'],
  Q: ['.XXXX.', 'XX..XX', 'XX..XX', 'XX..XX', 'XX..XX', 'XX..XX', 'XX.XXX', 'XX..XX', '.XXXXX'],
  /**
   * An R that cannot be a P or a B. The bowl closes at row 4 — half height —
   * and the leg leaves from under it and walks out to the baseline right
   * corner. A P has no leg. A B closes a second bowl instead of running a
   * diagonal into the corner, and the giveaway is the bottom row: B ends
   * `XXXXX.`, this ends `XX...X`.
   */
  R: ['XXXXX.', 'XX..XX', 'XX..XX', 'XX..XX', 'XXXXX.', 'XX.X..', 'XX..X.', 'XX...X', 'XX...X'],
  S: ['.XXXXX', 'XX....', 'XX....', 'XX....', '.XXXX.', '....XX', '....XX', '....XX', 'XXXXX.'],
  T: ['XXXXXX', '..XX..', '..XX..', '..XX..', '..XX..', '..XX..', '..XX..', '..XX..', '..XX..'],
  U: ['XX..XX', 'XX..XX', 'XX..XX', 'XX..XX', 'XX..XX', 'XX..XX', 'XX..XX', 'XX..XX', '.XXXX.'],
  V: ['XX..XX', 'XX..XX', 'XX..XX', 'XX..XX', 'XX..XX', '.XXXX.', '.XXXX.', '..XX..', '..XX..'],
  W: ['XX....XX', 'XX....XX', 'XX....XX', 'XX....XX', 'XX.XX.XX', 'XX.XX.XX', 'XXXXXXXX', 'XXX..XXX', '.XX..XX.'],
  X: ['XX..XX', 'XX..XX', '.XXXX.', '.XXXX.', '..XX..', '.XXXX.', '.XXXX.', 'XX..XX', 'XX..XX'],
  Y: ['XX..XX', 'XX..XX', '.XXXX.', '.XXXX.', '..XX..', '..XX..', '..XX..', '..XX..', '..XX..'],
  Z: ['XXXXXX', '....XX', '...XX.', '...XX.', '..XX..', '.XX...', '.XX...', 'XX....', 'XXXXXX'],
  'Æ': ['..XXXXXX', '.XX.XX..', '.XX.XX..', 'XX..XX..', 'XXXXXXX.', 'XX..XX..', 'XX..XX..', 'XX..XX..', 'XX..XXXX'],
  'Ø': ['.XXXX.', 'XX..XX', 'XX..XX', 'XX.XXX', 'XXXXXX', 'XXX.XX', 'XX..XX', 'XX..XX', '.XXXX.'],
  /**
   * The one one-stitch upright in the face. At nine rows a two-stitch ring on
   * top of a two-stitch A leaves no counter in either. A ring is a diacritic,
   * not a stroke, so it is the one place the rule gives.
   */
  'Å': ['.XXXX.', '.X..X.', '.XXXX.', 'XX..XX', 'XXXXXX', 'XX..XX', 'XX..XX', 'XX..XX', 'XX..XX'],
  '0': ['.XXXX.', 'XX..XX', 'XX..XX', 'XX..XX', 'XX..XX', 'XX..XX', 'XX..XX', 'XX..XX', '.XXXX.'],
  '1': ['.XX.', 'XXX.', '.XX.', '.XX.', '.XX.', '.XX.', '.XX.', '.XX.', 'XXXX'],
  '2': ['.XXXX.', 'XX..XX', '....XX', '....XX', '...XX.', '..XX..', '.XX...', 'XX....', 'XXXXXX'],
  '3': ['XXXXXX', '...XX.', '..XX..', '.XXXX.', '....XX', '....XX', '....XX', 'XX..XX', '.XXXX.'],
  '4': ['...XX.', '..XXX.', '.XXXX.', 'XX.XX.', 'XX.XX.', 'XXXXXX', '...XX.', '...XX.', '...XX.'],
  '5': ['XXXXXX', 'XX....', 'XX....', 'XXXXX.', '....XX', '....XX', '....XX', 'XX..XX', '.XXXX.'],
  '6': ['..XXXX', '.XX...', 'XX....', 'XXXXX.', 'XX..XX', 'XX..XX', 'XX..XX', 'XX..XX', '.XXXX.'],
  '7': ['XXXXXX', '....XX', '...XX.', '...XX.', '..XX..', '..XX..', '.XX...', '.XX...', 'XX....'],
  '8': ['.XXXX.', 'XX..XX', 'XX..XX', 'XX..XX', '.XXXX.', 'XX..XX', 'XX..XX', 'XX..XX', '.XXXX.'],
  '9': ['.XXXX.', 'XX..XX', 'XX..XX', 'XX..XX', '.XXXXX', '....XX', '...XX.', '..XX..', '.XX...'],
  "'": ['XX', 'XX', 'XX', '..', '..', '..', '..', '..', '..'],
  '-': ['....', '....', '....', '....', 'XXXX', '....', '....', '....', '....'],
  ' ': ['...', '...', '...', '...', '...', '...', '...', '...', '...'],
};

export const FONT_NORGE_KURSIV26: FontSpec = {
  id: 'norgeKursiv26',
  /** Nominal; the glyphs are proportional and N, M and W exceed it. */
  cell: { w: 6, h: 9 },
  /**
   * ZERO, AND IT MUST STAY ZERO. The lean is in `lean` below. A `slantDeg` on
   * top of it would shear an already-italic face a second time — which is both
   * too much angle and, worse, the `round(tan θ)` staircase this face was drawn
   * to avoid. `validate.ts` tests every hat for it.
   */
  defaultSlantDeg: 0,
  /**
   * Columns each row moves right, top row first. Three rows at +2, three at +1,
   * three at 0 — see the note above for why this is written out rather than
   * derived from an angle.
   */
  lean: [2, 2, 2, 1, 1, 1, 0, 0, 0],
  glyphs: G,
};
