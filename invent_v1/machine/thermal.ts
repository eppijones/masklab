/**
 * Thermal safety and the speed governor. These are one module because they are
 * one problem.
 *
 * The machine runs for hours, unattended, in a home, beside cotton yarn and
 * lint. The realistic fire story is not a dramatic short — it is a stepper held
 * at current for six hours next to something flammable. None of the four
 * predecessor dossiers mentions temperature or lint at all.
 *
 * Cycle rate IS duty cycle, and duty cycle is what makes heat. So "run it in
 * 5-6 hours instead of 9" and "make sure nothing catches fire" are the same
 * question, and the answer is that speed must be governed by measured
 * temperature rather than baked in as a constant.
 *
 * Three independent layers, because one software check is not a safety system:
 *
 *   1. PASSIVE   DC fuse on the PSU output; latching mushroom E-stop in the
 *                motor line that software cannot override; smoke alarm above
 *                the machine. None of these needs code to work.
 *   2. FIRMWARE  hard limits enforced ON THE DEVICE, de-energising the motor
 *                rail with no host round-trip. This module defines them; the
 *                firmware header is generated from it and the harness checks
 *                the two have not drifted.
 *   3. HOST      trend monitoring and the governor below. Advisory. If layer 3
 *                is the thing that saved you, layers 1 and 2 were wrong.
 */

/* ------------------------------------------------------------- limits ----- */

export type SensorKind = 'motor' | 'driver' | 'ambient';

export interface ThermalLimits {
  /** Governor starts backing off here. */
  warnC: number;
  /** Firmware cuts the motor rail here, locally, without asking. */
  hardC: number;
}

export const LIMITS: Record<SensorKind, ThermalLimits> = {
  // NEMA17 windings are typically rated to 80 C rise; the magnets and the
  // printed mount are the real constraint. PETG softens around 80 C, and every
  // motor on this machine bolts to a printed bracket.
  motor: { warnC: 55, hardC: 70 },
  // TMC2209 throttles itself near 120 C, long after a printed mount has let go.
  driver: { warnC: 70, hardC: 85 },
  ambient: { warnC: 40, hardC: 50 },
};

/**
 * Readings outside this band mean a broken sensor, not a cold machine.
 * A disconnected thermistor reads as an open circuit, and an open circuit
 * must never be interpreted as "safe" — that is the classic way a thermal
 * cutout silently stops existing.
 */
export const PLAUSIBLE_C = { min: -20, max: 200 } as const;

/** Sustained rise faster than this is flagged even well below warnC. */
export const RISE_FLAG_C_PER_MIN = 1.5;

/** Steppers drop to this fraction of run current between cycles... */
export const IDLE_HOLD_PCT = 30;
/** ...and de-energise entirely after this long with no motion. */
export const IDLE_RELEASE_MS = 120_000;

/* -------------------------------------------------------------- state ----- */

export interface Reading {
  sensorId: string;
  kind: SensorKind;
  tempC: number;
  atMs: number;
}

export type ThermalVerdict =
  | { level: 'ok' }
  | { level: 'rising'; sensorId: string; cPerMin: number }
  | { level: 'warn'; sensorId: string; tempC: number }
  | { level: 'trip'; sensorId: string; tempC: number; reason: 'over' | 'implausible' };

/** Worst-case verdict across all sensors. Pure; the harness tests it directly. */
export function assess(readings: Reading[], prev?: Reading[]): ThermalVerdict {
  for (const r of readings) {
    if (!Number.isFinite(r.tempC) || r.tempC < PLAUSIBLE_C.min || r.tempC > PLAUSIBLE_C.max) {
      return { level: 'trip', sensorId: r.sensorId, tempC: r.tempC, reason: 'implausible' };
    }
    if (r.tempC >= LIMITS[r.kind].hardC) {
      return { level: 'trip', sensorId: r.sensorId, tempC: r.tempC, reason: 'over' };
    }
  }
  for (const r of readings) {
    if (r.tempC >= LIMITS[r.kind].warnC) {
      return { level: 'warn', sensorId: r.sensorId, tempC: r.tempC };
    }
  }
  if (prev?.length) {
    for (const r of readings) {
      const p = prev.find((x) => x.sensorId === r.sensorId);
      if (!p || r.atMs <= p.atMs) continue;
      const cPerMin = ((r.tempC - p.tempC) / (r.atMs - p.atMs)) * 60_000;
      if (cPerMin >= RISE_FLAG_C_PER_MIN) {
        return { level: 'rising', sensorId: r.sensorId, cPerMin };
      }
    }
  }
  return { level: 'ok' };
}

/* ----------------------------------------------------------- governor ----- */

/**
 * Cycle-time envelope, milliseconds per fastmaske.
 *
 *   floor    the mechanical aspiration. HEKLO modelled 3.6 s and its twin runs
 *            a NORGE hat in 3 h 43 m. Unproven on hardware.
 *   nominal  the 5-6 hour target. 3694 stitches at 4.8 s plus 1328 colour
 *            changes at 1.5 s is 5 h 28 m.
 *   safe     HEKLOMAT's conservative 8 s, a 9 h 48 m hat. Where the governor
 *            retreats to, and where it starts on a cold machine it has never
 *            characterised.
 */
export const CYCLE_MS = { floor: 3600, nominal: 4800, safe: 8000 } as const;
export const COLOR_CHANGE_MS = 1500;

/** How hard the governor moves. Slow to speed up, quick to back off. */
const EASE_FASTER = 0.04;
const EASE_SLOWER = 0.35;

export interface GovernorState {
  cycleMs: number;
  reason: string;
}

export function initialGovernor(): GovernorState {
  return { cycleMs: CYCLE_MS.safe, reason: 'cold start — machine not yet characterised' };
}

/**
 * One governor step. Called once per cycle with the latest verdict.
 *
 * Deliberately asymmetric: it gives back speed grudgingly and takes it away
 * fast. A machine that oscillates between hot and fast is worse than a slow
 * one, and the cost of being 20 minutes slower is nothing next to the cost of
 * being wrong about the other thing.
 */
export function govern(state: GovernorState, verdict: ThermalVerdict): GovernorState {
  const to = (target: number, ease: number, reason: string): GovernorState => ({
    cycleMs: Math.round(state.cycleMs + (target - state.cycleMs) * ease),
    reason,
  });

  switch (verdict.level) {
    case 'trip':
      return { cycleMs: CYCLE_MS.safe, reason: `thermal trip on ${verdict.sensorId} — halted` };
    case 'warn':
      return to(
        CYCLE_MS.safe,
        EASE_SLOWER,
        `${verdict.sensorId} at ${verdict.tempC.toFixed(1)} C — backing off`,
      );
    case 'rising':
      return to(
        CYCLE_MS.safe,
        EASE_SLOWER / 2,
        `${verdict.sensorId} rising ${verdict.cPerMin.toFixed(1)} C/min — easing`,
      );
    case 'ok':
      return to(CYCLE_MS.floor, EASE_FASTER, 'thermal headroom — speeding up');
  }
}

/** Projected hat time at a given cycle rate. Used by the UI and the run log. */
export function estimateHatMs(stitches: number, colorChanges: number, cycleMs: number): number {
  return stitches * cycleMs + colorChanges * COLOR_CHANGE_MS;
}

export function formatDuration(ms: number): string {
  const h = Math.floor(ms / 3_600_000);
  const m = Math.round((ms % 3_600_000) / 60_000);
  return `${h} h ${String(m).padStart(2, '0')} m`;
}
