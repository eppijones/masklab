/**
 * Validates that the encoded pattern matches Helene Spilling's 4.0 mm recipe:
 * - stitch counts per round (10…80, plain 80×2, 90, plain 90×2, 100, text×10, 110, 120, waves, 144)
 * - increase rhythms produce exactly the expected counts
 * - the RO RO RO chart is 10 rows of exactly 100 stitches
 * - the wave brim matches Helene Spilling's chart (10-stitch repeat, 6 rows,
 *   12 blocks, increases in rows 4 and 5)
 * - color changes are marked on the stitch BEFORE each color boundary
 */
import { buildRounds, buildStitches, expectedCount } from '../src/data/pattern';
import {
  CHART_GRID,
  CHART_COLS,
  CHART_ROWS,
  chartRowRuns,
  chartStitchColor,
} from '../src/data/chart';
import { WAVE_CHART_DISPLAY, WAVE_COUNTS, WAVE_BLOCKS, waveStitchColor } from '../src/data/waves';

let failures = 0;
const check = (cond: boolean, msg: string) => {
  if (cond) {
    console.log(`  ok   ${msg}`);
  } else {
    failures++;
    console.error(`  FAIL ${msg}`);
  }
};

console.log('Runde-tall (oppskriften):');
const EXPECTED_TOP = [
  10, 20, 30, 30, 40, 40, 40, 50, 60, 70, 70, 70, 80, 80, 80, 90, 90, 90, 100,
];
const rounds = buildRounds();
EXPECTED_TOP.forEach((n, i) => {
  check(rounds[i].count === n, `runde ${i + 1}: ${rounds[i].count} = ${n}`);
});

console.log('Tekstfeltet:');
const textRounds = rounds.filter((r) => r.phase === 'text');
check(textRounds.length === 10, `10 tekstrunder (${textRounds.length})`);
check(
  textRounds.every((r) => r.count === 100),
  'alle tekstrunder har 100 masker',
);
check(
  textRounds.every((r, i) => r.num === 20 + i && r.chartRow === i + 1),
  'runde 20-29 = diagramrad 1-10',
);

console.log('Bremøkninger:');
const r30 = rounds.find((r) => r.num === 30)!;
const r31 = rounds.find((r) => r.num === 31)!;
check(r30.count === 110 && r30.color === 'white', 'runde 30: 110 hvite');
check(r31.count === 120 && r31.color === 'white', 'runde 31: 120 hvite');

console.log('Bølgebremmen (Helene Spillings mønster):');
const waveRounds = rounds.filter((r) => r.phase === 'wave');
check(waveRounds.length === 6, `6 bølgerader (${waveRounds.length})`);
const EXPECTED_WAVE = [120, 120, 120, 132, 144, 144];
EXPECTED_WAVE.forEach((n, i) => {
  check(
    waveRounds[i].count === n,
    `bølgerad ${i + 1}: ${waveRounds[i].count} = ${n} masker`,
  );
});
check(
  WAVE_CHART_DISPLAY.length === 6 && WAVE_CHART_DISPLAY.every((r) => r.length === 10),
  'bølgediagrammet er 10 ruter x 6 rader per blokk',
);
check(
  WAVE_CHART_DISPLAY[3].includes('R') && WAVE_CHART_DISPLAY[4].includes('R'),
  'økningene (røde ruter) ligger i rad 4 og 5',
);
check(WAVE_CHART_DISPLAY[5] === 'BBBBBBBBBB', 'rad 6 er helblå');
check(WAVE_BLOCKS === 12, `WAVE_BLOCKS = ${WAVE_BLOCKS}`);
check(
  WAVE_COUNTS.join(',') === '120,120,120,132,144,144',
  `WAVE_COUNTS = ${WAVE_COUNTS.join(',')}`,
);
for (let row = 1; row <= 6; row++) {
  const count = EXPECTED_WAVE[row - 1];
  const block = count / WAVE_BLOCKS;
  let periodic = true;
  for (let i = 0; i < count; i++) {
    if (waveStitchColor(row, i) !== waveStitchColor(row, i % block)) periodic = false;
  }
  check(
    periodic && Number.isInteger(block),
    `bølgerad ${row}: ${WAVE_BLOCKS} identiske blokker à ${block}`,
  );
}
const last = rounds[rounds.length - 1];
check(
  last.phase === 'brim' && last.count === 144 && last.color === 'blue',
  'siste runde: helblå kant med 144 masker',
);

