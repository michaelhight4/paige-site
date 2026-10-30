// Ondravel summit v2 shots (Coder, Oct 30 2026, DRAFT for Gary): runs the real staging flow at PC 1280x800 and phone 844x390.
// Usage (from kilumen/): OUT=/workspace/shots/ondravel_summit_v2 [ONLY=summit] [TAG=before] node tools/wellspire/summit_v2_shots.mjs
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
const ROOT = process.cwd(), OUT = process.env.OUT || '/workspace/shots/ondravel_summit_v2', TAG = process.env.TAG || 'after', ONLY = process.env.ONLY || '';
fs.mkdirSync(OUT, { recursive: true });
const PORT = await new Promise((res) => { const sv = net.createServer(); sv.listen(0, '127.0.0.1', () => { const p = sv.address().port; sv.close(() => res(p)); }); });
const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
const base = `http://127.0.0.1:${PORT}/index.html`;
for (let i = 0; i < 50; i++) { try { if ((await fetch(base)).ok) break; } catch {} await new Promise((r) => setTimeout(r, 100)); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PROFILES = [{ plat: 'pc', w: 1280, h: 800, dpr: 1, touch: false }, { plat: 'phone', w: 844, h: 390, dpr: 2, touch: true }];
const browser = await chromium.launch(); const report = [];
try {
  for (const p of PROFILES) {
    const ctx = await browser.newContext({ viewport: { width: p.w, height: p.h }, deviceScaleFactor: p.dpr, hasTouch: p.touch, isMobile: p.touch });
    const page = await ctx.newPage(); await page.addInitScript(() => { try { localStorage.setItem('kilumen_alpha_notice_seen.v1', '1'); localStorage.setItem('kilumen_alpha_rtb_mode', 'rt'); } catch {} });
    const errors = [], shots = [], notes = {}; page.on('pageerror', (e) => errors.push(String(e)));
    const shot = async (name) => { const f = `${p.plat}_${name}.png`; await page.screenshot({ path: path.join(OUT, f) }); shots.push(f); };
    const st = () => page.evaluate(() => ({ map: kilumen.scene.map?.name, x: kilumen.scene.player.x, y: kilumen.scene.player.y, busy: !!kilumen.scene.busy, ui: kilumen.ui?.top?.name || kilumen.ui?.top?.id || (kilumen.ui?.top ? 'open' : null), battle: !!document.querySelector('#b-cmds, .rtb, [data-rtb]'), rt: !!document.querySelector('[data-rtb="dodge"]') }));
    await page.goto(`${base}?save=0&timescale=0&hour=12&audio=0&enc=0&lead=nibbin`);
    await page.waitForFunction(() => window.kilumen?.ready || window.kilumen?.ui, null, { timeout: 15000 });
    await page.evaluate(() => Promise.race([window.kilumen.ready, new Promise((r) => setTimeout(r, 15000))]).then(() => window.kilumen.ui?.sdReady));
    await sleep(1200); await page.evaluate(() => { try { kilumen.ui?.closeAll?.(); } catch {} });
    for (let i = 0; i < 8; i++) { await page.keyboard.press('f'); await sleep(300); }
    for (let i = 0; i < 40 && !(await page.evaluate(() => !!kilumen.region9)); i++) await sleep(250);
    await page.evaluate(async () => { const s = kilumen.scene; const C = await import('/src/systems/creature.js?v=v0.2.100-alpha'); const { setRtbMode } = await import('/src/rtb/flag.js?v=v0.2.100-alpha');
      setRtbMode?.(s, 'rt'); for (const sp of ['sunderhoof', 'seraphawk']) s.systems.party.add(C.createCreature({ species: sp, level: 70 })); s.setFlag('fin_spire_floor_4'); });
    notes.rtMode = await page.evaluate(async () => (await import('/src/rtb/flag.js?v=v0.2.100-alpha')).rtbMode(kilumen.scene, new URLSearchParams(location.search)));
    // 1) summit overview (no staging yet)
    await page.evaluate(() => { const s = kilumen.scene; s._r9Courier = true; s.startWarp({ map: 'fin_lab1_now', x: 12, y: 5, facing: 'up' }, 'door'); });
    await sleep(3000); await shot(`summit_${TAG}`);
    if (ONLY === 'summit') { report.push({ plat: p.plat, errors, shots, notes }); await ctx.close(); continue; }
    // 2) cave exit
    await page.evaluate(() => { const s = kilumen.scene; s.player.place(12, 13, 'up'); s.camFocus = null; }); await sleep(1500); await shot('cave_exit');
    // 3) staging: platform line -> forced walk -> the one -> fight 1
    await page.evaluate(() => { kilumen.scene._r9Courier = false; kilumen.region9.tick(); }); await sleep(1200);
    await page.keyboard.press('f'); await sleep(350); await page.keyboard.press('f'); await sleep(1300); notes.walk = await st(); await shot('forced_walk');
    for (let i = 0; i < 40; i++) { const t = await page.evaluate(() => document.body.innerText); if (/the one/i.test(t)) break; await sleep(300); if (i % 4 === 3) await page.keyboard.press('f'); }
    notes.speech = await st(); await sleep(400); await shot('speech');
    for (let i = 0; i < 14 && !(await st()).battle; i++) { await page.keyboard.press('f'); await sleep(500); }
    for (let k = 0; k < 3; k++) { await page.keyboard.press('f'); await sleep(900); } await sleep(1500); notes.fight1 = await st(); await shot('fight1_start');
    // lose fight 1: close the battle without a result (the story counts a loss either way; the engine fight is unwinnable)
    await page.evaluate(() => kilumen.ui.closeAll());
    for (let i = 0; i < 40; i++) { const s = await st(); if (s.map === 'fin_past_station_m' && !s.busy) break; await page.keyboard.press('f'); await sleep(500); }
    await sleep(800); notes.flashback = await st(); await shot('flashback_arrival');
    // 4) end of the flashback: release Ondravel from the tank -> fight 2
    await page.evaluate(() => { const s = kilumen.scene; s.startWarp({ map: 'fin_past_wlab_10_ondravel', x: 7, y: 8, facing: 'up' }, 'door'); }); await sleep(2500);
    await page.evaluate(() => { const s = kilumen.scene; s.script(() => s.region9.guardian()); });
    for (let i = 0; i < 20 && !(await st()).battle; i++) { await page.keyboard.press('f'); await sleep(500); }
    for (let k = 0; k < 3; k++) { await page.keyboard.press('f'); await sleep(900); } await sleep(1500); notes.fight2 = await st(); await shot('fight2_start');
    report.push({ plat: p.plat, errors, shots, notes }); await ctx.close();
  }
} finally { await browser.close(); server.kill(); }
fs.writeFileSync(path.join(OUT, `report_${TAG}.json`), JSON.stringify(report, null, 1)); console.log(JSON.stringify(report, null, 1));
