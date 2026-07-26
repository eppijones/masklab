import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Analytics } from '@vercel/analytics/react';
import { track } from '@vercel/analytics';
import './index.css';
import App from './App';
import {
  applyDeviceClass,
  applyOrientation,
  detectDeviceClass,
  readOrientation,
} from './lib/device';

// Apply before first paint so CSS [data-device] rules don't flash desktop layout.
applyDeviceClass(detectDeviceClass());
applyOrientation(readOrientation());

/** Same app on / and /helene — unique path gives a clear visit signal in Analytics. */
function Root() {
  useEffect(() => {
    const path = window.location.pathname.replace(/\/+$/, '') || '/';
    if (path === '/helene') {
      track('helene_visit', { path: '/helene' });
    }
  }, []);

  return (
    <>
      <App />
      <Analytics />
    </>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
