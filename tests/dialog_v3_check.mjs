// Dialogue v3 check (Oct 22, 2026, Gary: "Hide the d-pad during conversations so the box and portrait can be full size").
// Phone sizes: say (portrait + battle image), say + toast, ask with choices (d-pad up/down back), inbox list; PC: the same modes.
// Measures box / name / portrait / battle / toast / list against the touch buttons that are VISIBLE, checks the d-pad / SEL / DBG
// are hidden during say, up/down only for lists, all back after close; taps the box (advance) and a list row (pick).
// Usage: PORT=<http.server port> OUT=shots/batch3/dialog_v3 node tests/dialog_v3_check.mjs   (exit 1 on any mobile failure)
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.resolve(ROOT, process.env.OUT || 'shots/batch3/dialog_v3');
fs.mkdirSync(OUT, { recursive: true });
const base = `http://127.0.0.1:${process.env.PORT}/index.html`;
const CASES = [
  { plat: 'mobile', w: 844, h: 390, dpr: 2 }, { plat: 'mobile', w: 780, h: 360, dpr: 3 }, { plat: 'mobile', w: 800, h: 360, dpr: 3 },
  { plat: 'mobile', w: 932, h: 430, dpr: 2 }, { plat: 'mobile', w: 1024, h: 768, dpr: 2 }, { plat: 'mobile', w: 780, h: 330, dpr: 2 },
  { plat: 'pc', w: 1280, h: 720, dpr: 1 }, { plat: 'pc', w: 1920, h: 1080, dpr: 1 },
];
const MODES = ['say', 'say_toast', 'ask', 'inbox'];
const inter = (a, b) => !a || !b ? 0 : Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
const f = (r) => (r ? `[${Math.round(r.left)},${Math.round(r.top)},${Math.round(r.right)},${Math.round(r.bottom)}]` : '-');

const MEASURE = () => {
  const R = (el) => { if (!el || el.hidden || el.closest('[hidden]')) return null; const b = el.getBoundingClientRect(); if (!b.width) return null;
    return { left: +b.left.toFixed(2), top: +b.top.toFixed(2), right: +b.right.toFixed(2), bottom: +b.bottom.toFixed(2), w: +b.width.toFixed(2), h: +b.height.toFixed(2) }; };
  const tp = document.getElementById('touchpad'), bat = document.querySelector('.dlg-battle'), toast = document.getElementById('toast');
  const z = (el) => +getComputedStyle(el).zIndex || 0;
  const btn = (b) => { const cs = getComputedStyle(b); return { id: b.dataset.dir || b.dataset.btn, rect: R(b), visible: cs.visibility === 'visible' && +cs.opacity > 0.5 && cs.pointerEvents !== 'none' }; };
  return {
    box: R(document.querySelector('.dlg-box')), layout: document.querySelector('.dlg-box').dataset.layout || null,
    name: R(document.querySelector('.dlg-name')), portrait: R(document.querySelector('.dlg-portrait')), list: R(document.querySelector('.dlg-list')),
    battle: R(bat), battleNatural: bat && !bat.hidden ? [bat.naturalWidth, bat.naturalHeight] : null,
    toast: R(toast), toastZ: z(toast), dlgZ: z(document.querySelector('.dlg-wrap')),
    btns: tp.hidden ? [] : [...tp.querySelectorAll('button')].map(btn),
    active: !!window.kilumen.scene.dialog?.active,
  };
};
const visIds = (m) => m.btns.filter((b) => b.visible).map((b) => b.id).sort().join(',');

