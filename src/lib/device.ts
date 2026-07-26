export type DeviceClass = 'phone' | 'tablet' | 'desktop';

function queryOverride(): DeviceClass | null {
  try {
    const q = new URLSearchParams(window.location.search).get('device');
    if (q === 'phone' || q === 'tablet' || q === 'desktop') return q;
  } catch {
    /* ignore */
  }
  return null;
}

/**
 * Detect phone / tablet / desktop from UA + touch + screen size.
 * Narrow desktop browser windows stay "desktop" — layout is device-class,
 * not viewport width.
 * Override with ?device=phone|tablet|desktop for tests.
 */
export function detectDeviceClass(
  nav: Pick<Navigator, 'userAgent' | 'maxTouchPoints' | 'platform'> = navigator,
  scr: Pick<Screen, 'width' | 'height'> = screen,
): DeviceClass {
  const forced = queryOverride();
  if (forced) return forced;

  const ua = nav.userAgent;
  const touch = nav.maxTouchPoints > 0 || 'ontouchstart' in globalThis;
  const minSide = Math.min(scr.width, scr.height);
  const maxSide = Math.max(scr.width, scr.height);

  const phoneUA =
    /iPhone|iPod|Windows Phone/i.test(ua) ||
    (/Android/i.test(ua) && /Mobile/i.test(ua));

  // iPadOS 13+ reports as Macintosh but has multi-touch.
  const iPad =
    /iPad/i.test(ua) ||
    (nav.platform === 'MacIntel' && nav.maxTouchPoints > 1);

  const androidTablet = /Android/i.test(ua) && !/Mobile/i.test(ua);

  if (phoneUA || (touch && minSide < 600)) return 'phone';

  let coarse = false;
  try {
    coarse = matchMedia('(pointer: coarse)').matches;
  } catch {
    /* ignore */
  }

  if (
    iPad ||
    androidTablet ||
    (touch && coarse && minSide >= 600 && maxSide < 1400)
  ) {
    return 'tablet';
  }

  return 'desktop';
}

export function applyDeviceClass(device: DeviceClass): void {
  document.documentElement.dataset.device = device;
}

export function readOrientation(): 'portrait' | 'landscape' {
  if (typeof window === 'undefined') return 'landscape';
  try {
    const q = new URLSearchParams(window.location.search).get('orientation');
    if (q === 'portrait' || q === 'landscape') return q;
  } catch {
    /* ignore */
  }
  return window.innerHeight >= window.innerWidth ? 'portrait' : 'landscape';
}

export function applyOrientation(orientation: 'portrait' | 'landscape'): void {
  document.documentElement.dataset.orientation = orientation;
}
