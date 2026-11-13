// Touch end-to-end check for the phone controls (Gary, Oct 22, 2026: "make sure the mobile controls work in mobile browsers").
// Real touch input: Chromium (Pixel 7 landscape) gets CDP Input.dispatchTouchEvent (holds, slides, multi-touch, cancel) and
// Input.synthesizePinchGesture, plus page.touchscreen.tap. WebKit (iPhone 14 / 15 landscape) gets page.touchscreen.tap (real
// WebKit touch). Playwright's WebKit has no touch down/move/up API, so holds/slides/multi-touch there are pointer events
// (pointerType "touch") dispatched in the page, labelled "synthetic" in the report.
// Covers: (1) d-pad hold / release / slide, (2) A talks, B advances / backs out, B + d-pad runs, (3) dialogue: d-pad hidden,
// box tap advances, row tap picks, (4) no stuck input (touchcancel, lift outside, blur, visibilitychange, rotate),
// (5) no scroll / zoom / selection / callout / context menu, (6) reacts on touchstart (no 300 ms delay), hit areas >= 44 px,
// (7) safe-area insets + rotate screen in portrait, (8) no console errors. Mobile profile only.
// Usage: PORT=<http.server port> [ENGINES=chromium,webkit14,webkit15] node tests/touch_e2e.mjs  -> shots/touch_e2e/
import { chromium, webkit, devices } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.resolve(ROOT, process.env.OUT || 'shots/touch_e2e');
fs.mkdirSync(OUT, { recursive: true });
const URL_ = `http://127.0.0.1:${process.env.PORT}/index.html?save=0&timescale=0&hour=12&map=route1&clouds=0&life=0&flags=has_run_shoes`;
const ALL = {
  chromium: { type: chromium, device: 'Pixel 7 landscape', cdp: true },
  webkit14: { type: webkit, device: 'iPhone 14 landscape', cdp: false },
  webkit15: { type: webkit, device: 'iPhone 15 landscape', cdp: false },
};
const ENGINES = (process.env.ENGINES || 'chromium,webkit14,webkit15').split(',');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const ST = () => {
  const s = window.kilumen.scene, p = s.player, i = s.input;
  const vis = [...document.querySelectorAll('#touchpad button')].filter((b) => { const cs = getComputedStyle(b); return !document.getElementById('touchpad').hidden && cs.visibility === 'visible' && +cs.opacity > 0.5 && cs.pointerEvents !== 'none'; }).map((b) => b.dataset.dir || b.dataset.btn).sort();
  return { x: p.x, y: p.y, facing: p.facing, state: p.state, mode: p.mode, held: [...i.held], touchB: !!i.touchB, b: !!(i.kbB || i.touchB),
    active: !!s.dialog?.active, type: s.dialog?.cur?.type || null, page: s.dialog?.cur?.i ?? null, vis: vis.join(','),
    rotate: getComputedStyle(document.getElementById('rotate')).display !== 'none', tpVis: getComputedStyle(document.querySelector('#touchpad [data-btn=a]')).visibility,
    scale: window.visualViewport?.scale ?? 1, scrollX: window.scrollX, scrollY: window.scrollY, sel: String(window.getSelection?.() || '') };
};

