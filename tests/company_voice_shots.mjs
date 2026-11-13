// Company voice strip shots (design/company_voice.md). LOCAL ONLY: writes to shots/company_voice/.
// Usage: node tests/company_voice_shots.mjs [port=8132]   (needs a static server on the repo root; ?cv=1)
// PC 1920x1080 + phone 844x390 (landscape, touch): Gary's model line (Kilindex entry) on Trail 1, a 2-page Master line
// (page 2), the Options row, and the default-off control (no ?cv=1 -> no strip).
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const PORT = process.argv[2] || '8132';
const OUT = path.resolve('shots/company_voice');
fs.mkdirSync(OUT, { recursive: true });
const PLATFORMS = [
  ['pc', { viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 }, 'platform=pc'],
  ['phone', { viewport: { width: 844, height: 390 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }, 'platform=mobile&touch=1'],
];
const report = { shots: {}, errors: [] };
const browser = await chromium.launch();
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

for (const [plat, ctxOpts, pq] of PLATFORMS) {
  const ctx = await browser.newContext(ctxOpts);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => report.errors.push(`${plat}: ${e}`));
  page.on('console', (m) => { if (m.type() === 'error') report.errors.push(`${plat} console: ${m.text()}`); });
  const go = async (extra) => {
    await page.goto(`http://127.0.0.1:${PORT}/index.html?save=0&skipintro=1&audio=0&${pq}&map=route1&x=34&y=26&hour=12&weather=clear${extra}`);
    await page.evaluate(() => window.kilumen.ready);
    await wait(1500);
  };
  const until = (fn, ms = 8000) => page.waitForFunction(fn, null, { timeout: ms });

  // 1. Gary's line: new Kilindex entry
  await go('&cv=1');
  await until(() => !!window.kilumen.companyVoice);
  const st1 = await page.evaluate(() => {
    const s = window.kilumen.scene, cv = window.kilumen.companyVoice;
    s.flags.add('got_starter'); cv.emit('kilindex_new', { key: 2, count: 2 });
    return cv.state();
  });
  await until(() => !!window.kilumen.companyVoice.current); await wait(500); // slide-in .22s
  const a = await page.evaluate(() => ({ ...window.kilumen.companyVoice.state(), saveLock: window.kilumen.scene.saveLockReason() }));
  await page.screenshot({ path: path.join(OUT, `${plat}_kilindex_new.png`) });
  report.shots[`${plat}_kilindex_new`] = a; console.log(plat, 'kilindex_new', JSON.stringify(a.showing), a.saveLock, st1.mode);
  // walk while it is up (does not block movement)
  const before = await page.evaluate(() => ({ x: window.kilumen.scene.player.x, y: window.kilumen.scene.player.y }));
  await page.keyboard.down('ArrowLeft'); await wait(700); await page.keyboard.up('ArrowLeft');
  const after = await page.evaluate(() => ({ x: window.kilumen.scene.player.x, y: window.kilumen.scene.player.y, up: !!window.kilumen.companyVoice.current }));
  report.shots[`${plat}_kilindex_new`].walk = { before, after }; console.log(plat, 'walk while shown', JSON.stringify(before), JSON.stringify(after));
  // tap / click dismisses
  await page.locator('.cv-strip').click();
  const tapped = await page.evaluate(() => window.kilumen.companyVoice.current === null);
  report.shots[`${plat}_kilindex_new`].tapDismiss = tapped; console.log(plat, 'tap dismiss', tapped);

  // 2. Master beaten, 2 pages -> page 2
  await go('&cv=1');
  await until(() => !!window.kilumen.companyVoice);
  await page.evaluate(() => { const s = window.kilumen.scene; s.flags.add('got_starter'); window.kilumen.companyVoice.emit('master_beaten', { key: 'fernwick', master: 'Fernwick' }); });
  await until(() => !!window.kilumen.companyVoice.current); await wait(500);
  await page.screenshot({ path: path.join(OUT, `${plat}_master_p1.png`) });
  await page.evaluate(() => window.kilumen.companyVoice.advance('shot')); await wait(100);
  const m = await page.evaluate(() => window.kilumen.companyVoice.state());
  await page.screenshot({ path: path.join(OUT, `${plat}_master_p2.png`) });
  report.shots[`${plat}_master`] = m; console.log(plat, 'master p2', JSON.stringify(m.showing));

  // 3. Options row
  const opt = await page.evaluate(async () => {
    const ui = window.kilumen.ui; if (!ui?.open) return 'no ui.open';
    window.kilumen.companyVoice.hide('shot');
    try { ui.open('options'); } catch (e) { return String(e); }
    return 'ok';
  });
  await wait(600);
  const row = await page.evaluate(() => { const r = [...document.querySelectorAll('*')].find((e) => e.children.length === 0 && /^Company voice$/.test(e.textContent.trim())); if (r) r.scrollIntoView({ block: 'center' }); return !!r; });
  await wait(300);
  await page.screenshot({ path: path.join(OUT, `${plat}_options.png`) });
  report.shots[`${plat}_options`] = { opt, row }; console.log(plat, 'options', opt, 'row', row);

  // 4. default off: no ?cv=1 -> nothing attached, no strip
  await go('');
  const off = await page.evaluate(() => ({ cv: window.kilumen.companyVoice ?? null, strip: !!document.querySelector('.cv-strip') }));
  report.shots[`${plat}_default_off`] = off; console.log(plat, 'default off', JSON.stringify(off));
  await ctx.close();
}
await browser.close();
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
console.log('errors', report.errors.length, report.errors.slice(0, 5));
