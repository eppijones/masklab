/**
 * Validates:
 *  - RO RO RO golden recipe (unchanged legacy checks + registry parity)
 *  - "Vi som elsker Martin" against the official PDF round schedule
 *  - "Flagget til topps" against the official PDF round schedule + color runs
 *  - The three NORWAY26 kits (shared silhouette, determinism, text legibility,
 *    palette split, and whether the colorwork is actually crochetable)
 *  - Font parity + color-change invariants everywhere
 */
import { buildRounds, buildStitches, expectedCount } from '../src/data/pattern';
import {
  CHART_GRID,
  CHART_COLS,
  CHART_ROWS,
  chartRowRuns,
  chartStitchColor,
  notesChartParityComposite,
} from '../src/data/chart';
import { WAVE_CHART_DISPLAY, WAVE_COUNTS, WAVE_BLOCKS, waveStitchColor } from '../src/data/waves';
import { getFont } from '../src/data/fonts/registry';
import { layoutText } from '../src/data/rasterizeText';
import {
  fontHeight,
  placementBox,
  textGlyphPieces,
  textPiece,
  textPlacements,
} from '../src/data/layerGeometry';
import { listPatterns, getPattern } from '../src/patterns/registry';
import { deriveDesign, designFromPattern } from '../src/studio/design';
import { derivePattern, deriveRoDefault } from '../src/patterns/buildFromDefinition';
import { expandRuns } from '../src/patterns/script';
import { computeSpokeFracDeltas } from '../src/lib/hatGeometry';
import { HOOKS } from '../src/sizing/hooks';
import { SIZES } from '../src/sizing/sizes';
import type { Stitch, YarnColor } from '../src/data/types';
import type { TextLayer } from '../src/data/chartLayers';
import type { FontId, FontSpec } from '../src/data/fonts/types';
import { keepOutFromTextPlacement, keepOutMetrics } from '../src/data/textKeepOut';
import { inKeepOutZone, keepOutZoneFromParams } from '../src/data/motifs';
import { NORGE_KEEP_OUT, NORGE_TEXT } from '../src/patterns/norwayKit';
import { HAT_A, HAT_B } from './proto-masklab';

let failures = 0;
const check = (cond: boolean, msg: string) => {
  if (cond) {
    console.log(`  ok   ${msg}`);
  } else {
    failures++;
    console.error(`  FAIL ${msg}`);
  }
};

function checkColorChangeInvariant(stitches: Stitch[], label: string) {
  let markedCorrectly = true;
  for (let i = 0; i < stitches.length - 1; i++) {
    const a = stitches[i];
    const b = stitches[i + 1];
    if (a.color !== b.color && a.changeColorAfter !== b.color) markedCorrectly = false;
    if (a.color === b.color && a.changeColorAfter !== null) markedCorrectly = false;
  }
  check(markedCorrectly, `${label}: alle fargegrenser markert på masken FØR grensen`);
}

console.log('Runde-tall (RO-oppskriften):');
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

console.log('Økerytmene stemmer matematisk (RO):');
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

console.log('Maskene genereres riktig (RO):');
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

console.log('Font/layoutText-paritet (ro, slant=0):');
const laid = layoutText(['RO', 'RO', 'RO'], 100, 1, getFont('ro'), {
  slantDeg: 0,
  letterSpacing: 1,
  bandRows: 10,
});
let layoutEq = laid.length === CHART_ROWS;
for (let r = 0; r < CHART_ROWS && layoutEq; r++) {
  for (let c = 0; c < CHART_COLS; c++) {
    if (laid[r][c] !== CHART_GRID[r][c]) layoutEq = false;
  }
}
check(layoutEq, 'layoutText(ro) ≡ CHART_GRID');
check(notesChartParityComposite(), 'compositeChart(RO-lag) ≡ CHART_GRID');

console.log('Arbeidsretning (fasit for runde 20 = diagramrad 1):');
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

console.log('Fargebytter markeres i masken FØR (RO):');
const textStitches = stitches.filter((s) => rounds[s.roundIdx].phase === 'text');
const boundaries = textStitches.filter((s) => s.changeColorAfter !== null).length;
check(boundaries > 0, `${boundaries} fargebytter i tekstfeltet`);
const waveStitches = stitches.filter((s) => rounds[s.roundIdx].phase === 'wave');
const waveBoundaries = waveStitches.filter((s) => s.changeColorAfter !== null).length;
check(waveBoundaries > 0, `${waveBoundaries} fargebytter i bølgene`);
checkColorChangeInvariant(stitches, 'RO');

console.log('RO-PARITET: registry-avledet RO (dame+4.0) ≡ legacy-runder:');
const derivedRo = deriveRoDefault();
check(derivedRo.bodyCount === 100, `bodyCount=${derivedRo.bodyCount}`);
check(derivedRo.bandRows === 10, `bandRows=${derivedRo.bandRows}`);
check(
  derivedRo.rounds.length === rounds.length,
  `rundeantall ${derivedRo.rounds.length} = ${rounds.length}`,
);
let derivedMatch = derivedRo.rounds.length === rounds.length;
for (let i = 0; i < rounds.length && derivedMatch; i++) {
  if (
    derivedRo.rounds[i].count !== rounds[i].count ||
    derivedRo.rounds[i].phase !== rounds[i].phase
  ) {
    derivedMatch = false;
  }
}
check(derivedMatch, 'deriveRoDefault().rounds ≡ buildRounds()');
let roStitchMatch = derivedRo.stitches.length === stitches.length;
for (let i = 0; i < stitches.length && roStitchMatch; i++) {
  if (derivedRo.stitches[i].color !== stitches[i].color) roStitchMatch = false;
}
check(roStitchMatch, 'deriveRoDefault().stitches ≡ buildStitches() (farge for farge)');

