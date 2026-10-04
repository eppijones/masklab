export interface CostPart { id: string; material: string; grams: number; qty: number }
export interface Plate { id: string; material: string; grams: number; hours: number; contents: Record<string, number> }
export interface CostInputs { prices: Record<string, number>; wastePct: number; hourly: number; setup: number; shipping: number; vatPct: number }
export function estimateJob(parts: CostPart[], inputs: CostInputs, plates: Plate[] = []) {
  const sliced = plates.length > 0;
  const coverage = parts.every(p => plates.reduce((s, plate) => s + (plate.contents[p.id] ?? 0), 0) === p.qty)
    && plates.every(plate => Object.entries(plate.contents).every(([id, qty]) => qty > 0 && Number.isInteger(qty) && parts.some(p => p.id === id && p.material === plate.material)));
  const grams: Record<string, number> = {};
  if (sliced && coverage) {
    for (const p of plates) grams[p.material] = (grams[p.material] ?? 0) + p.grams;
  } else for (const p of parts) grams[p.material] = (grams[p.material] ?? 0) + p.grams * p.qty;
  const materialNok = Object.entries(grams).reduce((s, [m, g]) => s + g * (1 + inputs.wastePct / 100) * inputs.prices[m] / 1000, 0);
  const hours = sliced && coverage ? plates.reduce((s, p) => s + p.hours, 0) : null;
  const subtotal = materialNok + inputs.setup + inputs.shipping + (hours === null ? 0 : hours * inputs.hourly);
  return { grams, materialNok, hours, quoteNok: hours === null ? null : subtotal * (1 + inputs.vatPct / 100), coverage };
}
