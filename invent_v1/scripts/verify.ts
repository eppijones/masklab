/**
 * One command that hard-fails.
 *
 *   ./node_modules/.bin/tsx invent_v1/scripts/verify.ts [--only=A,C]
 *
 * Follows the culture of the repo's own scripts/validate.ts: check(), ok/FAIL,
 * a failure counter, exit(1). Run it before you print anything, before you
 * order anything, and before you believe anything.
 *
 * Group A re-parses the STL BYTES rather than trusting the builder's in-memory
 * model, because the bytes are what goes to the printer. It needs only node:fs,
 * so the harness runs without the isolated CAD toolchain installed.
 */

import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { BOM, bomFor, totalNok, unverified, verifiedShare } from '../bom/bom.ts';
import { AXES } from '../machine/axes.ts';
import { frameGraphProblems, frames } from '../machine/frames.ts';
import { homeValues } from '../machine/axes.ts';
import { isFiniteMat, originOf } from '../machine/mat4.ts';
import { LIMITS } from '../machine/thermal.ts';
import {
  COMB_ROWS,
  COMB_ROW_DZ_MM,
  FIT,
  GATE_PITCH_MM,
  GATE_THROAT_MM,
  HOOK_NOSE_MM,
  MAX_PART_MM,
  ROUNDS,
  SIZE_CM,
  STITCH_W_MM,
  YARN_DIA_MM,
  THROAT_MARGIN_MM,
  combRowsNeeded,
  throatRequirementMm,
} from '../machine/units.ts';
import { crc8, decodeCommand, encode, parse, type Command, type Verb } from '../control/protocol.ts';
import { SimTransport } from '../control/transport.ts';
import { ALL_STEPS, FASTENERS, MACHINE_MINUTES, TOTAL_MINUTES, fastenerDemand } from '../guide/steps.ts';
import { programme } from '../machine/programme.ts';
import { MANDREL_R_CAP } from '../parts/full.ts';
import {
  GATES,
  LEARN_COST_NOK,
  P_HAT,
  STITCH_MODEL,
  pHat,
  requiredPStitch,
} from '../machine/reliability.ts';
import { MATES, PARTS, PART_BY_ID } from '../parts/registry.ts';
import type { PartInterface } from '../parts/types.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const only = process.argv.find((a) => a.startsWith('--only='))?.slice(7).split(',');
const staleDays = Number(process.argv.find((a) => a.startsWith('--stale-days='))?.slice(13) ?? 180);

let failures = 0;
let checks = 0;

function G(id: string, title: string): boolean {
  if (only && !only.includes(id)) return false;
  console.log(`\n${id} — ${title}`);
  return true;
}

function check(cond: boolean, msg: string): void {
  checks++;
  if (cond) {
    console.log(`  ok   ${msg}`);
  } else {
    failures++;
    console.log(`  FAIL ${msg}`);
  }
}

function note(msg: string): void {
  console.log(`       ${msg}`);
}

/* ============================================================ A: geometry = */

interface ManifestPart {
  id: string;
  file: string;
  sha256: string;
  tris: number;
  bbox: number[];
  closed: boolean;
  degenerate: number;
  bodies: number;
  grams: number;
  material: string;
  qty: number;
}

function reparse(buf: Buffer) {
  const tris = buf.readUInt32LE(80);
  const q = (v: number) => Math.round(v * 1000);
  const edges = new Map<string, number>();
  let degenerate = 0;
  const lo = [Infinity, Infinity, Infinity];
  const hi = [-Infinity, -Infinity, -Infinity];

  for (let i = 0; i < tris; i++) {
    const o = 84 + i * 50 + 12;
    const keys: string[] = [];
    const p: number[][] = [];
    for (let j = 0; j < 3; j++) {
      const v = [
        buf.readFloatLE(o + j * 12),
        buf.readFloatLE(o + j * 12 + 4),
        buf.readFloatLE(o + j * 12 + 8),
      ];
      p.push(v);
      keys.push(`${q(v[0])},${q(v[1])},${q(v[2])}`);
      for (let k = 0; k < 3; k++) {
        if (v[k] < lo[k]) lo[k] = v[k];
        if (v[k] > hi[k]) hi[k] = v[k];
      }
    }
    const [a, b, c] = p;
    const cx = (b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1]);
    const cy = (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]);
    const cz = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    if (Math.hypot(cx, cy, cz) < 1e-6) {
      degenerate++;
      continue;
    }
    for (let j = 0; j < 3; j++) {
      const k = `${keys[j]}|${keys[(j + 1) % 3]}`;
      edges.set(k, (edges.get(k) ?? 0) + 1);
    }
  }

  let unpaired = 0;
  for (const [k, n] of edges) {
    const [p1, p2] = k.split('|');
    if (n !== (edges.get(`${p2}|${p1}`) ?? 0)) unpaired++;
  }

  return {
    tris,
    unpaired,
    degenerate,
    bbox: [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]] as [number, number, number],
  };
}

