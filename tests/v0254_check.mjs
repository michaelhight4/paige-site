// v0.2.54 checks: Esc menu (real key events) + every map's placed NPCs drawn. BASE=http://.../kilumen/ node tests/v0254_check.mjs [pc|phone] [maps]
import { chromium } from 'playwright';
const BASE = process.env.BASE || 'http://127.0.0.1:8754/kilumen/';
const dev = process.argv[2] || 'pc', doMaps = process.argv[3] === 'maps';
const vp = dev === 'pc' ? { viewport: { width: 1920, height: 1080 } } : { viewport: { width: 844, height: 390 }, deviceScaleFactor: 3, hasTouch: true, isMobile: true };
const b = await chromium.launch(); const ctx = await b.newContext(vp); const page = await ctx.newPage();
await page.addInitScript(() => { try { localStorage.setItem('kilumen_alpha_notice_seen.v1', '1'); } catch {} });
const errs = []; page.on('pageerror', (e) => errs.push(String(e)));
await page.goto(BASE + '?save=0&audio=0&online=0&title=0&cloudsave=0');
await page.waitForFunction(() => window.kilumen?.scene?.tileset, null, { timeout: 30000 });
const st = () => page.evaluate(() => { const s = window.kilumen.scene; return { map: s.map?.name, fade: !!s.fade, busy: !!s.busy, dlg: !!s.dialog?.active, title: !!document.querySelector('.title-screen,#title,.kt-title'), ui: !!window.kilumen.ui }; });
for (let i = 0; i < 30; i++) { const x = await st(); if (x.map && !x.fade && !x.busy && !x.dlg && x.ui && i > 3) break; await page.keyboard.press('Enter'); await page.waitForTimeout(700); }
console.log('state', JSON.stringify(await st()));
await page.waitForTimeout(1500);
const ui = () => page.evaluate(() => { const u = window.kilumen.ui || window.kilumen.scene.ui; return u ? { active: !!u.active, depth: u.stack?.length ?? null, top: u.top?.id ?? null } : null; });
const ver = await page.evaluate(() => document.querySelector('script[type=module]')?.src || '');
console.log('ver', ver);
const r = {};
await page.keyboard.press('Escape'); await page.waitForTimeout(700); r.afterEsc1 = await ui();
await page.keyboard.press('Enter'); await page.waitForTimeout(700); r.afterEnter = await ui();
await page.keyboard.press('Escape'); await page.waitForTimeout(700); r.afterEscBack = await ui();
await page.keyboard.press('Escape'); await page.waitForTimeout(700); r.afterEscClose = await ui();
// held Esc (auto-repeat) must not flicker
await page.keyboard.down('Escape'); await page.waitForTimeout(400); await page.keyboard.up('Escape'); await page.waitForTimeout(600); r.afterHeld = await ui();
await page.keyboard.press('Escape'); await page.waitForTimeout(600);
console.log(dev, 'ESC', JSON.stringify(r));
if (doMaps) {
  const names = await page.evaluate(() => [...(window.kilumen.scene.knownMaps || [])]);
  const bad = [];
  for (const n of names) {
    const ok = await page.evaluate(async (n) => { const s = window.kilumen.scene; try { const m = await s.loadMap(n); const w = (m.json?.warps || m.warps || [])[0]; s.startWarp({ map: n, x: w?.x ?? 1, y: w?.y ?? 1, facing: 'down' }, 'door'); return true; } catch (e) { return String(e); } }, n);
    try { await page.waitForFunction((n) => window.kilumen.scene.map?.name === n && !window.kilumen.scene.fade, n, { timeout: 8000 }); } catch { bad.push([n, 'nowarp', ok]); continue; }
    await page.waitForTimeout(700);
    const miss = await page.evaluate(() => window.kilumen.scene.npcs.list.filter((x) => x.kind !== 'object' && !x.sprite).map((x) => x.id));
    if (miss.length) bad.push([n, miss]);
  }
  console.log('maps', names.length, 'undrawn', JSON.stringify(bad));
}
if (process.env.SHOT) await page.screenshot({ path: process.env.SHOT });
console.log('errors', errs.slice(0, 5));
await b.close();
