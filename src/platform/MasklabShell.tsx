import { useState, type ReactNode, type MouseEvent } from 'react';
import { navigate, usePath } from '../lib/router';
import { HELENE_URL } from './catalog';
import './platform.css';

/**
 * Shared MASKLAB chrome: sticky top nav (wordmark, Oppskrifter / Kolleksjonen
 * / Studio, Del button) + footer. Platform pages navigate client-side;
 * guides and the studio load fully so their boot-time state stays exact.
 */

function NavLink({
  to,
  children,
  full = false,
}: {
  to: string;
  children: ReactNode;
  full?: boolean;
}) {
  const path = usePath();
  const active = path === to;
  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (full) return; // full page load (studio, guides)
    e.preventDefault();
    navigate(to);
  };
  return (
    <a
      href={to}
      onClick={onClick}
      className={`ml-navlink ${active ? 'active' : ''}`}
    >
      {children}
    </a>
  );
}

function Wordmark({ size = 22 }: { size?: number }) {
  return (
    <span className="ml-wordmark" style={{ fontSize: size }}>
      MASKLAB<span className="ml-star">*</span>
    </span>
  );
}

export function MasklabTopNav() {
  const [copied, setCopied] = useState(false);
  const del = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable */
    }
  };
  return (
    <div className="ml-topnav">
      <a
        href="/"
        className="ml-home"
        onClick={(e) => {
          e.preventDefault();
          navigate('/');
        }}
      >
        <Wordmark />
      </a>
      <nav className="ml-navlinks">
        <NavLink to="/oppskrifter">Oppskrifter</NavLink>
        <NavLink to="/kolleksjon">Kolleksjonen</NavLink>
        <NavLink to="/studio" full>
          Studio
        </NavLink>
      </nav>
      <button type="button" className="ml-del" onClick={del}>
        {copied ? 'Kopiert!' : 'Del'}
      </button>
    </div>
  );
}

export function MasklabFooter() {
  return (
    <footer className="ml-footer">
      <div className="ml-footer-brand">
        <Wordmark size={19} />
        <span className="ml-footer-tag">
          Design den i studio. Se den i 3D. Få oppskriften.
        </span>
      </div>
      <div className="ml-footer-cols">
        <div className="ml-footer-col">
          <span className="ml-footer-head">Utforsk</span>
          <a
            href="/oppskrifter"
            onClick={(e) => {
              e.preventDefault();
              navigate('/oppskrifter');
            }}
          >
            Oppskrifter
          </a>
          <a
            href="/kolleksjon"
            onClick={(e) => {
              e.preventDefault();
              navigate('/kolleksjon');
            }}
          >
            Kolleksjonen
          </a>
          <a href="/studio">Studio</a>
        </div>
        <div className="ml-footer-col wide">
          <span className="ml-footer-head">Kreditering</span>
          <span className="ml-footer-credit">
            Ro det i land, Flagget til topps og Vi som elsker Martin er design
            av{' '}
            <a href={HELENE_URL} target="_blank" rel="noopener noreferrer">
              Helene Spilling
            </a>
            , til inntekt for Barnekreftforeningen.
          </span>
        </div>
      </div>
      <span className="ml-footer-copy">© MASKLAB 2026 · Oslo</span>
    </footer>
  );
}

export default function MasklabShell({ children }: { children: ReactNode }) {
  return (
    <div className="ml-shell">
      <MasklabTopNav />
      <div className="ml-content">{children}</div>
      <MasklabFooter />
    </div>
  );
}
