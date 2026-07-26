import type { ReactNode } from 'react';

/* Shared palette for the line-art diagrams (matches the app style). */
export const OUT = '#2A2620';
export const YARN = '#FDFAF3';
export const RED = '#BA0C2F';
export const BLUE = '#00205B';
export const HOOKC = '#9A917E';
export const SKIN = '#EFDFC9';

export type Pt = [number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
/** Progress of t through the sub-interval [a, b], eased 0..1. */
export const phase = (t: number, a: number, b: number) => {
  const k = clamp01((t - a) / (b - a));
  return k * k * (3 - 2 * k); // smoothstep
};
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
export const lerpPt = (a: Pt, b: Pt, k: number): Pt => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
export const lerpPts = (a: Pt[], b: Pt[], k: number): Pt[] =>
  a.map((p, i) => lerpPt(p, b[i], k));

/** Catmull-Rom spline through points -> SVG path. */
export function smoothPath(pts: Pt[]): string {
  if (pts.length < 2) return '';
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C ${c1[0]} ${c1[1]}, ${c2[0]} ${c2[1]}, ${p2[0]} ${p2[1]}`;
  }
  return d;
}

export function Yarn({
  pts,
  color = RED,
  w = 7,
  opacity = 1,
  dash,
  outline = true,
}: {
  pts: Pt[];
  color?: string;
  w?: number;
  opacity?: number;
  dash?: string;
  outline?: boolean;
}) {
  const d = smoothPath(pts);
  return (
    <g opacity={opacity}>
      {outline && !dash && (
        <path d={d} fill="none" stroke={OUT} strokeWidth={w + 4} strokeLinecap="round" opacity={0.85} />
      )}
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={w}
        strokeLinecap="round"
        strokeDasharray={dash}
      />
    </g>
  );
}

/**
 * Crochet hook. The hook HEAD is at (x, y); the shaft extends away
 * at `angle` degrees (0 = shaft to the right of the head).
 */
export function Hook({
  x,
  y,
  angle = -35,
  len = 165,
}: {
  x: number;
  y: number;
  angle?: number;
  len?: number;
}) {
  return (
    <g transform={`translate(${x},${y}) rotate(${angle})`}>
      <line x1={14} y1={0} x2={len} y2={0} stroke={HOOKC} strokeWidth={9} strokeLinecap="round" />
      {/* J-shaped head */}
      <path
        d="M 16 0 Q -8 0 -6 12 Q -5 20 6 18"
        fill="none"
        stroke={HOOKC}
        strokeWidth={7.6}
        strokeLinecap="round"
      />
      <line
        x1={20}
        y1={-1.5}
        x2={len - 6}
        y2={-1.5}
        stroke="rgba(255,255,255,0.35)"
        strokeWidth={2.5}
        strokeLinecap="round"
      />
    </g>
  );
}

/** A row of chain/stitch braid (the top of previous-round stitches). */
export function Braid({
  cx,
  cy,
  n,
  s = 1,
  color = YARN,
  highlight = -1,
  highlightColor = BLUE,
}: {
  cx: number;
  cy: number;
  n: number;
  s?: number;
  color?: string;
  highlight?: number;
  highlightColor?: string;
}) {
  const items: ReactNode[] = [];
  for (let i = 0; i < n; i++) {
    const x = cx + (i - (n - 1) / 2) * 33 * s;
    items.push(
      <g key={i} transform={`translate(${x},${cy}) scale(${s})`}>
        <ellipse
          rx={16}
          ry={6.8}
          transform="rotate(-24) translate(-7,-2)"
          fill={color}
          stroke={OUT}
          strokeWidth={2.6}
        />
        <ellipse
          rx={16}
          ry={6.8}
          transform="rotate(24) translate(7,-2)"
          fill={color}
          stroke={OUT}
          strokeWidth={2.6}
        />
        {i === highlight && (
          <ellipse
            rx={24}
            ry={13}
            fill="none"
            stroke={highlightColor}
            strokeWidth={3}
            strokeDasharray="6 5"
          />
        )}
      </g>,
    );
  }
  return <>{items}</>;
}

/** One stitch "V" placed anywhere (used for freshly made stitches). */
export function StitchV({
  x,
  y,
  s = 1,
  color = YARN,
  rotate = 0,
  opacity = 1,
}: {
  x: number;
  y: number;
  s?: number;
  color?: string;
  rotate?: number;
  opacity?: number;
}) {
  return (
    <g transform={`translate(${x},${y}) rotate(${rotate}) scale(${s})`} opacity={opacity}>
      <ellipse
        rx={16}
        ry={6.8}
        transform="rotate(-24) translate(-7,-2)"
        fill={color}
        stroke={OUT}
        strokeWidth={2.6}
      />
      <ellipse
        rx={16}
        ry={6.8}
        transform="rotate(24) translate(7,-2)"
        fill={color}
        stroke={OUT}
        strokeWidth={2.6}
      />
    </g>
  );
}

/** A yarn loop sitting on the hook shaft (dark outline so white yarn reads on cream). */
export function LoopOnHook({
  x,
  y,
  rx = 13,
  ry = 24,
  color = YARN,
  angle = 0,
  w = 7.5,
  opacity = 1,
}: {
  x: number;
  y: number;
  rx?: number;
  ry?: number;
  color?: string;
  angle?: number;
  w?: number;
  opacity?: number;
}) {
  return (
    <g transform={`rotate(${angle} ${x} ${y})`} opacity={opacity}>
      <ellipse cx={x} cy={y} rx={rx} ry={ry} fill="none" stroke={OUT} strokeWidth={w + 4} opacity={0.85} />
      <ellipse cx={x} cy={y} rx={rx} ry={ry} fill="none" stroke={color} strokeWidth={w} />
    </g>
  );
}

export function Arrow({ d, opacity = 1 }: { d: string; opacity?: number }) {
  return (
    <path
      d={d}
      fill="none"
      stroke={BLUE}
      strokeWidth={5}
      strokeLinecap="round"
      markerEnd="url(#anim-ah)"
      opacity={opacity}
    />
  );
}

export function Frame({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 360 250">
      <defs>
        <marker
          id="anim-ah"
          viewBox="0 0 10 10"
          refX={7}
          refY={5}
          markerWidth={4.5}
          markerHeight={4.5}
          orient="auto-start-reverse"
        >
          <path d="M0 0 L10 5 L0 10 Z" fill={BLUE} />
        </marker>
      </defs>
      {children}
    </svg>
  );
}
