/** Rasterize SVG files to PNG so they can be looked at. npx tsx scripts/svg2png.ts a.svg b.svg */
import puppeteer from 'puppeteer-core';
import { readFileSync } from 'node:fs';

async function main() {
  const files = process.argv.slice(2);
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
    args: ['--hide-scrollbars'],
  });
  const page = await browser.newPage();
  for (const f of files) {
    const svg = readFileSync(f, 'utf8');
    const w = Number(/width="(\d+)"/.exec(svg)?.[1] ?? 1200);
    const h = Number(/height="(\d+)"/.exec(svg)?.[1] ?? 600);
    await page.setViewport({ width: Math.min(w, 4000), height: Math.min(h, 4000) });
    await page.setContent(
      `<body style="margin:0">${svg}</body>`,
      { waitUntil: 'load' },
    );
    const out = f.replace(/\.svg$/, '.png');
    await page.screenshot({ path: out });
    console.log('wrote', out);
  }
  await browser.close();
}
main();
