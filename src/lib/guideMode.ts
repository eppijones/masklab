import type { StepDef } from '../data/steps';

/** Intro / practice / start — before round 1 of the hat itself. */
export function isPreHatStep(step: StepDef | undefined | null): boolean {
  if (!step) return false;
  return step.kind === 'intro' || step.kind === 'practice' || step.kind === 'start';
}
