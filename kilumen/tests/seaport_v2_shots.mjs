// Gullhaven seaport + Fishing Derby shots (dev/seaport, Oct 30 2026). Usage: node tests/seaport_v2_shots.mjs  (v2: Director QA #13/#14, Gary trees, integration_v1)  (ROOT=<tree> TAG=before for the pre-change tidewater shot)
// -> shots/seaport_v2/*.png. Pattern copied from tests/lighthouse_shots.mjs.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';

const HERE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT = process.env.ROOT || HERE, TAG = process.env.TAG || 'after';
const OUT = path.join(HERE, 'shots/seaport_v2'); fs.mkdirSync(OUT, { recursive: true });
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
const checks = {};
const shot = async (f) => { await page.screenshot({ path: path.join(OUT, f) }); shots.push(f); };
const press = async (n = 1) => { for (let i = 0; i < n; i++) { await page.keyboard.press('f'); await sleep(350); } };
const warp = async (map, x, y, facing = 'down') => { await page.evaluate(([map, x, y, facing]) => { const s = kilumen.scene; s.fade = null; s.player.locked = false; s.startWarp({ map, x, y, facing }, 'door'); }, [map, x, y, facing]); await sleep(2500); await page.evaluate(() => kilumen.scene.flags?.add?.('quiet_shots')); };
const fishFx = (phase, ago, extra = {}) => page.evaluate(([phase, ago, extra]) => {
  const s = kilumen.scene, f = kilumen.fishing, p = s.player, t = performance.now(); const cell = { x: p.x, y: p.y + 1 };
  f.fx = { phase, t0: t - ago, tLand: t - ago, tBite: t - ago, tHook: t - ago, tLeap: t - ago, cell, facing: 'down', from: { x: (p.x + 0.5) * 64, y: (p.y + 0.3) * 64 },
    press: null, touch: false, derby: true, dfx: kilumen.seaport.api.fx, plan: { bite: true, waitMs: 1000, fish: { species: kilumen.seaport.api.run?.featured || 'wavelin', level: 54 } }, prompt: { key: 'F', label: 'Press F!' }, ...extra };
  s._dirty = true; }, [phase, ago, extra]);
