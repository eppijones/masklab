import type { ChartLayer, ColorGrid, TextLayer } from '../data/chartLayers';
import { isFreeText } from '../data/chartLayers';
import { placementBox, shapePlacements, textPlacements } from '../data/layerGeometry';
import { getShape } from '../data/shapes/catalog';
import { getFont } from '../data/fonts/registry';
import { YARN_HEX, YARN_NAME, type YarnColor } from '../data/types';

/**
 * The craft check.
 *
 * A chart can be perfectly valid as a grid and still be a bad hat: letters
 * that clip at the band edge, single stitches that disappear in fastmaske
 * fabric, four yarns dragged around one round, ink you cannot see against its
 * own ground. These are the things a hand-crocheted colorwork bucket hat
 * actually fails on, so the studio checks for them continuously instead of
 * letting you discover them halfway through round 24.
 *
 * Every finding carries the cells it is about (so the chart can point at them)
 * and, where the fix is unambiguous, the exact edit that resolves it.
 */

export type CraftLevel = 'error' | 'warn' | 'tip';

/** A one-click repair, described as data so the rules stay pure. */
export interface CraftFix {
  label: string;
  /** Patch for `updateLayer` — same loose keys the inspector uses. */
  layerId?: string;
  patch?: Record<string, unknown>;
  /** Or a design-level patch for `edit`. */
  design?: Record<string, unknown>;
}

export interface CraftFinding {
  id: string;
  level: CraftLevel;
  title: string;
  detail: string;
  layerId?: string;
  /** Chart cells the finding points at, as [row, col]. */
  cells: [number, number][];
  fix?: CraftFix;
}

export interface CraftInput {
  cols: number;
  rows: number;
  grid: ColorGrid;
  layers: ChartLayer[];
  background: YarnColor;
  crownColor: YarnColor;
  brimColor: YarnColor;
}

/** Yarns per round beyond which colour management stops being fun. */
const MAX_YARNS_PER_ROUND = 3;
/** Colour changes per round beyond which the round is a slog. */
const MAX_CHANGES_PER_ROUND = 26;
/** Below this relative-luminance gap two yarns read as one at arm's length. */
const MIN_CONTRAST = 0.18;
/** Isolated single stitches allowed before we call the chart noisy. */
const MAX_SINGLES = 6;

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const toLin = (v: number) => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return (
    0.2126 * toLin((n >> 16) & 255) +
    0.7152 * toLin((n >> 8) & 255) +
    0.0722 * toLin(n & 255)
  );
}

/** 0…1 perceived separation between two yarns. */
export function yarnContrast(a: YarnColor, b: YarnColor): number {
  return Math.abs(luminance(YARN_HEX[a]) - luminance(YARN_HEX[b]));
}

/** The colour a text layer is most often drawn on top of. */
function groundUnder(
  layer: TextLayer,
  input: CraftInput,
): YarnColor {
  const tally = new Map<YarnColor, number>();
  for (const p of textPlacements(layer, input.cols)) {
    const box = placementBox(p);
    if (!box) continue;
    for (let r = box.row0; r <= box.row1; r++) {
      if (r < 0 || r >= input.rows) continue;
      for (let i = -1; i <= box.width; i++) {
        const c = (((box.col0 + i) % input.cols) + input.cols) % input.cols;
        const v = input.grid[r]?.[c];
        if (!v || v === layer.colorId) continue;
        tally.set(v, (tally.get(v) ?? 0) + 1);
      }
    }
  }
  let best: YarnColor = input.background;
  let bestN = -1;
  for (const [c, n] of tally) {
    if (n > bestN) {
      best = c;
      bestN = n;
    }
  }
  return best;
}

/** Every cell of the given chart rows — the highlight for a whole-round rule. */
function rowCells(rows: number[], cols: number): [number, number][] {
  const out: [number, number][] = [];
  for (const r of rows) for (let c = 0; c < cols; c++) out.push([r, c]);
  return out;
}

function textLabel(l: TextLayer): string {
  return `«${l.text.trim() || '…'}»`;
}

/** Run-length stats around a closed round (first and last run join up). */
function roundRuns(row: YarnColor[]): { changes: number; longest: number } {
  const n = row.length;
  if (n === 0) return { changes: 0, longest: 0 };
  let changes = 0;
  for (let i = 0; i < n; i++) {
    if (row[i] !== row[(i + 1) % n]) changes++;
  }
  if (changes === 0) return { changes: 0, longest: n };
  let longest = 0;
  let run = 0;
  // Two laps so a run that straddles the seam is measured whole.
  for (let i = 0; i < n * 2; i++) {
    if (i > 0 && row[i % n] === row[(i - 1) % n]) run++;
    else run = 1;
    if (run > longest) longest = run;
  }
  return { changes, longest: Math.min(longest, n) };
}

