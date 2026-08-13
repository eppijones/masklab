import { useRef } from 'react';
import { YARN_HEX, YARN_NAME, type YarnColor } from '../data/types';
import { getFont, listFonts } from '../data/fonts/registry';
import type { FontId } from '../data/fonts/types';
import { HOOKS } from '../sizing/hooks';
import { SIZES } from '../sizing/sizes';
import type { ChartLayer, TextLayer } from '../data/chartLayers';
import { placementBox, textPlacements } from '../data/layerGeometry';
import { getShape } from '../data/shapes/catalog';
import { MOTIF_KINDS, deriveDesign } from './design';
import CraftPanel from './CraftPanel';
import AssistPanel from './AssistPanel';
import ShapePicker from './ShapePicker';
import { useStudio } from './store';
import {
  forgetSource,
  photoToBitmap,
  readImageData,
  rememberSource,
  sourceFor,
} from './imageToBitmap';

const YARNS = Object.keys(YARN_HEX) as YarnColor[];

const FONT_LABELS: Record<FontId, string> = {
  blokk: 'BLOKK',
  smal: 'SMAL',
  kursiv: 'Kursiv',
  serif: 'Serif',
  ro: 'RO',
  taakeferd: 'Tåke',
  lyn: 'Lyn',
  runik: 'Runer',
  norge26: 'Norge26',
  norgeDisplay26: 'NORGE Display',
  norgeKursiv26: 'NORGE Kursiv',
};

function layerName(l: ChartLayer): string {
  if (l.kind === 'text') return `Tekst · ${l.text}`;
  if (l.kind === 'motif') {
    return `Motiv · ${MOTIF_KINDS.find((m) => m.id === l.motif)?.label ?? l.motif}`;
  }
  if (l.kind === 'shape') {
    return `Form · ${getShape(l.shapeId)?.label ?? l.shapeId}`;
  }
  return `Foto · ${l.srcRef}`;
}

/** Plain-language readout of whether the word still fits the band. */
function textFits(l: TextLayer, bandRows: number, cols: number): string {
  const boxes = textPlacements(l, cols)
    .map(placementBox)
    .filter((b): b is NonNullable<typeof b> => b != null);
  if (boxes.length === 0) return 'Skriv noe i tekstfeltet.';
  const top = Math.min(...boxes.map((b) => b.row0));
  const bottom = Math.max(...boxes.map((b) => b.row1));
  const h = bottom - top + 1;
  const w = boxes[0].width;
  return h > bandRows
    ? `${w} masker bred, ${h} rader høy — ${h - bandRows} rader for høyt for feltet.`
    : `${w} masker bred, ${h} av ${bandRows} rader høy.`;
}

function layerColor(l: ChartLayer): YarnColor {
  if (l.kind === 'text') return l.colorId;
  if (l.kind === 'motif' || l.kind === 'shape') return l.colorIds[0] ?? 'red';
  return l.colorId ?? 'red';
}