/* ================= "Vi som elsker Martin" (PDF-fasit) ================= */
console.log('MARTIN — rundetall mot PDF-en:');
const martin = derivePattern(getPattern('martin'));
const MARTIN_COUNTS = [
  10, 20, 30, 30, 40, 40, 40, 50, 60, 70, 70, 70, 80, 80, 80, 90, 90, 90, 100, // 1-19
  100, 100, 100, 100, 100, 100, 100, 100, 100, 100, // 20-29 ØDEGAARD
  110, 110, 110, 110, 120, 130, 130, 140, 150, 150, // 30-39
];
check(
  martin.rounds.length === 39,
  `39 runder (${martin.rounds.length})`,
);
MARTIN_COUNTS.forEach((n, i) => {
  check(martin.rounds[i]?.count === n, `runde ${i + 1}: ${martin.rounds[i]?.count} = ${n}`);
});
const MARTIN_COLORS: [number, number, YarnColor][] = [
  [1, 12, 'red'],
  [13, 13, 'white'],
  [14, 15, 'blue'],
  [16, 16, 'white'],
  [17, 29, 'red'],
  [30, 38, 'red'],
  [39, 39, 'white'],
];
for (const [from, to, color] of MARTIN_COLORS) {
  const ok = martin.rounds
    .filter((r) => r.num >= from && r.num <= to)
    .every((r) => r.color === color);
  check(ok, `runde ${from}-${to}: grunnfarge ${color}`);
}
check(
  martin.rounds.filter((r) => r.phase === 'text').length === 10,
  '10 ØDEGAARD-runder',
);
// Rhythm math on every round with a regular increase.
martin.rounds.forEach((r, i) => {
  if (i === 0 || r.increaseEvery === null) return;
  const prev = martin.rounds[i - 1];
  check(
    expectedCount(prev.count, r.increaseEvery) === r.count,
    `runde ${r.num}: ${prev.count} -> ${r.count} (øke i hver ${r.increaseEvery}.)`,
  );
});
// ØDEGAARD is actually painted: white cells in the red band.
const martinTextStitches = martin.stitches.filter(
  (s) => martin.rounds[s.roundIdx].phase === 'text',
);
const martinWhite = martinTextStitches.filter((s) => s.color === 'white').length;
check(martinWhite > 300, `ØDEGAARD-bokstavene er malt (${martinWhite} hvite masker i feltet)`);
check(
  martinTextStitches.some((s) => s.color === 'red'),
  'rød bakgrunn i tekstfeltet',
);
// PDF note: 18 red before Ø on chart row 1; letters read L→R (not mirrored).
{
  const row1 = martin.chart.grid[0] ?? [];
  const firstWhite = row1.findIndex((c) => c === 'white');
  check(firstWhite === 18, `Ø starter etter 18 røde (col ${firstWhite})`);
}
checkColorChangeInvariant(martin.stitches, 'MARTIN');

/* ================= "Flagget til topps" (PDF-fasit) ================= */
console.log('FLAGGET — rundetall mot PDF-en:');
const flagget = derivePattern(getPattern('flagget'));
// NB: PDF-en skriver «102» i runde 28, men dens egen repetisjon
// (13 forbrukte masker x 8) gir 104 — 104 er den konsistente verdien.
const FLAGGET_COUNTS = [
  10, 20, 30, 30, 40, 40, 48, 56, 64, 72, 80, 88, 88, 88, // 1-14 toppen
  88, 88, 88, 88, 88, 88, 88, 88, 96, 96, 96, 96, 96, // 15-27 midtpartiet
  104, 112, 112, 120, 128, 128, 136, // 28-34 kanten
];
check(flagget.rounds.length === 34, `34 runder (${flagget.rounds.length})`);
FLAGGET_COUNTS.forEach((n, i) => {
  check(flagget.rounds[i]?.count === n, `runde ${i + 1}: ${flagget.rounds[i]?.count} = ${n}`);
});
check(
  flagget.rounds.filter((r) => r.phase === 'text').length === 13,
  '13 midtparti-runder (15-27)',
);
// Per-round runs resolve to the exact stitch counts and increases.
const flaggetDef = getPattern('flagget');
flaggetDef.script!.forEach((s, i) => {
  if (!s.runs) return;
  const prev = i > 0 ? flaggetDef.script![i - 1].count : 0;
  const { colors, increases } = expandRuns(s.runs, s.count);
  const nInc = increases.filter(Boolean).length;
  check(
    colors.length === s.count && s.count - prev === (prev === 0 ? s.count : nInc),
    `runde ${i + 1}: løpene gir ${colors.length} masker, ${nInc} økninger (${prev} -> ${s.count})`,
  );
});
// Round 19 pattern: 1 hvit, 7 røde, 1 hvit, 2 blå — repetert 8 ganger.
{
  const r19 = flagget.stitches.filter((s) => s.roundIdx === 18);
  const runPattern: YarnColor[] = [
    'white', 'red', 'red', 'red', 'red', 'red', 'red', 'red', 'white', 'blue', 'blue',
  ];
  const ok = r19.every((s, i) => s.color === runPattern[i % 11]);
  check(ok && r19.length === 88, 'runde 19: «1 hvit, 7 røde, 1 hvit, 2 blå» x 8');
}
// The vertical flag stripes: red columns stack over red columns (r19-22).
{
  const cols19 = flagget.stitches
    .filter((s) => s.roundIdx === 18)
    .map((s) => s.color);
  const cols22 = flagget.stitches
    .filter((s) => s.roundIdx === 21)
    .map((s) => s.color);
  check(
    cols19.join() === cols22.join(),
    'runde 19 og 22 har identiske fargeløp (vertikale striper)',
  );
}
// Flagget midtparti grows 88→96 at runde 23; chart is padded to max width.
check(
  flagget.chart.cols === 96,
  `flagget chart.cols = 96 (padded, got ${flagget.chart.cols})`,
);
check(
  flagget.chart.grid.every((row) => row.length === 96),
  'flagget chart rows are rectangular',
);
checkColorChangeInvariant(flagget.stitches, 'FLAGGET');

// 3D spoke lock: blue column centres share the same angle across rounds
// (within ~½°), so the Nordic cross does not spiral in the hat view.
{
  const deltas = computeSpokeFracDeltas(
    flagget.rounds,
    flagget.stitches,
    'blue',
  );
  const byRound: YarnColor[][] = flagget.rounds.map((r) =>
    Array<YarnColor>(r.count).fill(r.color),
  );
  for (const s of flagget.stitches) byRound[s.roundIdx][s.i] = s.color;

  const lockedFracs: number[] = [];
  for (let r = 0; r < flagget.rounds.length; r++) {
    const colors = byRound[r];
    let first = -1;
    let nBlue = 0;
    for (let i = 0; i < colors.length; i++) {
      if (colors[i] === 'blue') {
        nBlue++;
        if (first < 0) first = i;
      }
    }
    if (first < 0 || nBlue === colors.length) continue;
    let end = first;
    while (end + 1 < colors.length && colors[end + 1] === 'blue') end++;
    const mid = (first + end) / 2;
    lockedFracs.push((mid + 0.5) / colors.length + deltas[r]);
  }
  const target = lockedFracs[0];
  const maxDriftDeg = Math.max(
    ...lockedFracs.map((f) => {
      let d = Math.abs(f - target);
      d = Math.min(d, 1 - d);
      return d * 360;
    }),
  );
  check(
    maxDriftDeg < 0.6,
    `flagget blå eiker låst i 3D (maks drift ${maxDriftDeg.toFixed(2)}° < 0.6°)`,
  );
}

/* ================= NORWAY'26-kolleksjonen ================= */
console.log("NORWAY'26-kolleksjonen:");

/** Colors per round, in working order. */
function roundColorRows(d: ReturnType<typeof derivePattern>): YarnColor[][] {
  const rows: YarnColor[][] = d.rounds.map(() => []);
  for (const s of d.stitches) rows[s.roundIdx].push(s.color);
  return rows;
}

