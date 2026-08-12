import type { YarnColor } from '../../data/types';
import type { ShapeId } from '../../data/shapes/catalog';

/**
 * Reading a hat brief.
 *
 * "retro norsk supporterhatt, NORGE foran, nordiske detaljer, rødt hvitt og
 * blått" has to come out the other side as yarn colours, a wordmark and a
 * couple of motifs — and nothing else, because everything the studio makes
 * has to be an editable layer on a real stitch grid. So this is a reader, not
 * a generator: it finds the things the catalogue already knows how to build.
 */

export type Theme = 'football' | 'nordic' | 'retro' | 'minimal' | 'bold';

export interface Brief {
  /** Words to set in yarn, in the order they were asked for. */
  words: string[];
  /** Yarns the user named, most important first. */
  colors: YarnColor[];
  themes: Set<Theme>;
  /** Motifs named outright. */
  motifs: ShapeId[];
  /** The raw text, kept so the studio can show what it understood. */
  source: string;
}

const COLOR_WORDS: [RegExp, YarnColor][] = [
  [/\b(lyseblå|lyse blå|light ?blue|babyblå)\b/, 'lightblue'],
  [/\b(mørkeblå|marineblå|navy|blå|blue|blått|blaa)\b/, 'blue'],
  [/\b(rød|rødt|roed|red|raud)\b/, 'red'],
  [/\b(hvit|hvitt|white|kvit)\b/, 'white'],
  [/\b(svart|black|sort)\b/, 'black'],
  [/\b(gul|gult|yellow)\b/, 'yellow'],
  [/\b(gull|gyllen|gold|golden)\b/, 'gold'],
  [/\b(fersken|peach|laks)\b/, 'peach'],
  [/\b(rosa|pink)\b/, 'pink'],
  [/\b(lys ?grå|light ?gr[ea]y|stone)\b/, 'stone'],
  [/\b(grå|gr[ea]y|slate)\b/, 'slate'],
];

// Norwegian glues words together — "fotballhatt", "supporterlue",
// "vikingskip" — so a theme matches on the stem, not on a whole word.
const THEME_WORDS: [RegExp, Theme][] = [
  [
    /\b(fotball|football|soccer|supporter|kamp|liga|klubb|club|landslag|vm|em|world ?cup|stadion)/,
    'football',
  ],
  [
    /\b(norsk|norge|norway|norwegian|nordisk|nordic|scandi|skandinav|selbu|viking|fjell|fjord|rein|ski|snø|snow|lusekofte|marius)/,
    'nordic',
  ],
  [/\b(retro|vintage|gammeldags|70|80|nostalgi|classic|klassisk)/, 'retro'],
  [/\b(minimal|enkel|enkelt|clean|rolig|stilren|sober)/, 'minimal'],
  [/\b(bold|kraftig|dristig|stor|statement|tøff|loud)/, 'bold'],
];

const MOTIF_WORDS: [RegExp, ShapeId][] = [
  [/\b(norsk flagg|norwegian flag|flagget|flagg|flag)\b/, 'flag-no'],
  [/\b(nordisk kors|nordic cross|kors)\b/, 'nordic-cross'],
  [/\b(selburose|selbu|rosett|rosette|åttebladrose)\b/, 'selbu'],
  [/\b(fotball|ball|football)\b/, 'ball'],
  [/\b(pokal|trophy|cup)\b/, 'trophy'],
  [/\b(skjerf|scarf)\b/, 'scarf'],
  [/\b(drakt|jersey|shirt|trøye)\b/, 'jersey'],
  [/\b(skjold|shield|crest|emblem)\b/, 'shield'],
  [/\b(krone|crown)\b/, 'crown'],
  [/\b(vimpel|pennant)\b/, 'pennant'],
  [/\b(bane|pitch)\b/, 'pitch'],
  [/\b(sko|boot|støvel)\b/, 'boot'],
  [/\b(mål|goal)\b/, 'goal'],
  [/\b(fjell|mountain|topp)\b/, 'mountain'],
  [/\b(gran|grantre|pine|tre|tree|skog)\b/, 'pine'],
  [/\b(snøkrystall|snøfnugg|snowflake|snø)\b/, 'snowflake'],
  [/\b(vikingskip|langskip|longship|viking)\b/, 'longship'],
  [/\b(rein|reinsdyr|reindeer|elg)\b/, 'reindeer'],
  [/\b(ski|slalåm)\b/, 'ski'],
  [/\b(fjord|bølge|wave)\b/, 'fjord'],
  [/\b(stjerne|star)\b/, 'star'],
  [/\b(hjerte|heart)\b/, 'heart'],
  [/\b(lyn|lightning|bolt)\b/, 'lightning'],
  [/\b(diamant|rute|diamond)\b/, 'diamond'],
];

