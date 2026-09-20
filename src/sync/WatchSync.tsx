import { useEffect, useState } from 'react';
import { getActivePatternId, getModel, useApp } from '../store';
import { validPosition, type Position, type Snapshot } from './protocol';

type Pending = { position: Position; operationId: string; revision: number };
type Link = { token: string; revision: number; pending?: Pending; inFlight?: Pending; code?: string; codeExpiresAt?: number };
const KEY = 'masklab-watch-sync-v1';
function load(): Link | null { try { return JSON.parse(localStorage.getItem(KEY) ?? 'null'); } catch { return null; } }
let link = load();
// Older clients did not store expiry; never keep showing a possibly consumed code.
if (link?.code && !link.codeExpiresAt) delete link.code;
let applying = false;
let busy = false;
let watchConflict = false;
let watchLastSeen: number | null = null;
let conflict: Snapshot | null = null;
let status = link ? 'Kobler til…' : 'Koble til klokke';
const listeners = new Set<() => void>();
function changed() { if (link) localStorage.setItem(KEY, JSON.stringify(link)); else localStorage.removeItem(KEY); listeners.forEach(fn => fn()); }
function position(): Position | null {
  const s = useApp.getState(); const m = getModel(); const step = m.steps[s.stepIndex];
  if (getActivePatternId() !== 'ro-ro-ro' || step?.kind !== 'round' || step.roundIdx === null || s.stitchCursor === null) return null;
  return { patternId: 'ro-ro-ro', round: m.rounds[step.roundIdx].num, completed: s.stitchCursor };
}
function apply(state: Snapshot) {
  if (!validPosition(state.position)) throw new Error('Ugyldig posisjon');
  const m = getModel(); const index = m.steps.findIndex(st => st.kind === 'round' && st.roundIdx !== null && m.rounds[st.roundIdx].num === state.position.round);
  if (index < 0) return;
  applying = true;
  const step = m.steps[index];
  useApp.setState(s => ({ stepIndex: index, stitchCursor: state.position.completed,
    cursors: { ...s.cursors, [step.id]: state.position.completed }, showFinished: false, autoRotate: false, viewMode: 'working' }));
  applying = false;
}
async function request(body: object, token?: string) {
  const r = await fetch('/api/sync', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body), signal: AbortSignal.timeout(8000) });
  const data = await r.json() as { token?: string; code?: string; state: Snapshot; watchLastSeen?: number | null; watchConflict?: boolean; error?: string };
  if (!r.ok && r.status !== 409) throw new Error(data.error ?? 'Frakoblet');
  return { ...data, conflict: r.status === 409 };
}
async function tick() {
  if (!link || busy || conflict || getActivePatternId() !== 'ro-ro-ro') return;
  busy = true; const connection = link; const sent = link.inFlight ?? link.pending;
  if (sent) { link.inFlight = sent; changed(); }
  try {
    const data = await request(sent ? { action: 'set', ...sent, source: 'web' } : { action: 'get' }, connection.token);
    if (link !== connection) return;
    watchLastSeen = data.watchLastSeen ?? null;
    watchConflict = data.watchConflict ?? false;
    if (watchLastSeen) { delete link.code; delete link.codeExpiresAt; }
    if (data.conflict) { conflict = data.state; status = 'To ulike posisjoner – velg'; }
    else {
      link.revision = data.state.revision;
      if (sent) {
        delete link.inFlight;
        if (link.pending?.operationId === sent.operationId) delete link.pending;
        else if (link.pending) link.pending.revision = data.state.revision;
      }
      // A local edit made while GET was in flight must never be overwritten.
      if (!link.pending) apply(data.state);
      else if (!sent && link.pending.revision !== data.state.revision) { conflict = data.state; }
      status = conflict ? 'To ulike posisjoner – velg' : link.pending ? 'Sender…' : 'Lagret i synk';
    }
  } catch (e) { status = `Frakoblet · ${e instanceof Error ? e.message : 'prøver igjen'}`; }
  finally { busy = false; changed(); }
  if (link === connection && link?.pending && !link.inFlight && !conflict) void tick();
}
export default function WatchSync() {
  const [, redraw] = useState(0); const [open, setOpen] = useState(false);
  useEffect(() => {
    const refresh = () => redraw(n => n + 1); listeners.add(refresh);
    const unsubscribe = useApp.subscribe((state, old) => {
      if (applying || !link || (state.stepIndex === old.stepIndex && state.stitchCursor === old.stitchCursor)) return;
      const p = position(); if (!p) return;
      link.pending = { position: p, operationId: crypto.randomUUID(), revision: link.pending?.revision ?? link.revision };
      status = 'Sender…'; changed(); void tick();
    });
    const interval = window.setInterval(() => { if (!document.hidden) void tick(); }, 500);
    void tick();
    return () => { listeners.delete(refresh); unsubscribe(); clearInterval(interval); };
  }, []);
  if (getActivePatternId() !== 'ro-ro-ro') return null;
  async function connect() {
    const p = position(); if (!p) { status = 'Velg en hatterunde først'; changed(); return; }
    try {
      const data = await request({ action: 'create', position: p });
      if (!data.token) throw new Error('Mangler parkobling');
      link = { token: data.token, revision: data.state.revision, code: data.code, codeExpiresAt: Date.now() + 600000 };
      status = 'Skriv koden på klokka'; changed();
    } catch (e) { status = e instanceof Error ? e.message : 'Kunne ikke koble til'; changed(); }
  }
  function resolve(useLocal: boolean) {
    if (!link || !conflict) return;
    link.revision = conflict.revision; delete link.inFlight;
    if (useLocal) { const p = position(); if (!p) return; link.pending = { position: p, operationId: crypto.randomUUID(), revision: conflict.revision }; }
    else { delete link.pending; apply(conflict); }
    conflict = null; changed(); void tick();
  }
  const online = watchLastSeen !== null && Date.now() - watchLastSeen < 20000;
  const p = position();
  return <div style={{ position: 'relative' }}>
    <button className="tool-btn" style={{ width: 44, height: 44, padding: 10, position: 'relative' }} onClick={() => setOpen(!open)} aria-label="Klokkesynk" title="Klokkesynk" aria-expanded={open}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="3"/><path d="M9 6V2h6v4M9 18v4h6v-4M12 9v3l2 1"/></svg>
      {link && <span aria-hidden="true" style={{ position: 'absolute', right: 5, top: 5, width: 7, height: 7, borderRadius: '50%', background: online && !conflict && !watchConflict ? '#287356' : '#ba882f' }} />}
    </button>
    {open && <section aria-label="Klokkesynk" style={{ position: 'absolute', right: 0, top: '100%', width: 'min(330px, 90vw)', padding: 18, background: '#fdfaf3', border: '1px solid #d8cfbc', borderRadius: 12, zIndex: 100 }}>
      <strong>Klokke og oppskrift</strong><p role="status">{conflict ? status : watchConflict ? 'Velg posisjon på klokka for å fortsette' : online ? 'Klokka er aktiv · synk begge veier' : link ? 'Venter på klokka' : 'Koble til klokka'}</p>
      {p && <p>Runde {p.round} · {p.completed} ferdige<br/>Neste maske: {p.completed + 1}</p>}
      {link && !online && <p>Åpne Masketeller på klokka. Har du allerede tastet koden, trenger du ikke en ny.</p>}
      {status.startsWith('Frakoblet') && <p>{status}</p>}
      {!link && <><p>Del denne posisjonen med klokka. Råopptak blir på klokka.</p><button className="btn prev" style={{ width: '100%', marginTop: 8 }} onClick={() => void connect()}>Lag parkoblingskode</button></>}
      {link?.code && (!link.codeExpiresAt || link.codeExpiresAt > Date.now()) && <p>Kode: <strong style={{ letterSpacing: 3, fontSize: 24 }}>{link.code}</strong><br/>På klokka: Innstillinger → Koble til nettsiden → Fortsett fra nettsiden. Koden varer i 10 minutter.</p>}
      {link?.codeExpiresAt && link.codeExpiresAt <= Date.now() && <p>Koden er utløpt. Koble fra her og lag en ny kode.</p>}
      {conflict && <><p>Den andre enheten: runde {conflict.position.round}, {conflict.position.completed} ferdige. Lokale endringer er bevart.</p><button className="btn prev" style={{ width: '100%', marginTop: 8 }} onClick={() => resolve(false)}>Bruk den andre posisjonen</button><button className="btn prev" style={{ width: '100%', marginTop: 8 }} onClick={() => resolve(true)}>Bruk posisjonen her</button></>}
      {link && <><p>Endringer går begge veier når enhetene har nett. Ved frakobling beholdes fremdriften lokalt.</p><button className="btn prev" style={{ width: '100%', marginTop: 8 }} onClick={() => { link = null; conflict = null; status = 'Koble til klokke'; changed(); }}>Koble fra her</button></>}
    </section>}
  </div>;
}
