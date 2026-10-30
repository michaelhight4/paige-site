// Wellspire + finale shots (Coder, Oct 29 2026, DRAFT for Gary; NOT published). PC + phone.
// Usage: node tests/wellspire_shots.mjs -> shots/wellspire_v1/<plat>_<tag>.png (+ report.json). Contact sheets: tools/wellspire/contact.py
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = process.env.OUT || path.join(ROOT, 'shots/wellspire_v1');
fs.mkdirSync(OUT, { recursive: true });
const PORT = await new Promise((res) => { const sv = net.createServer(); sv.listen(0, '127.0.0.1', () => { const p = sv.address().port; sv.close(() => res(p)); }); });
const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
const base = `http://127.0.0.1:${PORT}/index.html`;
for (let i = 0; i < 50; i++) { try { if ((await fetch(base)).ok) break; } catch {} await new Promise((r) => setTimeout(r, 100)); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let PROFILES = [{ plat: 'pc', w: 1280, h: 720, dpr: 1, touch: false }, { plat: 'phone', w: 844, h: 390, dpr: 2, touch: true }];
if (process.env.PLATS) PROFILES = PROFILES.filter((p) => process.env.PLATS.split(',').includes(p.plat));
const POINTS = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/region9/points.gen.js'), 'utf8').replace(/^[\s\S]*?=\s*/, '').replace(/;\s*$/, ''));
const P = (k) => POINTS[k];
// [tag, map, x, y, flags to set first, scene action ('spot:<id>' / 'courier' / 'credits2' / null)]
const VIEWS = [
  ['01_courier', 'house_1f', 5, 6, ['ending1_done'], 'courier'],
  ['02_brookhollow_entry', 'brookhollow', 32, 22, ['r9_unlocked'], 'spot:r9_riverbed_entry'],
  ['03_old_riverbed', 'r9_old_riverbed', P('_arrive_riverbed').x, P('_arrive_riverbed').y, [], null],
  ['04_riverbed_sign', 'r9_old_riverbed', 6, 19, [], 'spot:r9_name_sign'],
  ['05_cairnfold', 'r9_cairnfold', 26, 26, [], null],
  ['06_cairnfold_lodge', 'r9_lodge_int', 7, 6, [], 'spot:r9_lodge_legend'],
  ['07_skylift_upper', 'r9_skylift_upper', 9, 11, ['skylift_upper_open'], null],
  ['08_switchbacks', 'r9_switchbacks', 32, 40, [], null],
  ['09_icefall', 'r9_icefall', P('_arrive_icefall').x, P('_arrive_icefall').y, [], null],
  ['10_summit_camp', 'fin_summit_camp', 16, 18, [], null],
  ['11_spire_f1', 'fin_lab1_now_f1', P('_arrive_spire').x, P('_arrive_spire').y, ['found_team_summit'], null],
  ['12_spire_f2', 'fin_lab1_now_f2', 17, 4, [], 'spot:r9_spire_f2_chair'],
  ['13_spire_f3', 'fin_lab1_now_f3', 21, 4, [], null],
  ['14_dome_plea', 'fin_lab1_now', P('_arrive_dome').x, P('_arrive_dome').y, [], 'spot:fin_dome'],
  ['15_past_station_m', 'fin_past_station_m', P('_arrive_past_m').x, P('_arrive_past_m').y, ['fin_timeslip'], null],
  ['16_reader_reject', 'fin_past_station_m', 4, 4, [], 'spot:fin_reader'],
  ['17_past_signal_lab', 'fin_past_signal_lab', 8, 10, ['fin_past_m_done'], null],
  ['18_past_lab1_f1', 'fin_past_lab1_f1', 11, 9, ['fin_past_t_done'], null],
  ['19_past_lab1_f4', 'fin_past_lab1_f4', 21, 1, ['fin_spire_floor_1', 'fin_spire_floor_2', 'fin_spire_floor_3'], null],
  ['20_past_enclosure', 'fin_past_enclosure', P('_arrive_enclosure').x, P('_arrive_enclosure').y, ['fin_spire_floor_4'], 'spot:fin_past_dome'],
  ['21_riverbend_dawn', 'fin_past_riverbend', P('_arrive_riverbend').x, P('_arrive_riverbend').y, ['fin_guardian_beaten'], null],
  ['22_credits2', 'fin_lab1_now', P('_arrive_dome').x, P('_arrive_dome').y, ['fin_woke_home', 'spring_running'], 'credits2'],
  ['23_lantern_rest_epilogue', 'lantern_rest', 20, 10, ['field_team_home', 'ending2_done'], 'spot:fin_bench_swap'],
];
const browser = await chromium.launch(); const report = [];
try {
  for (const p of PROFILES) {
    const ctx = await browser.newContext({ viewport: { width: p.w, height: p.h }, deviceScaleFactor: p.dpr, hasTouch: p.touch, isMobile: p.touch });
    const page = await ctx.newPage(); await page.addInitScript(() => { try { localStorage.setItem('kilumen_alpha_notice_seen.v1', '1'); } catch {} });
    const errors = [], shots = []; page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => { if (m.type() === 'error' && !/playtime\.js|icon_f0|icon_f1/.test((m.location()?.url || '') + m.text())) errors.push(m.text()); });
    try {
      await page.goto(`${base}?save=0&timescale=0&hour=12&audio=0&enc=0&lead=nibbin`);
      await page.waitForFunction(() => window.kilumen?.ready || window.kilumen?.ui, null, { timeout: 15000 });
      await page.evaluate(() => Promise.race([window.kilumen.ready, new Promise((r) => setTimeout(r, 15000))]).then(() => window.kilumen.ui?.sdReady));
      await sleep(1200); await page.evaluate(() => { try { kilumen.ui?.closeAll?.(); } catch {} });
      for (let i = 0; i < 8; i++) { await page.keyboard.press('f'); await sleep(300); }
      for (let i = 0; i < 40 && !(await page.evaluate(() => !!kilumen.region9)); i++) await sleep(250);
      for (const [tag, map, x, y, fl, act] of VIEWS) {
        for (let i = 0; i < 30 && await page.evaluate(() => kilumen.scene.busy); i++) { await page.keyboard.press('f'); await sleep(250); }
        await page.evaluate(() => { document.querySelectorAll('.credits, #credits, .kl-credits').forEach((e) => e.remove()); });
        await page.evaluate(([map, x, y, fl]) => { const s = kilumen.scene; for (const f of fl) s.setFlag(f); s.fade = null; s.busy = false; s.player.locked = false; s.startWarp({ map, x, y, facing: 'up' }, 'door'); }, [map, x, y, fl]);
        await sleep(2300);
        const on = await page.evaluate(() => kilumen.scene.map.name); if (on !== map) errors.push(`${tag} on ${on}`);
        if (act === 'courier') { await page.evaluate(() => kilumen.region9.tick()); await sleep(900); for (let i = 0; i < 4; i++) { await page.keyboard.press('f'); await sleep(350); } }
        else if (act === 'credits2') { await page.evaluate(() => import('./src/ui/credits.js?v=v0.2.92-alpha').then((m) => { m.runCredits(kilumen.scene, {}, { variant: 'ending2' }); })); await sleep(3500); }
        else if (act?.startsWith('spot:')) { await page.evaluate((id) => { const s = kilumen.scene; s.script(() => s.region9.runSpot({ id })); }, act.slice(5)); await sleep(1200); }
        const fn = `${p.plat}_${tag}.png`; await page.screenshot({ path: path.join(OUT, fn) }); shots.push(fn);
        if (act === 'credits2') { await page.keyboard.press('Escape'); await sleep(300); await page.reload(); await page.waitForFunction(() => window.kilumen?.ready, null, { timeout: 15000 }); await page.evaluate(() => Promise.race([window.kilumen.ready, new Promise((r) => setTimeout(r, 15000))])); await sleep(1500); for (let i = 0; i < 8; i++) { await page.keyboard.press('f'); await sleep(300); } for (let i = 0; i < 40 && !(await page.evaluate(() => !!kilumen.region9)); i++) await sleep(250); }
      }
    } catch (e) { errors.push('runner: ' + e.message); }
    await ctx.close(); report.push({ plat: p.plat, errors, shots });
    console.log(p.plat, shots.length, errors.length ? 'ERRORS ' + errors.join(' | ').slice(0, 500) : 'ok');
  }
} finally { await browser.close(); server.kill(); }
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 1));
