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
import MobileDock from './components/MobileDock';
import LanguageSwitcher from './components/LanguageSwitcher';
import { useApp, getModel } from './store';
import { useDeviceClass, useNeedsMobileDock } from './hooks/useDeviceClass';
import { hasSavedProgress, isHeleneEntry } from './lib/entry';
import { t } from './i18n/ui';

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

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
      <path
        d="M5 7.5 H19 M5 12 H19 M5 16.5 H19"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </svg>
  );
}

function TopBar() {
  const locale = useApp((s) => s.locale);
  const ui = t(locale);
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
        <span className="kicker">{ui.brandWelcome}</span>
      </div>

      <div className="topbar-tools" ref={toolsRef}>
        <LanguageSwitcher />
        <button
          type="button"
          className="icon-btn"
          onClick={() => setWelcomeDone(false)}
          title={ui.homeTitle}
          aria-label={ui.homeTitle}
        >
          <HomeIcon />
        </button>

        <div className={`tools-tray ${toolsOpen ? 'open' : ''}`} aria-hidden={!toolsOpen}>
          <button
            type="button"
            className={`tool-btn ${autoRotate ? 'active' : ''}`}
            onClick={() => setAutoRotate(!autoRotate)}
            tabIndex={toolsOpen ? 0 : -1}
          >
            {autoRotate ? ui.toolSpinOn : ui.toolSpin}
          </button>
          <button
            type="button"
            className={`tool-btn ${showNumbers ? 'active' : ''}`}
            onClick={() => setShowNumbers(!showNumbers)}
            tabIndex={toolsOpen ? 0 : -1}
          >
            {ui.toolNumbers}
          </button>
          <button
            type="button"
            className={`tool-btn ${showMarkers ? 'active' : ''}`}
            onClick={() => setShowMarkers(!showMarkers)}
            tabIndex={toolsOpen ? 0 : -1}
          >
            {ui.toolMarkers}
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
            {ui.toolChart}
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
            {ui.toolCheat}
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
            {ui.toolHelp}
          </button>
        </div>

        <button
          type="button"
          className={`icon-btn settings-btn ${toolsOpen ? 'open' : ''} ${activeCount ? 'has-active' : ''}`}
          onClick={() => setToolsOpen((v) => !v)}
          title={ui.settingsTitle}
          aria-label={ui.settingsAria}
          aria-expanded={toolsOpen}
        >
          <MenuIcon />
          {activeCount > 0 && <span className="settings-dot" aria-hidden />}
        </button>
      </div>
    </div>
  );
}

function ViewToggle() {
  const locale = useApp((s) => s.locale);
  const ui = t(locale);
  const showFinished = useApp((s) => s.showFinished);
  const setShowFinished = useApp((s) => s.setShowFinished);
  const viewMode = useApp((s) => s.viewMode);
  const setViewMode = useApp((s) => s.setViewMode);
  const setAutoRotate = useApp((s) => s.setAutoRotate);
  const stepIndex = useApp((s) => s.stepIndex);
  const step = getModel().steps[stepIndex];
  const onFinale = step?.kind === 'finish' || step?.kind === 'done';
  const finished = onFinale || showFinished || viewMode === 'finished';
  const setView = (done: boolean) => {
    if (onFinale && !done) return; // finale stays on ferdig hatt
    setViewMode(done ? 'finished' : 'working');
    setShowFinished(done);
    if (done) setAutoRotate(true);
  };
  return (
    <div className="viewtoggle" role="group" aria-label={locale === 'en' ? 'Hat view' : 'Visning av hatten'}>
      <button
        className={finished ? '' : 'on'}
        onClick={() => setView(false)}
        title={onFinale ? ui.viewFinaleTitle : ui.viewWorkingTitle}
        disabled={onFinale}
      >
        {ui.viewWorking}
      </button>
      <button
        className={finished ? 'on' : ''}
        onClick={() => setView(true)}
        title={ui.viewFinishedTitle}
      >
        {ui.viewFinished}
      </button>
    </div>
  );
}

function FlipHint() {
  const locale = useApp((s) => s.locale);
  const viewMode = useApp((s) => s.viewMode);
  const showFinished = useApp((s) => s.showFinished);
  const stepIndex = useApp((s) => s.stepIndex);
  if (viewMode !== 'working' || showFinished) return null;
  const model = getModel();
  const step = model.steps[stepIndex];
  const round = step?.roundIdx !== null && step ? model.rounds[step.roundIdx!] : null;
  // Only the first text round — once you know letters are upside-down, hide it.
  if (round?.phase !== 'text' || round.chartRow !== 1) return null;
  return <div className="flip-hint">{t(locale).flipHint}</div>;
}

