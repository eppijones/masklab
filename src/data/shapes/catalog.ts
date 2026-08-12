/**
 * The shape catalogue.
 *
 * Every motif is defined as geometry over a unit square, sampled once per
 * stitch — never as artwork that gets scaled afterwards. That is the whole
 * point: a hat band is roughly 110 stitches around and 10–35 rows high, so a
 * shape has to be re-drawn at the size it will actually be crocheted, not
 * shrunk into mush. A handful of organic motifs (the reindeer, the longship)
 * are authored stitch by stitch instead, because no amount of geometry makes
 * an antler read at fourteen rows.
 *
 * The design rules baked in here: big silhouettes, few colours, and enough
 * negative space that the shape still reads from across a stadium.
 */

/** 0 = nothing, 1 = fill, 2 = second colour, 3 = third colour. */
export type Ink = 0 | 1 | 2 | 3;

export type ShapeCategory = 'basic' | 'football' | 'nordic' | 'badge' | 'pattern';

export interface ShapeSpec {
  id: string;
  category: ShapeCategory;
  /** Norwegian label for the picker. */
  label: string;
  /** Natural width/height, used for the size it arrives at. */
  aspect: number;
  /** Below this it stops reading as itself. Drives the craft check. */
  minW: number;
  minH: number;
  /** Continuous definition: x, y in [0,1], y down. */
  fn?: (x: number, y: number) => Ink;
  /** Authored stitch master: '.' nothing, '1'..'3' colour slots. */
  pixels?: string[];
  /** Fills its whole box and repeats — outline and fill controls do not apply. */
  tiling?: boolean;
  /** How many colour slots the shape actually uses (1–3). */
  inks: number;
}

// ---------------------------------------------------------------- primitives

const TAU = Math.PI * 2;

function disc(x: number, y: number, cx: number, cy: number, r: number): boolean {
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= r * r;
}

function ellipse(
  x: number,
  y: number,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
): boolean {
  const dx = (x - cx) / rx;
  const dy = (y - cy) / ry;
  return dx * dx + dy * dy <= 1;
}

function box(
  x: number,
  y: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): boolean {
  return x >= x0 && x <= x1 && y >= y0 && y <= y1;
}

function poly(pts: [number, number][], x: number, y: number): boolean {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

/** Points of an n-pointed star, outer radius 0.5 around the centre. */
function starPts(n: number, inner: number, rot = -Math.PI / 2): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 === 0 ? 0.5 : 0.5 * inner;
    const a = rot + (i * Math.PI) / n;
    pts.push([0.5 + r * Math.cos(a), 0.5 + r * Math.sin(a)]);
  }
  return pts;
}

/** A band of half-thickness `t` around the curve y = f(x). */
function curveBand(
  y: number,
  fy: number,
  t: number,
): boolean {
  return Math.abs(y - fy) <= t;
}

const STAR5 = starPts(5, 0.42);
const STAR8 = starPts(8, 0.45, 0);

// ------------------------------------------------------------------- basic

