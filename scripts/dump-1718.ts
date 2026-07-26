import { buildRounds, buildStitches } from '../src/data/pattern';
const rounds = buildRounds();
const stitches = buildStitches(rounds);
const get = (num: number) => stitches.filter((s) => s.roundIdx === rounds.findIndex((r) => r.num === num));
const line = (n: number) => get(n).map((s) => (s.color === 'red' ? 'R' : '.')).join('');
let ruler = '';
for (let i = 1; i <= 80; i++) ruler += String(i % 10);
console.log('maske    : ' + ruler);
console.log('runde 20 : ' + line(20));
console.log('runde 19 : ' + line(19));
// runs for both
for (const n of [19, 20]) {
  const s = get(n);
  const runs: string[] = [];
  let start = 0;
  for (let i = 1; i <= 80; i++) {
    if (i === 80 || s[i].color !== s[start].color) {
      const end = i === 80 && s[i]?.color === s[start].color ? 80 : i;
      runs.push(`${end - start} ${s[start].color === 'red' ? 'røde' : 'hvite'} (${start + 1}-${end})`);
      start = i;
    }
  }
  console.log(`\nRunde ${n}: ` + runs.join(' · '));
}
