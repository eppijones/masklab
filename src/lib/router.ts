import { useSyncExternalStore } from 'react';

/**
 * Tiny dependency-free path router for the MASKLAB platform pages
 * (/, /oppskrifter, /kolleksjon). Guides and the studio are entered via full
 * page loads so their boot-time state (progress keys, pattern id) stays exact.
 */

const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

if (typeof window !== 'undefined') {
  window.addEventListener('popstate', emit);
}

function currentPath(): string {
  if (typeof window === 'undefined') return '/';
  return window.location.pathname.replace(/\/+$/, '') || '/';
}

/** Client-side navigation between platform pages. */
export function navigate(path: string) {
  window.history.pushState(null, '', path);
  window.scrollTo(0, 0);
  emit();
}

export function usePath(): string {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    currentPath,
    () => '/',
  );
}