const BASIC: ShapeSpec[] = [
  {
    id: 'rect',
    category: 'basic',
    label: 'Rektangel',
    aspect: 1.6,
    // A single-stitch rule is a real design element, not a broken rectangle.
    minW: 1,
    minH: 1,
    inks: 1,
    fn: () => 1,
  },
  {
    id: 'circle',
    category: 'basic',
    label: 'Sirkel',
    aspect: 1,
    minW: 5,
    minH: 5,
    inks: 1,
    fn: (x, y) => (disc(x, y, 0.5, 0.5, 0.5) ? 1 : 0),
  },
  {
    id: 'triangle',
    category: 'basic',
    label: 'Trekant',
    aspect: 1.1,
    minW: 5,
    minH: 5,
    inks: 1,
    fn: (x, y) => (poly([[0.5, 0], [1, 1], [0, 1]], x, y) ? 1 : 0),
  },
  {
    id: 'diamond',
    category: 'basic',
    label: 'Rute',
    aspect: 1,
    minW: 5,
    minH: 5,
    inks: 1,
    fn: (x, y) => (Math.abs(x - 0.5) + Math.abs(y - 0.5) <= 0.5 ? 1 : 0),
  },
  {
    id: 'star',
    category: 'basic',
    label: 'Stjerne',
    aspect: 1,
    minW: 7,
    minH: 7,
    inks: 1,
    fn: (x, y) => (poly(STAR5, x, y) ? 1 : 0),
  },
  {
    id: 'heart',
    category: 'basic',
    label: 'Hjerte',
    aspect: 1.05,
    minW: 6,
    minH: 6,
    inks: 1,
    fn: (x, y) => {
      // Two lobes and a point — cheaper and rounder on a grid than the
      // implicit curve, which loses its cleft below twenty stitches.
      if (disc(x, y, 0.29, 0.3, 0.29) || disc(x, y, 0.71, 0.3, 0.29)) return 1;
      return poly([[0.02, 0.34], [0.98, 0.34], [0.5, 1]], x, y) ? 1 : 0;
    },
  },
  {
    id: 'lightning',
    category: 'basic',
    label: 'Lyn',
    aspect: 0.6,
    minW: 4,
    minH: 7,
    inks: 1,
    fn: (x, y) =>
      poly(
        [
          [0.62, 0], [0.12, 0.55], [0.45, 0.55],
          [0.34, 1], [0.9, 0.4], [0.55, 0.4],
        ],
        x,
        y,
      )
        ? 1
        : 0,
  },
  {
    id: 'chevron',
    category: 'basic',
    label: 'Sikksakk-pil',
    aspect: 1.4,
    minW: 6,
    minH: 4,
    inks: 1,
    fn: (x, y) => (curveBand(y, 0.25 + Math.abs(x - 0.5), 0.2) ? 1 : 0),
  },
  {
    id: 'wave',
    category: 'basic',
    label: 'Bølge',
    aspect: 3,
    minW: 10,
    minH: 3,
    inks: 1,
    fn: (x, y) =>
      curveBand(y, 0.5 - 0.28 * Math.sin(x * TAU), 0.2) ? 1 : 0,
  },
  {
    id: 'zigzag',
    category: 'basic',
    label: 'Sikksakk',
    aspect: 3,
    minW: 10,
    minH: 3,
    inks: 1,
    fn: (x, y) => {
      const t = ((x * 2) % 1) * 2;
      const tri = t <= 1 ? t : 2 - t;
      return curveBand(y, 0.22 + tri * 0.56, 0.2) ? 1 : 0;
    },
  },
];

// ---------------------------------------------------------------- football

