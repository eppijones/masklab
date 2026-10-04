import { build } from 'vite';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, readFileSync } from 'node:fs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const source=resolve(root,'invent_v1/prototype');
for(const name of ['manifest.json','x1-reference-slice.json','heklomat-oyvind-printpakke.zip','patentutkast.html']) {
  if(!existsSync(resolve(source,'public',name)))throw new Error(`Missing ${name}; follow prototype/README.md to build the print package.`);
}
const manifest=JSON.parse(readFileSync(resolve(source,'public/manifest.json'),'utf8'));
const quote=JSON.parse(readFileSync(resolve(source,'public/x1-reference-slice.json'),'utf8'));
for(const p of manifest.parts.filter(p=>p.fullQty.installed+p.fullQty.spare>0))if(quote.sha256[p.id]!==p.sha256)throw new Error(`Outdated print estimate for ${p.id}`);
await build({configFile:resolve(source,'vite.config.ts'),base:'/heklomat/',build:{outDir:resolve(root,'public/heklomat'),emptyOutDir:true}});
console.log('HEKLOMAT standalone page built at public/heklomat');
