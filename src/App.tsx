import { useEffect, useRef, useState } from 'react';
import HatScene from './components/HatScene';
import StepPanel from './components/StepPanel';
import StageFoot from './components/StageFoot';
import Maskeskolen from './components/Maskeskolen';
import ChartView from './components/ChartView';
import { CheatSheet, TroubleDrawer } from './components/Overlays';
import StitchOverlay from './components/StitchOverlay';
import JumpDrawer from './components/JumpDrawer';
import WelcomeScreen from './components/WelcomeScreen';
import AiChatDemo from './components/AiChatDemo';
import ConfettiBurst from './components/ConfettiBurst';
import { useApp, getModel } from './store';

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
      <path
        d="M4.5 11.2 L12 4.8 L19.5 11.2 V19.2 A1.2 1.2 0 0 1 18.3 20.4 H14.2 V15.2 H9.8 V20.4 H5.7 A1.2 1.2 0 0 1 4.5 19.2 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
      <circle cx="12" cy="12" r="3.1" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 3.4 V5.6 M12 18.4 V20.6 M3.4 12 H5.6 M18.4 12 H20.6 M5.9 5.9 L7.5 7.5 M16.5 16.5 L18.1 18.1 M18.1 5.9 L16.5 7.5 M7.5 16.5 L5.9 18.1"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function TopBar() {
  const chartOpen = useApp((s) => s.chartOpen);
  const setChartOpen = useApp((s) => s.setChartOpen);
  const setCheatOpen = useApp((s) => s.setCheatOpen);
  const setTroubleOpen = useApp((s) => s.setTroubleOpen);
  const setWelcomeDone = useApp((s) => s.setWelcomeDone);
  const showNumbers = useApp((s) => s.showNumbers);
  const setShowNumbers = useApp((s) => s.setShowNumbers);
  const showMarkers = useApp((s) => s.showMarkers);
  const setShowMarkers = useApp((s) => s.setShowMarkers);
  const autoRotate = useApp((s) => s.autoRotate);
  const setAutoRotate = useApp((s) => s.setAutoRotate);

  const [toolsOpen, setToolsOpen] = useState(false);
  const toolsRef = useRef<HTMLDivElement>(null);
  const activeCount = [autoRotate, showNumbers, showMarkers, chartOpen].filter(Boolean).length;

  useEffect(() => {
    if (!toolsOpen) return;
    const onPointer = (e: MouseEvent) => {
      if (!toolsRef.current?.contains(e.target as Node)) setToolsOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setToolsOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [toolsOpen]);

  return (
    <div className="topbar">
      <div className="brand">
        <div className="dots">
          <span style={{ background: '#BA0C2F' }} />
          <span style={{ background: '#FDFAF3', border: '1px solid #D8CFBC' }} />
          <span style={{ background: '#00205B' }} />
        </div>
        <span className="kicker">Ro det i land</span>
      </div>

      <div className="topbar-tools" ref={toolsRef}>
        <button
          type="button"
          className="icon-btn"
          onClick={() => setWelcomeDone(false)}
          title="Tilbake til start"
          aria-label="Tilbake til start"
        >
          <HomeIcon />
        </button>

        <div className={`tools-tray ${toolsOpen ? 'open' : ''}`} aria-hidden={!toolsOpen}>
          <button
            type="button"
            className={`tool-btn ${autoRotate ? 'active' : ''}`}
            onClick={() => setAutoRotate(!autoRotate)}
            title="Snurr hatten 360° i ett endeløst loop"
            tabIndex={toolsOpen ? 0 : -1}
          >
            {autoRotate ? '◉ Snurring PÅ' : '◎ Snurring'}
          </button>
          <button
            type="button"
            className={`tool-btn ${showNumbers ? 'active' : ''}`}
            onClick={() => setShowNumbers(!showNumbers)}
            title="Vis eller skjul nummer på maskene rundt innstikkspunktet i 3D"
            tabIndex={toolsOpen ? 0 : -1}
          >
            123 Maskenummer
          </button>
          <button
            type="button"
            className={`tool-btn ${showMarkers ? 'active' : ''}`}
            onClick={() => setShowMarkers(!showMarkers)}
            title="Vis eller skjul markørene (klipsene) i 3D"
            tabIndex={toolsOpen ? 0 : -1}
          >
            Markører
          </button>
          <button
            type="button"
            className={`tool-btn ${chartOpen ? 'active' : ''}`}
            onClick={() => {
              setChartOpen(!chartOpen);
              setToolsOpen(false);
            }}
            tabIndex={toolsOpen ? 0 : -1}
          >
            Diagram
          </button>
          <button
            type="button"
            className="tool-btn"
            onClick={() => {
              setCheatOpen(true);
              setToolsOpen(false);
            }}
            tabIndex={toolsOpen ? 0 : -1}
          >
            Huskelapp
          </button>
          <button
            type="button"
            className="tool-btn"
            onClick={() => {
              setTroubleOpen(true);
              setToolsOpen(false);
            }}
            tabIndex={toolsOpen ? 0 : -1}
          >
            Hjelp
          </button>
        </div>

        <button
          type="button"
          className={`icon-btn settings-btn ${toolsOpen ? 'open' : ''} ${activeCount ? 'has-active' : ''}`}
          onClick={() => setToolsOpen((v) => !v)}
          title="Innstillinger og hjelp"
          aria-label="Innstillinger"
          aria-expanded={toolsOpen}
        >
          <SettingsIcon />
          {activeCount > 0 && <span className="settings-dot" aria-hidden />}
        </button>
      </div>
    </div>
  );
}

function ViewToggle() {
  const showFinished = useApp((s) => s.showFinished);
  const setShowFinished = useApp((s) => s.setShowFinished);
  const viewMode = useApp((s) => s.viewMode);
  const setViewMode = useApp((s) => s.setViewMode);
  const finished = showFinished || viewMode === 'finished';
  const setView = (done: boolean) => {
    setViewMode(done ? 'finished' : 'working');
    setShowFinished(done);
  };
  return (
    <div className="viewtoggle" role="group" aria-label="Visning av hatten">
      <button
        className={finished ? '' : 'on'}
        onClick={() => setView(false)}
        title="Slik arbeidet ligger i hendene dine"
      >
        Sy-visning
      </button>
      <button
        className={finished ? 'on' : ''}
        onClick={() => setView(true)}
        title="Hele den ferdige hatten, med teksten riktig vei"
      >
        Ferdig hatt
      </button>
    </div>
  );
}

function FlipHint() {
  const viewMode = useApp((s) => s.viewMode);
  const showFinished = useApp((s) => s.showFinished);
  const stepIndex = useApp((s) => s.stepIndex);
  if (viewMode !== 'working' || showFinished) return null;
  const model = getModel();
  const step = model.steps[stepIndex];
  const round = step?.roundIdx !== null && step ? model.rounds[step.roundIdx!] : null;
  if (round?.phase !== 'text') return null;
  return (
    <div className="flip-hint">
      Bokstavene er opp ned her — det er riktig! Arbeidet ligger opp ned i hendene dine.
      Trykk «Ferdig hatt» for å lese dem rett vei.
    </div>
  );
}

function ReturnPill() {
  const returnTo = useApp((s) => s.returnTo);
  const cursors = useApp((s) => s.cursors);
  const setStep = useApp((s) => s.setStep);
  if (returnTo === null) return null;
  const model = getModel();
  const step = model.steps[returnTo];
  if (!step) return null;
  const round = step.roundIdx !== null ? model.rounds[step.roundIdx] : null;
  const savedCursor = cursors[step.id];
  const label = round ? `Runde ${round.num}` : step.title;
  return (
    <button className="return-pill" onClick={() => setStep(returnTo)}>
      ↩ Tilbake til {label}
      {savedCursor != null && round ? ` · maske ${savedCursor}/${round.count}` : ''}
    </button>
  );
}

export default function App() {
  const next = useApp((s) => s.next);
  const prev = useApp((s) => s.prev);
  const schoolOpen = useApp((s) => s.schoolOpen);
  const setSchoolOpen = useApp((s) => s.setSchoolOpen);
  const welcomeDone = useApp((s) => s.welcomeDone);
  const setJumpOpen = useApp((s) => s.setJumpOpen);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const steg = params.get('steg');
    const maske = params.get('maske');
    const st = useApp.getState();
    const steps = getModel().steps;

    const jump = (id: string) => {
      const idx = steps.findIndex((s) => s.id === id);
      if (idx < 0) return false;
      st.setStep(idx);
      if (maske !== null && !Number.isNaN(Number(maske))) {
        st.setStitchCursor(Number(maske));
      }
      return true;
    };

    if (steg) {
      if (jump(steg)) {
        window.history.replaceState(null, '', window.location.pathname);
        useApp.setState({ welcomeDone: true, recipeVersion: 2 });
      }
      return;
    }

    // Migration: only move mid-project users; never skip intro for fresh sessions.
    if (st.recipeVersion < 2) {
      const hasProgress = st.stepIndex > 0 || Object.keys(st.cursors).length > 0;
      if (hasProgress) jump('round-14');
      useApp.setState({ recipeVersion: 2 });
    }
  }, []);

  useEffect(() => {
    (window as unknown as Record<string, unknown>).__robo = {
      gotoStepId: (id: string) => {
        const st = useApp.getState();
        const idx = getModel().steps.findIndex((s) => s.id === id);
        if (idx >= 0) {
          st.setStep(idx);
          st.setWelcomeDone(true);
        }
      },
      setCursor: (n: number) => useApp.getState().setStitchCursor(n),
      openChart: () => useApp.getState().setChartOpen(true),
      closeOverlays: () => {
        const st = useApp.getState();
        st.setChartOpen(false);
        st.setCheatOpen(false);
        st.setTroubleOpen(false);
        st.setJumpOpen(false);
        st.setSchoolOpen(false);
      },
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      if (target?.isContentEditable) return;

      const st = useApp.getState();
      if (!st.welcomeDone) return;

      const model = getModel();
      const step = model.steps[st.stepIndex];
      const counting =
        st.stitchCursor !== null &&
        step?.kind === 'round' &&
        step.roundIdx !== null &&
        !st.showFinished;

      if (counting) {
        const round = model.rounds[step.roundIdx!];
        const c = Math.min(st.stitchCursor!, round.count);
        const plus =
          e.key === ' ' ||
          e.key === 'Enter' ||
          e.key === 'ArrowRight' ||
          e.key === 'ArrowUp';
        const minus =
          e.key === 'ArrowLeft' ||
          e.key === 'ArrowDown' ||
          e.key === 'Backspace';
        if (plus) {
          e.preventDefault();
          st.setStitchCursor(Math.min(round.count, c + 1));
          return;
        }
        if (minus) {
          e.preventDefault();
          st.setStitchCursor(Math.max(0, c - 1));
          return;
        }
        return;
      }

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        next();
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prev();
      }
      if (e.key === 'Escape') {
        setSchoolOpen(false);
        setJumpOpen(false);
        useApp.getState().setAiChatOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, prev, setSchoolOpen, setJumpOpen]);

  const stepIndex = useApp((s) => s.stepIndex);
  const finaleKind = getModel().steps[stepIndex]?.kind;
  const celebrateDone = finaleKind === 'done';
  const onFinale = finaleKind === 'finish' || finaleKind === 'done';

  if (!welcomeDone) {
    return <WelcomeScreen />;
  }

  return (
    <div className="app">
      <TopBar />
      <div className="layout">
        <StepPanel />
        <section className="card stage">
          <div className="card-head stage-head">
            <ViewToggle />
            <div className="stage-tools">
              <button
                type="button"
                className={`schoolbtn ${schoolOpen ? 'open' : ''}`}
                onClick={() => setSchoolOpen(!schoolOpen)}
                title="Vis eller skjul Maskeskolen"
              >
                Maskeskolen
              </button>
            </div>
          </div>
          <div className="scene-wrap">
            <HatScene />
            <StitchOverlay />
            <FlipHint />
            <ConfettiBurst active={celebrateDone} />
            <AiChatDemo docked />
            <div className="hint">
              {onFinale
                ? 'Dra for å rotere · Rull for å zoome'
                : 'Dra for å rotere · Rull for å zoome · Space/+1 · Backspace/−1'}
            </div>
          </div>
          <StageFoot />
        </section>
      </div>
      <Maskeskolen />
      <JumpDrawer />
      <ReturnPill />
      <ChartView />
      <CheatSheet />
      <TroubleDrawer />
    </div>
  );
}