const FOOTBALL: ShapeSpec[] = [
  {
    id: 'ball',
    category: 'football',
    label: 'Fotball',
    aspect: 1,
    minW: 9,
    minH: 9,
    inks: 2,
    fn: (x, y) => {
      if (!disc(x, y, 0.5, 0.5, 0.5)) return 0;
      // Centre pentagon plus the three that catch the light on the rim: any
      // more and the ball turns into a grey blur at fifteen stitches.
      if (poly(starPts(5, 1, -Math.PI / 2).filter((_, i) => i % 2 === 0)
        .map(([px, py]) => [0.5 + (px - 0.5) * 0.46, 0.5 + (py - 0.5) * 0.46] as [number, number]), x, y)) {
        return 2;
      }
      for (const a of [-Math.PI / 2, -Math.PI / 2 + TAU / 3, -Math.PI / 2 + (2 * TAU) / 3]) {
        const cx = 0.5 + 0.46 * Math.cos(a + Math.PI);
        const cy = 0.5 + 0.46 * Math.sin(a + Math.PI);
        if (disc(x, y, cx, cy, 0.17)) return 2;
      }
      return 1;
    },
  },
  {
    id: 'goal',
    category: 'football',
    label: 'Mål',
    aspect: 1.7,
    minW: 12,
    minH: 8,
    inks: 2,
    fn: (x, y) => {
      const post = 0.1;
      if (box(x, y, 0, 0, 1, post)) return 1;
      if (box(x, y, 0, 0, post * 0.9, 1) || box(x, y, 1 - post * 0.9, 0, 1, 1)) return 1;
      if (y > 0.94) return 1;
      // Net: a coarse mesh, never finer than every fourth stitch.
      const gx = ((x - 0.1) * 8) % 1;
      const gy = ((y - 0.1) * 5) % 1;
      return gx < 0.16 || gy < 0.2 ? 2 : 0;
    },
  },
  {
    id: 'trophy',
    category: 'football',
    label: 'Pokal',
    aspect: 0.85,
    minW: 8,
    minH: 10,
    inks: 1,
    fn: (x, y) => {
      // Cup
      if (poly([[0.2, 0.08], [0.8, 0.08], [0.66, 0.5], [0.34, 0.5]], x, y)) return 1;
      // Handles
      const hx = Math.abs(x - 0.5);
      if (hx > 0.16 && hx < 0.42 && y > 0.1 && y < 0.38) {
        const d = Math.hypot(hx - 0.29, y - 0.24);
        if (d > 0.08 && d < 0.14) return 1;
      }
      if (box(x, y, 0.44, 0.5, 0.56, 0.74)) return 1;
      if (box(x, y, 0.28, 0.74, 0.72, 0.86)) return 1;
      if (box(x, y, 0.14, 0.86, 0.86, 1)) return 1;
      return 0;
    },
  },
  {
    id: 'scarf',
    category: 'football',
    label: 'Skjerf',
    aspect: 1.5,
    minW: 10,
    minH: 8,
    inks: 2,
    fn: (x, y) => {
      if (y < 0.12 || y > 0.78) {
        // Fringe at both ends.
        if (y > 0.78 && y < 0.95) return Math.floor(x * 14) % 2 === 0 ? 1 : 0;
        if (y < 0.12) return Math.floor(x * 14) % 2 === 0 ? 1 : 0;
        return 0;
      }
      const band = Math.floor((y - 0.12) / ((0.78 - 0.12) / 5));
      return band % 2 === 0 ? 1 : 2;
    },
  },
  {
    id: 'jersey',
    category: 'football',
    label: 'Drakt',
    aspect: 1.05,
    minW: 9,
    minH: 9,
    inks: 2,
    fn: (x, y) => {
      const body = box(x, y, 0.22, 0.16, 0.78, 1);
      const sleeveL = poly([[0.22, 0.16], [0.22, 0.52], [0.02, 0.46], [0.06, 0.14]], x, y);
      const sleeveR = poly([[0.78, 0.16], [0.78, 0.52], [0.98, 0.46], [0.94, 0.14]], x, y);
      if (!body && !sleeveL && !sleeveR) return 0;
      // Collar cut out of the shoulders.
      if (poly([[0.38, 0.1], [0.62, 0.1], [0.5, 0.3]], x, y)) return 0;
      if (y < 0.16 && x > 0.34 && x < 0.66) return 0;
      return sleeveL || sleeveR ? 2 : 1;
    },
  },
  {
    id: 'shield',
    category: 'football',
    label: 'Skjold',
    aspect: 0.86,
    minW: 8,
    minH: 9,
    inks: 1,
    fn: (x, y) => {
      if (y < 0.62) return box(x, y, 0, 0, 1, 0.62) ? 1 : 0;
      // Tapered point: the classic crest bottom.
      const t = (y - 0.62) / 0.38;
      return Math.abs(x - 0.5) <= 0.5 * (1 - t * t) ? 1 : 0;
    },
  },
  {
    id: 'crown',
    category: 'football',
    label: 'Krone',
    aspect: 1.3,
    minW: 8,
    minH: 6,
    inks: 1,
    fn: (x, y) => {
      if (y > 0.72) return 1;
      return poly(
        [
          [0, 0.72], [0, 0.05], [0.25, 0.42], [0.5, 0],
          [0.75, 0.42], [1, 0.05], [1, 0.72],
        ],
        x,
        y,
      )
        ? 1
        : 0;
    },
  },
  {
    id: 'pennant',
    category: 'football',
    label: 'Vimpel',
    aspect: 1.5,
    minW: 8,
    minH: 7,
    inks: 2,
    fn: (x, y) => {
      if (x < 0.1) return y > 0.02 ? 2 : 0;
      return poly([[0.1, 0.05], [1, 0.32], [0.1, 0.6]], x, y) ? 1 : 0;
    },
  },
  {
    id: 'pitch',
    category: 'football',
    label: 'Bane',
    aspect: 1.5,
    minW: 14,
    minH: 9,
    inks: 1,
    fn: (x, y) => {
      const edge = 0.09;
      const onEdge =
        box(x, y, 0, 0, 1, edge) ||
        box(x, y, 0, 1 - edge, 1, 1) ||
        box(x, y, 0, 0, edge * 0.7, 1) ||
        box(x, y, 1 - edge * 0.7, 0, 1, 1);
      if (onEdge) return 1;
      if (Math.abs(x - 0.5) < edge * 0.35) return 1;
      const d = Math.hypot((x - 0.5) / 0.18, (y - 0.5) / 0.3);
      if (d > 0.78 && d < 1) return 1;
      // Penalty boxes.
      const inBoxL = box(x, y, 0, 0.26, 0.16, 0.74);
      const inBoxR = box(x, y, 0.84, 0.26, 1, 0.74);
      if (inBoxL || inBoxR) {
        const innerL = box(x, y, 0, 0.34, 0.11, 0.66);
        const innerR = box(x, y, 0.89, 0.34, 1, 0.66);
        return innerL || innerR ? 0 : 1;
      }
      return 0;
    },
  },
  {
    id: 'boot',
    category: 'football',
    label: 'Fotballsko',
    aspect: 1.35,
    minW: 10,
    minH: 8,
    inks: 2,
    pixels: [
      '..........1111....',
      '........11111111..',
      '.......1111111111.',
      '...1111111111111 1'.replace(' ', '1'),
      '.11111111111111111',
      '111111111111111111',
      '111111111111111111',
      '.2..2..2..2..2..2.',
    ],
  },
];

