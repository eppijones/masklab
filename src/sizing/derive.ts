import type { Round, YarnColor } from '../data/types';
import type { PatternDefinition } from '../patterns/types';
import type { HookSpec } from './hooks';
import type { SizeSpec } from './sizes';
import { WAVE_COUNTS } from '../data/waves';

function expectedCount(prevCount: number, k: number | null): number {
  if (k === null) return prevCount;
  return prevCount + Math.floor(prevCount / k);
}

export function rawStitchCount(omkrets_cm: number, gauge: number): number {
  return Math.round(omkrets_cm * (gauge / 10));
}

export function lcm(a: number, b: number): number {
  const g = (x: number, y: number): number => (y === 0 ? x : g(y, x % y));
  return Math.abs(a * b) / g(a, b);
}

/** Nearest count ≥ min divisible by period. */
export function snapBodyCount(
  raw: number,
  chartRepeat: number,
  waveBlock: number,
  min = 80,
): number {
  const period = lcm(Math.max(1, chartRepeat), Math.max(1, waveBlock));
  let n = Math.max(min, Math.round(raw / period) * period);
  if (n < min) n += period;
  while (n % period !== 0) n++;
  return n;
}

/**
 * Build crown increase rounds ending at bodyCount.
 * Dame/4.0 RO baseline ends at 100 after 19 rounds — other sizes add/remove plain rounds.
 */
export function buildCrownRounds(
  bodyCount: number,
  color: YarnColor = 'white',
): Omit<Round, 'label'>[] {

  // Canonical RO schedule to 100, then scale the final plateaus.
  const plan: { count: number; every: number | null }[] = [
    { count: 10, every: null },
    { count: 20, every: 1 },
    { count: 30, every: 2 },
    { count: 30, every: null },
    { count: 40, every: 3 },
    { count: 40, every: null },
    { count: 40, every: null },
    { count: 50, every: 4 },
    { count: 60, every: 5 },
    { count: 70, every: 6 },
    { count: 70, every: null },
    { count: 70, every: null },
    { count: 80, every: 7 },
    { count: 80, every: null },
    { count: 80, every: null },
    { count: 90, every: 8 },
    { count: 90, every: null },
    { count: 90, every: null },
    { count: 100, every: 9 },
  ];

  if (bodyCount === 100) {
    return plan.map((p, i) => ({
      num: i + 1,
      phase: 'top' as const,
      count: p.count,
      color,
      increaseEvery: p.every,
      chartRow: null,
    }));
  }

  // Grow/shrink from 100 toward bodyCount with ±1–2 increase / plain rounds.
  const rounds = plan.map((p) => ({ ...p }));
  let cur = rounds[rounds.length - 1].count;
  while (cur < bodyCount) {
    const step = Math.min(10, bodyCount - cur);
    const every = Math.max(1, Math.floor(cur / step));
    const next = expectedCount(cur, every);
    if (next <= cur) break;
    rounds.push({ count: Math.min(next, bodyCount), every });
    cur = rounds[rounds.length - 1].count;
    if (rounds.length > 30) break;
  }
  while (cur > bodyCount && rounds.length > 10) {
    // Remove trailing plain rounds first, then lower final count.
    const last = rounds[rounds.length - 1];
    if (last.every === null && rounds.length > 19) {
      rounds.pop();
      cur = rounds[rounds.length - 1].count;
    } else {
      last.count = bodyCount;
      cur = bodyCount;
    }
  }
  rounds[rounds.length - 1].count = bodyCount;

  return rounds.map((p, i) => ({
    num: i + 1,
    phase: 'top' as const,
    count: p.count,
    color,
    increaseEvery: p.every,
    chartRow: null,
  }));
}

export function buildBrimIncRounds(
  bodyCount: number,
  startNum: number,
  color: YarnColor = 'white',
): Omit<Round, 'label'>[] {
  // RO: 100 → 110 → 120. Scale proportionally to land on multiple of 10 for waves.
  const targetWave = Math.round((bodyCount * 1.2) / 10) * 10;
  const mid = Math.round((bodyCount + targetWave) / 2 / 10) * 10;
  const k1 = Math.max(1, Math.floor(bodyCount / Math.max(1, mid - bodyCount)));
  const k2 = Math.max(1, Math.floor(mid / Math.max(1, targetWave - mid)));
  return [
    {
      num: startNum,
      phase: 'brim-inc',
      count: mid,
      color,
      increaseEvery: k1,
      chartRow: null,
    },
    {
      num: startNum + 1,
      phase: 'brim-inc',
      count: targetWave,
      color,
      increaseEvery: k2,
      chartRow: null,
    },
  ];
}

export function buildWaveRounds(
  waveBaseCount: number,
  startNum: number,
  includeWave: boolean,
): Omit<Round, 'label'>[] {
  if (!includeWave) return [];
  // Scale Helene wave counts relative to 120 base.
  const scale = waveBaseCount / 120;
  const waveK: (number | null)[] = [null, null, null, 10, 11, null];
  return WAVE_COUNTS.map((c, i) => {
    const count =
      waveBaseCount === 120 ? c : Math.round((c * scale) / 12) * 12;
    return {
      num: startNum + i,
      phase: 'wave' as const,
      count,
      color: 'blue' as const,
      increaseEvery: waveK[i],
      chartRow: null,
      waveRow: i + 1,
    };
  });
}

/**
 * Patterns whose default size is pinned to the 100-stitch body: RO for
 * historical parity, the NORWAY26 kits because they are drafted on 100
 * (four exact repeats of the 25-stitch ikat band recipe).
 */
const BODY_100_PINNED = new Set([
  'ro-ro-ro',
  'norway26',
  'norway26-white',
  'norway26-black',
  'norway26-training',
  'norway26-keeper',
]);

export function resolveBodyCount(
  def: PatternDefinition,
  size: SizeSpec,
  hook: HookSpec,
): number {
  if (
    BODY_100_PINNED.has(def.sizePinId ?? def.id) &&
    size.id === 'dame' &&
    hook.mm === 4.0
  ) {
    return 100;
  }
  const raw = rawStitchCount(size.omkrets_cm, hook.gauge_fm_per_10cm);
  return snapBodyCount(raw, 10, 10);
}

export function countStitchesByColor(
  colors: YarnColor[],
): Partial<Record<YarnColor, number>> {
  const out: Partial<Record<YarnColor, number>> = {};
  for (const c of colors) out[c] = (out[c] ?? 0) + 1;
  return out;
}
