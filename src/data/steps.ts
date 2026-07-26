import type { Round, YarnColor } from './types';
import { rhythmText } from './pattern';

export type TechniqueId =
  | 'holde-garnet'
  | 'lopeknute'
  | 'luftmaske'
  | 'fastmaske'
  | 'kjedemaske'
  | 'to-i-samme'
  | 'fargebytte'
  | 'feste-traden';

export type StepKind =
  | 'intro'
  | 'practice'
  | 'start'
  | 'round'
  | 'size-check'
  | 'finish'
  | 'done';

/** "Sjekk arbeidet" checkpoint shown before you go to the next round. */
export interface RoundCheck {
  /** What the piece should look like right now, in plain words. */
  look: string;
  /** Expected flat diameter, e.g. "ca 8–9,5 cm" (crown rounds only). */
  diameterCm: string | null;
  /** The stitch count the round must have. */
  count: number;
}

export interface StepDef {
  id: string;
  kind: StepKind;
  title: string;
  eyebrow: string;
  body: string[];
  bullets?: string[];
  yarn: YarnColor | null;
  countChip: string | null;
  techniques: TechniqueId[];
  /** Index into rounds[] of the round being crocheted in this step, else null. */
  roundIdx: number | null;
  /** Optional reminder checkbox (never blocks navigation). */
  confirm: string | null;
  /** Verify-before-next checkpoint (round steps). */
  check?: RoundCheck;
  checklist?: string[];
}

const ROUND_RITUAL_START = 'Lag én luftmaske. Denne skal ikke telles. Lag så rundens første fastmaske i den første ordentlige masken fra forrige runde, og sett markøren i V-en på toppen av den.';
const ROUND_RITUAL_END = 'Avslutt runden med en kjedemaske under V-en på masken med markøren. Flytt markøren når neste runde begynner.';

/** Approx. width of one fastmaske with 4.0 mm hook + Cotton 4/4, in cm
 *  (calibrated from ~14 cm flat disc at 70 masker; ~17,5–20 cm at 100). */
const STITCH_W_CM = 0.63;

/** Expected flat diameter of the crown disc at a given stitch count. */
function discRange(count: number): string {
  const d = (count * STITCH_W_CM) / Math.PI;
  const fmt = (v: number) => (Math.round(v * 2) / 2).toString().replace('.', ',');
  return `ca ${fmt(d * 0.93)}–${fmt(d * 1.07)} cm`;
}

/** What the work should look like after this round. */
function roundLook(round: Round): string {
  if (round.num === 1) {
    return 'En liten, tett sirkel — omtrent så stor som en tokrone. Det er helt normalt at den buer seg som en liten skål eller krøller seg litt: den retter seg ut i løpet av de neste rundene. Garnhalen henger fortsatt løst — den fester du til slutt.';
  }
  if (round.phase === 'top') {
    if (round.increaseEvery !== null) {
      return round.num <= 3
        ? 'Sirkelen har vokst og skal ligge nokså flatt når du legger den på bordet. Litt skålform er greit. Bølger kanten seg kraftig, har du fått for mange masker — tell en gang til.'
        : 'En flat, rund sirkel som ligger fint på bordet. Blir den en dyp skål, er du for stram eller mangler økninger. Bølger den seg som et salatblad, har du økt for mye.';
    }
    return round.num >= 11
      ? 'Denne runden har ingen økninger — nå begynner kanten å bøye seg nedover. Det er meningen! Det er starten på sidene av hatten.'
      : 'Ingen økninger denne runden — sirkelen «hviler» og blir jevnere. Den skal fortsatt ligge nokså flatt.';
  }
  if (round.phase === 'text') {
    return 'Sidene står nå rett ned, og bokstavene vokser frem rad for rad. De røde feltene skal stå rett over de røde feltene fra forrige runde. Sjekk på innsiden at den passive tråden ikke strammer.';
  }
  if (round.phase === 'brim-inc') {
    return 'Hatten begynner å vide seg utover nederst — bremmen er i gang. Kanten skal bue jevnt utover, ikke bølge seg.';
  }
  if (round.phase === 'wave') {
    return 'Bølgemønsteret bygger seg opp rad for rad. Sett hatten på bordet og se at de blå feltene stabler seg til bølger som peker oppover, likt hele veien rundt.';
  }
  return 'En ren, helblå kant nederst hele veien rundt. Hatten er ferdig formet — bremmen skal skrå jevnt utover.';
}

