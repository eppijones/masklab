export type FontId =
  | 'blokk'
  | 'kursiv'
  | 'serif'
  | 'smal'
  | 'ro'
  | 'taakeferd'
  | 'lyn'
  | 'runik'
  | 'norge26';

export interface FontSpec {
  id: FontId;
  /** Cell size of upright master glyphs (before shear). */
  cell: { w: number; h: number };
  /** Upright pixel masters; rows = strings of '.' | 'X'. */
  glyphs: Record<string, string[]>;
  /** Suggested slant for UI; shear still applied at raster time. */
  defaultSlantDeg: number;
}
