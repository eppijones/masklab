import type { Round, Stitch, YarnColor } from './types';
import { chartStitchColor } from './chart';
import { waveStitchColor, WAVE_COUNTS } from './waves';

/**
 * The RO RO RO recipe (Helene Spilling 4.0 mm version) as data.
 *
 * buildRounds() returns the canonical Helene schedule (registry default
 * ro-ro-ro @ dame + 4.0 mm) and must remain count-identical.
 */

export function buildRounds(): Round[] {
  return buildRoundsLegacyRo();
}

/** Exact historical 38-round Helene schedule (parity source of truth). */
export function buildRoundsLegacyRo(): Round[] {
  const rounds: Round[] = [];
  const add = (r: Omit<Round, 'label'>) =>
    rounds.push({ ...r, label: `Runde ${r.num}` });

  add({ num: 1, phase: 'top', count: 10, color: 'white', increaseEvery: null, chartRow: null });
  add({ num: 2, phase: 'top', count: 20, color: 'white', increaseEvery: 1, chartRow: null });
  add({ num: 3, phase: 'top', count: 30, color: 'white', increaseEvery: 2, chartRow: null });
  add({ num: 4, phase: 'top', count: 30, color: 'white', increaseEvery: null, chartRow: null });
  add({ num: 5, phase: 'top', count: 40, color: 'white', increaseEvery: 3, chartRow: null });
  add({ num: 6, phase: 'top', count: 40, color: 'white', increaseEvery: null, chartRow: null });
  add({ num: 7, phase: 'top', count: 40, color: 'white', increaseEvery: null, chartRow: null });
  add({ num: 8, phase: 'top', count: 50, color: 'white', increaseEvery: 4, chartRow: null });
  add({ num: 9, phase: 'top', count: 60, color: 'white', increaseEvery: 5, chartRow: null });
  add({ num: 10, phase: 'top', count: 70, color: 'white', increaseEvery: 6, chartRow: null });
  add({ num: 11, phase: 'top', count: 70, color: 'white', increaseEvery: null, chartRow: null });
  add({ num: 12, phase: 'top', count: 70, color: 'white', increaseEvery: null, chartRow: null });
  add({ num: 13, phase: 'top', count: 80, color: 'white', increaseEvery: 7, chartRow: null });
  add({ num: 14, phase: 'top', count: 80, color: 'white', increaseEvery: null, chartRow: null });
  add({ num: 15, phase: 'top', count: 80, color: 'white', increaseEvery: null, chartRow: null });
  add({ num: 16, phase: 'top', count: 90, color: 'white', increaseEvery: 8, chartRow: null });
  add({ num: 17, phase: 'top', count: 90, color: 'white', increaseEvery: null, chartRow: null });
  add({ num: 18, phase: 'top', count: 90, color: 'white', increaseEvery: null, chartRow: null });
  add({ num: 19, phase: 'top', count: 100, color: 'white', increaseEvery: 9, chartRow: null });

  for (let i = 0; i < 10; i++) {
    add({
      num: 20 + i,
      phase: 'text',
      count: 100,
      color: 'white',
      increaseEvery: null,
      chartRow: i + 1,
    });
  }

  add({ num: 30, phase: 'brim-inc', count: 110, color: 'white', increaseEvery: 10, chartRow: null });
  add({ num: 31, phase: 'brim-inc', count: 120, color: 'white', increaseEvery: 11, chartRow: null });

  const waveK: (number | null)[] = [null, null, null, 10, 11, null];
  for (let i = 0; i < 6; i++) {
    add({
      num: 32 + i,
      phase: 'wave',
      count: WAVE_COUNTS[i],
      color: 'blue',
      increaseEvery: waveK[i],
      chartRow: null,
      waveRow: i + 1,
    });
  }

  add({ num: 38, phase: 'brim', count: 144, color: 'blue', increaseEvery: null, chartRow: null });

  return rounds;
}

export interface StitchColorResolvers {
  textColor?: (row: number, stitchNum: number) => YarnColor;
  waveColor?: (waveRow: number, i: number) => YarnColor;
}

function stitchColor(
  round: Round,
  i: number,
  resolvers?: StitchColorResolvers,
): YarnColor {
  if (round.phase === 'text' && round.chartRow !== null) {
    return (resolvers?.textColor ?? chartStitchColor)(round.chartRow, i + 1);
  }
  if (round.phase === 'wave' && round.waveRow) {
    return (resolvers?.waveColor ?? waveStitchColor)(round.waveRow, i);
  }
  return round.color;
}

/**
 * Generate every stitch of the hat, in working order.
 * The increase flag marks the SECOND stitch worked into the same stitch below.
 */
export function buildStitches(
  rounds: Round[],
  resolvers?: StitchColorResolvers,
): Stitch[] {
  const stitches: Stitch[] = [];
  rounds.forEach((round, roundIdx) => {
    const k = round.increaseEvery;
    for (let i = 0; i < round.count; i++) {
      const isIncrease =
        round.num !== 1 && k !== null && i % (k + 1) === k;
      stitches.push({
        roundIdx,
        i,
        color: stitchColor(round, i, resolvers),
        isIncrease,
        changeColorAfter: null,
      });
    }
  });
  for (let s = 0; s < stitches.length - 1; s++) {
    if (stitches[s + 1].color !== stitches[s].color) {
      stitches[s].changeColorAfter = stitches[s + 1].color;
    }
  }
  return stitches;
}

