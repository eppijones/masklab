import type { Round, YarnColor } from './types';
import { YARN_NAME, YARN_NAME_EN } from './types';
import { rhythmText, rhythmTextEn } from './pattern';
import type { StepDef, TechniqueId } from './steps';
import type { Locale } from '../i18n/locale';
import type { PatternDefinition } from '../patterns/types';

/**
 * Generic, pattern-aware guide builder for every non-RO pattern
 * (Martin, Flagget, the NUSA kits, studio customs). The RO guide keeps its
 * own hand-written builders in steps.ts / stepsEn.ts — untouched, for parity.
 */

export interface GuideCopy {
  nameNo: string;
  nameEn: string;
  /** Credit / thank-you paragraphs on the final step. */
  creditNo: string[];
  creditEn: string[];
  /** Optional pattern-specific tips shown on the first intro step. */
  tipsNo?: string[];
  tipsEn?: string[];
}

const RITUAL_START_NO =
  'Lag én luftmaske. Denne skal ikke telles. Lag så rundens første fastmaske i den første ordentlige masken fra forrige runde, og sett markøren i V-en på toppen av den.';
const RITUAL_END_NO =
  'Avslutt runden med en kjedemaske under V-en på masken med markøren. Flytt markøren når neste runde begynner.';
const RITUAL_START_EN =
  'Make one chain stitch. This does not count. Then make the round’s first single crochet in the first proper stitch from the previous round, and place the marker in the V on top of it.';
const RITUAL_END_EN =
  'Close the round with a slip stitch under the V of the stitch with the marker. Move the marker when the next round begins.';

const STITCH_W_CM = 0.63;

function discRange(count: number, locale: Locale): string {
  const d = (count * STITCH_W_CM) / Math.PI;
  const fmt = (v: number) => {
    const s = (Math.round(v * 2) / 2).toString();
    return locale === 'no' ? s.replace('.', ',') : s;
  };
  return locale === 'no'
    ? `ca ${fmt(d * 0.93)}–${fmt(d * 1.07)} cm`
    : `approx ${fmt(d * 0.93)}–${fmt(d * 1.07)} cm`;
}

function yarnName(c: YarnColor, locale: Locale): string {
  return (locale === 'no' ? YARN_NAME[c] : YARN_NAME_EN[c]).toLowerCase();
}

/** Distinct colors in the round, in working order. */
function roundColors(round: Round, rounds: Round[], colorsPerRound: YarnColor[][]): YarnColor[] {
  const idx = rounds.indexOf(round);
  const seen: YarnColor[] = [];
  for (const c of colorsPerRound[idx] ?? [round.color]) {
    if (!seen.includes(c)) seen.push(c);
  }
  return seen;
}

function isPatternedRound(round: Round): boolean {
  return round.phase === 'text' || round.phase === 'wave' || round.patterned === true;
}

