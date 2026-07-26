import { useApp, getModel } from '../store';

/** Left slide-over: hopp til steg uten å skyve layouten. */
export default function JumpDrawer() {
  const open = useApp((s) => s.jumpOpen);
  const setOpen = useApp((s) => s.setJumpOpen);
  const stepIndex = useApp((s) => s.stepIndex);
  const setStep = useApp((s) => s.setStep);
  const steps = getModel().steps;

  if (!open) return null;

  return (
    <>
      <div className="drawer-backdrop" onClick={() => setOpen(false)} aria-hidden />
      <aside className="jump-drawer" role="dialog" aria-label="Hele oppskriften">
        <div className="card-head">
          <span className="label">Hele oppskriften</span>
          <button type="button" className="school-close" onClick={() => setOpen(false)} aria-label="Lukk">
            ×
          </button>
        </div>
        <p className="jump-drawer-lead">
          Trykk et steg for å hoppe dit. Du kan alltid gå tilbake dit du var.
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
