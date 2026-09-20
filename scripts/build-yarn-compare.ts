/**
 * Assembles the standalone "one yarn vs four" concept page.
 *
 * Everything is inlined — three.js, both Karla weights and the NORGE Home
 * stitch dump — so the finished file is one HTML you can upload anywhere, or
 * open off a USB stick, with nothing to fetch.
 *
 *   npx tsx scripts/build-yarn-compare.ts
 */
import { readFileSync, writeFileSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..');
const OUT = join(ROOT, 'design', 'yarn-compare.html');
const DATA = join(ROOT, 'scripts', '.yarn-compare-data.json');

// 1. Fresh stitch dump straight out of the pattern engine.
execFileSync('npx', ['tsx', join(ROOT, 'scripts', 'dump-yarn-compare.ts'), DATA], {
  cwd: ROOT,
  stdio: 'inherit',
});

// 2. Bundle three to a single IIFE that hangs the namespace on `THREE`. The
//    shipped ESM build is split across three.module.min.js + three.core.min.js
//    and imports across the two, so it cannot just be pasted into a page.
const ENTRY = join(ROOT, 'scripts', '.three-entry.js');
const BUNDLE = join(ROOT, 'scripts', '.three-bundle.js');
writeFileSync(ENTRY, "import * as THREE from 'three';\nglobalThis.THREE = THREE;\n");
execFileSync(
  join(ROOT, 'node_modules/.bin/esbuild'),
  [ENTRY, '--bundle', '--minify', '--format=iife', '--target=es2020', `--outfile=${BUNDLE}`],
  { cwd: ROOT, stdio: 'inherit' },
);
const three = readFileSync(BUNDLE, 'utf8');
const b64 = (p: string) => readFileSync(join(ROOT, p)).toString('base64');

let html = readFileSync(join(ROOT, 'scripts', 'yarn-compare.tpl.html'), 'utf8');
const fills: Record<string, () => string> = {
  '@@THREE@@': () => three,
  '@@DATA@@': () => readFileSync(DATA, 'utf8'),
  '@@FONT_MEDIUM@@': () => b64('public/fonts/Karla-Medium.ttf'),
  '@@FONT_BOLD@@': () => b64('public/fonts/Karla-ExtraBold.ttf'),
};
// Checked against the TEMPLATE, not the output: three's own source carries a
// `window.__THREE__` version guard, so scanning the assembled file for
// leftovers finds the library's globals rather than our placeholders.
for (const token of Object.keys(fills)) {
  if (!html.includes(token)) throw new Error(`template is missing ${token}`);
  html = html.replace(token, fills[token]);
}

writeFileSync(OUT, html);
console.log(`wrote ${OUT} — ${(statSync(OUT).size / 1e6).toFixed(2)} MB, self-contained`);
