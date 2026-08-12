import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { YARN_HEX, type YarnColor } from '../data/types';
import type { ChartLayer, ColorGrid } from '../data/chartLayers';
import { isFreeText } from '../data/chartLayers';
import {
  clampRow,
  imagePlacement,
  placementBox,
  placementNear,
  shapePlacements,
  textPlacements,
  type Placement,
  type PlacementBox,
} from '../data/layerGeometry';
import { dragHint, dragPatch, type HandleId } from './dragTransform';

/**
 * The chart, and the drawing board.
 *
 * One cell per stitch — but the chart is not just a readout: the artwork on it
 * is grabbable. Drag a word to move it around the hat, pull a corner to make
 * it bigger in whole stitches, pull the top edge to slant it, the knob above
 * it to tilt the baseline. Everything snaps to stitches and rows, because
 * that is the only resolution the hat has.
 */

export type Tool = 'select' | 'brush' | 'erase';

interface Handle {
  id: HandleId;
  x: number;
  y: number;
  cursor: string;
  title: string;
}

interface Drag {
  handle: HandleId;
  layerId: string;
  /** Pointer position at grab, in chart cells (fractional). */
  fromRow: number;
  fromCol: number;
  /** Layer values at grab. */
  start: {
    row: number;
    col: number;
    centerFrac: number | null;
    scaleX: number;
    scaleY: number;
    slantDeg: number;
    rise: number;
  };
  box: PlacementBox;
  moved: boolean;
  mergeKey: string;
}

const HANDLE_PX = 9;
const PAD = 14;

export interface ChartPanelProps {
  grid: ColorGrid;
  cell?: number;
  cols: number;
  rows: number;
  tool: Tool;
  layers: ChartLayer[];
  selectedId: string | null;
  /** Stitch index that sits at the front of the hat (marker line). */
  frontCol?: number;
  /** Cells a craft-check finding is pointing at. */
  highlight?: [number, number][];
  /** Draw the front/back keep-out guides. */
  safeAreas?: boolean;
  onPaint: (row: number, col: number, strokeId: number) => void;
  onSelect: (id: string | null) => void;
  onPatch: (id: string, patch: Record<string, unknown>, mergeKey: string) => void;
}

/** Placements of a layer, or none for the kinds that fill the whole band. */
function layerPlacements(
  layer: ChartLayer,
  cols: number,
): Placement[] {
  if (layer.hidden) return [];
  if (layer.kind === 'text') {
    return isFreeText(layer) ? textPlacements(layer, cols) : [];
  }
  if (layer.kind === 'shape') return shapePlacements(layer, cols);
  if (layer.kind === 'image') {
    const p = imagePlacement(layer, cols);
    return p ? [p] : [];
  }
  return [];
}

