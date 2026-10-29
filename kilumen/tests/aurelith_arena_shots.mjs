// Aurelith Arena themed-room shots. Usage: node tests/aurelith_arena_shots.mjs -> shots/regions_5_8_v1/arena_themed/
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = process.env.OUT || path.join(ROOT, 'shots/regions_5_8_v1/arena_themed');
fs.mkdirSync(OUT, { recursive: true });
const PORT = await new Promise((res) => { const sv = net.createServer(); sv.listen(0, '127.0.0.1', () => { const p = sv.address().port; sv.close(() => res(p)); }); });
const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
const base = `http://127.0.0.1:${PORT}/index.html`;
for (let i = 0; i < 50; i++) { try { if ((await fetch(base)).ok) break; } catch {} await new Promise((r) => setTimeout(r, 100)); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let PROFILES = [{ plat: 'pc', w: 1280, h: 720, dpr: 1, touch: false }, { plat: 'phone', w: 844, h: 390, dpr: 2, touch: true }];
// v3 (pt2163u): PLATS=pc limits profiles; VIEW=WxH[xDPR] overrides the pc viewport (big-room close-up crops)
if (process.env.PLATS) PROFILES = PROFILES.filter((p) => process.env.PLATS.split(',').includes(p.plat));
if (process.env.VIEW) { const [w, h, d] = process.env.VIEW.split('x').map(Number); PROFILES = PROFILES.map((p) => (p.plat === 'pc' ? { ...p, w, h, dpr: d || 1 } : p)); }
const COMMON = 'save=0&timescale=0&hour=12&audio=0&enc=0';
const ZOOM = +process.env.ZOOM || 0, PHONE_ZOOM = +process.env.PHONE_ZOOM || ZOOM; // ZOOM=1: whole-room framing (scene.opts.zoom override, shots only)
// the alpha build drops ?map= flags, so the hall is entered through the scene's own warp
const warp = async (page, map, x, y) => { await page.evaluate(() => {}); for (let i = 0; i < 8; i++) { await page.keyboard.press('f'); await sleep(400); } await page.evaluate(() => { const s = kilumen.scene; s.fade = null; s.player.locked = false; }); await page.evaluate(([map, x, y]) => kilumen.scene.startWarp({ map, x, y, facing: 'up' }, 'door'), [map, x, y]); await sleep(2500); };


// Themed rooms (Oct 29 2026 pt2156u, DRAFT visual change awaiting Gary): lobby + aurelith_arena_room_1..8, PC + phone.
const VIEWS = [['lobby', 'aurelith_arena', 9, 8], ...[1, 2, 3, 4, 5, 6, 7, 8].map((n) => [`room_${n}`, `aurelith_arena_room_${n}`, 8, 10])];
const browser = await chromium.launch(); const report = [];
try {
  for (const p of PROFILES) {
    const ctx = await browser.newContext({ viewport: { width: p.w, height: p.h }, deviceScaleFactor: p.dpr, hasTouch: p.touch, isMobile: p.touch });
    const page = await ctx.newPage(); await page.addInitScript(() => { try { localStorage.setItem('kilumen_alpha_notice_seen.v1', '1'); } catch {} });
    const errors = [], shots = []; page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => { if (m.type() === 'error' && !/playtime\.js|icon_f0|icon_f1/.test((m.location()?.url || '') + m.text())) errors.push(m.text()); });
    try {
      await page.goto(`${base}?${COMMON}&lead=nibbin`);
      await page.waitForFunction(() => window.kilumen?.ready || window.kilumen?.ui, null, { timeout: 15000 });
      await page.evaluate(() => Promise.race([window.kilumen.ready, new Promise((r) => setTimeout(r, 15000))]).then(() => window.kilumen.ui?.sdReady));
      await sleep(1200); await page.evaluate(() => { try { kilumen.ui?.closeAll?.(); } catch {} });
      let first = true;
      for (const [tag, map, x, y] of VIEWS) {
        if (first) { await warp(page, map, x, y); first = false; }
        else { await page.evaluate(([map, x, y]) => { const s = kilumen.scene; s.fade = null; s.player.locked = false; s.startWarp({ map, x, y, facing: 'up' }, 'door'); }, [map, x, y]); await sleep(2500); }
        for (let i = 0; i < 20 && await page.evaluate(() => kilumen.scene.busy); i++) { await page.keyboard.press('f'); await sleep(350); }
        if (ZOOM) { await page.evaluate((z) => { const s = kilumen.scene; s.opts.zoom = z; s.resize(); }, p.touch ? PHONE_ZOOM : ZOOM); await sleep(1500); }
        const on = await page.evaluate(() => kilumen.scene.map.name); if (on !== map) errors.push(`${tag} on ${on}`);
        const fn = `${p.plat}_${tag}.png`; await page.screenshot({ path: path.join(OUT, fn) }); shots.push(fn);
      }
    } catch (e) { errors.push('runner: ' + e.message); }
    await ctx.close(); report.push({ plat: p.plat, errors, shots });
    console.log(p.plat, shots.length, errors.length ? 'ERRORS ' + errors.join(' | ').slice(0, 300) : 'ok');
  }
} finally { await browser.close(); server.kill(); }
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 1));
