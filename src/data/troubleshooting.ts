export interface TroubleItem {
  title: string;
  steps: string[];
}

export const TROUBLESHOOTING: TroubleItem[] = [
  {
    title: 'Garnet deler seg',
    steps: [
      'Garnet består av flere småtråder. Hvis kroken bare får tak i noen av dem: stopp.',
      'Trekk nålen litt tilbake og la garnet samle seg.',
      'Stikk gjennom selve åpningen i masken og fang hele garnet som ett lite tau.',
      'Drei krokåpningen litt ned før du trekker.',
    ],
  },
  {
    title: 'Løkken på nålen blir enorm',
    steps: [
      'Hold arbeidet med venstre hånd.',
      'Finn arbeidstråden som går til nøstet, og trekk forsiktig i den.',
      'Stopp når løkken sitter løst rundt den tykke delen av nålen.',
      'Ikke trekk hardt — løkken skal fortsatt kunne gli.',
    ],
  },
  {
    title: 'Jeg finner ikke den første luftmasken',
    steps: [
      'Den første luftmasken er nærmest knuten, nærmest garnhalen, og lengst unna heklenålen.',
      'Løkken på nålen teller ikke.',
    ],
  },
  {
    title: 'Jeg får én maske for mye',
    steps: [
      'Du har sannsynligvis telt luftmasken ved starten av runden, kjedemasken ved slutten, eller løkken på nålen.',
      'Ingen av disse skal telles som fastmasker.',
    ],
  },
  {
    title: 'Jeg får én maske for lite',
    steps: [
      'Du har sannsynligvis hoppet over den første ordentlige masken etter sammenkoblingen.',
      'Bruk markøren konsekvent: den skal alltid sitte i rundens første fastmaske.',
    ],
  },
  {
    title: 'Jeg vet ikke hvor nålen skal inn',
    steps: [
      'Se etter V-en på toppen av masken.',
      'Ved vanlig fastmaske hekler du normalt under begge trådene i denne V-en.',
      'Ikke stikk ned i et tilfeldig hull mellom maskene.',
    ],
  },
  {
    title: 'Arbeidet ser stygt ut',
    steps: [
      'Det er normalt i starten. De første rundene kan være ujevne, litt stramme, litt løse, skjeve og vanskelige å telle.',
      'Målet er ikke perfekte masker. Målet er at masketallet og grunnformen stemmer.',
    ],
  },
  {
    title: 'Jeg har for mange eller for få masker',
    steps: [
      'Ikke dra ut noe — dette fikses nesten alltid med en justeringsrunde.',
      'Tell én gang nøyaktig: legg en garnbit gjennom V-en for hver 10. maske, så teller du aldri mer enn 10 om gangen.',
      'For mange: fordel «to sammen» jevnt i neste vanlige runde. For få: fordel «to i samme» jevnt.',
      'Viktig: tekstrundene (20–29) må ha nøyaktig 100 masker. Juster alltid ferdig FØR du begynner på bokstavene.',
    ],
  },
];

export const CHEAT_SHEET = [
  {
    title: 'Start',
    lines: [
      '1. Løpeknute.',
      '2. To luftmasker.',
      '3. Ti fastmasker i den første luftmasken.',
      '4. Kjedemaske i første fastmaske.',
    ],
  },
  {
    title: 'Hver ny runde',
    lines: [
      '1. Én luftmaske — ikke tell den.',
      '2. Første fastmaske i første ordentlige maske.',
      '3. Sett markør.',
      '4. Følg rundens mønster.',
      '5. Kjedemaske i masken med markøren.',
    ],
  },
  {
    title: 'Fastmaske',
    lines: ['Stikk inn → hent garn → to løkker', '→ hent garn → gjennom begge.'],
  },
  {
    title: 'Kjedemaske',
    lines: ['Stikk inn → hent garn', '→ trekk direkte gjennom alt.'],
  },
  {
    title: 'To i samme maske',
    lines: [
      'Lag én fastmaske.',
      'Stikk tilbake i samme maske.',
      'Lag enda én fastmaske.',
    ],
  },
  {
    title: 'To sammen (felling)',
    lines: [
      'Stikk inn, hent garn → 2 løkker. STOPP.',
      'Stikk i NESTE maske, hent garn → 3 løkker.',
      'Hent garn → gjennom alle 3.',
      'To masker ble til én.',
    ],
  },
  {
    title: 'Fargebytte',
    lines: [
      'Ny farge trekkes gjennom de siste to løkkene',
      'i masken før den nye fargen skal synes.',
    ],
  },
];
