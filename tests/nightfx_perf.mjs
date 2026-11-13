// Night FX v1 frame-time probe (Oct 23, 2026). Headless Chromium; times scene.render() with a flushed 1 px readback
// (GAME_QUALITY_CHECKLIST: a bare render() time hides GPU work) plus real rAF intervals, while the clock runs (so
// flicker + cloud drift redraw every frame). Phone = 844x390 landscape, dpr 3, touch, mobile profile, CPU throttled 4x
// via CDP (a stand-in for a mid phone; NOT a real device). PC = 1280x720 dpr 1, no throttle.
// Usage: node tests/nightfx_perf.mjs <port> <label> [extraQuery]
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
const PORT = process.argv[2] || 8231, LABEL = process.argv[3] || 'run', EXTRA = process.argv[4] || '';
const cases = [
  ['brookhollow day', 'map=brookhollow&x=11&y=8&hour=12'],
  ['brookhollow dusk', 'map=brookhollow&x=11&y=8&hour=18'],
  ['brookhollow night', 'map=brookhollow&x=11&y=8&hour=22'],
  ['fernwick night', 'map=fernwick&x=18&y=17&hour=22'],
  ['heal_brookhollow night (indoor)', 'map=heal_brookhollow&x=6&y=7&hour=22'],
];
const devices = {
  phone: { ctx: { viewport: { width: 844, height: 390 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }, q: '&platform=mobile', cpu: 4 },
  pc: { ctx: { viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 }, q: '&platform=pc', cpu: 1 },
};
// v1.1: PERF_RES=review measures at the deliverable sizes (PC 1920x1080, phone 780x360 dpr 3 = 2340x1080) and adds Route 1.
if (process.env.PERF_RES === 'review') {
  devices.phone.ctx.viewport = { width: 780, height: 360 }; devices.pc.ctx.viewport = { width: 1920, height: 1080 };
  cases.splice(4, 0, ['route1 night', 'map=route1&x=37&y=5&hour=22']);
}
const browser = await chromium.launch();
const out = { label: LABEL, extra: EXTRA, when: new Date().toString(), results: [], errors: [] };
for (const [dev, d] of Object.entries(devices)) {
  const ctx = await browser.newContext(d.ctx);
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: d.cpu });
  page.on('pageerror', (e) => out.errors.push(`${dev}: ${e}`));
  page.on('console', (m) => { if (m.type() === 'error') out.errors.push(`${dev}: ${m.text()}`); });
  for (const [name, q] of cases) {
    await page.goto(`http://127.0.0.1:${PORT}/index.html?${q}&timescale=1&life=0&save=0&audio=0${d.q}${EXTRA}`);
    await page.evaluate(() => window.kilumen.ready);
    await page.waitForTimeout(1200);
    const r = await page.evaluate(async () => {
      const s = window.kilumen.scene, ctx = s.renderer.ctx;
      for (let i = 0; i < 20; i++) s.render(); // warm caches (grade sheets, light buffer)
      const t = [];
      for (let i = 0; i < 200; i++) { s.tick += 1; s.clock.min += 1 / 60; const a = performance.now(); s.render(); ctx.getImageData(0, 0, 1, 1); t.push(performance.now() - a); }
      t.sort((a, b) => a - b);
      const raf = await new Promise((res) => { const iv = []; let last = 0, n = 0; const f = (now) => { if (last) iv.push(now - last); last = now; if (++n < 121) requestAnimationFrame(f); else res(iv); }; requestAnimationFrame(f); });
      raf.sort((a, b) => a - b);
      const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
      return { flushedMeanMs: +mean(t).toFixed(3), flushedP50: +t[100].toFixed(3), flushedP95: +t[190].toFixed(3), rafMeanMs: +mean(raf).toFixed(2), rafP95: +raf[Math.floor(raf.length * 0.95)].toFixed(2), zoom: s.zoom, canvas: `${s.canvas.width}x${s.canvas.height}`, nightfx: s.nightfx?.state?.() ?? null };
    });
    out.results.push({ device: dev, cpuThrottle: d.cpu, case: name, ...r });
  }
  await ctx.close();
}
await browser.close();
const dir = new URL('../shots/nightfx_v1/', import.meta.url).pathname; mkdirSync(dir, { recursive: true });
writeFileSync(dir + `perf_${LABEL}.json`, JSON.stringify(out, null, 1));
for (const r of out.results) console.log(`${r.device.padEnd(5)} ${r.case.padEnd(32)} mean ${r.flushedMeanMs} p95 ${r.flushedP95} | rAF mean ${r.rafMeanMs} p95 ${r.rafP95}`);
if (out.errors.length) console.log('errors', out.errors);
