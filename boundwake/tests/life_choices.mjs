// Mid-life lifecycle, save-guard, Autopilot and phone regression.
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pp = require('puppeteer-core');
const root = process.env.BW_TEST_ROOT || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mime = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.ogg': 'audio/ogg', '.mp3': 'audio/mpeg', '.png': 'image/png',
  '.webp': 'image/webp', '.json': 'application/json', '.ico': 'image/x-icon',
};

function assert(cond, msg) { if (!cond) throw new Error(msg); }

const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  if (urlPath === '/') urlPath = '/index.html';
  const file = path.join(root, urlPath.replace(/^\//, ''));
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404); res.end('missing'); return;
  }
  res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const base = `http://127.0.0.1:${port}/`;

const browser = await pp.launch({
  executablePath: '/usr/bin/google-chrome', protocolTimeout: 20000,
  args: ['--no-sandbox', '--disable-gpu', '--autoplay-policy=no-user-gesture-required',
         '--use-fake-ui-for-media-stream', '--allow-file-access-from-files'],
});
const page = await browser.newPage();
page.setDefaultTimeout(15000);
await page.setViewport({width:1280,height:800});
const errors=[];const forbiddenRequests=[];page.on('request',r=>{if(/stripe\.com|admob|doubleclick\.net|googlesyndication\.com/.test(r.url()))forbiddenRequests.push(r.url());});page.on('pageerror',e=>errors.push(e.message));
let accept=true;page.on('dialog',d=>accept?d.accept():d.dismiss());
const read=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('bw.save.v1')));
const meta=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('bw.meta.v1')));
async function fixture(){
 await page.goto(base+'?skipintro=1',{waitUntil:'networkidle0'});
 await page.evaluate(async()=>{const E=await import('./src/bw_engine.js?v=lifechoices1');const {loadPack}=await import('./src/pack.js');E.setPack(await loadPack());const m={echoes:{echo_might:2}};E.ensureLegacyMeta(m);m.legacy.testSentinel='keep';const s=E.begin(E.rollFate(123,m),m);s.age=30;s.pending=[];s.lifeEpoch=10;s.savedAt=Date.now();s.logSeq=s.log.length;localStorage.setItem('bw.save.v1',JSON.stringify(s));localStorage.setItem('bw.meta.v1',JSON.stringify(m));});
 await page.reload({waitUntil:'networkidle0'});await page.waitForSelector('[data-a="newlife"]');
 if(process.env.BW_TEST_ROOT)assert(await page.$$eval('[data-tab="passes"],[data-a="phonepasses"]',bs=>bs.length===0),'itch desktop Passes visible');
}
try {
 console.log('Checking shared-engine Autopilot'); await fixture();const autoResult=await page.evaluate(async()=>{const A=await import('./src/autopilot.js?v=lifechoices1');const state=JSON.parse(localStorage.getItem('bw.save.v1'));return await A.skipYears(state,1,{waitMs:0});});assert(!autoResult.locked&&typeof autoResult.done==='number','Autopilot shared engine/platform gate failed');
 console.log('Checking New Life'); await fixture();let before=await read();accept=false;await page.click('[data-a="newlife"]');assert((await read()).lifeEpoch===before.lifeEpoch,'cancel changed life');
 accept=true;await page.click('[data-a="newlife"]');await page.waitForSelector('#go');let abandoned=await read();assert(abandoned.awaitingFate&&abandoned.lifeEpoch>before.lifeEpoch,'missing persistent higher-epoch creation boundary');assert((await meta()).echoes.echo_might===2,'abandon granted/lost echoes');assert((await meta()).legacy.testSentinel==='keep','legacy lost');
 await page.reload({waitUntil:'networkidle0'});await page.waitForSelector('#go');assert((await read()).awaitingFate,'creation did not persist through reload');
 await page.click('#go');await page.waitForSelector('[data-a="giveup"]');assert((await read()).alive&&(await read()).age===0,'new life did not begin at age0');assert((await meta()).echoes.echo_might===2,'new life minted echo');
 console.log('Checking live cross-tab sync/no save ping-pong');
 await fixture();const peer=await browser.newPage();await peer.setViewport({width:1280,height:800});await peer.evaluateOnNewDocument(()=>{window.testSaveEvents=0;addEventListener('storage',e=>{if(e.key==='bw.save.v1')window.testSaveEvents++;});});await peer.goto(base+'?skipintro=1',{waitUntil:'networkidle0'});await peer.waitForSelector('[data-a="newlife"]');await page.bringToFront();await page.screenshot({path:path.join(path.dirname(fileURLToPath(import.meta.url)),'shots/life_choices_pc'+(process.env.BW_TEST_ROOT?'_itch':'')+'.png'),fullPage:true});await page.click('[data-a="newlife"]');await peer.waitForSelector('#go',{timeout:15000});await peer.evaluate(()=>new Promise(r=>setTimeout(r,250)));assert(await peer.evaluate(()=>window.testSaveEvents)<6,'cross-tab save ping-pong');await peer.close();
 // Stale tab: deliberately suppress notifications, then exercise the synchronous guard.
 console.log('Checking stale-tab guard'); await fixture();const stale=await browser.newPage();stale.on('dialog',d=>{errors.push('unexpected stale-tab confirmation');d.dismiss();});stale.on('pageerror',e=>errors.push('stale: '+e.message));await stale.setViewport({width:1280,height:800});stale.setDefaultTimeout(15000);await stale.evaluateOnNewDocument(()=>{window.BroadcastChannel=class extends EventTarget{postMessage(){} close(){}};window.addEventListener('storage',e=>e.stopImmediatePropagation(),true);});await stale.goto(base+'?skipintro=1',{waitUntil:'networkidle0'});await stale.waitForSelector('[data-a="newlife"]');
 await page.bringToFront();await page.click('[data-a="newlife"]');await page.waitForSelector('#go');const epoch=(await read()).lifeEpoch;await stale.bringToFront();await stale.click('[data-a="newlife"]');await stale.waitForSelector('#go');assert((await read()).lifeEpoch===epoch,'stale lifecycle action overrode new epoch');await stale.close();
 console.log('Checking Give Up'); await fixture();accept=false;await page.click('[data-a="giveup"]');assert((await read()).alive,'cancel Give Up ended life');accept=true;await page.click('[data-a="giveup"]');await page.waitForSelector('[data-a="reinc"]');const dead=await read();assert(!dead.alive&&dead.pending.length===0&&dead.lifeEpoch>10,'Give Up did not end/guard life');assert((await meta()).echoes.echo_might===2,'Give Up granted reward before normal choice');await page.click('[data-a="reinc"]');await page.waitForSelector('[data-a="newlife"]');assert((await read()).alive,'reincarnation failed');const m=await meta();assert(Object.values(m.echoes).reduce((a,b)=>a+b,0)===3&&m.cemetery.length===1,'normal reincarnation must grant exactly one echo/record');
 // Injecting a repeated death choice while alive must do nothing.
 await page.evaluate(()=>{const b=document.createElement('button');b.dataset.a='reinc';b.dataset.v='echo_might';document.querySelector('#app').append(b);b.click();b.remove();});assert(Object.values((await meta()).echoes).reduce((a,b)=>a+b,0)===3,'duplicate death reward');
 console.log('Checking phone'); await fixture();await page.setViewport({width:390,height:844,hasTouch:true,isMobile:true});await page.reload({waitUntil:'networkidle0'});await page.waitForSelector('[data-tab="menu"]');await page.click('[data-tab="menu"]');await page.waitForSelector('.life-choices');const targets=await page.$$eval('.life-choices button',bs=>bs.map(b=>b.getBoundingClientRect().height));assert(targets.length===2&&targets.every(h=>h>=48),'phone targets under48px');await page.$eval('.life-choices',el=>el.scrollIntoView({block:'center'}));await page.screenshot({path:path.join(path.dirname(fileURLToPath(import.meta.url)),'shots/life_choices_phone'+(process.env.BW_TEST_ROOT?'_itch':'')+'.png'),fullPage:true});
 if(process.env.BW_TEST_ROOT){assert(await page.evaluate(()=>window.__BW_ITCH===true),'itch platform flag missing');assert(await page.evaluate(async()=>{const A=await import('./src/ads.js');const P=await import('./src/payments.js');return A.platform()==='itch'&&!A.rules().ads&&P.channel()==='itch';}),'itch ads/payment policy incorrect');assert(await page.$$eval('[data-tab="passes"],[data-a="passes"],[data-a="phonepasses"]',bs=>bs.length===0),'itch Passes entry visible');assert(forbiddenRequests.length===0,'itch requested ads/Stripe');}
 accept=false;await page.click('[data-a="giveup"]');assert((await read()).alive,'phone Give Up cancel failed');accept=true;await page.click('[data-a="giveup"]');await page.waitForSelector('[data-a="reinc"]');await page.click('[data-a="reinc"]');await page.waitForSelector('[data-tab="menu"]');await page.click('[data-tab="menu"]');await page.click('[data-a="newlife"]');await page.waitForSelector('#go');assert((await read()).awaitingFate,'phone New Life failed');
 assert(errors.length===0,'page errors: '+errors.join('; '));console.log('PASS lifecycle: cancel/newlife/reload/legacy/no bonus/stale tab/Give Up/reincarnation/idempotence/real-tab sync/no echo loop/48px phone actions; no page errors');
} finally {await browser.close();server.close();}
