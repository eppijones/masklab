/**
 * The kinematic chain, DERIVED from AXES. Never hand-written.
 *
 * This file is short on purpose. Every line of hand-typed matrix chain is a
 * chance for the declaration and the geometry to disagree, and that is not a
 * hypothetical: HEKLO shipped exactly that bug in two axes (see axes.ts).
 *
 * A frame is: parent frame, then the axis's own origin offset, then the
 * motion the axis contributes at its current value.
 */

import { AXES, AXIS_BY_ID, type AxisId, type AxisValues, type FrameId } from './axes.ts';
import {
  identity,
  multiply,
  rotationAxisDeg,
  translation,
  type Mat4,
  type Vec3,
} from './mat4.ts';

export type Frames = Record<FrameId, Mat4>;

/** Parent-relative transform contributed by one axis at value v. */
function localOf(id: AxisId, v: number): Mat4 {
  const a = AXIS_BY_ID[id];
  const seat = translation(a.frame.origin);
  if (a.type === 'rotary') {
    return multiply(seat, rotationAxisDeg(a.frame.axis, v));
  }
  const d: Vec3 = [a.frame.axis[0] * v, a.frame.axis[1] * v, a.frame.axis[2] * v];
  return multiply(seat, translation(d));
}

/**
 * Resolve every frame for a set of axis values.
 * Topologically ordered by walking parents, so declaration order in AXES does
 * not matter and a cycle is caught rather than looping forever.
 */
export function frames(values: AxisValues): Frames {
  const out: Partial<Frames> = { base: identity() };
  const pending = new Set<AxisId>(AXES.map((a) => a.id));

  let guard = AXES.length + 1;
  while (pending.size && guard-- > 0) {
    for (const id of [...pending]) {
      const parent = AXIS_BY_ID[id].frame.parent;
      const pm = out[parent];
      if (!pm) continue; // parent not resolved yet
      out[id] = multiply(pm, localOf(id, values[id]));
      pending.delete(id);
    }
  }

  if (pending.size) {
    throw new Error(
      `axis frame graph is not a tree rooted at base — unresolved: ${[...pending].join(', ')}`,
    );
  }
  return out as Frames;
}

/**
 * Structural check, independent of any axis value. Used by the harness.
 * Returns a list of problems; empty means the graph is a well-formed tree.
 */
export function frameGraphProblems(): string[] {
  const problems: string[] = [];
  const ids = new Set<string>(AXES.map((a) => a.id));

  for (const a of AXES) {
    if (a.frame.parent !== 'base' && !ids.has(a.frame.parent)) {
      problems.push(`${a.id}: parent '${a.frame.parent}' is not base and not a declared axis`);
    }
    const [x, y, z] = a.frame.axis;
    if (Math.hypot(x, y, z) < 1e-9) {
      problems.push(`${a.id}: frame.axis is a zero vector`);
    }
  }

  // Every axis must reach 'base' without revisiting itself.
  for (const a of AXES) {
    const seen = new Set<string>([a.id]);
    let cur: FrameId = a.frame.parent;
    while (cur !== 'base') {
      if (seen.has(cur)) {
        problems.push(`${a.id}: frame parent chain contains a cycle at '${cur}'`);
        break;
      }
      seen.add(cur);
      const next = AXES.find((x) => x.id === cur);
      if (!next) break; // already reported above
      cur = next.frame.parent;
    }
  }

  return problems;
}
