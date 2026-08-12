import { useEffect, useRef, useState } from 'react';
import {
  SHAPE_CATEGORIES,
  shapesIn,
  type ShapeCategory,
  type ShapeSpec,
} from '../data/shapes/catalog';
import { rasterizeShape } from '../data/shapeRaster';
import { useStudio } from './store';

/**
 * The shape drawer.
 *
 * Each swatch is the shape as it will actually be crocheted — rasterized at a
 * small stitch count, not drawn as a smooth icon — so what you pick is what
 * you get. If a motif looks like mush in the picker, it will look like mush on
 * the hat, and that is worth knowing before you cast on.
 */

const SWATCH_W = 18;
const SWATCH_H = 14;

function ShapeSwatch({ spec }: { spec: ShapeSpec }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const w = spec.tiling ? SWATCH_W : Math.min(SWATCH_W, Math.max(6, Math.round(SWATCH_H * spec.aspect)));
    const grid = rasterizeShape(spec.id, { w, h: SWATCH_H, simplify: true });
    const cell = 2;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = SWATCH_W * cell * dpr;
    cv.height = SWATCH_H * cell * dpr;
    cv.style.width = `${SWATCH_W * cell}px`;
    cv.style.height = `${SWATCH_H * cell}px`;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, SWATCH_W * cell, SWATCH_H * cell);
    const pad = Math.floor((SWATCH_W - w) / 2);
    const shades = ['transparent', '#1a1a17', '#b7182e', '#8a8070'];
    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[r].length; c++) {
        const v = grid[r][c];
        if (!v) continue;
        ctx.fillStyle = shades[v];
        ctx.fillRect((c + pad) * cell, r * cell, cell, cell);
      }
    }
  }, [spec]);
  return <canvas ref={ref} aria-hidden />;
}

export default function ShapePicker() {
  const [open, setOpen] = useState(false);
  const [cat, setCat] = useState<ShapeCategory>('basic');
  const addShapeLayer = useStudio((s) => s.addShapeLayer);

  return (
    <section className="st-shapes">
      <button
        type="button"
        className="st-sec-head st-craft-head"
        onClick={() => setOpen((v) => !v)}
      >
        <span>Former og motiver</span>
        <span className="st-craft-pill">{open ? 'skjul' : 'vis'}</span>
      </button>

      {open && (
        <>
          <div className="st-shapecats">
            {SHAPE_CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`st-chip ${cat === c.id ? 'on' : ''}`}
                onClick={() => setCat(c.id)}
              >
                {c.label}
              </button>
            ))}
          </div>
          <div className="st-shapegrid">
            {shapesIn(cat).map((s) => (
              <button
                key={s.id}
                type="button"
                className="st-shapebtn"
                title={`${s.label} — minst ${s.minW}×${s.minH} masker`}
                onClick={() => addShapeLayer(s.id)}
              >
                <ShapeSwatch spec={s} />
                <span>{s.label}</span>
              </button>
            ))}
          </div>
          <p className="st-hint">
            Motivet legges inn i en størrelse som passer feltet. Dra det på
            diagrammet, eller bruk knappene over for å gjenta det rundt hatten.
          </p>
        </>
      )}
    </section>
  );
}
