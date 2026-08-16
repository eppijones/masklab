/**
 * One-way snapshot: the parent app's pattern data -> invent_v1/data/hats.json.
 *
 *   ./node_modules/.bin/tsx invent_v1/scripts/snapshot-hats.ts
 *
 * Run from the repo root under the PARENT's tsx. This is one of only two files
 * in invent_v1 permitted to import from src/ at runtime (the other is
 * verify.ts, which re-derives and diffs to prove this snapshot is not stale).
 * Everything else uses `import type` only, so the machine can never silently
 * weld itself to the product.
 *
 * Nothing is ever written back into src/.
 */

import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { CATALOG } from '../../src/platform/catalog.ts';
import { derivePattern } from '../../src/patterns/buildFromDefinition.ts';
import { getPattern } from '../../src/patterns/registry.ts';
import { YARN_HEX, type YarnColor } from '../../src/data/types.ts';
import { buildProfile } from '../../src/lib/hatGeometry.ts';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'hats.json');

export interface HatSnap {
  id: string;
  name: string;
  hookMm: number;
  omkretsCm: number;
  bodyCount: number;
  /** Stitch unit in mm: omkrets * 10 / bodyCount. The machine's gate pitch. */
  suMm: number;
  totalStitches: number;
  totalRounds: number;
  colorChanges: number;
  palette: { id: string; hex: string }[];
  rounds: {
    num: number;
    phase: string;
    count: number;
    increaseEvery: number | null;
    /** One palette index per stitch. Length === count. */
    colors: number[];
    /** Indices within the round that are increases. */
    inc: number[];
  }[];
  /** Ring stack in millimetres, crown first. Drives the mandrel and the Z/R path. */
  profile: { r: number; y: number }[];
}

function main() {
  const hats: HatSnap[] = [];

  for (const entry of CATALOG) {
    const def = getPattern(entry.id);
    const d = derivePattern(def, { sizeId: def.defaults.sizeId, hookMm: def.defaults.hookMm });

    const palette: string[] = [];
    const idx = (c: YarnColor): number => {
      const i = palette.indexOf(c);
      if (i >= 0) return i;
      palette.push(c);
      return palette.length - 1;
    };

    let colorChanges = 0;
    const rounds = d.rounds.map((r, ri) => {
      const st = d.stitches.filter((s) => s.roundIdx === ri);
      const colors = st.map((s) => idx(s.color));
      const inc = st.map((s, i) => (s.isIncrease ? i : -1)).filter((i) => i >= 0);
      colorChanges += st.filter((s) => s.changeColorAfter !== null).length;

      if (colors.length !== r.count) {
        throw new Error(
          `${entry.id} round ${r.num}: ${colors.length} stitches but round.count says ${r.count}`,
        );
      }
      return {
        num: r.num,
        phase: r.phase,
        count: r.count,
        increaseEvery: r.increaseEvery,
        colors,
        inc,
      };
    });

    const suMm = (d.size.omkrets_cm * 10) / d.bodyCount;
    const profile = buildProfile(d.rounds).map((p) => ({
      r: Number((p.r * suMm).toFixed(2)),
      y: Number((p.y * suMm).toFixed(2)),
    }));

    hats.push({
      id: entry.id,
      name: entry.name ?? entry.id,
      hookMm: d.hook.mm,
      omkretsCm: d.size.omkrets_cm,
      bodyCount: d.bodyCount,
      suMm: Number(suMm.toFixed(3)),
      totalStitches: d.stitches.length,
      totalRounds: d.rounds.length,
      colorChanges,
      palette: palette.map((c) => ({ id: c, hex: YARN_HEX[c as YarnColor] })),
      rounds,
      profile,
    });

    console.log(
      `  ${entry.id.padEnd(20)} ${String(d.rounds.length).padStart(3)} rnd  ` +
        `${String(d.stitches.length).padStart(5)} st  ` +
        `${String(colorChanges).padStart(5)} col  su ${suMm.toFixed(2)} mm`,
    );
  }

  writeFileSync(
    OUT,
    `${JSON.stringify(
      {
        source: 'StrikkeApp catalog, pattern default size and hook. One-way snapshot.',
        snappedAt: new Date().toISOString().slice(0, 10),
        hats,
      },
      null,
      1,
    )}\n`,
  );
  console.log(`\nwrote data/hats.json — ${hats.length} hats`);
}

main();
