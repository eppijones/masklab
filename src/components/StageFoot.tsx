import { useApp, getModel } from '../store';
import WorkHUD from './WorkHUD';
import { t } from '../i18n/ui';

function RoundCount() {
  const locale = useApp((s) => s.locale);
  const ui = t(locale);
  const stepIndex = useApp((s) => s.stepIndex);
  const model = getModel();
  const step = model.steps[stepIndex];
  if (!step || step.roundIdx === null) {
    return (
      <span className="roundcount">
        {ui.stageIntro}
      </span>
    );
  }
  const round = model.rounds[step.roundIdx];
  const totalRounds = model.rounds.length;
  return (
    <span className="roundcount">
      {ui.roundOf(round.num, model.rounds[totalRounds - 1].num, round.count)}
    </span>
  );
}

/**
 * The fixed instruction bar under the 3D window: the docked work HUD,
 * the step progress and the round counter. Nothing here ever moves,
 * no matter how much text the current step has.
 */
export default function StageFoot({ hideControls = false }: { hideControls?: boolean }) {
  const locale = useApp((s) => s.locale);
  const stepIndex = useApp((s) => s.stepIndex);
  const setStep = useApp((s) => s.setStep);

  const steps = getModel().steps;

  return (
    <div className={`stage-foot ${hideControls ? 'dock-mode' : ''}`}>
      <WorkHUD hideControls={hideControls} key={locale} />
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
