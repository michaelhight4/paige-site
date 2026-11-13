// Clinic camera fix (Oct 23, 2026): screenshot interiors at PC 1920x1080 and phone 2340x1080 and log the camera.
// Usage: node tests/clinic_camera_shots.mjs before|after  -> shots/clinic_camera_fix/<phase>_*.png + <phase>_report.json
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';

const PHASE = process.argv[2] || 'after';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'shots/clinic_camera_fix');
fs.mkdirSync(OUT, { recursive: true });
const PORT = await new Promise((res) => { const sv = net.createServer(); sv.listen(0, '127.0.0.1', () => { const p = sv.address().port; sv.close(() => res(p)); }); });
const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
const base = `http://127.0.0.1:${PORT}/index.html`;
for (let i = 0; i < 50; i++) { try { if ((await fetch(base)).ok) break; } catch {} await new Promise((r) => setTimeout(r, 100)); }

const PC = { plat: 'pc', w: 1920, h: 1080, dpr: 1, touch: false };
const PHONE = { plat: 'mobile', w: 780, h: 360, dpr: 3, touch: true, tag: '2340x1080' };
const CASES = [
  { ...PC, map: 'heal_brookhollow', x: 6, y: 3, facing: 'up', label: 'clinic_at_counter' },
  { ...PC, map: 'heal_brookhollow', x: 6, y: 8, facing: 'up', label: 'clinic_arrival' },
  { ...PHONE, map: 'heal_brookhollow', x: 6, y: 3, facing: 'up', label: 'clinic_at_counter' },
  { ...PHONE, map: 'heal_brookhollow', x: 6, y: 8, facing: 'up', label: 'clinic_arrival' },
  { ...PC, map: 'house_int_a', x: 5, y: 2, facing: 'up', label: 'house_a_top' },
  { ...PC, map: 'shop_int', x: 5, y: 2, facing: 'up', label: 'shop_top' },
  { ...PC, map: 'station_int', x: 10, y: 2, facing: 'up', label: 'station_top' },
];
const browser = await chromium.launch();
const report = [];
try {
  for (const c of CASES) {
    const ctx = await browser.newContext({ viewport: { width: c.w, height: c.h }, deviceScaleFactor: c.dpr, hasTouch: c.touch, isMobile: c.touch });
    const page = await ctx.newPage();
    const errors = []; page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto(`${base}?save=0&timescale=0&hour=12&audio=0&online=0&map=${c.map}&x=${c.x}&y=${c.y}&facing=${c.facing}`);
    await page.waitForFunction(() => window.kilumen && window.kilumen.scene && window.kilumen.scene.tileset, null, { timeout: 15000 });
    await page.evaluate(() => window.kilumen.ready);
    await page.waitForTimeout(800);
    const m = await page.evaluate(() => { const s = window.kilumen.scene; return { platform: window.kilumen.platform.id, zoom: s.zoom, cam: s._cam && { x: s._cam.x, y: s._cam.y }, map: s.map.name, mapW: s.map.width, mapH: s.map.height }; });
    const file = `${PHASE}_${c.plat}_${c.tag || `${c.w}x${c.h}`}_${c.label}.png`;
    await page.screenshot({ path: path.join(OUT, file) });
    report.push({ ...c, file, ...m, errors });
    console.log(file, JSON.stringify(m), errors.length ? errors : '');
    await ctx.close();
  }
} finally { await browser.close(); server.kill(); }
fs.writeFileSync(path.join(OUT, `${PHASE}_report.json`), JSON.stringify(report, null, 1));
