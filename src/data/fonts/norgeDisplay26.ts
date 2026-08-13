import type { FontSpec } from './types';

/**
 * «NorgeDisplay26» — the NORWAY'26 collection's display face, and the only one
 * any hat in the collection is set in.
 *
 * THE WEIGHT IS IN THE MASTER. Every other face in this repo is a one-stitch
 * skeleton: «Norge26» carries a runic cut by being tall and thin, and the only
 * way to make it look heavy was `bold: true`, which widens strokes sideways by
 * a stitch and leaves every horizontal bar one row thin. E came out with fat
 * stems and hairline arms, G's bar vanished, and the shear's rounding step
 * thickened some strokes and not others — which is the whole of "the
 * letterforms are inconsistent, some strokes feel thin while others feel
 * heavy". None of that is fixable downstream. Here EVERY stroke is TWO
 * stitches, drawn: stems, arms, bowl walls, the diagonal of the N. At ten rows
 * that is a fifth of the cap height, the proportion a jersey-front grotesque
 * actually uses.
 *
 * COUNTERS ARE THREE STITCHES. At one the ground inside an O closes up in the
 * crochet even though the chart shows it open; at two it survives on paper and
 * puckers in yarn. Three is the floor, and it is why the bowls are seven wide
 * (2 + 3 + 2) rather than eight.
 *
 * SEVEN IS ALSO A CIRCUMFERENCE BUDGET. NORGE lays out at THIRTY-NINE stitches
 * at `letterSpacing: 1` — 8 + 7 + 7 + 7 + 6 of letter and four of gap. Stamped
 * front and back on a hundred-stitch hat that is seventy-eight of a hundred,
 * which leaves eleven stitches of clear circumference between the E of one word
 * and the N of the next. That gap is not slack: it is the transition corridor
 * the field runs through (see `keepOutFromTextPlacement` and the corridor note
 * in `norwayKit.ts`), and it is the reason the bowls are not drawn at eight.
 *
 * THE MASTERS ARE UPRIGHT AND THE COLLECTION SETS THEM UPRIGHT. `defaultSlantDeg`
 * is 0 and every kit leaves `slantDeg` at 0. A two-stitch stem sheared far
 * enough to read as italic carries a staircase as wide as the stem itself, so
 * the lean would cost exactly the stroke consistency this face exists to get.
 * The forms are orthogonal apart from N, R's leg and the usual K/V/X/Y/Z, so
 * nothing here needs `slantRepair` — but leave it on if a design ever does
 * slant this face.
 */
