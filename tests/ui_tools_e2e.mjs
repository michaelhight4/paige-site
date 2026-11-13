// UI tools pass e2e + clips (Oct 22, 2026). Local only. Checks the four wired-in pieces and records clips:
//  (1) spatial nav (lrud-spatial) with keyboard and a fake standard gamepad, visible focus ring on the selected item;
//  (2) SortableJS drag-to-reorder on Team (mouse / touch) and drag-to-swap on the Field Archive, taps still activate;
//  (3) ?dev=1 tuning panel (lil-gui) opens, edits the ACTIVE profile only, exports JSON; never loads without ?dev=1;
//  (4) Kenney CC0 placeholder glyphs in hints / empty states; hit areas >= 44 px on phones; no console errors.
//  (5) UI tools 2: pixelarticons, Kenney UI slider/check placeholders, floating-ui tips stay in the viewport (hover, selection,
//      long-press), auto-animate on ask() rows, anime.js battle menu / HP drain / level-up, reduced motion (OS + ?motion=reduce).
//  pc1080 = Chromium 1920x1080 for the UI tools 2 clips (OUT=shots/ui_tools2 ENGINES=pc1080,webkit14,chromium).
// PC: Chromium 1366x768 (platform=pc). Phones: Pixel 7 landscape (Chromium, CDP touch), iPhone 14/15 landscape (WebKit,
// in-page pointerType "touch" events, labelled synthetic, same as tests/touch_e2e.mjs).
// Note: the game's keyboard input has no "tap queue", so a key down+up inside one frame is dropped; keys are held 70 ms here.
// Usage: PORT=<http.server port> [ENGINES=pc,chromium,webkit14,webkit15] node tests/ui_tools_e2e.mjs -> shots/ui_tools/
import { chromium, webkit, devices } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.resolve(ROOT, process.env.OUT || 'shots/ui_tools');
fs.mkdirSync(OUT, { recursive: true });
const BASE = `http://127.0.0.1:${process.env.PORT || 8093}/index.html?save=0&timescale=0&hour=12&clouds=0&life=0&uidemo=1&map=brookhollow`;
const ALL = {
  pc: { type: chromium, ctx: { viewport: { width: 1366, height: 768 } }, p: 'pc' },
  pc1080: { type: chromium, ctx: { viewport: { width: 1920, height: 1080 } }, p: 'pc' }, // UI tools 2 clips
  chromium: { type: chromium, device: 'Pixel 7 landscape', cdp: true, p: 'mobile' },
  webkit14: { type: webkit, device: 'iPhone 14 landscape', p: 'mobile' },
  webkit15: { type: webkit, device: 'iPhone 15 landscape', p: 'mobile' },
};
const ENGINES = (process.env.ENGINES || 'pc,chromium,webkit14,webkit15').split(',');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = []; let fails = 0;
const ok = (eng, name, pass, info = '') => { results.push(`${pass ? 'PASS' : 'FAIL'} ${eng} ${name}${info ? ' - ' + info : ''}`); if (!pass) fails++; };

