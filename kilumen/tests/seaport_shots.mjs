// Gullhaven seaport + Fishing Derby shots (dev/seaport, Oct 30 2026). Usage: node tests/seaport_shots.mjs  (ROOT=<tree> TAG=before for the pre-change tidewater shot)
// -> shots/seaport_v1/*.png. Pattern copied from tests/lighthouse_shots.mjs.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';

const HERE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT = process.env.ROOT || HERE, TAG = process.env.TAG || 'after';
const OUT = path.join(HERE, 'shots/seaport_v1'); fs.mkdirSync(OUT, { recursive: true });
const PORT = await new Promise((res) => { const sv = net.createServer(); sv.listen(0, '127.0.0.1', () => { const p = sv.address().port; sv.close(() => res(p)); }); });
const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
const base = `http://127.0.0.1:${PORT}/index.html`;
for (let i = 0; i < 50; i++) { try { if ((await fetch(base)).ok) break; } catch {} await new Promise((r) => setTimeout(r, 100)); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch(); const errors = [], shots = [];
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const page = await ctx.newPage(); await page.addInitScript(() => { try { localStorage.setItem('kilumen_alpha_notice_seen.v1', '1'); } catch {} });
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error' && !/playtime\.js|icon_f0|icon_f1/.test((m.location()?.url || '') + m.text())) errors.push(m.text()); });
const shot = async (f) => { await page.screenshot({ path: path.join(OUT, f) }); shots.push(f); };
const press = async (n = 1) => { for (let i = 0; i < n; i++) { await page.keyboard.press('f'); await sleep(350); } };
const warp = async (map, x, y, facing = 'down') => { await page.evaluate(([map, x, y, facing]) => { const s = kilumen.scene; s.fade = null; s.player.locked = false; s.startWarp({ map, x, y, facing }, 'door'); }, [map, x, y, facing]); await sleep(2500); await page.evaluate(() => kilumen.scene.flags?.add?.('quiet_shots')); };
try {
  await page.goto(`${base}?save=0&timescale=0&hour=12&audio=0&enc=0&lead=nibbin`);
  await page.waitForFunction(() => window.kilumen?.ready || window.kilumen?.ui, null, { timeout: 15000 });
  await page.evaluate(() => Promise.race([window.kilumen.ready, new Promise((r) => setTimeout(r, 15000))]).then(() => window.kilumen.ui?.sdReady));
  await sleep(1500); await page.evaluate(() => { try { kilumen.ui?.closeAll?.(); } catch {} }); await press(8);
  await warp('tidewater_coast', 25, 37); await shot(`tidewater_channel_${TAG}.png`);
  if (TAG === 'after') {
    await warp('gullhaven_sea', 26, 6); await shot('sea_north.png');
    await warp('gullhaven_sea', 20, 30); await shot('sea_swimmers.png');
    await warp('gullhaven_cave_west', 4, 22, 'up'); await shot('cave_west.png');
    await warp('gullhaven_cave_east', 4, 22, 'up'); await shot('cave_east.png');
    await warp('gullhaven_cliffs', 18, 12); await shot('cliffs.png');
    await warp('gullhaven', 19, 12); await shot('town.png');
    await warp('gullhaven_lagoon', 13, 7, 'up'); await shot('lagoon.png');
    // desk: featured Kilu shown in the ask
    await page.evaluate(() => { const s = kilumen.scene; const d = s.map.npcs?.find?.((n) => n.derby === 'desk') || { derby: 'desk' }; const h = s.talkHooks.find((k) => k.match('gullhaven_lagoon', { derby: 'desk' })); window.__desk = h.run({ speaker: d }); });
    await sleep(900); await shot('derby_desk_featured.png');
    await page.evaluate(() => { kilumen.ui?.closeAll?.(); }); await press(6);
    await page.evaluate(async () => { const sp = kilumen.seaport; if (!sp.api.run) await Promise.race([sp.startRun(await sp.featuredToday()), new Promise((r) => setTimeout(r, 1500))]); });
    await press(4); await shot('derby_hud.png');
    await page.evaluate(() => { const sp = kilumen.seaport; sp.api.useCrystal(); window.__c = sp.api.onCatch({ species: sp.api.run.featured, level: 54 }); });
    await sleep(1200); await shot('derby_scale_catch.png'); await press(4);
    await page.evaluate(async () => { const sp = kilumen.seaport; for (const s of ['wavelin', 'reefshell', 'hullwhale']) { sp.api.run.crystals--; sp.api.onCatch({ species: s, level: 53 }); await new Promise((r) => setTimeout(r, 400)); kilumen.ui?.closeAll?.(); } sp.api.run.crystals = 0; });
    await press(6); await page.evaluate(() => kilumen.scene.player.place(19, 6, 'up'));
    await page.evaluate(() => { kilumen.scene.runSpot({ derby: 'scale' }); }); await sleep(1200); await shot('derby_scale_turn_in.png'); await press(10);
    // area lock prompt
    await page.evaluate(async () => { const sp = kilumen.seaport; await Promise.race([sp.startRun(await sp.featuredToday()), new Promise((r) => setTimeout(r, 1500))]); }); await press(4);
    await page.evaluate(() => kilumen.scene.startWarp({ map: 'gullhaven', x: 19, y: 28, facing: 'up' }, 'edge')); await sleep(900); await shot('derby_quit_prompt.png');
  }
} catch (e) { errors.push('runner: ' + e.message); try { await shot(`fail_${TAG}.png`); } catch {} }
await browser.close(); server.kill();
fs.writeFileSync(path.join(OUT, `report_${TAG}.json`), JSON.stringify({ errors, shots }, null, 1));
console.log(JSON.stringify({ errors, shots }));
