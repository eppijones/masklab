import { useApp, getModel, getActivePatternId } from '../store';
import HatScene from './HatScene';
import LanguageSwitcher from './LanguageSwitcher';
import { useDeviceClass } from '../hooks/useDeviceClass';
import { t } from '../i18n/ui';
import { welcomeCopy } from '../data/guideCopy';

/**
 * Pattern-aware welcome screen before the guide.
 * Resume reads the same zustand-persist key for this pattern.
 */
export default function WelcomeScreen() {
  const device = useDeviceClass();
  const locale = useApp((s) => s.locale);
  const ui = t(locale);
  const setWelcomeDone = useApp((s) => s.setWelcomeDone);
  const setStep = useApp((s) => s.setStep);
  const setShowFinished = useApp((s) => s.setShowFinished);
  const setViewMode = useApp((s) => s.setViewMode);
  const stepIndex = useApp((s) => s.stepIndex);
  const cursors = useApp((s) => s.cursors);
  const patternId = getActivePatternId();
  const copy = welcomeCopy(patternId, locale);

  const hasProgress = stepIndex > 0 || Object.keys(cursors).length > 0;

  const enter = (resume: boolean) => {
    if (!resume) {
      setStep(0);
      setShowFinished(false);
      setViewMode('working');
    } else {
      const step = getModel().steps[useApp.getState().stepIndex];
      const finale = step?.kind === 'finish' || step?.kind === 'done';
      setShowFinished(finale);
      setViewMode(finale ? 'finished' : 'working');
      if (finale) useApp.getState().setAutoRotate(true);
    }
    setWelcomeDone(true);
  };

  const stepCount = getModel().steps.length;

  const cta = (
    <div className="welcome-cta">
      <button type="button" className="welcome-start" onClick={() => enter(false)}>
        {ui.welcomeStart}
      </button>
      {hasProgress && (
        <button type="button" className="welcome-resume" onClick={() => enter(true)}>
          {ui.welcomeResume}
        </button>
      )}
    </div>
  );

  return (
    <div className="welcome">
      <header className="welcome-top">
        <div className="brand">
          <div className="dots">
            <span style={{ background: '#BA0C2F' }} />
            <span style={{ background: '#FDFAF3', border: '1px solid #D8CFBC' }} />
            <span style={{ background: '#00205B' }} />
          </div>
          <span className="welcome-brand">
            {copy.brandWelcome} <span>{copy.brandBy}</span>
          </span>
        </div>
        <div className="welcome-top-right">
          <LanguageSwitcher />
          <a className="welcome-pdf" href="/oppskrifter">
            {locale === 'en' ? 'All patterns' : 'Alle oppskrifter'}
          </a>
          {copy.pdfUrl && (
            <a
              className="welcome-pdf"
              href={copy.pdfUrl}
              target="_blank"
              rel="noreferrer"
            >
              {ui.welcomePdf}
            </a>
          )}
        </div>
      </header>

      <main className="welcome-hero">
        <section className="welcome-intro">
          <p className="welcome-eyebrow">{ui.welcomeEyebrow}</p>
          <h1>
            {ui.welcomeTitle1}
            <br />
            {ui.welcomeTitle2Before}
            <em>{copy.titleEm}</em>
            {ui.welcomeTitle2After}
          </h1>
          <p className="welcome-lede">{copy.lede}</p>
          {cta}
          <p className="welcome-fine">{ui.welcomeFine(stepCount)}</p>
        </section>

        <aside
          className="welcome-aside"
          aria-label={locale === 'en' ? 'Finished hat in 3D' : 'Ferdig hatt i 3D'}
        >
          <div className="welcome-stage">
            <HatScene preview device={device} />
          </div>
        </aside>
      </main>

      <footer className="welcome-foot">
        <p>
          {ui.welcomeFoot}{' '}
          {copy.footUrl ? (
            <a href={copy.footUrl} target="_blank" rel="noreferrer">
              {copy.footName}
            </a>
          ) : (
            copy.footName
          )}
        </p>
      </footer>

      <div className="welcome-mobile-bar">{cta}</div>
    </div>
  );
}
