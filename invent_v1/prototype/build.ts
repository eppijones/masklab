import { mkdirSync, writeFileSync, readFileSync, cpSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ManifoldModule from '../tools/node_modules/manifold-3d/manifold.js';
import { emitBinarySTL, evalSolid, initKernel, toMesh } from '../cad/eval-manifold.ts';
import { PARTS } from '../parts/registry.ts';
import { frames } from '../machine/frames.ts';
import { homeValues } from '../machine/axes.ts';
import { multiply, rotationEulerDeg, translation } from '../machine/mat4.ts';
import { HARDWARE } from '../machine/hardware.ts';
import { ALL_STEPS, fastenerDemand } from '../guide/steps.ts';
import { FIT_RACK, FIT_QTY, FIT_STEPS, SOCKETS } from './fit-kit.ts';
import { FULL_QTY, audit } from './engineering.ts';
import { PURCHASES, SOURCES } from './sourcing.ts';
import { inspectSTL } from './mesh-check.ts';
import { REDESIGN } from './redesign.ts';
import { X1_PROFILE, PROJECT_REQUIREMENTS, HAT_ROUNDS } from './hat-process.ts';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const OUT = join(ROOT, 'public');
const densities: Record<string, number> = { PETG: 1.27, PLA: 1.24, TPU: 1.21 };
const f = frames(homeValues());
await initKernel(ManifoldModule);

const files = new Map<string, Buffer>();
const manifest = [];
for (const part of [...PARTS, FIT_RACK]) {
  if (!part.print || !part.build) continue;
  const solid = evalSolid(part.build(part.dims));
  const designBytes = emitBinarySTL(toMesh(solid), `HEKLOMAT design ${part.id} mm`);
  let printable = part.print.orientationDeg ? solid.rotate([...part.print.orientationDeg]) : solid;
  const initial = inspectSTL(emitBinarySTL(toMesh(printable), 'bounds'));
  // XY centre and bottom at Z=0. Geometry-only, no printer commands.
  printable = printable.translate([-(initial.low[0]+initial.high[0])/2, -(initial.low[1]+initial.high[1])/2, -initial.low[2]]);
  const bytes = emitBinarySTL(toMesh(printable), `HEKLOMAT ${part.id} mm REVIEW OR MANUAL TEST ONLY`);
  const check = inspectSTL(bytes);
  const bodies = printable.decompose().length;
  if (check.degenerate || check.invalidEdges || bodies !== 1 || check.volumeCm3 <= 0)
    throw new Error(`${part.id}: invalid mesh ${JSON.stringify({ ...check, bodies })}`);
  const volume = solid.volume() / 1000;
  const skin = Math.min(solid.surfaceArea() / 100 * part.print.walls * 0.04, volume * 0.95);
  const grams = (skin + (volume-skin)*part.print.infillPct/100) * densities[part.print.material];
  const { build, ...definition } = part;
  const matrices = (part.repeats ?? [{ position: part.mount.position, rotationDeg: part.mount.rotationDeg }]).map(s =>
    Array.from(multiply(f[part.mount.frame], multiply(translation(s.position), rotationEulerDeg(s.rotationDeg ?? [0,0,0])))));
  manifest.push({ ...definition, ...check, bodies, grams, solidGrams: volume * densities[part.print.material],
    fitQty: FIT_QTY[part.id] ?? 0, fullQty: FULL_QTY[part.id] ?? { installed: 0, spare: 0 },
    status: FIT_QTY[part.id] ? 'Manual experiment; slice and inspect before printing' : 'Reference only; assembly not released',
    matrices, file: `print/${part.id}.stl`, geometry: `geometry/${part.id}.stl` });
  files.set(`print/${part.id}.stl`, bytes);
  files.set(`geometry/${part.id}.stl`, designBytes);
}

const data = { revision: 'R2-RO', generatedAt: '2026-10-04', units: 'mm',
  release: 'Critical redesign review. Old CAD and optional manual comparison kit only. NOT a working-machine manufacturing release.',
  massMethod: 'Rough CAD shell/infill calculation at a nominal 0.4 mm nozzle. Excludes supports, brim, purge and failed prints; no statistical accuracy bound. Slicer plate totals replace this calculation.',
  printer: X1_PROFILE, requirements: PROJECT_REQUIREMENTS, hatRounds: HAT_ROUNDS,
  parts: manifest, findings: audit(), purchases: PURCHASES, sources: SOURCES,
  fitSteps: FIT_STEPS, sockets: SOCKETS, redesign: REDESIGN,
  // Preserve the prior model as reference. No claim that these are valid mates.
  hardware: HARDWARE.map(h => ({ ...h, matrix: Array.from(multiply(f[h.frame], multiply(translation(h.position), rotationEulerDeg(h.rotationDeg ?? [0,0,0])))) })),
  legacySteps: ALL_STEPS.map(s => ({ n: s.n, title: s.title, parts: s.parts, uses: s.uses, status: 'Unreleased legacy sequence; see findings' })),
  legacyFasteners: fastenerDemand(),
};

// Validation completed above before any generated output is replaced.
for (const [file, bytes] of files) {
  mkdirSync(join(OUT, file.split('/')[0]), { recursive: true });
  writeFileSync(join(OUT, file), bytes);
}
writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(data, null, 2) + '\n');
const blankQuote = { revision: 'R1', scope: 'fit', printer: '', nozzleMm: null, slicerVersion: '', profile: '',
  note: 'Enter one row per sliced plate, INCLUDING supports/brim/purge in grams. Contents maps part IDs to the count ON THAT PLATE. Do not put estimated CAD grams here.',
  plates: [] };
