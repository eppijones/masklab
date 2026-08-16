/**
 * Stitch cycles: the per-axis keyframe timelines that form one crochet stitch.
 *
 * `t` is normalised 0..1 within the cycle, so slow-motion is one multiplier, single-step
 * is `t = phase.t0`, and the G-code emitter samples the same curve the twin animates.
 *
 * The phase list is deliberately the textbook stages of a single crochet stitch, so the
 * captions in the Stitch Animation section and the machine's motion blocks are literally
 * the same array.
 */

import type { AxisId } from './axes.ts';

export type Ease = 'linear' | 'easeInOut' | 'hold';

export interface Keyframe {
  t: number;
  value: number;
  ease?: Ease;
}
export interface AxisTrack {
  axis: AxisId;
  keys: Keyframe[];
}
export interface CyclePhase {
  id: string;
  label: string;
  labelNo: string;
  t0: number;
  t1: number;
  /** What is physically happening, and why it is crochet and not knitting. */
  note: string;
  /** Loops carried on the needle at the END of this phase. */
  loops: 0 | 1 | 2 | 3;
}
export interface CycleEvent {
  t: number;
  kind: 'yarn' | 'presenter' | 'sensor' | 'index' | 'colour';
  label: string;
}

export interface StitchCycle {
  id: 'sc' | 'inc' | 'dec' | 'ch' | 'sl-st';
  name: string;
  nameNo: string;
  durationMs: number;
  phases: CyclePhase[];
  tracks: AxisTrack[];
  events: CycleEvent[];
}

/** Plunge geometry, mm. P advances toward the fabric along -x of the tilted frame. */
const P_INSERT = 22; // through the target V
const P_CLEAR = 9; // short stroke that slides both loops behind the latch
const LOOP_H = 5.4; // retract depth = loop height = gauge [programmable per stitch]

/**
 * FASTMASKE / single crochet, the only stitch type the StrikkeApp patterns use.
 *
 * Phase 6 — drawing ONE new bight through TWO loops, one of which is the machine's own
 * working loop — is the move that makes this crochet. A weft-knitting latch needle never
 * does it; it draws through exactly one old loop, forever.
 */