/** Color-run stats around a closed round (first and last run join up). */
function runStats(colors: YarnColor[]): { runs: number; singles: number; mean: number } {
  const lens: number[] = [];
  let run = 1;
  for (let i = 1; i < colors.length; i++) {
    if (colors[i] === colors[i - 1]) run++;
    else {
      lens.push(run);
      run = 1;
    }
  }
  if (lens.length > 0 && colors[0] === colors[colors.length - 1]) lens[0] += run;
  else lens.push(run);
  return {
    runs: lens.length,
    singles: lens.filter((l) => l === 1).length,
    mean: lens.reduce((a, b) => a + b, 0) / lens.length,
  };
}

/** Stitches of ink a word costs in a given face — the weight of the cut. */
function glyphInk(word: string, fontId: FontId): number {
  const font = getFont(fontId);
  let n = 0;
  for (const ch of word.toUpperCase()) {
    for (const row of font.glyphs[ch] ?? []) {
      for (const cell of row) if (cell === 'X') n++;
    }
  }
  return n;
}

/**
 * The narrowest run of ink in a glyph, measured along rows and along columns.
 *
 * THIS IS THE CHECK THE OLD FACE COULD NOT HAVE PASSED, and the reason the
 * collection needed a new one. «Norge26» drew every stroke a single stitch and
 * relied on `bold` and a halo to look heavy; the horizontal runs came back at
 * one row, so E's arms and G's bar were hairlines against stems that the shear
 * had thickened to two. "Some strokes feel thin while others feel heavy" is
 * exactly that, and it is a property of the MASTER, so it is tested on the
 * master rather than on the finished hat.
 *
 * Runs at the very edge of the glyph box are excluded: a bowl's top row is a
 * run of one in the vertical direction by construction, and so is every
 * diacritic. What is being measured is a stroke's thickness in the middle of
 * the letter, where a reader looks.
 */
function minStrokeRun(font: FontSpec, ch: string): { rows: number; cols: number } {
  const g = font.glyphs[ch] ?? [];
  const h = g.length;
  const w = g[0]?.length ?? 0;
  const at = (r: number, c: number) => (g[r]?.[c] ?? '.') === 'X';
  let minH = Infinity;
  let minV = Infinity;
  // Horizontal runs: a stroke's width, seen along a row.
  for (let r = 0; r < h; r++) {
    let run = 0;
    for (let c = 0; c <= w; c++) {
      if (at(r, c)) run++;
      else {
        if (run > 0) minH = Math.min(minH, run);
        run = 0;
      }
    }
  }
  // Vertical runs: a bar's thickness, seen down a column. Runs that touch the
  // top or bottom of the box are the ends of stems and are not strokes.
  for (let c = 0; c < w; c++) {
    let run = 0;
    for (let r = 0; r <= h; r++) {
      if (at(r, c)) run++;
      else {
        if (run > 0 && r < h) minV = Math.min(minV, run);
        run = 0;
      }
    }
  }
  return { rows: minV === Infinity ? 99 : minV, cols: minH === Infinity ? 99 : minH };
}

/**
 * Narrowest run of ground between two neighbouring letters, measured only where
 * they share a row — which is the only place a reader can tell them apart.
 *
 * Corner-to-corner contact is NOT counted, and must not be: a sheared diagonal
 * always clips the corner of its neighbour, so the upright wordmark does it
 * too. Side by side with nothing between them is the failure that matters, and
 * the one the climb used to cause.
 */
function minLetterGap(layer: TextLayer): number {
  const { glyphs } = textGlyphPieces(layer);
  const cells = glyphs.map((g) => {
    const out: [number, number][] = [];
    for (let r = 0; r < g.mask.length; r++) {
      for (let c = 0; c < g.mask[r].length; c++) {
        if (g.mask[r][c]) out.push([g.row + r, g.col + c]);
      }
    }
    return out;
  });

  let worst = Infinity;
  for (let i = 0; i + 1 < cells.length; i++) {
    // Rightmost ink per row on the left letter, leftmost on the right one.
    const right = new Map<number, number>();
    for (const [r, c] of cells[i]) {
      right.set(r, Math.max(right.get(r) ?? -Infinity, c));
    }
    for (const [r, c] of cells[i + 1]) {
      const edge = right.get(r);
      if (edge == null) continue;
      worst = Math.min(worst, c - edge - 1);
    }
  }
  return worst === Infinity ? Infinity : worst;
}

/**
 * THE MASTER TYPOGRAPHY CHECK — one function, seven hats.
 *
 * Everything §15 asks for, and it runs against the DERIVED CHART rather than
 * against the spec that produced it, because the chart is what gets crocheted.
 * The five published kits go through it from their registry definitions; the
 * two drafts in `scripts/proto-masklab.ts` go through the identical function
 * from their studio designs. That is the point of it being a function: «all
 * seven hats use the same lettering system» is checkable rather than asserted.
 */
interface NorgeHat {
  id: string;
  background: YarnColor;
  layers: readonly import('../src/data/chartLayers').ChartLayer[];
  grid: YarnColor[][];
  cols: number;
  rows: number;
  bandRows: number;
  /** Rounds + stitches, when the caller has them — enables the corridor trace. */
  rounds?: { num: number; phase: string; count: number }[];
  stitches?: { roundIdx: number; color: YarnColor }[];
}

/** The five letters the collection actually sets. */
const NORGE_GLYPHS = ['N', 'O', 'R', 'G', 'E'];

