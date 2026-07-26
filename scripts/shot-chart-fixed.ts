/**
 * Verifies the fixed Diagram overlay: at round 14, cursor 2, the next
 * stitch is nr. 3 = the FIRST red stitch (left side of the chart). The blue
 * highlight must sit on the leftmost red cell of row 1.
 * Output: /tmp/robo-verify/chart-fixed.png
 */
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'fs';

async function main() {
  mkdirSync('/tmp/robo-verify', { recursive: true });
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
    args: ['--window-size=1680,1000', '--use-gl=angle'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1680, height: 1000 });
  await page.goto('http://localhost:5173/?steg=round-14&maske=2', { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 2500));
  await page.evaluate(() => {
    // @ts-expect-error dev hook
    window.__robo?.openChart();
  });
  await new Promise((r) => setTimeout(r, 800));
  await page.screenshot({ path: '/tmp/robo-verify/chart-fixed.png' });
  await browser.close();
  console.log('done');
}
main();