function roundStep(round: Round, roundIdx: number): StepDef {
  const techniques: TechniqueId[] = [];
  let body: string[] = [];
  let title = `Runde ${round.num}`;
  const eyebrow = `Runde ${round.num} av hatten`;
  let yarn: YarnColor = round.color;

  if (round.num === 1) {
    title = 'Runde 1: Ti fastmasker i samme åpning';
    yarn = 'white';
    body = [
      'Alle de ti fastmaskene skal lages inn i den samme luftmasken: luftmaske 1. Ikke gå til en ny luftmaske underveis.',
      'Lag fastmaske nummer 1: stikk nålen gjennom luftmaske 1, fang arbeidstråden, trekk den tilbake gjennom luftmasken. Stopp — du skal nå ha to løkker på nålen. Fang arbeidstråden på nytt og trekk gjennom begge løkkene.',
      'Sett en binders, sikkerhetsnål eller liten garnbit gjennom V-en på toppen av denne første fastmasken. Markøren betyr: «Her begynner runden.»',
      'Stikk nålen tilbake i den samme luftmaske 1 og lag fastmaske 2. Fortsett til du har ti fastmasker i samme åpning. Det blir trangt — skyv maskene forsiktig til siden med fingrene.',
      'Lukk runden: finn fastmasken med markøren, stikk nålen under begge trådene i V-en på toppen, og lag en kjedemaske. Du skal sitte igjen med én løkke på nålen.',
    ];
    techniques.push('fastmaske', 'kjedemaske');
  } else if (round.phase === 'top' || round.phase === 'brim-inc') {
    yarn = 'white';
    if (round.num === 2) {
      title = 'Runde 2: To fastmasker i hver maske';
      techniques.push('to-i-samme', 'fastmaske');
    } else if (round.increaseEvery !== null) {
      title = `Runde ${round.num}: Øk til ${round.count} masker`;
      techniques.push('to-i-samme');
    } else {
      title = `Runde ${round.num}: Én fastmaske i hver maske`;
      techniques.push('fastmaske');
    }
    body = [ROUND_RITUAL_START, rhythmText(round), ROUND_RITUAL_END];
    if (round.num <= 6) {
      body.splice(1, 0,
        'VIKTIG: Stikk alltid nålen inn under BEGGE trådene i V-en på masken. Sjekk før du henter garn: det skal ligge TO tråder over nålen. Går du under bare én, blir den andre liggende igjen som en synlig ring rundt hatten.',
      );
    }
    if (round.phase === 'brim-inc') {
      body.unshift(
        round.num === 30
          ? 'Nå starter bremmen. Toppen og teksten er ferdig — de to neste rundene gjør hatten videre nederst, fortsatt i hvitt.'
          : 'Én økerunde til i hvitt. Etter denne runden har du 120 masker = 12 bølgeblokker à 10 masker, og du er klar for bølgemønsteret.',
      );
    }
  } else if (round.phase === 'text') {
    const row = round.chartRow!;
    title = `Runde ${round.num}: Tekst — diagramrad ${row}`;
    yarn = 'red';
    body = [
      ROUND_RITUAL_START,
      `Følg diagramrad ${row} (rad 1 er ØVERST i diagrammet — hatten hekles ovenfra og ned, så du jobber deg nedover i diagrammet). Én rute er én fastmaske. Hvit rute = hvit fastmaske, rød rute = rød fastmaske. Du starter ved maske 1 på VENSTRE side av diagrammet og leser mot høyre. (Diagrammet viser utsiden av den ferdige hatten — i hendene dine vandrer arbeidet mot venstre, og det er samme sak.)`,
      'Husk fargebytteregelen: den nye fargen trekkes gjennom de to siste løkkene i masken FØR den nye fargen skal synes. Appen markerer nøyaktig hvilke masker dette gjelder nedenfor.',
      'Den passive tråden ligger langs innsiden av hatten. Hekle gjerne rundt den så den blir med videre, men ikke trekk den stramt — da snurper hatten seg.',
      'Ingen økninger i tekstfeltet. Runden skal fortsatt ha 100 masker.',
      ROUND_RITUAL_END,
    ];
    if (round.num === 20) {
      body.splice(1, 0,
        'Nå starter selve teksten! Hent frem det røde garnet. Første fargebytte skjer i masken før den første røde ruten.',
      );
    }
    techniques.push('fargebytte', 'fastmaske');
  } else if (round.phase === 'wave') {
    const row = round.waveRow!;
    title = `Bølgemønsteret — rad ${row} av 6`;
    yarn = 'blue';
    const waveIntro: Record<number, string> = {
      1: 'Nå starter Helene Spillings bølgekant! Hent frem det blå garnet. Del de 120 maskene mentalt i 12 blokker på 10 masker — én bølge per blokk. Følg bølgerad 1 i hver blokk, hele veien rundt.',
      2: 'Bølgerad 2: bølgene vokser. Fortsett å bytte mellom hvitt og blått etter mønsteret — samme fargebytteregel som i teksten: bytt i masken før.',
      3: 'Bølgerad 3: toppen av bølgene deler seg. Følg mønsteret rute for rute.',
      4: 'Bølgerad 4: her kommer den første økningen. Den røde ruten i diagrammet betyr IKKE rødt garn — den betyr to blå fastmasker i samme maske. Én økning per bølge gir 132 masker.',
      5: 'Bølgerad 5: én økning til per bølge (to blå fastmasker i den markerte masken). Etter runden har du 144 masker.',
      6: 'Bølgerad 6: helt blå runde — bølgene smelter sammen i den blå kanten.',
    };
    body = [
      waveIntro[row],
      ROUND_RITUAL_START,
      'Hvit rute = hvit fastmaske, blå rute = blå fastmaske. Rød rute = to blå fastmasker i samme maske (økning). Fargeoppskriften for runden står nedenfor, maske for maske.',
      ROUND_RITUAL_END,
    ];
    techniques.push('fargebytte', row >= 4 ? 'to-i-samme' : 'fastmaske');
  } else if (round.phase === 'brim') {
    title = 'Siste runde: Helblå kant';
    yarn = 'blue';
    body = [
      ROUND_RITUAL_START,
      'Lag én blå fastmaske i hver eneste maske, hele veien rundt. Ingen økninger. Dette er den nederste, rene blå kanten på bremmen.',
      ROUND_RITUAL_END,
    ];
    techniques.push('fastmaske');
  }

  return {
    id: `round-${round.num}`,
    kind: 'round',
    title,
    eyebrow,
    body,
    yarn,
    countChip: `${round.count} fm`,
    techniques,
    roundIdx,
    confirm: null,
    check: {
      look: roundLook(round),
      diameterCm: round.phase === 'top' ? discRange(round.count) : null,
      count: round.count,
    },
  };
}

