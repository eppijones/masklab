/**
 * Reference implementation of the ORIGINAL explicit-path text stamping,
 * compared cell-for-cell against the refactored placement pipeline.
 */
import { getFont } from '../src/data/fonts/registry';
import { rasterizeGlyphRun } from '../src/data/rasterizeText';
import { textPiece } from '../src/data/layerGeometry';
import type { FontSpec } from '../src/data/fonts/types';
import type { TextLayer } from '../src/data/chartLayers';
import { compositeChart, emptyOverride } from '../src/data/chartLayers';
import {
  clampRow,
  placementBox,
  placementHit,
  rowRange,
  textPlacements,
} from '../src/data/layerGeometry';
import { getPattern, listPatterns } from '../src/patterns/registry';
import { buildFullChart, phaseRuns } from '../src/studio/fullChart';
import { derivePattern } from '../src/patterns/buildFromDefinition';
import { normalizeDesign, normalizeLayer, wrapFrac } from '../src/studio/designOps';
import { dragHint, dragPatch } from '../src/studio/dragTransform';
import { auditDesign } from '../src/studio/craftRules';
import { SHAPES } from '../src/data/shapes/catalog';
import { rasterizeShape, simplifyForKnit } from '../src/data/shapeRaster';
import { shapePlacements } from '../src/data/layerGeometry';
import type { ShapeLayer } from '../src/data/chartLayers';
import { parseBrief } from '../src/studio/assist/brief';
import { fitText, fourVariations, measureText, MIN_CAP_ROWS } from '../src/studio/assist/compose';
import { remixDesign, REMIXES } from '../src/studio/assist/remix';



/** Verbatim copy of the pre-refactor rasterizeText. */
function oldRasterize(
  text: string,
  font: FontSpec,
  opts: { slantDeg: number; letterSpacing: number },
): boolean[][] {
  const h = font.cell.h;
  const tanSlant = Math.tan((opts.slantDeg * Math.PI) / 180);
  const maxShear = Math.abs(Math.round((h - 1) * tanSlant));
  const ink: { row: number; col: number }[] = [];
  let x = 0;
  for (const ch of text.toUpperCase()) {
    const glyph = font.glyphs[ch] ?? font.glyphs[' '];
    if (!glyph) {
      x += font.cell.w + opts.letterSpacing;
      continue;
    }
    const gw = glyph[0]?.length ?? font.cell.w;
    for (let r = 0; r < glyph.length; r++) {
      const line = glyph[r] ?? '';
      const shear = Math.round((h - 1 - r) * tanSlant);
      for (let c = 0; c < line.length; c++) {
        if (line[c] === 'X') ink.push({ row: r, col: x + c + shear });
      }
    }
    x += gw + opts.letterSpacing;
  }
  const width = Math.max(1, x + maxShear);
  const grid: boolean[][] = Array.from({ length: h }, () =>
    Array<boolean>(width).fill(false),
  );
  for (const p of ink) {
    if (p.row >= 0 && p.row < h && p.col >= 0 && p.col < width) {
      grid[p.row][p.col] = true;
    }
  }
  return grid;
}

/** Verbatim copy of the pre-refactor explicit stamping loop. */
function oldExplicitMask(layer: TextLayer, cols: number, rows: number): boolean[][] {
  const font = getFont(layer.fontId);
  const spacing = layer.letterSpacing ?? 1;
  const piece = oldRasterize(layer.text, font, {
    slantDeg: layer.slantDeg,
    letterSpacing: spacing,
  });
  let mask = Array.from({ length: rows }, () => Array<boolean>(cols).fill(false));
  const pieceW = piece[0]?.length ?? 0;
  const rowPad = layer.anchor.row;
  const copies = layer.centerFrac != null ? Math.max(1, layer.repeat) : 1;
  const rise = layer.rise ?? 0;
  for (let k = 0; k < copies; k++) {
    const anchorCol =
      layer.centerFrac != null
        ? Math.round((layer.centerFrac + k / copies) * cols - pieceW / 2)
        : layer.anchor.col;
    for (let r = 0; r < piece.length; r++) {
      for (let c = 0; c < piece[r].length; c++) {
        if (!piece[r][c]) continue;
        const dr = rowPad + r - Math.round(c * rise);
        if (dr < 0 || dr >= rows) continue;
        const dc = (anchorCol + c) % cols;
        mask[dr][dc < 0 ? dc + cols : dc] = true;
      }
    }
  }
  if (layer.mirror) mask = mask.map((row) => [...row].reverse());
  return mask;
}

let fails = 0;
let checked = 0;

const check = (cond: boolean, msg: string) => {
  checked++;
  if (cond) {
    console.log(`  ok   ${msg}`);
  } else {
    fails++;
    console.error(`  FAIL ${msg}`);
  }
};

