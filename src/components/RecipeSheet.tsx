import { useApp } from '../store';
import StepPanel from './StepPanel';
import StitchJumpPanel from './StitchJumpPanel';
import { t } from '../i18n/ui';

/**
 * Phone / portrait-tablet: full step text + color-run jumps live here,
 * not over the 3D stage.
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
          <StitchJumpPanel onPicked={() => setOpen(false)} />
          <StepPanel hideFoot variant="sheet" />
        </div>
      </aside>
    </>
  );
}
