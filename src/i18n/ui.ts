import type { Locale } from './locale';
import type { YarnColor } from '../data/types';
import {
  YARN_NAME,
  YARN_NAME_EN,
  YARN_WORD_EN,
  YARN_WORD_PLURAL,
} from '../data/types';

const upper = (m: Record<YarnColor, string>): Record<YarnColor, string> =>
  Object.fromEntries(
    (Object.keys(m) as YarnColor[]).map((k) => [k, m[k].toUpperCase()]),
  ) as Record<YarnColor, string>;

// Derived from the single yarn table in data/types, so adding a colour to the
// palette can never leave a recipe with a hole where a colour name should be.
const YARN_NO = YARN_NAME;
const YARN_NO_UPPER = upper(YARN_NAME);
const YARN_NO_PLURAL = YARN_WORD_PLURAL;
const YARN_EN = YARN_NAME_EN;
const YARN_EN_UPPER = upper(YARN_NAME_EN);
const YARN_EN_PLURAL = YARN_WORD_EN;

const no = {
  yarnName: YARN_NO,
  yarnNameUpper: YARN_NO_UPPER,
  yarnNamePlural: YARN_NO_PLURAL,
  brandKicker: 'Ro det i land',
  brandWelcome: 'Ro det i land hatten',
  brandBy: 'av Helene Spilling',
  welcomeEyebrow: 'Interaktiv 3D-oppskrift',
  welcomeTitle1: 'Velkommen!',
  welcomeTitle2Before: 'La oss ',
  welcomeTitle2Em: 'ro det i land',
  welcomeTitle2After: '.',
  welcomeLede:
    'Hekle «Ro det i land»-hatten av Helene Spilling — én runde av gangen. Passer både deg som kan hekle, og deg som aldri har rørt en heklepinne. Hatten i 3D vokser mens du hekler.',
  welcomeStart: 'Start oppskriften →',
  welcomeResume: 'Fortsett der du slapp',
  welcomeFine: (n: number) =>
    `${n} små steg · Maskeskole med animasjoner · for nybegynnere og øvede`,
  welcomePdf: 'Last ned original oppskrift',
  welcomeFoot: 'Oppskrift av',
  patternLabel: 'Oppskriften',
  stepOf: (i: number, n: number) => `Steg ${i} av ${n}`,
  prev: '← Forrige',
  next: 'Neste steg →',
  nextShort: 'Neste →',
  done: 'Ferdig!',
  jumpOpen: 'Oppskrift',
  jumpList: 'Alle steg',
  school: 'Maskeskolen',
  recipeFirstHint:
    'Les oppskriften her. 3D-visningen starter når du begynner runde 1 av hatten.',
  seeRecipeHint: 'Se Oppskrift for mer tekstinfo',
  tapRecipeHint: 'Trykk Oppskrift for mer info',
  stitchByStitch: 'Maske for maske',
  stitchJumpLead: 'Hopp fort til neste fargerad eller felt:',
  rhythmPlain: '1 vanlig',
  rhythmTwoSame: '2 i samme',
  rhythmFinishTwo: '2/2 ferdig',
  rhythmOf: (done: number, total: number) => `Rytme ${done} av ${total}`,
  fieldOf: (done: number, total: number) => `Felt ${done} av ${total}`,
  plusOneStitchShort: '+1 maske',
  /** Sits under the ± sign on the fine stepper, so the sign carries the verb. */
  oneStitchWord: '1 maske',
  fineStepperAria: 'Én maske av gangen',
  minusBlock: '− felt',
  viewWorking: 'Sy-visning',
  viewFinished: 'Ferdig hatt',
  viewWorkingTitle: 'Slik arbeidet ligger i hendene dine',
  viewFinishedTitle: 'Hele den ferdige hatten, med teksten riktig vei',
  viewFinaleTitle: 'Avslutningen viser ferdig hatt',
  homeTitle: 'Tilbake til oppskrifter',
  settingsTitle: 'Innstillinger og hjelp',
  settingsAria: 'Innstillinger',
  toolSpinOn: '◉ Snurring PÅ',
  toolSpin: '◎ Snurring',
  toolNumbers: '123 Maskenummer',
  toolMarkers: 'Markører',
  toolChart: 'Diagram',
  toolCheat: 'Huskelapp',
  toolHelp: 'Hjelp',
  hintRotate: 'Dra for å rotere · Rull for å zoome',
  hintCount: 'Dra for å rotere · Rull for å zoome · Space/+1 · Backspace/−1',
  flipHint:
    'Bokstavene er opp ned her — det er riktig! Arbeidet ligger opp ned i hendene dine. Trykk «Ferdig hatt» for å lese dem rett vei.',
  returnTo: (label: string) => `↩ Tilbake til ${label}`,
  roundOf: (n: number, last: number, count: number) =>
    `Runde ${n} av ${last} · ${count} masker`,
  stageIntro: 'Interaktiv 3D-oppskrift · for helt ferske nybegynnere',
  yarnWhite: 'Hvit',
  yarnRed: 'Rød',
  yarnBlue: 'Blå',
  yarnWhiteRed: 'Hvit + rød',
  yarnWhiteBlue: 'Hvit + blå',
  needleChip: '4,0 mm nål',
  of: 'av',
  plusOne: '+1',
  minusOne: '−1',
  roundDone: 'Ferdig!',
  toColorChange: 'Til fargebytte',
  nextColorChange: 'Neste fargebytte',
  nextColorShort: 'Neste bytte',
  langNo: 'Norsk',
  langEn: 'English',
  langGroup: 'Språk',
  white: 'HVIT',
  red: 'RØD',
  blue: 'BLÅ',
  whitePlural: 'hvite',
  redPlural: 'røde',
  bluePlural: 'blå',
  hudRoundDone: 'Runden er ferdig!',
  hudRoundDoneHint: 'Kjedemaske i masken med markøren.',
  hudColorChange: 'Fargebytte i denne masken',
  hudColorChangeLine: (cur: string, next: string) =>
    `Hekle med ${cur}, trekk ${next} gjennom siste to løkker.`,
  hudIncSame: 'Økning — samme V',
  hudIncSecond: (n: number, prev: number) =>
    `Nr. ${n}: den andre i samme V som nr. ${prev}.`,
  hudPairFirst: 'To i samme — første',
  hudPairLine: (n: number, color: string) =>
    `Nr. ${n}: ${color} i neste V. Neste = samme hull.`,
  hudPlain: (n: number, color: string) => `Nr. ${n}: ${color} fastmaske — én vanlig.`,
  hudRepeat: 'Gjenta:',
  hudField: 'Felt:',
  hudInsertIn: 'Stikk i',
  hudSetMarker: 'Sett markør nå',
  hudSetMarkerHint: (n: number) => `— i V-en på masken du nettopp laget (nr. ${n}).`,
  hudMarkerOf: (a: number, b: number) => `Markør ${a} av ${b} i denne runden.`,
  plusOneStitch: '+1 maske',
  minusOneStitchShort: '−1 maske',
  sc: 'fastmaske',
  stitchWord: 'Maske',
  // Same-V wording. "V" is the stitch head you put the hook through, so
  // "samme V" is the phrase a crocheter checks against the work in her hands.
  chipPairSameV: (a: number, b: number) => `nr. ${a} + ${b} i samme V`,
  chipOpensSameV: (prev: number, n: number) =>
    `nr. ${n} går i samme V som nr. ${prev} i feltet før`,
  chipClosesSameV: (n: number, next: number) =>
    `nr. ${next} i neste felt går i samme V som nr. ${n}`,
  chipHoles: (n: number) => `dekker ${n} V`,
  legendPair: 'begge maskene i samme V',
  legendLink: 'deler V med feltet ved siden av',
  vmapTitle: 'V-kart',
  vmapLead: 'én gruppe = ett hull',
  vmapLeadPlain: 'én maske = ett hull · trykk for å hoppe',
  vmapLegend:
    'To masker under samme bue skal i det SAMME hullet — det laveste nummeret først.',
  vmapPairTitle: (a: number, b: number, which: number) =>
    `Maske ${a} og ${b} i samme V — dette er nr. ${which} av de to.`,
  vmapSingleTitle: (n: number) => `Maske ${n} — egen V.`,
  bookmarkSave: 'Bokmerk stedet du er på',
  bookmarkMove: 'Flytt bokmerket hit',
  bookmarkRemove: 'Fjern bokmerket',
  bookmarkSaved: 'Bokmerket',
  bookmarkCleared: 'Bokmerke fjernet',
  bookmarkGoTo: (label: string) => `Bokmerke: ${label}`,
  bookmarkCopy: 'Kopier lenke',
  bookmarkCopied: 'Lenke kopiert',
  bookmarkCopyTitle: 'Kopier en lenke som åpner nøyaktig her — til mobilen din',
  bookmarkCopyManual: 'Kopier denne lenken:',
  bookmarkResume: 'Fortsett',
  hudSameV: 'Samme V:',
  hudPairAcross: (n: number, next: number, color: string) =>
    `Obs: nr. ${next} (${color}) skal i samme V som nr. ${n}.`,
} as const;

