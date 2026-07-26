import { useState } from 'react';
import { useApp, getModel } from '../store';
import { YARN_HEX, YARN_NAME } from '../data/types';
import { WAVE_CHART_DISPLAY } from '../data/waves';
import type { StepDef } from '../data/steps';

/** Mini wave chart shown in the panel during the wave rounds. */
function WaveMiniChart({ activeRow }: { activeRow: number }) {
  const CELL = 22;
  const rows = WAVE_CHART_DISPLAY.length;
  const cols = WAVE_CHART_DISPLAY[0].length;
  const fill = (ch: string) =>
    ch === 'W' ? YARN_HEX.white : ch === 'B' ? YARN_HEX.blue : '#D8342C';
  return (
    <div>
      <svg
        viewBox={`0 0 ${(cols + 1.6) * CELL} ${(rows + 1) * CELL}`}
        style={{ width: '100%', display: 'block' }}
      >
        {WAVE_CHART_DISPLAY.map((row, rIdx) =>
          row.split('').map((ch, cIdx) => (
            <rect
              key={`${rIdx}-${cIdx}`}
              x={(cIdx + 0.2) * CELL}
              y={rIdx * CELL + CELL * 0.2}
              width={CELL}
              height={CELL}
              fill={fill(ch)}
              stroke={rIdx + 1 === activeRow ? '#00205B' : '#C9BFA8'}
              strokeWidth={rIdx + 1 === activeRow ? 2 : 0.7}
            />
          )),
        )}
        {Array.from({ length: rows }, (_, r) => (
          <text
            key={r}
            x={(cols + 0.5) * CELL}
            y={r * CELL + CELL * 0.9}
            fontSize={CELL * 0.55}
            fontWeight={r + 1 === activeRow ? 800 : 600}
            fill={r + 1 === activeRow ? '#BA0C2F' : '#8A8070'}
          >
            {r + 1}
          </text>
        ))}
      </svg>
      <p style={{ margin: '4px 0 0', fontSize: 11.5, color: 'var(--ink-faint)', fontWeight: 700 }}>
        Én bølgeblokk utenfra (gjentas 10 ganger). Rad 1 øverst — du jobber nedover. Rød rute =
        to blå fm i samme maske.
      </p>
    </div>
  );
}

/** "Mistet tellingen?" rescue guide, always available on round steps. */
function LostCount({ count }: { count: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="lostcount">
      <button type="button" className="lostcount-btn" onClick={() => setOpen(!open)}>
        {open ? '▾' : '▸'} Mistet tellingen? Slik finner du tilbake
      </button>
      {open && (
        <ol className="lostcount-list">
          <li>
            Stopp der du er. Ikke dra ut noe ennå — nesten alt kan reddes uten å rekke opp.
          </li>
          <li>
            Finn masken med markøren: der begynte runden. Tell V-ene fra masken ETTER markøren
            frem til heklenålen. Sett telleren på det tallet.
          </li>
          <li>
            Ikke tell løkken på nålen, ikke luftmasken som startet runden, og ikke kjedemasker.
          </li>
          <li>
            Usikker på økning? Det viktige er at runden ender på {count} masker.
          </li>
          <li>
            Helt i villrede? Dra ut til markøren, sett telleren på 0 og start runden på nytt.
          </li>
        </ol>
      )}
    </div>
  );
}

