// Fishing gear v1 shots (PC + phone): Driftline rod gift, bait picker, rare catch. node tools/fishing/gear_shots.mjs http://localhost:8765/ OUTDIR
import { chromium } from 'playwright';
const BASE = process.argv[2], OUT = process.argv[3];
const b = await chromium.launch();
const report = {};
for (const [name, ctx] of [['pc', { viewport: { width: 1280, height: 720 } }], ['phone', { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true }]]) {
  const c = await b.newContext(ctx); const p = await c.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
  await p.addInitScript(() => { globalThis.KILUMEN_FISHING = { fishing: true }; try { localStorage.clear(); } catch {} });
  await p.goto(`${BASE}?reset=1&cv=0&contacts=0`, { waitUntil: 'load' });
  await p.waitForFunction(() => window.kilumen?.ready); await p.evaluate(() => window.kilumen.ready);
  await p.waitForFunction(() => window.kilumen.fishing && window.kilumen.ui?.wild, null, { timeout: 30000 });
  await p.evaluate(async () => { const sc = window.kilumen.scene; const src = document.querySelector('script[src*="main.js"]').src.replace(/main\.js.*/, 'systems/creature.js');
    const { createCreature } = await import(src); sc.party.length = 0; sc.party.push(createCreature({ species: 'nibbin', level: 30, uid: 'c-g1' })); await window.kilumen.fishing.ready;
    for (let i = 0; i < 300 && sc.fade; i++) await new Promise((r) => setTimeout(r, 50)); });
  const A = async () => (name === 'phone' && await p.$('[data-btn="a"]') ? p.tap('[data-btn="a"]') : p.keyboard.press('z'));
  const busy = () => p.evaluate(() => window.kilumen.scene.busy);
  for (let i = 0; i < 20 && (await busy()); i++) { await A(); await p.waitForTimeout(350); }
  let shot = 0; const snap = (n) => p.screenshot({ path: `${OUT}/${name}_${String(++shot).padStart(2, '0')}_${n}.png` });
  const warp = async (map) => { await p.evaluate((m) => window.kilumen.scene.startWarp({ map: m, x: 10, y: 10, facing: 'down' }, 'dev'), map);
    await p.waitForFunction((m) => window.kilumen.scene.map?.name === m && !window.kilumen.scene.fade, map, { timeout: 20000 }); await p.waitForTimeout(700);
    for (let i = 0; i < 12 && (await busy()); i++) { await A(); await p.waitForTimeout(350); } };
  // 1) Driftline gift: Saltmere fisher, with the Brookhollow rod and a first hook done
  await p.evaluate(() => { const sc = window.kilumen.scene; sc.systems.bag.add('fishing_rod', 1); sc.setFlag('got_fishing_rod', true); sc.setFlag('fish_hooked', true); });
  await warp('saltmere');
  const placed = await p.evaluate(() => { const sc = window.kilumen.scene, n = sc.npcs.list.find((k) => k.id === 'saltmere_fisher'); if (!n) return false; n.paused = true;
    for (const [dx, dy, f] of [[0, 1, 'up'], [0, -1, 'down'], [1, 0, 'left'], [-1, 0, 'right']]) if (sc.map.passable(n.x + dx, n.y + dy)) { sc.player.place(n.x + dx, n.y + dy, f); return true; } return false; });
  await p.waitForTimeout(300); await A();
  let gift = false;
  for (let i = 0; i < 14; i++) { await p.waitForTimeout(450); if (await p.evaluate(() => !!window.kilumen.fishing.gift)) { await p.waitForTimeout(500); await snap('rod_gift_driftline'); gift = true; break; } await A(); }
  for (let i = 0; i < 10 && (await busy()); i++) { await A(); await p.waitForTimeout(350); }
  const gotDrift = await p.evaluate(() => window.kilumen.scene.systems.bag.has('fishing_rod_good'));
  // 2) Bait picker at a Saltmere water edge
  await p.evaluate(() => { const bag = window.kilumen.scene.systems.bag; bag.add('ripple_grub', 5); bag.add('glimmer_worm', 3); bag.add('brine_fleck', 2); bag.add('hollowstar_roe', 1); });
  const spot = await p.evaluate(async () => { const sc = window.kilumen.scene, m = sc.map, D = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }, px = sc.player.x, py = sc.player.y; let best = null;
    for (let y = 0; y < m.height; y++) for (let x = 0; x < m.width; x++) { if (!m.passable(x, y) || m.npcAt?.(x, y)) continue;
      for (const [f, [dx, dy]] of Object.entries(D)) { const c = m.code(x + dx, y + dy); if (c === 3 || c === 11) { const d = Math.abs(x - px) + Math.abs(y - py); if (!best || d < best.d) best = { x, y, f, d }; } } }
    if (best) sc.player.place(best.x, best.y, best.f); return best; });
  await p.waitForTimeout(400); await A(); await p.waitForTimeout(250); await snap('bait_picker');
  const press = async (k) => { await p.keyboard.down(k); await p.waitForTimeout(90); await p.keyboard.up(k); await p.waitForTimeout(90); };
  await press('ArrowDown'); await press('ArrowDown'); await snap('bait_picker_moved');
  // pick Hollowstar Roe (last row), force a rare roll for the shot
  const n = await p.evaluate(() => window.kilumen.fishing.picker?.opts.length || 0);
  for (let i = 0; i < 8; i++) { const ii = await p.evaluate(() => window.kilumen.fishing.picker?.i); if (ii == null || ii === n - 1) break; await press('ArrowDown'); }
  await p.evaluate(() => { const st = window.kilumen.fishing; let k = 0; st.rng = () => [0.2, 0.01, 0.9, 0.5][k++ % 4]; }); // planCast order: wait, bite (yes), slot (0.9 lands in the rare band of Saltmere good), level
  const roeBefore = await p.evaluate(() => window.kilumen.scene.systems.bag.count('hollowstar_roe'));
  await A();
  const st = () => p.evaluate(() => window.kilumen.fishing.fx?.phase || null);
  for (let t = 0; t < 200 && (await st()) !== 'bite'; t++) await p.waitForTimeout(40);
  await p.waitForTimeout(100); await A(); await p.waitForTimeout(700); await snap('rare_hook_msg');
  for (let i = 0; i < 4 && (await st()) !== 'leap'; i++) { await A(); await p.waitForTimeout(350); }
  await p.waitForTimeout(150); await snap('rare_catch_leap');
  await p.waitForTimeout(2200); await snap('rare_battle_intro');
  report[name] = { placed, gift, gotDrift, spot, roeBefore, roeAfter: await p.evaluate(() => window.kilumen.scene.systems.bag.count('hollowstar_roe')), last: await p.evaluate(() => window.kilumen.fishing.last),
    log: await p.evaluate(() => window.kilumen.scene.log.filter((l) => /^fish|wild/.test(l.type)).slice(-3)), errs };
  await c.close();
}
console.log(JSON.stringify(report, null, 1));
await b.close();
