/** Dumps rounds 14 & 15 stitch colors aligned, to verify what sits below what. */
import { buildRounds, buildStitches } from '../src/data/pattern';

const rounds = buildRounds();
const stitches = buildStitches(rounds);
const r14idx = rounds.findIndex((r) => r.num === 14);
const r15idx = rounds.findIndex((r) => r.num === 15);
const s14 = stitches.filter((s) => s.roundIdx === r14idx);
const s15 = stitches.filter((s) => s.roundIdx === r15idx);

const ch = (c: string) => (c === 'red' ? 'R' : '.');
let n = '';
let a = '';
let b = '';
for (let i = 0; i < 80; i++) {
  n += String((i + 1) % 10);
  a += ch(s15[i].color);
  b += ch(s14[i].color);
}
console.log('maske nr : ' + n);
console.log('runde 15 : ' + a);
console.log('runde 14 : ' + b);
console.log('');
for (const i of [31, 32, 33, 34, 35, 36, 37]) {
  console.log(`maske ${i + 1}: runde15=${s15[i].color}  under(runde14)=${s14[i].color}`);
}
