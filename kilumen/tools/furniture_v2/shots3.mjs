// node shots.mjs out_dir map:x:y[:label] ...  -> <label>_{old,v2,v3}_{pc,phone}.png (old=80ae7f1 :8761, v2=d3aba69 :8763, v3=this branch :8762)
import { chromium } from '/workspace/kilumen/node_modules/playwright/index.mjs';
const [out, ...specs] = process.argv.slice(2);
const b = await chromium.launch();
const views = { pc: { viewport: { width: 1280, height: 800 } }, phone: { viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } };
for (const [vk, vo] of Object.entries(views)) {
  const ctx = await b.newContext(vo); const p = await ctx.newPage(); await ctx.addInitScript(() => { localStorage.setItem('kilumen_alpha_notice_seen.v1', '1'); localStorage.setItem('kilumen_alpha_ui.motion', 'full'); });
  for (const s of specs) {
    const [map, x, y, label = map] = s.split(':');
    for (const [tag, port] of [['old', 8761], ['v2', 8763], ['v3', 8762]]) {
      await p.goto(`http://localhost:${port}/?save=0&timescale=0&hour=12&title=0&ix2=1&map=${map}&x=${x}&y=${y}`);
      await p.waitForTimeout(2500);
      for (let k = 0; k < 12; k++) { await p.keyboard.press('Enter'); await p.waitForTimeout(600); }
      await p.evaluate(async ([map, x, y]) => { await window.kilumen.ready; window.kilumen.scene.startWarp({ map, x: +x, y: +y, facing: 'down' }, 'dev'); }, [map, x, y]);
      await p.waitForTimeout(3500);
      await p.screenshot({ path: `${out}/${label}_${tag}_${vk}.png` });
    }
  }
  await ctx.close();
}
await b.close();
