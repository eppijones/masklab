import type { TextLayer } from './chartLayers';
import { textPiece } from './layerGeometry';

/**
 * The clean panel a wordmark stands on, measured off the wordmark itself.
 *
 * WHY THIS EXISTS. The protection used to be typed in by hand — «half of the
 * 46-stitch wordmark, plus a stitch of air» — as four numbers sitting next to
 * the text layer and hoping to stay in step with it. They did not. Change the
 * face, the spacing, the slant or the climb and the word moves; the panel does
 * not, and the failure is silent and always in the same direction: an accent
 * stitch against the stem of the N, colour in the counter of the O, a slash
 * tying the R to the G. There is no rendering error to notice, just a wordmark
 * that has stopped being five letters.
 *
 * So the panel is DERIVED. `textPiece` is the same function
 * `textPlacements` uses to put ink on the chart, so the mask measured here is
 * the mask that gets stamped — font, letter spacing, scale, weight, shear and
 * baseline climb all already resolved. Nothing about the word can change
 * without the panel changing with it.
 *
 * IT IS SIZE-INDEPENDENT, and that is not an accident either. A stitch is a
 * stitch at every size — the font does not scale with the hat — so the word is
 * the same number of stitches wide at 100 as at 110, while `centerFrac` and
 * `repeat` place the copies proportionally. Every number this returns is
 * therefore either a fraction of the circumference or a count of stitches or
 * rows, exactly like the text layer it was read from, and both survive a change
 * of size the same way.
 *
 * WHAT IT DELIBERATELY DOES NOT PROTECT is the gap between one copy of the word
 * and the next. `repeat` panels of the word's own width leave the rest of the
 * circumference open, and on this collection that leftover is the point: it is
 * the transition corridor the field runs through, crown to brim. Widening the
 * margin to be safe is not free — every stitch of it costs two stitches from
 * each corridor.
 */
export interface TextKeepOutOpts {
  /**
   * Stitches of clean ground beyond the word's own ink, each side.
   *
   * One is a real margin here, not a token: the panel is a hard mask, so the
   * nearest cell the field can reach is two stitches from the nearest ink. Two
   * would be more comfortable and costs four stitches off every corridor.
   */
  margin?: number;
  /** Rows of clean ground above and below the block. */
  rowMargin?: number;
  /**
   * HOW FAR THE FIELD MAY CLIMB INTO THE WORD'S OWN BAND.
   *
   * With this at 0 the panel is a rectangle: its bottom edge is a straight line
   * under the lowest stitch in the word, and the field arrives at that line and
   * stops. Every column pays for the one letter that reaches furthest down.
   * What that buys is a wordmark on a clean shelf; what it costs is that the
   * word reads as a label laid over the hat rather than as part of it, because
   * nothing in the fabric ever touches it.
   *
   * Above 0 the edge goes RAGGED and follows the letters. Under the open half
   * of an R, in the gap between the E and the next word's N, under the tail of
   * a G — anywhere a column's own ink stops early — the field is let up this
   * many rows further than the straight line would allow. Two rows is enough to
   * read as the pattern and the lettering interlocking; more and strokes start
   * arriving beside the letters at letter height, which is the fault the
   * straight panel was built to stop.
   *
   * The clamp is what keeps it safe: no column is ever opened past
   * `mergeRows`, so a column with no ink in it at all — a letter gap — opens by
   * exactly as much as a column under a short letter, and never more.
   */
  mergeRows?: number;
}