const browser = await chromium.launch();
const rows = [];
let bad = 0;
try {
  for (const c of CASES) for (const mode of MODES) {
    const touch = c.plat === 'mobile';
    let tries = 0;
    for (;;) {
      const ctx = await browser.newContext({ viewport: { width: c.w, height: c.h }, deviceScaleFactor: c.dpr, hasTouch: touch, isMobile: touch });
      const page = await ctx.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(String(e)));
      page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
      try {
        await page.goto(`${base}?save=0&timescale=0&hour=12&map=route1&clouds=0&life=0`);
        await page.waitForFunction(() => window.kilumen?.scene?.tileset, null, { timeout: 15000 });
        await page.evaluate(() => window.kilumen.ready);
        const before = await page.evaluate(MEASURE);
        await page.evaluate(async (mode) => {
          const s = window.kilumen.scene;
          const n = s.npcs.list.find((n) => n.sprite?.trainer_64x128 && n.sprite?.portraits?.neutral);
          const sp = s.speakerFor(n, mode.startsWith('say'));
          const named = { ...sp, name: sp.name || 'Trainer Kit' };
          window.__res = null;
          if (mode.startsWith('say')) s.say(['You looked my way. That means a battle!'], named).then(() => { window.__res = 'closed'; });
          else if (mode === 'ask') s.ask(['Want to trade stories before we battle?'], ['Yes', 'Not now', 'Ask later'], named).then((i) => { window.__res = i; });
          else s.dialog.inbox('Inbox', [
            { from: 'Mum', subject: 'Did you eat?', pages: ['Did you eat?'] }, { from: 'Prof. Elm', subject: 'Field notes', pages: ['Notes.'] },
            { from: 'Kit', subject: 'Rematch soon', pages: ['Soon.'] }], () => false, () => {}).then(() => { window.__res = 'closed'; });
          if (mode === 'say_toast') s.toast('The path ahead is closed.');
          await Promise.all([...document.querySelectorAll('img')].filter((i) => !i.hidden && i.src).map((i) => i.decode().catch(() => {})));
        }, mode);
        await page.waitForTimeout(600); // past the control fade
        const m = await page.evaluate(MEASURE);
        const file = `${c.plat}_${c.w}x${c.h}_dpr${c.dpr}_${mode}.png`;
        await page.screenshot({ path: path.join(OUT, file) });
        // interaction: say -> tap the box closes it; ask -> tap row 2 picks 1; inbox -> tap row 3 opens it, then B (tap B) back, B closes
        let after = null, tapResult = null;
        if (touch && m.box) {
          if (mode === 'ask' || mode === 'inbox') {
            const rowsR = await page.$$eval('.dlg-list li', (ls) => ls.map((l) => { const b = l.getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; }));
            const [x, y] = rowsR[mode === 'ask' ? 1 : 2];
            await page.touchscreen.tap(x, y); await page.waitForTimeout(250);
            if (mode === 'inbox') {
              tapResult = await page.evaluate(() => document.querySelector('.dlg-name').textContent);
              for (let i = 0; i < 2; i++) { await page.evaluate(() => { const b = document.querySelector('#touchpad [data-btn=b]').getBoundingClientRect(); window.__bxy = [b.left + b.width / 2, b.top + b.height / 2]; }); const xy = await page.evaluate(() => window.__bxy); await page.touchscreen.tap(xy[0], xy[1]); await page.waitForTimeout(250); }
            }
          } else { await page.touchscreen.tap(m.box.left + m.box.w / 2, m.box.top + m.box.h / 2); await page.waitForTimeout(250); }
          await page.waitForTimeout(400);
          after = await page.evaluate(MEASURE);
          const res = await page.evaluate(() => window.__res);
          tapResult = mode === 'inbox' ? { opened: tapResult, res } : res;
        }
        const vis = m.btns.filter((b) => b.visible);
        const hits = (r) => vis.filter((b) => inter(b.rect, r) > 0).map((b) => b.id);
        const off = (r) => !!r && (r.top < -0.5 || r.left < -0.5 || r.bottom > c.h + 0.5 || r.right > c.w + 0.5);
        const scale = m.battle && m.battleNatural ? (m.battle.h * c.dpr) / m.battleNatural[1] : null;
        const listMode = mode === 'ask' || mode === 'inbox';
        const expectVis = listMode ? 'a,b,down,up' : 'a,b';
        const checks = {
          boxButtons: hits(m.box), portraitButtons: hits(m.portrait), battleButtons: hits(m.battle), toastButtons: hits(m.toast), listButtons: hits(m.list),
          off: ['box', 'portrait', 'battle', 'toast', 'list'].filter((k) => off(m[k])),
          battleAboveBox: m.battle && m.box ? m.battle.bottom <= m.box.top + 0.5 : null,
          battleDeviceScale: scale && +scale.toFixed(3), battleIntegerScale: scale == null ? null : Math.abs(scale - Math.round(scale)) < 0.01,
          battlePortrait: inter(m.battle, m.portrait) > 0,
          toastAboveBox: m.toast && m.box ? m.toast.bottom <= Math.min(m.box.top, m.name?.top ?? Infinity) + 0.5 : null,
          toastFront: m.toast ? m.toastZ > m.dlgZ : null, toastBattle: inter(m.toast, m.battle) > 0, toastPortrait: inter(m.toast, m.portrait) > 0,
          visibleDuring: touch ? visIds(m) : null, visibleBefore: touch ? visIds(before) : null, visibleAfterClose: after ? visIds(after) : null,
          closedOrPicked: after ? tapResult : null,
        };
        const fail = touch && (checks.boxButtons.length || checks.portraitButtons.length || checks.battleButtons.length || checks.toastButtons.length || checks.listButtons.length
          || checks.off.length || checks.battleAboveBox === false || checks.battleIntegerScale === false || (scale != null && scale < 2 - 0.01) || checks.battlePortrait
          || (mode === 'say_toast' && (!checks.toastAboveBox || !checks.toastFront || checks.toastBattle || checks.toastPortrait))
          || checks.visibleDuring !== expectVis || checks.visibleBefore !== 'a,b,debug,down,left,right,select,up' || checks.visibleAfterClose !== 'a,b,debug,down,left,right,select,up'
          || (mode === 'ask' && tapResult !== 1) || (mode === 'say' && tapResult !== 'closed') || (mode === 'inbox' && (tapResult?.opened !== 'Kit: Rematch soon' || tapResult?.res !== 'closed'))
          || errors.length);
        if (fail) bad++;
        rows.push({ ...c, mode, file, ...m, before: undefined, checks, fail: !!fail, errors });
        console.log(`${fail ? 'FAIL' : 'ok  '} ${file}: ${m.layout || '-'} box=${f(m.box)} name=${f(m.name)} portrait=${f(m.portrait)} battle=${f(m.battle)} x${checks.battleDeviceScale ?? '-'} toast=${f(m.toast)} list=${f(m.list)} ` +
          `hits=${JSON.stringify([checks.boxButtons, checks.portraitButtons, checks.battleButtons, checks.toastButtons, checks.listButtons])} off=[${checks.off}] vis=${checks.visibleDuring} after=${checks.visibleAfterClose} tap=${JSON.stringify(checks.closedOrPicked)} err=${errors.length}`);
        await ctx.close();
        break;
      } catch (e) {
        await ctx.close();
        if (++tries >= 3) throw e;
        console.log(`retry ${c.w}x${c.h} ${mode}: ${String(e).slice(0, 160)}`);
      }
    }
  }
} finally { await browser.close(); }
fs.writeFileSync(path.join(OUT, 'layout.json'), JSON.stringify(rows, null, 1));
console.log(`mobile failures: ${bad}`);
process.exitCode = bad ? 1 : 0;
