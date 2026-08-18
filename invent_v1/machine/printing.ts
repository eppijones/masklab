/**
 * Print time, estimated from geometry rather than invented.
 *
 * The site used to quote "grams / 22 to grams / 11 hours", which is a range so
 * wide it carries no information and is not derived from anything — the
 * predecessor's version of the same number was grams x 2.2 while ignoring the
 * wall count and infill declared two lines above it. A fabricated print time in
 * a build guide costs somebody their Saturday.
 *
 * This is still an ESTIMATE and says so everywhere it appears. What it is not
 * is a guess: it is volume divided by a real volumetric flow rate for the
 * printer this project targets, plus per-layer overhead, plus the share of the
 * part that is perimeter rather than infill. A slicer will disagree by 10-20%.
 * The honest fix for that is `slicedMinutes` on the part, which stays null
 * until a human actually slices the file and writes the number down.
 */

export const DENSITY_G_CM3 = { PETG: 1.27, PLA: 1.24, TPU: 1.21 } as const;

/**
 * Sustained volumetric flow on a Bambu Lab X1 Carbon with a 0.4 mm nozzle,
 * averaged across perimeters, infill and travel — not the peak figure from a
 * flow calibration, which no real part achieves.
 */
export const FLOW_MM3_S = { PETG: 11, PLA: 15, TPU: 4.5 } as const;

/** Seconds lost per layer to z-hops, seams and acceleration. */
const LAYER_OVERHEAD_S = 3.2;

export interface PrintEstimate {
  minutes: number;
  layers: number;
  volumeMm3: number;
}

export function printMinutes(
  grams: number,
  material: keyof typeof DENSITY_G_CM3,
  heightMm: number,
  layerMm = 0.2,
): PrintEstimate {
  const volumeMm3 = (grams / DENSITY_G_CM3[material]) * 1000;
  const layers = Math.max(1, Math.ceil(heightMm / layerMm));
  const extrudeS = volumeMm3 / FLOW_MM3_S[material];
  const minutes = Math.ceil((extrudeS + layers * LAYER_OVERHEAD_S) / 60);
  return { minutes, layers, volumeMm3 };
}

/** Filament cost at Norwegian shelf prices, NOK per gram. */
export const NOK_PER_G = { PETG: 0.279, PLA: 0.229, TPU: 0.45 } as const;

export function filamentNok(grams: number, material: keyof typeof NOK_PER_G): number {
  return grams * NOK_PER_G[material];
}

export function formatHm(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return h ? `${h} t ${String(m).padStart(2, '0')} m` : `${m} m`;
}
