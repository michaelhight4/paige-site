// RTX look shots + frame-time bench (Coder, Oct 29 2026, dev/rtx-look; NOT published). Brookhollow prototype.
// Usage: node tests/rtx_look_shots.mjs -> shots/rtx_v1/<plat>_<cond>_<mode>.png + bench.json (+ contact sheet: tools/rtx/contact.py)
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = process.env.OUT || path.join(ROOT, 'shots/rtx_v1');
fs.mkdirSync(OUT, { recursive: true });
const PORT = await new Promise((res) => { const sv = net.createServer(); sv.listen(0, '127.0.0.1', () => { const p = sv.address().port; sv.close(() => res(p)); }); });
const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
const base = `http://127.0.0.1:${PORT}/index.html`;
for (let i = 0; i < 50; i++) { try { if ((await fetch(base)).ok) break; } catch {} await new Promise((r) => setTimeout(r, 100)); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PROFILES = [{ plat: 'pc', w: 1280, h: 720, dpr: 1, touch: false }, { plat: 'phone', w: 844, h: 390, dpr: 2, touch: true }];
const CONDS = [['day', 12, 'fair', 32, 24], ['dusk', 19, 'fair', 38, 17], ['night', 23, 'fair', 38, 17], ['rain', 12, 'rain', 30, 28]];
const MODES = ['off', 'lite', 'full'];
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const report = { gpuNote: 'headless Chromium, SwiftShader (CPU) WebGL: absolute ms are a worst case, not a real phone/PC GPU', runs: [] };
try {
  for (const p of PROFILES) {
    const ctx = await browser.newContext({ viewport: { width: p.w, height: p.h }, deviceScaleFactor: p.dpr, hasTouch: p.touch, isMobile: p.touch });
    const page = await ctx.newPage(); await page.addInitScript(() => { try { localStorage.setItem('kilumen_alpha_notice_seen.v1', '1'); } catch {} });
    const errors = [], shots = [], bench = {}; page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => { if (m.type() === 'error' && !/playtime\.js|icon_f0|icon_f1/.test((m.location()?.url || '') + m.text())) errors.push(m.text()); if (/rtx look/.test(m.text())) errors.push(m.text()); });
    try {
      await page.goto(`${base}?save=0&timescale=0&hour=12&audio=0&enc=0&lead=nibbin&rtxbench=1`);
      await page.waitForFunction(() => window.kilumen?.ready || window.kilumen?.ui, null, { timeout: 20000 });
      await page.evaluate(() => Promise.race([window.kilumen.ready, new Promise((r) => setTimeout(r, 15000))]));
      await sleep(1200); await page.evaluate(() => { try { kilumen.ui?.closeAll?.(); } catch {} });
      for (let i = 0; i < 8; i++) { await page.keyboard.press('f'); await sleep(300); }
      for (const [cond, hour, wx, x, y] of CONDS) {
        for (let i = 0; i < 20 && await page.evaluate(() => kilumen.scene.busy); i++) { await page.keyboard.press('f'); await sleep(250); }
        await page.evaluate(([hour, wx, x, y]) => { const s = kilumen.scene; s.setHour(hour); s.life?.setWeather?.(wx); s.fade = null; s.busy = false; s.player.locked = false; s.startWarp({ map: 'brookhollow', x, y, facing: 'down' }, 'door'); }, [hour, wx, x, y]);
        await sleep(2300);
        for (const mode of MODES) {
          await page.evaluate((m) => kilumen.scene.rtx.setMode(m, false), mode); await sleep(500);
          const fn = `${p.plat}_${cond}_${mode}.png`; await page.screenshot({ path: path.join(OUT, fn) }); shots.push(fn);
          bench[`${cond}_${mode}`] = await page.evaluate(() => { const s = kilumen.scene, t = []; for (let i = 0; i < 40; i++) { const a = performance.now(); s.render(); t.push(performance.now() - a); }
            t.sort((a, b) => a - b); return { medianMs: +t[20].toFixed(2), p90Ms: +t[36].toFixed(2), canvas: [s.canvas.width, s.canvas.height], rtx: s.rtx.state() }; });
        }
      }
      // Options row present + Auto tier on this device
      bench.auto = await page.evaluate(() => { const s = kilumen.scene; s.rtx.setMode('auto', false); s.render(); return s.rtx.state(); });
      await page.evaluate(() => kilumen.scene.rtx.setMode('off', false));
    } catch (e) { errors.push('runner: ' + e.message); }
    await ctx.close(); report.runs.push({ plat: p.plat, errors, shots, bench });
    console.log(p.plat, shots.length, errors.length ? 'ERRORS ' + errors.join(' | ').slice(0, 600) : 'ok');
  }
} finally { await browser.close(); server.kill(); }
fs.writeFileSync(path.join(OUT, 'bench.json'), JSON.stringify(report, null, 1));
