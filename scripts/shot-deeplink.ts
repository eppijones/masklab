import puppeteer from 'puppeteer-core';
async function main() {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
    args: ['--window-size=1680,1000', '--use-gl=angle'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1680, height: 1000 });
  await page.goto('http://localhost:5173/?steg=round-15&maske=44', { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 3500));
  await page.screenshot({ path: '/tmp/deeplink.png' });
  await browser.close();
  console.log('done');
}
main();
