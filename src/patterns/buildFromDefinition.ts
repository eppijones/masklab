import type { Round, Stitch, YarnColor } from '../data/types';
import {
  compositeChart,
  emptyOverride,
  type ChartLayer,
  type ColorGrid,
  type OverrideLayer,
} from '../data/chartLayers';
import { waveStitchColor } from '../data/waves';
import {
  buildStitches as buildStitchesCore,
  expectedCount,
} from '../data/pattern';
import {
  buildSlashes,
  buildStreaks,
  slashAt,
  streakAt,
  stripeColorAt,
  type Slash,
  type Streak,
} from '../data/streaks';
import {
  slashColorList,
  slashParamsFromLayer,
  streakParamsFromLayer,
  stripeParamsFromLayer,
} from '../data/motifs';
import {
  buildBrimIncRounds,
  buildCrownRounds,
  buildWaveRounds,
  countStitchesByColor,
  resolveBodyCount,
} from '../sizing/derive';
import { getHook, type HookMm } from '../sizing/hooks';
import { getSize, type SizeId } from '../sizing/sizes';
import { buildMaterialsEstimate } from '../sizing/materials';
import { buildScriptModel } from './script';
import type {
  CrownColorSpec,
  DerivedPattern,
  PatternDefinition,
  PlainBrimSpec,
} from './types';
import { RO_RO_RO } from './ro-ro-ro';

/**
 * How many rounds sit below the wall chart (taper + brim + edge). The field's
 * row space has to reach exactly that far, or the strokes stop short of the rim.
 */
function roundsBelowWall(rounds: Round[]): number {
  let lastText = -1;
  for (let i = 0; i < rounds.length; i++) {
    if (rounds[i].phase === 'text') lastText = i;
  }
  return rounds.length - (lastText + 1);
}

function labelRounds(rounds: Omit<Round, 'label'>[]): Round[] {
  return rounds.map((r) => ({ ...r, label: `Runde ${r.num}` }));
}

/**
 * Classic bucket brim (no wave), in three parts from the fold out to the rim:
 *
 *   BREAK  one straight round in `spec.breakColor`, if the kit asks for one.
 *   FLARE  every increase, growing the circumference to `spec.flare` × body.
 *   RIM    `spec.edgeRounds` solid rounds in `finalColor` (the last of them is
 *          the `brim`-phase round), worked STRAIGHT. `spec.edgeAccent` takes
 *          the topmost of them.
 *
 * THE SHAPING FINISHES BEFORE THE RIM DOES. Spreading the increases evenly over
 * every brim round — which is what this used to do — puts them inside the
 * contrast band, and a band with increases in it ruffles: the colour change is
 * the most visible ring on the hat and it was the one ring that would not lie
 * flat. Front-loading the shaping costs nothing (the final count is identical,
 * the rhythms just get a little tighter) and buys a rim that holds its line.
 */
export function buildPlainBrimRounds(
  bodyCount: number,
  startNum: number,
  spec: PlainBrimSpec,
  finalColor: YarnColor,
): Omit<Round, 'label'>[] {
  const target = Math.round((bodyCount * (spec.flare ?? 1.35)) / 2) * 2;
  const edgeRounds = Math.max(1, spec.edgeRounds ?? 1);
  const breakRounds = spec.breakColor ? 1 : 0;
  /** First increase round of the rim band; the final round closes it. */
  const rimStart = spec.incRounds - (edgeRounds - 1);
  /** Rounds left to carry the whole flare. */
  const shapingRounds = Math.max(1, rimStart - breakRounds);

  const out: Omit<Round, 'label'>[] = [];
  let cur = bodyCount;
  let num = startNum;
  let shaped = 0;
  for (let i = 0; i < spec.incRounds; i++) {
    const isBreak = i < breakRounds;
    const isRim = i >= rimStart;
    let k: number | null = null;
    if (!isBreak && !isRim) {
      const desired =
        cur + Math.max(0, Math.round((target - cur) / (shapingRounds - shaped)));
      if (desired > cur) {
        k = Math.max(1, Math.floor(cur / (desired - cur)));
        cur = expectedCount(cur, k);
      }
      shaped++;
    }
    out.push({
      num: num++,
      phase: 'brim-inc',
      count: cur,
      color: isBreak
        ? (spec.breakColor as YarnColor)
        : isRim
          ? i === rimStart && spec.edgeAccent
            ? spec.edgeAccent
            : finalColor
          : spec.color,
      increaseEvery: k,
      chartRow: null,
    });
  }
  out.push({
    num: num++,
    phase: 'brim',
    count: cur,
    color: finalColor,
    increaseEvery: null,
    chartRow: null,
  });
  return out;
}

