import { createHash, randomBytes, randomInt } from 'node:crypto';
import { validPosition, type Snapshot } from '../src/sync/protocol.js';
interface Request { method?: string; headers: Record<string, string | string[] | undefined>; body?: Record<string, unknown> }
interface Response { status(n: number): Response; json(v: unknown): void; setHeader(k: string, v: string): void }
const hash = (s: string) => createHash('sha256').update(s).digest('hex');
async function redis(...command: (string | number)[]): Promise<unknown> {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  if (!url || !token) throw new Error('storage-unconfigured');
  const response = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(command), signal: AbortSignal.timeout(5000) });
  if (!response.ok) throw new Error('storage-unavailable');
  const result = await response.json() as { result: unknown; error?: string };
  if (result.error) throw new Error('storage-unavailable');
  return result.result;
}
const CAS = `local raw=redis.call('GET',KEYS[1]); if not raw then return {'missing',''} end
local s=cjson.decode(raw)
for _,id in ipairs(s.operationIds) do if id==ARGV[2] then return {'ok',raw} end end
if s.revision~=tonumber(ARGV[1]) then return {'conflict',raw} end
s.position=cjson.decode(ARGV[3]); s.revision=s.revision+1; s.source=ARGV[4]; s.updatedAt=tonumber(ARGV[5])
table.insert(s.operationIds,ARGV[2]); if #s.operationIds>64 then table.remove(s.operationIds,1) end
local result=cjson.encode(s); redis.call('SET',KEYS[1],result,'EX',2592000); return {'ok',result}`;
export default async function handler(req: Request, res: Response) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.status(405).json({ error: 'method' }); return; }
  const body = req.body ?? {};
  if (JSON.stringify(body).length > 4096) { res.status(413).json({ error: 'too-large' }); return; }
  try {
    const ip = String(req.headers['x-forwarded-for'] ?? 'unknown').split(',')[0];
    const credential = String(req.headers.authorization ?? '').replace(/^Bearer /, '');
    const authenticatedShape = /^[a-f0-9]{64}$/.test(credential);
    const bucket = `sync:rate:${hash(authenticatedShape ? credential : ip)}:${Math.floor(Date.now()/60000)}`;
    const hits = Number(await redis('INCR', bucket));
    if (hits === 1) await redis('EXPIRE', bucket, 120);
    if (hits > (authenticatedShape ? 600 : 180)) { res.status(429).json({ error: 'rate-limit' }); return; }
    if (body.action === 'create') {
      if (!validPosition(body.position)) { res.status(400).json({ error: 'position' }); return; }
      const key = `sync:create:${hash(ip)}:${Math.floor(Date.now()/3600000)}`;
      const n = Number(await redis('INCR', key)); if (n === 1) await redis('EXPIRE', key, 3600);
      if (n > 5) { res.status(429).json({ error: 'pairing-limit' }); return; }
      const token = randomBytes(32).toString('hex');
      let code = '';
      for (let attempt = 0; attempt < 8; attempt++) {
        const candidate = String(randomInt(100000, 1000000));
        if (await redis('SET', `sync:pair:${hash(candidate)}`, token, 'EX', 600, 'NX')) { code = candidate; break; }
      }
      if (!code) throw new Error('pairing-busy');
      const state: Snapshot = { position: body.position, revision: 0, source: 'web', updatedAt: Date.now(), operationIds: [] };
      await redis('SET', `sync:room:${hash(token)}`, JSON.stringify(state), 'EX', 2592000);
      res.json({ token, code, state }); return;
    }
    if (body.action === 'join') {
      const joinKey = `sync:join:${hash(ip)}:${Math.floor(Date.now()/60000)}`;
      const attempts = Number(await redis('INCR', joinKey));
      if (attempts === 1) await redis('EXPIRE', joinKey, 120);
      if (attempts > 5) { res.status(429).json({ error: 'Vent ett minutt før du prøver igjen' }); return; }
      if (typeof body.code !== 'string' || !/^(?:[0-9]{6}|[A-F0-9]{10})$/.test(body.code)) { res.status(400).json({ error: 'code' }); return; }
      const token = await redis('GETDEL', `sync:pair:${hash(body.code)}`);
      if (typeof token !== 'string') { res.status(404).json({ error: 'expired-code' }); return; }
      const state = await redis('GET', `sync:room:${hash(token)}`);
      res.json({ token, state: JSON.parse(String(state)) }); return;
    }
    const token = String(req.headers.authorization ?? '').replace(/^Bearer /, '');
    if (!/^[a-f0-9]{64}$/.test(token)) { res.status(401).json({ error: 'auth' }); return; }
    const room = `sync:room:${hash(token)}`;
    if (body.action === 'get') {
      const state = await redis('GET', room);
      if (typeof state !== 'string') { res.status(404).json({ error: 'expired-room' }); return; }
      if (body.source === 'watch') {
        await redis('SET', `${room}:watch`, Date.now(), 'EX', 120);
        await redis('SET', `${room}:watch-conflict`, body.conflict === true ? 1 : 0, 'EX', 120);
      }
      const watchLastSeen = await redis('GET', `${room}:watch`);
      const watchConflict = Number(await redis('GET', `${room}:watch-conflict`)) === 1;
      res.json({ state: JSON.parse(state), watchLastSeen: Number(watchLastSeen) || null, watchConflict }); return;
    }
    if (body.action === 'set' && validPosition(body.position) && Number.isInteger(body.revision)
        && typeof body.operationId === 'string' && /^[a-zA-Z0-9-]{16,80}$/.test(body.operationId)
        && (body.source === 'web' || body.source === 'watch')) {
      const [result, raw] = await redis('EVAL', CAS, 1, room, Number(body.revision), body.operationId, JSON.stringify(body.position), body.source, Date.now()) as string[];
      if (result === 'missing') { res.status(404).json({ error: 'expired-room' }); return; }
      if (body.source === 'watch') {
        await redis('SET', `${room}:watch`, Date.now(), 'EX', 120);
        await redis('SET', `${room}:watch-conflict`, result === 'conflict' ? 1 : 0, 'EX', 120);
      }
      const watchLastSeen = await redis('GET', `${room}:watch`);
      const watchConflict = Number(await redis('GET', `${room}:watch-conflict`)) === 1;
      res.status(result === 'conflict' ? 409 : 200).json({ state: JSON.parse(raw), watchLastSeen: Number(watchLastSeen) || null, watchConflict }); return;
    }
    res.status(400).json({ error: 'request' });
  } catch (e) { res.status(503).json({ error: e instanceof Error && e.message === 'storage-unconfigured' ? 'Synk er ikke konfigurert ennå' : 'Synk er midlertidig utilgjengelig' }); }
}
