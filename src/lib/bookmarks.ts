/**
 * Bookmarks — "this is where I put the work down".
 *
 * Two things are stored, and they are deliberately different:
 *
 *   PROGRESS  is where the counter happens to be. It moves every time you
 *             press +1 and it is saved per recipe by the zustand store.
 *   BOOKMARK  is a place you chose. It only moves when you press the button.
 *
 * The bookmark also lives in one flat index keyed the same way progress is, so
 * the gallery can say "continue Runde 6, maske 10" for every recipe you have
 * open at once without booting each recipe's store.
 *
 * There is no server behind this: each device keeps its own bookmarks. Moving
 * a place from the phone to the laptop is what `resumeHref` is for — the guide
 * already boots from ?steg=&maske=.
 */

const INDEX_KEY = 'masklab-bookmarks';

export interface StoredBookmark {
  /** Pattern id, or 'helene' / a custom-design slug — display only. */
  patternId: string;
  /** Recipe name, so the gallery need not resolve it. */
  title: string;
  /** Deep link that reopens exactly this place. */
  href: string;
  /** "Runde 6 · maske 10" */
  label: string;
  stepId: string;
  cursor: number | null;
  savedAt: number;
}

export type BookmarkIndex = Record<string, StoredBookmark>;

export function readBookmarks(): BookmarkIndex {
  if (typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(INDEX_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return parsed as BookmarkIndex;
  } catch {
    return {};
  }
}

function writeIndex(index: BookmarkIndex): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(INDEX_KEY, JSON.stringify(index));
  } catch {
    /* private mode / quota — the per-recipe store still has the bookmark */
  }
}

export function putBookmark(key: string, entry: StoredBookmark): void {
  const index = readBookmarks();
  index[key] = entry;
  writeIndex(index);
}

export function dropBookmark(key: string): void {
  const index = readBookmarks();
  if (!(key in index)) return;
  delete index[key];
  writeIndex(index);
}

/** Newest first — the order a "pick up where you left off" list wants. */
export function listBookmarks(): StoredBookmark[] {
  return Object.values(readBookmarks()).sort((a, b) => b.savedAt - a.savedAt);
}

/**
 * A link that reopens this exact place, on any device.
 * `?steg=` + `?maske=` are the guide's existing boot parameters.
 */
export function resumeHref(
  pathname: string,
  search: string,
  stepId: string,
  cursor: number | null,
): string {
  const params = new URLSearchParams(search);
  // Keep ?d= (a studio design rides along in it); drop any stale position.
  params.delete('steg');
  params.delete('maske');
  params.set('steg', stepId);
  if (cursor !== null) params.set('maske', String(cursor));
  return `${pathname}?${params.toString()}`;
}

/** "for 2 minutter siden" / "i går" — enough to tell two bookmarks apart. */
export function savedAgo(savedAt: number, locale: 'no' | 'en', now = Date.now()): string {
  const mins = Math.max(0, Math.round((now - savedAt) / 60000));
  if (mins < 1) return locale === 'en' ? 'just now' : 'nå nettopp';
  if (mins < 60) {
    return locale === 'en' ? `${mins} min ago` : `for ${mins} min siden`;
  }
  const hours = Math.round(mins / 60);
  if (hours < 24) {
    return locale === 'en'
      ? `${hours} h ago`
      : `for ${hours} ${hours === 1 ? 'time' : 'timer'} siden`;
  }
  const days = Math.round(hours / 24);
  if (days === 1) return locale === 'en' ? 'yesterday' : 'i går';
  return locale === 'en' ? `${days} days ago` : `for ${days} dager siden`;
}