export function buildRoundsFromDefinition(
  def: PatternDefinition,
  bodyCount: number,
  bandRows: number,
): Round[] {
  const crown = buildCrownRounds(bodyCount, def.crownBase ?? def.background).map((r) => ({
    ...r,
    patterned: def.crown ? true : undefined,
  }));
  let num = crown.length + 1;

  const text: Omit<Round, 'label'>[] = [];
  for (let i = 0; i < bandRows; i++) {
    text.push({
      num: num++,
      phase: 'text',
      count: bodyCount,
      color: def.background,
      increaseEvery: null,
      chartRow: i + 1,
    });
  }

  if (!def.includeWave && def.brim) {
    const coverBrim = def.crown?.params.coverBrim === true;
    // Only the flare rounds carry colorwork. The break line at the fold and the
    // rim band (accent included — it takes an edge round rather than adding
    // one) are plain crochet, so don't mark them patterned.
    const solidTail = Math.max(1, def.brim.edgeRounds ?? 1);
    const breakRounds = def.brim.breakColor ? 1 : 0;
    const raw = buildPlainBrimRounds(bodyCount, num, def.brim, def.finalBrim.color);
    const brim = raw.map((r, i) => ({
      ...r,
      patterned:
        coverBrim && i >= breakRounds && i < raw.length - solidTail
          ? (true as const)
          : undefined,
    }));
    return labelRounds([...crown, ...text, ...brim]);
  }

  // A procedural field (def.crown) paints the flare too when coverBrim is set:
  // the rounds become per-stitch colorwork and their base color follows the kit
  // edge rather than Helene's blue wave.
  const fieldBrim = def.crown != null && def.crown.params.coverBrim === true;
  const finish = def.brimFinish;
  const paintInc = (r: Omit<Round, 'label'>) =>
    fieldBrim && !finish
      ? { ...r, color: def.finalBrim.color, patterned: true as const }
      : r;
  const brimInc = buildBrimIncRounds(bodyCount, num, def.background).map(paintInc);
  num += brimInc.length;
  const waveBase = brimInc[brimInc.length - 1]?.count ?? bodyCount;
  const waves = buildWaveRounds(waveBase, num, def.includeWave).map(paintInc);
  num += waves.length;

  const finalCount =
    waves.length > 0 ? waves[waves.length - 1].count : waveBase;
  const finalBrim: Omit<Round, 'label'> = {
    num,
    phase: 'brim',
    count: finalCount,
    color: def.finalBrim.color,
    increaseEvery: null,
    chartRow: null,
  };

  if (finish) {
    /**
     * HELENE'S SHAPE, NOT HELENE'S WAVE — AND ONE UNBROKEN RUN TO THE EDGE.
     *
     * The brim keeps her round schedule exactly — 100 → 110 → 120, three
     * straight rounds, then 132 and 144 — because that schedule IS the hat's
     * silhouette and it is the one the collection is drafted against. What it
     * does not keep is her blue-and-white wave chart, which belongs to her hat.
     * Clearing `waveRow` is what makes the difference: `stitchColor` only
     * reaches for the wave chart when a round carries one, so without it these
     * colour like every other round.
     *
     * Every round above the rim is fabric. Nothing interrupts the field on its
     * way down — no break line at the fold, no ring stripes across the flare.
     * Both were tried and both did the same damage: a solid round is a wall the
     * colourwork stops dead against, and the brim reads as banded rather than
     * as the wall carrying on over the fold. Only the last `rimRounds` are
     * solid, and they are the edge.
     */
    const all = [...brimInc, ...waves, finalBrim];
    const rimRounds = Math.max(1, finish.rimRounds);
    const painted = all.map((r, i) => {
      const base = { ...r, waveRow: null };
      if (i >= all.length - rimRounds) {
        return { ...base, color: def.finalBrim.color };
      }
      return {
        ...base,
        color: def.background,
        patterned: fieldBrim ? (true as const) : undefined,
      };
    });
    return labelRounds([...crown, ...text, ...painted]);
  }

  return labelRounds([...crown, ...text, ...brimInc, ...waves, finalBrim]);
}