console.log('Økerytmene stemmer matematisk:');
rounds.forEach((r, i) => {
  if (i === 0 || r.phase === 'wave') return;
  const prev = rounds[i - 1];
  check(
    expectedCount(prev.count, r.increaseEvery) === r.count,
    `runde ${r.num}: ${prev.count} -> ${r.count} (rytme ${r.increaseEvery ?? 'ingen økning'})`,
  );
});
check(expectedCount(120, 10) === 132, 'bølgerad 4: 120 -> 132');
check(expectedCount(132, 11) === 144, 'bølgerad 5: 132 -> 144');

console.log('Maskene genereres riktig:');
const stitches = buildStitches(rounds);
const total = rounds.reduce((n, r) => n + r.count, 0);
check(stitches.length === total, `totalt ${stitches.length} masker = ${total}`);
rounds.forEach((r, idx) => {
  const inRound = stitches.filter((s) => s.roundIdx === idx);
  check(inRound.length === r.count, `runde ${r.num}: ${inRound.length} masker generert`);
});

console.log('Diagrammet (RO RO RO):');
check(CHART_GRID.length === CHART_ROWS, `${CHART_ROWS} rader`);
check(
  CHART_GRID.every((row) => row.length === CHART_COLS),
  `alle rader har ${CHART_COLS} ruter`,
);
for (let row = 1; row <= CHART_ROWS; row++) {
  const runs = chartRowRuns(row);
  const sum = runs.reduce((n, r) => n + r.count, 0);
  check(sum === CHART_COLS, `rad ${row}: fargeløpene summerer til ${sum}`);
}
const redCells = CHART_GRID.flat().filter(Boolean).length;
check(redCells > 100, `diagrammet har røde ruter (${redCells})`);

console.log('Arbeidsretning (fasit for runde 20 = diagramrad 1):');
// R is crocheted FIRST in each word — proof that direction is correct.
const row1 = chartRowRuns(1)
  .map((r) => `${r.count}${r.color === 'red' ? 'R' : 'W'}`)
  .join(',');
const firstRed = chartRowRuns(1).find((r) => r.color === 'red')!;
check(
  firstRed.count === 6 && firstRed.from === 3,
  `første røde felt er 6 bredt fra maske 3 (R-toppen, ikke O) — retningen er riktig (løp: ${row1})`,
);
for (let row = 1; row <= CHART_ROWS; row++) {
  let consistent = true;
  for (let s = 1; s <= CHART_COLS; s++) {
    const expected = CHART_GRID[row - 1][s - 1] ? 'red' : 'white';
    if (chartStitchColor(row, s) !== expected) consistent = false;
  }
  check(consistent, `rad ${row}: maske s = kolonne s (venstre kant først)`);
}

console.log('Fargebytter markeres i masken FØR:');
const textStitches = stitches.filter((s) => rounds[s.roundIdx].phase === 'text');
const boundaries = textStitches.filter((s) => s.changeColorAfter !== null).length;
check(boundaries > 0, `${boundaries} fargebytter i tekstfeltet`);
const waveStitches = stitches.filter((s) => rounds[s.roundIdx].phase === 'wave');
const waveBoundaries = waveStitches.filter((s) => s.changeColorAfter !== null).length;
check(waveBoundaries > 0, `${waveBoundaries} fargebytter i bølgene`);
let markedCorrectly = true;
for (let i = 0; i < stitches.length - 1; i++) {
  const a = stitches[i];
  const b = stitches[i + 1];
  if (a.color !== b.color && a.changeColorAfter !== b.color) markedCorrectly = false;
  if (a.color === b.color && a.changeColorAfter !== null) markedCorrectly = false;
}
check(markedCorrectly, 'alle fargegrenser er markert på masken før grensen');

console.log('');
if (failures > 0) {
  console.error(`${failures} valideringsfeil!`);
  process.exit(1);
}
console.log('Alt stemmer med oppskriften.');
