/**
 * Close-up of the finished hat straight at the first RO word (front),
 * plus a slow orbit shot of the middle RO — to READ the letters off the render.
 * Output: /tmp/robo-verify/letters-*.png
 */
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'fs';

const OUT = '/tmp/robo-verify';
// FRONT_THETA in hatGeometry.ts — the centre of the first RO word.
const FRONT = 0.85;

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
    args: ['--window-size=1680,1000', '--use-gl=angle'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1680, height: 1000 });
  await page.goto('http://localhost:5173/?steg=round-23&maske=80', { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 3000));
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    (btns.find((el) => el.textContent?.trim() === 'Ferdig hatt') as HTMLButtonElement)?.click();
  });
  await new Promise((r) => setTimeout(r, 2000));

  const shots: { name: string; theta: number }[] = [
    { name: 'letters-ro-front', theta: FRONT },
    { name: 'letters-ro-mid', theta: FRONT - (Math.PI * 2) / 3 },
    { name: 'letters-ro-back', theta: FRONT - (Math.PI * 4) / 3 },
  ];
  for (const s of shots) {
    const d = 38;
    const px = d * Math.cos(s.theta);
    const pz = d * Math.sin(s.theta);
    await page.evaluate(
      (x, z) => {
        // @ts-expect-error dev hook
        window.__roboCam?.(x, 14, z, 11);
      },
      px,
      pz,
    );
    await new Promise((r) => setTimeout(r, 1000));
    await page.screenshot({ path: `${OUT}/${s.name}.png` });
    console.log(`${s.name}: ok`);
  }
  await browser.close();
  console.log('done');
}
main();
