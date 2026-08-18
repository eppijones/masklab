/**
 * Opens every vendor URL on the BOM and records what happened.
 *
 *   ./node_modules/.bin/tsx invent_v1/scripts/check-links.ts
 *
 * This exists because "27 vendor links" was a count of strings, not a count of
 * pages. Five of them pointed at two domains that no longer resolve at all —
 * 3dprintnorge.net and hobbygross.no — and nothing in a 203-check harness could
 * see it, because checking a link means making a request and the harness is
 * deliberately offline.
 *
 * So the network check is its own command, writes a dated artifact, and the
 * site renders that artifact. A link is green because somebody's machine got a
 * 200 on a date you can read, or it is not green.
 *
 * A 403 is reported as its own state rather than as a failure: several
 * Norwegian shops refuse an obvious bot but serve the page fine in a browser.
 * Calling that "dead" would be its own kind of lie.
 */

import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { BOM } from '../bom/bom.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';

export type LinkState = 'ok' | 'blocked' | 'missing' | 'unreachable';

interface Result {
  id: string;
  url: string;
  status: number;
  state: LinkState;
  ms: number;
}

function classify(status: number): LinkState {
  if (status >= 200 && status < 300) return 'ok';
  if (status === 401 || status === 403 || status === 429) return 'blocked';
  if (status === 0) return 'unreachable';
  return 'missing';
}

async function head(url: string): Promise<{ status: number; ms: number }> {
  const t0 = Date.now();
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      headers: { 'user-agent': UA, accept: 'text/html,*/*' },
      signal: AbortSignal.timeout(20_000),
    });
    return { status: res.status, ms: Date.now() - t0 };
  } catch {
    return { status: 0, ms: Date.now() - t0 };
  }
}

const results: Result[] = [];
for (const l of BOM) {
  const { status, ms } = await head(l.url);
  const state = classify(status);
  results.push({ id: l.id, url: l.url, status, state, ms });
  const mark = state === 'ok' ? 'ok  ' : state === 'blocked' ? 'bot ' : 'DEAD';
  console.log(`  ${mark} ${l.id.padEnd(16)} ${String(status).padStart(3)}  ${l.vendor}`);
}

const by = (s: LinkState) => results.filter((r) => r.state === s).length;
const out = {
  checkedAt: new Date().toISOString().slice(0, 10),
  total: results.length,
  ok: by('ok'),
  blocked: by('blocked'),
  dead: by('missing') + by('unreachable'),
  results,
};

writeFileSync(join(ROOT, 'data', 'link-check.json'), `${JSON.stringify(out, null, 2)}\n`);
console.log(
  `\n${out.ok}/${out.total} reachable, ${out.blocked} bot-blocked, ${out.dead} dead — wrote data/link-check.json`,
);
if (out.dead > 0) process.exit(1);