function ReturnPill() {
  const locale = useApp((s) => s.locale);
  const ui = t(locale);
  const returnTo = useApp((s) => s.returnTo);
  const cursors = useApp((s) => s.cursors);
  const setStep = useApp((s) => s.setStep);
  if (returnTo === null) return null;
  const model = getModel();
  const step = model.steps[returnTo];
  if (!step) return null;
  const round = step.roundIdx !== null ? model.rounds[step.roundIdx] : null;
  const savedCursor = cursors[step.id];
  const label =
    round
      ? locale === 'en'
        ? `Round ${round.num}`
        : `Runde ${round.num}`
      : step.title;
  return (
    <button className="return-pill" onClick={() => setStep(returnTo)}>
      {ui.returnTo(label)}
      {savedCursor != null && round
        ? locale === 'en'
          ? ` · stitch ${savedCursor}/${round.count}`
          : ` · maske ${savedCursor}/${round.count}`
        : ''}
    </button>
  );
}

export default function App() {
  const device = useDeviceClass();
  const needsDock = useNeedsMobileDock(device);
  const locale = useApp((s) => s.locale);
  const ui = t(locale);
  const next = useApp((s) => s.next);
  const prev = useApp((s) => s.prev);
  const schoolOpen = useApp((s) => s.schoolOpen);
  const setSchoolOpen = useApp((s) => s.setSchoolOpen);
  const welcomeDone = useApp((s) => s.welcomeDone);
  const setJumpOpen = useApp((s) => s.setJumpOpen);

  useEffect(() => {
    document.documentElement.lang = locale === 'en' ? 'en' : 'no';
  }, [locale]);

  useEffect(() => {
    const boot = () => {
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

      // /helene: first visit → home; return with progress → resume mid-guide.
      if (isHeleneEntry()) {
        useApp.setState({
          welcomeDone: hasSavedProgress(st),
          recipeVersion: 2,
        });
        return;
      }

      // Migration: only move mid-project users; never skip intro for fresh sessions.
      if (st.recipeVersion < 2) {
        if (hasSavedProgress(st)) jump('round-14');
        useApp.setState({ recipeVersion: 2 });
      }
    };

    // Wait for localStorage rehydrate so /helene resume is based on real progress.
    if (useApp.persist.hasHydrated()) {
      boot();
      return;
    }
    return useApp.persist.onFinishHydration(() => boot());
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
      device: () => document.documentElement.dataset.device ?? 'desktop',
      orientation: () => document.documentElement.dataset.orientation ?? 'landscape',
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

  // Keep finale locked to ferdig hatt + snurring (also after resume / reload).
  useEffect(() => {
    if (!welcomeDone || !onFinale) return;
    const st = useApp.getState();
    if (!st.showFinished || st.viewMode !== 'finished' || !st.autoRotate) {
      useApp.setState({
        showFinished: true,
        viewMode: 'finished',
        autoRotate: true,
      });
    }
  }, [welcomeDone, stepIndex, onFinale]);

  if (!welcomeDone) {
    return <WelcomeScreen />;
  }

  return (
    <div className={`app ${needsDock ? 'has-mobile-dock' : ''}`}>
      <TopBar />
      <div className="layout">
        <StepPanel hideFoot={needsDock} />
        <section className="card stage">
          <div className="card-head stage-head">
            <ViewToggle />
            <div className="stage-tools">
              <button
                type="button"
                className={`schoolbtn ${schoolOpen ? 'open' : ''}`}
                onClick={() => setSchoolOpen(!schoolOpen)}
                title={ui.school}
              >
                {ui.school}
              </button>
            </div>
          </div>
          <div className="scene-wrap">
            <HatScene device={device} />
            <StitchOverlay />
            <FlipHint />
            <ConfettiBurst active={celebrateDone} />
            <AiChatDemo docked />
            <div className="hint">
              {onFinale ? ui.hintRotate : ui.hintCount}
            </div>
          </div>
          <StageFoot hideControls={needsDock} />
        </section>
      </div>
      {needsDock && <MobileDock />}
      <Maskeskolen />
      <JumpDrawer />
      <ReturnPill />
      <ChartView />
      <CheatSheet />
      <TroubleDrawer />
    </div>
  );
}
