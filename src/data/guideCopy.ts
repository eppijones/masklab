import type { PatternId } from '../patterns/types';
import type { GuideCopy } from './stepsGeneric';

const HELENE_CREDIT_NO = [
  'Oppskriften er av Helene Spilling. Hun ønsker at de som kan, vippser en liten sum til Barnekreftforeningen som betaling for originaloppskriften.',
  'Tagg gjerne @helenespilling på Instagram om du deler resultatet!',
];
const HELENE_CREDIT_EN = [
  'The pattern is by Helene Spilling. She asks that those who can send a small donation via Vipps to Barnekreftforeningen (the Children’s Cancer Society) as payment for the original pattern.',
  'Feel free to tag @helenespilling on Instagram if you share the result!',
];

const NORWAY_CREDIT_NO = [
  'NORWAY26 er et MASKLAB-originaldesign laget til landslagsdrakten 2026. Del gjerne resultatet — og lag din egen variant i studioet!',
];
const NORWAY_CREDIT_EN = [
  'NORWAY26 is a MASKLAB original design made for the 2026 national-team kit. Share your result — and make your own variant in the studio!',
];

export interface WelcomeCopy {
  brandWelcome: string;
  brandBy: string;
  brandKicker: string;
  titleEm: string;
  lede: string;
  pdfUrl: string | null;
  footName: string;
  footUrl: string | null;
}