function checkNorgeHat(hat: NorgeHat): void {
  const { id, cols, rows } = hat;
  const textLayers = hat.layers.filter((l): l is TextLayer => l.kind === 'text');
  const wordmark = textLayers[0];

  // ---- One wordmark, and it is the collection's ----
  check(
    textLayers.length === 1 &&
      wordmark?.text === 'NORGE' &&
      wordmark.fontId === NORGE_TEXT.fontId &&
      wordmark.repeat === NORGE_TEXT.repeat &&
      wordmark.centerFrac === NORGE_TEXT.centerFrac &&
      wordmark.anchor.row === NORGE_TEXT.row &&
      (wordmark.letterSpacing ?? 1) === NORGE_TEXT.letterSpacing,
    `${id}: NORGE i «NorgeKursiv26», samme sats som resten av kolleksjonen`,
  );
  if (!wordmark) return;

  /**
   * THE LEAN COMES FROM THE FACE, AND NOTHING IS ALLOWED TO ADD TO IT.
   *
   * `slantDeg: 0` is not «upright» any more — «NorgeKursiv26» is italic, and it
   * carries its own drawn staircase in `lean`. A slant here would shear an
   * already-italic face a SECOND time, with the `round(tan θ)` staircase the
   * face exists to avoid: it steps wherever the arithmetic tips, which on the
   * last italic cut was through N's diagonal and R's leg. The rest are faults
   * for their own reasons — a climb turns the protected panel into a
   * parallelogram that cannot track the letters per column, `bold` fattens
   * uprights sideways and leaves the one-stitch bars behind, and a halo is a
   * ring of ground drawn on ground now the panel is clean.
   */
  check(
    wordmark.slantDeg === 0 &&
      (wordmark.rise ?? 0) === 0 &&
      !wordmark.arcRows &&
      !wordmark.bold &&
      wordmark.scaleX == null &&
      wordmark.scaleY == null,
    `${id}: ingen ekstra skjæring, stigning, forstørring eller «bold» oppå kursiven`,
  );
  check(
    getFont(wordmark.fontId).lean?.length === 9,
    `${id}: kursiven er tegnet inn i skriften, ikke regnet ut av en vinkel`,
  );
  check(
    wordmark.haloColorId == null && !wordmark.haloDither,
    `${id}: ingen kontur og ingen dither rundt bokstavene`,
  );

  // ---- The face: two-stitch uprights, nine rows, counters that survive ----
  const font = getFont(wordmark.fontId);
  check(fontHeight(wordmark) === 9, `${id}: bokstavene er ni rader (${fontHeight(wordmark)})`);
  /**
   * THE STRESS IS SYSTEMATIC, WHICH IS WHAT SEPARATES IT FROM THE OLD FAULT.
   *
   * «NorgeDisplay26» was tested for two stitches in EVERY stroke, because its
   * fault was thin strokes turning up at random — and two everywhere is the
   * right cure for an upright face. It is the wrong cure for an italic: two
   * stitches in every direction is also what made the word 39 stitches wide and
   * unable to lean at all.
   *
   * So the rule moved rather than relaxed. Uprights are two, bars and diagonals
   * are one, and the test is the part the eye actually reads a letter off:
   * EVERY row of every letter opens with a run of at least two, so no letter is
   * ever standing on a one-stitch stem. A bar may be one row and a diagonal one
   * stitch; a stem may not.
   */
  const thin = NORGE_GLYPHS.filter((ch) =>
    (font.glyphs[ch] ?? []).some((row) => {
      const run = /^\.*(X+)/.exec(row);
      return run != null && run[1].length < 2;
    }),
  );
  check(
    thin.length === 0,
    `${id}: hver bokstav i N O R G E står på en to-maskers stamme${thin.length ? ` (tynne: ${thin.join(', ')})` : ''}`,
  );
  /**
   * COUNTERS SURVIVE THE CROCHET. Two stitches is the floor for this face and
   * it is the one compromise in it: the bowls are 2 + 2 + 2, so the counters are
   * two wide — but SEVEN tall, a slot rather than the three-by-six hole the
   * upright face carried. Watch the first hat off the hook; if an O fills in,
   * the fix is bowls at seven and a word four stitches wider. Measured as the
   * widest run of ground enclosed on both sides by ink.
   */
  const counters = ['O', 'G', 'R'].map((ch) => {
    const g = font.glyphs[ch] ?? [];
    let best = 0;
    for (const row of g) {
      let run = 0;
      let seenInk = false;
      for (let c = 0; c < row.length; c++) {
        if (row[c] === 'X') {
          if (seenInk && run > best) best = run;
          seenInk = true;
          run = 0;
        } else if (seenInk) run++;
      }
    }
    return { ch, w: best };
  });
  check(
    counters.every((c) => c.w >= 2),
    `${id}: motformene er minst to masker (${counters.map((c) => `${c.ch}=${c.w}`).join(' ')})`,
  );
  const gap = minLetterGap(wordmark);
  check(gap >= 1, `${id}: bokstavene har luft mellom seg (${gap} maske på det trangeste)`);

  // ---- Placement: two copies, each 36–40 % of the circumference ----
  const places = textPlacements(wordmark, cols);
  const boxes = places.map(placementBox).filter((b): b is NonNullable<typeof b> => b != null);
  check(places.length === 2 && boxes.length === 2, `${id}: NORGE står to steder rundt hatten`);
  const wordW = boxes[0]?.width ?? 0;
  const share = wordW / cols;
  check(
    wordW >= 36 && wordW <= 40,
    `${id}: NORGE er ${wordW} masker bredt (36–40)`,
  );
  check(
    share >= 0.34 && share <= 0.42,
    `${id}: hvert NORGE tar ${(share * 100).toFixed(0)} % av omkretsen`,
  );

  // ---- The protected panel, straight off the placement ----
  const zone = keepOutZoneFromParams(
    keepOutFromTextPlacement(wordmark, NORGE_KEEP_OUT),
  );
  const metrics = keepOutMetrics(wordmark, cols, NORGE_KEEP_OUT);
  check(zone != null, `${id}: teksten har en avledet friholdt sone`);
  /**
   * The letter cells come from the LAYER, never from the grid. Reading them
   * back as «every cell in the wordmark's colour» is the obvious shortcut and
   * it is wrong wherever a kit strokes its field in the same yarn as its type —
   * half the field would be counted as lettering and the check would pass on a
   * hat covered in specks.
   */
  const letterCells = new Set<string>();
  for (const p of places) {
    p.mask.forEach((row, r) =>
      row.forEach((on, c) => {
        if (!on) return;
        const rr = p.row + r;
        let cc = (p.col + c) % cols;
        if (cc < 0) cc += cols;
        if (rr >= 0 && rr < rows) letterCells.add(`${rr},${cc}`);
      }),
    );
  }
  let panelCells = 0;
  let intruders = 0;
  let brokenGlyphCells = 0;
  let corridorCells = 0;
  let corridorInk = 0;
  const firstIntruder: string[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const v = hat.grid[r][c];
      const isLetter = letterCells.has(`${r},${c}`);
      if (inKeepOutZone(zone, cols, r, c)) {
        panelCells++;
        if (isLetter) {
          if (v !== wordmark.colorId) brokenGlyphCells++;
        } else if (v !== hat.background) {
          intruders++;
          if (firstIntruder.length < 4) firstIntruder.push(`r${r}k${c}=${v}`);
        }
      } else {
        corridorCells++;
        if (v !== hat.background) corridorInk++;
        if (isLetter) intruders++;
      }
    }
  }
  /**
   * THE ONE THAT MATTERS. Inside the panel — the strokes, every counter, every
   * gap from the N to the E, and a stitch of margin round the outside — there
   * are exactly two colours on the hat: the type and the ground. No accent
   * streak, no slash, no chevron, no motif fragment, no stray field cell.
   */
  check(
    intruders === 0,
    `${id}: ingen mønsterfarger i NORGE-feltet (${intruders}${firstIntruder.length ? ': ' + firstIntruder.join(' ') : ''})`,
  );
  check(
    brokenGlyphCells === 0,
    `${id}: hver bokstavmaske er ${wordmark.colorId} (${brokenGlyphCells} avvik)`,
  );
  /**
   * THE PANEL NO LONGER FILLS THE WALL, AND THAT IS THE DESIGN.
   *
   * It used to be tested as exactly `width × bandRows × 2` — a rectangle, edge
   * to edge of the wall — and the wordmark sat on a shelf nothing in the fabric
   * ever touched. Now it stops one round above the letters and one below, and
   * its edges FOLLOW the letters: under the open half of an R, under a letter
   * gap, the field is let up two rounds further. Three things have to hold.
   */
  const rowStarts = zone?.rowStarts ?? [];
  const rowEnds = zone?.rowEnds ?? [];
  check(
    rowStarts.length === metrics.width && rowEnds.length === metrics.width,
    `${id}: panelkanten er målt per maske (${rowEnds.length} av ${metrics.width})`,
  );
  // One clear round above the letters and one below, both inside the wall — so
  // the field crosses the word's own columns at the top and bottom of the wall.
  check(
    rowStarts.length > 0 &&
      Math.min(...rowStarts) > 0 &&
      Math.max(...rowEnds) < hat.bandRows - 1,
    `${id}: feltet går over og under ordet (rad ${Math.min(...rowStarts)}–${Math.max(...rowEnds)} av ${hat.bandRows})`,
  );
  // And the edge is ragged by exactly the allowance — never more, or a stroke
  // arrives beside the letters at letter height and ties one to the next.
  const ragged = Math.max(...rowEnds) - Math.min(...rowEnds);
  check(
    ragged === NORGE_KEEP_OUT.mergeRows,
    `${id}: underkanten følger bokstavene ${ragged} rader (skal være ${NORGE_KEEP_OUT.mergeRows})`,
  );
  check(
    panelCells < 2 * metrics.width * hat.bandRows,
    `${id}: panelet dekker ikke lenger hele veggen (${panelCells} celler)`,
  );

  // ---- The corridor: wide enough, and NOT masked ----
  check(
    metrics.corridor >= 8 && metrics.corridor <= 12,
    `${id}: overgangskorridoren er ${metrics.corridor} masker (8–12)`,
  );
  /**
   * THE CORRIDOR IS NOT ACCIDENTALLY MASKED — measured against what the field
   * actually is.
   *
   * A stroke field marks a ground, so «how much of the corridor is not ground»
   * is a fair measure of it: at thirty per cent or better the gap is visibly
   * carrying the pattern. An OPAQUE field is not that shape at all. Skifer's
   * bands are black, slate, black, stone, and black IS the hat's ground — so
   * half its corridor is legitimately ground-coloured and a share test reads
   * 22 % on a corridor that is completely full of pattern. What that field has
   * to show instead is that more than one band crosses the gap.
   */
  const strokeField = hat.layers.some(
    (l) => l.kind === 'motif' && (l.motif === 'slash' || l.motif === 'streaks'),
  );
  const corridorShare = corridorCells > 0 ? corridorInk / corridorCells : 0;
  if (strokeField) {
    check(
      corridorShare >= 0.3,
      `${id}: korridoren slipper mønsteret gjennom (${(corridorShare * 100).toFixed(0)} % farge)`,
    );
  } else {
    const seen = new Set<YarnColor>();
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (!inKeepOutZone(zone, cols, r, c)) seen.add(hat.grid[r][c]);
      }
    }
    check(
      seen.size >= 2 && corridorInk > 0,
      `${id}: korridoren slipper mønsteret gjennom (${seen.size} farger, ${(corridorShare * 100).toFixed(0)} % ikke-bunn)`,
    );
  }

  // ---- Crochetability: no accent island of a single stitch ----
  /**
   * An «island» is a cell whose four neighbours are ALL a different colour —
   * one stitch of a yarn you had to join and cut for, and the thing §8 is
   * about. Ground cells are exempt: a single stitch of ground between two
   * strokes is the ground showing through, not an island.
   */
  let islands = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const v = hat.grid[r][c];
      if (v === hat.background || letterCells.has(`${r},${c}`)) continue;
      const same = [
        [r - 1, c],
        [r + 1, c],
        [r, (c + 1) % cols],
        [r, (c - 1 + cols) % cols],
      ].some(([rr, cc]) => rr >= 0 && rr < rows && hat.grid[rr][cc] === v);
      if (!same) islands++;
    }
  }
  check(islands === 0, `${id}: ingen enkeltmasker alene i veggen (${islands})`);

  // ---- Continuity: crown → wall → brim, along the corridor's own line ----
  /**
   * FOLLOW THE STROKE, NOT A PLUMB LINE.
   *
   * The first cut of this check sampled a fixed angular window — the corridor's
   * fraction of every round, crown to rim — and it fails a hat that is doing
   * exactly what it was asked to. The gesture is a DIAGONAL: the stroke aimed
   * down the corridor is pinned at the middle of the wall and drifts `slope`
   * stitches per row either side of it, so by the crown's ninth round it is
   * three stitches round from where a plumb line looks, and the check reported
   * a break in a line that is visibly unbroken.
   *
   * So the window travels with it, on the same arithmetic `buildSlashes` and
   * `buildCrownResolver` use: the row coordinate of each round, the drift from
   * the field's start to that row, and the brim's `brimSlopeGain` pull-back.
   * What is being tested is the claim §5 actually makes — one gesture, crown to
   * brim — rather than the much stronger and quite wrong claim that the gesture
   * is vertical.
   */
  const field = hat.layers.find(
    (l): l is import('../src/data/chartLayers').MotifLayer =>
      l.kind === 'motif' && l.motif === 'slash',
  );
  if (hat.rounds && hat.stitches && field) {
    const byRound: YarnColor[][] = hat.rounds.map(() => []);
    for (const s of hat.stitches) byRound[s.roundIdx].push(s.color);

    const p = field.params;
    const slope = Number(p.slope ?? 0);
    const curve = Number(p.curve ?? 0);
    const brimGain = Number(p.brimSlopeGain ?? 1);
    const anchorFrac = Number(p.anchorFrac ?? 0);
    const anchorV = Number(p.anchorV ?? 0);
    const crownRounds = hat.rounds.filter((r) => r.phase === 'top').length;
    const brimStart = hat.rounds.findIndex(
      (r) => r.phase === 'brim-inc' || r.phase === 'wave' || r.phase === 'brim',
    );
    const vMin = -crownRounds;
    const vMax = hat.bandRows + (hat.rounds.length - brimStart);
    const span = vMax - vMin;
    const drift = (v: number) => {
      const t = v - vMin;
      return span > 0 ? slope * t * (1 + curve * (t / span)) : 0;
    };
    const u0 = anchorFrac * cols - drift(anchorV);

    // Half the corridor, in field columns — the same unit `u` is measured in.
    const half = metrics.corridor / 2;
    let bare = 0;
    let traced = 0;
    const bareRounds: number[] = [];
    hat.rounds.forEach((round, i) => {
      // The centre knot is plain by design, and so are the two rim rounds.
      if (round.count < 20) return;
      if (i >= hat.rounds!.length - 2) return;
      let v: number;
      if (round.phase === 'top') v = -(crownRounds - i) + 0.5;
      else if (i < brimStart) v = i - crownRounds + 0.5;
      else v = hat.bandRows + (i - brimStart) + 0.5;
      let u = u0 + drift(v);
      // The brim pulls a stroke back toward where it crossed the fold, or it
      // would sweep round the hat instead of out to the rim.
      if (i >= brimStart) u += slope * (v - hat.bandRows) * (1 - brimGain);

      traced++;
      const colors = byRound[i];
      const n = colors.length;
      let ink = 0;
      // Field columns → this round's own stitches.
      const lo = Math.floor(((u - half) / cols) * n);
      const hi = Math.ceil(((u + half) / cols) * n);
      for (let k = lo; k <= hi; k++) {
        if (colors[((k % n) + n) % n] !== hat.background) ink++;
      }
      if (ink === 0) {
        bare++;
        bareRounds.push(round.num);
      }
    });
    check(
      bare === 0,
      `${id}: én gest fra pull til brem gjennom korridoren (${traced - bare}/${traced} runder${bareRounds.length ? `, tomme: ${bareRounds.join(', ')}` : ''})`,
    );
  }
}

