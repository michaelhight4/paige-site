// Phone menus pass (Gary, Oct 23, 2026: the d-pad covered the title menu on iPhone Safari; "uncover menus and use tap
// selection"; "make the web site so the web bar auto hides for phone users").
// For each view x scene: screenshot + measure every visible touch control vs the open menu's tappable rows, row hit heights,
// and whether a real tap on a row works. A window resize is fired after every menu opens (Safari's address bar slides on
// scroll / rotation and fires resize; that is what re-showed the d-pad over the title menu).
// Usage: TAG=before|after TARGET=dev|live node tests/phone_menu_shots.mjs -> shots/phone_menu_fix/<tag>/<target>_*.png + report_<target>.json
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TAG = process.env.TAG || 'after', TARGET = process.env.TARGET || 'dev';
const OUT = path.join(ROOT, 'shots/phone_menu_fix', TAG); fs.mkdirSync(OUT, { recursive: true });
const PORT = await new Promise((res) => { const sv = net.createServer(); sv.listen(0, '127.0.0.1', () => { const p = sv.address().port; sv.close(() => res(p)); }); });
const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
const BASE = TARGET === 'live' ? 'https://paigegames.net/kilumen/' : `http://127.0.0.1:${PORT}/index.html`;
for (let i = 0; i < 50 && TARGET !== 'live'; i++) { try { if ((await fetch(BASE)).ok) break; } catch {} await new Promise((r) => setTimeout(r, 100)); }
const VIEWS = [
  { tag: '844x390', w: 844, h: 390, dpr: 3, mobile: true },
  { tag: '844x390_notch', w: 844, h: 390, dpr: 3, mobile: true, inset: { left: 47, right: 47, bottom: 21 } },
  { tag: '844x293_safaribars', w: 844, h: 293, dpr: 3, mobile: true, inset: { left: 47, right: 47, bottom: 0 } }, // Gary's shot: bars ~25% of the height
  { tag: '932x430', w: 932, h: 430, dpr: 3, mobile: true },
  { tag: '932x430_notch', w: 932, h: 430, dpr: 3, mobile: true, inset: { left: 59, right: 59, bottom: 21 } },
  { tag: '780x360', w: 780, h: 360, dpr: 3, mobile: true },
  { tag: '390x844_portrait', w: 390, h: 844, dpr: 3, mobile: true, only: ['title_menu'] },
  { tag: 'pc1920x1080', w: 1920, h: 1080, dpr: 1, mobile: false },
  { tag: 'pc1280x720', w: 1280, h: 720, dpr: 1, mobile: false },
];
const DEV = 'save=0&timescale=0&hour=12&clouds=0&life=0&audio=0';
const SCENES = TARGET === 'live'
  ? [{ id: 'title_menu', q: '', title: true }, { id: 'overworld', q: '', title: true, leave: true }, { id: 'ios_hint', q: '', ios: true }]
  : [
    { id: 'title_menu', q: `${DEV}&title=1`, title: true },
    { id: 'title_tap_anywhere', q: `${DEV}&title=1`, anywhere: true },
    { id: 'ios_hint', q: `${DEV}&title=1`, ios: true },
    { id: 'options', q: `${DEV}&title=1`, title: true, options: true },
    { id: 'pause_menu', q: `${DEV}&title=0&map=brookhollow&x=5&y=8&ui=phone&uidemo=1`, wait: '.ui-apps' },
    { id: 'bag', q: `${DEV}&title=0&map=brookhollow&x=5&y=8&ui=phone&uidemo=1`, wait: '.ui-apps', open: 'bag' },
    { id: 'shop', q: `${DEV}&title=0&map=brookhollow&x=5&y=8&ui=phone&uidemo=1`, wait: '.ui-apps', open: 'shop' },
    { id: 'dex', q: `${DEV}&title=0&map=brookhollow&x=5&y=8&ui=phone&uidemo=1`, wait: '.ui-apps', open: 'dex' },
    { id: 'dialogue_choice', q: `${DEV}&title=0&map=brookhollow&x=5&y=8`, ask: true },
    { id: 'battle', q: `${DEV}&uidemo=1&ui=battle`, wait: '.ui-battle', battle: true },
    { id: 'overworld', q: `${DEV}&title=0&map=brookhollow&x=5&y=8&facing=down` },
  ];