function roundLook(round: Round, locale: Locale, lastTop: number): string {
  const no = locale === 'no';
  if (round.num === 1) {
    return no
      ? 'En liten, tett sirkel — omtrent så stor som en tokrone. Det er helt normalt at den buer seg som en liten skål: den retter seg ut i løpet av de neste rundene.'
      : 'A small, tight circle — roughly the size of a large coin. It is completely normal if it cups like a little bowl: it will flatten over the next few rounds.';
  }
  if (round.phase === 'top') {
    if (round.increaseEvery !== null || isPatternedRound(round)) {
      return no
        ? 'Sirkelen vokser og skal ligge nokså flatt på bordet. Blir den en dyp skål, mangler du økninger. Bølger den seg, har du økt for mye.'
        : 'The circle grows and should lie fairly flat on the table. A deep bowl means missing increases; ruffling means too many.';
    }
    return round.num >= lastTop - 3
      ? no
        ? 'Ingen økninger denne runden — kanten begynner å bøye seg nedover. Det er meningen! Det er starten på sidene av hatten.'
        : 'No increases this round — the edge starts bending downwards. That is intentional! It is the start of the sides.'
      : no
        ? 'Ingen økninger denne runden — sirkelen «hviler» og blir jevnere.'
        : 'No increases this round — the circle “rests” and evens out.';
  }
  if (round.phase === 'text') {
    return no
      ? 'Sidene står rett ned, og mønsteret vokser frem rad for rad. Fargefeltene skal stå rett over fargefeltene fra forrige runde. Sjekk på innsiden at de passive trådene ikke strammer.'
      : 'The sides stand straight down and the pattern grows row by row. The color sections should sit directly above those from the previous round. Check that the unused strands are not pulling tight inside.';
  }
  if (round.phase === 'brim-inc') {
    return no
      ? 'Hatten begynner å vide seg utover nederst — bremmen er i gang. Kanten skal bue jevnt utover, ikke bølge seg.'
      : 'The hat starts to flare at the bottom — the brim is underway. The edge should curve evenly outward, not ruffle.';
  }
  if (round.phase === 'wave') {
    return no
      ? 'Bremmen svinger utover. Legg arbeidet flatt med jevne mellomrom og sjekk at kanten bølger likt hele veien rundt.'
      : 'The brim swings outward. Lay the work flat now and then and check that the edge waves evenly all the way around.';
  }
  return no
    ? 'Den nederste kanten er ferdig hele veien rundt. Hatten er ferdig formet — bremmen skal skrå jevnt utover.'
    : 'The bottom edge is complete all the way around. The hat is fully shaped — the brim should slope evenly outward.';
}

function patternedBody(round: Round, locale: Locale, colors: YarnColor[]): string[] {
  const no = locale === 'no';
  const colorList = colors.map((c) => yarnName(c, locale)).join(', ');
  const body: string[] = [no ? RITUAL_START_NO : RITUAL_START_EN];
  if (round.phase === 'text' && round.chartRow !== null) {
    body.push(
      no
        ? `Følg diagramrad ${round.chartRow} (rad 1 er ØVERST i diagrammet — hatten hekles ovenfra og ned). Én rute er én fastmaske i rutens farge (${colorList}). Du starter ved maske 1 på VENSTRE side av diagrammet og leser mot høyre.`
        : `Follow chart row ${round.chartRow} (row 1 is at the TOP of the chart — the hat is crocheted top-down). One square is one single crochet in the square's color (${colorList}). Start at stitch 1 on the LEFT side of the chart and read to the right.`,
    );
  } else {
    body.push(
      no
        ? `Denne runden har fargemønster (${colorList}). Fargeoppskriften for runden står nedenfor, maske for maske — følg den hele veien rundt.`
        : `This round has colorwork (${colorList}). The color recipe for the round is below, stitch by stitch — follow it all the way around.`,
    );
  }
  body.push(
    no
      ? 'Husk fargebytteregelen: den nye fargen trekkes gjennom de to siste løkkene i masken FØR den nye fargen skal synes. Appen markerer nøyaktig hvilke masker dette gjelder nedenfor.'
      : 'Remember the color-change rule: the new color is pulled through the last two loops of the stitch BEFORE the new color should show. The app marks exactly which stitches this applies to below.',
    no
      ? 'De passive trådene ligger langs innsiden av hatten. Hekle gjerne rundt dem så de blir med videre, men ikke trekk dem stramt.'
      : 'The unused strands lie along the inside of the hat. Crochet over them so they travel with you, but do not pull them tight.',
    no ? RITUAL_END_NO : RITUAL_END_EN,
  );
  return body;
}

