import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { buildRounds, buildStitches } from './data/pattern';
import { buildSteps, type StepDef } from './data/steps';
import type { Round, Stitch } from './data/types';

export interface PatternModel {
  rounds: Round[];
  stitches: Stitch[];
  steps: StepDef[];
  /** Cumulative stitch count up to and including round idx. */
  cumCounts: number[];
}

let model: PatternModel | null = null;

export function getModel(): PatternModel {
  if (!model) {
    const rounds = buildRounds();
    const stitches = buildStitches(rounds);
    const steps = buildSteps(rounds);
    const cumCounts: number[] = [];
    let acc = 0;
    for (const r of rounds) {
      acc += r.count;
      cumCounts.push(acc);
    }
    model = { rounds, stitches, steps, cumCounts };
  }
  return model;
}

interface AppState {
  stepIndex: number;
  /** Bumped when the encoded recipe changes so mid-project users can resume. */
  recipeVersion: number;
  /** Count-along cursor: stitches of the current round completed (null = whole round shown). */
  stitchCursor: number | null;
  /** Saved cursor per step id, so you can put the work down and come back. */
  cursors: Record<string, number>;
  confirmed: Record<string, boolean>;
  showFinished: boolean;
  /** Show a number on every stitch of the current (and previous) round in 3D. */
  showNumbers: boolean;
  /** Show the physical stitch markers (clips) in 3D: every 10th + round start. */
  showMarkers: boolean;
  /** 'finished' = hat as worn; 'working' = flipped, as it sits in your hands. */
  viewMode: 'finished' | 'working';
  /** Slow automatic turntable rotation of the 3D hat (off by default). */
  autoRotate: boolean;
  /** Maskeskolen side panel visibility (hidden by default, toggled from the menu). */
  schoolOpen: boolean;
  /** Step you were working on before a quick jump elsewhere (null = none). */
  returnTo: number | null;
  chartOpen: boolean;
  cheatOpen: boolean;
  troubleOpen: boolean;
  /** Demo AI chat panel (bottom-left). */
  aiChatOpen: boolean;
  /** Left "Oppskrift" step-jump drawer. */
  jumpOpen: boolean;
  /** Collapsed/expanded Maske-for-maske overlay on the 3D stage. */
  stitchPanelOpen: boolean;
  /** False until the user leaves the welcome screen. */
  welcomeDone: boolean;

  /** `remember` = quick jump: remembers where you came from so you can hop back. */
  setStep: (i: number, remember?: boolean) => void;
  next: () => void;
  prev: () => void;
  setStitchCursor: (n: number | null) => void;
  toggleConfirm: (id: string) => void;
  setShowFinished: (v: boolean) => void;
  setShowNumbers: (v: boolean) => void;
  setShowMarkers: (v: boolean) => void;
  setViewMode: (v: 'finished' | 'working') => void;
  setAutoRotate: (v: boolean) => void;
  setSchoolOpen: (v: boolean) => void;
  setChartOpen: (v: boolean) => void;
  setCheatOpen: (v: boolean) => void;
  setTroubleOpen: (v: boolean) => void;
  setAiChatOpen: (v: boolean) => void;
  setJumpOpen: (v: boolean) => void;
  setStitchPanelOpen: (v: boolean) => void;
  setWelcomeDone: (v: boolean) => void;
}

