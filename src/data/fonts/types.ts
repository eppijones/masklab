export type FontId =
  | 'blokk'
  | 'kursiv'
  | 'serif'
  | 'smal'
  | 'ro'
  | 'taakeferd'
  | 'lyn'
  | 'runik'
  | 'norge26'
  | 'norgeDisplay26'
  | 'norgeKursiv26';

export interface FontSpec {
  id: FontId;
  /** Cell size of upright master glyphs (before shear). */
  cell: { w: number; h: number };
  /** Upright pixel masters; rows = strings of '.' | 'X'. */
  glyphs: Record<string, string[]>;
  /** Suggested slant for UI; shear still applied at raster time. */
  defaultSlantDeg: number;
  /**
   * A DRAWN italic: columns each master row moves right, top row first.
   *
   * When a face declares this, `rasterizeText` uses it INSTEAD of deriving the
   * shear from `slantDeg`, so the designer picks which row boundaries the lean
   * steps at rather than inheriting wherever `round(tan θ)` happens to tip. A
   * face that has to keep two-stitch strokes intact needs that control — the
   * derived staircase lands on the letters' own diagonals and cancels them
   * flat. See `norgeKursiv26.ts`, which is the reason this exists.
   *
   * One entry per master row. Scaled faces repeat each entry `scaleY` times.
   */
  lean?: number[];
}
