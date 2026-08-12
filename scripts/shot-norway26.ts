/**
 * NORWAY'26 collection contact sheet.
 *
 * Renders all five kits from the real guide route (so it is the actual derived
 * recipe on screen, not a mock) at a shared product-photography camera, and
 * writes one PNG per kit plus the /oppskrifter grid.
 *
 * Usage: npx tsx scripts/shot-norway26.ts [baseUrl] [outDir]
 */
import puppeteer, { type Page } from 'puppeteer-core';
import { mkdirSync } from 'node:fs';

const BASE = process.argv[2] ?? 'http://127.0.0.1:5173';
const OUT = process.argv[3] ?? '/tmp/norway26';

const KITS = [
  'norway26',
  'norway26-white',
  'norway26-black',
  'norway26-training',
  'norway26-keeper',
] as const;

/** Product view + a crown-down view, so silhouette and field both get checked. */
const ANGLES: { name: string; cam: [number, number, number, number] }[] = [
  { name: 'front', cam: [0, 13, 82, 8] },
  { name: 'three-quarter', cam: [52, 34, 60, 8] },
];

async function shotKit(page: Page, id: string) {
  await page.goto(`${BASE}/oppskrift/${id}`, {
    waitUntil: 'networkidle0',
    timeout: 60000,
  });
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
  // Let the finale confetti clear before shooting the product view.
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
    await new Promise((r) => setTimeout(r, 600));
    const el = await page.$('#scene-root');
    const path = `${OUT}/${id}_${a.name}.png` as const;
    if (el) await el.screenshot({ path });
    else await page.screenshot({ path });
    console.log('  wrote', path);
  }
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await puppeteer.launch({
    executablePath:
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
    args: ['--window-size=1200,1000', '--use-gl=angle', '--hide-scrollbars'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 1000, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.log('PAGE EXCEPTION:', (e as Error).message));

  for (const id of KITS) {
    console.log('shot', id);
    await shotKit(page, id);
  }

  console.log('shot /oppskrifter');
  await page.goto(`${BASE}/oppskrifter`, { waitUntil: 'networkidle0', timeout: 60000 });
  await new Promise((r) => setTimeout(r, 3500));
  await page.evaluate(() => {
    const tab = [...document.querySelectorAll('button')].find((b) =>
      (b.textContent ?? '').includes("NORWAY'26"),
    );
    tab?.click();
  });
  await new Promise((r) => setTimeout(r, 4000));
  // The cards mount their WebGL context only while near the viewport, so a
  // fullPage grab of an unscrolled page catches the lower ones as placeholders.
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 400) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 250));
    }
    window.scrollTo(0, 0);
  });
  await new Promise((r) => setTimeout(r, 3500));
  await page.screenshot({ path: `${OUT}/grid.png`, fullPage: true });

  await browser.close();
  console.log('done →', OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
