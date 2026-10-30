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
    await p.goto(`http://localhost:${port}/?save=0&timescale=0&hour=${h}&title=0&ix2=1&map=${m0}&x=${x0}&y=${y0}`);
    await p.waitForTimeout(2500);
    for (let k = 0; k < 12; k++) { await p.keyboard.press('Enter'); await p.waitForTimeout(400); }
    for (const s of specs) {
      const [map, x, y, label = map] = s.split(':');
      await p.evaluate(async ([map, x, y]) => { await window.kilumen.ready; window.kilumen.scene.startWarp({ map, x: +x, y: +y, facing: 'up' }, 'dev'); }, [map, x, y]);
      await p.waitForTimeout(3000);
      await p.screenshot({ path: `${out}/${label}_h${h}_${vk}.png` });
    }
  }
  await ctx.close();
}
await b.close(); console.log('done');
