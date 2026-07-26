import { useApp, getModel } from '../store';
import { t } from '../i18n/ui';

/** Step-jump list (not the long recipe prose — that is RecipeSheet on phone). */
export default function JumpDrawer() {
  const open = useApp((s) => s.jumpOpen);
  const setOpen = useApp((s) => s.setJumpOpen);
  const stepIndex = useApp((s) => s.stepIndex);
  const setStep = useApp((s) => s.setStep);
  const locale = useApp((s) => s.locale);
  const ui = t(locale);
  const steps = getModel().steps;

  if (!open) return null;

  return (
    <>
      <div className="drawer-backdrop" onClick={() => setOpen(false)} aria-hidden />
      <aside className="jump-drawer" role="dialog" aria-label={ui.jumpList}>
        <div className="card-head">
          <span className="label">{ui.jumpList}</span>
          <button
            type="button"
            className="school-close"
            onClick={() => setOpen(false)}
            aria-label={locale === 'en' ? 'Close' : 'Lukk'}
          >
            ×
          </button>
        </div>
        <p className="jump-drawer-lead">
          {locale === 'en'
            ? 'Tap a step to jump there. You can always return to where you were.'
            : 'Trykk et steg for å hoppe dit. Du kan alltid gå tilbake dit du var.'}
        </p>
        <div className="jump-drawer-body">
          {steps.map((s, i) => (
            <button
              key={s.id}
              type="button"
              className={i < stepIndex ? 'done' : i === stepIndex ? 'active' : ''}
              onClick={() => {
                setStep(i, true);
                setOpen(false);
              }}
            >
              <span className="idx">{i + 1}</span>
              <span className="jump-title">
                <em>{s.eyebrow}</em>
                {s.title}
              </span>
            </button>
          ))}
        </div>
      </aside>
    </>
  );
}
