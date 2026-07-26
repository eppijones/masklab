/**
 * First-use smoke across phone / tablet / desktop device classes.
 * Simulates 10 first-time personas walking the critical guide path.
 *
 * Usage: npx tsx scripts/device-smoke.ts [baseUrl]
 */
import puppeteer, { type Page } from 'puppeteer-core';
import { mkdirSync } from 'node:fs';

const BASE = process.argv[2] ?? 'http://localhost:5173';
const OUT = '/tmp/masklab-device-smoke';

type Profile = {
  id: string;
  persona: string;
  url: string;
  viewport: { width: number; height: number; deviceScaleFactor?: number };
  expectDevice: string;
  expectDock: boolean;
  expectDesktopGrid: boolean;
};

const PROFILES: Profile[] = [
  {
    id: '01-phone-iphone',
    persona: 'Nora, 28 — første hekleforsøk på iPhone',
    url: `${BASE}/?device=phone`,
    viewport: { width: 390, height: 844, deviceScaleFactor: 2 },
    expectDevice: 'phone',
    expectDock: true,
    expectDesktopGrid: false,
  },
  {
    id: '02-phone-android',
    persona: 'Amir, 34 — Android midt i kveldsskiftet',
    url: `${BASE}/?device=phone`,
    viewport: { width: 360, height: 800, deviceScaleFactor: 2 },
    expectDevice: 'phone',
    expectDock: true,
    expectDesktopGrid: false,
  },
  {
    id: '03-tablet-ipad-portrait',
    persona: 'Kari, 52 — iPad på kjøkkenbordet',
    url: `${BASE}/?device=tablet&orientation=portrait`,
    viewport: { width: 768, height: 1024, deviceScaleFactor: 2 },
    expectDevice: 'tablet',
    expectDock: true,
    expectDesktopGrid: false,
  },
  {
    id: '04-tablet-ipad-landscape',
    persona: 'Eva, 41 — iPad landskap i sofaen',
    url: `${BASE}/?device=tablet&orientation=landscape`,
    viewport: { width: 1180, height: 820, deviceScaleFactor: 2 },
    expectDevice: 'tablet',
    expectDock: false,
    expectDesktopGrid: true,
  },
  {
    id: '05-tablet-android',
    persona: 'Lukas, 19 — Android-tablet portrait',
    url: `${BASE}/?device=tablet&orientation=portrait`,
    viewport: { width: 800, height: 1280, deviceScaleFactor: 1.5 },
    expectDevice: 'tablet',
    expectDock: true,
    expectDesktopGrid: false,
  },
  {
    id: '06-desktop-mac',
    persona: 'Sofie, 36 — MacBook på kontoret',
    url: `${BASE}/?device=desktop`,
    viewport: { width: 1440, height: 900, deviceScaleFactor: 1 },
    expectDevice: 'desktop',
    expectDock: false,
    expectDesktopGrid: true,
  },
  {
    id: '07-desktop-wide',
    persona: 'Thomas, 45 — stor PC-skjerm',
    url: `${BASE}/?device=desktop`,
    viewport: { width: 1680, height: 1000, deviceScaleFactor: 1 },
    expectDevice: 'desktop',
    expectDock: false,
    expectDesktopGrid: true,
  },
  {
    id: '08-desktop-narrow',
    persona: 'Ida, 29 — smalt Mac-vindu (skal fortsatt være nettside)',
    url: `${BASE}/?device=desktop`,
    viewport: { width: 900, height: 900, deviceScaleFactor: 1 },
    expectDevice: 'desktop',
    expectDock: false,
    expectDesktopGrid: true,
  },
  {
    id: '09-phone-resume',
    persona: 'Maja, 61 — mobil, fortsetter der hun slapp',
    url: `${BASE}/?device=phone`,
    viewport: { width: 393, height: 852, deviceScaleFactor: 2 },
    expectDevice: 'phone',
    expectDock: true,
    expectDesktopGrid: false,
  },
  {
    id: '10-phone-finale',
    persona: 'Jonas, 23 — mobil, sjekker ferdig hatt',
    url: `${BASE}/?device=phone`,
    viewport: { width: 390, height: 844, deviceScaleFactor: 2 },
    expectDevice: 'phone',
    expectDock: true,
    expectDesktopGrid: false,
  },
];

type Robo = {
  gotoStepId: (id: string) => void;
  setCursor: (n: number) => void;
  openChart: () => void;
  closeOverlays: () => void;
  device: () => string;
  orientation: () => string;
};

