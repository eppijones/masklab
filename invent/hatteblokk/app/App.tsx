import { useSyncExternalStore, useCallback } from 'react';
import { SECTIONS } from './sections.tsx';

/* Hash routing, not pathname routing. The parent app leans on a vercel.json rewrite that
   we are not allowed to add anywhere, and hashes make invent/dist/index.html work from
   file://, from a plain static server, and from any subpath, unchanged. */
function subscribe(cb: () => void) {
  window.addEventListener('hashchange', cb);
  return () => window.removeEventListener('hashchange', cb);
}
function getHash() {
  return window.location.hash.replace(/^#\/?/, '') || 'overview';
}

export function App() {
  const route = useSyncExternalStore(subscribe, getHash, () => 'overview');
  const go = useCallback((id: string) => {
    window.location.hash = `/${id}`;
    window.scrollTo(0, 0);
  }, []);

  const idx = Math.max(0, SECTIONS.findIndex((s) => s.id === route));
  const section = SECTIONS[idx];
  const prev = SECTIONS[idx - 1];
  const next = SECTIONS[idx + 1];

  let lastGroup = '';

  return (
    <div className="iv-shell">
      <nav className="iv-rail">
        <div className="iv-brand">
          <span className="iv-wordmark">
            HATTEBLOKK<span>*</span>
          </span>
          <small>Automatisert hekling · R&amp;D</small>
        </div>
        {SECTIONS.map((s) => {
          const head = s.group !== lastGroup ? ((lastGroup = s.group), s.group) : null;
          return (
            <div key={s.id}>
              {head && <div className="iv-navgroup">{head}</div>}
              <button className="iv-navlink" data-on={s.id === route ? 1 : 0} onClick={() => go(s.id)}>
                <span className="iv-navnum">{s.n}</span>
                <span>{s.title}</span>
              </button>
            </div>
          );
        })}
        <div className="iv-navgroup">Kilde</div>
        <div style={{ padding: '0 22px', fontSize: 12, color: 'var(--iv-faint)', lineHeight: 1.6 }}>
          Avledet fra StrikkeApp sitt eget mønster&shy;datasett. Ingenting utenfor <code>invent/</code>{' '}
          er endret.
        </div>
      </nav>

      <main className="iv-main">
        <div className={section.full ? 'iv-wrap wide' : 'iv-wrap'}>
          <section.Component />
          {!section.full && (
            <div className="iv-foot">
              {prev ? (
                <button className="iv-btn" onClick={() => go(prev.id)}>
                  ← {prev.title}
                </button>
              ) : (
                <span />
              )}
              {next && (
                <button className="iv-btn primary" onClick={() => go(next.id)}>
                  {next.title} →
                </button>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
