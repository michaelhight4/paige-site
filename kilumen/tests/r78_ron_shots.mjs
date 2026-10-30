// Final Ron sequence shots (Oct 29 2026, DRAFT for Gary): room 8 cleared -> Ron top line -> stadium heal -> Ron waiting in
// the lobby -> talk -> battle (his 6 finals) -> win lines -> ending. PC. Usage: node tests/r78_ron_shots.mjs
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = process.env.OUT || path.join(ROOT, 'shots/regions_5_8_v1/r78_wire');
fs.mkdirSync(OUT, { recursive: true });
const PORT = await new Promise((res) => { const sv = net.createServer(); sv.listen(0, '127.0.0.1', () => { const p = sv.address().port; sv.close(() => res(p)); }); });
const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
const base = `http://127.0.0.1:${PORT}/index.html`;
for (let i = 0; i < 50; i++) { try { if ((await fetch(base)).ok) break; } catch {} await new Promise((r) => setTimeout(r, 100)); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch(); const errors = [], shots = [];
let n = 0; const shot = async (page, tag) => { const fn = `ron_${String(++n).padStart(2, '0')}_${tag}.png`; await page.screenshot({ path: path.join(OUT, fn) }); shots.push(fn); };
try {
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
  await page.addInitScript(() => { try { localStorage.setItem('kilumen_alpha_notice_seen.v1', '1'); } catch {} });
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`${base}?save=0&timescale=0&hour=12&audio=0&enc=0&lead=nibbin`);
  await page.waitForFunction(() => window.kilumen?.ready || window.kilumen?.ui, null, { timeout: 15000 });
  await page.evaluate(() => Promise.race([window.kilumen.ready, new Promise((r) => setTimeout(r, 15000))]).then(() => window.kilumen.ui?.sdReady));
  await sleep(1200);
  for (let i = 0; i < 8; i++) { await page.keyboard.press('f'); await sleep(300); }
  await page.evaluate(() => { const s = kilumen.scene; kilumen.ui?.closeAll?.(); s.fade = null; s.player.locked = false; s.busy = false; s.startWarp({ map: 'aurelith_arena_room_8', x: 8, y: 6, facing: 'up' }, 'door'); });
  await sleep(2600);
  for (let i = 0; i < 10 && await page.evaluate(() => kilumen.scene.busy); i++) { await page.keyboard.press('f'); await sleep(300); }
  // room 8 just won (first clear): the top-of-tower beat, exactly as arena.js done() runs it
  await page.evaluate(async () => {
    const s = kilumen.scene; for (const f of ['arena_run', 'arena_room_8_won']) s.setFlag(f);
    const C = await import('/src/systems/creature.js?v=v0.2.92-alpha'); // a late-game team of r78 Kilu (fresh save has none), half HP so the heal shows
    for (const sp of ['sunderhoof', 'seraphawk', 'rimewyrm', 'peakbrute', 'glyphmage', 'sunbasilisk']) { const c = C.createCreature({ species: sp, level: 68 }); s.systems.party.add(c); }
    for (const c of s.systems.party.list) if (c.hp != null) c.hp = Math.max(1, Math.floor(c.hp / 3));
    const A = await import('/src/region78/arena.js?v=v0.2.92-alpha');
    window.__top = s.script(() => A.towerTop(s, (f) => s.setFlag(f)));
  });
  await sleep(900); await shot(page, 'top_line_1');
  for (let i = 0; i < 6 && await page.evaluate(() => kilumen.scene.busy); i++) { await page.keyboard.press('f'); await sleep(700); await shot(page, `top_step_${i + 2}`); }
  const fl = await page.evaluate(() => ['tower_done', 'tower_healed'].map((f) => [f, kilumen.scene.flags.has(f)]));
  console.log('flags after top', JSON.stringify(fl));
  await page.evaluate(() => { const s = kilumen.scene; s.fade = null; s.player.locked = false; s.startWarp({ map: 'aurelith_arena', x: 8, y: 8, facing: 'right' }, 'door'); });
  await sleep(2800); await shot(page, 'lobby_ron_waiting');
  // talk -> real battle UI for the intro shot, then a stubbed win for the after lines
  await page.evaluate(async () => {
    const s = kilumen.scene; const A = await import('/src/region78/arena.js?v=v0.2.92-alpha'); const real = s.hooks.onBattle;
    s.hooks.onBattle = async (who) => { window.__team = (await import('/src/battle/data/trainer_teams.js?v=v0.2.92-alpha')).authoredTeam(who, s.systems.party.list); kilumen.ui.open('battle', { trainer: true, who }); await new Promise((r) => setTimeout(r, 4000)); kilumen.ui.closeAll(); return true; };
    window.__talk = s.script(() => A.ron7Talk(s, { name: 'Ron' })); window.__real = real;
  });
  await sleep(900); await shot(page, 'talk_1');
  for (let i = 0; i < 6; i++) { await page.keyboard.press('f'); await sleep(700); await shot(page, `talk_${i + 2}`); if (await page.evaluate(() => !!window.__team)) break; }
  await sleep(1800); await shot(page, 'battle_ron_final');
  console.log('team', await page.evaluate(() => JSON.stringify((window.__team || []).map((c) => `${c.species} L${c.level}`))));
  await sleep(3000);
  for (let i = 0; i < 10; i++) { await shot(page, `after_${i + 1}`); await page.keyboard.press('f'); await sleep(900); }
  console.log('flags end', await page.evaluate(() => JSON.stringify(['beat_n_ron_7', 'ron_final_beaten', 'game_cleared', 'ending_done'].map((f) => [f, kilumen.scene.flags.has(f)]))));
} catch (e) { errors.push('runner: ' + e.message); } finally { await browser.close(); server.kill(); }
fs.writeFileSync(path.join(OUT, 'report_ron.json'), JSON.stringify({ shots, errors }, null, 1));
console.log(shots.length, errors.length ? 'ERRORS ' + errors.join(' | ').slice(0, 500) : 'ok');