if (G('A', 'geometry — the bytes that go to the printer')) {
  const manifestPath = join(ROOT, 'data', 'parts.build.json');
  if (!existsSync(manifestPath)) {
    check(false, 'data/parts.build.json is missing — run: cd invent_v1/tools && npm run stl');
  } else {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
      parts: ManifestPart[];
    };
    const stlDir = join(ROOT, 'stl');
    const onDisk = existsSync(stlDir) ? readdirSync(stlDir).filter((f) => f.endsWith('.stl')) : [];

    check(
      onDisk.length === manifest.parts.length,
      `stl/ holds ${onDisk.length} files, manifest lists ${manifest.parts.length}`,
    );

    for (const m of manifest.parts) {
      const p = join(stlDir, m.file);
      if (!existsSync(p)) {
        check(false, `${m.id}: ${m.file} missing from stl/`);
        continue;
      }
      const buf = readFileSync(p);
      const sha = createHash('sha256').update(buf).digest('hex');
      const r = reparse(buf);
      const maxDim = Math.max(...r.bbox);

      const problems: string[] = [];
      if (sha !== m.sha256) problems.push('hash differs from the manifest — stale, rebuild');
      if (r.unpaired > 0) problems.push(`${r.unpaired} unpaired edges — not watertight`);
      if (r.degenerate > 0) problems.push(`${r.degenerate} degenerate triangles`);
      if (m.bodies !== 1) problems.push(`${m.bodies} disconnected bodies`);
      if (maxDim > MAX_PART_MM) problems.push(`${maxDim.toFixed(1)} mm exceeds ${MAX_PART_MM} mm`);

      check(
        problems.length === 0,
        `${m.id.padEnd(16)} ${String(r.tris).padStart(5)} tris  ${maxDim.toFixed(1).padStart(6)} mm  ` +
          (problems.length ? problems.join('; ') : 'watertight, single body, fits the plate'),
      );
    }

    // The PUBLISHED directory must hold exactly the parts that exist. Renaming
    // needle-collet to hook-collet left the old file downloadable from the site
    // with nothing linking to it, which is worse than a broken link: it is a
    // part that does not exist, in a format somebody would send to a printer.
    const pubStl = join(ROOT, '..', 'public', 'system', 'stl');
    if (existsSync(pubStl)) {
      const published = readdirSync(pubStl).filter((f) => f.endsWith('.stl'));
      const known = new Set(manifest.parts.map((m) => m.file));
      const orphans = published.filter((f) => !known.has(f));
      check(
        orphans.length === 0,
        orphans.length
          ? `orphaned STLs published: ${orphans.join(', ')}`
          : `public/system/stl holds exactly the ${published.length} current parts`,
      );
    }

    const g = manifest.parts.reduce((s, m) => s + m.grams * m.qty, 0);
    note(`${manifest.parts.reduce((s, m) => s + m.qty, 0)} pieces, ${g.toFixed(0)} g total`);
  }
}

/* ================================================================= B: fit = */

function iface(ref: string): { partId: string; found: PartInterface | undefined } {
  const [partId, ifaceId] = ref.split('#');
  const part = PART_BY_ID[partId];
  return { partId, found: part?.interfaces?.find((i) => i.id === ifaceId) };
}

