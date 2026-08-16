/**
 * Generates invent_v1/index.html from the registry, the BOM and the guide.
 *
 *   ./node_modules/.bin/tsx invent_v1/scripts/build-site.ts
 *
 * One self-contained static page, no build step, opens from file:// or any
 * static server. This is what your colleague opens: what to print, what to
 * order, and what to do with it — in that order, because that is the order the
 * work happens in.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { BOM, bomFor, totalNok, unverified } from '../bom/bom.ts';
import { FASTENERS, STEPS, TOTAL_MINUTES, fastenerDemand } from '../guide/steps.ts';
import { CYCLE_MS, LIMITS, formatDuration, estimateHatMs } from '../machine/thermal.ts';
import { GATE_THROAT_MM, GATE_THROAT_SWEEP_MM } from '../machine/units.ts';
import { PART_BY_ID } from '../parts/registry.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = join(ROOT, 'data', 'parts.build.json');

interface MPart {
  id: string;
  file: string;
  tris: number;
  bbox: number[];
  grams: number;
  material: string;
  qty: number;
}

const manifest = existsSync(manifestPath)
  ? (JSON.parse(readFileSync(manifestPath, 'utf8')) as { parts: MPart[]; totalsGrams: Record<string, number> })
  : { parts: [], totalsGrams: {} };

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const nok = (n: number) => n.toLocaleString('nb-NO');

/* ------------------------------------------------------------------ parts - */

const partRows = manifest.parts
  .map((m) => {
    const p = PART_BY_ID[m.id];
    const why = p?.print?.orientationWhy ?? '';
    return `<tr>
      <td><b>${esc(p?.name ?? m.id)}</b><div class="sub">${esc(p?.nameNo ?? '')}</div></td>
      <td class="num">${m.qty}</td>
      <td><span class="mat mat-${m.material}">${m.material}</span></td>
      <td class="num">${m.bbox.map((v) => v.toFixed(0)).join(' × ')}</td>
      <td class="num">${m.grams.toFixed(1)} g</td>
      <td class="tiny">${esc(why)}</td>
      <td><a class="dl" href="stl/${m.file}" download>.stl</a></td>
    </tr>`;
  })
  .join('\n');

/* -------------------------------------------------------------------- bom - */

const bomRows = bomFor('bench')
  .map(
    (l) => `<tr class="${l.verified ? '' : 'unverified'}">
      <td><b>${esc(l.item)}</b><div class="sub">${esc(l.itemNo)}</div>${
        l.substituteFor ? `<div class="sub sub-warn">erstatter: ${esc(l.substituteFor)}</div>` : ''
      }</td>
      <td class="num">${l.qty} ${l.unit}</td>
      <td><a href="${esc(l.url)}" target="_blank" rel="noreferrer">${esc(l.vendor)}</a></td>
      <td class="num">${nok(l.priceNok * l.qty)}</td>
      <td>${
        l.verified
          ? `<span class="ok">bekreftet</span>${l.stockNote ? `<div class="tiny">${esc(l.stockNote)}</div>` : ''}`
          : '<span class="todo">må sjekkes</span>'
      }</td>
    </tr>`,
  )
  .join('\n');

/* ------------------------------------------------------------------ steps - */

const stepCards = STEPS.map(
  (s) => `<article class="step">
    <div class="step-head">
      <span class="step-n">${String(s.n).padStart(2, '0')}</span>
      <div>
        <h3>${esc(s.title)}</h3>
        <div class="sub">${esc(s.titleNo)} · ${s.minutes} min</div>
      </div>
    </div>
    <p>${esc(s.body).replace(/\n\n/g, '</p><p>')}</p>
    ${
      s.uses.length
        ? `<ul class="fasteners">${s.uses
            .map((u) => `<li><span class="qty">${u.qty}×</span> ${esc(FASTENERS[u.sku]?.label ?? u.sku)}</li>`)
            .join('')}</ul>`
        : ''
    }
    ${s.warn ? `<p class="warn">${esc(s.warn)}</p>` : ''}
    <p class="check"><b>Du skal nå kunne se:</b> ${esc(s.check)}</p>
  </article>`,
).join('\n');

