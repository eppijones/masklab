import type { YarnColor } from '../data/types';
import type { HookSpec } from './hooks';
import { YARN_NAME } from '../data/types';

export interface MaterialsEstimate {
  hookMm: number;
  omkrets_cm: number;
  bodyCount: number;
  totalRounds: number;
  totalStitches: number;
  gramsByColor: Partial<Record<YarnColor, number>>;
  estimatedMinutes: number;
  gaugeNoteNo: string;
}

const G_PER_STITCH: Record<HookSpec['yarnWeight'], number> = {
  fingering: 0.012,
  sport: 0.016,
  dk: 0.022,
  worsted: 0.028,
};

export const GAUGE_NOTE_NO =
  'Hekle en prøvelapp. Ved for mange masker på 10 cm, gå opp en halv nålstørrelse. Ved for få, gå ned en halv nålstørrelse.';

export function estimateGrams(
  stitchCount: number,
  hook: HookSpec,
  wasteFactor = 1.15,
): number {
  return Math.max(
    5,
    Math.round(stitchCount * G_PER_STITCH[hook.yarnWeight] * wasteFactor),
  );
}

export function buildMaterialsEstimate(opts: {
  hook: HookSpec;
  omkrets_cm: number;
  bodyCount: number;
  totalRounds: number;
  stitchesByColor: Partial<Record<YarnColor, number>>;
}): MaterialsEstimate {
  const totalStitches = Object.values(opts.stitchesByColor).reduce(
    (a, b) => a + (b ?? 0),
    0,
  );
  const gramsByColor: Partial<Record<YarnColor, number>> = {};
  for (const [color, n] of Object.entries(opts.stitchesByColor) as [
    YarnColor,
    number,
  ][]) {
    if (n > 0) gramsByColor[color] = estimateGrams(n, opts.hook);
  }
  // ~4 stitches/minute crochet estimate for HUD
  const estimatedMinutes = Math.max(30, Math.round(totalStitches / 4));
  return {
    hookMm: opts.hook.mm,
    omkrets_cm: opts.omkrets_cm,
    bodyCount: opts.bodyCount,
    totalRounds: opts.totalRounds,
    totalStitches,
    gramsByColor,
    estimatedMinutes,
    gaugeNoteNo: GAUGE_NOTE_NO,
  };
}

export function materialsChecklistNo(m: MaterialsEstimate): string[] {
  const lines: string[] = [
    `Heklenål ${m.hookMm.toFixed(1).replace('.', ',')} mm`,
  ];
  for (const [color, g] of Object.entries(m.gramsByColor) as [
    YarnColor,
    number,
  ][]) {
    lines.push(`${YARN_NAME[color]} garn ≈ ${g} g`);
  }
  lines.push('Saks og mankenål');
  lines.push('Maskemarkører');
  return lines;
}
