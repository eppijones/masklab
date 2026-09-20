import http from 'node:http';
import { createServer } from 'vite';
import handler from '../../api/sync';
process.env.UPSTASH_REDIS_REST_URL='http://127.0.0.1:8079';
process.env.UPSTASH_REDIS_REST_TOKEN='local-test';
const vite=await createServer({server:{middlewareMode:true},appType:'spa'});
const dropped = new Set<string>();
http.createServer(async(req,res)=>{
 if(req.url==='/api/sync' || req.url==='/api/sync-flaky'){
  let body='';for await(const chunk of req)body+=chunk;
  const parsed=JSON.parse(body||'{}');
  const identity=String(req.headers.authorization);
  const fail=req.url==='/api/sync-flaky' && parsed.action==='set' && !dropped.has(identity);
  await handler({method:req.method,headers:req.headers,body:parsed},{status(n){res.statusCode=n;return this},setHeader(k,v){res.setHeader(k,v)},json(value){
   res.setHeader('Content-Type','application/json');
   if(fail){dropped.add(identity);res.statusCode=502;res.end(JSON.stringify({error:'simulated-lost-ack'}));}
   else res.end(JSON.stringify(value));
  }});
 }else vite.middlewares(req,res);
}).listen(5179,'127.0.0.1',()=>console.log('Sync integration test server http://127.0.0.1:5179'));
