import puppeteer from 'puppeteer-core';
async function main() {
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
    // @ts-expect-error dev
    window.__roboCam?.(18, 18, 52, 10);
  });
  await new Promise((r) => setTimeout(r, 900));
  await page.screenshot({ path: '/tmp/front-final.png' });
  await browser.close();
  console.log('done');
}
main();
