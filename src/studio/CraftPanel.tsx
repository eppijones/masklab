import { craftSummary, type CraftFinding } from './craftRules';
import { useStudio } from './store';

/**
 * The craft check, in the rail.
 *
 * Not a validator that blocks you — a second pair of eyes. It says what will
 * go wrong at the hook, points at the stitches it means, and where the repair
 * is unambiguous it offers to do it.
 */
export default function CraftPanel() {
  const findings = useStudio((s) => s.craftFindings)();
  const open = useStudio((s) => s.craftOpen);
  const setOpen = useStudio((s) => s.setCraftOpen);
  const focusId = useStudio((s) => s.focusFindingId);
  const setFocus = useStudio((s) => s.setFocusFinding);
  const selectLayer = useStudio((s) => s.selectLayer);
  const applyFix = useStudio((s) => s.applyFix);
  const summary = craftSummary(findings);

  const label =
    summary.level === 'ok'
      ? 'Klar til å hekles'
      : summary.errors > 0
        ? `${summary.errors} må fikses`
        : summary.warnings > 0
          ? `${summary.warnings} å se på`
          : `${findings.length} tips`;

  return (
    <section className="st-craft">
      <button
        type="button"
        className="st-sec-head st-craft-head"
        onClick={() => setOpen(!open)}
      >
        <span>Håndverkssjekk</span>
        <span className={`st-craft-pill lvl-${summary.level}`}>{label}</span>
      </button>

      {open && findings.length === 0 && (
        <p className="st-hint">
          Ingenting skurrer: bokstavene får plass i feltet, fargene holder
          kontrast, og ingen runde har flere garn enn du klarer å holde styr på.
        </p>
      )}

      {open && (
        <div className="st-findings">
          {findings.map((f) => (
            <Finding
              key={f.id}
              f={f}
              focused={focusId === f.id}
              onFocus={() => {
                setFocus(focusId === f.id ? null : f.id);
                if (f.layerId) selectLayer(f.layerId);
              }}
              onFix={() => f.fix && applyFix(f.fix)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function Finding({
  f,
  focused,
  onFocus,
  onFix,
}: {
  f: CraftFinding;
  focused: boolean;
  onFocus: () => void;
  onFix: () => void;
}) {
  return (
    <div className={`st-finding lvl-${f.level} ${focused ? 'on' : ''}`}>
      <button type="button" className="st-finding-main" onClick={onFocus}>
        <span className="st-finding-title">{f.title}</span>
        <span className="st-finding-detail">{f.detail}</span>
      </button>
      {f.fix && (
        <button type="button" className="st-chip st-finding-fix" onClick={onFix}>
          {f.fix.label}
        </button>
      )}
    </div>
  );
}