export default function DesignRail() {
  const design = useStudio((s) => s.design);
  const activeYarn = useStudio((s) => s.activeYarn);
  const setActiveYarn = useStudio((s) => s.setActiveYarn);
  const fillPart = useStudio((s) => s.fillPart);
  const edit = useStudio((s) => s.edit);
  const setSize = useStudio((s) => s.setSize);
  const layers = design.layers;
  const selectedLayerId = useStudio((s) => s.selectedLayerId);
  const selectLayer = useStudio((s) => s.selectLayer);
  const addTextLayer = useStudio((s) => s.addTextLayer);
  const addMotifLayer = useStudio((s) => s.addMotifLayer);
  const addImageLayer = useStudio((s) => s.addImageLayer);
  const updateLayer = useStudio((s) => s.updateLayer);
  const removeLayer = useStudio((s) => s.removeLayer);
  const toggleLayerHidden = useStudio((s) => s.toggleLayerHidden);
  const moveLayer = useStudio((s) => s.moveLayer);
  const duplicateLayer = useStudio((s) => s.duplicateLayer);
  const clearOverride = useStudio((s) => s.clearOverride);
  const textDraft = useStudio((s) => s.textDraft);
  const setTextDraft = useStudio((s) => s.setTextDraft);
  const setNotice = useStudio((s) => s.setNotice);
  const fileRef = useRef<HTMLInputElement>(null);

  const derived = deriveDesign(design);
  const selected = layers.find((l) => l.id === selectedLayerId) ?? null;
  const strokes = Object.keys(design.override.cells).length;

  const pickPhoto = async (file: File) => {
    try {
      const data = await readImageData(file);
      const cols = Math.max(12, Math.round(derived.bodyCount * 0.32));
      const rows = design.bandRows;
      const bitmap = photoToBitmap(data, {
        cols,
        rows,
        contrast: 0,
        brightness: 0,
        dither: true,
        invert: false,
      });
      const before = new Set(useStudio.getState().design.layers.map((l) => l.id));
      addImageLayer(bitmap, file.name.replace(/\.[^.]+$/, ''));
      const added = useStudio
        .getState()
        .design.layers.find((l) => !before.has(l.id));
      if (added) rememberSource(added.id, data);
      setNotice('Bildet er oversatt til masker — juster med skyvene.');
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Kunne ikke lese bildet.');
    }
  };

  /** Re-run the photo conversion for a layer after a slider move. */
  const rePhoto = (
    id: string,
    patch: { contrast?: number; brightness?: number; dither?: boolean; cols?: number },
    mergeKey: string,
  ) => {
    const layer = useStudio.getState().design.layers.find((l) => l.id === id);
    if (!layer || layer.kind !== 'image') return;
    const src = sourceFor(id);
    const next = {
      contrast: patch.contrast ?? layer.contrast,
      brightness: patch.brightness ?? layer.brightness ?? 0,
      dither: patch.dither ?? layer.dither,
      cols: patch.cols ?? layer.cols,
    };
    if (!src) {
      // Source is gone (shared link): keep the stored bitmap, store the values.
      updateLayer(id, next, mergeKey);
      return;
    }
    const bitmap = photoToBitmap(src, {
      cols: next.cols,
      rows: layer.rows,
      contrast: next.contrast,
      brightness: next.brightness,
      dither: next.dither,
      invert: false,
    });
    updateLayer(id, { ...next, bitmap }, mergeKey);
  };

  return (
    <aside className="st-rail">
      <AssistPanel />

      <section>
        <p className="st-sec-head">
          <span>Garnpalett</span>
          <span style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 700 }}>
            {YARN_NAME[activeYarn]}
          </span>
        </p>
        <div className="st-yarns">
          {YARNS.map((c) => (
            <button
              key={c}
              type="button"
              title={YARN_NAME[c]}
              aria-label={YARN_NAME[c]}
              className={`st-yarn ${activeYarn === c ? 'on' : ''}`}
              style={{ background: YARN_HEX[c] }}
              onClick={() => setActiveYarn(c)}
            />
          ))}
        </div>
        <p className="st-hint">
          Velg et garn — det brukes til pensel, fyll og nye lag. Er et lag valgt,
          bytter det farge med det samme.
        </p>
      </section>

      <section>
        <p className="st-sec-head">
          <span>Hatten</span>
          <span style={{ textTransform: 'none', letterSpacing: 0 }}>
            fyll med valgt garn
          </span>
        </p>
        <div className="st-parts">
          {(
            [
              ['crown', 'Pull (toppen)', design.crownColor, `${derived.rounds.filter((r) => r.phase === 'top').length} runder`],
              ['base', 'Bunn i mønsterfeltet', design.baseColor, `${design.bandRows} rader`],
              ['brim', 'Kant', design.brimColor, 'nederst'],
            ] as const
          ).map(([part, label, color, note]) => (
            <button
              key={part}
              type="button"
              className="st-part"
              onClick={() => fillPart(part)}
            >
              <span className="st-swatch" style={{ background: YARN_HEX[color] }} />
              <span className="st-part-label">{label}</span>
              <span className="st-part-note">{note}</span>
            </button>
          ))}
        </div>
      </section>

      <section>
        <p className="st-sec-head">
          <span>Passform</span>
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <label className="st-field">
            <span>
              Heklenål <b>{design.hookMm.toFixed(1).replace('.', ',')} mm</b>
            </span>
            <select
              value={design.hookMm}
              onChange={(e) =>
                edit({ hookMm: Number(e.target.value) as typeof design.hookMm })
              }
            >
              {HOOKS.map((h) => (
                <option key={h.mm} value={h.mm}>
                  {h.mm.toFixed(1).replace('.', ',')} mm · {h.gauge_fm_per_10cm} fm
                  /10 cm
                </option>
              ))}
            </select>
          </label>
          <div className="st-grid3">
            {SIZES.filter((s) => s.id !== 'egendefinert').map((s) => (
              <button
                key={s.id}
                type="button"
                className={`st-chip ${design.sizeId === s.id ? 'on' : ''}`}
                onClick={() => setSize(s.id, s.omkrets_cm)}
              >
                {s.navn}
              </button>
            ))}
          </div>
          <label className="st-field">
            <span>
              Hodeomkrets <b>{design.omkrets_cm} cm</b>
            </span>
            <input
              type="range"
              min={44}
              max={64}
              step={1}
              value={design.omkrets_cm}
              onChange={(e) =>
                setSize('egendefinert', Number(e.target.value))
              }
            />
          </label>
          <label className="st-field">
            <span>
              Høyde på mønsterfeltet <b>{design.bandRows} rader</b>
            </span>
            <input
              type="range"
              min={6}
              max={35}
              step={1}
              value={design.bandRows}
              onChange={(e) => edit({ bandRows: Number(e.target.value) }, 'bandRows')}
            />
          </label>
          <p className="st-readout">
            <b>{derived.bodyCount} masker</b> rundt · {derived.rounds.length} runder ·
            ca.{' '}
            <b>
              {Math.round(derived.materials.estimatedMinutes / 60)} t{' '}
              {derived.materials.estimatedMinutes % 60} min
            </b>
          </p>
        </div>
      </section>

      <section>
        <p className="st-sec-head">
          <span>Lag</span>
          <span style={{ textTransform: 'none', letterSpacing: 0 }}>øverst vinner</span>
        </p>
        <div className="st-layers">
          {[...layers].reverse().map((l) => (
            <div
              key={l.id}
              className={`st-layer ${l.id === selectedLayerId ? 'on' : ''}`}
            >
              <button
                type="button"
                className="st-icon"
                title={l.hidden ? 'Vis laget' : 'Skjul laget'}
                onClick={() => toggleLayerHidden(l.id)}
              >
                {l.hidden ? '○' : '●'}
              </button>
              <button
                type="button"
                className="st-layer-name"
                onClick={() => selectLayer(l.id === selectedLayerId ? null : l.id)}
              >
                {layerName(l)}
              </button>
              <span
                className="st-layer-dot"
                style={{ background: YARN_HEX[layerColor(l)] }}
              />
              <button
                type="button"
                className="st-icon"
                title="Dupliser laget"
                onClick={() => duplicateLayer(l.id)}
              >
                ⧉
              </button>
              <button
                type="button"
                className="st-icon"
                title="Flytt opp"
                onClick={() => moveLayer(l.id, 1)}
              >
                ↑
              </button>
              <button
                type="button"
                className="st-icon"
                title="Flytt ned"
                onClick={() => moveLayer(l.id, -1)}
              >
                ↓
              </button>
              <button
                type="button"
                className="st-icon danger"
                title="Slett laget"
                onClick={() => {
                  forgetSource(l.id);
                  removeLayer(l.id);
                }}
              >
                ×
              </button>
            </div>
          ))}
          <div className="st-layer" style={{ borderStyle: 'dashed' }}>
            <span className="st-icon">✎</span>
            <span className="st-layer-name">Penselstrøk ({strokes})</span>
            <button
              type="button"
              className="st-icon danger"
              onClick={clearOverride}
              disabled={strokes === 0}
            >
              tøm
            </button>
          </div>
        </div>

        <div className="st-grid3" style={{ marginTop: 8 }}>
          <button type="button" className="st-chip" onClick={addTextLayer}>
            + Tekst
          </button>
          <button
            type="button"
            className="st-chip"
            onClick={() => addMotifLayer('stripe')}
          >
            + Motiv
          </button>
          <button
            type="button"
            className="st-chip"
            onClick={() => fileRef.current?.click()}
          >
            + Foto
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (file) void pickPhoto(file);
          }}
        />
        <label className="st-field" style={{ marginTop: 8 }}>
          <span>Tekst for nytt lag</span>
          <input
            type="text"
            value={textDraft}
            onChange={(e) => setTextDraft(e.target.value)}
            placeholder="Skriv noe …"
          />
        </label>
      </section>

      {selected?.kind === 'text' && (
        <div className="st-params">
          <p className="st-params-head">Tekstlag</p>
          <label className="st-field">
            <span>Tekst</span>
            <input
              type="text"
              value={selected.text}
              onChange={(e) =>
                updateLayer(selected.id, { text: e.target.value }, `text:${selected.id}`)
              }
            />
          </label>
          <div className="st-grid2">
            {listFonts().map((f) => (
              <button
                key={f.id}
                type="button"
                className={`st-chip ${selected.fontId === f.id ? 'on' : ''}`}
                onClick={() => updateLayer(selected.id, { fontId: f.id })}
              >
                {FONT_LABELS[f.id]}
              </button>
            ))}
          </div>
          <div className="st-scalerow">
            <span className="st-scalerow-label">Skala</span>
            {(
              [
                ['scaleX', 'Bredde', selected.scaleX ?? 1],
                ['scaleY', 'Høyde', selected.scaleY ?? 1],
              ] as const
            ).map(([key, label, value]) => (
              <span key={key} className="st-stepper" title={label}>
                <button
                  type="button"
                  onClick={() =>
                    updateLayer(selected.id, { [key]: Math.max(1, value - 1) })
                  }
                  disabled={value <= 1}
                  aria-label={`${label} mindre`}
                >
                  −
                </button>
                <b>
                  {label[0]} {value}×
                </b>
                <button
                  type="button"
                  onClick={() =>
                    updateLayer(selected.id, { [key]: Math.min(6, value + 1) })
                  }
                  disabled={value >= 6}
                  aria-label={`${label} større`}
                >
                  +
                </button>
              </span>
            ))}
          </div>
          <p className="st-hint" style={{ marginTop: 0 }}>
            {textFits(selected, design.bandRows, derived.bodyCount)}
          </p>
          <label className="st-field">
            <span>
              Høyde i feltet <b>rad {selected.anchor.row + 1}</b>
            </span>
            <input
              type="range"
              min={0}
              max={Math.max(
                0,
                design.bandRows -
                  getFont(selected.fontId).cell.h * (selected.scaleY ?? 1),
              )}
              value={Math.min(
                selected.anchor.row,
                Math.max(
                  0,
                  design.bandRows -
                    getFont(selected.fontId).cell.h * (selected.scaleY ?? 1),
                ),
              )}
              onChange={(e) =>
                updateLayer(
                  selected.id,
                  { row: Number(e.target.value) },
                  `row:${selected.id}`,
                )
              }
            />
          </label>
          <label className="st-field">
            <span>
              Rundt hatten <b>{Math.round((selected.centerFrac ?? 0) * 100)} %</b>
            </span>
            <input
              type="range"
              min={0}
              max={99}
              value={Math.round((selected.centerFrac ?? 0.095) * 100)}
              onChange={(e) =>
                updateLayer(
                  selected.id,
                  { centerFrac: Number(e.target.value) / 100 },
                  `frac:${selected.id}`,
                )
              }
            />
          </label>
          <label className="st-field">
            <span>
              Skråning <b>{selected.slantDeg}°</b>
            </span>
            <input
              type="range"
              min={-25}
              max={25}
              value={selected.slantDeg}
              onChange={(e) =>
                updateLayer(
                  selected.id,
                  { slantDeg: Number(e.target.value) },
                  `slant:${selected.id}`,
                )
              }
            />
          </label>
          <label className="st-field">
            <span>
              Stigning <b>{Math.round((selected.rise ?? 0) * 100)} %</b>
            </span>
            <input
              type="range"
              min={-20}
              max={20}
              value={Math.round((selected.rise ?? 0) * 100)}
              onChange={(e) =>
                updateLayer(
                  selected.id,
                  { rise: Number(e.target.value) / 100 },
                  `rise:${selected.id}`,
                )
              }
            />
          </label>
          <label className="st-field">
            <span>
              Tegnavstand <b>{selected.letterSpacing ?? 1}</b>
            </span>
            <input
              type="range"
              min={0}
              max={6}
              value={selected.letterSpacing ?? 1}
              onChange={(e) =>
                updateLayer(
                  selected.id,
                  { letterSpacing: Number(e.target.value) },
                  `sp:${selected.id}`,
                )
              }
            />
          </label>
          <div className="st-grid2">
            <button
              type="button"
              className={`st-chip ${selected.bold ? 'on' : ''}`}
              onClick={() => updateLayer(selected.id, { bold: !selected.bold })}
            >
              Fet skrift
            </button>
            <button
              type="button"
              className={`st-chip ${selected.mirror ? 'on' : ''}`}
              onClick={() => updateLayer(selected.id, { mirror: !selected.mirror })}
            >
              Speilvend
            </button>
          </div>
          <div>
            <p className="st-sec-head" style={{ marginTop: 10 }}>
              <span>Kontur</span>
              <span style={{ textTransform: 'none', letterSpacing: 0 }}>
                holder bokstavene lesbare
              </span>
            </p>
            <div className="st-yarns">
              <button
                type="button"
                title="Ingen kontur"
                aria-label="Ingen kontur"
                className={`st-yarn none ${!selected.haloColorId ? 'on' : ''}`}
                onClick={() => updateLayer(selected.id, { haloColorId: null })}
              />
              {YARNS.map((c) => (
                <button
                  key={c}
                  type="button"
                  title={YARN_NAME[c]}
                  aria-label={`Kontur i ${YARN_NAME[c]}`}
                  className={`st-yarn ${selected.haloColorId === c ? 'on' : ''}`}
                  style={{ background: YARN_HEX[c] }}
                  onClick={() =>
                    updateLayer(selected.id, { haloColorId: c, haloWidth: 1 })
                  }
                />
              ))}
            </div>
            {selected.haloColorId && (
              <div className="st-grid2" style={{ marginTop: 6 }}>
                {[1, 2].map((w) => (
                  <button
                    key={w}
                    type="button"
                    className={`st-chip ${(selected.haloWidth ?? 1) === w ? 'on' : ''}`}
                    onClick={() => updateLayer(selected.id, { haloWidth: w })}
                  >
                    {w} maske{w > 1 ? 'r' : ''}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
            <span className="st-field" style={{ flex: 1 }}>
              Gjenta
            </span>
            {[1, 2, 3, 4].map((n) => (
              <button
                key={n}
                type="button"
                className={`st-chip ${selected.repeat === n ? 'on' : ''}`}
                style={{ padding: '5px 9px' }}
                onClick={() => updateLayer(selected.id, { repeat: n })}
              >
                ×{n}
              </button>
            ))}
          </div>
        </div>
      )}

      {selected?.kind === 'motif' && (
        <div className="st-params">
          <p className="st-params-head">Motivlag</p>
          <div className="st-grid2">
            {MOTIF_KINDS.map((m) => (
              <button
                key={m.id}
                type="button"
                className={`st-chip ${selected.motif === m.id ? 'on' : ''}`}
                onClick={() => updateLayer(selected.id, { motif: m.id })}
              >
                {m.label}
              </button>
            ))}
          </div>
          <label className="st-field">
            <span>
              Fra rad <b>{Number(selected.params.rowStart ?? 0) + 1}</b>
            </span>
            <input
              type="range"
              min={0}
              max={design.bandRows - 1}
              value={Number(selected.params.rowStart ?? 0)}
              onChange={(e) =>
                updateLayer(
                  selected.id,
                  { 'param:rowStart': Number(e.target.value) },
                  `mrs:${selected.id}`,
                )
              }
            />
          </label>
          <label className="st-field">
            <span>
              Til rad <b>{Number(selected.params.rowEnd ?? design.bandRows - 1) + 1}</b>
            </span>
            <input
              type="range"
              min={0}
              max={design.bandRows - 1}
              value={Number(selected.params.rowEnd ?? design.bandRows - 1)}
              onChange={(e) =>
                updateLayer(
                  selected.id,
                  { 'param:rowEnd': Number(e.target.value) },
                  `mre:${selected.id}`,
                )
              }
            />
          </label>
          <MotifParam layerId={selected.id} motif={selected.motif} params={selected.params} />
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              type="button"
              className={`st-chip ${selected.params.transparent === true ? 'on' : ''}`}
              onClick={() =>
                updateLayer(selected.id, {
                  'param:transparent': selected.params.transparent !== true,
                })
              }
            >
              Gjennomsiktig bunn
            </button>
            <span className="st-hint" style={{ margin: 0 }}>
              Bakgrunn:{' '}
              <b>{YARN_NAME[selected.colorIds[1] ?? design.baseColor]}</b>
            </span>
          </div>
          <button
            type="button"
            className="st-chip"
            onClick={() =>
              updateLayer(selected.id, { bgColor: useStudio.getState().activeYarn })
            }
          >
            Sett bakgrunn til valgt garn
          </button>
        </div>
      )}

      {selected?.kind === 'image' && (
        <div className="st-params">
          <p className="st-params-head">Foto → mønster</p>
          <label className="st-field">
            <span>
              Bredde <b>{selected.cols} masker</b>
            </span>
            <input
              type="range"
              min={10}
              max={Math.max(20, derived.bodyCount)}
              value={selected.cols}
              onChange={(e) =>
                rePhoto(
                  selected.id,
                  { cols: Number(e.target.value) },
                  `pc:${selected.id}`,
                )
              }
            />
          </label>
          <label className="st-field">
            <span>
              Kontrast <b>{selected.contrast}</b>
            </span>
            <input
              type="range"
              min={-50}
              max={50}
              step={5}
              value={selected.contrast}
              onChange={(e) =>
                rePhoto(
                  selected.id,
                  { contrast: Number(e.target.value) },
                  `pk:${selected.id}`,
                )
              }
            />
          </label>
          <label className="st-field">
            <span>
              Lys <b>{selected.brightness ?? 0}</b>
            </span>
            <input
              type="range"
              min={-50}
              max={50}
              step={5}
              value={selected.brightness ?? 0}
              onChange={(e) =>
                rePhoto(
                  selected.id,
                  { brightness: Number(e.target.value) },
                  `pl:${selected.id}`,
                )
              }
            />
          </label>
          <label className="st-field">
            <span>
              Plassering rundt hatten <b>maske {selected.anchor.col}</b>
            </span>
            <input
              type="range"
              min={0}
              max={Math.max(0, derived.bodyCount - 1)}
              value={Math.min(selected.anchor.col, derived.bodyCount - 1)}
              onChange={(e) =>
                updateLayer(
                  selected.id,
                  { col: Number(e.target.value) },
                  `pcol:${selected.id}`,
                )
              }
            />
          </label>
          <label className="st-field">
            <span>
              Høyde i feltet <b>rad {selected.anchor.row + 1}</b>
            </span>
            <input
              type="range"
              min={0}
              max={Math.max(0, design.bandRows - 1)}
              value={Math.min(selected.anchor.row, design.bandRows - 1)}
              onChange={(e) =>
                updateLayer(
                  selected.id,
                  { row: Number(e.target.value) },
                  `prow:${selected.id}`,
                )
              }
            />
          </label>
          <button
            type="button"
            className={`st-chip ${selected.dither ? 'on' : ''}`}
            onClick={() => rePhoto(selected.id, { dither: !selected.dither }, `pd:${selected.id}`)}
          >
            Dithering: {selected.dither ? 'på' : 'av'}
          </button>
          {!sourceFor(selected.id) && (
            <p className="st-hint">
              Originalbildet ligger ikke i denne nettleserøkten — maskene er
              beholdt, men skyvene endrer ikke bildet før du laster det opp på nytt.
            </p>
          )}
        </div>
      )}
      <ShapePicker />
      {selected?.kind === 'shape' && (
        <ShapeInspector
          layer={selected}
          bandRows={design.bandRows}
          cols={derived.bodyCount}
        />
      )}
      <CraftPanel />
    </aside>
  );
}

/** The one shape-specific slider each motif needs. */
function MotifParam({
  layerId,
  motif,
  params,
}: {
  layerId: string;
  motif: string;
  params: Record<string, number | string | boolean>;
}) {
  const updateLayer = useStudio((s) => s.updateLayer);
  const spec: Record<string, { key: string; label: string; min: number; max: number }> = {
    stripe: { key: 'stripeH', label: 'Stripehøyde', min: 1, max: 6 },
    checker: { key: 'cell', label: 'Rutestørrelse', min: 1, max: 6 },
    chevron: { key: 'period', label: 'Bredde på sikksakk', min: 4, max: 24 },
    border: { key: 'thickness', label: 'Tykkelse', min: 1, max: 4 },
    dots: { key: 'spacing', label: 'Avstand', min: 2, max: 10 },
  };
  const s = spec[motif];
  if (!s) return null;
  const value = Number(params[s.key] ?? s.min);
  return (
    <label className="st-field">
      <span>
        {s.label} <b>{value}</b>
      </span>
      <input
        type="range"
        min={s.min}
        max={s.max}
        value={value}
        onChange={(e) =>
          updateLayer(
            layerId,
            { [`param:${s.key}`]: Number(e.target.value) },
            `mp:${layerId}`,
          )
        }
      />
    </label>
  );
}


/** Everything a placed motif can be told to do, in numbers. */
function ShapeInspector({
  layer,
  bandRows,
  cols,
}: {
  layer: Extract<ChartLayer, { kind: 'shape' }>;
  bandRows: number;
  cols: number;
}) {
  const updateLayer = useStudio((s) => s.updateLayer);
  const spec = getShape(layer.shapeId);
  const set = (patch: Record<string, unknown>, key?: string) =>
    updateLayer(layer.id, patch, key);
  const tooSmall =
    spec != null && (layer.w < spec.minW || layer.h < spec.minH);

  return (
    <div className="st-params">
      <p className="st-params-head">{spec?.label ?? 'Form'}</p>

      <label className="st-field">
        <span>
          Bredde <b>{layer.w} masker</b>
        </span>
        <input
          type="range"
          min={2}
          max={cols}
          value={Math.min(layer.w, cols)}
          onChange={(e) => set({ w: Number(e.target.value) }, `sw:${layer.id}`)}
        />
      </label>
      <label className="st-field">
        <span>
          Høyde <b>{layer.h} rader</b>
        </span>
        <input
          type="range"
          min={2}
          max={Math.max(2, bandRows)}
          value={Math.min(layer.h, bandRows)}
          onChange={(e) => set({ h: Number(e.target.value) }, `sh:${layer.id}`)}
        />
      </label>
      {tooSmall && (
        <p className="st-hint" style={{ color: 'var(--st-red)' }}>
          {spec?.label} trenger minst {spec?.minW}×{spec?.minH} masker for å
          kjennes igjen.
        </p>
      )}

      <label className="st-field">
        <span>
          Rotasjon <b>{layer.rotationDeg}°</b>
        </span>
        <input
          type="range"
          min={-180}
          max={180}
          step={15}
          value={layer.rotationDeg}
          onChange={(e) => set({ rotationDeg: Number(e.target.value) }, `sr:${layer.id}`)}
        />
      </label>
      <label className="st-field">
        <span>
          Rundt hatten <b>{Math.round((layer.centerFrac ?? 0) * 100)} %</b>
        </span>
        <input
          type="range"
          min={0}
          max={99}
          value={Math.round((layer.centerFrac ?? 0) * 100)}
          onChange={(e) => set({ centerFrac: Number(e.target.value) / 100 }, `sf:${layer.id}`)}
        />
      </label>
      <label className="st-field">
        <span>
          Høyde i feltet <b>rad {layer.anchor.row + 1}</b>
        </span>
        <input
          type="range"
          min={0}
          max={Math.max(0, bandRows - 1)}
          value={Math.min(Math.max(0, layer.anchor.row), bandRows - 1)}
          onChange={(e) => set({ row: Number(e.target.value) }, `srow:${layer.id}`)}
        />
      </label>

      <div className="st-grid2">
        <button
          type="button"
          className={`st-chip ${layer.flipX ? 'on' : ''}`}
          onClick={() => set({ flipX: !layer.flipX })}
        >
          Speil vannrett
        </button>
        <button
          type="button"
          className={`st-chip ${layer.flipY ? 'on' : ''}`}
          onClick={() => set({ flipY: !layer.flipY })}
        >
          Speil loddrett
        </button>
      </div>

      <p className="st-sec-head" style={{ marginTop: 10 }}>
        <span>Gjentakelse</span>
        <span style={{ textTransform: 'none', letterSpacing: 0 }}>
          {layer.repeatX * layer.repeatY} kopier
        </span>
      </p>
      <label className="st-field">
        <span>
          Rundt <b>{layer.repeatX}</b>
        </span>
        <input
          type="range"
          min={1}
          max={24}
          value={layer.repeatX}
          onChange={(e) => set({ repeatX: Number(e.target.value) }, `srx:${layer.id}`)}
        />
      </label>
      <label className="st-field">
        <span>
          Nedover <b>{layer.repeatY}</b>
        </span>
        <input
          type="range"
          min={1}
          max={8}
          value={layer.repeatY}
          onChange={(e) => set({ repeatY: Number(e.target.value) }, `sry:${layer.id}`)}
        />
      </label>
      <label className="st-field">
        <span>
          Avstand <b>{layer.spacingX} masker</b>
        </span>
        <input
          type="range"
          min={0}
          max={40}
          value={layer.spacingX}
          disabled={layer.wrap}
          onChange={(e) => set({ spacingX: Number(e.target.value) }, `ssx:${layer.id}`)}
        />
      </label>
      <div className="st-grid2">
        <button
          type="button"
          className={`st-chip ${layer.wrap ? 'on' : ''}`}
          onClick={() => set({ wrap: !layer.wrap })}
        >
          Rundt hele hatten
        </button>
        <button
          type="button"
          className={`st-chip ${layer.mirrorAlt ? 'on' : ''}`}
          onClick={() => set({ mirrorAlt: !layer.mirrorAlt })}
        >
          Speilmønster
        </button>
      </div>
      <button
        type="button"
        className={`st-chip ${layer.simplify ? 'on' : ''}`}
        style={{ marginTop: 6, width: '100%' }}
        onClick={() => set({ simplify: !layer.simplify })}
      >
        Forenkle for hekling: {layer.simplify ? 'på' : 'av'}
      </button>

      <p className="st-sec-head" style={{ marginTop: 10 }}>
        <span>Farger</span>
      </p>
      {Array.from({ length: spec?.inks ?? 1 }, (_, i) => (
        <div key={i} className="st-yarns" style={{ marginBottom: 6 }}>
          {YARNS.map((c) => (
            <button
              key={c}
              type="button"
              title={`${YARN_NAME[c]} i felt ${i + 1}`}
              aria-label={`${YARN_NAME[c]} i felt ${i + 1}`}
              className={`st-yarn small ${layer.colorIds[i] === c ? 'on' : ''}`}
              style={{ background: YARN_HEX[c] }}
              onClick={() => set({ [`ink:${i + 1}`]: c })}
            />
          ))}
        </div>
      ))}

      <p className="st-sec-head" style={{ marginTop: 6 }}>
        <span>Kontur</span>
      </p>
      <div className="st-yarns">
        <button
          type="button"
          title="Ingen kontur"
          aria-label="Ingen kontur"
          className={`st-yarn small none ${!layer.outlineColorId ? 'on' : ''}`}
          onClick={() => set({ outlineColorId: null })}
        />
        {YARNS.map((c) => (
          <button
            key={c}
            type="button"
            title={YARN_NAME[c]}
            aria-label={`Kontur i ${YARN_NAME[c]}`}
            className={`st-yarn small ${layer.outlineColorId === c ? 'on' : ''}`}
            style={{ background: YARN_HEX[c] }}
            onClick={() => set({ outlineColorId: c, outlineWidth: layer.outlineWidth ?? 1 })}
          />
        ))}
      </div>

      <p className="st-sec-head" style={{ marginTop: 6 }}>
        <span>Vekselfarge</span>
        <span style={{ textTransform: 'none', letterSpacing: 0 }}>annenhver kopi</span>
      </p>
      <div className="st-yarns">
        <button
          type="button"
          title="Ingen vekselfarge"
          aria-label="Ingen vekselfarge"
          className={`st-yarn small none ${!layer.altColorId ? 'on' : ''}`}
          onClick={() => set({ altColorId: null })}
        />
        {YARNS.map((c) => (
          <button
            key={c}
            type="button"
            title={YARN_NAME[c]}
            aria-label={`Vekselfarge ${YARN_NAME[c]}`}
            className={`st-yarn small ${layer.altColorId === c ? 'on' : ''}`}
            style={{ background: YARN_HEX[c] }}
            onClick={() => set({ altColorId: c })}
          />
        ))}
      </div>
    </div>
  );
}
