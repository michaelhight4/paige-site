// Tide current clip (PC 1280x720): flow streaks + sweep + bounce back against the flow, on the dev map dev_tide_test.
// Usage: node tests/tide_current_shots.mjs  (needs playwright + ffmpeg). OUT defaults to /workspace/shots/tide_current.
import { chromium } from 'playwright';
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs'; import path from 'node:path'; import net from 'node:net'; import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = process.env.OUT || '/workspace/shots/tide_current'; fs.mkdirSync(OUT, { recursive: true });
const PORT = await new Promise((res) => { const sv = net.createServer(); sv.listen(0, '127.0.0.1', () => { const p = sv.address().port; sv.close(() => res(p)); }); });
const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
const base = `http://127.0.0.1:${PORT}/index.html`;
for (let i = 0; i < 50; i++) { try { if ((await fetch(base)).ok) break; } catch {} await new Promise((r) => setTimeout(r, 100)); }
const browser = await chromium.launch(); const vdir = path.join(OUT, '.video'); fs.rmSync(vdir, { recursive: true, force: true });
try {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, recordVideo: { dir: vdir, size: { width: 1280, height: 720 } } });
  const t0 = Date.now(); const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(String(e)));
  await page.addInitScript(() => { try { localStorage.setItem('kilumen_alpha_notice_seen.v1', '1'); } catch {} });
  await page.goto(base); await page.waitForFunction(() => window.kilumen?.scene?.map, null, { timeout: 40000 }); await page.waitForTimeout(1500); await page.keyboard.press('Enter'); await page.waitForTimeout(1200); await page.keyboard.press('Enter'); await page.waitForTimeout(2500); // title screen -> New game
  for (let i = 0; i < 30; i++) { // dev map: warp in like the dev console Travel tab (no ?map= outside alpha builds)
    const ok = await page.evaluate(() => { const s = window.kilumen.scene; if (s.map?.name === 'dev_tide_test') return true; if (s.fade?.phase === 'hold') s.fade = null; if (!s.fade && !s.busy) s.startWarp({ map: 'dev_tide_test', x: 3, y: 1, facing: 'down' }, 'dev'); return false; });
    if (ok) break; await page.waitForTimeout(500); }
  try { await page.waitForFunction(() => window.kilumen?.scene?.map?.name === 'dev_tide_test' && !window.kilumen.scene.fade, null, { timeout: 20000 }); } catch (e) { console.log('MAP', await page.evaluate(() => { const s = window.kilumen.scene; return JSON.stringify({ m: s.map?.name, fade: s.fade && [s.fade.phase, s.fade.kind], busy: s.busy, log: s.log.slice(-5) }); })); throw e; }
  for (let i = 0; i < 40; i++) { const busy = await page.evaluate(() => { const s = window.kilumen.scene; return !!(s.dialog?.active || s.busy || s.fade || window.kilumen.ui?.active); }); if (!busy && i > 3) break; await page.keyboard.press('Escape'); await page.waitForTimeout(250); }
  await page.evaluate(() => { const s = window.kilumen.scene, p = s.player; p.place ? p.place(3, 3, 'down') : Object.assign(p, { x: 3, y: 3 }); p.gliding = true; const f = s.overnight?.field || window.kilumen.overnight?.field; if (f) f.gliding = true; s._dirty = true; });
  await page.waitForTimeout(900); const c0 = (Date.now() - t0) / 1000;
  await page.keyboard.press('ArrowDown'); await page.waitForTimeout(1500);           // onto the current: swept right
  await page.keyboard.down('ArrowLeft'); await page.waitForTimeout(2200); await page.keyboard.up('ArrowLeft'); // against: bounced back
  await page.waitForTimeout(1600);
  await page.screenshot({ path: path.join(OUT, 'end.png') });
  const log = await page.evaluate(() => window.kilumen.scene.log.filter((e) => /^current_/.test(e.type)).map((e) => e.type + ':' + (e.at || e.from)));
  await ctx.close(); const vid = fs.readdirSync(vdir).find((f) => f.endsWith('.webm'));
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', String(Math.max(0, c0 - 0.6)), '-t', '6', '-i', path.join(vdir, vid), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '24', '-an', path.join(OUT, 'push_pc.mp4')]);
  console.log(JSON.stringify({ log, errors: errors.slice(0, 5) }));
} finally { await browser.close(); server.kill(); }
