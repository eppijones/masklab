/**
 * The solid intermediate representation.
 *
 * A part's build() returns one of these trees, not a mesh. Two evaluators
 * consume it: cad/eval-manifold.ts (Node, real CSG, emits STL) and
 * cad/eval-three.ts (browser, twin). One declaration, two backends.
 *
 * This is the seam that makes the merge possible at all. invent/heklomat has
 * real printable geometry with no machine model; invent/hatteblokk and
 * invent/heklo have a real machine model with additive, unprintable geometry.
 * They cannot merge by picking one, because the kernels are incompatible.
 * Declaring the shape and evaluating it twice sidesteps the choice.
 *
 * Three inherited bug classes stop existing rather than getting fixed:
 *
 *   - RADIANS vs DEGREES. The predecessors disagreed (heklomat's builder takes
 *     radians, both twins take degrees). Here there is no field named
 *     `rotation` — only `rDeg`. Radians exist solely inside an evaluator body.
 *   - merge(). One of the two inherited implementations silently drops
 *     BufferGeometry indices and renders scrambled triangles. `union` is an IR
 *     node evaluated once, in one place, correctly.
 *   - place(). One inherited implementation MUTATES the geometry it is handed,
 *     so calling it twice double-transforms. The IR is immutable values —
 *     there is nothing to mutate.
 */

export type Vec3 = readonly [number, number, number];
export type Pt2 = readonly [number, number];

/* -------------------------------------------------------------- 2D -------- */

/**
 * A cross-section. Worth having as its own type because manifold's
 * CrossSection is where the capabilities the predecessors lacked actually
 * live: real fillets via offset, slotted holes via hull, draft via extrude.
 */
export type Section =
  | { op: 'circle'; r: number; seg: number }
  | { op: 'rect'; size: Pt2; center: boolean }
  | { op: 'poly'; pts: readonly Pt2[] }
  | { op: 'union2'; children: readonly Section[] }
  | { op: 'subtract2'; base: Section; tools: readonly Section[] }
  | { op: 'intersect2'; children: readonly Section[] }
  | { op: 'hull2'; children: readonly Section[] }
  /**
   * Positive delta grows the profile, negative shrinks it.
   * offset(-r) then offset(+r) rounds every INNER corner;
   * offset(+r) then offset(-r) rounds every OUTER corner.
   * That pair is the only real fillet in this toolkit — see the note on
   * 3D fillets below.
   */
  | { op: 'offset2'; child: Section; delta: number; join: 'Round' | 'Miter' | 'Square'; seg: number }
  | { op: 'at2'; child: Section; t?: Pt2; rDeg?: number };

/* -------------------------------------------------------------- 3D -------- */

/**
 * NOTE ON 3D FILLETS: there are none, deliberately. manifold has no fillet
 * operator, and faking one with a hull of spheres is slow and produces
 * unusable triangle counts. If a part needs a 3D fillet, it is the wrong part
 * — rotate the design so the radius lives in a 2D profile and comes in through
 * offset2. Every part in this machine has so far obeyed that.
 */
export type Solid =
  | { op: 'cube'; size: Vec3; center: boolean }
  | { op: 'cylinder'; h: number; r0: number; r1: number; seg: number; center: boolean }
  | { op: 'sphere'; r: number; seg: number }
  /** Partial revolves are supported (deg < 360) — a C-clip, a cable guide. */
  | { op: 'revolve'; section: Section; seg: number; deg: number }
  /** scaleTop is draft: < 1 gives a self-supporting taper, no supports needed. */
  | { op: 'extrude'; section: Section; h: number; div: number; twistDeg: number; scaleTop: Pt2 }
  | { op: 'union'; children: readonly Solid[] }
  | { op: 'subtract'; base: Solid; tools: readonly Solid[] }
  | { op: 'intersect'; children: readonly Solid[] }
  | { op: 'hull'; children: readonly Solid[] }
  | { op: 'at'; child: Solid; t?: Vec3; rDeg?: Vec3 };

/** Ops the three.js evaluator cannot honour, because three has no CSG. */
export const CSG_ONLY_OPS: ReadonlySet<Solid['op']> = new Set(['subtract', 'intersect', 'hull']);

/** Walk a solid tree, yielding every node. Used by the harness. */
export function* walk(s: Solid): Generator<Solid> {
  yield s;
  switch (s.op) {
    case 'union':
    case 'intersect':
    case 'hull':
      for (const c of s.children) yield* walk(c);
      break;
    case 'subtract':
      yield* walk(s.base);
      for (const t of s.tools) yield* walk(t);
      break;
    case 'at':
      yield* walk(s.child);
      break;
    default:
      break;
  }
}

/** True if this tree contains an op three.js cannot evaluate faithfully. */
export function needsCsg(s: Solid): boolean {
  for (const n of walk(s)) if (CSG_ONLY_OPS.has(n.op)) return true;
  return false;
}
