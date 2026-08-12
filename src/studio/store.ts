import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  emptyOverride,
  type ChartLayer,
  type ImageLayer,
  type MotifLayer,
  type TextLayer,
} from '../data/chartLayers';
import type { MotifKind } from '../data/motifs';
import { getFont } from '../data/fonts/registry';
import type { FontId } from '../data/fonts/types';
import type { YarnColor } from '../data/types';
import type { HookMm } from '../sizing/hooks';
import { SIZES, type SizeId } from '../sizing/sizes';
import { getPattern } from '../patterns/registry';
import type { PatternId } from '../patterns/types';
import { clampRow, placementBox, shapePlacements, textPlacements } from '../data/layerGeometry';
import { getShape } from '../data/shapes/catalog';
import type { ShapeLayer } from '../data/chartLayers';
import { parseBrief, describeBrief } from './assist/brief';
import { fitText, fourVariations, type LayoutId } from './assist/compose';
import { remixDesign, type RemixId } from './assist/remix';
import { blankDesign, deriveDesign, type StudioDesign } from './design';
import {
  applyLayerPatch,
  normalizeDesign,
  wrapFrac,
} from './designOps';
import { validateDesign } from './validateDesign';
import { auditDesign, type CraftFinding, type CraftFix } from './craftRules';
import { decodeDesign } from './serialize';

export type StudioTool = 'select' | 'brush' | 'erase';
export type HatPart = 'crown' | 'base' | 'brim';

interface StudioState {
  design: StudioDesign;
  past: StudioDesign[];
  future: StudioDesign[];

  tool: StudioTool;
  /** The yarn you paint, fill and colour new layers with. */
  activeYarn: YarnColor;
  selectedLayerId: string | null;
  recipeOpen: boolean;
  /** Draft settings for the next text layer. */
  fontId: FontId;
  textDraft: string;
  notice: string | null;
  /** Craft-check panel: open, and which finding the chart is pointing at. */
  craftOpen: boolean;
  focusFindingId: string | null;
  /** Creative Assist: the brief, and the four takes on it. */
  briefText: string;
  variations: { id: LayoutId; label: string; note: string; design: StudioDesign }[];
  briefSummary: string | null;
  /** Show the front/back keep-out guides on the chart. */
  safeAreas: boolean;
  /** The editable band, or every round from crown to brim. */
  chartView: 'band' | 'hat';

  setTool: (t: StudioTool) => void;
  setActiveYarn: (c: YarnColor) => void;
  setFont: (f: FontId) => void;
  setTextDraft: (t: string) => void;
  setRecipeOpen: (v: boolean) => void;
  setNotice: (s: string | null) => void;
  setCraftOpen: (v: boolean) => void;
  setFocusFinding: (id: string | null) => void;
  setBriefText: (v: string) => void;
  setSafeAreas: (v: boolean) => void;
  setChartView: (v: 'band' | 'hat') => void;
  /** Turn a written brief into four editable designs. */
  runBrief: (text?: string) => void;
  useVariation: (index: number) => void;
  remix: (id: RemixId) => void;

  /**
   * Any design edit. Passing the same `mergeKey` as the previous edit folds
   * it into that undo step — one step per slider drag, one per brush stroke.
   */
  edit: (patch: Partial<StudioDesign>, mergeKey?: string) => void;
  setSize: (id: SizeId, cm?: number) => void;
  fillPart: (part: HatPart) => void;

