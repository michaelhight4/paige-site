// Home start + opening v1 shots (Oct 23, 2026; DEV): play the new-game opening at PC 1920x1080 and phone 844x390.
// Dialogue advances with real input: Enter on PC, taps on the dialogue box / choice rows on phone. Map hops between
// steps and the two test-run catches are dev shortcuts (startWarp / systems.party.add + kilindex.markCaught).
// Usage: node tests/home_start_shots.mjs  -> shots/home_start_v1/*.png + report.json (contact sheet: tools step after)
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'shots/home_start_v1');
fs.mkdirSync(OUT, { recursive: true });
const PORT = await new Promise((res) => { const sv = net.createServer(); sv.listen(0, '127.0.0.1', () => { const p = sv.address().port; sv.close(() => res(p)); }); });
const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
const base = `http://127.0.0.1:${PORT}/index.html`;
for (let i = 0; i < 50; i++) { try { if ((await fetch(base)).ok) break; } catch {} await new Promise((r) => setTimeout(r, 100)); }

const VIEWS = [
  { plat: 'pc', w: 1920, h: 1080, dpr: 1, touch: false },
  { plat: 'phone', w: 844, h: 390, dpr: 2, touch: true },
];
const browser = await chromium.launch({ args: ['--disable-dev-shm-usage'] });
const report = [];
try {
  for (const v of VIEWS) {
    const ctx = await browser.newContext({ viewport: { width: v.w, height: v.h }, deviceScaleFactor: v.dpr, hasTouch: v.touch, isMobile: v.touch });
    const page = await ctx.newPage();
    const errors = []; page.on('pageerror', (e) => errors.push(String(e)));
    let n = 0;
    const S = (fn, arg) => page.evaluate(fn, arg);
    const shot = async (label) => {
      const file = `${String(++n).padStart(2, '0')}_${v.plat}_${v.w}x${v.h}_${label}.png`;
      await page.screenshot({ path: path.join(OUT, file) });
      const st = await S(() => { const s = window.kilumen.scene; return { map: s.map.name, x: s.player.x, y: s.player.y, objective: s.intro?.objective?.() ?? null, flags: [...s.flags].filter((f) => /intro|ron_morning|promoted|starter|test_run|job_/.test(f)), dialog: s.dialog?.active ? [...document.querySelectorAll('.dlg-name,.dlg-text')].map((e) => e.textContent).join(' | ') : null }; });
      report.push({ view: v.plat, file, ...st }); console.log(file, JSON.stringify(st));
    };
    const idle = () => page.waitForFunction(() => { const s = window.kilumen.scene; return !s.busy && !s.fade && !s.dialog?.active; }, null, { timeout: 20000 })
      .catch(async (e) => { console.log('IDLE TIMEOUT', JSON.stringify(await S(() => { const s = window.kilumen.scene; return { map: s.map.name, busy: s.busy, fade: !!s.fade, dlg: s.dialog?.active, picker: s.intro?.picker?.active, text: document.querySelector('.dlg-text')?.textContent, log: s.log.slice(-6) }; }))); throw e; });
    const dlg = () => page.waitForFunction(() => window.kilumen.scene.dialog?.active, null, { timeout: 20000 }).then(() => page.waitForTimeout(1100));
    const pageText = () => S(() => document.querySelector('.dlg-text')?.textContent || '');
    const press = async () => { if (v.touch) await page.tap('.dlg-box').catch(() => {}); else await page.keyboard.press('Enter'); await page.waitForTimeout(v.touch ? 350 : 250); };
    /** Advance until `re` is on screen (then wait for it to type out); returns false when the dialog closes first. */
    const until = async (re) => {
      for (let i = 0; i < 40; i++) {
        if (!(await S(() => window.kilumen.scene.dialog?.active))) return false;
        if (re.test(await pageText())) { await page.waitForTimeout(1300); return true; }
        await press();
      }
      return false;
    };
    const finish = async () => { for (let i = 0; i < 40 && (await S(() => window.kilumen.scene.dialog?.active)); i++) await press(); await idle(); };
    const choose = async (k) => { if (v.touch) await page.tap(`.dlg-box li[data-i="${k}"]`); else { for (let i = 0; i < k; i++) await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter'); } await page.waitForTimeout(400); };
    const warpTo = async (spawn) => { await S((sp) => window.kilumen.scene.startWarp(sp, 'door'), spawn); await page.waitForTimeout(200); await idle(); await page.waitForTimeout(500); };
    const warpBy = (to) => S((to) => { const w = window.kilumen.scene.map.warps.find((x) => x.to === to); return { map: w.to, x: w.tx, y: w.ty, facing: w.facing || 'down' }; }, to);
    /** a real key press held for a few frames (the game samples keys per 60 Hz tick) */
    const key = async (k) => { await page.keyboard.down(k); await page.waitForTimeout(90); await page.keyboard.up(k); };
    const place = (x, y, facing) => S(([x, y, f]) => { const s = window.kilumen.scene; s.player.place(x, y, f); }, [x, y, facing]);

    // 1) new game: black hold -> fade in -> wake-up thought
    await page.goto(`${base}?save=0&audio=0&online=0&hour=8&timescale=0`);
    await page.waitForFunction(() => window.kilumen && window.kilumen.scene && window.kilumen.scene.tileset, null, { timeout: 20000 });
    await shot('01_new_game_hold_or_fade');
    await dlg(); await shot('02_wake_thought');
    await until(/smell toast/); await shot('03_wake_thought_p3');
    await finish(); await shot('04_bedroom_free');

    // 2) downstairs; the front door turns you back before Ron's briefing
    await warpTo(await warpBy('house_1f'));
    await shot('05_downstairs');
    const door = await S(() => window.kilumen.scene.map.warps.find((w) => w.to === 'brookhollow'));
    await place(door.x, door.y - 1, 'down');
    await S(() => { const s = window.kilumen.scene; s.player._attempt('down', s.worldApi(), []); });
    await dlg(); await shot('06_door_blocked_thought');
    await finish(); await shot('07_turned_back');

    // 3) Ron's briefing
    const ron = await S(() => { const s = window.kilumen.scene, o = s.npcs?.list?.find?.((n) => n.def?.id === 'ron') || null; const d = s.map.npcs.find((n) => n.id === 'ron'); return { x: o?.x ?? d.x, y: o?.y ?? d.y }; });
    await S(([x, y]) => { const s = window.kilumen.scene, sides = [[0, 1, 'up'], [-1, 0, 'right'], [1, 0, 'left'], [0, -1, 'down']]; for (const [dx, dy, f] of sides) { const c = s.map.code(x + dx, y + dy); if (c === 0 || c === undefined) { s.player.place(x + dx, y + dy, f); return; } } s.player.place(x, y + 1, 'up'); }, [ron.x, ron.y]);
    await S(() => { const s = window.kilumen.scene; s.interact(); if (!s.busy) s.talk(null, s.map.npcs.find((n) => n.id === 'ron')); });
    await dlg(); await shot('08_ron_briefing');
    await until(/boss wants to see us/); await shot('09_ron_briefing_p3');
    await finish(); await page.waitForTimeout(300); await shot('10_objective_office');

    // 4) door now open -> outside
    await place(door.x, door.y - 1, 'down');
    await S(() => { const s = window.kilumen.scene; s.player._attempt('down', s.worldApi(), []); });
    await page.waitForTimeout(400); await idle(); await page.waitForTimeout(600); await shot('11_outside_door_open');

    // 4b) Ron catch: no creature yet, so every Brookhollow exit sends Ron running after you (found by `to`, padding-safe)
    const catchAt = async (to, label) => {
      const how = await S((to) => { const s = window.kilumen.scene, m = s.map, e = m.exits.find((x) => x.to === to);
        const cells = []; for (let k = e.start; k <= e.end; k++) cells.push(e.edge === 'north' ? [k, 0] : e.edge === 'south' ? [k, m.height - 1] : e.edge === 'west' ? [0, k] : [m.width - 1, k]);
        const [x, y] = cells.find(([x, y]) => m.code(x, y) === 0) || cells[0];
        const out = { north: 'up', south: 'down', east: 'right', west: 'left' }[e.edge];
        s.player.place(x, y, out); s.player._attempt(out, s.worldApi(), []); return { x, y, edge: e.edge }; }, to);
      await page.waitForFunction(() => window.kilumen.scene.npcs.list.some((n) => n.def?.id === 'ron_catch'), null, { timeout: 5000 });
      await page.waitForTimeout(350); await shot(`${label}_ron_runs_up`);
      await dlg(); await shot(`${label}_ron_too_dangerous`);
      await finish(); await page.waitForTimeout(250);
      const back = await S(() => { const s = window.kilumen.scene; return { x: s.player.x, y: s.player.y, map: s.map.name, ron: s.npcs.list.some((n) => n.def?.id === 'ron_catch') }; });
      await shot(`${label}_walked_back`);
      console.log('ron catch', to, how, '->', back);
      await page.waitForFunction(() => !window.kilumen.scene.npcs.list.some((n) => n.def?.id === 'ron_catch'), null, { timeout: 8000 }).catch(() => console.log('ron_catch still on map'));
    };
    await catchAt('route1', '11b_north_exit');
    await catchAt('route_east', '11c_east_exit');

    // 5) office: manager -> scene_promotion -> fade to the lab
    await warpTo(await warpBy('office_int'));
    const mgr = await S(() => window.kilumen.scene.map.npcs.find((n) => n.id === 'manager'));
    await S(([x, y]) => { const s = window.kilumen.scene; s.player.place(x, y + 1, 'up'); s.interact(); if (!s.busy) s.talk(null, s.map.npcs.find((n) => n.id === 'manager')); }, [mgr.x, mgr.y]);
    await dlg(); await shot('12_promotion_manager');
    await until(/desks on Friday/); await shot('13_promotion_ron');
    await until(/Come on/); await shot('14_promotion_come_on');
    // promotion ends -> fade into the lab -> the starter intro starts by itself (page 1 = no arrows yet)
    for (let i = 0; i < 120; i++) {
      const st = await S(() => ({ a: !!window.kilumen.scene.dialog?.active, map: window.kilumen.scene.map.name, t: document.querySelector('.dlg-text')?.textContent || '' }));
      if (st.a && st.map === 'lab_brookhollow') break;
      if (st.a) await press(); else await page.waitForTimeout(100);
    }

    // 6) lab: scene_starter_intro auto-plays (4 pages); the golden arrows switch on at page 2
    await page.waitForTimeout(1300); await shot('15_starter_intro_p1_no_arrows');
    await until(/spinning/); await shot('16_starter_intro_p2_arrows_on');
    await finish(); await page.waitForTimeout(400); await shot('17_lab_free_arrows');
    // phone frame cost: rAF intervals + markers draw time, arrows on vs off
    const perf = await S(async () => {
      const s = window.kilumen.scene, keep = s._markerDraw;
      const run = (ms) => new Promise((res) => { const d = []; let t0 = performance.now(), last = t0; const f = (t) => { d.push(t - last); last = t; if (t - t0 < ms) requestAnimationFrame(f); else res(d); }; requestAnimationFrame(f); });
      const stat = (d) => { d = d.slice(2).sort((a, b) => a - b); return { avg: +(d.reduce((a, b) => a + b, 0) / d.length).toFixed(2), p95: +d[Math.floor(d.length * 0.95)].toFixed(2) }; };
      let drawMs = 0, draws = 0; s._markerDraw = function () { const f = keep.call(this); return f && ((ctx, v) => { const t = performance.now(); f(ctx, v); drawMs += performance.now() - t; draws++; }); };
      const on = stat(await run(2000)); const per = draws ? +(drawMs / draws).toFixed(3) : null;
      s._markerDraw = () => null; const off = stat(await run(2000)); s._markerDraw = keep;
      return { arrowsOn: on, arrowsOff: off, markerDrawMsPerFrame: per, drawn: s.markersDrawn ?? null };
    });
    console.log('frame cost', v.plat, JSON.stringify(perf)); report.push({ view: v.plat, perf });

    // 7) cradle -> starter preview panel: each starter highlighted, then confirm
    const cr = await S(() => window.kilumen.scene.map.json.text_pending.interact_spots.find((c) => c.id === 'cradle_1'));
    await S(([x, y]) => { const s = window.kilumen.scene; s.player.place(x, y, 'up'); s.interact(); }, cr.stand);
    await page.waitForFunction(() => window.kilumen.scene.intro?.picker?.active, null, { timeout: 8000 }); await page.waitForTimeout(700);
    const names = [];
    for (let k = 0; k < 3; k++) {
      if (k) { if (v.touch) await page.tap(`.sp-tab[data-i="${k}"]`); else await key('ArrowRight'); await page.waitForTimeout(700); }
      const nm = await S(() => document.querySelector('.sp-name')?.textContent); names.push(nm);
      await shot(`18${'abc'[k]}_picker_${String(nm).toLowerCase()}`);
    }
    // overlap check: nothing on top of the panel (centre + corners)
    const cover = await S(() => { const p = document.querySelector('.sp-panel'), r = p.getBoundingClientRect(), pts = [[r.left + 6, r.top + 6], [r.right - 6, r.top + 6], [r.left + 6, r.bottom - 6], [r.right - 6, r.bottom - 6], [(r.left + r.right) / 2, (r.top + r.bottom) / 2]];
      return { rect: [r.left, r.top, r.width, r.height].map(Math.round), covered: pts.filter(([x, y]) => { const e = document.elementFromPoint(x, y); return !e || !p.contains(e); }).length, inView: r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight }; });
    let axe = null;
    try { await page.addScriptTag({ path: '/tmp/axe/node_modules/axe-core/axe.min.js' }); axe = await S(async () => { const r = await window.axe.run('.sp-panel'); return { violations: r.violations.map((x) => ({ id: x.id, impact: x.impact, n: x.nodes.length })), passes: r.passes.length }; }); } catch (e) { axe = { error: String(e) }; }
    console.log('picker', v.plat, JSON.stringify({ names, cover, axe })); report.push({ view: v.plat, picker: { names, cover, axe } });
    // back to the second case and confirm (phone: tap it twice; PC: Left + Enter)
    if (v.touch) { await page.tap('.sp-tab[data-i="1"]'); await page.waitForTimeout(400); await page.tap('.sp-tab[data-i="1"]'); }
    else { await key('ArrowLeft'); await page.waitForTimeout(400); await key('Enter'); }
    await dlg(); await page.waitForTimeout(400); await shot('19_starter_confirm');
    await choose(0);
    await dlg(); await shot('20_starter_after');
    await until(/test run/); await shot('20b_test_run_brief');
    await until(/dominance crystals|crystals/i); await shot('20c_crystals');
    await finish(); await page.waitForTimeout(300); await shot('21_objective_test_run_no_arrows');

    // 7) leave block (route_east from town), then route1 + two dev catches
    await warpTo(await warpBy('brookhollow'));
    const edgeInfo = await S(() => { const s = window.kilumen.scene, e = s.map.exits.find((x) => x.to === 'route_east');
      if (e && s.map.isWalkable(s.map.width - 1, e.start)) { s.player.place(s.map.width - 1, e.start, 'right'); s.player._attempt('right', s.worldApi(), []); return 'real edge step'; }
      s.intro.onEdge({ to: 'route_east' }); return 'direct hook: ' + JSON.stringify(s.map.exits); });
    console.log('leave block via', edgeInfo);
    await dlg(); await shot('22_leave_block_thought');
    await finish();
    await S(() => { const s = window.kilumen.scene, e = s.map.exits.find((x) => x.to === 'route1');
      if (e && s.map.isWalkable(e.start, 0)) { s.player.place(e.start, 0, 'up'); s.player._attempt('up', s.worldApi(), []); } else s.startWarp({ map: 'route1', x: 20, y: 30, facing: 'up' }, 'door'); });
    await page.waitForTimeout(200); await idle(); await page.waitForTimeout(500);
    const caught = async (sp) => S(async (sp) => { const s = window.kilumen.scene, { createCreature } = await import('./src/systems/creature.js'); s.systems.party.add(createCreature({ species: sp, level: 3, origin: { how: 'caught', map: s.map.name } })); s.systems.kilindex?.markCaught(sp, { zone: s.map.name }); }, sp);
    await caught('sailquill'); await page.waitForTimeout(500); await shot('23_route1_logged_1of2');
    await caught('gloamtick'); await dlg(); await shot('24_test_run_done_thought');
    await finish(); await page.waitForTimeout(300); await shot('25_objective_return');

    // 8) back in the lab: return + job briefing -> free roam
    const labIn = await S(async () => { const s = window.kilumen.scene; return s.intro.labSpawn(); });
    await S((sp) => window.kilumen.scene.startWarp(sp, 'door'), labIn); // the return scene starts on arrival
    await dlg(); await shot('26_return_scene');
    await until(/actual job|Raise your creatures/); await shot('27_job_briefing');
    await until(/paid on progress/); await shot('28_paid_on_progress');
    await finish(); await page.waitForTimeout(300); await shot('29_free_roam');

    // 9) quest-item marker example: The Missing Note is on (the DJ gave it) -> the Old Record on Fernwick has a marker, the DJ has none
    await page.goto(`${base}?save=0&skipintro=1&pg=quests&flags=q_sq_missing_note_on,flg_missing_note_started&audio=0&online=0&hour=21&timescale=0`);
    await page.waitForFunction(() => window.kilumen && window.kilumen.scene && window.kilumen.scene.tileset, null, { timeout: 20000 }); await idle();
    const rec = await S(async () => { const s = window.kilumen.scene, m = await s.loadMap('fernwick'); const it = (m.items || []).find((i) => /old_record/.test(i.id || i.item || '')); return it ? { x: it.x, y: it.y } : null; });
    if (rec) {
      await warpTo({ map: 'fernwick', x: rec.x, y: rec.y + 3, facing: 'up' });
      await page.waitForTimeout(600); const qm = await S(() => ({ spots: window.kilumen.scene.markerSpots(), drawn: window.kilumen.scene.markersDrawn }));
      console.log('quest marker', v.plat, JSON.stringify(qm)); report.push({ view: v.plat, questMarker: qm });
      await shot('30_quest_item_marker_fernwick');
    } else console.log('no old record item on fernwick');
    const dj = await S(async () => { const s = window.kilumen.scene, m = await s.loadMap('club_int'); const d = m.npcs.find((n) => n.id === 'rebel_dj'); const w = m.warps?.[0]; return d ? { x: d.x, y: d.y } : null; });
    if (dj) { await warpTo({ map: 'club_int', x: dj.x, y: dj.y + 2, facing: 'up' }); await page.waitForTimeout(600);
      const gm = await S(() => ({ spots: window.kilumen.scene.markerSpots() })); console.log('giver', v.plat, JSON.stringify(gm)); report.push({ view: v.plat, giver: gm });
      await shot('31_giver_dj_no_marker'); }
    console.log(v.plat, 'errors:', errors);
    report.push({ view: v.plat, errors });
    await ctx.close();
  }
} finally { await browser.close(); server.kill(); }
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 1));
