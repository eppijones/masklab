/** Screenshots the cheat sheet and troubleshooting overlays. */
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';

const OUT = '/tmp/robo-shots';

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
    args: ['--window-size=1680,1000', '--use-gl=angle'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1680, height: 1000, deviceScaleFactor: 1 });
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 2000));

  const clickByText = async (text: string) => {
    await page.evaluate((t) => {
      const btns = [...document.querySelectorAll('button')];
      const b = btns.find((x) => x.textContent?.trim() === t);
      b?.click();
    }, text);
  };

  await clickByText('Huskelapp');
  await new Promise((r) => setTimeout(r, 500));
  await page.screenshot({ path: `${OUT}/10-huskelapp.png` });
  await clickByText('Lukk');
  await new Promise((r) => setTimeout(r, 300));

  await clickByText('Feilsøking');
  await new Promise((r) => setTimeout(r, 500));
  await page.evaluate(() => {
    document.querySelector('.trouble-item')?.setAttribute('open', '');
  });
  await new Promise((r) => setTimeout(r, 300));
  await page.screenshot({ path: `${OUT}/11-feilsoking.png` });

  // practice step with video embed
  await page.evaluate(() => {
    // @ts-expect-error dev hook
    window.__robo.closeOverlays();
    // @ts-expect-error dev hook
    window.__robo.gotoStepId('practice');
  });
  await new Promise((r) => setTimeout(r, 2500));
  await page.screenshot({ path: `${OUT}/12-practice.png` });

  await browser.close();
  console.log('done');
}
main();