function FixPlan({ actual, step }: { actual: number; step: StepDef }) {
  const model = getModel();
  const nextRound =
    step.roundIdx !== null && step.roundIdx + 1 < model.rounds.length
      ? model.rounds[step.roundIdx + 1]
      : null;

  const useNextRound = nextRound !== null && nextRound.phase !== 'text';
  const target = useNextRound ? nextRound!.count : step.check!.count;
  const where = useNextRound
    ? `runde ${nextRound!.num} (vanlig justeringsrunde)`
    : 'en ekstra vanlig runde FØR du går videre (bokstavene krever nøyaktig 100 masker)';

  if (actual === target && useNextRound) {
    return (
      <div className="fixplan">
        <p>
          Du har allerede {target} — hekle neste runde uten økninger, så er du synkronisert.
        </p>
      </div>
    );
  }
  if (actual === step.check!.count) {
    return (
      <div className="fixplan">
        <p>Det er riktig antall! Trykk «Stemmer!» over og fortsett som normalt.</p>
      </div>
    );
  }

  const diff = actual - target;
  const reps = Math.abs(diff);
  const masketekst = (n: number) => (n === 1 ? 'én maske' : `${n} masker`);

  if (diff > 0 && reps * 2 > actual) {
    return (
      <div className="fixplan">
        <p>
          {actual} masker er langt unna målet ({target}). Tell én gang til — lander du fortsatt
          der, dra ut den siste runden til markøren.
        </p>
      </div>
    );
  }

  if (diff > 0) {
    const plain = actual - 2 * reps;
    const k = Math.floor(plain / reps);
    const rest = plain - k * reps;
    return (
      <div className="fixplan">
        <p className="fixplan-head">
          Du har {actual}, målet er {target} → fjern <strong>{reps} masker</strong> i {where}:
        </p>
        <ol>
          <li>Start runden som vanlig: luftmaske (telles ikke), første fastmaske, markør.</li>
          <li>
            {k > 0
              ? `Én fastmaske i ${masketekst(k)}, deretter «to sammen». Gjenta ${reps} ganger.`
              : `Lag «to sammen» ${reps} ganger etter hverandre.`}
          </li>
          {rest > 0 && <li>Til slutt: {rest} vanlige fastmasker.</li>}
          <li>Kjedemaske i masken med markøren. Tell: nå har du {target}.</li>
        </ol>
      </div>
    );
  }

  const plain = actual - reps;
  if (plain < 0) {
    return (
      <div className="fixplan">
        <p>
          {actual} masker er langt unna målet ({target}). Tell én gang til, eller dra ut til
          markøren.
        </p>
      </div>
    );
  }
  const k = Math.floor(plain / reps);
  const rest = plain - k * reps;
  return (
    <div className="fixplan">
      <p className="fixplan-head">
        Du har {actual}, målet er {target} → legg til <strong>{reps} masker</strong> i {where}:
      </p>
      <ol>
        <li>Start runden som vanlig: luftmaske (telles ikke), første fastmaske, markør.</li>
        <li>
          {k > 0
            ? `Én fastmaske i ${masketekst(k)}, deretter TO fastmasker i neste maske. Gjenta ${reps} ganger.`
            : `Lag to fastmasker i samme maske ${reps} ganger etter hverandre.`}
        </li>
        {rest > 0 && <li>Til slutt: {rest} vanlige fastmasker.</li>}
        <li>Kjedemaske i masken med markøren. Tell: nå har du {target}.</li>
      </ol>
    </div>
  );
}

function CheckpointCard({ step }: { step: StepDef }) {
  const confirmed = useApp((s) => s.confirmed);
  const toggleConfirm = useApp((s) => s.toggleConfirm);
  const [wrong, setWrong] = useState(false);
  const [actualStr, setActualStr] = useState('');
  const check = step.check!;
  const ok = !!confirmed[step.id];
  const actual = parseInt(actualStr, 10);

  return (
    <div className={`checkcard ${ok ? 'ok' : ''}`}>
      <div className="checkcard-title">Sjekk arbeidet før du går videre</div>
      <p className="checkcard-look">{check.look}</p>
      {check.diameterCm && (
        <p className="checkcard-measure">
          Mål gjerne: sirkelen skal være <strong>{check.diameterCm}</strong> i diameter, lagt
          flatt.
        </p>
      )}
      <p className="checkcard-q">
        Tell V-ene fra markøren og rundt: har du <strong>{check.count} masker</strong>?
      </p>
      <div className="checkcard-btns">
        <button
          type="button"
          className={`yes ${ok ? 'active' : ''}`}
          onClick={() => {
            if (!ok) toggleConfirm(step.id);
            setWrong(false);
          }}
        >
          {ok ? '✓ Stemmer!' : `Ja, ${check.count} masker`}
        </button>
        <button
          type="button"
          className={`no ${wrong ? 'active' : ''}`}
          onClick={() => {
            setWrong(!wrong);
            if (ok) toggleConfirm(step.id);
          }}
        >
          Nei, feil antall
        </button>
      </div>
      {wrong && (
        <div className="checkcard-help">
          <p className="fixtool-intro">
            Pust ut — dette fikses nesten alltid uten å rekke opp. Skriv tallet her:
          </p>
          <label className="fixtool-input">
            Jeg har
            <input
              type="number"
              min={1}
              max={300}
              value={actualStr}
              onChange={(e) => setActualStr(e.target.value)}
              placeholder={String(check.count)}
            />
            masker
          </label>
          {Number.isFinite(actual) && actual > 0 && <FixPlan actual={actual} step={step} />}
        </div>
      )}
    </div>
  );
}