export function auditDesign(input: CraftInput): CraftFinding[] {
  const { cols, rows, grid, layers } = input;
  const out: CraftFinding[] = [];
  if (cols <= 0 || rows <= 0) return out;

  // ---- Per-layer: does the artwork physically fit the band? ----
  for (const layer of layers) {
    if (layer.hidden) continue;

    if (layer.kind === 'text' && isFreeText(layer)) {
      const placements = textPlacements(layer, cols);
      const boxes = placements
        .map(placementBox)
        .filter((b): b is NonNullable<typeof b> => b != null);
      const top = boxes.reduce((m, b) => Math.min(m, b.row0), Infinity);
      const bottom = boxes.reduce((m, b) => Math.max(m, b.row1), -Infinity);
      const needed = boxes.length > 0 ? bottom - top + 1 : 0;

      if (needed > rows) {
        out.push({
          id: `fit:${layer.id}`,
          level: 'error',
          title: `${textLabel(layer)} er høyere enn mønsterfeltet`,
          detail: `Teksten trenger ${needed} rader, feltet har ${rows}. Gjør skriften mindre, senk stigningen, eller gjør feltet høyere.`,
          layerId: layer.id,
          cells: [],
          fix:
            layer.rise
              ? { label: 'Fjern stigningen', layerId: layer.id, patch: { rise: 0 } }
              : {
                  label: 'Skaler ned',
                  layerId: layer.id,
                  patch: { scaleY: 1, scaleX: 1 },
                },
        });
      } else if (boxes.length > 0 && top < 0) {
        out.push({
          id: `clip-top:${layer.id}`,
          level: 'error',
          title: `${textLabel(layer)} klippes øverst`,
          detail: `${-top} rader av teksten ligger over kanten av mønsterfeltet.`,
          layerId: layer.id,
          cells: [],
          fix: {
            label: 'Flytt ned',
            layerId: layer.id,
            patch: { row: layer.anchor.row - top },
          },
        });
      } else if (boxes.length > 0 && bottom >= rows) {
        out.push({
          id: `clip-bottom:${layer.id}`,
          level: 'error',
          title: `${textLabel(layer)} klippes nederst`,
          detail: `Teksten stikker ${bottom - rows + 1} rader ut av feltet.`,
          layerId: layer.id,
          cells: [],
          fix: {
            label: 'Flytt opp',
            layerId: layer.id,
            patch: { row: layer.anchor.row - (bottom - rows + 1) },
          },
        });
      }

      // Copies that run into each other read as one long garbled word.
      if (boxes.length > 1) {
        const span = boxes[0].width;
        const gap = Math.floor(cols / boxes.length) - span;
        if (gap < 2) {
          out.push({
            id: `crowd:${layer.id}`,
            level: 'error',
            title: `${textLabel(layer)} får ikke plass ${boxes.length} ganger rundt`,
            detail: `Hver kopi er ${span} masker bred, det er bare ${Math.floor(cols / boxes.length)} masker per kopi. Gjenta færre ganger eller gjør skriften smalere.`,
            layerId: layer.id,
            cells: [],
            fix: {
              label: `Gjenta ×${Math.max(1, boxes.length - 1)}`,
              layerId: layer.id,
              patch: { repeat: Math.max(1, boxes.length - 1) },
            },
          });
        }
      }

      // Ink you cannot see against the ground it sits on.
      const ground = groundUnder(layer, input);
      const contrast = yarnContrast(layer.colorId, ground);
      if (contrast < MIN_CONTRAST) {
        out.push({
          id: `contrast:${layer.id}`,
          level: contrast < 0.06 ? 'error' : 'warn',
          title: `${textLabel(layer)} forsvinner i bunnen`,
          detail: `${YARN_NAME[layer.colorId]} mot ${YARN_NAME[ground]} gir for lite kontrast. Bytt garn, eller legg en kontur rundt bokstavene.`,
          layerId: layer.id,
          cells: [],
          fix: layer.haloColorId
            ? undefined
            : {
                label: 'Legg på kontur',
                layerId: layer.id,
                patch: {
                  haloColorId: yarnContrast('white', ground) > yarnContrast('black', ground)
                    ? 'white'
                    : 'black',
                  haloWidth: 1,
                },
              },
        });
      }

      // A layer painted over by everything above it is a silent dead end.
      let visible = 0;
      let inked = 0;
      for (const p of placements) {
        for (let r = 0; r < p.mask.length; r++) {
          for (let c = 0; c < (p.mask[r]?.length ?? 0); c++) {
            if (!p.mask[r][c]) continue;
            const dr = p.row + r;
            const dc = (((p.col + c) % cols) + cols) % cols;
            if (dr < 0 || dr >= rows) continue;
            inked++;
            if (grid[dr][dc] === layer.colorId) visible++;
          }
        }
      }
      if (inked > 0 && visible / inked < 0.5) {
        out.push({
          id: `buried:${layer.id}`,
          level: 'warn',
          title: `${textLabel(layer)} dekkes av laget over`,
          detail: `Bare ${Math.round((visible / inked) * 100)} % av bokstavene synes. Flytt laget øverst i lista, eller flytt det som ligger over.`,
          layerId: layer.id,
          cells: [],
        });
      }
    }

    if (layer.kind === 'text' && isFreeText(layer)) {
      // Legibility: below five rows of cap height a word stops being a word,
      // and a single-stitch stroke disappears into the fabric.
      const cap = getFont(layer.fontId).cell.h * (layer.scaleY ?? 1);
      if (cap < 5) {
        out.push({
          id: `tiny:${layer.id}`,
          level: 'error',
          title: `${textLabel(layer)} er for liten til å leses`,
          detail: `Bokstavene er ${cap} rader høye. Under 5 rader forsvinner de i maskene — skaler opp, eller gjør mønsterfeltet høyere.`,
          layerId: layer.id,
          cells: [],
          fix: {
            label: 'Skaler opp',
            layerId: layer.id,
            patch: { scaleY: Math.max(1, Math.ceil(5 / getFont(layer.fontId).cell.h)) },
          },
        });
      } else if (cap < 7 && (layer.scaleX ?? 1) < 2 && !layer.bold) {
        out.push({
          id: `thin:${layer.id}`,
          level: 'tip',
          title: `${textLabel(layer)} er tynn`,
          detail:
            'På en maske i bredden blir strekene svake på avstand. Fet skrift eller en kontur gir dem tyngde.',
          layerId: layer.id,
          cells: [],
          fix: { label: 'Fet skrift', layerId: layer.id, patch: { bold: true } },
        });
      }
    }

    if (layer.kind === 'shape') {
      const spec = getShape(layer.shapeId);
      if (spec && (layer.w < spec.minW || layer.h < spec.minH)) {
        out.push({
          id: `small-shape:${layer.id}`,
          level: 'error',
          title: `${spec.label} er for liten`,
          detail: `Motivet er ${layer.w}×${layer.h} masker. Under ${spec.minW}×${spec.minH} mister det formen sin.`,
          layerId: layer.id,
          cells: [],
          fix: {
            label: 'Sett minstemål',
            layerId: layer.id,
            patch: { w: spec.minW, h: spec.minH },
          },
        });
      }
      const boxes = shapePlacements(layer, cols)
        .map(placementBox)
        .filter((b): b is NonNullable<typeof b> => b != null);
      const top = boxes.length ? Math.min(...boxes.map((b) => b.row0)) : 0;
      const bottom = boxes.length ? Math.max(...boxes.map((b) => b.row1)) : 0;
      if (boxes.length > 0 && (top < 0 || bottom >= rows)) {
        out.push({
          id: `shape-clip:${layer.id}`,
          level: 'error',
          title: `${spec?.label ?? 'Motivet'} går utenfor feltet`,
          detail: `Motivet dekker rad ${top + 1}–${bottom + 1} av ${rows}.`,
          layerId: layer.id,
          cells: [],
          fix: {
            label: 'Sentrer',
            layerId: layer.id,
            patch: {
              row: Math.max(
                0,
                layer.anchor.row - top + Math.round((rows - (bottom - top + 1)) / 2),
              ),
            },
          },
        });
      }
      // Copies that overlap read as a smear, not a repeat.
      if (layer.repeatX > 1 && !layer.wrap) {
        const w = boxes[0]?.width ?? layer.w;
        if (layer.spacingX === 0 && !getShape(layer.shapeId)?.tiling) {
          out.push({
            id: `shape-touch:${layer.id}`,
            level: 'tip',
            title: `${spec?.label ?? 'Motivene'} står helt inntil hverandre`,
            detail: `Uten mellomrom flyter kopiene sammen. To–tre masker luft er nok.`,
            layerId: layer.id,
            cells: [],
            fix: { label: 'Gi luft', layerId: layer.id, patch: { spacingX: 3 } },
          });
        }
        if (layer.repeatX * (w + layer.spacingX) > cols + w) {
          out.push({
            id: `shape-crowd:${layer.id}`,
            level: 'error',
            title: `${spec?.label ?? 'Motivet'} får ikke plass ${layer.repeatX} ganger`,
            detail: `${layer.repeatX} kopier à ${w} masker er mer enn de ${cols} maskene rundt hatten.`,
            layerId: layer.id,
            cells: [],
            fix: {
              label: 'Fordel jevnt',
              layerId: layer.id,
              patch: { repeatX: Math.max(1, Math.floor(cols / (w + 3))), wrap: true },
            },
          });
        }
      }
    }

    if (layer.kind === 'image') {
      const bottom = layer.anchor.row + layer.rows;
      if (layer.anchor.row < 0 || bottom > rows) {
        out.push({
          id: `fit-img:${layer.id}`,
          level: 'error',
          title: `Fotoet «${layer.srcRef}» går utenfor feltet`,
          detail: `Bildet er ${layer.rows} rader høyt og starter på rad ${layer.anchor.row + 1} av ${rows}.`,
          layerId: layer.id,
          cells: [],
          fix: {
            label: 'Sentrer i feltet',
            layerId: layer.id,
            patch: { row: Math.max(0, Math.round((rows - layer.rows) / 2)) },
          },
        });
      }
    }
  }

  // ---- Per-round: is this actually crochetable in the round? ----
  const busyRows: number[] = [];
  const changeRows: number[] = [];
  let worstYarns = 0;
  let worstChanges = 0;
  for (let r = 0; r < rows; r++) {
    const row = grid[r] ?? [];
    const yarns = new Set(row);
    if (yarns.size > MAX_YARNS_PER_ROUND) {
      busyRows.push(r);
      worstYarns = Math.max(worstYarns, yarns.size);
    }
    const { changes } = roundRuns(row);
    if (changes > MAX_CHANGES_PER_ROUND) {
      changeRows.push(r);
      worstChanges = Math.max(worstChanges, changes);
    }
  }
  if (busyRows.length > 0) {
    out.push({
      id: 'yarns-per-round',
      level: 'error',
      title: `${busyRows.length} runder bruker ${worstYarns} garn`,
      detail: `Mer enn ${MAX_YARNS_PER_ROUND} garn i samme runde blir et floketeppe på innsiden. Del fargene på flere rader, eller bruk samme garn til flere elementer.`,
      cells: rowCells(busyRows, cols),
    });
  }
  if (changeRows.length > 0) {
    out.push({
      id: 'changes-per-round',
      level: 'warn',
      title: `Tett fargebytte i ${changeRows.length} runder`,
      detail: `Opptil ${worstChanges} fargeskift på én runde. Det lar seg hekle, men bredere flater går mye raskere.`,
      cells: rowCells(changeRows, cols),
    });
  }

  // ---- Per-stitch: single stitches vanish in fastmaske fabric ----
  const singles: [number, number][] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const v = grid[r][c];
      const left = grid[r][(c - 1 + cols) % cols];
      const right = grid[r][(c + 1) % cols];
      if (v === left || v === right) continue;
      const up = r > 0 ? grid[r - 1][c] : null;
      const down = r < rows - 1 ? grid[r + 1][c] : null;
      if (v === up || v === down) continue;
      singles.push([r, c]);
    }
  }
  if (singles.length > MAX_SINGLES) {
    out.push({
      id: 'singles',
      level: 'warn',
      title: `${singles.length} enkeltmasker står alene`,
      detail:
        'En maske uten naboer i samme farge blir borte i fastmaskene. Tykkere skrift, større skala eller en kontur rundt motivet fikser det.',
      cells: singles,
    });
  }

  // ---- Whole hat: does the silhouette read from three metres away? ----
  if (yarnContrast(input.brimColor, input.background) < 0.05) {
    out.push({
      id: 'edge-contrast',
      level: 'tip',
      title: 'Kanten smelter inn i hatten',
      detail: `Kanten og bunnen er begge ${YARN_NAME[input.brimColor]}. En kontrastkant er det som gir bøttehatten silhuett.`,
      cells: [],
    });
  }

  const order: Record<CraftLevel, number> = { error: 0, warn: 1, tip: 2 };
  return out.sort((a, b) => order[a.level] - order[b.level]);
}

/** Short verdict for the toolbar. */
export function craftSummary(findings: CraftFinding[]): {
  level: CraftLevel | 'ok';
  errors: number;
  warnings: number;
} {
  const errors = findings.filter((f) => f.level === 'error').length;
  const warnings = findings.filter((f) => f.level === 'warn').length;
  return {
    level: errors > 0 ? 'error' : warnings > 0 ? 'warn' : findings.length ? 'tip' : 'ok',
    errors,
    warnings,
  };
}
