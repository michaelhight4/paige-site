// Living-world frame-time probe (headless). Usage: node tests/life_perf.mjs [port] [label] [extraQuery]
// Times scene.render() (synchronous draw of one frame) and real rAF frame intervals on outdoor maps.
import { chromium } from 'playwright';
const PORT = process.argv[2] || 8097, LABEL = process.argv[3] || 'run', EXTRA = process.argv[4] || '';
const base = `http://127.0.0.1:${PORT}/index.html`;
const cases = [
  ['brookhollow day', '?map=brookhollow&x=16&y=14&phase=day&timescale=0'],
  ['brookhollow dusk', '?map=brookhollow&x=16&y=14&phase=dusk&timescale=0'],
  ['route1 day', '?map=route1&x=10&y=20&phase=day&timescale=0'],
  ['heal_brookhollow (indoor)', '?map=heal_brookhollow&x=6&y=7&phase=day&timescale=0'],
];
const browser = await chromium.launch();
const out = { label: LABEL, extra: EXTRA, results: [] , errors: [] };
for (const [w, h] of [[1920, 1080]]) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => out.errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') out.errors.push(m.text()); });
  for (const [name, q] of cases) {
    await page.goto(base + q + '&save=0' + EXTRA);
    await page.evaluate(() => window.kilumen.ready);
    await page.waitForTimeout(800);
    const r = await page.evaluate(async () => {
      const s = window.kilumen.scene;
      for (let i = 0; i < 30; i++) s.render(); // warm caches
      const t = [];
      const ctx = s.renderer.ctx, t2 = [];
      for (let i = 0; i < 300; i++) { s.tick += 1; const a = performance.now(); s.render(); t.push(performance.now() - a); }
      for (let i = 0; i < 300; i++) { s.tick += 1; const a = performance.now(); s.render(); ctx.getImageData(0, 0, 1, 1); t2.push(performance.now() - a); }
      t.sort((a, b) => a - b); t2.sort((a, b) => a - b);
      const raf = await new Promise((res) => { const iv = []; let last = 0, n = 0; const f = (now) => { if (last) iv.push(now - last); last = now; if (++n < 181) requestAnimationFrame(f); else res(iv); }; requestAnimationFrame(f); });
      raf.sort((a, b) => a - b);
      const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
      return { renderMeanMs: +mean(t).toFixed(3), renderP50: +t[150].toFixed(3), renderP95: +t[285].toFixed(3), flushedMeanMs: +mean(t2).toFixed(3), flushedP50: +t2[150].toFixed(3), flushedP95: +t2[285].toFixed(3), rafMeanMs: +mean(raf).toFixed(2), rafP95: +raf[Math.floor(raf.length * 0.95)].toFixed(2), zoom: s.zoom };
    });
    out.results.push({ case: name, viewport: `${w}x${h}`, ...r });
  }
  await page.close();
}
await browser.close();
console.log(JSON.stringify(out, null, 1));
