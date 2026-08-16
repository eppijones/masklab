import { useCallback, useEffect, useRef, useState } from 'react';
import { CYCLE_SC, phaseAt } from '../machine/cycle.ts';
import { TOTAL } from '../machine/program.ts';

export interface Clock {
  /** Global stitch index, fractional part is progress through the current cycle. */
  pos: number;
  playing: boolean;
  speed: number;
  /** Stitches to skip per real second at speed 1 — the twin runs faster than the machine. */
  play: () => void;
  pause: () => void;
  toggle: () => void;
  setSpeed: (s: number) => void;
  stepPhase: (dir: 1 | -1) => void;
  stepStitch: (dir: 1 | -1) => void;
  seek: (pos: number) => void;
  reset: () => void;
}

const CYCLE_S = CYCLE_SC.durationMs / 1000;

export function useCycleClock(initial = 0): Clock {
  const [pos, setPos] = useState(initial);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const raf = useRef(0);
  const last = useRef(0);

  useEffect(() => {
    if (!playing) return;
    last.current = performance.now();
    const tick = (now: number) => {
      const dt = Math.min((now - last.current) / 1000, 0.1);
      last.current = now;
      setPos((p) => {
        const next = p + (dt / CYCLE_S) * speed;
        return next >= TOTAL ? 0 : next;
      });
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [playing, speed]);

  const stepPhase = useCallback((dir: 1 | -1) => {
    setPlaying(false);
    setPos((p) => {
      const stitch = Math.floor(p);
      const t = p - stitch;
      const bounds = CYCLE_SC.phases.map((ph) => ph.t0).concat(1);
      if (dir === 1) {
        const nxt = bounds.find((b) => b > t + 1e-4);
        return nxt === undefined || nxt >= 1 ? stitch + 1 : stitch + nxt;
      }
      const prev = [...bounds].reverse().find((b) => b < t - 1e-4);
      return prev === undefined ? Math.max(0, stitch - 1 + 0.94) : stitch + prev;
    });
  }, []);

  const stepStitch = useCallback((dir: 1 | -1) => {
    setPlaying(false);
    setPos((p) => Math.max(0, Math.min(TOTAL - 1, Math.floor(p) + dir)));
  }, []);

  return {
    pos,
    playing,
    speed,
    play: () => setPlaying(true),
    pause: () => setPlaying(false),
    toggle: () => setPlaying((v) => !v),
    setSpeed,
    stepPhase,
    stepStitch,
    seek: (p: number) => setPos(Math.max(0, Math.min(TOTAL - 0.001, p))),
    reset: () => setPos(0),
  };
}

export function phaseOf(pos: number) {
  return phaseAt(CYCLE_SC, pos - Math.floor(pos));
}