type UiDict = {
  [K in keyof typeof no]: (typeof no)[K] extends string
    ? string
    : (typeof no)[K];
};

const en: UiDict = {
  yarnName: YARN_EN,
  yarnNameUpper: YARN_EN_UPPER,
  yarnNamePlural: YARN_EN_PLURAL,
  brandKicker: 'Ro det i land',
  brandWelcome: 'Ro det i land hat',
  brandBy: 'by Helene Spilling',
  welcomeEyebrow: 'Interactive 3D pattern',
  welcomeTitle1: 'Welcome!',
  welcomeTitle2Before: "Let's ",
  welcomeTitle2Em: 'bring it home',
  welcomeTitle2After: '.',
  welcomeLede:
    'Crochet the “Ro det i land” hat by Helene Spilling — one round at a time. For crocheters and complete beginners. The 3D hat grows as you work.',
  welcomeStart: 'Start the pattern →',
  welcomeResume: 'Continue where you left off',
  welcomeFine: (n: number) =>
    `${n} small steps · Stitch school with animations · for beginners and beyond`,
  welcomePdf: 'Download original pattern',
  welcomeFoot: 'Pattern by',
  patternLabel: 'The pattern',
  stepOf: (i: number, n: number) => `Step ${i} of ${n}`,
  prev: '← Previous',
  next: 'Next step →',
  nextShort: 'Next →',
  done: 'Done!',
  jumpOpen: 'Pattern',
  jumpList: 'All steps',
  school: 'Stitch school',
  recipeFirstHint:
    'Read the pattern here. The 3D view starts when you begin round 1 of the hat.',
  seeRecipeHint: 'See Pattern for more text info',
  tapRecipeHint: 'Tap Pattern for more info',
  stitchByStitch: 'Stitch by stitch',
  stitchJumpLead: 'Jump quickly to the next colour block:',
  rhythmPlain: '1 plain',
  rhythmTwoSame: '2 in same',
  rhythmFinishTwo: '2/2 done',
  rhythmOf: (done: number, total: number) => `Rhythm ${done} of ${total}`,
  fieldOf: (done: number, total: number) => `Block ${done} of ${total}`,
  plusOneStitchShort: '+1 stitch',
  oneStitchWord: '1 stitch',
  fineStepperAria: 'One stitch at a time',
  minusBlock: '− block',
  viewWorking: 'Working view',
  viewFinished: 'Finished hat',
  viewWorkingTitle: 'How the work sits in your hands',
  viewFinishedTitle: 'The finished hat, text the right way up',
  viewFinaleTitle: 'The finale shows the finished hat',
  homeTitle: 'Back to patterns',
  settingsTitle: 'Settings and help',
  settingsAria: 'Settings',
  toolSpinOn: '◉ Spinning ON',
  toolSpin: '◎ Spin',
  toolNumbers: '123 Stitch numbers',
  toolMarkers: 'Markers',
  toolChart: 'Chart',
  toolCheat: 'Cheat sheet',
  toolHelp: 'Help',
  hintRotate: 'Drag to rotate · Scroll to zoom',
  hintCount: 'Drag to rotate · Scroll to zoom · Space/+1 · Backspace/−1',
  flipHint:
    'The letters are upside down here — that’s correct! The work sits upside down in your hands. Tap “Finished hat” to read them the right way up.',
  returnTo: (label: string) => `↩ Back to ${label}`,
  roundOf: (n: number, last: number, count: number) =>
    `Round ${n} of ${last} · ${count} stitches`,
  stageIntro: 'Interactive 3D pattern · for absolute beginners',
  yarnWhite: 'White',
  yarnRed: 'Red',
  yarnBlue: 'Blue',
  yarnWhiteRed: 'White + red',
  yarnWhiteBlue: 'White + blue',
  needleChip: '4.0 mm hook',
  of: 'of',
  plusOne: '+1',
  minusOne: '−1',
  roundDone: 'Done!',
  toColorChange: 'To colour change',
  nextColorChange: 'Next colour change',
  nextColorShort: 'Next change',
  langNo: 'Norsk',
  langEn: 'English',
  langGroup: 'Language',
  white: 'WHITE',
  red: 'RED',
  blue: 'BLUE',
  whitePlural: 'white',
  redPlural: 'red',
  bluePlural: 'blue',
  hudRoundDone: 'Round finished!',
  hudRoundDoneHint: 'Slip stitch into the stitch with the marker.',
  hudColorChange: 'Colour change in this stitch',
  hudColorChangeLine: (cur: string, next: string) =>
    `Crochet with ${cur}, pull ${next} through the last two loops.`,
  hudIncSame: 'Increase — same V',
  hudIncSecond: (n: number, prev: number) =>
    `No. ${n}: the second into the same V as no. ${prev}.`,
  hudPairFirst: 'Two in same — first',
  hudPairLine: (n: number, color: string) =>
    `No. ${n}: ${color} in the next V. Next = same hole.`,
  hudPlain: (n: number, color: string) => `No. ${n}: ${color} single crochet — one plain.`,
  hudRepeat: 'Repeat:',
  hudField: 'Block:',
  hudInsertIn: 'Insert into',
  hudSetMarker: 'Place marker now',
  hudSetMarkerHint: (n: number) => `— in the V of the stitch you just made (no. ${n}).`,
  hudMarkerOf: (a: number, b: number) => `Marker ${a} of ${b} in this round.`,
  plusOneStitch: '+1 stitch',
  minusOneStitchShort: '−1 stitch',
  sc: 'single crochet',
  stitchWord: 'Stitch',
  chipPairSameV: (a: number, b: number) => `no. ${a} + ${b} into the same V`,
  chipOpensSameV: (prev: number, n: number) =>
    `no. ${n} goes into the same V as no. ${prev} in the block before`,
  chipClosesSameV: (n: number, next: number) =>
    `no. ${next} in the next block goes into the same V as no. ${n}`,
  chipHoles: (n: number) => `covers ${n} V`,
  legendPair: 'both stitches into the same V',
  legendLink: 'shares a V with the block next to it',
  vmapTitle: 'V map',
  vmapLead: 'one group = one hole',
  vmapLeadPlain: 'one stitch = one hole · tap to jump',
  vmapLegend:
    'Two stitches under one bracket go into the SAME hole — lower number first.',
  vmapPairTitle: (a: number, b: number, which: number) =>
    `Stitches ${a} and ${b} share a V — this is no. ${which} of the two.`,
  vmapSingleTitle: (n: number) => `Stitch ${n} — its own V.`,
  bookmarkSave: 'Bookmark this spot',
  bookmarkMove: 'Move the bookmark here',
  bookmarkRemove: 'Remove the bookmark',
  bookmarkSaved: 'Bookmarked',
  bookmarkCleared: 'Bookmark removed',
  bookmarkGoTo: (label: string) => `Bookmark: ${label}`,
  bookmarkCopy: 'Copy link',
  bookmarkCopied: 'Link copied',
  bookmarkCopyTitle: 'Copy a link that opens exactly here — send it to your phone',
  bookmarkCopyManual: 'Copy this link:',
  bookmarkResume: 'Continue',
  hudSameV: 'Same V:',
  hudPairAcross: (n: number, next: number, color: string) =>
    `Note: no. ${next} (${color}) goes into the same V as no. ${n}.`,
};

export const UI = { no, en } as const;

export type UiKey = keyof typeof no;

export function t(locale: Locale) {
  return UI[locale];
}
