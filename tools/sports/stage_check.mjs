import { chromium } from 'playwright';
const BASE=process.argv[2];
const b=await chromium.launch();
for (const [name,ctx] of [['desktop',{viewport:{width:1280,height:720}}],['phone',{viewport:{width:844,height:390},isMobile:true,hasTouch:true}]]) {
 for (const qs of ['', '?sports=0']) {
  const c=await b.newContext(ctx); const p=await c.newPage(); const errs=[];
  p.on('pageerror',e=>errs.push(String(e))); p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
  await p.goto(BASE+qs,{waitUntil:'load'}); await p.waitForFunction(()=>window.kilumen?.ready,null,{timeout:60000}); await p.evaluate(()=>window.kilumen.ready); await p.waitForTimeout(3000);
  const r=await p.evaluate(async()=>{const k=window.kilumen; const v=[...document.scripts].map(s=>s.src).find(s=>/main\.js/.test(s));
    const map=await (await fetch(new URL('art/world/overworld/maps/brookhollow.json',location.href))).json();
    return {sports:!!k.sports, api:k.sports?Object.keys(k.sports):null, tourney:k.sports?.tourney?.().status?.msg, main:v, coach:map.npcs.find(n=>n.id==='dash_coach'), ver:document.body.innerText.match(/v0\.2\.\d+/)?.[0]};});
  console.log(name, qs||'(default)', JSON.stringify(r), 'errors:', errs.filter(e=>!/favicon/.test(e)));
  await c.close();
 }
}
await b.close();