/** Stop-words that look like wordmarks but are not. */
const NOT_A_WORDMARK = new Set([
  'HAT',
  'HATT',
  'BØTTEHATT',
  'OG',
  'AND',
  'MED',
  'WITH',
  'PÅ',
  'ON',
  'FRONT',
  'FORAN',
  'THE',
  'A',
  'I',
  'EN',
  'ET',
  'DETALJER',
  'DETAILS',
  'STIL',
  'STYLE',
  'FARGER',
  'COLORS',
  'COLOURS',
]);

/**
 * The wordmark: whatever sits in quotes, or the longest all-caps token, or a
 * word that follows "skriv"/"tekst"/"says". Failing all that, nothing — an
 * invented slogan is worse than a clean hat.
 */
function findWords(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(/[«"'"]([^«»"'"]{1,20})[»"'"]/g)) {
    const w = m[1].trim();
    if (w) out.push(w.toUpperCase());
  }
  for (const m of text.matchAll(
    /\b(?:skriv|tekst|sier|says|reading|text|med teksten)\s+([\p{L}0-9' ]{2,20}?)(?:[,.]|$| p[åa] )/giu,
  )) {
    const w = m[1].trim();
    if (w) out.push(w.toUpperCase());
  }
  if (out.length === 0) {
    for (const m of text.matchAll(/\b([A-ZÆØÅ][A-ZÆØÅ0-9'-]{1,15})\b/g)) {
      const w = m[1];
      if (!NOT_A_WORDMARK.has(w)) out.push(w);
    }
  }
  // De-duplicate, keep order, cap at two — a bucket hat band holds a wordmark
  // and maybe a small second line, never a paragraph.
  const seen = new Set<string>();
  return out.filter((w) => (seen.has(w) ? false : (seen.add(w), true))).slice(0, 2);
}

export function parseBrief(text: string): Brief {
  const low = text.toLowerCase();
  const colors: YarnColor[] = [];
  for (const [re, c] of COLOR_WORDS) {
    const m = low.match(re);
    if (m && !colors.includes(c)) colors.push(c);
  }

  const themes = new Set<Theme>();
  for (const [re, t] of THEME_WORDS) if (re.test(low)) themes.add(t);

  const motifs: ShapeId[] = [];
  for (const [re, id] of MOTIF_WORDS) {
    if (re.test(low) && !motifs.includes(id)) motifs.push(id);
  }

  // "norsk" without a named motif still means Nordic detailing.
  if (themes.has('nordic') && motifs.length === 0) motifs.push('selbu');
  if (themes.has('football') && motifs.length === 0) motifs.push('ball');

  return { words: findWords(text), colors, themes, motifs, source: text };
}

/** A readable summary of what was understood, shown back to the user. */
export function describeBrief(b: Brief): string {
  const bits: string[] = [];
  if (b.words.length) bits.push(`tekst «${b.words.join(' / ')}»`);
  if (b.colors.length) bits.push(`${b.colors.length} garn`);
  if (b.motifs.length) bits.push(`${b.motifs.length} motiv`);
  if (b.themes.size) bits.push([...b.themes].join(' + '));
  return bits.length ? bits.join(' · ') : 'fritt valg';
}