export const useApp = create<AppState>()(
  persist(
    (set, get) => ({
      stepIndex: 0,
      recipeVersion: 1,
      stitchCursor: null,
      cursors: {},
      confirmed: {},
      showFinished: false,
      showNumbers: false,
      showMarkers: true,
      viewMode: 'working',
      autoRotate: false,
      schoolOpen: false,
      returnTo: null,
      chartOpen: false,
      cheatOpen: false,
      troubleOpen: false,
      aiChatOpen: false,
      jumpOpen: false,
      stitchPanelOpen: true,
      welcomeDone: false,

      setStep: (i, remember = false) => {
        const { steps } = getModel();
        const clamped = Math.max(0, Math.min(steps.length - 1, i));
        const step = steps[clamped];
        set((s) => ({
          stepIndex: clamped,
          // Round steps always count along — default 0 when no saved progress.
          stitchCursor:
            step.kind === 'round'
              ? (s.cursors[step.id] ?? 0)
              : null,
          // Navigating always returns you to the working (sy) view; the
          // "Ferdig hatt" toggle is a preview, not a place to work from.
          showFinished: false,
          viewMode: 'working' as const,
          // Landing back on the remembered step clears the reminder; a quick
          // jump away from it (first jump only) records where you came from.
          returnTo:
            clamped === s.returnTo
              ? null
              : remember && clamped !== s.stepIndex && s.returnTo === null
                ? s.stepIndex
                : s.returnTo,
        }));
      },
      next: () => {
        const s = get();
        const { steps } = getModel();
        const dest = Math.min(steps.length - 1, s.stepIndex + 1);
        const destStep = steps[dest];
        // Neste steg always starts the round counter at 0.
        if (destStep.kind === 'round') {
          set((st) => ({ cursors: { ...st.cursors, [destStep.id]: 0 } }));
        }
        s.setStep(dest);
      },
      prev: () => get().setStep(get().stepIndex - 1),
      setStitchCursor: (n) =>
        set((s) => {
          const { steps } = getModel();
          const id = steps[s.stepIndex]?.id;
          const cursors = { ...s.cursors };
          if (id) {
            if (n === null) delete cursors[id];
            else cursors[id] = n;
          }
          return { stitchCursor: n, cursors };
        }),
      toggleConfirm: (id) =>
        set((s) => ({ confirmed: { ...s.confirmed, [id]: !s.confirmed[id] } })),
      setShowFinished: (v) => set({ showFinished: v }),
      setShowNumbers: (v) => set({ showNumbers: v }),
      setShowMarkers: (v) => set({ showMarkers: v }),
      setViewMode: (v) => set({ viewMode: v }),
      setAutoRotate: (v) => set({ autoRotate: v }),
      setSchoolOpen: (v) => set({ schoolOpen: v }),
      setChartOpen: (v) => set({ chartOpen: v }),
      setCheatOpen: (v) => set({ cheatOpen: v }),
      setTroubleOpen: (v) => set({ troubleOpen: v }),
      setAiChatOpen: (v) => set({ aiChatOpen: v }),
      setJumpOpen: (v) => set({ jumpOpen: v }),
      setStitchPanelOpen: (v) => set({ stitchPanelOpen: v }),
      setWelcomeDone: (v) => set({ welcomeDone: v }),
    }),
    {
      name: 'robo-hatt-progress-4mm',
      partialize: (s) => ({
        stepIndex: s.stepIndex,
        recipeVersion: s.recipeVersion,
        stitchCursor: s.stitchCursor,
        cursors: s.cursors,
        confirmed: s.confirmed,
        showNumbers: s.showNumbers,
        showMarkers: s.showMarkers,
        viewMode: s.viewMode,
        autoRotate: s.autoRotate,
        schoolOpen: s.schoolOpen,
        stitchPanelOpen: s.stitchPanelOpen,
        welcomeDone: s.welcomeDone,
      }),
    },
  ),
);

/** Is this round shown stitch-by-stitch (patterned rounds)? */
export function isPatterned(round: Round): boolean {
  return round.phase === 'text' || round.phase === 'wave';
}

export interface Visible {
  /** Number of stitch instances to draw (prefix of the working-order list). */
  shownStitches: number;
  /** Index of the round currently being worked, or null. */
  currentRoundIdx: number | null;
  /** True when the current round is being stepped stitch-by-stitch. */
  stitchStepping: boolean;
}

/** What the 3D hat should show for the current step. */
export function computeVisible(
  m: PatternModel,
  stepIndex: number,
  stitchCursor: number | null,
  showFinished: boolean,
): Visible {
  const total = m.stitches.length;
  if (showFinished) {
    return { shownStitches: total, currentRoundIdx: null, stitchStepping: false };
  }
  const step = m.steps[stepIndex];
  if (!step) return { shownStitches: 0, currentRoundIdx: null, stitchStepping: false };
  if (step.kind === 'finish' || step.kind === 'done') {
    return { shownStitches: total, currentRoundIdx: null, stitchStepping: false };
  }
  if (step.roundIdx === null) {
    return { shownStitches: 0, currentRoundIdx: null, stitchStepping: false };
  }
  const roundIdx = step.roundIdx;
  const round = m.rounds[roundIdx];
  const before = roundIdx > 0 ? m.cumCounts[roundIdx - 1] : 0;
  if (step.kind === 'size-check') {
    return { shownStitches: m.cumCounts[roundIdx], currentRoundIdx: null, stitchStepping: false };
  }
  if (step.kind === 'round' && stitchCursor !== null) {
    return {
      shownStitches: before + Math.min(stitchCursor, round.count),
      currentRoundIdx: roundIdx,
      stitchStepping: true,
    };
  }
  return {
    shownStitches: m.cumCounts[roundIdx],
    currentRoundIdx: roundIdx,
    stitchStepping: false,
  };
}