/* --------------------------------------------------------------- rollups - */

const demand = fastenerDemand();
const fastenerRows = Object.entries(demand)
  .sort()
  .map(([sku, qty]) => `<tr><td>${esc(FASTENERS[sku]?.label ?? sku)}</td><td class="num">${qty}</td></tr>`)
  .join('\n');

const hatMs = estimateHatMs(3694, 1328, CYCLE_MS.nominal);
const hatSafe = estimateHatMs(3694, 1328, CYCLE_MS.safe);
const hatFloor = estimateHatMs(3694, 1328, CYCLE_MS.floor);

const todo = unverified('bench');

const html = `<!doctype html>
<html lang="no">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>HEKLOMAT V1 — benkerigg</title>
<style>
  :root {
    --bg: #f3f5f4; --card: #fff; --ink: #14201e; --ink2: #465854; --ink3: #778985;
    --rule: #d3dcd9; --accent: #0d5b51; --accent-bg: #dfeeea;
    --warn: #a8400c; --warn-bg: #f7e3d6; --ok: #3f5f14; --ok-bg: #e3ecd2;
    --mono: ui-monospace, "SF Mono", Menlo, monospace;
    --sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #0e1514; --card: #16201e; --ink: #e3eae8; --ink2: #aebcb8; --ink3: #7e8f8b;
      --rule: #2b3936; --accent: #57c3ae; --accent-bg: #16332e;
      --warn: #e78149; --warn-bg: #3a2116; --ok: #a9c46c; --ok-bg: #26301a;
    }
  }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--bg); color:var(--ink); font-family:var(--sans); font-size:15px; line-height:1.55; }
  .wrap { max-width:1080px; margin:0 auto; padding:36px 22px 90px; display:flex; flex-direction:column; gap:38px; }
  h1 { font-family:var(--mono); font-size:clamp(26px,4.4vw,40px); letter-spacing:-.02em; margin:8px 0 0; }
  h2 { font-family:var(--mono); font-size:13px; letter-spacing:.12em; text-transform:uppercase;
       margin:0 0 14px; padding-bottom:9px; border-bottom:2px solid var(--ink); }
  h3 { font-size:16px; margin:0; }
  p { margin:0 0 10px; max-width:70ch; }
  .kicker { font-family:var(--mono); font-size:11px; letter-spacing:.13em; text-transform:uppercase; color:var(--ink3); margin:0; }
  .lede { font-size:17px; color:var(--ink2); max-width:64ch; }
  .sub { font-size:12px; color:var(--ink3); }
  .sub-warn { color:var(--warn); }
  .tiny { font-size:11.5px; color:var(--ink3); }
  section { display:block; }
  a { color:var(--accent); }
  .grid { display:grid; gap:14px; grid-template-columns:repeat(auto-fit,minmax(190px,1fr)); }
  .stat { background:var(--card); border:1px solid var(--rule); border-radius:3px; padding:14px 16px; }
  .stat .k { font-family:var(--mono); font-size:24px; font-weight:700; }
  .stat .l { font-family:var(--mono); font-size:10.5px; letter-spacing:.08em; text-transform:uppercase; color:var(--ink3); margin-top:3px; }
  .stat .d { font-size:12.5px; color:var(--ink2); margin-top:6px; }
  .scroller { overflow-x:auto; border:1px solid var(--rule); border-radius:3px; background:var(--card); }
  table { border-collapse:collapse; width:100%; min-width:640px; font-size:13.5px; }
  th,td { text-align:left; padding:9px 13px; border-bottom:1px solid var(--rule); vertical-align:top; }
  thead th { font-family:var(--mono); font-size:10.5px; letter-spacing:.07em; text-transform:uppercase;
             background:var(--bg); border-bottom:2px solid var(--ink); position:sticky; top:0; }
  tbody tr:last-child td { border-bottom:0; }
  .num { text-align:right; font-variant-numeric:tabular-nums; white-space:nowrap; }
  .mat { font-family:var(--mono); font-size:10px; font-weight:700; padding:2px 5px; border-radius:2px; }
  .mat-PETG { background:var(--warn-bg); color:var(--warn); }
  .mat-PLA  { background:var(--accent-bg); color:var(--accent); }
  .dl { font-family:var(--mono); font-size:11px; font-weight:700; text-decoration:none;
        border:1px solid var(--accent); color:var(--accent); padding:3px 7px; border-radius:2px; }
  .ok { font-family:var(--mono); font-size:10px; font-weight:700; text-transform:uppercase;
        background:var(--ok-bg); color:var(--ok); padding:2px 5px; border-radius:2px; }
  .todo { font-family:var(--mono); font-size:10px; font-weight:700; text-transform:uppercase;
          background:var(--warn-bg); color:var(--warn); padding:2px 5px; border-radius:2px; }
  tr.unverified td { background:color-mix(in srgb, var(--warn-bg) 22%, transparent); }
  .steps { display:flex; flex-direction:column; gap:14px; }
  .step { background:var(--card); border:1px solid var(--rule); border-radius:3px; padding:16px 18px; }
  .step-head { display:flex; gap:14px; align-items:baseline; margin-bottom:10px; }
  .step-n { font-family:var(--mono); font-size:22px; font-weight:700; color:var(--accent); }
  .fasteners { margin:10px 0; padding:0; list-style:none; display:flex; flex-wrap:wrap; gap:6px; }
  .fasteners li { font-family:var(--mono); font-size:11.5px; background:var(--bg);
                  border:1px solid var(--rule); border-radius:2px; padding:3px 8px; }
  .fasteners .qty { color:var(--accent); font-weight:700; }
  .warn { background:var(--warn-bg); color:var(--warn); border-left:3px solid var(--warn);
          padding:9px 13px; border-radius:0 3px 3px 0; font-size:13.5px; }
  .check { background:var(--ok-bg); border-left:3px solid var(--ok); padding:9px 13px;
           border-radius:0 3px 3px 0; font-size:13.5px; margin-bottom:0; }
  .callout { background:var(--card); border:1px solid var(--rule); border-left:4px solid var(--accent);
             border-radius:0 3px 3px 0; padding:16px 18px; }
  footer { border-top:1px solid var(--rule); padding-top:16px; font-size:12.5px; color:var(--ink3); }
  code { font-family:var(--mono); font-size:12.5px; }
</style>
</head>
<body>
<div class="wrap">

<header>
  <p class="kicker">invent_v1 · benkerigg · generert ${new Date().toISOString().slice(0, 10)}</p>
  <h1>HEKLOMAT V1</h1>
  <p class="lede">Stasjonsmodulen til heklemaskinen, bygget først og kjørt for seg selv.
  Alt du kjøper her går rett inn i den ferdige maskinen — dette er ikke en jigg.</p>
</header>

<section>
  <h2>Kort fortalt</h2>
  <div class="grid">
    <div class="stat"><div class="k">${manifest.parts.length}</div><div class="l">deler å printe</div>
      <div class="d">${manifest.parts.reduce((a, m) => a + m.qty, 0)} stk · ${Object.values(manifest.totalsGrams).reduce((a, b) => a + b, 0).toFixed(0)} g</div></div>
    <div class="stat"><div class="k">${nok(totalNok('bench'))}</div><div class="l">NOK i deler</div>
      <div class="d">Kun norske butikker</div></div>
    <div class="stat"><div class="k">${(TOTAL_MINUTES / 60).toFixed(1)} t</div><div class="l">fra eske til T3</div>
      <div class="d">${STEPS.length} steg</div></div>
    <div class="stat"><div class="k">${GATE_THROAT_MM}</div><div class="l">mm hals (nominell)</div>
      <div class="d">Sveip: ${GATE_THROAT_SWEEP_MM.join(' / ')} mm</div></div>
  </div>
</section>

<section>
  <h2>Hva riggen skal svare på</h2>
  <div class="callout">
    <p>Fire spørsmål, i rekkefølge, hvert med en stopp-regel. <b>T2 er den ingen av de fire
    tidligere prosjektene har testet</b> — og den hele idéen hviler på.</p>
    <p style="margin-bottom:0"><b>T0</b> nålen fanger og slipper bomullsgarn ·
    <b>T1</b> en printet hals holder en maske åpen i kjent posisjon ·
    <b>T2</b> hjultannen henter masken ut av den strammede kammen ·
    <b>T3</b> én ekte fastmaske, gjennom to løkker, én løkke igjen.</p>
  </div>
</section>

<section>
  <h2>Print dette</h2>
  <div class="scroller"><table>
    <thead><tr><th>Del</th><th class="num">Ant</th><th>Materiale</th><th class="num">mm</th>
    <th class="num">Vekt</th><th>Orientering — hvorfor</th><th></th></tr></thead>
    <tbody>${partRows}</tbody>
  </table></div>
  <p class="tiny" style="margin-top:8px">Alle filer er verifisert vanntette, uten degenererte
  trekanter, én sammenhengende kropp, og innenfor byggevolumet. Kjør
  <code>tsx invent_v1/scripts/verify.ts</code> for å se det selv.</p>
</section>

<section>
  <h2>Kjøp dette</h2>
  <div class="scroller"><table>
    <thead><tr><th>Vare</th><th class="num">Ant</th><th>Butikk</th><th class="num">NOK</th><th>Status</th></tr></thead>
    <tbody>${bomRows}</tbody>
  </table></div>
  ${
    todo.length
      ? `<p class="warn" style="margin-top:10px"><b>${todo.length} linjer må sjekkes mot butikksiden før du bestiller.</b>
         Prisene er anslag, ikke bekreftet. De bekreftede linjene er åpnet og lest av på ${BOM[0].checkedAt}.</p>`
      : ''
  }
</section>

<section>
  <h2>Skruer totalt</h2>
  <div class="scroller"><table>
    <thead><tr><th>Feste</th><th class="num">Antall</th></tr></thead>
    <tbody>${fastenerRows}</tbody>
  </table></div>
  <p class="tiny" style="margin-top:8px">Summert fra stegene under, ikke skrevet for hånd —
  verifikasjonen feiler hvis et steg ber om en skrue som ikke finnes i lista.</p>
</section>

<section>
  <h2>Bygg — ${STEPS.length} steg</h2>
  <div class="steps">${stepCards}</div>
</section>

<section>
  <h2>Fart og brannsikkerhet henger sammen</h2>
  <div class="callout">
    <p>Syklustid <em>er</em> arbeidssyklus, og arbeidssyklus er det som lager varme. Derfor er
    farten ikke en konstant i programmet — den styres av målt temperatur.</p>
    <p>Fastvaren eier en hard grense (${LIMITS.motor.hardC} °C motor, ${LIMITS.driver.hardC} °C driver)
    som kutter motorstrømmen lokalt, uten å spørre maskinen. Under den justerer verten farten:
    varm maskin blir langsommere, kald maskin blir raskere.</p>
    <p style="margin-bottom:0">For en NORGE-lue (3 694 masker, 1 328 fargeskift):
    <b>${formatDuration(hatSafe)}</b> forsiktig · <b>${formatDuration(hatMs)}</b> mål ·
    <b>${formatDuration(hatFloor)}</b> mekanisk tak. Maskinen finner sitt eget trygge maksimum
    og blir der. Tallet er et resultat, ikke et løfte.</p>
  </div>
</section>

<footer>
  <p>Generert fra <code>parts/registry.ts</code>, <code>bom/bom.ts</code> og
  <code>guide/steps.ts</code>. Ikke rediger denne fila — kjør
  <code>tsx invent_v1/scripts/build-site.ts</code>.</p>
  <p>Ikke legg denne mappa ut offentlig før patent er søkt: Norge følger EPC, som ikke har
  nyhetsfrist, så publisering ødelegger nyheten samme dag.</p>
</footer>

</div>
</body>
</html>
`;

writeFileSync(join(ROOT, 'index.html'), html);
console.log(
  `wrote index.html — ${manifest.parts.length} parts, ${bomFor('bench').length} BOM lines, ${STEPS.length} steps`,
);
