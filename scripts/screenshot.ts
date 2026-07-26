/**
 * Dev helper: screenshots key states of the tutorial for visual verification.
 * Usage: npx tsx scripts/screenshot.ts [url]
 */
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';

const URL = process.argv[2] ?? 'http://localhost:5173';
const OUT = '/tmp/robo-shots';

// step ids we care about -> shot name; stepIndex resolved in the page.
const SHOTS: { name: string; stepId: string; extra?: string }[] = [
  { name: '01-intro', stepId: 'intro-utstyr' },
  { name: '02-runde1', stepId: 'round-1' },
  { name: '03-runde13', stepId: 'round-13' },
  { name: '04-tekst-r18', stepId: 'round-18', extra: 'full-round' },
  { name: '05-tekst-r18-stepping', stepId: 'round-18', extra: 'cursor-40' },
  { name: '06-wave1', stepId: 'round-26' },
  { name: '07-wave4', stepId: 'round-29', extra: 'full-round' },
  { name: '08-ferdig', stepId: 'done' },
  { name: '09-diagram', stepId: 'round-16', extra: 'chart' },
];

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
    args: ['--window-size=1680,1000', '--use-gl=angle'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1680, height: 1000, deviceScaleFactor: 1 });
  page.on('console', (m) => {
    if (m.type() === 'error') console.log('PAGE ERROR:', m.text());
  });
  page.on('pageerror', (e) => console.log('PAGE EXCEPTION:', (e as Error).message));

  await page.goto(URL, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 2500));

  for (const shot of SHOTS) {
    await page.evaluate(
      (stepId, extra) => {
        // @ts-expect-error dev hook installed by the app
        const api = window.__robo;
        if (!api) throw new Error('window.__robo missing');
        api.gotoStepId(stepId);
        if (extra === 'cursor-40') api.setCursor(40);
        if (extra === 'full-round') api.setCursor(999);
        if (extra === 'chart') api.openChart();
      },
      shot.stepId,
      shot.extra ?? '',
    );
    await new Promise((r) => setTimeout(r, 1400));
    await page.screenshot({ path: `${OUT}/${shot.name}.png` });
    await page.evaluate(() => {
      // @ts-expect-error dev hook
      window.__robo?.closeOverlays();
    });
    console.log('shot:', shot.name);
  }

  await browser.close();
  console.log('done ->', OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
