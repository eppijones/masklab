import { useApp } from '../store';
import StepPanel from './StepPanel';
import { t } from '../i18n/ui';

/**
 * Phone / portrait-tablet: full step text lives here, not under the 3D stage.
 * Opened from the dock "Oppskrift" button so 3D + controls stay on screen.
 */
export default function RecipeSheet() {
  const open = useApp((s) => s.recipeOpen);
  const setOpen = useApp((s) => s.setRecipeOpen);
  const setJumpOpen = useApp((s) => s.setJumpOpen);
  const locale = useApp((s) => s.locale);
  const ui = t(locale);

  if (!open) return null;

  return (
    <>
      <div className="drawer-backdrop" onClick={() => setOpen(false)} aria-hidden />
      <aside className="recipe-sheet" role="dialog" aria-label={ui.patternLabel}>
        <div className="recipe-sheet-head">
          <span className="label">{ui.patternLabel}</span>
          <div className="recipe-sheet-actions">
            <button
              type="button"
              className="recipe-sheet-jump"
              onClick={() => {
                setOpen(false);
                setJumpOpen(true);
              }}
            >
              {ui.jumpList}
            </button>
            <button
              type="button"
              className="school-close"
              onClick={() => setOpen(false)}
              aria-label={locale === 'en' ? 'Close' : 'Lukk'}
            >
              ×
            </button>
          </div>
        </div>
        <div className="recipe-sheet-body">
          <StepPanel hideFoot variant="sheet" />
        </div>
      </aside>
    </>
  );
}
