import { useApp } from '../store';
import { CHEAT_SHEET, TROUBLESHOOTING } from '../data/troubleshooting';

export function CheatSheet() {
  const open = useApp((s) => s.cheatOpen);
  const setOpen = useApp((s) => s.setCheatOpen);
  if (!open) return null;
  return (
    <div className="overlay" onClick={() => setOpen(false)}>
      <div className="overlay-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 860 }}>
        <div className="overlay-head">
          <h3 className="overlay-title">Huskelappen — kortversjonen</h3>
          <button className="overlay-close" onClick={() => setOpen(false)}>
            Lukk
          </button>
        </div>
        <p className="overlay-sub">
          Dette er kortversjonen du kan ha ved siden av deg mens du hekler.
        </p>
        <div className="cheat-grid">
          {CHEAT_SHEET.map((c) => (
            <div className="cheat-card" key={c.title}>
              <h4>{c.title}</h4>
              <p>{c.lines.join('\n')}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function TroubleDrawer() {
  const open = useApp((s) => s.troubleOpen);
  const setOpen = useApp((s) => s.setTroubleOpen);
  if (!open) return null;
  return (
    <>
      <div className="overlay" style={{ background: 'rgba(32,29,24,0.25)' }} onClick={() => setOpen(false)} />
      <div className="drawer">
        <div className="drawer-head">
          <h3 className="overlay-title">Feilsøking</h3>
          <button className="overlay-close" onClick={() => setOpen(false)}>
            Lukk
          </button>
        </div>
        <div className="drawer-body">
          <p className="overlay-sub">
            Alt her er normalt å trenge. Stopp, pust, og finn problemet ditt:
          </p>
          {TROUBLESHOOTING.map((item) => (
            <details className="trouble-item" key={item.title}>
              <summary>{item.title}</summary>
              <ol>
                {item.steps.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
            </details>
          ))}
        </div>
      </div>
    </>
  );
}
