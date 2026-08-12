/**
 * Multi-angle hat screenshots for geometry iteration.
 * Flagget + RO × Arbeid + Ferdig × top/side/three-quarter/below.
 *
 * Usage: npx tsx scripts/shot-hat-angles.ts [baseUrl] [outDir]
 */
import puppeteer, { type Page } from 'puppeteer-core';
import { mkdirSync } from 'node:fs';

const BASE = process.argv[2] ?? 'http://127.0.0.1:5173';
const OUT = process.argv[3] ?? '/tmp/hat-geom';

/**
 * Which hats to shoot. Override from the shell with a comma-separated list of
 * pattern ids — the NORWAY kits are here because the top-down angle is the only
 * shot that proves the crown spiral runs all the way to the centre.
 */
const ALL_PATTERNS = [
  { id: 'flagget', slug: 'flagget' },
  { id: 'ro-ro-ro', slug: 'ro-ro-ro' },
  { id: 'norway26', slug: 'norway26' },
  { id: 'norway26-white', slug: 'norway26-white' },
  { id: 'norway26-black', slug: 'norway26-black' },
  { id: 'norway26-training', slug: 'norway26-training' },
  { id: 'norway26-keeper', slug: 'norway26-keeper' },
] as const;

const only = process.env.SHOT_PATTERNS?.split(',').map((s) => s.trim());
const PATTERNS = only
  ? ALL_PATTERNS.filter((p) => only.includes(p.id))
  : ALL_PATTERNS.slice(0, 2);

const VIEWS = [
  { name: 'ferdig', mode: 'finished' as const },
  { name: 'arbeid', mode: 'working' as const },
] as const;

/** Camera presets: __roboCam(px, py, pz, targetY) */
const ANGLES: { name: string; cam: [number, number, number, number] }[] = [
  { name: 'top', cam: [0.1, 88, 0.1, 10] },
  { name: 'side', cam: [0, 14, 72, 10] },
  { name: 'three-quarter', cam: [48, 28, 56, 10] },
  { name: 'below', cam: [28, -22, 36, 6] },
];

async function setView(page: Page, mode: 'finished' | 'working') {
  await page.evaluate((m) => {
    // @ts-expect-error dev hook — bypasses finale button lock
    window.__robo?.setViewMode?.(m);
  }, mode);
  await new Promise((r) => setTimeout(r, 700));
}

async function shotPattern(
  page: Page,
  slug: string,
  tag: string,
) {
  const url = `${BASE}/oppskrift/${slug}`;
  console.log('goto', url);
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
  await new Promise((r) => setTimeout(r, 1200));
  await page.evaluate(() => {
    const btn = document.querySelector(
      '.welcome-start',
    ) as HTMLButtonElement | null;
    btn?.click();
  });
  await new Promise((r) => setTimeout(r, 900));
  await page.evaluate(() => {
    // @ts-expect-error dev hook
    const api = window.__robo;
    if (!api) throw new Error('window.__robo missing');
    api.gotoStepId('done');
    api.closeOverlays?.();
  });
  await new Promise((r) => setTimeout(r, 1400));

  for (const view of VIEWS) {
    await setView(page, view.mode);
    // Working flip shifts the hat — nudge targetY for Arbeid shots
    const tyBoost = view.name === 'arbeid' ? 4 : 0;
    for (const angle of ANGLES) {
      const [px, py, pz, ty] = angle.cam;
      await page.evaluate(
        (a: number, b: number, c: number, d: number) => {
          // @ts-expect-error dev hook
          window.__roboCam?.(a, b, c, d);
        },
        px,
        py,
        pz,
        ty + tyBoost,
      );
      await new Promise((r) => setTimeout(r, 550));
      const path = `${OUT}/${tag}_${slug}_${view.name}_${angle.name}.png`;
      await page.screenshot({ path });
      console.log('  wrote', path);
    }
  }
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await puppeteer.launch({
    executablePath:
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
    args: ['--window-size=1400,1000', '--use-gl=angle', '--hide-scrollbars'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 1000, deviceScaleFactor: 1 });
  page.on('pageerror', (e) =>
    console.log('PAGE EXCEPTION:', (e as Error).message),
  );

  const tag = process.env.SHOT_TAG ?? 'cur';
  for (const p of PATTERNS) {
    await shotPattern(page, p.slug, tag);
  }

  await browser.close();
  console.log('done →', OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
