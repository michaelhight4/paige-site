// Headless check of the Brookhollow Dash Track (coach npc dash_coach) on desktop + phone: free practice, paid
// tournament (fee/prize gold math), refusal under 150 gold, "next tournament in N days", save integrity across reload.
// node tools/sports/verify_venue.mjs [baseUrl] [outDir]   (serve kilumen/ first, e.g. python3 -m http.server 8137)
import { chromium } from 'playwright';
import fs from 'node:fs';
const BASE = process.argv[2] || 'http://localhost:8137/';
const OUT = process.argv[3] || 'shots/sports_v1';
const LIVE = /paigegames\.net/.test(BASE);
const runs = [
  { name: 'desktop', ctx: { viewport: { width: 1280, height: 720 } }, touch: false },
  { name: 'phone', ctx: { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, touch: true },
];
const browser = await chromium.launch();
const report = {};
const ok = (c, m, r) => { r.checks.push((c ? 'PASS ' : 'FAIL ') + m);console.log((c?"PASS ":"FAIL ")+m); if (!c) r.fail++; };
for (const run of runs) {
  const r = { checks: [], fail: 0, errors: [] }; report[run.name] = r;
  const ctx = await browser.newContext({ ...run.ctx, recordVideo: { dir: `${OUT}/_v_${run.name}`, size: run.ctx.viewport } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => r.errors.push(String(e))); page.on('console', (m) => { if (m.type() === 'error') r.errors.push(m.text()); });
  const qs = LIVE ? '?cv=0' : '?cv=0&idb=0&title=0&map=brookhollow&x=15&y=29&facing=up';
  await page.goto(BASE + qs, { waitUntil: 'load' });
  await page.waitForFunction(() => window.kilumen?.ready, null, { timeout: 60000 });
  await page.evaluate(() => window.kilumen.ready);
  await page.waitForFunction(() => window.kilumen.sports, null, { timeout: 30000 });
  await page.waitForTimeout(1500);
  // setup: a team, 400 gold, day 3 (a tournament day), stand under the coach facing up
  await page.evaluate(async () => {
    const sc = window.kilumen.scene, k = window.kilumen;
    const { createCreature } = await import(document.querySelector('script[src*="main.js"]').src.replace(/main\.js.*/, 'systems/creature.js'));
    sc.party.length = 0; sc.party.push(createCreature({ species: 'nibbin', level: 9, uid: 'c-v1' }), createCreature({ species: 'peeplark', level: 7, uid: 'c-v2' }));
    sc.systems.wallet.n = 400; sc.clock.day = 3; sc.clock.min = 600;
    if (sc.map.name !== 'brookhollow') { /* live: no map param, place by save */ }
    k.ui?.close?.();
  });
  if (LIVE) { // live has no dev params: move via a save edit + reload
    await page.evaluate(() => { const sc = window.kilumen.scene; sc.saveNow(); });
    await page.evaluate(() => { const K = Object.keys(localStorage).find((x) => /save\.v1$/.test(x)); const s = JSON.parse(localStorage[K]); s.map = 'brookhollow'; s.x = 15; s.y = 29; s.facing = 'up'; s.player && Object.assign(s.player, { map: 'brookhollow', x: 15, y: 29, facing: 'up' }); localStorage[K] = JSON.stringify(s); });
  }
  const info = await page.evaluate(() => { const sc = window.kilumen.scene; return { map: sc.map.name, x: sc.player.x, y: sc.player.y, coach: !!(sc.map.npcs || []).find((n) => n.id === 'dash_coach') }; });
  ok(info.map === 'brookhollow' && info.coach, `coach present in Brookhollow (${JSON.stringify(info)})`, r);
  await page.evaluate(() => { const sc = window.kilumen.scene; sc.player.x = 15; sc.player.y = 29; sc.player.px = 15; sc.player.py = 29; sc.player.facing = 'up'; });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/${run.name}_coach_world.png` });
  // talk: desktop presses F, phone calls interact (same path as the A button)
  if (run.touch) await page.evaluate(() => window.kilumen.scene.interact()); else await page.keyboard.press('f');
  for (let i = 0; i < 40; i++) {
    const s = await page.evaluate(() => ({ open: window.kilumen.sports.state().open, dlg: !!window.kilumen.scene.dialog?.active }));
    if (s.open) break;
    if (s.dlg) { if (run.touch) await page.evaluate(() => window.kilumen.scene.dialog.advance?.() ?? null); await page.keyboard.press('f'); }
    await page.waitForTimeout(250);
  }
  await page.waitForSelector('#sports-venue', { timeout: 10000 });
  ok(await page.evaluate(() => window.kilumen.scene.saveLockReason()) != null, 'save locked while the venue is open', r);
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/${run.name}_tournament_screen.png` });
  const savedCoins = () => page.evaluate(() => { const K = Object.keys(localStorage).find((x) => /save\.v1$/.test(x)); return K ? JSON.parse(localStorage[K]).coins : null; });
  const coins = () => page.evaluate(() => window.kilumen.scene.systems.wallet.coins);
  const click = async (sel) => { if (run.touch) await page.tap(sel); else await page.click(sel); };
  async function playMeet(tag) {
    await page.waitForSelector('#sports-ov .mon'); await click('#sports-ov .mon');
    const tap = async () => { if (run.touch) await page.tap('#sports-ov canvas'); else await page.keyboard.press('Space'); };
    let starts = 0, lockSeen = null, saveMid = null, shot = false;
    for (let g = 0; g < 5000; g++) {
      const s = await page.evaluate(() => window.kilumen.sports.state());
      if (s.phase === 'results') break;
      if (s.phase === 'race') {
        if (lockSeen === null) { lockSeen = await page.evaluate(() => window.kilumen.scene.saveLockReason()); saveMid = await page.evaluate(() => window.kilumen.scene.saveNow()); }
        if (s.clock !== null && s.clock > 0.18 && s.log.filter((x) => x[0] === 'start').length === starts) { await tap(); starts++; }
        if (s.prompt && s.clock - s.promptT0 > 0.42) { await tap(); await page.waitForTimeout(100); }
        if (!shot && s.clock > 9 && tag === 'tourney') { await page.screenshot({ path: `${OUT}/${run.name}_race_mid.png` }); shot = true; }
      }
      await page.waitForTimeout(40);
    }
    await page.waitForTimeout(500);
    return { lockSeen, saveMid };
  }
  // 1) free practice: no fee, no prize
  const c0 = await coins();
  await click('#sports-ov [data-a=practice]');
  const p = await playMeet('practice');
  ok(p.lockSeen && p.saveMid === false, `practice: save refused mid-race (lock=${p.lockSeen}, saveNow=${p.saveMid})`, r);
  ok(await coins() === c0, `practice: gold unchanged (${c0} -> ${await coins()})`, r);
  await page.screenshot({ path: `${OUT}/${run.name}_practice_results.png` });
  await click('#sports-ov [data-a=close]'); await page.waitForSelector('#sports-venue');
  // 2) tournament: fee 150, prize 1000 for 1st
  const preSave = await savedCoins();
  await click('#sports-ov [data-a=tourney]');
  await page.waitForSelector('#sports-ov .mon');
  ok(await coins() === c0, 'tourney: no fee until a creature is picked', r);
  const t = await playMeet('tourney');
  const res = await page.evaluate(() => ({ text: document.querySelector('#sports-results')?.innerText, st: window.kilumen.sports.tourney(), coins: window.kilumen.scene.systems.wallet.coins }));
  const won = /Champion/.test(res.text);
  ok(res.coins === c0 - 150 + (won ? 1000 : 0), `tourney: gold math ${c0} - 150${won ? ' + 1000' : ''} = ${res.coins}`, r);
  ok(t.lockSeen && t.saveMid === false && (await savedCoins()) === preSave, `tourney: nothing saved mid-race (saved coins still ${preSave})`, r);
  await page.screenshot({ path: `${OUT}/${run.name}_results.png` });
  if (run.name === 'desktop') fs.writeFileSync(`${OUT}/desktop_results.txt`, res.text || '');
  await click('#sports-ov [data-a=close]'); await page.waitForSelector('#sports-venue');
  const st2 = await page.evaluate(() => window.kilumen.sports.tourney());
  ok(!st2.status.ok && st2.status.reason === 'entered', `tourney: one entry per window (${st2.status.msg})`, r);
  await page.screenshot({ path: `${OUT}/${run.name}_tournament_entered.png` });
  await click('#sports-ov [data-a=close]');
  for (let i = 0; i < 20; i++) { if (!(await page.evaluate(() => window.kilumen.scene.busy || window.kilumen.scene.dialog?.active))) break; await page.keyboard.press('f'); await page.waitForTimeout(250); }
  await page.waitForTimeout(800);
  const after = await page.evaluate(() => ({ lock: window.kilumen.scene.saveLockReason(), ts: window.kilumen.scene.timescale }));
  ok(!after.lock && after.ts !== 0, `after close: unlocked, world running (${JSON.stringify(after)})`, r);
  await page.evaluate(() => window.kilumen.scene.saveNow()); await page.evaluate(() => window.kilumen.save?.flush?.());
  const disk = await page.evaluate(() => { const K = Object.keys(localStorage).find((x) => /save\.v1$/.test(x)); const s = JSON.parse(localStorage[K]); return { coins: s.coins, sports: s.systems?.sports, party: (s.party || []).map((c) => ({ species: c.species, uid: c.uid, ath: !!c.ath })) }; });
  ok(disk.coins === res.coins && disk.sports?.enteredWindow === 1, `save after: coins ${disk.coins}, sports ${JSON.stringify(disk.sports)}`, r);
  // 3) reload: state survives
  await page.reload({ waitUntil: 'load' }); await page.evaluate(() => window.kilumen.ready); await page.waitForFunction(() => window.kilumen.sports, null, { timeout: 30000 });
  const re = await page.evaluate(() => ({ coins: window.kilumen.scene.systems.wallet.coins, t: window.kilumen.sports.tourney(), party: window.kilumen.scene.party.map((c) => c.species + ':' + (c.uid || '') + ':' + !!c.ath) }));
  ok(re.coins === res.coins && re.t.state.enteredWindow === 1 && re.party.length === 2, `reload: coins ${re.coins}, entered window kept, party ${re.party.join(',')}`, r);
  // 4) under 150 gold is refused; non-tournament day shows the countdown
  await page.evaluate(() => { const sc = window.kilumen.scene; sc.systems.wallet.n = 100; sc.clock.day = 6; });
  await page.evaluate(() => { window.kilumen.sports.openVenue(); });
  await page.waitForSelector('#sports-venue');
  const gold = await page.evaluate(() => ({ dis: document.querySelector('#sports-ov [data-a=tourney]').disabled, msg: document.querySelector('#sports-tourney-status').innerText }));
  ok(gold.dis && /150 gold/.test(gold.msg), `refused under 150 gold (${gold.msg})`, r);
  await page.screenshot({ path: `${OUT}/${run.name}_tournament_need_gold.png` });
  await click('#sports-ov [data-a=close]');
  await page.evaluate(() => { const sc = window.kilumen.scene; sc.systems.wallet.n = 900; sc.clock.day = 7; });
  await page.evaluate(() => { window.kilumen.sports.openVenue(); }); await page.waitForSelector('#sports-venue');
  const cd = await page.evaluate(() => document.querySelector('#sports-tourney-status').innerText);
  ok(/in 2 days/.test(cd), `countdown on day 7: ${cd}`, r);
  await page.screenshot({ path: `${OUT}/${run.name}_tournament_countdown.png` });
  await click('#sports-ov [data-a=close]');
  r.errors = r.errors.filter((e) => !/favicon|ERR_FILE_NOT_FOUND/.test(e));
  ok(r.errors.length === 0, `no console errors (${r.errors.length})`, r);
  const vid = await page.video().path(); await ctx.close();
  fs.renameSync(vid, `${OUT}/${run.name}_venue.webm`); fs.rmSync(`${OUT}/_v_${run.name}`, { recursive: true, force: true });
}
await browser.close();
fs.writeFileSync(`${OUT}/verify_venue${LIVE ? '_live' : ''}.json`, JSON.stringify(report, null, 1));
for (const [k, v] of Object.entries(report)) console.log(k, v.fail ? 'FAIL' : 'OK', '\n  ' + v.checks.join('\n  '), v.errors.length ? '\n  errors: ' + v.errors.slice(0, 5).join(' | ') : '');
