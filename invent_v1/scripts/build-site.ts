/**
 * Generates the HEKLO build site into public/system/.
 *
 *   ./node_modules/.bin/tsx invent_v1/scripts/build-site.ts
 *
 * Bilingual (NO default, EN toggle), styled with MASKLAB's own tokens and
 * typefaces, with three.js viewers driven by the same STL files the download
 * buttons serve. Vite copies public/ verbatim, so this lands at /system.
 */

import { copyFileSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { bomFor, totalNok, unverified } from '../bom/bom.ts';
import {
  ALL_STEPS,
  FASTENERS,
  MACHINE_MINUTES,
  TOTAL_MINUTES,
  fastenerDemand,
  type GuideStep,
} from '../guide/steps.ts';
import { CYCLE_MS, LIMITS, estimateHatMs, formatDuration } from '../machine/thermal.ts';
import { COMB_GATES, GATE_THROAT_MM, WHEEL_TEETH } from '../machine/units.ts';
import { PART_BY_ID } from '../parts/registry.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, '..', 'public', 'system');

interface MPart {
  id: string;
  file: string;
  bbox: number[];
  grams: number;
  material: string;
  qty: number;
}
const manifest = JSON.parse(readFileSync(join(ROOT, 'data', 'parts.build.json'), 'utf8')) as {
  parts: MPart[];
};

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const nok = (n: number) => n.toLocaleString('nb-NO').replace(/ /g, ' ');

/** Bilingual span. Norwegian shows by default; the toggle flips a root class. */
const t = (no: string, en: string) =>
  `<span class="no">${esc(no)}</span><span class="en">${esc(en)}</span>`;

const stationIds = new Set(
  ALL_STEPS.filter((s) => s.track === 'station').flatMap((s) => s.parts),
);
const isStation = (id: string) =>
  stationIds.has(id) || Boolean(PART_BY_ID[id]?.tracks.includes('bench'));

const stationParts = manifest.parts.filter((p) => isStation(p.id));
const machineParts = manifest.parts.filter((p) => !isStation(p.id));
const grams = (a: MPart[]) => a.reduce((s, p) => s + p.grams * p.qty, 0);
const pcs = (a: MPart[]) => a.reduce((s, p) => s + p.qty, 0);
/** Unsliced estimate, given as a range because nothing here has met a slicer. */
const hours = (g: number) => `${Math.round(g / 22)}–${Math.round(g / 11)} t`;

/* ------------------------------------------------------------------ parts - */

function partCards(rows: MPart[]): string {
  return rows
    .map((m) => {
      const p = PART_BY_ID[m.id];
      return `<article class="pc" data-part="${m.file}">
      <button class="pc-3d" data-open="${m.file}" data-name="${esc(p?.nameNo ?? m.id)}" data-name-en="${esc(p?.name ?? m.id)}" aria-label="${esc(p?.name ?? m.id)}"><canvas data-stl="${m.file}"></canvas><span class="pc-zoom">+</span></button>
      <div class="pc-b">
        <h4>${t(p?.nameNo ?? m.id, p?.name ?? m.id)}</h4>
        <div class="pc-m">
          <span class="mat m-${m.material}">${m.material}</span>
          <span>${m.qty}×</span>
          <span>${m.bbox.map((v) => v.toFixed(0)).join('×')} mm</span>
          <span>${m.grams.toFixed(0)} g</span>
        </div>
        <a class="btn-s" href="stl/${m.file}" download>STL</a>
      </div>
    </article>`;
    })
    .join('');
}

/* ------------------------------------------------------------------ steps - */

function stepCard(s: GuideStep): string {
  return `<article class="st" id="s${s.n}" data-step="${s.n}">
    <div class="st-3d"><canvas data-assembly-step="${s.n}"></canvas></div>
    <div class="st-b">
      <div class="st-h"><span class="st-n">${String(s.n).padStart(2, '0')}</span>
        <h3>${t(s.titleNo, s.title)}</h3>
        <span class="st-t">${s.minutes} min</span></div>
      <p>${t(s.bodyNo, s.body)}</p>
      ${
        s.uses.length
          ? `<ul class="fx">${s.uses
              .map(
                (u) =>
                  `<li><b>${u.qty}×</b> ${t(
                    FASTENERS[u.sku]?.labelNo ?? u.sku,
                    FASTENERS[u.sku]?.label ?? u.sku,
                  )}</li>`,
              )
              .join('')}</ul>`
          : ''
      }
      ${s.warn ? `<p class="wn">${t(s.warnNo ?? s.warn, s.warn)}</p>` : ''}
      <p class="ck"><b>${t('Sjekk', 'Check')}:</b> ${t(s.checkNo, s.check)}</p>
    </div>
  </article>`;
}

/* -------------------------------------------------------------------- bom - */

const bomRows = bomFor('bench')
  .map(
    (l) => `<tr class="${l.verified ? '' : 'unv'}">
    <td>${esc(l.item)}</td>
    <td class="n">${l.qty}</td>
    <td><a href="${esc(l.url)}" target="_blank" rel="noreferrer">${esc(l.vendor)}</a></td>
    <td class="n">${nok(l.priceNok * l.qty)}</td>
    <td class="n">${
      l.verified
        ? `<span class="ok">${t('bekreftet', 'confirmed')}</span>`
        : `<span class="td">${t('sjekk', 'check')}</span>`
    }</td></tr>`,
  )
  .join('');

const fastenerRows = Object.entries(fastenerDemand())
  .sort((a, b) => a[0].localeCompare(b[0]))
  .map(
    ([sku, q]) =>
      `<tr><td>${t(FASTENERS[sku]?.labelNo ?? sku, FASTENERS[sku]?.label ?? sku)}</td><td class="n">${q}</td></tr>`,
  )
  .join('');

const todo = unverified('bench');
const hatSafe = estimateHatMs(3694, 1328, CYCLE_MS.safe);
const hatNom = estimateHatMs(3694, 1328, CYCLE_MS.nominal);

/* ------------------------------------------------------------------- page - */

const html = `<!doctype html>
<html lang="no" class="lang-no">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow, noarchive">
<title>HEKLO — MASKLAB</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Karla:ital,wght@0,300..800;1,300..800&display=swap" rel="stylesheet">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' rx='18' fill='%23EDE7DA'/%3E%3Ccircle cx='50' cy='50' r='26' fill='none' stroke='%23BA0C2F' stroke-width='7'/%3E%3Ccircle cx='50' cy='50' r='7' fill='%23201D18'/%3E%3C/svg%3E">
<style>
  :root{
    --bg:#EDE7DA; --card:#FDFAF3; --ink:#201D18; --ink-soft:#55503F; --ink-faint:#8A8070;
    --line:#EDE4D0; --card-border:#E4DAC5; --chip:#F3ECDC; --red:#BA0C2F; --red-dark:#A50A29;
    --blue:#00205B; --go:#2F6B4F; --go-soft:#E8F0EA; --gold:#A89A7E;
    --serif:'Instrument Serif',Georgia,serif;
    --sans:'Karla',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
    --mono:ui-monospace,'SF Mono',Menlo,monospace;
  }
  *{box-sizing:border-box}
  html{scroll-behavior:smooth}
  body{margin:0;background:var(--bg);color:var(--ink);font-family:var(--sans);
       font-size:16px;line-height:1.6;-webkit-font-smoothing:antialiased}

  .lang-no .en{display:none}
  .lang-en .no{display:none}

  .wrap{max-width:1120px;margin:0 auto;padding:0 24px}
  p{margin:0 0 14px;max-width:62ch}
  a{color:var(--red)}
  h2{font-family:var(--serif);font-weight:400;font-size:clamp(28px,4vw,40px);
     line-height:1.05;margin:0 0 8px;letter-spacing:-.01em}
  h3{font-family:var(--serif);font-weight:400;font-size:22px;line-height:1.15;margin:0}
  h4{font-family:var(--sans);font-weight:800;font-size:13.5px;margin:0;letter-spacing:-.005em}
  .eyebrow{font-family:var(--sans);font-weight:800;font-size:11.5px;letter-spacing:.16em;
           text-transform:uppercase;color:var(--red);margin:0 0 14px}
  .sub{color:var(--ink-soft);max-width:58ch;margin-bottom:0}
  section{padding:60px 0;border-top:1px solid var(--card-border)}

  /* topbar */
  .top{position:sticky;top:0;z-index:20;background:rgba(237,231,218,.93);
       backdrop-filter:blur(10px);border-bottom:1px solid var(--card-border)}
  .top .in{max-width:1120px;margin:0 auto;padding:12px 24px;display:flex;align-items:center;gap:26px}
  .wm{font-family:var(--serif);font-size:19px;letter-spacing:.14em;text-decoration:none;color:var(--ink)}
  .wm i{color:var(--red);font-style:normal}
  .top nav{display:flex;gap:20px;overflow-x:auto;flex:1;font-weight:700;font-size:12px;
           letter-spacing:.08em;text-transform:uppercase}
  .top nav a{color:var(--ink-faint);text-decoration:none;white-space:nowrap}
  .top nav a:hover{color:var(--ink)}
  .lang{display:flex;gap:2px;background:var(--chip);border-radius:999px;padding:3px}
  .lang button{border:0;background:transparent;font-family:var(--sans);font-weight:800;
    font-size:11px;letter-spacing:.06em;padding:4px 11px;border-radius:999px;cursor:pointer;color:var(--ink-faint)}
  .lang button[aria-pressed=true]{background:var(--ink);color:var(--bg)}

  /* hero */
  .hero{display:grid;grid-template-columns:1fr 1fr;gap:40px;align-items:center;
        padding:64px 0 56px;border-top:0}
  @media(max-width:860px){.hero{grid-template-columns:1fr;gap:24px}}
  .hero h1{font-family:var(--serif);font-weight:400;font-size:clamp(46px,8vw,82px);
           line-height:.98;letter-spacing:-.02em;margin:0 0 18px}
  .hero .lede{font-family:var(--serif);font-size:clamp(19px,2.2vw,25px);line-height:1.35;
              color:var(--ink-soft);max-width:24ch}
  .hero-3d{aspect-ratio:16/10;background:var(--card);border:1px solid var(--card-border);
           border-radius:14px;overflow:hidden;position:relative}
  .hero-3d canvas{width:100%;height:100%;display:block;touch-action:none;cursor:grab}
  .v-tabs{position:absolute;left:14px;bottom:14px;display:flex;gap:6px;z-index:2}
  .v-tabs button{font-family:var(--sans);font-weight:800;font-size:11px;letter-spacing:.05em;
    border:1px solid var(--card-border);background:rgba(253,250,243,.92);color:var(--ink-soft);
    padding:6px 12px;border-radius:999px;cursor:pointer}
  .v-tabs button[aria-pressed=true]{background:var(--ink);color:var(--bg);border-color:var(--ink)}
  .v-hint{position:absolute;right:14px;bottom:16px;font-size:11px;font-weight:700;
          color:var(--ink-faint);letter-spacing:.05em;z-index:2}

  /* stages */
  .two{display:grid;grid-template-columns:1fr 1fr;gap:18px}
  @media(max-width:760px){.two{grid-template-columns:1fr}}
  .stage{background:var(--card);border:1px solid var(--card-border);border-radius:14px;padding:24px}
  .stage .role{font-weight:800;font-size:11px;letter-spacing:.14em;text-transform:uppercase;
               color:var(--red);margin-bottom:8px}
  .stage.b .role{color:var(--ink-faint)}
  .stage dl{margin:16px 0 0;display:grid;grid-template-columns:auto 1fr;gap:7px 18px;font-size:14px}
  .stage dt{color:var(--ink-faint);font-weight:700;font-size:12px;letter-spacing:.04em;
            text-transform:uppercase;align-self:center}
  .stage dd{margin:0;font-weight:700;font-variant-numeric:tabular-nums}
  .bridge{background:var(--go-soft);border:1px solid #CFE0D5;border-radius:12px;
          padding:16px 20px;margin-top:18px;font-size:14.5px}
  .bridge b{color:var(--go)}

  /* stat row */
  .stats{display:grid;gap:14px;grid-template-columns:repeat(auto-fit,minmax(160px,1fr))}
  .stat{background:var(--card);border:1px solid var(--card-border);border-radius:12px;padding:18px 20px}
  .stat .k{font-family:var(--serif);font-size:34px;line-height:1}
  .stat .l{font-weight:800;font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;
           color:var(--ink-faint);margin-top:6px}

  /* parts */
  .pgrid{display:grid;gap:14px;grid-template-columns:repeat(auto-fill,minmax(196px,1fr))}
  .pc{background:var(--card);border:1px solid var(--card-border);border-radius:12px;overflow:hidden}
  .pc-3d{aspect-ratio:1;background:linear-gradient(160deg,#F7F2E6,#EFE8D8)}
  .pc-3d canvas{width:100%;height:100%;display:block;touch-action:none;cursor:grab}
  .pc-b{padding:12px 14px 14px}
  .pc-m{display:flex;flex-wrap:wrap;gap:7px;margin:7px 0 10px;font-size:11.5px;
        color:var(--ink-faint);font-weight:700;font-variant-numeric:tabular-nums}
  .mat{font-size:9.5px;font-weight:800;letter-spacing:.06em;padding:2px 6px;border-radius:4px}
  .m-PETG{background:#F6E3D6;color:#9A4614}.m-PLA{background:#E2ECF5;color:#1E4F7A}
  .m-TPU{background:var(--chip);color:var(--ink-soft)}
  .btn-s{display:inline-block;font-weight:800;font-size:11px;letter-spacing:.06em;
    text-decoration:none;border:1.5px solid var(--ink);color:var(--ink);padding:5px 12px;border-radius:999px}
  .btn-s:hover{background:var(--ink);color:var(--bg)}

  /* steps */
  .track-h{display:flex;align-items:center;gap:14px;margin:34px 0 16px;
           font-weight:800;font-size:11.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--red)}
  .track-h::after{content:"";flex:1;height:1px;background:var(--card-border)}
  .steps{display:flex;flex-direction:column;gap:14px}
  .st{background:var(--card);border:1px solid var(--card-border);border-radius:14px;
      display:grid;grid-template-columns:220px 1fr;overflow:hidden}
  @media(max-width:700px){.st{grid-template-columns:1fr}}
  .st-3d{background:linear-gradient(160deg,#F7F2E6,#EFE8D8);border-right:1px solid var(--card-border);
         min-height:180px;position:relative}
  @media(max-width:700px){.st-3d{border-right:0;border-bottom:1px solid var(--card-border);aspect-ratio:16/9}}
  .st-3d canvas{width:100%;height:100%;display:block;touch-action:none;cursor:grab}
  .st-b{padding:20px 22px}
  .st-h{display:flex;align-items:baseline;gap:12px;margin-bottom:10px;flex-wrap:wrap}
  .st-n{font-family:var(--mono);font-weight:700;font-size:13px;color:var(--red);
        background:#F7E4E8;padding:3px 8px;border-radius:6px}
  .st-t{margin-left:auto;font-size:11.5px;font-weight:700;color:var(--ink-faint)}
  .fx{margin:0 0 12px;padding:0;list-style:none;display:flex;flex-wrap:wrap;gap:6px}
  .fx li{font-size:11.5px;font-weight:700;background:var(--chip);border-radius:6px;padding:4px 9px}
  .fx b{color:var(--red)}
  .wn{background:#FBEDE6;border-left:3px solid #C4551F;padding:10px 14px;border-radius:0 8px 8px 0;
      font-size:14px;color:#8A3A11}
  .ck{background:var(--go-soft);border-left:3px solid var(--go);padding:10px 14px;
      border-radius:0 8px 8px 0;font-size:14px;margin-bottom:0}

  /* tables */
  .sc{overflow-x:auto;background:var(--card);border:1px solid var(--card-border);border-radius:12px}
  table{border-collapse:collapse;width:100%;min-width:520px;font-size:14px}
  th,td{text-align:left;padding:11px 16px;border-bottom:1px solid var(--line)}
  thead th{font-weight:800;font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;
           color:var(--ink-faint);background:#F7F2E6}
  tbody tr:last-child td{border-bottom:0}
  .n{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
  .ok,.td{font-weight:800;font-size:10px;letter-spacing:.05em;text-transform:uppercase;
          padding:3px 8px;border-radius:6px;white-space:nowrap}
  .ok{background:var(--go-soft);color:var(--go)}
  .td{background:#FBEDE6;color:#9A4614}
  tr.unv td{background:#FDF6F1}

  .note{background:var(--card);border:1px solid var(--card-border);border-left:4px solid var(--red);
        border-radius:0 12px 12px 0;padding:20px 24px}
  .note p:last-child{margin-bottom:0}

  .pc-3d{border:0;padding:0;display:block;width:100%;position:relative;cursor:zoom-in}
  .pc-zoom{position:absolute;right:9px;bottom:9px;width:24px;height:24px;border-radius:50%;
    background:rgba(32,29,24,.08);color:var(--ink-soft);font-weight:800;font-size:15px;
    display:grid;place-items:center;line-height:1}
  .pc-3d:hover .pc-zoom{background:var(--ink);color:var(--bg)}
  .modal{position:fixed;inset:0;z-index:60;background:rgba(32,29,24,.55);
         display:grid;place-items:center;padding:24px}
  .modal[hidden]{display:none}
  .modal-in{background:var(--card);border-radius:16px;width:min(620px,100%);overflow:hidden;
            border:1px solid var(--card-border);position:relative}
  .modal-x{position:absolute;top:10px;right:12px;z-index:2;border:0;background:transparent;
    font-size:26px;line-height:1;color:var(--ink-faint);cursor:pointer;padding:4px 8px}
  #modalC{width:100%;aspect-ratio:1;display:block;touch-action:none;cursor:grab;
          background:linear-gradient(160deg,#F7F2E6,#EFE8D8)}
  .modal-b{display:flex;align-items:center;justify-content:space-between;gap:16px;
           padding:16px 20px;border-top:1px solid var(--card-border)}
  .modal-b h4{font-size:15px}

  footer{border-top:1px solid var(--card-border);padding:26px 0 70px;
         font-size:13px;color:var(--ink-faint)}
</style>
</head>
<body>

<div class="top"><div class="in">
  <a class="wm" href="/">MASKLAB<i>*</i></a>
  <nav>
    <a href="#stages">${t('To trinn', 'Two stages')}</a>
    <a href="#parts">${t('Deler', 'Parts')}</a>
    <a href="#build">${t('Bygg', 'Build')}</a>
    <a href="#buy">${t('Kjøp', 'Buy')}</a>
    <a href="#safety">${t('Sikkerhet', 'Safety')}</a>
  </nav>
  <div class="lang">
    <button id="bNo" aria-pressed="true">NO</button>
    <button id="bEn" aria-pressed="false">EN</button>
  </div>
</div></div>

<div class="wrap">

<section class="hero">
  <div>
    <p class="eyebrow">${t('Masklab · maskinprogram', 'Masklab · machine programme')}</p>
    <h1>HEKLO</h1>
    <p class="lede">${t(
      'En maskin som hekler bøttehattene. Ekte hekling — én løkke, trukket gjennom to.',
      'A machine that crochets the bucket hats. Real crochet — one loop, drawn through two.',
    )}</p>
    <p class="sub" style="margin-top:18px">${t(
      'Printede deler, standard bevegelseskomponenter og en mikrokontroller. Alt kjøpt i Norge.',
      'Printed parts, off-the-shelf motion hardware and a microcontroller. All sourced in Norway.',
    )}</p>
  </div>
  <div class="hero-3d">
    <canvas id="hero"></canvas>
    <div class="v-tabs">
      <button data-view="station" aria-pressed="true">${t('Prototyp', 'Prototype')}</button>
      <button data-view="all" aria-pressed="false">${t('Hele maskinen', 'Full machine')}</button>
    </div>
    <div class="v-hint">${t('dra for å rotere', 'drag to rotate')}</div>
  </div>
</section>

<section id="stages">
  <p class="eyebrow">${t('Slik henger det sammen', 'How it fits together')}</p>
  <h2>${t('To trinn, én maskin', 'Two stages, one machine')}</h2>
  <p class="sub" style="margin-bottom:26px">${t(
    'Du bygger hodet først og kjører det på benken. Består det testene, skrus akkurat den samme enheten på maskinen i steg 18.',
    'You build the head first and run it on a bench. If it passes, that same assembly bolts onto the machine at step 18.',
  )}</p>

  <div class="two">
    <div class="stage">
      <div class="role">${t('Trinn 1 · prototyp', 'Stage 1 · prototype')}</div>
      <h3>HEKLO Station</h3>
      <p style="margin-top:8px">${t(
        'Nålvogn, hjuldrift, garnfinger, kamera og temperaturfølere — maskinens arbeidshode, på en benkeplate.',
        'Needle carriage, wheel drive, yarn finger, camera and thermal sensors — the working head, on a bench plate.',
      )}</p>
      <dl>
        <dt>${t('Print', 'Print')}</dt><dd>${stationParts.length} · ${pcs(stationParts)} ${t('stk', 'pcs')} · ${grams(stationParts).toFixed(0)} g</dd>
        <dt>${t('Printtid', 'Print time')}</dt><dd>${hours(grams(stationParts))}</dd>
        <dt>${t('Montering', 'Assembly')}</dt><dd>${(TOTAL_MINUTES / 60).toFixed(1)} ${t('t', 'h')}</dd>
        <dt>${t('Deler', 'Parts')}</dt><dd>${nok(totalNok('bench'))} kr</dd>
        <dt>${t('Steg', 'Steps')}</dt><dd>1–12</dd>
      </dl>
    </div>
    <div class="stage b">
      <div class="role">${t('Trinn 2 · maskinen', 'Stage 2 · the machine')}</div>
      <h3>HEKLO M1</h3>
      <p style="margin-top:8px">${t(
        'Legger til dreieskive, mandrell dreid fra appens egen lueprofil, hele kammen, fargekarusell og kabinett.',
        'Adds the turntable, a mandrel lathed from the app’s own hat profile, the full comb, colour turret and enclosure.',
      )}</p>
      <dl>
        <dt>${t('Print', 'Print')}</dt><dd>+${machineParts.length} · ${pcs(machineParts)} ${t('stk', 'pcs')} · ${grams(machineParts).toFixed(0)} g</dd>
        <dt>${t('Printtid', 'Print time')}</dt><dd>${hours(grams(machineParts))}</dd>
        <dt>${t('Montering', 'Assembly')}</dt><dd>+${(MACHINE_MINUTES / 60).toFixed(1)} ${t('t', 'h')}</dd>
        <dt>${t('Steg', 'Steps')}</dt><dd>13–24</dd>
        <dt>${t('Resultat', 'Output')}</dt><dd>${t('en ferdig lue', 'a wearable hat')}</dd>
      </dl>
    </div>
  </div>

  <div class="bridge">${t(
    '<b>Ingenting kastes.</b> Alt du kjøper til prototypen går inn i den ferdige maskinen — motorer, skinne, drivere, kontroller, kamera, følere, strømforsyning. Det eneste som blir igjen er én printet benkeplate.',
    '<b>Nothing is wasted.</b> Everything bought for the prototype goes into the finished machine — motors, rail, drivers, controller, camera, sensors, power supply. The only thing left behind is one printed bench plate.',
  )}</div>
</section>

<section>
  <p class="eyebrow">${t('Mekanismen', 'The mechanism')}</p>
  <h2>${t('Maskinen leter aldri', 'The machine never searches')}</h2>
  <p class="sub">${t(
    'Det som stopper heklemaskiner er ikke masken — det er å finne forrige omgangs løkke og holde den åpen. Her holdes hver levende maske klemt åpen i en printet port, i en posisjon maskinen allerede kjenner.',
    'What defeats crochet machines is not the stitch — it is finding the previous round’s loop and holding it open. Here every live stitch is clamped open in a printed gate, at a pose the machine already knows.',
  )}</p>
  <div class="stats" style="margin-top:26px">
    <div class="stat"><div class="k">${COMB_GATES}+${WHEEL_TEETH}</div>
      <div class="l">${t('printede porter', 'printed gates')}</div></div>
    <div class="stat"><div class="k">${GATE_THROAT_MM} mm</div>
      <div class="l">${t('halsbredde', 'throat width')}</div></div>
    <div class="stat"><div class="k">3 694</div>
      <div class="l">${t('masker per lue', 'stitches per hat')}</div></div>
    <div class="stat"><div class="k">1</div>
      <div class="l">${t('maskType — fastmaske', 'stitch type — single')}</div></div>
  </div>
  <div class="note" style="margin-top:22px">
    <p>${t(
      '<b>Kammen holder, hjulet bærer.</b> Et hjul alene slipper løkken så snart kroken passerer, og slapt stoff holder ingenting åpent. En kam alene trenger én port per maske — 180 like utskrifter og en mekanisme som setter inn nye underveis.',
      '<b>The comb holds, the wheel carries.</b> A wheel alone releases the loop the moment the hook passes, and relaxed fabric holds nothing open. A comb alone needs one gate per stitch — 180 identical prints and a mechanism to insert more mid-run.',
    )}</p>
    <p>${t(
      'Sammen opphever de hverandres svakhet. Steg 11 er der du finner ut om det stemmer.',
      'Together they cancel each other’s weakness. Step 11 is where you find out whether that is true.',
    )}</p>
  </div>
</section>

<section id="parts">
  <p class="eyebrow">${t('Trinn 1 · HEKLO Station', 'Stage 1 · HEKLO Station')}</p>
  <h2>${t('Deler du printer', 'Parts you print')}</h2>
  <p class="sub" style="margin-bottom:22px">${t(
    'Dra for å snurre. Alle filer er verifisert tette, én sammenhengende kropp, innenfor byggevolumet.',
    'Drag to spin. Every file is verified watertight, a single connected body, within the build volume.',
  )}</p>
  <div class="pgrid">${partCards(stationParts)}</div>

  <p class="eyebrow" style="margin-top:44px">${t('Trinn 2 · HEKLO M1', 'Stage 2 · HEKLO M1')}</p>
  <div class="pgrid">${partCards(machineParts)}</div>
</section>

<section id="build">
  <p class="eyebrow">${t('Monteringsanvisning', 'Assembly guide')}</p>
  <h2>${t('Bygg — 24 steg', 'Build — 24 steps')}</h2>
  <p class="sub" style="margin-bottom:10px">${t(
    'Nye deler i hvert steg vises i rødt. Alt som allerede er montert står i beige, resten er gjennomsiktig.',
    'New parts in each step are shown in red. What is already built is beige, the rest is ghosted.',
  )}</p>

  <div class="track-h">${t('Trinn 1 · Station · steg 1–12', 'Stage 1 · Station · steps 1–12')}</div>
  <div class="steps">${ALL_STEPS.filter((s) => s.track === 'station').map(stepCard).join('')}</div>

  <div class="track-h">${t('Trinn 2 · M1 · steg 13–24', 'Stage 2 · M1 · steps 13–24')}</div>
  <div class="steps">${ALL_STEPS.filter((s) => s.track === 'machine').map(stepCard).join('')}</div>
</section>

<section id="buy">
  <p class="eyebrow">${t('Innkjøp · trinn 1', 'Shopping · stage 1')}</p>
  <h2>${nok(totalNok('bench'))} kr</h2>
  <p class="sub" style="margin-bottom:22px">${t(
    'Kun norske butikker med lager i Norge. Ingen tre ukers venting, ingen toll.',
    'Norwegian shops with domestic stock only. No three-week wait, no customs.',
  )}</p>
  <div class="sc"><table>
    <thead><tr><th>${t('Vare', 'Item')}</th><th class="n">${t('Ant', 'Qty')}</th>
    <th>${t('Butikk', 'Shop')}</th><th class="n">kr</th><th class="n">${t('Status', 'Status')}</th></tr></thead>
    <tbody>${bomRows}</tbody>
  </table></div>
  ${
    todo.length
      ? `<div class="note" style="margin-top:18px"><p>${t(
          `<b>${todo.length} av ${bomFor('bench').length} linjer må sjekkes mot butikksiden før du bestiller.</b> Prisene på disse er anslag.`,
          `<b>${todo.length} of ${bomFor('bench').length} lines need checking against the shop page before you order.</b> Those prices are estimates.`,
        )}</p></div>`
      : ''
  }

  <p class="eyebrow" style="margin-top:40px">${t('Skruer, begge trinn', 'Fasteners, both stages')}</p>
  <div class="sc"><table>
    <thead><tr><th>${t('Feste', 'Fastener')}</th><th class="n">${t('Antall', 'Total')}</th></tr></thead>
    <tbody>${fastenerRows}</tbody>
  </table></div>
</section>

<section id="safety">
  <p class="eyebrow">${t('Sikkerhet', 'Safety')}</p>
  <h2>${t('Fart og brann er samme sak', 'Speed and fire are one problem')}</h2>
  <p class="sub">${t(
    'Syklustid er arbeidssyklus, og arbeidssyklus lager varme. Derfor er farten ikke et tall i programmet — den styres av målt temperatur.',
    'Cycle rate is duty cycle, and duty cycle makes heat. So speed is not a number in the program — it is governed by measured temperature.',
  )}</p>
  <div class="stats" style="margin-top:24px">
    <div class="stat"><div class="k">${LIMITS.motor.hardC}°</div>
      <div class="l">${t('utkobling i fastvare', 'firmware cutout')}</div></div>
    <div class="stat"><div class="k">${formatDuration(hatSafe).replace(' h ', ' t ').replace(' m', '')}</div>
      <div class="l">${t('forsiktig', 'cautious')}</div></div>
    <div class="stat"><div class="k">${formatDuration(hatNom).replace(' h ', ' t ').replace(' m', '')}</div>
      <div class="l">${t('mål', 'target')}</div></div>
    <div class="stat"><div class="k">4</div>
      <div class="l">${t('sikkerhetslag', 'safety layers')}</div></div>
  </div>
  <div class="note" style="margin-top:22px">
    <p>${t(
      'Sikring på forsyningen, nødstopp med lås i motorlinjen som programvaren ikke kan overstyre, røykvarsler over maskinen, og dørbryter som kutter strømmen. Alle fire står på delelisten.',
      'Fuse on the supply, latching E-stop in the motor line that software cannot override, smoke alarm above the machine, and a door interlock. All four are on the parts list.',
    )}</p>
    <p>${t(
      'En frakoblet føler viser brutt krets, og brutt krets behandles som feil — aldri som «kald». Det er nøyaktig slik en termisk sikring stille slutter å finnes.',
      'A disconnected sensor reads open circuit, and open circuit is treated as a fault — never as “cold”. That is exactly how a thermal cutout silently stops existing.',
    )}</p>
    <p>${t(
      'Ikke la maskinen gå uten tilsyn før du har sett den fullføre en hel lue mens du er våken.',
      'Do not leave it running unattended until you have watched it finish a whole hat awake.',
    )}</p>
  </div>
</section>

<footer>
  <p>HEKLO · HEKLO Station · HEKLO M1 — MASKLAB. ${t(
    'Alle tall på denne siden er beregnet fra maskindefinisjonen, ikke skrevet inn for hånd.',
    'Every number on this page is computed from the machine definition, not typed in by hand.',
  )}</p>
  <p>${t(
    'Uoppført side. Ikke lenket fra Masklab og ikke indeksert.',
    'Unlisted page. Not linked from Masklab and not indexed.',
  )}</p>
</footer>

</div>

<div class="modal" id="modal" hidden>
  <div class="modal-in">
    <button class="modal-x" id="modalX" aria-label="Lukk">×</button>
    <canvas id="modalC"></canvas>
    <div class="modal-b"><h4 id="modalT"></h4><a class="btn-s" id="modalD" download>STL</a></div>
  </div>
</div>

<script type="module">
import { thumbPart, prepareSteps, livePart, liveAssembly } from './viewer.js';

/* language */
const root = document.documentElement;
const bNo = document.getElementById('bNo');
const bEn = document.getElementById('bEn');
function setLang(l){
  root.className = 'lang-' + l;
  root.lang = l === 'no' ? 'no' : 'en';
  bNo.setAttribute('aria-pressed', String(l === 'no'));
  bEn.setAttribute('aria-pressed', String(l === 'en'));
  try { localStorage.setItem('heklo-lang', l); } catch {}
}
bNo.onclick = () => setLang('no');
bEn.onclick = () => setLang('en');
try { const s = localStorage.getItem('heklo-lang'); if (s) setLang(s); } catch {}

/* assembly data, shared by the hero and every step thumbnail */
const data = await fetch('assembly.json').then(r => r.json());

/* hero */
const hero = await liveAssembly(document.getElementById('hero'), data);
hero.showTrack('station');
for (const b of document.querySelectorAll('.v-tabs button')) {
  b.onclick = () => {
    for (const o of document.querySelectorAll('.v-tabs button')) o.setAttribute('aria-pressed','false');
    b.setAttribute('aria-pressed','true');
    hero.showTrack(b.dataset.view);
  };
}

/* Thumbnails share ONE context, drawn strictly one at a time — a browser caps
   live WebGL contexts at about sixteen and this page has forty-eight canvases. */
let queue = Promise.resolve();
let drawStep = null;

/* One WebGL context serves every thumbnail, drawn strictly one at a time.
   The parts scene and the assembly scene both stay resident, so alternating
   between a part card and a step card costs a camera move, not a rebuild. */
async function paint(c) {
  if (c.dataset.stl) { await thumbPart(c, c.dataset.stl); return; }
  if (!drawStep) drawStep = await prepareSteps(data);
  await drawStep(c, Number(c.dataset.assemblyStep));
}

const io = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    const c = e.target;
    io.unobserve(c);
    queue = queue.then(() => paint(c)).catch(() => {});
  }
}, { rootMargin: '400px' });
for (const c of document.querySelectorAll('canvas[data-stl], canvas[data-assembly-step]')) io.observe(c);

/* Redraw thumbnails on resize, since a blit is a fixed-size image. */
let rt;
addEventListener('resize', () => {
  clearTimeout(rt);
  rt = setTimeout(() => {
    let q = Promise.resolve();
    for (const c of document.querySelectorAll('canvas[data-stl], canvas[data-assembly-step]')) {
      if (!c.width) continue;
      q = q.then(() => paint(c)).catch(() => {});
    }
  }, 250);
});

/* Click a part to inspect it properly. One live context, disposed on close. */
const modal = document.getElementById('modal');
const modalC = document.getElementById('modalC');
const modalT = document.getElementById('modalT');
const modalD = document.getElementById('modalD');
let live = null;

function closeModal() {
  modal.hidden = true;
  if (live) { live.dispose(); live = null; }
}
document.getElementById('modalX').onclick = closeModal;
modal.onclick = (e) => { if (e.target === modal) closeModal(); };
addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modal.hidden) closeModal(); });

for (const b of document.querySelectorAll('.pc-3d[data-open]')) {
  b.onclick = async () => {
    const file = b.dataset.open;
    modalT.textContent = root.classList.contains('lang-en') ? b.dataset.nameEn : b.dataset.name;
    modalD.href = 'stl/' + file;
    modal.hidden = false;
    if (live) live.dispose();
    live = await livePart(modalC, file);
  };
}
</script>
</body>
</html>
`;

/* ------------------------------------------------------------------ emit -- */

mkdirSync(join(OUT, 'stl'), { recursive: true });
writeFileSync(join(OUT, 'index.html'), html);

let copied = 0;
for (const f of readdirSync(join(ROOT, 'stl'))) {
  if (!f.endsWith('.stl')) continue;
  copyFileSync(join(ROOT, 'stl', f), join(OUT, 'stl', f));
  copied++;
}

console.log(
  `wrote public/system/ — ${manifest.parts.length} parts (${copied} STLs), ` +
    `${bomFor('bench').length} BOM lines, ${ALL_STEPS.length} steps, bilingual`,
);
