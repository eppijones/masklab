import snapshots from '../data/hats.json';
import { MANDREL_RINGS } from '../data/mandrel-profile.ts';

// This is the recipe and design surface, not a yarn-physics or collision solver.
// Keep the displayed hat at the size for which the existing mandrel was generated.
export const RO_HAT = snapshots.hats.find(h => h.id === 'ro-ro-ro')!;
export const HAT = { circCm: RO_HAT.omkretsCm, rounds: RO_HAT.totalRounds,
  totalStitches: RO_HAT.totalStitches, colorChanges: RO_HAT.colorChanges,
  list: RO_HAT.rounds.map(r => ({ num: r.num, count: r.count, increases: r.inc.length,
    phase: (r.phase==='top'?'crown':r.phase==='text'?'wall':'brim') as 'crown'|'wall'|'brim',
    colors: r.colors, recipePhase:r.phase })) };
export const PHASE_NAME = { crown: 'Krone', wall: 'RO RO RO', brim: 'Bølgekant' };
let cumulative = 0;
export const HAT_ROUNDS = HAT.list.map((r, i) => {
  const start = cumulative; cumulative += r.count;
  return { ...r, start, end: cumulative, radius: MANDREL_RINGS[i].r + 1.6,
    z: MANDREL_RINGS[i].y + 12, label: PHASE_NAME[r.phase] };
});
export const HAT_PHASES = (['crown', 'wall', 'brim'] as const).map(id => {
  const rows = HAT_ROUNDS.filter(r => r.phase === id);
  return { id, name: PHASE_NAME[id], start: rows[0].start, end: rows.at(-1)!.end,
    firstRound: rows[0].num, lastRound: rows.at(-1)!.num };
});

export function processAt(value: number) {
  const progress = Math.max(0, Math.min(HAT.totalStitches, Number.isFinite(value) ? value : 0));
  const complete = progress === HAT.totalStitches;
  const row = HAT_ROUNDS.find(r => progress < r.end) ?? HAT_ROUNDS.at(-1)!;
  const stitch = complete ? row.count : Math.floor(progress - row.start) + 1;
  const within = complete ? row.count - 1 : progress - row.start;
  const angle = -1.4 + ((within + .5) / row.count) * Math.PI * 2;
  return { progress, complete, row, stitch, angle, fraction: progress / HAT.totalStitches };
}

export const STITCH_POSES = HAT_ROUNDS.flatMap(row => Array.from({ length: row.count }, (_, i) => {
  // Increasing azimuth maps the chart left-to-right on the outside of a Z-up hat.
  const angle = -1.4 + (i + .5) / row.count * Math.PI * 2;
  return { angle, x: row.radius * Math.cos(angle), y: row.radius * Math.sin(angle), z: row.z,
    width: 2 * Math.PI * row.radius / row.count, row: row.num,
    color: RO_HAT.palette[row.colors[i]].hex, colorName: RO_HAT.palette[row.colors[i]].id };
}));

/** Conditional planning arithmetic. It says nothing about attainable machine speed. */
export function crochetHours(secondsPerStitch: number, minutesPerRound: number, startFinishMinutes: number, secondsPerColorChange=2) {
  return (HAT.totalStitches * secondsPerStitch + HAT.colorChanges * secondsPerColorChange + HAT.rounds * minutesPerRound * 60 + startFinishMinutes * 60) / 3600;
}
export const HAT_TIME = { secondsPerStitch:6, secondsPerColorChange:2, minutesPerRound:0, finishingMinutes:20 };
export const HAT_HOURS = crochetHours(6,0,20,2);

/** Bounding-envelope check only; not slicing. Keep actual X1 exclusions explicit. */
export const X1_PROFILE = {
  model: 'Bambu Lab X1 Carbon', confirmedByOwner: true,
  volume: [256, 256, 256], nozzleMm: 0.4, nozzleConfirmed: false,
  bedExclusion: [0, 0, 18, 28], // official default profile's front-left exclusion
  source: 'https://github.com/bambulab/BambuStudio/blob/master/resources/profiles/BBL/machine/Bambu%20Lab%20X1%20Carbon%200.4%20nozzle.json',
};

export const PROJECT_REQUIREMENTS = {
  drive: 'Automatisk drift', printer: X1_PROFILE.model,
  construction: 'Printede mekaniske deler, skruer og nødvendige innkjøpte presisjonsdeler, motorer og elektronikk.',
  target: 'En hel, sømløs bøttehatt med ekte heklemasker.',
  release: 'Ikke testbygget',
  fireDesign: 'Ingen varmeelementer i HEKLOMAT. Ekstern innkapslet strømforsyning, dimensjonerte sikringer, beskyttet kabling og temperatur-/feilstopp må inngå og testes.',
  fireEvidence: 'https://www.pololu.com/docs/0J71/4.2',
};
