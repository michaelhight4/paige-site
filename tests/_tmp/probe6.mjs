import { chromium } from 'playwright';
const b = await chromium.launch(); const p = await (await b.newContext({viewport:{width:1280,height:800}})).newPage();
p.on('pageerror', e => console.log('ERR', e.message));
await p.goto('http://localhost:8765/kilumen/index.html?save=0&audio=0');
await p.evaluate(() => window.kilumen.ready); await p.waitForTimeout(2500);
await p.keyboard.press('Enter'); await p.waitForTimeout(1000);
for (let i=0;i<80;i++){ const st = await p.evaluate(() => !!window.kilumen.scene.dialog?.active || !!window.kilumen.scene.busy || !!window.kilumen.scene.fade || !!window.kilumen.scene.player.locked || window.kilumen.ui.active); if(!st) break; await p.keyboard.press('Enter'); await p.waitForTimeout(300);}
await p.evaluate(async () => { const s=window.kilumen.scene; const m = await import('/kilumen/src/systems/creature.js?v=v0.2.61-alpha'); s.systems.party.add(m.createCreature({species:'nibbin', level:20}),1); for (const h of s.progression.masters.halls) s.flags.add(h.flag); const u=window.kilumen.ui; u.open('phone'); u.open('pack'); });
await p.waitForTimeout(800);
const r = await p.evaluate(async()=>{const u=window.kilumen.ui; const m=await import('/kilumen/src/systems/items.js?v=v0.2.61-alpha'); u.top.onTab(m.POCKETS.indexOf('key')); await new Promise(r=>setTimeout(r,300)); return u.top.scr+' '+document.body.innerText.replace(/\s+/g,' ').slice(0,900);}); console.log('KEY:', r); await p.screenshot({path:'/tmp/key.png'});
await p.evaluate(()=>{const u=window.kilumen.ui; u.closeAll(); u.open('phone'); u.open('team');}); await p.waitForTimeout(600); await p.keyboard.press('Enter'); await p.waitForTimeout(800);
console.log('TEAM:', (await p.evaluate(()=>document.body.innerText)).replace(/\s+/g,' ').slice(0,900)); await p.screenshot({path:'/tmp/team.png'});
await b.close();