function compare(label: string, input: TextLayer, cols: number, rows: number) {
  /**
   * `oldRasterize` is a verbatim copy of the stamping loop as it was before the
   * layer refactor, and this file exists to prove the refactor did not move a
   * single stitch. `slantRepair` is not part of that claim — it is new
   * behaviour, added for «Norge26», and it changes the mask ON PURPOSE by
   * bridging the shear seam. Teaching the old loop about it would make the
   * comparison circular, so the parity run turns it off instead. The repaired
   * output has its own tests over in `validate.ts`: the lean, the letter gaps
   * and the ink weight are all measured there.
   */
  const layer: TextLayer = { ...input, slantRepair: false };
  const want = oldExplicitMask(layer, cols, rows);
  // Any ground that is not the ink, so "is this cell inked" is unambiguous.
  const ground = layer.colorId === 'peach' ? 'black' : 'peach';
  const grid = compositeChart([layer], emptyOverride(), cols, rows, ground);
  let diff = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const got = grid[r][c] === layer.colorId;
      if (got !== want[r][c]) diff++;
    }
  }
  checked++;
  if (diff > 0) {
    fails++;
    console.error(`  FAIL ${label}: ${diff} celler avviker`);
  } else {
    console.log(`  ok   ${label}`);
  }
}

/** Is every glyph a whole vertical translation of its upright master? */
function glyphsWhole(l: TextLayer) {
  const font = getFont(l.fontId);
  const { pieces } = rasterizeGlyphRun(l.text, font, {
    slantDeg: l.slantDeg,
    letterSpacing: l.letterSpacing ?? 1,
    scaleX: l.scaleX,
    scaleY: l.scaleY,
    bold: l.bold,
  });
  const { mask } = textPiece(l);
  const H = mask.length;
  for (const g of pieces) {
    if (!g.mask.some((r) => r.some(Boolean))) continue;
    // The whole point of the invariant: a glyph is moved as ONE piece. So it
    // has to appear intact at some single offset — a climbing letter also
    // travels right along the italic axis, so the column may have shifted
    // too, but every stitch of the letter must have shifted with it.
    // Italic glyphs lean into their neighbours' columns, so the test is
    // "all of this glyph's ink appears together at one offset", not "these
    // columns contain nothing else".
    const W = mask[0]?.length ?? 0;
    let matched = false;
    for (let dr = 0; dr + g.mask.length <= H && !matched; dr++) {
      for (let dc = 0; g.col + dc + (g.mask[0]?.length ?? 0) <= W && !matched; dc++) {
        let ok = true;
        for (let r = 0; r < g.mask.length && ok; r++) {
          for (let c = 0; c < g.mask[r].length && ok; c++) {
            if (g.mask[r][c] && !(mask[dr + r]?.[g.col + dc + c] ?? false)) ok = false;
          }
        }
        if (ok) matched = true;
      }
    }
    if (!matched) return false;
  }
  return true;
}

console.log('Publiserte tekstlag — ny plassering ≡ gammel stempling:');
for (const def of listPatterns()) {
  const d = derivePattern(def);
  for (const l of def.chartLayers) {
    if (l.kind !== 'text') continue;
    if (l.distributeWords?.length) continue;
    if (!(l.centerFrac != null || (l.repeat <= 1 && l.anchor.col !== 0))) continue;
    // A climbing baseline is checked against the per-glyph invariant below,
    // not against the per-column stamping it deliberately replaced.
    compare(
      `${def.id}/${l.text}`,
      { ...l, rise: 0, arcRows: 0 },
      d.bodyCount,
      d.bandRows,
    );
    if (l.rise || l.arcRows) {
      check(
        glyphsWhole(l),
        `${def.id}/${l.text}: stigningen flytter hele bokstaver`,
      );
    }
  }
}

console.log('Syntetiske varianter (slant, rise, repeat, mirror, anchor):');
const base: TextLayer = {
  kind: 'text',
  id: 't',
  text: 'NORGE',
  fontId: 'lyn',
  slantDeg: 26,
  anchor: { row: 3, col: 0 },
  repeat: 2,
  colorId: 'red',
  mirror: false,
  letterSpacing: 1,
  centerFrac: 0.095,
  rise: 0.05,
};
// A flat baseline must still match the original stamping exactly. A climbing
// one deliberately does not: the climb now steps per GLYPH, so a letter is
// never sheared in half between two rows. That invariant is checked below
// instead of against the superseded per-column reference.
for (const slantDeg of [0, 8, 26]) {
  for (const repeat of [1, 2, 3]) {
    for (const mirror of [false, true]) {
      for (const row of [0, 2, 5]) {
        compare(
          `slant${slantDeg} x${repeat} ${mirror ? 'speil' : 'rett'} rad${row}`,
          { ...base, slantDeg, rise: 0, repeat, mirror, anchor: { row, col: 0 } },
          100,
          12,
        );
      }
    }
  }
}

