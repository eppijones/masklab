import { useEffect, useMemo, useRef } from 'react';
import { YARN_HEX, type YarnColor } from '../data/types';
import type { Round, Stitch } from '../data/types';
import { buildFullChart, PHASE_LABEL, phaseRuns } from './fullChart';

/**
 * The whole hat, round by round.
 *
 * Read-only on purpose: the crown and the brim are worked from the recipe's
 * own increase rhythm, not painted, so there is nothing here to drag. What it
 * is for is judging the hat — seeing the wordmark meet the shoulder, checking
 * the edge actually contrasts, counting the rounds before you start.
 */

const PAD_LEFT = 30;
const PAD_RIGHT = 34;
const PAD_BOTTOM = 4;

export default function FullChartPanel({
  rounds,
  stitches,
  cell = 4,
  onPickBand,
}: {
  rounds: Round[];
  stitches: Stitch[];
  cell?: number;
  /** Clicking the band jumps back to the editable chart. */
  onPickBand?: () => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const chart = useMemo(() => buildFullChart(rounds, stitches), [rounds, stitches]);
  const runs = useMemo(() => phaseRuns(chart), [chart]);

  const width = PAD_LEFT + chart.maxCount * cell + PAD_RIGHT;
  const height = chart.rows.length * cell + PAD_BOTTOM;

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = width * dpr;
    cv.height = height * dpr;
    cv.style.width = `${width}px`;
    cv.style.height = `${height}px`;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    // Stitches
    for (let r = 0; r < chart.rows.length; r++) {
      const row = chart.rows[r];
      const y = r * cell;
      for (let i = 0; i < row.colors.length; i++) {
        ctx.fillStyle = YARN_HEX[row.colors[i] as YarnColor] ?? '#ffffff';
        ctx.fillRect(PAD_LEFT + (row.offset + i) * cell, y, cell, cell);
      }
    }

    // A hairline every tenth stitch and every fifth round, only if the cells
    // are big enough to carry it without turning the hat grey.
    if (cell >= 5) {
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(26,26,23,0.10)';
      for (let r = 0; r <= chart.rows.length; r += 5) {
        const y = Math.round(r * cell) + 0.5;
        ctx.beginPath();
        ctx.moveTo(PAD_LEFT, y);
        ctx.lineTo(PAD_LEFT + chart.maxCount * cell, y);
        ctx.stroke();
      }
    }

    // The band: the part you can actually draw on.
    if (chart.bandFrom >= 0) {
      const y0 = chart.bandFrom * cell;
      const y1 = (chart.bandTo + 1) * cell;
      ctx.strokeStyle = '#b7182e';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(
        PAD_LEFT - 1.5,
        Math.round(y0) + 0.5,
        chart.maxCount * cell + 3,
        y1 - y0,
      );
    }

    // Round numbers down the left, stitch counts down the right. Labels are
    // 8px tall, so they are only drawn where there is room for them — a column
    // of overlapping numerals is worse than no numerals.
    ctx.font = '8px Karla, sans-serif';
    ctx.textBaseline = 'middle';
    const MIN_GAP = 10;
    const step = Math.max(1, Math.ceil(MIN_GAP / cell));
    let lastLeftY = -Infinity;
    let lastRightY = -Infinity;
    for (let r = 0; r < chart.rows.length; r++) {
      const row = chart.rows[r];
      const lastOfPhase = runs.some((p) => p.to === r);
      if (r % step !== 0 && !lastOfPhase) continue;
      const y = r * cell + cell / 2;
      if (y - lastLeftY < MIN_GAP) continue;
      lastLeftY = y;
      ctx.fillStyle = lastOfPhase ? '#55503f' : '#8a8070';
      ctx.textAlign = 'right';
      ctx.fillText(String(row.num), PAD_LEFT - 6, y);
      // The stitch count only changes on increase rounds, so it is worth
      // printing where it changed and at the end of each phase.
      const grew = r === 0 || row.colors.length !== chart.rows[r - 1].colors.length;
      if ((grew || lastOfPhase) && y - lastRightY >= MIN_GAP) {
        lastRightY = y;
        ctx.textAlign = 'left';
        ctx.fillText(
          String(row.colors.length),
          PAD_LEFT + chart.maxCount * cell + 6,
          y,
        );
      }
    }

    // Phase brackets down the left edge.
    ctx.textAlign = 'left';
    for (const p of runs) {
      const y0 = p.from * cell;
      const y1 = (p.to + 1) * cell;
      ctx.strokeStyle = p.phase === 'text' ? '#b7182e' : 'rgba(26,26,23,0.35)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(3.5, y0 + 1);
      ctx.lineTo(3.5, y1 - 1);
      ctx.stroke();
    }
  }, [chart, runs, cell, width, height]);

  return (
    <div className="st-fullwrap">
      <canvas
        ref={ref}
        className="st-chart-canvas st-fullchart"
        onClick={(e) => {
          if (!onPickBand || chart.bandFrom < 0) return;
          const rect = e.currentTarget.getBoundingClientRect();
          const r = Math.floor((e.clientY - rect.top) / cell);
          if (r >= chart.bandFrom && r <= chart.bandTo) onPickBand();
        }}
        style={{ cursor: onPickBand ? 'pointer' : 'default' }}
      />
      <div className="st-fulllegend">
        {runs.map((p) => (
          <span key={`${p.phase}-${p.from}`} className={`st-phase ${p.phase}`}>
            <b>{PHASE_LABEL[p.phase]}</b>
            {' runde '}
            {chart.rows[p.from].num}
            {p.to > p.from ? `–${chart.rows[p.to].num}` : ''}
          </span>
        ))}
        <span className="st-phase note">
          Klikk mønsterfeltet for å redigere det
        </span>
      </div>
    </div>
  );
}
