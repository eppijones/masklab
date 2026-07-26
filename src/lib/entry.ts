/** Path without trailing slash; "/" for root. */
export function appPath(): string {
  if (typeof window === 'undefined') return '/';
  return window.location.pathname.replace(/\/+$/, '') || '/';
}

export function isHeleneEntry(): boolean {
  return appPath() === '/helene';
}

/** Separate persist so /helene never inherits progress from / (or vice versa). */
export function progressStorageKey(): string {
  return isHeleneEntry()
    ? 'robo-hatt-progress-4mm-helene'
    : 'robo-hatt-progress-4mm';
}

export function hasSavedProgress(state: {
  stepIndex: number;
  cursors: Record<string, number>;
}): boolean {
  return state.stepIndex > 0 || Object.keys(state.cursors).length > 0;
}