export const CYCLE_SC: StitchCycle = {
  id: 'sc',
  name: 'Single crochet',
  nameNo: 'Fastmaske',
  durationMs: 3600,
  phases: [
    {
      id: 'present',
      label: 'Present',
      labelNo: 'Presenter',
      t0: 0,
      t1: 0.13,
      loops: 1,
      note: 'The compliant finger enters the target V and spreads it into an open aperture. This is what a 144-needle retention bed would otherwise be for.',
    },
    {
      id: 'insert',
      label: 'Insert',
      labelNo: 'Stikk inn',
      t0: 0.13,
      t1: 0.3,
      loops: 1,
      note: 'The tapered latch needle passes through the spread V, latch open, carrying the working loop on its shank.',
    },
    {
      id: 'feed-a',
      label: 'Yarn over',
      labelNo: 'Kast',
      t0: 0.3,
      t1: 0.4,
      loops: 1,
      note: 'The selector lays the working yarn into the hook throat.',
    },
    {
      id: 'draw-1',
      label: 'Draw through 1',
      labelNo: 'Trekk gjennom 1',
      t0: 0.4,
      t1: 0.55,
      loops: 2,
      note: 'Retract. The V itself pushes the latch closed over the new yarn — self-acting, no hook rotation needed. Two loops now on the needle.',
    },
    {
      id: 'clear',
      label: 'Clear latch',
      labelNo: 'Klarer tunga',
      t0: 0.55,
      t1: 0.65,
      loops: 2,
      note: 'A short advance slides both loops behind the latch, opening it.',
    },
    {
      id: 'feed-b',
      label: 'Yarn over (colour change)',
      labelNo: 'Kast (fargebytte)',
      t0: 0.65,
      t1: 0.75,
      loops: 2,
      note: 'Second yarn-over. If the pattern changes colour after this stitch, the selector moves NOW — mid-stitch. StrikkeApp already marks this as changeColorAfter, 1412 times per hat.',
    },
    {
      id: 'draw-2',
      label: 'Draw through 2',
      labelNo: 'Trekk gjennom 2',
      t0: 0.75,
      t1: 0.88,
      loops: 1,
      note: 'THE CROCHET-DEFINING MOVE. One bight is drawn through both loops at once, locking the stitch. Retract depth sets the loop height.',
    },
    {
      id: 'capture',
      label: 'Capture new V',
      labelNo: 'Fang ny V',
      t0: 0.88,
      t1: 0.94,
      loops: 1,
      note: 'The presenter re-engages the freshly formed V while it is still tensioned between needle and previous stitch. Least-proven step; experiment P3b.',
    },
    {
      id: 'advance',
      label: 'Advance',
      labelNo: 'Gå videre',
      t0: 0.94,
      t1: 1,
      loops: 1,
      note: 'C rotates by exactly one stitch pitch. Skipped entirely for an increase — that is all an increase is.',
    },
  ],
  tracks: [
    {
      axis: 'G',
      keys: [
        { t: 0, value: 0 },
        { t: 0.13, value: 10, ease: 'easeInOut' },
        { t: 0.85, value: 10, ease: 'hold' },
        { t: 0.88, value: 4, ease: 'easeInOut' },
        { t: 0.94, value: 9, ease: 'easeInOut' },
        { t: 1, value: 0, ease: 'easeInOut' },
      ],
    },
    {
      axis: 'P',
      keys: [
        { t: 0, value: 0 },
        { t: 0.13, value: 0, ease: 'hold' },
        { t: 0.3, value: P_INSERT, ease: 'easeInOut' },
        { t: 0.4, value: P_INSERT, ease: 'hold' },
        { t: 0.55, value: -LOOP_H, ease: 'easeInOut' },
        { t: 0.65, value: P_CLEAR, ease: 'easeInOut' },
        { t: 0.75, value: P_CLEAR, ease: 'hold' },
        { t: 0.88, value: -LOOP_H, ease: 'easeInOut' },
        { t: 1, value: 0, ease: 'easeInOut' },
      ],
    },
    {
      axis: 'S',
      keys: [
        { t: 0, value: 0 },
        { t: 0.62, value: 0, ease: 'hold' },
        { t: 0.68, value: 0, ease: 'easeInOut' },
        { t: 1, value: 0, ease: 'hold' },
      ],
    },
    {
      axis: 'C',
      keys: [
        { t: 0, value: 0 },
        { t: 0.94, value: 0, ease: 'hold' },
        { t: 1, value: 1, ease: 'easeInOut' }, // 1 = one stitch pitch; scaled by round count
      ],
    },
    {
      axis: 'F1',
      keys: [
        { t: 0, value: 0 },
        { t: 0.3, value: 0, ease: 'hold' },
        { t: 0.55, value: 180, ease: 'linear' },
        { t: 0.65, value: 180, ease: 'hold' },
        { t: 0.88, value: 340, ease: 'linear' },
        { t: 1, value: 340, ease: 'hold' },
      ],
    },
  ],
  events: [
    { t: 0.13, kind: 'presenter', label: 'V spread open' },
    { t: 0.3, kind: 'yarn', label: 'yarn laid in throat' },
    { t: 0.55, kind: 'sensor', label: 'metering checkpoint A' },
    { t: 0.66, kind: 'colour', label: 'mid-stitch colour change window' },
    { t: 0.88, kind: 'sensor', label: 'metering checkpoint B — stitch pass/fail' },
    { t: 1.0, kind: 'index', label: 'C += 1 stitch pitch' },
  ],
};

export const CYCLES: readonly StitchCycle[] = [CYCLE_SC];

function easeVal(a: Keyframe, b: Keyframe, u: number): number {
  if (b.ease === 'hold') return a.value;
  const k = b.ease === 'easeInOut' ? u * u * (3 - 2 * u) : u;
  return a.value + (b.value - a.value) * k;
}

/** Pure. No three.js. Shared by the twin, the stitch animation and the G-code emitter. */
export function evalTrack(track: AxisTrack, t: number): number {
  const keys = track.keys;
  if (keys.length === 0) return 0;
  if (t <= keys[0].t) return keys[0].value;
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i];
    const b = keys[i + 1];
    if (t <= b.t) {
      const span = b.t - a.t;
      return span <= 1e-9 ? b.value : easeVal(a, b, (t - a.t) / span);
    }
  }
  return keys[keys.length - 1].value;
}

export function evalCycle(cycle: StitchCycle, t: number): Partial<Record<AxisId, number>> {
  const out: Partial<Record<AxisId, number>> = {};
  for (const tr of cycle.tracks) out[tr.axis] = evalTrack(tr, t);
  return out;
}

export function phaseAt(cycle: StitchCycle, t: number): CyclePhase {
  for (const p of cycle.phases) if (t >= p.t0 && t < p.t1) return p;
  return cycle.phases[cycle.phases.length - 1];
}
