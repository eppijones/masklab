import { useEffect, useRef, useState } from 'react';
import './studio.css';
import DesignRail from './DesignRail';
import StudioStage from './StudioStage';
import RecipeDrawer from './RecipeDrawer';
import { useStudio } from './store';
import { isPatternId, type PatternId } from '../patterns/types';
import { deriveDesign } from './design';
import { useApp } from '../store';

const TEMPLATES: { id: Exclude<PatternId, 'custom'>; label: string }[] = [
  { id: 'ro-ro-ro', label: 'Ro det i land' },
  { id: 'flagget', label: 'Flagget til topps' },
  { id: 'martin', label: 'Vi som elsker Martin' },
  { id: 'norway26', label: "NORWAY'26 · Hjemme" },
  { id: 'norway26-white', label: "NORWAY'26 · Hvit" },
  { id: 'norway26-black', label: "NORWAY'26 · Svart" },
  { id: 'norway26-training', label: "NORWAY'26 · Trening" },
  { id: 'norway26-keeper', label: "NORWAY'26 · Keeper" },
];

export default function StudioApp() {
  const setTool = useStudio((s) => s.setTool);
  const undo = useStudio((s) => s.undo);
  const redo = useStudio((s) => s.redo);
  const canUndo = useStudio((s) => s.past.length > 0);
  const canRedo = useStudio((s) => s.future.length > 0);
  const surprise = useStudio((s) => s.surprise);
  const reset = useStudio((s) => s.reset);
  const loadTemplate = useStudio((s) => s.loadTemplate);
  const loadCode = useStudio((s) => s.loadCode);
  const setRecipeOpen = useStudio((s) => s.setRecipeOpen);
  const notice = useStudio((s) => s.notice);
  const setNotice = useStudio((s) => s.setNotice);
  const design = useStudio((s) => s.design);
  const selectedLayerId = useStudio((s) => s.selectedLayerId);
  const selectLayer = useStudio((s) => s.selectLayer);
  const nudgeSelected = useStudio((s) => s.nudgeSelected);
  const duplicateLayer = useStudio((s) => s.duplicateLayer);
  const removeLayer = useStudio((s) => s.removeLayer);
  const autoRotate = useApp((s) => s.autoRotate);
  const setAutoRotate = useApp((s) => s.setAutoRotate);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Boot from the URL: ?d=<design> reopens a shared design, ?pattern=<id>
  // starts from a published pattern. Either way the query is cleaned up so a
  // reload does not undo the user's later edits.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('d');
    const pattern = params.get('pattern');
    if (code) loadCode(code);
    else if (pattern && isPatternId(pattern) && pattern !== 'custom') {
      loadTemplate(pattern);
    }
    if (code || pattern) {
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, [loadCode, loadTemplate]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 3200);
    return () => clearTimeout(t);
  }, [notice, setNotice]);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [menuOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'd' && selectedLayerId) {
        e.preventDefault();
        duplicateLayer(selectedLayerId);
        return;
      }

      // Arrow keys walk the selected layer one stitch / one row at a time —
      // the only way to place a wordmark exactly on a stitch you have counted.
      const step = e.shiftKey ? 5 : 1;
      const cols = deriveDesign(design).bodyCount;
      if (selectedLayerId) {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          nudgeSelected(0, -step, cols);
          return;
        }
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          nudgeSelected(0, step, cols);
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          nudgeSelected(-step, 0, cols);
          return;
        }
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          nudgeSelected(step, 0, cols);
          return;
        }
        if (e.key === 'Backspace' || e.key === 'Delete') {
          e.preventDefault();
          removeLayer(selectedLayerId);
          return;
        }
      }

      if (e.key === 'b') setTool('brush');
      if (e.key === 'e') setTool('erase');
      if (e.key === 'v') setTool('select');
      if (e.key === 'Escape') {
        // One key that always gets you back to a safe, obvious state.
        setTool('select');
        if (selectedLayerId) selectLayer(null);
        setRecipeOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [
    undo,
    redo,
    setTool,
    setRecipeOpen,
    design,
    selectedLayerId,
    selectLayer,
    nudgeSelected,
    duplicateLayer,
    removeLayer,
  ]);

  return (
    <div className="st-root">
      <div className="st-barwrap">
        <div className="st-bar">
          <span className="st-bar-title">
            STUDIO<span style={{ color: 'var(--st-red)' }}>*</span>
          </span>
          <span className="st-bar-sub">Bøttehatt · én maske om gangen</span>
          <span className="st-bar-spacer" />

          <div className="st-group">
            <button
              type="button"
              className="st-tool"
              onClick={undo}
              disabled={!canUndo}
              title="Angre (⌘Z)"
            >
              ↶
            </button>
            <button
              type="button"
              className="st-tool"
              onClick={redo}
              disabled={!canRedo}
              title="Gjør om (⇧⌘Z)"
            >
              ↷
            </button>
          </div>

          <button
            type="button"
            className="st-btn"
            onClick={() => setAutoRotate(!autoRotate)}
            title="Snurr hatten"
          >
            {autoRotate ? '⏸ Snurring' : '⟳ Snurr'}
          </button>
          <button type="button" className="st-btn" onClick={surprise}>
            ✳ Overrask meg
          </button>
          <button
            type="button"
            className="st-btn"
            onClick={() => setMenuOpen((v) => !v)}
          >
            Maler ▾
          </button>
          <button
            type="button"
            className="st-btn primary"
            onClick={() => setRecipeOpen(true)}
          >
            Oppskrift →
          </button>
        </div>

        {menuOpen && (
          <div className="st-pop" ref={menuRef}>
            <p className="st-pop-head">Start fra en ferdig hatt</p>
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  loadTemplate(t.id);
                  setMenuOpen(false);
                }}
              >
                {t.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                reset();
                setMenuOpen(false);
                setNotice('Blankt lerret.');
              }}
            >
              Blankt lerret
            </button>
          </div>
        )}
      </div>

      <div className="st-body">
        <DesignRail />
        <StudioStage />
      </div>

      <RecipeDrawer />
      {notice && <div className="st-notice">{notice}</div>}
    </div>
  );
}