/**
 * Procedural crown/brim color resolver: samples the same seeded field as the
 * wall motif layer, in polar coordinates, so streaks/stripes flow over the
 * shoulder of the hat without a visible seam.
 */
export function buildCrownResolver(
  crown: CrownColorSpec,
  rounds: Round[],
  cols: number,
  bandRows: number,
): (roundIdx: number, i: number, count: number) => YarnColor | null {
  const crownRounds = rounds.filter((r) => r.phase === 'top').length;
  const textStart = rounds.findIndex((r) => r.phase === 'text');
  const brimStart = rounds.findIndex(
    (r) => r.phase === 'brim-inc' || r.phase === 'wave' || r.phase === 'brim',
  );
  const coverBrim = crown.params.coverBrim === true;
  // Rows of field space below the wall chart: one per round from the first
  // taper/brim round to the rim. Hard-coding this used to cut the strokes off
  // a couple of rounds above the edge as soon as the brim grew.
  const tailRounds = roundsBelowWall(rounds);
  /**
   * How much field HEIGHT one brim round spends — 1 row per round unless a
   * pattern says otherwise.
   *
   * Below 1 the strokes cross the brim more steeply, which is not a stylistic
   * preference but a correction for what the brim does to them. The wall is a
   * cylinder, so a stroke leaning 50° off vertical reads as leaning 50°. The
   * brim is close to a flat annulus: the same stroke, laid on it, sweeps ROUND
   * the hat instead of down it, and nine rounds of that come out as concentric
   * arcs — the banded look the ring stripes were removed to avoid, arriving
   * again by the back door. Spending less field height per brim round makes the
   * stroke travel less sideways over the flare, so it runs radially out to the
   * rim and the brim reads as the wall continuing.
   */
  const brimVStep = Number(crown.params.brimVStep ?? 1);
  // Leave the outermost rounds a single solid color, the way a knitted-in edge
  // finishes a real bucket hat. edgeSolidRounds widens the band (default 1 =
  // just the final round).
  const edgeSolid = crown.params.edgeSolid === true;
  const edgeSolidRounds = Math.max(1, Number(crown.params.edgeSolidRounds ?? 1));
  const lastWaveRow = rounds.reduce((acc, r) => Math.max(acc, r.waveRow ?? 0), 0);
  // Crown rounds below this stitch count stay plain — the flat middle of the
  // disc, where there is not enough circumference to hold the motif.
  const crownFieldMinCount = Number(crown.params.crownFieldMinCount ?? 0);

  let streaks: Streak[] | null = null;
  let streakSeed = 0;
  let streakMinHalfW = 0.28;
  if (crown.kind === 'streaks') {
    const p = {
      ...streakParamsFromLayer(crown.params, bandRows),
      vMin: -crownRounds,
      vMax: coverBrim ? bandRows + tailRounds * brimVStep : bandRows,
    };
    streaks = buildStreaks(cols, p);
    streakSeed = p.seed;
    streakMinHalfW = p.minHalfW;
  }
  let slashes: Slash[] | null = null;
  let slashColors: YarnColor[] = [];
  if (crown.kind === 'slash') {
    const p = {
      ...slashParamsFromLayer(crown.params, bandRows),
      vMin: -crownRounds,
      vMax: coverBrim ? bandRows + tailRounds * brimVStep : bandRows,
    };
    const table = slashColorList(crown.colorIds ?? [], crown.params);
    slashColors = table.colors;
    slashes = buildSlashes(cols, p, table.mainCount, table.echoIdx);
  }

  const stripeParams =
    crown.kind === 'diagonalStripes' ? stripeParamsFromLayer(crown.params) : null;
  const ink: YarnColor = crown.colorId ?? 'blue';

  return (roundIdx, i, count) => {
    const round = rounds[roundIdx];
    if (!round) return null;
    const isBrim =
      round.phase === 'brim-inc' ||
      round.phase === 'wave' ||
      round.phase === 'brim';
    // A brim round the schedule did not mark as colorwork is solid crochet —
    // the break line at the fold, the accent, the rim. `buildRoundsFromDefinition`
    // already knows which those are; don't second-guess it here.
    if (isBrim && round.patterned !== true) return null;
    if (edgeSolid && isBrim) {
      // The outermost rounds stay in the round's own (edge) color.
      if (roundIdx >= rounds.length - edgeSolidRounds) return null;
      if (round.phase === 'brim') return null;
      if (lastWaveRow > 0 && round.waveRow === lastWaveRow) return null;
    }
    let v: number;
    if (round.phase === 'top') {
      // v = -1 is the crown round next to the wall; centre = -crownRounds.
      v = -(crownRounds - roundIdx) + 0.5;
    } else if (isBrim && coverBrim && brimStart >= 0) {
      v = bandRows + (roundIdx - brimStart) * brimVStep + 0.5;
    } else {
      return null;
    }
    void textStart;
    const u = ((i + 0.5) / count) * cols;
    if (slashes) {
      // Same trap as the streak field: u is in field columns, but a stroke's
      // width has to stay constant in STITCHES or it clips to nothing as the
      // crown disc narrows. spacing converts one stitch into field columns.
      if (count < crownFieldMinCount && round.phase === 'top') return null;
      const spacing = cols / count;
      const ci = slashAt(slashes, cols, u, v, spacing);
      return ci >= 0 ? (slashColors[ci] ?? null) : null;
    }
    if (streaks) {
      // minHalfW is a floor in STITCHES, but u is in field columns. A 40-stitch
      // crown round spreads one stitch over 2.5 field columns, so without this
      // conversion a streak that is two stitches wide on the wall clips down to
      // a single stitch up on the crown.
      if (count < crownFieldMinCount && round.phase === 'top') return null;
      const spacing = cols / count;
      return streakAt(
        streaks,
        cols,
        streakSeed,
        u,
        v,
        Math.max(streakMinHalfW, spacing),
      )
        ? ink
        : null;
    }
    if (stripeParams) {
      if (round.phase === 'top') {
        // Stretching the full circumference of bands onto a 20-stitch crown
        // round would alias into single stitches nobody can crochet. Sample in
        // the round's OWN stitch space instead: band widths stay constant and
        // repeats drop out as the disc narrows, the way radial colorwork
        // actually converges. At the last crown round count === cols, so the
        // shoulder seam still lines up exactly with the wall.
        if (count < crownFieldMinCount) return null;
        return stripeColorAt(count, stripeParams, i + 0.5, v);
      }
      return stripeColorAt(cols, stripeParams, u, v);
    }
    return null;
  };
}

