import { useEffect, useMemo, useRef, useState } from 'react';
import { TECHNIQUES, TECHNIQUE_BY_ID, TECHNIQUE_SHORT } from '../animations/techniques';
import type { TechniqueId } from '../data/steps';
import { useApp, getModel } from '../store';

const SPEEDS = [0.5, 1, 1.5] as const;

export default function Maskeskolen() {
  const stepIndex = useApp((s) => s.stepIndex);
  const schoolOpen = useApp((s) => s.schoolOpen);
  const setSchoolOpen = useApp((s) => s.setSchoolOpen);

  const step = getModel().steps[stepIndex];
  const suggested = useMemo(() => step?.techniques ?? [], [step]);

  const [selected, setSelected] = useState<TechniqueId>('fastmaske');
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState<number>(1);
  const [loop, setLoop] = useState(true);
  const [t, setT] = useState(0);

  // When the step changes, jump to its first suggested technique.
  useEffect(() => {
    if (suggested.length > 0) {
      setSelected(suggested[0]);
      setT(0);
      setPlaying(true);
    }
  }, [stepIndex, suggested]);

  const tech = TECHNIQUE_BY_ID[selected];

  // rAF playback
  const tRef = useRef(t);
  tRef.current = t;
  const playRef = useRef(playing);
  playRef.current = playing;
  const speedRef = useRef(speed);
  speedRef.current = speed;
  const loopRef = useRef(loop);
  loopRef.current = loop;

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      // rAF timestamps can be slightly earlier than performance.now(); never go backwards.
      const dt = Math.max(0, (now - last) / 1000);
      last = now;
      if (playRef.current) {
        let nt = tRef.current + (dt * speedRef.current) / tech.duration;
        if (nt >= 1) {
          if (loopRef.current) nt = nt % 1;
          else {
            nt = 1;
            setPlaying(false);
          }
        }
        setT(Math.max(0, Math.min(1, nt)));
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [tech]);

  const phaseIdx = tech.phases.reduce((acc, p, i) => (t >= p.at ? i : acc), 0);
  const caption = tech.phases[phaseIdx];

  if (!schoolOpen) return null;

  return (
    <>
      <div className="drawer-backdrop" onClick={() => setSchoolOpen(false)} aria-hidden />
      <aside className="card school" role="dialog" aria-label="Maskeskolen">
      <div className="card-head">
        <span className="label">Maskeskolen</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="sub">
            Del {phaseIdx + 1} av {tech.phases.length}
          </span>
          <button
            type="button"
            className="school-close"
            onClick={() => setSchoolOpen(false)}
            title="Lukk Maskeskolen"
          >
            ×
          </button>
        </span>
      </div>

      <div className="school-body">
        <div className="school-tabs">
          {TECHNIQUES.map((tq) => (
            <button
              key={tq.id}
              className={
                (tq.id === selected ? 'on ' : '') +
                (suggested.includes(tq.id) ? 'suggested' : '')
              }
              onClick={() => {
                setSelected(tq.id);
                setT(0);
                setPlaying(true);
              }}
            >
              {TECHNIQUE_SHORT[tq.id]}
            </button>
          ))}
        </div>

        <div className="school-art">
          {tech.render(t)}
          <span className="phase-badge">{phaseIdx + 1}</span>
        </div>

        <h3 className="school-frame-title">{tech.title}</h3>
        <p className="school-caption">{caption.label}</p>

        <div className="player">
        <input
          type="range"
          min={0}
          max={1000}
          value={Math.round(t * 1000)}
          onChange={(e) => {
            setT(Number(e.target.value) / 1000);
            setPlaying(false);
          }}
          aria-label="Spol i animasjonen"
        />
        <div className="player-row">
          <button
            className={`pbtn ${playing ? '' : 'play'}`}
            onClick={() => {
              if (!playing && t >= 1) setT(0);
              setPlaying(!playing);
            }}
            title={playing ? 'Pause' : 'Spill av'}
          >
            {playing ? '❚❚' : '▶'}
          </button>
          <button
            className="pbtn"
            onClick={() => {
              const prev = [...tech.phases].reverse().find((p) => p.at < t - 0.01);
              setT(prev ? prev.at : 0);
              setPlaying(false);
            }}
            title="Forrige del"
          >
            ‹
          </button>
          <button
            className="pbtn"
            onClick={() => {
              const nxt = tech.phases.find((p) => p.at > t + 0.01);
              setT(nxt ? nxt.at : 0);
              setPlaying(false);
            }}
            title="Neste del"
          >
            ›
          </button>
          <button
            className={`pbtn ${loop ? 'play' : ''}`}
            onClick={() => setLoop(!loop)}
            title="Gjenta"
            style={{ fontSize: 14 }}
          >
            ⟳
          </button>
          <div className="speed-btns">
            {SPEEDS.map((s) => (
              <button key={s} className={s === speed ? 'on' : ''} onClick={() => setSpeed(s)}>
                {s}×
              </button>
            ))}
          </div>
        </div>
      </div>
      </div>
    </aside>
    </>
  );
}