/** The `keepOut*` motif params for one text layer's placements. */
export function keepOutFromTextPlacement(
  layer: TextLayer,
  opts: TextKeepOutOpts = {},
): Record<string, number | string> {
  const margin = opts.margin ?? 1;
  const rowMargin = opts.rowMargin ?? 1;
  const mergeRows = Math.max(0, opts.mergeRows ?? 0);
  const { mask, rowOffset } = textPiece(layer);
  const blockW = mask[0]?.length ?? 0;

  // The INK bounds inside the block, not the block's own box: a run carries a
  // trailing letter gap and may carry shear travel that no glyph reaches into,
  // and a panel sized to the box would be off-centre by that much.
  let left = Infinity;
  let right = -Infinity;
  let top = Infinity;
  let bottom = -Infinity;
  for (let r = 0; r < mask.length; r++) {
    for (let c = 0; c < (mask[r]?.length ?? 0); c++) {
      if (!mask[r][c]) continue;
      if (c < left) left = c;
      if (c > right) right = c;
      if (r < top) top = r;
      if (r > bottom) bottom = r;
    }
  }
  if (left === Infinity) return {};

  const base = layer.anchor.row + rowOffset;
  const rowTop = base + top;
  const rowBottom = base + bottom;

  /**
   * The ragged edge, one entry per PANEL column — the pad on the left, then the
   * ink, then the pad on the right, which is the same run `inKeepOutZone` walks
   * with its `d`. Columns are measured against the finished mask, so the lean,
   * the letter spacing and the margin are all already in them.
   */
  const width = right - left + 1 + 2 * margin;
  const starts: number[] = [];
  const ends: number[] = [];
  for (let d = 0; d < width; d++) {
    const c = left - margin + d;
    let colTop = Infinity;
    let colBottom = -Infinity;
    /**
     * EVERY LETTER KEEPS A RING OF GROUND, AND THE RING WINS OVER THE MERGE.
     *
     * The column is measured together with its NEIGHBOURS, `margin` stitches
     * either side — a sideways dilation of the ink before the edge is read off
     * it. Without that, a column with no ink of its own opens by the full
     * allowance even when it is standing directly against a stem, and the field
     * arrives beside the letters at letter height: ground and stroke in the same
     * round, touching. What that looks like on the hat is not «merging», it is
     * an E whose stem appears to run on down into the pattern.
     *
     * With it, the ragged edge survives only where there is genuinely room for
     * it — past the N, past the E, under the wide gaps — and every stroke in the
     * word still has its stitch of clean ground on all four sides.
     */
    for (let n = c - margin; n <= c + margin; n++) {
      for (let r = 0; r < mask.length; r++) {
        if (!mask[r]?.[n]) continue;
        if (r < colTop) colTop = r;
        if (r > colBottom) colBottom = r;
      }
    }
    // A column with no ink is treated as one whose letter stopped immediately:
    // it opens by the full allowance, and — because of the clamp — never more.
    starts.push(
      Math.min(
        rowTop - rowMargin + mergeRows,
        (colTop === Infinity ? Infinity : base + colTop) - rowMargin,
      ),
    );
    ends.push(
      Math.max(
        rowBottom + rowMargin - mergeRows,
        (colBottom === -Infinity ? -Infinity : base + colBottom) + rowMargin,
      ),
    );
  }

  return {
    ...(mergeRows > 0
      ? {
          keepOutRowStartProfile: starts.join(','),
          keepOutRowEndProfile: ends.join(','),
        }
      : {}),
    keepOutCenterFrac: layer.centerFrac ?? 0,
    // The block is what a placement centres and rounds; the ink is what has to
    // be protected. Both go across so the zone can redo the placement's own
    // arithmetic instead of approximating it — see `inKeepOutZone`.
    keepOutBlockW: blockW,
    keepOutInkLeft: left,
    keepOutInkW: right - left + 1,
    keepOutPad: margin,
    keepOutRepeat: Math.max(1, Math.round(layer.repeat)),
    keepOutRise: layer.rise ?? 0,
    keepOutRowStart: rowTop - rowMargin,
    keepOutRowEnd: rowBottom + rowMargin,
  };
}

/**
 * Where the protected panels are, in stitches — for reporting and for the
 * checks that have to know how much circumference the corridors were left.
 *
 * `width` is the panel; `corridor` is the run of open circumference between one
 * panel and the next, which on a `repeat: 2` wordmark is the E→N gap.
 */
export function keepOutMetrics(
  layer: TextLayer,
  cols: number,
  opts: TextKeepOutOpts = {},
): { panels: number; width: number; corridor: number } {
  const p = keepOutFromTextPlacement(layer, opts);
  // The map carries the ragged edge as encoded strings alongside the counts, so
  // the numeric fields are read back as numbers explicitly.
  const num = (v: number | string | undefined, fallback: number) =>
    typeof v === 'number' ? v : fallback;
  const panels = Math.max(1, Math.round(num(p.keepOutRepeat, 1)));
  const width = num(p.keepOutInkW, 0) + 2 * num(p.keepOutPad, 0);
  return { panels, width, corridor: (cols - panels * width) / panels };
}
