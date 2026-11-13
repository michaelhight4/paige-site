import { chromium } from 'playwright';
const b = await chromium.launch(); const page = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
await page.goto(process.argv[2] + 'kilumen/index.html'); await page.waitForFunction(() => window.kilumen?.scene?.tileset, null, { timeout: 30000 }); await page.evaluate(() => window.kilumen.ready);
await page.waitForTimeout(1500); await page.keyboard.press('Enter'); await page.waitForTimeout(1000);
console.log(await page.evaluate(() => [...document.querySelectorAll('.ui-root button')].map(b=>b.textContent.trim()).slice(0,12)));
for (let i=0;i<6;i++){ const n = await page.evaluate(() => document.querySelector('.ui-root.open') ? 1 : 0); if(!n) break; await page.keyboard.press('Escape'); await page.waitForTimeout(400); await page.keyboard.press('Enter'); await page.waitForTimeout(600);} 
for (let i=0;i<80;i++){ const st = await page.evaluate(() => ({l: window.kilumen.scene.player.locked, d: !!document.querySelector('.dlg-wrap.open,.ui-root.open')})); if(!st.l && !st.d) break; await page.keyboard.press(st.d && i%7==6 ? 'Escape':'Enter'); await page.waitForTimeout(350);} 
console.log(await page.evaluate(() => ({ locked: window.kilumen.scene.player.locked, hold: !!document.querySelector('.ui-title') , map: window.kilumen.scene.map.name})));
await page.evaluate(async () => { const s = window.kilumen.scene; s.startWarp({ map: 'house_1f', x: 5, y: 8, facing: 'down' }, 'door'); for (let i = 0; i < 100 && s.fade; i++) await new Promise((r) => setTimeout(r, 50)); });
console.log(await page.evaluate(() => ({ locked: window.kilumen.scene.player.locked, map: window.kilumen.scene.map.name, ui: [...document.body.children].filter(e=>e.offsetHeight>300).map(e=>e.className).join('|') })));
for (let i=0;i<120;i++){ const st = await page.evaluate(() => ({l: window.kilumen.scene.player.locked||!!window.kilumen.scene.fade, d: !!document.querySelector('.dlg-wrap.open,.ui-root.open')})); if(!st.l && !st.d) break; await page.keyboard.press(st.d && i%9==8 ? 'Escape':'Enter'); await page.waitForTimeout(350);}
console.log('after cutscene', await page.evaluate(() => { const s = window.kilumen.scene; s.player.place(5, 8, 'down'); return [s.map.name, s.player.locked]; }));
await page.waitForTimeout(300); await page.keyboard.down('ArrowDown'); await page.waitForTimeout(900); await page.keyboard.up('ArrowDown'); await page.waitForTimeout(2500);
console.log(await page.evaluate(() => { const s = window.kilumen.scene; return { map: s.map.name, x: s.player.x, y: s.player.y, facing: s.player.facing }; }));
await page.screenshot({ path: '/tmp/exit.png' }); await b.close();
// save/load + kill switch
const b2 = await chromium.launch(); const ctx2 = await b2.newContext({ viewport: { width: 1280, height: 720 } }); const p2 = await ctx2.newPage();
await p2.goto(process.argv[2] + 'kilumen/index.html'); await p2.waitForFunction(() => window.kilumen?.scene?.tileset, null, { timeout: 30000 }); await p2.evaluate(() => window.kilumen.ready);
await p2.waitForTimeout(1500); await p2.keyboard.press('Enter'); await p2.waitForTimeout(1000);
for (let i=0;i<120;i++){ const st = await p2.evaluate(() => ({l: window.kilumen.scene.player.locked||!!window.kilumen.scene.fade, d: !!document.querySelector('.dlg-wrap.open,.ui-root.open')})); if(!st.l && !st.d) break; await p2.keyboard.press(st.d && i%9==8 ? 'Escape':'Enter'); await p2.waitForTimeout(350);}
await p2.evaluate(async () => { const s = window.kilumen.scene; s.startWarp({ map: 'house_1f', x: 5, y: 8, facing: 'down' }, 'door'); for (let i = 0; i < 100 && s.fade; i++) await new Promise((r) => setTimeout(r, 50)); });
for (let i=0;i<120;i++){ const st = await p2.evaluate(() => ({l: window.kilumen.scene.player.locked||!!window.kilumen.scene.fade, d: !!document.querySelector('.dlg-wrap.open,.ui-root.open')})); if(!st.l && !st.d) break; await p2.keyboard.press(st.d && i%9==8 ? 'Escape':'Enter'); await p2.waitForTimeout(350);}
await p2.waitForTimeout(3000);
const keys = await p2.evaluate(() => Object.keys(localStorage).map(k => k + ':' + (localStorage.getItem(k)||'').length));
const saved = await p2.evaluate(() => { const k = Object.keys(localStorage).find(k => /save/.test(k)); const v = k && localStorage.getItem(k); return k + ' has house_1f=' + (v||'').includes('house_1f') + ' has house_1f_v2=' + (v||'').includes('house_1f_v2'); });
console.log('keys', keys.join(' '), '|', saved, 'before reload map', await p2.evaluate(() => window.kilumen.scene.map.name));
await p2.goto(process.argv[2] + 'kilumen/index.html'); await p2.waitForFunction(() => window.kilumen?.scene?.tileset, null, { timeout: 30000 }); await p2.evaluate(() => window.kilumen.ready); await p2.waitForTimeout(1500);
await p2.keyboard.press('Enter'); await p2.waitForTimeout(2500);
console.log('after reload+continue', await p2.evaluate(() => { const s = window.kilumen.scene; return [s.map.name, s.player.x, s.player.y]; }));
await p2.goto(process.argv[2] + 'kilumen/index.html?ix2=0'); await p2.waitForFunction(() => window.kilumen?.scene?.tileset, null, { timeout: 30000 });
console.log('ix2=0 ->', await p2.evaluate(() => [window.kilumen.scene.ixlight.flags.ix2, window.kilumen.scene.mapUrl('house_1f'), location.search]));
await b2.close();
