/**
 * 3D contact sheet for the two prototype hats.
 *
 * Drives the REAL guide route on a share link, so what gets shot is the same
 * derived pattern the recipe text is written from — not a mock.
 *
 *   npx tsx scripts/shot-proto.ts [baseUrl] [outDir]
 */
import puppeteer, { type Page } from 'puppeteer-core';
import { mkdirSync } from 'node:fs';
import { encodeDesign } from '../src/studio/serialize';
import type { StudioDesign } from '../src/studio/design';
import { HAT_A, HAT_B } from './proto-masklab';

const BASE = process.argv[2] ?? 'http://127.0.0.1:5175';
const OUT = process.argv[3] ?? '/tmp/masklab-proto';

const ANGLES: { name: string; cam: [number, number, number, number] }[] = [
  { name: 'front', cam: [0, 13, 82, 8] },
  { name: 'three-quarter', cam: [52, 34, 60, 8] },
  { name: 'top', cam: [0, 74, 26, 6] },
];

async function shot(page: Page, name: string, design: StudioDesign) {
  const url = `${BASE}/oppskrift/custom?d=${encodeDesign(design)}`;
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
  await new Promise((r) => setTimeout(r, 1200));
  await page.evaluate(() => {
    (document.querySelector('.welcome-start') as HTMLButtonElement | null)?.click();
  });
  await new Promise((r) => setTimeout(r, 900));
  await page.evaluate(() => {
    // @ts-expect-error dev hook
    const api = window.__robo;
    api?.gotoStepId('done');
    api?.closeOverlays?.();
  });
  await new Promise((r) => setTimeout(r, 5200));

  for (const a of ANGLES) {
    const [px, py, pz, ty] = a.cam;
    await page.evaluate(
      (x: number, y: number, z: number, t: number) => {
        // @ts-expect-error dev hook
        window.__roboCam?.(x, y, z, t);
      },
      px,
      py,
      pz,
      ty,
    );
    await new Promise((r) => setTimeout(r, 700));
    const el = await page.$('#scene-root');
    const path = `${OUT}/${name}_${a.name}.png` as const;
    if (el) await el.screenshot({ path });
    else await page.screenshot({ path });
    console.log('  wrote', path);
  }
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
    args: ['--window-size=1200,1000', '--use-gl=angle', '--hide-scrollbars'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 1000, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.log('PAGE EXCEPTION:', (e as Error).message));

  console.log('shot a-lyn');
  await shot(page, 'a-lyn', HAT_A);
  console.log('shot b-skifer');
  await shot(page, 'b-skifer', HAT_B);

  await browser.close();
  console.log('done →', OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
