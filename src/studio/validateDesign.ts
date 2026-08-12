import type { ChartLayer, OverrideLayer } from '../data/chartLayers';
import { compositeChart } from '../data/chartLayers';
import type { HookMm } from '../sizing/hooks';
import type { SizeId } from '../sizing/sizes';

export interface DesignDraft {
  cols: number;
  rows: number;
  layers: ChartLayer[];
  override: OverrideLayer;
  hookMm: HookMm;
  sizeId: SizeId;
}

export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

const MAX_COLS = 200;
const MAX_ROWS = 35;
const MIN_COLS = 80;

export function validateDesign(draft: DesignDraft): ValidationResult {
  const errors: string[] = [];
  if (draft.cols < MIN_COLS || draft.cols > MAX_COLS) {
    errors.push(`Maskeantall må være mellom ${MIN_COLS} og ${MAX_COLS}.`);
  }
  if (draft.cols % 10 !== 0) {
    errors.push('Maskeantall må være delelig med 10 (bølgeblokk).');
  }
  if (draft.rows < 6 || draft.rows > MAX_ROWS) {
    errors.push(`Båndhøyde må være mellom 6 og ${MAX_ROWS} rader.`);
  }
  try {
    const grid = compositeChart(
      draft.layers,
      draft.override,
      draft.cols,
      draft.rows,
      'white',
    );
    if (grid.length !== draft.rows) errors.push('Diagrammet har feil antall rader.');
    if (grid.some((r) => r.length !== draft.cols)) {
      errors.push('Diagrammet har feil antall kolonner.');
    }
  } catch (e) {
    errors.push(`Kunne ikke bygge diagram: ${String(e)}`);
  }
  if (!draft.hookMm) errors.push('Velg nålstørrelse.');
  if (!draft.sizeId) errors.push('Velg størrelse.');
  return { ok: errors.length === 0, errors };
}
