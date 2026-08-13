/**
 * NORWAY'26 master-pass contact sheet — all SEVEN hats, four angles each.
 *
 * The five published kits come from `/oppskrift/<id>`; the two drafts come from
 * `/oppskrift/custom?d=…`, the same share-link route the studio produces, so
 * every hat here is the real derived recipe on screen rather than a mock.
 *
 * The angles are the ones §16 of the brief asks for, and each is there to catch
 * something the others cannot:
 *
 *   front           the wordmark, straight on — legibility and breathing room
 *   three-quarter   the transition corridor, where the field crosses the wall
 *   top             the crown spiral, the only view that shows it running in
 *   back            the SECOND wordmark, on the far side of the cylinder
 *
 * Usage: npx tsx scripts/shot-norway26-master.ts [baseUrl] [outDir]
 */
import puppeteer, { type Page } from 'puppeteer-core';
import { mkdirSync } from 'node:fs';
import { encodeDesign } from '../src/studio/serialize';
import { HAT_A, HAT_B } from './proto-masklab';

const BASE = process.argv[2] ?? 'http://127.0.0.1:5173';
const OUT = process.argv[3] ?? '/tmp/norway26-master';

const HATS: { id: string; path: string }[] = [
  ...['norway26', 'norway26-white', 'norway26-black', 'norway26-training', 'norway26-keeper'].map(
    (id) => ({ id, path: `/oppskrift/${id}` }),
  ),
  { id: 'draft-lyn', path: `/oppskrift/custom?d=${encodeDesign(HAT_A)}` },
  { id: 'draft-skifer', path: `/oppskrift/custom?d=${encodeDesign(HAT_B)}` },
];

/**
 * THE FRONT OF THE HAT IS NOT THE +Z AXIS, and shooting it as though it were
 * is how you convince yourself a centred wordmark is off-centre.
 *
 * `buildStitchTransforms` seats the pattern's `frontAnchorStitch` at
 * `FRONT_THETA`, which is 0.85 rad — about 49° round from +z. A camera parked
 * on +z is therefore looking at a point eleven stitches past the middle of
 * NORGE, and the word appears shoved to one side on a hat where it is in fact
 * dead centre. Every angle here is measured from `FRONT_THETA` instead.
 */
const FRONT_THETA = 0.85;
const CAM_R = 96;
const at = (
  offsetRad: number,
  y: number,
  r = CAM_R,
): [number, number, number, number] => [
  r * Math.cos(FRONT_THETA + offsetRad),
  y,
  r * Math.sin(FRONT_THETA + offsetRad),
  8,
];

const ANGLES: { name: string; cam: [number, number, number, number] }[] = [
  { name: 'front', cam: at(0, 13) },
  { name: 'three-quarter', cam: at(0.95, 30, 72) },
  { name: 'top', cam: [0.1, 92, 0.1, 8] },
  // Half a turn round: the SECOND NORGE, on the far side of the cylinder.
  { name: 'back', cam: at(Math.PI, 13) },
];

async function shotHat(page: Page, hat: { id: string; path: string }) {
  await page.goto(`${BASE}${hat.path}`, { waitUntil: 'networkidle0', timeout: 60000 });
  await new Promise((r) => setTimeout(r, 1200));
  await page.evaluate(() => {
    (document.querySelector('.welcome-start') as HTMLButtonElement | null)?.click();
  });
  await new Promise((r) => setTimeout(r, 900));
  await page.evaluate(() => {
    // @ts-expect-error dev hook
    const api = window.__robo;
    api?.gotoStepId('done');
    api?.closeOverlays?.();
  });
  // Let the finale confetti clear before shooting.
  await new Promise((r) => setTimeout(r, 5200));

  for (const a of ANGLES) {
    const [px, py, pz, ty] = a.cam;
    await page.evaluate(
      (x: number, y: number, z: number, t: number) => {
        // @ts-expect-error dev hook
        window.__roboCam?.(x, y, z, t);
      },
      px,
      py,
      pz,
      ty,
    );
    await new Promise((r) => setTimeout(r, 700));
    const file = `${OUT}/${hat.id}_${a.name}.png`;
    await page.screenshot({ path: file as `${string}.png` });
    console.log(`  wrote ${file}`);
  }
}

const CHROME =
  process.env.CHROME_PATH ??
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--window-size=900,900', '--use-gl=angle', '--hide-scrollbars'],
});
mkdirSync(OUT, { recursive: true });
const page = await browser.newPage();
await page.setViewport({ width: 900, height: 900, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('PAGE EXCEPTION:', (e as Error).message));
for (const hat of HATS) {
  console.log(`shot ${hat.id}`);
  await shotHat(page, hat);
}
await browser.close();
console.log(`done → ${OUT}`);
