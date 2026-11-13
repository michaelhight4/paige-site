import { createRequire } from 'node:module';
const require = createRequire('/workspace/kilumen/package.json');
const { chromium } = require('playwright');
const OUT = '/workspace/kilumen/shots/badges_tab_v2';
const runs = [
  { name: 'pc', ctx: { viewport: { width: 1280, height: 800 } } },
  { name: 'phone', ctx: { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } },
];
const b = await chromium.launch();
for (const run of runs) {
  const cx = await b.newContext(run.ctx); await cx.addInitScript(() => { try { localStorage.setItem('kilumen_alpha_notice_seen.v1', '1'); } catch {} }); const page = await cx.newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto('http://localhost:8191/?badges=1&reset=1', { waitUntil: 'load' });
  await page.waitForFunction(() => window.kilumen?.ready, null, { timeout: 60000 });
  await page.evaluate(() => window.kilumen.ready); await page.waitForTimeout(1500);
  const st = await page.evaluate(() => {
    const sc = window.kilumen.scene, k = window.kilumen, S = sc.systems?.state || (sc._achHolder ||= {});
    for (const f of ['beat_master_fernwick', 'beat_master_saltmere', 'beat_master_revival', 'beat_master_frostspire', 'beat_master_tidewater', 'beat_master_cindervale']) sc.flags.add(f);
    const kx = sc.systems?.kilindex; if (kx) for (let i = 0; i < 23; i++) kx.data.caught['sp' + i] = 1;
    (S.sports ||= {}).wins = 3; const rec = ((S.progression ||= {}).masters ||= {}); for (const z of ['fernwick','saltmere','revival_heights','frostspire','tidewater_coast','cindervale']) rec[z] ||= { coin: 1, flag: 'x' }; if (!sc.systems) (sc._sportsState ||= {}).sports = S.sports;
    S.achievements = { v: 1, e: {
      coin_fernwick: { count: 1, first: '2026-10-21', last: '2026-10-21', seen: 1 }, coin_saltmere: { count: 1, first: '2026-10-24', last: '2026-10-24', seen: 1 },
      coin_revival_heights: { count: 1, first: '2026-10-27', last: '2026-10-27', seen: 1 },
      title_brookhollow_dash: { count: 2, first: '2026-10-25', last: '2026-10-28', seen: 2 },
      ms_masters_1: { count: 1, first: '2026-10-21', last: '2026-10-21', seen: 1 }, ms_kilindex_10: { count: 1, first: '2026-10-22', last: '2026-10-22', seen: 1 } } };
    k.ui.open('pack'); return { sys: !!sc.systems, kx: !!kx };
  });
  const n = await page.evaluate(() => document.querySelectorAll('.ui-tab').length);
  await page.evaluate((i) => document.querySelectorAll('.ui-tab')[i].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })), n - 1); await page.waitForTimeout(200); if (!(await page.$('[data-scr="badges"]'))) await page.locator('.ui-tab').nth(n - 1).click({ force: true });
  await page.waitForTimeout(650); // mid shine / bump
  await page.screenshot({ path: `${OUT}/${run.name}_badges_new_shine.png` });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${OUT}/${run.name}_badges.png` }); await page.locator('[data-k="title_brookhollow_dash"]').screenshot({ path: `${OUT}/${run.name}_stacked_x3_row.png` });
  await page.evaluate(() => document.querySelector('[data-scr="badges"]')?.scrollTo(0, 9999)); await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/${run.name}_badges_scrolled.png` });
  // Key Items pocket with the coin rows
  await page.evaluate(() => { const ts = [...document.querySelectorAll('.ui-tab')]; const k = ts.findIndex((t) => /key/i.test(t.textContent)); (ts[k >= 0 ? k : 3]).dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); });
  await page.waitForTimeout(300); let ki = await page.$('[data-k^="master_coin_"]');
  if (!ki) { const ts = await page.$$('.ui-tab'); for (let i = 0; i < ts.length && !ki; i++) { await ts[i].click({ force: true }); await page.waitForTimeout(200); ki = await page.$('[data-k^="master_coin_"]'); } }
  if (ki) await ki.click({ force: true }); await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/${run.name}_key_items_coins.png` });
  // in-place award card
  await page.evaluate(() => window.kilumen.ui.closeAll?.()); await page.waitForTimeout(300);
  await page.evaluate(async () => { const m = await import('/src/achievements/coin_art.js?v=v0.2.61-alpha'); m.showCoinAward('lanternport', 'Lantern Coin received! (placeholder)'); });
  await page.waitForTimeout(500); await page.screenshot({ path: `${OUT}/${run.name}_award_in_place.png` });
  console.log(run.name, 'keyitem', !!ki, JSON.stringify(st), 'tabs', n, 'errors', errs);
}
await b.close();
