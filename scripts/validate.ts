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
function glyphInk(word: string, fontId: 'runik' | 'norge26'): number {
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
    palette: ['black', 'white'],
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

  // ---- Text: one NORGE layer, stamped twice around the hat ----
  const textLayers = def.chartLayers.filter((l) => l.kind === 'text');
  const wordmark = textLayers[0];
  check(
    textLayers.length === 1 &&
      wordmark?.kind === 'text' &&
      wordmark.text === 'NORGE' &&
      wordmark.fontId === 'norge26' &&
      wordmark.repeat === 2 &&
      wordmark.haloColorId === def.background,
    `${id}: NORGE i Norge26-kursiv med kontur i bunnfargen, gjentatt 2 ganger`,
  );

  // ---- Typography: slim, leaning, climbing ----
  if (wordmark && wordmark.kind === 'text') {
    /**
     * THE LEAN IS IN THE MASTERS NOW, so asking `slantDeg` about it answers the
     * wrong question — it is 0, and the face is still italic. `rasterizeText`
     * shears by rounding each row's offset, which steps a whole column every
     * other row; a glyph diagonal that already moves a column per row either
     * flattens or doubles against that step, and the doubled step tore the
     * lozenge O into loose cells. Pre-shearing the masters with the seam
     * repaired is what fixed it. So measure the lean where it now lives: how
     * far the word's leading edge travels between its bottom row and its top.
     */
    const block = textPiece(wordmark).mask;
    const leftmost = (row: boolean[]) => row.indexOf(true);
    const inkRows = block.filter((r) => r.includes(true));
    const lean = leftmost(inkRows[0]) - leftmost(inkRows[inkRows.length - 1]);
    check(
      lean >= 3,
      `${id}: kursiven heller ordentlig (${lean} kolonner over ordet)`,
    );
    /**
     * THE BASELINE CLIMBS — «stigende», the lift under a sports mark.
     *
     * Ten rows of letter plus two of climb is a twelve-row block, which is why
     * the wall is fourteen: the contour still needs a free row above and below.
     * The climb steps per GLYPH, so those two rows are spent as a staircase
     * across the five letters rather than tilting any one of them.
     */
    const piece = textPiece(wordmark).mask;
    const lift = piece.length - fontHeight(wordmark);
    check(
      (wordmark.rise ?? 0) > 0 && lift === 2,
      `${id}: grunnlinjen stiger mot høyre (${lift} rader over ordet)`,
    );
    check(
      fontHeight(wordmark) === 10,
      `${id}: bokstavene er ti rader høye (${fontHeight(wordmark)})`,
    );
    /**
     * ONE STITCH PER STROKE — measured as ink PER ROW of cap height, not as a
     * total. The total was the old test and it does not survive a taller face:
     * Runik spent 136 stitches over eight rows and this cut spends 145 over
     * ten, which looks heavier and is in fact a fifth lighter. Per row it is 17
     * against 14.5, and 14.5 is a face drawn in single strokes. A slab comes
     * straight back over 15.5.
     */
    const inkPerRow = glyphInk('NORGE', 'norge26') / fontHeight(wordmark);
    check(
      inkPerRow <= 15.5,
      `${id}: bokstavene er tynne (${inkPerRow.toFixed(1)} masker blekk per rad, tak 15,5)`,
    );
    // AIR BETWEEN THE LETTERS. This is the check the climb kept failing: a
    // lifted glyph shows a less-sheared row of itself at any given row of the
    // block, so it drifts back into its neighbour until the two sit side by
    // side with nothing between them. `textGlyphPieces` slides each glyph along
    // the italic axis to pay for its climb; without that this drops to 0.
    const gap = minLetterGap(wordmark);
    check(gap >= 1, `${id}: bokstavene har luft mellom seg (${gap} maske på det trangeste)`);
    // Ink must leave a row top and bottom for the one-stitch halo.
    const solo = derivePattern({ ...def, chartLayers: [wordmark] });
    const inked = (r: number) =>
      solo.chart.grid[r].some((c) => c === wordmark.colorId);
    check(
      !inked(0) && !inked(d.bandRows - 1),
      `${id}: konturen får plass over og under ordet (rad 0 og ${d.bandRows - 1} er frie)`,
    );
  }
  let legible = true;
  for (const layer of textLayers) {
    const solo = derivePattern({ ...def, chartLayers: [layer] });
    for (let r = 0; r < d.bandRows; r++) {
      for (let c = 0; c < d.bodyCount; c++) {
        if (
          solo.chart.grid[r][c] === layer.colorId &&
          layer.colorId !== def.background &&
          d.chart.grid[r][c] !== layer.colorId
        ) {
          legible = false;
        }
      }
    }
  }
  check(legible, `${id}: NORGE-bokstavene er uforstyrret i diagrammet`);

  // Both copies actually landed: the wordmark ink must appear on both halves
  // of the circumference.
  if (wordmark && wordmark.kind === 'text') {
    const solo = derivePattern({ ...def, chartLayers: [wordmark] });
    const half = Math.floor(d.bodyCount / 2);
    let frontInk = 0;
    let backInk = 0;
    for (let r = 0; r < d.bandRows; r++) {
      for (let c = 0; c < d.bodyCount; c++) {
        if (solo.chart.grid[r][c] !== wordmark.colorId) continue;
        if (c < half) frontInk++;
        else backInk++;
      }
    }
    check(
      frontInk > 20 && backInk > 20,
      `${id}: NORGE står både foran og bak (${frontInk} / ${backInk} masker)`,
    );
  }

  // ---- The contour: separation without a hard line ----
  //
  // This used to demand that EVERY cell beside a letter was either ink or
  // ground — a solid contour, the letters on a clean panel. That is what put
  // the hard line on the hat: an unbroken ring of ground colour is an edge the
  // strokes visibly stop at, and five letters of it in a row reads as one rule
  // dividing the type from the pattern.
  //
  // The contour is now deliberately porous (`haloDither`), so the test has two
  // halves and needs both:
  //   · MOST neighbours are still ink or ground, or the letters lose the
  //     separation that keeps them legible over a stroke field;
  //   · SOME are field colour, or the dither is not doing anything and the
  //     hard line is back.
  const textLayer = textLayers[0];
  if (textLayer && textLayer.kind === 'text') {
    const solo = derivePattern({ ...def, chartLayers: [textLayer] });
    let clean = 0;
    let crossed = 0;
    for (let r = 0; r < d.bandRows; r++) {
      for (let c = 0; c < d.bodyCount; c++) {
        if (solo.chart.grid[r][c] !== textLayer.colorId) continue;
        for (const dc of [-1, 1]) {
          const n = (c + dc + d.bodyCount) % d.bodyCount;
          const v = d.chart.grid[r][n];
          if (v === textLayer.colorId || v === def.background) clean++;
          else crossed++;
        }
      }
    }
    const total = clean + crossed;
    const cleanShare = total > 0 ? clean / total : 1;
    check(
      cleanShare >= 0.6,
      `${id}: bokstavene beholder konturen (${(cleanShare * 100).toFixed(0)} % rene naboer)`,
    );

    /**
     * THE WORDMARK SITS ON A CLEAN PANEL.
     *
     * This check used to assert the opposite: that the contour was POROUS,
     * 10–45 % of it left open so the field could cross behind the letters and
     * the type would not read as a hole cut in the pattern. That was the right
     * call for a face with two-stitch stems. It is the wrong one for «Norge26»,
     * whose strokes are a single stitch — every ink cell the field reached
     * showed up as a speck ON the letter, and five letters of that read as
     * dirt rather than as fabric passing behind.
     *
     * So the contour is solid now, two stitches deep, and what gets tested is
     * the thing that actually matters: no field colour anywhere near a letter.
     * The field is not lost — it runs over the crown, and it comes back out
     * from under the panel and carries on to the rim, which the brim coverage
     * check below is what protects.
     */
    /**
     * The letters come from the LAYER, not from the grid. Reading them back as
     * "every cell in the wordmark's colour" is the obvious shortcut and it is
     * wrong on three of the five kits: Drakt strokes in off-white and sets
     * off-white type, so half the field would be counted as lettering and the
     * check would pass on hats that are covered in specks.
     */
    const letterCells = new Set<string>();
    for (const p of textPlacements(textLayer, d.chart.cols)) {
      p.mask.forEach((row, r) =>
        row.forEach((on, c) => {
          if (!on) return;
          const rr = p.row + r;
          let cc = (p.col + c) % d.chart.cols;
          if (cc < 0) cc += d.chart.cols;
          if (rr >= 0 && rr < d.chart.rows) letterCells.add(`${rr},${cc}`);
        }),
      );
    }
    const clearance = Math.min(2, Math.max(1, Math.round(textLayer.haloWidth ?? 1)));
    let intruding = 0;
    d.chart.grid.forEach((row, r) =>
      row.forEach((v, c) => {
        if (v === def.background || letterCells.has(`${r},${c}`)) return;
        for (let dr = -clearance; dr <= clearance; dr++) {
          for (let dc = -clearance; dc <= clearance; dc++) {
            let cc = (c + dc) % d.chart.cols;
            if (cc < 0) cc += d.chart.cols;
            if (letterCells.has(`${r + dr},${cc}`)) {
              intruding++;
              return;
            }
          }
        }
      }),
    );
    check(
      intruding === 0,
      `${id}: ingen feltfarger innenfor ${clearance} masker av bokstavene (${intruding})`,
    );
  }

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