export function buildStitchesForChart(
  rounds: Round[],
  textGrid: ColorGrid,
  crownColor?: (roundIdx: number, i: number, count: number) => YarnColor | null,
): Stitch[] {
  // Wave rounds normally take Helene's blue wave chart. When a procedural field
  // paints the brim (NUSA), route them through the same resolver as the crown
  // so the colorwork keeps flowing all the way to the edge.
  const waveRoundIdx = new Map<number, number>();
  rounds.forEach((r, idx) => {
    if (r.phase === 'wave' && r.waveRow) waveRoundIdx.set(r.waveRow, idx);
  });

  return buildStitchesCore(rounds, {
    textColor: (row, stitchNum) => {
      const r = textGrid[row - 1];
      if (!r) return 'white';
      return r[stitchNum - 1] ?? 'white';
    },
    waveColor: (waveRow, i) => {
      const idx = waveRoundIdx.get(waveRow);
      const round = idx != null ? rounds[idx] : undefined;
      if (crownColor && round?.patterned) {
        return crownColor(idx as number, i, round.count) ?? round.color;
      }
      return waveStitchColor(waveRow, i);
    },
    baseColor: crownColor,
  });
}

/**
 * Wall layers with the streak field extended to cover the crown (and brim),
 * so the 2D chart and the 3D crown sample the exact same streak set.
 */