export const GUIDE_COPY: Record<Exclude<PatternId, 'ro-ro-ro'>, GuideCopy> = {
  martin: {
    nameNo: '«Vi som elsker Martin»-hatten av Helene Spilling',
    nameEn: 'the “Vi som elsker Martin” hat by Helene Spilling',
    creditNo: HELENE_CREDIT_NO,
    creditEn: HELENE_CREDIT_EN,
    tipsNo: [
      'I denne hatten bytter du farge hyppig i ØDEGAARD-feltet — løsne opp i garnet med jevne mellomrom.',
    ],
    tipsEn: [
      'This hat changes color frequently in the ØDEGAARD section — loosen up the yarn regularly.',
    ],
  },
  flagget: {
    nameNo: '«Flagget til topps»-hatten av Helene Spilling',
    nameEn: 'the “Flagget til topps” hat by Helene Spilling',
    creditNo: HELENE_CREDIT_NO,
    creditEn: HELENE_CREDIT_EN,
    tipsNo: [
      'Helenes tips: ta med begge trådene som ikke er i bruk gjennom hele hatten — også i rundene som ikke trenger dem — så maskene får samme tykkelse og struktur hele veien. Trådene ligger inni hatten hele veien rundt.',
      'Størrelse: for small, stopp økningene i runde 11. For large, øk til og med runde 13.',
    ],
    tipsEn: [
      'Helene’s tip: carry both unused strands through the whole hat — even in rounds that don’t need them — so all stitches get the same thickness and structure. The strands lie inside the hat all the way around.',
      'Sizing: for small, stop the increases at round 11. For large, increase through round 13.',
    ],
  },
  norway26: {
    nameNo: "NORWAY'26 Drakt-hatten",
    nameEn: "the NORWAY'26 kit hat",
    creditNo: NORWAY_CREDIT_NO,
    creditEn: NORWAY_CREDIT_EN,
    tipsNo: [
      'Ikat-stripene løper diagonalt fra pullen og helt ut i bremmen — følg maske-for-maske-oppskriften i de mønstrede rundene, og hold de passive trådene løse.',
      'NORGE står i runeskrift foran og bak, med én maskes marineblå kontur rundt bokstavene — strøkene løper helt inntil og forsvinner bak dem. Under teksten fortsetter mønsteret ubrutt helt ut i bremmen; bare de to siste rundene hekles hvite.',
    ],
    tipsEn: [
      'The ikat streaks run diagonally from the crown all the way onto the brim — follow the stitch-by-stitch recipe in the patterned rounds and keep the unused strands loose.',
      'NORGE sits in runic letters front and back, outlined by a single stitch of navy — the streaks run right up to the letters and disappear behind them. Below the lettering the pattern carries on unbroken all the way onto the brim; only the last two rounds are worked in white.',
    ],
  },
  'norway26-white': {
    nameNo: "NORWAY'26 Hvit-hatten",
    nameEn: "the NORWAY'26 White hat",
    creditNo: NORWAY_CREDIT_NO,
    creditEn: NORWAY_CREDIT_EN,
    tipsNo: [
      'De marineblå buntene fortsetter fra pullen og nedover sidene, akkurat som på designarket — hold dem løse, ellers trekker den hvite bunnen seg sammen.',
      'Runisk NORGE i marineblått foran og bak. Mønsteret går ubrutt ned i bremmen, og bare de to siste rundene hekles røde — samme detalj som halslinningen på bortedrakten.',
    ],
    tipsEn: [
      'The navy bundles flow from the crown down the sides exactly as on the design sheet — keep them loose or the white ground will pull in.',
      'Runic NORGE in navy front and back. The pattern runs unbroken onto the brim and only the last two rounds are worked in red — the away shirt\u2019s collar trim.',
    ],
  },
  'norway26-black': {
    nameNo: "NORWAY'26 Svart-hatten",
    nameEn: "the NORWAY'26 Black hat",
    creditNo: NORWAY_CREDIT_NO,
    creditEn: NORWAY_CREDIT_EN,
    tipsNo: [
      'Svart bunn med bare tre hvite buntstrøk som krysser pull, side og brem — den enkleste i kolleksjonen. Hvit tekst på svart bunn krever jevn heklefasthet for at bokstavene skal stå skarpt.',
      'Mønsteret fortsetter ubrutt ned i bremmen, og bare de to nederste rundene hekles hvite som kant.',
    ],
    tipsEn: [
      'A black ground crossed by just three white bundles over crown, wall and brim — the simplest in the collection. White lettering on black needs even tension for the letters to stay sharp.',
      'The pattern carries on unbroken onto the brim, and only the last two rounds are worked in white as the edge.',
    ],
  },
  'norway26-training': {
    nameNo: "NORWAY'26 Trening-hatten",
    nameEn: "the NORWAY'26 Training hat",
    creditNo: NORWAY_CREDIT_NO,
    creditEn: NORWAY_CREDIT_EN,
    tipsNo: [
      'Prematch-trøya er kolleksjonens vanskeligste: femten tette sikksakk-striper i rødt, marineblått, hvitt og lyseblått, uten ensfargede flater noe sted. Regn med fargebytter i nesten hver eneste maske — hold de passive trådene løse, ellers strammer hatten seg.',
      'Hvitt runisk NORGE foran og bak. Mønsteret går ubrutt helt ut i bremmen, og bare de to siste rundene hekles marineblå.',
    ],
    tipsEn: [
      'The pre-match top is the hardest in the collection: fifteen tight zigzag stripes in red, navy, off-white and periwinkle, with no plain area anywhere. Expect a colour change in nearly every stitch — keep the unused strands loose or the hat will pull in.',
      'White runic NORGE front and back. The pattern runs unbroken all the way onto the brim, and only the last two rounds are worked in navy.',
    ],
  },
  'norway26-keeper': {
    nameNo: "NORWAY'26 Keeper-hatten",
    nameEn: "the NORWAY'26 Goalkeeper hat",
    creditNo: NORWAY_CREDIT_NO,
    creditEn: NORWAY_CREDIT_EN,
    tipsNo: [
      'Keeperdrakten er varm hele veien: tette sikksakk-striper i mørkere gult, oransje og rosa over den sterke gule bunnen, uten en eneste grå tone. Kolleksjonens mest krevende hatt.',
      'Svart runisk NORGE foran og bak. Mønsteret går ubrutt ned i bremmen, og bare de to siste rundene hekles svarte.',
    ],
    tipsEn: [
      'The goalkeeper shirt is warm the whole way: tight zigzag stripes in deeper gold, orange and pink over the strong yellow ground, without a single grey tone. The most demanding hat in the collection.',
      'Black runic NORGE front and back. The pattern runs unbroken onto the brim, and only the last two rounds are worked in black.',
    ],
  },
  custom: {
    nameNo: 'ditt eget MASKLAB-design',
    nameEn: 'your own MASKLAB design',
    creditNo: ['Designet er ditt eget, laget i MASKLAB-studioet.'],
    creditEn: ['The design is your own, made in the MASKLAB studio.'],
  },
};

