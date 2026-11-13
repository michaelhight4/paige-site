// Systems <-> engine battle e2e (systems merge, Oct 22, 2026): the real bag / wallet / party (src/systems) behind
// ?battle=sd, no ?uidemo (uidemo keeps the demo team + demo bag). Desktop Chromium. Checks:
//  1 wild battle: a Small Remedy from the Pack heals and the bag count drops (3 -> 2)
//  2 wild battle: Pep Remedy restores energy, takes the turn, bag drops (Gary Oct 22: works in battle)
//  3 trainer (talk on route1): a win pays prize money, the trainer is marked beaten
//  4 trainer loss with a wiped team: the trainer's line, then blackout copay + warp to the heal point; talking again
//    re-challenges with the pre-battle line (not `after`)
//  5 wild wipe: blackout copay + warp without a caller
// Usage: PORT=<http.server port> node tests/systems_battle_e2e.mjs
import { chromium } from 'playwright';

const PORT = process.env.PORT || 8080;
const BASE = `http://127.0.0.1:${PORT}/index.html?save=0&battle=sd&hour=12&clouds=0&life=0&map=route1&x=20&y=20`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0, total = 0;
const check = (name, ok, info = '') => { total++; if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${info ? ` - ${info}` : ''}`); };

const browser = await chromium.launch();
async function session(fn) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } }); const page = await ctx.newPage();
  const errs = []; page.on('console', (m) => m.type() === 'error' && errs.push(m.text())); page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(BASE);
  await page.waitForFunction(() => window.kilumen?.ui?.sdReady && window.kilumen.scene.systems, null, { timeout: 30000 });
  await page.evaluate(() => window.kilumen.ui.sdReady);
  await page.waitForFunction(() => !window.kilumen.scene.busy && !window.kilumen.scene.fade, null, { timeout: 15000 }).catch(() => {});
  const state = () => page.evaluate(() => {
    const msg = document.querySelector('#b-msg'), cmds = document.querySelector('#b-cmds'), sc = window.kilumen.scene;
    return { open: !!document.querySelector('.ui-battle[data-engine="sd"]'), msg: msg?.textContent || '', more: !!msg?.querySelector('.more'),
      cmds: cmds && !cmds.hidden ? [...cmds.querySelectorAll('.b-cmd')].map((e) => e.textContent) : null, dlg: !!sc.dialog?.active, busy: !!sc.busy };
  });
  const tap = async (sel) => { const el = page.locator(sel).first(); await el.waitFor({ state: 'visible', timeout: 15000 }); await el.click({ timeout: 15000 }); };
  const tapMsg = async () => { try { await page.locator('#b-msg').first().click({ timeout: 3000 }); } catch (e) { if ((await state()).open) throw e; } };
  const waitCmds = async (ms = 20000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const s = await state(); if (!s.open || s.cmds) return s; if (s.more) await tapMsg(); await sleep(100); } return state(); };
  // overworld dialogue: press A until the scene is idle (no dialogue, no script), opening battles are left to the caller
  // returns the pages said meanwhile (scene.log 'say' entries)
  const drainDialog = async (until = () => false, ms = 30000, from0 = null) => {
    const t0 = Date.now(), from = from0 ?? await page.evaluate(() => window.kilumen.scene.log.length);
    const said = () => page.evaluate((f) => window.kilumen.scene.log.slice(f).filter((e) => e.type === 'say').map((e) => e.text), from);
    while (Date.now() - t0 < ms) {
      const s = await state(); if (until(s)) return said();
      if (s.dlg) { await page.keyboard.press('Enter'); await sleep(140); continue; }
      if (!s.busy && !s.open) { await sleep(300); const s2 = await state(); if (!s2.busy && !s2.dlg && !s2.open) return said(); continue; }
      await sleep(120);
    }
    return said();
  };
  const fight = async (max = 40) => { // pick the first usable skill until the battle closes
    for (let n = 0; n < max; n++) {
      let s = await waitCmds(); if (!s.open) return;
      if (s.cmds?.length === 4 && /Skills/.test(s.cmds[0])) { await tap('#b-cmds .b-cmd[data-i="0"]'); s = await state(); }
      if (s.cmds && /En/.test(s.cmds[0])) await tap('#b-cmds .b-cmd:not([style*="opacity"])');
      else if (s.cmds) await tap('#b-cmds .b-cmd:not([style*="opacity"])'); // forced switch
      if (await page.locator('.ui-modal [data-m="0"]').count()) await tap('.ui-modal [data-m="0"]');
    }
  };
  // set up the real party / bag / coins through the same modules the game uses
  const setup = (o) => page.evaluate(async (o) => {
    const { createCreature, maxHp } = await import('/src/systems/creature.js');
    const sc = window.kilumen.scene, sys = sc.systems;
    sc.party = o.party.map((p) => { const c = createCreature({ species: p.species, level: p.level }); if (p.hp != null) c.hp = p.hp; if (p.energy0) c.energy = c.energy.map(() => 0); return c; });
    for (const id of Object.keys(sys.bag.toJSON ? sys.bag.toJSON() : {})) sys.bag.remove?.(id, 999);
    for (const [id, n] of Object.entries(o.bag || {})) sys.bag.add(id, n);
    if (o.coins != null) sys.wallet.n = o.coins;
    sc._dirty = true;
    return { hp: sc.party.map((c) => [c.hp, maxHp(c)]) };
  }, o);
  const snap = () => page.evaluate(async () => {
    const { maxHp } = await import('/src/systems/creature.js');
    const sc = window.kilumen.scene, sys = sc.systems;
    return { coins: sys.wallet.coins, map: sc.map?.name, party: sc.party.map((c) => ({ hp: c.hp, max: maxHp(c), energy: c.energy })),
      bag: { tonic_small: sys.bag.count('tonic_small'), energy_tonic: sys.bag.count('energy_tonic') }, blackouts: sys.state.blackouts || 0,
      seen: { ...sc.seen }, last: window.kilumen.ui.lastBattle && { outcome: window.kilumen.ui.lastBattle.outcome, systems: window.kilumen.ui.lastBattle.systems, turns: window.kilumen.ui.lastBattle.turns } };
  });
  try { await fn({ page, state, tap, tapMsg, waitCmds, drainDialog, fight, setup, snap }); }
  finally { check('no console errors', errs.length === 0, errs.slice(0, 3).join(' | ')); await ctx.close(); }
}

// 1 + 2 wild: Small Remedy and Pep Remedy from the Pack
await session(async ({ page, state, tap, waitCmds, setup, snap }) => {
  await setup({ party: [{ species: 'cindrip', level: 12, hp: 6, energy0: true }], bag: { tonic_small: 3, energy_tonic: 2 }, coins: 5000 });
  await page.evaluate(() => window.kilumen.ui.open('battle', { trainer: false, seed: [1, 2, 3, 4] }));
  let s = await waitCmds(); await tap('#b-cmds .b-cmd[data-i="1"]'); s = await state();
  check('Pack lists the real bag', !!s.cmds && s.cmds.some((t) => /Small Remedy ×3/.test(t)) && s.cmds.some((t) => /Pep Remedy ×2/.test(t)), JSON.stringify(s.cmds));
  const iSmall = s.cmds.findIndex((t) => /Small Remedy/.test(t));
  await tap(`#b-cmds .b-cmd[data-i="${iSmall}"]`); s = await waitCmds();
  await tap('#b-cmds .b-cmd[data-i="1"]'); s = await state();
  check('Pack count drops after a Small Remedy (3 -> 2)', s.cmds?.some((t) => /Small Remedy ×2/.test(t)), JSON.stringify(s.cmds));
  const iPep = s.cmds.findIndex((t) => /Pep Remedy/.test(t));
  await tap(`#b-cmds .b-cmd[data-i="${iPep}"]`); s = await waitCmds();
  await tap('#b-cmds .b-cmd[data-i="0"]'); s = await state();
  check('Pep Remedy restored energy in battle (Skills show En > 0)', !!s.cmds && s.cmds.every((t) => !/En 0\//.test(t)), JSON.stringify(s.cmds));
  await page.evaluate(() => window.kilumen.ui.back());
  for (let k = 0; k < 6 && s.open; k++) { s = await waitCmds(); if (s.cmds?.length === 4) await tap('#b-cmds .b-cmd[data-i="3"]'); s = await waitCmds(); }
  const r = await snap();
  check('wild retreat written back: bag tonic_small 2, energy_tonic 1', r.bag.tonic_small === 2 && r.bag.energy_tonic === 1, JSON.stringify(r.bag));
  check('items took turns (2 item turns + retreat)', r.last?.turns >= 3, JSON.stringify(r.last));
  check('healed HP and restored energy kept in the party (no full heal)', r.party[0].hp > 6 && r.party[0].energy.every((e) => e > 0), JSON.stringify(r.party[0]));
});

// 3 + 4 trainer on route1 (trainer_r1_a): loss with a wipe -> line, blackout, warp; re-challenge; win -> prize
await session(async ({ page, state, drainDialog, fight, setup, snap }) => {
  await setup({ party: [{ species: 'cindrip', level: 5, hp: 1 }], coins: 3000 });
  const lines = await page.evaluate(() => window.kilumen.scene.lines.maps.route1.trainer_r1_a);
  const talk = () => page.evaluate(() => { const sc = window.kilumen.scene; sc.talk(null, sc.map.json?.npcs?.find((d) => d.id === 'trainer_r1_a') || { id: 'trainer_r1_a' }); });
  const r0 = await snap();
  await talk();
  await drainDialog((s) => s.open);
  await fight();
  const said = await drainDialog();
  await page.waitForFunction(() => !window.kilumen.scene.busy && !window.kilumen.scene.fade, null, { timeout: 15000 }).catch(() => {});
  const r1 = await snap();
  check('trainer loss reported (lose, blackout)', r1.last?.outcome === 'lose' && r1.last?.systems === 'blackout', JSON.stringify(r1.last));
  check('blackout: copay charged, warped off route1, party rested', r1.coins < r0.coins && r1.map !== 'route1' && r1.party[0].hp === r1.party[0].max && r1.blackouts === 1, `coins ${r0.coins}->${r1.coins} map ${r1.map} hp ${r1.party[0].hp}/${r1.party[0].max}`);
  check('no "you beat me" line after the loss', !said.some((t) => (lines.battle_lost || []).some((l) => t.includes(l.slice(0, 20)))), JSON.stringify(said));
  check('lost trainer stays re-challengeable', !r1.seen['defeated:route1.trainer_r1_a']);
  // back to route1, strong team: the pre-battle line plays again, then a win pays
  await page.evaluate(async () => { const sc = window.kilumen.scene; sc.startWarp({ map: 'route1', x: 20, y: 20, facing: 'down' }, 'debug'); });
  await page.waitForFunction(() => window.kilumen.scene.map?.name === 'route1' && !window.kilumen.scene.fade && !window.kilumen.scene.busy, null, { timeout: 15000 });
  await setup({ party: ['cindrip', 'rillop', 'tumbloam', 'cindrip', 'rillop', 'tumbloam'].map((species) => ({ species, level: 30 })) }); // placeholder trainer team = lead level - 1
  const r2 = await snap(), mark = await page.evaluate(() => window.kilumen.scene.log.length);
  await talk();
  const pre = await drainDialog((s) => s.open, 30000, mark);
  check('re-challenge opens a battle again (pre-battle line, not `after`)', (await state()).open && pre.length > 0 && !pre.some((t) => (lines.after || []).some((l) => t.includes(String(l).slice(0, 20)))), JSON.stringify(pre));
  await fight();
  await drainDialog();
  const r3 = await snap();
  if (!(r3.coins > r2.coins)) console.log('log tail:', JSON.stringify(await page.evaluate((m) => window.kilumen.scene.log.slice(m).filter((e) => e.type !== 'line').slice(-12), mark)));
  check('trainer win', r3.last?.outcome === 'win', JSON.stringify(r3.last));
  check('trainer win pays prize money', r3.coins > r2.coins, `${r2.coins} -> ${r3.coins}`);
  check('beaten trainer marked', r3.seen['defeated:route1.trainer_r1_a'] === true);
});

// 5 wild wipe: no caller, ui_sd blacks out
await session(async ({ page, drainDialog, fight, setup, snap }) => {
  await setup({ party: [{ species: 'cindrip', level: 5, hp: 1 }], coins: 2000 });
  const r0 = await snap();
  await page.evaluate(() => window.kilumen.ui.open('battle', { trainer: false, seed: [3, 3, 3, 3], foe: 'tumbloam' }));
  await fight();
  await drainDialog();
  await page.waitForFunction(() => !window.kilumen.scene.busy && !window.kilumen.scene.fade, null, { timeout: 15000 }).catch(() => {});
  const r1 = await snap();
  check('wild wipe -> blackout', r1.last?.systems === 'blackout', JSON.stringify(r1.last));
  check('wild wipe: copay + warp + rest', r1.coins < r0.coins && r1.map !== 'route1' && r1.party[0].hp === r1.party[0].max, `coins ${r0.coins}->${r1.coins} map ${r1.map}`);
});

await browser.close();
console.log(`\n${total - fails}/${total} passed`);
process.exit(fails ? 1 : 0);