function roundStep(
  round: Round,
  roundIdx: number,
  rounds: Round[],
  colorsPerRound: YarnColor[][],
  locale: Locale,
  lastTop: number,
): StepDef {
  const no = locale === 'no';
  const techniques: TechniqueId[] = [];
  let body: string[] = [];
  let title = no ? `Runde ${round.num}` : `Round ${round.num}`;
  const eyebrow = no ? `Runde ${round.num} av hatten` : `Round ${round.num} of the hat`;
  const colors = roundColors(round, rounds, colorsPerRound);
  const patterned = isPatternedRound(round);
  const yarn: YarnColor = round.color;
  const cname = yarnName(round.color, locale);

  if (round.num === 1) {
    title = no
      ? `Runde 1: Ti fastmasker i samme åpning (${cname})`
      : `Round 1: Ten single crochets in the same opening (${cname})`;
    body = no
      ? [
          `Hent frem det ${cname === 'hvit' ? 'hvite' : cname + 'e'} garnet — alle de ti fastmaskene skal lages inn i den samme luftmasken: luftmaske 1.`,
          'Lag fastmaske nummer 1: stikk nålen gjennom luftmaske 1, fang arbeidstråden, trekk den tilbake gjennom luftmasken. Du skal nå ha to løkker på nålen. Fang arbeidstråden på nytt og trekk gjennom begge løkkene.',
          'Sett en markør gjennom V-en på toppen av denne første fastmasken. Markøren betyr: «Her begynner runden.»',
          'Fortsett til du har ti fastmasker i samme åpning. Det blir trangt — skyv maskene forsiktig til siden.',
          'Lukk runden: lag en kjedemaske under begge trådene i V-en på masken med markøren.',
        ]
      : [
          `Bring out the ${cname} yarn — all ten single crochets go into the same chain stitch: chain 1.`,
          'Make single crochet number 1: insert the hook through chain 1, yarn over, pull back through the chain. You should now have two loops on the hook. Yarn over again and pull through both loops.',
          'Place a marker through the V on top of this first single crochet. The marker means: “The round starts here.”',
          'Continue until you have ten single crochets in the same opening. It gets crowded — gently nudge the stitches aside.',
          'Close the round: make a slip stitch under both strands of the V of the stitch with the marker.',
        ];
    techniques.push('fastmaske', 'kjedemaske');
  } else if (patterned) {
    title =
      round.phase === 'text' && round.chartRow !== null
        ? no
          ? `Runde ${round.num}: Mønster — diagramrad ${round.chartRow}`
          : `Round ${round.num}: Pattern — chart row ${round.chartRow}`
        : no
          ? `Runde ${round.num}: Fargemønster`
          : `Round ${round.num}: Colorwork`;
    body = patternedBody(round, locale, colors);
    if (round.increaseEvery !== null || rounds[roundIdx - 1]?.count !== round.count) {
      const prev = rounds[roundIdx - 1]?.count ?? round.count;
      if (round.count > prev) {
        body.splice(
          2,
          0,
          no
            ? `Denne runden øker fra ${prev} til ${round.count} masker. Økningene ligger inne i fargefeltene — maske-for-maske-oppskriften nedenfor viser nøyaktig hvor du lager to fastmasker i samme maske.`
            : `This round increases from ${prev} to ${round.count} stitches. The increases sit inside the color sections — the stitch-by-stitch recipe below shows exactly where to make two single crochets in the same stitch.`,
        );
        techniques.push('to-i-samme');
      }
    }
    techniques.push('fargebytte', 'fastmaske');
  } else {
    if (round.increaseEvery !== null) {
      title = no
        ? `Runde ${round.num}: Øk til ${round.count} masker (${cname})`
        : `Round ${round.num}: Increase to ${round.count} stitches (${cname})`;
      techniques.push('to-i-samme');
    } else {
      title = no
        ? `Runde ${round.num}: Én fastmaske i hver maske (${cname})`
        : `Round ${round.num}: One single crochet in each stitch (${cname})`;
      techniques.push('fastmaske');
    }
    body = no
      ? [RITUAL_START_NO, rhythmText(round), RITUAL_END_NO]
      : [RITUAL_START_EN, rhythmTextEn(round), RITUAL_END_EN];
    if (round.num <= 6) {
      body.splice(
        1,
        0,
        no
          ? 'VIKTIG: Stikk alltid nålen inn under BEGGE trådene i V-en på masken. Det skal ligge TO tråder over nålen før du henter garn.'
          : 'IMPORTANT: Always insert the hook under BOTH strands of the V. There should be TWO strands over the hook before you yarn over.',
      );
    }
    // Color changes at the round boundary.
    const prevRound = rounds[roundIdx - 1];
    if (prevRound && prevRound.color !== round.color && !isPatternedRound(prevRound)) {
      body.unshift(
        no
          ? `Ny farge: denne runden hekles med ${cname} garn. Fargen byttet du i siste maske av forrige runde (appen markerte det).`
          : `New color: this round is crocheted with ${cname} yarn. You changed color in the last stitch of the previous round (the app marked it).`,
      );
    }
  }

  return {
    id: `round-${round.num}`,
    kind: 'round',
    title,
    eyebrow,
    body,
    yarn,
    countChip: no ? `${round.count} fm` : `${round.count} sc`,
    techniques,
    roundIdx,
    confirm: null,
    check: {
      look: roundLook(round, locale, lastTop),
      diameterCm: round.phase === 'top' ? discRange(round.count, locale) : null,
      count: round.count,
    },
  };
}