export function buildSteps(rounds: Round[]): StepDef[] {
  const steps: StepDef[] = [];

  steps.push({
    id: 'intro-utstyr',
    kind: 'intro',
    title: 'Velkommen! Dette trenger du',
    eyebrow: 'Startkapittel',
    body: [
      'Vi begynner rolig: tre korte steg før selve hatten. Guiden tar deg gjennom «Ro det i land»-hatten av Helene Spilling (4,0 mm) — én runde av gangen.',
      'Hatten i 3D vokser mens du hekler. Åpne Maskeskolen når du vil se bevegelsene animert.',
      'Sjekk at du har utstyret:',
    ],
    checklist: [
      '4,0 mm heklenål',
      'Hvitt garn (tykkere bomull, gjerne ca. 50 g = 70–80 m)',
      'Rødt garn',
      'Blått garn',
      'Saks',
      'Én binders, sikkerhetsnål eller liten garnbit som maskemarkør',
      'Målebånd eller linjal',
      'Stoppenål til slutt, dersom du har',
    ],
    yarn: null,
    countChip: '4,0 mm nål',
    techniques: ['holde-garnet'],
    roundIdx: null,
    confirm: null,
  });

  steps.push({
    id: 'intro-garn',
    kind: 'intro',
    title: 'De to garnendene — og den viktigste regelen',
    eyebrow: 'Startkapittel',
    body: [
      'Når du begynner, har du to tråder: Arbeidstråden er den lange tråden til garnnøstet — den hekler du med. Garnhalen er den korte løse enden ved startknuten — den lager du ikke masker med.',
      'Den viktigste regelen: Løkken som sitter på heklenålen er IKKE en maske.',
      'Når du teller, teller du de små V-formene i arbeidet. Aldri løkken på nålen, aldri luftmasken som starter en runde, og aldri kjedemasken som lukker den.',
    ],
    yarn: null,
    countChip: '4,0 mm nål',
    techniques: ['holde-garnet', 'luftmaske', 'fastmaske'],
    roundIdx: null,
    confirm: null,
  });

  steps.push({
    id: 'practice',
    kind: 'practice',
    title: 'Øv først — dette blir ikke hatten',
    eyebrow: 'Startkapittel',
    body: [
      'Siste del av startkapittelet: lag en løpeknute, 10 luftmasker, og hekle fastmasker tilbake. Gjerne to–tre rette rader — dette er bare trening.',
      'Skjevt? Helt greit. Dra opp og prøv igjen til bevegelsen sitter.',
      'Du er klar for hatten når du kan lage en fastmaske og forstår hvorfor du først får to løkker på nålen, deretter én.',
      'Bruk Maskeskolen for animasjoner. Videoer er ikke linket (rettigheter) — søk f.eks. «løpeknute hekling», «luftmasker nybegynner» eller «fastmaske hekling» på YouTube, Instagram eller TikTok.',
    ],
    yarn: 'white',
    countChip: '4,0 mm nål',
    techniques: ['lopeknute', 'luftmaske', 'fastmaske'],
    roundIdx: null,
    confirm: null,
  });

  steps.push({
    id: 'start',
    kind: 'start',
    title: 'Start hatten: Løpeknute og to luftmasker',
    eyebrow: 'Selve hatten begynner',
    body: [
      'Hent det hvite garnet. Vi bruker en enkel start med to luftmasker — det er lettere enn en magisk ring.',
      'Lag en løpeknute og sett løkken på heklenålen. Trekk forsiktig i arbeidstråden til løkken sitter løst rundt den tykke delen av nålen. Løkken skal kunne gli.',
      'Lag én luftmaske. Lag én luftmaske til. Nå har du: knute — luftmaske 1 — luftmaske 2 — løkke på nålen.',
      'Finn luftmaske 1: den er nærmest knuten, nærmest den korte garnhalen, og lengst unna heklenålen. Stikk heklenålen gjennom åpningen i luftmaske 1 — tenk at nålen skal gjennom en døråpning, ikke gjennom veggen.',
    ],
    yarn: 'white',
    countChip: '2 lm',
    techniques: ['lopeknute', 'luftmaske'],
    roundIdx: null,
    confirm: null,
  });

  rounds.forEach((round, roundIdx) => {
    steps.push(roundStep(round, roundIdx));
    if (round.num === 19) {
      steps.push({
        id: 'size-check',
        kind: 'size-check',
        title: 'Størrelseskontroll: mål toppen',
        eyebrow: 'Stoppunkt etter runde 19',
        body: [
          'Legg toppen flatt uten å strekke den, og mål diameteren fra kant til kant gjennom midten.',
          'For en vanlig voksenstørrelse er omtrent 17,5–20 cm et nyttig mål i denne 4,0 mm-versjonen (100 masker før teksten).',
        ],
        bullets: [
          '17,5–20 cm: Perfekt. Fortsett med 100 masker inn i teksten.',
          'Mer enn 20 cm: Toppen kan bli litt romslig. Du kan likevel fortsette — eller dra opp runde 19 og hoppe over den økningen (fortsett med 90 masker og litt mindre avstand mellom ordene).',
          'Mindre enn 17,5 cm: Lag én ekstra økerunde før teksten: én fastmaske i ni forskjellige masker, deretter to i neste (øke i hver 10.). Da får du 110 masker — fordel da 5 ekstra hvite masker før første RO og 5 etter siste RO når du leser diagrammet.',
        ],
        yarn: 'white',
        countChip: '17,5–20 cm',
        techniques: [],
        roundIdx: 18,
        confirm: null,
      });
    }
  });

  steps.push({
    id: 'finish',
    kind: 'finish',
    title: 'Avslutt hatten og fest trådene',
    eyebrow: 'Siste steg',
    body: [
      'Etter siste maske: klipp garnet og la omtrent 15 cm tråd være igjen. Trekk hele garnhalen gjennom løkken på heklenålen og stram forsiktig.',
      'Før garnhalen frem og tilbake under noen masker på innsiden av hatten. Har du ikke stoppenål, kan du bruke heklenålen til å trekke halen under maskene.',
      'Ikke klipp helt inntil knuten — la halen være godt festet først. Fest også garnhalene fra fargebyttene på samme måte.',
    ],
    yarn: 'blue',
    countChip: null,
    techniques: ['feste-traden'],
    roundIdx: rounds.length - 1,
    confirm: null,
  });

  steps.push({
    id: 'done',
    kind: 'done',
    title: 'Gratulerer — hatten er ferdig!',
    eyebrow: 'RO DET I LAND — hatten av Helene Spilling',
    body: [
      'Du har heklet en hel bøttehatt, med fargemønster og bølgekant, som nybegynner. Det er skikkelig bra jobbet.',
      'Snurr gjerne på hatten i 3D og sammenlign med din egen. Husk at de første rundene alltid ser litt ujevne ut — det gjør de for alle.',
      'Oppskriften er basert på «Ro det i land»-hatten av Helene Spilling. Hun ønsker at de som kan, vippser en liten sum til Barnekreftforeningen som betaling for originaloppskriften.',
    ],
    yarn: null,
    countChip: null,
    techniques: [],
    roundIdx: rounds.length - 1,
    confirm: null,
  });

  return steps;
}
