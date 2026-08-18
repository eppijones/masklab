/**
 * How likely is this to work — as arithmetic, not as a mood.
 *
 * This file exists because a build site that shows renders, part counts and a
 * shopping total implies a confidence the project has not earned. Somebody
 * reads it, spends six thousand kroner and a month of evenings, and finds out
 * at the far end that the yarn never stitched. The numbers here are the ones
 * that decide that, so they belong on the page next to the shopping total.
 *
 * Two independent things are modelled:
 *
 *   1. STAGE GATES — the chain of "does the mechanism do the thing", each with
 *      an honest conditional probability and the money already spent by the
 *      time you find out. Multiply them and you get the odds of a finished hat.
 *
 *   2. PER-STITCH RELIABILITY — given the mechanism works at all, a hat is
 *      thousands of consecutive stitches, and consecutive is brutal. This is
 *      where "it worked on the bench" and "it made a hat" separate.
 *
 * The probabilities are judgement, and they are labelled as judgement. What is
 * NOT judgement is the exponent: p^3694 is arithmetic, and it is the reason
 * this machine has to be designed around recovery rather than around accuracy.
 *
 * Calibration anchors, both from the published prior art cited in the patent
 * draft:
 *   - Croche-Matic (Harvard GSD, ICRA 2023): 9 axes, crochet in the round,
 *     ~50% per-stitch success, at most FOUR consecutive stitches.
 *   - CroMat (Bielefeld/TU Dresden): reliable multi-stitch crochet, but flat
 *     only, using a straight row of latch needles to hold the previous row.
 * A funded research group with a machine shop reached four stitches in a row.
 * Any estimate here that implies sailing past that on the first build is wrong.
 */

/* ------------------------------------------------------------ stage gates - */

export interface Gate {
  id: string;
  title: string;
  titleNo: string;
  /** What must be observed for this gate to pass. */
  test: string;
  testNo: string;
  /** P(this gate passes | every previous gate passed). Judgement, stated as such. */
  p: number;
  /** Kroner committed by the time this gate is answered. */
  spentNok: number;
  /** Hours of work committed by the time this gate is answered. */
  hours: number;
  /** Why this number and not a rounder, happier one. */
  why: string;
  whyNo: string;
}

/**
 * Ordered cheapest-first, which is the whole design of the test plan: the
 * question most likely to kill the project is also the one that costs a spool
 * of filament and an evening to answer.
 */
export const GATES: readonly Gate[] = [
  {
    id: 'G0',
    title: 'A printed gate catches a live stitch',
    titleNo: 'En printet port fanger en levende maske',
    test: 'Hand-crochet a 100-stitch tube. Turn it past three printed gates by hand. Does the top V enter the throat and stay held, without being placed there by fingers?',
    testNo: 'Hekle en slange på 100 masker for hånd. Drei den forbi tre printede porter for hånd. Går maskemunnen inn i halsen og blir liggende, uten at fingrene legger den der?',
    p: 0.5,
    spentNok: 320,
    hours: 6,
    why: 'This is the question every predecessor design skipped, and it is the one the machine cannot work around. A relaxed cotton V standing off a fabric edge is soft, small and closed; a 0.7 mm lead-in has to open it and swallow it, driven by nothing but the fabric moving past. Nobody has published this working. Fifty-fifty is generous rather than pessimistic.',
    whyNo: 'Dette er spørsmålet alle tidligere utkast hoppet over, og det maskinen ikke kan komme utenom. En slapp bomullsmaske på en stoffkant er myk, liten og lukket; en innføring på 0,7 mm skal åpne den og svelge den, drevet av ingenting annet enn at stoffet beveger seg forbi. Ingen har publisert at dette virker. Femti-femti er raust, ikke pessimistisk.',
  },
  {
    id: 'G1',
    title: 'The gate holds it while the hook passes',
    titleNo: 'Porten holder mens kroken går gjennom',
    test: 'Push the printed hook through a held V fifty times. Count splits, drops and snags.',
    testNo: 'Før den printede kroken gjennom en holdt maske femti ganger. Tell splitting, tap og hekting.',
    p: 0.75,
    spentNok: 320,
    hours: 9,
    why: 'Static geometry, and the throat inequality already closes with 0.2 mm to spare. The risk is surface: a printed nose is rougher than steel and cotton is a fuzzy, splittable yarn.',
    whyNo: 'Statisk geometri, og halskravet går opp med 0,2 mm til overs. Risikoen er overflaten: en printet spiss er ruere enn stål, og bomull er lodnet garn som lar seg splitte.',
  },
  {
    id: 'G2',
    title: 'The wheel takes the loop out of the comb',
    titleNo: 'Hjulet tar løkken ut av kammen',
    test: 'Fifty powered pickups from a tensioned swatch, logged, on camera.',
    testNo: 'Femti motoriserte opptak fra en strammet prøvelapp, logget, med kamera.',
    p: 0.6,
    spentNok: 6124,
    hours: 24,
    why: 'A handoff between two moving parts through a soft object. This is where the money is already spent, which is exactly why G0 and G1 come first and use no motors.',
    whyNo: 'En overlevering mellom to bevegelige deler gjennom noe mykt. Her er pengene allerede brukt — nettopp derfor kommer G0 og G1 først, uten motorer.',
  },
  {
    id: 'G3',
    title: 'One complete machine-made stitch',
    titleNo: 'Én komplett maskinlaget maske',
    test: 'Pick up, plunge, yarn over, draw through two. Exactly one loop left on the hook.',
    testNo: 'Ta opp, stikk, legg garn, trekk gjennom to. Nøyaktig én løkke igjen på kroken.',
    p: 0.7,
    spentNok: 6124,
    hours: 40,
    why: 'Four coordinated motions around a compliant object. Croche-Matic reached this with nine axes; the gate removes most of the searching, which is the reason to expect better rather than worse.',
    whyNo: 'Fire koordinerte bevegelser rundt noe ettergivende. Croche-Matic kom hit med ni akser; porten fjerner det meste av letingen, og det er grunnen til å vente bedre snarere enn dårligere.',
  },
  {
    id: 'G4',
    title: 'Ten in a row',
    titleNo: 'Ti på rad',
    test: 'Ten consecutive stitches with no hand touching the work.',
    testNo: 'Ti masker på rad uten at en hånd tar i arbeidet.',
    p: 0.45,
    spentNok: 6124,
    hours: 60,
    why: 'The published state of the art is four. Consecutive is where every small error becomes a compounding one: yarn tension drifts, the fabric edge creeps, and the tenth stitch is worked into a fabric the machine has already disturbed nine times.',
    whyNo: 'Publisert toppnivå er fire. Det er på rad at hver lille feil blir kumulativ: garnstrammingen driver, stoffkanten kryper, og den tiende masken lages i et stoff maskinen allerede har forstyrret ni ganger.',
  },
  {
    id: 'G5',
    title: 'A full round',
    titleNo: 'En hel omgang',
    test: '100 stitches, one revolution, with the stitch count the pattern predicted.',
    testNo: '100 masker, én omdreining, med maskeantallet oppskriften forutsa.',
    p: 0.4,
    spentNok: 11800,
    hours: 110,
    why: 'Needs the full machine — turntable, mandrel, take-down. New failure modes appear here that the bench cannot show: the fabric climbing back into the comb, take-down tension fighting the gates, the round closing on itself half a stitch out.',
    whyNo: 'Krever hele maskinen — dreieskive, mandrell, nedtrekk. Her dukker feil opp som benken ikke kan vise: stoffet klatrer tilbake i kammen, nedtrekket kjemper mot portene, omgangen lukker seg en halv maske feil.',
  },
  {
    id: 'G6',
    title: 'A wearable hat, supervised',
    titleNo: 'En brukbar lue, med tilsyn',
    test: 'A complete hat off the mandrel, with a human resuming it when it pauses.',
    testNo: 'En ferdig lue av mandrellen, der et menneske starter den igjen når den stopper.',
    p: 0.35,
    spentNok: 11800,
    hours: 200,
    why: 'Thousands of stitches and over a thousand colour changes. Supervised, because the per-stitch arithmetic below rules out anything else on a first machine.',
    whyNo: 'Tusenvis av masker og over tusen fargeskift. Med tilsyn, fordi regnestykket under utelukker alt annet på en førstegangsmaskin.',
  },
];

