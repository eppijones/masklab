export type Position = { patternId: 'ro-ro-ro'; round: number; completed: number };
export type Snapshot = { position: Position; revision: number; source: string; updatedAt: number; operationIds: string[] };
export function validPosition(value: unknown): value is Position {
  if (!value || typeof value !== 'object') return false;
  const p = value as Position;
  return p.patternId === 'ro-ro-ro' && Number.isInteger(p.round) && p.round >= 1 && p.round <= 38
    && Number.isInteger(p.completed) && p.completed >= 0 && p.completed <= (ROUND_COUNTS[p.round - 1] ?? 0);
}
// Generated from the watch's bundled recipe; verified against the web model by sync tests.
const ROUND_COUNTS: number[] = [10, 20, 30, 30, 40, 40, 40, 50, 60, 70, 70, 70, 80, 80, 80, 90, 90, 90, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 110, 120, 120, 120, 120, 132, 144, 144, 144];
export function transition(current: Snapshot, expected: number, operationId: string, position: Position, source: string, now: number): Snapshot | null {
  if (current.operationIds.includes(operationId)) return current;
  if (expected !== current.revision) return null;
  return { position, revision: current.revision + 1, source, updatedAt: now, operationIds: [...current.operationIds.slice(-63), operationId] };
}