writeFileSync(join(OUT, 'quote-template.json'), JSON.stringify(blankQuote, null, 2));
writeFileSync(join(OUT, 'quote-whole-machine.json'), JSON.stringify({ ...blankQuote, revision: data.revision, scope: 'full', printer: X1_PROFILE.model,
  note: 'Hele V1-referanselisten inkludert reservedeler. Fyll inn faktisk printer, nozzleMm, slicerVersion, profile og en plates-rad per plate med id, material, grams, hours og contents (del-ID: antall). Gram skal inkludere støtte, brim og purge. Ikke bruk CAD-estimater som slicerdata.' }, null, 2));
const sample = { ...blankQuote, note: 'SCHEMA EXAMPLE ONLY — DELETE example plate before using. These are not sliced results.',
  plates: [{ id: 'example-plate', material: 'PETG', grams: 1, hours: 1, contents: { 'fit-rack-r1': 1 } }] };
writeFileSync(join(OUT, 'quote-format-example.json'), JSON.stringify(sample, null, 2));

const escape = (v: unknown) => String(v).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]!));
const rows = manifest.filter(p => p.fitQty).map(p => `<tr><td>${escape(p.id)}</td><td>${p.fitQty}</td><td>${p.bbox.map(n=>n.toFixed(1)).join(' × ')}</td><td>${p.print!.material}</td><td>${p.print!.layerMm} / ${p.print!.walls} / ${p.print!.infillPct}%</td><td>${(p.grams*p.fitQty).toFixed(1)}</td></tr>`).join('');
const fitGrams = manifest.reduce((s,p)=>s+p.grams*p.fitQty,0);
const html = `<!doctype html><html lang="en"><meta charset="utf-8"><title>HEKLOMAT R1 · Print handoff</title><style>body{max-width:1000px;margin:40px auto;padding:24px;font:16px/1.55 system-ui;color:#18352e}h1{font-size:36px}h2{margin-top:32px}small{color:#52645f}table{border-collapse:collapse;width:100%;font-size:13px}th,td{text-align:left;border-bottom:1px solid #c7d2cc;padding:10px}.notice{border:2px solid #bc7337;padding:18px}a{color:#176c51}li{margin:12px 0}@media print{body{margin:0}h2{break-after:avoid}tr{break-inside:avoid}}</style><body>
<small>HEKLOMAT · ENGINEERING R1 · 4 OCTOBER 2026 · ALL DIMENSIONS mm</small><h1>Optional gate-fit comparison kit.</h1>
<p class="notice"><b>The gate-wheel route has been retired as the main development path.</b> Read <a href="DESIGN-REVIEW.html">the critical design review</a> first. This small kit only compares the old printed gate and hook geometry. It does not demonstrate the selected retained-stitch mechanism, and is not required for it. The full-machine reference files have known mechanical gaps and are not a production build release.</p>
<h2>What to print</h2><p>Eight pieces from six STL files. Use 100% scale and your actual printer/nozzle/material profile. The STLs have their bottoms at Z=0. Inspect supports and bed adhesion in the slicer; the small gate tongues and tall hooks may need brims or a different orientation. No G-code is supplied.</p>
<table><thead><tr><th>Part ID</th><th>Qty</th><th>Envelope mm</th><th>Material</th><th>Layer mm / walls / infill</th><th>CAD estimate g</th></tr></thead><tbody>${rows}</tbody></table>
<p>Rough model estimate: <b>${fitGrams.toFixed(1)} g</b>, excluding supports/brims/purge and failed prints. At the retrieved PETG reference of 158 NOK/kg this is <b>${(fitGrams*0.158).toFixed(2)} NOK</b> of consumed filament before allowances. This is not the print-job charge. Slicing and your friend's rates are needed for that.</p>
<h2>Print-job cost</h2><p>Sum the slicer's complete material grams for every plate × filament NOK/kg ÷ 1000, then add machine hours × the operator's hourly rate, setup/labour, and shipping. Add tax only if the entered rates exclude it. Keep reprint allowance separate. Buying whole spools costs more than consumed filament if no stock is available.</p>
<h2>Assembly and experiment</h2><ol>${FIT_STEPS.map(s=>`<li><b>${escape(s.title)}</b><p>${escape(s.body)}</p><p><b>Check:</b> ${escape(s.check)}</p></li>`).join('')}</ol>
<h2>What to buy for this manual kit</h2><p>PETG (or use your friend's existing PETG), the actual project yarn, and a clamp. Borrow a caliper and basic finishing tools if possible. Optional Ø4 mm mounting screws require a length chosen for your backing board. No motor, controller or power supply is needed for this experiment. Purchased metal hook comparison is optional; measure it before designing a holder.</p>
<h2>What your friend should return</h2><p>Printer model, build volume, nozzle, material/brand, slicer name/version and saved project, each plate's quantity/grams/hours, print-job rate, measured tongue and socket dimensions, chosen fit, and a short test video. Use quote-template.json or simply send the slicer summary with the part counts. The workbench imports completed JSON plate quotes.</p>
<h2>Full machine: unresolved work</h2><ol>${data.findings.map(i=>`<li><b>${escape(i.id)} — ${escape(i.title)}</b><p>${escape(i.evidence)}</p><p>${escape(i.action)}</p></li>`).join('')}</ol>
<h2>Sources</h2><ul>${SOURCES.map(s=>`<li><a href="${escape(s.url)}">${escape(s.name)}</a> · retrieved ${s.checked}. ${escape(s.note)}</li>`).join('')}</ul>
<p><small>Keep this R&D handoff private. Source CAD is TypeScript CSG in the source folder; no STEP/B-rep export or validated printer profile is included.</small></p></body></html>`;
writeFileSync(join(OUT, 'START-HERE.html'), html);
const report = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>HEKLOMAT · Critical design review</title><style>body{max-width:1000px;margin:40px auto;padding:24px;font:16px/1.6 system-ui;color:#18352e}h1{font-size:38px;line-height:1.15}h2{margin-top:36px}small{color:#52645f}table{border-collapse:collapse;width:100%;font-size:14px}th,td{text-align:left;vertical-align:top;border-bottom:1px solid #c7d2cc;padding:12px}.decision{border:2px solid #bc7337;padding:20px}a{color:#176c51}li{margin:14px 0}@media print{body{margin:0}h2{break-after:avoid}tr{break-inside:avoid}}</style><body>
<small>HEKLOMAT · CRITICAL DESIGN REVIEW · 4 OCTOBER 2026</small><h1>Prove the stitch before building the whole machine.</h1>
<p class="decision"><b>${escape(REDESIGN.decision)}</b></p><p>${escape(REDESIGN.reasoning)}</p><p>${escape(REDESIGN.target)}</p>
<p><b>Status:</b> ${escape(REDESIGN.status)}. The replacement has no released complete CAD, bill of materials, firmware or demonstrated hat yet. This is an engineering decision based on the evidence below, not proof that it is the best possible machine.</p>
<h2>Architecture comparison</h2><table><thead><tr><th>Option</th><th>Evidence</th><th>Decision</th></tr></thead><tbody>${REDESIGN.options.map(o=>`<tr><td><b>${escape(o.name)}</b><p>${escape(o.fit)}</p></td><td>${escape(o.evidence)}</td><td><b>${escape(o.verdict)}</b><p>${escape(o.why)}</p></td></tr>`).join('')}</tbody></table>
<h2>Replacement modules</h2><ol>${REDESIGN.modules.map(m=>`<li><b>${escape(m.name)}</b><p>${escape(m.action)} ${escape(m.make)}</p><p>Still to determine: ${escape(m.open)}</p></li>`).join('')}</ol>
<h2>Build sequence and acceptance evidence</h2><ol>${REDESIGN.milestones.map(m=>`<li><b>${escape(m.title)}</b><p>${escape(m.deliverable)}</p><p><b>Pass evidence:</b> ${escape(m.pass)}</p></li>`).join('')}</ol>
<h2>Why the existing model cannot be released</h2><p>The previous verification suite passes 243 checks, but it does not test these manufacturing and process requirements. The new checks confirm actual inaccessible pockets and plastic obstructing nominal through-holes, in addition to validating the exported mesh bytes.</p><ol>${data.findings.map(i=>`<li><b>${escape(i.id)} — ${escape(i.title)}</b><p>${escape(i.evidence)}</p><p>${escape(i.action)}</p></li>`).join('')}</ol>
<h2>Costs and print handoff</h2><p>No defensible complete-machine grams, print hours or build total exists for the selected redesign. The old architecture's priced purchase lines total 9,379 NOK, largely from historical allowances, with 12 unpriced categories. That is not the redesign's cost.</p><p>The optional old-geometry comparison kit is approximately ${fitGrams.toFixed(1)} g by a rough CAD shell/infill calculation. It excludes support, brim, purge and failed prints. Its printer-ready quote requires the friend's actual printer profile, plate quantities, slicer grams/hours and charging rates. See <a href="START-HERE.html">the optional kit guide</a>. The 3MF contains geometry only.</p>
<h2>Primary evidence and its limits</h2><ul>${REDESIGN.evidence.map(e=>`<li><a href="${escape(e.url)}">${escape(e.name)}</a><p>${escape(e.finding)}</p><p><small>${escape(e.location)}</small></p><p><b>Our design inference:</b> ${escape(e.implication)}</p></li>`).join('')}</ul>
<p><small>Private R&D review. No full-machine manufacturing release. The archive's CAD source is a source snapshot for the original repository, not a standalone dependency installation.</small></p></body></html>`;
writeFileSync(join(OUT, 'DESIGN-REVIEW.html'), report);
// Fit-kit archive source is deliberately limited to the experiment's six models.
const handoff = join(ROOT, 'handoff');
mkdirSync(join(handoff, 'stl'), { recursive: true });
for (const p of manifest.filter(p=>p.fitQty)) writeFileSync(join(handoff, 'stl', `${p.id}.stl`), files.get(p.file)!);
for (const file of ['START-HERE.html','DESIGN-REVIEW.html','quote-template.json','quote-format-example.json']) cpSync(join(OUT,file),join(handoff,file));
writeFileSync(join(handoff,'print-manifest.json'), JSON.stringify({ revision:data.revision, units:'mm', release:data.release, massMethod:data.massMethod, parts:manifest.filter(p=>p.fitQty).map(p=>({id:p.id,qty:p.fitQty,sha256:p.sha256,bbox:p.bbox,gramsEstimateEach:p.grams,print:p.print})) },null,2));
writeFileSync(join(handoff,'measurement-record.txt'), 'Printer / nozzle / slicer profile:\nMaterial brand:\nMeasured tongue width / depth:\nSocket chosen (dot count):\nPrinted grams / slicer grams:\nPlate hours / rate / setup / delivery:\nYarn / measured hook nose:\nTrial count / capture failures / snags / damage:\nNotes:\n');
console.log(JSON.stringify({parts:manifest.length,fitPieces:manifest.reduce((s,p)=>s+p.fitQty,0),fitGrams:Math.round(fitGrams*10)/10,findings:data.findings.length,priceAllowancesNok:PURCHASES.reduce((s,p)=>s+(p.priceNok??0)*p.qty,0)},null,2));
