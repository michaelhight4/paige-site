import { spawn } from 'node:child_process'; import path from 'node:path';
const { chromium } = await import('/workspace/kilumen/node_modules/playwright/index.mjs');
const ROOT = process.env.ROOT, OUT = '/workspace/kilumen/shots/tug_pop_fix', TAG = process.env.TAG, PORT = 8000 + Math.floor(Math.random() * 900);
const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 1200));
const b = await chromium.launch();
for (const d of [{ plat: 'pc', w: 1280, h: 720, dpr: 1, touch: false }, { plat: 'phone', w: 780, h: 360, dpr: 2, touch: true }]) {
  const ctx = await b.newContext({ viewport: { width: d.w, height: d.h }, deviceScaleFactor: d.dpr, hasTouch: d.touch, isMobile: d.touch });
  const page = await ctx.newPage(); await page.addInitScript(() => localStorage.setItem('kilumen_alpha_notice_seen.v1', '1'));
  await page.goto(`http://127.0.0.1:${PORT}/index.html`); await page.waitForFunction(() => window.kilumen?.ui, null, { timeout: 30000 });
  for (let i = 0; i < 40; i++) { const busy = await page.evaluate(() => { const s = window.kilumen.scene; return !!(s.dialog?.active || s.busy || s.fade || window.kilumen.ui?.active); }); if (!busy && i > 3) break; await page.keyboard.press(i % 2 ? 'f' : 'Enter'); await page.waitForTimeout(500); } await page.waitForTimeout(800);
  await page.evaluate(() => { const s = window.kilumen.scene; s.party = [{ uid: 'cup-a', species: 'frostlop', nickname: 'Pip', level: 14, hp: 30 }, { uid: 'cup-b', species: 'capling', level: 11, hp: 25 }, ...(s.party || [])].slice(0, 6); if (s.systems?.wallet) s.systems.wallet.n = 2000; for (const m of s.party) { m.power = 70; m.stamina = 65; } });
  await page.evaluate(() => { window.kilumen.sports.town.openTug(); }); await page.waitForTimeout(600);
  console.log('open'); await page.click('#town-ev [data-a=go]', { timeout: 3000 }).catch(e=>console.log('c1',e.message)); await page.waitForTimeout(400); await page.click('#town-ev [data-a=go]', { timeout: 800 }).catch(() => {});
  await page.waitForTimeout(800);
  await page.evaluate(() => { const r = window.kilumen.sports.town.state().run; r.left = 99; r.surge = { warn: 99, t: 0.9, hit: false }; r.fx = { k: 'perfect', t: 99 }; r.last = 'perfect'; });
  await page.waitForTimeout(400); console.log('shot'); await page.screenshot({ timeout: 10000, path: path.join(OUT, `${TAG}_${d.plat}.png`) }); await ctx.close();
}
await b.close(); server.kill();
