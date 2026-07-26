import { useApp, getModel } from '../store';
import HatScene from './HatScene';
import { useDeviceClass } from '../hooks/useDeviceClass';

const PDF_URL =
  'https://helenespilling.com/wp-content/uploads/2026/06/RO-DET-I-LAND-HATTEN.pdf';
const HELENE_URL = 'https://helenespilling.com';

/**
 * Stilrent velkomstskjerm før oppskriften.
 * Resume leser samme zustand-persist (`robo-hatt-progress-4mm`).
 */
export default function WelcomeScreen() {
  const device = useDeviceClass();
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
            Ro det i land hatten <span>av Helene Spilling</span>
          </span>
        </div>
        <a className="welcome-pdf" href={PDF_URL} target="_blank" rel="noreferrer">
          Last ned original oppskrift
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
            Hekle «Ro det i land»-hatten av Helene Spilling — én runde av gangen.
            Passer både deg som kan hekle, og deg som aldri har rørt en heklepinne.
            Hatten i 3D vokser mens du hekler.
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
            {stepCount} små steg · Maskeskole med animasjoner · for nybegynnere og øvede
          </p>
        </section>

        <aside className="welcome-aside" aria-label="Ferdig hatt i 3D">
          <div className="welcome-stage">
            <HatScene preview device={device} />
          </div>
        </aside>
      </main>

      <footer className="welcome-foot">
        <p>
          Oppskrift av{' '}
          <a href={HELENE_URL} target="_blank" rel="noreferrer">
            Helene Spilling
          </a>
        </p>
      </footer>
    </div>
  );
}
