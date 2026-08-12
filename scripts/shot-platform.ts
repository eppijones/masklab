/**
 * Screenshot MASKLAB platform routes + all six guides + /helene.
 * Usage: npx tsx scripts/shot-platform.ts [baseUrl]
 */
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';

const BASE = process.argv[2] ?? 'http://127.0.0.1:5173';
const OUT = '/tmp/masklab-shots';

const ROUTES = [
  '/',
  '/oppskrifter',
  '/kolleksjon',
  '/studio',
  '/oppskrift/ro-ro-ro',
  '/oppskrift/flagget',
  '/oppskrift/martin',
  '/oppskrift/norway26',
  '/oppskrift/norway26-white',
  '/oppskrift/norway26-black',
  '/oppskrift/norway26-training',
  '/oppskrift/norway26-keeper',
  '/helene',
];

function slug(path: string): string {
  return path === '/' ? 'home' : path.replace(/^\//, '').replace(/\//g, '_');
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await puppeteer.launch({
    executablePath:
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
    args: ['--window-size=1440,1100', '--use-gl=angle'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1100, deviceScaleFactor: 1 });
  page.on('pageerror', (e) =>
    console.log('PAGE EXCEPTION:', (e as Error).message),
  );

  for (const route of ROUTES) {
    const url = `${BASE}${route}`;
    console.log('shot', route);
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
    await new Promise((r) => setTimeout(r, 1800));
    // Guides: leave welcome if present so we see the 3D hat, then jump to done.
    const isGuide =
      route.startsWith('/oppskrift/') || route === '/helene';
    if (isGuide) {
      await page.evaluate(() => {
        const btn = document.querySelector(
          '.welcome-start',
        ) as HTMLButtonElement | null;
        btn?.click();
      });
      await new Promise((r) => setTimeout(r, 1200));
      await page.evaluate(() => {
        // @ts-expect-error dev hook
        const api = window.__robo;
        if (api) {
          api.gotoStepId('done');
          api.closeOverlays?.();
        }
      });
      await new Promise((r) => setTimeout(r, 1600));
    }
    await page.screenshot({
      path: `${OUT}/${slug(route)}.png`,
      fullPage: !isGuide,
    });
  }

  await browser.close();
  console.log(`Wrote ${ROUTES.length} shots to ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
