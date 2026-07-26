/** Aligned dump of rounds 14-16 to analyse stroke offsets stitch by stitch. */
import { buildRounds, buildStitches } from '../src/data/pattern';
const rounds = buildRounds();
const stitches = buildStitches(rounds);
const get = (num: number) => {
  const idx = rounds.findIndex((r) => r.num === num);
  return stitches.filter((s) => s.roundIdx === idx);
};
const ch = (c: string) => (c === 'red' ? 'R' : '.');
const line = (num: number) => get(num).map((s) => ch(s.color)).join('');
let ruler = '';
for (let i = 1; i <= 80; i++) ruler += String(i % 10);
console.log('maske    : ' + ruler);
console.log('runde 16 : ' + line(16));
console.log('runde 15 : ' + line(15));
console.log('runde 14 : ' + line(14));
// list pairs of round 15 and what sits below each stitch
const s14 = get(14), s15 = get(15), s16 = get(16);
console.log('\nRunde 15-par mot runde 14 under:');
for (let i = 0; i < 80; i++) {
  if (s15[i].color === 'red' && (i === 0 || s15[i - 1].color !== 'red')) {
    const a = i + 1, b = i + 2;
    console.log(`  par ${a}-${b}: under ${a}=${s14[i].color}, under ${b}=${s14[i + 1].color}`);
  }
}
console.log('\nRunde 16-par mot runde 15 under:');
for (let i = 0; i < 80; i++) {
  if (s16[i].color === 'red' && (i === 0 || s16[i - 1].color !== 'red')) {
    const a = i + 1, b = i + 2;
    console.log(`  par ${a}-${b}: under ${a}=${s15[i].color}, under ${b}=${s15[i + 1].color}`);
  }
}
