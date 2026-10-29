// Lanternport lighthouse floor shots (Gary Oct 29 2026): arrival view + each trainer + stairs per floor, PC + phone. Usage: node tests/lighthouse_shots.mjs. Based on: Hall overhaul v2 shots (Character models' hall art wired, Oct 29 2026): lobby + a framed view of each hall's new trainers / push / warp art. Usage: PLAT=pc node tests/hall_overhaul_v2_shots.mjs. Was: v1 shots (Oct 29 2026, hallanim on via localhost dev default). Was: Jestrix line (Oct 29 2026): in-game PC + phone shots: battle front/back, overworld walk (lead follower), Kilindex, evolution.
// Usage: node tests/jestrix_line_shots.mjs -> shots/hall_overhaul_v1/*.png + report.json (contact sheet: separate step)
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = process.env.OUT || path.join(ROOT, 'shots/hall_overhaul_v2/lanternport_lighthouse');
fs.mkdirSync(OUT, { recursive: true });
const PORT = await new Promise((res) => { const sv = net.createServer(); sv.listen(0, '127.0.0.1', () => { const p = sv.address().port; sv.close(() => res(p)); }); });
const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
const base = `http://127.0.0.1:${PORT}/index.html`;
for (let i = 0; i < 50; i++) { try { if ((await fetch(base)).ok) break; } catch {} await new Promise((r) => setTimeout(r, 100)); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PROFILES = [{ plat: 'pc', w: 1280, h: 720, dpr: 1, touch: false }, { plat: 'phone', w: 844, h: 390, dpr: 2, touch: true }];
const COMMON = 'save=0&timescale=0&hour=12&audio=0&enc=0';
// the alpha build drops ?map= flags, so the hall is entered through the scene's own warp
const warp = async (page, map, x, y) => { await page.evaluate(() => {}); for (let i = 0; i < 8; i++) { await page.keyboard.press('f'); await sleep(400); } await page.evaluate(() => { const s = kilumen.scene; s.fade = null; s.player.locked = false; }); await page.evaluate(([map, x, y]) => kilumen.scene.startWarp({ map, x, y, facing: 'up' }, 'door'), [map, x, y]); await sleep(2500); };


const FLOORS = ['lanternport_lighthouse_int', 'lanternport_lighthouse_f2', 'lanternport_lighthouse_f3', 'lanternport_hall_int'];
const browser = await chromium.launch(); const report = [];
try {
  for (const p of PROFILES.filter((q) => !process.env.PLAT || q.plat === process.env.PLAT)) for (const [fi, mapName] of FLOORS.entries()) {
    const mj = JSON.parse(fs.readFileSync(path.join(ROOT, `art/world/overworld/maps/${mapName}.json`), 'utf8')), hv = mj.hall_v2;
    const npcAt = new Set(mj.npcs.map((n) => `${n.x},${n.y}`));
    const near = (tx, ty) => { let b = null; hv.grid.forEach((r, y) => [...r].forEach((c, x) => { if (!'.SG'.includes(c) || mj.layers.collision[y][x] !== 0 || npcAt.has(`${x},${y}`)) return; const d = (x - tx) ** 2 + (y - ty) ** 2; if (!b || d < b[2]) b = [x, y, d]; })); return b; };
    const views = mj.npcs.map((n) => [n.id.replace(/^.*_/, ''), near(n.x, n.y + 2)]);
    const up = hv.stairs_up || hv.dais_front; if (up) views.push(['stairs', near(up[0], up[1] + 1)]);
    const ctx = await browser.newContext({ viewport: { width: p.w, height: p.h }, deviceScaleFactor: p.dpr, hasTouch: p.touch, isMobile: p.touch });
    const page = await ctx.newPage(); await page.addInitScript(() => { try { localStorage.setItem('kilumen_alpha_notice_seen.v1', '1'); } catch {} });
    const errors = [], shots = []; page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => { if (m.type() === 'error' && !/playtime\.js|icon_f0|icon_f1/.test((m.location()?.url || '') + m.text())) errors.push(m.text()); });
    const shot = async (tag) => { const f = `${p.plat}_${fi + 1}F_${tag}.png`; await page.screenshot({ path: path.join(OUT, f) }); shots.push(f); };
    try {
      await page.goto(`${base}?${COMMON}&lead=nibbin`);
      await page.waitForFunction(() => window.kilumen?.ready || window.kilumen?.ui, null, { timeout: 15000 });
      await page.evaluate(() => Promise.race([window.kilumen.ready, new Promise((r) => setTimeout(r, 15000))]).then(() => window.kilumen.ui?.sdReady));
      await sleep(1200); await page.evaluate(() => { try { kilumen.ui?.closeAll?.(); } catch {} });
      await warp(page, mapName, hv.arrival[0], hv.arrival[1]);
      for (let i = 0; i < 20 && await page.evaluate(() => kilumen.scene.busy); i++) { await page.keyboard.press('f'); await sleep(350); }
      await page.evaluate(() => kilumen.scene.flags.add('beat_master_lanternport')); // quiet so trainers do not walk up mid-shot
      await shot('arrival');
      for (const [tag, st] of views) { if (!st) continue; await page.evaluate(([x, y]) => { const s = kilumen.scene; s.player.place(x, y, 'up'); s.camera?.snap?.(); }, [st[0], st[1]]); await sleep(900); await shot(tag); }
      const title = await page.evaluate(() => kilumen.scene.map.name); if (title !== mapName) errors.push('on ' + title);
    } catch (e) { errors.push('runner: ' + e.message); try { await shot('fail'); } catch {} }
    await ctx.close(); report.push({ plat: p.plat, floor: fi + 1, map: mapName, errors, shots });
    console.log(p.plat, mapName, shots.length, errors.length ? 'ERRORS ' + errors.join(' | ').slice(0, 300) : 'ok');
  }
} finally { await browser.close(); server.kill(); }
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 1));