console.log('Grunnlinjen bøyes per bokstav, aldri midt i en:');
{
  for (const rise of [0.05, 0.12, -0.08]) {
    for (const slantDeg of [0, 26]) {
      const l: TextLayer = { ...base, rise, slantDeg, repeat: 1, anchor: { row: 2, col: 0 } };
      check(glyphsWhole(l), `stigning ${rise} / skråning ${slantDeg}°: hver bokstav flyttes hel`);
    }
  }
  for (const arcRows of [2, 4, -3]) {
    const l: TextLayer = { ...base, rise: 0, arcRows, slantDeg: 0, repeat: 1, anchor: { row: 1, col: 0 } };
    check(glyphsWhole(l), `bue ${arcRows} rader: hver bokstav flyttes hel`);
  }

  // The arch really arches: the middle of the word rides above its ends.
  const flat = textPiece({ ...base, rise: 0, arcRows: 0, slantDeg: 0, repeat: 1 });
  const arched = textPiece({ ...base, rise: 0, arcRows: 3, slantDeg: 0, repeat: 1 });
  check(
    arched.mask.length === flat.mask.length + 3,
    `en bue på 3 rader gjør ordet 3 rader høyere (${flat.mask.length} → ${arched.mask.length})`,
  );
  const topRowOf = (m: boolean[][], col: number) => m.findIndex((r) => r[col]);
  const midCol = Math.floor((arched.mask[0]?.length ?? 2) / 2);
  const inkCols = (m: boolean[][]) => {
    const out: number[] = [];
    for (let c = 0; c < (m[0]?.length ?? 0); c++) if (m.some((r) => r[c])) out.push(c);
    return out;
  };
  const cols2 = inkCols(arched.mask);
  const firstCol = cols2[0];
  check(
    topRowOf(arched.mask, midCol) < topRowOf(arched.mask, firstCol),
    'midten av ordet ligger høyere enn enden',
  );
  const dip = textPiece({ ...base, rise: 0, arcRows: -3, slantDeg: 0, repeat: 1 });
  check(
    topRowOf(dip.mask, midCol) > topRowOf(dip.mask, inkCols(dip.mask)[0]),
    'negativ bue lager et smil i stedet',
  );
}
// anchor.col path (centerFrac undefined)
for (const col of [0, 7, 95]) {
  compare(
    `anker kolonne ${col}`,
    { ...base, rise: 0, centerFrac: undefined, repeat: 1, anchor: { row: 2, col: col || 3 } },
    100,
    12,
  );
}




/** Ink cells of a single layer against a ground it cannot be confused with. */
function inkOf(layer: TextLayer, cols: number, rows: number): Set<string> {
  const ground = layer.colorId === 'peach' ? 'black' : 'peach';
  const grid = compositeChart([layer], emptyOverride(), cols, rows, ground);
  const out = new Set<string>();
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) if (grid[r][c] === layer.colorId) out.add(`${r},${c}`);
  }
  return out;
}

console.log('Skalering i hele masker:');
{
  const one: TextLayer = { ...base, text: 'NO', slantDeg: 0, rise: 0, repeat: 1, centerFrac: 0.1 };
  const boxOf = (l: TextLayer) => {
    const b = textPlacements(l, 200).map(placementBox)[0];
    if (!b) throw new Error('ingen boks');
    return { w: b.width, h: b.row1 - b.row0 + 1 };
  };
  const b1 = boxOf(one);
  for (const s of [2, 3, 4]) {
    const bs = boxOf({ ...one, scaleX: s, scaleY: s });
    check(
      bs.h === b1.h * s,
      `skala ${s}×: høyden går fra ${b1.h} til ${bs.h} rader`,
    );
    // Width grows by the scale on the glyphs; the letter gap is left in stitches.
    check(
      bs.w >= b1.w * s - 4 && bs.w <= b1.w * s,
      `skala ${s}×: bredden ${bs.w} ≈ ${b1.w}×${s} masker`,
    );
  }
  const b11 = boxOf({ ...one, scaleX: 1, scaleY: 1 });
  check(b11.w === b1.w && b11.h === b1.h, 'skala 1× endrer ingenting');
  // Independent axes.
  const wide = boxOf({ ...one, scaleX: 3, scaleY: 1 });
  check(wide.h === b1.h && wide.w > b1.w, 'bredde alene endrer ikke høyden');
  const tall = boxOf({ ...one, scaleX: 1, scaleY: 3 });
  check(tall.w === b1.w && tall.h === b1.h * 3, 'høyde alene endrer ikke bredden');
}

console.log('Fet skrift og kontur:');
{
  const plain: TextLayer = { ...base, text: 'NORGE', slantDeg: 0, rise: 0, repeat: 1 };
  const thin = inkOf(plain, 100, 12);
  const fat = inkOf({ ...plain, bold: true }, 100, 12);
  check(fat.size > thin.size, `fet skrift gir flere masker (${thin.size} → ${fat.size})`);
  check([...thin].every((k) => fat.has(k)), 'fet skrift dekker alltid den tynne');

  const ground = 'peach';
  const halo = compositeChart(
    [{ ...plain, haloColorId: 'black', haloWidth: 1 }],
    emptyOverride(),
    100,
    12,
    ground,
  );
  let inkKept = 0;
  let ring = 0;
  for (let r = 0; r < 12; r++) {
    for (let c = 0; c < 100; c++) {
      if (thin.has(`${r},${c}`)) {
        if (halo[r][c] === plain.colorId) inkKept++;
      } else if (halo[r][c] === 'black') ring++;
    }
  }
  check(inkKept === thin.size, 'konturen overmaler aldri bokstaven selv');
  check(ring > 0, `konturen legger ${ring} masker rundt bokstavene`);
}

console.log('Draing er sannferdig (én maske dratt = én maske flyttet):');
{
  const cols = 100;
  const l: TextLayer = { ...base, text: 'HEI', slantDeg: 0, rise: 0, repeat: 1, centerFrac: 0.2, anchor: { row: 2, col: 0 } };
  const before = textPlacements(l, cols).map(placementBox)[0]!;
  for (const step of [1, 5, 37, -12]) {
    const moved = normalizeLayer({
      ...l,
      centerFrac: wrapFrac(l.centerFrac! + step / cols),
    }) as TextLayer;
    const after = textPlacements(moved, cols).map(placementBox)[0]!;
    const delta = ((after.col0 - before.col0 + step * 0 + cols * 2) % cols) -
      ((step % cols) + cols) % cols;
    check(
      delta === 0,
      `dra ${step} masker flytter mønsteret nøyaktig ${step} masker`,
    );
  }
  for (const step of [1, -2, 3]) {
    const moved = normalizeLayer({ ...l, anchor: { ...l.anchor, row: l.anchor.row + step } }) as TextLayer;
    const after = textPlacements(moved, cols).map(placementBox)[0]!;
    check(after.row0 - before.row0 === step, `dra ${step} rader flytter ${step} rader`);
  }
}

