import type { YarnColor } from './types';

/**
 * Helene Spilling's wave brim ("Kanten / Brem"), transcribed from the chart
 * in the original PDF. The chart is a 10-stitch repeat over 6 rows; a red
 * cell does NOT mean red yarn — it means "two blue fastmasker in that
 * stitch" (an increase). Rows 4 and 5 each have one increase per block,
 * so each of those rounds grows by one stitch per wave.
 *
 * For the 4.0 mm Helene hat: after the two white brim increases you have
 * 120 stitches = 12 waves of 10. Wave rows then run 120, 120, 120,
 * 132, 144, 144, and the hat ends with one all-blue round of 144.
 */

/** One wave block as transcribed 1-1 from the chart in the PDF, rows 1-6 in
 *  working order. Helene's charts are drawn as seen while working (mirrored
 *  relative to the outside of the hat), so these rows read LEFT-to-RIGHT in
 *  working order (stitch 1 = leftmost cell). */
const WAVE_CHART_AS_PRINTED: string[] = [
  'WWWWWBBBWW', // rad 1
  'WWWBBBBBBW', // rad 2
  'WWWBBBWWBB', // rad 3
  'WWBRBWWBBW', // rad 4 (én økning per bølge)
  'WBBRBBWWWW', // rad 5 (én økning per bølge)
  'BBBBBBBBBB', // rad 6
];

/** Display version of the chart: the OUTSIDE of the hat, visual left-to-right,
 *  rows 1 (worked first, top of the brim band) to 6 (bottom edge).
 *  W = white fm, B = blue fm, R = increase: two blue fm in the marked stitch. */
export const WAVE_CHART_DISPLAY: string[] = WAVE_CHART_AS_PRINTED.map((row) =>
  row.split('').reverse().join(''),
);

/** Actual stitch colors produced per block, per row (R cells become two blue stitches). */
const WAVE_STITCHES: YarnColor[][] = WAVE_CHART_DISPLAY.map((row) => {
  const out: YarnColor[] = [];
  for (const ch of row) {
    if (ch === 'W') out.push('white');
    else if (ch === 'B') out.push('blue');
    else out.push('blue', 'blue'); // R: increase, two blue stitches
  }
  return out;
});

// Row 5 is worked over 11 stitches per block (after row 4's increase) and
// produces 12; row 6 is worked over 12. Pad the visual patterns so block
// lengths match the real stitch counts.
WAVE_STITCHES[4] = [...WAVE_STITCHES[4], 'white']; // 11 -> 12
WAVE_STITCHES[5] = [...WAVE_STITCHES[5], 'blue', 'blue']; // 10 -> 12

export const WAVE_BLOCKS = 12;

/** Stitch count after each wave row 1..6. */
export const WAVE_COUNTS = WAVE_STITCHES.map((row) => row.length * WAVE_BLOCKS);

/**
 * Color of a stitch in a wave round.
 * @param waveRow 1-6
 * @param i 0-based stitch index in WORKING order within the round
 */
export function waveStitchColor(waveRow: number, i: number): YarnColor {
  const block = WAVE_STITCHES[waveRow - 1];
  const local = i % block.length;
  // Top-down work: working order runs LEFT-to-right across the visual
  // (outside-view) block — same direction fix as the letter chart.
  return block[local];
}
