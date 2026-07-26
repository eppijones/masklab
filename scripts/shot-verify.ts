import puppeteer from 'puppeteer-core';
async function main() {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
    args: ['--window-size=1680,1000', '--use-gl=angle'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1680, height: 1000 });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push((e as Error).message));
  await page.goto('http://localhost:5173/?steg=round-14steg=round-20&maske=0maske=0', { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 3500));
  await page.screenshot({ path: '/tmp/verify-r20.png' });
  await browser.close();
  console.log(errors.length ? 'PAGE ERRORS:\n' + errors.join('\n') : 'no page errors');
}
main();
