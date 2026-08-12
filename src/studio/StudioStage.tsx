import { useDeferredValue, useEffect, useState } from 'react';
import HatScene from '../components/HatScene';
import { useApp } from '../store';
import { useDeviceClass } from '../hooks/useDeviceClass';
import ActionBar from './ActionBar';
import ChartPanel from './ChartPanel';
import FullChartPanel from './FullChartPanel';
import { deriveDesign, designModel } from './design';
import { YARN_HEX, YARN_NAME } from '../data/types';
import { useStudio } from './store';

/**
 * The design stage: the hat in 3D on top, the chart it is knitted from below.
 * The 3D model follows a deferred copy of the design so dragging a slider
 * stays responsive on a phone — the chart updates immediately.
 */
export default function StudioStage() {
  const design = useStudio((s) => s.design);
  const tool = useStudio((s) => s.tool);
  const paint = useStudio((s) => s.paint);
  const selectedLayerId = useStudio((s) => s.selectedLayerId);
  const setTool = useStudio((s) => s.setTool);
  const activeYarn = useStudio((s) => s.activeYarn);
  const selectLayer = useStudio((s) => s.selectLayer);
  const updateLayer = useStudio((s) => s.updateLayer);
  const focusFindingId = useStudio((s) => s.focusFindingId);
  const safeAreas = useStudio((s) => s.safeAreas);
  const findings = useStudio((s) => s.craftFindings)();
  const device = useDeviceClass();
  const setShowFinished = useApp((s) => s.setShowFinished);
  const setViewMode = useApp((s) => s.setViewMode);
  const [cell, setCell] = useState(9);
  const chartView = useStudio((s) => s.chartView);
  const setChartView = useStudio((s) => s.setChartView);

  // Studio always shows the whole hat, never a half-worked one.
  useEffect(() => {
    setShowFinished(true);
    setViewMode('finished');
  }, [setShowFinished, setViewMode]);

  const deferred = useDeferredValue(design);
  const model = designModel(deferred);
  const derived = deriveDesign(design);
  const painting = tool === 'brush' || tool === 'erase';

  return (
    <div className="st-stage">
      <div className="st-3d">
        <HatScene device={device} model={model} overview />
        <span className="st-3d-hint">
          Dra for å snurre hatten · rull for å zoome
        </span>
      </div>

      <div className="st-chartwrap">
        <div className="st-chart-head">
          <span className="st-chart-title">Diagram</span>

          {/* The mode lives on the chart, not in a toolbar three panels away:
              what a click is about to do is the one thing you must never have
              to remember. */}
          <div
            className={`st-modes mode-${tool}`}
            hidden={chartView !== 'band'}
          >
            {(
              [
                ['select', 'Velg og flytt', 'V'],
                ['brush', 'Mal masker', 'B'],
                ['erase', 'Visk ut', 'E'],
              ] as const
            ).map(([id, label, key]) => (
              <button
                key={id}
                type="button"
                className={`st-mode ${tool === id ? 'on' : ''}`}
                onClick={() => setTool(id)}
                title={`${label} (${key})`}
              >
                {id === 'brush' && (
                  <span
                    className="st-mode-dot"
                    style={{ background: YARN_HEX[activeYarn] }}
                  />
                )}
                {id === 'erase' && <span className="st-mode-dot erase" />}
                {label}
              </button>
            ))}
          </div>

          <div className="st-modes">
            {(
              [
                ['band', 'Mønsterfelt'],
                ['hat', 'Hele hatten'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={`st-mode ${chartView === id ? 'on' : ''}`}
                onClick={() => setChartView(id)}
                title={
                  id === 'hat'
                    ? 'Se alle rundene, fra pullen til kanten'
                    : 'Rediger mønsterfeltet'
                }
              >
                {label}
              </button>
            ))}
          </div>

          <span className="st-hint" style={{ margin: 0 }}>
            {chartView === 'hat'
              ? `${derived.rounds.length} runder · ${derived.stitches.length} masker`
              : `${derived.bodyCount} masker × ${design.bandRows} rader`}{' '}
            ·{' '}
            <b>
              {Math.round(derived.size.omkrets_cm)} cm rundt ×{' '}
              {Math.round(
                (design.bandRows / (derived.hook.gauge_fm_per_10cm * 1.15)) * 10,
              )}{' '}
              cm høyt
            </b>
          </span>
          <span style={{ flex: 1 }} />
          <button
            type="button"
            className="st-btn small"
            onClick={() => setCell((c) => Math.max(4, c - 2))}
            aria-label="Zoom ut"
          >
            −
          </button>
          <button
            type="button"
            className="st-btn small"
            onClick={() => setCell((c) => Math.min(20, c + 2))}
            aria-label="Zoom inn"
          >
            +
          </button>
        </div>
        {chartView === 'hat' ? null : painting ? (
          <div className={`st-modebanner ${tool}`}>
            {tool === 'brush' ? (
              <>
                <span
                  className="st-mode-dot"
                  style={{ background: YARN_HEX[activeYarn] }}
                />
                Du maler med <b>{YARN_NAME[activeYarn]}</b> — klikk og dra på
                diagrammet. Trykk <b>V</b> eller Esc for å velge og flytte igjen.
              </>
            ) : (
              <>
                <span className="st-mode-dot erase" />
                Du visker ut penselstrøk — klikk og dra på diagrammet. Trykk{' '}
                <b>V</b> eller Esc for å velge og flytte igjen.
              </>
            )}
          </div>
        ) : (
          <ActionBar />
        )}
        <div className={`st-chart-scroll mode-${tool}`}>
          {chartView === 'hat' ? (
            <FullChartPanel
              rounds={derived.rounds}
              stitches={derived.stitches}
              cell={Math.max(3, Math.round(cell * 0.55))}
              onPickBand={() => setChartView('band')}
            />
          ) : (
            <ChartPanel
              grid={derived.chart.grid}
              cell={cell}
              cols={derived.bodyCount}
              rows={design.bandRows}
              tool={tool}
              layers={design.layers}
              selectedId={selectedLayerId}
              onPaint={paint}
              onSelect={selectLayer}
              onPatch={updateLayer}
              highlight={
                findings.find((f) => f.id === focusFindingId)?.cells ?? undefined
              }
              safeAreas={safeAreas}
              frontCol={Math.round(derived.bodyCount * 0.095)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