export default function ChartPanel({
  grid,
  cell = 9,
  cols,
  rows,
  tool,
  layers,
  selectedId,
  frontCol,
  highlight,
  safeAreas,
  onPaint,
  onSelect,
  onPatch,
}: ChartPanelProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [stroke, setStroke] = useState<number | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [cursor, setCursor] = useState('default');
  const width = cols * cell + PAD;
  const height = rows * cell + PAD;
  const painting = tool === 'brush' || tool === 'erase';

  const selected = useMemo(
    () => layers.find((l) => l.id === selectedId) ?? null,
    [layers, selectedId],
  );

  /** Boxes of the selected layer's copies, in chart-cell space. */
  const boxes = useMemo(() => {
    if (!selected || painting) return [];
    return layerPlacements(selected, cols)
      .map(placementBox)
      .filter((b): b is PlacementBox => b != null);
  }, [selected, cols, painting]);

  /**
   * The copy that carries the handles. A word repeated around the hat is one
   * layer with one anchor, so the handles live on the anchored copy — and if
   * that copy has wrapped past the seam, on its visible half.
   */
  const primary = useMemo((): PlacementBox | null => {
    if (boxes.length === 0) return null;
    const b = boxes[0];
    const center = b.col0 + b.width / 2;
    return center >= cols ? { ...b, col0: b.col0 - cols } : b;
  }, [boxes, cols]);

  const handles = useMemo((): Handle[] => {
    if (!primary || !selected) return [];
    const x0 = PAD + primary.col0 * cell;
    // A box whose top has climbed out of the band would hang its handles off
    // the canvas, where no pointer can reach them. Keep the grabbable edges
    // inside the drawing, even when the artwork itself is not.
    const y0 = Math.max(0, primary.row0 * cell);
    const w = primary.width * cell;
    const h = Math.min(rows * cell, (primary.row1 + 1) * cell) - y0;
    const list: Handle[] = [
      { id: 'scale', x: x0, y: y0, cursor: 'nwse-resize', title: 'Skaler' },
      { id: 'scale', x: x0 + w, y: y0, cursor: 'nesw-resize', title: 'Skaler' },
      { id: 'scale', x: x0, y: y0 + h, cursor: 'nesw-resize', title: 'Skaler' },
      { id: 'scale', x: x0 + w, y: y0 + h, cursor: 'nwse-resize', title: 'Skaler' },
      { id: 'scale-x', x: x0 + w, y: y0 + h / 2, cursor: 'ew-resize', title: 'Bredde' },
      { id: 'scale-y', x: x0 + w / 2, y: y0 + h, cursor: 'ns-resize', title: 'Høyde' },
    ];
    if (selected.kind === 'text') {
      list.push(
        { id: 'slant', x: x0 + w / 2, y: y0, cursor: 'ew-resize', title: 'Skråstill' },
        {
          id: 'rise',
          x: x0 + w + 16,
          y: y0 + h / 2,
          cursor: 'ns-resize',
          title: 'Stigning',
        },
      );
    }
    return list;
  }, [primary, selected, cell, rows]);

  // ---- Paint ----------------------------------------------------------
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
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        ctx.fillStyle = YARN_HEX[grid[r]?.[c] as YarnColor] ?? '#ffffff';
        ctx.fillRect(PAD + c * cell, r * cell, cell, cell);
      }
    }

    // Grid: hairlines every stitch, stronger every tenth.
    ctx.lineWidth = 1;
    for (let c = 0; c <= cols; c++) {
      const x = Math.round(PAD + c * cell) + 0.5;
      ctx.strokeStyle = c % 10 === 0 ? 'rgba(26,26,23,0.4)' : 'rgba(26,26,23,0.1)';
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, rows * cell);
      ctx.stroke();
    }
    for (let r = 0; r <= rows; r++) {
      const y = Math.round(r * cell) + 0.5;
      ctx.strokeStyle = 'rgba(26,26,23,0.16)';
      ctx.beginPath();
      ctx.moveTo(PAD, y);
      ctx.lineTo(PAD + cols * cell, y);
      ctx.stroke();
    }

    // Row numbers (chart row 1 = first round of the band).
    ctx.fillStyle = '#8a8070';
    ctx.font = '8px Karla, sans-serif';
    ctx.textBaseline = 'middle';
    for (let r = 0; r < rows; r++) {
      ctx.fillText(String(r + 1), 2, r * cell + cell / 2);
    }
    ctx.textBaseline = 'top';
    for (let c = 0; c < cols; c += 10) {
      ctx.fillText(String(c), PAD + c * cell + 1, rows * cell + 2);
    }

    if (frontCol != null) {
      ctx.strokeStyle = '#b7182e';
      ctx.lineWidth = 1.5;
      const x = Math.round(PAD + frontCol * cell) + 0.5;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, rows * cell);
      ctx.stroke();
      ctx.fillStyle = '#b7182e';
      ctx.font = '8px Karla, sans-serif';
      ctx.fillText('foran', x + 2, rows * cell + 2);
    }

    // Safe areas: the panels that actually face people. Artwork drifting out
    // of them ends up over an ear, where nobody reads it.
    if (safeAreas && frontCol != null) {
      ctx.save();
      const panel = Math.round(cols * 0.28);
      for (const centre of [frontCol, frontCol + Math.round(cols / 2)]) {
        for (const edge of [centre - panel / 2, centre + panel / 2]) {
          const cx = ((Math.round(edge) % cols) + cols) % cols;
          const x = Math.round(PAD + cx * cell) + 0.5;
          ctx.strokeStyle = 'rgba(26,26,23,0.28)';
          ctx.setLineDash([2, 4]);
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, rows * cell);
          ctx.stroke();
        }
      }
      ctx.setLineDash([]);
      ctx.restore();
    }

    // Craft-check highlight: hatch the cells the finding points at.
    if (highlight && highlight.length > 0) {
      ctx.save();
      ctx.strokeStyle = 'rgba(183,24,46,0.9)';
      ctx.lineWidth = 1.4;
      for (const [r, c] of highlight) {
        if (r < 0 || r >= rows || c < 0 || c >= cols) continue;
        const x = PAD + c * cell;
        const y = r * cell;
        ctx.beginPath();
        ctx.moveTo(x + 1, y + cell - 1);
        ctx.lineTo(x + cell - 1, y + 1);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Selection: every copy outlined, the anchored one with handles.
    if (boxes.length > 0) {
      ctx.save();
      for (const b of boxes) {
        const h = (b.row1 - b.row0 + 1) * cell;
        // A box that runs past the seam is drawn twice: once running off the
        // right edge, once coming back in on the left.
        for (const shift of [0, -cols]) {
          const x = PAD + (b.col0 + shift) * cell;
          if (x > width || x + b.width * cell < 0) continue;
          ctx.strokeStyle = 'rgba(26,26,23,0.35)';
          ctx.setLineDash([3, 3]);
          ctx.lineWidth = 1;
          ctx.strokeRect(
            Math.round(x) + 0.5,
            Math.round(b.row0 * cell) + 0.5,
            b.width * cell,
            h,
          );
        }
      }
      ctx.setLineDash([]);
      if (primary) {
        const x = PAD + primary.col0 * cell;
        const y = primary.row0 * cell;
        const w = primary.width * cell;
        const h = (primary.row1 - primary.row0 + 1) * cell;
        ctx.strokeStyle = '#b7182e';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(Math.round(x) + 0.5, Math.round(y) + 0.5, w, h);
        for (const hd of handles) {
          ctx.fillStyle = hd.id === 'rise' ? '#1a1a17' : '#ffffff';
          ctx.strokeStyle = '#b7182e';
          ctx.lineWidth = 1.2;
          if (hd.id === 'rise' || hd.id === 'slant') {
            ctx.beginPath();
            ctx.arc(hd.x, hd.y, HANDLE_PX / 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
          } else {
            ctx.fillRect(
              hd.x - HANDLE_PX / 2,
              hd.y - HANDLE_PX / 2,
              HANDLE_PX,
              HANDLE_PX,
            );
            ctx.strokeRect(
              hd.x - HANDLE_PX / 2 + 0.5,
              hd.y - HANDLE_PX / 2 + 0.5,
              HANDLE_PX - 1,
              HANDLE_PX - 1,
            );
          }
        }
      }
      ctx.restore();
    }
  }, [
    grid,
    rows,
    cols,
    cell,
    width,
    height,
    frontCol,
    boxes,
    primary,
    handles,
    highlight,
    safeAreas,
  ]);

  // ---- Pointer --------------------------------------------------------
  const pointAt = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      return {
        x,
        y,
        colF: (x - PAD) / cell,
        rowF: y / cell,
        col: Math.floor((x - PAD) / cell),
        row: Math.floor(y / cell),
      };
    },
    [cell],
  );

  const handleAt = useCallback(
    (x: number, y: number): Handle | null => {
      const slack = HANDLE_PX;
      for (const h of handles) {
        if (Math.abs(h.x - x) <= slack && Math.abs(h.y - y) <= slack) return h;
      }
      return null;
    },
    [handles],
  );

  /** Topmost visible layer with ink at (row, col) — one stitch of slack. */
  const layerAt = useCallback(
    (row: number, col: number): string | null => {
      for (let i = layers.length - 1; i >= 0; i--) {
        const layer = layers[i];
        if (layer.locked) continue;
        for (const p of layerPlacements(layer, cols)) {
          if (placementNear(p, row, col, cols, 1)) return layer.id;
        }
      }
      return null;
    },
    [layers, cols],
  );

  const beginDrag = useCallback(
    (handle: HandleId, layer: ChartLayer, rowF: number, colF: number) => {
      if (!primary) return;
      const text = layer.kind === 'text' ? layer : null;
      setDrag({
        handle,
        layerId: layer.id,
        fromRow: rowF,
        fromCol: colF,
        start: {
          row: layer.anchor.row,
          col: layer.anchor.col,
          centerFrac: text?.centerFrac ?? null,
          scaleX: text?.scaleX ?? 1,
          scaleY: text?.scaleY ?? 1,
          slantDeg: text?.slantDeg ?? 0,
          rise: text?.rise ?? 0,
        },
        box: primary,
        moved: false,
        mergeKey: `${handle}:${layer.id}:${Date.now()}`,
      });
    },
    [primary],
  );

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const pt = pointAt(e);
    // Capture keeps a drag alive when the pointer leaves the canvas — but a
    // pointer that is already gone (a cancelled touch, a synthetic event)
    // makes this throw, and losing the whole interaction over a nicety is not
    // a trade worth making.
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* no capture: the drag still tracks while the pointer stays on canvas */
    }

    if (painting) {
      if (pt.row < 0 || pt.row >= rows || pt.col < 0 || pt.col >= cols) return;
      const id = Date.now();
      setStroke(id);
      onPaint(pt.row, pt.col, id);
      return;
    }

    const hit = handleAt(pt.x, pt.y);
    if (hit && selected) {
      beginDrag(hit.id, selected, pt.rowF, pt.colF);
      return;
    }

    const id = layerAt(pt.row, pt.col);
    if (!id) {
      onSelect(null);
      setHint(null);
      return;
    }
    if (id !== selectedId) onSelect(id);
    const layer = layers.find((l) => l.id === id);
    // The box the drag measures against is the freshly selected layer's, so
    // resolve it here rather than waiting for the memo to catch up.
    if (layer) {
      const b = layerPlacements(layer, cols)
        .map(placementBox)
        .filter((x): x is PlacementBox => x != null)[0];
      if (b) {
        const center = b.col0 + b.width / 2;
        const box = center >= cols ? { ...b, col0: b.col0 - cols } : b;
        const text = layer.kind === 'text' ? layer : null;
        setDrag({
          handle: 'move',
          layerId: layer.id,
          fromRow: pt.rowF,
          fromCol: pt.colF,
          start: {
            row: layer.anchor.row,
            col: layer.anchor.col,
            centerFrac: text?.centerFrac ?? null,
            scaleX: text?.scaleX ?? 1,
            scaleY: text?.scaleY ?? 1,
            slantDeg: text?.slantDeg ?? 0,
            rise: text?.rise ?? 0,
          },
          box,
          moved: false,
          mergeKey: `move:${layer.id}:${Date.now()}`,
        });
      }
    }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const pt = pointAt(e);

    if (painting) {
      if (stroke === null) return;
      if (pt.row < 0 || pt.row >= rows || pt.col < 0 || pt.col >= cols) return;
      onPaint(pt.row, pt.col, stroke);
      return;
    }

    if (!drag) {
      const hit = handleAt(pt.x, pt.y);
      if (hit) {
        setCursor(hit.cursor);
        setHint(hit.title);
      } else {
        const over = layerAt(pt.row, pt.col);
        setCursor(over ? 'grab' : 'default');
        setHint(null);
      }
      return;
    }

    const patch = dragPatch({
      handle: drag.handle,
      start: drag.start,
      box: drag.box,
      fromRow: drag.fromRow,
      fromCol: drag.fromCol,
      toRow: pt.rowF,
      toCol: pt.colF,
      cols,
    });

    if (drag.handle === 'move') {
      // The band is all there is: artwork dragged past its edge would simply
      // not exist on the hat, so the move stops at the last row that fits.
      const moving = layers.find((l) => l.id === drag.layerId);
      if (moving && moving.kind !== 'motif') {
        patch.row = clampRow(moving, cols, rows, Number(patch.row));
      }
      if (
        Number(patch.row) === drag.start.row &&
        patch.centerFrac === drag.start.centerFrac &&
        patch.col === drag.start.col &&
        !drag.moved
      ) {
        return;
      }
    }
    setHint(dragHint(drag.handle, patch, drag.start));

    if (Object.keys(patch).length > 0) {
      onPatch(drag.layerId, patch, drag.mergeKey);
      if (!drag.moved) setDrag({ ...drag, moved: true });
    }
  };

  const endPointer = useCallback(() => {
    setStroke(null);
    setDrag(null);
    setHint(null);
  }, []);

  /**
   * A pointerup can go missing — a context menu opens, the tab loses focus,
   * capture is lost mid-drag. Without a backstop the canvas stays in grab
   * mode and the next innocent click drags the artwork across the hat, so the
   * release is also watched at the window while a gesture is live.
   */
  useEffect(() => {
    if (!drag && stroke === null) return;
    window.addEventListener('pointerup', endPointer);
    window.addEventListener('pointercancel', endPointer);
    window.addEventListener('blur', endPointer);
    return () => {
      window.removeEventListener('pointerup', endPointer);
      window.removeEventListener('pointercancel', endPointer);
      window.removeEventListener('blur', endPointer);
    };
  }, [drag, stroke, endPointer]);

  return (
    <div className="st-chart-holder">
      <canvas
        ref={ref}
        className="st-chart-canvas"
        style={{ cursor: painting ? 'crosshair' : drag ? 'grabbing' : cursor }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        onPointerLeave={() => {
          if (!drag && stroke === null) setHint(null);
        }}
      />
      {hint && <span className="st-chart-hud">{hint}</span>}
    </div>
  );
}

