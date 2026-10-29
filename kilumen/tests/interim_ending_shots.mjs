// Interim ending shots (v0.2.86): PC + phone, the real Ron 6 talk path with 8 coins -> Ron/RITA -> credits -> home.
// Usage: OUT=... node tests/interim_ending_shots.mjs (+ VIDEO=1 for a clip per platform)
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = process.env.OUT || path.join(ROOT, 'shots/interim_ending_v1');
fs.mkdirSync(OUT, { recursive: true });
const PORT = await new Promise((res) => { const sv = net.createServer(); sv.listen(0, '127.0.0.1', () => { const p = sv.address().port; sv.close(() => res(p)); }); });
const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
const base = `http://127.0.0.1:${PORT}/index.html`;
for (let i = 0; i < 50; i++) { try { if ((await fetch(base)).ok) break; } catch {} await new Promise((r) => setTimeout(r, 100)); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PROFILES = [{ plat: 'pc', w: 1280, h: 720, dpr: 1, touch: false }, { plat: 'phone', w: 844, h: 390, dpr: 2, touch: true }];
const MASTERS = ['fernwick', 'saltmere', 'revival', 'frostspire', 'mirefen', 'tidewater', 'lanternport', 'cindervale'].map((z) => 'beat_master_' + z);
// the alpha build strips the dev query, so the run starts from a seeded save: 8 coins (no all_badges yet), Ron 1-5 beaten, at Ron 6
const SAVE = JSON.stringify((await import('../src/overworld/save.js')).normalise({ ...JSON.parse(fs.readFileSync(new URL('./fixtures/interim_ending_save.json', import.meta.url), 'utf8')), savedAt: Date.now() }));
const FLAGS = ['got_starter', ...MASTERS, ...[1, 2, 3, 4, 5].map((i) => 'beat_rival_ron_' + i)].join(',');
const browser = await chromium.launch();
const report = [];
try {
  for (const p of PROFILES) {
    const ctx = await browser.newContext({ viewport: { width: p.w, height: p.h }, deviceScaleFactor: p.dpr, hasTouch: p.touch, isMobile: p.touch,
      ...(process.env.VIDEO ? { recordVideo: { dir: path.join(OUT, 'raw_' + p.plat), size: { width: p.w, height: p.h } } } : {}) });
    const page = await ctx.newPage();
    await page.addInitScript((sv) => { try { localStorage.setItem('kilumen_alpha_notice_seen.v1', '1'); if (!sessionStorage.getItem('ie_seeded')) { localStorage.setItem('kilumen_alpha_save.v1', sv); sessionStorage.setItem('ie_seeded', '1'); } } catch {} }, SAVE);
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('response', (r) => { if (r.status() >= 400) errors.push('404 ' + r.url().replace(base.replace('/index.html', ''), '')); });
    page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text()) && !/playtime\.js|icon_f/.test((m.location()?.url || '') + m.text())) errors.push(m.text()); });
    const shot = async (tag) => page.screenshot({ path: path.join(OUT, `${p.plat}_${tag}.png`) });
    const A = async (n = 1) => { for (let i = 0; i < n; i++) { await page.keyboard.press('KeyZ'); await sleep(450); } };
    try {
      await page.goto(`${base}?enc=0`);
      await page.waitForFunction(() => window.kilumen?.ready);
      await page.evaluate(() => Promise.race([window.kilumen.ready, new Promise((r) => setTimeout(r, 15000))]).then(() => window.kilumen.ui?.sdReady));
      await sleep(1200); await shot('0_title'); await page.evaluate(() => { try { kilumen.ui?.closeAll?.(); } catch {} }); await sleep(1500);
      // a save that already holds 8 coins (no all_badges): synced on load, arena gate open
      const gate = await page.evaluate(() => ({ map: kilumen.scene.map?.name, fl: [...kilumen.scene.flags].join(','), all_badges: kilumen.scene.flags.has('all_badges'), ron6: !!kilumen.scene.npcs.byId('aurelith_ron_6') }));
      report.push({ plat: p.plat, gate });
      await page.evaluate(() => { const s = kilumen.scene; s.player.place(29, 10, 'up'); s.camera?.snap?.(); }); await sleep(600); await shot('1_arena_gate_open');
      await page.evaluate(() => { const s = kilumen.scene, n = s.npcs.byId('aurelith_ron_6'); s.player.place(n.x, n.y + 1, 'up'); s.hooks.onBattle = async () => true; s.talk(n, n.def); });
      await sleep(900); await shot('2_ron_challenge');
      for (let i = 0; i < 12 && !(await page.evaluate(() => kilumen.scene.log.some((e) => e.type === 'ending'))); i++) await A();
      await sleep(300); await shot('3_ron_after');
      await A(); await sleep(300); await shot('4_rita');
      for (let i = 0; i < 6 && !(await page.locator('.cr-wrap').count()); i++) await A();
      await page.evaluate(() => { const b = document.querySelector('.ui-dlg, .dlg-wrap'); return b; });
      await page.waitForSelector('.cr-wrap.on', { timeout: 5000 });
      const marks = [2500, 9000, 17000, 26000, 36000];
      let t = 0; for (const [i, m] of marks.entries()) { await sleep(m - t); t = m; await shot(`5_credits_${i + 1}`); }
      report.push({ plat: p.plat, lockedDuringCredits: await page.evaluate(() => kilumen.scene.saveLockReason()) });
      await page.waitForSelector('.cr-wrap', { state: 'detached', timeout: 90000 });
      await page.waitForFunction(() => kilumen.scene.map?.name === 'brookhollow' && !kilumen.scene.fade, null, { timeout: 15000 });
      await sleep(700); await shot('6_home_ron'); await A(2); await sleep(300); await shot('7_postgame_note');
      await A(3);
      report.push({ plat: p.plat, end: await page.evaluate(() => { const s = kilumen.scene; const d = s.saveData(); return { map: s.map.name, finale_done: s.flags.has('finale_done'), game_cleared: d.game_cleared, lock: s.saveLockReason() }; }) });
    } catch (e) { errors.push('runner: ' + e.message); await shot('fail').catch(() => {}); }
    report.push({ plat: p.plat, errors });
    console.log(p.plat, errors.length ? 'ERRORS ' + errors.join(' | ').slice(0, 600) : 'ok');
    const v = page.video(); await ctx.close();
    if (v) fs.renameSync(await v.path(), path.join(OUT, `${p.plat}_ending_raw.webm`));
  }
} finally { await browser.close(); server.kill(); }
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 1));