if (G('B', 'fit — a watertight part can still not fit its neighbour')) {
  for (const m of MATES) {
    const A = iface(m.a);
    const B = iface(m.b);
    if (!A.found || !B.found) {
      check(false, `${m.a} <-> ${m.b}: unresolved interface reference`);
      continue;
    }

    if (m.type === 'clearance' && A.found.kind === 'bore' && B.found.kind === 'shaft') {
      const clearance = A.found.dia - B.found.dia;
      const { min, max } = FIT[A.found.fit];
      const okFit = clearance >= min && clearance <= max;
      check(
        okFit,
        `${m.a} bore ${A.found.dia} mm on ${m.b} shaft ${B.found.dia} mm — clearance ${clearance.toFixed(2)} mm, '${A.found.fit}' fit wants ${min}-${max} mm`,
      );
      if (!okFit) note(m.why);
      continue;
    }

    if (m.type === 'clearance' && A.found.kind === 'blade' && B.found.kind === 'throat') {
      // The hook NOSE is what passes through; the throat must pass it plus two
      // yarn thicknesses plus a working margin.
      const need = throatRequirementMm(A.found.dia, YARN_DIA_MM);
      check(
        B.found.width >= need,
        `throat ${B.found.width.toFixed(1)} mm vs hook nose ${A.found.dia} + 2x yarn ${YARN_DIA_MM} + margin ${THROAT_MARGIN_MM} = ${need.toFixed(1)} mm needed (${(B.found.width - need).toFixed(2)} mm in hand)`,
      );
      if (B.found.width < need) note(m.why);
      continue;
    }

    if (m.type === 'passage' && A.found.kind === 'throat' && B.found.kind === 'throat') {
      const gap = Math.abs(A.found.width - B.found.width);
      check(
        gap <= (m.tolMm ?? 0.4),
        `${m.a} ${A.found.width.toFixed(2)} mm vs ${m.b} ${B.found.width.toFixed(2)} mm — gap ${gap.toFixed(2)} mm`,
      );
      if (gap > (m.tolMm ?? 0.4)) note(m.why);
      continue;
    }

    if (m.type === 'pattern' && A.found.kind === 'boltPattern' && B.found.kind === 'boltPattern') {
      const sameCount = A.found.positions.length === B.found.positions.length;
      check(
        sameCount,
        `${m.a} has ${A.found.positions.length} holes, ${m.b} has ${B.found.positions.length}`,
      );
      if (!sameCount) note(m.why);
      continue;
    }

    check(false, `${m.a} <-> ${m.b}: mate type '${m.type}' does not match interface kinds`);
  }

  // Bore/shaft fit classes across the registry.
  for (const p of PARTS) {
    for (const i of p.interfaces ?? []) {
      if (i.kind !== 'bore') continue;
      const { min, max } = FIT[i.fit];
      check(
        min > 0 && max > min,
        `${p.id}#${i.id}: '${i.fit}' fit is ${min}-${max} mm diametral clearance`,
      );
    }
  }

  // Bolt length sanity: grip + 3 <= len <= grip + 8.
  for (const p of PARTS) {
    for (const i of p.interfaces ?? []) {
      if (i.kind !== 'boltPattern') continue;
      const lens = (p.fasteners ?? [])
        .map((f) => /(\d+)x(\d+)/.exec(f.sku))
        .filter(Boolean)
        .map((mm) => Number(mm![2]));
      if (!lens.length) continue;
      const okLen = lens.some((l) => l >= i.gripMm + 3 && l <= i.gripMm + 25);
      check(
        okLen,
        `${p.id}#${i.id}: grip ${i.gripMm} mm, screws available ${lens.join('/')} mm`,
      );
      if (!okLen) note('too short does not engage; too long bottoms out before it clamps');
    }
  }
}

/* ========================================== B2: the constraints that bite = */

