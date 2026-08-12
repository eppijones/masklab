import type { PatternId } from '../patterns/types';
import type { YarnColor } from '../data/types';

/** Card metadata for the six patterns, grouped in two collections. */
export interface CatalogEntry {
  id: Exclude<PatternId, 'custom'>;
  name: string;
  collection: 'helene' | 'norway26';
  difficulty: string;
  desc: string;
  colors: YarnColor[];
  hook: string;
  time: string;
  tag?: string;
  /** Official PDF (Helene's patterns only). */
  pdfUrl?: string;
}

export const HELENE_URL = 'https://helenespilling.com';

export const CATALOG: CatalogEntry[] = [
  {
    id: 'ro-ro-ro',
    name: 'Ro det i land',
    collection: 'helene',
    difficulty: 'middels',
    desc: 'Originalen som rodde VM i land — RO RO RO i kursiv rundt en ullhvit bøttehatt med Helenes bølgekant.',
    colors: ['white', 'red', 'blue'],
    hook: '4,0 mm',
    time: '6–8 t',
    pdfUrl:
      'https://helenespilling.com/wp-content/uploads/2026/06/RO-DET-I-LAND-HATTEN.pdf',
  },
  {
    id: 'flagget',
    name: 'Flagget til topps',
    collection: 'helene',
    difficulty: 'avansert',
    desc: 'Vertikale flaggstriper gjennom hele hatten — topp, midtparti og kant. Hyppige fargebytter, transkribert runde for runde fra PDF-en.',
    colors: ['red', 'white', 'blue'],
    hook: '3,5–4,0 mm',
    time: '8–10 t',
  },
  {
    id: 'martin',
    name: 'Vi som elsker Martin',
    collection: 'helene',
    difficulty: 'middels',
    desc: 'ØDEGAARD i hvitt på rød bunn, med stripete topp i rødt, hvitt og blått. 39 runder til 150 masker.',
    colors: ['red', 'white', 'blue'],
    hook: '4,0 mm',
    time: '6–8 t',
  },
  {
    id: 'norway26',
    name: "NORWAY'26 · Drakt",
    collection: 'norway26',
    difficulty: 'avansert',
    desc: 'Draktmønsteret som hekling: fire brede bunter i rødt, hvitt og lyseblått over marineblå bunn — NORGE i runisk kursiv foran og bak. Mønsteret går ubrutt helt ut i bremmen, med to hvite kantrunder nederst.',
    colors: ['blue', 'red', 'white', 'lightblue'],
    hook: '4,0 mm',
    time: '8–10 t',
    tag: 'NY',
  },
  {
    id: 'norway26-white',
    name: "NORWAY'26 · Hvit",
    collection: 'norway26',
    difficulty: 'middels',
    desc: 'Hvit bunn med marineblå og lyseblå bunter fra pullen og ned — NORGE i runisk kursiv marineblått foran og bak, og to røde kantrunder nederst.',
    colors: ['white', 'blue', 'lightblue', 'red'],
    hook: '4,0 mm',
    time: '6–8 t',
    tag: 'NY',
  },
  {
    id: 'norway26-black',
    name: "NORWAY'26 · Svart",
    collection: 'norway26',
    difficulty: 'enkel',
    desc: 'Svart bunn med tre hvite buntstrøk over pull, side og brem — NORGE i hvit runisk kursiv foran og bak, og to hvite kantrunder nederst. Kolleksjonens enkleste.',
    colors: ['black', 'white'],
    hook: '4,0 mm',
    time: '5–7 t',
    tag: 'NY',
  },
  {
    id: 'norway26-training',
    name: "NORWAY'26 · Trening",
    collection: 'norway26',
    difficulty: 'avansert',
    desc: 'Prematch-trøya, dekket fra topp til kant: ni tette sikksakk-bunter i rødt, marineblått, hvitt og lyseblått — ingen ensfargede flater noe sted. NORGE i hvit runisk kursiv, to marineblå kantrunder. Kolleksjonens vanskeligste.',
    colors: ['red', 'blue', 'white', 'lightblue'],
    hook: '4,0 mm',
    time: '6–8 t',
    tag: 'NY',
  },
  {
    id: 'norway26-keeper',
    name: "NORWAY'26 · Keeper",
    collection: 'norway26',
    difficulty: 'avansert',
    desc: 'Keeperdrakten: sterk gul med sikksakk i mørkere gult, oransje og rosa, lys grå som skille — NORGE i svart runisk kursiv, og to svarte kantrunder nederst.',
    colors: ['yellow', 'gold', 'orange', 'pink', 'stone', 'black'],
    hook: '4,0 mm',
    time: '8–10 t',
    tag: 'NY',
  },
];

export const HELENE_PDFS: Record<string, string> = {
  'ro-ro-ro':
    'https://helenespilling.com/wp-content/uploads/2026/06/RO-DET-I-LAND-HATTEN.pdf',
  flagget:
    'https://helenespilling.com/wp-content/uploads/2026/06/Flagget-til-topps-HATTEN.pdf',
  martin:
    'https://helenespilling.com/wp-content/uploads/2026/06/VI-SOM-ELSKER-MARTIN-HATTEN-1.pdf',
};
