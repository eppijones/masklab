import { useState } from 'react';
import { useApp, getModel } from '../store';
import { CHART_COLS, CHART_ROWS, CHART_GRID } from '../data/chart';
import { YARN_HEX } from '../data/types';

const CELL = 16;

export default function ChartView() {
  const chartOpen = useApp((s) => s.chartOpen);
  const setChartOpen = useApp((s) => s.setChartOpen);
  const stepIndex = useApp((s) => s.stepIndex);
  const cursor = useApp((s) => s.stitchCursor);
  const [zoom, setZoom] = useState(1.4);

  if (!chartOpen) return null;

  const model = getModel();
  const step = model.steps[stepIndex];
  const round = step?.roundIdx !== null && step ? model.rounds[step.roundIdx!] : null;
  const activeRow = round?.phase === 'text' ? round.chartRow : null;
  // Working stitch number 1..100 (stitch 1 = LEFT edge of the outside-view chart)
  const activeStitch =
    activeRow !== null && cursor !== null && cursor < CHART_COLS ? cursor + 1 : null;

  const W = (CHART_COLS + 2) * CELL;
  const H = (CHART_ROWS + 2) * CELL;

  return (
    <div className="overlay" onClick={() => setChartOpen(false)}>
      <div className="overlay-card" onClick={(e) => e.stopPropagation()}>
        <div className="overlay-head">
          <h3 className="overlay-title">RO RO RO — diagram for 100 masker</h3>
          <div className="chart-zoom">
            <button onClick={() => setZoom((z) => Math.max(0.6, z - 0.3))}>−</button>
            <button onClick={() => setZoom((z) => Math.min(4, z + 0.3))}>+</button>
            <button className="overlay-close" onClick={() => setChartOpen(false)}>
              Lukk
            </button>
          </div>
        </div>
        <p className="overlay-sub">
          Diagrammet viser hatten slik du ser den utenfra, ferdig og med pullen opp. Hatten
          hekles ovenfra og ned, så du begynner med rad 1 ØVERST (= runde 20) og jobber deg
          nedover til rad 10 (= runde 29). Én rute er én fastmaske. Du starter ved maske 1 på
          VENSTRE side og leser mot høyre. (I hendene dine vandrer arbeidet mot venstre — det
          er samme sak, for diagrammet viser utsiden av den ferdige hatten.) Runden du er på
          er markert med blå ramme
          {activeStitch ? ', og neste maske med blå fylt rute' : ''}.
        </p>
        <div className="chart-legend">
          <span>
            <span className="swatch" style={{ background: YARN_HEX.white }} />
            Hvit fastmaske
          </span>
          <span>
            <span className="swatch" style={{ background: YARN_HEX.red }} />
            Rød fastmaske
          </span>
          <span>→ arbeidsretning i diagrammet (maske 1 på venstre side)</span>
        </div>
        <div className="chart-scroll">
          <svg
            width={W * zoom}
            height={H * zoom}
            viewBox={`0 0 ${W} ${H}`}
            style={{ display: 'block' }}
          >
            {CHART_GRID.map((row, rIdx) => {
              const rowNum = rIdx + 1; // 1 = top (worked first)
              const y = rowNum * CELL;
              return row.map((isRed, cIdx) => {
                const stitchNum = cIdx + 1; // working order number (1 = left edge)
                const x = (cIdx + 1) * CELL;
                const isActiveCell =
                  rowNum === activeRow && activeStitch !== null && stitchNum === activeStitch;
                return (
                  <rect
                    key={`${rIdx}-${cIdx}`}
                    x={x}
                    y={y}
                    width={CELL}
                    height={CELL}
                    fill={isActiveCell ? '#3B63C4' : isRed ? YARN_HEX.red : YARN_HEX.white}
                    stroke="#C9BFA8"
                    strokeWidth={0.6}
                  />
                );
              });
            })}
            {/* active row frame */}
            {activeRow !== null && (
              <rect
                x={CELL}
                y={activeRow * CELL}
                width={CHART_COLS * CELL}
                height={CELL}
                fill="none"
                stroke="#00205B"
                strokeWidth={2.4}
              />
            )}
            {/* row numbers both sides */}
            {Array.from({ length: CHART_ROWS }, (_, i) => i + 1).map((rowNum) => {
              const y = rowNum * CELL + CELL * 0.72;
              return (
                <g key={rowNum} fontSize={CELL * 0.55} fontWeight={700} fill="#8A8070">
                  <text x={CELL * 0.15} y={y}>
                    {rowNum}
                  </text>
                  <text x={(CHART_COLS + 1) * CELL + CELL * 0.15} y={y}>
                    {rowNum}
                  </text>
                </g>
              );
            })}
            {/* column numbers every 5, counted from the left (working order) */}
            {Array.from({ length: CHART_COLS / 5 }, (_, i) => (i + 1) * 5).map((num) => {
              const cIdx = num - 1;
              const x = (cIdx + 1) * CELL + CELL * 0.1;
              return (
                <text
                  key={num}
                  x={x}
                  y={(CHART_ROWS + 1) * CELL + CELL * 0.75}
                  fontSize={CELL * 0.5}
                  fontWeight={700}
                  fill="#8A8070"
                >
                  {num}
                </text>
              );
            })}
          </svg>
        </div>
      </div>
    </div>
  );
}
