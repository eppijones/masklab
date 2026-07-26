import { useApp, getModel } from '../store';
import WorkHUD from './WorkHUD';

function RoundCount() {
  const stepIndex = useApp((s) => s.stepIndex);
  const model = getModel();
  const step = model.steps[stepIndex];
  if (!step || step.roundIdx === null) {
    return (
      <span className="roundcount">
        Interaktiv 3D-oppskrift · <strong>for helt ferske nybegynnere</strong>
      </span>
    );
  }
  const round = model.rounds[step.roundIdx];
  const totalRounds = model.rounds.length;
  return (
    <span className="roundcount">
      Runde <strong>{round.num}</strong> av {model.rounds[totalRounds - 1].num} · {round.count}{' '}
      masker
    </span>
  );
}

/**
 * The fixed instruction bar under the 3D window: the docked work HUD,
 * the step progress and the round counter. Nothing here ever moves,
 * no matter how much text the current step has.
 */
export default function StageFoot({ hideControls = false }: { hideControls?: boolean }) {
  const stepIndex = useApp((s) => s.stepIndex);
  const setStep = useApp((s) => s.setStep);

  const steps = getModel().steps;

  return (
    <div className={`stage-foot ${hideControls ? 'dock-mode' : ''}`}>
      <WorkHUD hideControls={hideControls} />
      <div className="progress">
        {steps.map((s, i) => (
          <button
            key={s.id}
            title={s.title}
            className={i < stepIndex ? 'done' : i === stepIndex ? 'active' : ''}
            onClick={() => setStep(i, true)}
          />
        ))}
      </div>
      <div className="foot-row">
        <RoundCount />
      </div>
    </div>
  );
}
