// Hall overhaul v1 shots (Oct 29 2026, hallanim on via localhost dev default). Was: Jestrix line (Oct 29 2026): in-game PC + phone shots: battle front/back, overworld walk (lead follower), Kilindex, evolution.
// Usage: node tests/jestrix_line_shots.mjs -> shots/hall_overhaul_v1/*.png + report.json (contact sheet: separate step)
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = process.env.OUT || path.join(ROOT, 'shots/hall_overhaul_v1');
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

const { hallV2FromMap } = await import(path.join(ROOT, 'src/progression/puzzles.js'));
const HALLS = ['fernwick', 'mirefen', 'saltmere', 'tidewater', 'frostspire', 'lanternport', 'revival', 'cindervale'];
const DIR = { U: 'ArrowUp', D: 'ArrowDown', L: 'ArrowLeft', R: 'ArrowRight' };
const browser = await chromium.launch();
const report = [];
try {
  for (const p of PROFILES.filter((q) => !process.env.PLAT || q.plat === process.env.PLAT)) for (const h of HALLS.filter((x) => !process.env.ONLY || process.env.ONLY.split(',').includes(x))) {
    const mapName = `${h}_hall_int`, mj = JSON.parse(fs.readFileSync(path.join(ROOT, `art/world/overworld/maps/${mapName}.json`), 'utf8')), hv = mj.hall_v2;
    const moves = hallV2FromMap(mj).hall.check().moves;
    const clip = p.plat === 'pc';
    const ctx = await browser.newContext({ viewport: { width: p.w, height: p.h }, deviceScaleFactor: p.dpr, hasTouch: p.touch, isMobile: p.touch, ...(clip ? { recordVideo: { dir: OUT, size: { width: 960, height: 540 } } } : {}) });
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
      await page.evaluate((z) => { const s = kilumen.scene; s.flags.add('beat_master_' + z); }, hv.zone); // quiet trainers for the walk
      info = await page.evaluate(() => { const s = kilumen.scene, a = s.map.json.hall_v2?.anim?.cells || []; return { map: s.map.name, anim: a.filter(([x, y, n, L]) => s.map.tile(L, x, y) === s.map.tileByName(n)?.id).length, of: a.length }; });
      await shot('lobby');
      const half = Math.floor(moves.length / 2);
      for (let i = 0; i < moves.length; i++) {
        const before = await page.evaluate(() => [kilumen.scene.player.x, kilumen.scene.player.y].join());
        await page.keyboard.down(DIR[moves[i]]);
        await page.waitForFunction((b) => { const p = kilumen.scene.player; return p.state === 'step' || [p.x, p.y].join() !== b; }, before, { timeout: 3000 }).catch(() => {});
        await page.keyboard.up(DIR[moves[i]]);
        await page.waitForFunction(() => { const s = kilumen.scene; return s.player.state !== 'step' && !s.player.locked; }, null, { timeout: 8000 }).catch(() => {});
        await sleep(120);
        if (i === half) await shot('puzzle');
      }
      await sleep(400);
      const at = await page.evaluate(() => [kilumen.scene.player.x, kilumen.scene.player.y]);
      info.reached_dais = at[0] === hv.dais_front[0] && at[1] === hv.dais_front[1]; info.at = at;
      await shot('dais');
    } catch (e) { errors.push('runner: ' + e.message); try { await shot('fail'); } catch {} }
    const vid = clip ? page.video() : null;
    await ctx.close();
    if (vid) { const v = await vid.path(); const f = `clip_${h}.webm`; fs.renameSync(v, path.join(OUT, f)); shots.push(f); }
    report.push({ plat: p.plat, hall: h, moves: moves.length, info, errors, shots });
    console.log(p.plat, h, JSON.stringify(info), errors.length ? 'ERRORS ' + errors.join(' | ').slice(0, 400) : 'ok');
  }
} finally { await browser.close(); server.kill(); }
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 1));