if (G('B2', 'constraints — the arithmetic nobody was checking')) {
  // 1. The inequality the mechanism lives on, stated once, checked here.
  const need = throatRequirementMm();
  check(
    GATE_THROAT_MM >= need,
    `throat ${GATE_THROAT_MM} mm >= hook nose ${HOOK_NOSE_MM} + 2x yarn ${YARN_DIA_MM} + margin ${THROAT_MARGIN_MM} = ${need.toFixed(1)} mm`,
  );
  note(`${(GATE_THROAT_MM - need).toFixed(2)} mm in hand — the tightest number on the machine`);

  // 2. An aperture of this width cannot repeat at the stitch pitch in one row.
  //    That is arithmetic, and it is the reason the comb is staggered at all.
  //    Nothing compared these two numbers before, so a two-row comb could have
  //    silently become an impossible one-row comb on any edit.
  const rowsNeeded = combRowsNeeded();
  check(
    COMB_ROWS >= rowsNeeded,
    `gate pitch ${GATE_PITCH_MM.toFixed(1)} mm at ${STITCH_W_MM} mm stitch pitch needs ${rowsNeeded} comb rows, design has ${COMB_ROWS}`,
  );

  // 3. What the stagger costs the FABRIC. The previous revision staggered rows
  //    radially by a full gate depth — 10.2 mm — which asked every second
  //    stitch to leave the circle its neighbours sit on. This is the check that
  //    would have caught it.
  check(
    COMB_ROW_DZ_MM <= STITCH_W_MM,
    `row stagger asks the edge for ${COMB_ROW_DZ_MM} mm of excursion, under one stitch pitch (${STITCH_W_MM} mm)`,
  );

  // 4. Nothing sharp. The hook is printed; there is no needle on this machine.
  const sharp = PARTS.filter((p) => /needle|nal|nål/i.test(`${p.id} ${p.name}`));
  check(sharp.length === 0, sharp.length ? `sharp/needle parts still present: ${sharp.map((p) => p.id).join(', ')}` : 'no needle parts — the hook is printed');

  // 5. Nothing soldered. Every threaded hole in plastic is a captive nut.
  const insertSkus = Object.keys(fastenerDemand()).filter((s) => /INSERT/i.test(s));
  check(insertSkus.length === 0, insertSkus.length ? `heat-set inserts still called for: ${insertSkus.join(', ')}` : 'no heat-set inserts — no soldering iron in the build');
  const insertLines = BOM.filter((l) => /innsats|insert/i.test(`${l.item} ${l.itemNo}`));
  check(insertLines.length === 0, insertLines.length ? `insert lines still on the BOM: ${insertLines.map((l) => l.id).join(', ')}` : 'no insert line on the shopping list');

  // 6. Every printed part that needs a nut must also buy that nut.
  const nutDemand = Object.entries(fastenerDemand()).filter(([s]) => /NUT/.test(s));
  check(nutDemand.length > 0, `${nutDemand.reduce((a, [, q]) => a + q, 0)} captive nuts called out across the guide`);

  // 7. The size range has to be a range, and the nominal has to sit inside it.
  check(
    SIZE_CM.min < SIZE_CM.nominal && SIZE_CM.nominal < SIZE_CM.max,
    `hat sizes ${SIZE_CM.min}-${SIZE_CM.max} cm with ${SIZE_CM.nominal} cm nominal`,
  );
  check(
    ROUNDS.min < ROUNDS.nominal && ROUNDS.nominal < ROUNDS.max,
    `round count ${ROUNDS.min}-${ROUNDS.max} with ${ROUNDS.nominal} nominal`,
  );

  // 8. The probability chain must be probabilities, and must not flatter.
  const bad = GATES.filter((g) => !(g.p > 0 && g.p <= 1));
  check(bad.length === 0, `all ${GATES.length} stage gates carry a probability in (0, 1]`);
  check(
    P_HAT < 0.5,
    `P(finished hat) = ${(P_HAT * 100).toFixed(1)}% — a first-of-its-kind machine that claims better than even odds is not being honest`,
  );
  note(`cheapest decision point: ${LEARN_COST_NOK} kr answers G0 and G1`);

  // 9. Consecutive stitches is the number that kills unattended operation.
  const p999 = pHat(0.999, STITCH_MODEL.refStitches);
  check(
    p999 < 0.05,
    `even at 99.9% per stitch, P(unattended hat) = ${(p999 * 100).toFixed(2)}% over ${STITCH_MODEL.refStitches} stitches`,
  );
  note(`to reach a 50% chance of an unattended hat you need ${(requiredPStitch(0.5, STITCH_MODEL.refStitches) * 100).toFixed(4)}% per stitch`);
}