function layersWithFieldExtent(
  layers: ChartLayer[],
  crownRounds: number,
  bandRows: number,
  coverBrim: boolean,
  tailRounds: number,
  brimVStep: number,
): ChartLayer[] {
  return layers.map((l) => {
    if (
      l.kind !== 'motif' ||
      (l.motif !== 'streaks' && l.motif !== 'slash' && l.motif !== 'diagonalStripes')
    ) {
      return l;
    }
    return {
      ...l,
      params: {
        ...l.params,
        vMin: -crownRounds,
        vMax: coverBrim ? bandRows + tailRounds * brimVStep : bandRows,
      },
    };
  });
}

export function derivePattern(
  def: PatternDefinition,
  opts?: {
    sizeId?: SizeId;
    hookMm?: HookMm;
    omkrets_cm?: number;
    bandRows?: number;
    layers?: ChartLayer[];
    override?: OverrideLayer;
  },
): DerivedPattern {
  const size = getSize(
    opts?.sizeId ?? def.defaults.sizeId,
    opts?.omkrets_cm,
  );
  const hook = getHook(opts?.hookMm ?? def.defaults.hookMm);

  // ---- Scripted patterns (faithful PDF transcriptions, fixed size) ----
  if (def.script) {
    const textRounds = def.script.filter((s) => s.phase === 'text');
    const bandRows = textRounds.length;
    // Composite the text layers at the first text-round width (Martin = 100,
    // Flagget starts at 88). buildScriptModel pads later wider rounds.
    const layerCols = textRounds[0]?.count ?? 0;
    const override = opts?.override ?? def.chartOverride ?? emptyOverride();
    const layers = opts?.layers ?? def.chartLayers;
    const grid =
      layerCols > 0
        ? compositeChart(layers, override, layerCols, bandRows, def.background)
        : [];
    const model = buildScriptModel(def.script, grid);
    const cols = model.chartCols || layerCols;
    const colors = model.stitches.map((s) => s.color);
    const materials = buildMaterialsEstimate({
      hook,
      omkrets_cm: size.omkrets_cm,
      bodyCount: layerCols,
      totalRounds: model.rounds.length,
      stitchesByColor: countStitchesByColor(colors),
    });
    return {
      definition: def,
      size,
      hook,
      bodyCount: layerCols,
      bandRows,
      rounds: model.rounds,
      stitches: model.stitches,
      chart: {
        rows: bandRows,
        cols,
        grid: model.chartGrid.length > 0 ? model.chartGrid : grid,
        layers,
        override,
      },
      materials,
    };
  }

  // ---- Generative patterns (sized from gauge) ----
  const bodyCount = resolveBodyCount(def, size, hook);
  const bandRows = opts?.bandRows ?? def.bandRows;
  const rounds = buildRoundsFromDefinition(def, bodyCount, bandRows);
  const crownRounds = rounds.filter((r) => r.phase === 'top').length;
  const coverBrim = def.crown?.params.coverBrim === true;

  const tailRounds = roundsBelowWall(rounds);

  const rawLayers = opts?.layers ?? def.chartLayers;
  const layers = def.crown
    ? layersWithFieldExtent(
        rawLayers,
        crownRounds,
        bandRows,
        coverBrim,
        tailRounds,
        Number(def.crown?.params.brimVStep ?? 1),
      )
    : rawLayers;
  const override = opts?.override ?? def.chartOverride ?? emptyOverride();

  const grid = compositeChart(
    layers,
    override,
    bodyCount,
    bandRows,
    def.background,
  );

  const crownResolver = def.crown
    ? buildCrownResolver(
        { ...def.crown, params: { ...def.crown.params, vMin: -crownRounds } },
        rounds,
        bodyCount,
        bandRows,
      )
    : undefined;

  const stitches = buildStitchesForChart(rounds, grid, crownResolver);

  const colors = stitches.map((s) => s.color);
  const materials = buildMaterialsEstimate({
    hook,
    omkrets_cm: size.omkrets_cm,
    bodyCount,
    totalRounds: rounds.length,
    stitchesByColor: countStitchesByColor(colors),
  });

  return {
    definition: def,
    size,
    hook,
    bodyCount,
    bandRows,
    rounds,
    stitches,
    chart: {
      rows: bandRows,
      cols: bodyCount,
      grid,
      layers,
      override,
    },
    materials,
  };
}

/** Canonical RO at dame + 4.0 mm. */
export function deriveRoDefault(): DerivedPattern {
  return derivePattern(RO_RO_RO, { sizeId: 'dame', hookMm: 4.0 });
}
