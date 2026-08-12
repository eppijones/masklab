import type { Phase, Round, Stitch, YarnColor } from '../data/types';
import type { ColorGrid } from '../data/chartLayers';

/**
 * Scripted patterns — faithful transcriptions of published recipes.
 *
 * A script is a literal list of rounds. Each round can carry explicit
 * per-stitch color runs (e.g. Flagget's "1 hvit, 2 røde (økning), 1 hvit,
 * 2 blå — repeter") so the 3D hat, the chart, the stitch counter and the
 * color-change markers all reproduce the PDF exactly.
 */

export interface ScriptRun {
  color: YarnColor;
  n: number;
  /** The LAST stitch of this run is an increase (2nd sc into the same stitch). */
  incLast?: boolean;
}

export interface ScriptRound {
  phase: Phase;
  count: number;
  /** Base color (used when no runs / for plain rounds). */
  color: YarnColor;
  /** Regular rhythm for plain increase rounds (recipe text + increase flags). */
  increaseEvery: number | null;
  /** Chart row (1-based) for wall rounds shown in the chart panel. */
  chartRow?: number | null;
  /**
   * Color runs, tiled around the round until `count` stitches are filled.
   * When present they define stitch colors AND (via incLast) increase flags.
   */
  runs?: ScriptRun[];
  /**
   * Rotate the expanded run pattern by this many stitches (Flagget locks the
   * blue spokes to fixed angles as the red sections grow).
   */
  phaseOffset?: number;
}

export interface ScriptModel {
  rounds: Round[];
  stitches: Stitch[];
  /** Wall chart built from the text-phase rounds (row 1 = first text round). */
  chartGrid: ColorGrid;
  chartCols: number;
  chartRows: number;
}

function runsLength(runs: ScriptRun[]): number {
  return runs.reduce((a, r) => a + r.n, 0);
}

/** Expand runs (tiled) into per-stitch colors + increase flags for one round. */
export function expandRuns(
  runs: ScriptRun[],
  count: number,
  phaseOffset = 0,
): { colors: YarnColor[]; increases: boolean[] } {
  const colors: YarnColor[] = [];
  const increases: boolean[] = [];
  const period = runsLength(runs);
  if (period <= 0) {
    return {
      colors: Array<YarnColor>(count).fill('white'),
      increases: Array<boolean>(count).fill(false),
    };
  }
  while (colors.length < count) {
    for (const run of runs) {
      for (let k = 0; k < run.n && colors.length < count; k++) {
        colors.push(run.color);
        increases.push(run.incLast === true && k === run.n - 1);
      }
    }
  }
  const off = ((phaseOffset % count) + count) % count;
  if (off === 0) return { colors, increases };
  return {
    colors: [...colors.slice(off), ...colors.slice(0, off)],
    increases: [...increases.slice(off), ...increases.slice(0, off)],
  };
}

/** True when the runs contain more than one distinct color. */
function multiColor(runs: ScriptRun[] | undefined): boolean {
  if (!runs) return false;
  const first = runs[0]?.color;
  return runs.some((r) => r.color !== first);
}

/**
 * @param textGrid Optional composited chart (from the pattern's chartLayers)
 *   used to color text-phase rounds that don't define their own runs.
 *   Row index = chartRow - 1, col index = stitch i.
 */
export function buildScriptModel(
  script: ScriptRound[],
  textGrid?: ColorGrid,
): ScriptModel {
  const rounds: Round[] = script.map((s, i) => ({
    num: i + 1,
    phase: s.phase,
    count: s.count,
    color: s.color,
    increaseEvery: s.increaseEvery,
    chartRow: s.chartRow ?? null,
    patterned: s.phase !== 'text' && multiColor(s.runs) ? true : undefined,
    label: `Runde ${i + 1}`,
  }));

  const stitches: Stitch[] = [];
  script.forEach((s, roundIdx) => {
    let colors: YarnColor[] | null = null;
    let increases: boolean[] | null = null;
    if (s.runs) {
      const expanded = expandRuns(s.runs, s.count, s.phaseOffset ?? 0);
      colors = expanded.colors;
      increases = expanded.increases;
    }
    const k = s.increaseEvery;
    const gridRow =
      s.phase === 'text' && s.chartRow != null && textGrid
        ? textGrid[s.chartRow - 1]
        : null;
    for (let i = 0; i < s.count; i++) {
      const rhythmInc =
        roundIdx !== 0 && k !== null && i % (k + 1) === k;
      stitches.push({
        roundIdx,
        i,
        color: colors ? colors[i] : (gridRow?.[i] ?? s.color),
        isIncrease: increases ? increases[i] : rhythmInc,
        changeColorAfter: null,
      });
    }
  });
  for (let i = 0; i < stitches.length - 1; i++) {
    if (stitches[i + 1].color !== stitches[i].color) {
      stitches[i].changeColorAfter = stitches[i + 1].color;
    }
  }

  // Wall chart from text-phase rounds. Flagget grows mid-band (88→96); pad
  // shorter rows so ChartView gets a rectangular grid at the widest count.
  const textRounds = script
    .map((s, i) => ({ s, i }))
    .filter(({ s }) => s.phase === 'text');
  const chartCols = textRounds.reduce(
    (max, { s }) => Math.max(max, s.count),
    0,
  );
  const chartGrid: ColorGrid = textRounds.map(({ s, i }) => {
    const inRound = stitches.filter((st) => st.roundIdx === i);
    const row = inRound.map((st) => st.color);
    while (row.length < chartCols) row.push(s.color);
    return row;
  });

  return {
    rounds,
    stitches,
    chartGrid,
    chartCols,
    chartRows: chartGrid.length,
  };
}

/** Sum-check helper for validation: expected counts per round. */
export function scriptCounts(script: ScriptRound[]): number[] {
  return script.map((s) => s.count);
}