export function buildStepsGeneric(
  rounds: Round[],
  def: Pick<PatternDefinition, 'palette' | 'defaults'>,
  copy: GuideCopy,
  locale: Locale,
  stitchColors?: YarnColor[][],
): StepDef[] {
  const no = locale === 'no';
  const steps: StepDef[] = [];
  const hookStr = no
    ? `${def.defaults.hookMm.toFixed(1).replace('.', ',')} mm`
    : `${def.defaults.hookMm.toFixed(1)} mm`;
  const hookChip = no ? `${hookStr} nål` : `${hookStr} hook`;
  const name = no ? copy.nameNo : copy.nameEn;
  const colorsPerRound = stitchColors ?? rounds.map((r) => [r.color]);
  const lastTopIdx = rounds.reduce(
    (acc, r, i) => (r.phase === 'top' ? i : acc),
    0,
  );
  const lastTop = rounds[lastTopIdx].num;

  const checklist = [
    no ? `${hookStr} heklenål` : `${hookStr} crochet hook`,
    ...def.palette.map((p) =>
      no
        ? `${YARN_NAME[p.id]} garn (tykkere bomull, gjerne ca. 50 g = 70–80 m)`
        : `${YARN_NAME_EN[p.id]} yarn (thicker cotton, ideally about 50 g = 70–80 m)`,
    ),
    no ? 'Saks' : 'Scissors',
    no
      ? 'Én binders, sikkerhetsnål eller liten garnbit som maskemarkør'
      : 'One paperclip, safety pin, or scrap of yarn as a stitch marker',
    no ? 'Målebånd eller linjal' : 'Tape measure or ruler',
    no ? 'Stoppenål til slutt, dersom du har' : 'Tapestry needle for the end, if you have one',
  ];

  steps.push({
    id: 'intro-utstyr',
    kind: 'intro',
    title: no ? 'Velkommen! Dette trenger du' : 'Welcome! What you need',
    eyebrow: no ? 'Startkapittel' : 'Getting started',
    body: [
      no
        ? `Vi begynner rolig: tre korte steg før selve hatten. Guiden tar deg gjennom ${name} (${hookStr}) — én runde av gangen.`
        : `We start gently: three short steps before the hat itself. This guide takes you through ${name} (${hookStr}) — one round at a time.`,
      no
        ? 'Hatten i 3D vokser mens du hekler. Åpne Maskeskolen når du vil se bevegelsene animert.'
        : 'The 3D hat grows as you crochet. Open the Stitch School whenever you want to see the movements animated.',
      ...(no ? (copy.tipsNo ?? []) : (copy.tipsEn ?? [])),
      no ? 'Sjekk at du har utstyret:' : 'Check that you have the supplies:',
    ],
    checklist,
    yarn: null,
    countChip: hookChip,
    techniques: ['holde-garnet'],
    roundIdx: null,
    confirm: null,
  });

  steps.push({
    id: 'intro-garn',
    kind: 'intro',
    title: no
      ? 'De to garnendene — og den viktigste regelen'
      : 'The two yarn ends — and the most important rule',
    eyebrow: no ? 'Startkapittel' : 'Getting started',
    body: no
      ? [
          'Når du begynner, har du to tråder: Arbeidstråden er den lange tråden til garnnøstet — den hekler du med. Garnhalen er den korte løse enden ved startknuten — den lager du ikke masker med.',
          'Den viktigste regelen: Løkken som sitter på heklenålen er IKKE en maske.',
          'Når du teller, teller du de små V-formene i arbeidet. Aldri løkken på nålen, aldri luftmasken som starter en runde, og aldri kjedemasken som lukker den.',
        ]
      : [
          'When you begin, you have two strands: The working yarn is the long strand to the ball — that is what you crochet with. The yarn tail is the short loose end at the starting knot — you do not make stitches with it.',
          'The most important rule: The loop sitting on the crochet hook is NOT a stitch.',
          'When you count, count the small V shapes in the work. Never the loop on the hook, never the chain that starts a round, and never the slip stitch that closes it.',
        ],
    yarn: null,
    countChip: hookChip,
    techniques: ['holde-garnet', 'luftmaske', 'fastmaske'],
    roundIdx: null,
    confirm: null,
  });

  steps.push({
    id: 'practice',
    kind: 'practice',
    title: no ? 'Øv først — dette blir ikke hatten' : 'Practise first — this is not the hat',
    eyebrow: no ? 'Startkapittel' : 'Getting started',
    body: no
      ? [
          'Siste del av startkapittelet: lag en løpeknute, 10 luftmasker, og hekle fastmasker tilbake. Gjerne to–tre rette rader — dette er bare trening.',
          'Skjevt? Helt greit. Dra opp og prøv igjen til bevegelsen sitter.',
          'Du er klar for hatten når du kan lage en fastmaske og forstår hvorfor du først får to løkker på nålen, deretter én.',
        ]
      : [
          'Last part of getting started: make a slip knot, 10 chain stitches, and crochet single crochets back across. A couple of straight rows is fine — this is only practice.',
          'Crooked? Totally fine. Pull it out and try again until the movement feels natural.',
          'You are ready for the hat when you can make a single crochet and understand why you first get two loops on the hook, then one.',
        ],
    yarn: rounds[0].color,
    countChip: hookChip,
    techniques: ['lopeknute', 'luftmaske', 'fastmaske'],
    roundIdx: null,
    confirm: null,
  });

  const startColor = yarnName(rounds[0].color, locale);
  steps.push({
    id: 'start',
    kind: 'start',
    title: no
      ? 'Start hatten: Løpeknute og to luftmasker'
      : 'Start the hat: Slip knot and two chain stitches',
    eyebrow: no ? 'Selve hatten begynner' : 'The hat itself begins',
    body: no
      ? [
          `Hent frem det ${startColor === 'hvit' ? 'hvite' : startColor + 'e'} garnet. Vi bruker en enkel start med to luftmasker — det er lettere enn en magisk ring, og gir samme resultat.`,
          'Lag en løpeknute og sett løkken på heklenålen. Trekk forsiktig i arbeidstråden til løkken sitter løst rundt den tykke delen av nålen.',
          'Lag én luftmaske. Lag én luftmaske til. Nå har du: knute — luftmaske 1 — luftmaske 2 — løkke på nålen.',
          'Finn luftmaske 1: den er nærmest knuten og lengst unna heklenålen. Stikk heklenålen gjennom åpningen i luftmaske 1.',
        ]
      : [
          `Bring out the ${startColor} yarn. We use a simple start with two chain stitches — easier than a magic ring, same result.`,
          'Make a slip knot and put the loop on the crochet hook. Gently pull the working yarn until the loop sits loosely around the thick part of the hook.',
          'Make one chain stitch. Make one more. Now you have: knot — chain 1 — chain 2 — loop on the hook.',
          'Find chain 1: closest to the knot, farthest from the hook. Insert the hook through the opening in chain 1.',
        ],
    yarn: rounds[0].color,
    countChip: no ? '2 lm' : '2 ch',
    techniques: ['lopeknute', 'luftmaske'],
    roundIdx: null,
    confirm: null,
  });

  rounds.forEach((round, roundIdx) => {
    steps.push(roundStep(round, roundIdx, rounds, colorsPerRound, locale, lastTop));
    if (roundIdx === lastTopIdx) {
      const range = discRange(round.count, locale);
      steps.push({
        id: 'size-check',
        kind: 'size-check',
        title: no ? 'Størrelseskontroll: mål toppen' : 'Size check: measure the crown',
        eyebrow: no
          ? `Stoppunkt etter runde ${round.num}`
          : `Checkpoint after round ${round.num}`,
        body: no
          ? [
              'Legg toppen flatt uten å strekke den, og mål diameteren fra kant til kant gjennom midten.',
              `Med ${round.count} masker bør toppen måle omtrent ${range}.`,
            ]
          : [
              'Lay the crown flat without stretching it, and measure the diameter from edge to edge through the centre.',
              `With ${round.count} stitches the crown should measure about ${range}.`,
            ],
        bullets: no
          ? [
              `${range}: Perfekt. Fortsett med ${round.count} masker.`,
              'For stor: Du kan fortsette — eller dra opp siste økerunde og hoppe over den økningen.',
              'For liten: Lag én ekstra økerunde før du fortsetter (én maske mer mellom hver økning enn i forrige økerunde).',
            ]
          : [
              `${range}: Perfect. Continue with ${round.count} stitches.`,
              'Too big: You can continue — or undo the last increase round and skip that increase.',
              'Too small: Make one extra increase round before continuing (one more stitch between increases than the previous increase round).',
            ],
        yarn: round.color,
        countChip: range,
        techniques: [],
        roundIdx: lastTopIdx,
        confirm: null,
      });
    }
  });

  const lastRound = rounds[rounds.length - 1];
  steps.push({
    id: 'finish',
    kind: 'finish',
    title: no ? 'Avslutt hatten og fest trådene' : 'Finish the hat and weave in the ends',
    eyebrow: no ? 'Siste steg' : 'Final step',
    body: no
      ? [
          'Etter siste maske: klipp garnet og la omtrent 15 cm tråd være igjen. Trekk hele garnhalen gjennom løkken på heklenålen og stram forsiktig.',
          'Før garnhalen frem og tilbake under noen masker på innsiden av hatten. Har du ikke stoppenål, kan du bruke heklenålen.',
          'Fest også garnhalene fra fargebyttene på samme måte.',
        ]
      : [
          'After the last stitch: cut the yarn, leaving about 15 cm of thread. Pull the entire yarn tail through the loop on the hook and tighten gently.',
          'Weave the yarn tail back and forth under a few stitches on the inside of the hat. No tapestry needle? Use the crochet hook.',
          'Weave in the yarn tails from the color changes the same way.',
        ],
    yarn: lastRound.color,
    countChip: null,
    techniques: ['feste-traden'],
    roundIdx: rounds.length - 1,
    confirm: null,
  });

  steps.push({
    id: 'done',
    kind: 'done',
    title: no ? 'Gratulerer — hatten er ferdig!' : 'Congratulations — the hat is finished!',
    eyebrow: (no ? copy.nameNo : copy.nameEn).toUpperCase(),
    body: [
      no
        ? 'Du har heklet en hel bøttehatt med fargemønster. Det er skikkelig bra jobbet.'
        : 'You have crocheted a whole bucket hat with colorwork. That is really well done.',
      no
        ? 'Snurr gjerne på hatten i 3D og sammenlign med din egen. De første rundene ser alltid litt ujevne ut — det gjør de for alle.'
        : 'Spin the hat in 3D and compare it with your own. The first rounds always look a bit uneven — they do for everyone.',
      ...(no ? copy.creditNo : copy.creditEn),
    ],
    yarn: null,
    countChip: null,
    techniques: [],
    roundIdx: rounds.length - 1,
    confirm: null,
  });

  return steps;
}
