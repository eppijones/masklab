import { useState } from 'react';
import { YARN_NAME } from '../data/types';
import { materialsChecklistNo } from '../sizing/materials';
import { deriveDesign } from './design';
import { buildRecipeText } from './RecipeText';
import { guideUrl, studioUrl } from './serialize';
import { useStudio } from './store';

export default function RecipeDrawer() {
  const open = useStudio((s) => s.recipeOpen);
  const setOpen = useStudio((s) => s.setRecipeOpen);
  const design = useStudio((s) => s.design);
  const validationErrors = useStudio((s) => s.validationErrors);
  const setNotice = useStudio((s) => s.setNotice);
  const [copied, setCopied] = useState<string | null>(null);

  if (!open) return null;

  const derived = deriveDesign(design);
  const errors = validationErrors();
  const m = derived.materials;
  const recipe = buildRecipeText(derived);

  const copy = async (label: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(null), 1800);
    } catch {
      setNotice('Nettleseren blokkerte kopiering — merk lenken manuelt.');
    }
  };

  const download = () => {
    const blob = new Blob([recipe], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${design.title.replace(/[^\wæøåÆØÅ -]/g, '') || 'masklab'}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <>
      <div
        className="st-drawer-back"
        role="presentation"
        onClick={() => setOpen(false)}
      />
      <aside className="st-drawer" role="dialog" aria-label="Oppskrift">
        <div className="st-drawer-head">
          <h2>Oppskriften din</h2>
          <button type="button" className="st-btn" onClick={() => setOpen(false)}>
            Lukk
          </button>
        </div>
        <div className="st-drawer-body">
          {errors.length > 0 && (
            <div className="st-errors">
              {errors.map((e) => (
                <span key={e}>{e}</span>
              ))}
            </div>
          )}

          <label className="st-field">
            <span>Navn på hatten</span>
            <input
              type="text"
              value={design.title}
              onChange={(e) =>
                useStudio.getState().edit({ title: e.target.value }, 'title')
              }
            />
          </label>

          <div className="st-rows">
            <div className="st-row">
              <span>Størrelse</span>
              <b>
                {derived.size.navn} · {m.omkrets_cm} cm
              </b>
            </div>
            <div className="st-row">
              <span>Nål</span>
              <b>{m.hookMm.toFixed(1).replace('.', ',')} mm</b>
            </div>
            <div className="st-row">
              <span>Masker rundt</span>
              <b>{m.bodyCount}</b>
            </div>
            <div className="st-row">
              <span>Runder</span>
              <b>{m.totalRounds}</b>
            </div>
            <div className="st-row">
              <span>Estimert tid</span>
              <b>
                {Math.round(m.estimatedMinutes / 60)} t {m.estimatedMinutes % 60} min
              </b>
            </div>
            {Object.entries(m.gramsByColor).map(([color, g]) => (
              <div className="st-row" key={color}>
                <span>{YARN_NAME[color as keyof typeof YARN_NAME]} garn</span>
                <b>≈ {g} g</b>
              </div>
            ))}
          </div>

          <div>
            <p className="st-sec-head">
              <span>Dette trenger du</span>
            </p>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.7 }}>
              {materialsChecklistNo(m).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p className="st-hint">{m.gaugeNoteNo}</p>
          </div>

          <div className="st-actions">
            <a
              className="st-btn primary"
              href={guideUrl(design)}
              onClick={(e) => {
                if (errors.length) {
                  e.preventDefault();
                  setNotice('Rett opp feilene før du starter guiden.');
                }
              }}
            >
              Hekle med guide →
            </a>
            <button
              type="button"
              className="st-btn"
              onClick={() => copy('studio', studioUrl(design))}
            >
              {copied === 'studio' ? 'Kopiert!' : 'Kopier designlenke'}
            </button>
            <button
              type="button"
              className="st-btn"
              onClick={() => copy('recipe', recipe)}
            >
              {copied === 'recipe' ? 'Kopiert!' : 'Kopier oppskrift'}
            </button>
            <button type="button" className="st-btn" onClick={download}>
              Last ned .txt
            </button>
            <button type="button" className="st-btn" onClick={() => window.print()}>
              Skriv ut / PDF
            </button>
          </div>

          <pre className="st-recipe">{recipe}</pre>
        </div>
      </aside>
    </>
  );
}