const boot = async (q = '') => {
  await page.goto(`${base}?save=0&timescale=0&hour=12&audio=0&enc=0&lead=nibbin${q}`);
  await page.waitForFunction(() => window.kilumen?.ready || window.kilumen?.ui, null, { timeout: 15000 });
  await page.evaluate(() => Promise.race([window.kilumen.ready, new Promise((r) => setTimeout(r, 15000))]).then(() => window.kilumen.ui?.sdReady));
  await sleep(1500); await page.evaluate(() => { try { kilumen.ui?.closeAll?.(); } catch {} }); await press(8);
  for (let i = 0; i < 40 && await page.evaluate(() => !!kilumen.scene?.dialog?.cur || !!kilumen.scene?.cutscene); i++) await press(1);
};
try {
  // Gary: pc_04 sea swimmers BEFORE (old map served in place of the new one) / AFTER
  if (fs.existsSync('/tmp/gullhaven_sea_before.json')) {
    await page.route('**/gullhaven_sea.json*', (r) => r.fulfill({ path: '/tmp/gullhaven_sea_before.json', contentType: 'application/json' }));
    await boot(); await warp('gullhaven_sea', 20, 30); await sleep(600); await shot('pc04_sea_swimmers_before.png');
    await page.unroute('**/gullhaven_sea.json*');
  }
  await boot();
  await warp('gullhaven_sea', 20, 21); await sleep(600); await shot('pc04_sea_swimmers_after.png');
  // swim hookup: the player on water (walk sheet -> waterline crop + ripple) and a stand-in 'swim' set to prove the sheet path
  await warp('gullhaven_sea', 17, 21); await page.evaluate(() => { kilumen.scene.player.place(17, 19, 'down'); kilumen.scene._dirty = true; }); await sleep(700); await shot('player_swimming.png');
  checks.swimSheet = await page.evaluate(() => kilumen.scene._playerActor?.(0, 0, 0, null)?.swimSheet ?? null).catch((e) => 'err ' + e.message);
  checks.npcSwimSheets = await page.evaluate(() => kilumen.scene.npcs.list.filter((n) => n.swimImgs).length);
  // fallback path (no swim set): walk sheet cut at the waterline + solid-pixel rings
  await page.evaluate(() => { const s = kilumen.scene; window.__sw = [s.playerImgs.swim, s.playerImgs1.swim]; delete s.playerImgs.swim; delete s.playerImgs1.swim; for (const n of s.npcs.list) { n.__sw = n.swimImgs; n.swimImgs = null; } s._dirty = true; });
  await sleep(500); await shot('player_swimming_fallback.png');
  await page.evaluate(() => { const s = kilumen.scene; [s.playerImgs.swim, s.playerImgs1.swim] = window.__sw; for (const n of s.npcs.list) n.swimImgs = n.__sw; s._dirty = true; });
  await warp('gullhaven_sea', 26, 7, 'up'); await sleep(600); await shot('sea_north_treeline.png');
  await warp('gullhaven_sea', 30, 25); await sleep(600); await shot('sea_swimmers_east.png');
  await warp('gullhaven', 19, 12); await sleep(600); await shot('town.png');
  await warp('gullhaven', 8, 20); await sleep(600); await shot('town_west_edge.png');
  await warp('gullhaven_cliffs', 18, 12); await sleep(600); await shot('cliffs.png');
  await warp('gullhaven_cave_west', 4, 22, 'up'); await sleep(600); await shot('cave_west.png');
  await warp('gullhaven_cave_east', 4, 22, 'up'); await sleep(600); await shot('cave_east_entry.png');
  await warp('gullhaven_cave_east', 15, 14, 'up'); await sleep(600); await shot('cave_east_lake.png');
  await warp('gullhaven_lagoon', 13, 7, 'up'); await sleep(900); await shot('pc08_derby_lagoon.png');
  await warp('gullhaven_lagoon', 9, 19, 'up'); await sleep(600); await shot('lagoon_path_ends.png');
  // desk (wait out the typewriter)
  await warp('gullhaven_lagoon', 13, 7, 'up');
  await page.evaluate(() => { const s = kilumen.scene; const h = s.talkHooks.find((k) => k.match('gullhaven_lagoon', { derby: 'desk' })); window.__desk = h?.run?.({ derby: 'desk' }) ?? s.runSpot?.({ derby: 'desk' }); });
  await sleep(2600); await shot('derby_desk_featured.png');
  await page.evaluate(() => { kilumen.ui?.closeAll?.(); }); await press(6);
  await page.evaluate(async () => { const sp = kilumen.seaport; if (!sp.api.run) await Promise.race([sp.startRun(await sp.featuredToday()), new Promise((r) => setTimeout(r, 1500))]); });
  await press(4); await page.evaluate(() => kilumen.scene.player.place(5, 7, 'down')); await sleep(500); await shot('pc09_derby_hud.png');
  // cast -> catch on the real derby FX (state driven; same draw path as a live cast)
  await page.evaluate(async () => { const fx = kilumen.seaport.api.fx; await Promise.race([fx?.ready, new Promise((r) => setTimeout(r, 3000))]); kilumen.seaport.api.fx?.creature?.(kilumen.seaport.api.run?.featured); });
  await sleep(400);
  for (const [n, ph, ago] of [['1_cast', 'cast', 350], ['2_bobber_idle', 'wait', 200], ['3_nibble', 'wait', 700], ['4_bite', 'bite', 250], ['5_reel', 'hooked', 300], ['6_breach', 'leap', 420], ['7_catch_flash', 'leap', 860]]) {
    await fishFx(ph, ago); await sleep(30); await shot(`derby_seq_${n}.png`);
  }
  await page.evaluate(() => { kilumen.fishing.fx = null; kilumen.scene._dirty = true; });
  await page.evaluate(() => { const sp = kilumen.seaport; sp.api.useCrystal(); sp.api.onCatch({ species: sp.api.run.featured, level: 54 }); });
  await sleep(2200); await shot('derby_seq_8_weigh.png'); await press(4);
  await page.evaluate(async () => { const sp = kilumen.seaport; for (const s of ['wavelin', 'reefshell', 'hullwhale']) { sp.api.run.crystals--; void sp.api.onCatch({ species: s, level: 53 }); await new Promise((r) => setTimeout(r, 400)); } });
  await press(8); await page.evaluate(() => { kilumen.ui?.closeAll?.(); kilumen.scene.player.place(19, 6, 'up'); if (kilumen.seaport.api.run) kilumen.seaport.api.run.crystals = 0; });
  await page.evaluate(() => { kilumen.scene.runSpot({ derby: 'scale' }); }); await sleep(2600); await shot('derby_seq_9_turn_in.png'); await press(10);
  await sleep(600); await shot('derby_after_turn_in.png');
  checks.dialogAfterTurnIn = await page.evaluate(() => kilumen.scene.dialog?.cur?.type || null);
  checks.busyAfterTurnIn = await page.evaluate(() => ({ busy: kilumen.scene.busy, fade: !!kilumen.scene.fade, ui: !!document.querySelector('.modal:not([hidden]), .menu.open') }));
  for (let i = 0; i < 20 && await page.evaluate(() => kilumen.scene.busy); i++) { await page.keyboard.press('Escape'); await press(1); }
  checks.busyAfterDrain = await page.evaluate(() => kilumen.scene.busy);
  // in-game: Marlo's legend after a turn-in (walk up to the clerk, press F)
  checks.turnIns = await page.evaluate(() => kilumen.scene.systems?.state?.derby?.turnIns ?? null).catch(() => null);
  await page.evaluate(() => { kilumen.ui?.closeAll?.(); const s = kilumen.scene, c = s.npcs.list.find((n) => n.id === 'gullhaven_lagoon_derby_clerk'), m = c?.mover; const x = m?.x ?? 13, y = m?.y ?? 5; window.__clerk = [x, y]; s.player.place(x, y + 1, 'up'); }); await sleep(400);
  await page.keyboard.press('f'); await sleep(1200);
  checks.legendF = await page.evaluate(() => { const s = kilumen.scene; return { dialog: s.dialog?.cur?.type || null, locked: !!s.player.locked, busy: !!(s.scripting || s.busy), talks: s.log.filter((l) => l.type === 'talk').slice(-2), facing: s.player.facing, at: [s.player.x, s.player.y] }; });
  if (!checks.legendF.talks.length) { // clerk wanders off the cell: talk through the same scene.talk() the F key calls
    checks.legendVia = 'scene.talk'; await page.evaluate(() => { const s = kilumen.scene, c = s.npcs.list.find((n) => n.id === 'gullhaven_lagoon_derby_clerk'); s.talk(c, c.def); });
  } else checks.legendVia = 'F key';
  await sleep(2400); await shot('legend_after_turn_in.png');
  checks.legend = await page.evaluate(() => ({ clerk: window.__clerk, flag: !!kilumen.scene.flags?.has?.('gh_legend_heard'), text: JSON.stringify(kilumen.scene.dialog?.cur?.pages || null).slice(0, 160) }));
  await press(10);
  await warp('gullhaven_lagoon', 16, 10, 'up'); await sleep(600); await shot('ron.png');
} catch (e) { errors.push('runner: ' + e.message); try { await shot('fail.png'); } catch {} }
await browser.close(); server.kill();
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify({ errors, checks, shots }, null, 1));
console.log(JSON.stringify({ errors, checks, shots }));
