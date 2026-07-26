import puppeteer from 'puppeteer-core';
async function main() {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1140, height: 700, deviceScaleFactor: 2 });
  await page.goto('file:///tmp/chart-rotate.html');
  await new Promise((r) => setTimeout(r, 500));
  await page.screenshot({ path: '/tmp/chart-rotate.png', fullPage: true });
  await browser.close();
  console.log('done');
}
main();
