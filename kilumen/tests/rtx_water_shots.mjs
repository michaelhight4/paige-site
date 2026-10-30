// RTX look + shallow/deep water before/after shots (Coder, Oct 30 2026). OUT= dir. Not a test.
// RTX look shots + frame-time bench (Coder, Oct 29 2026, dev/rtx-look; NOT published). Brookhollow prototype.
// Usage: node tests/rtx_look_shots.mjs -> shots/rtx_v2/<plat> (OUT=)_<cond>_<mode>.png + bench.json (+ contact sheet: tools/rtx/contact.py)
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = process.env.OUT || path.join(ROOT, 'shots/rtx_water_v1');
fs.mkdirSync(OUT, { recursive: true });
const PORT = await new Promise((res) => { const sv = net.createServer(); sv.listen(0, '127.0.0.1', () => { const p = sv.address().port; sv.close(() => res(p)); }); });
const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
const base = `http://127.0.0.1:${PORT}/index.html`;
for (let i = 0; i < 50; i++) { try { if ((await fetch(base)).ok) break; } catch {} await new Promise((r) => setTimeout(r, 100)); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const errors = [], shots = [];
try {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage(); await page.addInitScript(() => { try { localStorage.setItem('kilumen_alpha_notice_seen.v1', '1'); } catch {} });
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`${base}?save=0&timescale=0&hour=12&audio=0&enc=0&lead=nibbin&rtx=off`);
  await page.waitForFunction(() => window.kilumen?.ready || window.kilumen?.ui, null, { timeout: 20000 });
  await page.evaluate(() => Promise.race([window.kilumen.ready, new Promise((r) => setTimeout(r, 15000))]));
  await sleep(1200); await page.evaluate(() => { try { kilumen.ui?.closeAll?.(); } catch {} });
  for (let i = 0; i < 8; i++) { await page.keyboard.press('f'); await sleep(300); }
  const go = async (map, x, y) => {
    for (let i = 0; i < 20 && await page.evaluate(() => kilumen.scene.busy); i++) { await page.keyboard.press('f'); await sleep(250); }
    await page.evaluate(([map, x, y]) => { const s = kilumen.scene; s.setHour(12); s.fade = null; s.busy = false; s.player.locked = false; s.startWarp({ map, x, y, facing: 'down' }, 'door'); }, [map, x, y]);
    await sleep(2300); for (let i = 0; i < 40 && await page.evaluate(() => (kilumen.scene.fadeAlpha?.() || 0) > 0.01 || kilumen.scene.busy); i++) await sleep(150);
  };
  const shot = async (fn) => { await sleep(400); await page.screenshot({ path: path.join(OUT, fn) }); shots.push(fn); };
  // RTX off / on in Brookhollow
  await go('brookhollow', 32, 24);
  await page.evaluate(() => { kilumen.scene.renderer.waterDepth = false; kilumen.scene.rtx.setMode('off', false); }); await shot('brookhollow_rtx_off_before.png');
  await page.evaluate(() => kilumen.scene.rtx.setMode('full', false)); await shot('brookhollow_rtx_full.png');
  await page.evaluate(() => { kilumen.scene.renderer.waterDepth = true; }); await shot('brookhollow_rtx_full_water.png');
  await page.evaluate(() => kilumen.scene.rtx.setMode('off', false));
  for (const [map, x, y] of [['gullhaven', 20, 22], ['gullhaven_lagoon', 15, 13], ['gullhaven_sea', 20, 15], ['saltmere', 28, 31]]) {
    await go(map, x, y);
    const at = await page.evaluate(([x, y]) => { const s = kilumen.scene, m = s.map; let best = null; // nearest walkable cell to the water centroid
      for (let yy = 0; yy < m.height; yy++) for (let xx = 0; xx < m.width; xx++) if (m.code(xx, yy) === 0) { const d = (xx - x) ** 2 + (yy - y) ** 2; if (!best || d < best[2]) best = [xx, yy, d]; }
      return best; }, [x, y]);
    if (at && (at[0] !== x || at[1] !== y)) await go(map, at[0], at[1]);
    await page.evaluate(() => { kilumen.scene.renderer.waterDepth = false; }); await shot(`${map}_water_before.png`);
    await page.evaluate(() => { kilumen.scene.renderer.waterDepth = true; }); await shot(`${map}_water_after.png`);
  }
} catch (e) { errors.push('runner: ' + e.message); }
finally { await browser.close(); server.kill(); }
console.log(shots.length, errors.length ? 'ERRORS ' + errors.join(' | ').slice(0, 800) : 'ok');