const ONLY = (process.env.VIEWS || '').split(',').filter(Boolean);
const ONLYS = (process.env.SCENES || '').split(',').filter(Boolean);
const browser = await chromium.launch();
const report = [];
const measure = (page) => page.evaluate(() => {
  const rr = (e) => { const b = e.getBoundingClientRect(); return { x: Math.round(b.left), y: Math.round(b.top), r: Math.round(b.right), b: Math.round(b.bottom), w: Math.round(b.width), h: Math.round(b.height) }; };
  const shown = (e) => { if (!e || !e.getClientRects().length) return false; const cs = getComputedStyle(e); return cs.visibility !== 'hidden' && +cs.opacity > 0.05 && cs.display !== 'none' && !e.closest('[hidden]'); };
  const ctl = [...document.querySelectorAll('#touchpad button, #fs-btn')].filter(shown).map((e) => ({ id: e.dataset.btn || e.dataset.dir || e.id, ...rr(e) }));
  const sel = '.ui-modal [data-m], .ui-stage:not([hidden]) [data-i], .ui-root > div:not(.ui-stage):not(.ui-backdrop):not([hidden]) [data-i], .ui-press-start, .dlg-wrap.open .dlg-list li, .ui-x';
  const rows = [...document.querySelectorAll(sel)].filter(shown).map((e) => ({ t: (e.textContent || '').trim().slice(0, 18), ...rr(e) }))
    .filter((r) => r.w > 0 && r.r > 0 && r.x < innerWidth && r.b > 0 && r.y < innerHeight);
  const ov = (a, b) => Math.max(0, Math.min(a.r, b.r) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.b, b.b) - Math.max(a.y, b.y));
  const overlaps = []; for (const c of ctl) for (const r of rows) { const a = ov(c, r); if (a > 0) overlaps.push(`${c.id}/${r.t}:${a}`); }
  const small = rows.filter((r) => r.h < 44 || r.w < 44).map((r) => `${r.t}:${r.w}x${r.h}`);
  return { platform: window.kilumen?.platform?.id, scr: document.querySelector('.ui-root')?.dataset.scr || null, uiOpen: document.body.classList.contains('ui-open'),
    controls: ctl.map((c) => c.id), rows: rows.length, overlaps, small, bodyCls: document.body.className, inner: [innerWidth, innerHeight] };
});
try {
  for (const v of VIEWS) {
    if (ONLY.length && !ONLY.includes(v.tag)) continue;
    for (const s of SCENES) {
      if (v.only && !v.only.includes(s.id)) continue;
      if (ONLYS.length && !ONLYS.includes(s.id)) continue;
      if (s.ios && !['844x390', '844x293_safaribars'].includes(v.tag)) continue;
      if (s.anywhere && !v.mobile) continue;
      if (!v.mobile && !['title_menu', 'pause_menu', 'overworld', 'battle'].includes(s.id)) continue;
      const ctx = await browser.newContext({ viewport: { width: v.w, height: v.h }, deviceScaleFactor: v.dpr, hasTouch: v.mobile, isMobile: v.mobile });
      // iPhone Safari stand-in: no element Fullscreen API, first visit (fresh context = empty localStorage)
      if (s.ios) await ctx.addInitScript(() => { for (const k of ['requestFullscreen', 'webkitRequestFullscreen']) { delete Element.prototype[k]; Object.defineProperty(Element.prototype, k, { value: undefined, configurable: true }); } });
      const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(String(e).slice(0, 160)));
      const tap = async (loc) => { const bb = await loc.boundingBox(); if (!bb) return false; const x = bb.x + bb.width / 2, y = bb.y + bb.height / 2; if (v.mobile) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); return true; };
      let tapOk = null;
      try {
        await page.goto(BASE + (s.q ? '?' + s.q : ''));
        await page.waitForFunction(() => window.kilumen?.scene?.tileset && window.kilumen.ui, null, { timeout: 30000 });
        await page.evaluate(() => window.kilumen.ready);
        if (v.inset) await page.evaluate((ins) => { for (const k of Object.keys(ins)) document.body.style.setProperty('--safe-' + k, ins[k] + 'px'); }, v.inset);
        await page.waitForTimeout(1200);
        if (s.title) {
          const got = page.locator('.ui-modal [data-m]').first(); // live alpha notice
          if (await got.count()) { await tap(got); await page.waitForTimeout(600); }
          const ps = page.locator('.ui-press-start');
          if (await ps.count()) { await tap(ps); await page.waitForTimeout(900); }
          if (s.leave) { const ng = page.locator('.ui-title-menu [data-i]', { hasText: /New game|Continue/ }).first(); if (await ng.count()) await tap(ng); await page.waitForTimeout(1500); }
          if (s.options) { const op = page.locator('.ui-title-menu [data-i]', { hasText: 'Options' }); await tap(op); await page.waitForTimeout(900); tapOk = await page.evaluate(() => document.querySelector('.ui-root')?.dataset.scr === 'options'); }
        }
        if (s.anywhere) { await page.touchscreen.tap(v.w * 0.82, v.h * 0.22); await page.waitForTimeout(900); tapOk = await page.evaluate(() => !!document.querySelector('.ui-title-menu [data-i]')); }
        if (s.ios) tapOk = await page.evaluate(() => !!document.getElementById('ios-hint'));
        if (s.wait) await page.waitForSelector(s.wait, { timeout: 15000 }).catch(() => errors.push('wait ' + s.wait));
        if (s.open) { await page.evaluate((id) => window.kilumen.ui.open(id), s.open); await page.waitForTimeout(900); }
        if (s.ask) { await page.evaluate(() => { window._ask = window.kilumen.scene.dialog.ask(['Take the ferry across to Saltmere?'], ['Yes', 'No'], { name: 'Ferryman' }); }); await page.waitForTimeout(1500); }
        if (s.battle) await page.waitForTimeout(2500);
        // Safari's bars slide -> resize event while the menu is open (Gary's repro)
        await page.evaluate(() => { dispatchEvent(new Event('resize')); window.visualViewport?.dispatchEvent(new Event('resize')); }); await page.waitForTimeout(600);
        const m = await measure(page);
        const shot = path.join(OUT, `${TARGET}_${v.tag}_${s.id}.png`);
        await page.screenshot({ path: shot });
        if (s.id === 'title_menu' && v.mobile) { // real tap on "New game" must leave the title
          const ng = page.locator('.ui-title-menu [data-i]', { hasText: /New game|Continue/ }).first();
          if (await ng.count()) { await tap(ng); await page.waitForTimeout(1000); tapOk = await page.evaluate(() => !document.body.classList.contains('ui-open')); }
        }
        if (s.ask) { const no = page.locator('.dlg-list li', { hasText: 'No' }); if (await no.count()) { await tap(no); tapOk = await page.evaluate(() => Promise.race([window._ask, new Promise((r) => setTimeout(() => r('timeout'), 1500))])); } }
        if (s.id === 'pause_menu' && v.mobile) { // close the menu with its X: the touch controls must come back
          for (let k = 0; k < 4 && await page.evaluate(() => document.body.classList.contains('ui-open')); k++) { const x = page.locator('.ui-x:visible').first(); if (!(await x.count())) break; await tap(x); await page.waitForTimeout(700); }
          await page.waitForTimeout(400); m.controlsAfterClose = (await measure(page)).controls; tapOk = m.controlsAfterClose.includes('up') && m.controlsAfterClose.includes('a');
        }
        if (s.id === 'overworld' || s.leave) m.controlsAfter = (await measure(page)).controls;
        report.push({ view: v.tag, scene: s.id, ...m, tapOk, errors, shot: path.relative(ROOT, shot) });
        console.log(v.tag.padEnd(20), s.id.padEnd(16), 'scr', m.scr, '| controls', m.controls.join(',') || '-', '| overlaps', m.overlaps.length, m.overlaps.slice(0, 2).join(' '), '| <44px', m.small.length, m.small.slice(0, 3).join(' '), '| tap', tapOk, errors.length ? '| ERR ' + errors[0] : '');
      } catch (e) { console.log(v.tag, s.id, 'FAIL', String(e).slice(0, 200)); report.push({ view: v.tag, scene: s.id, fail: String(e).slice(0, 300) }); }
      await ctx.close();
    }
  }
} finally { await browser.close(); server.kill(); }
fs.writeFileSync(path.join(OUT, `report_${TARGET}${ONLYS.length ? '_' + ONLYS.join('_') : ''}${ONLY.length ? '_' + ONLY.join('_') : ''}.json`), JSON.stringify(report, null, 2));
