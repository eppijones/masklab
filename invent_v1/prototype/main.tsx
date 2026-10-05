import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { estimateJob, type CostInputs, type Plate } from './cost.ts';
import { Viewer } from './viewer.tsx';
import type { Data, Part } from './types.ts';
import { HAT, HAT_PHASES, HAT_HOURS, processAt } from './hat-process.ts';
import { WholeBuild } from './whole-build.tsx';
import { MachineInstructions, SafetyAndPatent } from './workshop.tsx';
import { StitchLesson } from './stitch-lesson.tsx';
import { Procurement } from './procurement.tsx';
import './style.css';

const BASE = import.meta.env.BASE_URL;
const num = (n: number, digits = 0) => n.toLocaleString('nb-NO', { maximumFractionDigits: digits });
const money = (n: number) => `${num(n)} kr`;
const name = (p: Part) => p.nameNo || p.name;
type Page = 'Maskinen' | 'Deler og pris' | 'Innkjøp' | 'Bygg og tid';
const PAGE_HASH:Record<Page,string>={'Maskinen':'maskinen','Deler og pris':'print','Innkjøp':'innkjop','Bygg og tid':'bygg'};
function readRoute(){
  const [route,id]=window.location.hash.slice(1).split('/');
  return {page:(Object.entries(PAGE_HASH).find(([,h])=>h===route)?.[0]??'Maskinen') as Page, selected:route==='del'&&id?id:null};
}
type Quote = { revision: string; scope: string; printer: string; profile: string; nozzleMm: number; slicerVersion: string; plates: Plate[]; sha256?: Record<string,string>; warnings?: {part:string;messages:string[]}[] };

const BUILD = [
  { title: 'Ramme og bevegelse', text: 'Ramme, skinner, lager, akslinger og drivverk.', remaining: 'Feste- og lagerpunkter må ferdigstilles.' },
  { title: 'Heklehode og maskeholdere', text: 'Metallverktøy, kontrollert lukking og holdere som beholder maskene.', remaining: 'Den nye mekanikken må tegnes og prøves.' },
  { title: 'Garn og stofføring', text: 'Garnmating, retur, spenningsmåling og nedtrekk.', remaining: 'Mateverk og sensorer må velges og tilpasses.' },
  { title: 'Elektronikk og styring', text: 'Motorer, drivere, strøm, sensorer, ledninger og programvare.', remaining: 'Koblingsskjema og fungerende styringskode mangler.' },
  { title: 'Montering og oppstart', text: 'Én rekkefølge for hele bygget, med skruer, koblinger og innstillinger.', remaining: 'Guiden ferdigstilles fra den samlede konstruksjonen.' },
];

