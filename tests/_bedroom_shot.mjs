import { chromium } from 'playwright';
const [base, out] = process.argv.slice(2);
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } });
const p = await ctx.newPage(); await p.goto(base + 'kilumen/index.html'); await p.waitForFunction(() => window.kilumen?.scene?.tileset, null, { timeout: 30000 });
await p.evaluate(() => window.kilumen.ready); await p.waitForTimeout(1500); await p.keyboard.press('Enter'); await p.waitForTimeout(1000);
for (let i=0;i<120;i++){ const st = await p.evaluate(() => ({l: window.kilumen.scene.player.locked||!!window.kilumen.scene.fade, d: !!document.querySelector('.dlg-wrap.open,.ui-root.open')})); if(!st.l && !st.d) break; await p.keyboard.press(st.d && i%9==8 ? 'Escape':'Enter'); await p.waitForTimeout(350);} await p.waitForTimeout(1500);
for (let k=0;k<4;k++){ if(!(await p.evaluate(()=>!!document.querySelector('.ui-root.open,.dlg-wrap.open')))) break; await p.keyboard.press('Escape'); await p.waitForTimeout(600);} await p.waitForTimeout(800);
const info = await p.evaluate(() => { const s = window.kilumen.scene; return { map: s.map.name, w: s.map.width, h: s.map.height, cam: s._cam && { x: s._cam.x, y: s._cam.y }, zoom: s.zoom, cw: s.canvas.width, ch: s.canvas.height, px: s.player.x, py: s.player.y }; });
console.log(JSON.stringify(info)); await p.screenshot({ path: out }); await b.close();
