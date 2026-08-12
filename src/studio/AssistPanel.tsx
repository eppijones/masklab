import { useEffect, useRef } from 'react';
import { YARN_HEX, type YarnColor } from '../data/types';
import type { ColorGrid } from '../data/chartLayers';
import { deriveDesign, type StudioDesign } from './design';
import { REMIXES } from './assist/remix';
import { useStudio } from './store';

/**
 * Creative Assist.
 *
 * Describe the hat; get four hats back. They are not pictures — each one is a
 * finished set of studio layers on the real stitch grid, so the next move is
 * always to drag something rather than to start again.
 */

const EXAMPLES = [
  'retro norsk supporterhatt, NORGE foran, nordiske detaljer, rødt hvitt og blått',
  'svart og gul fotballhatt med skjold og teksten HEIA',
  'minimal nordisk hatt med selburose i blått og hvitt',
];

/** A whole design at a glance: the band, four stitches to the pixel. */
function MiniChart({ design, cell = 2 }: { design: StudioDesign; cell?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const derived = deriveDesign(design);
  const grid: ColorGrid = derived.chart.grid;

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const rows = grid.length;
    const cols = grid[0]?.length ?? 0;
    if (!rows || !cols) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = cols * cell * dpr;
    cv.height = rows * cell * dpr;
    cv.style.width = `${cols * cell}px`;
    cv.style.height = `${rows * cell}px`;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        ctx.fillStyle = YARN_HEX[grid[r][c] as YarnColor] ?? '#fff';
        ctx.fillRect(c * cell, r * cell, cell, cell);
      }
    }
  }, [grid, cell]);

  return <canvas ref={ref} className="st-mini" />;
}

export default function AssistPanel() {
  const briefText = useStudio((s) => s.briefText);
  const setBriefText = useStudio((s) => s.setBriefText);
  const runBrief = useStudio((s) => s.runBrief);
  const variations = useStudio((s) => s.variations);
  const useVariation = useStudio((s) => s.useVariation);
  const briefSummary = useStudio((s) => s.briefSummary);
  const remix = useStudio((s) => s.remix);
  const hasLayers = useStudio((s) => s.design.layers.length > 0);

  return (
    <section className="st-assist">
      <p className="st-sec-head">
        <span>Lag en hatt</span>
        <span style={{ textTransform: 'none', letterSpacing: 0 }}>
          beskriv den med ord
        </span>
      </p>

      <textarea
        className="st-brief"
        rows={3}
        value={briefText}
        placeholder="f.eks. retro norsk supporterhatt, NORGE foran, rødt hvitt og blått"
        onChange={(e) => setBriefText(e.target.value)}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') runBrief();
        }}
      />
      <div className="st-assist-run">
        <button type="button" className="st-btn primary" onClick={() => runBrief()}>
          Foreslå fire hatter
        </button>
        {briefSummary && <span className="st-hint" style={{ margin: 0 }}>{briefSummary}</span>}
      </div>

      {variations.length === 0 && (
        <div className="st-examples">
          {EXAMPLES.map((e) => (
            <button
              key={e}
              type="button"
              className="st-example"
              onClick={() => {
                setBriefText(e);
                runBrief(e);
              }}
            >
              {e}
            </button>
          ))}
        </div>
      )}

      {variations.length > 0 && (
        <div className="st-variations">
          {variations.map((v, i) => (
            <button
              key={v.id}
              type="button"
              className="st-variation"
              onClick={() => useVariation(i)}
              title={v.note}
            >
              <MiniChart design={v.design} />
              <span className="st-variation-name">{v.label}</span>
              <span className="st-variation-note">{v.note}</span>
            </button>
          ))}
        </div>
      )}

      {hasLayers && (
        <>
          <p className="st-sec-head" style={{ marginTop: 12 }}>
            <span>Vri på den</span>
          </p>
          <div className="st-remixes">
            {REMIXES.map((m) => (
              <button
                key={m.id}
                type="button"
                className="st-chip"
                onClick={() => remix(m.id)}
              >
                {m.label}
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