// ------------------------------------------------------------------ nordic

const NORDIC: ShapeSpec[] = [
  {
    id: 'flag-no',
    category: 'nordic',
    label: 'Norsk flagg',
    aspect: 1.38,
    minW: 11,
    minH: 8,
    inks: 3,
    fn: (x, y) => {
      // Proportions of the real flag, rounded to what a grid can hold:
      // red field, white cross, blue cross inside it, mast side narrower.
      const cx = 6 / 16;
      const cy = 0.5;
      const white = 0.11;
      const blue = 0.055;
      if (Math.abs(x - cx) <= blue || Math.abs(y - cy) <= blue) return 3;
      if (Math.abs(x - cx) <= white || Math.abs(y - cy) <= white) return 2;
      return 1;
    },
  },
  {
    id: 'nordic-cross',
    category: 'nordic',
    label: 'Nordisk kors',
    aspect: 1.38,
    minW: 9,
    minH: 7,
    inks: 2,
    fn: (x, y) => {
      const cx = 6 / 16;
      const t = 0.1;
      return Math.abs(x - cx) <= t || Math.abs(y - 0.5) <= t ? 2 : 1;
    },
  },
  {
    id: 'selbu',
    category: 'nordic',
    label: 'Selburose',
    aspect: 1,
    minW: 9,
    minH: 9,
    inks: 1,
    fn: (x, y) => {
      // The eight-petal rose: an eight-point star with a hollow centre and
      // squared-off tips, which is exactly how it falls out on a grid.
      if (poly(STAR8, x, y)) {
        return disc(x, y, 0.5, 0.5, 0.11) ? 0 : 1;
      }
      return 0;
    },
  },
  {
    id: 'mountain',
    category: 'nordic',
    label: 'Fjell',
    aspect: 1.6,
    minW: 10,
    minH: 6,
    inks: 2,
    fn: (x, y) => {
      const big = poly([[0.42, 0.05], [0.98, 1], [0.02, 1]], x, y);
      const small = poly([[0.14, 0.34], [0.52, 1], [-0.1, 1]], x, y);
      if (!big && !small) return 0;
      // Snow caps read as the second colour.
      if (big && y < 0.3 && Math.abs(x - 0.42) < (y - 0.05) * 0.6) return 2;
      return 1;
    },
  },
  {
    id: 'pine',
    category: 'nordic',
    label: 'Grantre',
    aspect: 0.8,
    minW: 7,
    minH: 9,
    inks: 1,
    fn: (x, y) => {
      if (box(x, y, 0.42, 0.82, 0.58, 1)) return 1;
      for (const [top, bottom, wide] of [
        [0.0, 0.34, 0.3],
        [0.24, 0.6, 0.4],
        [0.48, 0.86, 0.5],
      ]) {
        if (y >= top && y <= bottom) {
          const t = (y - top) / (bottom - top);
          if (Math.abs(x - 0.5) <= wide * t) return 1;
        }
      }
      return 0;
    },
  },
  {
    id: 'snowflake',
    category: 'nordic',
    label: 'Snøkrystall',
    aspect: 1,
    minW: 9,
    minH: 9,
    inks: 1,
    fn: (x, y) => {
      const dx = x - 0.5;
      const dy = y - 0.5;
      const r = Math.hypot(dx, dy);
      if (r > 0.5) return 0;
      if (r < 0.09) return 1;
      // Eight arms, not six: a hexagonal flake cannot land on a square grid
      // without one pair of arms turning to mush.
      const a = Math.atan2(dy, dx);
      const arm = Math.abs(((a % (Math.PI / 4)) + Math.PI / 8) % (Math.PI / 4) - Math.PI / 8);
      if (arm * r < 0.028) return 1;
      // Barbs, at a third and two thirds out.
      for (const at of [0.24, 0.38]) {
        if (Math.abs(r - at) < 0.05) {
          const spur = Math.abs(((a % (Math.PI / 4)) + Math.PI / 8) % (Math.PI / 4) - Math.PI / 8);
          if (spur < 0.42) return 1;
        }
      }
      return 0;
    },
  },
  {
    id: 'longship',
    category: 'nordic',
    label: 'Vikingskip',
    aspect: 1.5,
    minW: 13,
    minH: 10,
    inks: 2,
    pixels: [
      '.1..............1.',
      '11.....2222.....11',
      '.1.....2222......1',
      '.1....222222.....1',
      '.1....222222.....1',
      '.1...22222222....1',
      '.1......11.......1',
      '11111111111111111 '.replace(' ', '1'),
      '.1111111111111111.',
      '..11111111111111..',
      '....11111111 1....'.replace(' ', '1'),
    ],
  },
  {
    id: 'reindeer',
    category: 'nordic',
    label: 'Reinsdyr',
    aspect: 1.15,
    minW: 12,
    minH: 12,
    inks: 1,
    pixels: [
      '..1...........1...',
      '...1..1...1..1....',
      '....1.1...1.1.....',
      '.....111.111......',
      '.......111........',
      '.......111........',
      '......11111.......',
      '..1111111111111...',
      '.111111111111111..',
      '.111111111111111..',
      '.11111111111111 1.'.replace(' ', '1'),
      '.11..1111111..11..',
      '.11...11.11...11..',
      '.1....11.11....1..',
    ],
  },
  {
    id: 'ski',
    category: 'nordic',
    label: 'Ski',
    aspect: 1.2,
    minW: 10,
    minH: 10,
    inks: 2,
    pixels: [
      '..2.............2.',
      '..2.............2.',
      '.11.............11',
      '.12.............21',
      '.112...........211',
      '..12...........21.',
      '..112.........211.',
      '...12.........21..',
      '...112.......211..',
      '....12.......21...',
      '....112.....211...',
      '.....1111111111...',
    ],
  },
  {
    id: 'fjord',
    category: 'nordic',
    label: 'Fjordbølge',
    aspect: 2.6,
    minW: 14,
    minH: 6,
    inks: 2,
    fn: (x, y) => {
      const crest = 0.42 - 0.2 * Math.sin(x * TAU);
      if (y < crest) return 0;
      const second = crest + 0.26;
      return y < second ? 1 : 2;
    },
  },
];

