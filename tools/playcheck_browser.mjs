// Cut A browser play-check (Oct 23, 2026, coder): new game -> opening -> starter -> test run catch -> Route 1 trainers
// -> Ron -> Fernwick hall helpers -> Master 1 -> WIP notice, with real input (keys / taps) and NO stat boosts.
// Usage: PORT=8765 PROFILE=pc|phone STARTER=0|1|2 node tools/playcheck_browser.mjs  (needs a static server on PORT)
// Shots go to shots/playcheck_master1/<profile>/. Navigation uses BFS over the live map's walk query (the dev
// equivalent of a player who knows the way); nothing is teleported.
import { chromium } from '/tmp/kil_audit2/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const PORT = process.env.PORT || 8765, PROFILE = process.env.PROFILE || 'pc', STARTER = Number(process.env.STARTER || 0);
const OUT = `shots/playcheck_master1/${PROFILE}`; fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const T0 = Date.now(); const log = (...a) => console.log(`[${PROFILE} ${((Date.now() - T0) / 1000).toFixed(0)}s]`, ...a);
const browser = await chromium.launch();
const ctx = await browser.newContext(PROFILE === 'phone'
  ? { viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
  : { viewport: { width: 1280, height: 720 } });
const page = await ctx.newPage();
const errs = []; page.on('console', (m) => m.type() === 'error' && errs.push(m.text())); page.on('pageerror', (e) => errs.push(String(e)));
const QS = `?save=0&hour=12&clouds=0&audio=0&title=0${PROFILE === 'phone' ? '&touch=1' : '&touch=0'}`;
await page.goto(`http://127.0.0.1:${PORT}/index.html${QS}`);
await page.waitForFunction(() => window.kilumen?.ui?.sdReady && window.kilumen.scene?.systems && window.kilumen.ui.wild?.ready, null, { timeout: 60000 });
await page.evaluate(() => Promise.all([window.kilumen.ui.sdReady, window.kilumen.ui.wild.ready]));
await sleep(1500);
let shotN = 0; const shots = [];
async function shot(name) { const f = `${OUT}/${String(++shotN).padStart(2, '0')}_${name}.png`; await page.screenshot({ path: f }); shots.push(f); log('shot', f); }
// Area name sign watcher (Gary 10:33 AM CT): each time the scene shows a sign, shoot it once it has slid in and record
// its box against the top-right HUD pills and the phone D-pad (no overlap allowed).
const signs = []; let signSeen = 0, signBusy = false;
const signTimer = setInterval(async () => {
  if (signBusy) return; signBusy = true;
  try {
    const n = await page.evaluate(() => window.kilumen.scene.areaSignCount || 0);
    if (n > signSeen) {
      signSeen = n; await sleep(650);
      const g = await page.evaluate(() => {
        const r = (el) => { if (!el || el.offsetParent === null && getComputedStyle(el).position !== 'fixed') return null; const b = el.getBoundingClientRect(); return b.width ? { l: b.left, t: b.top, r: b.right, b: b.bottom } : null; };
        const sc = window.kilumen.scene, ban = document.querySelector('.hud-banner');
        return { map: sc.map.name, title: sc.areaSign?.title, shown: ban?.classList.contains('show'), text: ban?.textContent, banner: r(ban), top: r(document.querySelector('.hud-top')), dpad: r(document.querySelector('#touchpad .dpad')) };
      });
      const hit = (a, b) => !!(a && b && a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b);
      g.overlapTop = hit(g.banner, g.top); g.overlapDpad = hit(g.banner, g.dpad);
      signs.push(g); log('area sign', JSON.stringify(g));
      if (signs.filter((x) => x.map === g.map).length === 1) await shot(`area_${g.map}`);
      const t0 = Date.now(); while (Date.now() - t0 < 4000) { await sleep(250); if (!(await page.evaluate(() => document.querySelector('.hud-banner')?.classList.contains('show')))) { g.hiddenAfterMs = Date.now() - t0 + 650; break; } }
    }
  } catch { /* page busy */ } finally { signBusy = false; }
}, 200);
const S = () => page.evaluate(() => {
  const sc = window.kilumen.scene, ui = window.kilumen.ui, msg = document.querySelector('#b-msg'), cmds = document.querySelector('#b-cmds');
  const modal = document.querySelector('.ui-modal [data-m="0"]');
  return { map: sc.map?.name, x: sc.player.x, y: sc.player.y, moving: sc.player.moving, fade: !!sc.fade, busy: !!sc.busy,
    dlg: !!sc.dialog?.active, dlgText: sc.dialog?.active ? (sc.dialog.box?.textContent || sc.dialog.text?.textContent || '') : '',
    choices: sc.dialog?.active ? [...document.querySelectorAll('.dlg-choice, .dialog-choice, [data-choice]')].map((e) => e.textContent) : [],
    modal: !!modal && modal.offsetParent !== null, top: ui.top?.name || ui.top?.id || (ui.top ? 'screen' : null),
    battle: (() => { const b = document.querySelector('.ui-battle'); return !!b && (b.checkVisibility ? b.checkVisibility() : true) && !sc.dialog?.active; })(), // a closing battle under the blackout dialog is not a battle
    more: !!msg?.querySelector('.more') && (msg.checkVisibility ? msg.checkVisibility() : true), msg: msg?.textContent || '',
    cmds: cmds && !cmds.hidden ? [...cmds.querySelectorAll('.b-cmd')].map((e) => e.textContent) : null,
    party: (sc.party || []).map((c) => `${c.species}:L${c.level}:hp${c.hp}/${c.maxHp ?? c.stats?.hp ?? '?'}`),
    flags: [...sc.flags] };
});

// ---------------------------------------------------------------- input
const PHONE = PROFILE === 'phone';
const texts = []; let battlesDone = 0;
async function tap(sel) { // battle UI re-renders under the finger: retry a detached/unstable target a few times
  for (let k = 0; ; k++) {
    try { const el = page.locator(sel).first(); await el.waitFor({ state: 'visible', timeout: sel === '#b-msg' ? 3000 : 15000 }); if (PHONE) await el.tap({ timeout: 5000 }); else await el.click({ timeout: 5000 }); return; }
    catch (e) { if (k >= 4) { if (sel === '#b-msg') return; throw e; } await sleep(300); } // #b-msg can vanish as the battle closes: the caller re-reads state
  }
}
async function confirm() { // A: Enter on PC, a tap on the dialog box on the phone
  if (PHONE && await page.locator('.dlg-box').first().isVisible().catch(() => false)) { await page.locator('.dlg-box').first().tap().catch(() => {}); }
  else await page.keyboard.press('Enter');
}
let skillLog = null;
async function battle(mode = 'fight') {
  let threw = 0, turns = 0;
  for (let n = 0; n < 1500; n++) {
    const s = await S();
    if (!s.battle) return { threw, turns };
    if (await page.locator('.dlg-box').first().isVisible().catch(() => false)) return { threw, turns }; // overworld dialog (blackout) is up: the battle is over
    if (s.modal) { await tap('.ui-modal [data-m="0"]'); await sleep(200); continue; }
    if (s.more) { texts.push('B: ' + s.msg); await tap('#b-msg'); await sleep(120); continue; }
    if (s.cmds) {
      if (s.cmds.length === 4 && /Skills/.test(s.cmds[0])) {
        const low = await page.evaluate(() => { const kb = window.kilumen.ui.currentBattle, me = kb?.p1?.active?.[0]; return me ? me.hp / me.maxhp < 0.4 : false; });
        if (mode === 'catch' && !low) { // a player at low HP fights instead of throwing
          await tap('#b-cmds .b-cmd[data-i="1"]'); await sleep(300); const s2 = await S();
          const i = (s2.cmds || []).findIndex((t) => /Crystal/.test(t) && !/Prime/.test(t));
          if (i >= 0) { threw++; await tap(`#b-cmds .b-cmd[data-i="${i}"]`); turns++; await sleep(300); continue; }
          log('no crystal in pack', JSON.stringify(s2.cmds)); await page.keyboard.press('Escape'); await sleep(200);
        }
        await tap('#b-cmds .b-cmd[data-i="0"]'); await sleep(250);
      }
      const s3 = await S();
      if (s3.cmds) {
        if (!skillLog) { skillLog = s3.cmds; log('skills', JSON.stringify(s3.cmds)); }
        // policy: the strongest-looking usable skill (power shown on the button when present, else the first usable)
        const i = await page.evaluate(async () => { // same policy as tools/playcheck_master1.mjs: power x chart x affinity x accuracy
          const kb = window.kilumen.ui.currentBattle; if (!kb) return 0;
          const { DRAFT_CHART } = await import('/src/battle/data/elements.js'); const { KILUMEN_RULES: R } = await import('/src/battle/data/rules.js');
          const eff = (type, defT) => defT.reduce((m, d) => { const row = DRAFT_CHART[type.toLowerCase()] || {}; return m * (row.strong?.includes(d) ? R.strong ?? 1.5 : row.weak?.includes(d) ? R.weak ?? 0.6 : 1); }, 1);
          const req = kb.request(), me = kb.p1.active[0], foe = kb.p2.active[0];
          if (req?.state === 'switch') return Math.max(1, (req.team || []).findIndex((c, n) => n > 0 && !c.fainted)); // forced 'Who goes in next?': first creature still standing
          if (!req?.moves) return 0;
          const myT = me.getTypes().map((t) => t.toLowerCase()), foeT = foe.getTypes().map((t) => t.toLowerCase());
          let pick = 0, score = -1;
          req.moves.forEach((m, k) => { if (m.disabled) return; const mv = kb.battle.dex.moves.get(m.id);
            let sc = (mv.basePower || 0) * eff(mv.type, foeT) * (myT.includes(mv.type.toLowerCase()) ? 1.3 : 1) * ((mv.accuracy === true ? 100 : mv.accuracy) / 100);
            if (mv.heal && me.hp / me.maxhp < 0.35) sc = 999; if (sc > score) { score = sc; pick = k; } });
          window.__pcFoe = `${foe.species?.name || foe.name} L${foe.level} hp${foe.hp}/${foe.maxhp}`;
          return pick; });
        if (i >= 0) { await tap(`#b-cmds .b-cmd[data-i="${i}"]`); turns++; } else await tap('#b-cmds .b-cmd');
      }
      await sleep(200); continue;
    }
    await sleep(120);
  }
  return { threw, turns, stuck: true };
}
async function settle(ms = 90000, { until = null, choice = 0, mode = 'fight' } = {}) {
  const t = Date.now(); let quiet = 0;
  while (Date.now() - t < ms) {
    const s = await S();
    if (until && until(s)) return s;
    if (s.battle) { battlesDone++; const r = await battle(mode); const a = await S(); const foe = await page.evaluate(() => window.__pcFoe || '?'); const out = await page.evaluate(() => window.kilumen.ui.lastBattle?.outcome); log('battle done', out, 'vs', foe, JSON.stringify(r), JSON.stringify(a.party)); quiet = 0; continue; }
    if (s.modal) { const t2 = await page.evaluate(() => document.querySelector('.ui-modal')?.textContent?.slice(0, 200)); texts.push('M: ' + t2); await tap('.ui-modal [data-m="0"]'); await sleep(250); quiet = 0; continue; }
    if (await page.locator('.starter-pick, .sp-panel, [class*="starter"]').first().isVisible().catch(() => false) && !s.dlg) { await page.keyboard.press('Enter'); await sleep(400); quiet = 0; continue; }
    if (s.dlg) {
      texts.push('D: ' + s.dlgText.slice(0, 200));
      const list = await page.locator('.dlg-list li, .dlg-list button, .dlg-list > *').count().catch(() => 0);
      if (list > 0 && await page.locator('.dlg-list').first().isVisible().catch(() => false)) {
        if (/far as the story goes|free to keep exploring/.test(s.dlgText) || texts.slice(-3).some((x) => /far as the story/.test(x))) await shot('wip_notice');
        const items = page.locator('.dlg-list > *'); const el = items.nth(Math.min(choice, list - 1));
        if (PHONE) await el.tap().catch(() => page.keyboard.press('Enter')); else { for (let k = 0; k < choice; k++) await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter'); }
      } else { await sleep(250); await confirm(); }
      await sleep(150); quiet = 0; continue;
    }
    if (!s.busy && !s.fade && !s.moving && !s.top) { if (++quiet > 3) return s; } else quiet = 0;
    if (s.top && !s.battle && !s.dlg) { await page.keyboard.press('Escape'); await sleep(200); } // also screens opened inside a script (the heal board after a rest)
    await sleep(120);
  }
  log('settle timeout'); return S();
}
const DIRK = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' };
async function path(goals, edgeDir = null) {
  return page.evaluate(({ goals, edgeDir }) => {
    const sc = window.kilumen.scene, m = sc.map, D = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
    const G = new Set(goals.map((g) => g[0] + ',' + g[1]));
    const start = [sc.player.x, sc.player.y], key = (x, y) => x + ',' + y, prev = new Map([[key(...start), null]]); const q = [start];
    while (q.length) { const [x, y] = q.shift();
      if (G.has(key(x, y))) { const out = []; let k = key(x, y); while (prev.get(k)) { out.unshift(prev.get(k).d); k = prev.get(k).k; } if (edgeDir) out.push(edgeDir); return out; }
      for (const d of Object.keys(D)) { const r = m.query(x, y, d, 'walk'); if (r.type !== 'walk' && r.type !== 'ledge') continue;
        if (m.warpAt?.(r.x, r.y) && !G.has(key(r.x, r.y))) continue;
        const k = key(r.x, r.y); if (!prev.has(k)) { prev.set(k, { k: key(x, y), d }); q.push([r.x, r.y]); } } }
    return null;
  }, { goals, edgeDir });
}
async function step(d, opts) {
  const s0 = await S();
  await page.keyboard.down(DIRK[d]);
  const t = Date.now();
  while (Date.now() - t < 1500) { const st = await page.evaluate(() => { const sc = window.kilumen.scene; return { st: sc.player.state, x: sc.player.x, y: sc.player.y, m: sc.map?.name, f: !!sc.fade, b: !!sc.busy }; });
    if (st.st === 'step' || st.st === 'hop' || st.x !== s0.x || st.y !== s0.y || st.m !== s0.map || st.f || st.b || st.st === 'bump') break; await sleep(10); }
  await page.keyboard.up(DIRK[d]);
  await sleep(60);
  return settle(90000, opts);
}
async function go(goals, edgeDir = null, opts = {}, tries = 8) {
  if (!Array.isArray(goals[0])) goals = [goals];
  for (let k = 0; k < tries; k++) {
    const s = await S(); const m0 = s.map;
    if (!edgeDir && goals.some((g) => g[0] === s.x && g[1] === s.y)) return s;
    const p = await path(goals, edgeDir);
    if (!p) { log('NO PATH', s.map, [s.x, s.y], '->', JSON.stringify(goals)); return null; }
    for (const d of p) { const b = await S(); const a = await step(d, opts); if (a.map !== m0) return a; if (a.x === b.x && a.y === b.y && !edgeDir) break; }
    const e = await S(); if (edgeDir ? e.map !== m0 : goals.some((g) => g[0] === e.x && g[1] === e.y)) return e;
  }
  return S();
}
async function face(d) { await page.keyboard.down(DIRK[d]); await sleep(40); await page.keyboard.up(DIRK[d]); await sleep(250); }
const NB = { up: [0, 1], down: [0, -1], left: [1, 0], right: [-1, 0] }; // stand cell offset from the target for facing d
async function talk(tx, ty, opts = {}) {
  const s0 = await S();
  for (const [d, [ox, oy]] of Object.entries(NB)) {
    const s = await go([tx + ox, ty + oy], null, opts); if (!s || s.map !== s0.map) return s;
    if (s.x === tx + ox && s.y === ty + oy) { await face(d); await page.keyboard.press('Enter'); await sleep(400); return settle(180000, opts); }
  }
  log('cannot reach', tx, ty); return S();
}
async function warpTo(to, opts) { // walk onto the door warp leading to `to`
  const ws = await page.evaluate((to) => (window.kilumen.scene.map.json.warps || []).filter((w) => w.to === to).map((w) => [w.x, w.y]), to);
  if (!ws.length) { log('no warp to', to); return S(); }
  const s = await go(ws, null, opts); await sleep(800); return settle(30000, opts);
}
async function edgeTo(to, opts) {
  const cells = await page.evaluate((to) => { const m = window.kilumen.scene.map, j = m.json, out = [];
    for (const e of j.exits || []) { if (e.to !== to) continue; for (let i = e.start; i <= e.end; i++) {
      const c = e.edge === 'north' ? [i, 0] : e.edge === 'south' ? [i, j.height - 1] : e.edge === 'west' ? [0, i] : [j.width - 1, i]; out.push([...c, e.edge]); } } return out; }, to);
  if (!cells.length) { log('no exit to', to); return S(); }
  const dir = { north: 'up', south: 'down', west: 'left', east: 'right' }[cells[0][2]];
  return go(cells.map((c) => [c[0], c[1]]), dir, opts);
}
const npc = (id) => page.evaluate((id) => { const sc = window.kilumen.scene; const n = (sc.npcs?.list || []).find((v) => v.id === id || v.def?.id === id); return n ? [n.x, n.y] : null; }, id);
async function backTo(map) { // after a blackout: out of the clinic, back to the grind map (Brookhollow -> Route 1 only)
  let s = await S(); if (s.map === map) return s;
  if (/^heal_/.test(s.map)) { s = await warpTo('$return'); if (s.map !== map && s.map !== s.map.replace('heal_', '')) log('blackout return landed on', s.map, s.x, s.y); }
  if (s.map !== map) s = await edgeTo(map); return S();
}
async function grind(n, mode = 'fight', until = null) { // walk back and forth in tall grass until n battles (or until(s))
  const cells = await page.evaluate(() => { const m = window.kilumen.scene.map, L = m.json.layers.encounter, out = [];
    for (let y = 0; y < L.length; y++) for (let x = 0; x < L[y].length; x++) if (L[y][x]) out.push([x, y]); return out; });
  const s0 = await S(); cells.sort((a, b) => (Math.abs(a[0] - s0.x) + Math.abs(a[1] - s0.y)) - (Math.abs(b[0] - s0.x) + Math.abs(b[1] - s0.y)));
  const a = cells[0], b = cells.find((c) => Math.abs(c[0] - a[0]) + Math.abs(c[1] - a[1]) === 1) || a;
  const start = battlesDone; let losses = 0;
  for (let k = 0; k < 800 && battlesDone - start < n; k++) {
    const s = await go(k % 2 ? a : b, null, { mode }); if (!s) break;
    const c = await S(); if (until && until(c)) return c;
    if (c.map !== s0.map) { log('grind: left the map (blackout?)', c.map); losses++; if (losses > 4) return c; await backTo(s0.map); }
    else if (mode === 'fight' && s0.map === 'route1' && await hpFrac() < 0.35) { log('grind: heal trip'); await healTrip('route1'); }
  }
  return S();
}


// ---------------------------------------------------------------- healing like a sensible player (Oct 23 11:35, coder)
const SHOPS = JSON.parse(fs.readFileSync('src/systems/data/shops.json', 'utf8'));
const hpFrac = () => page.evaluate(async () => { const { maxHp } = await import('/src/systems/creature.js'); const p = window.kilumen.scene.party || [];
  let h = 0, m = 0; for (const c of p) { h += Math.max(0, c.hp || 0); m += maxHp(c) || 1; } return m ? h / m : 1; });
async function healHere() { // stand at the carer counter, face it, A, take "Rest my team"
  const s = await S(), b = SHOPS.branches[s.map]; if (!b) return s;
  await go([[b.stand.x, b.stand.y]]); await face(b.stand.facing || 'up'); await page.keyboard.press('Enter'); await sleep(400);
  const r = await settle(90000); log('healed at', s.map, 'party', JSON.stringify(r.party)); return r;
}
async function goMap(target) { // tiny route graph for the Master 1 path
  for (let k = 0; k < 8; k++) {
    let s = await S(); if (s.map === target) return s;
    if (/^heal_/.test(s.map) || s.map === 'fernwick_hall_int') { await warpTo(s.map === 'fernwick_hall_int' ? 'fernwick' : '$return'); continue; }
    if (target.startsWith('heal_') && s.map === target.slice(5)) { await warpTo(target); continue; }
    if (target === 'fernwick_hall_int' && s.map === 'fernwick') { await warpTo(target); continue; }
    const town = target.startsWith('heal_') ? target.slice(5) : target === 'fernwick_hall_int' ? 'fernwick' : target;
    if (s.map === town) continue;
    if (s.map === 'route1') { await edgeTo(town === 'brookhollow' ? 'brookhollow' : 'fernwick'); continue; }
    await edgeTo('route1');
  }
  return S();
}
async function healTrip(back) { // nearest clinic on the path, rest, come back
  const s = await S(); const town = ['fernwick', 'fernwick_hall_int'].includes(s.map) || (s.map === 'route1' && s.y < 25) ? 'fernwick' : 'brookhollow';
  await goMap('heal_' + town); await healHere(); return goMap(back);
}
async function fightNpc(id, map, tries = 4) { // heal first when low; a lost fight (blackout) heals, so walk back and try again
  for (let k = 0; k < tries; k++) {
    if (await hpFrac() < 0.8) await healTrip(map); else await goMap(map);
    const p = await npc(id); if (!p) { log('no npc', id, 'on', (await S()).map); return false; }
    const b0 = battlesDone; await talk(...p); const s = await settle();
    const out = await page.evaluate(() => window.kilumen.ui.lastBattle?.outcome);
    if (battlesDone === b0) { log(id, 'no battle (already beaten?)'); return true; }
    if (out === 'win' && !/^heal_/.test(s.map)) return true;
    log(id, 'lost, try', k + 1, out, s.map);
  }
  return false;
}
// ---------------------------------------------------------------- journey
const R = { profile: PROFILE, steps: [] }; const mark = async (name, ok, extra = {}) => { const s = await S(); R.steps.push({ name, ok, map: s.map, party: s.party, ...extra }); log(ok ? 'OK ' : 'FAIL', name, JSON.stringify(s.party)); await shot(name); return ok; };
const has = async (f) => (await S()).flags.includes(f);
try {
  let s = await settle(); await shot('new_game');
  s = await warpTo('house_1f'); s = await settle();
  const ron = await npc('ron'); if (ron && !(await has('talked_ron_morning'))) s = await talk(...ron);
  await mark('ron_briefing', await has('talked_ron_morning'));
  s = await warpTo('brookhollow'); s = await warpTo('office_int');
  const mg = await npc('manager'); s = await talk(...mg); s = await settle();
  await mark('promoted', await has('flg_promoted'));
  s = await S(); if (s.map !== 'lab_brookhollow') { s = await warpTo('brookhollow'); s = await warpTo('lab_brookhollow'); }
  s = await settle();
  const cr = await page.evaluate((k) => { const sp = (window.kilumen.scene.map.json.text_pending?.interact_spots || []).filter((x) => /cradle/.test(x.id)); return sp.map((x) => [x.id, x.x, x.y]); }, 0);
  log('cradles', JSON.stringify(cr));
  const c = cr[STARTER] || cr[0]; s = await talk(c[1], c[2]); s = await settle(60000);
  await mark('starter', await has('got_starter'));
  for (let i = 0; i < 4 && !(await has('test_run_started')); i++) { s = await settle(); }
  await mark('test_run_started', await has('test_run_started'), { crystals: await page.evaluate(() => window.kilumen.scene.systems.bag.count('dominance_crystal')) });
  s = await S(); if (s.map === 'lab_brookhollow') s = await warpTo('brookhollow');
  s = await edgeTo('route1');
  // test run: fight the first two encounters (XP), then catch until test_run_done
  s = await grind(2, 'fight');
  s = await grind(30, 'catch', (x) => x.flags.includes('test_run_done'));
  await mark('test_run_done', await has('test_run_done'), { crystals: await page.evaluate(() => window.kilumen.scene.systems.bag.count('dominance_crystal')) });
  s = await edgeTo('brookhollow'); s = await warpTo('lab_brookhollow'); s = await settle();
  for (let i = 0; i < 3 && !(await has('job_briefed')); i++) { s = await settle(); }
  await mark('job_briefed', await has('job_briefed'));
  s = await warpTo('brookhollow'); s = await edgeTo('route1');
  s = await grind(Number(process.env.WILD || 10), 'fight');
  await mark('route1_levelled', true);
  for (const id of ['trainer_r1_a', 'trainer_r1_b', 'trainer_r1_c']) { const ok = await fightNpc(id, 'route1'); await mark(id, ok, { last: await page.evaluate(() => window.kilumen.ui.lastBattle?.outcome) }); }
  await goMap('fernwick'); await goMap('heal_fernwick'); await healHere(); await goMap('fernwick'); // first visit: the Fernwick clinic becomes the blackout point
  await fightNpc('ron_rival_1', 'fernwick');
  await mark('ron_1', await has('beat_rival_ron_1'));
  for (const id of ['helper_1', 'helper_2']) { const ok = await fightNpc(id, 'fernwick_hall_int'); await mark(id, ok, { last: await page.evaluate(() => window.kilumen.ui.lastBattle?.outcome) }); }
  for (let k = 0; k < 3 && !(await has('beat_master_fernwick')); k++) { await fightNpc('master_fernwick', 'fernwick_hall_int', 1); if (!(await has('beat_master_fernwick'))) { log('master lost: grind route1 then retry'); await goMap('route1'); await grind(6, 'fight'); } }
  s = await settle();
  await mark('master_1', await has('beat_master_fernwick'));
  await mark('wip_notice_seen', await has('seen_wip_notice'));
} catch (e) { log('ERR', String(e.stack || e)); R.error = String(e); await shot('error').catch(() => {}); }
clearInterval(signTimer); R.areaSigns = signs;
R.texts = texts.slice(-80); R.errs = errs.slice(0, 20); R.shots = shots; R.battles = battlesDone;
fs.writeFileSync(`${OUT}/result.json`, JSON.stringify(R, null, 1));
log('DONE', JSON.stringify(R.steps.map((x) => `${x.name}:${x.ok ? 'ok' : 'FAIL'}`)));
await browser.close();
