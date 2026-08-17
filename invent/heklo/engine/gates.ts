/**
 * The Løkkebånd: a closed chain of identical stitch-gates.
 * Cardinality IS the working stitch count. Increase = inject one link.
 */

import { chainRadius, MAX_GATES, MIN_GATES, STITCH_W_MM } from './units.ts';

export interface Gate {
  /** Stable id, even as neighbours are injected. */
  id: number;
  /** Slot index 0..n-1 around the ring. Slot 0 is at the station when C = 0. */
  slot: number;
}

export interface GateChain {
  gates: Gate[];
  nextId: number;
}

export function makeChain(n: number): GateChain {
  const count = Math.max(MIN_GATES, Math.min(MAX_GATES, Math.round(n)));
  return {
    nextId: count,
    gates: Array.from({ length: count }, (_, slot) => ({ id: slot, slot })),
  };
}

/**
 * Insert a new gate after `atSlot` (the working V). Used on increase.
 * The new gate becomes the extra mouth; the original V stays put.
 */
export function inject(chain: GateChain, atSlot: number): GateChain {
  if (chain.gates.length >= MAX_GATES) return chain;
  const n = chain.gates.length;
  const slot = ((atSlot % n) + n) % n;
  const inserted: Gate = { id: chain.nextId, slot: slot + 1 };
  const gates = [
    ...chain.gates.slice(0, slot + 1),
    inserted,
    ...chain.gates.slice(slot + 1),
  ].map((g, i) => ({ ...g, slot: i }));
  return { gates, nextId: chain.nextId + 1 };
}

export function eject(chain: GateChain, atSlot: number): GateChain {
  if (chain.gates.length <= MIN_GATES) return chain;
  const n = chain.gates.length;
  const slot = ((atSlot % n) + n) % n;
  const gates = chain.gates.filter((_, i) => i !== slot).map((g, i) => ({ ...g, slot: i }));
  return { gates, nextId: chain.nextId };
}

export function pitchDeg(n: number): number {
  return 360 / Math.max(1, n);
}

export { chainRadius, STITCH_W_MM };
