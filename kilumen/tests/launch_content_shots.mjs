// launch-content shots (Oct 31 2026): 35 new Kilu in battle (contact sheet), Kilindex, tide currents on real maps + clip,
// Mirefen Olympics host. Usage: OUT=/workspace/shots/launch_content node tests/launch_content_shots.mjs (playwright, ffmpeg)
import { chromium } from 'playwright';
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs'; import path from 'node:path'; import net from 'node:net'; import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = process.env.OUT || '/workspace/shots/launch_content'; fs.mkdirSync(path.join(OUT, 'battle'), { recursive: true });
const ONLY = (process.env.ONLY || 'battle,dex,tide,oly').split(',');
const PORT = await new Promise((res) => { const sv = net.createServer(); sv.listen(0, '127.0.0.1', () => { const p = sv.address().port; sv.close(() => res(p)); }); });
const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
const base = `http://127.0.0.1:${PORT}/index.html`;
for (let i = 0; i < 50; i++) { try { if ((await fetch(base)).ok) break; } catch {} await new Promise((r) => setTimeout(r, 100)); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const src = fs.readFileSync(path.join(ROOT, 'src/ui/species_synced.gen.js'), 'utf8');
const NEW = [...src.matchAll(/\{"id":"([a-z0-9_]+)"[^\n]*"newR678":1/g)].map((m) => m[1]);
const BIOME = (id) => /"id":"X"[^\n]*"found":"Cindervale/.test(src.replace(`"id":"${id}"`, '"id":"X"')) ? 'mountain' : 'grass';
const browser = await chromium.launch(); const errors = [], out = {};
const boot = async (page, q = '') => { await page.goto(`${base}?save=0&audio=0&enc=0${q}`); await page.waitForFunction(() => window.kilumen?.ui || window.kilumen?.ready, null, { timeout: 30000 });
  await page.evaluate(() => Promise.race([window.kilumen.ready, new Promise((r) => setTimeout(r, 20000))]).then(() => window.kilumen.ui?.sdReady)); await sleep(800); };
const newGame = async (page) => { await page.goto(base); await page.waitForFunction(() => window.kilumen?.scene?.map, null, { timeout: 40000 }); await sleep(1500);
  await page.keyboard.press('Enter'); await sleep(1200); await page.keyboard.press('Enter'); await sleep(2500); };
const warp = async (page, map, x, y, facing) => {
  for (let i = 0; i < 40; i++) { const ok = await page.evaluate(([map, x, y, facing]) => { const s = window.kilumen.scene; if (s.map?.name === map && !s.fade) return true; if (s.fade?.phase === 'hold') s.fade = null; if (!s.fade && !s.busy && s.map?.name !== map) s.startWarp({ map, x, y, facing }, 'dev'); return false; }, [map, x, y, facing]); if (ok) break; await sleep(500); }
  for (let i = 0; i < 30; i++) { const busy = await page.evaluate(() => { const s = window.kilumen.scene; return !!(s.dialog?.active || s.busy || s.fade || window.kilumen.ui?.active); }); if (!busy && i > 3) break; await page.keyboard.press('Escape'); await sleep(250); }
};
const place = (page, x, y, f, glide) => page.evaluate(([x, y, f, glide]) => { const s = window.kilumen.scene, p = s.player; p.place ? p.place(x, y, f) : Object.assign(p, { x, y, facing: f }); if (glide) { p.gliding = true; const o = s.overnight?.field || window.kilumen.overnight?.field; if (o) o.gliding = true; } s._dirty = true; }, [x, y, f, glide]);
try {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage(); await page.addInitScript(() => { try { localStorage.setItem('kilumen_alpha_notice_seen.v1', '1'); } catch {} });
  page.on('pageerror', (e) => errors.push(String(e))); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  if (ONLY.includes('battle')) for (let i = 0; i < NEW.length; i++) {
    const foe = NEW[i], lead = NEW[(i + 11) % NEW.length];
    await boot(page, `&timescale=0&hour=12&lead=${lead}`);
    await page.evaluate(([foe, lead, biome]) => { const u = window.kilumen.ui, s = window.kilumen.scene; u.closeAll(); const p0 = s.systems?.party?.list?.[0]; if (p0) p0.species = lead; u.open('battle', { foe, foeLevel: 60, biome }); }, [foe, lead, BIOME(foe)]);
    await sleep(2600); await page.screenshot({ path: path.join(OUT, 'battle', `battle_${foe}.png`) });
    if (i === 0) { for (let k = 0; k < 8; k++) { await page.screenshot({ path: path.join(OUT, 'battle', `.bgf${k}.png`) }); await sleep(150); } }
  }
  if (ONLY.includes('dex')) { await boot(page, '&timescale=0&hour=12'); await page.evaluate(() => { const u = window.kilumen.ui; u.closeAll(); u.open('kilindex'); }); await sleep(1200); for (let k = 0; k < 120; k++) { await page.keyboard.press('ArrowDown'); await sleep(40); } await sleep(800); await page.screenshot({ path: path.join(OUT, 'kilindex.png') }); }
  await ctx.close();
  if (ONLY.includes('tide') || ONLY.includes('oly')) {
    const vdir = path.join(OUT, '.video'); fs.rmSync(vdir, { recursive: true, force: true });
    const c2 = await browser.newContext({ viewport: { width: 1280, height: 720 }, recordVideo: { dir: vdir, size: { width: 1280, height: 720 } } });
    const t0 = Date.now(); const p = await c2.newPage(); await p.addInitScript(() => { try { localStorage.setItem('kilumen_alpha_notice_seen.v1', '1'); } catch {} }); p.on('pageerror', (e) => errors.push(String(e)));
    await newGame(p); let c0 = 0;
    if (ONLY.includes('tide')) {
      for (const [map, x, y, f] of [['lanternport', 24, 33, 'down'], ['route_coast', 15, 29, 'up'], ['gullhaven_sea', 6, 31, 'up']]) { await warp(p, map, x, y, f); await place(p, x, y, f, true); await sleep(1200); await p.screenshot({ path: path.join(OUT, `tide_${map}.png`) }); }
      await warp(p, 'tidewater_coast', 26, 37, 'right'); await place(p, 26, 37, 'right', true); await sleep(1200); await p.screenshot({ path: path.join(OUT, 'tide_tidewater_coast.png') });
      c0 = (Date.now() - t0) / 1000; await p.keyboard.press('ArrowRight'); await sleep(3200); await p.screenshot({ path: path.join(OUT, 'tide_tidewater_after_ride.png') });
      out.tideLog = await p.evaluate(() => window.kilumen.scene.log.filter((e) => /^current_/.test(e.type)).map((e) => e.type + ':' + (e.at || e.from)));
      out.tideEnd = await p.evaluate(() => { const q = window.kilumen.scene.player; return [q.x, q.y]; });
    }
    if (ONLY.includes('oly')) {
      await warp(p, 'mirefen', 19, 32, 'up'); await place(p, 19, 32, 'up', false); await sleep(900); await p.screenshot({ path: path.join(OUT, 'oly_mirefen_host.png') });
      await p.evaluate(() => { const s = window.kilumen.scene; (s.setFlag ? s.setFlag('beat_master_mirefen') : s.flags?.add?.('beat_master_mirefen')); if (!s.party) s.party = []; const L = s.party; for (const sp of ['bellbuoy', 'ashbun', 'kelpkit']) if (L.length < 3) L.push({ species: sp, name: sp, level: 50, hp: 120, maxHp: 120, id: sp + '_shot' }); });
      await p.keyboard.press('Enter'); await sleep(1200); await p.screenshot({ path: path.join(OUT, 'oly_mirefen_talk.png') });
      for (let i = 0; i < 6; i++) { if (await p.evaluate(() => !!document.querySelector('#town-ev.oly'))) break; await p.keyboard.press('Enter'); await sleep(700); }
      out.olyOpen = await p.evaluate(() => !!document.querySelector('#town-ev.oly'));
      if (!out.olyOpen) { await p.evaluate(() => window.kilumen.sports?.town?.openOlympics('mirefen')); await sleep(1000); out.olyOpenDirect = true; }
      await p.screenshot({ path: path.join(OUT, 'oly_mirefen_olympics.png') });
    }
    await c2.close(); const vid = fs.readdirSync(vdir).find((f) => f.endsWith('.webm'));
    if (c0) execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', String(Math.max(0, c0 - 0.8)), '-t', '4.5', '-i', path.join(vdir, vid), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '24', '-an', path.join(OUT, 'tide_ride_tidewater.mp4')]);
    fs.rmSync(vdir, { recursive: true, force: true });
  }
  console.log(JSON.stringify({ n: NEW.length, ...out, errors: errors.slice(0, 6) }));
} finally { await browser.close(); server.kill(); }
