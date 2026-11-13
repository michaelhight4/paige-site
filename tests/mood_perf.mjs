// Mood layers frame-time probe (headless, LOCAL ONLY). Usage: node tests/mood_perf.mjs [port=8131]
// Per case: mood on vs ?mood=0, 300 scene.render() calls each flushed with a 1 px getImageData (as life_perf.mjs),
// plus the mood.draw() share (mood.last.ms) and a worst case where the sun-ray layer is rebuilt every frame (walking +
// cloud drift). Phone = 844x390 @ dpr 3, mobile profile, unthrottled and with CDP CPU throttle x4 (a mid phone, roughly).
// NOTE: headless Chromium rasterises the canvas in SOFTWARE, so full-screen blits cost far more here than on a GPU.
import { chromium } from 'playwright';
const PORT = process.argv[2] || 8131, base = `http://127.0.0.1:${PORT}/index.html?save=0&skipintro=1&ui=0&audio=0&timescale=0`;
const cases = [
  ['route1 day cloudy (rays+motes)', '&map=route1&x=34&y=26&hour=12&weather=cloudy'],
  ['fernwick day cloudy (rays+motes+leaves)', '&map=fernwick&x=27&y=19&hour=12&weather=cloudy'],
  ['brookhollow night (fireflies)', '&map=brookhollow&x=29&y=20&hour=22&weather=clear'],
  ['greystone_b1 (cave dust)', '&map=greystone_b1&x=27&y=16&hour=12'],
];
const plats = [
  ['pc 1920x1080', { viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 }, '&platform=pc', 1],
  ['phone 844x390@3', { viewport: { width: 844, height: 390 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }, '&platform=mobile&touch=1', 1],
  ['phone 844x390@3 cpu/4', { viewport: { width: 844, height: 390 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }, '&platform=mobile&touch=1', 4],
];
const browser = await chromium.launch();
const rows = [], errors = [];
for (const [pname, opts, pq, throttle] of plats) {
  const ctx = await browser.newContext(opts); const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(String(e)));
  const cdp = await ctx.newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', { rate: throttle });
  for (const [cname, cq] of cases) {
    const res = {};
    for (const mood of [0, 1]) {
      await page.goto(base + pq + cq + `&mood=${mood}`);
      await page.evaluate(() => Promise.all([window.kilumen.ready, window.kilumen.mood.ready]));
      res[mood] = await page.evaluate(async () => {
        const s = window.kilumen.scene, m = window.kilumen.mood; cancelAnimationFrame(s._raf); s.run = () => {};
        const ctx = s.renderer.ctx;
        for (let i = 0; i < 30; i++) { s.tick++; s.render(); }
        const t = [], md = [], mw = [];
        for (let i = 0; i < 300; i++) { s.tick++; const a = performance.now(); s.render(); ctx.getImageData(0, 0, 1, 1); t.push(performance.now() - a); md.push(m.last.ms); }
        for (let i = 0; i < 120; i++) { s.tick++; m._ray = null; s.render(); mw.push(m.last.ms); } // worst case: shaft sprite rebuilt every frame
        const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length, p95 = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length * 0.95)];
        return { render: +mean(t).toFixed(3), renderP95: +p95(t).toFixed(3), mood: +mean(md).toFixed(3), moodP95: +p95(md).toFixed(3), moodRebuild: +mean(mw).toFixed(3), zoom: s.zoom, canvas: `${ctx.canvas.width}x${ctx.canvas.height}`, last: m.last };
      });
    }
    rows.push({ platform: pname, case: cname, renderOff: res[0].render, renderOn: res[1].render, delta: +(res[1].render - res[0].render).toFixed(3), renderOnP95: res[1].renderP95, moodDrawMean: res[1].mood, moodDrawP95: res[1].moodP95, moodDrawRayRebuildEveryFrame: res[1].moodRebuild, zoom: res[1].zoom, canvas: res[1].canvas, particles: res[1].last.particles, raysDrawn: res[1].last.raysDrawn });
  }
  await ctx.close();
}
await browser.close();
console.table(rows);
console.log(JSON.stringify({ rows, errors }, null, 1));
