/**
 * One-way dump of the eight catalog hats into invent/heklo/data/hats.json.
 * Reads parent src/; writes only inside invent/heklo/. Never run at site boot.
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { CATALOG } from '../../../src/platform/catalog.ts';
import { getPattern } from '../../../src/patterns/registry.ts';
import { derivePattern } from '../../../src/patterns/buildFromDefinition.ts';
import { YARN_HEX, type YarnColor } from '../../../src/data/types.ts';

const here = dirname(fileURLToPath(import.meta.url));
const outPath = join(here, '../data/hats.json');

const hats = CATALOG.map((card) => {
  const def = getPattern(card.id);
  const derived = derivePattern(def, {
    sizeId: def.defaults.sizeId,
    hookMm: def.defaults.hookMm,
  });

  const paletteIds: YarnColor[] = [];
  const indexOf = (c: YarnColor) => {
    let i = paletteIds.indexOf(c);
    if (i < 0) {
      i = paletteIds.length;
      paletteIds.push(c);
    }
    return i;
  };

  const byRound = derived.rounds.map((r) => ({
    num: r.num,
    phase: r.phase,
    count: r.count,
    increaseEvery: r.increaseEvery,
    colors: new Array<number>(r.count).fill(indexOf(r.color)),
    inc: [] as number[],
  }));

  for (const s of derived.stitches) {
    const row = byRound[s.roundIdx];
    if (!row) continue;
    row.colors[s.i] = indexOf(s.color);
    if (s.isIncrease) row.inc.push(s.i);
  }

  return {
    id: card.id,
    name: card.name,
    collection: card.collection,
    difficulty: card.difficulty,
    desc: card.desc,
    hook: card.hook,
    time: card.time,
    hookMm: derived.hook.mm,
    omkretsCm: derived.size.omkrets_cm,
    bodyCount: derived.bodyCount,
    totalStitches: derived.stitches.length,
    totalRounds: derived.rounds.length,
    estimatedMinutes: derived.materials.estimatedMinutes,
    palette: paletteIds.map((id) => ({
      id,
      hex: YARN_HEX[id],
    })),
    rounds: byRound,
  };
});

const payload = {
  source: 'StrikkeApp catalog, dame size, pattern default hook. One-way snapshot.',
  snappedAt: new Date().toISOString().slice(0, 10),
  hats,
};

writeFileSync(outPath, JSON.stringify(payload));
const kb = Math.round(Buffer.byteLength(JSON.stringify(payload)) / 1024);
console.log(`wrote ${hats.length} hats, ${kb} KB → ${outPath}`);
for (const h of hats) {
  console.log(
    `  ${h.id.padEnd(22)} ${String(h.totalRounds).padStart(2)} rnd  ${String(h.totalStitches).padStart(5)} st  ${h.name}`,
  );
}
