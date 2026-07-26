/** Straight-on front view to verify letter orientation and the wave brim. */
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';

const OUT = '/tmp/robo-shots';

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
    args: ['--window-size=1400,1000', '--use-gl=angle'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 1000, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.log('PAGE EXCEPTION:', (e as Error).message));
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 2500));

  await page.evaluate(() => {
    // @ts-expect-error dev hooks
    window.__robo.gotoStepId('done');
  });
  await new Promise((r) => setTimeout(r, 1200));
  await page.evaluate(() => {
    // @ts-expect-error dev hooks
    window.__roboCam(63, 16, 72, 10);
  });
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({ path: `${OUT}/front.png` });

  // back side too (opposite azimuth)
  await page.evaluate(() => {
    // @ts-expect-error dev hooks
    window.__roboCam(-63, 16, -72, 10);
  });
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({ path: `${OUT}/back.png` });

  await browser.close();
  console.log('done');
}
main();
