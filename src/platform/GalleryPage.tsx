import { useState } from 'react';
import { CATALOG, type CatalogEntry } from './catalog';
import { YARN_HEX, YARN_NAME } from '../data/types';
import { getPattern } from '../patterns/registry';
import { derivePattern } from '../patterns/buildFromDefinition';
import { buildRecipeText } from '../studio/RecipeText';
import HatCard3D from './HatCard3D';

type Filter = 'alle' | 'helene' | 'norway26' | 'arkiv';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'alle', label: 'Alle' },
  { id: 'helene', label: 'Helene Spilling-kolleksjonen' },
  { id: 'norway26', label: "NORWAY'26-kolleksjonen" },
  { id: 'arkiv', label: 'Arkivet' },
];

function Card({
  p,
  onRecipe,
}: {
  p: CatalogEntry;
  onRecipe: (p: CatalogEntry) => void;
}) {
  return (
    <div className="ml-card">
      <div className="ml-card-mock">
        <HatCard3D id={p.id} />
        {p.tag && <span className="ml-tag">{p.tag}</span>}
      </div>
      <div className="ml-card-body">
        <div className="ml-card-titlerow">
          <span className="ml-card-name">{p.name}</span>
          <span className="ml-card-diff" title="Vanskelighetsgrad">
            {p.difficulty}
          </span>
        </div>
        <span className="ml-card-desc">{p.desc}</span>
        <div className="ml-chips">
          {p.colors.map((c) => (
            <span key={c} className="ml-chip">
              <span
                className="ml-chip-dot"
                style={{ background: YARN_HEX[c] }}
              />
              {YARN_NAME[c]}
            </span>
          ))}
        </div>
        <div className="ml-card-meta">
          <span>nål {p.hook}</span>
          <span>·</span>
          <span>str barn–herre</span>
          <span>·</span>
          <span>ca {p.time}</span>
        </div>
        <div className="ml-card-actions">
          <a href={`/oppskrift/${p.id}`} className="ml-btn primary">
            Start →
          </a>
          <a href={`/studio?pattern=${p.id}`} className="ml-btn ghost">
            Åpne i studio
          </a>
          <button
            type="button"
            className="ml-btn ghost"
            onClick={() => onRecipe(p)}
          >
            Se oppskrift
          </button>
        </div>
      </div>
    </div>
  );
}

export default function GalleryPage() {
  const [filter, setFilter] = useState<Filter>('alle');
  const [recipe, setRecipe] = useState<{ title: string; text: string } | null>(
    null,
  );
  const groups: { id: Exclude<Filter, 'alle'>; title: string; note?: string }[] =
    [
      { id: 'helene', title: 'Helene Spilling-kolleksjonen' },
      {
        id: 'norway26',
        title: "NORWAY'26-kolleksjonen",
        note: 'Home, Away og Keeper — de tre hattene i kolleksjonen.',
      },
      {
        id: 'arkiv',
        title: 'Arkivet',
        note: 'Tidligere utkast. Fortsatt komplette oppskrifter med guide og 3D.',
      },
    ];
  const shown = groups.filter((g) => filter === 'alle' || filter === g.id);

  const openRecipe = (p: CatalogEntry) => {
    const derived = derivePattern(getPattern(p.id));
    setRecipe({ title: p.name, text: buildRecipeText(derived) });
  };

  return (
    <div className="ml-page">
      <div className="ml-page-head">
        <div>
          <span className="ml-eyebrow">Oppskriftsindeks</span>
          <h1 className="ml-page-title">
            Bøttehatt — <em>oppskrifter</em>
          </h1>
        </div>
        <p className="ml-page-lede">
          {CATALOG.length} mønstre · alle heklet i fastmaske, top-down. Hver
          eneste har komplett runde-for-runde-guide i 3D.
        </p>
      </div>
      <div className="ml-filters">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            className={`ml-filter ${filter === f.id ? 'on' : ''}`}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>
      {shown.map((g) => (
        <section key={g.id} className="ml-group">
          <h2 className="ml-group-title">{g.title}</h2>
          {g.note && <p className="ml-group-note">{g.note}</p>}
          <div className="ml-grid">
            {CATALOG.filter((p) => p.collection === g.id).map((p) => (
              <Card key={p.id} p={p} onRecipe={openRecipe} />
            ))}
          </div>
        </section>
      ))}

      {recipe && (
        <div
          className="ml-modal-backdrop"
          onClick={() => setRecipe(null)}
          role="presentation"
        >
          <div
            className="ml-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal
            aria-label={recipe.title}
          >
            <div className="ml-modal-head">
              <h2>{recipe.title}</h2>
              <button type="button" onClick={() => setRecipe(null)}>
                Lukk
              </button>
            </div>
            <pre>{recipe.text}</pre>
          </div>
        </div>
      )}
    </div>
  );
}
