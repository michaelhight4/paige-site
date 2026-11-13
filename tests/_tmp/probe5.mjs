import { chromium } from 'playwright';
const b = await chromium.launch(); const p = await (await b.newContext({viewport:{width:1280,height:800}})).newPage();
p.on('pageerror', e => console.log('ERR', e.message));
await p.goto('http://localhost:8765/kilumen/index.html?save=0&audio=0&dev=1');
await p.evaluate(() => window.kilumen.ready); await p.waitForTimeout(2500);
await p.keyboard.press('Enter'); await p.waitForTimeout(1000);
for (let i=0;i<80;i++){ const b2 = await p.evaluate(() => !!window.kilumen.scene.dialog?.active || !!window.kilumen.scene.busy || !!window.kilumen.scene.fade || !!window.kilumen.scene.player.locked || window.kilumen.ui.active); if(!b2) break; await p.keyboard.press('Enter'); await p.waitForTimeout(300);}
await p.evaluate(async()=>{const s=window.kilumen.scene; s.flags.add('got_starter'); const m=await import('/kilumen/src/dev/console.js?v=v0.2.60-alpha'); m.installDevConsole(s,{ok:true,role:'admin'});}); await p.keyboard.press('F2'); await p.waitForTimeout(400); console.log('F2 fresh', await p.evaluate(()=>!!document.querySelector('.kdev'))); await p.keyboard.press('Escape'); await p.waitForTimeout(600);
const st = () => p.evaluate(() => { const u=window.kilumen.ui, s=window.kilumen.scene; return JSON.stringify({active:u.active, stack:u.stack?.map(x=>x.scr), modal:!!u.modal, pend:u._pendingOpen, busy:!!s.busy, fade:!!s.fade, dlg:!!s.dialog?.active, mv:!!s.player?.moving, closing: u._closing, kdev: !!document.querySelector('.kdev')}); });
console.log('start', await st());
for (let n of [3,4,5,7,8]) { for (let i=0;i<n;i++){ await p.keyboard.press('Escape'); await p.waitForTimeout(40+i*37%90);} await p.waitForTimeout(800); console.log('after', n, await st());
  await p.keyboard.press('F2'); await p.waitForTimeout(400); console.log(' F2', await st()); await p.keyboard.press('Escape'); await p.waitForTimeout(600); }
await b.close();
