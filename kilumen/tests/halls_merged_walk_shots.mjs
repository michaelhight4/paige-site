import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs'; import path from 'node:path'; import net from 'node:net';
const ROOT = process.cwd();
const OUT = path.join(ROOT, 'shots/regions_5_8_v1/halls_merged'); fs.mkdirSync(OUT, { recursive: true });
const PORT = await new Promise((res) => { const sv = net.createServer(); sv.listen(0, '127.0.0.1', () => { const p = sv.address().port; sv.close(() => res(p)); }); });
const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
const base = `http://127.0.0.1:${PORT}/index.html`;
for (let i = 0; i < 50; i++) { try { if ((await fetch(base)).ok) break; } catch {} await new Promise((r) => setTimeout(r, 100)); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PROFILES = [{ plat: 'pc', w: 1280, h: 720, dpr: 1, touch: false }, { plat: 'phone', w: 844, h: 390, dpr: 2, touch: true }];
const M = (n) => JSON.parse(fs.readFileSync(path.join(ROOT, `art/world/overworld/maps/${n}.json`), 'utf8'));
const CHAIN = [['lanternport_lighthouse_int','lanternport_lighthouse_f2'],['lanternport_lighthouse_f2','lanternport_lighthouse_f3'],['lanternport_lighthouse_f3','lanternport_hall_int']];
const browser = await chromium.launch(); const report = [];
try { for (const p of PROFILES) {
  const ctx = await browser.newContext({ viewport: { width: p.w, height: p.h }, deviceScaleFactor: p.dpr, hasTouch: p.touch, isMobile: p.touch });
  const page = await ctx.newPage(); await page.addInitScript(() => { try { localStorage.setItem('kilumen_alpha_notice_seen.v1', '1'); } catch {} });
  const errors = [], shots = [], path_ = []; page.on('pageerror', (e) => errors.push(String(e)));
  let n = 0; const shot = async (tag) => { const f = `${p.plat}_${String(++n).padStart(2,'0')}_${tag}.png`; await page.screenshot({ path: path.join(OUT, f) }); shots.push(f); };
  const mapName = () => page.evaluate(() => kilumen.scene.map.name);
  const clear = async () => { for (let i = 0; i < 20 && await page.evaluate(() => kilumen.scene.busy); i++) { await page.keyboard.press('f'); await sleep(300); } };
  const walkUp = async (want) => { for (let i = 0; i < 6; i++) { await page.keyboard.down('ArrowUp'); await sleep(450); await page.keyboard.up('ArrowUp'); await sleep(1800); await clear(); if (await mapName() === want) return true; } return false; };
  try {
    await page.goto(`${base}?save=0&timescale=0&hour=12&audio=0&enc=0&lead=nibbin`);
    await page.waitForFunction(() => window.kilumen?.ready || window.kilumen?.ui, null, { timeout: 15000 });
    await page.evaluate(() => Promise.race([window.kilumen.ready, new Promise((r) => setTimeout(r, 15000))]).then(() => window.kilumen.ui?.sdReady));
    await sleep(1200); for (let i = 0; i < 8; i++) { await page.keyboard.press('f'); await sleep(300); }
    await page.evaluate(() => { try { kilumen.ui?.closeAll?.(); } catch {} const s = kilumen.scene; s.fade = null; s.player.locked = false; });
    await page.evaluate(() => kilumen.scene.startWarp({ map: 'lanternport', x: 32, y: 18, facing: 'up' }, 'door')); await sleep(2500); await clear();
    await page.evaluate(() => kilumen.scene.flags.add('beat_master_lanternport'));
    await shot('lanternport_approach');
    await page.keyboard.down('ArrowUp'); await sleep(300); await page.keyboard.up('ArrowUp'); await sleep(900); await clear();
    await shot('lanternport_at_door');
    if (!await walkUp('lanternport_lighthouse_int')) errors.push('door did not lead to 1F, on ' + await mapName());
    path_.push(await mapName()); await shot('lighthouse_1F_arrival');
    for (const [from, to] of CHAIN) {
      const w = M(from).warps.find((x) => x.to === to);
      await page.evaluate(([x, y]) => { const s = kilumen.scene; s.player.place(x, y, 'up'); s.camera?.snap?.(); }, [w.x, w.y + 1]); await sleep(900);
      await shot(`${from.replace('lanternport_','')}_stairs`);
      if (!await walkUp(to)) errors.push(`stairs ${from}->${to} failed, on ` + await mapName());
      path_.push(await mapName()); await shot(`${to.replace('lanternport_','')}_arrival`);
    }
  } catch (e) { errors.push('runner: ' + e.message); try { await shot('fail'); } catch {} }
  await ctx.close(); report.push({ plat: p.plat, path: path_, errors, shots }); console.log(p.plat, path_.join('>'), errors.join(' | ') || 'ok');
} } finally { await browser.close(); server.kill(); }
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 1));
