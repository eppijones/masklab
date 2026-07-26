/**
 * Final visual verification: screenshots of BOTH views (Sy-visning and
 * Ferdig hatt) at round 14 start and after rounds 15, 18 and 23.
 * Output: /tmp/robo-verify/*.png
 */
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'fs';

const OUT = '/tmp/robo-verify';

const SHOTS: { steg: string; maske: number; label: string }[] = [
  { steg: 'round-14', maske: 8, label: 'r14-start' },
  { steg: 'round-15', maske: 80, label: 'r15-ferdig' },
  { steg: 'round-18', maske: 80, label: 'r18-ferdig' },
  { steg: 'round-23', maske: 80, label: 'r23-ferdig' },
];

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
    args: ['--window-size=1680,1000', '--use-gl=angle'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1680, height: 1000 });

  for (const shot of SHOTS) {
    // Deep link lands in Sy-visning (working view) with the camera
    // following the next stitch.
    await page.goto(`http://localhost:5173/?steg=${shot.steg}&maske=${shot.maske}`, {
      waitUntil: 'networkidle0',
    });
    await new Promise((r) => setTimeout(r, 3500));
    await page.screenshot({ path: `${OUT}/${shot.label}-sy.png` });

    // Switch to Ferdig hatt and frame the front of the hat.
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      (btns.find((el) => el.textContent?.trim() === 'Ferdig hatt') as HTMLButtonElement)?.click();
    });
    await new Promise((r) => setTimeout(r, 2500));
    await page.evaluate(() => {
      // @ts-expect-error dev hook
      window.__roboCam?.(18, 18, 52, 10);
    });
    await new Promise((r) => setTimeout(r, 1200));
    await page.screenshot({ path: `${OUT}/${shot.label}-ferdig.png` });
    console.log(`${shot.label}: ok`);
  }

  await browser.close();
  console.log(`done -> ${OUT}`);
}
main();
