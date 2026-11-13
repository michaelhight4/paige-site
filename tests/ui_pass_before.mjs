// UI pass "before" shots (Oct 22, 2026): overworld HUD, dialogue + name/portrait, ask list, toast, and Esc (no menu yet).
// Usage: PORT=8093 node tests/ui_pass_before.mjs
import { chromium } from 'playwright';
import fs from 'node:fs';
const OUT = 'shots/ui_pass/before'; fs.mkdirSync(OUT, { recursive: true });
const base = `http://127.0.0.1:${process.env.PORT || 8093}/index.html`;
const CASES = [{ id: 'pc1920', w: 1920, h: 1080, touch: false, p: 'pc' }, { id: 'pc1366', w: 1366, h: 768, touch: false, p: 'pc' }, { id: 'mob932', w: 932, h: 430, touch: true, p: 'mobile', dpr: 2 }];
const b = await chromium.launch();
for (const c of CASES) {
  const ctx = await b.newContext({ viewport: { width: c.w, height: c.h }, deviceScaleFactor: c.dpr || 1, hasTouch: c.touch, isMobile: c.touch });
  const page = await ctx.newPage();
  await page.goto(`${base}?save=0&timescale=0&hour=12&map=route1&clouds=0&platform=${c.p}&lead=rillop`);
  await page.waitForFunction(() => window.kilumen?.scene?.tileset); await page.evaluate(() => window.kilumen.ready); await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/${c.id}_overworld_hud.png` });
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/${c.id}_menu_key_nothing.png` });
  await page.evaluate(() => { const s = window.kilumen.scene; const n = s.npcs.list.find((n) => n.sprite?.portraits?.neutral); const sp = s.speakerFor(n, true); s.say(['You looked my way. That means a battle!'], { ...sp, name: sp.name || 'Trainer Kit' }); });
  await page.waitForTimeout(700); await page.screenshot({ path: `${OUT}/${c.id}_dialogue.png` });
  await page.evaluate(() => { const s = window.kilumen.scene; s.dialog.active && s.dialog.close?.(); });
  await page.close(); const p2 = await ctx.newPage();
  await p2.goto(`${base}?save=0&timescale=0&hour=12&map=route1&clouds=0&platform=${c.p}`); await p2.waitForFunction(() => window.kilumen?.scene?.tileset); await p2.evaluate(() => window.kilumen.ready);
  await p2.evaluate(() => { const s = window.kilumen.scene; s.ask(['File today\'s report? This saves your game.'], ['File it', 'Not yet']); s.toast('Report auto-filed.'); });
  await p2.waitForTimeout(700); await p2.screenshot({ path: `${OUT}/${c.id}_ask_toast.png` });
  await ctx.close();
}
await b.close(); console.log('ok');
