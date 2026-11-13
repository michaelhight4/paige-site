// Exit-warp repro (Oct 23 2026, Gary: "exit home from spawn and end up on top of RT supply"). New game -> bedroom ->
// downstairs -> (Ron's flag set in-page) -> walk out the front door with real key presses -> screenshot + state.
// Usage: node tests/exitwarp_repro.mjs <baseUrl|dev> <label>   (read-only against live: in-page state only, ?save=0)
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'shots/exitwarp_fix');
fs.mkdirSync(OUT, { recursive: true });
let [target = 'dev', label = 'dev'] = process.argv.slice(2);
let server = null;
if (target === 'dev') {
  const PORT = await new Promise((res) => { const sv = net.createServer(); sv.listen(0, '127.0.0.1', () => { const p = sv.address().port; sv.close(() => res(p)); }); });
  server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: process.env.ROOT_DIR || ROOT, stdio: 'ignore' });
  target = `http://127.0.0.1:${PORT}/index.html`;
  for (let i = 0; i < 50; i++) { try { if ((await fetch(target)).ok) break; } catch {} await new Promise((r) => setTimeout(r, 100)); }
}
const browser = await chromium.launch({ args: ['--disable-dev-shm-usage'] });
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, serviceWorkers: 'block' });
const page = await ctx.newPage();
// STALE_MAP=<file>: serve that file for maps/brookhollow.json (simulates a cached v0.1.3 unpadded town next to a fresh house_1f)
if (process.env.STALE_MAP) await page.route((u) => new RegExp('maps/' + (process.env.STALE_NAME || 'brookhollow') + '\\.json$').test(u.pathname) && !u.search.includes('fresh='), (r) => r.fulfill({ status: 200, contentType: 'application/json', body: fs.readFileSync(process.env.STALE_MAP) }));
const errors = []; page.on('pageerror', (e) => errors.push(String(e)));
const S = (fn, arg) => page.evaluate(fn, arg);
const st = () => S(() => { const s = window.kilumen.scene; const m = s.map; return { map: m.name, x: s.player.x, y: s.player.y, facing: s.player.facing, size: [m.width, m.height], padding: m.json?.padding || null, code: m.code(s.player.x, s.player.y), cam: s.camera ? { x: s.camera.x, y: s.camera.y } : null, zoom: s.zoom, warps: (m.json?.warps || m.warps || []).map((w) => `${w.to}@${w.x},${w.y}`) }; });
const idle = () => page.waitForFunction(() => { const s = window.kilumen.scene; return !s.busy && !s.fade && !s.dialog?.active; }, null, { timeout: 30000 });
const key = async (k, ms = 90) => { await page.keyboard.down(k); await page.waitForTimeout(ms); await page.keyboard.up(k); };
const sep = target.includes('?') ? '&' : '?';
await page.goto(`${target}${sep}reset=1&save=0&audio=0&online=0&hour=12&timescale=0&cv=0&contacts=0`);
await page.waitForFunction(() => window.kilumen?.scene?.tileset && window.kilumen.scene.map, null, { timeout: 60000 });
await page.waitForTimeout(1500);
// close any title / dialog with Enter
for (let i = 0; i < 60; i++) { const busy = await S(() => { const s = window.kilumen.scene; return !!(s.dialog?.active || s.fade || window.kilumen.ui?.active); }); if (!busy) break; await page.keyboard.press('Enter'); await page.waitForTimeout(300); }
await idle();
console.log('start', JSON.stringify(await st()));
// downstairs via the stairs warp (dev shortcut), then Ron's flag, then walk out for real
await S(() => { const s = window.kilumen.scene, w = s.map.json.warps.find((x) => x.to === 'house_1f'); s.startWarp({ map: w.to, x: w.tx, y: w.ty, facing: w.facing || 'down' }, 'door'); });
await page.waitForTimeout(300); await idle(); await page.waitForTimeout(400);
await S(() => { const s = window.kilumen.scene; s.setFlag('talked_ron_morning'); const d = s.map.json.warps.find((w) => w.to === 'brookhollow'); s.player.place(d.x, d.y - 1, 'down'); });
console.log('downstairs', JSON.stringify(await st()));
await page.waitForTimeout(300);
await page.keyboard.down('ArrowDown'); await page.waitForTimeout(400); await page.keyboard.up('ArrowDown');
await page.waitForFunction(() => window.kilumen.scene.map.name === 'brookhollow', null, { timeout: 15000 });
await page.waitForTimeout(200); await idle().catch(() => {}); await page.waitForTimeout(800);
for (let i = 0; i < 10 && (await S(() => !!window.kilumen.scene.dialog?.active)); i++) { await page.keyboard.press('Enter'); await page.waitForTimeout(300); }
const after = { ...(await st()), warpFix: await S(() => window.kilumen.scene.log.filter((l) => l.type === 'warpFix')) };
console.log('after', JSON.stringify(after));
await page.screenshot({ path: path.join(OUT, `${label}_after_exit.png`) });
await S(() => { const s = window.kilumen.scene; if (s.debug !== undefined) s.debug = true; else if (s.toggleDebug) s.toggleDebug(); });
await page.waitForTimeout(400);
await page.screenshot({ path: path.join(OUT, `${label}_after_exit_debug.png`) });
fs.writeFileSync(path.join(OUT, `${label}_state.json`), JSON.stringify({ target, after, errors }, null, 1));
console.log('errors', errors);
await browser.close(); server?.kill();