console.log('Treff-testen peker på det du ser:');
{
  const cols = 100;
  const rows = 12;
  const l: TextLayer = { ...base, text: 'NORGE', repeat: 2, centerFrac: 0.6, anchor: { row: 2, col: 0 } };
  const ink = inkOf(l, cols, rows);
  const places = textPlacements(l, cols);
  let hit = 0;
  for (const key of ink) {
    const [r, c] = key.split(',').map(Number);
    if (places.some((p) => placementHit(p, r, c, cols))) hit++;
  }
  check(hit === ink.size, `alle ${ink.size} synlige masker kan gripes`);
  let stray = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (ink.has(`${r},${c}`)) continue;
      if (places.some((p) => placementHit(p, r, c, cols))) stray++;
    }
  }
  check(stray === 0, 'ingen treff utenfor blekket');
}

console.log('Normalisering tåler søppel:');
{
  const junk = {
    kind: 'text',
    id: 'x',
    text: 'A'.repeat(200),
    fontId: 'blokk',
    slantDeg: 999,
    anchor: { row: NaN, col: Infinity },
    repeat: -4,
    colorId: 'red',
    mirror: false,
    letterSpacing: 99,
    centerFrac: 4.7,
    scaleX: 0,
    scaleY: 1e9,
    rise: -12,
  } as unknown as TextLayer;
  const n = normalizeLayer(junk) as TextLayer;
  check(n.text.length <= 40, `teksten kappes til ${n.text.length} tegn`);
  check(n.slantDeg === 30, `skråning klemmes til ${n.slantDeg}°`);
  check(n.repeat === 1, `gjentakelse klemmes til ${n.repeat}`);
  check(n.scaleX === 1 && n.scaleY === 6, `skala klemmes til ${n.scaleX}/${n.scaleY}`);
  check(n.rise === -0.3, `stigning klemmes til ${n.rise}`);
  check(n.centerFrac === 0.7, `plassering vikles til ${n.centerFrac}`);
  check(
    Number.isFinite(n.anchor.row) && Number.isFinite(n.anchor.col),
    'anker blir alltid et tall',
  );
  const d = normalizeDesign({
    title: '',
    baseColor: 'white',
    crownColor: 'white',
    brimColor: 'blue',
    brimStyle: 'sombrero',
    bandRows: 400,
    hookMm: 4,
    sizeId: 'dame',
    omkrets_cm: -3,
    layers: null,
    override: null,
  } as unknown as never);
  check(d.bandRows === 35, `båndhøyde klemmes til ${d.bandRows}`);
  check(d.omkrets_cm === 44, `omkrets klemmes til ${d.omkrets_cm} cm`);
  check(d.brimStyle === 'bucket', 'ukjent kantstil faller tilbake til bøttekant');
  check(Array.isArray(d.layers) && d.layers.length === 0, 'lag uten liste blir tom liste');
  check(d.override.kind === 'override', 'manglende penselstrøk blir et tomt lag');
  check(d.title.length > 0, `tom tittel blir «${d.title}»`);

  // Every published pattern must come out of the studio normalizer stitch for
  // stitch identical — opening a kit in the studio may not redraw the hat.
  for (const def of listPatterns()) {
    const d = derivePattern(def);
    const before = derivePattern(def).chart.grid;
    const after = derivePattern({
      ...def,
      chartLayers: def.chartLayers.map(normalizeLayer),
    }).chart.grid;
    let diff = 0;
    for (let r = 0; r < d.bandRows; r++) {
      for (let c = 0; c < d.chart.cols; c++) {
        if (before[r]?.[c] !== after[r]?.[c]) diff++;
      }
    }
    check(diff === 0, `${def.id}: normalisering endrer ingen masker`);
  }
}