  addTextLayer: () => void;
  addShapeLayer: (shapeId: string) => void;
  toggleLayerLocked: (id: string) => void;
  /** Contextual actions: fit to the band, centre on the front, spread out. */
  autoFitSelected: () => void;
  alignSelected: (where: 'front' | 'back' | 'top' | 'middle' | 'bottom') => void;
  distributeSelected: (count?: number) => void;
  addMotifLayer: (motif: MotifKind) => void;
  addImageLayer: (bitmap: boolean[][], name: string) => void;
  updateLayer: (
    id: string,
    patch: Record<string, unknown>,
    mergeKey?: string,
  ) => void;
  removeLayer: (id: string) => void;
  duplicateLayer: (id: string) => void;
  toggleLayerHidden: (id: string) => void;
  moveLayer: (id: string, dir: -1 | 1) => void;
  /** Straight to the top of the stack — the fix for a buried layer. */
  raiseLayer: (id: string) => void;
  selectLayer: (id: string | null) => void;
  /**
   * Move the selected layer by whole stitches/rows. `cols` comes from the
   * caller because the circumference is derived, not stored.
   */
  nudgeSelected: (dRow: number, dCol: number, cols: number) => void;

  paint: (row: number, col: number, strokeId: number) => void;
  clearOverride: () => void;

  undo: () => void;
  redo: () => void;

  loadTemplate: (id: Exclude<PatternId, 'custom'>) => void;
  loadDesign: (d: StudioDesign) => void;
  loadCode: (code: string) => boolean;
  reset: () => void;
  surprise: () => void;

  validationErrors: () => string[];
  /** Live craft check of the current design. */
  craftFindings: () => CraftFinding[];
  applyFix: (fix: CraftFix) => void;
}

