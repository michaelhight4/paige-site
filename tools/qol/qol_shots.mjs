// QoL v1 shots: Options rows (Battle pace / Text speed / Run) and a battle at pace x3, on PC and phone. Run with a static
// server on :8137 from the repo root. Output: shots/qol_v1/*.png
import { chromium } from 'playwright';
const base = 'http://localhost:8137/index.html';
const out = 'shots/qol_v1/';
const devs = [{ n: 'pc', w: 1366, h: 768, dpr: 1, touch: false }, { n: 'phone', w: 844, h: 390, dpr: 3, touch: true }];
const b = await chromium.launch();
for (const d of devs) {
  const ctx = await b.newContext({ viewport: { width: d.w, height: d.h }, deviceScaleFactor: d.dpr, hasTouch: d.touch, isMobile: d.touch });
  await ctx.addInitScript(() => localStorage.setItem('kilumen.qol.v1', JSON.stringify({ pace: 3, text: 'fast', run: 'toggle' })));
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(`${base}?save=0&timescale=0&hour=12&title=0&ix2=0&map=route1&x=20&y=24&ui=options&uidemo=1`); await p.waitForTimeout(6000);
  await p.evaluate(() => [...document.querySelectorAll('[data-scr="options"] .ui-row')].find((r) => /Battle pace/.test(r.textContent))?.scrollIntoView({ block: 'center' }));
  await p.waitForTimeout(300); await p.screenshot({ path: `${out}${d.n}_01_options.png` });
  const rows = await p.$$eval('[data-scr="options"] .ui-row', (r) => r.map((x) => x.textContent.trim()));
  console.log(d.n, 'rows:', rows.filter((r) => /pace|Text speed|Run/.test(r)).join(' | '));
  const tCmd = async (extra) => { await p.goto(`${base}?save=0&timescale=0&hour=12&title=0&ix2=0&map=route1&x=20&y=24&ui=battle&uidemo=1${extra}`);
    await p.waitForSelector('#b-msg', { timeout: 20000 }); const t0 = Date.now(); await p.waitForSelector('#b-cmds:not([hidden])', { timeout: 20000 }); return Date.now() - t0; };
  console.log(d.n, 'battle intro to commands ms: pace x3 =', await tCmd(''), ', qol off =', await tCmd('&qol=0'));
  await tCmd('');
  await p.screenshot({ path: `${out}${d.n}_02_battle_pace3.png` });
  await tCmd('&qol=0');
  await p.screenshot({ path: `${out}${d.n}_03_battle_qol_off_same_time.png` });
  console.log(d.n, 'reveal-ms:', await p.evaluate(() => document.documentElement.style.getPropertyValue('--reveal-ms') || '(default)'), 'errors:', errs.length, errs.slice(0, 2).join(' / '));
  await ctx.close();
}
await b.close();