interface KitExpectation {
  id:
    | 'norway26'
    | 'norway26-white'
    | 'norway26-black'
    | 'norway26-training'
    | 'norway26-keeper';
  palette: YarnColor[];
  /** Must be the most-worked color on the hat. */
  dominant: YarnColor;
  /** Whether the kit carries an all-over field (vs a solid ground). */
  patterned: boolean;
  /**
   * Colours allowed in a single round. Four is the comfortable ceiling for
   * carrying yarn round a hat; the keeper's tonal chevrons are worked in six,
   * which is why that kit is the only «avansert» one where the run-length
   * checks below carry the real crochetability burden.
   */
  maxRoundColors?: number;
  /**
   * Single-stitch share allowed in the FIELD — crown and brim, where there is
   * no lettering to excuse it (default 0.32).
   *
   * Trening is the one kit that raises it, and on purpose. The pre-match shirt
   * is covered edge to edge in a dense chevron with no plain area anywhere on
   * it, and the brief for the hat was that it should be the hardest one in the
   * collection to make. Nine interlocking bundles is what that looks like in
   * yarn, and interlocking bundles mean short colour runs. The number is here,
   * per kit and written down, rather than the cap being raised for everybody —
   * if Drakt or Hvit ever drifts to 33 % that is a regression, not a decision.
   */
  maxFieldSingles?: number;
}

