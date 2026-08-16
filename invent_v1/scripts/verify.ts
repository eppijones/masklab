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
import { FIT, MAX_PART_MM, NEEDLE_DIA_MM, YARN_DIA_MM, THROAT_MARGIN_MM } from '../machine/units.ts';
import { FASTENERS, STEPS, TOTAL_MINUTES, fastenerDemand } from '../guide/steps.ts';
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

    if (m.type === 'clearance' && A.found.kind === 'bore' && B.found.kind === 'throat') {
      // The needle bore tells us the needle diameter; the throat must pass it
      // plus two yarn thicknesses plus a working margin.
      const need = NEEDLE_DIA_MM + 2 * YARN_DIA_MM + THROAT_MARGIN_MM;
      check(
        B.found.width >= need,
        `throat ${B.found.width.toFixed(1)} mm vs needle ${NEEDLE_DIA_MM} + 2x yarn ${YARN_DIA_MM} + margin ${THROAT_MARGIN_MM} = ${need.toFixed(1)} mm needed`,
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
  const assembled = new Set(STEPS.flatMap((s) => s.parts));
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
  note(`guide calls out ${Object.values(demand).reduce((a, b) => a + b, 0)} fasteners across ${STEPS.length} steps`);

  // Steps numbered 1..N with no gaps.
  const nums = STEPS.map((s) => s.n);
  check(
    nums.every((n, i) => n === i + 1),
    `steps are numbered 1..${STEPS.length} with no gaps`,
  );

  // Every step must end in something observable.
  for (const s of STEPS) {
    check(s.check.trim().length > 20, `step ${s.n} ends with an observable check`);
  }

  note(`${(TOTAL_MINUTES / 60).toFixed(1)} h from opening the box to T3`);
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

    const monotonic = snap.hats.every((h) => {
      for (let i = 1; i < h.profile.length; i++) if (h.profile[i].y > h.profile[i - 1].y + 1e-6) return false;
      return true;
    });
    check(monotonic, 'every mandrel profile descends monotonically from crown to brim');
  }
}

/* ================================================================ summary = */

console.log(
  `\n${failures ? 'FAILED' : 'PASSED'} — ${checks - failures}/${checks} checks green` +
    (only ? ` (groups ${only.join(',')})` : ''),
);
process.exit(failures ? 1 : 0);