async function run(name) {
  const E = ALL[name];
  const dev = devices[E.device];
  const browser = await E.type.launch();
  const ctx = await browser.newContext({ ...dev, recordVideo: { dir: path.join(OUT, `_video_${name}`), size: dev.viewport } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  const results = [];
  const frames = [];
  const check = (id, ok, info = '') => { results.push({ id, ok: !!ok, info }); console.log(`${name} ${ok ? 'ok  ' : 'FAIL'} ${id} ${info}`); };
  const st = () => page.evaluate(ST);
  const shot = async (label) => { const f = path.join(OUT, `${name}_${String(frames.length).padStart(2, '0')}_${label}.png`); await page.screenshot({ path: f }); frames.push({ f, label }); };
  const center = (sel) => page.$eval(sel, (el) => { const b = el.getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; });
  const btn = (k) => center(['up', 'down', 'left', 'right'].includes(k) ? `#touchpad [data-dir=${k}]` : `#touchpad [data-btn=${k}]`);

  // ---- touch driver: CDP on Chromium, in-page pointer events on WebKit -----------------------------------------
  const cdp = E.cdp ? await ctx.newCDPSession(page) : null;
  const fingers = new Map(); // id -> [x, y]
  const pts = () => [...fingers].map(([id, [x, y]]) => ({ x, y, id, radiusX: 4, radiusY: 4, force: 1 }));
  const synth = (type, id, x, y) => page.evaluate(([type, id, x, y]) => {
    window.__ptgt ||= {};
    const t = type === 'pointerdown' ? document.elementFromPoint(x, y) : window.__ptgt[id] || document.elementFromPoint(x, y);
    if (type === 'pointerdown') window.__ptgt[id] = t;
    if (type === 'pointerup' || type === 'pointercancel') delete window.__ptgt[id];
    t?.dispatchEvent(new PointerEvent(type, { pointerId: 100 + id, pointerType: 'touch', isPrimary: id === 1, clientX: x, clientY: y, bubbles: true, cancelable: true, composed: true, buttons: type === 'pointerup' ? 0 : 1 }));
  }, [type, id, x, y]);
  const T = {
    async down(id, [x, y]) { fingers.set(id, [x, y]); if (cdp) await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pts() }); else await synth('pointerdown', id, x, y); },
    async move(id, [x, y], steps = 6) {
      const [x0, y0] = fingers.get(id);
      for (let k = 1; k <= steps; k++) {
        const p = [x0 + ((x - x0) * k) / steps, y0 + ((y - y0) * k) / steps]; fingers.set(id, p);
        if (cdp) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pts() }); else await synth('pointermove', id, p[0], p[1]);
        await sleep(16);
      }
    },
    async up(id) {
      const [x, y] = fingers.get(id); fingers.delete(id);
      // CDP: a touchMove without this finger lifts just it (one event per changed point); touchEnd lifts the last one
      if (cdp) await cdp.send('Input.dispatchTouchEvent', fingers.size ? { type: 'touchMove', touchPoints: pts() } : { type: 'touchEnd', touchPoints: [] });
      else await synth('pointerup', id, x, y);
    },
    async cancel() {
      if (cdp) await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
      else for (const [id, [x, y]] of fingers) await synth('pointercancel', id, x, y);
      fingers.clear();
    },
    tap: ([x, y]) => page.touchscreen.tap(x, y),
  };
  const kind = cdp ? 'CDP touch' : 'synthetic pointer (touch)';

  try {
    await page.goto(URL_);
    await page.waitForFunction(() => window.kilumen?.scene?.tileset, null, { timeout: 20000 });
    await page.evaluate(() => window.kilumen.ready);
    const plat = await page.evaluate(() => window.kilumen.platform.id);
    check('0 mobile profile', plat === 'mobile', plat);
    // an open cell: 3 walkable cells in every direction, no NPC; and a sign with a walkable cell in front
    const spots = await page.evaluate(async () => {
      const { Col } = await import('./src/overworld/constants.js');
      const s = window.kilumen.scene, m = s.map;
      const free = (x, y) => m.inBounds(x, y) && m.code(x, y) === Col.WALK && !m.npcAt(x, y) && !m.signs.some((g) => g.x === x && g.y === y);
      const D = [[0, -1], [0, 1], [-1, 0], [1, 0]];
      let open = null;
      for (let y = 3; y < m.height - 3 && !open; y++) for (let x = 3; x < m.width - 3 && !open; x++)
        if (free(x, y) && D.every(([dx, dy]) => [1, 2, 3, 4].every((k) => free(x + dx * k, y + dy * k)))) open = { x, y };
      let talk = null;
      for (const g of m.signs) {
        for (const [dx, dy, f] of [[0, 1, 'up'], [0, -1, 'down'], [1, 0, 'left'], [-1, 0, 'right']]) if (!talk && free(g.x + dx, g.y + dy)) talk = { x: g.x + dx, y: g.y + dy, facing: f, id: g.id };
      }
      return { open, talk, w: m.width, h: m.height };
    });
    check('0 spots found', spots.open && spots.talk, JSON.stringify(spots));
    const place = (p, facing = 'down') => page.evaluate(([p, f]) => { const s = window.kilumen.scene; s.player.place(p.x, p.y, f); s.player.mode = 'walk'; }, [p, facing]);
    const settle = async () => { for (let k = 0; k < 40; k++) { const s = await st(); if (s.state === 'idle') return s; await sleep(25); } return st(); };
    await page.waitForFunction(() => document.fonts?.status !== 'loading'); await sleep(600); // let the first map frame paint
    await shot('start');

    // ---- (1) hold each direction, release stops, slide -----------------------------------------------------------
    const DV = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
    for (const d of ['up', 'down', 'left', 'right']) {
      await place(spots.open); await sleep(80);
      const s0 = await st();
      await T.down(1, await btn(d)); await sleep(450);
      const s1 = await st();
      if (d === 'right') await shot('hold_right');
      await T.up(1);
      const s2 = await settle(); await sleep(300); const s3 = await st();
      const [dx, dy] = DV[d];
      const moved = (s1.x - s0.x) * dx + (s1.y - s0.y) * dy;
      check(`1 hold ${d} moves ${d}`, s1.facing === d && moved >= 1 && (dx ? s1.y === s0.y : s1.x === s0.x), `moved ${moved} tile(s), facing ${s1.facing} [${kind}]`);
      check(`1 release ${d} stops`, s2.held.length === 0 && s3.x === s2.x && s3.y === s2.y && s3.state === 'idle', `held=[${s2.held}] stop at ${s2.x},${s2.y}`);
    }
    {
      await place(spots.open); await sleep(80);
      const s0 = await st();
      await T.down(1, await btn('left')); await sleep(450);
      const s1 = await st();
      await T.move(1, await btn('up'), 8); await sleep(450);
      const s2 = await st();
      await T.up(1); await settle();
      check('1 slide left -> up without lifting', s1.x < s0.x && s1.facing === 'left' && s2.facing === 'up' && s2.y < s0.y && s2.held.length === 1, `(${s0.x},${s0.y}) -> (${s1.x},${s1.y}) -> (${s2.x},${s2.y}) facing ${s2.facing}`);
    }

    // ---- (2) run: hold B + d-pad (multi-touch) ---------------------------------------------------------------------
    {
      await place(spots.open); await sleep(80);
      const s0 = await st();
      await T.down(2, await btn('b')); await T.down(1, await btn('right')); await sleep(400);
      const s1 = await st();
      await shot('run_b_right');
      await T.up(1); await sleep(50); const s1b = await st(); await T.up(2);
      const s2 = await settle(); await sleep(200); const s3 = await st();
      check('2 hold B + right runs', s1.mode === 'run' && s1.x > s0.x && s1.touchB, `mode=${s1.mode} moved ${s1.x - s0.x} [${kind}]`);
      check('2 lift d-pad keeps B, lift B clears', s1b.touchB && !s3.touchB && s3.held.length === 0 && s3.x === s2.x, `B after d-pad lift=${s1b.touchB}, after B lift=${s3.touchB}`);
    }

    // ---- (2)(3)(6) A talks to a sign; latency; dialogue controls -------------------------------------------------------
    {
      await place(spots.talk, spots.talk.facing); await sleep(150);
      await page.evaluate(() => {
        window.__lat = null; const i = window.kilumen.scene.input, orig = i.poll.bind(i); let t0 = null;
        document.getElementById('touchpad').addEventListener('pointerdown', () => { t0 = performance.now(); }, { once: true, capture: true });
        let n = 0; i.poll = () => { const had = i.aQueued; if (t0 != null) n++; const r = orig(); if (had && t0 != null && window.__lat == null) { window.__lat = performance.now() - t0; window.__latPolls = n; i.poll = orig; } return r; };
      });
      // finger DOWN on A and stay down: the dialogue must open on touchstart (no click / 300 ms delay)
      if (cdp) { await T.down(1, await btn('a')); await sleep(120); } else { await T.tap(await btn('a')); await sleep(120); }
      const sA = await st(); const [lat, latPolls] = await page.evaluate(() => [window.__lat, window.__latPolls]);
      if (cdp) await T.up(1);
      check('2 tap A talks to a sign', sA.active, `sign ${spots.talk.id}: type=${sA.type}`);
      // the press must be consumed by the FIRST game frame after pointerdown (no click / 300 ms path); headless WebKit's software rAF can space frames ~33 ms
      check('6 A reaches the game on touchstart, within 1 frame (no 300 ms delay)', lat != null && latPolls === 1 && lat < 50 && (!cdp || sA.active), `pointerdown -> game input poll ${lat == null ? '-' : lat.toFixed(1)} ms, consumed by frame #${latPolls} ${cdp ? '(dialogue open with the finger still down)' : ''}`);
      await sleep(400);
      const sD = await st();
      check('3 d-pad/SEL/DBG hidden, A/B shown', sD.vis === 'a,b', sD.vis);
      await shot('talk_sign');
      // B advances (closes a one-page sign / steps pages)
      for (let k = 0; k < 6 && (await st()).active; k++) { await T.tap(await btn('b')); await sleep(200); }
      const sB = await st(); await sleep(400); const sB2 = await st();
      check('2 B advances to close', !sB.active, '');
      check('3 controls back after close', sB2.vis === 'a,b,debug,down,left,right,select,up', sB2.vis);
    }
    {
      // two-page say: tap the box -> page 2; A closes
      await page.evaluate(() => { window.__res = null; window.kilumen.scene.say(['First page.', 'Second page.'], { name: 'Kit' }).then(() => { window.__res = 'closed'; }); });
      await sleep(400);
      const box = await page.$eval('.dlg-box', (el) => { const b = el.getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; });
      await T.tap(box); await sleep(200);
      const s1 = await st();
      await T.tap(await btn('a')); await sleep(200);
      check('3 tap box advances, A closes', s1.page === 1 && s1.active && (await page.evaluate(() => window.__res)) === 'closed', `page after box tap=${s1.page}`);
      // ask: list -> up/down back, row tap picks; B backs out
      await page.evaluate(() => { window.__res = null; window.kilumen.scene.ask(['Pick one?'], ['Yes', 'Not now', 'Ask later'], { name: 'Kit' }).then((i) => { window.__res = i; }); });
      await sleep(400);
      const sL = await st();
      check('3 list shows d-pad up/down only', sL.vis === 'a,b,down,up', sL.vis);
      await T.tap(await btn('down')); await sleep(120);
      const selAfterDown = await page.evaluate(() => window.kilumen.scene.dialog.cur?.sel);
      await shot('ask_list');
      const rows = await page.$$eval('.dlg-list li', (ls) => ls.map((l) => { const b = l.getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; }));
      await T.tap(rows[2]); await sleep(250);
      check('3 d-pad down moves the list, tapping row 3 picks it', selAfterDown === 1 && (await page.evaluate(() => window.__res)) === 2, `sel after down=${selAfterDown} picked=${await page.evaluate(() => window.__res)}`);
      await page.evaluate(() => { window.__res = null; window.kilumen.scene.ask(['Pick one?'], ['Yes', 'No'], { name: 'Kit' }).then((i) => { window.__res = i; }); });
      await sleep(300); await T.tap(await btn('b')); await sleep(250);
      check('2 B goes back (cancels the list)', (await page.evaluate(() => window.__res)) === 1, `res=${await page.evaluate(() => window.__res)}`);
      await sleep(300);
    }

    // ---- (4) no stuck input ----------------------------------------------------------------------------------------
    const stuck = async (label, fn) => {
      await place(spots.open); await sleep(80);
      await T.down(1, await btn('right')); await T.down(2, await btn('b')); await sleep(200);
      const s1 = await st();
      await fn();
      await sleep(250); const s2 = await settle(); await sleep(250); const s3 = await st();
      if (fingers.size) await T.cancel();
      await page.evaluate(() => { window.__fakeHidden = false; });
      check(`4 ${label} clears input`, s1.held.length && s1.touchB && !s2.held.length && !s2.touchB && s3.x === s2.x && s3.y === s2.y, `before held=[${s1.held}] B=${s1.touchB} after held=[${s2.held}] B=${s2.touchB}`);
    };
    await stuck('touchcancel', () => T.cancel());
    await stuck('lift outside the buttons', async () => {
      const W = dev.viewport.width, H = dev.viewport.height;
      await T.move(1, [W / 2, H / 3]); await T.move(2, [W / 2 + 40, H / 3]); await T.up(1); await T.up(2);
    });
    await stuck('page blur', () => page.evaluate(() => window.dispatchEvent(new Event('blur'))));
    await stuck('visibilitychange (hidden)', () => page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (window.__fakeHidden ? 'hidden' : 'visible') });
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => !!window.__fakeHidden });
      window.__fakeHidden = true; document.dispatchEvent(new Event('visibilitychange'));
    }));
    {
      // rotate to portrait while holding, then back
      const L = dev.viewport;
      await stuck('rotate to portrait and back', async () => {
        await page.evaluate(() => document.fullscreenElement && document.exitFullscreen().catch(() => {})); await sleep(150); // landscape.js asks for fullscreen on the first tap
        await page.setViewportSize({ width: L.height, height: L.width }); await sleep(350);
        const sp = await st();
        await shot('portrait_rotate');
        check('7 portrait shows the rotate screen, hides the controls', sp.rotate && sp.tpVis === 'hidden', `rotate=${sp.rotate} touchpad=${sp.tpVis}`);
        await page.setViewportSize(L); await sleep(350);
      });
      const sl = await st();
      check('7 back in landscape: controls back, no rotate screen', !sl.rotate && sl.vis === 'a,b,debug,down,left,right,select,up', sl.vis);
    }

    // ---- (5) no scroll / zoom / selection / callout / context menu ------------------------------------------------------
    {
      const css = await page.evaluate(() => {
        const g = (sel) => { const el = document.querySelector(sel); const cs = getComputedStyle(el); return { ta: cs.touchAction, us: [cs.userSelect, cs.webkitUserSelect].includes('none') ? 'none' : cs.userSelect, co: cs.webkitTouchCallout ?? (CSS.supports('-webkit-touch-callout', 'none') ? cs.getPropertyValue('-webkit-touch-callout') : 'unsupported') }; };
        return { body: g('body'), canvas: g('#world'), a: g('#touchpad [data-btn=a]'), up: g('#touchpad [data-dir=up]'), box: g('.dlg-box'), vp: document.querySelector('meta[name=viewport]').content };
      });
      const ta = (v) => v.ta === 'none';
      const us = (v) => v.us === 'none';
      check('5 touch-action:none on body/canvas/buttons/box', ta(css.body) && ta(css.canvas) && ta(css.a) && ta(css.up) && ta(css.box), JSON.stringify({ body: css.body.ta, canvas: css.canvas.ta, a: css.a.ta, box: css.box.ta }));
      check('5 user-select:none', us(css.body) && us(css.canvas) && us(css.a) && us(css.box), JSON.stringify({ body: css.body.us, a: css.a.us, box: css.box.us }));
      if (!cdp) {
        // desktop WebKit builds don't implement -webkit-touch-callout (iOS only), so fall back to checking the shipped rule
        const rule = await page.evaluate(async () => (await (await fetch('style.css')).text()).split('}').filter((t) => /body\.touch-ui/.test(t) && /-webkit-touch-callout:\s*none/.test(t)).length); // WebKit drops unknown props from cssRules
        const computed = [css.body, css.a, css.canvas].every((v) => v.co === 'none');
        check('5 -webkit-touch-callout:none (WebKit)', computed || (css.body.co === 'unsupported' && rule >= 2), computed ? 'computed none' : `not implemented in this WebKit build; ${rule} touch-ui rules set it`);
      }
      check('5 viewport meta: no user scaling, viewport-fit=cover', /user-scalable=no/.test(css.vp) && /maximum-scale=1/.test(css.vp) && /viewport-fit=cover/.test(css.vp), css.vp);
      await page.evaluate(() => {
        window.__cm = []; window.__gs = [];
        window.addEventListener('contextmenu', (e) => window.__cm.push(e.defaultPrevented), { capture: false });
        for (const t of ['gesturestart', 'dblclick']) document.addEventListener(t, (e) => window.__gs.push([t, e.defaultPrevented]));
      });
      const W = dev.viewport.width, H = dev.viewport.height;
      // double-tap the canvas
      await T.tap([W / 2, H / 3]); await sleep(90); await T.tap([W / 2, H / 3]); await sleep(400);
      let s = await st();
      check('5 double-tap: no zoom', s.scale === 1, `scale=${s.scale}`);
      if (cdp) {
        await cdp.send('Input.synthesizePinchGesture', { x: W / 2, y: H / 3, scaleFactor: 2.5, relativeSpeed: 800, gestureSourceType: 'touch' });
        await sleep(400); s = await st();
        check('5 pinch: no zoom', s.scale === 1, `scale=${s.scale}`);
        // long press on canvas, A and the dialogue text
        await T.down(1, [W / 2, H / 3]); await sleep(900); await T.up(1);
        await T.down(1, await btn('a')); await sleep(900); await T.up(1); await sleep(300);
        await page.evaluate(() => { window.kilumen.scene.say(['Long press this text.'], { name: 'Kit' }); }); // don't await the say() promise
        await sleep(300);
        const tx = await center('.dlg-text');
        await T.down(1, tx); await sleep(900); await T.up(1); await sleep(200);
        s = await st();
        const cm = await page.evaluate(() => window.__cm);
        check('5 long-press: no context menu, no selection', cm.every((p) => p) && s.sel === '', `contextmenu events=${JSON.stringify(cm)} selection="${s.sel}"`);
        for (let k = 0; k < 4 && (await st()).active; k++) { await T.tap(await btn('a')); await sleep(200); }
        // swipe on the canvas: no page scroll
        await T.down(1, [W * 0.6, H * 0.7]); await T.move(1, [W * 0.6, H * 0.1], 10); await T.up(1); await sleep(200);
        s = await st();
        check('5 swipe: no page scroll', s.scrollX === 0 && s.scrollY === 0, `scroll=${s.scrollX},${s.scrollY}`);
      } else {
        // WebKit: long-press / pinch need a touch sequence Playwright can't send; check the handlers that block them instead
        const r = await page.evaluate(() => {
          const ev = (t, C = Event) => { const e = new C(t, { bubbles: true, cancelable: true }); document.querySelector('#world').dispatchEvent(e); return e.defaultPrevented; };
          return { contextmenu: ev('contextmenu', MouseEvent), gesturestart: ev('gesturestart'), dblclick: ev('dblclick', MouseEvent), sel: (() => { const r = document.createRange(); r.selectNodeContents(document.querySelector('#touchpad [data-btn=a]')); const ss = document.onselectstart; const e = new Event('selectstart', { bubbles: true, cancelable: true }); document.querySelector('#touchpad [data-btn=a]').dispatchEvent(e); return e.defaultPrevented; })() };
        });
        check('5 contextmenu / gesturestart / dblclick prevented (WebKit)', r.contextmenu && r.gesturestart && r.dblclick, JSON.stringify(r));
        s = await st();
        check('5 no scroll, no selection', s.scrollX === 0 && s.scrollY === 0 && s.sel === '', `scroll=${s.scrollX},${s.scrollY}`);
      }
    }

    // ---- (6) hit areas >= 44 px (probe the hit-test, not only the box) -------------------------------------------------
    {
      const hits = await page.evaluate(() => [...document.querySelectorAll('#touchpad button')].map((b) => {
        const r = b.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        const ext = (dx, dy) => { let k = 0; while (k < 80 && document.elementFromPoint(cx + dx * k, cy + dy * k)?.closest('button') === b) k++; return k; };
        return { id: b.dataset.dir || b.dataset.btn, w: ext(-1, 0) + ext(1, 0) - 1, h: ext(0, -1) + ext(0, 1) - 1, box: [Math.round(r.width), Math.round(r.height)] };
      }));
      const small = hits.filter((h) => h.w < 44 || h.h < 44);
      check('6 every control hit area >= 44x44 px', !small.length, hits.map((h) => `${h.id}:${h.w}x${h.h}`).join(' '));
    }

    // ---- (7) safe-area insets ------------------------------------------------------------------------------------------
    {
      const rect = (sel) => page.$eval(sel, (el) => { const b = el.getBoundingClientRect(); return { l: b.left, r: b.right, b: b.bottom }; });
      const d0 = await rect('#touchpad .dpad'), a0 = await rect('#touchpad [data-btn=a]');
      await page.evaluate(() => { const s = document.body.style; s.setProperty('--safe-left', '47px'); s.setProperty('--safe-right', '47px'); s.setProperty('--safe-bottom', '21px'); });
      await page.evaluate(() => { window.__res = null; window.kilumen.scene.say(['Safe areas.'], { name: 'Kit' }).then(() => { window.__res = 1; }); });
      await sleep(400);
      const d1 = await rect('#touchpad .dpad'), a1 = await rect('#touchpad [data-btn=a]'), bx = await rect('.dlg-box');
      await shot('safe_area_47_21');
      const W = dev.viewport.width, H = dev.viewport.height;
      check('7 safe-area insets move d-pad, A/B and the box', Math.round(d1.l - d0.l) === 47 && Math.round(a0.r - a1.r) === 47 && Math.round(a0.b - a1.b) === 21 && bx.l >= 47 && H - bx.b >= 21,
        `dpad +${Math.round(d1.l - d0.l)} A -${Math.round(a0.r - a1.r)} up ${Math.round(a0.b - a1.b)}; box left ${Math.round(bx.l)} bottom gap ${Math.round(H - bx.b)}`);
      await T.tap(await btn('a')); await sleep(200);
      await page.evaluate(() => { const s = document.body.style; for (const k of ['--safe-left', '--safe-right', '--safe-bottom']) s.setProperty(k, 'env(safe-area-inset-' + k.slice(7) + ', 0px)'); });
    }
    await shot('end');
  } catch (e) {
    check('X exception', false, String(e).slice(0, 300));
  }
  // ---- (8) console errors ----------------------------------------------------------------------------------------------
  check('8 no console errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  const video = page.video();
  await ctx.close(); await browser.close();
  const vp = video ? await video.path() : null;
  if (vp && fs.existsSync(vp)) { fs.renameSync(vp, path.join(OUT, `${name}.webm`)); fs.rmSync(path.dirname(vp), { recursive: true, force: true }); }
  return { engine: name, device: E.device, touch: kind, pass: results.every((r) => r.ok), results, frames: frames.map((f) => path.relative(OUT, f.f)) };
}

const report = [];
for (const n of ENGINES) report.push(await run(n));
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 1));
for (const r of report) console.log(`${r.engine} (${r.device}, holds via ${r.touch}): ${r.pass ? 'PASS' : 'FAIL'} ${r.results.filter((x) => x.ok).length}/${r.results.length}`);
process.exit(report.every((r) => r.pass) ? 0 : 1);
