import { chromium } from 'playwright';
const b = await chromium.launch(); const ctx = await b.newContext({viewport:{width:1280,height:800}}); const p = await ctx.newPage();
p.on('pageerror', e => console.log('ERR', e.message));
p.on('console', m => { if (m.type()==='error'||m.type()==='warning') console.log('C', m.text().slice(0,200)); });
await p.goto('http://localhost:8765/kilumen/index.html?audio=0');
await p.evaluate(() => window.kilumen.ready); await p.waitForTimeout(2500);
await p.keyboard.press('Enter'); await p.waitForTimeout(1000);
for (let i=0;i<60;i++){ const st = await p.evaluate(() => !!window.kilumen.scene.dialog?.active || !!window.kilumen.scene.busy || !!window.kilumen.scene.fade || !!window.kilumen.scene.player.locked); if(!st) break; await p.keyboard.press('Enter'); await p.waitForTimeout(300);}
// open a dialog and leave it mid-way
await p.evaluate(() => { const s=window.kilumen.scene; s.script(async()=>{ await s.say(["That's two in the Kilindex. STALE TEST LINE"]); }); });
await p.waitForTimeout(800);
await p.evaluate(() => { const s=window.kilumen.scene; s._dirty=true; s.saveNow?.(); window.kilumen.save.flush?.(); });
await p.waitForTimeout(1500);
const t0=Date.now(); await p.reload();
for (const t of [500,1500,3000,5000,8000,11000,13000]) { await p.waitForTimeout(t-(Date.now()-t0)>0?t-(Date.now()-t0):0);
  console.log(t, await p.evaluate(() => JSON.stringify({ui: !!window.kilumen?.ui, act: window.kilumen?.ui?.active?.scr||window.kilumen?.ui?.active, dlg: document.querySelector('.dlg-text, .dlg')?.innerText?.slice(0,80), dlgHidden: document.querySelector('.dlg-wrap, .dlg')?.hidden, fade: !!window.kilumen?.scene?.fade, intro: window.kilumen?.scene?.intro?.state || null })).catch(e=>'x'));
  await p.screenshot({path:`/tmp/rl_${t}.png`}); }
await b.close();
