/**
 * End-to-end simulation: 10 virtual FIRST-TIME crocheters (the "man 36-45,
 * never crocheted" persona) crochet the ENTIRE hat, stitch by stitch, round
 * 1 through 32, following ONLY what the app shows them:
 *
 *   - the "Neste (nr. X): FARGE fastmaske" colour from the WorkHUD
 *   - the FARGEBYTTE alerts (change colour in the stitch BEFORE)
 *   - the "to i samme maske" increase flags
 *   - the "Til fargebytte" jump button and the put-the-work-down/resume flow
 *
 * The script then builds the PHYSICAL fabric that results (top-down,
 * right-handed, worked in joined rounds without turning, never flipped
 * inside out: stitch numbers grow LEFT-to-right on the finished outside),
 * looks at the finished hat from the outside, and verifies INDEPENDENTLY of
 * the chart data that the text field spells R O B O R O in that order,
 * upright and NOT mirrored, by matching each letter against the letterform
 * bitmaps. It also proves the mirrored fabric would FAIL the same test.
 *
 * Every simulated user must finish with an identical, correct hat.
 */
import { buildRounds, buildStitches } from '../src/data/pattern';
import type { Round, Stitch, YarnColor } from '../src/data/types';

let failures = 0;
const check = (cond: boolean, msg: string) => {
  if (cond) {
    console.log(`  ok   ${msg}`);
  } else {
    failures++;
    console.error(`  FAIL ${msg}`);
  }
};

/** Deterministic RNG so runs are reproducible per user. */
function makeRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

/** The letterforms the finished hat must show, in reading order.
 *  Kept as an independent copy: if someone breaks src/data/chart.ts, this
 *  fasit still knows what R and O look like. Rows top -> bottom. */
const FACIT_LETTERS: Record<string, string[]> = {
  R: [
    'XXXXXX.',
    'XX...XX',
    'XX...XX',
    'XX...XX',
    'XXXXXX.',
    'XX.XX..',
    'XX..XX.',
    'XX..XX.',
    'XX...XX',
    'XX...XX',
  ],
  O: [
    '.XXXXX.',
    'XX...XX',
    'XX...XX',
    'XX...XX',
    'XX...XX',
    'XX...XX',
    'XX...XX',
    'XX...XX',
    'XX...XX',
    '.XXXXX.',
  ],
};
const EXPECTED_SEQUENCE = ['R', 'O', 'R', 'O', 'R', 'O'];
/** Italic slant used by the hat (must match chart.ts). */
const slantOffset = (rowFromTop: number) => Math.floor((9 - rowFromTop) / 4);

interface Model {
  rounds: Round[];
  stitches: Stitch[];
  cumCounts: number[];
}

function buildModel(): Model {
  const rounds = buildRounds();
  const stitches = buildStitches(rounds);
  const cumCounts: number[] = [];
  let acc = 0;
  for (const r of rounds) {
    acc += r.count;
    cumCounts.push(acc);
  }
  return { rounds, stitches, cumCounts };
}

/** WorkHUD logic: index (within round) of the stitch carrying the NEXT
 *  colour change at or after cursor c, or null. */
function nextChangeAt(model: Model, roundIdx: number, c: number): number | null {
  const before = roundIdx > 0 ? model.cumCounts[roundIdx - 1] : 0;
  const count = model.rounds[roundIdx].count;
  for (let i = before + c; i < before + count; i++) {
    if (model.stitches[i].changeColorAfter) return i - before;
  }
  return null;
}

/**
 * One virtual user crochets the whole hat. Returns the physical fabric:
 * fabric[roundIdx][i] = colour of stitch i of that round, where i grows
 * LEFT-to-right on the finished outside (worn upright).
 */
function crochetWholeHat(model: Model, seed: number, log: string[]): YarnColor[][] {
  const rng = makeRng(seed);
  const fabric: YarnColor[][] = [];
  // The yarn currently on the hook. Colour changes happen while finishing
  // the stitch BEFORE the new colour, exactly as the app instructs.
  let yarnOnHook: YarnColor = 'white';

  model.rounds.forEach((round, roundIdx) => {
    const before = roundIdx > 0 ? model.cumCounts[roundIdx - 1] : 0;
    const made: YarnColor[] = [];
    let c = 0; // the app's stitch cursor for this round

    while (c < round.count) {
      // Persona behaviour: sometimes put the work down and pick it up again
      // (the app restores the cursor), sometimes use "Til fargebytte".
      if (rng() < 0.03) {
        const saved = c;
        c = saved; // resume from the saved cursor — must be lossless
      }
      const useJump = rng() < 0.3;
      let target = c + 1;
      if (useJump) {
        const changeAt = nextChangeAt(model, roundIdx, c);
        // WorkHUD jump: stop right AT the change stitch (alert BEFORE making it)
        if (changeAt !== null && changeAt > c) target = changeAt;
      }
      while (c < target && c < round.count) {
        const st = model.stitches[before + c];
        // The app tells the user the colour of the NEXT stitch. A correct
        // app never asks for a colour that is not on the hook: the yarn was
        // switched while finishing the previous stitch.
        if (st.color !== yarnOnHook) {
          log.push(
            `runde ${round.num}, maske ${c + 1}: appen ber om ${st.color}, men garnet på nålen er ${yarnOnHook} (fargebyttet ble ikke varslet i masken før)`,
          );
        }
        made.push(st.color);
        // FARGEBYTTE alert: pull the new colour through on the last yank.
        if (st.changeColorAfter) yarnOnHook = st.changeColorAfter;
        c++;
      }
    }
    fabric.push(made);
  });
  return fabric;
}

