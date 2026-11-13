// Batch 3 layout check (Oct 22, 2026): the dialogue portrait, the trainer battle image and a toast shown DURING a dialogue,
// measured against the dialogue box and the touch buttons at the checklist phone sizes, plus PC sizes.
// Usage: PORT=<running http.server port> OUT=shots/batch3/layout node tests/batch3_layout_check.mjs
// Writes <OUT>/*.png and <OUT>/layout.json. Exit code 1 if any mobile case fails (overlap, crop or non-integer battle scale).
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NONAME = process.env.NONAME === '1';
const OUT = path.resolve(ROOT, process.env.OUT || 'shots/batch3/layout');
fs.mkdirSync(OUT, { recursive: true });
const base = `http://127.0.0.1:${process.env.PORT}/index.html`;
const CASES = [
  { plat: 'mobile', w: 844, h: 390, dpr: 2 }, { plat: 'mobile', w: 780, h: 360, dpr: 3, tag: '2340x1080' },
  { plat: 'mobile', w: 800, h: 360, dpr: 3, tag: '2400x1080' }, { plat: 'mobile', w: 932, h: 430, dpr: 2 },
  { plat: 'mobile', w: 1024, h: 768, dpr: 2 }, { plat: 'mobile', w: 780, h: 330, dpr: 2, tag: 'max-h-340-rule', extra: true }, // not a checklist size: reported, not failed
  { plat: 'pc', w: 1280, h: 720, dpr: 1 }, { plat: 'pc', w: 1920, h: 1080, dpr: 1 }, { plat: 'pc', w: 2560, h: 1440, dpr: 1 },
];
// modes: 'dlg' = trainer line (portrait + battle image); 'dlg_toast' = same + a toast while it is open; 'toast' = toast alone
const MODES = ['dlg', 'dlg_toast', 'toast'];
const inter = (a, b) => !a || !b ? 0 : Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
const browser = await chromium.launch();
const rows = [];
let bad = 0;
try {
  for (const c of CASES) for (const mode of MODES) {
    const touch = c.plat === 'mobile';
    const ctx = await browser.newContext({ viewport: { width: c.w, height: c.h }, deviceScaleFactor: c.dpr, hasTouch: touch, isMobile: touch });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto(`${base}?save=0&timescale=0&hour=12&map=route1&clouds=0&life=0`);
    await page.waitForFunction(() => window.kilumen?.scene?.tileset, null, { timeout: 15000 });
    await page.evaluate(() => window.kilumen.ready);
    await page.evaluate(async ([mode, NONAME]) => {
      const s = window.kilumen.scene;
      if (mode !== 'toast') {
        const n = s.npcs.list.find((n) => n.sprite?.trainer_64x128 && n.sprite?.portraits?.neutral);
        const sp = s.speakerFor(n, true); s.say(['You looked my way. That means a battle!'], { ...sp, name: sp.name || (NONAME ? sp.name : 'Trainer Kit') }); // named, so the name tag is measured too (NONAME=1: as in the pre-fix run, for the PC pixel diff)
      }
      if (mode !== 'dlg') s.toast('The path ahead is closed.');
      await Promise.all([...document.querySelectorAll('img')].filter((i) => !i.hidden && i.src).map((i) => i.decode().catch(() => {})));
    }, [mode, NONAME]);
    await page.waitForTimeout(500);
    const m = await page.evaluate(() => {
      const R = (el) => { if (!el || el.hidden || el.closest('[hidden]')) return null; const b = el.getBoundingClientRect(); if (!b.width) return null;
        return { left: +b.left.toFixed(2), top: +b.top.toFixed(2), right: +b.right.toFixed(2), bottom: +b.bottom.toFixed(2), w: +b.width.toFixed(2), h: +b.height.toFixed(2) }; };
      const tp = document.getElementById('touchpad'), bat = document.querySelector('.dlg-battle'), toast = document.getElementById('toast');
      const z = (el) => +getComputedStyle(el).zIndex || 0;
      return {
        platform: window.kilumen.platform?.id, dpr: devicePixelRatio,
        box: R(document.querySelector('.dlg-box')), name: R(document.querySelector('.dlg-name')), portrait: R(document.querySelector('.dlg-portrait')),
        battle: R(bat), battleNatural: bat && !bat.hidden ? [bat.naturalWidth, bat.naturalHeight] : null, battleRendering: getComputedStyle(bat).imageRendering,
        toast: R(toast), toastZ: z(toast), dlgZ: z(document.querySelector('.dlg-wrap')),
        btns: tp.hidden ? [] : [...tp.querySelectorAll('button')].filter((b) => b.offsetParent && getComputedStyle(b).visibility !== 'hidden').map((b) => ({ id: b.dataset.dir || b.dataset.btn, rect: R(b) })),
      };
    });
    const hits = (r) => m.btns.filter((b) => inter(b.rect, r) > 0).map((b) => b.id);
    const off = (r) => !!r && (r.top < -0.5 || r.left < -0.5 || r.bottom > c.h + 0.5 || r.right > c.w + 0.5);
    const scale = m.battle && m.battleNatural ? (m.battle.h * c.dpr) / m.battleNatural[1] : null;
    const checks = {
      portraitButtons: hits(m.portrait), battleButtons: hits(m.battle), toastButtons: hits(m.toast),
      portraitOff: off(m.portrait), battleOff: off(m.battle), toastOff: off(m.toast),
      battleAboveBox: m.battle && m.box ? m.battle.bottom <= m.box.top + 0.5 : null,
      battleDeviceScale: scale, battleIntegerScale: scale == null ? null : Math.abs(scale - Math.round(scale)) < 0.01,
      toastVisibleOverDialog: m.toast && m.box ? (inter(m.toast, m.box) === 0 && inter(m.toast, m.name) === 0) || m.toastZ > m.dlgZ : null,
      toastAboveBox: m.toast && m.box ? m.toast.bottom <= Math.min(m.box.top, m.name?.top ?? Infinity) + 0.5 : null,
      toastBattleOverlap: inter(m.toast, m.battle) > 0, toastPortraitOverlap: inter(m.toast, m.portrait) > 0,
    };
    const fail = c.plat === 'mobile' && !c.extra && (checks.portraitButtons.length || checks.battleButtons.length || checks.toastButtons.length || checks.portraitOff || checks.battleOff || checks.toastOff
      || checks.battleAboveBox === false || checks.battleIntegerScale === false || (mode === 'dlg_toast' && (!checks.toastVisibleOverDialog || checks.toastBattleOverlap || checks.toastPortraitOverlap)));
    if (fail) bad++;
    const file = `${c.plat}_${c.w}x${c.h}_dpr${c.dpr}_${mode}.png`;
    await page.screenshot({ path: path.join(OUT, file) });
    rows.push({ ...c, mode, file, ...m, checks, fail: !!fail, errors });
    const f = (r) => (r ? `[${Math.round(r.left)},${Math.round(r.top)},${Math.round(r.right)},${Math.round(r.bottom)}]` : '-');
    console.log(`${fail ? 'FAIL' : 'ok  '} ${file}: box=${f(m.box)} name=${f(m.name)} portrait=${f(m.portrait)} battle=${f(m.battle)} x${scale ?? '-'} toast=${f(m.toast)} z=${m.toastZ}/${m.dlgZ} ` +
      `hits p=[${checks.portraitButtons}] b=[${checks.battleButtons}] t=[${checks.toastButtons}] off=${+checks.portraitOff}${+checks.battleOff}${+checks.toastOff} toastVis=${checks.toastVisibleOverDialog} t/b=${+checks.toastBattleOverlap} t/p=${+checks.toastPortraitOverlap} err=${errors.length}`);
    await ctx.close();
  }
} finally { await browser.close(); }
fs.writeFileSync(path.join(OUT, 'layout.json'), JSON.stringify(rows, null, 1));
console.log(`mobile failures: ${bad}`);
process.exitCode = bad ? 1 : 0;
