import type { YarnColor } from './types';

/**
 * Seeded, deterministic "brush streak" field for the NUSA hats.
 *
 * The field lives in a continuous coordinate space that wraps the whole hat:
 *   u = position around the circumference, in wall-chart columns [0, cols)
 *   v = row coordinate: 0..rows-1 = wall chart rows (top to bottom),
 *       negative values = crown rounds above the wall (v = -1 is the crown
 *       round next to the wall, v = vMin is the centre of the crown).
 *
 * Both the 2D wall chart (motif layer) and the 3D crown resolver sample the
 * SAME field, so streaks flow continuously from the crown into the side wall.
 * Everything is derived from the seed — same seed, same hat, always.
 */

/** Small fast deterministic PRNG (mulberry32). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic per-cell hash in [0, 1) — used for ragged edges + dithering. */
export function hash2(seed: number, a: number, b: number): number {
  let h = (seed ^ Math.imul(a + 40503, 2654435761) ^ Math.imul(b + 104729, 40503)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  h = (h ^ (h >>> 16)) >>> 0;
  return h / 4294967296;
}

/**
 * Integer staircase triangle wave: 0, 1, … zig-1, zig-1, … 1, 0, repeating.
 * Flooring keeps the drift on whole stitches (a crochetable staircase rather
 * than an anti-aliased slope). Correct for negative v, i.e. crown rounds.
 *
 * Shared by the diagonal-stripe bands and by the kinks in a slash centreline —
 * both need sideways travel that lands on stitches you can actually count.
 */
export function zigzagStep(v: number, zig: number): number {
  const cycle = 2 * zig;
  const t = ((v % cycle) + cycle) % cycle;
  return Math.floor(t < zig ? t : cycle - t);
}

export interface StreakParams {
  seed: number;
  /** Streaks per 100 columns of circumference. */
  density: number;
  /** Columns of sideways drift per row of depth (diagonal slope). */
  slope: number;
  minLen: number;
  maxLen: number;
  /** Base thickness in stitches (each streak varies 1..thickness+1). */
  thickness: number;
  /**
   * Floor on the half-width, in stitches. Below ~0.75 the tapering tips thin
   * out to isolated single stitches — visually fine on paper, miserable to
   * crochet. Raise it to keep every part of a streak at least two stitches
   * wide; the tips then end bluntly instead of feathering away.
   */
  minHalfW: number;
  /** Row-space coverage: vMin (crown centre, negative) .. vMax (brim edge). */
  vMin: number;
  vMax: number;
}

export interface Streak {
  u0: number;
  v0: number;
  len: number;
  slope: number;
  thickness: number;
  id: number;
}

/** Generate the deterministic streak set for a given circumference. */
export function buildStreaks(cols: number, p: StreakParams): Streak[] {
  const rnd = mulberry32(p.seed);
  const span = p.vMax - p.vMin;
  const count = Math.max(1, Math.round((cols / 100) * p.density));
  const streaks: Streak[] = [];
  for (let i = 0; i < count; i++) {
    const len = p.minLen + rnd() * (p.maxLen - p.minLen);
    streaks.push({
      u0: rnd() * cols,
      v0: p.vMin + rnd() * (span - len * 0.4),
      len,
      slope: p.slope * (0.75 + rnd() * 0.5),
      thickness: 1 + rnd() * p.thickness,
      id: i,
    });
  }
  return streaks;
}

/** Circular distance between two u positions on a cols-wide cylinder. */
function circDist(a: number, b: number, cols: number): number {
  let d = Math.abs(a - b) % cols;
  if (d > cols / 2) d = cols - d;
  return d;
}

/**
 * Is the point (u, v) inside any streak? Edges are ragged: the local width
 * varies per row via a deterministic hash, and streaks taper at both ends —
 * this is what makes the crochet grid read as brush strokes, not aliasing.
 */
export function streakAt(
  streaks: Streak[],
  cols: number,
  seed: number,
  u: number,
  v: number,
  minHalfW = 0.28,
): boolean {
  for (const s of streaks) {
    const t = v - s.v0;
    if (t < 0 || t > s.len) continue;
    const center = s.u0 + s.slope * t;
    // Taper: full width mid-streak, thin at the tips.
    const tip = Math.min(t, s.len - t) / Math.max(1, s.len * 0.35);
    const taper = Math.min(1, tip);
    // Ragged edge: per-row jitter of the half-width.
    const jitter = hash2(seed + s.id * 7919, Math.round(v * 2), s.id) * 1.2 - 0.35;
    const halfW = Math.max(minHalfW, (s.thickness * taper + jitter) / 2);
    if (circDist(u, center, cols) <= halfW) return true;
  }
  return false;
}

/* ========================= lightning slashes (NORWAY'26) ========================= */

/**
 * The NORWAY'26 fabric: a handful of very long, very thick strokes that taper
 * to a point at BOTH ends and bend slightly as they fall, like the sprayed
 * lightning on the kit.
 *
 * Deliberately unlike `streaks`, which scatters many jittered brush marks and
 * reads as speckle on a crochet grid. Here there is no per-row jitter at all:
 * the edges are clean staircases, the count is low, and the strokes are placed
 * on an even ring around the hat so the negative space between them stays as
 * much of the design as the strokes themselves.
 */
/**
 * A BUNDLE is what turns six lonely strokes into the kit's directional energy:
 * one thick core with two to four thinner companions running alongside it, at
 * irregular gaps, in different inks, staggered along their length. Every value
 * is drawn from the seed, so a bundle is as reproducible as a single stroke —
 * and, unlike per-row jitter, it never degenerates into speckle, because each
 * companion is still one long clean stroke.
 */
export interface SlashBundleSpec {
  /** Companions per core. The kit photography reads as 2–4. */
  companions: number;
  /** Sideways step from one companion to the next, in stitches. */
  spread: number;
  /** Companion belly half-width, as a fraction of the core's. */
  widthMin: number;
  widthMax: number;
  /** Rows of along-stroke offset, so companion tips never line up. */
  stagger: number;
  /**
   * Shortest a companion may be, as a fraction of the field height. Below 1 the
   * companions read as broken marks travelling with the core instead of a
   * ruled set of parallel lines.
   */
  lenMin: number;
}

export interface SlashParams {
  seed: number;
  /** Bundle positions around the whole hat. The photo runs 5–8. */
  count: number;
  /** Columns of sideways drift per row of depth. */
  slope: number;
  /** Half-width at the belly, in stitches (2.5 → a 5-stitch-wide stroke). */
  width: number;
  /** Every Nth stroke is drawn thin, for a thick/thin rhythm. 0 = all equal. */
  thinEvery: number;
  /** Deterministic ± variation of the core width, as a fraction (0 = uniform). */
  widthVary: number;
  /**
   * Extra sideways drift accumulated over the stroke's length, as a factor of
   * `slope`. 0 = dead straight; 0.6 = a noticeable bend by the tail.
   */
  curve: number;
  /**
   * Controlled kinks in the centreline: the stroke steps sideways on the same
   * integer staircase the diagonal-stripe motif uses, reversing every
   * `kinkRows` rows. 0 = a clean sweep. Each stroke gets its own phase, so the
   * kinks stagger round the hat instead of banding into one chevron.
   */
  kinkRows: number;
  /** Stitches of sideways travel per kink step. */
  kinkAmp: number;
  /**
   * How pointed the ends are. 1 = a long sine taper (thin over most of its
   * length); 0.4 keeps the stroke at full width from the crown to the rim and
   * only points at the very tips.
   */
  tipSharp: number;
  /** Sideways gap from stroke to its echo, in stitches. */
  echoGap: number;
  /** Belly half-width of the echo. */
  echoWidth: number;
  /** Row-space coverage: vMin (crown centre, negative) .. vMax (brim edge). */
  vMin: number;
  vMax: number;
  bundle?: SlashBundleSpec;
}

export interface Slash {
  u0: number;
  v0: number;
  len: number;
  slope: number;
  curve: number;
  halfW: number;
  /** Kink staircase: period in rows, amplitude in stitches, per-stroke phase. */
  kinkRows: number;
  kinkAmp: number;
  kinkPhase: number;
  tipSharp: number;
  /** Index into the motif's colour list. */
  colorIdx: number;
  id: number;
}

export function slashParamsDefaults(): Omit<SlashParams, 'seed' | 'vMin' | 'vMax'> {
  return {
    count: 6,
    slope: 2.2,
    width: 2.4,
    thinEvery: 0,
    widthVary: 0,
    curve: 0.5,
    kinkRows: 0,
    kinkAmp: 0,
    tipSharp: 0.7,
    echoGap: 4,
    echoWidth: 1.0,
  };
}

/**
 * Deterministic stroke set. Bundles are seeded onto an even ring around the
 * circumference (slot i sits near i·cols/count) so they never clump — clumping
 * is what made the old streak field read as noise. Inside a bundle everything
 * is irregular; between bundles everything is regular. That contrast is the
 * whole look.
 */
export function buildSlashes(
  cols: number,
  p: SlashParams,
  colorCount: number,
  echoColorIdx: number,
): Slash[] {
  const span = p.vMax - p.vMin;
  const out: Slash[] = [];
  const slot = cols / Math.max(1, p.count);
  // The seed no longer scatters the bundles — it only rotates the whole ring,
  // so a kit can be turned to sit differently on the head without the field
  // ever losing its order.
  const rnd = mulberry32(p.seed);
  const phase = (rnd() * slot) % cols;
  const inks = Math.max(1, colorCount);

  const common = {
    slope: p.slope,
    curve: p.curve,
    kinkRows: p.kinkRows,
    kinkAmp: p.kinkAmp,
    tipSharp: p.tipSharp,
  };

  for (let i = 0; i < p.count; i++) {
    const u0 = (phase + i * slot) % cols;
    // Per-bundle stream: same seed → same bundle, and adding a bundle never
    // disturbs the ones before it.
    const brnd = mulberry32(p.seed + i * 9176);
    const thin = p.thinEvery > 0 && i % p.thinEvery === p.thinEvery - 1;
    const vary = 1 + (brnd() - 0.5) * p.widthVary;
    out.push({
      ...common,
      u0,
      v0: p.vMin,
      len: span,
      halfW: (thin ? p.width * 0.45 : p.width) * vary,
      kinkPhase: Math.round(brnd() * Math.max(1, p.kinkRows) * 2),
      colorIdx: i % inks,
      id: i,
    });

    const b = p.bundle;
    for (let j = 0; b && j < b.companions; j++) {
      // Alternate sides of the core, stepping further out each pair, with an
      // irregular gap so the bundle never reads as a ruled set of tramlines.
      const side = j % 2 === 0 ? 1 : -1;
      const rank = Math.floor(j / 2) + 1;
      const gap = p.width + b.spread * (rank - 1 + 0.45 + brnd() * 0.85);
      const halfW = p.width * (b.widthMin + brnd() * (b.widthMax - b.widthMin));
      const len = span * (b.lenMin + brnd() * (1 - b.lenMin));
      const v0 =
        p.vMin +
        Math.min(span - len, Math.max(0, (span - len) * brnd() + (brnd() - 0.5) * b.stagger));
      out.push({
        ...common,
        u0: (((u0 + side * gap) % cols) + cols) % cols,
        v0,
        len,
        halfW,
        kinkPhase: Math.round(brnd() * Math.max(1, p.kinkRows) * 2),
        // Companions take the inks the core did not, so a bundle carries the
        // whole palette rather than repeating one colour.
        colorIdx: (i + 1 + j) % inks,
        id: 100 * (i + 1) + j,
      });
    }

    if (echoColorIdx >= 0) {
      // A thin companion trailing every stroke at a fixed gap — the paired
      // line that runs alongside the main sweep in the kit photography.
      out.push({
        ...common,
        u0: (u0 + p.echoGap + p.width) % cols,
        v0: p.vMin,
        len: span,
        halfW: p.echoWidth,
        kinkPhase: 0,
        colorIdx: echoColorIdx,
        id: 10000 + i,
      });
    }
  }
  return out;
}

/** Centre column of a stroke at depth `t` along its length. */
function slashCenter(s: Slash, t: number): number {
  const f = s.len > 0 ? t / s.len : 0;
  const kink =
    s.kinkRows > 0
      ? s.kinkAmp * zigzagStep(s.v0 + t + s.kinkPhase, s.kinkRows)
      : 0;
  return s.u0 + s.slope * t * (1 + s.curve * f) + kink;
}

/**
 * Which stroke — if any — owns the cell at (u, v)? Returns the colour index, or
 * -1 for bare ground. Where two strokes overlap the more deeply covered one
 * wins, which keeps crossings crisp instead of order-dependent.
 */
export function slashAt(
  slashes: Slash[],
  cols: number,
  u: number,
  v: number,
  minHalfW = 0,
): number {
  let bestIdx = -1;
  let bestDepth = 0;
  for (const s of slashes) {
    const t = v - s.v0;
    if (t < 0 || t > s.len) continue;
    // Pointed at both ends, full width across the belly. A low tipSharp keeps
    // the stroke at full width from the crown all the way to the rim, so the
    // bundle reads as one continuous travelling mark.
    const prof = Math.pow(Math.sin((Math.PI * t) / s.len), Math.max(0.05, s.tipSharp));
    // The floor keeps a stroke from clipping to a single stitch on the narrow
    // crown rounds (see the caller: it passes the round's column spacing).
    // Only the belly is floored — the outer fifth still tapers to a point.
    const w = s.halfW * prof;
    const halfW = prof > 0.2 ? Math.max(minHalfW, w) : w;
    if (halfW <= 0) continue;
    const depth = halfW - circDist(u, slashCenter(s, t), cols);
    if (depth >= 0 && depth > bestDepth) {
      bestDepth = depth;
      bestIdx = s.colorIdx;
    }
  }
  return bestIdx;
}

/* ===================== diagonal stripes (training kit) ===================== */

export interface StripeBand {
  color: YarnColor;
  /** Width of the band, measured along the diagonal, in stitches. */
  w: number;
}

export interface StripeParams {
  seed: number;
  /** Columns of sideways drift per row of depth. */
  slope: number;
  bands: StripeBand[];
  /** Rows of checker-dithered blending at each band boundary (0 = hard edge). */
  dither: number;
  /**
   * Rows per diagonal leg. 0 = plain one-way diagonal. Any positive value makes
   * the drift reverse every `zigRows` rows, so the bands read as jagged
   * lightning bolts instead of straight stripes.
   */
  zigRows: number;
}

/**
 * Full-surface repeating diagonal bands with dithered (heathered) boundaries.
 * The band period is stretched to divide the circumference exactly, so the
 * pattern meets itself seamlessly at the round seam.
 */
export function stripeColorAt(
  cols: number,
  p: StripeParams,
  u: number,
  v: number,
): YarnColor {
  const rawPeriod = p.bands.reduce((a, b) => a + b.w, 0);
  // Seamless wrap: use a period that divides cols, scale bands onto it.
  const reps = Math.max(1, Math.round(cols / rawPeriod));
  const period = cols / reps;
  const scale = period / rawPeriod;

  const drift =
    p.zigRows > 0 ? p.slope * zigzagStep(v, p.zigRows) : p.slope * v;
  let d = (u - drift) % period;
  if (d < 0) d += period;

  let acc = 0;
  for (let i = 0; i < p.bands.length; i++) {
    const band = p.bands[i];
    const w = band.w * scale;
    const local = d - acc;
    if (local >= 0 && local < w) {
      if (p.dither > 0) {
        const r = hash2(p.seed, Math.round(u * 3) + 31 * Math.round(v), i);
        // Blend into the PREVIOUS band near the leading edge...
        if (local < p.dither && r > 0.45 + local / (p.dither * 2)) {
          const prev = p.bands[(i + p.bands.length - 1) % p.bands.length];
          return prev.color;
        }
        // ...and into the NEXT band near the trailing edge.
        const fromEnd = w - local;
        if (fromEnd < p.dither && r < 0.55 - fromEnd / (p.dither * 2)) {
          const next = p.bands[(i + 1) % p.bands.length];
          return next.color;
        }
      }
      return band.color;
    }
    acc += w;
  }
  return p.bands[p.bands.length - 1].color;
}
