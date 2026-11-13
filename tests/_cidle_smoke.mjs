// Kilumen ALPHA battle + full-screen smoke (final build served under /kilumen/). Engine (sd) battles are the alpha default.
// Per profile: first launch -> notice -> title -> New game -> edge-to-edge check -> WILD battle on route1 (walk into tall
// grass, ?encrate=1 only to make the first roll hit; the build default is the table rate) -> fight to the end ->
// RON's rival battle in Fernwick (talk) -> fight -> his lines -> flags.
// Profiles: pc (Chromium 1920x1080), phone2340 (Chromium, 780x360 CSS @3x = 2340x1080, touch), phone844 (WebKit iPhone 14 landscape 844x390).
// Harness use: teleport (startWarp), test party (createCreature) as in tests/battles_default_clips.mjs. Input is real keys / taps.
import { chromium, webkit, devices } from '/workspace/kilumen/node_modules/playwright/index.mjs';
import fs from 'node:fs'; import path from 'node:path';
const BASE = process.env.BASE || 'http://127.0.0.1:8942/kilumen/';
const OUT = process.env.SHOTS || '/workspace/kilumen_alpha/shots/battle_smoke'; fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ALL = {
  pc: { type: chromium, opts: { viewport: { width: 1920, height: 1080 } }, touch: false },
  phone2340: { type: chromium, opts: { viewport: { width: 780, height: 360 }, screen: { width: 780, height: 360 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true,
    userAgent: devices['Pixel 7 landscape'].userAgent }, touch: true },
  phone844: { type: webkit, opts: { ...devices['iPhone 14 landscape'], viewport: { width: 844, height: 390 }, screen: { width: 844, height: 390 } }, touch: true },
};
const RUN = (process.env.DEV || Object.keys(ALL).join(',')).split(',');
const report = {};

async function run(name) {
  const D = ALL[name]; const browser = await D.type.launch();
  const ctx = await browser.newContext(D.opts); const page = await ctx.newPage();
  const errors = [], bad = [];
  // Expected by design: fx_art probes bone_v2/<id>/hold_points.json for every trainer; characters with no bone_v2 art in the
  // snapshot (e.g. ron, vane) 404 and fall back to the old pose. Counted separately (expected404), only if the folder is absent in the snapshot.
  const expected404 = []; const SNAPD = process.env.ALPHA_SNAP || '';
  const isExpected = (u) => { const m = u.match(/capture_poses\/bone_v2\/([^/]+)\/hold_points\.json$/); return !!m && !!SNAPD && !fs.existsSync(`${SNAPD}/art/characters/pixel/capture_poses/bone_v2/${m[1]}`); };
  page.on('pageerror', (e) => errors.push('pageerror ' + e.message));
  page.on('console', (m) => { if (m.type() !== 'error') return; const u = m.location()?.url || ''; if (/Failed to load resource/.test(m.text()) && isExpected(u)) return; errors.push(m.text() + (u ? ' @' + u : '')); });
  page.on('response', (r) => { if (r.status() < 400) return; if (r.status() === 404 && isExpected(r.url())) { expected404.push(r.url().replace(/.*bone_v2\//, '')); return; } bad.push(r.status() + ' ' + r.url()); });
  const res = []; const check = (id, ok, info = '') => { res.push({ id, ok: !!ok, info }); console.log(`${name} ${ok ? 'ok  ' : 'FAIL'} ${id} ${info}`); };
  const shot = async (f) => { await page.screenshot({ path: path.join(OUT, `${f}_${name}.png`) }); if (/fight/.test(f)) { const m = await page.evaluate(() => ['p1','p2'].map((k) => document.querySelector(`#${k}-mon`)?.src?.replace(/.*creatures\//, ''))); console.log(`${name} CIDLE battle srcs`, JSON.stringify(m)); } };
  const center = (sel) => page.$eval(sel, (el) => { const b = el.getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; });
  const tap = async (sel) => { const [x, y] = await center(sel); await page.touchscreen.tap(x, y); };
  const state = () => page.evaluate(() => { const msg = document.querySelector('#b-msg'), cmds = document.querySelector('#b-cmds'), sc = window.kilumen.scene;
    return { open: !!document.querySelector('.ui-battle'), more: !!msg?.querySelector('.more'), msg: msg?.textContent || '', cmds: cmds && !cmds.hidden ? [...cmds.querySelectorAll('.b-cmd')].map((e) => e.textContent) : null,
      dlg: !!sc.dialog?.active, busy: !!sc.busy, ui: !!window.kilumen.ui?.active, map: sc.map?.name }; });
  const pressA = async () => { if (!D.touch) { await page.keyboard.press('Enter'); return; }
    const t = await page.evaluate(() => { const vis = (el) => el && el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden';
      if (vis(document.querySelector('.ui-modal li.sel'))) return '.ui-modal li.sel'; if (vis(document.querySelector('.ui-press-start'))) return '.ui-press-start';
      if (vis(document.querySelector('.ui-title-menu li.sel'))) return '.ui-title-menu li.sel';
      if (vis(document.querySelector('#b-msg')) && document.querySelector('#b-msg').textContent.trim()) return '#b-msg';
      return '#touchpad [data-btn=a]'; });
    await tap(t); };
  const hold = async (d, on) => { if (!D.touch) { await page.keyboard[on ? 'down' : 'up']({ up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' }[d]); return; }
    const [x, y] = await center(`#touchpad [data-dir=${d}]`);
    await page.evaluate(([x, y, on]) => { const t = on ? (window.__pt = document.elementFromPoint(x, y)) : window.__pt;
      t?.dispatchEvent(new PointerEvent(on ? 'pointerdown' : 'pointerup', { pointerId: 101, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y, bubbles: true, cancelable: true, composed: true, buttons: on ? 1 : 0 })); }, [x, y, on]); };
  const click = async (sel) => { if (D.touch) await tap(sel); else await page.click(sel, { timeout: 5000 }); };
  const waitCmds = async (ms = 20000) => { const t = Date.now(); while (Date.now() - t < ms) { const s = await state(); if (!s.open || s.cmds) return s; if (s.more) await click('#b-msg').catch(() => {}); await sleep(150); } return state(); };
  const fight = async (max = 40) => { let turns = 0;
    for (let n = 0; n < max; n++) { let s = await waitCmds(); if (!s.open) return turns;
      if (s.cmds?.length === 4 && /Skills/.test(s.cmds[0])) { await click('#b-cmds .b-cmd[data-i="0"]'); await sleep(250); s = await state(); }
      if (s.cmds) { await click('#b-cmds .b-cmd:not([style*="opacity"])'); turns++; }
      if (await page.locator('.ui-modal [data-m="0"]').count()) await click('.ui-modal [data-m="0"]');
      if (n === 1) await shot(turns ? 'fight' : 'fight0'); }
    return turns; };
  const drain = async (ms = 40000) => { const t = Date.now(); while (Date.now() - t < ms) { const s = await state();
      if (s.dlg) { await sleep(400); await pressA(); await sleep(150); continue; }
      if (!s.busy && !s.open) { await sleep(300); const s2 = await state(); if (!s2.busy && !s2.dlg && !s2.open) return; continue; } await sleep(120); } };
  const warp = (to) => page.evaluate(async (to) => { const s = window.kilumen.scene, n = s.warpCount; s.startWarp(to, 'walk');
    const t0 = Date.now(); while ((s.warpCount === n || s.fade) && Date.now() - t0 < 15000) await new Promise((r) => setTimeout(r, 30)); return s.map.name; }, to);
  const setup = (party) => page.evaluate(async (party) => { const { createCreature } = await import('./src/systems/creature.js');
    const sc = window.kilumen.scene; sc.party = party.map((p) => createCreature(p)); sc._placeFollower?.(); sc._loadActorSprites?.(); sc._dirty = true; }, party);
  const fill = async (label) => { // edge-to-edge: the game canvas / stage must cover the whole viewport (no letterbox bars)
    const m = await page.evaluate(() => { const vw = window.innerWidth, vh = window.innerHeight;
      const els = [...document.querySelectorAll('canvas')].map((c) => c.getBoundingClientRect()).filter((b) => b.width * b.height > 0).sort((a, b) => b.width * b.height - a.width * a.height);
      const b = els[0]; const sa = getComputedStyle(document.documentElement);
      return { vw, vh, dpr: devicePixelRatio, canvas: b && { l: Math.round(b.left), t: Math.round(b.top), r: Math.round(vw - b.right), b: Math.round(vh - b.bottom), w: Math.round(b.width), h: Math.round(b.height) },
        scroll: document.documentElement.scrollWidth > vw || document.documentElement.scrollHeight > vh, fsBtn: !!document.querySelector('#fs-btn:not([hidden]), [data-act=fullscreen], .fs-btn, button[aria-label*="ull screen" i], button[aria-label*="ullscreen" i]') }; });
    const f = path.join(OUT, `fill_${label}_${name}.png`); await page.screenshot({ path: f });
    const c = m.canvas; const bars = c ? ['l', 't', 'r', 'b'].filter((k) => c[k] > 1).map((k) => `${k}${c[k]}px`) : ['no canvas'];
    return { ...m, bars, png: f }; };
  try {
    await page.goto(BASE + '?encrate=1');
    await page.waitForFunction(() => window.kilumen?.scene?.tileset && window.kilumen.ui, null, { timeout: 30000 }); await page.evaluate(() => window.kilumen.ready);
    await page.waitForSelector('.ui-modal[role=dialog]', { timeout: 6000 }).catch(() => {}); await sleep(400); await pressA(); await sleep(500); // notice
    await pressA(); await sleep(500); await pressA(); // press start -> New game
    const inGame = await page.waitForFunction(() => !window.kilumen.ui.active && !document.querySelector('.ui-title-scr') && window.kilumen.scene.map?.name, null, { timeout: 8000 }).then(() => true, () => false);
    check('0 new game in the world', inGame, await page.evaluate(() => window.kilumen.scene.map?.name + ' search=' + JSON.stringify(location.search)));
    const sd = await page.evaluate(async () => { await window.kilumen.ui.sdReady; await window.kilumen.ui.wild?.ready; return { sd: !!window.kilumen.ui.sdMod, wild: !!window.kilumen.ui.wild }; }).catch((e) => ({ err: e.message }));
    check('1 engine battles + wild encounters loaded', sd.sd && sd.wild, JSON.stringify(sd));
    // ---- creature idle probe (v0.2.36) ----
    console.log(name, 'CIDLE drain', await page.evaluate(async () => { const s = window.kilumen.scene; const seen = []; for (let i = 0; i < 150 && (s.busy || s.dialog?.active || s.intro?.picker?.active); i++) { if (s.dialog?.active) { seen.push(s.dialog.text.textContent.slice(0, 40)); s.dialog.handle({ a: true }); } await new Promise((r) => setTimeout(r, 120)); } return JSON.stringify({ busy: s.busy, n: seen.length, last: seen.slice(-3), pick: !!s.intro?.picker?.active }); })); await setup([{ species: 'cindrip', level: 8 }]); await warp({ map: 'route1', x: 10, y: 20, facing: 'down' }).catch(() => {}); await sleep(1500); console.log(name, 'CIDLE drain2', await page.evaluate(async () => { const s = window.kilumen.scene; const seen = []; for (let i = 0; i < 150 && (s.busy || s.dialog?.active || s.intro?.picker?.active); i++) { if (s.dialog?.active) { seen.push(s.dialog.text.textContent.slice(0, 40)); s.dialog.handle({ a: true }); } await new Promise((r) => setTimeout(r, 120)); } return JSON.stringify({ busy: s.busy, n: seen.length, last: seen.slice(-3), pick: !!s.intro?.picker?.active }); })); 
    const samp = () => page.evaluate(() => { const a = window.kilumen.scene.view().actors.find((x) => x.follower); const s = window.kilumen.scene, f = s.follower; return a ? { sq: a.sq && { l: a.sq.lift, sy: +a.sq.sy.toFixed(2) }, col: a.col, st: !!f.stepping, mv: !!s.player.moving, f: [f.x, f.y], p: [s.player.x, s.player.y] } : null; });
    const idleS = []; for (let i = 0; i < 6; i++) { idleS.push(await samp()); await sleep(230); }
    await page.screenshot({ path: path.join(OUT, `cidle_follower_idle_${name}.png`) });
    const pos0 = await page.evaluate(() => { const s = window.kilumen.scene; return [s.map.name, s.player.x, s.player.y, s.busy, !!window.kilumen.ui.active]; }); let wd = 'left';
    for (const d of ['left','right','up','down']) { await hold(d, true); await sleep(700); await hold(d, false); await sleep(300); const q = await page.evaluate(() => [window.kilumen.scene.player.x, window.kilumen.scene.player.y]); if (q[0] !== pos0[1] || q[1] !== pos0[2]) { wd = d; break; } }
    console.log(name, 'CIDLE pos0', JSON.stringify(pos0), 'walkdir', wd, await page.evaluate(() => { const s = window.kilumen.scene; return JSON.stringify({ script: !!s.script, fade: !!s.fade, lock: s._saveLocks && [...(s._saveLocks.keys?.() || [])], dlg: !!s.dialog?.active, intro: s.intro?.step || s.intro?.state, warpCount: s.warpCount, ui: window.kilumen.ui.active?.id }); }));
    wd = { left: 'right', right: 'left', up: 'down', down: 'up' }[wd]; await hold(wd, true); const walkS = []; for (let i = 0; i < 12; i++) { await sleep(45); walkS.push(await samp()); } await page.screenshot({ path: path.join(OUT, `cidle_follower_walk_${name}.png`) }); await hold(wd, false); await sleep(400);
    console.log(`${name} CIDLE idle`, JSON.stringify(idleS), 'walk', JSON.stringify(walkS));
    check('C1 follower breathes while standing', new Set(idleS.map((x) => x?.sq?.sy)).size > 1, '');
    check('C2 follower walks with bob/squash', walkS.some((x) => x?.col > 0) && walkS.some((x) => x?.sq?.sy === 0.93), '');
    if (process.env.CIDLE_ONLY) return;
    await sleep(500); const f1 = await fill('world');
    check('2 fills the viewport edge to edge (in world)', f1.bars.length === 0 && !f1.scroll, `${f1.vw}x${f1.vh}@${f1.dpr} canvas ${JSON.stringify(f1.canvas)} bars [${f1.bars}] fsBtn=${f1.fsBtn}`);
    report[name + '_fill'] = f1;
    // ---- 2c small interior: no black bars (mobile display.outsideMap 'edge' repeats + shades the map edge) ----
    const mob = D.touch;
    const inMap = await warp({ map: 'heal_brookhollow', x: 7, y: 8, facing: 'up' }).catch((e) => 'err ' + e.message); await sleep(900);
    const ib = await page.evaluate(() => { const cv = document.querySelector('canvas'); const g = cv.getContext('2d'), W = cv.width, H = cv.height, d = g.getImageData(0, 0, W, H).data;
      const blk = (x, y) => { const i = (y * W + x) * 4; return d[i] <= 8 && d[i + 1] <= 8 && d[i + 2] <= 8; };
      const col = (x) => { for (let y = Math.floor(H * 0.1); y < H * 0.9; y += 4) if (!blk(x, y)) return false; return true; };
      const row = (y) => { for (let x = Math.floor(W * 0.1); x < W * 0.9; x += 4) if (!blk(x, y)) return false; return true; };
      let l = 0; while (l < W && col(l)) l++; let r = 0; while (r < W && col(W - 1 - r)) r++; let t = 0; while (t < H && row(t)) t++; let b = 0; while (b < H && row(H - 1 - b)) b++;
      return { platform: window.kilumen.platform?.id, px: [W, H], black: { left: l, right: r, top: t, bottom: b } }; }).catch((e) => ({ err: e.message }));
    await page.screenshot({ path: path.join(OUT, `${name}_interior.png`) });
    const fi = await fill('interior'); const nb = ib.black ? Object.values(ib.black).reduce((a, x) => a + x, 0) : -1;
    check('2c small interior (heal_brookhollow): no black bars', inMap === 'heal_brookhollow' && fi.bars.length === 0 && (mob ? nb === 0 : nb >= 0), `${inMap} ${JSON.stringify(ib)} css bars [${fi.bars}]` + (mob ? '' : ' (PC: map-edge black allowed, pc.json untouched)'));
    // ---- 2d fullscreen button (phones only; pc never gets it) ----
    const wasFs = await page.evaluate(async () => { const on = !!(document.fullscreenElement || document.webkitFullscreenElement); if (on) { await (document.exitFullscreen || document.webkitExitFullscreen)?.call(document); await new Promise((r) => setTimeout(r, 500)); } return on; }).catch(() => false);
    if (wasFs) console.log(`${name} info 2d already in full screen before the button check (an earlier tap hit the chip); exited first`);
    const fb0 = await page.evaluate(() => { const b = document.querySelector('#fs-btn'); return b ? { hidden: b.hidden, vis: !!b.offsetParent, r: b.getBoundingClientRect().toJSON() } : null; });
    if (!mob) check('2d no fullscreen button on PC', !fb0, JSON.stringify(fb0));
    else {
      let res = { btn: fb0 };
      if (fb0 && !fb0.hidden) {
        const c = fb0.r; await page.touchscreen.tap(c.x + c.width / 2, c.y + c.height / 2).catch(() => page.mouse.click(c.x + c.width / 2, c.y + c.height / 2)); await sleep(800);
        res = await page.evaluate(() => { const t = document.querySelector('#fs-toast, .fs-hint, [id*=fs][id*=hint]'); return { fullscreen: !!(document.fullscreenElement || document.webkitFullscreenElement),
          hint: [...document.querySelectorAll('body *')].filter((e) => e.childElementCount === 0 && /Add to Home Screen/.test(e.textContent || '') && !e.hidden).length > 0, btnHidden: document.querySelector('#fs-btn')?.hidden }; });
        await page.screenshot({ path: path.join(OUT, `${name}_fullscreen_tap.png`) });
        await page.evaluate(() => (document.exitFullscreen || document.webkitExitFullscreen)?.call(document)).catch(() => {}); await sleep(400);
      }
      check('2d fullscreen button works (enters full screen, or shows the iPhone Add to Home Screen hint)', !!fb0 && !fb0.hidden && (res.fullscreen || res.hint), JSON.stringify(res));
    }
    // ---- wild ----
    await warp({ map: 'route1', x: 14, y: 23, facing: 'right' }); await setup([{ species: 'cindrip', level: 12 }]); await sleep(800);
    await hold('right', true); const t = Date.now(); let s;
    while (Date.now() - t < 15000) { s = await state(); if (s.open || s.busy) break; await sleep(60); } await hold('right', false);
    const wild = await page.evaluate(() => window.kilumen.scene.log.filter((e) => e.type === 'wild').at(-1));
    await page.waitForSelector('.ui-battle', { timeout: 8000 }).catch(() => {}); await sleep(1500); await shot('wild');
    const fb = await fill('battle');
    check('3 wild battle opens from tall grass', !!(await page.$('.ui-battle')) && wild, JSON.stringify(wild));
    check('2b fills the viewport edge to edge (battle)', fb.bars.length === 0, `bars [${fb.bars}]`);
    const wt = await fight(); await drain();
    const wend = await page.evaluate(() => ({ last: window.kilumen.ui.lastBattle && { outcome: window.kilumen.ui.lastBattle.outcome, turns: window.kilumen.ui.lastBattle.turns }, map: window.kilumen.scene.map.name }));
    check('4 wild battle ends, back in the world', !(await page.$('.ui-battle')) && wend.last, `${wt} commands; ${JSON.stringify(wend)}`);
    await shot('after_wild');
    // ---- capture with the bone_v2 one-arm pose (harness: 3 crystals in the bag, a forced-catch wild battle) ----
    await page.evaluate(() => { window.kilumen.scene.systems?.bag?.add('dominance_crystal', 3); window.kilumen.ui.open('battle', { forceChance: true }); });
    { const t0 = Date.now(); while (Date.now() - t0 < 20000) { const s = await state(); if (s.cmds) break; if (s.more) await click('#b-msg').catch(() => {}); await sleep(150); } }
    await click('#b-cmds .b-cmd[data-i="1"]').catch(() => {});
    for (let n = 0; n < 30; n++) { if (await page.$('.ax-catch')) break; const i = await page.evaluate(() => [...document.querySelectorAll('#b-cmds .b-cmd')].findIndex((e) => /Crystal/.test(e.textContent)));
      if (i >= 0) { await click(`#b-cmds .b-cmd[data-i="${i}"]`); break; } await sleep(150); }
    await page.waitForSelector('.ax-catch', { state: 'attached', timeout: 15000 }).catch(() => {}); await sleep(1500);
    const cap = await page.evaluate(() => { const t = document.querySelector('.ax-trainer'); return { catchFx: !!document.querySelector('.ax-catch'), pose: t?.dataset.pose || '', bg: (t?.style.backgroundImage || '').replace(/^.*\/(capture_poses\/[^"')]+).*$/, '$1').slice(0, 90), art: window.kilumen.ui.fx?.motion?.captureArt ?? null }; });
    await shot('capture');
    check('4b capture shows the bone_v2 one-arm pose', cap.catchFx && /bone_v2/.test(cap.bg), JSON.stringify(cap));
    await fight(); await drain();
    const cend = await page.evaluate(() => window.kilumen.ui.lastBattle && { outcome: window.kilumen.ui.lastBattle.outcome });
    check('4c capture battle ends', !(await page.$('.ui-battle')), JSON.stringify(cend));
    // ---- Ron ----
    await page.evaluate(() => { window.kilumen.ui.wild && (window.kilumen.ui.wild.rate = 0); });
    await warp({ map: 'fernwick', x: 12, y: 13, facing: 'up' });
    await setup([{ species: 'cindrip', level: 30 }, { species: 'rillop', level: 28 }, { species: 'tumbloam', level: 28 }]); await sleep(600);
    const ron = await page.evaluate(() => { const n = window.kilumen.scene.npcs.list.find((v) => /ron/.test(v.id)); return n && { id: n.id, x: n.x, y: n.y }; });
    if (D.touch) await tap('#touchpad [data-dir=up]'); else await page.keyboard.press('ArrowUp'); await sleep(400);
    for (let k = 0; k < 6; k++) { await pressA(); if (await page.waitForFunction(() => window.kilumen.scene.dialog?.active || window.kilumen.scene.busy, null, { timeout: 1500 }).then(() => true, () => false)) break; }
    await sleep(800); await shot('ron_talk');
    { const t0 = Date.now(); while (Date.now() - t0 < 30000) { const s = await state(); if (s.open) break; if (s.dlg) { await sleep(400); await pressA(); } await sleep(150); } }
    const ronOpen = !!(await page.$('.ui-battle')); await sleep(1200); await shot('ron_battle');
    check("5 Ron's battle opens from talking", ronOpen, JSON.stringify(ron));
    const rt = await fight(); let lines = [];
    { const t0 = Date.now(); while (Date.now() - t0 < 40000) { const s = await state(); const txt = await page.evaluate(() => window.kilumen.scene.dialog?.active ? window.kilumen.scene.dialog.text.textContent : '');
        if (txt && lines.at(-1) !== txt) lines.push(txt); if (s.dlg) { await sleep(400); await pressA(); await sleep(150); continue; } if (!s.busy && !s.open) break; await sleep(120); } }
    const rend = await page.evaluate(() => ({ last: window.kilumen.ui.lastBattle && { outcome: window.kilumen.ui.lastBattle.outcome, turns: window.kilumen.ui.lastBattle.turns },
      flags: [...window.kilumen.scene.flags].filter((f) => /ron|run_shoes|fernwick/.test(f)), map: window.kilumen.scene.map.name }));
    await shot('after_ron');
    check("6 Ron's battle ends, story flags set", !(await page.$('.ui-battle')) && rend.last && rend.flags.length, `${rt} commands; ${JSON.stringify(rend)}; lines: ${lines.map((l) => l.slice(0, 50)).join(' / ')}`);
    // ---- hall door + Master battle (masters on; hallPuzzles off -> the Master battles on talk) ----
    const settle = async (ms = 60000) => { const t0 = Date.now(); let fights = 0; while (Date.now() - t0 < ms) { const s = await state();
        if (s.open) { await fight(); fights++; continue; } if (s.dlg) { await sleep(350); await pressA(); await sleep(150); continue; }
        if (!s.busy && !s.ui) { await sleep(400); const s2 = await state(); if (!s2.busy && !s2.dlg && !s2.open && !s2.ui) return fights; continue; } await sleep(150); } return fights; };
    await setup([{ species: 'cindrip', level: 45 }, { species: 'rillop', level: 45 }, { species: 'tumbloam', level: 45 }]);
    await warp({ map: 'saltmere', x: 12, y: 21, facing: 'up' }); await sleep(600);
    await hold('up', true); { const t0 = Date.now(); while (Date.now() - t0 < 6000) { const m = await page.evaluate(() => window.kilumen.scene.map?.name); if (m !== 'saltmere') break; await sleep(60); } } await hold('up', false);
    await page.waitForFunction(() => !window.kilumen.scene.fade, null, { timeout: 8000 }).catch(() => {}); await sleep(700);
    const inHall = await page.evaluate(() => { const sc = window.kilumen.scene; return { map: sc.map?.name, x: sc.player?.x, y: sc.player?.y, npcs: sc.npcs?.list?.map((n) => n.id).filter((i) => /hall/.test(i)) }; });
    await shot('hall_door');
    check('9 hall door: Saltmere (12,20) door enters the hall interior', inHall.map === 'saltmere_hall_int', JSON.stringify(inHall));
    const hallFights = await settle(60000); // a hall trainer may spot the player at the door
    await warp({ map: 'saltmere_hall_int', x: 5, y: 4, facing: 'up' }); await sleep(600);
    const mst = await page.evaluate(() => { const n = window.kilumen.scene.npcs.list.find((v) => /master/.test(v.id)); return n && { id: n.id, x: n.x, y: n.y }; });
    if (D.touch) await tap('#touchpad [data-dir=up]'); else await page.keyboard.press('ArrowUp'); await sleep(400);
    for (let k = 0; k < 6; k++) { await pressA(); if (await page.waitForFunction(() => window.kilumen.scene.dialog?.active || window.kilumen.scene.busy || document.querySelector('.ui-battle'), null, { timeout: 1500 }).then(() => true, () => false)) break; }
    { const t0 = Date.now(); while (Date.now() - t0 < 30000) { const s = await state(); if (s.open) break; if (s.dlg) { await sleep(400); await pressA(); } await sleep(150); } }
    const mOpen = !!(await page.$('.ui-battle')); await sleep(1000); await shot('master_battle');
    check('10 Master battle opens (Saltmere hall Master)', mOpen, `${JSON.stringify(mst)} hall trainer fights on the way: ${hallFights}`);
    const mt = await fight(60); const mlines = [];
    { const t0 = Date.now(); while (Date.now() - t0 < 40000) { const s = await state(); const txt = await page.evaluate(() => window.kilumen.scene.dialog?.active ? window.kilumen.scene.dialog.text.textContent : '');
        if (txt && mlines.at(-1) !== txt) mlines.push(txt); if (s.dlg) { await sleep(400); await pressA(); await sleep(150); continue; } if (s.open) { await fight(); continue; } if (!s.busy && !s.ui) break; await sleep(120); } }
    const mend = await page.evaluate(() => ({ last: window.kilumen.ui.lastBattle && { outcome: window.kilumen.ui.lastBattle.outcome, turns: window.kilumen.ui.lastBattle.turns },
      flags: [...window.kilumen.scene.flags].filter((f) => /master|saltmere/.test(f)), map: window.kilumen.scene.map.name }));
    await shot('after_master');
    check('11 Master battle ends, beat_master_saltmere set', !(await page.$('.ui-battle')) && mend.flags.includes('beat_master_saltmere'), `${mt} commands; ${JSON.stringify(mend)}; lines: ${mlines.map((l) => l.slice(0, 60)).join(' / ')}`);
  } catch (e) { check('X script', false, e.message.split('\n')[0]); }
  check('7 no console / page errors', errors.length === 0, errors.slice(0, 4).join(' | '));
  check('8 no failed requests', bad.length === 0, bad.slice(0, 4).join(' | ') + (expected404.length ? ` (expected fallback 404s: ${[...new Set(expected404)].join(', ')})` : ''));
  report[name] = { pass: res.filter((r) => r.ok).length, total: res.length, results: res, errors, bad, expected404: [...new Set(expected404)] };
  await browser.close();
}
for (const n of RUN) await run(n);
fs.writeFileSync(path.join(OUT, 'battle_smoke.json'), JSON.stringify(report, null, 1));
for (const n of RUN) console.log(`${n}: ${report[n].pass}/${report[n].total}`);