// ------------------------------------------------------------------ badges

const BADGES: ShapeSpec[] = [
  {
    id: 'badge-shield',
    category: 'badge',
    label: 'Skjoldmerke',
    aspect: 0.86,
    minW: 9,
    minH: 10,
    inks: 2,
    fn: (x, y) => {
      const inShield = (sx: number, sy: number) => {
        if (sy < 0.62) return sx >= 0 && sx <= 1 && sy >= 0;
        const t = (sy - 0.62) / 0.38;
        return Math.abs(sx - 0.5) <= 0.5 * (1 - t * t);
      };
      if (!inShield(x, y)) return 0;
      const inner = inShield(
        0.5 + (x - 0.5) / 0.74,
        (y - 0.11) / 0.78,
      );
      return inner ? 2 : 1;
    },
  },
  {
    id: 'badge-circle',
    category: 'badge',
    label: 'Rundt merke',
    aspect: 1,
    minW: 9,
    minH: 9,
    inks: 2,
    fn: (x, y) => {
      if (!disc(x, y, 0.5, 0.5, 0.5)) return 0;
      return disc(x, y, 0.5, 0.5, 0.34) ? 2 : 1;
    },
  },
  {
    id: 'badge-oval',
    category: 'badge',
    label: 'Ovalt merke',
    aspect: 0.78,
    minW: 8,
    minH: 10,
    inks: 2,
    fn: (x, y) => {
      if (!ellipse(x, y, 0.5, 0.5, 0.5, 0.5)) return 0;
      return ellipse(x, y, 0.5, 0.5, 0.33, 0.36) ? 2 : 1;
    },
  },
  {
    id: 'banner',
    category: 'badge',
    label: 'Banner',
    aspect: 2.6,
    minW: 14,
    minH: 5,
    inks: 1,
    fn: (x, y) => {
      if (!box(x, y, 0, 0.1, 1, 0.9)) return 0;
      // Swallowtail cut at both ends.
      const notch = 0.1;
      const t = Math.abs(y - 0.5) / 0.4;
      if (x < notch && x < notch * (1 - t)) return 0;
      if (x > 1 - notch && 1 - x < notch * (1 - t)) return 0;
      return 1;
    },
  },
  {
    id: 'ribbon',
    category: 'badge',
    label: 'Bånd',
    aspect: 2.4,
    minW: 14,
    minH: 7,
    inks: 2,
    fn: (x, y) => {
      if (box(x, y, 0.1, 0.06, 0.9, 0.62)) return 1;
      // Tails, folded under each end.
      if (box(x, y, 0, 0.3, 0.16, 1)) {
        return Math.abs(x - 0.08) * 6 + (1 - y) * 1.2 < 1 ? 2 : 0;
      }
      if (box(x, y, 0.84, 0.3, 1, 1)) {
        return Math.abs(x - 0.92) * 6 + (1 - y) * 1.2 < 1 ? 2 : 0;
      }
      return 0;
    },
  },
  {
    id: 'laurel',
    category: 'badge',
    label: 'Laurbær',
    aspect: 1.05,
    minW: 11,
    minH: 10,
    inks: 1,
    fn: (x, y) => {
      const dx = x - 0.5;
      const dy = y - 0.52;
      const r = Math.hypot(dx, dy);
      const a = Math.atan2(dy, dx);
      // Two arcs of leaves, open at the top.
      if (Math.abs(dx) < 0.06 && dy < -0.3) return 0;
      if (r > 0.5 || r < 0.3) return 0;
      const leaf = Math.abs(((a * 9) % 1) - 0.5);
      return leaf < 0.34 && Math.abs(a) > 0.5 ? 1 : 0;
    },
  },
  {
    id: 'monogram',
    category: 'badge',
    label: 'Monogramramme',
    aspect: 1,
    minW: 9,
    minH: 9,
    inks: 1,
    fn: (x, y) => {
      const outer = Math.max(Math.abs(x - 0.5), Math.abs(y - 0.5));
      if (outer > 0.5) return 0;
      if (outer > 0.42) return 1;
      if (outer > 0.34 && outer < 0.38) return 1;
      return 0;
    },
  },
];

