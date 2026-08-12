import { isPatternId, type PatternId } from '../patterns/types';

/** Path without trailing slash; "/" for root. */
export function appPath(): string {
  if (typeof window === 'undefined') return '/';
  return window.location.pathname.replace(/\/+$/, '') || '/';
}

export function isHeleneEntry(): boolean {
  return appPath() === '/helene';
}

export function isStudioEntry(): boolean {
  return appPath() === '/studio';
}

/** /oppskrift/:patternId — the guided app for one pattern. */
export function guidePathPatternId(): PatternId | null {
  const m = appPath().match(/^\/oppskrift\/([^/]+)$/);
  if (!m || !isPatternId(m[1])) return null;
  // 'custom' is a real guide only when a studio design rides along in ?d=.
  if (m[1] === 'custom') return hasCustomDesignCode() ? 'custom' : null;
  return m[1];
}

/** Studio share code on the URL (?d=…) — the payload behind /oppskrift/custom. */
export function customDesignCode(): string | null {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get('d');
}

function hasCustomDesignCode(): boolean {
  return (customDesignCode() ?? '').length > 0;
}

/**
 * Is this URL a guided-app entry?
 * /helene, /oppskrift/:id, and the legacy deep links /?steg=… and /?pattern=…
 */
export function isGuideEntry(): boolean {
  if (isHeleneEntry() || guidePathPatternId() !== null) return true;
  if (appPath() !== '/') return false;
  const params = new URLSearchParams(window.location.search);
  return params.has('steg') || params.has('pattern');
}

/**
 * Active pattern for the guided app:
 * path (/oppskrift/:id) wins, then legacy ?pattern=, default ro-ro-ro.
 */
export function patternIdFromUrl(): PatternId {
  if (typeof window === 'undefined') return 'ro-ro-ro';
  const fromPath = guidePathPatternId();
  if (fromPath) return fromPath;
  if (appPath() === '/oppskrift/custom') return 'custom';
  const raw = new URLSearchParams(window.location.search).get('pattern');
  if (raw && isPatternId(raw) && raw !== 'custom') return raw;
  return 'ro-ro-ro';
}

/**
 * Per-pattern persist keys. The two legacy keys are kept EXACTLY:
 *  - RO at / and /oppskrift/ro-ro-ro → 'robo-hatt-progress-4mm'
 *  - /helene → 'robo-hatt-progress-4mm-helene'
 * so nobody loses saved progress in the relaunch.
 */
export function progressStorageKey(): string {
  if (isHeleneEntry()) return 'robo-hatt-progress-4mm-helene';
  const pid = patternIdFromUrl();
  if (pid === 'custom') {
    // One progress slot per design, so two of your own hats don't share a count.
    return `robo-hatt-progress-custom-${shortHash(customDesignCode() ?? '')}`;
  }
  return pid === 'ro-ro-ro'
    ? 'robo-hatt-progress-4mm'
    : `robo-hatt-progress-4mm-${pid}`;
}

/** Stable 32-bit hash → base36, for per-design storage keys. */
export function shortHash(s: string): string {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

export function hasSavedProgress(state: {
  stepIndex: number;
  cursors: Record<string, number>;
}): boolean {
  return state.stepIndex > 0 || Object.keys(state.cursors).length > 0;
}

// Re-export type helper for consumers that imported PatternId from types via entry
export type { PatternId };
