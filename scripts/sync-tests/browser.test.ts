import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
const base='http://127.0.0.1:5179';
const browser=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--no-sandbox']});
try {
 const result=await fetch(base+'/api/sync',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'create',position:{patternId:'ro-ro-ro',round:29,completed:40}})}).then(r=>r.json());
 assert(result.token);
 const pages=[];
 for(let i=0;i<2;i++){
  const context=await browser.createBrowserContext(); const page=await context.newPage();
  await page.setViewport({width:1440,height:1000});
  await page.evaluateOnNewDocument((token)=>{
   localStorage.setItem('masklab-watch-sync-v1',JSON.stringify({token,revision:0}));
  },result.token);
  await page.goto(base+'/oppskrift/ro-ro-ro?steg=round-29',{waitUntil:'networkidle0'});
  await page.evaluate(async()=>{const {useApp}=await import(/* @vite-ignore */ String('/src/store.ts'));useApp.getState().setWelcomeDone(true)});
  pages.push(page);
 }
 const value=async(page:any)=>page.evaluate(async()=>{const {useApp,getModel}=await import(/* @vite-ignore */ String('/src/store.ts'));const s=useApp.getState();return {round:getModel().rounds[getModel().steps[s.stepIndex].roundIdx]?.num,completed:s.stitchCursor}});
 await new Promise(r=>setTimeout(r,2500));
 assert.deepEqual(await value(pages[0]),{round:29,completed:40});
 await pages[0].evaluate(async()=>{const {useApp}=await import(/* @vite-ignore */ String('/src/store.ts'));useApp.getState().setStitchCursor(44)});
 await new Promise(r=>setTimeout(r,2500));
 assert.deepEqual(await value(pages[1]),{round:29,completed:44});
 await pages[1].evaluate(async()=>{const {useApp}=await import(/* @vite-ignore */ String('/src/store.ts'));useApp.getState().setStitchCursor(20)});
 await new Promise(r=>setTimeout(r,2500));
 assert.deepEqual(await value(pages[0]),{round:29,completed:20});
 await pages[1].setOfflineMode(true);
 await pages[1].evaluate(async()=>{const {useApp}=await import(/* @vite-ignore */ String('/src/store.ts'));useApp.getState().setStitchCursor(21)});
 await pages[0].evaluate(async()=>{const {useApp}=await import(/* @vite-ignore */ String('/src/store.ts'));useApp.getState().setStitchCursor(25)});
 await new Promise(r=>setTimeout(r,2500));
 await pages[1].setOfflineMode(false);
 await new Promise(r=>setTimeout(r,3500));
 assert.deepEqual(await value(pages[1]),{round:29,completed:21},'offline local edit retained during conflict');
 await pages[1].click('button[aria-label="Klokkesynk"]');
 await pages[1].waitForSelector('section[aria-label="Klokkesynk"]');
 const text=await pages[1].$eval('section[aria-label="Klokkesynk"]',el=>el.textContent);
 assert(text?.includes('To ulike posisjoner'));
 await pages[1].screenshot({path:'/tmp/masklab-sync-conflict.png',fullPage:true});
 console.log('PASS two browser contexts: initial position, 40→44, 44→20 backward, offline edits retained, conflict visible');
}finally{await browser.close()}
