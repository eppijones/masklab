/**
 * Dev helper: screenshots the increase-rhythm guidance in round 3
 * (plain stitch vs the "same stitch again" increase alert).
 * Usage: npx tsx scripts/shot-rhythm.ts
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

  // Round 3 (k=2): stitch 2 goes into the next hole…
  await page.evaluate(() => {
    // @ts-expect-error dev hook
    const api = window.__robo;
    api.gotoStepId('round-3');
    api.setCursor(1);
  });
  await new Promise((r) => setTimeout(r, 1800));
  await page.screenshot({ path: '/tmp/rhythm-plain.png' });

  // …stitch 3 is the second into the SAME hole (the increase).
  await page.evaluate(() => {
    // @ts-expect-error dev hook
    window.__robo.setCursor(2);
  });
  await new Promise((r) => setTimeout(r, 1200));
  await page.screenshot({ path: '/tmp/rhythm-inc.png' });

  await browser.close();
  console.log('done');
}
main();
