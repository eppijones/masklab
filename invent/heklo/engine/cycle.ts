/**
 * Fastmaske cycle. t is 0..1 inside one stitch. Slow-mo, step, and G-code
 * all sample the same tracks.
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
  t0: number;
  t1: number;
  loops: 0 | 1 | 2;
  note: string;
}

export type CycleId = 'sc' | 'inc' | 'ch' | 'join' | 'bind';

export interface StitchCycle {
  id: CycleId;
  name: string;
  durationMs: number;
  phases: CyclePhase[];
  tracks: AxisTrack[];
}

function easeInOut(k: number): number {
  return k * k * (3 - 2 * k);
}

export function sampleTrack(keys: Keyframe[], t: number): number {
  if (keys.length === 0) return 0;
  if (t <= keys[0].t) return keys[0].value;
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i];
    const b = keys[i + 1];
    if (t <= b.t) {
      const u = (t - a.t) / Math.max(1e-9, b.t - a.t);
      const e = b.ease ?? a.ease ?? 'easeInOut';
      const k = e === 'hold' ? 0 : e === 'linear' ? u : easeInOut(u);
      return a.value + (b.value - a.value) * k;
    }
  }
  return keys[keys.length - 1].value;
}

/** Relative H: 0 = retracted, 1 = fully through the V. Scaled by program to radius. */
const H_OUT = 0;
const H_IN = 1;
const H_MID = 0.55;

export const CYCLE_SC: StitchCycle = {
  id: 'sc',
  name: 'Fastmaske',
  durationMs: 3600,
  phases: [
    {
      id: 'present',
      label: '1. Gate holds the V open',
      t0: 0,
      t1: 0.1,
      loops: 1,
      note: 'The working mouth is a printed clip, not a floppy stitch. Insertion is 1-DOF.',
    },
    {
      id: 'insert',
      label: '2. Plunge through the V',
      t0: 0.1,
      t1: 0.26,
      loops: 1,
      note: 'Needle H drives through the gated throat. Latch L is open.',
    },
    {
      id: 'yo1',
      label: '3. First yarn-over — two loops',
      t0: 0.26,
      t1: 0.44,
      loops: 2,
      note: 'Turret presents the working yarn. Latch closes over the bight.',
    },
    {
      id: 'pull',
      label: '4. Pull up a loop',
      t0: 0.44,
      t1: 0.58,
      loops: 2,
      note: 'H retracts to mid-stroke. Two loops sit behind the latch.',
    },
    {
      id: 'yo2',
      label: '5. Second yarn-over — draw through both',
      t0: 0.58,
      t1: 0.82,
      loops: 1,
      note: 'This is crochet: one new bight through TWO loops. Colour changes here.',
    },
    {
      id: 'deposit',
      label: '6. New V seated in the gate',
      t0: 0.82,
      t1: 1,
      loops: 1,
      note: 'The old fabric drops through the chain. The gate now holds the new mouth.',
    },
  ],
  tracks: [
    {
      axis: 'H',
      keys: [
        { t: 0, value: H_OUT },
        { t: 0.1, value: H_OUT, ease: 'hold' },
        { t: 0.24, value: H_IN },
        { t: 0.44, value: H_IN, ease: 'hold' },
        { t: 0.56, value: H_MID },
        { t: 0.7, value: H_MID, ease: 'hold' },
        { t: 0.86, value: H_OUT },
        { t: 1, value: H_OUT, ease: 'hold' },
      ],
    },
    {
      axis: 'L',
      keys: [
        { t: 0, value: 0 },
        { t: 0.12, value: 0, ease: 'hold' },
        { t: 0.22, value: 85 },
        { t: 0.3, value: 85, ease: 'hold' },
        { t: 0.4, value: 12 },
        { t: 0.62, value: 12, ease: 'hold' },
        { t: 0.72, value: 95 },
        { t: 0.84, value: 8 },
        { t: 1, value: 0 },
      ],
    },
  ],
};

