import { chromium } from 'playwright';
const b = await chromium.launch(); const out = {};
for (const role of ['owner', 'admin', 'player', 'none']) for (const dev of ['pc', 'phone']) {
  const ctx = await b.newContext(dev === 'pc' ? { viewport: { width: 1280, height: 720 } } : { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true });
  if (role !== 'none') await ctx.addInitScript(() => localStorage.setItem('sb-kjdubkeowcyuoazvpoyt-auth-token', '{"mock":1}'));
  await ctx.route(/esm\.sh\/@supabase/, (r) => r.fulfill({ contentType: 'application/javascript', headers: { 'access-control-allow-origin': '*' }, body: `export function createClient(){return{auth:{getUser:async()=>({data:{user:{id:'u',email:'m@x',is_anonymous:false}},error:null})},rpc:async()=>({data:${role === 'player' ? 'null' : `{role:'${role}',tag:''}`},error:null})}}` }));
  const p = await ctx.newPage(); await p.goto(process.argv[2] + 'kilumen/index.html'); await p.waitForFunction(() => window.kilumen?.scene?.tileset, null, { timeout: 30000 });
  await p.evaluate(() => window.kilumen.ready); await p.waitForTimeout(1500); await p.keyboard.press('Enter'); await p.waitForTimeout(1000);
  for (let i=0;i<120;i++){ const st = await p.evaluate(() => ({l: window.kilumen.scene.player.locked||!!window.kilumen.scene.fade, d: !!document.querySelector('.dlg-wrap.open,.ui-root.open')})); if(!st.l && !st.d) break; await p.keyboard.press(st.d && i%9==8 ? 'Escape':'Enter'); await p.waitForTimeout(350);} await p.waitForTimeout(2000);
  const chip = await p.evaluate(() => { const c = document.querySelector('.kdev-chip'); return !!c && c.offsetParent !== null; });
  if (chip && dev === 'phone') { await p.tap('.kdev-chip', { timeout: 5000 }).catch(() => {}); await p.waitForTimeout(500); }
  if (dev === 'pc') { await p.keyboard.press('F2'); await p.waitForTimeout(500); }
  out[role + '_' + dev] = { chip, panel: await p.evaluate(() => !!document.querySelector('.kdev')) };
  if (role === 'owner') await p.screenshot({ path: `/workspace/kilumen/shots/interiors_live/owner_mock_${dev}.png` });
  await ctx.close();
}
console.log(JSON.stringify(out)); await b.close();
