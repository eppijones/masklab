/**
 * Photo → stitch bitmap. The picture is downsampled to one sample per stitch,
 * levelled, then thresholded (optionally with Floyd–Steinberg dithering, which
 * reads much better at 40 stitches wide than a hard cut).
 */

export interface PhotoOpts {
  cols: number;
  rows: number;
  /** −50…50 */
  contrast: number;
  /** −50…50 */
  brightness: number;
  dither: boolean;
  invert: boolean;
}

/** Source pixels per layer, kept for re-rasterising when sliders move. */
const sources = new Map<string, ImageData>();

export function rememberSource(layerId: string, data: ImageData): void {
  sources.set(layerId, data);
}

export function sourceFor(layerId: string): ImageData | null {
  return sources.get(layerId) ?? null;
}

export function forgetSource(layerId: string): void {
  sources.delete(layerId);
}

/** Read a picked file into ImageData at a workable working size. */
export async function readImageData(file: File): Promise<ImageData> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Kunne ikke lese bildet.'));
      el.src = url;
    });
    const max = 480;
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));
    const cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    const ctx = cv.getContext('2d');
    if (!ctx) throw new Error('Canvas utilgjengelig.');
    ctx.drawImage(img, 0, 0, w, h);
    return ctx.getImageData(0, 0, w, h);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Average luminance per output cell, 0..1. */
function sampleGrid(src: ImageData, cols: number, rows: number): number[][] {
  const out: number[][] = [];
  for (let r = 0; r < rows; r++) {
    const row: number[] = [];
    const y0 = Math.floor((r / rows) * src.height);
    const y1 = Math.max(y0 + 1, Math.floor(((r + 1) / rows) * src.height));
    for (let c = 0; c < cols; c++) {
      const x0 = Math.floor((c / cols) * src.width);
      const x1 = Math.max(x0 + 1, Math.floor(((c + 1) / cols) * src.width));
      let sum = 0;
      let n = 0;
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const i = (y * src.width + x) * 4;
          const a = src.data[i + 3] / 255;
          // Transparent pixels read as paper, not as ink.
          const lum =
            (0.2126 * src.data[i] +
              0.7152 * src.data[i + 1] +
              0.0722 * src.data[i + 2]) /
            255;
          sum += lum * a + (1 - a);
          n++;
        }
      }
      row.push(n ? sum / n : 1);
    }
    out.push(row);
  }
  return out;
}

export function photoToBitmap(src: ImageData, opts: PhotoOpts): boolean[][] {
  const { cols, rows, dither, invert } = opts;
  const grid = sampleGrid(src, cols, rows);
  const contrast = 1 + opts.contrast / 50;
  const brightness = opts.brightness / 100;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      let v = (grid[r][c] - 0.5) * contrast + 0.5 + brightness;
      v = Math.min(1, Math.max(0, v));
      grid[r][c] = v;
    }
  }

  const out: boolean[][] = Array.from({ length: rows }, () =>
    Array<boolean>(cols).fill(false),
  );

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const v = grid[r][c];
      const on = v < 0.5;
      out[r][c] = invert ? !on : on;
      if (!dither) continue;
      const err = v - (on ? 0 : 1);
      const spread = (dr: number, dc: number, k: number) => {
        const rr = r + dr;
        const cc = c + dc;
        if (rr < 0 || rr >= rows || cc < 0 || cc >= cols) return;
        grid[rr][cc] = Math.min(1, Math.max(0, grid[rr][cc] + err * k));
      };
      spread(0, 1, 7 / 16);
      spread(1, -1, 3 / 16);
      spread(1, 0, 5 / 16);
      spread(1, 1, 1 / 16);
    }
  }

  return out;
}
