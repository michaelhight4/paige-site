// Hall overhaul v2 shots (Character models' hall art wired, Oct 29 2026): lobby + a framed view of each hall's new trainers / push / warp art. Usage: PLAT=pc node tests/hall_overhaul_v2_shots.mjs. Was: v1 shots (Oct 29 2026, hallanim on via localhost dev default). Was: Jestrix line (Oct 29 2026): in-game PC + phone shots: battle front/back, overworld walk (lead follower), Kilindex, evolution.
// Usage: node tests/jestrix_line_shots.mjs -> shots/hall_overhaul_v1/*.png + report.json (contact sheet: separate step)
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = process.env.OUT || path.join(ROOT, 'shots/hall_overhaul_v2');
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


const HALLS = ['fernwick', 'mirefen', 'saltmere', 'tidewater', 'frostspire', 'lanternport', 'revival', 'cindervale'];
const smap = JSON.parse(fs.readFileSync(path.join(ROOT, 'art/characters/pixel/npcs/npc_sprite_map.json'), 'utf8')).map;
const browser = await chromium.launch();
const report = [];
try {
  for (const p of PROFILES.filter((q) => !process.env.PLAT || q.plat === process.env.PLAT)) for (const h of HALLS.filter((x) => !process.env.ONLY || process.env.ONLY.split(',').includes(x))) {
    const mapName = `${h}_hall_int`, mj = JSON.parse(fs.readFileSync(path.join(ROOT, `art/world/overworld/maps/${mapName}.json`), 'utf8')), hv = mj.hall_v2;
    const newTr = (mj.npcs || []).filter((n) => smap[`${mapName}.${n.id}`]?.sprite_id?.includes('_hall_int_h'));
    const pts = [];
    hv.grid.forEach((row, y) => [...row].forEach((c, x) => { if ('^v<>'.includes(c) || hv.warps?.[c]) pts.push([x, y]); }));
    const views = [];
    if (pts.length) {
      // group points into bands of ~8 rows so each view is on screen
      pts.sort((a, b) => a[1] - b[1]); let band = [];
      for (const q of pts) { if (band.length && q[1] - band[0][1] > 7) { views.push(band); band = []; } band.push(q); } if (band.length) views.push(band);
    }
    for (const n of newTr) views.push([[n.x, n.y + 1.6]]); // one framed view per new trainer (player just below)
    const npcAt = new Set((mj.npcs || []).map((n) => `${n.x},${n.y}`));
    const stand = (band) => { const cx = band.reduce((a, q) => a + q[0], 0) / band.length, cy = band.reduce((a, q) => a + q[1], 0) / band.length; let best = null;
      hv.grid.forEach((row, y) => [...row].forEach((c, x) => { if (!'.^v<>123456'.includes(c) || mj.layers.collision[y][x] !== 0 || npcAt.has(`${x},${y}`)) return; const d = (x - cx) ** 2 + (y - cy) ** 2; if (!best || d < best[2]) best = [x, y, d]; })); return best; };
    const ctx = await browser.newContext({ viewport: { width: p.w, height: p.h }, deviceScaleFactor: p.dpr, hasTouch: p.touch, isMobile: p.touch });
    const page = await ctx.newPage();
    await page.addInitScript(() => { try { localStorage.setItem('kilumen_alpha_notice_seen.v1', '1'); } catch {} });
    const errors = [];
    page.on('console', (m) => { if (m.type() === 'error' && !/playtime\.js|icon_f0|icon_f1/.test((m.location()?.url || '') + m.text())) errors.push(m.text() + ' ' + (m.location()?.url || '')); });
    page.on('pageerror', (e) => errors.push(String(e)));
    const shots = []; let info = null;
    const shot = async (tag) => { const f = `${p.plat}_${h}_${tag}.png`; await page.screenshot({ path: path.join(OUT, f) }); shots.push(f); };
    try {
      await page.goto(`${base}?${COMMON}&lead=nibbin`);
      await page.waitForFunction(() => window.kilumen?.ready || window.kilumen?.ui, null, { timeout: 15000 });
      await page.evaluate(() => Promise.race([window.kilumen.ready, new Promise((r) => setTimeout(r, 15000))]).then(() => window.kilumen.ui?.sdReady));
      await sleep(1200);
      await page.evaluate(() => { try { kilumen.ui?.closeAll?.(); } catch {} });
      await warp(page, mapName, hv.arrival[0], hv.arrival[1]);
      for (let i = 0; i < 20 && await page.evaluate(() => kilumen.scene.busy); i++) { await page.keyboard.press('f'); await sleep(350); }
      await page.evaluate((z) => { kilumen.scene.flags.add('beat_master_' + z); }, hv.zone);
      info = await page.evaluate((ids) => { const s = kilumen.scene, m = s.map;
        const art = []; for (let y = 0; y < m.height; y++) for (let x = 0; x < m.width; x++) { const t = m.tile('ground', x, y); if (t >= 9981 && t < 10013) art.push(t); }
        const ts = s.tilesetIndex || s.map.tileset; const loaded = !!m.tileByName?.('ha_push_up__floor_stone');
        return { map: m.name, hall_art_cells: art.length, hall_art_tiles_loaded: loaded, new_trainers: ids.length }; }, newTr.map((n) => n.id));
      await shot('lobby');
      for (let i = 0; i < views.length; i++) {
        const st = stand(views[i]); if (!st) continue;
        await page.evaluate(([x, y]) => { const s = kilumen.scene; s.player.place(x, y, 'up'); s.camera?.snap?.(); }, [st[0], st[1]]);
        await sleep(900); await shot(`art${i + 1}`);
      }
    } catch (e) { errors.push('runner: ' + e.message); try { await shot('fail'); } catch {} }
    await ctx.close();
    report.push({ plat: p.plat, hall: h, info, views: views.length, errors, shots });
    console.log(p.plat, h, JSON.stringify(info), views.length, errors.length ? 'ERRORS ' + errors.join(' | ').slice(0, 400) : 'ok');
  }
} finally { await browser.close(); server.kill(); }
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 1));
