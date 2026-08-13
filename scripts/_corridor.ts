import { derivePattern } from '../src/patterns/buildFromDefinition';
import { listPatterns } from '../src/patterns/registry';

const CH: Record<string,string> = { blue:'b', white:'w', red:'r', lightblue:'l', black:'k', yellow:'y', gold:'g', orange:'o', pink:'p', slate:'s', stone:'n' };
const FRAC = 0.095 + 0.25;
const HALF = 4; // corridor is 9 wide

for (const def of listPatterns().filter((p) => p.id.startsWith('norway26'))) {
  const d = derivePattern(def);
  const byRound: string[][] = d.rounds.map(() => []);
  for (const s of d.stitches) byRound[s.roundIdx].push(s.color);
  console.log(`\n${def.id}  (ground ${def.background}) — corridor window, crown → wall → brim`);
  let missing = 0;
  const lines: string[] = [];
  d.rounds.forEach((r, i) => {
    const colors = byRound[i];
    const n = colors.length;
    const centre = Math.round(FRAC * n);
    let s = '';
    let ink = 0;
    for (let k = -HALF; k <= HALF; k++) {
      const c = colors[((centre + k) % n + n) % n];
      s += CH[c] ?? '?';
      if (c !== def.background) ink++;
    }
    if (r.phase !== 'top' || n >= 20) { if (ink === 0) missing++; }
    lines.push(`  ${String(r.num).padStart(2)} ${r.phase.padEnd(9)} ${String(n).padStart(3)} ${s}${ink === 0 ? '   <-- bare' : ''}`);
  });
  console.log(lines.join('\n'));
  console.log(`  rounds with no colour in the corridor: ${missing}`);
}
