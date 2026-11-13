// Staging/live check: give a team + 400 gold on day 3, run a practice and a paid tournament via the venue API; gold math.
import { chromium } from 'playwright';
const BASE=process.argv[2]; const b=await chromium.launch();
for (const [name,ctx] of [['desktop',{viewport:{width:1280,height:720}}],['phone',{viewport:{width:844,height:390},isMobile:true,hasTouch:true}]]) {
 const c=await b.newContext(ctx); const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(String(e)));
 await p.goto(BASE,{waitUntil:'load'}); await p.waitForFunction(()=>window.kilumen?.ready,null,{timeout:60000}); await p.evaluate(()=>window.kilumen.ready); await p.waitForFunction(()=>window.kilumen.sports,null,{timeout:30000});
 await p.evaluate(async()=>{const sc=window.kilumen.scene; const {createCreature}=await import(document.querySelector('script[src*="main.js"]').src.replace(/main\.js.*/,'systems/creature.js?v=v0.2.37-alpha'));
  sc.party.length=0; sc.party.push(createCreature({species:'nibbin',level:9,uid:'c-s1'})); sc.systems.wallet.n=400; sc.clock.day=3; window.kilumen.sports.openVenue();});
 const tap=async(s)=>name==='phone'?p.tap(s):p.click(s);
 const run=async(a)=>{await tap(`#sports-ov [data-a=${a}]`); await p.waitForSelector('#sports-ov .mon'); await tap('#sports-ov .mon');
  let mid=null; for(let i=0;i<2500;i++){const s=await p.evaluate(()=>window.kilumen.sports.state()); if(s.phase==='results')break; if(s.phase==='race'&&mid===null) mid=await p.evaluate(()=>window.kilumen.scene.saveNow()); if(s.phase==='race'&&i%10===0) await (name==='phone'?p.tap('#sports-ov canvas'):p.keyboard.press('Space')); await p.waitForTimeout(40);}
  const r=await p.evaluate(()=>({coins:window.kilumen.scene.systems.wallet.coins,text:document.querySelector('#sports-results')?.innerText.slice(0,120)})); await tap('#sports-ov [data-a=close]'); await p.waitForSelector('#sports-venue'); return {...r,saveMid:mid};};
 const pr=await run('practice'); const tr=await run('tourney'); const won=/Champion/.test(tr.text||'');
 console.log(name,'practice',pr.coins===400?'PASS':'FAIL',pr.coins,'saveMid',pr.saveMid,'| tourney',tr.coins===250+(won?1000:0)?'PASS':'FAIL',tr.coins,won?'won':'lost','saveMid',tr.saveMid,'| errors',errs);
 await c.close();
}
await b.close();