const RO_PDF =
  'https://helenespilling.com/wp-content/uploads/2026/06/RO-DET-I-LAND-HATTEN.pdf';
const HELENE_URL = 'https://helenespilling.com';

export function welcomeCopy(id: PatternId, locale: 'no' | 'en'): WelcomeCopy {
  const no = locale === 'no';
  if (id === 'ro-ro-ro') {
    return {
      brandWelcome: no ? 'Ro det i land hatten' : 'Ro det i land hat',
      brandBy: no ? 'av Helene Spilling' : 'by Helene Spilling',
      brandKicker: 'Ro det i land',
      titleEm: no ? 'ro det i land' : 'bring it home',
      lede: no
        ? 'Hekle «Ro det i land»-hatten av Helene Spilling — én runde av gangen. Passer både deg som kan hekle, og deg som aldri har rørt en heklepinne. Hatten i 3D vokser mens du hekler.'
        : 'Crochet the “Ro det i land” hat by Helene Spilling — one round at a time. For crocheters and complete beginners. The 3D hat grows as you work.',
      pdfUrl: RO_PDF,
      footName: 'Helene Spilling',
      footUrl: HELENE_URL,
    };
  }
  if (id === 'martin') {
    return {
      brandWelcome: no ? 'Vi som elsker Martin' : 'Vi som elsker Martin',
      brandBy: no ? 'av Helene Spilling' : 'by Helene Spilling',
      brandKicker: 'ØDEGAARD',
      titleEm: no ? 'elske Martin' : 'love Martin',
      lede: no
        ? 'Hekle «Vi som elsker Martin»-hatten av Helene Spilling — ØDEGAARD i hvitt på rød bunn, én runde av gangen. Hatten i 3D vokser mens du hekler.'
        : 'Crochet the “Vi som elsker Martin” hat by Helene Spilling — ØDEGAARD in white on red, one round at a time. The 3D hat grows as you work.',
      pdfUrl: null,
      footName: 'Helene Spilling',
      footUrl: HELENE_URL,
    };
  }
  if (id === 'flagget') {
    return {
      brandWelcome: no ? 'Flagget til topps' : 'Flagget til topps',
      brandBy: no ? 'av Helene Spilling' : 'by Helene Spilling',
      brandKicker: 'Flagget til topps',
      titleEm: no ? 'flagget til topps' : 'raise the flag',
      lede: no
        ? 'Hekle «Flagget til topps»-hatten av Helene Spilling — vertikale flaggstriper gjennom hele hatten. Avansert fargemønster, med komplett guide.'
        : 'Crochet the “Flagget til topps” hat by Helene Spilling — vertical flag stripes through the whole hat. Advanced colorwork, with a complete guide.',
      pdfUrl: null,
      footName: 'Helene Spilling',
      footUrl: HELENE_URL,
    };
  }
  if (id === 'norway26') {
    return {
      brandWelcome: "NORWAY'26",
      brandBy: no ? 'Drakt-kit · MASKLAB' : 'Kit hat · MASKLAB',
      brandKicker: "NORWAY'26",
      titleEm: 'NORGE',
      lede: no
        ? "Hekle NORWAY'26 Drakt — diagonale ikat-striper i draktfargene over marineblå bunn, med runisk NORGE foran og bak. Komplett guide, én runde av gangen."
        : "Crochet the NORWAY'26 kit hat — diagonal ikat streaks in the shirt colours over a navy ground, with runic NORGE front and back. Complete guide, one round at a time.",
      pdfUrl: null,
      footName: 'MASKLAB',
      footUrl: null,
    };
  }
  if (id === 'norway26-white') {
    return {
      brandWelcome: "NORWAY'26 Hvit",
      brandBy: no ? 'Hvit kit · MASKLAB' : 'White kit · MASKLAB',
      brandKicker: "NORWAY'26",
      titleEm: no ? 'hvit' : 'white',
      lede: no
        ? "Hekle NORWAY'26 Hvit — hvit bunn med marineblå bunter og runisk NORGE i marineblått. Komplett guide, én runde av gangen."
        : "Crochet NORWAY'26 White — a white ground with blue brush streaks and runic NORGE in navy. Complete guide, one round at a time.",
      pdfUrl: null,
      footName: 'MASKLAB',
      footUrl: null,
    };
  }
  if (id === 'norway26-black') {
    return {
      brandWelcome: "NORWAY'26 Svart",
      brandBy: no ? 'Svart kit · MASKLAB' : 'Black kit · MASKLAB',
      brandKicker: "NORWAY'26",
      titleEm: no ? 'svart' : 'black',
      lede: no
        ? "Hekle NORWAY'26 Svart — svart bøttehatt med tre hvite buntstrøk, runisk NORGE i hvitt og hvit kant. Den enkleste i kolleksjonen, med komplett guide."
        : "Crochet NORWAY'26 Black — an all-black bucket hat with runic NORGE in white and a white edge. The simplest in the collection, with a complete guide.",
      pdfUrl: null,
      footName: 'MASKLAB',
      footUrl: null,
    };
  }
  if (id === 'norway26-training') {
    return {
      brandWelcome: "NORWAY'26 Trening",
      brandBy: no ? 'Trening-kit · MASKLAB' : 'Training kit · MASKLAB',
      brandKicker: "NORWAY'26",
      titleEm: no ? 'trene' : 'train',
      lede: no
        ? "Hekle NORWAY'26 Trening — lyseblå bunn med rolige diagonaler og runisk NORGE i marineblått. Komplett guide, én runde av gangen."
        : "Crochet NORWAY'26 Training — a light-blue ground with calm diagonals and runic NORGE in navy. Complete guide, one round at a time.",
      pdfUrl: null,
      footName: 'MASKLAB',
      footUrl: null,
    };
  }
  if (id === 'norway26-keeper') {
    return {
      brandWelcome: "NORWAY'26 Keeper",
      brandBy: no ? 'Keeper-kit · MASKLAB' : 'Goalkeeper kit · MASKLAB',
      brandKicker: "NORWAY'26",
      titleEm: no ? 'keeper' : 'keeper',
      lede: no
        ? "Hekle NORWAY'26 Keeper — gul bunn med tonale bunter i grått, fersken og rosa, og svart runisk NORGE. Komplett guide, én runde av gangen."
        : "Crochet NORWAY'26 Keeper — a yellow ground with a peach and golden zigzag, and black runic NORGE. Complete guide, one round at a time.",
      pdfUrl: null,
      footName: 'MASKLAB',
      footUrl: null,
    };
  }
  return {
    brandWelcome: 'MASKLAB',
    brandBy: no ? 'egendefinert' : 'custom',
    brandKicker: 'MASKLAB',
    titleEm: no ? 'designe' : 'design',
    lede: no
      ? 'Hekle ditt eget MASKLAB-design — én runde av gangen.'
      : 'Crochet your own MASKLAB design — one round at a time.',
    pdfUrl: null,
    footName: 'MASKLAB',
    footUrl: null,
  };
}