console.log('Håndtakene gjør det de sier:');
{
  const box = { row0: 2, row1: 8, col0: 20, width: 30 };
  const start = {
    row: 2,
    col: 0,
    centerFrac: 0.3,
    scaleX: 1,
    scaleY: 1,
    slantDeg: 0,
    rise: 0,
  };
  const drag = (handle: Parameters<typeof dragPatch>[0]['handle'], toCol: number, toRow: number) =>
    dragPatch({
      handle,
      start,
      box,
      fromRow: 5,
      fromCol: 35,
      toRow,
      toCol,
      cols: 100,
    });

  // Move: one stitch dragged is one stitch moved, in both axes, wrapping.
  check(
    drag('move', 45, 5).centerFrac === 0.4 && drag('move', 45, 5).row === 2,
    'flytt 10 masker til høyre = +10 % rundt hatten, samme rad',
  );
  check(drag('move', 35, 8).row === 5, 'flytt 3 rader ned = rad 5');
  check(
    drag('move', -70, 5).centerFrac === 0.25,
    'flytt forbi sømmen vikles rundt (0,3 − 1,05 → 0,25)',
  );

  // Scale: the box doubles when you pull the edge to twice its width.
  check(drag('scale-x', 20 + 60, 5).scaleX === 2, 'dobbelt så bred boks = 2× skala');
  check(drag('scale-x', 20 + 90, 5).scaleX === 3, 'tre ganger bredden = 3× skala');
  check(drag('scale-x', 20 + 60, 5).scaleY === undefined, 'breddehåndtaket rører ikke høyden');
  check(drag('scale-y', 35, 2 + 14).scaleY === 2, 'dobbelt så høy boks = 2× skala');
  check(drag('scale-y', 35, 2 + 14).scaleX === undefined, 'høydehåndtaket rører ikke bredden');
  check(drag('scale', 20 + 60, 2 + 14).scaleX === 2, 'hjørnet tar begge akser (bredde)');
  check(drag('scale', 20 + 60, 2 + 14).scaleY === 2, 'hjørnet tar begge akser (høyde)');
  check(drag('scale-x', 20 + 600, 5).scaleX === 6, 'skala klemmes til 6× uansett hvor langt du drar');
  check(drag('scale-x', 20 - 50, 5).scaleX === 1, 'å dra innover under 1× stopper på 1×');

  // Slant: the top edge follows the pointer, so the angle is atan(dx / height).
  const lean = drag('slant', 37, 2);
  check(
    lean.slantDeg === Math.round((Math.atan2(2, 7) * 180) / Math.PI),
    `dra toppen 2 masker til høyre over en 7 rader høy boks = 16° (fikk ${lean.slantDeg}°)`,
  );
  check(Number(drag('slant', 28, 2).slantDeg) < 0, 'dra toppen til venstre gir negativ skråning');
  check(drag('slant', 335, 2).slantDeg === 30, 'skråning klemmes til 30°');
  check(drag('slant', -300, 2).slantDeg === -30, 'skråning klemmes til −30°');

  // Rise: rows climbed per stitch travelled, so it reads the same on any word.
  check(drag('rise', 55, 2).rise === 0.1, 'løft knotten 3 rader over 30 masker = 10 % stigning');
  check(Number(drag('rise', 55, 8).rise) < 0, 'dra knotten ned gir fallende grunnlinje');
  check(drag('rise', 55, -95).rise === 0.3, 'stigning klemmes til 30 %');

  // The readout says what happened.
  check(
    dragHint('move', drag('move', 45, 5), start) === 'rad 3 · 40 % rundt',
    'flytte-visningen viser rad og plassering',
  );
  check(
    dragHint('slant', lean, start) === `skråning ${lean.slantDeg}°`,
    'skråvisningen viser vinkelen',
  );
}

console.log('Kunsten kan ikke dras ut av mønsterfeltet:');
{
  const cols = 100;
  const rows = 10;
  const l: TextLayer = {
    ...base,
    text: 'NORGE',
    slantDeg: 0,
    rise: 0,
    repeat: 1,
    centerFrac: 0.3,
    anchor: { row: 2, col: 0 },
  };
  const range = rowRange(l, cols, rows);
  const height = (() => {
    const b = textPlacements(l, cols).map(placementBox)[0]!;
    return b.row1 - b.row0 + 1;
  })();
  check(
    range.min === 0 && range.max === rows - height,
    `et ${height} rader høyt ord kan ankres på rad ${range.min}–${range.max} av ${rows}`,
  );
  for (const want of [-40, -1, 0, 3, 99]) {
    const row = clampRow(l, cols, rows, want);
    const moved = normalizeLayer({ ...l, anchor: { ...l.anchor, row } }) as TextLayer;
    const b = textPlacements(moved, cols).map(placementBox)[0]!;
    check(
      b.row0 >= 0 && b.row1 < rows,
      `dra mot rad ${want} lander på ${row}: blekket blir i feltet (rad ${b.row0}–${b.row1})`,
    );
  }
  // A word taller than the band pins to the top instead of flipping inside out.
  const huge = normalizeLayer({ ...l, scaleY: 4 }) as TextLayer;
  const hr = rowRange(huge, cols, rows);
  check(hr.max >= hr.min, 'for høy tekst gir et gyldig (ikke omvendt) spillerom');

  // A climbing baseline lifts the tail above the anchor, so the room has to be
  // measured from the INK, not from the anchor row.
  const climbing = normalizeLayer({ ...l, rise: 0.05 }) as TextLayer;
  const climbBox = textPlacements(climbing, cols).map(placementBox)[0]!;
  check(
    climbBox.row0 < climbing.anchor.row,
    `stigningen løfter blekket ${climbing.anchor.row - climbBox.row0} rader over ankeret`,
  );
  for (const want of [-5, 0, 2, 50]) {
    const row = clampRow(climbing, cols, rows, want);
    const moved = normalizeLayer({
      ...climbing,
      anchor: { ...climbing.anchor, row },
    }) as TextLayer;
    const b = textPlacements(moved, cols).map(placementBox)[0]!;
    check(
      b.row0 >= 0 && b.row1 < rows,
      `stigende tekst mot rad ${want} → ${row}: blekket blir i feltet (rad ${b.row0}–${b.row1})`,
    );
  }

  // Artwork that cannot fit at all still clamps to a stable anchor, and the
  // craft check is what tells the designer why.
  const tooTall = normalizeLayer({ ...l, rise: 0.15 }) as TextLayer;
  const a = clampRow(tooTall, cols, rows, -99);
  const b2 = clampRow(tooTall, cols, rows, 99);
  check(
    a === b2 && Number.isFinite(a),
    `tekst som ikke får plass klemmes til én stabil rad (${a})`,
  );
}

