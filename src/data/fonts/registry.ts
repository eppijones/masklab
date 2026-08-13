import type { FontId, FontSpec } from './types';
import { FONT_BLOKK } from './blokk';
import { FONT_KURSIV } from './kursiv';
import { FONT_SERIF } from './serif';
import { FONT_SMAL } from './smal';
import { FONT_RO } from './ro';
import { FONT_TAAKEFERD } from './taakeferd';
import { FONT_LYN } from './lyn';
import { FONT_RUNIK } from './runik';
import { FONT_NORGE26 } from './norge26';
import { FONT_NORGE_DISPLAY26 } from './norgeDisplay26';
import { FONT_NORGE_KURSIV26 } from './norgeKursiv26';

export type { FontId, FontSpec } from './types';

const FONTS: Record<FontId, FontSpec> = {
  blokk: FONT_BLOKK,
  kursiv: FONT_KURSIV,
  serif: FONT_SERIF,
  smal: FONT_SMAL,
  ro: FONT_RO,
  taakeferd: FONT_TAAKEFERD,
  lyn: FONT_LYN,
  runik: FONT_RUNIK,
  norge26: FONT_NORGE26,
  norgeDisplay26: FONT_NORGE_DISPLAY26,
  norgeKursiv26: FONT_NORGE_KURSIV26,
};

export function getFont(id: FontId): FontSpec {
  return FONTS[id];
}

export function listFonts(): FontSpec[] {
  return Object.values(FONTS);
}
