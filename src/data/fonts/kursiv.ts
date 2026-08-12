import type { FontSpec } from './types';
import { FONT_BLOKK } from './blokk';

/**
 * Kursiv uses the same upright masters as blokk; italic charm comes from
 * shear at raster time (defaultSlantDeg ≈ 28° — visible italic on 5×7).
 */
export const FONT_KURSIV: FontSpec = {
  id: 'kursiv',
  cell: { w: 5, h: 7 },
  defaultSlantDeg: 28,
  glyphs: FONT_BLOKK.glyphs,
};