async function wait(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

async function assertWelcomeUsable(page: Page, profile: Profile): Promise<string[]> {
  const fails: string[] = [];
  const check = await page.evaluate(() => {
    const welcome = document.querySelector('.welcome') as HTMLElement | null;
    const screen = document.documentElement.dataset.screen;
    const starts = [...document.querySelectorAll('.welcome-start')] as HTMLButtonElement[];
    const visibleStart = starts.find((b) => {
      const r = b.getBoundingClientRect();
      const style = getComputedStyle(b);
      return (
        r.width > 0 &&
        r.height > 0 &&
        style.visibility !== 'hidden' &&
        style.display !== 'none' &&
        r.bottom > 0 &&
        r.top < window.innerHeight
      );
    });
    const canScroll =
      !!welcome &&
      (welcome.scrollHeight > welcome.clientHeight + 8 ||
        document.documentElement.scrollHeight > window.innerHeight + 8);
    if (welcome) welcome.scrollTop = Math.min(80, welcome.scrollHeight);
    return {
      screen,
      hasWelcome: !!welcome,
      visibleStart: !!visibleStart,
      canScrollOrFits:
        canScroll ||
        (!!welcome && welcome.scrollHeight <= welcome.clientHeight + 8 && !!visibleStart),
      scrolled: welcome?.scrollTop ?? -1,
      overflowY: welcome ? getComputedStyle(welcome).overflowY : null,
    };
  });

  if (check.screen !== 'welcome') fails.push(`screen=${check.screen} expected welcome`);
  if (!check.hasWelcome) fails.push('welcome screen missing');
  if (!check.visibleStart) fails.push('Start button not visible in viewport');
  if (!check.canScrollOrFits && (profile.expectDevice === 'phone' || profile.expectDock)) {
    fails.push('welcome cannot scroll and content may be clipped');
  }
  if (
    (profile.expectDevice === 'phone' || profile.expectDock) &&
    check.overflowY !== 'auto' &&
    check.overflowY !== 'scroll'
  ) {
    fails.push(`welcome overflowY=${check.overflowY} expected auto/scroll`);
  }
  return fails;
}

async function startGuide(page: Page) {
  const clicked = await page.evaluate(() => {
    const starts = [...document.querySelectorAll('.welcome-start')] as HTMLButtonElement[];
    const btn =
      starts.find((b) => {
        const r = b.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && r.top < window.innerHeight;
      }) ?? starts[0];
    if (!btn) return false;
    btn.click();
    return true;
  });
  if (!clicked) throw new Error('Could not click Start on welcome');
  await wait(800);
}

async function runPersonaFlow(page: Page, profile: Profile): Promise<string[]> {
  const fails: string[] = [];

  const meta = await page.evaluate(() => {
    const api = (window as unknown as { __robo: Robo }).__robo;
    return {
      device: api.device(),
      orientation: api.orientation(),
      hasDock: !!document.querySelector('.mobile-dock'),
      layoutDisplay: getComputedStyle(document.querySelector('.layout')!).display,
      plusBtn: !!document.querySelector('.mobile-dock-pm.plus, .workhud-pm.plus'),
      nextBtn: !!document.querySelector(
        '.mobile-dock-nav-btn.next, .panel-foot .btn.next',
      ),
      prevBtn: !!document.querySelector(
        '.mobile-dock-nav-btn.prev, .panel-foot .btn.prev',
      ),
    };
  });

  if (meta.device !== profile.expectDevice) {
    fails.push(`device=${meta.device} expected ${profile.expectDevice}`);
  }
  if (meta.hasDock !== profile.expectDock) {
    fails.push(`dock=${meta.hasDock} expected ${profile.expectDock}`);
  }
  if (profile.expectDesktopGrid && meta.layoutDisplay !== 'grid') {
    fails.push(`layout=${meta.layoutDisplay} expected grid`);
  }
  if (!profile.expectDesktopGrid && profile.expectDock && meta.layoutDisplay !== 'flex') {
    fails.push(`layout=${meta.layoutDisplay} expected flex (stacked)`);
  }
  if (!meta.nextBtn || !meta.prevBtn) {
    fails.push('missing step nav buttons');
  }

  if (profile.expectDock) {
    const phoneShell = await page.evaluate(() => {
      const stage = document.querySelector('.layout.mobile-work .stage') as HTMLElement | null;
      return {
        recipeFirst: !!document.querySelector('.layout.recipe-first'),
        hasInlinePanel: !!document.querySelector('.layout > .panel'),
        mobileWork: !!document.querySelector('.layout.mobile-work'),
        stageFlex: stage ? getComputedStyle(stage).flexGrow : null,
      };
    });
    if (!phoneShell.mobileWork) fails.push('missing layout.mobile-work');
    // Fresh start lands on intro → recipe-first (text, not 3D).
    if (!phoneShell.recipeFirst) fails.push('expected recipe-first before round 1');
    if (!phoneShell.hasInlinePanel) fails.push('recipe-first should show inline pattern text');
  }

  // Round counting: +1/−1 reachable
  await page.evaluate(() => {
    const api = (window as unknown as { __robo: Robo }).__robo;
    api.gotoStepId('round-14');
    api.setCursor(3);
  });
  await wait(1200);

  const counting = await page.evaluate(() => {
    const minus = document.querySelector(
      '.mobile-dock-pm.minus, .workhud-pm.minus',
    ) as HTMLButtonElement | null;
    const plus = document.querySelector(
      '.mobile-dock-pm.plus, .workhud-pm.plus',
    ) as HTMLButtonElement | null;
    plus?.click();
    return {
      hasMinus: !!minus,
      hasPlus: !!plus,
      dockFixed: (() => {
        const dock = document.querySelector('.mobile-dock');
        if (!dock) return null;
        return getComputedStyle(dock).position === 'fixed';
      })(),
    };
  });
  await wait(400);

  if (!counting.hasMinus || !counting.hasPlus) {
    fails.push('missing +1/−1 while counting');
  }
  if (profile.expectDock && counting.dockFixed !== true) {
    fails.push('mobile dock is not position:fixed');
  }

  // View toggle + overlays
  await page.evaluate(() => {
    const btns = [...document.querySelectorAll('.viewtoggle button')];
    (btns[1] as HTMLButtonElement | undefined)?.click();
  });
  await wait(600);
  await page.evaluate(() => {
    const btns = [...document.querySelectorAll('.viewtoggle button')];
    (btns[0] as HTMLButtonElement | undefined)?.click();
    const api = (window as unknown as { __robo: Robo }).__robo;
    api.openChart();
  });
  await wait(500);
  const chartOpen = await page.evaluate(() => !!document.querySelector('.overlay'));
  if (!chartOpen) fails.push('chart overlay did not open');
  await page.evaluate(() => {
    (window as unknown as { __robo: Robo }).__robo.closeOverlays();
  });
  await wait(300);

  // After jumping into a round: Oppskrift opens recipe sheet on phone
  await page.evaluate(() => {
    const btn = document.querySelector(
      '.mobile-dock-nav-btn.jump, .panel-foot .btn.jump-open',
    ) as HTMLButtonElement | null;
    btn?.click();
  });
  await wait(400);
  const opened = await page.evaluate(() => ({
    recipe: !!document.querySelector('.recipe-sheet'),
    jump: !!document.querySelector('.jump-drawer'),
    stageVisible: !!document.querySelector('.layout.mobile-work .stage'),
    noStageOverlay: !document.querySelector('.stitch-overlay'),
    jumpInRecipe: !!document.querySelector('.recipe-sheet .stitch-jump-panel'),
  }));
  if (profile.expectDock) {
    if (!opened.recipe) fails.push('Oppskrift did not open recipe sheet in 3D work');
    if (!opened.stageVisible) fails.push('3D stage missing after round jump');
    if (!opened.noStageOverlay) fails.push('Maske for maske still overlays 3D on phone');
    if (!opened.jumpInRecipe) fails.push('color-run jumps missing inside Oppskrift');
  } else if (!opened.jump) {
    fails.push('Alle steg / jump drawer did not open');
  }
  await page.evaluate(() => {
    (window as unknown as { __robo: Robo }).__robo.closeOverlays();
  });

  // Finale path for persona 10
  if (profile.id.startsWith('10-')) {
    await page.evaluate(() => {
      (window as unknown as { __robo: Robo }).__robo.gotoStepId('done');
    });
    await wait(1000);
  }

  await page.screenshot({
    path: `${OUT}/${profile.id}.png`,
    fullPage: false,
  });

  return fails;
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
    args: ['--use-gl=angle', '--window-size=1680,1000'],
  });

  let failed = 0;
  console.log(`Device smoke → ${OUT}`);
  console.log(`Base: ${BASE}\n`);

  for (const profile of PROFILES) {
    const page = await browser.newPage();
    page.on('pageerror', (e) =>
      console.log(`  PAGE ERROR [${profile.id}]:`, e instanceof Error ? e.message : String(e)),
    );
    await page.setViewport(profile.viewport);
    await page.goto(profile.url, { waitUntil: 'networkidle0', timeout: 60000 });
    await wait(1500);

    // Clear progress for clean first-use, then enter
    await page.evaluate(() => {
      try {
        localStorage.clear();
      } catch {
        /* ignore */
      }
    });
    await page.reload({ waitUntil: 'networkidle0' });
    await wait(1200);

    const welcomeFails = await assertWelcomeUsable(page, profile);
    await startGuide(page);
    const fails = [...welcomeFails, ...(await runPersonaFlow(page, profile))];
    if (fails.length) {
      failed += 1;
      console.log(`✗ ${profile.id} — ${profile.persona}`);
      for (const f of fails) console.log(`    - ${f}`);
    } else {
      console.log(`✓ ${profile.id} — ${profile.persona}`);
    }
    await page.close();
  }

  await browser.close();
  console.log(`\n${PROFILES.length - failed}/${PROFILES.length} personas passed`);
  if (failed) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
