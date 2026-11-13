// cycles kinds in one page; per-kind: weather draw ms (st.prof), main-thread ms/frame, rAF interval. 4x CPU throttle.
import { chromium } from 'playwright'; import fs from 'node:fs'; import http from 'node:http'; import path from 'node:path';
const ROOT = '/workspace/wt_weather/kilumen'; const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp' };
const srv = http.createServer((req, res) => { const f = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname)); fs.readFile(f, (e, b) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); res.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const PORT = srv.address().port; const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PROF = { phone: { viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, q: '&platform=mobile' }, pc: { viewport: { width: 1280, height: 720 }, q: '&platform=pc' } };
const b = await chromium.launch(); const out = {};
const pct = (a, p) => { const s = [...a].sort((x, y) => x - y); return s.length ? +s[Math.min(s.length - 1, Math.floor(p * s.length))].toFixed(3) : 0; };
for (const [prof, P] of Object.entries(PROF)) {
  const ctx = await b.newContext(P); const page = await ctx.newPage();
  await page.goto(`http://127.0.0.1:${PORT}/index.html?reset=1&enc=0${P.q}`); await page.waitForFunction(() => window.kilumen?.scene?.weather, null, { timeout: 40000 }); await sleep(2000);
  for (let i = 0; i < 4; i++) { await page.keyboard.press('Escape'); await sleep(250); }
  const cdp = await ctx.newCDPSession(page); await cdp.send('Performance.enable');
  for (const [map, kinds] of [['route1', ['clear', 'rain_light', 'rain_heavy', 'storm', 'fog', 'clear']], ['frostspire_pass', ['snow_light', 'blizzard', 'ice_fog']]]) {
    await page.evaluate((map) => window.kilumen.scene.startWarp({ map, x: 32, y: 35, facing: 'down' }, 'dev'), map);
    await page.waitForFunction((m) => window.kilumen.scene.map?.name === m, map, { timeout: 15000 }).catch(() => {}); await sleep(1500);
    for (let i = 0; i < 3; i++) { await page.keyboard.press('f'); await sleep(300); }
    for (const k of kinds) {
      await page.evaluate((k) => { const w = window.kilumen.scene.weather; w.set(k); w.st.shown = k; w.st.k = 1; }, k); await sleep(800);
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      const m0 = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]));
      const r = await page.evaluate(async () => { const w = window.kilumen.scene.weather; w.st.prof = []; const iv = []; let last = performance.now(), go = true; const t = (n) => { iv.push(n - last); last = n; if (go) requestAnimationFrame(t); }; requestAnimationFrame(t); await new Promise((r) => setTimeout(r, 5000)); go = false; const p = w.st.prof; w.st.prof = null; return { iv, p }; });
      const m1 = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]));
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
      const key = `${prof}_${map}_${k}${out[`${prof}_${map}_${k}`] ? '_2' : ''}`;
      out[key] = { frames: r.iv.length, rafAvg: +(r.iv.reduce((a, x) => a + x, 0) / r.iv.length).toFixed(2), rafP95: pct(r.iv, 0.95), mainMsPerFrame: +(((m1.TaskDuration - m0.TaskDuration) * 1000) / r.iv.length).toFixed(2), wxDrawAvg: +(r.p.reduce((a, x) => a + x, 0) / Math.max(1, r.p.length)).toFixed(3), wxDrawP95: pct(r.p, 0.95) };
      console.log(key, JSON.stringify(out[key]));
    }
  }
  await ctx.close();
}
await b.close(); fs.writeFileSync('/workspace/kilumen/shots/weather_v1/perf.json', JSON.stringify(out, null, 1)); process.exit(0);
