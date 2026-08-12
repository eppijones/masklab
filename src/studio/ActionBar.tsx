import { getShape } from '../data/shapes/catalog';
import { useStudio } from './store';

/**
 * The contextual action bar.
 *
 * Whatever is selected, the six or seven things you are most likely to want
 * next are one click away — arch a word, wrap a motif around the hat, mirror
 * a band. Every one of them is an ordinary layer edit underneath, so they all
 * undo, and none of them can produce something the hat cannot be crocheted
 * from.
 */

interface Action {
  label: string;
  title: string;
  on?: boolean;
  run: () => void;
}

export default function ActionBar() {
  const design = useStudio((s) => s.design);
  const selectedId = useStudio((s) => s.selectedLayerId);
  const updateLayer = useStudio((s) => s.updateLayer);
  const autoFit = useStudio((s) => s.autoFitSelected);
  const align = useStudio((s) => s.alignSelected);
  const distribute = useStudio((s) => s.distributeSelected);
  const duplicateLayer = useStudio((s) => s.duplicateLayer);
  const toggleLocked = useStudio((s) => s.toggleLayerLocked);
  const layer = design.layers.find((l) => l.id === selectedId) ?? null;

  if (!layer) {
    return (
      <div className="st-actionbar empty">
        Velg et lag på diagrammet for å få forslag til hva du kan gjøre med det.
      </div>
    );
  }

  const actions: Action[] = [];

  if (layer.kind === 'text') {
    actions.push(
      {
        label: 'Bue',
        title: 'Bøy grunnlinja i en bue',
        on: (layer.arcRows ?? 0) !== 0,
        run: () =>
          updateLayer(layer.id, {
            arcRows: (layer.arcRows ?? 0) !== 0 ? 0 : Math.max(2, Math.round(design.bandRows / 6)),
          }),
      },
      {
        label: 'Kontur',
        title: 'Legg en kontur rundt bokstavene',
        on: !!layer.haloColorId,
        run: () =>
          updateLayer(layer.id, {
            haloColorId: layer.haloColorId ? null : design.baseColor,
            haloWidth: 1,
          }),
      },
      {
        label: 'Tilpass',
        title: 'Gjør teksten så stor som feltet tillater',
        run: autoFit,
      },
      {
        label: 'Midtstill',
        title: 'Sentrer i mønsterfeltet',
        run: () => align('middle'),
      },
      {
        label: 'Foran',
        title: 'Flytt til forsiden av hatten',
        run: () => align('front'),
      },
      {
        label: 'Strekk',
        title: 'Bredere bokstaver',
        run: () =>
          updateLayer(layer.id, {
            scaleX: Math.min(6, (layer.scaleX ?? 1) + 1),
          }),
      },
      {
        label: 'Rundt',
        title: 'Gjenta ordet rundt hele hatten',
        run: () => distribute(Math.max(2, layer.repeat + 1)),
      },
      {
        label: 'Merke',
        title: 'Sett ordet i et rundt merke',
        run: () => {
          const store = useStudio.getState();
          store.addShapeLayer('badge-circle');
          const badge = useStudio.getState().design.layers.at(-1);
          if (badge) {
            store.updateLayer(badge.id, { centerFrac: layer.centerFrac ?? 0.095 });
            store.moveLayer(badge.id, -1);
          }
          store.selectLayer(layer.id);
        },
      },
    );
  }

  if (layer.kind === 'shape') {
    const spec = getShape(layer.shapeId);
    actions.push(
      {
        label: 'Gjenta',
        title: 'Flere kopier rundt hatten',
        run: () => updateLayer(layer.id, { repeatX: Math.min(24, layer.repeatX + 1) }),
      },
      {
        label: 'Speil',
        title: 'Speilvend annenhver kopi',
        on: !!layer.mirrorAlt,
        run: () => updateLayer(layer.id, { mirrorAlt: !layer.mirrorAlt }),
      },
      {
        label: 'Vekselfarge',
        title: 'Annenhver kopi i kantfargen',
        on: !!layer.altColorId,
        run: () =>
          updateLayer(layer.id, {
            altColorId: layer.altColorId ? null : design.brimColor,
          }),
      },
      {
        label: 'Rundt hele',
        title: 'Fordel kopiene jevnt rundt hele omkretsen',
        on: !!layer.wrap,
        run: () => (layer.wrap ? updateLayer(layer.id, { wrap: false }) : distribute()),
      },
      {
        label: 'Fordel',
        title: 'Så mange kopier det er plass til',
        run: () => distribute(),
      },
      {
        label: 'Tilpass',
        title: 'Fyll høyden i mønsterfeltet',
        run: autoFit,
      },
      {
        label: 'Midtstill',
        title: 'Sentrer i mønsterfeltet',
        run: () => align('middle'),
      },
      {
        label: 'Forenkle',
        title: 'Fjern detaljer som er for små for maskene',
        on: !!layer.simplify,
        run: () => updateLayer(layer.id, { simplify: !layer.simplify }),
      },
    );
    if (spec && !spec.tiling) {
      actions.push({
        label: 'Snu',
        title: 'Vend motivet vannrett',
        on: !!layer.flipX,
        run: () => updateLayer(layer.id, { flipX: !layer.flipX }),
      });
    }
  }

  if (layer.kind === 'image' || layer.kind === 'motif') {
    actions.push({
      label: 'Midtstill',
      title: 'Sentrer i mønsterfeltet',
      run: () => align('middle'),
    });
  }

  actions.push(
    { label: 'Dupliser', title: 'Lag en kopi av laget', run: () => duplicateLayer(layer.id) },
    {
      label: layer.locked ? 'Lås opp' : 'Lås',
      title: 'Lås laget så det ikke kan dras ved et uhell',
      on: !!layer.locked,
      run: () => toggleLocked(layer.id),
    },
  );

  return (
    <div className="st-actionbar">
      {actions.map((a) => (
        <button
          key={a.label}
          type="button"
          className={`st-action ${a.on ? 'on' : ''}`}
          title={a.title}
          onClick={a.run}
        >
          {a.label}
        </button>
      ))}
    </div>
  );
}