console.log('Håndverkssjekken finner og fikser:');
{
  const cols = 100;
  const rows = 10;
  const runAudit = (layers: TextLayer[]) => {
    const grid = compositeChart(layers, emptyOverride(), cols, rows, 'white');
    return auditDesign({
      cols,
      rows,
      grid,
      layers,
      background: 'white',
      crownColor: 'white',
      brimColor: 'blue',
    });
  };

  // A word too tall for the band, then the same word after its own fix.
  const tall: TextLayer = {
    ...base,
    text: 'NORGE',
    slantDeg: 0,
    rise: 0,
    repeat: 1,
    scaleY: 3,
    colorId: 'blue',
    anchor: { row: 0, col: 0 },
  };
  const f1 = runAudit([tall]);
  const tooTall = f1.find((f) => f.id.startsWith('fit:'));
  check(tooTall != null, 'for høy tekst blir fanget');
  if (tooTall?.fix?.patch) {
    const fixed = normalizeLayer({ ...tall, ...tooTall.fix.patch } as TextLayer);
    check(
      !runAudit([fixed as TextLayer]).some((f) => f.id.startsWith('fit:')),
      `«${tooTall.fix.label}» fjerner problemet`,
    );
  }

  // A word hanging off the bottom of the band.
  const low: TextLayer = { ...tall, scaleY: 1, anchor: { row: 8, col: 0 } };
  const f2 = runAudit([low]);
  const clipped = f2.find((f) => f.id.startsWith('clip-bottom:'));
  check(clipped != null, 'tekst som stikker ut nederst blir fanget');
  if (clipped?.fix?.patch) {
    const fixed = normalizeLayer({
      ...low,
      anchor: { ...low.anchor, row: Number(clipped.fix.patch.row) },
    } as TextLayer) as TextLayer;
    check(
      !runAudit([fixed]).some((f) => f.level === 'error'),
      `«${clipped.fix.label}» setter teksten inn i feltet`,
    );
  }

  // Ink that cannot be told apart from its ground.
  const invisible: TextLayer = { ...low, anchor: { row: 2, col: 0 }, colorId: 'white' };
  const f3 = runAudit([invisible]);
  const contrast = f3.find((f) => f.id.startsWith('contrast:'));
  check(contrast != null, 'hvit tekst på hvit bunn blir fanget');
  if (contrast?.fix?.patch) {
    const fixed = normalizeLayer({ ...invisible, ...contrast.fix.patch } as TextLayer) as TextLayer;
    check(
      !runAudit([fixed]).some((f) => f.id.startsWith('contrast:')),
      `«${contrast.fix.label}» gjør teksten synlig igjen`,
    );
  }

  // Too many copies to fit around the hat.
  const crowded: TextLayer = { ...tall, scaleY: 1, anchor: { row: 2, col: 0 }, repeat: 8 };
  const crowd = runAudit([crowded]).find((f) => f.id.startsWith('crowd:'));
  check(crowd != null, '8 kopier rundt hatten blir fanget');

  // A clean design should be quiet.
  const clean: TextLayer = {
    ...base,
    text: 'NORGE',
    slantDeg: 0,
    rise: 0,
    repeat: 2,
    scaleY: 1,
    scaleX: 1,
    colorId: 'blue',
    anchor: { row: 2, col: 0 },
    centerFrac: 0.095,
  };
  const quiet = runAudit([clean]).filter((f) => f.level === 'error');
  check(quiet.length === 0, `et ryddig design gir ingen feil (${quiet.map((q) => q.title).join(', ')})`);
}

console.log('Former blir til masker:');
{
  const sizes: [number, number][] = [[10, 8], [16, 12], [24, 18], [40, 30]];
  let tooSmallAtMin = 0;
  for (const spec of SHAPES) {
    // At its stated minimum the shape must still put ink on the grid, and at
    // every size it must stay inside the box it was given.
    const min = rasterizeShape(spec.id, { w: spec.minW, h: spec.minH, simplify: true });
    const inked = min.flat().filter((v) => v > 0).length;
    if (inked === 0) tooSmallAtMin++;
    const fits = min.length === spec.minH && min.every((r) => r.length === spec.minW);
    check(
      inked > 0 && fits,
      `${spec.id}: ${inked} masker på minstemålet ${spec.minW}×${spec.minH}`,
    );
    for (const [w, h] of sizes) {
      const g = rasterizeShape(spec.id, { w, h, rotationDeg: 0 });
      if (g.length !== h || g.some((r) => r.length !== w)) {
        check(false, `${spec.id}: feil rutenett på ${w}×${h}`);
      }
    }
  }
  check(tooSmallAtMin === 0, 'ingen form er tom på sitt eget minstemål');

  // Rotation keeps the artwork inside the box rather than cropping it away.
  for (const deg of [15, 45, 90, 180, -30]) {
    const g = rasterizeShape('star', { w: 20, h: 20, rotationDeg: deg });
    const n = g.flat().filter((v) => v > 0).length;
    check(n > 40, `stjerne rotert ${deg}°: ${n} masker igjen`);
  }
  const flat = rasterizeShape('triangle', { w: 20, h: 20 });
  const flipped = rasterizeShape('triangle', { w: 20, h: 20, flipY: true });
  check(
    JSON.stringify(flipped) === JSON.stringify([...flat].reverse()),
    'loddrett speiling er nøyaktig radene i motsatt rekkefølge',
  );

  // Simplify really removes the things a hook cannot make.
  const speckled = rasterizeShape('snowflake', { w: 11, h: 11 });
  const cleaned = simplifyForKnit(speckled);
  const lone = (g: number[][]) => {
    let n = 0;
    for (let r = 0; r < g.length; r++) {
      for (let c = 0; c < g[r].length; c++) {
        if (!g[r][c]) continue;
        const same = [[-1, 0], [1, 0], [0, -1], [0, 1]].filter(([dr, dc]) => {
          const nr = r + dr;
          const nc = c + dc;
          return g[nr]?.[nc] === g[r][c];
        }).length;
        if (same === 0) n++;
      }
    }
    return n;
  };
  check(lone(cleaned) === 0, `forenkling fjerner alle enkeltmasker (${lone(speckled)} → ${lone(cleaned)})`);
}

