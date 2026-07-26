/** Screenshot working-view camera follow at round 15, maske 32. */
import puppeteer from 'puppeteer-core';
async function main() {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
    args: ['--window-size=1680,1000', '--use-gl=angle'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1680, height: 1000 });
  await page.goto('http://localhost:5173/?steg=round-23steg=round-15&maske=32maske=80', { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 2500));
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const b = btns.find((el) => el.textContent?.trim() === 'Sy-visning');
    (b as HTMLButtonElement | undefined)?.click();
  });
  await new Promise((r) => setTimeout(r, 4000));
  await page.screenshot({ path: '/tmp/working-view.png' });
  await browser.close();
  console.log('done');
}
main();