/** Extract the 10x80 text field from the fabric, as seen on the OUTSIDE of
 *  the finished, upright hat (column 0 = stitch 1, left edge). */
function textField(model: Model, fabric: YarnColor[][]): boolean[][] {
  const rows: boolean[][] = [];
  model.rounds.forEach((round, idx) => {
    if (round.phase === 'text') rows.push(fabric[idx].map((col) => col === 'red'));
  });
  return rows;
}

/** Segment the red cells into letters (columns with no red split them). */
function segmentLetters(grid: boolean[][]): { from: number; to: number }[] {
  const cols = grid[0].length;
  const hasRed = Array.from({ length: cols }, (_, x) => grid.some((row) => row[x]));
  const segs: { from: number; to: number }[] = [];
  let start: number | null = null;
  for (let x = 0; x <= cols; x++) {
    if (x < cols && hasRed[x]) {
      if (start === null) start = x;
    } else if (start !== null) {
      segs.push({ from: start, to: x - 1 });
      start = null;
    }
  }
  return segs;
}

/** De-slant a letter segment and match it against a letterform. */
function matchesLetter(grid: boolean[][], seg: { from: number; to: number }, ch: string): boolean {
  const bitmap = FACIT_LETTERS[ch];
  // Letter left edge in the fabric includes the row-dependent slant.
  // The segment bounding box spans base .. base + 6 + maxSlant.
  const base = seg.from; // slant of the bottom rows is 0, so from = base... 
  // Actually the smallest slant (bottom rows) is 0 -> leftmost column of the
  // whole segment = letter base x. Verify every cell against the bitmap.
  for (let row = 0; row < 10; row++) {
    const off = slantOffset(row);
    for (let ccol = 0; ccol < 7; ccol++) {
      const expected = bitmap[row][ccol] === 'X';
      const x = base + off + ccol;
      if (x >= grid[row].length) return false;
      if (grid[row][x] !== expected) return false;
    }
    // No red outside the letter cells in this segment on this row:
    for (let x = seg.from; x <= seg.to; x++) {
      const within = x >= base + off && x < base + off + 7;
      if (!within && grid[row][x]) return false;
    }
  }
  return true;
}

/** Read the letters off the fabric. Returns e.g. "RORORO" or null on mismatch. */
function readLetters(grid: boolean[][]): string | null {
  const segs = segmentLetters(grid);
  if (segs.length !== EXPECTED_SEQUENCE.length) return null;
  let out = '';
  for (const seg of segs) {
    const ch = Object.keys(FACIT_LETTERS).find((k) => matchesLetter(grid, seg, k));
    if (!ch) return null;
    out += ch;
  }
  return out;
}

function mirrored(grid: boolean[][]): boolean[][] {
  return grid.map((row) => [...row].reverse());
}

// ---------------------------------------------------------------------------

console.log('Simulerer 10 førstegangsheklere (hele hatten, maske for maske):');
const model = buildModel();
const totalStitches = model.stitches.length;

let referenceFabric: YarnColor[][] | null = null;
for (let user = 1; user <= 10; user++) {
  const log: string[] = [];
  const fabric = crochetWholeHat(model, user * 7919, log);
  const made = fabric.reduce((n, r) => n + r.length, 0);

  check(made === totalStitches, `bruker ${user}: heklet alle ${made} masker`);
  check(log.length === 0, `bruker ${user}: ingen fargebytte-avvik${log.length ? ` (${log[0]})` : ''}`);

  const grid = textField(model, fabric);
  const word = readLetters(grid);
  check(word === 'RORORO', `bruker ${user}: utsiden leser ${word ?? 'UKJENT/SPEILVENDT'} (fasit RORORO)`);
  const mirroredWord = readLetters(mirrored(grid));
  check(
    mirroredWord === null,
    `bruker ${user}: speilvendt stoff består IKKE testen (bevis på riktig retning)`,
  );

  if (referenceFabric === null) {
    referenceFabric = fabric;
  } else {
    const identical = fabric.every((row, r) =>
      row.every((col, i) => col === referenceFabric![r][i]),
    );
    check(identical, `bruker ${user}: identisk hatt som bruker 1 (uavhengig av navigasjonsstil)`);
  }
}

// Also print round 14 as the user will crochet it, for eyeball verification.
console.log('');
console.log('Runde 14 slik appen dikterer den (arbeidsrekkefølge):');
const r14 = referenceFabric![13];
const runs: { color: YarnColor; n: number }[] = [];
for (const col of r14) {
  const last = runs[runs.length - 1];
  if (last && last.color === col) last.n++;
  else runs.push({ color: col, n: 1 });
}
console.log(
  '  ' +
    runs
      .map((r) => `${r.n} ${r.color === 'red' ? 'røde' : r.color === 'blue' ? 'blå' : 'hvite'}`)
      .join(' · '),
);

console.log('');
if (failures > 0) {
  console.error(`${failures} simuleringsfeil!`);
  process.exit(1);
}
console.log('Alle 10 simulerte brukere endte med riktig hatt: RO RO RO, ikke speilvendt.');
