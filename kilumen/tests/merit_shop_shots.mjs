// Merit shop + garden shots (PC 1920x1080 + phone 780x360 @3x touch). Usage: node tests/merit_shop_shots.mjs (needs playwright)
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs'; import path from 'node:path'; import net from 'node:net'; import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = process.env.OUT || path.join(ROOT, 'shots/merit_shop_v1'); fs.mkdirSync(OUT, { recursive: true });
const PORT = await new Promise((res) => { const sv = net.createServer(); sv.listen(0, '127.0.0.1', () => { const p = sv.address().port; sv.close(() => res(p)); }); });
const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
const base = `http://127.0.0.1:${PORT}/index.html`;
for (let i = 0; i < 50; i++) { try { if ((await fetch(base)).ok) break; } catch {} await new Promise((r) => setTimeout(r, 100)); }
const DEV = [{ plat: 'pc', w: 1920, h: 1080, dpr: 1, touch: false }, { plat: 'phone', w: 780, h: 360, dpr: 3, touch: true }];
const browser = await chromium.launch(); const report = [];
try {
  for (const d of DEV) {
    const ctx = await browser.newContext({ viewport: { width: d.w, height: d.h }, deviceScaleFactor: d.dpr, hasTouch: d.touch, isMobile: d.touch });
    const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(String(e)));
    await page.addInitScript(() => { try { localStorage.setItem('kilumen_alpha_notice_seen.v1', '1'); } catch {} });
    await page.goto(`${base}?save=0&hour=12`);
    await page.waitForFunction(() => window.kilumen?.scene?.tileset, null, { timeout: 20000 });
    await page.evaluate(() => window.kilumen.ready); await page.waitForTimeout(800);
    for (let i = 0; i < 40; i++) { const busy = await page.evaluate(() => { const s = window.kilumen.scene; return !!(s.dialog?.active || s.busy || s.fade || window.kilumen.ui?.active || document.querySelector('#title, .title-screen, [data-title]')); }); if (!busy && i > 3) break; await page.keyboard.press(i % 2 ? 'f' : 'Enter'); await page.waitForTimeout(500); }
    await page.evaluate(async () => { const s = window.kilumen.scene; s.fade = { phase: 'out', t: 0, spawn: { map: 'brookhollow', x: 21, y: 16, facing: 'up' }, kind: 'door' }; await s._finishLoad(); s.fade = null; s.player.locked = false; });
    await page.waitForFunction(() => window.kilumen.scene.map?.name === 'brookhollow', null, { timeout: 15000 }); await page.waitForTimeout(1200);
    const shot = async (n) => { const f = path.join(OUT, `${d.plat}_${n}.png`); await page.screenshot({ path: f }); report.push(f); };
    // three home plots at three stages
    report.push(await page.evaluate(() => { const s = window.kilumen.scene, sys = s.systems, day = s.clock?.day || 0;
      sys.state.garden = { plots: { home_1: { crop: 'carrot', planted: day, growth: 0, watered: day, boost: false, last: day },
        home_2: { crop: 'tomato', planted: day, growth: 2, watered: null, boost: false, last: day }, home_3: { crop: 'pumpkin', planted: day, growth: 5, watered: null, boost: false, last: day } } };
      s.player.facing = 'up'; s._dirty = true; return JSON.stringify({ map: s.map.name, x: s.player.x, y: s.player.y, hasOpen: !!s.openMeritShop }); }));
    await page.waitForTimeout(500); await shot('1_home_plots');
    // harvest via the real interact path (face home_3 -> pumpkin ready)
    await page.evaluate(() => { const s = window.kilumen.scene; s.player.x = 22; s.player.y = 16; s.player.facing = 'up'; s.systems.onInteract(22, 15); });
    await page.waitForTimeout(700); await shot('2_harvest_prompt');
    // merit shop
    await page.evaluate(() => { const s = window.kilumen.scene; s.dialog?.close?.(); const ss = s.systems.state.sports ||= {}; ss.merit = { points: 420, earned: 420, spent: 0, log: [] }; s.openMeritShop(); });
    await page.waitForTimeout(900); await shot('3_shop_today');
    if (d.touch) await page.tap('.ui-tab[data-tab="1"]'); else await page.click('.ui-tab[data-tab="1"]');
    await page.waitForTimeout(500); await shot('4_shop_always');
    const row = '.ui-row[data-k="watering_can_merit"]'; if (d.touch) await page.tap(row); else await page.click(row);
    await page.waitForTimeout(300); if (d.touch) await page.tap(row).catch(() => {}); else await page.click(row).catch(() => {});
    await page.waitForTimeout(700); await shot('5_shop_confirm');
    report.push(d.plat + ' errors: ' + JSON.stringify(errors.slice(0, 3)));
    await ctx.close();
  }
} finally { await browser.close(); server.kill(); }
console.log(report.join('\n'));
