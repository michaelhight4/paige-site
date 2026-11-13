// Press F / Tap hint shots + checks (Gary 2:10 PM CT Oct 23, 2026). PC 1366x768 and iPhone 844x390 landscape: NPC bubble,
// thought bubble, choice list (+ a long-text overlap probe). Checks: hint text, inside the box, no overlap with text, hidden while
// typing and while a list is open, axe (incl. color-contrast) on the box, reduced motion = no animation, 0 console errors.
// Usage: PORT=<http.server port> OUT=shots/press_f_v1 [BASE_PATH=/] node tests/press_f_shots.mjs
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.resolve(ROOT, process.env.OUT || 'shots/press_f_v1');
fs.mkdirSync(OUT, { recursive: true });
const base = `http://127.0.0.1:${process.env.PORT}${process.env.BASE_PATH || '/'}index.html`;
const AXE = '/tmp/axe/node_modules/axe-core/axe.min.js';
const VIEWS = [{ id: 'pc_1366x768', w: 1366, h: 768, dpr: 1, touch: false, expect: 'Press F' }, { id: 'iphone_844x390', w: 844, h: 390, dpr: 3, touch: true, expect: 'Tap' }];
const MODES = ['npc', 'thought', 'choice', 'long'];
const LONG = 'Every crate in this aisle is labelled by hand, and every label says the same thing in a slightly different font, honestly.';

const PROBE = () => {
  const box = document.querySelector('.dlg-box'), hint = document.querySelector('.dlg-hint'), text = document.querySelector('.dlg-text'), more = document.querySelector('.dlg-more');
  const R = (b) => ({ l: b.left, t: b.top, r: b.right, b: b.bottom });
  const rng = document.createRange(); rng.selectNodeContents(text);
  const lines = [...rng.getClientRects()].filter((r) => r.width > 0.5).map(R);
  const hs = getComputedStyle(hint), bs = getComputedStyle(box);
  const hr = hint.hidden ? null : R(hint.getBoundingClientRect()), br = R(box.getBoundingClientRect());
  const bw = parseFloat(bs.borderLeftWidth);
  const ov = (a, b) => a && b && Math.min(a.r, b.r) - Math.max(a.l, b.l) > 0.5 && Math.min(a.b, b.b) - Math.max(a.t, b.t) > 0.5;
  return {
    shown: !hint.hidden && hs.display !== 'none', text: hint.textContent, opacity: +hs.opacity, anim: hs.animationName, color: hs.color, bg: hs.backgroundColor,
    list: !document.querySelector('.dlg-list').hidden, thought: document.querySelector('.dlg-wrap').classList.contains('thought'),
    inside: hr ? hr.l >= br.l + bw && hr.r <= br.r - bw && hr.t >= br.t + bw && hr.b <= br.b - bw : null,
    bottomRight: hr ? br.r - hr.r < 80 && br.b - hr.b < 20 : null,
    textOverlap: hr ? lines.some((l) => ov(l, hr)) : null, moreOverlap: hr && !more.hidden ? ov(R(more.getBoundingClientRect()), hr) : null,
    hint: hr, boxR: br,
  };
};

