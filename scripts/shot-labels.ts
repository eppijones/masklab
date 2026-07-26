/**
 * Dev helper: screenshots the new HTML 3D labels (fargebytte, stikk inn her,
 * maskenummer-chips, markørklyper) in the working view.
 * Usage: npx tsx scripts/shot-labels.ts
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
  page.on('console', (m) => {
    if (m.type() === 'error') console.log('PAGE ERROR:', m.text());
  });
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 2500));

  // text round, counting, one stitch before a colour change
  await page.evaluate(() => {
    // @ts-expect-error dev hook
    const api = window.__robo;
    api.gotoStepId('round-18');
    api.setCursor(5);
  });
  await new Promise((r) => setTimeout(r, 2200));
  await page.screenshot({ path: '/tmp/labels-working.png' });

  // with maskenummer on
  await page.evaluate(() => {
    const btns = [...document.querySelectorAll('.tool-btn')];
    const b = btns.find((x) => x.textContent?.includes('Maskenummer'));
    (b as HTMLButtonElement)?.click();
  });
  await new Promise((r) => setTimeout(r, 1200));
  await page.screenshot({ path: '/tmp/labels-numbers.png' });

  // Maskeskolen open
  await page.evaluate(() => {
    (document.querySelector('.schoolbtn') as HTMLButtonElement)?.click();
  });
  await new Promise((r) => setTimeout(r, 800));
  await page.screenshot({ path: '/tmp/labels-school.png' });

  await browser.close();
  console.log('done');
}
main();