async function run(eng) {
  const E = ALL[eng];
  const browser = await E.type.launch();
  const ctx = await browser.newContext({ ...(E.device ? devices[E.device] : E.ctx), recordVideo: { dir: OUT, size: E.device ? undefined : E.ctx.viewport }, acceptDownloads: true });
  // fake standard-mapping gamepad the test can drive (window.__pad.buttons[i] = 1)
  await ctx.addInitScript(() => {
    const pad = { index: 0, id: 'test pad', mapping: 'standard', connected: true, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) };
    window.__pad = pad; window.__press = (i, on) => { pad.buttons[i] = { pressed: on, value: on ? 1 : 0 }; };
    navigator.getGamepads = () => [window.__usePad ? pad : null];
  });
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', (e) => errs.push(String(e))); page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  const bad404 = []; page.on('response', (r) => { if (r.status() === 404) bad404.push(new URL(r.url()).pathname); });
  // a missing battle creature sprite (another worker's art set) is reported, not counted as a UI console error
  const notArt404 = (m) => !(/status of 404/.test(m) && bad404.length && bad404.every((u) => /^\/art\/characters\/.*\/battle\//.test(u)));
  const cdp = E.cdp ? await ctx.newCDPSession(page) : null;
  const go = async (extra) => {
    await page.goto(`${BASE}&platform=${E.p}${extra}`);
    await page.waitForFunction(() => window.kilumen?.ui, null, { timeout: 30000 }); await sleep(900);
  };
  const key = async (k) => { await page.keyboard.down(k); await sleep(70); await page.keyboard.up(k); await sleep(160); };
  const pad = async (b) => { await page.evaluate((b) => window.__press(b, true), b); await sleep(90); await page.evaluate((b) => window.__press(b, false), b); await sleep(160); };
  const sel = () => page.evaluate(() => window.kilumen.ui.top?.sel);
  const center = (q) => page.$eval(q, (e) => { const r = e.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; });
  const names = () => page.$$eval('.ui-card[data-i]', (a) => a.map((e) => e.querySelector('.nm span')?.textContent));
  const slots = () => page.$$eval('.ui-box .ui-slot', (a) => a.map((e) => (e.querySelector('img')?.getAttribute('src') || '').split('/').pop()));
  const modal = () => page.evaluate(() => !!window.kilumen.ui.modal);
  const sortOn = (q) => page.waitForFunction((q) => document.querySelector(q)?.dataset.sortable === 'on', q, { timeout: 8000 }).then(() => true, () => false);
  // drag: mouse on PC, CDP touch on Pixel, in-page touch pointer events on WebKit (hold 260 ms > Sortable's 160 ms touch delay)
  const drag = async ([x0, y0], [x1, y1]) => {
    const steps = 14;
    if (!E.device) { await page.mouse.move(x0, y0); await page.mouse.down(); for (let k = 1; k <= steps; k++) { await page.mouse.move(x0 + (x1 - x0) * k / steps, y0 + (y1 - y0) * k / steps); await sleep(25); } await sleep(120); await page.mouse.up(); }
    else if (cdp) {
      const tp = (x, y) => ({ touchPoints: [{ x, y, id: 1, radiusX: 4, radiusY: 4, force: 1 }] });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', ...tp(x0, y0) }); await sleep(260);
      for (let k = 1; k <= steps; k++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', ...tp(x0 + (x1 - x0) * k / steps, y0 + (y1 - y0) * k / steps) }); await sleep(25); }
      await sleep(120); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    } else {
      const ev = (type, x, y) => page.evaluate(([type, x, y]) => {
        const t = window.__dragT && type !== 'pointerdown' ? document.elementFromPoint(x, y) || document.body : document.elementFromPoint(x, y);
        if (type === 'pointerdown') window.__dragT = t;
        const tgt = type === 'pointerdown' ? t : (t || document.body);
        tgt.dispatchEvent(new PointerEvent(type, { pointerId: 7, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y, bubbles: true, cancelable: true, composed: true, buttons: type === 'pointerup' ? 0 : 1 }));
      }, [type, x, y]);
      await ev('pointerdown', x0, y0); await sleep(260);
      for (let k = 1; k <= steps; k++) { await ev('pointermove', x0 + (x1 - x0) * k / steps, y0 + (y1 - y0) * k / steps); await sleep(25); }
      await sleep(120); await ev('pointerup', x1, y1);
    }
    await sleep(700);
  };
  const tap = async ([x, y]) => { if (!E.device) await page.mouse.click(x, y); else await page.touchscreen.tap(x, y); await sleep(450); };
  const synthetic = E.device && !cdp ? ' (synthetic touch pointer events)' : '';

  // ---- Team: nav + ring + drag + tap ----
  await go('&ui=team');
  ok(eng, 'lil-gui not loaded without ?dev=1', await page.evaluate(() => !document.querySelector('.kil-devpanel') && !performance.getEntriesByType('resource').some((r) => /lil-gui|devpanel/.test(r.name))));
  ok(eng, 'Team sortable mounted', await sortOn('.ui-team'));
  if (!E.device) {
    await key('ArrowRight'); const a = await sel(); await key('ArrowDown'); const b = await sel(); await key('ArrowLeft'); const c = await sel();
    ok(eng, 'keyboard spatial nav R,D,L', a === 1 && b === 3 && c === 2, `${a},${b},${c}`);
    const ring = await page.$eval('.ui-card.sel', (e) => getComputedStyle(e).boxShadow);
    ok(eng, 'focus ring on selected card', /rgb\(255, 255, 255\)/.test(ring) && /px/.test(ring), ring.slice(0, 80));
    await page.evaluate(() => { window.__usePad = true; });
    await pad(12); const u = await sel(); await pad(15); const r = await sel(); await pad(14); const l = await sel();
    ok(eng, 'gamepad d-pad nav U,R,L', u === 0 && r === 1 && l === 0, `${u},${r},${l}`);
    const glyph = await page.$$eval('.ui-hint img[data-placeholder="kenney"]', (a) => a.map((e) => e.getAttribute('src').split('/').pop()));
    ok(eng, 'controller hint shows Kenney glyphs', glyph.some((g) => g.startsWith('xbox_')), glyph.join(','));
    await pad(0); ok(eng, 'gamepad A opens card menu', await modal()); await pad(1); ok(eng, 'gamepad B closes it', !(await modal()));
    await page.evaluate(() => { window.__usePad = false; }); await key('ArrowLeft');
  } else {
    const hs = await page.$$eval('.ui-card[data-i]', (a) => a.map((e) => Math.min(e.getBoundingClientRect().width, e.getBoundingClientRect().height)));
    ok(eng, 'team card hit areas >= 44px', hs.every((h) => h >= 44), hs.map(Math.round).join(','));
  }
  const before = await names();
  await drag(await center('.ui-card[data-i="2"]'), await center('.ui-card[data-i="0"]'));
  const after = await names();
  ok(eng, `drag reorders Team${synthetic}`, after[0] === before[2] && after.length === before.length && !(await modal()), `${before.join('/')} -> ${after.join('/')}`);
  const lead = await page.evaluate(() => window.kilumen.ui.party()[0]?.nickname || window.kilumen.ui.party()[0]?.species);
  ok(eng, 'party data follows DOM order', !!lead && !!after[0] && after[0].toLowerCase().includes(String(lead).toLowerCase().slice(0, 3)) || after[0] === lead, String(lead));
  await page.screenshot({ path: `${OUT}/${eng}_team_after_drag.png` });
  if (await page.$('.ui-card[data-i="1"]')) { await tap(await center('.ui-card[data-i="1"]')); ok(eng, 'tap (no drag) still opens the card menu', await modal()); }
  else ok(eng, 'tap (no drag) still opens the card menu', false, 'no team cards after the drag (see drag result)');
  if (await modal()) { if (E.device) await page.evaluate(() => window.kilumen.ui.modal?.close?.() ?? window.kilumen.ui.back()); else await key('Escape'); await sleep(300); }

  // ---- Field Archive: slot size, drag swap, A-pick/A-swap ----
  await go('&ui=archive');
  ok(eng, 'Archive sortable mounted', await sortOn('.ui-box'));
  const sz = await page.$$eval('.ui-box .ui-slot', (a) => a.map((e) => { const r = e.getBoundingClientRect(); return Math.min(r.width, r.height); }));
  const ov = await page.$eval('.ui-box', (b) => b.scrollWidth - b.clientWidth);
  ok(eng, 'archive slots >= 44px, no sideways overflow', Math.min(...sz) >= 44 && ov <= 1, `min ${Math.round(Math.min(...sz))}px, overflow ${ov}px`);
  const s0 = await slots(); const from = s0.findIndex(Boolean), to = s0.findIndex((v, i) => !v && i > from);
  await drag(await center(`.ui-slot[data-i="${from}"]`), await center(`.ui-slot[data-i="${to}"]`));
  const s1 = await slots();
  ok(eng, `drag swaps archive slots${synthetic}`, s1[to] === s0[from] && !s1[from], `${from}->${to}`);
  await page.screenshot({ path: `${OUT}/${eng}_archive_after_drag.png` });
  if (!E.device) {
    const s2 = await slots(); const f = s2.findIndex(Boolean);
    await page.evaluate((f) => { const u = window.kilumen.ui; u.top.sel = f; u._markSel(); }, f);
    await key('KeyZ'); const held = await page.$$eval('.ui-slot.held', (a) => a.length);
    await key('ArrowRight'); await key('KeyZ');
    const s3 = await slots();
    ok(eng, 'keyboard A pick-up / A swap', held === 1 && s3[f + 1] === s2[f] && s3[f] === s2[f + 1], `held=${held}`);
  }

  // ---- ?dev=1 tuning panel ----
  await go('&ui=team&dev=1');
  const panel = await page.waitForSelector('.kil-devpanel', { timeout: 8000 }).then(() => true, () => false);
  ok(eng, '?dev=1 opens tuning panel for the active profile', panel && (await page.$eval('.kil-devpanel', (e) => e.dataset.platform)) === E.p);
  if (panel) {
    const frozen = await page.evaluate(() => Object.isFrozen(window.kilumen.platform.profile.ui) && window.kilumen.ui.cfg !== window.kilumen.platform.profile.ui);
    ok(eng, 'panel edits a copy (profile file object untouched)', frozen);
    const dl = page.waitForEvent('download', { timeout: 8000 }).catch(() => null);
    await page.evaluate(() => { const b = [...document.querySelectorAll('.kil-devpanel button, .kil-devpanel .name')].find((e) => /Export .*\.ui\.json/.test(e.textContent)); (b.closest('button') || b).click(); });
    const d = await dl; let body = null;
    if (d) { const p = path.join(OUT, `${eng}_${d.suggestedFilename()}`); await d.saveAs(p); body = JSON.parse(fs.readFileSync(p, 'utf8')); }
    ok(eng, 'export downloads <id>.ui.json', !!d && d.suggestedFilename() === `${E.p}.ui.json` && !!body?.ui, d?.suggestedFilename());
    await page.screenshot({ path: `${OUT}/${eng}_devpanel.png` });
  }
  // ---- UI tools 2 (Oct 22, 2026): pixelarticons, Kenney UI placeholders, floating-ui tips, auto-animate, anime.js, reduced motion ----
  const vw = () => page.evaluate(() => [innerWidth, innerHeight]);
  const tipBox = () => page.evaluate(() => { const t = document.querySelector('#ui-tip'); if (!t || t.hidden || !t.classList.contains('show')) return null; const r = t.getBoundingClientRect(); return { x: r.x, y: r.y, r: r.right, b: r.bottom, w: r.width, txt: t.textContent }; });
  const inView = (b, [w, h]) => !!b && b.x >= 0 && b.y >= 0 && b.r <= w + 0.5 && b.b <= h + 0.5 && b.w > 40;
  const waitTip = async (ms = 1500) => { const t0 = Date.now(); let b = null; while (Date.now() - t0 < ms && !(b = await tipBox())) await sleep(80); await sleep(120); return (await tipBox()) || b; };
  const libs = () => page.evaluate(() => performance.getEntriesByType('resource').map((r) => r.name).filter((n) => /auto-animate|floating-ui|animejs/.test(n)).map((n) => n.split('/').slice(-2, -1)[0]));
  const hold = async ([x, y], ms) => { // a still long-press: CDP touch on Pixel, in-page touch pointer events on WebKit
    if (cdp) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 2, radiusX: 4, radiusY: 4, force: 1 }] }); await sleep(ms); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); }
    else {
      const ev = (type) => page.evaluate(([type, x, y]) => { const t = document.elementFromPoint(x, y); t.dispatchEvent(new PointerEvent(type, { pointerId: 9, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y, bubbles: true, cancelable: true, composed: true, buttons: type === 'pointerup' ? 0 : 1 })); }, [type, x, y]);
      await ev('pointerdown'); await sleep(ms); await ev('pointerup');
    }
    await sleep(250);
  };
  await go('&ui=team');
  const px = await page.evaluate(() => ({ title: !!document.querySelector('.ui-title svg[data-icon^="pixelarticons:"]'), n: document.querySelectorAll('svg[data-icon^="pixelarticons:"]').length, aa: !!document.querySelector('.ui-team[data-aa]') }));
  ok(eng, 'pixelarticons in title + auto-animate container on Team', px.title && px.aa, JSON.stringify(px));
  let animCalls = 0;
  if (E.device) {
    await hold(await center('.ui-card[data-i="1"]'), 700);
    const tb = await waitTip(800);
    ok(eng, `long-press on a Team card shows a tip in view, no menu${synthetic}`, inView(tb, await vw()) && !(await modal()), JSON.stringify(tb));
    await sleep(300);
  } else {
    await page.mouse.move(10, 10); const c = await center('.ui-card[data-i="1"]'); await page.mouse.move(c[0] - 20, c[1]); await page.mouse.move(c[0], c[1], { steps: 4 });
    const tb = await waitTip(); ok(eng, 'mouse hover on a Team card shows a tip in view', inView(tb, await vw()), JSON.stringify(tb));
  }
  await page.evaluate(() => { window.__anims = 0; const o = Element.prototype.animate; Element.prototype.animate = function (...a) { window.__anims++; return o.apply(this, a); }; });
  await tap(await center('.ui-card[data-i="1"]'));
  animCalls = await page.evaluate(() => window.__anims);
  const askRows = await page.$$eval('.ui-modal li, .ui-ask li, [class*="ask"] li', (a) => a.map((e) => Math.round(e.getBoundingClientRect().height)));
  ok(eng, 'ask() menu rows animate in (auto-animate) and tips hide under the modal', (await modal()) && animCalls > 0 && !(await tipBox()), `animate() calls ${animCalls}, rows ${askRows.join(',')}`);
  if (await modal()) { if (E.device) await page.evaluate(() => window.kilumen.ui.modal?.close?.() ?? window.kilumen.ui.back()); else await key('Escape'); await sleep(300); }

  await go('&ui=kilindex');
  const tiles = await page.$$eval('[data-i][data-tip]', (a) => a.map((e) => +e.dataset.i));
  const corners = [...new Set([tiles[0], tiles[Math.min(tiles.length - 1, 3)], tiles[tiles.length - 1]])];
  const tipRes = [];
  for (const i of corners) { await page.evaluate((i) => { window.kilumen.ui.top.sel = -1; window.kilumen.ui._select(i, true); }, i); await sleep(250); const b = await waitTip(); tipRes.push([i, inView(b, await vw()), b && `${Math.round(b.x)},${Math.round(b.y)}-${Math.round(b.r)},${Math.round(b.b)}`]); }
  ok(eng, 'Kilindex tips stay inside the viewport (first / edge / last tile)', tipRes.every((r) => r[1]), JSON.stringify(tipRes) + ' vp ' + (await vw()).join('x'));
  await page.screenshot({ path: `${OUT}/${eng}_ui2_tip_kilindex.png` });

  await go('&ui=pack');
  const tabs = await page.$eval('.ui-tabs', (t) => ({ ov: t.scrollWidth - t.clientWidth, clip: [...t.children].filter((c) => c.scrollWidth > c.clientWidth + 1).length, icons: t.querySelectorAll('svg[data-icon]').length, h: Math.min(...[...t.children].map((c) => c.getBoundingClientRect().height)) }));
  ok(eng, 'Pack tabs: pixelarticons, no overflow, >= 44px', tabs.ov <= 1 && tabs.clip === 0 && tabs.icons >= 6 && tabs.h >= 44, JSON.stringify(tabs));
  await page.screenshot({ path: `${OUT}/${eng}_ui2_pack.png` });

  await go('&ui=options');
  const op = await page.evaluate(() => ({ sl: document.querySelectorAll('.kui-slider img[data-placeholder="kenney-ui"], .kui-slider[data-placeholder="kenney-ui"]').length, ck: document.querySelectorAll('.kui-check').length, ic: document.querySelectorAll('.opt-ico').length, minH: Math.min(...[...document.querySelectorAll('.ui-row[data-i]')].map((e) => e.getBoundingClientRect().height)) }));
  ok(eng, 'Options: Kenney UI slider / check placeholders + icons, rows >= 44px', op.sl >= 3 && op.ck >= 2 && op.ic >= 5 && op.minH >= 44, JSON.stringify(op));
  await page.screenshot({ path: `${OUT}/${eng}_ui2_options.png` });

  await go('&ui=battle');
  await page.waitForFunction(() => /bursts out/.test(document.querySelector('#b-msg')?.textContent || ''), null, { timeout: 8000 }).catch(() => {});
  await page.evaluate(() => window.kilumen.ui.top.handle({ a: true })); await sleep(1100);
  const cmds = await page.evaluate(() => ({ anime: window.kilumen.ui.fx.loaded.anime, shown: !document.querySelector('#b-cmds').hidden, n: document.querySelectorAll('#b-cmds .b-cmd').length }));
  await page.evaluate(() => window.kilumen.ui.top.handle({ a: true })); await sleep(700);
  const stb = await waitTip();
  ok(eng, 'battle: anime.js loaded lazily, menus in, skill tip in view', cmds.anime && cmds.shown && cmds.n === 4 && inView(stb, await vw()), JSON.stringify(cmds) + ' tip ' + JSON.stringify(stb));
  await page.screenshot({ path: `${OUT}/${eng}_ui2_battle_skills.png` });
  await page.evaluate(() => window.kilumen.ui.top.handle({ a: true }));
  const ghost = await page.waitForFunction(() => document.querySelector('#foe-hp > s.ax-ghost'), null, { timeout: 5000 }).then(() => true, () => false);
  await sleep(1200);
  const fw = await page.$eval('#foe-hp > i', (e) => parseFloat(e.style.width));
  ok(eng, 'battle: anime.js HP drain (ghost chunk, bar ends lower)', ghost && fw < 100, `ghost ${ghost}, width ${fw}%`);
  await go('&ui=levelup'); await page.waitForSelector('.b-lvup', { timeout: 8000 }).catch(() => {}); await sleep(500);
  ok(eng, 'level-up box uses the anime.js timeline', await page.evaluate(() => !!document.querySelector('.b-lvup.ax')));
  await page.screenshot({ path: `${OUT}/${eng}_ui2_levelup.png` });

  // reduced motion: OS setting and ?motion=reduce both skip auto-animate + anime.js (never fetched), tips still work
  for (const [label, extra] of [['prefers-reduced-motion', ''], ['?motion=reduce', '&motion=reduce']]) {
    if (!extra) await page.emulateMedia({ reducedMotion: 'reduce' });
    await go(`&ui=shop${extra}`);
    await page.evaluate(() => { window.kilumen.ui._select(1, true); }); const rt = await waitTip();
    const l1 = await libs();
    const tr = await page.evaluate(() => getComputedStyle(document.querySelector('#ui-tip') || document.body).transitionDuration);
    await go(`&ui=levelup${extra}`); await page.waitForSelector('.b-lvup', { timeout: 8000 }).catch(() => {}); await sleep(300);
    const lv = await page.evaluate(() => ({ ax: !!document.querySelector('.b-lvup.ax'), xp: document.querySelector('#ally-xp > i')?.style.width }));
    const mo = await page.evaluate(async () => { // catch + menu motion (Oct 22, 2026): nothing animates, catchFx shows its end state at once
      const fx = window.kilumen.ui.fx, h = document.createElement('div'); h.style.cssText = 'position:fixed;inset:0;width:300px;height:200px'; document.body.appendChild(h);
      const t = performance.now(); await fx.catchFx(h, { name: 'Test', caught: true, pulses: 2 }); const r = { ms: performance.now() - t, stars: h.querySelectorAll('.ax-star').length, trainer: !!h.querySelector('.ax-catch:not(.end) .ax-trainer'), banner: !!h.querySelector('.ax-caught'), last: Object.keys(fx.motion.last).filter((k) => k !== 'catch' && fx.motion.last[k]) , catchMs: fx.motion.last.catch };
      h.remove(); return r; });
    ok(eng, `reduced motion (${label}): menu motion + catch celebration skipped (end state at once)`, !mo.last.length && mo.catchMs === 0 && mo.stars === 0 && !mo.trainer && mo.banner && mo.ms < 100, JSON.stringify(mo));
    const l2 = await libs();
    ok(eng, `reduced motion (${label}): no auto-animate / anime.js fetched, no tip fade, tip in view, plain level-up`, !l1.some((n) => n !== 'floating-ui') && !l2.length && /^0s/.test(tr) && inView(rt, await vw()) && !lv.ax, `libs ${[...l1, ...l2].join(',') || 'none'}, tip transition ${tr}, lvup ${JSON.stringify(lv)}`);
    if (!extra) await page.emulateMedia({ reducedMotion: 'no-preference' });
  }
  ok(eng, 'no console errors', !errs.filter(notArt404).length, [...new Set(errs.filter(notArt404))].join(' | ').slice(0, 300));
  const vid = page.video(); await ctx.close(); await browser.close();
  if (bad404.length) results.push(`note ${eng} 404s (not UI code): ${[...new Set(bad404)].join(', ')}`);
  const vp = await vid.path(); const dest = path.join(OUT, `${eng}_ui_tools.webm`); fs.renameSync(vp, dest); results.push(`clip ${path.relative(ROOT, dest)}`);
}

for (const e of ENGINES) { try { await run(e); } catch (err) { ok(e, 'run', false, String(err).slice(0, 300)); } }
console.log(results.join('\n')); console.log(`${fails} failures`);
process.exit(fails ? 1 : 0);
