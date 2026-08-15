import { YARN_HEX } from '../data/types';
import type { YarnColor } from '../data/types';

/** Dark yarns need light text; the pale end of the palette needs ink. */
export function inkOn(color: YarnColor): string {
  const hex = YARN_HEX[color];
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luma = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luma > 0.62 ? '#201D18' : '#FDFAF3';
}