export function expectedCount(prevCount: number, k: number | null): number {
  if (k === null) return prevCount;
  return prevCount + Math.floor(prevCount / k);
}

export function targetHole(stitches: Stitch[], before: number, globalIdx: number): number {
  let doubles = 0;
  for (let s = before; s <= globalIdx; s++) {
    if (stitches[s].isIncrease) doubles++;
  }
  return globalIdx - before - doubles;
}

export function rhythmText(round: Round): string {
  const k = round.increaseEvery;
  if (round.num === 1) return 'Lag 10 fastmasker i den samme luftmasken (luftmaske 1).';
  if (k === null) return 'Lag én fastmaske i hver eneste maske, hele veien rundt.';
  if (k === 1) return 'Lag to fastmasker i hver eneste gamle maske, hele veien rundt.';
  const ones = Array.from({ length: k - 1 }, () => 'én').join(', ');
  return `Lag én fastmaske i ${k - 1 === 1 ? 'én maske' : `${k - 1} forskjellige masker`}, deretter to fastmasker i neste maske. Gjenta hele veien rundt: ${ones}, to i samme maske.`;
}

export function rhythmTextEn(round: Round): string {
  const k = round.increaseEvery;
  if (round.num === 1) return 'Make 10 single crochets into the same chain stitch (chain 1).';
  if (k === null) return 'Make one single crochet in every stitch, all the way around.';
  if (k === 1) return 'Make two single crochets in every stitch of the previous round, all the way around.';
  const ones = Array.from({ length: k - 1 }, () => 'one').join(', ');
  return `Make one single crochet in ${k - 1 === 1 ? 'one stitch' : `${k - 1} different stitches`}, then two single crochets in the next stitch. Repeat all the way around: ${ones}, two in the same stitch.`;
}

export type IncreaseRole = 'plain' | 'first-of-two' | 'second-of-two';

export function increaseRole(
  stitchIndexInRound: number,
  increaseEvery: number | null,
  roundNum: number,
): IncreaseRole | null {
  const k = increaseEvery;
  if (roundNum === 1 || k === null) return null;
  const p = stitchIndexInRound % (k + 1);
  if (p === k) return 'second-of-two';
  if (p === k - 1) return 'first-of-two';
  return 'plain';
}

export function rhythmCells(increaseEvery: number): string[] {
  if (increaseEvery === 1) return ['2 i samme'];
  return [
    ...Array.from({ length: increaseEvery - 1 }, () => '1'),
    '2 i samme',
  ];
}

export type RhythmStepKind = 'plain' | 'two-in-same' | 'finish-two';

/**
 * Next crochet *unit* for increase rounds (not one stitch at a time).
 * Round 3 (k=2): plain → +1 «1 vanlig», then first-of-two → +2 «2 i samme».
 */
export function nextRhythmStep(
  cursor: number,
  round: Pick<Round, 'count' | 'increaseEvery' | 'num'>,
): { delta: number; kind: RhythmStepKind } | null {
  const k = round.increaseEvery;
  if (round.num === 1 || k === null) return null;
  if (cursor >= round.count) return null;
  const role = increaseRole(cursor, k, round.num);
  if (role === 'first-of-two') {
    const delta = Math.min(2, round.count - cursor);
    return { delta, kind: delta === 2 ? 'two-in-same' : 'finish-two' };
  }
  if (role === 'second-of-two') {
    return { delta: 1, kind: 'finish-two' };
  }
  return { delta: 1, kind: 'plain' };
}

/** How many full increase-rhythm repeats are done / total in this round. */
export function rhythmProgress(
  cursor: number,
  round: Pick<Round, 'count' | 'increaseEvery' | 'num'>,
): { done: number; total: number } | null {
  const k = round.increaseEvery;
  if (round.num === 1 || k === null) return null;
  const cycle = k + 1;
  if (cycle <= 0 || round.count % cycle !== 0) {
    return {
      done: Math.floor(cursor / cycle),
      total: Math.ceil(round.count / cycle),
    };
  }
  return {
    done: Math.min(Math.floor(cursor / cycle), round.count / cycle),
    total: round.count / cycle,
  };
}

export interface StitchRun {
  color: YarnColor;
  count: number;
  from: number;
  to: number;
}

export function roundRuns(stitches: Stitch[], roundIdx: number): StitchRun[] {
  const runs: StitchRun[] = [];
  for (const st of stitches) {
    if (st.roundIdx !== roundIdx) continue;
    const last = runs[runs.length - 1];
    if (last && last.color === st.color) {
      last.count++;
      last.to = st.i + 1;
    } else {
      runs.push({ color: st.color, count: 1, from: st.i + 1, to: st.i + 1 });
    }
  }
  return runs;
}

export function runText(run: StitchRun): string {
  const names: Record<YarnColor, [string, string]> = {
    white: ['hvit', 'hvite'],
    red: ['rød', 'røde'],
    blue: ['blå', 'blå'],
  };
  return `${run.count} ${names[run.color][run.count === 1 ? 0 : 1]}`;
}
