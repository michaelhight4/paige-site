// node shots4.mjs out_dir map:x:y[:label] ...  -> <label>_{pc,phone}.png from this branch (:8762) + fps.json (phone 844x390, 4x CPU throttle)
import { chromium } from '/workspace/kilumen/node_modules/playwright/index.mjs';
import fs from 'fs';
const [out, ...specs] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch(); const fps = {};
const views = { pc: { viewport: { width: 1280, height: 800 } }, phone: { viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } };
for (const [vk, vo] of Object.entries(views)) {
  const ctx = await b.newContext(vo); const p = await ctx.newPage(); await ctx.addInitScript(() => { localStorage.setItem('kilumen_alpha_notice_seen.v1', '1'); localStorage.setItem('kilumen_alpha_ui.motion', 'full'); });
  for (const s of specs) {
    const [map, x, y, label = map] = s.split(':');
    await p.goto(`http://localhost:8762/?save=0&timescale=0&hour=12&title=0&ix2=1&map=${map}&x=${x}&y=${y}`);
    await p.waitForTimeout(2500);
    for (let k = 0; k < 12; k++) { await p.keyboard.press('Enter'); await p.waitForTimeout(600); }
    await p.evaluate(async ([map, x, y]) => { await window.kilumen.ready; window.kilumen.scene.startWarp({ map, x: +x, y: +y, facing: 'down' }, 'dev'); }, [map, x, y]);
    await p.waitForTimeout(3500);
    await p.screenshot({ path: `${out}/${label}_${vk}.png` });
    if (vk === 'phone' && /^(lab|living)/.test(label)) {
      const cdp = await ctx.newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 }); await p.waitForTimeout(1500);
      fps[label] = await p.evaluate(() => new Promise(r => { const d = []; let t0 = performance.now(); const f = t => { d.push(t - t0); t0 = t; if (d.length < 300) requestAnimationFrame(f); else { d.shift(); d.sort((a, b) => a - b); const m = d.reduce((a, b) => a + b) / d.length; r({ mean_ms: +m.toFixed(2), p95_ms: +d[Math.floor(d.length * .95)].toFixed(2), fps: +(1000 / m).toFixed(1) }); } }; requestAnimationFrame(f); }));
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    }
  }
  await ctx.close();
}
fs.writeFileSync(`${out}/fps.json`, JSON.stringify(fps, null, 1)); console.log(JSON.stringify(fps)); await b.close();
