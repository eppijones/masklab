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
    nameNo: "NORGE Marineblå-hatten",
    nameEn: "the NORGE Navy hat",
    creditNo: NORWAY_CREDIT_NO,
    creditEn: NORWAY_CREDIT_EN,
    tipsNo: [
      'Ikat-stripene løper diagonalt fra pullen og helt ut i bremmen — følg maske-for-maske-oppskriften i de mønstrede rundene, og hold de passive trådene løse.',
      'NORGE står i kursiv foran og bak, på ren marineblå bunn — ingen striper går inn i ordet. Mellom de to ordene er det et felt på tolv masker der mønsteret bryter gjennom fra pullen og ned i bremmen; bare de to siste rundene hekles hvite.',
    ],
    tipsEn: [
      'The ikat streaks run diagonally from the crown all the way onto the brim — follow the stitch-by-stitch recipe in the patterned rounds and keep the unused strands loose.',
      'NORGE sits in italics front and back on clean navy — no stripe enters the word. Between the two words there is a twelve-stitch channel where the pattern breaks through, crown to brim; only the last two rounds are worked in white.',
    ],
  },
  'norway26-white': {
    nameNo: "NORGE Hvit-hatten",
    nameEn: "the NORGE White hat",
    creditNo: NORWAY_CREDIT_NO,
    creditEn: NORWAY_CREDIT_EN,
    tipsNo: [
      'De marineblå buntene fortsetter fra pullen og nedover sidene, akkurat som på designarket — hold dem løse, ellers trekker den hvite bunnen seg sammen.',
      'NORGE i marineblå kursiv foran og bak, på ren hvit bunn. Mellom ordene bryter mønsteret gjennom og fortsetter ned i bremmen; bare de to siste rundene hekles røde — samme detalj som halslinningen på bortedrakten.',
    ],
    tipsEn: [
      'The navy bundles flow from the crown down the sides exactly as on the design sheet — keep them loose or the white ground will pull in.',
      'NORGE in navy italics front and back on clean white. Between the words the pattern breaks through and carries on onto the brim; only the last two rounds are worked in red — the away shirt\u2019s collar trim.',
    ],
  },
  'norway26-black': {
    nameNo: "NORGE Away-hatten",
    nameEn: "the NORGE Away hat",
    creditNo: NORWAY_CREDIT_NO,
    creditEn: NORWAY_CREDIT_EN,
    tipsNo: [
      'Svart bunn med tolv sikksakk-strøk der grått og hvitt veksler annenhver, over pull, side og brem — samme kamuflasje som Home og Keeper, men i bare tre garn: svart, grått og hvitt. Du har aldri mer enn to farger i gang samtidig.',
      'NORGE i hvit kursiv foran og bak, på ubrutt svart bunn. Mønsteret fortsetter ned i bremmen gjennom feltet mellom ordene, og bare de to nederste rundene hekles hvite som kant.',
    ],
    tipsEn: [
      'A black ground crossed by twelve zigzag strokes alternating grey and white over crown, wall and brim — the same camouflage as Home and Keeper, in three yarns only: black, grey and white. You never have more than two colours running at once.',
      'NORGE in white italics front and back on unbroken black. The pattern carries on onto the brim through the channel between the words, and only the last two rounds are worked in white as the edge.',
    ],
  },
  'norway26-training': {
    nameNo: "NORGE Home-hatten",
    nameEn: "the NORGE Home hat",
    creditNo: NORWAY_CREDIT_NO,
    creditEn: NORWAY_CREDIT_EN,
    tipsNo: [
      'Prematch-trøya er kolleksjonens vanskeligste: tolv brede sikksakk-striper i marineblått, hvitt og lyseblått som skjærer over den røde bunnen. Regn med fargebytter i de fleste mønstrede rundene — hold de passive trådene løse, ellers strammer hatten seg.',
      'Kremhvitt NORGE i kursiv foran og bak, på ren rød bunn. Mellom ordene går sikksakken ubrutt fra pullen og helt ut i bremmen, og bare de to siste rundene hekles marineblå.',
    ],
    tipsEn: [
      'The pre-match top is the hardest in the collection: twelve broad zigzag stripes in navy, off-white and periwinkle cutting across the red ground. Expect a colour change in most patterned rounds — keep the unused strands loose or the hat will pull in.',
      'Off-white NORGE in italics front and back on clean red. Between the words the zigzag runs unbroken from the crown all the way onto the brim, and only the last two rounds are worked in navy.',
    ],
  },
  'norway26-keeper': {
    nameNo: "NORGE Keeper-hatten",
    nameEn: "the NORGE Keeper hat",
    creditNo: NORWAY_CREDIT_NO,
    creditEn: NORWAY_CREDIT_EN,
    tipsNo: [
      'Keeperdrakten er varm hele veien: store sikksakk-strøk i gyllent, oransje og rosa over den sterke gule bunnen, uten en eneste grå tone.',
      'Svart NORGE i kursiv foran og bak, på ubrutt gul bunn — ingen rosa eller oransje kommer inn mellom bokstavene. De varme fargene går i stedet gjennom feltet mellom ordene, fra pullen og ned i bremmen; bare de to siste rundene hekles svarte.',
    ],
    tipsEn: [
      'The goalkeeper shirt is warm the whole way: large zigzag strokes in deeper gold, orange and pink over the strong yellow ground, without a single grey tone.',
      'Black NORGE in italics front and back on unbroken yellow — no pink or orange comes between the letters. The warm colours travel through the channel between the words instead, crown to brim; only the last two rounds are worked in black.',
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
      brandWelcome: "NORGE Marineblå",
      brandBy: no ? 'Arkiv · MASKLAB' : 'Archive · MASKLAB',
      brandKicker: "NORWAY'26",
      titleEm: 'NORGE',
      lede: no
        ? 'Hekle NORGE Marineblå — brede sikksakk-strøk i draktfargene over marineblå bunn, med NORGE i kursiv foran og bak. Komplett guide, én runde av gangen.'
        : 'Crochet NORGE Navy — broad zigzag strokes in the shirt colours over a navy ground, with NORGE in italics front and back. Complete guide, one round at a time.',
      pdfUrl: null,
      footName: 'MASKLAB',
      footUrl: null,
    };
  }
  if (id === 'norway26-white') {
    return {
      brandWelcome: "NORGE Hvit",
      brandBy: no ? 'Arkiv · MASKLAB' : 'Archive · MASKLAB',
      brandKicker: "NORWAY'26",
      titleEm: no ? 'hvit' : 'white',
      lede: no
        ? "Hekle NORWAY'26 Hvit — hvit bunn med brede marineblå bånd og NORGE i marineblå kursiv. Komplett guide, én runde av gangen."
        : "Crochet NORWAY'26 White — a white ground with broad navy bands and NORGE in navy italics. Complete guide, one round at a time.",
      pdfUrl: null,
      footName: 'MASKLAB',
      footUrl: null,
    };
  }
  if (id === 'norway26-black') {
    return {
      brandWelcome: "NORGE Away",
      brandBy: no ? 'Away-kit · MASKLAB' : 'Away kit · MASKLAB',
      brandKicker: "NORWAY'26",
      titleEm: no ? 'borte' : 'away',
      lede: no
        ? "Hekle NORGE Away — svart bøttehatt med sikksakk-strøk i grått og hvitt, NORGE i hvit kursiv og hvit kant. Tre garn, den enkleste i kolleksjonen, med komplett guide."
        : "Crochet NORGE Away — a black bucket hat with zigzag strokes in grey and white, NORGE in white italics and a white edge. Three yarns, the simplest in the collection, with a complete guide.",
      pdfUrl: null,
      footName: 'MASKLAB',
      footUrl: null,
    };
  }
  if (id === 'norway26-training') {
    return {
      brandWelcome: "NORGE Home",
      brandBy: no ? 'Home-kit · MASKLAB' : 'Home kit · MASKLAB',
      brandKicker: "NORWAY'26",
      titleEm: no ? 'hjemme' : 'home',
      lede: no
        ? "Hekle NORGE Home — rød bunn med brede sikksakk-striper og NORGE i kremhvit kursiv. Komplett guide, én runde av gangen."
        : "Crochet NORGE Home — a red ground with broad zigzag stripes and NORGE in off-white italics. Complete guide, one round at a time.",
      pdfUrl: null,
      footName: 'MASKLAB',
      footUrl: null,
    };
  }
  if (id === 'norway26-keeper') {
    return {
      brandWelcome: "NORGE Keeper",
      brandBy: no ? 'Keeper-kit · MASKLAB' : 'Goalkeeper kit · MASKLAB',
      brandKicker: "NORWAY'26",
      titleEm: no ? 'keeper' : 'keeper',
      lede: no
        ? "Hekle NORWAY'26 Keeper — gul bunn med store sikksakk-strøk i gyllent, oransje og rosa, og NORGE i svart kursiv. Komplett guide, én runde av gangen."
        : "Crochet NORWAY'26 Keeper — a yellow ground with a golden, orange and pink zigzag, and NORGE in black italics. Complete guide, one round at a time.",
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