const NORWAY_KITS: KitExpectation[] = [
  {
    id: 'norway26',
    palette: ['blue', 'white', 'red', 'lightblue'],
    dominant: 'blue',
    patterned: true,
  },
  {
    id: 'norway26-white',
    palette: ['white', 'blue', 'lightblue', 'red'],
    dominant: 'white',
    patterned: true,
  },
  {
    id: 'norway26-black',
    // White is the type and the rim, and nothing else on the hat is white —
    // the field is two greys. See the note in `norway26Black.ts`.
    palette: ['black', 'white', 'slate', 'stone'],
    dominant: 'black',
    patterned: true,
  },
  {
    id: 'norway26-training',
    palette: ['red', 'blue', 'white', 'lightblue'],
    dominant: 'red',
    patterned: true,
    maxFieldSingles: 0.48,
  },
  {
    id: 'norway26-keeper',
    palette: ['yellow', 'gold', 'orange', 'pink', 'black'],
    dominant: 'yellow',
    patterned: true,
    maxRoundColors: 5,
    maxFieldSingles: 0.42,
  },
];

/** All five kits share one silhouette — captured once from the black kit. */
const KIT_SHAPE = derivePattern(getPattern('norway26-black'));

for (const kit of NORWAY_KITS) {
  const { id } = kit;
  const def = getPattern(id);
  const d = derivePattern(def);

  // ---- Shape: RO's silhouette, shared by the whole collection ----
  // Helene's 19-round domed crown, a 12-round wall, and a brim flaring to the
  // same 1.44× the body RO reaches through its wave.
  check(d.bodyCount === 100, `${id}: dame/4,0 mm pinnet til 100 masker`);
  check(d.bandRows === 14, `${id}: 14 diagramrader på veggen`);
  check(d.chart.cols === d.bodyCount, `${id}: chart.cols = bodyCount (${d.bodyCount})`);
  const roCrown = deriveRoDefault().rounds.filter((r) => r.phase === 'top');
  const crownRounds = d.rounds.filter((r) => r.phase === 'top');
  check(
    crownRounds.length === roCrown.length &&
      crownRounds.every(
        (r, i) =>
          r.count === roCrown[i].count && r.increaseEvery === roCrown[i].increaseEvery,
      ),
    `${id}: samme pull som RO-hatten (${crownRounds.length} runder, runde for runde)`,
  );
  check(
    d.rounds.filter((r) => r.phase === 'text').length === 14,
    `${id}: 14 tekstrunder`,
  );
  // THE BREM IS HELENE'S, ROUND FOR ROUND — counts and increases both. The
  // kits used to approximate it with a plain bucket brim tuned to the same
  // final circumference, which is a different hat that happens to end the same
  // width. This compares the actual schedule.
  const isBrimRound = (r: { phase: string }) =>
    r.phase === 'brim-inc' || r.phase === 'wave' || r.phase === 'brim';
  const ro = deriveRoDefault();
  const roBrim = ro.rounds.filter(isBrimRound);
  const brim = d.rounds.filter(isBrimRound);
  const lastCount = d.rounds[d.rounds.length - 1].count;
  check(
    brim.length === roBrim.length &&
      brim.every(
        (r, i) =>
          r.count === roBrim[i].count &&
          r.phase === roBrim[i].phase &&
          r.increaseEvery === roBrim[i].increaseEvery,
      ),
    `${id}: brem som RO — ${brim.length} runder, runde for runde, til ${lastCount} masker`,
  );
  // …but NOT her blue wave chart. Clearing waveRow is what routes those rounds
  // through our own colouring; if it ever came back the brim would go
  // blue-and-white on every kit in the collection.
  check(
    d.rounds.every((r) => r.waveRow == null),
    `${id}: Helenes bølgediagram er ikke med (ingen runde har waveRow)`,
  );
  const sameShape =
    d.rounds.length === KIT_SHAPE.rounds.length &&
    d.rounds.every(
      (r, i) =>
        r.count === KIT_SHAPE.rounds[i].count &&
        r.phase === KIT_SHAPE.rounds[i].phase &&
        r.increaseEvery === KIT_SHAPE.rounds[i].increaseEvery,
    );
  check(sameShape, `${id}: samme silhuett som resten av kolleksjonen (${d.rounds.length} runder)`);

  // ---- Determinism: same seed, same hat ----
  const d2 = derivePattern(def);
  check(
    d.stitches.every((s, i) => s.color === d2.stitches[i].color),
    `${id}: deterministisk (samme seed → samme masker)`,
  );

  // ---- Typography and text protection: the shared system, per kit ----
  checkNorgeHat({
    id,
    background: def.background,
    layers: def.chartLayers,
    grid: d.chart.grid,
    cols: d.chart.cols,
    rows: d.chart.rows,
    bandRows: d.bandRows,
    rounds: d.rounds,
    stitches: d.stitches,
  });

  // ---- Palette ----
  const used = new Set(d.stitches.map((s) => s.color));
  check(
    [...used].every((c) => kit.palette.includes(c)) && used.size === kit.palette.length,
    `${id}: bruker nøyaktig ${kit.palette.join(' + ')} (fant ${[...used].join(', ')})`,
  );
  const tally = new Map<YarnColor, number>();
  for (const s of d.stitches) tally.set(s.color, (tally.get(s.color) ?? 0) + 1);
  const dominantCount = tally.get(kit.dominant) ?? 0;
  check(
    [...tally.entries()].every(([c, n]) => c === kit.dominant || n <= dominantCount),
    `${id}: ${kit.dominant} er hovedfargen (${dominantCount} masker)`,
  );

  // ---- Contrast edge: the last two rounds are the edge colour, solid ----
  const edgeIdx = [d.rounds.length - 2, d.rounds.length - 1];
  const rows = roundColorRows(d);
  check(
    edgeIdx.every(
      (i) => new Set(rows[i]).size === 1 && rows[i][0] === def.finalBrim.color,
    ),
    `${id}: de to siste rundene er ensfarget ${def.finalBrim.color} (kant)`,
  );
  check(
    def.finalBrim.color !== def.background,
    `${id}: kanten kontrasterer bunnfargen (${def.finalBrim.color} mot ${def.background})`,
  );

  // ---- The finish: two solid rounds, and nothing else on the brim ----
  //
  // Two earlier cuts framed the brim — first one contrast round at the fold,
  // then three ring stripes at an even beat. Both broke the fabric: a solid
  // round is a wall the colourwork stops against, so the brim read as banded
  // rather than as the wall carrying on over the fold. What these checks
  // protect is that the field now runs from under the wordmark all the way to
  // the edge, uninterrupted, and that the edge is exactly two rounds deep.
  const finish = def.brimFinish;
  const edgeRounds = Math.max(1, finish?.rimRounds ?? 1);
  check(edgeRounds === 2, `${id}: kanten er to runder dyp (${edgeRounds})`);
  const brimRounds = d.rounds.filter(isBrimRound);
  const brimIdx0 = d.rounds.indexOf(brimRounds[0]);
  const aboveRim = brimRounds
    .map((_, i) => i)
    .filter((i) => i < brimRounds.length - edgeRounds);
  check(
    aboveRim.every((i) => new Set(rows[brimIdx0 + i]).size > 1),
    `${id}: mønsteret går ubrutt fra veggen til kanten (${aboveRim.length} runder med farge)`,
  );
  // No solid round anywhere between the wall and the rim — that is the whole
  // claim, stated as the thing that would break it.
  const solidInBrim = aboveRim.filter(
    (i) => new Set(rows[brimIdx0 + i]).size === 1,
  ).length;
  check(
    solidInBrim === 0,
    `${id}: ingen enfargede striper eller brekklinjer på bremmen (${solidInBrim})`,
  );
  // The rim lies flat only if the last increase is spent before it starts.
  const rim = d.rounds.slice(d.rounds.length - edgeRounds);
  check(
    rim.every((r) => r.increaseEvery === null && !r.patterned),
    `${id}: de ${edgeRounds} kantrundene heklles rett — kanten bølger ikke`,
  );
  check(
    rim.every((_, i) => new Set(rows[d.rounds.length - edgeRounds + i]).size === 1),
    `${id}: kanten er ensfarget ${def.finalBrim.color}`,
  );

  if (!kit.patterned) {
    // ---- Solid kits: the only colorwork is the wordmark itself ----
    const colorworkRounds = d.rounds.filter((_, i) => new Set(rows[i]).size > 1);
    check(
      colorworkRounds.every((r) => r.phase === 'text'),
      `${id}: ensfarget bortsett fra NORGE-partiet (${colorworkRounds.length} runder med tekst)`,
    );
  } else {
    // ---- The statement kit: crochetable ikat over crown, wall and brim ----
    let maxColors = 0;
    let runs = 0;
    let singles = 0;
    let stitchesInColorwork = 0;
    /** The same tally, but over the FIELD only — no lettering in it. */
    let fieldRuns = 0;
    let fieldSingles = 0;
    d.rounds.forEach((r, i) => {
      if (r.phase !== 'text' && !r.patterned) return;
      const colors = new Set(rows[i]);
      maxColors = Math.max(maxColors, colors.size);
      if (colors.size < 2) return;
      const s = runStats(rows[i]);
      runs += s.runs;
      singles += s.singles;
      stitchesInColorwork += rows[i].length;
      if (r.phase !== 'text') {
        fieldRuns += s.runs;
        fieldSingles += s.singles;
      }
    });
    const meanRun = stitchesInColorwork / runs;
    const fieldSingleShare = fieldSingles / fieldRuns;
    const wallSingleShare = (singles - fieldSingles) / (runs - fieldRuns);
    const colorCap = kit.maxRoundColors ?? 4;
    check(
      maxColors <= colorCap,
      `${id}: aldri mer enn ${colorCap} farger i én runde (${maxColors})`,
    );
    check(
      /**
       * 2.5 was the number when the field was four thick bundles. The design
       * is many thin stripes now — «rather have 2 after each other, or even
       * one, to have more stripes» — so a two-stitch mean is the target, not a
       * regression. Below 1.9 the stripes have started dissolving into
       * single-stitch confetti, which is a different thing and not crochetable.
       */
      meanRun >= 1.9,
      `${id}: fargefeltene er brede nok å hekle (snitt ${meanRun.toFixed(2)} masker)`,
    );
    /**
     * SINGLE STITCHES, MEASURED WHERE THEY MATTER.
     *
     * This used to be one number over every colourwork round, capped at 32 %,
     * and the slim wordmark broke it: a letter stroke one stitch wide IS a
     * single stitch, five letters of it twice round the hat, and the figure
     * went to 59 % on the wall rounds while the fabric itself had not changed
     * at all. Raising the one cap would have hidden a real regression in the
     * field behind the lettering; keeping it would have meant refusing the
     * thin face that is the whole point of this cut.
     *
     * So it is two numbers. The FIELD — crown and brim, where there is no
     * lettering — keeps the old 32 %: that is the check that catches bundles
     * degenerating into confetti, and it is nowhere near its limit (5–31 %).
     * The WALL is allowed more, because fine lettering is supposed to be fine.
     */
    const fieldSinglesCap = kit.maxFieldSingles ?? 0.32;
    check(
      fieldSingleShare < fieldSinglesCap,
      `${id}: feltet er heklbart — få enkeltmasker på pull og brem (${(fieldSingleShare * 100).toFixed(1)} % < ${(fieldSinglesCap * 100).toFixed(0)} %)`,
    );
    check(
      wallSingleShare < 0.62,
      `${id}: veggen har enkeltmasker, men bare der bokstavene er tynne (${(wallSingleShare * 100).toFixed(1)} %)`,
    );

    // ---- Field coverage: the spiral runs from the centre out to the rim ----
    //
    // The crown is nineteen rounds. This used to pass at eight of them, which is
    // how the collection shipped with a plain roundel sitting on top like a lid:
    // seen from directly above — which is how you see a hat on someone's head —
    // a third of the disc had no pattern on it at all.
    const crownRoundsAll = d.rounds.filter((r) => r.phase === 'top');
    const crownPatterned = d.rounds.filter(
      (r, i) => r.phase === 'top' && new Set(rows[i]).size > 1,
    ).length;
    check(
      crownPatterned >= crownRoundsAll.length - 1,
      `${id}: spiralen går helt inn (${crownPatterned} av ${crownRoundsAll.length} pullrunder)`,
    );
    // …but the ten-stitch first round has to stay plain. That is the knot every
    // crocheted disc starts from; there is no room in it for a colour change.
    const crownPlain = d.rounds.filter(
      (r, i) => r.phase === 'top' && new Set(rows[i]).size === 1,
    );
    check(
      crownPlain.length === 1 && crownPlain[0].count <= 10,
      `${id}: bare knuten i midten er ensfarget (${crownPlain.length} runde)`,
    );
    const flarePatterned = d.rounds.filter(
      (r, i) => isBrimRound(r) && new Set(rows[i]).size > 1,
    ).length;
    check(
      flarePatterned >= 4,
      `${id}: mønsteret fortsetter ut i bremmen (${flarePatterned} runder)`,
    );
  }

  checkColorChangeInvariant(d.stitches, id);
}