export default function StepPanel() {
  const stepIndex = useApp((s) => s.stepIndex);
  const confirmed = useApp((s) => s.confirmed);
  const toggleConfirm = useApp((s) => s.toggleConfirm);
  const next = useApp((s) => s.next);
  const prev = useApp((s) => s.prev);
  const setJumpOpen = useApp((s) => s.setJumpOpen);

  const model = getModel();
  const steps = model.steps;
  const step = steps[stepIndex];
  if (!step) return null;

  const round = step.roundIdx !== null ? model.rounds[step.roundIdx] : null;
  const isText = round?.phase === 'text';
  const isWave = round?.phase === 'wave';
  const isLast = stepIndex === steps.length - 1;

  return (
    <section className="card panel">
      <div className="card-head">
        <span className="label">Oppskriften</span>
        <span className="sub">
          Steg {stepIndex + 1} av {steps.length}
        </span>
      </div>

      <div className="panel-body">
        <div className="step-eyebrow">
          <span className="step-num">{step.eyebrow}</span>
        </div>

        <h2 className="step-title">{step.title}</h2>

        {step.body.map((p, i) => (
          <p className="step-body" key={i}>
            {p}
          </p>
        ))}

        {step.bullets && (
          <ul className="step-bullets">
            {step.bullets.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        )}

        {step.checklist && (
          <div className="checklist">
            {step.checklist.map((item, i) => {
              const key = `check:${step.id}:${i}`;
              const on = !!confirmed[key];
              return (
                <label key={i} className={on ? 'checked' : ''}>
                  <input type="checkbox" checked={on} onChange={() => toggleConfirm(key)} />
                  {item}
                </label>
              );
            })}
          </div>
        )}

        {isWave && round?.waveRow != null && <WaveMiniChart activeRow={round.waveRow} />}

        {step.kind === 'round' && round && <LostCount count={round.count} />}

        {step.check && <CheckpointCard step={step} />}

        {step.confirm && (
          <label className={`confirm-box ${confirmed[step.id] ? 'ok' : ''}`}>
            <input
              type="checkbox"
              checked={!!confirmed[step.id]}
              onChange={() => toggleConfirm(step.id)}
            />
            {step.confirm}
          </label>
        )}

        <div className="step-meta">
          {step.yarn && (
            <span className="chip">
              <span className="swatch" style={{ background: YARN_HEX[step.yarn] }} />
              {isText ? 'Hvit + rød' : isWave ? 'Hvit + blå' : YARN_NAME[step.yarn]}
            </span>
          )}
          {step.countChip && <span className="chip">{step.countChip}</span>}
          <span className="chip">4,0 mm nål</span>
        </div>
      </div>

      <div className="panel-foot">
        <button type="button" className="btn prev" onClick={prev} disabled={stepIndex === 0}>
          ← Forrige
        </button>
        <button
          type="button"
          className="btn jump-open"
          onClick={() => setJumpOpen(true)}
          title="Vis hele oppskriften og hopp til et steg"
        >
          Oppskrift
        </button>
        <button type="button" className="btn next" onClick={next} disabled={isLast}>
          {isLast ? 'Ferdig!' : 'Neste steg →'}
        </button>
      </div>
    </section>
  );
}
