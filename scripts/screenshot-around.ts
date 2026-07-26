/** Shots all around the hat + top view for letter/crown verification. */
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
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 2500));
  await page.evaluate(() => {
    // @ts-expect-error dev hooks
    window.__robo.gotoStepId('done');
  });
  await new Promise((r) => setTimeout(r, 1200));

  const FRONT = 0.85;
  const D = 96;
  for (let k = 0; k < 3; k++) {
    const az = FRONT + (k * 2 * Math.PI) / 3;
    await page.evaluate(
      (x, z) => {
        // @ts-expect-error dev hooks
        window.__roboCam(x, 16, z, 10);
      },
      Math.cos(az) * D,
      Math.sin(az) * D,
    );
    await new Promise((r) => setTimeout(r, 500));
    await page.screenshot({ path: `${OUT}/around-${k}.png` });
  }
  // top view
  await page.evaluate(() => {
    // @ts-expect-error dev hooks
    window.__roboCam(0.1, 95, 0.1, 8);
  });
  await new Promise((r) => setTimeout(r, 500));
  await page.screenshot({ path: `${OUT}/top.png` });

  await browser.close();
  console.log('done');
}
main();