function App({ data }: { data: Data }) {
  const [page, setPageState] = useState<Page>(()=>readRoute().page);
  const [selected, setSelected] = useState<string | null>(()=>readRoute().selected);
  const setPage=(p:Page)=>{setPageState(p);if(p!=='Maskinen')setSelected(null);};
  useEffect(()=>{const listen=()=>{const r=readRoute();setPageState(r.page);setSelected(r.selected);};window.addEventListener('hashchange',listen);return()=>window.removeEventListener('hashchange',listen);},[]);
  useEffect(()=>{window.history.replaceState(null,'','#'+(page==='Maskinen'&&selected?'del/'+selected:PAGE_HASH[page]));},[page,selected]);
  const [explode, setExplode] = useState(0);
  const [showProcess, setShowProcess] = useState(true);
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [focusHat, setFocusHat] = useState(false);
  const active = processAt(progress);
  useEffect(() => {
    if (!playing || page !== 'Maskinen' || selected || !showProcess) return;
    let raf = 0, previous = performance.now();
    const tick = (now: number) => {
      const elapsed = Math.min((now - previous) / 1000, .1); previous = now;
      setProgress(p => Math.min(HAT.totalStitches, p + elapsed * 36));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, page, selected, showProcess]);
  useEffect(() => { if (progress >= HAT.totalStitches) setPlaying(false); }, [progress]);
  const seek = (value: number) => { setPlaying(false); setProgress(value); };
  const [filter, setFilter] = useState('');
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteSource, setQuoteSource] = useState<'local' | 'imported'>('local');
  const [quoteError, setQuoteError] = useState('');
  const [inputs, setInputs] = useState<CostInputs>({ prices: { PETG: 158, PLA: 229, TPU: 450 }, wastePct: 20, hourly: 0, setup: 0, shipping: 0, vatPct: 0 });
  const job = data.parts.filter(p => p.fullQty.installed + p.fullQty.spare > 0)
    .map(p => ({ ...p, material: p.print.material, qty: p.fullQty.installed + p.fullQty.spare }));
  const cost = estimateJob(job, inputs, quote?.plates ?? []);
  useEffect(() => {
    let current = true;
    fetch(BASE + 'x1-reference-slice.json').then(r => r.ok ? r.json() : null).then((q:Quote|null) => {
      if (current && q?.scope === 'full' && q.revision === data.revision &&
        job.every(p => q.sha256?.[p.id] === p.sha256) && estimateJob(job, inputs, q.plates).coverage) setQuote(q);
    }).catch(() => { /* CAD estimate remains visible if a matching slice is unavailable. */ });
    return () => { current = false; };
  }, [data]);
  const grams = Object.values(cost.grams).reduce((a, b) => a + b, 0);
  const pieces = job.reduce((sum, p) => sum + p.qty, 0);
  const bought = data.purchases.reduce((sum, p) => sum + (p.priceNok ?? 0) * p.qty, 0);
  const unpriced = data.purchases.filter(p => p.priceNok === null).length;
  const part = selected ? job.find(p => p.id === selected) : undefined;
  const slicedPartGrams = (id: string, qty: number) => {
    const plates = quote?.plates.filter(p => Object.keys(p.contents).length===1 && p.contents[id]>0) ?? [];
    return plates.reduce((s,p)=>s+p.contents[id],0)===qty ? plates.reduce((s,p)=>s+p.grams,0) : null;
  };
  const partPrintGrams = part ? slicedPartGrams(part.id,part.qty) : null;
  const showPart = (id: string) => { setPlaying(false); setSelected(id); setPage('Maskinen'); };
  const numberInput = (key: 'wastePct' | 'hourly' | 'setup' | 'shipping' | 'vatPct', label: string) => (
    <label>{label}<input type="number" min="0" value={inputs[key]} onChange={e => setInputs({ ...inputs, [key]: Math.max(0, Number(e.target.value) || 0) })} /></label>
  );

  async function importQuote(file?: File) {
    if (!file) return;
    try {
      if (file.size > 1024 * 1024) throw new Error('Bruk en JSON-fil under 1 MB.');
      const q: Quote = JSON.parse(await file.text());
      if (q.revision !== data.revision || q.scope !== 'full') throw new Error('Filen må gjelde hele V1-delelisten: revision R2-RO, scope full.');
      if (typeof q.printer !== 'string' || !q.printer.trim() || typeof q.profile !== 'string' || !q.profile.trim() || !Number.isFinite(q.nozzleMm) || q.nozzleMm <= 0 || typeof q.slicerVersion !== 'string' || !q.slicerVersion.trim()) throw new Error('Fyll inn printer, dyse, versjon av printprogrammet og profil i filen.');
      if (!Array.isArray(q.plates) || !q.plates.length || q.plates.some(r => !r || typeof r.id !== 'string' || !r.id || !['PETG', 'PLA', 'TPU'].includes(r.material) || !Number.isFinite(r.grams) || r.grams <= 0 || !Number.isFinite(r.hours) || r.hours <= 0 || !r.contents || typeof r.contents !== 'object' || Array.isArray(r.contents))) throw new Error('Hver plate må ha ID, materiale, positive gram og timer, og antall av hver del.');
      if (new Set(q.plates.map(r => r.id)).size !== q.plates.length) throw new Error('Hver plate må ha en unik ID.');
      if (!estimateJob(job, inputs, q.plates).coverage) throw new Error('Platene må dekke hele delelisten med riktig antall og materiale, inkludert reservedeler.');
      setQuote(q); setQuoteSource('imported'); setQuoteError('');
    } catch (error) {
      setQuote(null); setQuoteError((error as Error).message);
    }
  }

  function exportQuote() {
    const result = { revision: data.revision, scope: 'full', status: 'V1 reference inventory; not a complete-machine release',
      printer: quote?.printer ?? null, profile: quote?.profile ?? null, nozzleMm: quote?.nozzleMm ?? null,
      slicerVersion: quote?.slicerVersion ?? null, inputs, result: cost,
      basis: quote ? (quoteSource==='local' ? 'Local Bambu Studio X1 Carbon prediction; no physical print' : 'User-supplied slicer plate totals') : 'Rough CAD estimate; print-job total unknown',
      parts: job.map(p => ({ id: p.id, qty: p.qty, sha256: p.sha256 })), plates: quote?.plates ?? [] };
    const url = URL.createObjectURL(new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = 'heklomat-hele-maskinen-kostnad.json'; a.click(); URL.revokeObjectURL(url);
  }

  return <>
    <header className="header">
      <a className="brand" href="#" onClick={() => setPage('Maskinen')}><span className="brandmark" aria-hidden="true">H</span>HEKLOMAT</a>
      <nav aria-label="Hovedmeny">{(['Maskinen', 'Deler og pris', 'Innkjøp', 'Bygg og tid'] as Page[]).map(p =>
        <button key={p} aria-current={page === p ? 'page' : undefined} onClick={() => setPage(p)}>{p==='Deler og pris'?'3D-print':p}</button>)}</nav>
      <span className="project-status"><i />Ikke testbygget</span>
    </header>
    <main>
      {page === 'Maskinen' && <>
        <div className="page-heading"><div><span className="eyebrow">RO RO RO / 56 CM / HEKLOMAT</span><h1>RO RO RO, maske for maske.</h1><p>Hvit hatt, røde bokstaver og blå bølgekant. Hatten hekles i garn; maskindelene 3D-printes.</p></div><button className="button primary" onClick={() => setPage('Deler og pris')}>Se alle printdeler <span>↗</span></button></div>
        {!part && <StitchLesson onLocate={cursor=>{seek(cursor);setSelected(null);setShowProcess(true);setFocusHat(true);setExplode(0);}} />}
        <details className="cad-reference" open={!!part}><summary>Printdeler og tidligere V1-modell{part ? ` · ${name(part)}` : ""}</summary>
        <div className="model-layout">
          <section className="viewer" aria-label="Maskinmodell">
            <div className="viewer-toolbar"><div className="switch"><button aria-pressed={!part && showProcess} onClick={() => {setSelected(null);setShowProcess(true);setExplode(0);}}>Hattforløp</button><button aria-pressed={!part && !showProcess} onClick={() => {setSelected(null);setShowProcess(false);setPlaying(false);}}>Alle deler</button>{part && <button aria-pressed>Valgt del</button>}</div><span className="reference-tag">V1 · CAD-referanse</span></div>
            <Viewer data={data} mode={part ? 'part' : 'machine'} selected={part?.id ?? 'platter'} explode={showProcess ? 0 : explode} hardware={true} onSelect={showPart} showProcess={showProcess && !part} progress={progress} focusHat={focusHat} />
            <div className="viewer-bottom"><span>Dra for å rotere · scroll for å zoome</span>{!part && (showProcess ? <button className="text-button" aria-pressed={focusHat} onClick={() => setFocusHat(!focusHat)}>{focusHat ? 'Vis hele maskinen' : 'Se hatten nærmere'}</button> : <label>Trekk delene fra hverandre<input aria-label="Trekk delene fra hverandre" type="range" min="0" max="120" value={explode} onChange={e => setExplode(Number(e.target.value))} /></label>)}</div>
            {!part && showProcess && <div className="process-controls">
              <div className="playback"><button className="button primary" onClick={() => {if(active.complete)setProgress(0);setPlaying(!playing);}}>{playing ? 'Pause' : active.complete ? 'Spill igjen' : 'Spill forløpet'}</button><input aria-label="Hattens fremdrift i masker" type="range" min="0" max={HAT.totalStitches} step="1" value={Math.floor(progress)} onChange={e => seek(Number(e.target.value))}/><span>{num(active.fraction * 100)} %</span></div>
              <div className="phase-buttons">{HAT_PHASES.map(p => <button key={p.id} aria-pressed={active.row.phase===p.id} onClick={() => seek(p.start)}><i/>{p.name}<small>{p.firstRound}–{p.lastRound}</small></button>)}<button className="complete-hat" onClick={() => seek(HAT.totalStitches)}>Vis hel hatt ↗</button></div>
              <p>Oppskriftsvisning · 36 masker/sekund i avspillingen, ikke maskinens arbeidstempo.</p>
              {progress>0&&!active.complete&&<p>Oransje stiplet linje: avstanden fra dagens krok til masken den må nå. Dette festet og bevegelsen må utvikles.</p>}
            </div>}
          </section>
          <aside className="build-summary">
            {part ? <>
              <div className="aside-title"><span className="eyebrow">VALGT DEL</span><button className="close" aria-label="Tilbake til hele maskinen" onClick={() => setSelected(null)}>×</button></div>
              <h2>{name(part)}</h2><p className="part-id">{part.id}</p>
              <dl><div><dt>Mål</dt><dd>{part.bbox.map(n => num(n, 1)).join(' × ')} mm</dd></div><div><dt>Materiale</dt><dd>{part.print.material}</dd></div><div><dt>Antall</dt><dd>{part.fullQty.installed} + {part.fullQty.spare} i reserve</dd></div><div><dt>{partPrintGrams!==null?'Filament for alle':'Anslått delvekt'}</dt><dd>ca. {num(partPrintGrams??part.grams, 1)} g</dd></div></dl>
              <p className="small">{partPrintGrams!==null?'Beregnet for hele antallet, inkludert støtte og festekant.':'Vekten er et grovt anslag fra 3D-modellen, uten støtte.'}</p>
              <p className="small">Eksisterende V1-geometri. Passform og funksjon er ikke ferdig kontrollert.</p>
              <button className="text-button" onClick={() => setPage('Deler og pris')}>← Tilbake til alle printdelene</button>
              <a className="button primary full" href={BASE + part.file} download>Last ned V1-del ↓</a>
              <details><summary>Printdetaljer</summary><p className="small">{part.print.layerMm} mm lag · {part.print.walls} vegger · {part.print.infillPct} % fyll. STL i millimeter, med bunnen på Z = 0. Selve plastdelen er anslått til {num(part.grams,1)} g uten støtte.</p><code className="hash">SHA-256: {part.sha256}</code></details>
            </> : showProcess ? <>
              <span className="eyebrow">RO RO RO / 56 CM</span><h2>{active.complete ? 'Hele hattforløpet' : active.row.label}</h2>
              <div className="hat-duration"><strong>{num(HAT_HOURS,1)} timer</strong><span>Regneeksempel for hele hatten, inkl. fargeskift og avslutning. Ikke målt maskintid.</span></div><div className="round-number"><strong>{active.row.num}</strong><span>av {HAT.rounds}<br/>omganger</span></div>
              <dl><div><dt>Masker vist</dt><dd>{num(Math.floor(progress))} / {num(HAT.totalStitches)}</dd></div><div><dt>Denne omgangen</dt><dd>{active.row.count} masker</dd></div><div><dt>Økninger i omgangen</dt><dd>{active.row.increases}</dd></div></dl>
              <p className="small">Fargene og maskene følger RO RO RO-oppskriften. Garnveien og bevegelsen er en forklaring av prinsippet; maskinen har ennå ikke heklet denne hatten.</p>
              <button className="text-button" onClick={() => setPage('Bygg og tid')}>Printtid, byggetid og hekletid →</button>
              <div className="compact-spec"><span>{pieces} V1-printdeler</span><span>{num(grams / 1000, 2)} kg anslått</span><span>{money(cost.materialNok)} filament inkl. tillegg</span></div>
            </> : <>
              <span className="eyebrow">DAGENS V1-GRUNNLAG</span><h2>Bygget i tall</h2>
              <div className="summary-numbers"><div><strong>{pieces}</strong><span>printdeler inkl. reserve</span></div><div><strong>{num(grams / 1000, 2)} <small>kg</small></strong><span>{quote ? 'beregnet filament' : 'anslått filament'}</span></div><div><strong>{money(cost.materialNok)}</strong><span>filament{quote ? '' : 'estimat'} inkl. {inputs.wastePct} % tillegg</span></div></div>
              <p className="small">Referansetall fra V1. Ny mekanikk og komplett byggepris er ikke ferdig beregnet.</p>
              <button className="text-button" onClick={() => setPage('Deler og pris')}>Åpne hele delelisten <span>→</span></button>
            </>}
          </aside>
        </div>
        <div className="yarn-legend"><span><i style={{background:'#F6F0E1'}}/>Hvit bunn</span><span><i style={{background:'#BA0C2F'}}/>Røde RO RO RO-bokstaver</span><span><i style={{background:'#00205B'}}/>Blå bølgekant</span><button className="text-button" onClick={()=>document.getElementById('stitch-lesson')?.scrollIntoView({behavior:'smooth',block:'start'})}>Se én maske i sakte film ↓</button><button className="text-button" onClick={() => showPart('crochet-hook')}>Heklekroken som 3D-del →</button></div>
        </details>
        <div className="build-note"><span className="note-dot" /><p><strong>Dette er ikke en byggeklar maskin ennå.</strong> V1 har {data.findings.length} åpne konstruksjonspunkter. Maskeholding, heklehode og styring må fungere fysisk før hele maskinen kan frigis til print og montering.</p><button onClick={() => setPage('Bygg og tid')}>Se hele byggegrunnlaget →</button></div>
        <MachineInstructions onSelect={showPart} />
      </>}

      {page === 'Deler og pris' && <>
        <div className="page-heading"><div><span className="eyebrow">ØYVIND / 3D-PRINT</span><h1>Alle printdelene, samlet.</h1><p>Øyvind printer. Espen dekker filamentene.</p></div><span className="reference-tag">Foreløpig V1-grunnlag</span></div>
        <div className="print-handoff"><div><strong>Én pakke til Øyvind</strong><p>{job.length} STL-filer, antall, materialer og printoversikt. Dette er V1-konstruksjonsgrunnlaget. Den nye animerte heklecellen er ikke med som ferdige printfiler. Kjente feil må rettes før full maskin printes.</p></div><a className="button primary" href={BASE+'heklomat-oyvind-printpakke.zip'} download>Last ned alle 3D-filene · ZIP ↓</a></div>
        <div className="cost-overview">
          <article><span>01 / FILAMENT</span><strong>{money(cost.materialNok)}</strong><p>{num(grams / 1000, 2)} kg {quote ? 'beregnet av printprogrammet' : 'estimert'} · pris med {inputs.wastePct} % tillegg</p></article>
          <article><span>02 / PRINTTID</span><strong>{cost.hours===null ? 'Beregnes' : num(cost.hours,1)+' timer'}</strong><p>Beregnet av Bambu Studio, før platebytte og etterarbeid</p></article>
          <article className="total"><span>03 / PRINTES AV ØYVIND</span><strong>{pieces} deler</strong><p>{job.length} filer · Espen betaler filament</p></article>
        </div>
        <p className="small cost-context">Filament er bare materialforbruket. Maskintid, arbeid, frakt og eventuelle hele filamentruller kommer i tillegg. Tallene priser dagens V1-deler, ikke den ferdige nye maskinen.{quote && <> Printprogrammet beregner {num(cost.hours!,1)} timer over {quote.plates.length} plater med støtte og brim.</>}</p>
        <section className="parts-section">
          <div className="section-heading"><div><h2>Dette printes <span>{pieces} deler</span></h2><p>{job.length} ulike modeller. Antall inkluderer reservedeler.</p></div><input className="search" aria-label="Søk i printdeler" placeholder="Søk etter en del …" value={filter} onChange={e => setFilter(e.target.value)} /></div>
          <div className="table-wrap"><table><thead><tr><th>Del</th><th>Materiale</th><th>Antall</th><th>Filament</th><th><span className="sr-only">Åpne modell</span></th></tr></thead><tbody>
            {job.filter(p => (name(p) + p.id + p.print.material).toLowerCase().includes(filter.toLowerCase())).map(p => <tr key={p.id}><td><button className="part-link" onClick={() => showPart(p.id)}>{name(p)}</button></td><td>{p.print.material}</td><td>{p.qty}{p.fullQty.spare > 0 && <small>hvorav {p.fullQty.spare} i reserve</small>}</td><td>{num(slicedPartGrams(p.id,p.qty) ?? p.grams * p.qty, 1)} g<small>{slicedPartGrams(p.id,p.qty)===null ? 'CAD-estimat' : 'Inkl. støttemateriale'}</small></td><td><button className="model-link" onClick={() => showPart(p.id)} aria-label={'Se ' + name(p) + ' i 3D'}>↗</button></td></tr>)}
            {job.every(p => !(name(p) + p.id + p.print.material).toLowerCase().includes(filter.toLowerCase())) && <tr><td colSpan={5}>Ingen deler samsvarer med søket.</td></tr>}
          </tbody></table></div>
          <p className="small">Filament gjelder det oppgitte antallet. Tall fra printprogrammet inkluderer generert støtte og brim; oppstartsspyling og omprinting kan komme i tillegg. CAD-estimat brukes der printdata ikke kan fordeles på én deltype. Manglende konstruksjonsdeler er ikke med.</p>
        </section>

        <details className="disclosure"><summary><span>Beregn selve printjobben</span><span>{cost.quoteNok === null ? 'Venter på printberegning' : money(cost.quoteNok)}</span></summary>
          <p>{quote && quoteSource==='local' ? `V1-delene er beregnet lokalt med Bambu Studio ${quote.slicerVersion}, X1 Carbon, antatt 0,4 mm dyse, generiske filamentprofiler og Textured PEI-plate. Hver deltype er satt på egne plater; oppsettet er ikke optimalisert på tvers av deltyper.` : 'Legg inn vennens satser og importer de ferdig beregnede platene for hele delelisten.'}</p>
          {quote && quoteSource==='local' && <p className="small">Lag, vegger og fyll følger hver V1-del. Automatisk støtte og brim er slått på. Dette er en beregning fra printprogrammet, ikke et gjennomført print. Innstillinger, støttens tilgjengelighet og delenes passform må kontrolleres. <a href={BASE+'x1-reference-slice.json'} download>Last ned beregningsgrunnlaget ↓</a></p>}
          <div className="form-grid">{numberInput('hourly', 'Pris per time · kr')}{numberInput('setup', 'Oppsett og arbeid · kr')}{numberInput('shipping', 'Frakt · kr')}</div>
          <details className="minor-details"><summary>Filamentpriser og tillegg</summary><div className="form-grid">{['PETG', 'PLA', 'TPU'].map(m => <label key={m}>{m} · kr/kg<input type="number" min="0" value={inputs.prices[m]} onChange={e => setInputs({ ...inputs, prices: { ...inputs.prices, [m]: Math.max(0, Number(e.target.value) || 0) } })} /></label>)}{numberInput('wastePct', 'Svinn / omprinting · %')}{numberInput('vatPct', 'Ekstra avgift · %')}</div><p className="small">PETG 158 kr/kg er en innhentet referansepris inkl. mva. PLA/TPU er budsjettanslag. Ekstra avgift skal stå på 0 hvis satsene allerede inkluderer mva. Tillegget for svinn gjelder filamentet.</p></details>
          <div className="quote-import"><label>Importer printdata for hele V1-listen<input aria-label="Importer printdata" type="file" accept=".json" onChange={e => void importQuote(e.target.files?.[0])} /></label><a href={BASE + 'quote-whole-machine.json'} download>Last ned tomt skjema ↓</a></div>
          {quoteError && <p className="error" role="alert">{quoteError}</p>}
          <div className="quote-result"><div><span>PRINTJOBB MED DINE SATSER</span><strong>{cost.quoteNok === null ? 'Venter på printberegning' : money(cost.quoteNok)}</strong></div><p>{quote ? `${quote.printer} · ${num(grams, 1)} g og ${num(cost.hours!, 1)} timer. ${quoteSource==='local' ? 'Lokalt beregnet fra de leverte V1-filene.' : 'Basert på importerte tall.'} Timepris, oppsett og frakt står på ${inputs.hourly}, ${inputs.setup} og ${inputs.shipping} kr.` : 'Totalen beregnes når alle delene er med i filen fra printprogrammet. Støtte, brim og purge skal være inkludert i gram per plate.'}</p></div>
          <button className="text-button" onClick={exportQuote}>Eksporter beregningen ↓</button>
        </details>
      </>}

      {page === 'Innkjøp' && <Procurement data={data} filament={cost.materialNok}/> }

      {page === 'Bygg og tid' && <>
        <div className="page-heading"><div><span className="eyebrow">ESPEN, ELLER ESPEN OG ØYVIND SAMMEN</span><h1>Ett samlet bygg.</h1><p>Montering og oppstart gjør Espen alene, eller Espen og Øyvind sammen.</p></div></div>
        <WholeBuild grams={grams} slicedHours={cost.hours} />
        <div className="assembly-intro"><span className="project-status"><i />Monteringsguiden er under utvikling</span><p>Dette er oversikten over hele bygget. Detaljerte trinn, festemidler og koblinger kommer når den nye konstruksjonen er ferdig.</p></div>
        <ol className="build-sequence">{BUILD.map((s, i) => <li key={s.title}><span className="step-number">{String(i + 1).padStart(2, '0')}</span><div><h2>{s.title}</h2><p>{s.text}</p><small>{s.remaining}</small></div><span className="stage-status">Gjenstår</span></li>)}</ol>
        <SafetyAndPatent />
        <div className="delivery-note"><h2>Den ferdige byggepakken</h2><p>Komplett 3D-modell · alle printfiler · endelig innkjøpsliste · koblingsskjema og kode · monteringsguide · samlet pris.</p><p className="small">Hele maskinen må prøves med garn før pakken kan merkes som fungerende.</p></div>
      </>}
      <footer><span>HEKLOMAT <span className="footer-separator">/</span> Hele maskinen, del for del.</span><details className="archive"><summary>Teknisk bakgrunn og V1-filer</summary><p>Tidligere konstruksjon med {data.findings.length} registrerte åpne punkter.</p><a href={BASE + 'DESIGN-REVIEW.html'} target="_blank" rel="noreferrer">Les den tekniske gjennomgangen ↗</a><a href={BASE + 'design-review-r1.zip'} download>Last ned V1-referansefiler ↓</a></details></footer>
    </main>
  </>;
}

const root = createRoot(document.getElementById('root')!);
let active = true;
import.meta.hot?.dispose(() => { active = false; root.unmount(); });
fetch(BASE + 'manifest.json').then(r => { if (!r.ok) throw new Error('Modellgrunnlaget mangler. Kjør prototype/build.ts.'); return r.json(); })
  .then(data => { if (active) root.render(<App data={data} />); })
  .catch(e => { if (active) root.render(<p role="alert">{e.message}</p>); });
