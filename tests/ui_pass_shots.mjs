// UI pass "after" shots (Oct 22, 2026) + layout checks: every surface on PC 1920x1080 / 1366x768 and mobile 932x430,
// 956x440, 780x360 (2340x1080 @ DPR 3), touch. Checks: no page errors, nothing in the UI overlaps a visible touch button,
// nothing cut off (UI rects inside the viewport), buttons rows visible. Usage: PORT=8093 node tests/ui_pass_shots.mjs [quick]
import { chromium } from 'playwright';
import fs from 'node:fs';
const OUT = 'shots/ui_pass/after'; fs.mkdirSync(OUT, { recursive: true });
const base = `http://127.0.0.1:${process.env.PORT || 8093}/index.html`;
const ALL = [{ id: 'pc1920', w: 1920, h: 1080, p: 'pc' }, { id: 'pc1366', w: 1366, h: 768, p: 'pc' },
  { id: 'mob932', w: 932, h: 430, p: 'mobile', dpr: 2, touch: true }, { id: 'mob956', w: 956, h: 440, p: 'mobile', dpr: 3, touch: true },
  { id: 'mob2340', w: 780, h: 360, p: 'mobile', dpr: 3, touch: true }];
const SHOT = new Set(['pc1920', 'mob932']); // full shot set; others: layout checks + a few shots
const SCREENS = ['phone', 'team', 'summary', 'pack', 'kilindex', 'shop', 'archive', 'options', 'map', 'tasks'];
const problems = []; let checks = 0;
const b = await chromium.launch();
async function layout(page, c, label) {
  const r = await page.evaluate(() => {
    const vw = innerWidth, vh = innerHeight, out = { cut: [], overlap: [] };
    const btns = [...document.querySelectorAll('#touchpad button')].filter((e) => getComputedStyle(e).visibility !== 'hidden' && !document.getElementById('touchpad').hidden).map((e) => [e.dataset.btn || e.dataset.dir, e.getBoundingClientRect()]);
    const ui = [...document.querySelectorAll('.ui-root:not([hidden]) .ui-row, .ui-root:not([hidden]) .ui-tile, .ui-root:not([hidden]) .ui-card, .ui-root:not([hidden]) .ui-x, .ui-root:not([hidden]) .ui-tab, .ui-root:not([hidden]) .b-cmd, .ui-root:not([hidden]) .b-msg, .ui-root:not([hidden]) .ui-panel, .ui-root:not([hidden]) .b-plate, .hud-menu, .hud-banner.show, .hud-clock')]
      .filter((e) => e.offsetParent !== null && getComputedStyle(e).visibility !== 'hidden');
    for (const e of ui) {
      const q = e.getBoundingClientRect(); if (!q.width) continue;
      // inside a scroller is fine if the scroller itself is inside the viewport
      const sc = e.closest('.ui-scroll'); const box = sc && sc !== e ? sc.getBoundingClientRect() : null;
      const vis = box ? { left: Math.max(q.left, box.left), right: Math.min(q.right, box.right), top: Math.max(q.top, box.top), bottom: Math.min(q.bottom, box.bottom) } : q;
      if (vis.right <= vis.left || vis.bottom <= vis.top) continue;
      if (!e.closest('.ui-scroll') && (q.left < -1 || q.top < -1 || q.right > vw + 1 || q.bottom > vh + 1) && !e.matches('.hud-banner')) out.cut.push(`${e.className} ${Math.round(q.left)},${Math.round(q.top)},${Math.round(q.right)},${Math.round(q.bottom)}`);
      for (const [n, bq] of btns) if (vis.left < bq.right && vis.right > bq.left && vis.top < bq.bottom && vis.bottom > bq.top) out.overlap.push(`${e.className.split(' ')[0]} x ${n}`);
    }
    return out;
  });
  checks++;
  for (const x of [...new Set(r.cut)]) problems.push(`${c.id} ${label}: cut ${x}`);
  for (const x of [...new Set(r.overlap)]) problems.push(`${c.id} ${label}: overlap ${x}`);
}
const only = process.argv[2];
for (const c of ALL) {
  const full = SHOT.has(c.id) && only !== 'quick';
  const ctx = await b.newContext({ viewport: { width: c.w, height: c.h }, deviceScaleFactor: c.dpr || 1, hasTouch: !!c.touch, isMobile: !!c.touch });
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', (e) => errs.push(String(e))); page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  const go = async (extra = '') => {
    await page.goto(`${base}?save=0&timescale=0&hour=12&clouds=0&platform=${c.p}&uidemo=1&lead=rillop&warmth=80${extra}`);
    try { await page.waitForFunction(() => window.kilumen?.ui, null, { timeout: 30000 }); } catch (e) { console.log('load fail', c.id, extra, errs, await page.evaluate(() => [!!window.kilumen, !!window.kilumen?.scene?.map, document.readyState])); throw e; }
    await page.waitForTimeout(400);
  };
  const shot = async (name) => { await page.screenshot({ path: `${OUT}/${c.id}_${name}.png` }); };
  // overworld HUD + banner + A prompt (facing the Route 1 sign)
  await go('&map=route1&x=6&y=31&facing=up'); await page.waitForTimeout(500);
  await layout(page, c, 'hud'); await shot('overworld_hud');
  // dialogue (sign) with reveal, then ask + toast
  await page.evaluate(() => { const s = window.kilumen.scene; const n = s.npcs.list.find((n) => n.sprite?.portraits?.neutral); const sp = s.speakerFor(n, true); s.say(['You looked my way. That means a battle! Let us see what your partner can do.'], { ...sp, name: sp.name || 'Trainer Kit' }); });
  await page.waitForTimeout(250); if (full) await shot('dialogue_reveal'); await page.waitForTimeout(1200); await shot('dialogue');
  await page.evaluate(() => window.kilumen.scene.dialog.close?.()); await page.keyboard.press('KeyZ'); await page.waitForTimeout(300);
  await go('&map=route1&x=6&y=31&facing=up');
  await page.evaluate(() => { const s = window.kilumen.scene; s.ask(["File today's report? This saves your game."], ['File it', 'Not yet']); s.toast('Report auto-filed.'); });
  await page.waitForTimeout(700); await shot('ask_toast'); await layout(page, c, 'ask');
  // menu screens
  for (const id of SCREENS) {
    await go(`&map=brookhollow&ui=${id}`); await page.waitForTimeout(id === 'phone' ? 500 : 600);
    await layout(page, c, id); if (full || id === 'phone' || id === 'team') await shot(`menu_${id}`);
  }
  await go('&map=brookhollow&ui=phone'); await page.keyboard.press('ArrowRight'); await page.waitForTimeout(150); await layout(page, c, 'phone-nav');
  // save prompt (modal), level-up, battle, title
  await go('&map=brookhollow&ui=save'); await page.waitForTimeout(500); await layout(page, c, 'save'); await shot('save_prompt');
  if (full) { await page.keyboard.press('KeyZ'); await page.waitForTimeout(600); await shot('save_filing'); await page.waitForTimeout(800); await shot('save_done'); }
  await go('&map=route1&ui=battle'); await page.waitForTimeout(1600); await layout(page, c, 'battle-msg'); if (full) await shot('battle_intro');
  await page.keyboard.press('KeyZ'); await page.waitForTimeout(1200); await layout(page, c, 'battle-cmd'); await shot('battle_commands');
  await page.keyboard.press('KeyZ'); await page.waitForTimeout(300); await layout(page, c, 'battle-skills'); await shot('battle_skills');
  if (full) { await page.keyboard.press('KeyZ'); await page.waitForTimeout(1250); await shot('battle_hit'); }
  await go('&map=route1&ui=levelup'); await page.waitForTimeout(2600); await layout(page, c, 'levelup'); await shot('levelup');
  await page.goto(`${base}?title=1&save=0&timescale=0&hour=12&clouds=0&platform=${c.p}&map=brookhollow`); await page.waitForFunction(() => window.kilumen?.ui); await page.waitForTimeout(900);
  await shot('title'); await layout(page, c, 'title'); await page.keyboard.press('Enter'); await page.waitForTimeout(500); await layout(page, c, 'title-menu'); if (full) await shot('title_menu');
  if (errs.length) problems.push(`${c.id}: errors ${[...new Set(errs)].join(' | ')}`);
  await ctx.close();
}
await b.close();
console.log(`${checks} layout checks, ${problems.length} problems`); for (const p of problems) console.log(' -', p);
process.exit(problems.length ? 1 : 0);
