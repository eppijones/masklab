import { useApp, getModel } from '../store';
import HatScene from './HatScene';
import LanguageSwitcher from './LanguageSwitcher';
import { useDeviceClass } from '../hooks/useDeviceClass';
import { t } from '../i18n/ui';

const PDF_URL =
  'https://helenespilling.com/wp-content/uploads/2026/06/RO-DET-I-LAND-HATTEN.pdf';
const HELENE_URL = 'https://helenespilling.com';

/**
 * Stilrent velkomstskjerm før oppskriften.
 * Resume leser samme zustand-persist (`robo-hatt-progress-4mm`).
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
            {ui.brandWelcome} <span>{ui.brandBy}</span>
          </span>
        </div>
        <div className="welcome-top-right">
          <LanguageSwitcher />
          <a className="welcome-pdf" href={PDF_URL} target="_blank" rel="noreferrer">
            {ui.welcomePdf}
          </a>
        </div>
      </header>

      <main className="welcome-hero">
        <section className="welcome-intro">
          <p className="welcome-eyebrow">{ui.welcomeEyebrow}</p>
          <h1>
            {ui.welcomeTitle1}
            <br />
            {ui.welcomeTitle2Before}
            <em>{ui.welcomeTitle2Em}</em>
            {ui.welcomeTitle2After}
          </h1>
          <p className="welcome-lede">{ui.welcomeLede}</p>
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
          <p className="welcome-fine">{ui.welcomeFine(stepCount)}</p>
        </section>

        <aside className="welcome-aside" aria-label={locale === 'en' ? 'Finished hat in 3D' : 'Ferdig hatt i 3D'}>
          <div className="welcome-stage">
            <HatScene preview device={device} />
          </div>
        </aside>
      </main>

      <footer className="welcome-foot">
        <p>
          {ui.welcomeFoot}{' '}
          <a href={HELENE_URL} target="_blank" rel="noreferrer">
            Helene Spilling
          </a>
        </p>
      </footer>
    </div>
  );
}