/* ---- «Åpne i studio» has to open the same hat ---- */
//
// The studio builds its own PatternDefinition, so everything a published
// pattern carries that the studio's controls cannot author has to be handed
// over explicitly: the procedural field, the brim finish, and the size pin.
// Miss any of them and the studio renders a different hat than the recipe it
// was opened from — 110 stitches instead of 100, no spiral on the crown, and
// Helene's blue wave chart back on the brim, all while the Oppskrift tab next
// to it says otherwise.
console.log('Studio ≡ oppskrift:');
for (const def of listPatterns()) {
  if (def.script) continue; // scripted patterns are fixed-size transcriptions
  const want = derivePattern(def);
  const got = deriveDesign(designFromPattern(def));
  check(
    got.bodyCount === want.bodyCount &&
      got.bandRows === want.bandRows &&
      got.rounds.length === want.rounds.length &&
      got.rounds.every(
        (r, i) =>
          r.count === want.rounds[i].count &&
          r.phase === want.rounds[i].phase &&
          r.increaseEvery === want.rounds[i].increaseEvery,
      ),
    `${def.id}: studioet gir samme runder som oppskriften (${got.rounds.length} runder, ${got.bodyCount} masker)`,
  );
  check(
    got.stitches.length === want.stitches.length &&
      got.stitches.every((st, i) => st.color === want.stitches[i].color),
    `${def.id}: studioet gir samme masker som oppskriften, farge for farge`,
  );
}