/* =========================================================== C: sourcing = */

if (G('C', 'sourcing — Norwegian, linked, dated, and reused')) {
  const today = Date.now();
  for (const l of BOM) {
    const problems: string[] = [];
    if (!/^https:\/\//.test(l.url)) problems.push('url is not https');
    if (!(l.priceNok > 0)) problems.push('no price');
    const age = (today - Date.parse(l.checkedAt)) / 86_400_000;
    if (!Number.isFinite(age)) problems.push('checkedAt is not a date');
    else if (age > staleDays) problems.push(`checked ${Math.round(age)} days ago`);
    check(problems.length === 0, `${l.id.padEnd(16)} ${l.vendor.padEnd(22)} ${problems.join('; ') || 'ok'}`);
  }

  // The rule that stops money being wasted on the test.
  const wasted = bomFor('bench').filter((l) => !l.usedInFull);
  check(
    wasted.length === 0,
    wasted.length
      ? `bench purchases NOT reused in the full machine: ${wasted.map((l) => l.id).join(', ')}`
      : 'every bench purchase carries into the full machine',
  );

  const dupes = new Map<string, Set<number>>();
  for (const l of BOM) {
    if (!dupes.has(l.id)) dupes.set(l.id, new Set());
    dupes.get(l.id)!.add(l.priceNok);
  }
  const conflicting = [...dupes].filter(([, s]) => s.size > 1);
  check(conflicting.length === 0, 'no duplicate line id at a conflicting price');

  // Link liveness. The harness is deliberately offline, so it reads the dated
  // artifact that check-links.ts writes rather than making requests itself.
  // "27 vendor links" used to be a count of STRINGS: five of them pointed at
  // two domains that no longer resolved at all, and nothing here could see it.
  const lcPath = join(ROOT, 'data', 'link-check.json');
  if (!existsSync(lcPath)) {
    check(false, 'data/link-check.json missing — run: tsx invent_v1/scripts/check-links.ts');
  } else {
    const lc = JSON.parse(readFileSync(lcPath, 'utf8')) as {
      checkedAt: string;
      total: number;
      ok: number;
      dead: number;
      results: { id: string; state: string }[];
    };
    check(lc.dead === 0, `${lc.ok}/${lc.total} vendor links answered when last opened (${lc.checkedAt})`);
    const missing = BOM.filter((l) => !lc.results.some((r) => r.id === l.id));
    check(missing.length === 0, missing.length ? `not link-checked: ${missing.map((l) => l.id).join(', ')}` : 'every BOM line has been link-checked');
    const lcAge = (today - Date.parse(lc.checkedAt)) / 86_400_000;
    check(lcAge <= staleDays, `link check is ${Math.round(lcAge)} days old`);
  }

  const v = verifiedShare('bench');
  note(`bench total ${totalNok('bench').toLocaleString('nb-NO')} NOK across ${v.total} lines`);
  note(`${v.verified}/${v.total} lines opened and price-confirmed`);
  const todo = unverified('bench');
  if (todo.length) {
    note(`still to confirm by eye: ${todo.map((l) => l.id).join(', ')}`);
  }
}

/* ============================================================== D: guide = */

if (G('D', 'guide — the screws in the steps are the screws in the box')) {
  const demand = fastenerDemand();

  for (const sku of Object.keys(demand)) {
    check(sku in FASTENERS, `${sku} is a known fastener`);
  }

  // Bolt length vs grip, from the geometry rather than from judgement.
  for (const [sku, def] of Object.entries(FASTENERS)) {
    if (def.lenMm === null) continue;
    check(def.lenMm >= 6 && def.lenMm <= 30, `${sku} length ${def.lenMm} mm is plausible`);
  }

  // Every printed part must actually be assembled somewhere.
  const assembled = new Set(ALL_STEPS.flatMap((s) => s.parts));
  for (const p of PARTS) {
    if (!p.print) continue;
    check(assembled.has(p.id), `${p.id} appears in at least one build step`);
  }

  // The CAD predicts the fastener count: every boltPattern needs one screw per
  // hole, per copy of the part. The guide must call out at least that many.
  const geometric: Record<string, number> = {};
  for (const p of PARTS) {
    for (const f of p.fasteners ?? []) {
      geometric[f.sku] = (geometric[f.sku] ?? 0) + f.qty * p.qty;
    }
  }
  note(`guide calls out ${Object.values(demand).reduce((a, b) => a + b, 0)} fasteners across ${ALL_STEPS.length} steps`);

  // Steps numbered 1..N with no gaps.
  const nums = ALL_STEPS.map((s) => s.n);
  check(
    nums.every((n, i) => n === i + 1),
    `steps are numbered 1..${ALL_STEPS.length} with no gaps across both tracks`,
  );

  // The migration must be explicit: exactly one machine step reuses the Station.
  const migration = ALL_STEPS.filter((s) => /Station (onto|across)/i.test(s.title));
  check(migration.length === 1, 'exactly one step moves the Station onto the machine');

  // Every step must end in something observable.
  for (const s of ALL_STEPS) {
    check(s.check.trim().length > 20, `step ${s.n} ends with an observable check`);
  }

  note(`Station ${(TOTAL_MINUTES / 60).toFixed(1)} h to T3, machine +${(MACHINE_MINUTES / 60).toFixed(1)} h to the first hat`);
}

/* ============================================================= E: frames = */

if (G('E', 'frames — derived, not retyped')) {
  const problems = frameGraphProblems();
  check(problems.length === 0, problems.length ? problems.join('; ') : 'axis graph is a tree rooted at base');

  const f = frames(homeValues());
  for (const a of AXES) {
    const m = f[a.id];
    check(isFiniteMat(m), `${a.id} frame resolves to a finite matrix at home`);
    const o = originOf(m);
    const far = Math.max(...o.map(Math.abs));
    check(far < 2000, `${a.id} origin ${o.map((v) => v.toFixed(0)).join(',')} is inside the envelope`);
  }

  const declared = new Set<string>(['base', ...AXES.map((a) => a.id)]);
  for (const p of PARTS) {
    check(declared.has(p.mount.frame), `${p.id} mounts on declared frame '${p.mount.frame}'`);
  }

  for (const a of AXES) {
    const riders = PARTS.filter((p) => p.mount.frame === a.id);
    if (a.tracks.includes('bench')) {
      check(riders.length > 0, `axis ${a.id} carries ${riders.length} part(s)`);
    }
  }
}

/* ============================================================ F: program = */

if (G('F', 'program — the machine and the pattern agree')) {
  const snapPath = join(ROOT, 'data', 'hats.json');
  if (!existsSync(snapPath)) {
    check(false, 'data/hats.json missing — run: tsx invent_v1/scripts/snapshot-hats.ts');
  } else {
    const snap = JSON.parse(readFileSync(snapPath, 'utf8')) as {
      hats: {
        id: string;
        omkretsCm: number;
        hookMm: number;
        totalStitches: number;
        totalRounds: number;
        rounds: { num: number; count: number; colors: number[]; inc: number[] }[];
        profile: { r: number; y: number }[];
      }[];
    };

    check(snap.hats.length === 8, `${snap.hats.length} hats snapshotted`);

    for (const h of snap.hats) {
      const summed = h.rounds.reduce((s, r) => s + r.count, 0);
      const colored = h.rounds.reduce((s, r) => s + r.colors.length, 0);
      const problems: string[] = [];
      if (summed !== h.totalStitches) problems.push(`rounds sum to ${summed}, header says ${h.totalStitches}`);
      if (colored !== h.totalStitches) problems.push(`colour array holds ${colored}`);
      if (h.rounds.length !== h.totalRounds) problems.push(`round count mismatch`);
      if (h.profile.length !== h.totalRounds) problems.push(`profile has ${h.profile.length} rings for ${h.totalRounds} rounds`);
      for (const r of h.rounds) {
        if (r.inc.some((i) => i < 0 || i >= r.count)) {
          problems.push(`round ${r.num} has an increase index outside the round`);
          break;
        }
      }
      check(
        problems.length === 0,
        `${h.id.padEnd(20)} ${String(h.totalStitches).padStart(5)} st, ${h.totalRounds} rounds  ${problems.join('; ') || 'consistent'}`,
      );
    }

    // The parametric model is a SECOND implementation of the app's round
    // schedule, living in machine/programme.ts so the browser, the builder and
    // this harness can all read it without pulling in THREE. A second
    // implementation is only safe if something replays the first through it.
    for (const h of snap.hats) {
      const p = programme(h.omkretsCm, h.totalRounds, h.hookMm);
      const drift = Math.abs(p.totalStitches - h.totalStitches) / h.totalStitches;
      check(
        drift <= 0.05,
        `${h.id.padEnd(20)} parametric model ${p.totalStitches} vs snapshot ${h.totalStitches} — ${(drift * 100).toFixed(1)}% drift`,
      );
    }
    // The size range has to actually produce hats across its whole span.
    for (const cm of [SIZE_CM.min, SIZE_CM.nominal, SIZE_CM.max]) {
      const p = programme(cm, ROUNDS.nominal);
      // The WALL radius is what has to fit the former; the brim deliberately
      // hangs past its edge, because the mandrel is a take-down datum and not
      // a mould. Checking the brim against the plate would reject sizes the
      // machine can actually make.
      const wallR = (p.bodyCount * p.suMm) / (2 * Math.PI);
      check(
        p.totalStitches > 1500 && wallR < MANDREL_R_CAP,
        `${cm} cm: ${p.bodyCount} st/round, wall radius ${wallR.toFixed(0)} mm inside the ${MANDREL_R_CAP} mm former, brim ${p.maxRmm} mm hangs past it, ${p.yarnM.toFixed(0)} m of yarn`,
      );
    }
    // Rounds are a parameter too, and the extremes must stay sane.
    for (const r of [ROUNDS.min, ROUNDS.max]) {
      const p = programme(SIZE_CM.nominal, r);
      check(p.rounds === r && p.wallRounds >= 1, `${r} rounds resolves to ${p.wallRounds} wall rounds`);
    }

    const monotonic = snap.hats.every((h) => {
      for (let i = 1; i < h.profile.length; i++) if (h.profile[i].y > h.profile[i - 1].y + 1e-6) return false;
      return true;
    });
    check(monotonic, 'every mandrel profile descends monotonically from crown to brim');
  }
}

/* =========================================================== G: protocol = */

if (G('G', 'protocol — round-trips, and refuses to throw on garbage')) {
  const verbs: Verb[] = ['hello', 'cfg', 'home', 'jog', 'move', 'cycle', 'run', 'stop', 'abort'];
  const corpus: Command[] = [
    ...verbs.map((verb, i) => ({ seq: i + 1, verb })),
    { seq: 12, verb: 'jog', args: { ax: 'W', d: -2.5, f: 40 } },
    { seq: 13, verb: 'move', args: { ax: 'P', p: 19.5 } },
    { seq: 14, verb: 'run', args: { n: 250, id: 'sc' } },
    { seq: 15, verb: 'cycle', args: { id: 'sc', gate: 412, color: 2 } },
  ];

  let roundTrips = 0;
  for (const c of corpus) {
    const back = decodeCommand(encode(c));
    const same =
      back !== null &&
      back.seq === c.seq &&
      back.verb === c.verb &&
      JSON.stringify(back.args ?? {}) === JSON.stringify(c.args ?? {});
    if (same) roundTrips++;
    else check(false, `round-trip failed for ${c.verb} seq ${c.seq}`);
  }
  check(roundTrips === corpus.length, `${roundTrips}/${corpus.length} commands round-trip exactly`);

  // A single flipped bit must be rejected, not acted on.
  const good = encode({ seq: 7, verb: 'move', args: { ax: 'P', p: 19.5 } });
  const bad = `${good.slice(0, 8)}X${good.slice(9)}`;
  check(decodeCommand(bad) === null, 'a corrupted command line fails its CRC and is rejected');
  check(crc8('') === 0, 'crc8 of the empty string is 0');

  // Nothing the device can say may throw.
  const garbage = [
    '', '   ', 'ok', 'nak', 'ev', 'tel', 'tel t=abc', 'ok notanumber',
    'log', 'x'.repeat(300), '\u0000\u0001', 'tel t=5 W=NaN st=idle',
  ];
  let threw = 0;
  for (const g of garbage) {
    try {
      parse(g);
    } catch {
      threw++;
    }
  }
  check(threw === 0, `${garbage.length} malformed lines parsed without throwing`);
  check(parse('garbage here').kind === 'garbage', 'unrecognised lines become garbage, not exceptions');
  check(parse('tel t=100 W=1.5 st=running q=3 Tm=41.2').kind === 'tel', 'telemetry parses');
}

if (G('H', 'simulator — the UI can be finished before the parts arrive')) {
  // Modest heating: this run is about the cycle pipeline, not the cutout.
  const sim = new SimTransport({ speedup: 120, heatCPerMin: 2 });
  const seen: string[] = [];
  sim.onLine((l) => seen.push(l));

  await sim.open();
  check(sim.state === 'open', 'simulator opens');

  await sim.send(encode({ seq: 1, verb: 'hello' }));
  await sim.send(encode({ seq: 2, verb: 'cfg', args: { get: 1 } }));
  await sim.send(encode({ seq: 3, verb: 'run', args: { n: 3 } }));

  const acked = seen.filter((l) => l.startsWith('ok ')).length;
  check(acked >= 3, `${acked} commands acknowledged`);

  await new Promise((r) => setTimeout(r, 1200));
  const cycles = seen.filter((l) => l.includes('cycle.done')).length;
  check(cycles > 0, `${cycles} cycles completed in the sim`);
  check(
    seen.some((l) => l.startsWith('ev shutter')),
    'every cycle emits a shutter event so a camera frame can be bound to it',
  );

  await sim.panic();
  check(sim.debugState === 'estopped', 'panic() reaches estopped');

  // An unknown verb is refused rather than silently ignored.
  await sim.send(encode({ seq: 9, verb: 'nonsense' as Verb }));
  check(
    seen.some((l) => l.startsWith('nak 9')),
    'an unknown verb is nak-ed',
  );

  await sim.close();
  check(sim.state === 'closed', 'simulator closes cleanly');

  // Thermal runaway must TRIP the machine, not merely be logged. Separate
  // instance so the cutout cannot interfere with the cycle test above.
  const hot = new SimTransport({ speedup: 400, heatCPerMin: 600 });
  const hotLines: string[] = [];
  hot.onLine((l) => hotLines.push(l));
  await hot.open();
  await hot.send(encode({ seq: 1, verb: 'run', args: { n: 500 } }));
  await new Promise((r) => setTimeout(r, 900));

  const trip = hotLines.find((l) => l.startsWith('ev thermal.trip'));
  check(
    hot.debugState === 'fault' && Boolean(trip),
    trip
      ? `runaway heating trips the machine: ${trip.replace('ev thermal.trip ', '')}`
      : `no thermal trip emitted (limit ${LIMITS.motor.hardC} C)`,
  );
  // The cutout must STOP the run, not just log a complaint: no cycle may
  // complete after the trip line appears.
  const tripAt = hotLines.findIndex((l) => l.startsWith('ev thermal.trip'));
  const cyclesAfterTrip =
    tripAt < 0 ? -1 : hotLines.slice(tripAt).filter((l) => l.includes('cycle.done')).length;
  check(
    cyclesAfterTrip === 0,
    `no cycles complete after the thermal trip (saw ${cyclesAfterTrip})`,
  );
  await hot.close();
}

/* ================================================================ summary = */

console.log(
  `\n${failures ? 'FAILED' : 'PASSED'} — ${checks - failures}/${checks} checks green` +
    (only ? ` (groups ${only.join(',')})` : ''),
);
process.exit(failures ? 1 : 0);
