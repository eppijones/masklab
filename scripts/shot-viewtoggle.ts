/**
 * Dev helper: screenshots the Sy-visning/Ferdig hatt toggle and the
 * stacked responsive layout.
 * Usage: npx tsx scripts/shot-viewtoggle.ts
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
    window.__robo.gotoStepId('round-18');
  });
  await new Promise((r) => setTimeout(r, 1200));

  // switch to "Ferdig hatt"
  await page.evaluate(() => {
    const btns = [...document.querySelectorAll('.viewtoggle button')];
    (btns[1] as HTMLButtonElement)?.click();
  });
  await new Promise((r) => setTimeout(r, 2500));
  await page.screenshot({ path: '/tmp/view-finished.png' });

  // back to sy-visning
  await page.evaluate(() => {
    const btns = [...document.querySelectorAll('.viewtoggle button')];
    (btns[0] as HTMLButtonElement)?.click();
  });
  await new Promise((r) => setTimeout(r, 2000));

  // narrow viewport: stacked layout
  await page.setViewport({ width: 900, height: 1200, deviceScaleFactor: 1 });
  await new Promise((r) => setTimeout(r, 1500));
  await page.screenshot({ path: '/tmp/view-stacked.png' });

  await browser.close();
  console.log('done');
}
main();
