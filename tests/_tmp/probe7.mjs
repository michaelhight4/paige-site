import { chromium } from 'playwright';
const b = await chromium.launch(); const p = await (await b.newContext({viewport:{width:1280,height:800}})).newPage();
p.on('pageerror', e => console.log('ERR', e.message)); p.on('console', m => { if (m.type()==='error') console.log('C', m.text().slice(0,200)); });
await p.goto('http://localhost:8765/kilumen/index.html?save=0&audio=0');
await p.evaluate(() => window.kilumen.ready); await p.waitForTimeout(2500);
await p.keyboard.press('Enter'); await p.waitForTimeout(1000);
for (let i=0;i<80;i++){ const st = await p.evaluate(() => !!window.kilumen.scene.dialog?.active || !!window.kilumen.scene.busy || !!window.kilumen.scene.fade || !!window.kilumen.scene.player.locked || window.kilumen.ui.active); if(!st) break; await p.keyboard.press('Enter'); await p.waitForTimeout(300);}
const ban = () => p.evaluate(() => { const b=document.querySelector('.hud-banner'); return window.kilumen.scene.map.name+' | '+(b?.className)+' | '+b?.innerText?.replace(/\s+/g,' ')+' | RITA nodes: '+[...document.body.querySelectorAll('body > *')].filter(e=>/^\s*RITA\s*$/.test(e.innerText||e.textContent)).length; });
const spots = {fernwick:[20,20], saltmere_hall_int:null, mirefen_hall_int:null, heal_saltmere:null};
const mc = await p.evaluate(()=>import('/kilumen/src/dev/console.js?v=v0.2.61-alpha').then(m=>{m.installDevConsole(window.kilumen.scene,{ok:true,role:'admin'}); return 1;}));
const rita = () => p.evaluate(() => { const out=[]; const w=document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n; while((n=w.nextNode())){ if(/RITA/.test(n.textContent)){ const e=n.parentElement; const r=e.getBoundingClientRect(); const cs=getComputedStyle(e); if(r.width&&cs.visibility!=='hidden'&&cs.display!=='none'&&+cs.opacity>0) out.push(e.tagName+'.'+e.className+'#'+e.id+' '+JSON.stringify(n.textContent.slice(0,40))+' '+Math.round(r.x)+','+Math.round(r.y)+' op'+cs.opacity+' par:'+(e.parentElement?.className||e.parentElement?.tagName)); } } return out; });
const spots2 = await p.evaluate(async()=>{ const s=window.kilumen.scene; const r={}; for (const n of ['fernwick','saltmere_hall_int','mirefen','mirefen_hall_int','heal_saltmere']) { const m=await s.loadMap(n); let f=null; for(let y=1;y<m.height-1&&!f;y++)for(let x=1;x<m.width-1&&!f;x++) if(m.isWalkable(x,y)&&!m.npcAt?.(x,y)) f=[x,y]; r[n]=f;} return r; });
for (const n of ['fernwick','saltmere_hall_int','mirefen','mirefen_hall_int','heal_saltmere']) {
  await p.evaluate(([n,xy])=>window.kilumen.scene.startWarp({map:n,x:xy[0],y:xy[1],facing:'down'},'dev'), [n, spots2[n]]);
  for (const w of [1500,3500]) { await p.waitForTimeout(w===1500?1500:2000); console.log(n, w, await ban(), JSON.stringify(await rita())); }
  await p.screenshot({path:`/tmp/tr_${n}.png`});
}
await b.close();
