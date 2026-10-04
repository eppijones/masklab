import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import ManifoldModule from '../tools/node_modules/manifold-3d/manifold.js';
import { evalSolid, initKernel } from '../cad/eval-manifold.ts';
import { at, cube } from '../cad/ops.ts';
import { PART_BY_ID } from '../parts/registry.ts';
import { FIT_RACK, SOCKETS } from './fit-kit.ts';
import { inspectSTL } from './mesh-check.ts';
import { estimateJob } from './cost.ts';
import { audit, FULL_QTY, hookInsertionAngleDeg } from './engineering.ts';
import { reliability } from './redesign.ts';
import { HAT, HAT_ROUNDS, HAT_PHASES, STITCH_POSES, RO_HAT, processAt, crochetHours } from './hat-process.ts';
import { buildRounds, buildStitches } from '../../src/data/pattern.ts';
import { YARN_HEX } from '../../src/data/types.ts';
const root=fileURLToPath(new URL('./public/',import.meta.url));
const data=JSON.parse(readFileSync(root+'manifest.json','utf8'));
let checks=0;
function check(name:string, fn:()=>void){fn();checks++;console.log('PASS '+name);}
check('Every delivered STL is finite, closed, nondegenerate, positive-volume and grounded',()=>{
  assert.equal(readdirSync(root+'print').length,data.parts.length);
  for(const p of data.parts){const c=inspectSTL(readFileSync(root+p.file));assert.equal(c.invalidEdges,0,p.id);assert.equal(c.degenerate,0,p.id);assert.ok(c.volumeCm3>0,p.id);assert.ok(Math.abs(c.low[2])<1e-5,p.id);assert.equal(c.sha256,p.sha256,p.id);assert.equal(p.bodies,1);}
});
check('Real historical assembly defects remain visible even when meshes pass',()=>{
  const found=audit();for(const id of ['MECH-01','MECH-02','QTY-01','KIN-01'])assert.ok(found.some(f=>f.id===id));
  assert.ok(Math.abs(hookInsertionAngleDeg()-90)<1e-8);
  assert.equal(FULL_QTY['gate-8'].installed,18);assert.equal(FULL_QTY['gate-8'].spare,2);
});
check('Whole-hat playback covers every recipe stitch once, with exact round boundaries',()=>{
  assert.equal(HAT.totalStitches,3294);assert.equal(HAT_ROUNDS.length,38);
  assert.deepEqual(HAT_PHASES.map(p=>p.lastRound-p.firstRound+1),[19,10,9]);
  let count=0;
  for(const r of HAT_ROUNDS){assert.equal(r.start,count);assert.equal(processAt(r.start).row.num,r.num);assert.equal(processAt(r.end-.01).row.num,r.num);count+=r.count;assert.equal(r.end,count);}
  assert.equal(processAt(-10).progress,0);assert.equal(processAt(NaN).progress,0);
  assert.equal(processAt(3294).complete,true);assert.equal(processAt(1e9).progress,3294);
  assert.equal(STITCH_POSES.length,3294);
  for(const p of STITCH_POSES)assert.ok([p.x,p.y,p.z,p.width].every(Number.isFinite)&&p.width>0);
  assert.equal(crochetHours(6,1,20),(3294*6+385*2+38*60+20*60)/3600);
});
check('RO RO RO colors and increases match the canonical pattern, not a generic hat',()=>{
  const rounds=buildRounds(),stitches=buildStitches(rounds);
  assert.deepEqual(HAT_ROUNDS.map(r=>r.count),rounds.map(r=>r.count));
  assert.deepEqual(STITCH_POSES.map(p=>p.color),stitches.map(s=>YARN_HEX[s.color]));
  assert.equal(stitches.filter(s=>s.changeColorAfter!==null).length,HAT.colorChanges);
  assert.deepEqual(data.hatRounds.map((r:any)=>r.colors),RO_HAT.rounds.map(r=>r.colors));
});
await initKernel(ManifoldModule);
const rack=evalSolid(FIT_RACK.build!(FIT_RACK.dims));
const def=PART_BY_ID['gate-8'];const gate=evalSolid(def.build!(def.dims));
check('A real nominal gate clears every new socket in its assembled pose',()=>{
  for(const s of SOCKETS){const placed=gate.translate([s.x,0,8]);assert.ok(rack.intersect(placed).volume()<1e-5,`collision at ${s.clearance}`);}
});
check('Socket access is open from above and floor material exists below',()=>{
  for(const s of SOCKETS){
    const access=evalSolid(at(cube(7.9,2.5,8),[s.x,s.y,7.9]));
    assert.ok(rack.intersect(access).volume()<1e-5,'blocked insertion');
    const floor=evalSolid(at(cube(7,2,.3),[s.x,s.y,3.6]));
    assert.ok(rack.intersect(floor).volume()>4,'missing floor');
  }
});
check('Old platter and hub really obstruct the intended bolt insertion path',()=>{
  for(const [id,r,z] of [['platter',102,9],['hub-adapter',53,7.5]] as const){
    const p=PART_BY_ID[id],solid=evalSolid(p.build!(p.dims));
    assert.ok(solid.intersect(evalSolid(at(cube(1,1,.4),[r,0,z]))).volume()>.39,id);
  }
});
check('Reliability arithmetic is conditional, and a 50-stitch run is not hat qualification',()=>{
  const r=reliability(.999,3694);assert.ok(r.hatSuccess>.024&&r.hatSuccess<.026);
  assert.ok(r.requiredPerStitch>.99998);assert.ok(r.zeroFailureTrialsFor95LowerBound>200000);
});
const parts=[{id:'a',material:'PETG',grams:10,qty:2},{id:'b',material:'TPU',grams:5,qty:1}];
const rates={prices:{PETG:200,TPU:400},wastePct:20,hourly:50,setup:30,shipping:40,vatPct:0};
check('Unsliced estimates never invent job duration or a complete charge',()=>{
  const c=estimateJob(parts,rates);assert.equal(c.hours,null);assert.equal(c.quoteNok,null);assert.ok(Math.abs(c.materialNok-7.2)<1e-8);
});
check('Multiple plates count support-inclusive grams once and hourly charges once',()=>{
  const c=estimateJob(parts,rates,[{id:'p1',material:'PETG',grams:30,hours:2,contents:{a:2}},{id:'p2',material:'TPU',grams:8,hours:1,contents:{b:1}}]);
  assert.equal(c.coverage,true);assert.equal(c.hours,3);assert.ok(Math.abs(c.quoteNok!-231.04)<1e-8);
});
check('Partial, duplicate, wrong-material and unexpected copies cannot become quotes',()=>{
  for(const plates of [
    [{id:'p',material:'PETG',grams:30,hours:2,contents:{a:1}}],
    [{id:'p',material:'PETG',grams:30,hours:2,contents:{a:3}}],
    [{id:'p',material:'PLA',grams:30,hours:2,contents:{a:2,b:1}}],
    [{id:'p',material:'PETG',grams:30,hours:2,contents:{a:2,z:1}}],
  ]){const c=estimateJob(parts,rates,plates);assert.equal(c.coverage,false);assert.equal(c.quoteNok,null);}
});
check('All fit and proposed full quantities are nonnegative integers',()=>{
  for(const p of data.parts)for(const n of [p.fitQty,p.fullQty.installed,p.fullQty.spare])assert.ok(Number.isInteger(n)&&n>=0);
  assert.equal(data.parts.reduce((s:number,p:any)=>s+p.fitQty,0),8);
});
check('X1 slice covers all 74 reference copies and matches the delivered geometry',()=>{
  const q=JSON.parse(readFileSync(root+'x1-reference-slice.json','utf8'));
  const job=data.parts.filter((p:any)=>p.fullQty.installed+p.fullQty.spare>0).map((p:any)=>({...p,material:p.print.material,qty:p.fullQty.installed+p.fullQty.spare}));
  assert.equal(q.printed,false);assert.deepEqual(q.failures,[]);assert.deepEqual(q.warnings,[]);
  assert.equal(q.printer,'Bambu Lab X1 Carbon');assert.equal(q.nozzleMm,.4);
  for(const p of job)assert.equal(q.sha256[p.id],p.sha256,p.id);
  const cost=estimateJob(job,rates,q.plates);
  assert.equal(cost.coverage,true);assert.ok(cost.hours!>0);
  assert.equal(q.plates.reduce((s:number,p:any)=>s+Object.values<number>(p.contents).reduce((a,b)=>a+b,0),0),74);
});
console.log(`${checks} verification groups passed. Full-machine release remains blocked by ${audit().length} recorded engineering items.`);
