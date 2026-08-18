/**
 * Millimetres, degrees, Z up. The only place a physical constant is written.
 *
 * Every number here is either derived from the parent app's own gauge or
 * measured off a real part. Where a value is a guess, it says so and carries
 * the experiment that will replace it.
 *
 * Dependency-free on purpose: this module is imported by the browser twin, the
 * Node STL builder and the verification harness. Adding `three` here would
 * break two of the three.
 */

/* ---------------------------------------------------------------- gauge --- */

/**
 * One stitch width. The parent app derives this per hat as
 *   suMm = omkrets_cm * 10 / bodyCount
 * which for the standard dame/56 cm/100-stitch hat is exactly 5.6 mm.
 * (invent/heklomat/tools/dump-patterns.ts writes the same number into
 * .profile.json, so the mandrel and the machine agree by construction.)
 */
export const STITCH_W_MM = 5.6;

/** Row height as a fraction of width — matches src/lib/hatGeometry.ts STITCH_H. */
export const STITCH_H_RATIO = 0.85;
export const STITCH_H_MM = STITCH_W_MM * STITCH_H_RATIO;

/** Hook the catalog patterns are written for. */
export const HOOK_MM = 4.0;

/** DK / Cotton 8-8 doubled, measured relaxed. Replaced by a caliper reading at T0. */
export const YARN_DIA_MM = 2.1;

/* ----------------------------------------------------------- the sizes --- */

/**
 * The machine is not built for one hat. Circumference and round count are
 * parameters, and every dependent number on the site is recomputed from them.
 *
 * The floor and ceiling are set by physical things, not by taste:
 *  - 50 cm is a small child's head; below it the crown increase rounds collide.
 *  - 62 cm is where the WALL radius approaches the 120 mm printable former.
 *    The brim flares past the former's edge at every size and is meant to —
 *    the mandrel is a take-down datum, not a mould.
 * The parent app ships 52-60; the machine covers that span plus a margin, at
 * about 1 cm of resolution (see bodyCountFor in machine/programme.ts).
 */
export const SIZE_CM = { min: 50, nominal: 56, max: 62 } as const;

/* bodyCountFor and crownRoundsFor live in machine/programme.ts, which owns the
   round schedule. A second copy here would be a second thing to be wrong. */

/**
 * Rounds are a parameter too — a shallower or deeper hat is the same machine
 * programme with a different round count.
 *
 * The floor is structural, not a preference: the crown schedule is 19 rounds
 * and the brim is 9, and neither can be shortened without the crown refusing
 * to lie flat or the brim ruffling. 19 + 9 + one wall round = 29. The ceiling
 * is where the fabric runs off the bottom of the former.
 */
export const ROUNDS = { min: 29, nominal: 42, max: 58 } as const;

/* ------------------------------------------------------------ the gates --- */

/**
 * Gate throat width — and the constraint that reshaped the comb.
 *
 * The throat has to pass the HOOK NOSE with both legs of the stitch mouth
 * beside it, so the harness asserts:
 *
 *   throat >= hookNose + 2 * yarnDia + THROAT_MARGIN_MM
 *
 * With a 3.0 mm printed nose and DK cotton that is 3.0 + 4.2 + 0.6 = 7.8 mm.
 * HEKLO inherited 4.2 mm (invent/heklo/cad/primitives.ts:60), which was already
 * marginal against its own 1.8 mm machine needle.
 *
 * That created a real contradiction, found by the verification harness rather
 * than by a printed part that did not work: a gate must be narrower than the
 * stitch pitch (5.6 mm) so gates can sit one per stitch, which caps the throat
 * at 5.6 - 2*wall = 3.0 mm. Less than the diameter of the tool alone.
 *
 * Resolved by STAGGERING the comb into two rows. Alternate gates sit on two
 * rows, so each gate may be up to two pitches wide while the mouths it holds
 * stay one pitch apart. That buys 11.2 mm of width and makes the mechanism
 * dimensionally possible at all.
 *
 * The sweep brackets the requirement instead of sitting below it. Whichever
 * width wins at G2 becomes the constant; until then none of these is a result.
 */
/**
 * Nominal is 8.0 mm. With a 3.0 mm printed hook nose and DK cotton the
 * requirement is 3.0 + 4.2 + 0.6 = 7.8 mm, and the two-row ceiling is
 * 10.6 - 2 x 1.3 = 8.0. There is 0.2 mm in hand.
 *
 * That margin is the tightest number in the machine and it is stated here
 * rather than buried. If T2 shows the V is held too loosely at 8.0, the fix is
 * NOT a wider throat — there is no room at two rows. It is a thinner hook nose:
 * at 2.4 mm the requirement drops to 7.2 mm and the margin becomes 0.8.
 * The hook is a 4 g print, so that experiment costs a reprint.
 */
export const GATE_THROAT_MM = 8.0;
export const GATE_THROAT_SWEEP_MM = [6.0, 7.0, 7.5, 8.0] as const;
export const THROAT_MARGIN_MM = 0.6;

/** Two-row stagger: a gate may be two pitches wide, less a running clearance. */
export const COMB_ROWS = 2;
export const GATE_W_MM = COMB_ROWS * STITCH_W_MM - 0.6; // 10.6
export const GATE_D_MM = 9.0;
export const GATE_H_MM = 9.5;
export const GATE_WALL_MM = 1.3;

