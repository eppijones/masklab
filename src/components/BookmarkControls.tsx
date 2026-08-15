import { useEffect, useState } from 'react';
import { useApp, getModel, getActivePatternId } from '../store';
import { resumeHref, savedAgo } from '../lib/bookmarks';
import { getPattern } from '../patterns/registry';
import { t } from '../i18n/ui';
import type { Locale } from '../i18n/locale';

/**
 * The bookmark: press it and this exact stitch is where the app opens next
 * time. Progress already saves itself, but progress is wherever the counter
 * drifted to — a bookmark is a place you chose, which is what you want after
 * putting the work down mid-round on one device and picking it up on another.
 */

function BookmarkIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
      <path
        d="M6.5 3.8 H17.5 A0.9 0.9 0 0 1 18.4 4.7 V20.4 L12 16.2 L5.6 20.4 V4.7 A0.9 0.9 0 0 1 6.5 3.8 Z"
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * The recipe's own name, not the collection kicker: three NORWAY'26 hats all
 * answer to "NORWAY'26", and a resume list of three identical names is no list.
 */
function recipeTitle(locale: Locale): string {
  const def = getPattern(getActivePatternId());
  return locale === 'en' ? def.title : def.titleNo;
}

/** Is the counter sitting exactly on the bookmark right now? */
function useOnBookmark(): boolean {
  const bookmark = useApp((s) => s.bookmark);
  const stepIndex = useApp((s) => s.stepIndex);
  const cursor = useApp((s) => s.stitchCursor);
  if (!bookmark) return false;
  const step = getModel().steps[stepIndex];
  if (!step || step.id !== bookmark.stepId) return false;
  return (bookmark.cursor ?? null) === (cursor ?? null);
}

export function BookmarkButton({ compact = false }: { compact?: boolean }) {
  const locale = useApp((s) => s.locale);
  const ui = t(locale);
  const bookmark = useApp((s) => s.bookmark);
  const save = useApp((s) => s.saveBookmark);
  const clear = useApp((s) => s.clearBookmark);
  const onBookmark = useOnBookmark();
  const [flash, setFlash] = useState<'saved' | 'cleared' | null>(null);

  useEffect(() => {
    if (!flash) return;
    const id = setTimeout(() => setFlash(null), 1900);
    return () => clearTimeout(id);
  }, [flash]);

  const title = onBookmark
    ? ui.bookmarkRemove
    : bookmark
      ? ui.bookmarkMove
      : ui.bookmarkSave;

  return (
    <span className="bookmark-btn-wrap">
      <button
        type="button"
        className={`icon-btn bookmark-btn ${bookmark ? 'has' : ''} ${
          onBookmark ? 'on' : ''
        } ${compact ? 'compact' : ''}`}
        onClick={() => {
          if (onBookmark) {
            clear();
            setFlash('cleared');
            return;
          }
          save(recipeTitle(locale));
          setFlash('saved');
        }}
        title={title}
        aria-label={title}
        aria-pressed={onBookmark}
      >
        <BookmarkIcon filled={onBookmark} />
      </button>
      <span className="bookmark-flash-live" role="status" aria-live="polite">
        {flash === 'saved' ? ui.bookmarkSaved : flash === 'cleared' ? ui.bookmarkCleared : ''}
      </span>
      {flash && (
        <span className={`bookmark-flash ${flash}`} aria-hidden>
          {flash === 'saved' ? ui.bookmarkSaved : ui.bookmarkCleared}
        </span>
      )}
    </span>
  );
}

/**
 * Shown whenever a bookmark exists somewhere other than here: the jump back,
 * plus the link that carries the place to another device (there is no account
 * behind this, so the URL is the transport).
 */
export function BookmarkPill() {
  const locale = useApp((s) => s.locale);
  const ui = t(locale);
  const bookmark = useApp((s) => s.bookmark);
  const goTo = useApp((s) => s.goToBookmark);
  const onBookmark = useOnBookmark();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const id = setTimeout(() => setCopied(false), 2200);
    return () => clearTimeout(id);
  }, [copied]);

  if (!bookmark || onBookmark) return null;

  const copyLink = async () => {
    const url = `${window.location.origin}${resumeHref(
      window.location.pathname,
      window.location.search,
      bookmark.stepId,
      bookmark.cursor,
    )}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      // Clipboard blocked (http origin, older Safari): show it to copy by hand.
      window.prompt(ui.bookmarkCopyManual, url);
    }
  };

  return (
    <div className="return-pill-bar bookmark-bar">
      <button type="button" className="return-pill bookmark-pill" onClick={goTo}>
        <span className="bookmark-pill-icon" aria-hidden>
          <BookmarkIcon filled />
        </span>
        {ui.bookmarkGoTo(bookmark.label)}
        <span className="bookmark-pill-ago">{savedAgo(bookmark.savedAt, locale)}</span>
      </button>
      <button
        type="button"
        className="return-pill bookmark-copy"
        onClick={copyLink}
        title={ui.bookmarkCopyTitle}
      >
        {copied ? ui.bookmarkCopied : ui.bookmarkCopy}
      </button>
    </div>
  );
}