// ---------------------------------------------------------------- patterns

const PATTERNS: ShapeSpec[] = [
  {
    id: 'p-checker',
    category: 'pattern',
    label: 'Sjakkrute',
    aspect: 4,
    minW: 8,
    minH: 4,
    inks: 2,
    tiling: true,
    fn: (x, y) => ((Math.floor(x * 16) + Math.floor(y * 4)) % 2 === 0 ? 1 : 2),
  },
  {
    id: 'p-stripes',
    category: 'pattern',
    label: 'Striper',
    aspect: 4,
    minW: 6,
    minH: 3,
    inks: 2,
    tiling: true,
    fn: (_x, y) => (Math.floor(y * 6) % 2 === 0 ? 1 : 2),
  },
  {
    id: 'p-diamonds',
    category: 'pattern',
    label: 'Ruteborde',
    aspect: 4,
    minW: 12,
    minH: 5,
    inks: 2,
    tiling: true,
    fn: (x, y) => {
      const u = ((x * 8) % 1) - 0.5;
      const v = y - 0.5;
      return Math.abs(u) + Math.abs(v) < 0.5 ? 1 : 2;
    },
  },
  {
    id: 'p-nordic',
    category: 'pattern',
    label: 'Nordisk bord',
    aspect: 4,
    minW: 16,
    minH: 7,
    inks: 2,
    tiling: true,
    fn: (x, y) => {
      // The classic lice-and-star band: an eight-point rose on the beat,
      // single stitches off it.
      const u = ((x * 6) % 1);
      const cell = Math.floor(x * 6);
      if (cell % 2 === 0) {
        return poly(STAR8, u, y) ? 1 : 2;
      }
      const near = Math.abs(u - 0.5) < 0.12 && Math.abs(y - 0.5) < 0.16;
      return near ? 1 : 2;
    },
  },
  {
    id: 'p-dots',
    category: 'pattern',
    label: 'Prikker',
    aspect: 4,
    minW: 8,
    minH: 4,
    inks: 2,
    tiling: true,
    fn: (x, y) => {
      const u = (x * 12) % 1;
      const row = Math.floor(y * 3);
      const off = row % 2 === 0 ? 0 : 0.5;
      const v = (y * 3) % 1;
      return disc((u + off) % 1, v, 0.5, 0.5, 0.26) ? 1 : 2;
    },
  },
  {
    id: 'p-herringbone',
    category: 'pattern',
    label: 'Fiskebein',
    aspect: 4,
    minW: 12,
    minH: 5,
    inks: 2,
    tiling: true,
    fn: (x, y) => {
      const u = (x * 10) % 1;
      const tri = u < 0.5 ? u * 2 : 2 - u * 2;
      return Math.abs(y - tri * 0.8 - 0.1) < 0.22 ? 1 : 2;
    },
  },
  {
    id: 'p-crosses',
    category: 'pattern',
    label: 'Korsbord',
    aspect: 4,
    minW: 10,
    minH: 5,
    inks: 2,
    tiling: true,
    fn: (x, y) => {
      const u = (x * 8) % 1;
      const arm = 0.18;
      return Math.abs(u - 0.5) < arm || Math.abs(y - 0.5) < arm ? 1 : 2;
    },
  },
];

export const SHAPES: ShapeSpec[] = [
  ...BASIC,
  ...FOOTBALL,
  ...NORDIC,
  ...BADGES,
  ...PATTERNS,
];

const BY_ID = new Map(SHAPES.map((s) => [s.id, s]));

export type ShapeId = string;

export function getShape(id: ShapeId): ShapeSpec | null {
  return BY_ID.get(id) ?? null;
}

export const SHAPE_CATEGORIES: { id: ShapeCategory; label: string }[] = [
  { id: 'basic', label: 'Former' },
  { id: 'football', label: 'Fotball' },
  { id: 'nordic', label: 'Norsk & nordisk' },
  { id: 'badge', label: 'Merker' },
  { id: 'pattern', label: 'Border' },
];

export function shapesIn(category: ShapeCategory): ShapeSpec[] {
  return SHAPES.filter((s) => s.category === category);
}
