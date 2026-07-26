import { useApp } from '../store';
import type { Locale } from '../i18n/locale';
import { t } from '../i18n/ui';

function FlagNo() {
  return (
    <svg viewBox="0 0 22 16" width="22" height="16" aria-hidden className="lang-flag">
      <rect width="22" height="16" fill="#BA0C2F" rx="2" />
      <rect x="6" width="4" height="16" fill="#FDFAF3" />
      <rect y="6" width="22" height="4" fill="#FDFAF3" />
      <rect x="7" width="2" height="16" fill="#00205B" />
      <rect y="7" width="22" height="2" fill="#00205B" />
    </svg>
  );
}

function FlagEn() {
  return (
    <svg viewBox="0 0 22 16" width="22" height="16" aria-hidden className="lang-flag">
      <rect width="22" height="16" fill="#012169" rx="2" />
      <path d="M0 0 L22 16 M22 0 L0 16" stroke="#FDFAF3" strokeWidth="3" />
      <path d="M0 0 L22 16 M22 0 L0 16" stroke="#C8102E" strokeWidth="1.4" />
      <rect x="9" width="4" height="16" fill="#FDFAF3" />
      <rect y="6" width="22" height="4" fill="#FDFAF3" />
      <rect x="10" width="2" height="16" fill="#C8102E" />
      <rect y="7" width="22" height="2" fill="#C8102E" />
    </svg>
  );
}

/** Compact NO / EN language toggle with flags. */
export default function LanguageSwitcher({ className = '' }: { className?: string }) {
  const locale = useApp((s) => s.locale);
  const setLocale = useApp((s) => s.setLocale);
  const ui = t(locale);

  const set = (next: Locale) => {
    if (next === locale) return;
    setLocale(next);
    document.documentElement.lang = next === 'en' ? 'en' : 'no';
  };

  return (
    <div className={`lang-switch ${className}`} role="group" aria-label={ui.langGroup}>
      <button
        type="button"
        className={`lang-btn ${locale === 'no' ? 'on' : ''}`}
        onClick={() => set('no')}
        title={ui.langNo}
        aria-pressed={locale === 'no'}
      >
        <FlagNo />
        <span>NO</span>
      </button>
      <button
        type="button"
        className={`lang-btn ${locale === 'en' ? 'on' : ''}`}
        onClick={() => set('en')}
        title={ui.langEn}
        aria-pressed={locale === 'en'}
      >
        <FlagEn />
        <span>EN</span>
      </button>
    </div>
  );
}
