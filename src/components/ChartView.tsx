import { useState } from 'react';
import { useApp, getModel, getActivePatternId } from '../store';
import { CHART_COLS, CHART_ROWS, CHART_GRID } from '../data/chart';
import { YARN_HEX, type YarnColor } from '../data/types';
import { getPattern } from '../patterns/registry';
import { derivePattern } from '../patterns/buildFromDefinition';

const CELL = 16;

function useChartGrid(): {
  grid: YarnColor[][];
  cols: number;
  rows: number;
  title: string;
} {
  const pid = getActivePatternId();
  if (pid === 'ro-ro-ro') {
    return {
      grid: CHART_GRID.map((row) => row.map((isRed) => (isRed ? 'red' : 'white'))),
      cols: CHART_COLS,
      rows: CHART_ROWS,
      title: 'RO RO RO — diagram for 100 masker',
    };
  }
  const derived = derivePattern(getPattern(pid));
  return {
    grid: derived.chart.grid,
    cols: derived.chart.cols,
    rows: derived.chart.rows,
    title: `${derived.definition.titleNo} — diagram for ${derived.bodyCount} masker`,
  };
}

export default function ChartView() {
  const chartOpen = useApp((s) => s.chartOpen);
  const setChartOpen = useApp((s) => s.setChartOpen);
  const stepIndex = useApp((s) => s.stepIndex);
  const cursor = useApp((s) => s.stitchCursor);
  const [zoom, setZoom] = useState(1.4);

  if (!chartOpen) return null;

  const { grid, cols, rows, title } = useChartGrid();
  const model = getModel();
  const step = model.steps[stepIndex];
  const round = step?.roundIdx !== null && step ? model.rounds[step.roundIdx!] : null;
  const activeRow = round?.phase === 'text' ? round.chartRow : null;
  const activeStitch =
    activeRow !== null && cursor !== null && cursor < cols ? cursor + 1 : null;

  const W = (cols + 2) * CELL;
  const H = (rows + 2) * CELL;
  const palette = [...new Set(grid.flat())];

  return (
    <div className="overlay" onClick={() => setChartOpen(false)}>
      <div className="overlay-card" onClick={(e) => e.stopPropagation()}>
        <div className="overlay-head">
          <h3 className="overlay-title">{title}</h3>
          <div className="chart-zoom">
            <button onClick={() => setZoom((z) => Math.max(0.6, z - 0.3))}>−</button>
            <button onClick={() => setZoom((z) => Math.min(4, z + 0.3))}>+</button>
            <button className="overlay-close" onClick={() => setChartOpen(false)}>
              Lukk
            </button>
          </div>
        </div>
        <p className="overlay-sub">
          Diagrammet viser hatten slik du ser den utenfra, ferdig og med pullen opp.
          Hatten hekles ovenfra og ned, så du begynner med rad 1 ØVERST og jobber deg
          nedover. Én rute er én fastmaske. Du starter ved maske 1 på VENSTRE side og
          leser mot høyre.
          {activeStitch ? ' Neste maske er markert med blå fylt rute.' : ''}
        </p>
        <div className="chart-legend">
          {palette.map((c) => (
            <span key={c}>
              <span className="swatch" style={{ background: YARN_HEX[c] }} />
              {c}
            </span>
          ))}
          <span>→ arbeidsretning (maske 1 på venstre side)</span>
        </div>
        <div className="chart-scroll">
          <svg
            width={W * zoom}
            height={H * zoom}
            viewBox={`0 0 ${W} ${H}`}
            style={{ display: 'block' }}
          >
            {grid.map((row, rIdx) => {
              const rowNum = rIdx + 1;
              const y = rowNum * CELL;
              return row.map((color, cIdx) => {
                const stitchNum = cIdx + 1;
                const x = (cIdx + 1) * CELL;
                const isActiveCell =
                  rowNum === activeRow &&
                  activeStitch !== null &&
                  stitchNum === activeStitch;
                return (
                  <rect
                    key={`${rIdx}-${cIdx}`}
                    x={x}
                    y={y}
                    width={CELL}
                    height={CELL}
                    fill={isActiveCell ? '#3B63C4' : YARN_HEX[color]}
                    stroke="#C9BFA8"
                    strokeWidth={0.6}
                  />
                );
              });
            })}
            {activeRow !== null && (
              <rect
                x={CELL}
                y={activeRow * CELL}
                width={cols * CELL}
                height={CELL}
                fill="none"
                stroke="#00205B"
                strokeWidth={2.4}
              />
            )}
            {Array.from({ length: rows }, (_, i) => i + 1).map((rowNum) => {
              const y = rowNum * CELL + CELL * 0.72;
              return (
                <g key={rowNum} fontSize={CELL * 0.55} fontWeight={700} fill="#8A8070">
                  <text x={CELL * 0.15} y={y}>
                    {rowNum}
                  </text>
                  <text x={(cols + 1) * CELL + CELL * 0.15} y={y}>
                    {rowNum}
                  </text>
                </g>
              );
            })}
            {Array.from({ length: Math.floor(cols / 5) }, (_, i) => (i + 1) * 5).map(
              (num) => {
                const cIdx = num - 1;
                const x = (cIdx + 1) * CELL + CELL * 0.1;
                return (
                  <text
                    key={num}
                    x={x}
                    y={(rows + 1) * CELL + CELL * 0.75}
                    fontSize={CELL * 0.5}
                    fontWeight={700}
                    fill="#8A8070"
                  >
                    {num}
                  </text>
                );
              },
            )}
          </svg>
        </div>
      </div>
    </div>
  );
}
