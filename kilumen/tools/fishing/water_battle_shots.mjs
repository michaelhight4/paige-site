// Water battle biome shots: PC + phone, day + night, a short clip, the static fallback PNG and a grass comparison.
// node tools/fishing/water_battle_shots.mjs http://localhost:8771/ OUTDIR [--bake]
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';
const [BASE, OUT] = process.argv.slice(2), BAKE = process.argv.includes('--bake');
const b = await chromium.launch(); const errs = [];
const open = async (ctx, q, biome, video) => {
  const c = await b.newContext({ ...ctx, ...(video && { recordVideo: { dir: OUT, size: ctx.viewport } }) }); const p = await c.newPage(); p.on('pageerror', (e) => errs.push(String(e)));
  await p.addInitScript(() => { try { localStorage.clear(); localStorage.setItem('kilumen_alpha_notice_seen.v1', '1'); } catch {} });
  await p.goto(`${BASE}?reset=1&cv=0&contacts=0${q}`, { waitUntil: 'load' });
  await p.waitForFunction(() => window.kilumen?.ready); await p.evaluate(() => window.kilumen.ready);
  await p.waitForFunction(() => window.kilumen.ui?.wild, null, { timeout: 30000 });
  await p.evaluate(async () => { const sc = window.kilumen.scene; for (let i = 0; i < 300 && sc.fade; i++) await new Promise((r) => setTimeout(r, 50)); });
  for (let i = 0; i < 20 && (await p.evaluate(() => window.kilumen.scene.busy)); i++) { await p.keyboard.press('z'); await p.waitForTimeout(300); }
  await p.evaluate((q) => { const h = /phase=night/.test(q) ? 22 : 12, sc = window.kilumen.scene; sc.clock.min = Math.floor(sc.clock.min / 1440) * 1440 + h * 60; }, q);
  await p.evaluate((biome) => { window.kilumen.ui.wild.openBattle({ species: 'nibbin', level: 6, biome }); }, biome);
  await p.waitForSelector('.ui-battle'); await p.waitForTimeout(2600); return { c, p };
};
const PC = { viewport: { width: 1280, height: 720 } }, PH = { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true };
if (BAKE) { const { c, p } = await open(PC, '', 'grass');
  const url = await p.evaluate(async () => { const m = await import(document.querySelector('script[src*="main.js"]').src.replace(/main\.js.*/, 'battle/data/water_bg.js'));
    const k = document.createElement('canvas'); k.width = m.W; k.height = m.H; m.drawWaterFrame(k.getContext('2d'), 0, 'day'); const u = document.createElement('canvas'); u.width = 2560; u.height = 1440; const g = u.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(k, 0, 0, 2560, 1440); return u.toDataURL('image/png'); });
  writeFileSync('art/world/battle_bg_water.png', Buffer.from(url.split(',')[1], 'base64')); await c.close(); }
else {
  for (const [dev, ctx] of [['pc', PC], ['phone', PH]]) {
    for (const ph of ['day', 'night']) { const { c, p } = await open(ctx, `&phase=${ph}`, 'water'); await p.screenshot({ path: `${OUT}/${dev}_water_${ph}.png` }); await c.close(); }
    const { c, p } = await open(ctx, '', 'grass'); await p.screenshot({ path: `${OUT}/${dev}_grass_compare.png` }); await c.close();
  }
  const { c, p } = await open(PC, '&phase=day', 'water', true); await p.waitForTimeout(5000); const v = p.video(); await c.close(); console.log('video', await v.path());
}
console.log(JSON.stringify({ errs }));
await b.close();