/**
 * THE STAGGER, and the assumption it rests on.
 *
 * An 8 mm aperture cannot repeat every 5.6 mm along a line — that is arithmetic,
 * not opinion, and it is the constraint that shapes the whole comb. Alternate
 * gates therefore sit on two rows, which buys each gate two pitches of width
 * while the mouths it holds stay one pitch apart along the edge.
 *
 * The earlier revision staggered the rows RADIALLY, by a full gate depth plus
 * clearance — 10.2 mm. That silently required every second stitch on the
 * working edge to be pulled 10 mm out of the circle its neighbours sit on,
 * which no edge of DK cotton will do without distorting the round. The
 * verification harness had no way to see it because no check compared the row
 * offset with anything.
 *
 * The stagger is now VERTICAL and CONVERGENT: alternate gates sit +/- 3 mm in
 * height and tilt back toward the same mouth circle, so every throat presents
 * at the same radius and the only excursion asked of the fabric is +/- 3 mm of
 * height across one stitch. Fabric tolerates that; it is less than half a row.
 *
 * This is an assumption, not a result. T1 is what tests it.
 */
export const COMB_ROW_DZ_MM = 3.0;
export const COMB_ROW_TILT_DEG = 14;
/** Body depth of the comb rail — two gate depths plus running clearance. */
export const COMB_ROW_OFFSET_MM = GATE_D_MM + 1.2;

/** Aperture pitch a single row could achieve. Compared with STITCH_W_MM by the harness. */
export const GATE_PITCH_MM = GATE_THROAT_MM + 2 * GATE_WALL_MM;

/**
 * The inequality the whole mechanism lives or dies on: the throat must pass the
 * hook nose with both legs of the stitch mouth beside it.
 *
 * Written as a function rather than a constant so the harness, the site and the
 * part builder all read the same arithmetic instead of three copies of 7.8.
 */
export function throatRequirementMm(noseMm = HOOK_NOSE_MM, yarnMm = YARN_DIA_MM): number {
  return noseMm + 2 * yarnMm + THROAT_MARGIN_MM;
}

/** How many rows the comb needs so an aperture of `throat` can repeat at pitch. */
export function combRowsNeeded(throat = GATE_THROAT_MM, pitch = STITCH_W_MM): number {
  return Math.ceil((throat + 2 * GATE_WALL_MM) / pitch);
}

/** Teeth on the presentation wheel. Eight, inherited from HEKLOMAT. */
export const WHEEL_TEETH = 8;

/**
 * Gates in the fixed retention comb — the part that makes this machine
 * different from either parent. Ten is one full magic-ring's worth, so the
 * comb can hold an entire crown start.
 */
export const COMB_GATES = 10;

/** Bench rig builds a three-gate slice of the comb. */
export const COMB_GATES_BENCH = 3;

/* ----------------------------------------------------------------- hook --- */

/**
 * The hook is PRINTED, and there is no needle on this machine.
 *
 * Every predecessor design reached for a latch needle — a knitting-machine
 * spare or a rya latch hook — because a latch is how knitting machines hold a
 * loop closed while the next one passes. This machine does not need one: the
 * GATE holds the loop open, at a known pose, which is the entire point of the
 * gate. A latch would be a second mechanism doing the same job, and it would be
 * the only sharp steel part in a machine that otherwise runs on printed plastic
 * and screws.
 *
 * So the tool is a plain hook, printed. Three consequences, all good:
 *   - nothing on the machine is sharp, which changes what it is safe to leave
 *     running in a room with people in it;
 *   - the nose diameter becomes a PARAMETER rather than whatever the craft shop
 *     had, and nose diameter is one of the two terms in the throat inequality;
 *   - it is a consumable. Cotton abrades a printed nose; print five, swap when
 *     the yarn starts catching, and log which round it happened on.
 *
 * The nose is what passes through the throat, so the nose sets the requirement.
 * The shaft behind it is thicker because a 3 mm printed beam 42 mm long is a
 * lever that will snap, and it never enters the gate.
 */
export const HOOK_NOSE_MM = 3.0;
export const HOOK_SHAFT_MM = 5.0;
export const HOOK_FREE_LEN_MM = 42;
/** Depth of the hook's yarn groove. Must swallow one strand, not two. */
export const HOOK_GROOVE_MM = 2.4;

/* ----------------------------------------------------------- envelope ----- */

/** Bambu Lab X1 Carbon. The 250 limit leaves 6 mm of brim clearance. */
export const PLATE_MM = 256;
export const MAX_PART_MM = 250;

/** Standard nozzle. Minimum wall is two extrusions. */
export const NOZZLE_MM = 0.4;
export const MIN_WALL_MM = NOZZLE_MM * 2;

/* ------------------------------------------------------------- fit class -- */

/**
 * Diametral clearance, hole minus shaft, in millimetres. PETG on a well-tuned
 * X1C comes out ~0.1 mm undersize on holes, which is already absorbed here.
 *
 * `press` is deliberately generous compared with a metal press fit: an
 * interference fit in PETG splits the part instead of gripping it.
 */
export const FIT = {
  press: { min: 0.05, max: 0.15 },
  slip: { min: 0.15, max: 0.35 },
  clear: { min: 0.4, max: 1.2 },
} as const;
export type FitClass = keyof typeof FIT;

/* ---------------------------------------------------------------- radii --- */

/** Radius of a round of n stitches. Same relation as src/lib/hatGeometry.ts. */
export function ringRadius(n: number): number {
  return (n * STITCH_W_MM) / (2 * Math.PI);
}

/** Angular pitch of one stitch in a round of n, degrees. */
export function stitchPitchDeg(n: number): number {
  return 360 / Math.max(1, n);
}
