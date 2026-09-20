import assert from 'node:assert/strict';
import handler from '../../api/sync';
import { validPosition } from '../../src/sync/protocol';
import { readFileSync } from 'node:fs';
process.env.UPSTASH_REDIS_REST_URL = 'http://127.0.0.1:8079';
process.env.UPSTASH_REDIS_REST_TOKEN = 'local-test';
let calls = 0;
async function request(body: Record<string,unknown>, token?: string) {
 let status = 200; let data: any;
 await handler({ method: 'POST', headers: { 'x-forwarded-for': 'test-'+process.pid, ...(token ? { authorization: 'Bearer '+token } : {}) }, body }, {
  status(n) { status=n; return this; }, setHeader() {}, json(value) { data=value; },
 }); calls++; return { status, ...data };
}
const pos = { patternId:'ro-ro-ro',round:29,completed:40 };
assert.equal((await request({action:'get'})).status,401);
assert.equal((await request({action:'create',position:{...pos,completed:999}})).status,400);
const created = await request({action:'create',position:pos});
assert.equal(created.status,200);
assert.match(created.code,/^[0-9]{6}$/);
assert.equal((await request({action:"get"},created.token)).watchLastSeen,null);
const joined = await request({action:'join',code:created.code});
assert.equal(joined.token,created.token);
assert.equal((await request({action:'join',code:created.code})).status,404);
const op = (id:string,n:number,revision=0) => ({action:'set',position:{...pos,completed:n},source:'watch',operationId:id,revision});
const [a,b] = await Promise.all([request(op('aaaaaaaa-aaaaaaaa',41),created.token),request(op('bbbbbbbb-bbbbbbbb',42),created.token)]);
assert.deepEqual([a.status,b.status].sort(),[200,409]);
const winner = a.status===200 ? a : b;
const id = a.status===200 ? 'aaaaaaaa-aaaaaaaa' : 'bbbbbbbb-bbbbbbbb';
assert.equal((await request(op(id,99),created.token)).state.revision,1,'retry is idempotent');
const back = await request(op('cccccccc-cccccccc',20,1),created.token);
assert.equal(back.state.position.completed,20,'explicit backward movement supported');
assert.equal((await request(op('dddddddd-dddddddd',88,0),created.token)).status,409,'offline stale edit never wins silently');
assert.equal((await request({action:'get'},created.token)).state.position.completed,20);
const pattern = JSON.parse(readFileSync('watch/Masketeller/Masketeller/Patterns/ro-ro-ro.json','utf8'));
for (const r of pattern.rounds) {
 assert(validPosition({patternId:'ro-ro-ro',round:r.num,completed:r.count}));
 assert(!validPosition({patternId:'ro-ro-ro',round:r.num,completed:r.count+1}));
}
assert.equal(winner.state.revision,1);
assert((await request({action:"get",source:"watch"},created.token)).watchLastSeen > 0);
console.log(`PASS ${calls} API calls against real Redis: auth, pairing expiry/use, atomic conflict, retries, backward movement; ${pattern.rounds.length} recipe bounds`);
