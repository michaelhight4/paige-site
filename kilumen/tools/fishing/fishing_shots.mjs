// Fishing v1 shots (PC + phone): rod gift, cast, wait, bite, leap, battle intro. node tools/fishing/fishing_shots.mjs http://localhost:8765/ OUTDIR
import { chromium } from 'playwright';
const BASE = process.argv[2], OUT = process.argv[3];
const b = await chromium.launch();
const report = {};
for (const [name, ctx] of [['pc', { viewport: { width: 1280, height: 720 } }], ['phone', { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true }]]) {
  const c = await b.newContext(ctx); const p = await c.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
  await p.addInitScript(() => { globalThis.KILUMEN_FISHING = { fishing: true, terrain: true }; try { localStorage.clear(); } catch {} });
  await p.goto(`${BASE}?reset=1&cv=0&contacts=0`, { waitUntil: 'load' });
  await p.waitForFunction(() => window.kilumen?.ready); await p.evaluate(() => window.kilumen.ready);
  await p.waitForFunction(() => window.kilumen.fishing && window.kilumen.ui?.wild, null, { timeout: 30000 });
  await p.evaluate(async () => { const sc = window.kilumen.scene; const src = document.querySelector('script[src*="main.js"]').src.replace(/main\.js.*/, 'systems/creature.js');
    const { createCreature } = await import(src); sc.party.length = 0; sc.party.push(createCreature({ species: 'nibbin', level: 9, uid: 'c-f1' })); await window.kilumen.fishing.ready;
    for (let i = 0; i < 300 && sc.fade; i++) await new Promise((r) => setTimeout(r, 50)); });
  for (let i = 0; i < 20 && (await p.evaluate(() => window.kilumen.scene.busy)); i++) { await p.keyboard.press('z'); await p.waitForTimeout(350); } // opening dream line
  await p.evaluate(() => { const sc = window.kilumen.scene; sc.startWarp({ map: 'brookhollow', x: 33, y: 27, facing: 'up' }, 'dev'); });
  await p.waitForFunction(() => window.kilumen.scene.map?.name === 'brookhollow' && !window.kilumen.scene.fade, null, { timeout: 20000 }); await p.waitForTimeout(800);
  await p.screenshot({ path: `${OUT}/${name}_00_start.png` });
  const A = async () => (name === 'phone' && await p.$('[data-btn="a"]') ? p.tap('[data-btn="a"]') : p.keyboard.press('z'));
  const state = () => p.evaluate(() => ({ phase: window.kilumen.fishing.fx?.phase || null, last: window.kilumen.fishing.last, busy: window.kilumen.scene.busy, dlg: !!window.kilumen.scene.dialog?.active, top: window.kilumen.ui?.top?.id || window.kilumen.ui?.top || null, save: (() => { try { return window.kilumen.scene.saveLockReason?.() ?? null; } catch { return 'err'; } })() }));
  const until = async (fn, ms = 8000) => { const t = Date.now(); while (Date.now() - t < ms) { const s = await state(); if (fn(s)) return s; await p.waitForTimeout(30); } return state(); };
  for (let i = 0; i < 12 && (await state()).busy; i++) { await A(); await p.waitForTimeout(400); } // arrival line
  await p.evaluate(() => { const sc = window.kilumen.scene, n = sc.npcs.list.find((k) => k.id === 'fisher'); n.paused = true; sc.player.place(n.x, n.y + 1, 'up'); }); await p.waitForTimeout(300);
  await A(); await p.waitForTimeout(500);
  let shot = 0; const snap = (n) => p.screenshot({ path: `${OUT}/${name}_${String(++shot).padStart(2, '0')}_${n}.png` });
  for (let i = 0; i < 8; i++) { const t = await p.evaluate(() => document.body.innerText); if (/Fishing Rod/.test(t)) { await snap('rod_received'); break; } await A(); await p.waitForTimeout(400); }
  for (let i = 0; i < 8 && (await state()).busy; i++) { await A(); await p.waitForTimeout(350); }
  const hasRod = await p.evaluate(() => window.kilumen.scene.systems.bag.has('fishing_rod'));
  // back to the river bank, face the water
  await p.evaluate(() => window.kilumen.scene.player.place(33, 27, 'right')); await p.waitForTimeout(300);
  const pos = await p.evaluate(() => ({ x: window.kilumen.scene.player.x, y: window.kilumen.scene.player.y }));
  let hooked = false, tries = 0, saveDuring = null;
  while (!hooked && tries < 6) {
    tries++;
    await A(); await p.waitForTimeout(250);
    if (tries === 1) await snap('cast');
    await until((s) => s.phase === 'wait', 2000); await p.waitForTimeout(500);
    if (tries === 1) { await snap('waiting'); saveDuring = (await state()).save; }
    const s = await until((s) => s.phase === 'bite' || !s.phase, 6000);
    if (s.phase === 'bite') { await p.waitForTimeout(120); await snap('bite'); await A(); await p.waitForTimeout(700); await snap('hooked_msg'); await A();
      await p.waitForTimeout(350); await snap('leap'); hooked = true; }
    else { await until((s) => !s.phase, 3000); await p.waitForTimeout(400); await snap('no_bite_msg'); await A(); await until((s) => !s.busy, 3000); }
  }
  await p.waitForTimeout(2200); await snap('battle_intro');
  report[name] = { hasRod, pos, tries, hooked, saveDuring, last: (await state()).last, errs, log: await p.evaluate(() => window.kilumen.scene.log.filter((l) => /^fish|wild/.test(l.type)).slice(-6)) };
  await c.close();
}
console.log(JSON.stringify(report, null, 1));
await b.close();