export const CUMULATIVE = GATES.reduce<{ id: string; p: number }[]>((acc, g) => {
  const prev = acc.length ? acc[acc.length - 1].p : 1;
  acc.push({ id: g.id, p: prev * g.p });
  return acc;
}, []);

/** P(reach this gate and pass it), from the start. */
export function cumulativeAt(id: string): number {
  return CUMULATIVE.find((c) => c.id === id)?.p ?? 0;
}

/** P(a finished hat), the whole chain. */
export const P_HAT = CUMULATIVE[CUMULATIVE.length - 1].p;

/**
 * P(you learn whether the idea works) — the first two gates only.
 *
 * This is the number that should drive the decision, and it is not the same
 * number as P_HAT at all. G0 and G1 need filament, yarn and an evening. They
 * answer the question that makes every later gate worth attempting, and they
 * answer it either way: a clean no is worth the same 320 kr as a clean yes.
 */
export const P_LEARN = 0.95;
export const LEARN_COST_NOK = GATES[0].spentNok;

/* ----------------------------------------------------- per-stitch chain --- */

/**
 * P(a hat of n stitches completes with no intervention) at per-stitch
 * reliability p. This is the arithmetic that turns an impressive demo into a
 * design requirement.
 */
export function pHat(pStitch: number, stitches: number): number {
  return Math.pow(pStitch, stitches);
}

/** The per-stitch reliability needed for a target chance of an unattended hat. */
export function requiredPStitch(target: number, stitches: number): number {
  return Math.pow(target, 1 / stitches);
}

/**
 * Expected number of human interventions per hat, which is the number that
 * actually decides whether the machine is usable.
 *
 * A machine that stops twice per hat is a machine. A machine that stops two
 * hundred times is a very slow way to crochet by hand.
 */
export function interventions(pStitch: number, stitches: number): number {
  return stitches * (1 - pStitch);
}

/**
 * Effective reliability once the machine retries a failed presentation.
 *
 * Crochet has exactly one live loop, which is the single most useful property
 * this project has: the machine's state is always recoverable. A failed pickup
 * is not a ruined garment, it is a re-index and another attempt. `recover` is
 * the share of failures the retry saves.
 */
export function withRetry(pStitch: number, recover = 0.9): number {
  return pStitch + (1 - pStitch) * recover;
}

/** Reference points used on the site, so the page and the harness agree. */
export const STITCH_MODEL = {
  /** Published prior art, in the round. */
  priorArt: 0.5,
  /** A good outcome for a first machine that passes every gate. */
  optimistic: 0.995,
  /** What the retry layer turns that into. */
  recover: 0.9,
  /** NORGE Away, the reference hat. */
  refStitches: 3694,
} as const;
