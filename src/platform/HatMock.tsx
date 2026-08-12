import { useEffect, useRef } from 'react';
import { getPattern } from '../patterns/registry';
import { derivePattern } from '../patterns/buildFromDefinition';
import type { PatternId } from '../patterns/types';
import type { YarnColor } from '../data/types';
import { YARN_HEX } from '../data/types';

/**
 * Flat 2D front-view mockup of a hat, drawn straight from the derived
 * pattern's stitches (crown colorwork, wall chart and brim included) —
 * cheap enough for many cards, unlike a 3D scene each.
 */

interface DerivedLite {
  counts: number[];
  phases: string[];
  colors: YarnColor[][];
}

const cache = new Map<string, DerivedLite>();

function liteFor(id: Exclude<PatternId, 'custom'>): DerivedLite {
  const hit = cache.get(id);
  if (hit) return hit;
  const d = derivePattern(getPattern(id));
  const colors: YarnColor[][] = d.rounds.map(() => []);
  for (const st of d.stitches) colors[st.roundIdx].push(st.color);
  const lite: DerivedLite = {
    counts: d.rounds.map((r) => r.count),
    phases: d.rounds.map((r) => r.phase),
    colors,
  };
  cache.set(id, lite);
  return lite;
}

const FRONT_FRAC = 0.095;

export function drawHatMock(
  canvas: HTMLCanvasElement,
  id: Exclude<PatternId, 'custom'>,
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const W = canvas.width;
  const H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  const { counts, phases, colors } = liteFor(id);
  const n = counts.length;
  const maxCount = Math.max(...counts);

  const padX = W * 0.08;
  const usableW = W - padX * 2;
  const topY = H * 0.09;
  const botY = H * 0.94;

  // Vertical budget per phase (crown compressed into a dome).
  const topN = phases.filter((p) => p === 'top').length;
  const wallN = phases.filter((p) => p === 'text').length;
  const brimN = n - topN - wallN;
  const crownH = (botY - topY) * 0.3;
  const wallH = (botY - topY) * 0.48;
  const brimH = (botY - topY) * 0.22;

  let y = topY;
  for (let r = 0; r < n; r++) {
    const phase = phases[r];
    let dy: number;
    if (phase === 'top') {
      // dome: early rounds are nearly flat (seen edge-on), later ones taller
      const t = topN > 1 ? r / (topN - 1) : 1;
      dy = (crownH / topN) * (0.35 + 1.3 * t * t) * 1.28;
    } else if (phase === 'text') {
      dy = wallH / Math.max(1, wallN);
    } else {
      dy = brimH / Math.max(1, brimN);
    }

    const count = counts[r];
    const rowW = usableW * Math.pow(count / maxCount, 0.92);
    const halfW = rowW / 2;
    const cx = W / 2;
    const visN = Math.max(3, Math.round(count * 0.52));
    const cellW = rowW / visN;
    const frontI = Math.round(FRONT_FRAC * count);
    const roundColors = colors[r];

    for (let j = 0; j < visN; j++) {
      let i = (frontI + j - Math.floor(visN / 2)) % count;
      if (i < 0) i += count;
      const x = cx - halfW + j * cellW;
      // Cylinder curvature: edges dip slightly.
      const rel = (j / (visN - 1)) * 2 - 1;
      const dip = phase === 'top' ? 0 : dy * 0.55 * rel * rel;
      ctx.fillStyle = YARN_HEX[roundColors[i] ?? 'white'];
      ctx.fillRect(x, y + dip, Math.ceil(cellW), Math.ceil(dy) + 0.6);
    }
    y += dy;
  }

  // Soft outline for shape.
  ctx.strokeStyle = 'rgba(26,26,23,0.14)';
  ctx.lineWidth = 1.5;
}

export default function HatMock({
  id,
  width = 400,
  height = 370,
}: {
  id: Exclude<PatternId, 'custom'>;
  width?: number;
  height?: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (ref.current) drawHatMock(ref.current, id);
  }, [id]);
  return (
    <canvas
      ref={ref}
      width={width}
      height={height}
      className="hatmock"
      aria-hidden
    />
  );
}
