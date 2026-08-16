/**
 * Catalog hat JSON → a linear program of machine ops.
 * axesAt() is the only pose the twin is allowed to show.
 */

import { AXIS_HOME, type AxisValues } from './axes.ts';
import { CYCLES, sampleTrack, type CycleId, type StitchCycle, phaseAt } from './cycle.ts';
import { chainRadius, SEED_GATES, STITCH_H_MM } from './units.ts';
import type { HatSnap, HatRound } from './hats.ts';

export type OpKind = CycleId;

export interface Op {
  kind: OpKind;
  round: number;
  stitch: number;
  color: number;
  prevColor: number;
  gates: number;
  fabric: number;
  phaseName: string;
}

export interface Program {
  hat: HatSnap;
  ops: Op[];
  totalMs: number;
  durations: number[];
  prefixMs: number[];
}

function cycleOf(kind: OpKind): StitchCycle {
  return CYCLES[kind];
}

export function compile(hat: HatSnap): Program {
  const ops: Op[] = [];
  let gates = SEED_GATES;
  let fabric = 0;
  let prevColor = hat.rounds[0]?.colors[0] ?? 0;
  const seedColor = prevColor;

  for (let i = 0; i < SEED_GATES; i++) {
    ops.push({
      kind: 'ch',
      round: 0,
      stitch: i,
      color: seedColor,
      prevColor,
      gates,
      fabric,
      phaseName: 'seed',
    });
  }
  ops.push({
    kind: 'join',
    round: 0,
    stitch: SEED_GATES,
    color: seedColor,
    prevColor,
    gates,
    fabric,
    phaseName: 'seed',
  });

  for (const round of hat.rounds) {
    const incSet = new Set(round.inc);
    for (let i = 0; i < round.count; i++) {
      const color = round.colors[i] ?? 0;
      const isInc = incSet.has(i);
      if (isInc) gates += 1;
      fabric += 1;
      ops.push({
        kind: isInc ? 'inc' : 'sc',
        round: round.num,
        stitch: i,
        color,
        prevColor,
        gates,
        fabric,
        phaseName: round.phase,
      });
      prevColor = color;
    }
  }

  ops.push({
    kind: 'bind',
    round: hat.totalRounds,
    stitch: 0,
    color: prevColor,
    prevColor,
    gates,
    fabric,
    phaseName: 'finish',
  });

  const durations = ops.map((o) => cycleOf(o.kind).durationMs);
  const prefixMs: number[] = [0];
  for (const d of durations) prefixMs.push(prefixMs[prefixMs.length - 1] + d);

  return {
    hat,
    ops,
    durations,
    prefixMs,
    totalMs: prefixMs[prefixMs.length - 1],
  };
}

export function opAt(prog: Program, pos: number): { op: Op; index: number; t: number } {
  const n = prog.ops.length;
  const i = Math.max(0, Math.min(n - 1, Math.floor(pos)));
  const t = Math.max(0, Math.min(0.999, pos - Math.floor(pos)));
  return { op: prog.ops[i], index: i, t };
}

export function axesAt(prog: Program, pos: number): AxisValues {
  const { op, t } = opAt(prog, pos);
  const cycle = cycleOf(op.kind);
  const r = chainRadius(op.gates);
  const v: AxisValues = { ...AXIS_HOME };

  v.C = -(op.stitch + t) * (360 / Math.max(1, op.kind === 'ch' ? SEED_GATES : op.gates));
  v.Z = Math.min(200, 8 + op.round * STITCH_H_MM * 0.45);

  const hRel = sampleTrack(cycle.tracks.find((tr) => tr.axis === 'H')?.keys ?? [], t);
  // H is world X of the carrier. Retracted = r + 52, plunged = r - 8.
  const hOut = r + 52;
  const hIn = r - 8;
  v.H = hOut + (hIn - hOut) * hRel;

  v.L = sampleTrack(cycle.tracks.find((tr) => tr.axis === 'L')?.keys ?? [], t);
  v.I = sampleTrack(cycle.tracks.find((tr) => tr.axis === 'I')?.keys ?? [], t);

  const ports = Math.max(1, hatYarnPorts(prog.hat));
  const want = (op.color % ports) * (360 / ports);
  const from = (op.prevColor % ports) * (360 / ports);
  // Colour change on the second yarn-over (sc phase yo2 starts ~0.58).
  const k = op.kind === 'sc' || op.kind === 'inc' ? smoothstep((t - 0.55) / 0.2) : 1;
  v.T = from + angleDelta(from, want) * k;

  return v;
}

function hatYarnPorts(hat: HatSnap): number {
  return Math.min(4, Math.max(1, hat.palette.length));
}

function angleDelta(a: number, b: number): number {
  let d = b - a;
  d = ((d + 180) % 360) - 180;
  return d;
}

function smoothstep(x: number): number {
  const t = Math.max(0, Math.min(1, x));
  return t * t * (3 - 2 * t);
}

export function currentPhase(prog: Program, pos: number) {
  const { op, t } = opAt(prog, pos);
  return { op, t, phase: phaseAt(cycleOf(op.kind), t), cycle: cycleOf(op.kind) };
}

export function roundOf(hat: HatSnap, num: number): HatRound | undefined {
  return hat.rounds.find((r) => r.num === num);
}
