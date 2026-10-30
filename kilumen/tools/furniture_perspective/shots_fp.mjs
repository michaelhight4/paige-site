// node shots_fp.mjs out_dir port hours(csv) views(csv: pc,phone) map:x:y:label ...  -> <label>_h<H>_<view>.png
// One page load per (view, hour); rooms are reached with startWarp (furniture perspective pass, wd).
import { chromium } from '/workspace/kilumen/node_modules/playwright/index.mjs';
import fs from 'fs';
const [out, port, hours, vlist, ...specs] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch();
const all = { pc: { viewport: { width: 1280, height: 800 } }, phone: { viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } };
for (const vk of vlist.split(',')) {
  const ctx = await b.newContext(all[vk]); const p = await ctx.newPage();
  await ctx.addInitScript(() => { localStorage.setItem('kilumen_alpha_notice_seen.v1', '1'); localStorage.setItem('kilumen_alpha_ui.motion', 'full'); });
  for (const h of hours.split(',')) {
    const [m0, x0, y0] = specs[0].split(':');
    await p.goto(`http://localhost:${port}/?save=0&timescale=0&hour=${h}&title=0&ix2=1&skipintro=1&map=${m0}&x=${x0}&y=${y0}`);
    await p.waitForTimeout(2500);
    for (let k = 0; k < 12; k++) { await p.keyboard.press('Enter'); await p.waitForTimeout(400); }
    for (const s of specs) {
      const [map, x, y, label = map] = s.split(':');
      await p.evaluate(async ([map, x, y]) => { await window.kilumen.ready; window.kilumen.scene.startWarp({ map, x: +x, y: +y, facing: 'up' }, 'dev'); }, [map, x, y]);
      await p.waitForTimeout(3200);
      // SHOW_TBD=1: also draw pickups whose item is still TBD (all wood-floor chests are TBD today; shot-only, config untouched)
      if (process.env.SHOW_TBD) await p.evaluate(() => { window.kilumen.scene.systems.cfg.giveTbdItems = true; window.kilumen.scene._dirty = true; });
      // time of day: clock.js phase from scene.clock (dawn 5-7, day 8-16, dusk 17-19, night 20-4); a warp can reset it, so set it after
      await p.evaluate((h) => { const k = window.kilumen; k.scene.setHour(+h); }, h);
      for (let k = 0; k < 10; k++) { const busy = await p.evaluate(() => !!(window.kilumen.scene.busy || window.kilumen.scene.dialog?.active)); if (!busy) break; await p.keyboard.press('Enter'); await p.waitForTimeout(350); }
      await p.waitForTimeout(900);
      if (await p.evaluate(() => !!window.kilumen.scene.dialog?.active)) { await p.keyboard.press('Enter'); await p.waitForTimeout(900); }
      await p.screenshot({ path: `${out}/${label}_h${h}_${vk}.png` });
    }
  }
  await ctx.close();
}
await b.close(); console.log('done');