let idSeq = 1;
function nid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${idSeq++}`;
}

const HISTORY_LIMIT = 60;

/** Vertically centre a band-height block of `h` rows. */
function centerRow(bandRows: number, h: number): number {
  return Math.max(0, Math.round((bandRows - h) / 2));
}

function motifDefaults(
  motif: MotifKind,
  bandRows: number,
): MotifLayer['params'] {
  const base: MotifLayer['params'] = {
    transparent: true,
    rowStart: 0,
    rowEnd: bandRows - 1,
  };
  switch (motif) {
    case 'stripe':
      return { ...base, transparent: false, stripeH: 2 };
    case 'checker':
      return { ...base, cell: 2 };
    case 'chevron':
      return { ...base, period: 10 };
    case 'border':
      return { ...base, thickness: 1 };
    case 'dots':
      return { ...base, spacing: 4 };
    default:
      return base;
  }
}

/**
 * Ink for a new layer: the chosen yarn, unless that is the background it would
 * be drawn on — a layer you cannot see reads as a broken tool.
 */
function inkColor(activeYarn: YarnColor, base: YarnColor): YarnColor {
  if (activeYarn !== base) return activeYarn;
  return base === 'red' || base === 'blue' || base === 'black' ? 'white' : 'red';
}

const SURPRISE_WORDS = [
  'HEIA NORGE',
  'MASKLAB',
  'VM 2026',
  'HEKLE',
  'OSLO',
  'NORGE',
];
const SURPRISE_PALETTES: [YarnColor, YarnColor, YarnColor][] = [
  ['white', 'red', 'blue'],
  ['blue', 'white', 'red'],
  ['black', 'white', 'red'],
  ['lightblue', 'blue', 'white'],
  ['yellow', 'black', 'gold'],
  ['peach', 'red', 'white'],
];

function pick<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

export const useStudio = create<StudioState>()(
  persist(
    (set, get) => {
      /** Merge key of the last commit — repeats fold into one undo step. */
      let lastMergeKey: string | null = null;

      const commit = (raw: StudioDesign, mergeKey?: string) => {
        const next = normalizeDesign(raw);
        const folds = mergeKey != null && mergeKey === lastMergeKey;
        lastMergeKey = mergeKey ?? null;
        set((s) => ({
          design: next,
          past: folds ? s.past : [...s.past, s.design].slice(-HISTORY_LIMIT),
          future: [],
        }));
      };

      const patchDesign = (patch: Partial<StudioDesign>, mergeKey?: string) =>
        commit({ ...get().design, ...patch }, mergeKey);

      return {
        design: blankDesign(),
        past: [],
        future: [],
        tool: 'select',
        activeYarn: 'red',
        selectedLayerId: null,
        recipeOpen: false,
        fontId: 'blokk',
        textDraft: 'NORGE',
        notice: null,
        craftOpen: true,
        focusFindingId: null,
        briefText: '',
        variations: [],
        briefSummary: null,
        safeAreas: true,
        chartView: 'band',

        setTool: (t) => set({ tool: t }),
        setActiveYarn: (c) => {
          set({ activeYarn: c });
          // A colour click retints the selected layer — the fastest way to
          // recolour without hunting for a second control.
          const { selectedLayerId } = get();
          if (selectedLayerId) get().updateLayer(selectedLayerId, { color: c });
        },
        setFont: (f) => {
          set({ fontId: f });
          const id = get().selectedLayerId;
          const layer = get().design.layers.find((l) => l.id === id);
          if (layer?.kind === 'text') get().updateLayer(layer.id, { fontId: f });
        },
        setTextDraft: (t) => set({ textDraft: t }),
        setRecipeOpen: (v) => set({ recipeOpen: v }),
        setNotice: (s) => set({ notice: s }),
        setCraftOpen: (v) => set({ craftOpen: v }),
        setFocusFinding: (id) => set({ focusFindingId: id }),
        setBriefText: (v) => set({ briefText: v }),
        setSafeAreas: (v) => set({ safeAreas: v }),
        setChartView: (v) => set({ chartView: v }),

        runBrief: (text) => {
          const s = get();
          const source = (text ?? s.briefText).trim();
          if (!source) {
            set({ notice: 'Skriv noen ord om hatten du vil lage.' });
            return;
          }
          const brief = parseBrief(source);
          const cols = deriveDesign(s.design).bodyCount;
          set({
            briefText: source,
            variations: fourVariations(brief, cols),
            briefSummary: describeBrief(brief),
            notice: `Fire forslag: ${describeBrief(brief)}.`,
          });
        },

        useVariation: (index) => {
          const v = get().variations[index];
          if (!v) return;
          commit(v.design);
          set({
            selectedLayerId: null,
            notice: `«${v.label}» er lagt på lerretet — endre alt du vil.`,
          });
        },

        remix: (id) => {
          const s = get();
          const cols = deriveDesign(s.design).bodyCount;
          commit(remixDesign(s.design, id, cols));
          set({ selectedLayerId: null });
        },

        edit: (patch, mergeKey) => patchDesign(patch, mergeKey),

        setSize: (id, cm) =>
          patchDesign({
            sizeId: id,
            omkrets_cm:
              cm ??
              SIZES.find((s) => s.id === id)?.omkrets_cm ??
              get().design.omkrets_cm,
          }),

        fillPart: (part) => {
          const c = get().activeYarn;
          patchDesign(
            part === 'crown'
              ? { crownColor: c }
              : part === 'brim'
                ? { brimColor: c }
                : { baseColor: c },
          );
        },

        addTextLayer: () => {
          const s = get();
          const h = getFont(s.fontId).cell.h;
          const layer: TextLayer = {
            kind: 'text',
            id: nid('text'),
            text: s.textDraft.trim() || 'TEKST',
            fontId: s.fontId,
            slantDeg: 0,
            anchor: { row: centerRow(s.design.bandRows, h), col: 0 },
            repeat: 2,
            colorId: inkColor(s.activeYarn, s.design.baseColor),
            mirror: false,
            letterSpacing: 1,
            centerFrac: 0.095,
            scaleX: 1,
            scaleY: 1,
          };
          commit({ ...s.design, layers: [...s.design.layers, layer] });
          set({ selectedLayerId: layer.id, tool: 'select' });
        },

        addShapeLayer: (shapeId) => {
          const s = get();
          const spec = getShape(shapeId);
          if (!spec) return;
          const cols = deriveDesign(s.design).bodyCount;
          const rows = s.design.bandRows;
          // Arrive at a size that already fits the band: two thirds of the
          // height, and whatever width keeps the shape's own proportions.
          const h = spec.tiling
            ? Math.min(rows, Math.max(spec.minH, Math.round(rows / 2)))
            : Math.min(rows, Math.max(spec.minH, Math.round(rows * 0.7)));
          const w = spec.tiling
            ? cols
            : Math.min(
                Math.floor(cols / 3),
                Math.max(spec.minW, Math.round(h * spec.aspect)),
              );
          const ink = inkColor(s.activeYarn, s.design.baseColor);
          const layer: ShapeLayer = {
            kind: 'shape',
            id: nid('shape'),
            shapeId,
            w,
            h,
            rotationDeg: 0,
            anchor: { row: Math.max(0, Math.round((rows - h) / 2)), col: 0 },
            centerFrac: spec.tiling ? 0.5 : 0.095,
            colorIds:
              spec.inks >= 3
                ? [ink, s.design.baseColor, s.design.brimColor]
                : spec.inks === 2
                  ? [ink, s.design.baseColor]
                  : [ink],
            repeatX: 1,
            repeatY: 1,
            spacingX: 4,
            spacingY: 1,
            wrap: spec.tiling,
            simplify: true,
          };
          commit({ ...s.design, layers: [...s.design.layers, layer] });
          set({ selectedLayerId: layer.id, tool: 'select' });
        },

        toggleLayerLocked: (id) => {
          const s = get();
          commit({
            ...s.design,
            layers: s.design.layers.map((l) =>
              l.id === id ? ({ ...l, locked: !l.locked } as ChartLayer) : l,
            ),
          });
        },

        autoFitSelected: () => {
          const s = get();
          const layer = s.design.layers.find((l) => l.id === s.selectedLayerId);
          if (!layer) return;
          const cols = deriveDesign(s.design).bodyCount;
          const rows = s.design.bandRows;
          if (layer.kind === 'text') {
            const room = Math.floor(cols / Math.max(1, layer.repeat)) - 6;
            const fit = fitText(layer.text, room, rows - 2, {
              fonts: [layer.fontId],
              slantDeg: layer.slantDeg,
            });
            if (!fit) {
              set({ notice: 'Fant ingen størrelse som passer — prøv færre gjentakelser.' });
              return;
            }
            get().updateLayer(layer.id, {
              scaleX: fit.scaleX,
              scaleY: fit.scaleY,
              letterSpacing: fit.letterSpacing,
              bold: fit.bold,
              row: Math.max(0, Math.round((rows - fit.h) / 2)),
            });
            return;
          }
          if (layer.kind === 'shape') {
            const spec = getShape(layer.shapeId);
            const h = Math.max(spec?.minH ?? 3, rows - 2);
            const w = spec?.tiling
              ? cols
              : Math.min(Math.floor(cols / 3), Math.max(spec?.minW ?? 3, Math.round(h * (spec?.aspect ?? 1))));
            get().updateLayer(layer.id, {
              w,
              h,
              row: Math.max(0, Math.round((rows - h) / 2)),
            });
          }
        },

        alignSelected: (where) => {
          const s = get();
          const layer = s.design.layers.find((l) => l.id === s.selectedLayerId);
          if (!layer || layer.kind === 'motif') return;
          const cols = deriveDesign(s.design).bodyCount;
          const rows = s.design.bandRows;
          if (where === 'front' || where === 'back') {
            const frac = where === 'front' ? 0.095 : 0.595;
            get().updateLayer(layer.id, { centerFrac: frac });
            return;
          }
          const boxes = (
            layer.kind === 'text'
              ? textPlacements(layer, cols)
              : layer.kind === 'shape'
                ? shapePlacements(layer, cols)
                : []
          )
            .map(placementBox)
            .filter((b) => b != null);
          if (boxes.length === 0) return;
          const top = Math.min(...boxes.map((b) => b!.row0));
          const bottom = Math.max(...boxes.map((b) => b!.row1));
          const h = bottom - top + 1;
          const above = layer.anchor.row - top;
          const wanted =
            where === 'top' ? 0 : where === 'bottom' ? rows - h : Math.round((rows - h) / 2);
          get().updateLayer(layer.id, { row: wanted + above });
        },

        distributeSelected: (count) => {
          const s = get();
          const layer = s.design.layers.find((l) => l.id === s.selectedLayerId);
          if (!layer) return;
          if (layer.kind === 'shape') {
            const cols = deriveDesign(s.design).bodyCount;
            const n = count ?? Math.max(2, Math.floor(cols / (layer.w + layer.spacingX)));
            get().updateLayer(layer.id, { repeatX: n, wrap: true });
          } else if (layer.kind === 'text') {
            get().updateLayer(layer.id, { repeat: count ?? Math.min(4, layer.repeat + 1) });
          }
        },

        addMotifLayer: (motif) => {
          const s = get();
          const layer: MotifLayer = {
            kind: 'motif',
            id: nid('motif'),
            motif,
            params: motifDefaults(motif, s.design.bandRows),
            anchor: { row: 0, col: 0 },
            colorIds: [inkColor(s.activeYarn, s.design.baseColor), s.design.baseColor],
          };
          commit({ ...s.design, layers: [...s.design.layers, layer] });
          set({ selectedLayerId: layer.id, tool: 'select' });
        },

        addImageLayer: (bitmap, name) => {
          const s = get();
          const rows = bitmap.length;
          const cols = bitmap[0]?.length ?? 0;
          const derived = deriveDesign(s.design);
          const layer: ImageLayer = {
            kind: 'image',
            id: nid('foto'),
            srcRef: name,
            anchor: {
              row: centerRow(s.design.bandRows, rows),
              col: Math.max(0, Math.round(derived.bodyCount * 0.095 - cols / 2)),
            },
            cols,
            rows,
            dither: true,
            contrast: 0,
            bitmap,
            colorId: inkColor(s.activeYarn, s.design.baseColor),
          };
          commit({ ...s.design, layers: [...s.design.layers, layer] });
          set({ selectedLayerId: layer.id, tool: 'select' });
        },

        updateLayer: (id, patch, mergeKey) => {
          const s = get();
          const layers = s.design.layers.map((l) =>
            l.id === id ? applyLayerPatch(l, patch) : l,
          );
          commit({ ...s.design, layers }, mergeKey);
        },

        removeLayer: (id) => {
          const s = get();
          commit({
            ...s.design,
            layers: s.design.layers.filter((l) => l.id !== id),
          });
          if (s.selectedLayerId === id) set({ selectedLayerId: null });
        },

        duplicateLayer: (id) => {
          const s = get();
          const idx = s.design.layers.findIndex((l) => l.id === id);
          if (idx < 0) return;
          const src = s.design.layers[idx];
          const copy = {
            ...structuredClone(src),
            id: nid(src.kind),
          } as ChartLayer;
          // Offset the copy a quarter turn so it does not hide under the
          // original — a duplicate you cannot see reads as a dead button.
          if (copy.kind === 'text' && copy.centerFrac != null) {
            copy.centerFrac = wrapFrac(copy.centerFrac + 0.25);
          } else {
            copy.anchor = { ...copy.anchor, row: copy.anchor.row + 1 };
          }
          const layers = [...s.design.layers];
          layers.splice(idx + 1, 0, copy);
          commit({ ...s.design, layers });
          set({ selectedLayerId: copy.id });
        },

        raiseLayer: (id) => {
          const s = get();
          const layer = s.design.layers.find((l) => l.id === id);
          if (!layer) return;
          commit({
            ...s.design,
            layers: [...s.design.layers.filter((l) => l.id !== id), layer],
          });
        },

        nudgeSelected: (dRow, dCol, cols) => {
          const s = get();
          const layer = s.design.layers.find((l) => l.id === s.selectedLayerId);
          if (!layer || layer.kind === 'motif') return;
          const patch: Record<string, unknown> = {};
          if (dRow) {
            patch.row = clampRow(
              layer,
              cols,
              s.design.bandRows,
              layer.anchor.row + dRow,
            );
          }
          if (dCol) {
            if (layer.kind === 'text' && layer.centerFrac != null) {
              patch.centerFrac = wrapFrac(layer.centerFrac + dCol / cols);
            } else {
              patch.col = layer.anchor.col + dCol;
            }
          }
          get().updateLayer(layer.id, patch, `nudge:${layer.id}`);
        },

        toggleLayerHidden: (id) => {
          const s = get();
          commit({
            ...s.design,
            layers: s.design.layers.map((l) =>
              l.id === id ? ({ ...l, hidden: !l.hidden } as ChartLayer) : l,
            ),
          });
        },

        moveLayer: (id, dir) => {
          const s = get();
          const idx = s.design.layers.findIndex((l) => l.id === id);
          const j = idx + dir;
          if (idx < 0 || j < 0 || j >= s.design.layers.length) return;
          const layers = [...s.design.layers];
          const [item] = layers.splice(idx, 1);
          layers.splice(j, 0, item);
          commit({ ...s.design, layers });
        },

        selectLayer: (id) => {
          set({ selectedLayerId: id });
          const layer = get().design.layers.find((l) => l.id === id);
          if (layer?.kind === 'text') set({ fontId: layer.fontId });
        },

        paint: (row, col, strokeId) => {
          const s = get();
          const key = `${row},${col}` as const;
          const cells = { ...s.design.override.cells };
          if (s.tool === 'erase') {
            if (!(key in cells)) return;
            delete cells[key];
          } else {
            if (cells[key] === s.activeYarn) return;
            cells[key] = s.activeYarn;
          }
          // One undo step per stroke: every cell of a drag shares the id.
          commit(
            { ...s.design, override: { kind: 'override', cells } },
            `paint:${strokeId}`,
          );
        },

        clearOverride: () => {
          const s = get();
          commit({ ...s.design, override: emptyOverride() });
        },

        undo: () =>
          set((s) => {
            if (!s.past.length) return s;
            const past = [...s.past];
            const prev = past.pop()!;
            return {
              past,
              design: prev,
              future: [s.design, ...s.future].slice(0, HISTORY_LIMIT),
            };
          }),

        redo: () =>
          set((s) => {
            if (!s.future.length) return s;
            const [next, ...rest] = s.future;
            return {
              past: [...s.past, s.design].slice(-HISTORY_LIMIT),
              design: next,
              future: rest,
            };
          }),

        loadTemplate: (id) => {
          const def = getPattern(id);
          commit({
            ...blankDesign(),
            title: def.titleNo,
            layers: structuredClone(def.chartLayers),
            override: structuredClone(def.chartOverride ?? emptyOverride()),
            bandRows: def.bandRows,
            hookMm: def.defaults.hookMm,
            sizeId: def.defaults.sizeId,
            omkrets_cm:
              SIZES.find((x) => x.id === def.defaults.sizeId)?.omkrets_cm ?? 56,
            baseColor: def.background,
            crownColor: def.crownBase ?? def.background,
            brimColor: def.finalBrim.color,
            brimStyle: def.includeWave ? 'wave' : 'bucket',
          });
          set({
            selectedLayerId: null,
            notice: `Åpnet «${def.titleNo}» — endre alt du vil.`,
          });
        },

        loadDesign: (d) => {
          commit(d);
          set({ selectedLayerId: null });
        },

        loadCode: (code) => {
          const design = decodeDesign(code);
          if (!design) {
            set({ notice: 'Fant ingen design i den koden.' });
            return false;
          }
          commit(design);
          set({ selectedLayerId: null, notice: 'Design åpnet.' });
          return true;
        },

        reset: () => {
          commit(blankDesign());
          set({ selectedLayerId: null });
        },

        surprise: () => {
          const s = get();
          const [base, ink, accent] = pick(SURPRISE_PALETTES);
          const text: TextLayer = {
            kind: 'text',
            id: nid('text'),
            text: pick(SURPRISE_WORDS),
            fontId: pick(['blokk', 'smal', 'kursiv', 'serif'] as FontId[]),
            slantDeg: pick([0, 0, 0, -8, 8]),
            anchor: { row: centerRow(s.design.bandRows, 7), col: 0 },
            repeat: pick([1, 2, 2, 3]),
            colorId: ink,
            mirror: false,
            letterSpacing: 1,
            centerFrac: 0.095,
          };
          const motifKind = pick<MotifKind>([
            'stripe',
            'dots',
            'checker',
            'chevron',
          ]);
          const motif: MotifLayer = {
            kind: 'motif',
            id: nid('motif'),
            motif: motifKind,
            params: {
              ...motifDefaults(motifKind, s.design.bandRows),
              rowStart: 0,
              rowEnd: pick([1, 2, 2]),
            },
            anchor: { row: 0, col: 0 },
            colorIds: [accent, base],
          };
          commit({
            ...s.design,
            baseColor: base,
            crownColor: base,
            brimColor: accent,
            layers: [motif, text],
            override: emptyOverride(),
          });
          set({ selectedLayerId: text.id, activeYarn: ink });
        },

        validationErrors: () => {
          const d = get().design;
          const derived = deriveDesign(d);
          const result = validateDesign({
            cols: derived.bodyCount,
            rows: d.bandRows,
            layers: d.layers,
            override: d.override,
            hookMm: d.hookMm,
            sizeId: d.sizeId,
          });
          return result.errors;
        },

        craftFindings: () => craftReport(get().design),

        applyFix: (fix) => {
          if (fix.layerId && fix.patch) {
            get().updateLayer(fix.layerId, fix.patch);
          } else if (fix.design) {
            get().edit(fix.design as Partial<StudioDesign>);
          }
          set({ focusFindingId: null, notice: `${fix.label} — gjort.` });
        },
      };
    },
    {
      name: 'masklab-studio-v2',
      version: 3,
      // A design saved before the transform tools existed is still a valid
      // design — it just has no scale, weight or outline. Normalising on the
      // way in fills those in and drops anything that has gone out of range.
      migrate: (persisted) => {
        const s = persisted as { design?: StudioDesign } | undefined;
        if (!s?.design) return s as never;
        return { ...s, design: normalizeDesign(s.design) } as never;
      },
      partialize: (s) => ({
        design: s.design,
        activeYarn: s.activeYarn,
        fontId: s.fontId,
        textDraft: s.textDraft,
        craftOpen: s.craftOpen,
      }),
      onRehydrateStorage: () => (state) => {
        // Storage can be hand-edited, truncated or written by an older build.
        if (state?.design) state.design = normalizeDesign(state.design);
      },
    },
  ),
);

/** Craft check, memoised on the design snapshot (snapshots are immutable). */
let craftKey: StudioDesign | null = null;
let craftValue: CraftFinding[] = [];
export function craftReport(d: StudioDesign): CraftFinding[] {
  if (craftKey === d) return craftValue;
  const derived = deriveDesign(d);
  craftValue = auditDesign({
    cols: derived.bodyCount,
    rows: d.bandRows,
    grid: derived.chart.grid,
    layers: d.layers,
    background: d.baseColor,
    crownColor: d.crownColor,
    brimColor: d.brimColor,
  });
  craftKey = d;
  return craftValue;
}

/** Does an unfinished design already sit in localStorage? (landing page CTA) */
export function hasStudioDraft(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = window.localStorage.getItem('masklab-studio-v2');
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { state?: { design?: StudioDesign } };
    const layers = parsed.state?.design?.layers;
    return Array.isArray(layers) && layers.length > 0;
  } catch {
    return false;
  }
}

export type { StudioDesign, HookMm };
