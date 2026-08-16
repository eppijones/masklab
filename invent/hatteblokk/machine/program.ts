/**
 * Progress -> axis values. The bridge between "which stitch are we on" and "where is
 * every motor". Both the twin and the G-code emitter read this, so the animation cannot
 * show a pose the machine would not command.
 */

import type { AxisValues } from './axes.ts';
import { homeValues } from './axes.ts';
import { CYCLE_SC, evalCycle } from './cycle.ts';
import { FORMER, MACHINE_ROUNDS, stitchPitchDeg } from './units.ts';

export interface StitchAddress {
  global: number;
  roundIdx: number;
  indexInRound: number;
  count: number;
}

const CUM: number[] = (() => {
  const out: number[] = [];
  let s = 0;
  for (const c of MACHINE_ROUNDS) {
    out.push(s);
    s += c;
  }
  return out;
})();

export const TOTAL = CUM[CUM.length - 1] + MACHINE_ROUNDS[MACHINE_ROUNDS.length - 1];

export function addressOf(global: number): StitchAddress {
  const g = Math.max(0, Math.min(TOTAL - 1, Math.floor(global)));
  let lo = 0;
  let hi = MACHINE_ROUNDS.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (CUM[mid] <= g) lo = mid;
    else hi = mid - 1;
  }
  return { global: g, roundIdx: lo, indexInRound: g - CUM[lo], count: MACHINE_ROUNDS[lo] };
}

/** Cumulative C angle at the START of a given stitch, degrees. */
export function cAngleAt(global: number): number {
  const a = addressOf(global);
  let deg = 0;
  for (let i = 0; i < a.roundIdx; i++) deg += 360;
  deg += a.indexInRound * stitchPitchDeg(a.count);
  return deg;
}

/** Station pose that puts the head on the working line of a round. */
export function stationFor(roundIdx: number): { Z: number; R: number; B: number } {
  const p = FORMER[Math.max(0, Math.min(FORMER.length - 1, Math.round(roundIdx)))];
  return { Z: p.z + 6, R: p.r + 34, B: p.tiltDeg };
}

/** Linear blend between two rounds so the station glides rather than stepping. */
function stationBlend(roundIdx: number, frac: number) {
  const a = stationFor(roundIdx);
  const b = stationFor(Math.min(roundIdx + 1, FORMER.length - 1));
  const k = Math.max(0, Math.min(1, frac));
  return { Z: a.Z + (b.Z - a.Z) * k, R: a.R + (b.R - a.R) * k, B: a.B + (b.B - a.B) * k };
}

/**
 * Full machine state at (stitch, phase). `t` is 0..1 within one stitch cycle.
 * `yarnPort` is the selector detent, 0..3.
 */
export function axesAt(global: number, t: number, yarnPort = 0): AxisValues {
  const a = addressOf(global);
  const v = homeValues();
  const st = stationBlend(a.roundIdx, a.indexInRound / a.count);
  v.Z = st.Z;
  v.R = st.R;
  v.B = st.B;

  const c = evalCycle(CYCLE_SC, t);
  v.P = c.P ?? 0;
  v.G = c.G ?? 0;
  v.F1 = c.F1 ?? 0;
  // The C track is normalised: 1 unit == one stitch pitch for THIS round.
  v.C = cAngleAt(global) + (c.C ?? 0) * stitchPitchDeg(a.count);
  v.S = yarnPort * 90;
  return v;
}
