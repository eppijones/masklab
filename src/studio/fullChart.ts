import type { Round, Stitch, YarnColor } from '../data/types';

/**
 * The whole hat as one diagram.
 *
 * The band chart shows the wall, because the wall is the only part you draw
 * on. But a hat is a crown, a wall and a brim, and you cannot judge a design
 * from the wall alone — the colours meet at the shoulder and again at the
 * edge, and that is where a hat looks right or wrong.
 *
 * So this lays every round out on its own line, centred, exactly as many
 * stitches wide as that round has. The result is the hat's real silhouette:
 * a narrow crown opening out to the wall, then flaring again at the brim.
 */

export interface FullChartRow {
  /** Round number as the recipe counts it. */
  num: number;
  phase: Round['phase'];
  /** One yarn per stitch, in working order. */
  colors: YarnColor[];
  /** Chart row of the band, when this round is part of it. */
  chartRow: number | null;
  /** Left offset in stitches once the row is centred on the widest round. */
  offset: number;
}

export interface FullChart {
  rows: FullChartRow[];
  /** Width of the widest round — the diagram's own width. */
  maxCount: number;
  /** Index range of the rounds that make up the editable band. */
  bandFrom: number;
  bandTo: number;
}

/**
 * Build the whole-hat diagram from a derived pattern.
 *
 * Rounds are centred rather than left-aligned: a crochet round is a spiral
 * with no left edge, and centring is what makes the shape read as a hat
 * instead of a staircase.
 */
export function buildFullChart(rounds: Round[], stitches: Stitch[]): FullChart {
  const byRound: YarnColor[][] = rounds.map(() => []);
  for (const s of stitches) {
    const bucket = byRound[s.roundIdx];
    if (bucket) bucket[s.i] = s.color;
  }

  const maxCount = rounds.reduce((m, r) => Math.max(m, r.count), 0);
  let bandFrom = -1;
  let bandTo = -1;

  const rows: FullChartRow[] = rounds.map((r, i) => {
    if (r.phase === 'text') {
      if (bandFrom < 0) bandFrom = i;
      bandTo = i;
    }
    const colors = byRound[i] ?? [];
    // A round that produced no stitches still occupies its line, in its own
    // base colour — better a plain round than a hole in the diagram.
    const filled =
      colors.length === r.count
        ? colors
        : Array.from({ length: r.count }, (_, k) => colors[k] ?? r.color);
    return {
      num: r.num,
      phase: r.phase,
      colors: filled,
      chartRow: r.chartRow ?? null,
      offset: Math.floor((maxCount - r.count) / 2),
    };
  });

  return { rows, maxCount, bandFrom, bandTo };
}

/** Norwegian name for each phase, for the diagram's own legend. */
export const PHASE_LABEL: Record<Round['phase'], string> = {
  top: 'Pull',
  text: 'Mønsterfelt',
  'brim-inc': 'Bremøkning',
  wave: 'Bølgekant',
  brim: 'Kant',
  finish: 'Avslutning',
};

/** Where each phase starts and ends, for the band markers down the side. */
export function phaseRuns(
  chart: FullChart,
): { phase: Round['phase']; from: number; to: number }[] {
  const out: { phase: Round['phase']; from: number; to: number }[] = [];
  for (let i = 0; i < chart.rows.length; i++) {
    const phase = chart.rows[i].phase;
    const last = out[out.length - 1];
    if (last && last.phase === phase) last.to = i;
    else out.push({ phase, from: i, to: i });
  }
  return out;
}