const browser = await chromium.launch();
const report = []; let fails = 0;
const ok = (cond, msg, row) => { if (!cond) { fails++; row.fail.push(msg); } };
try {
  for (const v of VIEWS) for (const mode of MODES) for (const reduce of mode === 'npc' ? [false, true] : [false]) {
    const ctx = await browser.newContext({ viewport: { width: v.w, height: v.h }, deviceScaleFactor: v.dpr, hasTouch: v.touch, isMobile: v.touch, reducedMotion: reduce ? 'reduce' : 'no-preference' });
    const page = await ctx.newPage(); const errors = [];
    page.on('pageerror', (e) => errors.push(String(e))); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    const row = { view: v.id, mode: mode + (reduce ? '_reduced' : ''), fail: [] };
    try {
      await page.goto(`${base}?save=0&timescale=0&hour=12&map=route1&clouds=0&life=0&cv=0&platform=${v.touch ? 'mobile' : 'pc'}`);
      await page.waitForFunction(() => window.kilumen?.scene?.tileset, null, { timeout: 20000 });
      await page.evaluate(() => window.kilumen.ready);
      await page.waitForFunction(() => window.kilumen.ui && document.body.classList.contains('ui-skin'), null, { timeout: 20000 }); // ui.js = skin + text reveal
      await page.waitForTimeout(300);
      row.typing = await page.evaluate(async ({ mode, LONG }) => {
        const s = window.kilumen.scene;
        const n = s.npcs.list.find((x) => x.sprite?.portraits?.neutral) || s.npcs.list[0];
        const sp = { ...s.speakerFor(n, true) }; sp.name ||= 'Trainer Kit';
        window.__res = null;
        if (mode === 'npc') s.say(['Nice day for a walk on Trail 1. Watch the tall grass, things live in there.', 'See you around.'], sp);
        else if (mode === 'thought') s.say(['...I should check the office before it gets dark.'], { thought: true });
        else if (mode === 'long') s.say([LONG], { name: 'Clerk' });
        else s.ask(['Want to trade stories before we battle?', 'So, what will it be?'], ['Yes', 'Not now', 'Ask later'], sp).then((i) => { window.__res = i; });
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        const h = document.querySelector('.dlg-hint'); return { opacity: +getComputedStyle(h).opacity, hidden: h.hidden, rv: !!document.querySelector('.dlg-text .rv') };
      }, { mode, LONG });
      await page.evaluate(() => Promise.all([...document.querySelectorAll('img')].filter((i) => !i.hidden && i.src).map((i) => i.decode().catch(() => {}))));
      await page.waitForTimeout(1800); // past the text reveal and the control fade
      row.lead = await page.evaluate(PROBE);
      if (mode === 'choice') {
        await page.evaluate(() => window.kilumen.scene.dialog.handle({ a: true })); await page.waitForTimeout(700);
        row.list = await page.evaluate(PROBE);
      }
      const m = row.list || row.lead;
      if (mode !== 'long') await page.screenshot({ path: path.join(OUT, `${v.id}_${row.mode}.png`) });
      try {
        await page.addScriptTag({ path: AXE });
        row.axe = await page.evaluate(async () => { const r = await window.axe.run('.dlg-wrap', { runOnly: ['wcag2a', 'wcag2aa'] }); return r.violations.map((x) => ({ id: x.id, n: x.nodes.length, t: x.nodes.map((nd) => nd.target.join(' ')).slice(0, 3) })); });
      } catch (e) { row.axe = [{ id: 'axe-error', n: 1, t: [String(e)] }]; }
      // checks
      if (mode === 'choice') {
        ok(row.lead.shown && row.lead.text === v.expect, 'lead-in page shows the hint', row);
        ok(row.list.list && !row.list.shown, 'hidden while the choice list is open', row);
      } else {
        ok(m.shown && m.text === v.expect, `hint "${v.expect}" shown`, row);
        ok(m.opacity > 0.99, 'fully visible after typing', row);
        ok(m.inside && m.bottomRight, 'inside the box, bottom-right', row);
        ok(m.textOverlap === false, 'no overlap with the text', row);
        ok(!m.moreOverlap, 'no overlap with the ▼', row);
        if (mode === 'thought') ok(m.thought, 'thought style on', row);
        if (reduce) ok(m.anim === 'none', 'reduced motion: no animation', row);
        else ok(/dlg-hint-bob/.test(m.anim), 'bobs', row);
        if (row.typing.rv && !reduce) ok(row.typing.opacity < 0.01, 'hidden while the text types out', row);
      }
      const ax = row.axe.filter((x) => x.id !== 'aria-dialog-name'); // pre-existing (role=dialog box has no name; noted in earlier passes)
      ok(!ax.length, 'axe clean (color-contrast included): ' + JSON.stringify(ax), row);
      ok(!errors.length, 'console errors: ' + errors.join(' | '), row);
    } catch (e) { fails++; row.fail.push('exception ' + e); }
    report.push(row); console.log(row.view, row.mode, row.fail.length ? 'FAIL ' + row.fail.join('; ') : 'ok', JSON.stringify({ typing: row.typing, hint: (row.list || row.lead)?.hint, axe: row.axe?.map((x) => x.id) }));
    await ctx.close();
  }
} finally { await browser.close(); }
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 1));
console.log(fails ? `FAILED ${fails}` : 'ALL OK', `${report.length} cases`);
process.exit(fails ? 1 : 0);
