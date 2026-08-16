import { useCallback, useEffect, useRef, useState } from 'react';
import { CYCLES, type CycleId } from './cycle.ts';
import type { Program } from './program.ts';

export interface Clock {
  pos: number;
  playing: boolean;
  /** 1 = realtime (one stitch takes cycle.durationMs). 10 / 60 / job. */
  speed: number;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  setSpeed: (s: number) => void;
  stepPhase: (dir: 1 | -1) => void;
  stepStitch: (dir: 1 | -1) => void;
  seek: (pos: number) => void;
  reset: () => void;
}

/** Speed that compresses the whole job into `jobSeconds`. */
export function jobSpeed(prog: Program, jobSeconds = 90): number {
  const real = prog.totalMs / 1000;
  return Math.max(1, real / jobSeconds);
}

function cycleMs(kind: CycleId): number {
  return CYCLES[kind].durationMs;
}

export function useJobClock(prog: Program): Clock {
  const [pos, setPos] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(60);
  const raf = useRef(0);
  const last = useRef(0);
  const progRef = useRef(prog);
  progRef.current = prog;

  useEffect(() => {
    setPos(0);
  }, [prog]);

  useEffect(() => {
    if (!playing) return;
    last.current = performance.now();
    const tick = (now: number) => {
      const dt = Math.min((now - last.current) / 1000, 0.08);
      last.current = now;
      setPos((p) => {
        const pr = progRef.current;
        const i = Math.max(0, Math.min(pr.ops.length - 1, Math.floor(p)));
        const dur = cycleMs(pr.ops[i].kind) / 1000;
        const next = p + (dt / dur) * speed;
        if (next >= pr.ops.length) {
          return 0;
        }
        return next;
      });
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [playing, speed]);

  const stepPhase = useCallback((dir: 1 | -1) => {
    setPlaying(false);
    setPos((p) => {
      const pr = progRef.current;
      const stitch = Math.floor(p);
      const t = p - stitch;
      const kind = pr.ops[Math.max(0, Math.min(pr.ops.length - 1, stitch))]?.kind ?? 'sc';
      const bounds = CYCLES[kind].phases.map((ph) => ph.t0).concat(1);
      if (dir === 1) {
        const nxt = bounds.find((b) => b > t + 1e-4);
        return nxt === undefined || nxt >= 1
          ? Math.min(pr.ops.length - 0.001, stitch + 1)
          : stitch + nxt;
      }
      const prev = [...bounds].reverse().find((b) => b < t - 1e-4);
      return prev === undefined ? Math.max(0, stitch - 1 + 0.94) : stitch + prev;
    });
  }, []);

  const stepStitch = useCallback((dir: 1 | -1) => {
    setPlaying(false);
    setPos((p) => {
      const n = progRef.current.ops.length;
      return Math.max(0, Math.min(n - 1, Math.floor(p) + dir));
    });
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
    seek: (p) => {
      const n = progRef.current.ops.length;
      setPos(Math.max(0, Math.min(n - 0.001, p)));
    },
    reset: () => setPos(0),
  };
}
