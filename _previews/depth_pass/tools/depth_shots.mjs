// Depth pass previews (Oct 22, 2026): ?depth=0 vs ?depth=1 for a few maps on PC (1920x1080) and mobile (844x390, touch,
// dpr 2), plus an in-page per-frame cost benchmark. Does NOT run tests/shots.mjs.
// Usage: PORT=<running http.server port> node _previews/depth_pass/tools/depth_shots.mjs  -> _previews/depth_pass/*.png + report.json
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = `http://127.0.0.1:${process.env.PORT}/index.html`;
const DEVICES = { pc: { w: 1920, h: 1080, dpr: 1, touch: false }, mobile: { w: 844, h: 390, dpr: 2, touch: true } };
const SCENES = JSON.parse(process.env.SCENES || 'null') || [
  { tag: 'heal_brookhollow', map: 'heal_brookhollow', x: 7, y: 6 },
  { tag: 'lab_brookhollow', map: 'lab_brookhollow', x: 6, y: 6 },
  { tag: 'home_brookhollow_b', map: 'home_brookhollow_b', x: 6, y: 6 },
  { tag: 'rt_branch_backroom', map: 'rt_branch_backroom', x: 4, y: 4 },
  { tag: 'brookhollow_day', map: 'brookhollow', hour: 12 },
  { tag: 'brookhollow_night', map: 'brookhollow', hour: 22 },
];
const DEVS = (process.env.DEVS || 'pc,mobile').split(',');
const browser = await chromium.launch();
const report = [];
try {
  for (const dev of DEVS) for (const s of SCENES) for (const depth of [0, 1]) {
    const d = DEVICES[dev];
    const ctx = await browser.newContext({ viewport: { width: d.w, height: d.h }, deviceScaleFactor: d.dpr, hasTouch: d.touch, isMobile: d.touch });
    const page = await ctx.newPage(), errors = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push(String(e)));
    const pos = s.x != null ? `&x=${s.x}&y=${s.y}` : '';
    await page.goto(`${base}?save=0&timescale=0&hour=${s.hour ?? 12}&map=${s.map}${pos}&depth=${depth}`);
    await page.evaluate(() => window.kilumen.ready);
    await page.waitForTimeout(700);
    const file = `${s.tag}_${dev}_depth${depth}.png`;
    await page.screenshot({ path: path.join(OUT, file) });
    const info = await page.evaluate(async () => {
      const sc = window.kilumen.scene, st = window.kilumen.state();
      // per-frame cost: full renderer.draw() with the pass on vs off (same view), plus the pass's own CPU timer
      const was = sc.depth.enabled, bench = (on) => { sc.depth.set(on, false); sc.render(); const t = performance.now(); for (let i = 0; i < 200; i++) sc.render(); return (performance.now() - t) / 200; };
      const off1 = bench(false), on1 = bench(true), off2 = bench(false), on2 = bench(true);
      const passMs = sc.depth.state(sc.view()).frameMs;
      sc.depth.set(was, false); sc.render();
      return { map: st.map, player: st.player && { x: st.player.x, y: st.player.y }, depth: st.depth, drawOffMs: (off1 + off2) / 2, drawOnMs: (on1 + on2) / 2, passMs };
    });
    report.push({ dev, ...s, depthParam: depth, file, ...info, errors });
    console.log(dev, s.tag, depth, JSON.stringify(info.depth), 'draw off/on', info.drawOffMs.toFixed(3), info.drawOnMs.toFixed(3), 'pass', info.passMs, errors.length ? errors : '');
    await ctx.close();
  }
} finally { await browser.close(); }
fs.writeFileSync(path.join(OUT, process.env.REPORT || 'report.json'), JSON.stringify(report, null, 2));
