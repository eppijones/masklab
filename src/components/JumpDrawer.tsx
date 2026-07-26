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
      <aside className="jump-drawer" role="dialog" aria-label="Hopp til steg">
        <div className="card-head">
          <span className="label">Hopp til steg</span>
          <button type="button" className="school-close" onClick={() => setOpen(false)} aria-label="Lukk">
            ×
          </button>
        </div>
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
              <span>{s.title}</span>
            </button>
          ))}
        </div>
      </aside>
    </>
  );
}