console.log('Gjentakelse, speiling og vekselfarge:');
{
  const cols = 110;
  const layer: ShapeLayer = {
    kind: 'shape',
    id: 's1',
    shapeId: 'selbu',
    w: 11,
    h: 11,
    rotationDeg: 0,
    anchor: { row: 0, col: 0 },
    centerFrac: 0,
    colorIds: ['blue'],
    repeatX: 5,
    repeatY: 1,
    spacingX: 3,
    spacingY: 1,
    wrap: true,
    simplify: true,
  };
  const wrapped = shapePlacements(layer, cols);
  check(wrapped.length === 5, `fem kopier rundt hatten (${wrapped.length})`);
  const gaps = wrapped
    .map((p) => p.col)
    .sort((a, b) => a - b)
    .map((c, i, arr) => (i === 0 ? arr[0] + cols - arr[arr.length - 1] : c - arr[i - 1]));
  const even = Math.max(...gaps) - Math.min(...gaps) <= 1;
  check(even, `kopiene står jevnt fordelt (avstander ${gaps.join(', ')})`);

  const alt = shapePlacements({ ...layer, altColorId: 'red' }, cols);
  const colorsOf = (p: (typeof alt)[number]) =>
    new Set(p.colors!.flat().filter(Boolean) as string[]);
  check(
    colorsOf(alt[0]).has('blue') && colorsOf(alt[1]).has('red'),
    'vekselfargen treffer annenhver kopi',
  );
  const mirrored = shapePlacements({ ...layer, shapeId: 'reindeer', mirrorAlt: true }, cols);
  check(
    JSON.stringify(mirrored[1].mask) ===
      JSON.stringify(mirrored[0].mask.map((r) => [...r].reverse())),
    'speilmønsteret vender annenhver kopi',
  );
  const stacked = shapePlacements({ ...layer, repeatX: 2, repeatY: 3, wrap: false }, cols);
  check(stacked.length === 6, `to i bredden og tre nedover gir ${stacked.length} kopier`);
  check(
    new Set(stacked.map((p) => p.row)).size === 3,
    'de tre radene ligger på hver sin høyde',
  );
}

console.log('Assistenten leser oppdraget:');
{
  const b = parseBrief(
    'retro norsk supporterhatt, NORGE foran, nordiske detaljer, rødt hvitt og blått',
  );
  check(b.words[0] === 'NORGE', `fant ordet «${b.words[0]}»`);
  check(
    b.colors.join(',') === 'blue,red,white' || new Set(b.colors).size === 3,
    `fant garnene ${b.colors.join(', ')}`,
  );
  check(b.themes.has('nordic') && b.themes.has('retro'), 'fant nordisk + retro');
  const f = parseBrief('svart og gul fotballhatt med skjold og teksten HEIA');
  check(f.themes.has('football'), 'fant fotball');
  check(f.motifs.includes('shield'), 'fant skjoldet');
  check(f.words.includes('HEIA'), `fant teksten (${f.words.join(', ')})`);
  const empty = parseBrief('en fin hatt');
  check(empty.words.length === 0, 'finner ikke opp en tekst som ikke er bedt om');
}

console.log('Fire forslag, alle heklbare:');
{
  const cols = 110;
  for (const source of [
    'retro norsk supporterhatt, NORGE foran, nordiske detaljer, rødt hvitt og blått',
    'svart og gul fotballhatt med skjold og teksten HEIA',
    'minimal nordisk hatt med selburose i blått og hvitt',
    'bold fotball VM 2026 blå og hvit',
  ]) {
    const brief = parseBrief(source);
    const four = fourVariations(brief, cols, 12345);
    check(four.length === 4, `«${source.slice(0, 24)}…» gir fire forslag`);
    for (const v of four) {
      const d = normalizeDesign(v.design);
      const grid = compositeChart(d.layers, d.override, cols, d.bandRows, d.baseColor);
      const findings = auditDesign({
        cols,
        rows: d.bandRows,
        grid,
        layers: d.layers,
        background: d.baseColor,
        crownColor: d.crownColor,
        brimColor: d.brimColor,
      });
      const errors = findings.filter((f) => f.level === 'error');
      check(
        errors.length === 0,
        `  ${v.label}: ingen feil (${errors.map((e) => e.title).join('; ') || 'ren'})`,
      );
      check(
        d.bandRows >= 10 && d.bandRows <= 35,
        `  ${v.label}: ${d.bandRows} rader er innenfor 10–35`,
      );
      check(d.layers.length > 0, `  ${v.label}: har noe på seg`);
      const yarns = new Set<string>();
      for (const l of d.layers) {
        if (l.kind === 'text') yarns.add(l.colorId);
        if (l.kind === 'shape') for (const c of l.colorIds) yarns.add(c);
      }
      yarns.add(d.baseColor);
      check(yarns.size <= 4, `  ${v.label}: ${yarns.size} garn i alt`);
    }
  }
}

