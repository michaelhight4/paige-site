// Wellspire v3 shots (lab gauntlet, tank break, summit face-off, shot 32/36 retakes). Based on wellspire_v2_shots.mjs.
// Wellspire v2 shots (Coder, Oct 29 2026, DRAFT for Gary; NOT published): the climb, puzzles, a field team, the summit, the slip, the reveal.
// Usage: node tests/wellspire_v2_shots.mjs -> shots/wellspire_v2/<plat>_<tag>.png (+ report.json). Contact sheets: tools/wellspire/contact.py
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = process.env.OUT || path.join(ROOT, 'shots/wellspire_v3');
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
const LAB = 'fin_past_enclosure';
const QUIET = "const {LAB_IDS}=await import('/src/region9/index.js?v=v0.2.98-alpha'); for (const id of LAB_IDS) s.seen['defeated:fin_past_enclosure.'+id]=true; s.setFlag('fin_enc_lead_beaten');";
const VIEWS = [
  ['40_lab_entry_corridor', LAB, 4, 17, [], 'js:900:0:' + QUIET],
  ['42_lab_exam_wing', LAB, 4, 6, [], 'js:900:0:' + QUIET],
  ['43_lab_vat_hall', LAB, 12, 12, [], 'js:900:0:' + QUIET],
  ['44_lab_control_room', LAB, 30, 9, [], 'js:900:0:' + QUIET],
  ['45_lab_tank_sealed', LAB, 21, 9, [], 'js:1500:0:' + QUIET],
  ['46_lab_tank_breaking', LAB, 21, 9, [], 'js:1300:0:' + QUIET + ' s.r9fx.breakTank?.();'],
  ['47_lab_tank_drained', LAB, 21, 9, [], 'js:4300:0:' + QUIET + ' s.r9fx.breakTank?.();'],
  ['48_summit_faceoff', 'fin_lab1_now', P('_arrive_dome').x, P('_arrive_dome').y, [], 'fx:{"light":1,"row":1,"say":"fin.summit.faceoff"}'],
  ['32_coralie_cove', 'tidewater_coast', 43, 32, ['ending2_done'], "js:1600:0:s.flags.delete?.('fin_coralie_epilogue'); s.script(()=>s.region9.coralieCove());"],
  ['36_rt_four_at_desks', 'heal_brookhollow', 6, 5, ['fin_woke_home', 'fin_walked_to_work'], "js:1500:1:s.script(()=>s.region9.reportAtWork());"],
  ['41_lab_tech_intro', LAB, 6, 15, [], "js:1300:0:delete s.seen['defeated:fin_past_enclosure.fin_enc_entry_2']; s.player.facing='up'; s.talk(s.npcs.list.find(n=>n.id==='fin_enc_entry_2'), {id:'fin_enc_entry_2', kind:'trainer', region9:true});"],
];
const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null; const VIEWS_RUN = ONLY ? VIEWS.filter((v) => ONLY.some((o) => v[0].startsWith(o))) : VIEWS;
const browser = await chromium.launch(); const report = [];
try {
  for (const p of PROFILES) {
    const ctx = await browser.newContext({ viewport: { width: p.w, height: p.h }, deviceScaleFactor: p.dpr, hasTouch: p.touch, isMobile: p.touch });
    const page = await ctx.newPage(); await page.addInitScript(() => { try { localStorage.setItem('kilumen_alpha_notice_seen.v1', '1'); } catch {} });
    const errors = [], shots = []; page.on('response', (r) => { if (r.status() === 404) errors.push('404 ' + r.url().replace(/^.*?:\d+/, '')); }); page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => { if (m.type() === 'error' && !/playtime\.js|icon_f0|icon_f1/.test((m.location()?.url || '') + m.text())) errors.push(m.text()); });
    try {
      await page.goto(`${base}?save=0&timescale=0&hour=12&audio=0&enc=0&lead=nibbin`);
      await page.waitForFunction(() => window.kilumen?.ready || window.kilumen?.ui, null, { timeout: 15000 });
      await page.evaluate(() => Promise.race([window.kilumen.ready, new Promise((r) => setTimeout(r, 15000))]).then(() => window.kilumen.ui?.sdReady));
      await sleep(1200); await page.evaluate(() => { try { kilumen.ui?.closeAll?.(); } catch {} });
      for (let i = 0; i < 8; i++) { await page.keyboard.press('f'); await sleep(300); }
      for (let i = 0; i < 40 && !(await page.evaluate(() => !!kilumen.region9)); i++) await sleep(250);
      await page.evaluate(async () => { const s = kilumen.scene; const C = await import('/src/systems/creature.js?v=v0.2.98-alpha');
        for (const sp of ['sunderhoof', 'seraphawk', 'peakbrute']) s.systems.party.add(C.createCreature({ species: sp, level: 70 })); });
      await page.evaluate(async () => { const s = kilumen.scene; const { FIELD_IDS } = await import('/src/region9/index.js?v=v0.2.98-alpha'); // other trainers stay quiet (no line-of-sight battles mid-tour); only the Lark lead's battle is shot
        for (const m of ['r9_cloudway', 'r9_echo_cave', 'r9_cloudline', 'r9_heart_cave', 'r9_switchbacks', 'r9_icefall']) for (const id of FIELD_IDS) if (id !== 'r9_cw_field_1') s.seen[`defeated:${m}.${id}`] = true; });
      for (const [tag, map, x, y, fl, act] of VIEWS_RUN) {
        for (let i = 0; i < 30 && await page.evaluate(() => kilumen.scene.busy); i++) { await page.keyboard.press('f'); await sleep(250); }
        await page.evaluate(() => { document.querySelectorAll('.credits, #credits, .kl-credits').forEach((e) => e.remove()); });
        await page.evaluate(([map, x, y, fl]) => { const s = kilumen.scene; for (const f of fl) s.setFlag(f); s.fade = null; s.busy = false; if (s.r9fx) { s.r9fx.row = null; s.r9fx.flash = 0; s.r9fx.light = 0; s.r9fx.cloud = 0; } s.camFocus = null; s.player.locked = false; s.startWarp({ map, x, y, facing: 'up' }, 'door'); }, [map, x, y, fl]);
        await sleep(2300);
        const on = await page.evaluate(() => kilumen.scene.map.name); if (on !== map) errors.push(`${tag} on ${on}`);
        if (act === 'courier') { await page.evaluate(() => kilumen.region9.tick()); await sleep(900); for (let i = 0; i < 4; i++) { await page.keyboard.press('f'); await sleep(350); } }
        else if (act === 'credits2') { await page.evaluate(() => import('./src/ui/credits.js?v=v0.2.98-alpha').then((m) => { m.runCredits(kilumen.scene, {}, { variant: 'ending2' }); })); await sleep(3500); }
        else if (act?.startsWith('talk:')) { await page.evaluate(() => { kilumen.scene.player.facing = 'up'; }); await page.keyboard.press('f'); await sleep(1200); }
        else if (act === 'battle') { await page.evaluate(() => { kilumen.scene.player.facing = 'up'; }); await page.keyboard.press('f'); await sleep(700); for (let i = 0; i < 6; i++) { await page.keyboard.press('f'); await sleep(450); } await sleep(1500); }
        else if (act?.startsWith('summit:')) { const t = +act.slice(7); await page.evaluate(() => { const s = kilumen.scene; s.flags.delete?.('fin_summit_seen'); s.script(() => s.region9.SPOTS.fin_dome()); }); const t0 = Date.now(); while (Date.now() - t0 < t) { await sleep(400); if (Date.now() - t0 > 1500) await page.keyboard.press('f'); } }
        else if (act?.startsWith('fx:')) { const o = JSON.parse(act.slice(3)); await page.evaluate(async (o) => { const s = kilumen.scene, fx = s.r9fx;
            if (o.wide) { s.opts.zoom = 1; window.dispatchEvent(new Event('resize')); }
            Object.assign(fx, { cloud: o.cloud || 0, light: o.light || 0, flash: o.flash || 0, flashCol: '200,160,255', row: o.row ?? null });
            if (o.focus) s.camFocus = fx.centre(); if (o.say) s.script(() => s.say(s.region9.text(o.say), { name: null })); }, o); await sleep(1300); }
        else if (act === 'slip') { await page.evaluate(() => { const s = kilumen.scene, fx = s.r9fx; fx.row = 2; fx.light = 1; fx.flashCol = '190,140,255'; fx.flash = 0.55; s.script(() => s.say(s.region9.text('fin.timeslip'), { name: null })); }); await sleep(1200); }
        else if (act?.startsWith('say:')) { await page.evaluate((k) => { const s = kilumen.scene; s.script(() => s.say(s.region9.text(k), { name: null })); }, act.slice(4)); await sleep(1200); }
        else if (act?.startsWith('js:')) { const [, ms, k, ...rest] = act.split(':'); await page.evaluate((code) => new Function('s', `return (async () => { ${code} })()`)(kilumen.scene), rest.join(':')); await sleep(+ms); for (let i = 0; i < +k; i++) { await page.keyboard.press('f'); await sleep(900); } }
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
fs.writeFileSync(path.join(OUT, ONLY ? 'report_partial.json' : 'report.json'), JSON.stringify(report, null, 1));
