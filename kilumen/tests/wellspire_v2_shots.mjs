// Wellspire v2 shots (Coder, Oct 29 2026, DRAFT for Gary; NOT published): the climb, puzzles, a field team, the summit, the slip, the reveal.
// Usage: node tests/wellspire_v2_shots.mjs -> shots/wellspire_v2/<plat>_<tag>.png (+ report.json). Contact sheets: tools/wellspire/contact.py
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = process.env.OUT || path.join(ROOT, 'shots/wellspire_v2');
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
const J = (m) => JSON.parse(fs.readFileSync(path.join(ROOT, `art/world/overworld/maps/${m}.json`), 'utf8'));
const up = (m) => { const w = J(m).warps.find((q) => q.y <= 2); return [w.x, w.y + 1]; }, down = (m) => { const w = J(m).warps.reduce((a, q) => (q.y > a.y ? q : a)); return [w.x, w.y - 1]; };
const sw = (m, i) => { const q = J(m).puzzle.switches[i]; return [q.x, q.y + 1]; };
const SAY = (k) => `say:${k}`;
// [tag, map, x, y, flags, action: spot:<id> | talk:<npc> | say:<key> | summit | slip | credits2 | null, extra]
const VIEWS = [
  ['01_switchbacks_outdoor1', 'r9_switchbacks', 32, 40, ['r9_unlocked'], null],
  ['02_icefall_cave1', 'r9_icefall', P('_arrive_icefall').x, P('_arrive_icefall').y, [], null],
  ['03_cloudway_outdoor2', 'r9_cloudway', ...down('r9_cloudway'), [], null],
  ['04_cloudway_plates', 'r9_cloudway', ...sw('r9_cloudway', 0), [], null],
  ['07_echo_cave2', 'r9_echo_cave', ...down('r9_echo_cave'), [], null],
  ['08_echo_crystals', 'r9_echo_cave', ...sw('r9_echo_cave', 1), [], null],
  ['09_echo_note_easter_egg', 'r9_echo_cave', 22, 10, [], 'spot:r9_echo_note'],
  ['10_cloudline_outdoor3', 'r9_cloudline', ...down('r9_cloudline'), [], null],
  ['11_cloudline_ice_plates', 'r9_cloudline', ...sw('r9_cloudline', 1), [], null],
  ['12_heart_cave3', 'r9_heart_cave', ...down('r9_heart_cave'), [], null],
  ['13_heart_plates_crystals', 'r9_heart_cave', ...sw('r9_heart_cave', 3), [], null],
  ['14_heart_vesper', 'r9_heart_cave', 10, 14, [], 'say:r9.ft.r9_hc_field_1.intro'],
  ['15_summit_camp', 'fin_summit_camp', 16, 18, [], null],
  ['16_summit_live_run', 'fin_lab1_now', P('_arrive_dome').x, P('_arrive_dome').y, ['found_team_summit'], 'summit:2600'],
  ['17_summit_clouds', 'fin_lab1_now', P('_arrive_dome').x, P('_arrive_dome').y, [], 'fx:{"cloud":1,"row":0,"focus":1,"say":"fin.summit.clouds"}'],
  ['18_summit_parting', 'fin_lab1_now', P('_arrive_dome').x, P('_arrive_dome').y, [], 'fx:{"cloud":0.5,"light":0.5,"row":0,"focus":1}'],
  ['19_summit_reveal_wide', 'fin_lab1_now', P('_arrive_dome').x, P('_arrive_dome').y, [], 'fx:{"light":1,"row":1,"focus":1,"wide":1,"say":"fin.summit.reveal"}'],
  ['20_summit_flare_wide', 'fin_lab1_now', P('_arrive_dome').x, P('_arrive_dome').y, [], 'fx:{"light":1,"row":2,"focus":1,"wide":1,"flash":0.22,"say":"fin.summit.flare"}'],
  ['21_time_slip', 'fin_lab1_now', P('_arrive_dome').x, P('_arrive_dome').y, ['fin_summit_seen'], 'slip'],
  ['22_past_enclosure_crystal', 'fin_past_enclosure', 10, 9, ['fin_timeslip', 'fin_spire_floor_4'], 'fx:{"focus":1}'],
  ['23_past_logbook', 'fin_past_enclosure', 10, 11, [], 'spot:fin_past_logbook'],
  ['24_never_summit_empty', 'fin_lab1_now', P('_arrive_dome').x, P('_arrive_dome').y, ['fin_guardian_beaten', 'ending2_done'], SAY('fin.never.summit_empty')],
  ['25_never_letter_blank', 'lantern_rest', 20, 10, ['field_team_home', 'ending2_done'], SAY('fin.never.letter_blank')],
  ['26_never_mum', 'lantern_rest', 20, 10, [], SAY('fin.never.mum')],
  ['27_never_head_office', 'lantern_rest', 20, 10, [], SAY('fin.never.head_office')],
  ['28_never_last', 'lantern_rest', 20, 10, [], SAY('fin.never.last')],
  ['29_after_e2_duty_board', 'heal_brookhollow', 6, 6, ['ending2_done'], SAY('post.duty_board_home')],
  ['30_after_e2_wellspire_gone', 'brookhollow', 32, 22, ['ending2_done'], 'spot:r9_riverbed_entry'],
  ['31_flashback_lab', 'fin_past_lab1_f1', 11, 9, ['ending2_done'], SAY('dream.post_e2')],
  ['32_coralie_cove', 'tidewater_coast', 44, 33, ['ending2_done'], SAY('fin.epilogue.coralie')],
  ['33_home_wake', 'house_2f', 8, 4, ['fin_woke_home'], SAY('fin.home.wake')],
  ['34_walk_to_work', 'brookhollow', 17, 16, ['fin_woke_home'], SAY('fin.walk.spring')],
  ['35_rt_report_form', 'heal_brookhollow', 6, 6, ['fin_woke_home'], SAY('fin.report.form')],
  ['36_rt_four_memory_fades', 'heal_brookhollow', 6, 6, ['fin_woke_home', 'fin_walked_to_work'], 'call:reportAtWork'],
  ['05_cloudway_fieldteam_intro', 'r9_cloudway', 12, 12, [], 'talk:r9_cw_field_1'],
  ['06_cloudway_fieldteam_battle', 'r9_cloudway', 12, 12, [], 'battle'],
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
      await page.evaluate(async () => { const s = kilumen.scene; const C = await import('/src/systems/creature.js?v=v0.2.93-alpha');
        for (const sp of ['sunderhoof', 'seraphawk', 'peakbrute']) s.systems.party.add(C.createCreature({ species: sp, level: 70 })); });
      await page.evaluate(async () => { const s = kilumen.scene; const { FIELD_IDS } = await import('/src/region9/index.js?v=v0.2.93-alpha'); // other trainers stay quiet (no line-of-sight battles mid-tour); only the Lark lead's battle is shot
        for (const m of ['r9_cloudway', 'r9_echo_cave', 'r9_cloudline', 'r9_heart_cave', 'r9_switchbacks', 'r9_icefall']) for (const id of FIELD_IDS) if (id !== 'r9_cw_field_1') s.seen[`defeated:${m}.${id}`] = true; });
      for (const [tag, map, x, y, fl, act] of VIEWS) {
        for (let i = 0; i < 30 && await page.evaluate(() => kilumen.scene.busy); i++) { await page.keyboard.press('f'); await sleep(250); }
        await page.evaluate(() => { document.querySelectorAll('.credits, #credits, .kl-credits').forEach((e) => e.remove()); });
        await page.evaluate(([map, x, y, fl]) => { const s = kilumen.scene; for (const f of fl) s.setFlag(f); s.fade = null; s.busy = false; if (s.r9fx) { s.r9fx.row = null; s.r9fx.flash = 0; s.r9fx.light = 0; s.r9fx.cloud = 0; } s.camFocus = null; s.player.locked = false; s.startWarp({ map, x, y, facing: 'up' }, 'door'); }, [map, x, y, fl]);
        await sleep(2300);
        const on = await page.evaluate(() => kilumen.scene.map.name); if (on !== map) errors.push(`${tag} on ${on}`);
        if (act === 'courier') { await page.evaluate(() => kilumen.region9.tick()); await sleep(900); for (let i = 0; i < 4; i++) { await page.keyboard.press('f'); await sleep(350); } }
        else if (act === 'credits2') { await page.evaluate(() => import('./src/ui/credits.js?v=v0.2.93-alpha').then((m) => { m.runCredits(kilumen.scene, {}, { variant: 'ending2' }); })); await sleep(3500); }
        else if (act?.startsWith('talk:')) { await page.evaluate(() => { kilumen.scene.player.facing = 'up'; }); await page.keyboard.press('f'); await sleep(1200); }
        else if (act === 'battle') { await page.evaluate(() => { kilumen.scene.player.facing = 'up'; }); await page.keyboard.press('f'); await sleep(700); for (let i = 0; i < 6; i++) { await page.keyboard.press('f'); await sleep(450); } await sleep(1500); }
        else if (act?.startsWith('summit:')) { const t = +act.slice(7); await page.evaluate(() => { const s = kilumen.scene; s.flags.delete?.('fin_summit_seen'); s.script(() => s.region9.SPOTS.fin_dome()); }); const t0 = Date.now(); while (Date.now() - t0 < t) { await sleep(400); if (Date.now() - t0 > 1500) await page.keyboard.press('f'); } }
        else if (act?.startsWith('fx:')) { const o = JSON.parse(act.slice(3)); await page.evaluate(async (o) => { const s = kilumen.scene, fx = s.r9fx;
            if (o.wide) { s.opts.zoom = 1; window.dispatchEvent(new Event('resize')); }
            Object.assign(fx, { cloud: o.cloud || 0, light: o.light || 0, flash: o.flash || 0, flashCol: '200,160,255', row: o.row ?? null });
            if (o.focus) s.camFocus = fx.centre(); if (o.say) s.script(() => s.say(s.region9.text(o.say), { name: null })); }, o); await sleep(1300); }
        else if (act === 'slip') { await page.evaluate(() => { const s = kilumen.scene, fx = s.r9fx; fx.row = 2; fx.light = 1; fx.flashCol = '190,140,255'; fx.flash = 0.55; s.script(() => s.say(s.region9.text('fin.timeslip'), { name: null })); }); await sleep(1200); }
        else if (act?.startsWith('say:')) { await page.evaluate((k) => { const s = kilumen.scene; s.script(() => s.say(s.region9.text(k), { name: null })); }, act.slice(4)); await sleep(1200); }
        else if (act?.startsWith('call:')) { await page.evaluate((fn) => { const s = kilumen.scene; s.script(() => s.region9[fn]()); }, act.slice(5)); await sleep(4500); }
        else if (act?.startsWith('spot:')) { await page.evaluate((id) => { const s = kilumen.scene; s.script(() => s.region9.runSpot({ id })); }, act.slice(5)); await sleep(1200); }
        const fn = `${p.plat}_${tag}.png`; await page.screenshot({ path: path.join(OUT, fn) }); shots.push(fn);
        await page.evaluate(() => { const s = kilumen.scene; if (s.opts.zoom) { delete s.opts.zoom; window.dispatchEvent(new Event('resize')); } });
        if (act === 'credits2') { await page.keyboard.press('Escape'); await sleep(300); await page.reload(); await page.waitForFunction(() => window.kilumen?.ready, null, { timeout: 15000 }); await page.evaluate(() => Promise.race([window.kilumen.ready, new Promise((r) => setTimeout(r, 15000))])); await sleep(1500); for (let i = 0; i < 8; i++) { await page.keyboard.press('f'); await sleep(300); } for (let i = 0; i < 40 && !(await page.evaluate(() => !!kilumen.region9)); i++) await sleep(250); }
      }
    } catch (e) { errors.push('runner: ' + e.message); }
    await ctx.close(); report.push({ plat: p.plat, errors, shots });
    console.log(p.plat, shots.length, errors.length ? 'ERRORS ' + errors.join(' | ').slice(0, 500) : 'ok');
  }
} finally { await browser.close(); server.kill(); }
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 1));
