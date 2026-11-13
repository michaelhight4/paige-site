// rtb live-option playtest (Oct 29 2026) against the live tree (/workspace/ps_rtb served on PORT, paths /kilumen/).
// PC = keyboard, phone = CDP touch. Shots + clips -> shots/rtb_live/. Usage: PORT=8121 node tests/rtb_live_play.mjs [pc|phone]
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
const PORT = process.env.PORT || 8121, BASE = process.env.BASE || `http://127.0.0.1:${PORT}/kilumen/index.html`, V = process.env.V || 'v0.2.43-alpha';
const OUT = new URL('../shots/rtb_live/', import.meta.url).pathname + (process.env.SUB || '');
const profs = process.argv.slice(2).length ? process.argv.slice(2) : ['pc', 'phone'];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PROF = { pc: { viewport: { width: 1280, height: 720 } }, phone: { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } };
fs.mkdirSync(OUT, { recursive: true });
const report = {};
for (const prof of profs) {
  const R = report[prof] = { steps: [], errs: [], saveViolations: [] };
  const log = (k, v) => { R.steps.push({ k, ...v }); console.log(prof, k, JSON.stringify(v)); };
  const tmp = `/tmp/rtblive_${prof}`; fs.rmSync(tmp, { recursive: true, force: true });
  const b = await chromium.launch(); const ctx = await b.newContext({ ...PROF[prof], recordVideo: { dir: tmp, size: PROF[prof].viewport } });
  const page = await ctx.newPage(); page.on('pageerror', (e) => R.errs.push(String(e)));
  const shot = (n) => page.screenshot({ path: `${OUT}${prof}_${n}.png` });
  await page.addInitScript(() => { try { localStorage.setItem('kilumen_alpha_notice_seen.v1', '1'); } catch {} });
  await page.goto(BASE + (process.env.QS || '?encrate=1'));
  await page.waitForFunction(() => window.kilumen?.ui?.sdReady && window.kilumen.ui.wild?.ready, null, { timeout: 40000 });
  await sleep(3000);
  for (let i = 0; i < 60; i++) { const f = await page.evaluate(() => { const sc = window.kilumen.scene; return !sc.fade && !sc.busy && !sc.dialog?.active; }); if (f && i > 2) break; await page.keyboard.press('Enter'); await sleep(500); }
  await page.evaluate(async (V) => {
    const k = window.kilumen, sc = k.scene; await Promise.all([k.ui.sdReady, k.ui.wild.ready]);
    for (let i = 0; i < 100 && (sc.fade || sc.busy); i++) await new Promise((r) => setTimeout(r, 100));
    const { createCreature } = await import(`/kilumen/src/systems/creature.js?v=${V}`);
    sc.party = [createCreature({ species: 'cindrip', level: 5 }), createCreature({ species: 'nibbin', level: 5 })];
    sc.systems.bag.add('dominance_crystal', 6);
    // save monitor: any real write while a battle is up is a violation
    window.__saves = []; const SK = 'kilumen_alpha_save.v1'; const si = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, val) { if (String(key).startsWith(SK)) window.__saves.push({ battle: !!(k.ui.top?.name === 'battle' || k.ui.top?.id === 'battle' || document.querySelector('.rtb-hud') || document.querySelector('[data-rtb-mode]')), t: Date.now() }); return si.call(this, key, val); };
    sc.startWarp({ map: 'route1', x: 20, y: 24, facing: 'down' }, 'warp');
  }, V);
  await page.waitForFunction(() => window.kilumen.scene.map?.name === 'route1' && !window.kilumen.scene.fade, null, { timeout: 20000 });
  await page.evaluate(async () => { const sc = window.kilumen.scene; sc._placeFollower?.(); await sc._loadActorSprites?.(); });
  log('npcs', await page.evaluate(() => { const sc = window.kilumen.scene; const before = sc.npcs.list.length; sc.npcs.list.length = 0; return { before, after: sc.npcs.length, party: sc.party.map((c) => c.species + c.level) }; }));
  const cdp = prof === 'phone' ? await ctx.newCDPSession(page) : null;
  const center = async (sel) => { const l = page.locator(sel).first(); if (!(await l.count())) return null; const bb = await l.boundingBox(); return bb && { x: bb.x + bb.width / 2, y: bb.y + bb.height / 2, w: bb.width, h: bb.height }; };
  const pts = new Map();
  const touch = async (type, pt, id = 1) => {
    if (type === 'touchStart') { pts.set(id, { x: pt.x, y: pt.y, id }); await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [...pts.values()] }); }
    else { if (!pts.has(id)) return; pts.delete(id); await cdp.send('Input.dispatchTouchEvent', { type: pts.size ? 'touchMove' : 'touchEnd', touchPoints: [...pts.values()] }); }
  };
  const tap = async (sel, ms = 50) => { const c = await center(sel); if (!c) return false; await touch('touchStart', c, 7); await sleep(ms); await touch('touchEnd', c, 7); return true; };
  let heldDir = null;
  const hold = async (d) => {
    if (d === heldDir) return;
    if (heldDir) { if (cdp) await touch('touchEnd', { x: 0, y: 0 }); else await page.keyboard.up('Arrow' + heldDir[0].toUpperCase() + heldDir.slice(1)); }
    heldDir = d; if (!d) return;
    if (cdp) { const c = await center(`[data-dir="${d}"]`); if (c) await touch('touchStart', c); else heldDir = null; } else await page.keyboard.down('Arrow' + d[0].toUpperCase() + d.slice(1));
  };
  const st = () => page.evaluate(() => {
    const k = window.kilumen, a = k.rtb?.active, top = k.ui.top;
    const btn = document.querySelector('[data-rtb-mode]'); const bb = btn?.getBoundingClientRect();
    const kb = top?.kb || top?.battle || null;
    return { rt: !!a, turn: !!document.querySelector('.sd-battle, [data-screen="battle"], .battle-sd') || top?.name === 'battle', top: top?.name || top?.id || null,
      btn: btn ? { to: btn.dataset.rtbMode, w: Math.round(bb.width), h: Math.round(bb.height), label: btn.textContent.trim() } : null,
      foes: a ? a.sim.foes.map((f) => ({ sp: f.c.species, hp: f.c.hp, alive: f.alive, caught: !!f.caught })) : null, state: a?.sim.state,
      party: k.scene.party.map((c) => ({ sp: c.species, lv: c.level, hp: c.hp, xp: c.xp })), mode: localStorage.getItem('kilumen_alpha_rtb_mode'),
      flag: k.scene.flags.has('pref_rtb_realtime'), last: k.ui.lastBattle ? { outcome: k.ui.lastBattle.outcome, caught: k.ui.lastBattle.caught?.species || null, xp: k.ui.lastBattle.xp } : null,
      flash: !!document.querySelector('.rtb-flash'), saveLock: k.scene.saveLockReason() };
  });
  const press = async (key) => { if (!cdp) await page.keyboard.press(key); };
  const walkUntil = async (pred, ms = 20000) => {
    const t0 = Date.now(); let dirs = ['down', 'up'], i = 0;
    while (Date.now() - t0 < ms) { const s = await st(); if (await pred(s)) { await hold(null); return s; } await hold(dirs[(i++ >> 3) % 2]); await sleep(120); }
    await hold(null); return null;
  };
  const doSwitch = async () => { if (cdp) return tap('[data-rtb-mode]'); await page.keyboard.press('KeyR'); return true; };
  const waitFor = async (pred, ms = 8000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const s = await st(); if (pred(s)) return s; await sleep(60); } return null; };
  // real-time fighter: face / keep range / fire / dodge telegraphs / crystal when low
  const fight = async (ms, { crystal = false, stopIf = null } = {}) => {
    const t0 = Date.now(); let shots = 0, dodged = 0, tried = 0;
    while (Date.now() - t0 < ms) {
      const s = await page.evaluate(() => { const a = window.kilumen.rtb?.active; if (!a) return null; const { sim } = a, al = sim.ally, t = sim.target; return { ax: al.x, ay: al.y, tx: t?.x, ty: t?.y, thp: t ? t.c.hp / t.mhp : 1, tele: sim.foes.some((f) => f.tele), done: sim.done || sim.state !== 'fight', cap: !!sim.capture }; });
      if (!s || s.done) break; if (stopIf && (await stopIf(s))) break;
      if (s.tele && Math.random() < 0.6) { dodged++; if (cdp) await tap('[data-btn="b"]'); else await page.keyboard.press('KeyX'); }
      if (crystal && s.thp < 0.55 && !s.cap && tried < 4) { tried++; if (cdp) await tap('[data-rtb="crystal"]'); else await page.keyboard.press('KeyE'); await sleep(200); continue; }
      if (s.tx != null) {
        const dx = s.tx - s.ax, dy = s.ty - s.ay, dist = Math.hypot(dx, dy);
        let d = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
        if (dist < 110) d = Math.abs(dx) > Math.abs(dy) ? (dy > 0 ? 'up' : 'down') : (dx > 0 ? 'left' : 'right');
        await hold(dist > 200 || dist < 110 ? d : null);
        if (dist <= 260) { shots++; if (cdp) await tap('[data-btn="a"]'); else await page.keyboard.press(shots % 5 === 0 ? 'Digit2' : 'KeyZ'); }
      }
      await sleep(140);
    }
    await hold(null); return { shots, dodged, tried };
  };
  const turnA = async (n = 1) => { for (let i = 0; i < n; i++) { if (cdp) await tap('[data-btn="a"]'); else await page.keyboard.press('KeyZ'); await sleep(450); } };
  const endBattle = async () => waitFor((s) => !s.rt && !s.btn && !s.turn && s.saveLock == null, 30000);

  let s; await sleep(800); await shot('01_trail');
  if (process.env.KILL) { await page.evaluate(() => localStorage.setItem('kilumen_alpha_rtb_mode', 'rt')); s = await walkUntil((s) => s.turn || s.rt); await sleep(1500); s = await st(); log('KILL', { rt: s.rt, turn: s.turn, btn: s.btn, mode: s.mode, url: page.url() }); await shot('kill_battle'); await b.close(); continue; }
  if (process.env.ONLYC) { await page.evaluate(() => { localStorage.setItem('kilumen_alpha_rtb_mode', 'rt'); }); }
  if (!process.env.ONLYC) {
  // ---- A: default (turn) start, button at start -> real-time
  s = await walkUntil((s) => s.turn || s.rt);
  log('A_start', { mode: s?.rt ? 'rt' : 'turn', btn: s?.btn, saveLock: s?.saveLock });
  await sleep(500); await shot('02_turn_start_button');
  await doSwitch();
  await sleep(150); const sf = await st(); await shot('03_flash_to_rt'); log('A_flash', { flash: sf.flash });
  s = await waitFor((s) => s.rt && s.state === 'fight'); await sleep(300); await shot('04_rt_carried_reaction');
  log('A_rt', { foes: s?.foes, btn: s?.btn, mode: s?.mode, flag: s?.flag, saveLock: s?.saveLock });
  // ---- fight a little, dodge, then switch mid-fight -> turn
  const f1 = await fight(6000, { stopIf: (x) => x.thp < 0.75 }); log('A_fight1', f1);
  await shot('05_rt_fight');
  const before = (await st()).foes;
  await doSwitch();
  s = await waitFor((s) => !s.rt && s.btn?.to === 'rt', 6000); await sleep(1200);
  const turnFoe = await page.evaluate(() => { const t = window.kilumen.ui.top, kb = t?.kb; const c = kb?.p2?.creature || []; return c.map((x) => ({ sp: x.species?.id, hp: x.hp })); });
  log('A_mid_to_turn', { rtFoesBefore: before, turnFoes: turnFoe, btn: s?.btn, mode: s?.mode, saveLock: s?.saveLock });
  await shot('06_turn_after_switch');
  await turnA(2); await sleep(600); await shot('07_turn_move');
  // ---- back to real-time mid-fight, then finish with a catch try
  await sleep(300); await doSwitch(); s = await waitFor((s) => s.rt && s.state === 'fight', 10000);
  log('A_back_to_rt', { ok: !!s, foes: s?.foes });
  const f2 = await fight(50000, { crystal: true }); log('A_fight2', f2);
  await sleep(500); await shot('08_rt_result');
  s = await endBattle(); log('A_end_raw', { type: typeof s, keys: s && Object.keys(s).length }); await sleep(500); await shot('09_back_on_map');
  log('A_end', { last: s?.last, party: s?.party, mode: s?.mode, flag: s?.flag });
  // ---- B: remembered real-time start -> flee (hold Leave)
  await waitFor((s) => !s.turn && !s.rt && s.saveLock == null, 15000); for (let i = 0; i < 3; i++) { const x = await st(); if (x.top) { await turnA(1); } }
  s = await walkUntil((s) => s.rt || (s.turn && s.btn), 30000);
  log('B_start', { mode: s?.rt ? 'rt' : 'turn', foes: s?.foes });
  await sleep(900); await shot('10_rt_remembered');
  if (cdp) { const c = await center('[data-rtb="leave"]'); await touch('touchStart', c, 8); await sleep(1500); await touch('touchEnd', c, 8); } else { await page.keyboard.down('Escape'); await sleep(1500); await page.keyboard.up('Escape'); }
  s = await endBattle(); log('B_flee', { last: s?.last });
  }
  // ---- C: two at once (packs are 25 %): re-roll until two foes; switch the pack to turn and back; ally KO
  let two = null;
  for (let i = 0; i < 10 && !two; i++) {
    s = await walkUntil((s) => s.rt && s.state === 'fight', 30000); if (!s) break;
    if (s.foes.length > 1) { two = s; break; }
    if (cdp) { const c = await center('[data-rtb="leave"]'); await touch('touchStart', c, 8); await sleep(1500); await touch('touchEnd', c, 8); } else { await page.keyboard.down('Escape'); await sleep(1500); await page.keyboard.up('Escape'); }
    await endBattle();
  }
  log('C_two', { found: !!two, foes: two?.foes });
  if (two) {
    await sleep(700); await shot('11_two_at_once');
    await fight(1200, { stopIf: (x) => x.thp < 0.8 }); log('C_pre_switch', { s: await st() });
    await doSwitch(); s = await waitFor((s) => !s.rt && s.btn?.to === 'rt', 6000); await sleep(1500); await shot('12_two_turn');
    const tf = await page.evaluate(() => (window.kilumen.ui.top?.kb?.p2?.creature || []).map((x) => ({ sp: x.species?.id, hp: x.hp })));
    log('C_two_turn', { turnFoes: tf });
    await doSwitch(); s = await waitFor((s) => s.rt && s.state === 'fight', 10000);
    log('C_back_rt', { ok: !!s, now: await st() }); await shot('12b_two_back_rt');
    if (!s) { await turnA(1); await doSwitch(); s = await waitFor((s) => s.rt && s.state === 'fight', 10000); log('C_back_rt2', { ok: !!s, now: await st() }); }
    // ally KO: lead nearly out, let the pack hit it (auto swap to the next creature)
    await page.evaluate(() => { const a = window.kilumen.rtb.active; a.sim.ally.c.hp = 1; });
    const t0 = Date.now(); let ko = null; while (Date.now() - t0 < 15000) { ko = await page.evaluate(() => { const a = window.kilumen.rtb?.active; return a ? { lead: a.sim.ally.c.species, hp: a.sim.ally.c.hp, state: a.sim.state } : null; }); if (!ko || ko.lead !== 'cindrip') break; await sleep(150); }
    await sleep(400); await shot('13_ally_ko_swap'); log('C_ko', { ko });
    const f3 = await fight(50000, { crystal: false }); log('C_fight', f3);
    s = await endBattle(); await sleep(400); await shot('14_two_end'); log('C_end', { last: s?.last, party: s?.party });
  }
  // ---- D: trainer battle screen never shows the switch
  const tr = await page.evaluate(async () => { const ui = window.kilumen.ui; ui.closeAll(); ui.open('battle', { trainer: true, who: 'Test' }); await new Promise((r) => setTimeout(r, 1200)); const has = !!document.querySelector('[data-rtb-mode]'); ui.closeAll(); return has; });
  log('D_trainer_button', { shown: tr });
  R.saveViolations = await page.evaluate(() => window.__saves.filter((x) => x.battle));
  R.saveWrites = await page.evaluate(() => window.__saves.length);
  const vid = await page.video().path(); await ctx.close(); await b.close();
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', vid, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '24', `${OUT}rtb_live_${prof}.mp4`]);
  console.log(prof, 'errs', R.errs, 'saveViolations', R.saveViolations.length, 'writes', R.saveWrites);
}
fs.writeFileSync(`${OUT}report.json`, JSON.stringify(report, null, 2));
