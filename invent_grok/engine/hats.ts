import hatsJson from '../data/hats.json';

export interface PaletteColor {
  id: string;
  hex: string;
}

export interface HatRound {
  num: number;
  phase: string;
  count: number;
  increaseEvery: number | null;
  colors: number[];
  inc: number[];
}

export interface HatSnap {
  id: string;
  name: string;
  collection: string;
  difficulty: string;
  desc: string;
  hook: string;
  time: string;
  hookMm: number;
  omkretsCm: number;
  bodyCount: number;
  totalStitches: number;
  totalRounds: number;
  estimatedMinutes: number;
  palette: PaletteColor[];
  rounds: HatRound[];
}

interface FileShape {
  source: string;
  snappedAt: string;
  hats: HatSnap[];
}

const FILE = hatsJson as FileShape;

export const HATS: HatSnap[] = FILE.hats;
export const SNAPSHOT_META = { source: FILE.source, snappedAt: FILE.snappedAt };

export function hatById(id: string): HatSnap {
  return HATS.find((h) => h.id === id) ?? HATS[0];
}

export const DEFAULT_HAT_ID = 'norway26-training';
