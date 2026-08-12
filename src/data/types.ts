export type YarnColor =
  | 'white'
  | 'cream'
  | 'sand'
  | 'peach'
  | 'pink'
  | 'magenta'
  | 'red'
  | 'burgundy'
  | 'rust'
  | 'orange'
  | 'gold'
  | 'yellow'
  | 'lime'
  | 'mint'
  | 'green'
  | 'forest'
  | 'teal'
  | 'turquoise'
  | 'lightblue'
  | 'blue'
  | 'violet'
  | 'purple'
  | 'brown'
  | 'stone'
  | 'slate'
  | 'black';

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
  /**
   * True when this round has per-stitch colorwork even though its phase is
   * not 'text'/'wave' (scripted patterns like Flagget, procedural crowns like
   * NUSA). Enables stitch-by-stitch stepping + color-change guidance.
   */
  patterned?: boolean;
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
  // Ordered as a spectrum: the palette in the studio is read left to right,
  // so neighbouring swatches should be neighbouring colours.
  white: '#F6F0E1',
  cream: '#F0E2C4',
  sand: '#D9C7A3',
  peach: '#F2A07B',
  pink: '#E88BA6',
  magenta: '#B5195E',
  red: '#BA0C2F',
  burgundy: '#6E1023',
  rust: '#A8420F',
  orange: '#E2661E',
  gold: '#D99A1B',
  yellow: '#F2C230',
  lime: '#A5C63B',
  mint: '#9FD8BE',
  green: '#2E7D4F',
  forest: '#17452F',
  teal: '#1B6C79',
  turquoise: '#2BB3AE',
  lightblue: '#6E86C0',
  blue: '#00205B',
  violet: '#7E5BC2',
  purple: '#57307E',
  brown: '#6B4423',
  stone: '#BDB6AC',
  slate: '#8A867F',
  black: '#23211E',
};

export const YARN_NAME: Record<YarnColor, string> = {
  white: 'Hvit',
  cream: 'Krem',
  sand: 'Sand',
  peach: 'Fersken',
  pink: 'Rosa',
  magenta: 'Magenta',
  red: 'Rød',
  burgundy: 'Vinrød',
  rust: 'Rust',
  orange: 'Oransje',
  gold: 'Gyllen',
  yellow: 'Gul',
  lime: 'Lime',
  mint: 'Mint',
  green: 'Grønn',
  forest: 'Skoggrønn',
  teal: 'Petrol',
  turquoise: 'Turkis',
  lightblue: 'Lyseblå',
  blue: 'Blå',
  violet: 'Fiolett',
  purple: 'Lilla',
  brown: 'Brun',
  stone: 'Lys grå',
  slate: 'Grå',
  black: 'Svart',
};

export const YARN_NAME_EN: Record<YarnColor, string> = {
  white: 'White',
  cream: 'Cream',
  sand: 'Sand',
  peach: 'Peach',
  pink: 'Pink',
  magenta: 'Magenta',
  red: 'Red',
  burgundy: 'Burgundy',
  rust: 'Rust',
  orange: 'Orange',
  gold: 'Golden',
  yellow: 'Yellow',
  lime: 'Lime',
  mint: 'Mint',
  green: 'Green',
  forest: 'Forest green',
  teal: 'Teal',
  turquoise: 'Turquoise',
  lightblue: 'Light blue',
  blue: 'Blue',
  violet: 'Violet',
  purple: 'Purple',
  brown: 'Brown',
  stone: 'Light grey',
  slate: 'Grey',
  black: 'Black',
};

/**
 * Colour words that do not inflect in Norwegian — the ones borrowed from
 * materials and dyes ("rosa sokker", never "rosae sokker"). Everything else
 * takes a plural -e, unless it already ends in a vowel.
 */
const INDECLINABLE = new Set<YarnColor>([
  'pink',
  'purple',
  'magenta',
  'mint',
  'lime',
  'sand',
  'cream',
  'rust',
  'peach',
  'orange',
  'teal',
  'stone',
  'slate',
  'lightblue',
  'blue',
]);

function plural(name: string, id: YarnColor): string {
  if (INDECLINABLE.has(id)) return name.toLowerCase();
  const w = name.toLowerCase();
  if (/[aeiouyåæø]$/.test(w)) return w;
  // gyllen → gylne, not gyllene.
  if (w.endsWith('en')) return `${w.slice(0, -2)}ne`;
  return `${w}e`;
}

const YARN_IDS = Object.keys(YARN_HEX) as YarnColor[];

/** Lower-case singular, as it reads inside a sentence. */
export const YARN_WORD: Record<YarnColor, string> = Object.fromEntries(
  YARN_IDS.map((id) => [id, YARN_NAME[id].toLowerCase()]),
) as Record<YarnColor, string>;

/** Lower-case plural: "3 røde masker". */
export const YARN_WORD_PLURAL: Record<YarnColor, string> = Object.fromEntries(
  YARN_IDS.map((id) => [id, plural(YARN_NAME[id], id)]),
) as Record<YarnColor, string>;

export const YARN_WORD_EN: Record<YarnColor, string> = Object.fromEntries(
  YARN_IDS.map((id) => [id, YARN_NAME_EN[id].toLowerCase()]),
) as Record<YarnColor, string>;