/* ================= NORWAY'26-utkastene (Lyn + Skifer) ================= */
/**
 * The two draft hats live in `scripts/proto-masklab.ts` as studio designs
 * rather than as registered patterns — that is the point of them, and the
 * cheap way to draw a hat here (a `PatternDefinition` costs edits in seven
 * files; a `StudioDesign` costs one). What they are NOT allowed to be is
 * outside the collection's typography, and the only way to know that is to run
 * them through the same function the five kits go through.
 *
 * §13's claim is «same collection, seven personalities». Five of the seven
 * being checked and two being taken on trust is how they drifted in the first
 * place: one of them had a private face, the other a bold setting, a wider
 * letter gap and a black contour, and both looked least like the collection
 * they are drafts for.
 */
console.log("NORWAY'26-utkastene:");
for (const [label, design] of [
  ['lyn', HAT_A],
  ['skifer', HAT_B],
] as const) {
  const d = deriveDesign(design);
  check(
    d.bandRows === NORGE_TEXT.bandRows,
    `${label}: samme fjortenradersvegg som kolleksjonen (${d.bandRows})`,
  );
  checkNorgeHat({
    id: label,
    background: design.baseColor,
    layers: design.layers,
    grid: d.chart.grid,
    cols: d.chart.cols,
    rows: d.chart.rows,
    bandRows: d.bandRows,
    rounds: d.rounds,
    stitches: d.stitches,
  });
}

/* ================= Størrelse x mønster x nål ================= */
console.log('Størrelse × mønster × nål (generative mønstre):');
const sizeIds = SIZES.filter((s) => s.id !== 'egendefinert').map((s) => s.id);
for (const def of listPatterns()) {
  if (def.script) {
    // Scripted patterns are fixed-size transcriptions — one derivation.
    const d = derivePattern(def);
    check(
      d.stitches.length > 0 && d.chart.grid.length === d.bandRows,
      `${def.id}: skriptet mønster avledes (${d.stitches.length} masker)`,
    );
    continue;
  }
  for (const sizeId of sizeIds) {
    for (const hook of HOOKS) {
      const d = derivePattern(def, { sizeId, hookMm: hook.mm });
      const ok =
        d.bodyCount >= 80 &&
        d.bodyCount % 10 === 0 &&
        d.chart.grid.length === d.bandRows &&
        d.chart.grid.every((row) => row.length === d.bodyCount);
      check(
        ok,
        `${def.id}/${sizeId}/${hook.mm}: body=${d.bodyCount} grid ok`,
      );
    }
  }
}
check(
  derivePattern(listPatterns().find((p) => p.id === 'ro-ro-ro')!, {
    sizeId: 'dame',
    hookMm: 4.0,
  }).bodyCount === 100,
  'ro-ro-ro dame 4.0 pinnet til 100',
);

// bandRows override smoke (generative path)
{
  const d = derivePattern(listPatterns().find((p) => p.id === 'norway26')!, {
    bandRows: 14,
  });
  check(
    d.rounds.filter((r) => r.phase === 'text').length === 14,
    'bandRows=14 → 14 tekstrunder',
  );
}

console.log('');
if (failures > 0) {
  console.error(`${failures} valideringsfeil!`);
  process.exit(1);
}
console.log('Alt stemmer med oppskriftene.');
