// Water battle shots through the REAL fishing flow (v3): ?fishing on, rod in bag, Lanternport shore, interact facing water -> cast,
// A on the bite -> "Got a bite!" line -> leap -> ui.wild.openBattle(biome 'water', intro 'fishing.battle_intro').
// Only the cast's rng is pinned (fishing.rng) so the bite lands and the first Lanternport slot (Reefshell) is picked; everything else is live.
// node tools/fishing/water_battle_shots.mjs http://localhost:8771/kilumen/ OUTDIR [phases=day,night]
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';
const [BASE, OUT, PH = 'day,night'] = process.argv.slice(2);
const b = await chromium.launch(); const errs = []; const report = {};
const PC = { viewport: { width: 1280, height: 720 } }, PHONE = { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true };
for (const [dev, ctx] of [['pc', PC], ['phone', PHONE]]) for (const ph of PH.split(',')) {
  const c = await b.newContext(ctx); const p = await c.newPage(); p.on('pageerror', (e) => errs.push(String(e)));
  await p.addInitScript(() => { globalThis.KILUMEN_FISHING = { fishing: true, terrain: false }; try { localStorage.clear(); localStorage.setItem('kilumen_alpha_notice_seen.v1', '1'); } catch {} });
  await p.goto(`${BASE}?reset=1&cv=0&contacts=0&fishing=1`, { waitUntil: 'load' });
  await p.waitForFunction(() => window.kilumen?.ready); await p.evaluate(() => window.kilumen.ready);
  await p.waitForFunction(() => window.kilumen.fishing && window.kilumen.ui?.wild, null, { timeout: 30000 });
  await p.evaluate(async () => { const sc = window.kilumen.scene; const src = document.querySelector('script[src*="main.js"]').src.replace(/main\.js.*/, 'systems/creature.js');
    const { createCreature } = await import(src); sc.party.length = 0; sc.party.push(createCreature({ species: 'nibbin', level: 44, uid: 'c-w1' })); await window.kilumen.fishing.ready;
    sc.systems.bag.add('fishing_rod', 1); for (let i = 0; i < 300 && sc.fade; i++) await new Promise((r) => setTimeout(r, 50)); });
  const A = async () => (dev === 'phone' && await p.$('[data-btn="a"]') ? p.tap('[data-btn="a"]') : p.keyboard.press('z'));
  for (let i = 0; i < 20 && (await p.evaluate(() => window.kilumen.scene.busy)); i++) { await A(); await p.waitForTimeout(300); }
  await p.evaluate(() => window.kilumen.scene.startWarp({ map: 'lanternport', x: 26, y: 24, facing: 'down' }, 'dev'));
  await p.waitForFunction(() => window.kilumen.scene.map?.name === 'lanternport' && !window.kilumen.scene.fade, null, { timeout: 20000 }); await p.waitForTimeout(600);
  for (let i = 0; i < 12 && (await p.evaluate(() => window.kilumen.scene.busy)); i++) { await A(); await p.waitForTimeout(350); }
  const spot = await p.evaluate(async (ph) => {
    const sc = window.kilumen.scene, m = sc.map, src = document.querySelector('script[src*="main.js"]').src.replace(/main\.js.*/, 'fishing/logic.js');
    const { facedWater } = await import(src); const px = sc.player.x, py = sc.player.y; let best = null;
    for (let y = 0; y < m.height; y++) for (let x = 0; x < m.width; x++) { if (!m.passable(x, y) || m.npcAt?.(x, y)) continue;
      for (const f of ['up', 'down', 'left', 'right']) { const w = facedWater(m, x, y, f); if (w && !sc.spots?.find((s) => s.x === w.x && s.y === w.y)) { const d = Math.abs(x - px) + Math.abs(y - py); if (!best || d < best.d) best = { x, y, f, d }; } } }
    if (best) sc.player.place(best.x, best.y, best.f);
    const h = { dawn: 6, day: 12, dusk: 18, night: 22 }[ph]; sc.clock.min = Math.floor(sc.clock.min / 1440) * 1440 + h * 60;
    window.kilumen.fishing.rng = () => 0.01; // bite + first slot (Reefshell)
    return best; }, ph);
  await p.waitForTimeout(400);
  const fx = () => p.evaluate(() => window.kilumen.fishing.fx?.phase || null);
  await A(); // interact facing water -> cast
  for (let t = 0; t < 400 && (await fx()) !== 'bite'; t++) await p.waitForTimeout(30);
  await p.waitForTimeout(100); await A(); // reel in on the bite
  await p.waitForTimeout(900); await p.screenshot({ path: `${OUT}/${dev}_${ph}_hooked.png` });
  await A(); await p.waitForSelector('.ui-battle', { timeout: 15000 });
  const intro = []; for (let i = 0; i < 30; i++) { const t = await p.evaluate(() => document.querySelector('.ui-battle')?.innerText || ''); const l = /\w+ (leaps out of the water|bursts out of the grass)[^\n]*/.exec(t)?.[0]; if (l) { intro.push(l); break; } await p.waitForTimeout(100); }
  await p.waitForTimeout(400); await p.screenshot({ path: `${OUT}/${dev}_water_${ph}.png` });
  report[`${dev}_${ph}`] = { spot, intro, log: await p.evaluate(() => window.kilumen.scene.log.filter((l) => /^fish|wild/.test(l.type)).slice(-4)), phase: await p.evaluate(() => window.kilumen.scene.phase ?? null) };
  await c.close();
}
console.log(JSON.stringify({ errs, report }, null, 1)); writeFileSync(`${OUT}/report.json`, JSON.stringify({ errs, report }, null, 1));
await b.close();