export const CYCLE_INC: StitchCycle = {
  id: 'inc',
  name: 'Increase (inject + fastmaske)',
  durationMs: 4400,
  phases: [
    {
      id: 'inject',
      label: '0. Inject a new gate link',
      t0: 0,
      t1: 0.18,
      loops: 1,
      note: 'Magazine pushes one printed clip into the chain. Cardinality += 1.',
    },
    ...CYCLE_SC.phases.map((p) => ({
      ...p,
      t0: 0.18 + p.t0 * 0.82,
      t1: 0.18 + p.t1 * 0.82,
    })),
  ],
  tracks: [
    {
      axis: 'I',
      keys: [
        { t: 0, value: 0 },
        { t: 0.1, value: 24 },
        { t: 0.18, value: 0 },
        { t: 1, value: 0, ease: 'hold' },
      ],
    },
    {
      axis: 'H',
      keys: CYCLE_SC.tracks[0].keys.map((k) => ({
        ...k,
        t: 0.18 + k.t * 0.82,
      })),
    },
    {
      axis: 'L',
      keys: CYCLE_SC.tracks[1].keys.map((k) => ({
        ...k,
        t: 0.18 + k.t * 0.82,
      })),
    },
  ],
};

export const CYCLE_CH: StitchCycle = {
  id: 'ch',
  name: 'Luftmaske (seed)',
  durationMs: 1800,
  phases: [
    {
      id: 'yo',
      label: 'Yarn over the empty hook',
      t0: 0,
      t1: 0.45,
      loops: 1,
      note: 'No previous V. The seed ring is a chain of 10, seated into 10 gates.',
    },
    {
      id: 'draw',
      label: 'Draw through — chain seated',
      t0: 0.45,
      t1: 1,
      loops: 1,
      note: 'The new loop is clipped into the next empty gate.',
    },
  ],
  tracks: [
    {
      axis: 'H',
      keys: [
        { t: 0, value: 0.15 },
        { t: 0.4, value: 0.35 },
        { t: 0.75, value: 0.1 },
        { t: 1, value: 0.15 },
      ],
    },
    {
      axis: 'L',
      keys: [
        { t: 0, value: 20 },
        { t: 0.35, value: 80 },
        { t: 0.7, value: 10 },
        { t: 1, value: 20 },
      ],
    },
  ],
};

export const CYCLE_JOIN: StitchCycle = {
  id: 'join',
  name: 'Join the seed ring',
  durationMs: 2200,
  phases: [
    {
      id: 'join',
      label: 'Slip-stitch the chain into a ring',
      t0: 0,
      t1: 1,
      loops: 1,
      note: 'Closes the 10-gate necklace. Round 1 of the hat begins on this ring.',
    },
  ],
  tracks: [
    {
      axis: 'H',
      keys: [
        { t: 0, value: 0.2 },
        { t: 0.45, value: 0.85 },
        { t: 1, value: 0.2 },
      ],
    },
    {
      axis: 'L',
      keys: [
        { t: 0, value: 0 },
        { t: 0.4, value: 70 },
        { t: 1, value: 0 },
      ],
    },
  ],
};

export const CYCLE_BIND: StitchCycle = {
  id: 'bind',
  name: 'Bind off',
  durationMs: 6000,
  phases: [
    {
      id: 'bind',
      label: 'Draw the last loop through, clip yarn, open the chain',
      t0: 0,
      t1: 1,
      loops: 0,
      note: 'Gates open. The hat drops onto the take-down skirt, brim-up, crown hanging.',
    },
  ],
  tracks: [
    {
      axis: 'H',
      keys: [
        { t: 0, value: 0.2 },
        { t: 0.5, value: 0.5 },
        { t: 1, value: 0 },
      ],
    },
    {
      axis: 'I',
      keys: [
        { t: 0, value: 0 },
        { t: 0.7, value: 0, ease: 'hold' },
        { t: 1, value: 12 },
      ],
    },
  ],
};

export const CYCLES: Record<CycleId, StitchCycle> = {
  sc: CYCLE_SC,
  inc: CYCLE_INC,
  ch: CYCLE_CH,
  join: CYCLE_JOIN,
  bind: CYCLE_BIND,
};

export function phaseAt(cycle: StitchCycle, t: number): CyclePhase {
  const clamped = Math.min(0.999, Math.max(0, t));
  return cycle.phases.find((p) => clamped >= p.t0 && clamped < p.t1) ?? cycle.phases[0];
}