console.log('Remiks holder seg innenfor:');
{
  const cols = 110;
  const brief = parseBrief('norsk fotballhatt NORGE rød hvit blå');
  let d = normalizeDesign(fourVariations(brief, cols, 999)[0].design);
  for (const m of REMIXES) {
    const next = normalizeDesign(remixDesign(d, m.id, cols, 4242));
    const grid = compositeChart(next.layers, next.override, cols, next.bandRows, next.baseColor);
    const errors = auditDesign({
      cols,
      rows: next.bandRows,
      grid,
      layers: next.layers,
      background: next.baseColor,
      crownColor: next.crownColor,
      brimColor: next.brimColor,
    }).filter((f) => f.level === 'error');
    check(
      errors.length === 0,
      `${m.label}: fortsatt heklbar (${errors.map((e) => e.title).join('; ') || 'ren'})`,
    );
    check(next.bandRows >= 6 && next.bandRows <= 35, `${m.label}: gyldig båndhøyde`);
  }
  check(
    normalizeDesign(remixDesign(d, 'minimal', cols)).layers.length <= d.layers.length,
    'mer minimal fjerner heller enn å legge til',
  );
  d = normalizeDesign(remixDesign(d, 'nordic', cols));
  check(
    d.layers.some((l) => l.kind === 'shape' && l.shapeId.startsWith('p-')),
    'mer nordisk legger på et bord',
  );
}

console.log('Auto-tilpass finner største lesbare størrelse:');
{
  for (const [text, maxW, maxH] of [
    ['NORGE', 44, 12],
    ['HEIA NORGE', 90, 10],
    ['VM', 30, 20],
  ] as [string, number, number][]) {
    const fit = fitText(text, maxW, maxH);
    check(fit != null, `«${text}» får plass på ${maxW}×${maxH}`);
    if (fit) {
      check(
        fit.w <= maxW && fit.h <= maxH,
        `  «${text}» → ${fit.w}×${fit.h} innenfor ${maxW}×${maxH}`,
      );
      check(fit.h >= MIN_CAP_ROWS, `  «${text}» er minst ${MIN_CAP_ROWS} rader høy`);
      // Nothing one step larger would also have fitted.
      const bigger = measureText(text, fit.fontId, fit.scaleX, fit.scaleY + 1, fit.letterSpacing, fit.bold);
      check(bigger.h > maxH || bigger.w > maxW, `  «${text}» kunne ikke vært større`);
    }
  }
  check(fitText('DENNE TEKSTEN ER ALTFOR LANG', 20, 8) === null, 'umulig tekst gir ingen løsning');
}

console.log('Hele hatten i ett diagram:');
{
  for (const id of ['ro-ro-ro', 'norway26', 'martin'] as const) {
    const d = derivePattern(getPattern(id));
    const full = buildFullChart(d.rounds, d.stitches);
    check(
      full.rows.length === d.rounds.length,
      `${id}: én linje per runde (${full.rows.length} av ${d.rounds.length})`,
    );
    const widths = full.rows.every((row, i) => row.colors.length === d.rounds[i].count);
    check(widths, `${id}: hver linje er like bred som runden er lang`);
    const filled = full.rows.every((row) => row.colors.every(Boolean));
    check(filled, `${id}: ingen hull i diagrammet`);
    check(
      full.maxCount === Math.max(...d.rounds.map((r) => r.count)),
      `${id}: diagrammet er så bredt som den videste runden (${full.maxCount})`,
    );
    const centred = full.rows.every(
      (row) => row.offset === Math.floor((full.maxCount - row.colors.length) / 2),
    );
    check(centred, `${id}: rundene er sentrert`);

    // The band section of the full chart has to be the very same stitches the
    // editable chart shows, or the two views would be telling different stories.
    const bandRows = full.rows.slice(full.bandFrom, full.bandTo + 1);
    check(
      bandRows.length === d.bandRows,
      `${id}: mønsterfeltet er ${bandRows.length} av ${d.bandRows} runder`,
    );
    const sameAsBandChart = bandRows.every((row, r) =>
      row.colors.every((c, i) => c === d.chart.grid[r]?.[i]),
    );
    check(sameAsBandChart, `${id}: mønsterfeltet er identisk med redigeringsdiagrammet`);

    const runs = phaseRuns(full);
    check(runs.length >= 3, `${id}: ${runs.length} faser merket av (pull → felt → kant)`);
    check(runs[0].phase === 'top', `${id}: begynner på pullen`);
    check(
      runs[runs.length - 1].phase === 'brim',
      `${id}: slutter på kanten`,
    );
  }
}

console.log(fails === 0 ? `\nAlle ${checked} sjekker OK.` : `\n${fails}/${checked} FEILET.`);
process.exit(fails === 0 ? 0 : 1);
