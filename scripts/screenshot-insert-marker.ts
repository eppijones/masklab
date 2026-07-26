/**
 * Dev helper: screenshots the "stikk inn her" marker at round 15, stitch 35,
 * in both finished and working view.
 * Usage: npx tsx scripts/screenshot-insert-marker.ts
 */
import puppeteer from 'puppeteer-core';

async function main() {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
    args: ['--window-size=1680,1000', '--use-gl=angle'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1680, height: 1000, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.log('PAGE EXCEPTION:', (e as Error).message));
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 2500));

  await page.evaluate(() => {
    // @ts-expect-error dev hook
    const api = window.__robo;
    api.gotoStepId('round-15');
    api.setCursor(35);
  });
  await new Promise((r) => setTimeout(r, 2000));
  // zoom towards the seam area where stitch 35 sits
  await page.evaluate(() => {
    // @ts-expect-error dev hook
    window.__roboCam?.(4, 26, 30, 16);
  });
  await new Promise((r) => setTimeout(r, 900));
  await page.screenshot({ path: '/tmp/insert-marker-finished.png' });

  // close-up from the side of the next stitch
  await page.evaluate(() => {
    // @ts-expect-error dev hook
    window.__roboCam?.(2, 20, 24, 15);
  });
  await new Promise((r) => setTimeout(r, 900));
  await page.screenshot({ path: '/tmp/insert-marker-close.png' });

  await browser.close();
  console.log('done');
}
main();
