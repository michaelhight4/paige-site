// Yes/No choice gate (Gary, Oct 23 2026: on live PC the highlighted "Yes" row showed no text). desktop_1366 + iphone_844x390:
// opens a real Yes/No ask ("Take Rillop as your partner?"), then checks the selected row: text present and visible, text vs row
// contrast >= 4.5:1, row vs box >= 3:1 (the highlight shows), axe wcag2a/aa on the box clean, 0 console errors. Screenshot per view.
// Dev:     PORT=8765 OUT=shots/yesno_sel_v1/dev node tests/yesno_sel_shots.mjs
// Release: PORT=8951 BASE_PATH=/kilumen/ RELEASE=1 OUT=shots/yesno_sel_v1/release node tests/yesno_sel_shots.mjs  (URL flags are stripped there)
import { chromium } from 'playwright';
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.resolve(ROOT, process.env.OUT || 'shots/yesno_sel_v1'); fs.mkdirSync(OUT, { recursive: true });
const REL = process.env.RELEASE === '1';
const base = `http://127.0.0.1:${process.env.PORT}${process.env.BASE_PATH || '/'}`;
const AXE = '/tmp/axe/node_modules/axe-core/axe.min.js';
const VIEWS = [{ id: 'desktop_1366', w: 1366, h: 768, dpr: 1, touch: false }, { id: 'iphone_844x390', w: 844, h: 390, dpr: 3, touch: true }];
const PROBE = () => {
  const lum = (c) => { const m = c.match(/[\d.]+/g).map(Number); const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return { l: 0.2126 * f(m[0]) + 0.7152 * f(m[1]) + 0.0722 * f(m[2]), a: m[3] ?? 1 }; };
  const cr = (a, b) => { const x = lum(a).l, y = lum(b).l; return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const li = document.querySelector('.dlg-list li.sel'), box = document.querySelector('.dlg-box');
  if (!li) return { sel: null };
  const s = getComputedStyle(li), bs = getComputedStyle(box), r = li.getBoundingClientRect();
  return { sel: li.textContent.trim(), rows: [...document.querySelectorAll('.dlg-list li')].map((x) => x.textContent.trim()), color: s.color, bg: s.backgroundColor, boxBg: bs.backgroundColor,
    bgAlpha: lum(s.backgroundColor).a, textVsRow: +cr(s.color, s.backgroundColor).toFixed(2), rowVsBox: +cr(s.backgroundColor, bs.backgroundColor).toFixed(2),
    visible: r.width > 10 && r.height > 10 && s.visibility !== 'hidden' && +s.opacity > 0.99, mobile: document.body.classList.contains('platform-mobile') };
};
const browser = await chromium.launch(); const report = []; let fails = 0;
try {
  for (const v of VIEWS) {
    const ctx = await browser.newContext({ viewport: { width: v.w, height: v.h }, deviceScaleFactor: v.dpr, hasTouch: v.touch, isMobile: v.touch });
    const page = await ctx.newPage(); const errors = []; const row = { view: v.id, fail: [] }; const ok = (c, m) => { if (!c) { fails++; row.fail.push(m); } };
    page.on('pageerror', (e) => errors.push(String(e))); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('response', (r) => { if (r.status() >= 400) errors.push(r.status() + ' ' + r.url()); });
    try {
      await page.goto(REL ? base : `${base}index.html?save=0&timescale=0&hour=12&map=route1&clouds=0&life=0&cv=0&platform=${v.touch ? 'mobile' : 'pc'}`);
      await page.waitForFunction(() => window.kilumen?.scene?.tileset && window.kilumen.ui && document.body.classList.contains('ui-skin'), null, { timeout: 30000 });
      await page.evaluate(() => window.kilumen.ready);
      if (REL) { await page.waitForTimeout(800); await page.evaluate(() => { document.querySelectorAll('.ui-modal').forEach((m) => m.remove()); window.kilumen.ui.closeAll(); }); await page.waitForTimeout(400);
        for (let i = 0; i < 40; i++) { if (await page.evaluate(() => window.kilumen.scene.dialog?.active || window.kilumen.scene.busy || window.kilumen.scene.fade)) await page.keyboard.press('Enter'); else break; await page.waitForTimeout(300); } } // release: drain the new-game intro first
      if (process.env.NEG === '1') await page.addStyleTag({ content: 'html body .dlg-wrap .dlg-box .dlg-list li.sel.sel { background: var(--undefined-sc-sel) !important; }' }); // negative check: the pre-fix live bug must FAIL
      await page.evaluate(() => { const s = window.kilumen.scene; window.__res = null;
        s.ask(['Take Rillop as your partner?'], ['Yes', 'No'], { name: 'Mira' }).then((i) => { window.__res = i; }); });
      await page.waitForTimeout(1500);
      // single-page ask: the Yes/No list opens with the question (no key press, so nothing gets picked)
      row.probe = await page.evaluate(PROBE);
      await page.screenshot({ path: path.join(OUT, `${v.id}_yesno.png`) });
      await page.addScriptTag({ path: AXE });
      row.axe = (await page.evaluate(async () => (await window.axe.run('.dlg-wrap', { runOnly: ['wcag2a', 'wcag2aa'] })).violations.map((x) => x.id))).filter((x) => x !== 'aria-dialog-name');
      const p = row.probe;
      ok(p.sel === 'Yes' && p.rows.join('|') === 'Yes|No', 'Yes/No list open, Yes selected: ' + JSON.stringify(p.rows));
      ok(p.visible, 'selected row visible'); ok(p.bgAlpha > 0.99, 'selected row has a solid fill');
      ok(p.textVsRow >= 4.5, `text vs row contrast ${p.textVsRow} >= 4.5`); ok(p.rowVsBox >= 3, `row vs box ${p.rowVsBox} >= 3 (highlight shows)`);
      ok(await page.evaluate(() => window.__res === null && window.kilumen.scene.dialog.active), 'still open, nothing picked');
      ok(p.mobile === v.touch, 'platform ' + (v.touch ? 'mobile' : 'pc'));
      ok(!row.axe.length, 'axe: ' + row.axe.join(','));
      ok(!errors.length, 'console errors: ' + errors.join(' | '));
    } catch (e) { fails++; row.fail.push('exception ' + e); }
    report.push(row); console.log(v.id, row.fail.length ? 'FAIL ' + row.fail.join('; ') : 'ok', JSON.stringify(row.probe)); await ctx.close();
  }
} finally { await browser.close(); }
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 1));
console.log(fails ? `FAILED ${fails}` : 'ALL OK', report.length, 'views'); process.exit(fails ? 1 : 0);
