import type { DerivedPattern } from '../patterns/types';
import { YARN_NAME } from '../data/types';
import { materialsChecklistNo } from '../sizing/materials';
import { roundRuns } from '../data/pattern';

export function buildRecipeText(d: DerivedPattern): string {
  const lines: string[] = [];
  lines.push(`MASKLAB — ${d.definition.titleNo}`);
  lines.push(
    `Størrelse: ${d.size.navn} (ca. ${d.size.omkrets_cm} cm) · Nål: ${d.hook.mm
      .toFixed(1)
      .replace('.', ',')} mm`,
  );
  lines.push(`Masker rundt: ${d.bodyCount} · Runder: ${d.rounds.length}`);
  lines.push('');
  lines.push('MATERIALER');
  for (const item of materialsChecklistNo(d.materials)) {
    lines.push(`• ${item}`);
  }
  lines.push('');
  lines.push(d.materials.gaugeNoteNo);
  lines.push('');
  lines.push('OPPSKRIFT');
  for (const r of d.rounds) {
    const roundIdx = d.rounds.findIndex((x) => x.num === r.num);
    if (r.phase === 'text' && r.chartRow != null) {
      const runs = roundRuns(d.stitches, roundIdx);
      const parts = runs.map(
        (run) => `m ${run.from}–${run.to} ${YARN_NAME[run.color].toLowerCase()}`,
      );
      lines.push(`r${r.num}: ${parts.join(', ')} (${r.count} fm)`);
    } else if (r.phase === 'wave') {
      // A patterned flare carries its own colorwork; naming one yarn would lie.
      const suffix = r.patterned
        ? 'mønstret'
        : YARN_NAME[r.color];
      lines.push(
        `r${r.num}: bølgerad ${r.waveRow} — ${r.count} fm (${suffix})`,
      );
    } else {
      const k = r.increaseEvery;
      const rhythm =
        k === null
          ? '1 fm i hver'
          : k === 1
            ? '2 fm i hver'
            : `1 fm i ${k - 1}, 2 i neste`;
      lines.push(
        `r${r.num}: ${r.count} ${YARN_NAME[r.color].toLowerCase()} — ${rhythm}`,
      );
    }
  }
  lines.push('');
  lines.push(
    `Estimert tid: ca. ${Math.round(d.materials.estimatedMinutes / 60)} t ${
      d.materials.estimatedMinutes % 60
    } min`,
  );
  return lines.join('\n');
}

export default function RecipeText({ derived }: { derived: DerivedPattern }) {
  return <pre className="studio-recipe">{buildRecipeText(derived)}</pre>;
}
