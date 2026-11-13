// Hype pass v2 browser check (DEV). Desktop + phone: talks to Coach Wren, runs a practice meet (desktop) and a FORCED-WIN
// tournament (?sportswin=1, dev only) so the champion screen and the +1000 payout are seen; checks gold math, save lock
// mid-race, fps during the race, console errors; writes stills + phase timestamps for clip cutting.
// node tools/sports/verify_hype.mjs [baseUrl] [outDir] [extraQuery]
import { chromium } from 'playwright';
import fs from 'node:fs';
const BASE = process.argv[2] || 'http://localhost:8137/';
const OUT = process.argv[3] || 'shots/sports_v2';
const EXTRA = process.argv[4] || '';
const LIVE = !!process.env.LIVE; // live build: no ?map/?title/?sportswin -> dismiss notice+title, warp in-page, any tourney result
fs.mkdirSync(OUT, { recursive: true });
const runs = [
  { name: 'desktop', ctx: { viewport: { width: 1280, height: 720 } }, touch: false, practice: true },
  { name: 'phone', ctx: { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, touch: true, practice: !!process.env.LIVE },
];
const browser = await chromium.launch();
const report = {};
for (const run of runs) {
  const r = { checks: [], fail: 0, errors: [], phases: {}, fps: [] }; report[run.name] = r;
  const ok = (c, m) => { r.checks.push((c ? 'PASS ' : 'FAIL ') + m); console.log(run.name, c ? 'PASS' : 'FAIL', m); if (!c) r.fail++; };
  const ctx = await browser.newContext({ ...run.ctx, recordVideo: { dir: `${OUT}/_v_${run.name}`, size: run.ctx.viewport } });
  const t0 = Date.now();
  const page = await ctx.newPage();
  page.on('pageerror', (e) => r.errors.push(String(e))); page.on('console', (m) => { if (m.type() === 'error') r.errors.push(m.text()); });
  await page.goto(BASE + '?cv=0&idb=0&title=0&map=brookhollow&x=15&y=29&facing=up&sportswin=1' + EXTRA, { waitUntil: 'load' });
  if (LIVE) for (let i = 0; i < 12; i++) {
    const got = page.getByText('Got it', { exact: true }); if (await got.isVisible().catch(() => false)) await (run.touch ? got.tap() : got.click()).catch(() => {});
    const ng = page.getByText('New game', { exact: true }); if (await ng.isVisible().catch(() => false)) await (run.touch ? ng.tap() : ng.click()).catch(() => {}); // live: no ?title=0, close the title (else store.hold = nothing saves)
    if (i > 2 && await page.evaluate(() => !!window.kilumen?.scene?.map && window.kilumen.scene.store?.hold === false).catch(() => false)) break; await page.keyboard.press('Enter'); await page.waitForTimeout(700);
  }
  await page.waitForFunction(() => window.kilumen?.ready, null, { timeout: 60000 });
  await page.evaluate(() => window.kilumen.ready);
  if (LIVE) { await page.evaluate(async () => { const sc = window.kilumen.scene; if (sc.map?.name !== 'brookhollow') { sc.map = await sc.loadMap('brookhollow'); await sc.ensureAssets(); sc.player.place(49, 28, 'right'); await sc._enterMap(); sc._dirty = true; } });
    for (let i = 0; i < 12 && await page.evaluate(() => !!window.kilumen.scene.dialog?.active || window.kilumen.scene.busy); i++) { await page.keyboard.press('f'); await page.waitForTimeout(400); } }
  await page.waitForFunction(() => window.kilumen.sports, null, { timeout: 30000 });
  await page.waitForTimeout(1200);
  await page.evaluate(async () => {
    const sc = window.kilumen.scene;
    const { createCreature } = await import(document.querySelector('script[src*="main.js"]').src.replace(/main\.js.*/, 'systems/creature.js'));
    sc.party.length = 0; sc.party.push(createCreature({ species: 'nibbin', level: 9, uid: 'c-v1' }), createCreature({ species: 'peeplark', level: 7, uid: 'c-v2' }), createCreature({ species: 'tumbloam', level: 8, uid: 'c-v3' }));
    sc.systems.wallet.n = 400; sc.clock.day = 3; sc.clock.min = 600;
    const sp = window.kilumen.scene.systems.state.sports; if (sp) sp.best = 30; else window.kilumen.scene.systems.state.sports = { best: 30 }; // so a NEW RECORD! shows
    sc.player.x = 49; sc.player.y = 28; sc.player.px = 49; sc.player.py = 28; sc.player.facing = 'right'; // coach at the Dash Track gate (50,28)
  });
  await page.mouse.click(5, 5).catch(() => {}); // unlock audio with a gesture
  await page.waitForTimeout(300);
  if (run.touch) await page.evaluate(() => window.kilumen.scene.interact()); else await page.keyboard.press('f');
  for (let i = 0; i < 40; i++) {
    const s = await page.evaluate(() => ({ open: window.kilumen.sports.state().open, dlg: !!window.kilumen.scene.dialog?.active, busy: window.kilumen.scene.busy }));
    if (s.open) break; if (LIVE && !s.dlg && !s.busy && i % 6 === 5) await page.keyboard.press('f'); if (s.dlg) await page.keyboard.press('f'); await page.waitForTimeout(250);
  }
  if (LIVE) { await page.screenshot({ path: `${OUT}/${run.name}_pre_venue.png` }); console.log(run.name, 'pre-venue', JSON.stringify(await page.evaluate(() => { const sc = window.kilumen.scene; return { map: sc.map?.name, p: [sc.player.x, sc.player.y, sc.player.facing], busy: sc.busy, dlg: !!sc.dialog?.active, v: !!document.querySelector('#sports-venue'), ov: document.querySelector('#sports-ov')?.innerHTML.slice(0,120), frames: window.frames.length }; }))); }
  await page.waitForSelector('#sports-venue', { timeout: 10000, state: LIVE ? 'attached' : 'visible' });
  const click = async (sel) => { if (run.touch) await page.tap(sel); else await page.click(sel); };
  const coins = () => page.evaluate(() => window.kilumen.scene.systems.wallet.coins);
  const savedCoins = () => page.evaluate(() => { const K = Object.keys(localStorage).find((x) => /save\.v1$/.test(x)); return K ? JSON.parse(localStorage[K]).coins : null; });
  async function playMeet(tag) {
    await page.waitForSelector('#sports-ov .mon'); if (tag === 'tourney') await page.screenshot({ path: `${OUT}/${run.name}_picker.png` }); await click('#sports-ov .mon');
    if (tag === 'tourney') { await page.waitForTimeout(300); r.feeCoins = await coins(); }
    const tap = async () => { if (run.touch) await page.tap('#sports-ov canvas'); else await page.keyboard.press('Space'); };
    let needStart = false, starts = 0, lockSeen = null, saveMid = null, prevFx = null, race = 0, fpsOn = false; const seen = {};
    for (let g = 0; g < 9000; g++) {
      const s = await page.evaluate(() => window.kilumen.sports.state());
      if (s.phase === 'results') { console.log(run.name, tag, 'inputs', JSON.stringify(s.log)); break; }
      if (s.fx !== prevFx) { if (s.fx === 'intro' || (s.fx === 'countdown' && prevFx !== 'intro')) race++; if (s.fx === 'race') needStart = true; prevFx = s.fx; const k = `${tag}_r${race}_${s.fx}`; r.phases[k] = Date.now() - t0; seen[s.fx] = (seen[s.fx] || 0) + 1;
        if (s.fx === 'race' && !fpsOn) { fpsOn = true; await page.evaluate(() => { window.__fps = { n: 0, t: performance.now(), worst: 0, last: performance.now() }; const f = (now) => { const F = window.__fps; F.n++; F.worst = Math.max(F.worst, now - F.last); F.last = now; if (!F.stop) requestAnimationFrame(f); }; requestAnimationFrame(f); }); }
        const still = { countdown: 450, final_stretch: 500, finish: 300, results: 2600, champion: 2800 }[s.fx];
        if (still && tag === 'tourney' && (s.fx === 'champion' || race === 2 || !fs.existsSync(`${OUT}/${run.name}_${s.fx}.png`))) { if (!s.prompt) await page.waitForTimeout(still); else if (s.clock - s.promptT0 < 0.84) { await page.waitForTimeout(Math.max(0, (0.86 - (s.clock - s.promptT0)) * 1000 / 2)); await (run.touch ? page.tap('#sports-ov canvas') : page.keyboard.press('Space')); } await page.screenshot({ path: `${OUT}/${run.name}_${s.fx}.png` }); }
        if (s.fx === 'finish' && fpsOn) { fpsOn = false; r.fps.push(await page.evaluate(() => { const F = window.__fps; F.stop = true; return { fps: +(F.n / ((performance.now() - F.t) / 1000)).toFixed(1), worstMs: +F.worst.toFixed(1) }; })); }
      }
      if (s.phase === 'race') {
        if (lockSeen === null && s.fx === 'race') { lockSeen = await page.evaluate(() => window.kilumen.scene.saveLockReason()); saveMid = await page.evaluate(() => window.kilumen.scene.saveNow()); }
        if (s.clock !== null && s.clock > 0.18 && s.fx === 'race' && needStart) { await tap(); needStart = false; starts++; }
        if (s.prompt && s.clock - s.promptT0 > 0.84) { await tap(); await page.waitForTimeout(100); }
      }
      if (s.phase === 'champion' && s.champ && s.champ.shown >= s.champ.prize && Date.now() - t0 - r.phases[`${tag}_r${race}_champion`] > 4200) await tap();
      await page.waitForTimeout(30);
    }
    await page.waitForTimeout(500);
    return { lockSeen, saveMid, seen };
  }
  await page.screenshot({ path: `${OUT}/${run.name}_lobby.png` });
  const c0 = await coins();
  if (run.practice) {
    await click('#sports-ov [data-a=practice]');
    const p = await playMeet('practice');
    ok(p.lockSeen && p.saveMid === false, `practice: save refused mid-race (${p.lockSeen})`);
    ok(await coins() === c0, `practice: gold unchanged ${c0}`);
    ok(!p.seen.champion, 'practice: no champion screen (smaller win celebration on the scoreboard)');
    await click('#sports-ov [data-a=close]'); await page.waitForSelector('#sports-venue', { state: LIVE ? 'attached' : 'visible' });
  }
  const preSave = await savedCoins();
  await click('#sports-ov [data-a=tourney]');
  const tr = await playMeet('tourney'); if (LIVE) ok(r.feeCoins === c0 - 150, `tourney entry (after pick): gold ${c0} -> ${r.feeCoins}`);
  const res = await page.evaluate(() => ({ text: document.querySelector('#sports-results')?.innerText, coins: window.kilumen.scene.systems.wallet.coins }));
  const won = /Champion/.test(res.text || '');
  if (!LIVE) { ok(won, 'tourney: forced win (results say Champion)'); ok(tr.seen.champion >= 1, 'tourney: champion screen shown'); }
  else console.log(run.name, 'tourney result', won ? 'Champion' : 'not won', 'champion screen', tr.seen.champion || 0);
  ok(res.coins === c0 - 150 + (won ? 1000 : 0), `tourney: gold math ${c0} - 150${won ? ' + 1000' : ''} = ${res.coins}`);
  ok(tr.lockSeen && tr.saveMid === false && (await savedCoins()) === preSave, `tourney: nothing saved mid-race (saved coins still ${preSave})`);
  for (const k of ['intro', 'countdown', 'race', 'final_stretch', 'finish', 'results']) ok(tr.seen[k] >= 1, `tourney: phase ${k} seen`);
  await page.screenshot({ path: `${OUT}/${run.name}_results_table.png` });
  await click('#sports-ov [data-a=close]'); await page.waitForSelector('#sports-venue', { state: LIVE ? 'attached' : 'visible' }); await click('#sports-ov [data-a=close]');
  for (let i = 0; i < 20; i++) { if (!(await page.evaluate(() => window.kilumen.scene.busy || window.kilumen.scene.dialog?.active))) break; await page.keyboard.press('f'); await page.waitForTimeout(250); }
  await page.waitForTimeout(800);
  await page.evaluate(() => window.kilumen.scene.saveNow()); await page.evaluate(() => window.kilumen.save?.flush?.());
  const disk = await savedCoins();
  ok(disk === res.coins, `saved once after close: ${disk}`);
  r.errors = r.errors.filter((e) => !/favicon|ERR_FILE_NOT_FOUND|404/.test(e));
  ok(r.errors.length === 0, `no console errors (${r.errors.slice(0, 3).join(' | ')})`);
  const vid = await page.video().path(); await ctx.close();
  fs.renameSync(vid, `${OUT}/${run.name}_full.webm`); fs.rmSync(`${OUT}/_v_${run.name}`, { recursive: true, force: true });
}
await browser.close();
fs.writeFileSync(`${OUT}/verify_hype${EXTRA ? '_rm' : ''}.json`, JSON.stringify(report, null, 1));
for (const [k, v] of Object.entries(report)) console.log(k, v.fail ? 'FAIL' : 'OK', JSON.stringify(v.fps));