const G: Record<string, string[]> = {
  A: ['..XXX..', '.XXXXX.', 'XX...XX', 'XX...XX', 'XXXXXXX', 'XXXXXXX', 'XX...XX', 'XX...XX', 'XX...XX', 'XX...XX'],
  B: ['XXXXX..', 'XXXXXX.', 'XX...XX', 'XX...XX', 'XXXXXX.', 'XXXXXX.', 'XX...XX', 'XX...XX', 'XXXXXX.', 'XXXXX..'],
  C: ['.XXXXX.', 'XXXXXXX', 'XX...XX', 'XX.....', 'XX.....', 'XX.....', 'XX.....', 'XX...XX', 'XXXXXXX', '.XXXXX.'],
  D: ['XXXXX..', 'XXXXXX.', 'XX...XX', 'XX...XX', 'XX...XX', 'XX...XX', 'XX...XX', 'XX...XX', 'XXXXXX.', 'XXXXX..'],
  /**
   * THREE ARMS, ALL TWO ROWS, ALL FULL WIDTH BUT ONE.
   *
   * The middle arm is a stitch shorter than the other two — that is the one
   * place a grotesque E is allowed to give, and it is what stops the letter
   * reading as a solid block. It is NOT allowed to give a row: at one row the
   * middle arm is a hairline against two-row arms above and below it, which is
   * the fault the old face had at the end of the word, on the letter the eye
   * needs most.
   *
   * Six wide, not seven. The arms have nothing to enclose, so the extra column
   * would be air, and the word has none to spare.
   */
  E: ['XXXXXX', 'XXXXXX', 'XX....', 'XX....', 'XXXXX.', 'XXXXX.', 'XX....', 'XX....', 'XXXXXX', 'XXXXXX'],
  F: ['XXXXXX', 'XXXXXX', 'XX....', 'XX....', 'XXXXX.', 'XXXXX.', 'XX....', 'XX....', 'XX....', 'XX....'],
  /**
   * A G, NOT A C AND NOT AN O.
   *
   * Three things make it read, and it needs all three: the right side is fully
   * OPEN for rows 3 and 4, where a C is open and an O is closed; the internal
   * bar at rows 5–6 arrives from the right and stops two stitches short of the
   * left wall, so it is unmistakably a bar and not the start of a second bowl;
   * and the right wall picks up again UNDER the bar at row 7 and runs into the
   * bottom curve. Close the gap at rows 3–4 and it is an O. Drop the bar and it
   * is a C. Run the bar all the way across and it is an eight.
   */
  G: ['.XXXXX.', 'XXXXXXX', 'XX...XX', 'XX.....', 'XX.....', 'XX..XXX', 'XX..XXX', 'XX...XX', 'XXXXXXX', '.XXXXX.'],
  H: ['XX...XX', 'XX...XX', 'XX...XX', 'XX...XX', 'XXXXXXX', 'XXXXXXX', 'XX...XX', 'XX...XX', 'XX...XX', 'XX...XX'],
  I: ['XXXXXX', 'XXXXXX', '..XX..', '..XX..', '..XX..', '..XX..', '..XX..', '..XX..', 'XXXXXX', 'XXXXXX'],
  J: ['.XXXXXX', '.XXXXXX', '....XX.', '....XX.', '....XX.', '....XX.', '....XX.', 'XX..XX.', 'XXXXXX.', '.XXXX..'],
  K: ['XX...XX', 'XX..XX.', 'XX.XX..', 'XXXX...', 'XXXX...', 'XXXX...', 'XX.XX..', 'XX..XX.', 'XX...XX', 'XX...XX'],
  L: ['XX....', 'XX....', 'XX....', 'XX....', 'XX....', 'XX....', 'XX....', 'XX....', 'XXXXXX', 'XXXXXX'],
  M: ['XX.....XX', 'XXX...XXX', 'XXXX.XXXX', 'XX.XXX.XX', 'XX..X..XX', 'XX.....XX', 'XX.....XX', 'XX.....XX', 'XX.....XX', 'XX.....XX'],
  /**
   * THE DIAGONAL LANDS, AND IT IS TWO STITCHES WIDE THE WHOLE WAY.
   *
   * Eight wide, alone in the face at that width, and every stitch of it is
   * spent. Two-stitch stems take four of the eight columns; the diagonal is two
   * more; that leaves exactly two columns of counter to share between the two
   * wedges, which is why N cannot be condensed to seven with this weight — at
   * seven the diagonal touches both stems on every row and the letter is a
   * solid block.
   *
   * It steps 3 rows, 3 rows, 2, 2: joined to the LEFT stem at the top (rows
   * 0–2), free of both through the middle, and into the RIGHT stem at the
   * bottom (rows 6–9). The same join at both ends is what makes it symmetrical.
   * The draft this face grew out of stepped four times over rows 0–7 and then
   * stopped, so the diagonal welded itself to the right stem at half height and
   * the last two rows were two bare stems with nothing between them — a letter
   * that reads as an H from across a room.
   */
  N: ['XXXX..XX', 'XXXX..XX', 'XXXX..XX', 'XX.XX.XX', 'XX.XX.XX', 'XX.XX.XX', 'XX..XXXX', 'XX..XXXX', 'XX...XXX', 'XX...XXX'],
  /**
   * The reference bowl: two-stitch wall all the way round, a three-by-six
   * counter, and the corners cut by one stitch top and bottom so the ring reads
   * as round rather than as a rectangle. Every other bowl in the face — C, D,
   * G, Q, S, U — is built on this one.
   */
  O: ['.XXXXX.', 'XXXXXXX', 'XX...XX', 'XX...XX', 'XX...XX', 'XX...XX', 'XX...XX', 'XX...XX', 'XXXXXXX', '.XXXXX.'],
  P: ['XXXXX..', 'XXXXXX.', 'XX...XX', 'XX...XX', 'XXXXXX.', 'XXXXX..', 'XX.....', 'XX.....', 'XX.....', 'XX.....'],
  Q: ['.XXXXX.', 'XXXXXXX', 'XX...XX', 'XX...XX', 'XX...XX', 'XX...XX', 'XX.X.XX', 'XX..XXX', 'XXXXXXX', '.XXXXXX'],
  /**
   * AN R THAT CANNOT BE A P OR A B.
   *
   * The bowl closes at row 5 — half height, not two thirds — and the leg leaves
   * from directly under it and walks two stitches at a time out to the baseline
   * right corner, so it is four rows long and finishes where the bowl's own
   * right wall used to be. A P has no leg. A B closes a second bowl at the
   * bottom right instead of running a straight diagonal into the corner, and
   * the giveaway is the bottom row: B ends `XXXXX..`, this ends `XX...XX`.
   */
  R: ['XXXXX..', 'XXXXXX.', 'XX...XX', 'XX...XX', 'XXXXXX.', 'XXXXX..', 'XXXX...', 'XX.XX..', 'XX..XX.', 'XX...XX'],
  S: ['.XXXXX.', 'XXXXXXX', 'XX...XX', 'XX.....', 'XXXXXX.', '.XXXXXX', '.....XX', 'XX...XX', 'XXXXXXX', '.XXXXX.'],
  T: ['XXXXXXX', 'XXXXXXX', '..XX...', '..XX...', '..XX...', '..XX...', '..XX...', '..XX...', '..XX...', '..XX...'],
  U: ['XX...XX', 'XX...XX', 'XX...XX', 'XX...XX', 'XX...XX', 'XX...XX', 'XX...XX', 'XX...XX', 'XXXXXXX', '.XXXXX.'],
  V: ['XX...XX', 'XX...XX', 'XX...XX', 'XX...XX', 'XX...XX', '.XX.XX.', '.XX.XX.', '..XXX..', '..XXX..', '..XXX..'],
  W: ['XX.....XX', 'XX.....XX', 'XX.....XX', 'XX.....XX', 'XX..X..XX', 'XX.XXX.XX', 'XX.XXX.XX', 'XXXX.XXXX', 'XXX...XXX', '.XX...XX.'],
  X: ['XX...XX', 'XX...XX', '.XX.XX.', '.XX.XX.', '..XXX..', '..XXX..', '.XX.XX.', '.XX.XX.', 'XX...XX', 'XX...XX'],
  Y: ['XX...XX', 'XX...XX', '.XX.XX.', '.XX.XX.', '..XXX..', '..XX...', '..XX...', '..XX...', '..XX...', '..XX...'],
  Z: ['XXXXXXX', 'XXXXXXX', '....XX.', '...XX..', '...XX..', '..XX...', '..XX...', 'XX.....', 'XXXXXXX', 'XXXXXXX'],
  'Æ': ['..XXXXXXX', '.XXXXXXXX', 'XX.XX....', 'XX.XX....', 'XXXXXXXX.', 'XXXXXXXX.', 'XX.XX....', 'XX.XX....', 'XX.XXXXXX', 'XX.XXXXXX'],
  'Ø': ['.XXXXX.', 'XXXXXXX', 'XX..XXX', 'XX.XXXX', 'XX.X.XX', 'XXXX.XX', 'XXX..XX', 'XX...XX', 'XXXXXXX', '.XXXXX.'],
  /**
   * The one one-stitch stroke in the face. At ten rows a two-stitch ring on top
   * of a two-stitch A leaves no counter in either. A ring is a diacritic, not a
   * stroke, so it is the one place the rule gives.
   */
  'Å': ['..XXX..', '..X.X..', '..XXX..', '.XXXXX.', 'XX...XX', 'XXXXXXX', 'XXXXXXX', 'XX...XX', 'XX...XX', 'XX...XX'],
  '0': ['.XXXXXX.', 'XXXXXXXX', 'XX....XX', 'XX....XX', 'XX....XX', 'XX....XX', 'XX....XX', 'XX....XX', 'XXXXXXXX', '.XXXXXX.'],
  '1': ['..XX..', '.XXX..', 'XXXX..', '..XX..', '..XX..', '..XX..', '..XX..', '..XX..', 'XXXXXX', 'XXXXXX'],
  '2': ['.XXXXXX.', 'XXXXXXXX', 'XX....XX', '......XX', '....XXXX', '..XXXX..', 'XXXX....', 'XX......', 'XXXXXXXX', 'XXXXXXXX'],
  '3': ['XXXXXXXX', 'XXXXXXXX', '.....XX.', '...XXX..', '..XXXX..', '....XXX.', '......XX', 'XX....XX', 'XXXXXXXX', '.XXXXXX.'],
  '4': ['....XXX.', '...XXXX.', '..XX.XX.', '.XX..XX.', 'XX...XX.', 'XXXXXXXX', 'XXXXXXXX', '.....XX.', '.....XX.', '.....XX.'],
  '5': ['XXXXXXXX', 'XXXXXXXX', 'XX......', 'XXXXXXX.', 'XXXXXXXX', '......XX', '......XX', 'XX....XX', 'XXXXXXXX', '.XXXXXX.'],
  '6': ['..XXXXXX', '.XXXXXXX', 'XX......', 'XX......', 'XXXXXXX.', 'XXXXXXXX', 'XX....XX', 'XX....XX', 'XXXXXXXX', '.XXXXXX.'],
  '7': ['XXXXXXXX', 'XXXXXXXX', '.....XX.', '....XX..', '....XX..', '...XX...', '...XX...', '..XX....', '..XX....', '.XX.....'],
  '8': ['.XXXXXX.', 'XXXXXXXX', 'XX....XX', 'XX....XX', 'XXXXXXXX', 'XXXXXXXX', 'XX....XX', 'XX....XX', 'XXXXXXXX', '.XXXXXX.'],
  '9': ['.XXXXXX.', 'XXXXXXXX', 'XX....XX', 'XX....XX', 'XXXXXXXX', '.XXXXXXX', '......XX', '......XX', 'XXXXXXX.', 'XXXXXX..'],
  "'": ['XX', 'XX', 'XX', '..', '..', '..', '..', '..', '..', '..'],
  '-': ['.....', '.....', '.....', '.....', 'XXXXX', 'XXXXX', '.....', '.....', '.....', '.....'],
  ' ': ['...', '...', '...', '...', '...', '...', '...', '...', '...', '...'],
};

export const FONT_NORGE_DISPLAY26: FontSpec = {
  id: 'norgeDisplay26',
  /** Nominal; the glyphs are proportional and N, M and W exceed it. */
  cell: { w: 7, h: 10 },
  /** Upright. See the note above — a two-stitch stem does not want a shear. */
  defaultSlantDeg: 0,
  glyphs: G,
};
