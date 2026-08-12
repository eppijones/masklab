import { isPatternId, type PatternDefinition, type PatternId } from './types';
import { RO_RO_RO } from './ro-ro-ro';
import { FLAGGET } from './flagget';
import { MARTIN } from './martin';
import { NORWAY26 } from './norway26';
import { NORWAY26_WHITE } from './norway26White';
import { NORWAY26_BLACK } from './norway26Black';
import { NORWAY26_TRAINING } from './norway26Training';
import { NORWAY26_KEEPER } from './norway26Keeper';

export { isPatternId };

const PATTERNS: Record<Exclude<PatternId, 'custom'>, PatternDefinition> = {
  'ro-ro-ro': RO_RO_RO,
  flagget: FLAGGET,
  martin: MARTIN,
  norway26: NORWAY26,
  'norway26-white': NORWAY26_WHITE,
  'norway26-black': NORWAY26_BLACK,
  'norway26-training': NORWAY26_TRAINING,
  'norway26-keeper': NORWAY26_KEEPER,
};

export function getPattern(id: PatternId): PatternDefinition {
  if (id === 'custom') {
    return {
      ...RO_RO_RO,
      id: 'custom',
      title: 'Egendefinert',
      titleNo: 'Egendefinert',
      chartLayers: [],
    };
  }
  return PATTERNS[id];
}

export function listPatterns(): PatternDefinition[] {
  return Object.values(PATTERNS);
}
