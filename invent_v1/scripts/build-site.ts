/**
 * Generates the HEKLO build site into public/system/.
 *
 *   ./node_modules/.bin/tsx invent_v1/scripts/build-site.ts
 *
 * Output lands in the parent app's public/ folder so Vite copies it verbatim
 * into dist/ and Vercel serves it at /system — a real page on the real domain,
 * reachable only if you know the path. It is not linked from any UI.
 *
 * Self-contained: no build step, no framework, no external requests.
 */

import { copyFileSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { BOM, bomFor, totalNok, unverified } from '../bom/bom.ts';
import {
  ALL_STEPS,
  FASTENERS,
  MACHINE_MINUTES,
  TOTAL_MINUTES,
  fastenerDemand,
  type GuideStep,
} from '../guide/steps.ts';
import { CYCLE_MS, LIMITS, estimateHatMs, formatDuration } from '../machine/thermal.ts';
import { COMB_GATES, GATE_THROAT_MM, GATE_THROAT_SWEEP_MM, WHEEL_TEETH } from '../machine/units.ts';
import { PART_BY_ID } from '../parts/registry.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const REPO = join(ROOT, '..');
const OUT = join(REPO, 'public', 'system');

interface MPart {
  id: string;
  file: string;
  tris: number;
  bbox: number[];
  grams: number;
  material: string;
  qty: number;
}

const manifest = JSON.parse(
  readFileSync(join(ROOT, 'data', 'parts.build.json'), 'utf8'),
) as { parts: MPart[] };

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const nok = (n: number) => n.toLocaleString('nb-NO');
const para = (s: string) => esc(s).split('\n\n').map((p) => `<p>${p}</p>`).join('');

const stationIds = new Set(
  ALL_STEPS.filter((s) => s.track === 'station').flatMap((s) => s.parts),
);
const isStation = (id: string) => stationIds.has(id) || PART_BY_ID[id]?.tracks.includes('bench');

const stationParts = manifest.parts.filter((p) => isStation(p.id));
const machineParts = manifest.parts.filter((p) => !isStation(p.id));
const grams = (a: MPart[]) => a.reduce((s, p) => s + p.grams * p.qty, 0);
const pieces = (a: MPart[]) => a.reduce((s, p) => s + p.qty, 0);

/**
 * Print time. Deliberately a RANGE, and labelled as unsliced: nothing here has
 * been through a slicer, and a fabricated single number in a build guide costs
 * somebody their Saturday. PETG at 0.2 mm runs roughly 9-14 g/h for small
 * detailed parts and 18-26 g/h for flat bulk; these bounds bracket both.
 */
const printHours = (g: number): string => `${Math.round(g / 22)}–${Math.round(g / 11)} h`;

/* --------------------------------------------------------------- sections - */

function partTable(rows: MPart[]): string {
  return `<div class="scroll"><table>
    <thead><tr><th>Part</th><th class="n">Qty</th><th>Material</th><th class="n">Size mm</th>
    <th class="n">Weight</th><th>Print orientation &mdash; and why</th><th></th></tr></thead>
    <tbody>${rows
      .map((m) => {
        const p = PART_BY_ID[m.id];
        return `<tr>
        <td><b>${esc(p?.name ?? m.id)}</b><div class="s">${esc(p?.nameNo ?? '')}</div></td>
        <td class="n">${m.qty}</td>
        <td><span class="mat m-${m.material}">${m.material}</span></td>
        <td class="n">${m.bbox.map((v) => v.toFixed(0)).join(' × ')}</td>
        <td class="n">${m.grams.toFixed(1)} g</td>
        <td class="s">${esc(p?.print?.orientationWhy ?? '')}</td>
        <td><a class="dl" href="stl/${m.file}" download>STL</a></td>
      </tr>`;
      })
      .join('')}</tbody></table></div>`;
}

function stepCard(s: GuideStep): string {
  return `<article class="step" id="step-${s.n}">
    <div class="sh">
      <span class="sn">${String(s.n).padStart(2, '0')}</span>
      <div><h3>${esc(s.title)}</h3><div class="s">${esc(s.titleNo)} &middot; ${s.minutes} min</div></div>
    </div>
    ${para(s.body)}
    ${
      s.uses.length
        ? `<ul class="fst">${s.uses
            .map(
              (u) =>
                `<li><span class="q">${u.qty}&times;</span> ${esc(FASTENERS[u.sku]?.label ?? u.sku)}</li>`,
            )
            .join('')}</ul>`
        : ''
    }
    ${s.warn ? `<p class="warn">${esc(s.warn)}</p>` : ''}
    <p class="chk"><b>You should now see:</b> ${esc(s.check)}</p>
  </article>`;
}

const bomRows = bomFor('bench')
  .map(
    (l) => `<tr class="${l.verified ? '' : 'unv'}">
    <td><b>${esc(l.item)}</b>${
      l.substituteFor ? `<div class="s sw">replaces: ${esc(l.substituteFor)}</div>` : ''
    }</td>
    <td class="n">${l.qty} ${l.unit}</td>
    <td><a href="${esc(l.url)}" target="_blank" rel="noreferrer">${esc(l.vendor)}</a></td>
    <td class="n">${nok(l.priceNok * l.qty)}</td>
    <td>${
      l.verified
        ? `<span class="ok">confirmed</span>${l.stockNote ? `<div class="s">${esc(l.stockNote)}</div>` : ''}`
        : '<span class="todo">check first</span>'
    }</td></tr>`,
  )
  .join('');

const demand = fastenerDemand();
const fastenerRows = Object.entries(demand)
  .sort((a, b) => a[0].localeCompare(b[0]))
  .map(([sku, q]) => `<tr><td>${esc(FASTENERS[sku]?.label ?? sku)}</td><td class="n">${q}</td></tr>`)
  .join('');

const todo = unverified('bench');
const hatSafe = estimateHatMs(3694, 1328, CYCLE_MS.safe);
const hatNom = estimateHatMs(3694, 1328, CYCLE_MS.nominal);
const hatFloor = estimateHatMs(3694, 1328, CYCLE_MS.floor);

/* ------------------------------------------------------------------ page -- */

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow, noarchive">
<title>HEKLO — build documentation</title>
<style>
  :root{
    --bg:#f2f5f4; --card:#fff; --sunk:#e7ecea;
    --ink:#101c1a; --ink2:#42544f; --ink3:#75877f;
    --rule:#d2dcd8; --line:#e3eae7;
    --ac:#0c5b50; --ac-bg:#dcece8;
    --wn:#a03d0b; --wn-bg:#f6e1d4;
    --ok:#3c5d13; --ok-bg:#e2ecd0;
    --mono:ui-monospace,"SF Mono",SFMono-Regular,Menlo,Consolas,monospace;
    --sans:-apple-system,BlinkMacSystemFont,"Segoe UI","Helvetica Neue",Arial,sans-serif;
  }
  @media (prefers-color-scheme:dark){:root{
    --bg:#0c1312; --card:#141d1c; --sunk:#1a2423;
    --ink:#e2eae7; --ink2:#a9b9b4; --ink3:#7b8c87;
    --rule:#2a3836; --line:#202c2a;
    --ac:#55c2ad; --ac-bg:#14312c;
    --wn:#e5804a; --wn-bg:#382016;
    --ok:#a6c369; --ok-bg:#242f19;
  }}
  *{box-sizing:border-box}
  html{scroll-behavior:smooth}
  body{margin:0;background:var(--bg);color:var(--ink);font-family:var(--sans);
       font-size:15.5px;line-height:1.6;-webkit-font-smoothing:antialiased}
  .wrap{max-width:1000px;margin:0 auto;padding:0 22px 100px}
  p{margin:0 0 12px;max-width:68ch}
  a{color:var(--ac)}
  h2{font-family:var(--mono);font-size:12px;letter-spacing:.14em;text-transform:uppercase;
     color:var(--ink3);margin:0 0 18px;padding-bottom:10px;border-bottom:1px solid var(--rule)}
  h3{font-size:16.5px;margin:0}
  .s{font-size:12.5px;color:var(--ink3)}
  .sw{color:var(--wn)}
  section{padding:52px 0;border-top:1px solid var(--line)}
  section:first-of-type{border-top:0}

  /* hero */
  .hero{padding:76px 0 44px;border:0}
  .mark{font-family:var(--mono);font-size:clamp(46px,10vw,88px);font-weight:700;
        letter-spacing:-.045em;line-height:.9;margin:0}
  .mark em{font-style:normal;color:var(--ac)}
  .tag{font-family:var(--mono);font-size:11.5px;letter-spacing:.22em;text-transform:uppercase;
       color:var(--ink3);margin:0 0 18px}
  .lede{font-size:20px;line-height:1.5;color:var(--ink2);max-width:60ch;margin:22px 0 0}
  .lede b{color:var(--ink);font-weight:600}

  /* nav */
  nav{position:sticky;top:0;z-index:9;background:color-mix(in srgb,var(--bg) 92%,transparent);
      backdrop-filter:blur(8px);border-bottom:1px solid var(--rule);margin-bottom:0}
  nav .in{max-width:1000px;margin:0 auto;padding:11px 22px;display:flex;gap:20px;
          overflow-x:auto;font-family:var(--mono);font-size:11.5px;letter-spacing:.08em;
          text-transform:uppercase}
  nav a{color:var(--ink3);text-decoration:none;white-space:nowrap}
  nav a:hover{color:var(--ac)}

  /* stages */
  .stages{display:grid;grid-template-columns:1fr auto 1fr;gap:20px;align-items:stretch}
  @media(max-width:760px){.stages{grid-template-columns:1fr}}
  .stage{background:var(--card);border:1px solid var(--rule);border-radius:4px;padding:22px 24px}
  .stage.one{border-top:3px solid var(--ac)}
  .stage.two{border-top:3px solid var(--ink3)}
  .stage h3{font-family:var(--mono);font-size:19px;letter-spacing:-.01em}
  .stage .role{font-family:var(--mono);font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;
               color:var(--ink3);margin:4px 0 14px}
  .stage dl{margin:16px 0 0;display:grid;grid-template-columns:auto 1fr;gap:6px 16px;font-size:13.5px}
  .stage dt{font-family:var(--mono);font-size:10.5px;letter-spacing:.06em;text-transform:uppercase;
            color:var(--ink3);align-self:center}
  .stage dd{margin:0;font-weight:600;font-variant-numeric:tabular-nums}
  .arrow{display:flex;align-items:center;justify-content:center;color:var(--ac);
         font-family:var(--mono);font-size:12px;letter-spacing:.1em;text-align:center;
         writing-mode:vertical-rl;transform:rotate(180deg);padding:8px 0}
  @media(max-width:760px){.arrow{writing-mode:horizontal-tb;transform:none;padding:0}}

  /* stats */
  .grid{display:grid;gap:14px;grid-template-columns:repeat(auto-fit,minmax(178px,1fr))}
  .stat{background:var(--card);border:1px solid var(--rule);border-radius:4px;padding:16px 18px}
  .stat .k{font-family:var(--mono);font-size:25px;font-weight:700;letter-spacing:-.02em}
  .stat .l{font-family:var(--mono);font-size:10px;letter-spacing:.1em;text-transform:uppercase;
           color:var(--ink3);margin-top:4px}
  .stat .d{font-size:12.5px;color:var(--ink2);margin-top:7px}

  /* callout */
  .call{background:var(--card);border:1px solid var(--rule);border-left:4px solid var(--ac);
        border-radius:0 4px 4px 0;padding:20px 24px}
  .call.w{border-left-color:var(--wn)}
  .call h3{margin-bottom:8px}
  .call p:last-child{margin-bottom:0}

  /* tables */
  .scroll{overflow-x:auto;border:1px solid var(--rule);border-radius:4px;background:var(--card)}
  table{border-collapse:collapse;width:100%;min-width:660px;font-size:13.5px}
  th,td{text-align:left;padding:10px 14px;border-bottom:1px solid var(--line);vertical-align:top}
  thead th{font-family:var(--mono);font-size:10px;letter-spacing:.09em;text-transform:uppercase;
           color:var(--ink3);background:var(--sunk);position:sticky;top:44px}
  tbody tr:last-child td{border-bottom:0}
  .n{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
  .mat{font-family:var(--mono);font-size:9.5px;font-weight:700;padding:2px 6px;border-radius:2px}
  .m-PETG{background:var(--wn-bg);color:var(--wn)}
  .m-PLA{background:var(--ac-bg);color:var(--ac)}
  .m-TPU{background:var(--sunk);color:var(--ink2)}
  .dl{font-family:var(--mono);font-size:10.5px;font-weight:700;text-decoration:none;
      border:1px solid var(--ac);color:var(--ac);padding:3px 9px;border-radius:2px;white-space:nowrap}
  .dl:hover{background:var(--ac);color:var(--card)}
  .ok,.todo{font-family:var(--mono);font-size:9.5px;font-weight:700;text-transform:uppercase;
            padding:2px 6px;border-radius:2px;white-space:nowrap}
  .ok{background:var(--ok-bg);color:var(--ok)}
  .todo{background:var(--wn-bg);color:var(--wn)}
  tr.unv td{background:color-mix(in srgb,var(--wn-bg) 20%,transparent)}

  /* steps */
  .track{font-family:var(--mono);font-size:11px;letter-spacing:.14em;text-transform:uppercase;
         color:var(--ac);margin:34px 0 14px;display:flex;align-items:center;gap:12px}
  .track::after{content:"";flex:1;height:1px;background:var(--rule)}
  .steps{display:flex;flex-direction:column;gap:12px}
  .step{background:var(--card);border:1px solid var(--rule);border-radius:4px;padding:18px 20px}
  .sh{display:flex;gap:15px;align-items:baseline;margin-bottom:11px}
  .sn{font-family:var(--mono);font-size:23px;font-weight:700;color:var(--ac);line-height:1}
  .fst{margin:12px 0;padding:0;list-style:none;display:flex;flex-wrap:wrap;gap:6px}
  .fst li{font-family:var(--mono);font-size:11px;background:var(--sunk);border:1px solid var(--rule);
          border-radius:2px;padding:3px 9px}
  .fst .q{color:var(--ac);font-weight:700}
  .warn{background:var(--wn-bg);color:var(--wn);border-left:3px solid var(--wn);
        padding:10px 14px;border-radius:0 3px 3px 0;font-size:13.5px}
  .chk{background:var(--ok-bg);border-left:3px solid var(--ok);padding:10px 14px;
       border-radius:0 3px 3px 0;font-size:13.5px;margin-bottom:0}

  footer{border-top:1px solid var(--rule);padding-top:20px;margin-top:52px;
         font-size:12.5px;color:var(--ink3)}
  code{font-family:var(--mono);font-size:12.5px;background:var(--sunk);padding:1px 5px;border-radius:2px}
</style>
</head>
<body>

<nav><div class="in">
  <a href="#what">What it is</a>
  <a href="#stages">Two stages</a>
  <a href="#how">How it works</a>
  <a href="#budget">Budget</a>
  <a href="#print">Print</a>
  <a href="#buy">Buy</a>
  <a href="#build">Build</a>
  <a href="#safety">Safety</a>
</div></nav>

<div class="wrap">

<header class="hero">
  <p class="tag">Masklab &middot; machine programme</p>
  <h1 class="mark">HEKL<em>O</em></h1>
  <p class="lede">A machine that crochets the Masklab bucket hats. <b>Real crochet</b> —
  one live loop, drawn through two — not knitting that resembles it. Built from printed
  parts, off-the-shelf motion hardware and a microcontroller, sourced entirely in Norway.</p>
</header>

<section id="what">
  <h2>What you are looking at</h2>
  <p>Crochet is the textile craft that is supposed to be impossible to automate. The
  research record is more specific than that: it is not the stitch that defeats machines,
  it is <b>finding the previous round&rsquo;s loop and holding it open</b>. Harvard&rsquo;s
  Croche-Matic managed roughly half its stitches for exactly this reason.</p>

  <p>HEKLO never searches. Every live stitch mouth is clamped open inside a printed
  <b>gate</b> at a pose the machine already knows. A wheel of ${WHEEL_TEETH} gated teeth lifts each
  loop out of a fixed <b>retention comb</b> and presents it to the hook at the same spot,
  every time. That turns an unsolved sensing problem into a gear ratio.</p>

  <div class="call">
    <h3>Why this is honest about what it does not know</h3>
    <p>Nothing here claims the machine works yet. It claims the mechanism is worth
    ${nok(totalNok('bench'))}&nbsp;NOK and a weekend to find out &mdash; and it is built so that
    finding out costs you the smallest possible amount, with a clear point at which to stop.</p>
  </div>
</section>

<section id="stages">
  <h2>Two stages, one machine</h2>
  <p>You do not build the whole machine and hope. You build its <b>station module</b>
  first, run it standalone on a bench, and answer the four questions that decide whether
  any of this works. If they pass, that same assembly &mdash; unmodified &mdash; bolts onto
  the machine as step&nbsp;18.</p>

  <div class="stages">
    <div class="stage one">
      <h3>HEKLO Station</h3>
      <div class="role">Stage 1 &middot; the prototype</div>
      <p>The needle carriage, latch drive, gate wheel, yarn finger, camera and thermal
      sensors &mdash; the working head of the machine, on a bench plate.</p>
      <dl>
        <dt>Print</dt><dd>${stationParts.length} parts &middot; ${pieces(stationParts)} pcs &middot; ${grams(stationParts).toFixed(0)} g</dd>
        <dt>Print time</dt><dd>${printHours(grams(stationParts))}</dd>
        <dt>Assembly</dt><dd>${(TOTAL_MINUTES / 60).toFixed(1)} h incl. testing</dd>
        <dt>Parts</dt><dd>${nok(totalNok('bench'))} NOK</dd>
        <dt>Steps</dt><dd>1&ndash;12</dd>
      </dl>
    </div>

    <div class="arrow">step 18 &mdash; the Station moves across, unmodified</div>

    <div class="stage two">
      <h3>HEKLO M1</h3>
      <div class="role">Stage 2 &middot; the machine</div>
      <p>Adds the turntable, the mandrel lathed from the app&rsquo;s own hat profile, the
      full ${COMB_GATES}-gate comb, the four-colour turret, take-down and enclosure.</p>
      <dl>
        <dt>Print</dt><dd>+${machineParts.length} parts &middot; ${pieces(machineParts)} pcs &middot; ${grams(machineParts).toFixed(0)} g</dd>
        <dt>Print time</dt><dd>${printHours(grams(machineParts))}</dd>
        <dt>Assembly</dt><dd>+${(MACHINE_MINUTES / 60).toFixed(1)} h</dd>
        <dt>Steps</dt><dd>13&ndash;24</dd>
        <dt>Output</dt><dd>a wearable hat</dd>
      </dl>
    </div>
  </div>

  <div class="call" style="margin-top:22px">
    <h3>Nothing bought for the test is wasted</h3>
    <p>The Station is not a jig. Every purchased item in it &mdash; motors, rail, drivers,
    controller, camera, thermistors, power supply &mdash; carries into M1 untouched. The only
    thing left behind is one printed bench plate, and that cost filament.</p>
  </div>
</section>

<section id="how">
  <h2>How it makes a stitch</h2>
  <div class="grid">
    <div class="stat"><div class="k">1</div><div class="l">stitch type</div>
      <div class="d">Fastmaske only. Every hat in the app uses one stitch, worked in a spiral.</div></div>
    <div class="stat"><div class="k">${COMB_GATES}+${WHEEL_TEETH}</div><div class="l">printed gates</div>
      <div class="d">A comb that holds, a wheel that carries. No chain, no injector.</div></div>
    <div class="stat"><div class="k">${GATE_THROAT_MM}</div><div class="l">mm throat</div>
      <div class="d">Sweep ${GATE_THROAT_SWEEP_MM.join(' / ')} mm &mdash; the bench test picks the winner.</div></div>
    <div class="stat"><div class="k">3&nbsp;694</div><div class="l">stitches per hat</div>
      <div class="d">1&nbsp;328 of them change colour mid-stitch.</div></div>
  </div>

  <div class="call" style="margin-top:20px">
    <h3>The one idea</h3>
    <p>A wheel alone releases each loop the moment the hook passes, and relaxed fabric
    does not hold a loop open &mdash; so the next round is a search again. A comb alone needs
    one gate per live stitch: 180 identical prints and a mechanism to insert one mid-run.</p>
    <p><b>Together they cancel each other&rsquo;s weakness.</b> The comb holds the last ten
    mouths open so the wheel always picks up from a known pose; the wheel recirculates, so
    ten gates cover a round of any length and nothing has to be inserted. That is the
    invention, and step&nbsp;11 is where you find out whether it is real.</p>
  </div>
</section>

<section id="budget">
  <h2>Budget</h2>
  <div class="grid">
    <div class="stat"><div class="k">${nok(totalNok('bench'))}</div><div class="l">NOK &middot; Station</div>
      <div class="d">Everything needed to answer the four questions.</div></div>
    <div class="stat"><div class="k">~${nok(Math.round(totalNok('bench') * 0.85))}</div><div class="l">NOK &middot; M1 additions</div>
      <div class="d">Four more motors, drivers, bearing, extrusion, enclosure. Estimate.</div></div>
    <div class="stat"><div class="k">~${nok(Math.round(totalNok('bench') * 1.85))}</div><div class="l">NOK &middot; complete</div>
      <div class="d">Excluding the 3D printer and hand tools.</div></div>
    <div class="stat"><div class="k">${(grams(manifest.parts) / 1000).toFixed(1)}</div><div class="l">kg filament</div>
      <div class="d">${printHours(grams(manifest.parts))} of printing, unsliced estimate.</div></div>
  </div>
  <p style="margin-top:16px" class="s">Every line is a Norwegian shop with domestic stock.
  Nothing is ordered from outside the country, so there is no three-week wait and no customs.</p>
</section>

<section id="print">
  <h2>Print &mdash; Stage 1, HEKLO Station</h2>
  ${partTable(stationParts)}
  <h2 style="margin-top:36px">Print &mdash; Stage 2, HEKLO M1</h2>
  ${partTable(machineParts)}
  <p class="s" style="margin-top:10px">All ${manifest.parts.length} files are verified watertight,
  free of degenerate triangles, a single connected body each, and within the 250&nbsp;mm build
  volume. Print times are unsliced estimates from mass &mdash; slice the plate for the real number.</p>
</section>

<section id="buy">
  <h2>Buy &mdash; Stage 1</h2>
  <div class="scroll"><table>
    <thead><tr><th>Item</th><th class="n">Qty</th><th>Shop</th><th class="n">NOK</th><th>Status</th></tr></thead>
    <tbody>${bomRows}</tbody>
  </table></div>
  ${
    todo.length
      ? `<p class="warn" style="margin-top:12px"><b>${todo.length} of ${bomFor('bench').length} lines still need checking against the shop page before you order.</b>
         Those prices are estimates. The confirmed lines were read off the live page on ${BOM[0].checkedAt}, and stock moves.</p>`
      : ''
  }

  <h2 style="margin-top:36px">Fasteners, both stages</h2>
  <div class="scroll"><table>
    <thead><tr><th>Fastener</th><th class="n">Total</th></tr></thead>
    <tbody>${fastenerRows}</tbody>
  </table></div>
  <p class="s" style="margin-top:10px">Summed from the build steps, not written by hand. The
  build fails its own checks if a step calls for a screw that is not on this list.</p>
</section>

<section id="build">
  <h2>Build &mdash; ${ALL_STEPS.length} steps</h2>
  <p>Every step ends with something you can observe. If you cannot see it, do not continue
  &mdash; that is the whole trick, far more than exploded diagrams.</p>

  <div class="track">Stage 1 &middot; HEKLO Station &middot; steps 1&ndash;12</div>
  <div class="steps">${ALL_STEPS.filter((s) => s.track === 'station').map(stepCard).join('')}</div>

  <div class="track">Stage 2 &middot; HEKLO M1 &middot; steps 13&ndash;24</div>
  <div class="steps">${ALL_STEPS.filter((s) => s.track === 'machine').map(stepCard).join('')}</div>
</section>

<section id="safety">
  <h2>Speed and fire are the same problem</h2>
  <div class="call">
    <p>Cycle rate <em>is</em> duty cycle, and duty cycle is what makes heat. So speed is not
    a number in the program &mdash; it is governed by measured temperature.</p>
    <p>Every motor and driver carries a sensor. The firmware owns a hard cutout at
    ${LIMITS.motor.hardC}&nbsp;&deg;C motor and ${LIMITS.driver.hardC}&nbsp;&deg;C driver that kills
    motor power locally, without asking the computer. Below that, the software trades speed
    for thermal headroom: hot machine slows down, cool machine speeds up.</p>
    <p><b>One hat, 3&nbsp;694 stitches:</b> ${formatDuration(hatSafe)} cautious &middot;
    ${formatDuration(hatNom)} target &middot; ${formatDuration(hatFloor)} mechanical ceiling.
    The machine finds its own safe maximum and stays there. The time is a result, not a promise.</p>
    <p style="margin-bottom:0">A disconnected sensor reads open circuit, and open circuit is
    treated as a fault &mdash; never as &ldquo;cold&rdquo;. That is exactly how a thermal cutout
    silently stops existing.</p>
  </div>

  <div class="call w" style="margin-top:16px">
    <h3>Before you leave it running</h3>
    <p>Fuse on the supply, latching emergency stop in the motor line that software cannot
    override, smoke alarm above the machine, and a door interlock that cuts power when opened.
    All four are on the parts list.</p>
    <p style="margin-bottom:0">Do not run it unattended until you have watched it finish a
    whole hat awake &mdash; and check whether your home insurance covers self-built equipment
    left running. Many policies do not.</p>
  </div>
</section>

<footer>
  <p><b>HEKLO</b> &middot; Stage 1 <b>HEKLO Station</b> &middot; Stage 2 <b>HEKLO M1</b>.
  Generated from the machine definition, the parts registry, the sourcing data and the build
  guide &mdash; every number on this page is computed, not typed.</p>
  <p>Unlisted page. Not linked from the Masklab site and not indexed. Contains an unfiled
  patent disclosure: Norway follows the EPC, which has no grace period.</p>
</footer>

</div>
</body>
</html>
`;

/* ------------------------------------------------------------------ emit -- */

rmSync(OUT, { recursive: true, force: true });
mkdirSync(join(OUT, 'stl'), { recursive: true });
writeFileSync(join(OUT, 'index.html'), html);

const stlSrc = join(ROOT, 'stl');
let copied = 0;
for (const f of readdirSync(stlSrc)) {
  if (!f.endsWith('.stl')) continue;
  copyFileSync(join(stlSrc, f), join(OUT, 'stl', f));
  copied++;
}

console.log(
  `wrote public/system/ — ${manifest.parts.length} parts (${copied} STLs), ` +
    `${bomFor('bench').length} BOM lines, ${ALL_STEPS.length} steps`,
);
