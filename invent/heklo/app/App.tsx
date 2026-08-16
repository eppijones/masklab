import { useCallback, useSyncExternalStore } from 'react';
import { TwinPage } from './TwinPage.tsx';
import { PatentPage } from './PatentPage.tsx';
import { GuidePage } from './GuidePage.tsx';
import { ProofPage } from './ProofPage.tsx';

export const ROUTES = [
  { id: 'twin', title: '3D twin', kicker: '01' },
  { id: 'patent', title: 'Patent', kicker: '02' },
  { id: 'guide', title: 'IKEA guide', kicker: '03' },
  { id: 'proof', title: 'Proof & BOM', kicker: '04' },
] as const;

export type RouteId = (typeof ROUTES)[number]['id'];

function subscribe(cb: () => void) {
  window.addEventListener('hashchange', cb);
  return () => window.removeEventListener('hashchange', cb);
}

function getHash(): RouteId {
  const raw = window.location.hash.replace(/^#\/?/, '') || 'twin';
  return ROUTES.some((r) => r.id === raw) ? (raw as RouteId) : 'twin';
}

export function App() {
  const route = useSyncExternalStore(subscribe, getHash, () => 'twin' as RouteId);
  const go = useCallback((id: RouteId) => {
    window.location.hash = `/${id}`;
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="hk-shell" data-route={route}>
      <header className="hk-top">
        <a className="hk-mark" href="#/twin" onClick={(e) => (e.preventDefault(), go('twin'))}>
          <span className="hk-mark-word">HEKLO</span>
          <span className="hk-mark-sub">Gate-chain crochet engine</span>
        </a>
        <nav className="hk-nav">
          {ROUTES.map((r) => (
            <button
              key={r.id}
              type="button"
              className="hk-navbtn"
              data-on={r.id === route ? 1 : 0}
              onClick={() => go(r.id)}
            >
              <span className="hk-kicker">{r.kicker}</span>
              {r.title}
            </button>
          ))}
        </nav>
        <div className="hk-port">localhost:5373</div>
      </header>
      <main className="hk-main">
        {route === 'twin' && <TwinPage />}
        {route === 'patent' && <PatentPage />}
        {route === 'guide' && <GuidePage />}
        {route === 'proof' && <ProofPage />}
      </main>
    </div>
  );
}
