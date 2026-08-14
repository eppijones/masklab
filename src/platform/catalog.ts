import type { PatternId } from '../patterns/types';
import type { YarnColor } from '../data/types';

/**
 * Card metadata for the eight patterns, grouped in three shelves.
 *
 * NORWAY'26 is the three hats actually being made — Home, Away, Keeper. The
 * two earlier drafts (the navy Hjemme and the white one) still work end to
 * end, keep their URLs and anyone's saved progress, and simply moved to
 * `arkiv` rather than being deleted.
 */
export interface CatalogEntry {
  id: Exclude<PatternId, 'custom'>;
  name: string;
  collection: 'helene' | 'norway26' | 'arkiv';
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
    id: 'norway26-training',
    name: 'NORGE · Home',
    collection: 'norway26',
    difficulty: 'avansert',
    desc: 'Hjemmehatten: tolv brede sikksakk-striper i marineblått, hvitt og lyseblått som skjærer over rød bunn, fra pullen og ut i bremmen. NORGE i kremhvit kursiv på ren rød bunn, to marineblå kantrunder. Kolleksjonens vanskeligste.',
    colors: ['red', 'blue', 'white', 'lightblue'],
    hook: '4,0 mm',
    time: '6–8 t',
    tag: 'NY',
  },
  {
    id: 'norway26-black',
    name: 'NORGE · Away',
    collection: 'norway26',
    difficulty: 'enkel',
    desc: 'Bortehatten: svart bunn med tolv sikksakk-strøk der grått og hvitt veksler annenhver, over pull, side og brem. NORGE i hvit kursiv foran og bak, og to hvite kantrunder nederst. Samme kamuflasje som de andre — men bare tre garn, og kolleksjonens enkleste å hekle.',
    colors: ['black', 'slate', 'white'],
    hook: '4,0 mm',
    time: '5–7 t',
    tag: 'NY',
  },
  {
    id: 'norway26-keeper',
    name: 'NORGE · Keeper',
    collection: 'norway26',
    difficulty: 'avansert',
    desc: 'Keeperhatten: sterk gul med store sikksakk-strøk i gyllent, oransje og rosa — bare varme farger, ingen grå. NORGE i svart kursiv på ubrutt gul bunn, og to svarte kantrunder nederst.',
    colors: ['yellow', 'gold', 'orange', 'pink', 'black'],
    hook: '4,0 mm',
    time: '8–10 t',
    tag: 'NY',
  },
  {
    id: 'norway26',
    name: 'NORGE · Marineblå',
    collection: 'arkiv',
    difficulty: 'avansert',
    desc: 'Første utkast til hjemmehatten: tolv brede sikksakk-strøk i rødt, hvitt og lyseblått over marineblå bunn, fra pullens midte og ubrutt helt ut i bremmen. NORGE i kremhvit kursiv foran og bak. Komplett guide, som før.',
    colors: ['blue', 'red', 'white', 'lightblue'],
    hook: '4,0 mm',
    time: '8–10 t',
  },
  {
    id: 'norway26-white',
    name: 'NORGE · Hvit',
    collection: 'arkiv',
    difficulty: 'middels',
    desc: 'Den roligste av utkastene: varm hvit bunn med brede marineblå og lyseblå bånd fra pullen og helt ned, og rødt som enkeltstrek. NORGE i marineblå kursiv foran og bak. Komplett guide, som før.',
    colors: ['white', 'blue', 'lightblue', 'red'],
    hook: '4,0 mm',
    time: '6–8 t',
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
