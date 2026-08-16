/**
 * Read-only dump of all 8 published hats into a compact browser payload.
 * Run from repo root:
 *   npx tsx invent_fable_plan_withGrok/tools/dump-patterns.ts
 *
 * Does not modify src/. Writes:
 *   invent_fable_plan_withGrok/data/patterns.js
 *   invent_fable_plan_withGrok/tools/.profile.json
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { derivePattern } from '../../src/patterns/buildFromDefinition';
import { listPatterns } from '../../src/patterns/registry';
import { buildProfile } from '../../src/lib/hatGeometry';
import {
  YARN_HEX,
  YARN_NAME,
  YARN_NAME_EN,
  type YarnColor,
} from '../../src/data/types';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const dataDir = resolve(root, 'data');

type Run = [len: number, palIdx: number];

function runLength(colors: YarnColor[], palette: YarnColor[]): Run[] {
  const runs: Run[] = [];
  if (colors.length === 0) return runs;
  let palIdx = palette.indexOf(colors[0]);
  let len = 1;
  for (let i = 1; i < colors.length; i++) {
    const idx = palette.indexOf(colors[i]);
    if (idx === palIdx) {
      len++;
    } else {
      runs.push([len, palIdx]);
      palIdx = idx;
      len = 1;
    }
  }
  runs.push([len, palIdx]);
  return runs;
}

function expandRuns(runs: Run[], palette: YarnColor[]): YarnColor[] {
  const out: YarnColor[] = [];
  for (const [len, palIdx] of runs) {
    const c = palette[palIdx];
    for (let k = 0; k < len; k++) out.push(c);
  }
  return out;
}

const patterns = listPatterns();
const dumped = [];
let largest: { id: string; stitches: number; rings: { r: number; y: number }[] } | null =
  null;

for (const def of patterns) {
  const derived = derivePattern(def);
  const { rounds, stitches } = derived;
  const palette: YarnColor[] = [];
  const seen = new Set<YarnColor>();
  const add = (c: YarnColor) => {
    if (!seen.has(c)) {
      seen.add(c);
      palette.push(c);
    }
  };
  for (const st of stitches) add(st.color);
  for (const r of rounds) add(r.color);

  const byRound: YarnColor[][] = rounds.map((r) =>
    Array<YarnColor>(r.count).fill(r.color),
  );
  const incByRound: number[][] = rounds.map(() => []);
  for (const st of stitches) {
    byRound[st.roundIdx][st.i] = st.color;
    if (st.isIncrease) incByRound[st.roundIdx].push(st.i);
  }

  const roundPayload = rounds.map((r, ri) => {
    const runs = runLength(byRound[ri], palette);
    return {
      num: r.num,
      phase: r.phase,
      count: r.count,
      color: r.color,
      inc: r.increaseEvery,
      runs,
      incIdx: incByRound[ri],
    };
  });

  // Round-trip fidelity vs the per-stitch stream.
  let s = 0;
  let colorChanges = 0;
  for (let ri = 0; ri < rounds.length; ri++) {
    const expanded = expandRuns(roundPayload[ri].runs, palette);
    if (expanded.length !== rounds[ri].count) {
      throw new Error(
        `${def.id} round ${rounds[ri].num}: run length ${expanded.length} != count ${rounds[ri].count}`,
      );
    }
    const incSet = new Set(roundPayload[ri].incIdx);
    for (let i = 0; i < expanded.length; i++) {
      const st = stitches[s];
      if (st.roundIdx !== ri || st.i !== i) {
        throw new Error(`${def.id}: stitch index mismatch at ${s}`);
      }
      if (st.color !== expanded[i]) {
        throw new Error(
          `${def.id} r${rounds[ri].num} i${i}: color ${st.color} != ${expanded[i]}`,
        );
      }
      if (Boolean(st.isIncrease) !== incSet.has(i)) {
        throw new Error(`${def.id} r${rounds[ri].num} i${i}: increase flag mismatch`);
      }
      if (s > 0 && stitches[s].color !== stitches[s - 1].color) colorChanges++;
      s++;
    }
  }
  if (s !== stitches.length) {
    throw new Error(`${def.id}: expanded ${s} != stitches ${stitches.length}`);
  }

  dumped.push({
    id: def.id,
    title: def.title,
    titleNo: def.titleNo,
    stitches: stitches.length,
    colorChanges,
    rounds: rounds.length,
    palette,
    roundMeta: roundPayload,
  });

  if (!largest || stitches.length > largest.stitches) {
    largest = {
      id: def.id,
      stitches: stitches.length,
      rings: buildProfile(rounds),
    };
  }

  console.log(
    `${def.id.padEnd(20)} ${String(stitches.length).padStart(4)} sts  ${String(colorChanges).padStart(4)} changes  ${rounds.length} rounds`,
  );
}

const counts = dumped.map((p) => p.stitches);
const changes = dumped.map((p) => p.colorChanges);
const minS = Math.min(...counts);
const maxS = Math.max(...counts);
const minC = Math.min(...changes);
const maxC = Math.max(...changes);
if (dumped.length !== 8) throw new Error(`expected 8 patterns, got ${dumped.length}`);
if (minS < 2700 || maxS > 3800) {
  throw new Error(`stitch totals ${minS}–${maxS} outside expected 2778–3694 band`);
}
if (minC < 200 || maxC > 1600) {
  throw new Error(`color-change totals ${minC}–${maxC} outside expected 285–1412 band`);
}

mkdirSync(dataDir, { recursive: true });

const payload = {
  generatedAt: new Date().toISOString(),
  yarnHex: YARN_HEX,
  yarnName: YARN_NAME,
  yarnNameEn: YARN_NAME_EN,
  patterns: dumped,
};

const js = `/* generated by tools/dump-patterns.ts — do not edit */
window.HEKLOMAT_DATA = ${JSON.stringify(payload)};
`;
writeFileSync(resolve(dataDir, 'patterns.js'), js);

if (!largest) throw new Error('no profile');
writeFileSync(
  resolve(here, '.profile.json'),
  JSON.stringify(
    {
      id: largest.id,
      stitches: largest.stitches,
      stitchW_mm: 5.8,
      rings: largest.rings,
    },
    null,
    2,
  ) + '\n',
);

console.log(`wrote data/patterns.js (${(js.length / 1024).toFixed(1)} KB)`);
console.log(`wrote tools/.profile.json from ${largest.id} (${largest.stitches} sts)`);
console.log(`totals: ${minS}–${maxS} sts, ${minC}–${maxC} color changes, ${dumped.length} patterns`);
