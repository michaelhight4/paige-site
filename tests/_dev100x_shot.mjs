import { chromium } from 'playwright';
const [base, out] = process.argv.slice(2);
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } });
await ctx.addInitScript(() => localStorage.setItem('sb-kjdubkeowcyuoazvpoyt-auth-token', '{"mock":1}'));
await ctx.route(/esm\.sh\/@supabase/, (r) => r.fulfill({ contentType: 'application/javascript', headers: { 'access-control-allow-origin': '*' }, body: `export function createClient(){return{auth:{getUser:async()=>({data:{user:{id:'u',email:'m@x',is_anonymous:false}},error:null})},rpc:async()=>({data:{role:'admin',tag:''},error:null})}}` }));
const p = await ctx.newPage(); await p.goto(base + 'kilumen/index.html?dev=1'); await p.waitForFunction(() => window.kilumen?.scene?.tileset, null, { timeout: 30000 });
await p.evaluate(() => window.kilumen.ready); await p.waitForTimeout(1500); await p.keyboard.press('Enter'); await p.waitForTimeout(1000);
for (let i=0;i<120;i++){ const st = await p.evaluate(() => ({l: window.kilumen.scene.player.locked||!!window.kilumen.scene.fade, d: !!document.querySelector('.dlg-wrap.open,.ui-root.open')})); if(!st.l && !st.d) break; await p.keyboard.press(st.d && i%9==8 ? 'Escape':'Enter'); await p.waitForTimeout(350);}
for (let k=0;k<4;k++){ if(!(await p.evaluate(()=>!!document.querySelector('.ui-root.open,.dlg-wrap.open')))) break; await p.keyboard.press('Escape'); await p.waitForTimeout(600);} await p.waitForTimeout(1500);
await p.keyboard.press('F2'); await p.waitForTimeout(500);
await p.click('.kdev .tabs button:has-text("Tools")'); await p.waitForTimeout(300);
await p.click('.kdev [data-world="100"]'); await p.waitForTimeout(400);
const t0 = await p.evaluate(() => window.kilumen.scene.tick); await p.waitForTimeout(1000);
const r = await p.evaluate((t0) => ({ ticksPerSec: window.kilumen.scene.tick - t0, ws: window.kilumen.scene.worldSpeed, dev: !!window.kilumen.dev, ver: document.documentElement.innerHTML.match(/v0\.2\.\d+-alpha/)?.[0] }), t0);
console.log(JSON.stringify(r)); await p.screenshot({ path: out });
// normal player check
const c2 = await b.newContext({ viewport: { width: 1280, height: 800 } }); const q = await c2.newPage(); await q.goto(base + 'kilumen/index.html?dev=1'); await q.waitForFunction(() => window.kilumen?.scene?.tileset, null, { timeout: 30000 }); await q.waitForTimeout(3000);
console.log('noadmin', JSON.stringify(await q.evaluate(() => ({ dev: !!window.kilumen.dev, ws: window.kilumen.scene.worldSpeed ?? 1 }))));
await b.close();
