// Aurelith capital-city shots (PC + phone) -> shots/aurelith_city_v1/*.png
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs'; import path from 'node:path'; import net from 'node:net';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'shots/aurelith_city_v1'); fs.mkdirSync(OUT, { recursive: true });
const PORT = await new Promise((res) => { const sv = net.createServer(); sv.listen(0, '127.0.0.1', () => { const p = sv.address().port; sv.close(() => res(p)); }); });
const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
const base = `http://127.0.0.1:${PORT}/index.html`;
for (let i = 0; i < 50; i++) { try { if ((await fetch(base)).ok) break; } catch {} await new Promise((r) => setTimeout(r, 100)); }
const DEV = { pc: { w: 1920, h: 1080, dpr: 1, touch: false }, phone: { w: 844, h: 390, dpr: 3, touch: true } };
const CASES = [
  ['plaza', 'aurelith', 37, 27], ['stadium', 'aurelith', 42, 17], ['galleria_front', 'aurelith', 52, 27],
  ['rthq_front', 'aurelith', 67, 27], ['terminal_front', 'aurelith', 18, 39], ['canal_park', 'aurelith', 44, 36],
  ['flats', 'aurelith', 26, 49], ['south_gate', 'aurelith', 43, 54], ['west_gate', 'aurelith', 14, 27], ['east_gate', 'aurelith', 74, 27],
  ['terminal_int', 'aurelith_terminal_int', 0, 0], ['stadium_int', 'aurelith_stadium_int', 0, 0], ['rthq_int', 'aurelith_rthq_int', 0, 0],
  ['galleria_1f', 'aurelith_galleria_1f_int', 0, 0], ['galleria_2f', 'aurelith_galleria_2f_int', 0, 0], ['galleria_3f', 'aurelith_galleria_3f_int', 0, 0],
  ['galleria_4f', 'aurelith_galleria_4f_int', 0, 0], ['galleria_roof', 'aurelith_galleria_roof', 0, 0],
  ['hotel_1f', 'aurelith_hotel_int', 0, 0], ['hotel_2f', 'aurelith_hotel_2f_int', 0, 0], ['flat', 'home_aurelith_flat', 0, 0],
];
const browser = await chromium.launch(); const report = [];
try {
  for (const [dn, d] of Object.entries(DEV)) {
    const ctx = await browser.newContext({ viewport: { width: d.w, height: d.h }, deviceScaleFactor: d.dpr, hasTouch: d.touch, isMobile: d.touch });
    for (const [tag, map, x, y] of CASES) {
      const page = await ctx.newPage(); const errors = [];
      page.on('pageerror', (e) => errors.push(String(e))); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
      await page.goto(`${base}?save=0&timescale=0&hour=12&map=${map}&x=${x}&y=${y}`);
      await page.waitForFunction(() => window.kilumen?.scene?.tileset, null, { timeout: 15000 });
      await page.evaluate(() => window.kilumen.ready);
      const pos = await page.evaluate(([x, y]) => { const s = window.kilumen.scene, m = s.map, p = s.player;
        if (x === 0 && y === 0) { const w = (m.warps || [])[0] || m.data?.warps?.[0]; if (w) { p.x = w.x; p.y = w.y - 1; p.facing = 'up'; } else { outer: for (let yy = m.height >> 1; yy < m.height; yy++) for (let xx = m.width >> 1; xx < m.width; xx++) if (m.code(xx, yy) === 0) { p.x = xx; p.y = yy; break outer; } } }
        return { map: m.name, x: p.x, y: p.y, code: m.code(p.x, p.y) }; }, [x, y]);
      await page.waitForTimeout(500);
      const f = path.join(OUT, `${dn}_${tag}.png`); await page.screenshot({ path: f });
      report.push({ dn, tag, ...pos, errors: errors.length, err1: errors[0] }); await page.close();
    }
    await ctx.close();
  }
} finally { await browser.close(); server.kill(); }
console.log(JSON.stringify(report, null, 0).replace(/\},\{/g, '},\n{'));
