// Walk test (Oct 29): cobble path (37,27) -> dirt path -> under the arch -> onto the Dash Track; screenshots the track + coach.
// usage: node tools/sports/walk_track.mjs BASE OUTDIR [phone]
import { chromium, devices } from 'playwright';
const [BASE = 'http://localhost:8137/', OUT = 'shots/sports_v4', PH] = process.argv.slice(2);
const b = await chromium.launch(); const ctx = await b.newContext(PH ? { ...devices['Pixel 7'], viewport: { width: 915, height: 412 } } : { viewport: { width: 1280, height: 720 } });
const page = await ctx.newPage(); const errs = []; page.on('pageerror', (e) => errs.push(String(e))); page.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await page.goto(BASE + (BASE.includes('?') ? '&' : '?') + 'map=brookhollow&title=0&cv=0&idb=0');
// live build: alpha notice + title screen (DEV skips them with ?title=0)
for (let i = 0; i < 30; i++) {
  const got = page.getByText('Got it', { exact: true }); if (await got.isVisible().catch(() => false)) await got.click().catch(() => {});
  const ng = page.getByText('New game', { exact: true }); if (await ng.isVisible().catch(() => false)) await ng.click().catch(() => {});
  const inOw = await page.evaluate(() => !!window.kilumen?.scene?.map && !document.querySelector('#title:not([hidden]), .title-screen:not([hidden])')).catch(() => false);
  const ui = await page.getByText(/^(Got it|New game|Continue|Press Enter or Start)$/).first().isVisible().catch(() => false);
  if (inOw && !ui && i > 2) break; await page.keyboard.press('Enter'); await page.waitForTimeout(700);
}
await page.waitForFunction(() => window.kilumen?.ready, null, { timeout: 60000 }); await page.evaluate(() => window.kilumen.ready); await page.waitForTimeout(1500);
const pos = () => page.evaluate(() => { const p = window.kilumen.scene.player; return [p.x, p.y, window.kilumen.scene.map?.name || window.kilumen.scene.mapName]; });
await page.evaluate(async () => { const sc = window.kilumen.scene; if ((sc.map?.name) !== 'brookhollow') { sc.map = await sc.loadMap('brookhollow'); await sc.ensureAssets(); sc.player.place(37, 27, 'right'); await sc._enterMap(); sc._dirty = true; } const p = sc.player; p.x = p.px = 37; p.y = p.py = 27; p.facing = 'right'; });
await page.mouse.click(5, 5).catch(() => {});
const go = async (key, tx, ty) => { for (let i = 0; i < 40; i++) { const [x, y] = await pos(); if ((tx != null && x === tx) || (ty != null && y === ty)) return; await page.keyboard.down(key); await page.waitForTimeout(60); await page.keyboard.up(key); await page.waitForFunction(() => !window.kilumen.scene.state().moving && !window.kilumen.scene.player.moving, null, { timeout: 3000 }).catch(() => {}); await page.waitForTimeout(120); } };
for (let i = 0; i < 12 && await page.evaluate(() => !!window.kilumen.scene.dialog?.active || window.kilumen.scene.busy); i++) { await page.keyboard.press('f'); await page.waitForTimeout(400); }
const log = [await pos()];
await go('ArrowRight', 47, null); log.push(await pos());
await page.screenshot({ path: `${OUT}/${PH ? 'phone' : 'desktop'}_track_gate.png` });
await go('ArrowDown', null, 33); log.push(await pos());
await page.waitForTimeout(400); await page.screenshot({ path: `${OUT}/${PH ? 'phone' : 'desktop'}_track_overview.png` });
const coach = await page.evaluate(() => window.kilumen.scene.state().npcs.find((a) => a.id === 'dash_coach') || null);
console.log(JSON.stringify({ log, coach, errs }));
const ok = log[1][0] === 47 && log[2][1] === 33; console.log(ok && !errs.length ? 'PASS walk cobble->dirt->track' : 'FAIL'); await b.close();
