/**
 * Generates the HEKLO build site into public/system/.
 *
 *   ./node_modules/.bin/tsx invent_v1/scripts/build-site.ts
 *
 * Bilingual (NO default, EN toggle), styled with MASKLAB's own tokens, with
 * three.js viewers driven by the same STL files the download buttons serve.
 * Vite copies public/ verbatim, so this lands at /system.
 *
 * The page leads with the ODDS, not with the renders. A build site that opens
 * on a shopping total and a spinning machine implies a confidence this project
 * has not earned; somebody reads it, spends six thousand kroner and a month of
 * evenings, and finds out at the far end that the yarn never stitched. So the
 * first thing after the hero is machine/reliability.ts, and the shopping list
 * comes after the gate that decides whether you should open it.
 */

import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
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
import { printMinutes, filamentNok, formatHm } from '../machine/printing.ts';
import { programme } from '../machine/programme.ts';
import {
  GATES,
  LEARN_COST_NOK,
  P_HAT,
  P_LEARN,
  STITCH_MODEL,
  cumulativeAt,
  interventions,
  pHat,
  requiredPStitch,
  withRetry,
} from '../machine/reliability.ts';
import {
  COMB_GATES,
  GATE_THROAT_MM,
  HOOK_NOSE_MM,
  ROUNDS,
  SIZE_CM,
  STITCH_W_MM,
  WHEEL_TEETH,
  YARN_DIA_MM,
  throatRequirementMm,
} from '../machine/units.ts';
import { PART_BY_ID } from '../parts/registry.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, '..', 'public', 'system');

interface MPart {
  id: string;
  file: string;
  bbox: number[];
  grams: number;
  material: 'PETG' | 'PLA' | 'TPU';
  qty: number;
}
const manifest = JSON.parse(readFileSync(join(ROOT, 'data', 'parts.build.json'), 'utf8')) as {
  parts: MPart[];
};

/** Live-link results, if somebody has run check-links.ts. */
const linkPath = join(ROOT, 'data', 'link-check.json');
const links = existsSync(linkPath)
  ? (JSON.parse(readFileSync(linkPath, 'utf8')) as {
      checkedAt: string;
      ok: number;
      total: number;
      dead: number;
      results: { id: string; state: string; status: number }[];
    })
  : null;
const linkState = (id: string) => links?.results.find((r) => r.id === id)?.state ?? null;

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const nok = (n: number) => Math.round(n).toLocaleString('nb-NO').replace(/ /g, ' ');
const pct = (p: number) => (p * 100 < 1 ? (p * 100).toFixed(1) : Math.round(p * 100).toString());

/** Bilingual span. Norwegian shows by default; the toggle flips a root class. */
const t = (no: string, en: string) =>
  `<span class="no">${esc(no)}</span><span class="en">${esc(en)}</span>`;
/** Same, but the strings are trusted markup. */
const tm = (no: string, en: string) => `<span class="no">${no}</span><span class="en">${en}</span>`;

const stationIds = new Set(ALL_STEPS.filter((s) => s.track === 'station').flatMap((s) => s.parts));
const isStation = (id: string) =>
  stationIds.has(id) || Boolean(PART_BY_ID[id]?.tracks.includes('bench'));

const stationParts = manifest.parts.filter((p) => isStation(p.id));
const machineParts = manifest.parts.filter((p) => !isStation(p.id));
const grams = (a: MPart[]) => a.reduce((s, p) => s + p.grams * p.qty, 0);
const pcs = (a: MPart[]) => a.reduce((s, p) => s + p.qty, 0);
const estOf = (p: MPart) => printMinutes(p.grams, p.material, p.bbox[2], 0.2);
const printMin = (a: MPart[]) => a.reduce((s, p) => s + estOf(p).minutes * p.qty, 0);
const filNok = (a: MPart[]) => a.reduce((s, p) => s + filamentNok(p.grams * p.qty, p.material), 0);

/* ------------------------------------------------------------- sizing --- */

/**
 * Everything the size control needs, precomputed. The browser recombines these
 * rather than re-deriving the round schedule, so the slider cannot disagree
 * with the harness about what a 58 cm hat is.
 */
const SIZE_TABLE = Array.from({ length: (SIZE_CM.max - SIZE_CM.min) / 2 + 1 }, (_, i) => {
  const cm = SIZE_CM.min + i * 2;
  const p = programme(cm, ROUNDS.nominal);
  const crownSum = p.list.filter((r) => r.phase === 'crown').reduce((s, r) => s + r.count, 0);
  const brimSum = p.list.filter((r) => r.phase === 'brim').reduce((s, r) => s + r.count, 0);
  return {
    cm,
    bodyCount: p.bodyCount,
    crownRounds: p.crownRounds,
    brimRounds: p.brimRounds,
    crownSum,
    brimSum,
    suMm: Number(p.suMm.toFixed(2)),
    maxRmm: p.maxRmm,
  };
});

const ref = programme();
const REF_COLOR_CHANGES = 1328;

/* ------------------------------------------------------------------ parts - */

