import { useEffect, useRef, useState } from 'react';
import { MachineTwin, type TwinView } from '../twin/MachineTwin.tsx';
import { useCycleClock, phaseOf } from '../twin/useCycleClock.ts';
import { addressOf, axesAt, TOTAL } from '../machine/program.ts';
import { CYCLE_SC } from '../machine/cycle.ts';
import { KIND_COLOR } from '../machine/parts.ts';
import { MACHINE_ROUNDS } from '../machine/units.ts';
import { YARN } from '../twin/workpiece.ts';

const YARN_NAMES = ['Rød', 'Blå', 'Lyseblå', 'Hvit'];
const YARN_HEX = [YARN.red, YARN.blue, YARN.lightblue, YARN.white];

const FOCUS: { id: string | null; label: string }[] = [
  { id: null, label: 'Alt' },
  { id: 'former', label: 'Hatteblokk' },
  { id: 'head', label: 'Maskehode' },
  { id: 'station', label: 'Stasjon' },
  { id: 'yarn', label: 'Garnvei' },
  { id: 'control', label: 'Styring' },
];

export function TwinSection() {
  const clock = useCycleClock(1180);
  const [explode, setExplode] = useState(0);
  const [labels, setLabels] = useState(false);
  const [ghost, setGhost] = useState(false);
  const [focus, setFocus] = useState<string | null>(null);
  const [yarnPort, setYarnPort] = useState(0);

  const view = useRef<TwinView>({
    pos: clock.pos,
    explode: 0,
    cutaway: false,
    labels: true,
    ghost: false,
    yarnPort: 0,
    focus: null,
  });

  useEffect(() => {
    view.current.pos = clock.pos;
    view.current.explode = explode;
    view.current.labels = labels;
    view.current.ghost = ghost;
    view.current.focus = focus;
    view.current.yarnPort = yarnPort;
  }, [clock.pos, explode, labels, ghost, focus, yarnPort]);

  const a = addressOf(clock.pos);
  const t = clock.pos - Math.floor(clock.pos);
  const phase = phaseOf(clock.pos);
  const ax = axesAt(clock.pos, t, yarnPort);
  const appRound = MACHINE_ROUNDS.length - a.roundIdx; // machine order -> the app's own numbering
  const pct = ((clock.pos / TOTAL) * 100).toFixed(1);

  return (
    <div className="iv-stage">
      <div className="iv-canvas">
        <MachineTwin view={view} labelsOn={labels} />
      </div>

      <div className="iv-hud">
        <h4>Maskesyklus · fastmaske</h4>
        <div className="phase">{phase.labelNo}</div>
        <div style={{ fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--iv-faint)', fontWeight: 700 }}>
          {phase.label} · fase {CYCLE_SC.phases.indexOf(phase) + 1}/{CYCLE_SC.phases.length}
        </div>
        <p className="note">{phase.note}</p>

        <div className="iv-loops">
          <span style={{ fontFamily: 'var(--iv-mono)', fontSize: 10, color: 'var(--iv-faint)', marginRight: 4 }}>
            LØKKER
          </span>
          {[0, 1, 2].map((i) => (
            <span key={i} className="iv-loop" data-on={i < phase.loops ? 1 : 0} />
          ))}
        </div>

        <div className="iv-readout">
          <span className="lbl">runde (maskin)</span>
          <span className="val">{a.roundIdx + 1} / {MACHINE_ROUNDS.length}</span>
          <span className="lbl">runde (oppskrift)</span>
          <span className="val">{appRound}</span>
          <span className="lbl">maske i runden</span>
          <span className="val">{a.indexInRound + 1} / {a.count}</span>
          <span className="lbl">totalt</span>
          <span className="val">{Math.floor(clock.pos)} / {TOTAL} · {pct}%</span>
          <span className="lbl">C blokk</span>
          <span className="val">{ax.C.toFixed(1)}°</span>
          <span className="lbl">Z heis</span>
          <span className="val">{ax.Z.toFixed(1)} mm</span>
          <span className="lbl">R radial</span>
          <span className="val">{ax.R.toFixed(1)} mm</span>
          <span className="lbl">B vinkel</span>
          <span className="val">{ax.B.toFixed(1)}°</span>
          <span className="lbl">P stempel</span>
          <span className="val">{ax.P.toFixed(2)} mm</span>
          <span className="lbl">G presenter</span>
          <span className="val">{ax.G.toFixed(2)} mm</span>
        </div>

        <div className="iv-panelrow">
          {YARN_NAMES.map((n, i) => (
            <button
              key={n}
              className="iv-btn"
              data-on={yarnPort === i ? 1 : 0}
              onClick={() => setYarnPort(i)}
              title="Garnvelger — S-aksen"
            >
              <span className="iv-sw" style={{ background: YARN_HEX[i], display: 'inline-block', marginRight: 6, verticalAlign: -1 }} />
              {n}
            </button>
          ))}
        </div>

        <div className="iv-panelrow">
          {FOCUS.map((f) => (
            <button key={f.label} className="iv-btn" data-on={focus === f.id ? 1 : 0} onClick={() => setFocus(f.id)}>
              {f.label}
            </button>
          ))}
        </div>

        <div className="iv-panelrow" style={{ alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--iv-mono)', fontSize: 10, color: 'var(--iv-faint)' }}>SPRENGSKISSE</span>
          <input
            className="iv-range"
            style={{ width: 130 }}
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={explode}
            onChange={(e) => setExplode(Number(e.target.value))}
          />
        </div>
        <div className="iv-panelrow">
          <button className="iv-btn" data-on={ghost ? 1 : 0} onClick={() => setGhost((v) => !v)}>
            Gjennomsiktig
          </button>
          <button className="iv-btn" data-on={labels ? 1 : 0} onClick={() => setLabels((v) => !v)}>
            Etiketter
          </button>
        </div>
      </div>

      <div className="iv-legend">
        {(
          [
            ['printed', '3D-printet'],
            ['cots', 'Kjøpedel'],
            ['extrusion', 'Aluminium'],
            ['motor', 'Motor'],
            ['electronic', 'Elektronikk'],
          ] as const
        ).map(([k, l]) => (
          <div className="row" key={k}>
            <span className="iv-sw" style={{ background: KIND_COLOR[k] }} />
            {l}
          </div>
        ))}
      </div>

      <div className="iv-transport">
        <button className="iv-btn primary" onClick={clock.toggle}>
          {clock.playing ? '❚❚ Pause' : '▶ Spill'}
        </button>
        <button className="iv-btn" onClick={() => clock.stepPhase(-1)} title="Forrige fase">
          ◀ fase
        </button>
        <button className="iv-btn" onClick={() => clock.stepPhase(1)} title="Neste fase">
          fase ▶
        </button>
        <button className="iv-btn" onClick={() => clock.stepStitch(-1)}>
          ◀ maske
        </button>
        <button className="iv-btn" onClick={() => clock.stepStitch(1)}>
          maske ▶
        </button>
        {[0.15, 0.5, 1, 6, 40].map((s) => (
          <button key={s} className="iv-btn" data-on={clock.speed === s ? 1 : 0} onClick={() => clock.setSpeed(s)}>
            {s}×
          </button>
        ))}
        <input
          className="iv-range"
          type="range"
          min={0}
          max={TOTAL - 1}
          step={1}
          value={Math.floor(clock.pos)}
          onChange={(e) => clock.seek(Number(e.target.value))}
        />
      </div>
    </div>
  );
}
