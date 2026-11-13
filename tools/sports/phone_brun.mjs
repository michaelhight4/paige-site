// Phone check (v0.2.41, Gary 2:18 AM CT): hold the touchpad B + hold a d-pad arrow with two real touch points (CDP) = run.
// usage: node tools/sports/phone_brun.mjs BASE OUTDIR [live]   (DEV adds ?flags=has_run_shoes; live grants the flag in-page)
import { chromium, devices } from 'playwright';
const [BASE = 'http://localhost:8137/', OUT = 'shots/sports_v5', LIVE] = process.argv.slice(2);
const b = await chromium.launch();
const ctx = await b.newContext({ ...devices['Pixel 7'], viewport: { width: 915, height: 412 }, recordVideo: { dir: OUT + '/_v_brun', size: { width: 915, height: 412 } } });
const page = await ctx.newPage(); const errs = []; page.on('pageerror', (e) => errs.push(String(e)));
await page.goto(BASE + (BASE.includes('?') ? '&' : '?') + (LIVE ? '' : 'map=brookhollow&title=0&cv=0&idb=0&flags=has_run_shoes'));
for (let i = 0; i < 30; i++) {
  for (const t of ['Got it', 'New game']) { const el = page.getByText(t, { exact: true }); if (await el.isVisible().catch(() => false)) await el.tap().catch(() => {}); }
  const ui = await page.getByText(/^(Got it|New game|Continue|Press Enter or Start)$/).first().isVisible().catch(() => false);
  const inOw = await page.evaluate(() => !!window.kilumen?.scene?.map).catch(() => false);
  if (inOw && !ui && i > 2) break; await page.keyboard.press('Enter'); await page.waitForTimeout(700);
}
await page.waitForFunction(() => window.kilumen?.ready, null, { timeout: 60000 }); await page.waitForTimeout(1200);
for (let i = 0; i < 15 && await page.evaluate(() => !!window.kilumen.scene.dialog?.active || window.kilumen.scene.busy); i++) { await page.keyboard.press('f'); await page.waitForTimeout(350); }
const cdp = await ctx.newCDPSession(page);
const ctr = (sel) => page.evaluate((s) => { const r = document.querySelector(s).getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }, sel);
const place = (map, x, y, f) => page.evaluate(async ([m, x, y, f]) => { const sc = window.kilumen.scene; if (sc.map?.name !== m) { sc.map = await sc.loadMap(m); await sc.ensureAssets(); sc.player.place(x, y, f); await sc._enterMap(); } else sc.player.place(x, y, f); sc._dirty = true; }, [map, x, y, f]);
async function hold(withB, ms, map, x, y) {
  await place(map, x, y, 'right'); await page.waitForTimeout(500);
  for (let i = 0; i < 10 && await page.evaluate(() => !!window.kilumen.scene.dialog?.active); i++) { await page.keyboard.press('f'); await page.waitForTimeout(300); }
  const R = await ctr('#touchpad [data-dir=right]'), B = await ctr('#touchpad [data-btn=b]');
  const pts = withB ? [{ ...B, id: 2 }, { ...R, id: 1 }] : [{ ...R, id: 1 }];
  if (withB) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [pts[0]] }); await page.waitForTimeout(60); }
  const x0 = await page.evaluate(() => window.kilumen.scene.player.x);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pts });
  let mode = null; const t0 = Date.now(); while (Date.now() - t0 < ms) { mode = await page.evaluate(() => window.kilumen.scene.player.mode) || mode; await page.waitForTimeout(100); }
  const x1 = await page.evaluate(() => window.kilumen.scene.player.x);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await page.waitForTimeout(400);
  return { tiles: x1 - x0, mode };
}
if (LIVE) await page.evaluate(() => window.kilumen.scene.flags.add('has_run_shoes'));
// brookhollow cobble row y=27 runs east from x=20 (open ground; the Dash Track path)
const walk = await hold(false, 1500, 'brookhollow', 14, 28);
const run = await hold(true, 1500, 'brookhollow', 14, 28);
await page.screenshot({ path: `${OUT}/phone_brun_outdoor.png` });
const ind = await page.evaluate(() => { const m = window.kilumen.scene.map; return null; });
// B still cancels: open the start menu with A? use the dialog: talk-free check -> B tap while a dialog is open closes it is covered by dialog tests
const res = { walk, run, errs };
console.log(JSON.stringify(res));
console.log(run.tiles > walk.tiles * 1.5 && run.mode === 'run' ? 'PASS B+dpad runs on phone' : 'FAIL');
const vid = await page.video().path(); await ctx.close(); await b.close();
const fs = await import('node:fs'); fs.renameSync(vid, `${OUT}/phone_brun${LIVE ? '_live' : ''}.webm`); fs.rmSync(OUT + '/_v_brun', { recursive: true, force: true });
