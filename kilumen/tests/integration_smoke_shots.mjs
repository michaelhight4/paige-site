// dev/integration-r58 headless smoke (Oct 30 2026): Wellspire, Gullhaven sea maze/caves/town, a derby run to scoring,
// merit shop, a side activity and a hall. Usage: node tests/integration_smoke_shots.mjs -> shots/integration_v1/*.png + report.json
// Patterns from tests/seaport_shots.mjs, merit_shop_shots.mjs, side_activities_shots.mjs, wellspire_v2_shots.mjs.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'shots/integration_v1'); fs.mkdirSync(OUT, { recursive: true });
const PORT = await new Promise((res) => { const sv = net.createServer(); sv.listen(0, '127.0.0.1', () => { const p = sv.address().port; sv.close(() => res(p)); }); });
const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
const base = `http://127.0.0.1:${PORT}/index.html`;
for (let i = 0; i < 50; i++) { try { if ((await fetch(base)).ok) break; } catch {} await new Promise((r) => setTimeout(r, 100)); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PROFILES = [{ plat: 'pc', w: 1280, h: 720, dpr: 1, touch: false }, { plat: 'phone', w: 844, h: 390, dpr: 2, touch: true }].filter((p) => !process.env.PLATS || process.env.PLATS.split(',').includes(p.plat));
const browser = await chromium.launch(); const report = [];
try {
  for (const p of PROFILES) {
    const ctx = await browser.newContext({ viewport: { width: p.w, height: p.h }, deviceScaleFactor: p.dpr, hasTouch: p.touch, isMobile: p.touch });
    const page = await ctx.newPage(); await page.addInitScript(() => { try { localStorage.setItem('kilumen_alpha_notice_seen.v1', '1'); } catch {} });
    const errors = [], shots = [], checks = {};
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => { if (m.type() === 'error' && !/playtime\.js|icon_f0|icon_f1/.test((m.location()?.url || '') + m.text())) errors.push(m.text()); });
    let n = 0; const shot = async (tag) => { const f = `${p.plat}_${String(++n).padStart(2, '0')}_${tag}.png`; await page.screenshot({ path: path.join(OUT, f) }); shots.push(f); };
    const press = async (k = 1) => { for (let i = 0; i < k; i++) { await page.keyboard.press('f'); await sleep(300); } };
    const clear = async () => { for (let i = 0; i < 30 && await page.evaluate(() => kilumen.scene.busy || kilumen.scene.dialog?.active); i++) { await page.keyboard.press('f'); await sleep(250); } };
    const warp = async (map, x, y, facing = 'up', fl = []) => {
      await clear();
      await page.evaluate(([map, x, y, facing, fl]) => { const s = kilumen.scene; try { kilumen.ui?.closeAll?.(); } catch {} for (const f of fl) s.setFlag ? s.setFlag(f) : s.flags.add(f); s.fade = null; s.busy = false; s.player.locked = false; s.startWarp({ map, x, y, facing }, 'door'); }, [map, x, y, facing, fl]);
      await sleep(2500); const on = await page.evaluate(() => kilumen.scene.map.name); checks[`warp:${map}`] = on === map; if (on !== map) errors.push(`warp ${map} landed on ${on}`);
    };
    const step = async (name, fn) => { try { await fn(); } catch (e) { errors.push(`${name}: ${e.message.split('\n')[0]}`); try { await shot(`FAIL_${name}`); } catch {} } };
    try {
      await page.goto(`${base}?save=0&timescale=0&hour=12&audio=0&enc=0&lead=nibbin`);
      await page.waitForFunction(() => window.kilumen?.ready || window.kilumen?.ui, null, { timeout: 15000 });
      await page.evaluate(() => Promise.race([window.kilumen.ready, new Promise((r) => setTimeout(r, 15000))]).then(() => window.kilumen.ui?.sdReady));
      await sleep(1200); await page.evaluate(() => { try { kilumen.ui?.closeAll?.(); } catch {} }); await press(8);
      for (let i = 0; i < 40 && !(await page.evaluate(() => !!kilumen.region9 && !!kilumen.side && !!kilumen.seaport)); i++) await sleep(250);
      checks.modules = await page.evaluate(() => ({ region9: !!kilumen.region9, side: !!kilumen.side, seaport: !!kilumen.seaport, rtxMode: kilumen.scene.rtx?.mode ?? null }));
      // Wellspire (region 9)
      await step('wellspire', async () => {
        await warp('r9_switchbacks', 32, 40, 'up', ['r9_unlocked']); await shot('wellspire_switchbacks');
        await warp('r9_cloudway', 10, 10, 'up'); await shot('wellspire_cloudway');
      });
      // Gullhaven
      await step('gullhaven', async () => {
        await warp('gullhaven_sea', 26, 6); await shot('gullhaven_sea_maze_north');
        await warp('gullhaven_sea', 20, 30); await shot('gullhaven_sea_swimmers');
        await warp('gullhaven_cave_west', 4, 22, 'up'); await shot('gullhaven_cave_west');
        await warp('gullhaven_cave_east', 4, 22, 'up'); await shot('gullhaven_cave_east');
        await warp('gullhaven', 19, 12); await shot('gullhaven_town');
      });
      // Derby run to scoring
      await step('derby', async () => {
        await warp('gullhaven_lagoon', 13, 7, 'up');
        await page.evaluate(async () => { const sp = kilumen.seaport; await Promise.race([sp.startRun(await sp.featuredToday()), new Promise((r) => setTimeout(r, 1500))]); });
        await press(4); await shot('derby_hud');
        await page.evaluate(async () => { const sp = kilumen.seaport; sp.api.useCrystal(); sp.api.onCatch({ species: sp.api.run.featured, level: 54 }); await new Promise((r) => setTimeout(r, 500)); kilumen.ui?.closeAll?.();
          for (const s of ['wavelin', 'reefshell', 'hullwhale']) { sp.api.run.crystals--; sp.api.onCatch({ species: s, level: 53 }); await new Promise((r) => setTimeout(r, 400)); kilumen.ui?.closeAll?.(); } sp.api.run.crystals = 0; });
        await press(6); await page.evaluate(() => kilumen.scene.player.place(19, 6, 'up'));
        checks.derbyBefore = await page.evaluate(() => ({ run: !!kilumen.seaport.api.run, catches: kilumen.seaport.api.run?.catches?.length ?? null }));
        await page.evaluate(() => { kilumen.scene.runSpot({ derby: 'scale' }); }); await sleep(1300); await shot('derby_scoring');
        await press(10);
        checks.derbyAfter = await page.evaluate(() => ({ runOpen: !!kilumen.seaport.api.run }));
        if (checks.derbyAfter.runOpen) errors.push('derby: run still open after scale turn-in');
      });
      // Merit shop
      await step('merit', async () => {
        await warp('brookhollow', 21, 16, 'up');
        await page.evaluate(() => { const s = kilumen.scene; s.dialog?.close?.(); const ss = s.systems.state.sports ||= {}; ss.merit = { points: 420, earned: 420, spent: 0, log: [] }; s.openMeritShop(); });
        await sleep(900); await shot('merit_shop_today');
        checks.meritOpen = await page.evaluate(() => !!document.querySelector('.ui-tab'));
        await page.evaluate(() => { try { kilumen.ui?.closeAll?.(); } catch {} });
      });
      // Side activity (Fernwick letters box)
      await step('side', async () => {
        await warp('fernwick', 24, 23, 'up'); await page.keyboard.press('f'); await sleep(900); await shot('side_fern_box_intro');
        await clear(); await page.evaluate(() => { try { kilumen.side?.close?.(); } catch {} });
        await warp('saltmere', 22, 21, 'up'); await page.keyboard.press('f'); await sleep(900); await shot('side_salt_quiz');
        await clear(); await page.evaluate(() => { try { kilumen.side?.close?.(); kilumen.ui?.closeAll?.(); } catch {} });
      });
      // Hall
      await step('hall', async () => {
        const j = JSON.parse(fs.readFileSync(path.join(ROOT, 'art/world/overworld/maps/cindervale_hall_int.json'), 'utf8'));
        const w = j.warps.reduce((a, q) => (q.y > a.y ? q : a));
        await warp('cindervale_hall_int', w.x, w.y - 1, 'up'); await shot('hall_cindervale_entry');
        const m = j.npcs.find((q) => /master/.test(q.id)); if (m) { await page.evaluate(([x, y]) => { kilumen.scene.player.place(x, y, 'up'); kilumen.scene.camera?.snap?.(); }, [m.x, m.y + 1]); await sleep(700); await shot('hall_cindervale_master'); }
        checks.masterSprite = await page.evaluate(() => { const n = kilumen.scene.npcs?.list?.find?.((q) => /master/.test(q.id)); return n ? (n.sprite || n.def?.sprite || n.spriteId || 'present') : null; });
      });
    } catch (e) { errors.push('runner: ' + e.message); }
    await ctx.close(); report.push({ plat: p.plat, errors, checks, shots });
    console.log(p.plat, shots.length, JSON.stringify(checks), errors.length ? 'ERRORS ' + errors.join(' | ').slice(0, 1500) : 'ok');
  }
} finally { await browser.close(); server.kill(); }
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 1));
