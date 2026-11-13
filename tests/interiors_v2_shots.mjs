// Interiors v2 (Oct 28, 2026): screenshot interiors at PC 1280x720 (zoom fills). Usage: node tests/interiors_v2_shots.mjs <phase> [extraQuery]
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs'; import path from 'node:path'; import net from 'node:net';
import { fileURLToPath } from 'node:url';
const PHASE = process.argv[2] || 'before'; const EXTRA = process.argv[3] || '';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'shots/interiors_v2'); fs.mkdirSync(OUT, { recursive: true });
const PORT = await new Promise((res) => { const sv = net.createServer(); sv.listen(0, '127.0.0.1', () => { const p = sv.address().port; sv.close(() => res(p)); }); });
const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
const base = `http://127.0.0.1:${PORT}/index.html`;
for (let i = 0; i < 50; i++) { try { if ((await fetch(base)).ok) break; } catch {} await new Promise((r) => setTimeout(r, 100)); }
const CASES = (process.env.MAPS || 'house_1f:5:7,house_2f:4:6,heal_brookhollow:6:8,shop_int:5:6,home_brookhollow_a:5:6,house_int_a:5:6').split(',').map(s=>{const [map,x,y]=s.split(':');return {map,x,y};});
const browser = await chromium.launch(); const report = [];
try { for (const c of CASES) {
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } }); const page = await ctx.newPage();
  const errors = []; page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`${base}?save=0&timescale=0&hour=${process.env.HOUR || 12}&audio=0&online=0&map=${c.map}&x=${c.x}&y=${c.y}&facing=down${EXTRA}`);
  await page.waitForFunction(() => window.kilumen && window.kilumen.scene && window.kilumen.scene.tileset, null, { timeout: 20000 });
  await page.evaluate(() => window.kilumen.ready); await page.waitForTimeout(1200);
  const m = await page.evaluate(() => { const s = window.kilumen.scene; return { map: s.map.name, w: s.map.width, h: s.map.height, zoom: s.zoom }; });
  const file = `${PHASE}_${c.map}.png`; await page.screenshot({ path: path.join(OUT, file) });
  report.push({ ...c, file, ...m, errors }); console.log(file, JSON.stringify(m), errors.length ? errors : ''); await ctx.close(); }
} finally { await browser.close(); server.kill(); }
fs.writeFileSync(path.join(OUT, `${PHASE}_report.json`), JSON.stringify(report, null, 1));
