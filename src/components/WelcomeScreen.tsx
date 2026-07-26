import { useApp, getModel } from '../store';
import HatScene from './HatScene';

const PDF_URL =
  'https://helenespilling.com/wp-content/uploads/2026/06/RO-DET-I-LAND-HATTEN.pdf';

/**
 * Stilrent velkomstskjerm før oppskriften.
 * Resume leser samme zustand-persist (`robo-hatt-progress-4mm`).
 */
export default function WelcomeScreen() {
  const setWelcomeDone = useApp((s) => s.setWelcomeDone);
  const setStep = useApp((s) => s.setStep);
  const setShowFinished = useApp((s) => s.setShowFinished);
  const setViewMode = useApp((s) => s.setViewMode);
  const stepIndex = useApp((s) => s.stepIndex);
  const cursors = useApp((s) => s.cursors);

  const hasProgress = stepIndex > 0 || Object.keys(cursors).length > 0;

  const enter = (resume: boolean) => {
    if (!resume) setStep(0);
    setShowFinished(false);
    setViewMode('working');
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
            Ro det i land <span>· Helene Spilling</span>
          </span>
        </div>
        <a className="welcome-pdf" href={PDF_URL} target="_blank" rel="noreferrer">
          Last ned PDF
        </a>
      </header>

      <main className="welcome-hero">
        <section className="welcome-intro">
          <p className="welcome-eyebrow">Interaktiv 3D-oppskrift</p>
          <h1>
            Velkommen!
            <br />
            La oss <em>ro det i land</em>.
          </h1>
          <p className="welcome-lede">
            Hekle Helene Spillings «Ro det i land»-hatt — RO RO RO — én runde av gangen.
            Laget for deg som aldri har holdt en heklenål før. Hatten i 3D vokser mens du hekler.
          </p>
          <div className="welcome-cta">
            <button type="button" className="welcome-start" onClick={() => enter(false)}>
              Start oppskriften →
            </button>
            {hasProgress && (
              <button type="button" className="welcome-resume" onClick={() => enter(true)}>
                Fortsett der du slapp
              </button>
            )}
          </div>
          <p className="welcome-fine">
            {stepCount} små steg · Maskeskole med animasjoner · ingen forkunnskaper
          </p>
        </section>

        <aside className="welcome-aside" aria-label="Ferdig hatt i 3D">
          <HatScene preview />
          <p className="welcome-hint">Dra for å rotere · snurring er på</p>
        </aside>
      </main>

      <footer className="welcome-foot">
        <p>
          Oppskrift av <strong>Helene Spilling</strong> · for helt ferske nybegynnere
        </p>
        <span>Norge · VM 2026</span>
      </footer>
    </div>
  );
}
