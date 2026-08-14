import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Analytics } from '@vercel/analytics/react';
import { track } from '@vercel/analytics';
import './index.css';
import App from './App';
import StudioApp from './studio/StudioApp';
import MasklabShell, { MasklabTopNav } from './platform/MasklabShell';
import LandingPage from './platform/LandingPage';
import GalleryPage from './platform/GalleryPage';
import CollectionPage from './platform/CollectionPage';
import {
  applyDeviceClass,
  applyOrientation,
  detectDeviceClass,
  readOrientation,
} from './lib/device';
import {
  customDesignCode,
  isGuideEntry,
  isHeleneEntry,
  isStudioEntry,
  patternIdFromUrl,
} from './lib/entry';
import { usePath } from './lib/router';
import { registerModel, setActivePatternId } from './store';
import { isPatternId } from './patterns/types';
import { decodeDesign } from './studio/serialize';
import { designModel } from './studio/design';

// Apply before first paint so CSS [data-device] rules don't flash desktop layout.
applyDeviceClass(detectDeviceClass());
applyOrientation(readOrientation());
// Platform pages need document scroll; guide/studio keep a fixed viewport.
document.documentElement.dataset.app =
  isGuideEntry() || isHeleneEntry()
    ? 'guide'
    : isStudioEntry()
      ? 'studio'
      : 'platform';

/** Legacy deep links: /?steg=… and /?pattern=x → /oppskrift/:id preserving query. */
function applyLegacyRedirects(): void {
  if (typeof window === 'undefined') return;
  const path = window.location.pathname.replace(/\/+$/, '') || '/';
  if (path !== '/') return;
  const params = new URLSearchParams(window.location.search);
  const pattern = params.get('pattern');
  const steg = params.get('steg');
  if (!pattern && !steg) return;
  const id =
    pattern && isPatternId(pattern) && pattern !== 'custom'
      ? pattern
      : 'ro-ro-ro';
  const next = new URLSearchParams(params);
  next.delete('pattern');
  const qs = next.toString();
  const dest = `/oppskrift/${id}${qs ? `?${qs}` : ''}`;
  window.history.replaceState(null, '', dest);
}

applyLegacyRedirects();
setActivePatternId(patternIdFromUrl());

/**
 * /oppskrift/custom?d=… — a design made in the studio. The model is built and
 * registered before the first render so the guide runs on it exactly like a
 * published pattern. A code that will not decode falls back to the studio.
 */
let customTitle: string | null = null;
if (patternIdFromUrl() === 'custom') {
  const design = decodeDesign(customDesignCode() ?? '');
  if (design) {
    registerModel(designModel(design, 'no'), 'no', 'custom');
    registerModel(designModel(design, 'en'), 'en', 'custom');
    customTitle = design.title;
  } else if (typeof window !== 'undefined') {
    window.location.replace('/studio');
  }
}

function PlatformRouter() {
  const path = usePath();
  if (path === '/oppskrifter') return <GalleryPage />;
  if (path === '/kolleksjon') return <CollectionPage />;
  return <LandingPage />;
}

function Root() {
  // Subscribing to the path here (not just inside PlatformRouter) is what makes
  // leaving the studio work: a client-side /studio → /oppskrifter has to
  // re-render Root, or the studio stays mounted under a platform URL.
  const path = usePath();
  const guide = isGuideEntry() || isHeleneEntry();
  const studio = isStudioEntry();

  useEffect(() => {
    document.documentElement.dataset.app = guide
      ? 'guide'
      : studio
        ? 'studio'
        : 'platform';
    if (path === '/helene') {
      track('helene_visit', { path: '/helene' });
    }
    document.title = studio
      ? 'MASKLAB Studio'
      : guide
        ? `${customTitle ?? patternIdFromUrl()} — MASKLAB`
        : 'MASKLAB* — Interaktive 3D-heklemønstre';
  }, [guide, studio, path]);

  if (guide) {
    return (
      <>
        <App />
        <Analytics />
      </>
    );
  }

  if (studio) {
    return (
      <div className="ml-shell">
        <MasklabTopNav />
        <div className="ml-content">
          <StudioApp />
        </div>
        <Analytics />
      </div>
    );
  }

  return (
    <>
      <MasklabShell>
        <PlatformRouter />
      </MasklabShell>
      <Analytics />
    </>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
