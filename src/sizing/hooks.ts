export type HookMm = 3.5 | 4.0 | 4.5 | 5.0 | 5.5 | 6.0;

export interface HookSpec {
  mm: HookMm;
  /** Assumed fastmasker per 10 cm — CONFIRM WITH SWATCH */
  gauge_fm_per_10cm: number;
  yarnWeight: 'fingering' | 'sport' | 'dk' | 'worsted';
}

export const HOOKS: HookSpec[] = [
  { mm: 3.5, gauge_fm_per_10cm: 22, yarnWeight: 'sport' },
  { mm: 4.0, gauge_fm_per_10cm: 20, yarnWeight: 'dk' },
  { mm: 4.5, gauge_fm_per_10cm: 18, yarnWeight: 'dk' },
  { mm: 5.0, gauge_fm_per_10cm: 16, yarnWeight: 'worsted' },
  { mm: 5.5, gauge_fm_per_10cm: 15, yarnWeight: 'worsted' },
  { mm: 6.0, gauge_fm_per_10cm: 14, yarnWeight: 'worsted' },
];

export function getHook(mm: HookMm): HookSpec {
  return HOOKS.find((h) => h.mm === mm) ?? HOOKS[1];
}
