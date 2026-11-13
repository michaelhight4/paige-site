// #62 art-filter smoke (Coder, Oct 23, 2026): Route 1 + an overnight route, PC + phone, ?encrate=0.2&dev=1. Walks grass until a
// wild battle opens (?lead=rillop gives a party; save=0 starts with none); records the filter result (kilumen.ui.wild.artFilter) and the dev console line. Also one ?encart=0 run.
// Usage: node tests/encart_smoke.mjs -> shots/encart_v1/*.png + report.json
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'shots/encart_v1');
fs.mkdirSync(OUT, { recursive: true });
const PORT = await new Promise((res) => { const sv = net.createServer(); sv.listen(0, '127.0.0.1', () => { const p = sv.address().port; sv.close(() => res(p)); }); });
const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
const base = `http://127.0.0.1:${PORT}/index.html`;
for (let i = 0; i < 50; i++) { try { if ((await fetch(base)).ok) break; } catch {} await new Promise((r) => setTimeout(r, 100)); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const DEVICES = { pc: { w: 1920, h: 1080, dpr: 1, touch: false }, phone: { w: 844, h: 390, dpr: 2, touch: true } };
const RUNS = [['pc', 'route1', ''], ['phone', 'route1', ''], ['pc', 'route_fernwick_lanternport', ''], ['phone', 'route_fernwick_lanternport', ''], ['pc', 'route1', '&encart=0']];
const browser = await chromium.launch(); const report = [];
try {
  for (const [dev, map, extra] of RUNS) {
    const d = DEVICES[dev];
    const ctx = await browser.newContext({ viewport: { width: d.w, height: d.h }, deviceScaleFactor: d.dpr, hasTouch: d.touch, isMobile: d.touch });
    const page = await ctx.newPage(); const errors = [], info = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); if (m.text().includes('[encounters]')) info.push(m.text()); });
    await page.goto(`${base}?save=0&timescale=0&hour=12&platform=${dev === 'pc' ? 'pc' : 'mobile'}&map=${map}&encrate=0.2&dev=1&lead=rillop${extra}`);
    await page.waitForFunction(() => window.kilumen?.scene?.tileset, null, { timeout: 20000 });
    await page.evaluate(() => window.kilumen.ready);
    await page.waitForFunction(() => window.kilumen.ui?.wild?.roller, null, { timeout: 15000 });
    await page.evaluate(() => document.querySelectorAll('.pg-overlay,#devpanel,.devpanel').forEach((e) => e.remove()));
    // stand on a horizontal pair of grass cells inside a table rect (or any grass when the map is listed by a table)
    const spot = await page.evaluate(() => { const s = kilumen.scene, m = s.map;
      for (let y = 1; y < m.height - 1; y++) for (let x = 1; x < m.width - 2; x++) if (m.encounter(x, y) === 1 && m.encounter(x + 1, y) === 1 && m.code(x, y) === m.code(x + 1, y) && !m.npcAt?.(x, y) && !m.npcAt?.(x + 1, y)) { s.player.place(x, y, 'right'); return [x, y]; }
      return null; });
    let steps = 0, hit = null;
    for (; steps < 80 && spot; steps++) {
      const k = steps % 2 ? 'ArrowLeft' : 'ArrowRight';
      await page.keyboard.down(k); await sleep(170); await page.keyboard.up(k); await sleep(120);
      hit = await page.evaluate(() => { const w = kilumen.scene.log?.filter((e) => e.type === 'wild').pop(); return w ? { ...w, top: kilumen.ui.top?.name || kilumen.ui.top?.id || !!kilumen.ui.top } : null; });
      if (hit) break;
    }
    await sleep(1800);
    const st = await page.evaluate(() => { const f = kilumen.ui.wild.artFilter; return { filter: f ? { dropped: f.dropped, empty: f.empty } : 'off', battleOpen: !!document.querySelector('#p2-mon'), foeSrc: document.querySelector('#p2-mon')?.getAttribute('src') || null, top: kilumen.ui.top?.name || null }; });
    const f = `${dev}_${map}${extra ? '_encart0' : ''}.png`; await page.screenshot({ path: path.join(OUT, f) });
    const row = { file: f, map, dev, extra, spot, steps, hit, ...st, consoleInfo: info, errors };
    report.push(row); console.log(JSON.stringify(row));
    await ctx.close();
  }
} finally { await browser.close(); server.kill(); }
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 1));