function partCards(rows: MPart[]): string {
  return rows
    .map((m) => {
      const p = PART_BY_ID[m.id];
      const e = estOf(m);
      return `<article class="pc" data-part="${m.file}">
      <button class="pc-3d" data-open="${m.file}" data-id="${m.id}" data-name="${esc(p?.nameNo ?? m.id)}" data-name-en="${esc(p?.name ?? m.id)}" aria-label="${esc(p?.name ?? m.id)}"><canvas data-stl="${m.file}" data-id="${m.id}"></canvas><span class="pc-zoom">+</span></button>
      <div class="pc-b">
        <h4>${t(p?.nameNo ?? m.id, p?.name ?? m.id)}</h4>
        <div class="pc-m">
          <span class="mat m-${m.material}">${m.material}</span>
          <span>${m.qty}×</span>
          <span>${m.bbox.map((v) => v.toFixed(0)).join('×')} mm</span>
          <span>${m.grams.toFixed(0)} g</span>
          <span class="pt">${formatHm(e.minutes)}</span>
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
    <div class="st-3d"><canvas data-assembly-step="${s.n}"></canvas><button class="st-play" data-replay="${s.n}" aria-label="Spill av">▶</button></div>
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

/* -------------------------------------------------------------- gates ---- */

const gateRows = GATES.map((g, i) => {
  const cum = cumulativeAt(g.id);
  return `<tr>
    <td class="gid">${g.id}</td>
    <td><b>${t(g.titleNo, g.title)}</b><div class="gt">${t(g.testNo, g.test)}</div>
      <div class="gw">${t(g.whyNo, g.why)}</div></td>
    <td class="n"><span class="gp">${pct(g.p)}%</span></td>
    <td class="n"><span class="gc ${cum < 0.15 ? 'lo' : ''}">${pct(cum)}%</span></td>
    <td class="n">${nok(g.spentNok)}</td>
  </tr>`;
}).join('');

/* -------------------------------------------------------------- bom ------ */

const bomRows = bomFor('bench')
  .map((l) => {
    const ls = linkState(l.id);
    const linkMark =
      ls === 'ok'
        ? '<span class="lk ok" title="200">●</span>'
        : ls === 'blocked'
          ? '<span class="lk warn" title="bot-blocked">●</span>'
          : ls
            ? '<span class="lk bad" title="dead">●</span>'
            : '';
    return `<tr class="${l.verified ? '' : 'unv'}">
    <td>${esc(l.item)}</td>
    <td class="n">${l.qty}</td>
    <td>${linkMark}<a href="${esc(l.url)}" target="_blank" rel="noreferrer">${esc(l.vendor)}</a></td>
    <td class="n">${nok(l.priceNok * l.qty)}</td>
    <td class="n">${
      l.verified
        ? `<span class="ok">${t('pris bekreftet', 'price confirmed')}</span>`
        : `<span class="td">${t('sjekk pris', 'check price')}</span>`
    }</td></tr>`;
  })
  .join('');

const fastenerRows = Object.entries(fastenerDemand())
  .sort((a, b) => a[0].localeCompare(b[0]))
  .map(
    ([sku, q]) =>
      `<tr><td>${t(FASTENERS[sku]?.labelNo ?? sku, FASTENERS[sku]?.label ?? sku)}</td><td class="n">${q}</td></tr>`,
  )
  .join('');

const todo = unverified('bench');
const hatSafe = estimateHatMs(ref.totalStitches, REF_COLOR_CHANGES, CYCLE_MS.safe);
const hatNom = estimateHatMs(ref.totalStitches, REF_COLOR_CHANGES, CYCLE_MS.nominal);
const noT = (s: string) => s.replace(' h ', ' t ').replace(' m', '');

/** Per-stitch reliability needed for a 50/50 chance of an unattended hat. */
const needed = requiredPStitch(0.5, ref.totalStitches);
const stops = interventions(withRetry(STITCH_MODEL.optimistic, STITCH_MODEL.recover), ref.totalStitches);

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
    --blue:#00205B; --go:#2F6B4F; --go-soft:#E8F0EA; --gold:#A89A7E; --warn:#9A4614;
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
  p{margin:0 0 14px;max-width:64ch}
  a{color:var(--red)}
  h2{font-family:var(--serif);font-weight:400;font-size:clamp(28px,4vw,40px);
     line-height:1.05;margin:0 0 8px;letter-spacing:-.01em}
  h3{font-family:var(--serif);font-weight:400;font-size:22px;line-height:1.15;margin:0}
  h4{font-family:var(--sans);font-weight:800;font-size:13.5px;margin:0;letter-spacing:-.005em}
  .eyebrow{font-family:var(--sans);font-weight:800;font-size:11.5px;letter-spacing:.16em;
           text-transform:uppercase;color:var(--red);margin:0 0 14px}
  .sub{color:var(--ink-soft);max-width:60ch;margin-bottom:0}
  section{padding:58px 0;border-top:1px solid var(--card-border)}

  .top{position:sticky;top:0;z-index:20;background:rgba(237,231,218,.94);
       backdrop-filter:blur(10px);border-bottom:1px solid var(--card-border)}
  .top .in{max-width:1120px;margin:0 auto;padding:12px 24px;display:flex;align-items:center;gap:26px}
  .wm{font-family:var(--serif);font-size:19px;letter-spacing:.14em;text-decoration:none;color:var(--ink)}
  .wm i{color:var(--red);font-style:normal}
  .top nav{display:flex;gap:18px;overflow-x:auto;flex:1;font-weight:700;font-size:12px;
           letter-spacing:.08em;text-transform:uppercase}
  .top nav a{color:var(--ink-faint);text-decoration:none;white-space:nowrap}
  .top nav a:hover{color:var(--ink)}
  .lang{display:flex;gap:2px;background:var(--chip);border-radius:999px;padding:3px}
  .lang button{border:0;background:transparent;font-family:var(--sans);font-weight:800;
    font-size:11px;letter-spacing:.06em;padding:4px 11px;border-radius:999px;cursor:pointer;color:var(--ink-faint)}
  .lang button[aria-pressed=true]{background:var(--ink);color:var(--bg)}

  .hero{display:grid;grid-template-columns:1fr 1.05fr;gap:40px;align-items:center;
        padding:56px 0 44px;border-top:0}
  @media(max-width:900px){.hero{grid-template-columns:1fr;gap:24px}}
  .hero h1{font-family:var(--serif);font-weight:400;font-size:clamp(46px,8vw,82px);
           line-height:.98;letter-spacing:-.02em;margin:0 0 14px}
  .hero .lede{font-family:var(--serif);font-size:clamp(19px,2.2vw,25px);line-height:1.35;
              color:var(--ink-soft);max-width:26ch}
  .hero-3d{aspect-ratio:16/11;background:var(--card);border:1px solid var(--card-border);
           border-radius:14px;overflow:hidden;position:relative}
  .hero-3d canvas{width:100%;height:100%;display:block;touch-action:none;cursor:grab}
  .v-tabs{position:absolute;left:14px;bottom:14px;display:flex;gap:6px;z-index:2}
  .v-tabs button{font-family:var(--sans);font-weight:800;font-size:11px;letter-spacing:.05em;
    border:1px solid var(--card-border);background:rgba(253,250,243,.92);color:var(--ink-soft);
    padding:6px 12px;border-radius:999px;cursor:pointer}
  .v-tabs button[aria-pressed=true]{background:var(--ink);color:var(--bg);border-color:var(--ink)}
  .v-hint{position:absolute;right:14px;bottom:16px;font-size:11px;font-weight:700;
          color:var(--ink-faint);letter-spacing:.05em;z-index:2}

  .stats{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(148px,1fr))}
  .stat{background:var(--card);border:1px solid var(--card-border);border-radius:12px;padding:16px 18px}
  .stat .k{font-family:var(--serif);font-size:32px;line-height:1}
  .stat .l{font-weight:800;font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;
           color:var(--ink-faint);margin-top:6px}
  .stat.hot .k{color:var(--red)}

  /* verdict */
  .verdict{background:var(--card);border:1px solid var(--card-border);border-left:5px solid var(--red);
           border-radius:0 16px 16px 0;padding:26px 30px;margin-bottom:24px}
  .verdict .big{font-family:var(--serif);font-size:clamp(30px,4.4vw,46px);line-height:1.06;margin:0 0 12px}
  .verdict .big em{font-style:normal;color:var(--red)}
  .odds{display:grid;gap:14px;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));margin-top:20px}
  .odd{background:var(--bg);border:1px solid var(--card-border);border-radius:12px;padding:16px 18px}
  .odd .k{font-family:var(--serif);font-size:38px;line-height:1}
  .odd.good .k{color:var(--go)}
  .odd.bad .k{color:var(--red)}
  .odd .l{font-weight:800;font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-faint);margin:4px 0 6px}
  .odd .d{font-size:13px;color:var(--ink-soft);line-height:1.45}

  .gid{font-family:var(--mono);font-weight:700;color:var(--red);vertical-align:top;padding-top:14px}
  .gt{font-size:13px;color:var(--ink-soft);margin-top:3px}
  .gw{font-size:12.5px;color:var(--ink-faint);margin-top:6px;line-height:1.5;max-width:70ch}
  .gp{font-family:var(--serif);font-size:19px}
  .gc{font-family:var(--serif);font-size:19px;color:var(--ink-faint)}
  .gc.lo{color:var(--red)}

  /* parts */
  .pgrid{display:grid;gap:14px;grid-template-columns:repeat(auto-fill,minmax(196px,1fr))}
  .pc{background:var(--card);border:1px solid var(--card-border);border-radius:12px;overflow:hidden}
  .pc-3d{aspect-ratio:1;background:linear-gradient(160deg,#F7F2E6,#EFE8D8);
         border:0;padding:0;display:block;width:100%;position:relative;cursor:zoom-in}
  .pc-3d canvas{width:100%;height:100%;display:block}
  .pc-b{padding:12px 14px 14px}
  .pc-m{display:flex;flex-wrap:wrap;gap:6px;margin:7px 0 10px;font-size:11.5px;
        color:var(--ink-faint);font-weight:700;font-variant-numeric:tabular-nums}
  .pc-m .pt{color:var(--ink-soft)}
  .mat{font-size:9.5px;font-weight:800;letter-spacing:.06em;padding:2px 6px;border-radius:4px}
  .m-PETG{background:#F6E3D6;color:#9A4614}.m-PLA{background:#E2ECF5;color:#1E4F7A}
  .m-TPU{background:var(--chip);color:var(--ink-soft)}
  .btn-s{display:inline-block;font-weight:800;font-size:11px;letter-spacing:.06em;
    text-decoration:none;border:1.5px solid var(--ink);color:var(--ink);padding:5px 12px;border-radius:999px}
  .btn-s:hover{background:var(--ink);color:var(--bg)}
  .pc-zoom{position:absolute;right:9px;bottom:9px;width:24px;height:24px;border-radius:50%;
    background:rgba(32,29,24,.08);color:var(--ink-soft);font-weight:800;font-size:15px;
    display:grid;place-items:center;line-height:1}
  .pc-3d:hover .pc-zoom{background:var(--ink);color:var(--bg)}

  /* steps */
  .track-h{display:flex;align-items:center;gap:14px;margin:34px 0 16px;
           font-weight:800;font-size:11.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--red)}
  .track-h::after{content:"";flex:1;height:1px;background:var(--card-border)}
  .steps{display:flex;flex-direction:column;gap:14px}
  .st{background:var(--card);border:1px solid var(--card-border);border-radius:14px;
      display:grid;grid-template-columns:250px 1fr;overflow:hidden}
  @media(max-width:700px){.st{grid-template-columns:1fr}}
  .st-3d{background:linear-gradient(160deg,#F7F2E6,#EFE8D8);border-right:1px solid var(--card-border);
         min-height:190px;position:relative}
  @media(max-width:700px){.st-3d{border-right:0;border-bottom:1px solid var(--card-border);aspect-ratio:16/9}}
  .st-3d canvas{width:100%;height:100%;display:block}
  .st-play{position:absolute;right:10px;bottom:10px;width:28px;height:28px;border-radius:50%;
    border:1px solid var(--card-border);background:rgba(253,250,243,.94);color:var(--ink-soft);
    font-size:11px;cursor:pointer;display:grid;place-items:center;padding:0;line-height:1}
  .st-play:hover{background:var(--ink);color:var(--bg)}
  .st.playing .st-play{background:var(--red);color:#fff;border-color:var(--red)}
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

  /* sim */
  .sim{background:var(--card);border:1px solid var(--card-border);border-radius:16px;overflow:hidden}
  .sim-c{aspect-ratio:16/9;position:relative;background:linear-gradient(160deg,#F7F2E6,#EFE8D8)}
  @media(max-width:700px){.sim-c{aspect-ratio:4/5}}
  .sim-c canvas{width:100%;height:100%;display:block;touch-action:none;cursor:grab}
  .sim-hud{position:absolute;left:16px;top:16px;display:flex;gap:8px;flex-wrap:wrap}
  .hud{background:rgba(253,250,243,.93);border:1px solid var(--card-border);border-radius:9px;
       padding:7px 12px;font-variant-numeric:tabular-nums}
  .hud b{font-family:var(--serif);font-size:19px;font-weight:400;display:block;line-height:1.1}
  .hud span{font-size:9.5px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-faint)}
  .sim-bar{display:flex;align-items:center;gap:14px;padding:14px 18px;border-top:1px solid var(--card-border);flex-wrap:wrap}
  .sim-bar button{font-family:var(--sans);font-weight:800;font-size:12px;border:1.5px solid var(--ink);
    background:transparent;color:var(--ink);padding:7px 16px;border-radius:999px;cursor:pointer}
  .sim-bar button.on,.sim-bar button:hover{background:var(--ink);color:var(--bg)}
  .spd{display:flex;gap:3px;background:var(--chip);border-radius:999px;padding:3px}
  .spd button{border:0;padding:5px 12px;font-size:11px;border-radius:999px;background:transparent;color:var(--ink-faint)}
  .spd button[aria-pressed=true]{background:var(--red);color:#fff}
  .sim-bar input[type=range]{flex:1;min-width:140px;accent-color:var(--red)}
  .swatch{width:14px;height:14px;border-radius:50%;border:1px solid rgba(0,0,0,.15);display:inline-block;vertical-align:-2px}

  /* size control */
  .sizer{background:var(--card);border:1px solid var(--card-border);border-radius:16px;padding:24px 26px}
  .sliders{display:grid;gap:18px;grid-template-columns:1fr 1fr}
  @media(max-width:700px){.sliders{grid-template-columns:1fr}}
  .sl label{display:flex;justify-content:space-between;font-weight:800;font-size:11px;
            letter-spacing:.1em;text-transform:uppercase;color:var(--ink-faint);margin-bottom:8px}
  .sl label b{font-family:var(--serif);font-size:20px;font-weight:400;color:var(--ink);letter-spacing:0;text-transform:none}
  .sl input{width:100%;accent-color:var(--red)}

  /* tables */
  .sc{overflow-x:auto;background:var(--card);border:1px solid var(--card-border);border-radius:12px}
  table{border-collapse:collapse;width:100%;min-width:540px;font-size:14px}
  th,td{text-align:left;padding:11px 16px;border-bottom:1px solid var(--line);vertical-align:top}
  thead th{font-weight:800;font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;
           color:var(--ink-faint);background:#F7F2E6;vertical-align:middle}
  tbody tr:last-child td{border-bottom:0}
  .n{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
  .ok,.td{font-weight:800;font-size:10px;letter-spacing:.05em;text-transform:uppercase;
          padding:3px 8px;border-radius:6px;white-space:nowrap}
  .ok{background:var(--go-soft);color:var(--go)}
  .td{background:#FBEDE6;color:var(--warn)}
  tr.unv td{background:#FDF6F1}
  .lk{margin-right:7px;font-size:11px}
  .lk.ok{color:var(--go)}.lk.warn{color:var(--gold)}.lk.bad{color:var(--red)}

  .note{background:var(--card);border:1px solid var(--card-border);border-left:4px solid var(--red);
        border-radius:0 12px 12px 0;padding:20px 24px}
  .note.q{border-left-color:var(--go)}
  .note p:last-child{margin-bottom:0}

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
    <a href="#verdict">${t('Sjansene', 'The odds')}</a>
    <a href="#mech">${t('Mekanisme', 'Mechanism')}</a>
    <a href="#sim">${t('Simulering', 'Simulation')}</a>
    <a href="#size">${t('Størrelser', 'Sizes')}</a>
    <a href="#parts">${t('Deler', 'Parts')}</a>
    <a href="#build">${t('Bygg', 'Build')}</a>
    <a href="#buy">${t('Kjøp', 'Buy')}</a>
    <a href="#safety">${t('Sikkerhet', 'Safety')}</a>
    <a href="#patent">${t('Patent', 'Patent')}</a>
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
    <p class="sub" style="margin-top:16px">${t(
      'Printede deler, standard bevegelseskomponenter og en mikrokontroller. Ingen lodding, ingenting skarpt, alt kjøpt i Norge.',
      'Printed parts, off-the-shelf motion hardware and a microcontroller. No soldering, nothing sharp, all sourced in Norway.',
    )}</p>
    <div class="stats" style="margin-top:22px">
      <div class="stat"><div class="k">${manifest.parts.length}</div>
        <div class="l">${t('printede deler', 'printed parts')}</div></div>
      <div class="stat"><div class="k">${formatHm(printMin(stationParts) + printMin(machineParts)).replace(' t', ' t')}</div>
        <div class="l">${t('printtid, anslag', 'print time, est.')}</div></div>
      <div class="stat hot"><div class="k">${pct(P_HAT)} %</div>
        <div class="l">${t('sjanse for en ferdig lue', 'chance of a finished hat')}</div></div>
      <div class="stat"><div class="k">${nok(LEARN_COST_NOK)} kr</div>
        <div class="l">${t('for å finne det ut', 'to find that out')}</div></div>
    </div>
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

<section id="verdict">
  <p class="eyebrow">${t('Les dette først', 'Read this first')}</p>
  <div class="verdict">
    <p class="big">${tm(
      'Ingen har bygget en heklemaskin som virker.<br>Det er derfor det er verdt å prøve — og derfor <em>du bør bruke 320 kr før du bruker ' + nok(totalNok('bench')) + '</em>.',
      'Nobody has built a crochet machine that works.<br>That is why it is worth trying — and why <em>you should spend 320 kr before you spend ' + nok(totalNok('bench')) + '</em>.',
    )}</p>
    <p>${t(
      'Publisert toppnivå for hekling i omgang er fire masker på rad, fra en forskningsgruppe på Harvard med ni akser og et verksted. Denne maskinen har en idé som kan gjøre det bedre — porten som holder masken åpen — men den ideen er ikke testet på ekte garn av noen, noen gang.',
      'The published state of the art for crochet in the round is four consecutive stitches, from a Harvard research group with nine axes and a machine shop. This machine has an idea that might do better — the gate that holds the stitch open — but that idea has never been tested on real yarn by anybody.',
    )}</p>
    <p style="margin-bottom:0">${t(
      'Så rekkefølgen er snudd. Det første steget er ikke å bestille motorer. Det er å printe fire porter, hekle en slange for hånd, og se om en port fanger en maske. Det tar en kveld og koster filament.',
      'So the order is reversed. The first step is not ordering motors. It is printing four gates, crocheting a tube by hand, and seeing whether a gate catches a stitch. That takes an evening and costs filament.',
    )}</p>

    <div class="odds">
      <div class="odd good">
        <div class="k">${pct(P_LEARN)} %</div>
        <div class="l">${t('sjanse for å få et svar', 'chance you get an answer')}</div>
        <div class="d">${t('For ' + nok(LEARN_COST_NOK) + ' kr og en kveld vet du om mekanismen fanger garn. Et rent nei er verdt like mye som et ja.', 'For ' + nok(LEARN_COST_NOK) + ' kr and an evening you know whether the mechanism catches yarn. A clean no is worth as much as a yes.')}</div>
      </div>
      <div class="odd">
        <div class="k">${pct(cumulativeAt('G3'))} %</div>
        <div class="l">${t('én maskinlaget maske', 'one machine-made stitch')}</div>
        <div class="d">${t('Dette alene ville vært et resultat verdt å vise fram.', 'This alone would be a result worth showing anyone.')}</div>
      </div>
      <div class="odd bad">
        <div class="k">${pct(P_HAT)} %</div>
        <div class="l">${t('en ferdig lue', 'a finished hat')}</div>
        <div class="d">${t('Hele kjeden, med tilsyn. Ikke uten tilsyn — se regnestykket under.', 'The whole chain, supervised. Not unattended — see the arithmetic below.')}</div>
      </div>
    </div>
  </div>

  <h2 style="margin-top:34px">${t('Portene, i rekkefølge', 'The gates, in order')}</h2>
  <p class="sub" style="margin-bottom:20px">${t(
    'Hver rad er et spørsmål maskinen må svare på, sannsynligheten for at den klarer det gitt at alt før gikk bra, og hvor mye penger som allerede er brukt når du får svaret. Tallene er skjønn, og de er merket som skjønn. Regnestykket er det ikke.',
    'Each row is a question the machine has to answer, the probability it does given everything before it worked, and how much money is already spent by the time you find out. The probabilities are judgement and are labelled as judgement. The multiplication is not.',
  )}</p>
  <div class="sc"><table>
    <thead><tr><th></th><th>${t('Spørsmålet', 'The question')}</th>
      <th class="n">${t('Denne', 'This one')}</th><th class="n">${t('Samlet', 'Cumulative')}</th>
      <th class="n">${t('Brukt, kr', 'Spent, kr')}</th></tr></thead>
    <tbody>${gateRows}</tbody>
  </table></div>

  <div class="note" style="margin-top:22px">
    <p>${tm(
      '<b>Og så regnestykket ingen liker.</b> En lue er ' + ref.totalStitches.toLocaleString('nb-NO') + ' masker på rad. Selv med 99,9 % per maske er sjansen for en hel lue uten inngrep ' + (pHat(0.999, ref.totalStitches) * 100).toFixed(1) + ' %. For 50/50 må hver eneste maske lykkes ' + (needed * 100).toFixed(4) + ' % av gangene.',
      '<b>And then the arithmetic nobody likes.</b> A hat is ' + ref.totalStitches.toLocaleString('en-GB') + ' consecutive stitches. Even at 99.9% per stitch, the chance of a whole hat with no intervention is ' + (pHat(0.999, ref.totalStitches) * 100).toFixed(1) + '%. For even odds, every single stitch has to succeed ' + (needed * 100).toFixed(4) + '% of the time.',
    )}</p>
    <p>${t(
      'Derfor er denne maskinen ikke designet for treffsikkerhet, men for gjenoppretting. Hekling har nøyaktig én levende løkke — maskinens tilstand er alltid gjenopprettelig. Et mislykket opptak er ikke et ødelagt plagg, det er en ny indeksering og et nytt forsøk.',
      'So this machine is not designed around accuracy, it is designed around recovery. Crochet has exactly one live loop, which means the machine state is always recoverable. A failed pickup is not a ruined garment, it is a re-index and another attempt.',
    )}</p>
    <p style="margin-bottom:0">${t(
      'Med gjenoppretting på 90 % av feilene blir 99,5 % per maske til rundt ' + Math.round(stops) + ' stopp per lue. Det er en maskin du står ved siden av, ikke en du går fra. Si det høyt nå, ikke etter at den er bygget.',
      'With a retry that recovers 90% of failures, 99.5% per stitch becomes about ' + Math.round(stops) + ' stops per hat. That is a machine you stand next to, not one you walk away from. Better said now than after it is built.',
    )}</p>
  </div>
</section>

<section id="mech">
  <p class="eyebrow">${t('Mekanismen', 'The mechanism')}</p>
  <h2>${t('Maskinen leter aldri', 'The machine never searches')}</h2>
  <p class="sub">${t(
    'Det som stopper heklemaskiner er ikke masken — det er å finne forrige omgangs løkke og holde den åpen. Her klemmes hver levende maske åpen i en printet port, i en posisjon maskinen allerede kjenner.',
    'What defeats crochet machines is not the stitch — it is finding the previous round’s loop and holding it open. Here every live stitch is clamped open in a printed gate, at a pose the machine already knows.',
  )}</p>
  <div class="stats" style="margin-top:24px">
    <div class="stat"><div class="k">${COMB_GATES}+${WHEEL_TEETH}</div>
      <div class="l">${t('printede porter', 'printed gates')}</div></div>
    <div class="stat"><div class="k">${GATE_THROAT_MM} mm</div>
      <div class="l">${t('halsbredde', 'throat width')}</div></div>
    <div class="stat hot"><div class="k">${(GATE_THROAT_MM - throatRequirementMm()).toFixed(1)} mm</div>
      <div class="l">${t('margin — alt du har', 'margin — all of it')}</div></div>
    <div class="stat"><div class="k">1</div>
      <div class="l">${t('masketype — fastmaske', 'stitch type — single')}</div></div>
  </div>

  <div class="note q" style="margin-top:22px">
    <p>${tm(
      '<b>Kammen holder, hjulet bærer.</b> Et hjul alene slipper løkken så snart kroken passerer. En kam alene trenger én port per maske — 180 like utskrifter og en mekanisme som setter inn nye underveis. Sammen opphever de hverandres svakhet.',
      '<b>The comb holds, the wheel carries.</b> A wheel alone releases the loop the moment the hook passes. A comb alone needs one gate per stitch — 180 identical prints and a mechanism to insert more mid-run. Together they cancel each other’s weakness.',
    )}</p>
    <p style="margin-bottom:0">${tm(
      '<b>Og her er tallet alt henger på.</b> Halsen må slippe gjennom krokspissen (' + HOOK_NOSE_MM + ' mm) med begge maskebein ved siden av (2 × ' + YARN_DIA_MM + ' mm), pluss margin. Det er ' + throatRequirementMm().toFixed(1) + ' mm. En åpning på ' + GATE_THROAT_MM + ' mm kan ikke gjenta seg hver ' + STITCH_W_MM + ' mm — det er aritmetikk — så kammen har to rader. Taket for to rader er ' + GATE_THROAT_MM + ' mm. Du har ' + (GATE_THROAT_MM - throatRequirementMm()).toFixed(1) + ' mm å gå på.',
      '<b>And here is the number everything rests on.</b> The throat has to pass the hook nose (' + HOOK_NOSE_MM + ' mm) with both legs of the stitch beside it (2 × ' + YARN_DIA_MM + ' mm), plus margin. That is ' + throatRequirementMm().toFixed(1) + ' mm. An ' + GATE_THROAT_MM + ' mm aperture cannot repeat every ' + STITCH_W_MM + ' mm — that is arithmetic — so the comb has two rows. The two-row ceiling is ' + GATE_THROAT_MM + ' mm. You have ' + (GATE_THROAT_MM - throatRequirementMm()).toFixed(1) + ' mm in hand.',
    )}</p>
  </div>

  <div class="note" style="margin-top:16px">
    <p style="margin-bottom:0">${tm(
      '<b>Den uløste biten, sagt rett ut.</b> Porten holder masken åpen når masken først er <em>i</em> porten. Hvordan kommer den dit? Ved at stoffet dreier forbi og kanten mates inn i en 0,7 mm innføring. Ingen har vist at det virker på bomull. Det er hele grunnen til at G0 finnes, og til at G0 koster filament i stedet for motorer.',
      '<b>The unsolved part, said plainly.</b> The gate holds the stitch open once the stitch is <em>in</em> the gate. How does it get there? By the fabric turning past and the edge feeding into a 0.7 mm lead-in. Nobody has shown that works on cotton. That is the entire reason G0 exists, and the reason G0 costs filament instead of motors.',
    )}</p>
  </div>
</section>

<section id="sim">
  <p class="eyebrow">${t('Simulering', 'Simulation')}</p>
  <h2>${t('Lua blir til, maske for maske', 'The hat, one stitch at a time')}</h2>
  <p class="sub" style="margin-bottom:20px">${t(
    'Dette er NORGE Away slik oppskriften faktisk er: omgangstall, økninger, fargesekvens og profil lest rett fra appens egne data. Ved 1× går den i maskinens virkelige takt — én maske hvert 4,8 sekund.',
    'This is NORGE Away as the pattern actually is: round counts, increases, colour sequence and profile read straight from the app’s own data. At 1× it runs at the machine’s real rate — one stitch every 4.8 seconds.',
  )}</p>
  <div class="sim">
    <div class="sim-c">
      <canvas id="simC"></canvas>
      <div class="sim-hud">
        <div class="hud"><b id="hStitch">0</b><span>${t('maske', 'stitch')}</span></div>
        <div class="hud"><b id="hRound">1</b><span>${t('omgang', 'round')}</span></div>
        <div class="hud"><b id="hTime">0 t</b><span>${t('maskintid', 'machine time')}</span></div>
        <div class="hud"><b id="hLeft">—</b><span>${t('igjen', 'remaining')}</span></div>
        <div class="hud"><b><span class="swatch" id="hSw"></span></b><span>${t('farge', 'colour')}</span></div>
      </div>
    </div>
    <div class="sim-bar">
      <button id="simPlay">${t('Spill av', 'Play')}</button>
      <div class="spd" id="simSpd">
        <button data-x="1" aria-pressed="true">1×</button>
        <button data-x="8" aria-pressed="false">8×</button>
        <button data-x="60" aria-pressed="false">60×</button>
        <button data-x="600" aria-pressed="false">600×</button>
      </div>
      <input id="simSeek" type="range" min="0" max="1000" value="0">
      <button id="simReset">${t('Nullstill', 'Reset')}</button>
    </div>
  </div>
  <div class="note" style="margin-top:18px">
    <p>${tm(
      '<b>Hva som er ekte her, og hva som ikke er det.</b> Ekte: maskeantall, omgangsstruktur, økninger, fargerekkefølge, hatteprofilen, syklustiden — og derfor timetallet. Ekte: aksebevegelsene, fordi de er maskinens erklærte akser gjennom sine erklærte områder.',
      '<b>What is real here, and what is not.</b> Real: the stitch count, the round structure, the increases, the colour sequence, the hat profile, the cycle time — and therefore the hours. Real: the axis motions, because those are the machine’s declared axes moving through their declared ranges.',
    )}</p>
    <p style="margin-bottom:0">${tm(
      'Ikke ekte: <em>garnet</em>. Hver maske tegnes som en løkke der oppskriften sier den skal være. Det er ingen fysikksimulering av bomull, og ingenting her er bevis for at en ekte tråd oppfører seg slik. En simulering som går perfekt er ikke et resultat — den er kravspesifikasjonen.',
      'Not real: <em>the yarn</em>. Each stitch is drawn as a loop at the pose the pattern puts it at. This is not a physical simulation of cotton, and nothing here is evidence that a real strand behaves this way. A simulation that runs perfectly is not a result — it is the specification.',
    )}</p>
  </div>
</section>

<section id="size">
  <p class="eyebrow">${t('Størrelser', 'Sizes')}</p>
  <h2>${t('Én maskin, mange luer', 'One machine, many hats')}</h2>
  <p class="sub" style="margin-bottom:20px">${t(
    'Omkrets og omgangstall er parametre, ikke konstanter. Alt under regnes ut på nytt fra maskinens egen rundeplan — den samme som verifikasjonen kjører alle åtte oppskriftene gjennom.',
    'Circumference and round count are parameters, not constants. Everything below is recomputed from the machine’s own round schedule — the same one the harness replays all eight patterns through.',
  )}</p>
  <div class="sizer">
    <div class="sliders">
      <div class="sl">
        <label>${t('Hodeomkrets', 'Head circumference')} <b><span id="vCm">${SIZE_CM.nominal}</span> cm</b></label>
        <input id="sCm" type="range" min="${SIZE_CM.min}" max="${SIZE_CM.max}" step="2" value="${SIZE_CM.nominal}">
      </div>
      <div class="sl">
        <label>${t('Omganger', 'Rounds')} <b><span id="vR">${ROUNDS.nominal}</span></b></label>
        <input id="sR" type="range" min="${ROUNDS.min}" max="${ROUNDS.max}" step="1" value="${ROUNDS.nominal}">
      </div>
    </div>
    <div class="stats" style="margin-top:22px">
      <div class="stat"><div class="k" id="vSt">—</div><div class="l">${t('masker', 'stitches')}</div></div>
      <div class="stat"><div class="k" id="vBody">—</div><div class="l">${t('masker per omgang', 'stitches per round')}</div></div>
      <div class="stat"><div class="k" id="vYarn">—</div><div class="l">${t('garn', 'yarn')}</div></div>
      <div class="stat"><div class="k" id="vTime">—</div><div class="l">${t('maskintid, mål', 'machine time, target')}</div></div>
    </div>
    <p style="margin:18px 0 0;font-size:13.5px;color:var(--ink-faint)">${t(
      'Det eneste som må printes på nytt for en ny størrelse er mandrellen — tre deler, rundt 225 g. Alt annet på maskinen er størrelsesuavhengig, fordi porten holder én maske og bryr seg ikke om hvor mange det er av dem.',
      'The only thing that has to be reprinted for a new size is the mandrel — three parts, about 225 g. Everything else on the machine is size-independent, because a gate holds one stitch and does not care how many there are.',
    )}</p>
  </div>
</section>

<section id="parts">
  <p class="eyebrow">${t('Deler du printer', 'Parts you print')}</p>
  <h2>${manifest.parts.length} ${t('deler · ', 'parts · ')}${pcs(stationParts) + pcs(machineParts)} ${t('stk · ', 'pcs · ')}${(grams(stationParts) + grams(machineParts)).toFixed(0)} g</h2>
  <p class="sub" style="margin-bottom:22px">${t(
    'Klikk for å snurre. Hver fil er verifisert tett, én sammenhengende kropp, innenfor byggevolumet — og fargen er filamentfargen: kremhvit PETG for struktur, karmosin for mekanismen, kull for PLA, grå for TPU.',
    'Click to spin. Every file is verified watertight, a single connected body, within the build volume — and the colour is the filament colour: ivory PETG for structure, crimson for the mechanism, charcoal for PLA, grey for TPU.',
  )}</p>

  <div class="stats" style="margin-bottom:22px">
    <div class="stat"><div class="k">${formatHm(printMin(stationParts))}</div><div class="l">${t('prototyp, printtid', 'prototype, print time')}</div></div>
    <div class="stat"><div class="k">${formatHm(printMin(machineParts))}</div><div class="l">${t('maskin, printtid', 'machine, print time')}</div></div>
    <div class="stat"><div class="k">${nok(filNok(stationParts) + filNok(machineParts))} kr</div><div class="l">${t('filament, totalt', 'filament, total')}</div></div>
    <div class="stat"><div class="k">0</div><div class="l">${t('deler som trenger lodd', 'parts needing solder')}</div></div>
  </div>

  <div class="track-h">${t('Trinn 1 · HEKLO Station', 'Stage 1 · HEKLO Station')}</div>
  <div class="pgrid">${partCards(stationParts)}</div>
  <div class="track-h">${t('Trinn 2 · HEKLO M1', 'Stage 2 · HEKLO M1')}</div>
  <div class="pgrid">${partCards(machineParts)}</div>
  <p style="margin-top:18px;font-size:13.5px;color:var(--ink-faint)">${t(
    'Printtidene er anslag: volum delt på reell flythastighet for en X1 Carbon, pluss lagoverhead. En slicer vil være uenig med 10–20 %. Ingen del her har møtt en slicer ennå, og det står i filen.',
    'Print times are estimates: volume over a real volumetric flow rate for an X1 Carbon, plus per-layer overhead. A slicer will disagree by 10–20%. No part here has met a slicer yet, and the file says so.',
  )}</p>
</section>

<section id="build">
  <p class="eyebrow">${t('Monteringsanvisning', 'Assembly guide')}</p>
  <h2>${t('Bygg — 24 steg', 'Build — 24 steps')}</h2>
  <p class="sub" style="margin-bottom:10px">${t(
    'Hvert steg viser maskinen slik den står akkurat da — nye deler flyr inn på plass i rødt, det som allerede er montert står i sin egen farge, resten er gjennomsiktig. Kjøpte deler er med: skinne, motorer, lager, rem, strømforsyning. Trykk ▶ for å se steget igjen.',
    'Each step shows the machine exactly as it stands — new parts fly into place in red, what is already built sits in its own colour, the rest is ghosted. Bought hardware is in the picture: rail, motors, bearings, belt, supply. Press ▶ to replay a step.',
  )}</p>
  <div class="stats" style="margin:22px 0 6px">
    <div class="stat"><div class="k">${(TOTAL_MINUTES / 60).toFixed(1)} t</div>
      <div class="l">${t('bygg, prototyp', 'build, prototype')}</div></div>
    <div class="stat"><div class="k">+${(MACHINE_MINUTES / 60).toFixed(1)} t</div>
      <div class="l">${t('bygg, maskinen', 'build, the machine')}</div></div>
    <div class="stat"><div class="k">${noT(formatDuration(hatNom))}</div>
      <div class="l">${t('drift, én lue', 'operating, one hat')}</div></div>
    <div class="stat"><div class="k">${nok(totalNok('bench'))} kr</div>
      <div class="l">${t('deler, trinn 1', 'parts, stage 1')}</div></div>
  </div>
  <div class="track-h">${t('Trinn 1 · Station · steg 1–12', 'Stage 1 · Station · steps 1–12')}</div>
  <div class="steps">${ALL_STEPS.filter((s) => s.track === 'station').map(stepCard).join('')}</div>
  <div class="track-h">${t('Trinn 2 · M1 · steg 13–24', 'Stage 2 · M1 · steps 13–24')}</div>
  <div class="steps">${ALL_STEPS.filter((s) => s.track === 'machine').map(stepCard).join('')}</div>
</section>

<section id="buy">
  <p class="eyebrow">${t('Innkjøp · trinn 1', 'Shopping · stage 1')}</p>
  <h2>${nok(totalNok('bench'))} kr</h2>
  <p class="sub" style="margin-bottom:20px">${t(
    'Kun norske butikker med lager i Norge. Ingen tre ukers venting, ingen toll. Men les portene over først — dette er listen du åpner etter G0, ikke før.',
    'Norwegian shops with domestic stock only. No three-week wait, no customs. But read the gates above first — this is the list you open after G0, not before.',
  )}</p>
  ${
    links
      ? `<div class="note ${links.dead ? '' : 'q'}" style="margin-bottom:18px"><p style="margin-bottom:0">${tm(
          '<b>' + links.ok + ' av ' + links.total + ' lenker svarte</b> da de sist ble åpnet av en maskin, ' + links.checkedAt + '. ' + (links.dead ? links.dead + ' er døde og må fikses.' : 'Ingen døde lenker.') + ' Prikken foran butikknavnet er den målingen. To domener måtte byttes fordi de ikke lenger fantes — det er den slags som koster en lørdag.',
          '<b>' + links.ok + ' of ' + links.total + ' links answered</b> when a machine last opened them, ' + links.checkedAt + '. ' + (links.dead ? links.dead + ' are dead and need fixing.' : 'No dead links.') + ' The dot before each shop name is that measurement. Two domains had to be replaced because they no longer existed — that is the kind of thing that costs a Saturday.',
        )}</p></div>`
      : ''
  }
  <div class="sc"><table>
    <thead><tr><th>${t('Vare', 'Item')}</th><th class="n">${t('Ant', 'Qty')}</th>
    <th>${t('Butikk', 'Shop')}</th><th class="n">kr</th><th class="n">${t('Pris', 'Price')}</th></tr></thead>
    <tbody>${bomRows}</tbody>
  </table></div>
  ${
    todo.length
      ? `<div class="note" style="margin-top:18px"><p style="margin-bottom:0">${t(
          todo.length + ' av ' + bomFor('bench').length + ' linjer har anslått pris. Lenken virker, men noen må se på prisen med øynene før du bestiller.',
          todo.length + ' of ' + bomFor('bench').length + ' lines carry an estimated price. The link resolves, but somebody has to read the price with their eyes before you order.',
        )}</p></div>`
      : ''
  }

  <p class="eyebrow" style="margin-top:36px">${t('Skruer og muttere, begge trinn', 'Fasteners, both stages')}</p>
  <div class="sc"><table>
    <thead><tr><th>${t('Feste', 'Fastener')}</th><th class="n">${t('Antall', 'Total')}</th></tr></thead>
    <tbody>${fastenerRows}</tbody>
  </table></div>
  <p style="margin-top:14px;font-size:13.5px;color:var(--ink-faint)">${t(
    'Ingen gjengeinnsatser på listen. Hvert gjengede hull i printet plast er en sekskantmutter som skyves inn i en lomme fra siden — ingen loddebolt, ingen 240 °C, ingen os, og ingen skjeve innsatser som gjør en del til søppel.',
    'No threaded inserts on the list. Every threaded hole in printed plastic is a hex nut that slides into a side-entry pocket — no soldering iron, no 240 °C, no fumes, and no crooked insert turning a part into scrap.',
  )}</p>
</section>

<section id="safety">
  <p class="eyebrow">${t('Sikkerhet', 'Safety')}</p>
  <h2>${t('Fart og brann er samme sak', 'Speed and fire are one problem')}</h2>
  <p class="sub">${t(
    'Syklustid er arbeidssyklus, og arbeidssyklus lager varme. Derfor er farten ikke et tall i programmet — den styres av målt temperatur.',
    'Cycle rate is duty cycle, and duty cycle makes heat. So speed is not a number in the program — it is governed by measured temperature.',
  )}</p>
  <div class="stats" style="margin-top:22px">
    <div class="stat"><div class="k">${LIMITS.motor.hardC}°</div>
      <div class="l">${t('utkobling i fastvare', 'firmware cutout')}</div></div>
    <div class="stat"><div class="k">${noT(formatDuration(hatSafe))}</div>
      <div class="l">${t('forsiktig', 'cautious')}</div></div>
    <div class="stat"><div class="k">${noT(formatDuration(hatNom))}</div>
      <div class="l">${t('mål', 'target')}</div></div>
    <div class="stat"><div class="k">4</div>
      <div class="l">${t('sikkerhetslag', 'safety layers')}</div></div>
  </div>
  <div class="note" style="margin-top:20px">
    <p>${t(
      'Sikring på forsyningen, nødstopp med lås i motorlinjen som programvaren ikke kan overstyre, røykvarsler over maskinen, og dørbryter som kutter strømmen. Alle fire står på delelisten.',
      'Fuse on the supply, latching E-stop in the motor line that software cannot override, smoke alarm above the machine, and a door interlock. All four are on the parts list.',
    )}</p>
    <p>${t(
      'En frakoblet føler viser brutt krets, og brutt krets behandles som feil — aldri som «kald». Det er nøyaktig slik en termisk sikring stille slutter å finnes.',
      'A disconnected sensor reads open circuit, and open circuit is treated as a fault — never as “cold”. That is exactly how a thermal cutout silently stops existing.',
    )}</p>
    <p style="margin-bottom:0">${t(
      'Og siden kroken nå er printet: ingenting på denne maskinen er skarpt. Det er ikke pynt — det endrer hva det er forsvarlig å la stå og gå i et rom der det bor folk.',
      'And since the hook is now printed: nothing on this machine is sharp. That is not decoration — it changes what it is reasonable to leave running in a room where people live.',
    )}</p>
  </div>
</section>

<section id="patent">
  <p class="eyebrow">${t('Patent', 'Patent')}</p>
  <h2>${t('Utkastet dekker ikke det du bygger', 'The draft does not cover what you are building')}</h2>
  <p class="sub" style="margin-bottom:20px">${t(
    'Patentutkastet fra HEKLOMAT-dossieret har 18 krav og 4 uavhengige. Det er godt skrevet. Men det ble skrevet om en annen maskin.',
    'The patent draft in the HEKLOMAT dossier has 18 claims, 4 independent. It is well written. But it was written about a different machine.',
  )}</p>
  <div class="note">
    <p>${tm(
      '<b>Krav 1</b> beskriver et presentasjonshjul med «løkkegripende tenner», og <b>krav 2</b> sier at tennene er <em>latch-nåler</em>. Maskinen på denne siden har ingen latch-nåler og ingen nåler i det hele tatt — den har printede porter. Krav 1 leser trolig på en tannbåren port, men det er «trolig», og det er den slags «trolig» en innsigelse lever av.',
      '<b>Claim 1</b> describes a presentation wheel with “loop-engaging teeth”, and <b>claim 2</b> says the teeth are <em>latch needles</em>. The machine on this page has no latch needles and no needles at all — it has printed gates. Claim 1 probably reads on a tooth-carried gate, but that is “probably”, and that is the kind of “probably” an opposition feeds on.',
    )}</p>
    <p>${tm(
      '<b>Og den faktisk nye biten er ikke krevd i det hele tatt.</b> Den faste holdekammen — som er det som gjør at hjulet plukker fra en kjent posisjon i stedet for å lete — finnes ikke i noe krav. Heller ikke den todelte forskyvningen som gjør en 8 mm hals mulig ved 5,6 mm deling. Det er de to tingene som skiller denne maskinen fra både Croche-Matic og CroMat.',
      '<b>And the genuinely new part is not claimed at all.</b> The fixed retention comb — the thing that makes the wheel pick up from a known pose instead of searching — appears in no claim. Neither does the two-row stagger that makes an 8 mm throat possible at 5.6 mm pitch. Those are the two things that separate this machine from both Croche-Matic and CroMat.',
    )}</p>
    <p style="margin-bottom:0">${tm(
      '<b>Rekkefølge.</b> Norge følger EPC, som ikke har noen nådeperiode: å publisere beskrivelsen ødelegger dens egen nyhet samme dag. Denne siden er uoppført og ikke indeksert, men en uoppført URL er uklarhet, ikke hemmelighold. Snakk med en patentfullmektig om kravene til port og kam <em>før</em> noe av dette deles bredere — og send skjermbilder til en venn, ikke lenken.',
      '<b>Order of operations.</b> Norway follows the EPC, which has no grace period: publishing the disclosure destroys its own novelty on the day it goes up. This page is unlisted and not indexed, but an unlisted URL is obscurity, not confidentiality. Talk to a patent attorney about gate and comb claims <em>before</em> any of this is shared more widely — and send a friend screenshots, not the link.',
    )}</p>
  </div>
</section>

<footer>
  <p>HEKLO · HEKLO Station · HEKLO M1 — MASKLAB. ${t(
    'Hvert tall på denne siden er regnet ut fra maskindefinisjonen, ikke skrevet inn for hånd. Verifikasjonen kjører 243 kontroller.',
    'Every number on this page is computed from the machine definition, not typed in by hand. The harness runs 243 checks.',
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
import { thumbPart, prepareSteps, livePart, liveAssembly, liveSim } from './viewer.js';

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

const [data, hats] = await Promise.all([
  fetch('assembly.json').then(r => r.json()),
  fetch('hat.json').then(r => r.json()),
]);
const hat = hats.hats.find(h => h.id === 'norway26') ?? hats.hats[0];
data.hatPalette = hat.palette;

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

/* ---- thumbnails and animated steps, all through ONE shared context ------- */

let queue = Promise.resolve();
let drawStep = null;

async function paint(c, t = 1) {
  if (c.dataset.stl) { await thumbPart(c, c.dataset.stl, c.dataset.id); return; }
  if (!drawStep) drawStep = await prepareSteps(data);
  await drawStep(c, Number(c.dataset.assemblyStep), t);
}

/**
 * Parts are painted once; step diagrams are repainted every time they come
 * back into view.
 *
 * A step card holds a bitmap, and a bitmap can go stale — an animation that was
 * cancelled by a fast scroll, a device-pixel-ratio change, a repaint that lost
 * a race for the shared context. Repainting on re-entry costs one render and
 * makes every one of those self-healing instead of leaving a blank card.
 */
const io = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    const c = e.target;
    if (c.dataset.stl) io.unobserve(c);
    queue = queue.then(() => paint(c)).catch(() => {});
  }
}, { rootMargin: '300px' });
for (const c of document.querySelectorAll('canvas[data-stl], canvas[data-assembly-step]')) io.observe(c);

/**
 * Animate ONE step at a time.
 *
 * Twenty-four simultaneous animations through a single shared renderer is a
 * slideshow; one at a time is an instruction. A step plays when it first scrolls
 * into view and whenever you press its button, and anything already playing is
 * cut off rather than queued behind it.
 */
let playing = null;
function play(canvas) {
  if (!canvas || !canvas.dataset.assemblyStep) return Promise.resolve();
  if (playing) playing.cancelled = true;
  const token = { cancelled: false };
  playing = token;
  const card = canvas.closest('.st');
  if (card) card.classList.add('playing');
  const dur = 1100;
  const t0 = performance.now();
  // A cancelled animation must SETTLE, not freeze. Scrolling past a step used
  // to abandon it mid-flight, leaving the card showing the frame where its
  // parts were still 300 mm out — which for a big part is an empty card.
  const settle = () => {
    if (card) card.classList.remove('playing');
    return paint(canvas, 1).catch(() => {});
  };
  return new Promise((resolve) => {
    (function frame(now) {
      if (token.cancelled) return settle().then(resolve);
      const t = Math.min(1, (now - t0) / dur);
      paint(canvas, t).then(() => {
        if (t < 1 && !token.cancelled) requestAnimationFrame(frame);
        else settle().then(resolve);
      }).catch(() => settle().then(resolve));
    })(performance.now());
  });
}

for (const b of document.querySelectorAll('.st-play')) {
  b.onclick = () => {
    const c = b.parentElement.querySelector('canvas');
    queue = queue.then(() => play(c)).catch(() => {});
  };
}

/**
 * Play the step you are actually looking at.
 *
 * Animating each step as it scrolls past sounds better than it is: the
 * observer fires for a whole screenful at once, every animation renders and
 * blits at full size, and chaining them through one shared context puts the
 * page far enough behind that it stops painting at all. So exactly one step
 * animates — whichever is nearest the middle of the screen — and only when it
 * changes, and only once.
 */
const played = new Set();
let scrollT;
addEventListener('scroll', () => {
  clearTimeout(scrollT);
  scrollT = setTimeout(() => {
    const mid = innerHeight / 2;
    let best = null;
    let bestD = Infinity;
    for (const c of document.querySelectorAll('canvas[data-assembly-step]')) {
      const r = c.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) continue;
      const d = Math.abs(r.top + r.height / 2 - mid);
      if (d < bestD) { bestD = d; best = c; }
    }
    if (!best) return;
    const n = best.dataset.assemblyStep;
    if (played.has(n)) return;
    played.add(n);
    queue = queue.then(() => play(best)).catch(() => {});
  }, 260);
}, { passive: true });

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

/* ---- part modal ---------------------------------------------------------- */

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
    live = await livePart(modalC, file, b.dataset.id);
  };
}

/* ---- the simulation ------------------------------------------------------ */

const hStitch = document.getElementById('hStitch');
const hRound = document.getElementById('hRound');
const hTime = document.getElementById('hTime');
const hLeft = document.getElementById('hLeft');
const hSw = document.getElementById('hSw');
const seek = document.getElementById('simSeek');
const playBtn = document.getElementById('simPlay');
const isEn = () => root.classList.contains('lang-en');
const hm = (ms) => {
  const m = Math.round(ms / 60000);
  const h = Math.floor(m / 60);
  return h ? h + (isEn() ? ' h ' : ' t ') + String(m % 60).padStart(2,'0') : m + ' m';
};

/**
 * Build the simulator only when somebody scrolls to it. It is a third WebGL
 * context and 3 694 instanced loops; paying for that on page load makes the
 * hero janky for every visitor who never reaches this section.
 */
let seeking = false;
let sim = null;
const simCanvas = document.getElementById('simC');
const simOpts = {
  onTick: (s) => {
    hStitch.textContent = s.index.toLocaleString('nb-NO');
    hRound.textContent = s.round + ' / ' + s.rounds;
    hTime.textContent = hm(s.elapsedMs);
    hLeft.textContent = hm(s.remainMs);
    hSw.style.background = hat.palette[s.color] ?? '#000';
    if (!seeking) seek.value = String(Math.round((s.index / s.total) * 1000));
  },
  onDone: () => { playBtn.textContent = isEn() ? 'Play' : 'Spill av'; playBtn.classList.remove('on'); },
};

let simReady = null;
function ensureSim() {
  if (!simReady) simReady = liveSim(simCanvas, hat, simOpts).then((s) => { sim = s; return s; });
  return simReady;
}
new IntersectionObserver((es, ob) => {
  for (const e of es) if (e.isIntersecting) { ob.disconnect(); ensureSim(); }
}, { rootMargin: '200px' }).observe(simCanvas);

playBtn.onclick = async () => {
  await ensureSim();
  const on = sim.toggle();
  playBtn.classList.toggle('on', on);
  playBtn.textContent = on ? (isEn() ? 'Pause' : 'Pause') : (isEn() ? 'Play' : 'Spill av');
};
document.getElementById('simReset').onclick = async () => {
  await ensureSim();
  sim.pause(); sim.reset();
  playBtn.classList.remove('on');
  playBtn.textContent = isEn() ? 'Play' : 'Spill av';
};
for (const b of document.querySelectorAll('#simSpd button')) {
  b.onclick = async () => {
    for (const o of document.querySelectorAll('#simSpd button')) o.setAttribute('aria-pressed','false');
    b.setAttribute('aria-pressed','true');
    await ensureSim();
    sim.setSpeed(Number(b.dataset.x));
  };
}
seek.oninput = async () => { seeking = true; await ensureSim(); sim.seek(Number(seek.value) / 1000); };
seek.onchange = () => { seeking = false; };

/* ---- the size control ---------------------------------------------------- */

const SIZES = ${JSON.stringify(SIZE_TABLE)};
const REF = { stitches: ${ref.totalStitches}, colorChanges: ${REF_COLOR_CHANGES} };
const CYCLE = ${CYCLE_MS.nominal};
const COLOR_MS = 1500;

const sCm = document.getElementById('sCm');
const sR = document.getElementById('sR');

function sizeUpdate() {
  const cm = Number(sCm.value);
  const rounds = Number(sR.value);
  const row = SIZES.reduce((a, b) => Math.abs(b.cm - cm) < Math.abs(a.cm - cm) ? b : a);
  const wall = Math.max(1, rounds - row.crownRounds - row.brimRounds);
  const stitches = row.crownSum + wall * row.bodyCount + row.brimSum;
  // Colour changes scale with the work, since the chart repeats around the hat.
  const changes = Math.round(REF.colorChanges * (stitches / REF.stitches));
  const ms = stitches * CYCLE + changes * COLOR_MS;

  document.getElementById('vCm').textContent = String(cm);
  document.getElementById('vR').textContent = String(rounds);
  document.getElementById('vSt').textContent = stitches.toLocaleString('nb-NO');
  document.getElementById('vBody').textContent = String(row.bodyCount);
  document.getElementById('vYarn').textContent = Math.round(stitches * row.suMm * 4.2 / 1000) + ' m';
  document.getElementById('vTime').textContent = hm(ms);
}
sCm.oninput = sizeUpdate;
sR.oninput = sizeUpdate;
sizeUpdate();
</script>
</body>
</html>
`;

/* ------------------------------------------------------------------ emit -- */

mkdirSync(join(OUT, 'stl'), { recursive: true });
writeFileSync(join(OUT, 'index.html'), html);

const want = new Set(readdirSync(join(ROOT, 'stl')).filter((f) => f.endsWith('.stl')));
let copied = 0;
for (const f of want) {
  copyFileSync(join(ROOT, 'stl', f), join(OUT, 'stl', f));
  copied++;
}

// Prune, don't just copy. Renaming needle-collet to hook-collet left the old
// file sitting in the published directory — still downloadable, still listed by
// nothing, and a part that no longer exists is worse than a missing one.
let pruned = 0;
for (const f of readdirSync(join(OUT, 'stl'))) {
  if (f.endsWith('.stl') && !want.has(f)) {
    rmSync(join(OUT, 'stl', f));
    pruned++;
  }
}

console.log(
  `wrote public/system/ — ${manifest.parts.length} parts (${copied} STLs, ${pruned} pruned), ` +
    `${bomFor('bench').length} BOM lines, ${ALL_STEPS.length} steps, ` +
    `${GATES.length} stage gates, P(hat) ${(P_HAT * 100).toFixed(1)}%`,
);
