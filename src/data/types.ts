export type YarnColor = 'white' | 'red' | 'blue';

export type Phase = 'top' | 'text' | 'brim-inc' | 'wave' | 'brim' | 'finish';

/** One crocheted round of the hat. */
export interface Round {
  /** 1-based hat round number (Runde 1, Runde 2, ...) */
  num: number;
  phase: Phase;
  /** Number of fastmasker after this round is complete. */
  count: number;
  /** Base yarn color of the round (text rounds override per stitch via the chart). */
  color: YarnColor;
  /**
   * Increase rhythm: `null` = plain round (1 fm i hver maske).
   * `k` = "fm i k-1 masker, deretter 2 fm i neste maske", repeated.
   * `1` = 2 fm in every stitch.
   */
  increaseEvery: number | null;
  /** Chart row (1-10, bottom-up) for text rounds, otherwise null. */
  chartRow: number | null;
  /** Wave chart row (1-6, bottom-up) for wave-brim rounds, otherwise null. */
  waveRow?: number | null;
  /** Short label, e.g. "Runde 5". */
  label: string;
}

export interface Stitch {
  /** Index of the round this stitch belongs to (0-based into rounds array). */
  roundIdx: number;
  /** 0-based position within the round. */
  i: number;
  color: YarnColor;
  /** True when this is the 2nd stitch worked into the same stitch below (an increase). */
  isIncrease: boolean;
  /**
   * True when you must switch to a new color while finishing THIS stitch
   * (the next stitch has a different color).
   */
  changeColorAfter: YarnColor | null;
}

export const YARN_HEX: Record<YarnColor, string> = {
  white: '#F6F0E1',
  red: '#BA0C2F',
  blue: '#00205B',
};

export const YARN_NAME: Record<YarnColor, string> = {
  white: 'Hvit',
  red: 'Rød',
  blue: 'Blå',
};
