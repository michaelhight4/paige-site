import { chromium } from 'playwright';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const OUT = '/workspace/kilumen/shots/rtb_trainer_v2/';
const PROF = { pc: { viewport: { width: 1280, height: 720 } }, phone: { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } };
const prof = process.argv[2] || 'pc';
const CASES = [
  { tag: 'route', map: 'route1', id: 'trainer_r1_e' },
  { tag: 'rival', map: 'fernwick', id: 'ron_rival_1' },
  { tag: 'master1', map: 'fernwick_hall_int', id: 'master_fernwick' },
  { tag: 'master2', map: 'saltmere_hall_int' },
];
const b = await chromium.launch(); const ctx = await b.newContext(PROF[prof]);
await ctx.addInitScript(() => localStorage.setItem('kilumen_alpha_rtb_mode', 'rt'));
const page = await ctx.newPage(); const errs = []; page.on('pageerror', (e) => errs.push(String(e)));
const press = async () => { if (prof === 'pc') await page.keyboard.press(await page.evaluate(() => window.kilumen.scene.busy || window.kilumen.scene.dialog?.open) ? 'Enter' : 'KeyF'); else await page.evaluate(() => { const el = document.querySelector('[data-btn="a"]'); el?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); setTimeout(() => el?.dispatchEvent(new PointerEvent('pointerup', { bubbles: true })), 60); }); };
await page.goto(`http://127.0.0.1:8198/index.html?reset=1&enc=0`);
await page.waitForFunction(() => window.kilumen?.ui?.sdReady, null, { timeout: 30000 }); await sleep(3000);
for (let k = 0; k < 4; k++) { await press(); await sleep(800); }
for (const C of CASES.filter((c) => !process.env.ONLY || process.env.ONLY.split(',').includes(c.tag))) {
  await page.evaluate(async () => { const { createCreature } = await import('/src/systems/creature.js?v=v0.2.60-alpha'); const sc = window.kilumen.scene;
    const p = [createCreature({ species: 'cindrip', level: 16 }), createCreature({ species: 'nibbin', level: 12 }), createCreature({ species: 'rillop', level: 10 })];
    p[0].held = 'gold_coin'; p[2].held = 'team_link_band'; sc.party = p; if (sc.systems?.party) sc.systems.party.list = p; });
  // stand in front of the NPC, facing it
  await page.evaluate(async (C) => { const s = window.kilumen.scene; s.startWarp({ map: C.map, x: 2, y: 2, facing: 'down' }, 'dev'); }, C);
  await page.waitForFunction((m) => window.kilumen.scene.map?.name === m && !window.kilumen.scene.fade, C.map, { timeout: 20000 });
  await sleep(800);
  const placed = await page.evaluate(async (C) => { const s = window.kilumen.scene; if (/_hall_int$/.test(C.map)) for (const n of s.npcs.list) if (n.def?.kind !== 'master') s.seen[`defeated:${C.map}.${n.id}`] = true;
    const n = C.id ? s.npcs.byId(C.id) : s.npcs.list.find((x) => x.def?.kind === 'master'); C.id = n.id, d = n.def, m = s.map; const opts = [[0, 1, 'up'], [0, 2, 'up'], [-1, 0, 'right'], [1, 0, 'left'], [0, -1, 'down']];
    for (const [dx, dy, f] of opts) { const x = d.x + dx, y = d.y + dy; if (m.inBounds(x, y) && m.isWalkable(x, y) && !m.npcAt?.(x, y)) { const st = Math.abs(dy) === 2 ? [x, d.y + 1] : null; if (st && !m.isWalkable(...st)) continue; s.startWarp({ map: C.map, x, y, facing: f }, 'dev'); return [x, y, f, dy === 2, n.id]; } } return null; }, C);
  C.id = placed?.[4] || C.id;
  await page.waitForFunction(() => !window.kilumen.scene.fade, null, { timeout: 20000 }); await sleep(1200);
  if (placed?.[3]) { await page.keyboard.down(prof === 'pc' ? 'ArrowUp' : 'ArrowUp'); await sleep(60); await page.keyboard.up('ArrowUp'); await sleep(700); }
  for (let k = 0; k < 14 && !(await page.evaluate(() => !!window.kilumen.rtb?.active)); k++) { await press(); await sleep(700); }
  const ok = await page.evaluate(() => { const a = window.kilumen.rtb?.active; if (!a) return false; window._ev = []; const d = a.sim.drain.bind(a.sim); a.sim.drain = () => { const e = d(); for (const x of e) window._ev.push({ type: x.type, item: x.item || x.id, band: x.band, n: x.n ?? x.amount }); return e; }; return true; });
  if (!ok) { console.log(C.tag, 'NO BATTLE', placed, await page.evaluate(() => JSON.stringify(window.kilumen.scene.log.slice(-6)))); await page.screenshot({ path: `${OUT}${prof}_${C.tag}_nobattle.png` }); continue; }
  const info0 = await page.evaluate(async (C) => { const a = window.kilumen.rtb.active, s = window.kilumen.scene, { authoredTeam } = await import('/src/battle/data/trainer_teams.js?v=v0.2.60-alpha');
    let auth = null; try { auth = authoredTeam({ map: C.map, id: C.id }, s.party).map((f) => `${f.species}${f.level}`); } catch (e) { auth = String(e); }
    return { foes: a.sim.foes.map((f) => `${f.c.species}${f.c.level}`), reserve: (a.sim.reserve || a.sim.foeQueue || []).map?.((f) => `${f.species ?? f.c?.species}${f.level ?? f.c?.level}`), authored: auth, bag: a.sim.foeBag, name: a.view.trainer?.name, hint: document.querySelector('.rtb-help, .rtb-hint')?.textContent }; }, C);
  await sleep(700); await page.screenshot({ path: `${OUT}${prof}_${C.tag}_sendout.png` });
  await sleep(1800); if (prof === 'pc') { await page.keyboard.press('KeyQ'); await sleep(500); }
  await page.screenshot({ path: `${OUT}${prof}_${C.tag}_fight.png` });
  // Master heal check: drop the field foe low and let the AI decide
  if (C.tag.startsWith('master')) { await page.evaluate(() => { const a = window.kilumen.rtb.active, f = a.sim.foes.find((x) => x.alive); f.c.hp = Math.max(1, Math.floor(f.mhp * 0.15)); }); await sleep(1500); await page.screenshot({ path: `${OUT}${prof}_${C.tag}_heal.png` }); }
  // KO the foes one by one (through the sim's own damage path), shot after the first faint (slump + recall/send-out)
  for (let i = 0; i < 8; i++) {
    const st = await page.evaluate(() => { const a = window.kilumen.rtb.active; if (!a) return 'done'; const s = a.sim, al = s.ally || s.allies?.[s.active] || s.party?.[s.active]; const f = s.foes.find((x) => x.alive); if (f) s._hurt(f, f.c.hp + 999, { by: al }); return s.state; });
    await sleep(i === 0 ? 900 : 2200); if (i === 0) await page.screenshot({ path: `${OUT}${prof}_${C.tag}_slump_sendout.png` });
    if (st === 'done') break;
  }
  for (let k = 0; k < 12 && (await page.evaluate(() => !!window.kilumen.rtb?.active)); k++) { await press(); await sleep(600); }
  await sleep(1200); await page.screenshot({ path: `${OUT}${prof}_${C.tag}_after.png` });
  for (let k = 0; k < 8; k++) { await press(); await sleep(500); }
  const info1 = await page.evaluate(() => { const s = window.kilumen.scene; return { ev: [...new Set((window._ev || []).map((e) => e.type + (e.item ? ':' + e.item : '') + (e.band ? ':band' : '')))], log: s.log.slice(-40).filter((l) => /prize|money|battle|xp|shop/i.test(l.type)).map((l) => JSON.stringify(l)).slice(-6), party: s.party.map((c) => `${c.species}L${c.level}xp${c.xp}`), money: s.systems?.state?.money ?? s.systems?.wallet?.money }; });
  console.log(prof, C.tag, JSON.stringify({ placed, info0, info1 }));
}
console.log(prof, 'errors', errs);
await b.close();
