/**
 * Dumps NORGE Home as raw stitch geometry + colours for the standalone
 * "one combined yarn vs four separate yarns" concept page.
 *
 * The point of going through the app's own pattern code rather than
 * re-modelling the hat in the page is that the LEFT hat on that page has to be
 * the real recipe — the same 12 zigzag bundles, the same wordmark, the same
 * navy rim — or the comparison is worthless. Only the RIGHT hat is simulated,
 * and it is simulated in the page itself from this same geometry.
 */
import { writeFileSync } from 'node:fs';
import { derivePattern } from '../src/patterns/buildFromDefinition';
import { getPattern } from '../src/patterns/registry';
import {
  buildProfile,
  buildStitchTransforms,
  makeStitchGeometry,
  makeGhostGeometry,
} from '../src/lib/hatGeometry';
import { YARN_HEX, YARN_NAME } from '../src/data/types';

const out = process.argv[2];
if (!out) throw new Error('usage: dump-yarn-compare.ts <out.json>');

const def = getPattern('norway26-training');
const d = derivePattern(def);
const profile = buildProfile(d.rounds);
const textCount = d.rounds.find((r) => r.phase === 'text')?.count ?? 100;
const xf = buildStitchTransforms(d.rounds, d.stitches, profile, {
  frontAnchorStitch: def.layout.frontAnchorStitch,
  textCols: textCount,
});

// Palette: only the colours this hat actually uses, in recipe order.
const used: string[] = [];
for (const st of d.stitches) if (!used.includes(st.color)) used.push(st.color);
const palette = used.map((id) => ({
  id,
  hex: YARN_HEX[id as keyof typeof YARN_HEX],
  name: YARN_NAME[id as keyof typeof YARN_NAME],
}));

const n = d.stitches.length;
const pos: number[] = [];
const quat: number[] = [];
const color: number[] = [];
const round: number[] = [];
const idx: number[] = [];

for (let i = 0; i < n; i++) {
  const t = xf[i];
  const st = d.stitches[i];
  pos.push(r4(t.position.x), r4(t.position.y), r4(t.position.z));
  quat.push(r4(t.quaternion.x), r4(t.quaternion.y), r4(t.quaternion.z), r4(t.quaternion.w));
  color.push(used.indexOf(st.color));
  round.push(st.roundIdx);
  idx.push(st.i);
}

function r4(v: number) {
  return Math.round(v * 1e4) / 1e4;
}

/** BufferGeometry → plain arrays the page can rebuild without any loader. */
function dumpGeo(g: import('three').BufferGeometry, prec = 1e3) {
  const p = g.getAttribute('position');
  const nm = g.getAttribute('normal');
  const ix = g.getIndex();
  const round = (a: ArrayLike<number>) => {
    const o: number[] = [];
    for (let i = 0; i < a.length; i++) o.push(Math.round(a[i] * prec) / prec);
    return o;
  };
  return {
    position: round(p.array as ArrayLike<number>),
    normal: nm ? round(nm.array as ArrayLike<number>) : null,
    index: ix ? Array.from(ix.array as ArrayLike<number>) : null,
  };
}

const stitchGeo = makeStitchGeometry();
const shellGeo = makeGhostGeometry(profile);
shellGeo.computeVertexNormals();

const json = {
  pattern: def.title,
  stitchCount: n,
  bodyCount: d.bodyCount,
  rounds: d.rounds.map((r) => ({ num: r.num, phase: r.phase, count: r.count })),
  palette,
  pos,
  quat,
  color,
  round,
  idx,
  stitchGeo: dumpGeo(stitchGeo),
  shellGeo: dumpGeo(shellGeo),
};

writeFileSync(out, JSON.stringify(json));
console.log(
  `${def.title}: ${n} stitches, ${d.rounds.length} rounds, body ${d.bodyCount}`,
);
console.log('palette:', palette.map((p) => `${p.id} ${p.hex}`).join('  '));
console.log('wrote', out);
