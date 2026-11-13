// Hype pass v2 browser check (DEV). Desktop + phone: talks to Coach Wren, runs a practice meet (desktop) and a FORCED-WIN
// tournament (?sportswin=1, dev only) so the champion screen and the +1000 payout are seen; checks gold math, save lock
// mid-race, fps during the race, console errors; writes stills + phase timestamps for clip cutting.
// node tools/sports/verify_hype.mjs [baseUrl] [outDir] [extraQuery]
import { chromium } from 'playwright';
import fs from 'node:fs';
const BASE = process.argv[2] || 'http://localhost:8137/';
const OUT = process.argv[3] || 'shots/sports_v2';
const EXTRA = process.argv[4] || '';
fs.mkdirSync(OUT, { recursive: true });
const runs = [
  { name: 'desktop', ctx: { viewport: { width: 1280, height: 720 } }, touch: false, practice: true },
  { name: 'phone', ctx: { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, touch: true, practice: false },
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
  await page.waitForFunction(() => window.kilumen?.ready, null, { timeout: 60000 });
  await page.evaluate(() => window.kilumen.ready);
  await page.waitForFunction(() => window.kilumen.sports, null, { timeout: 30000 });
  await page.waitForTimeout(1200);
  await page.evaluate(async () => {
    const sc = window.kilumen.scene;
    const { createCreature } = await import(document.querySelector('script[src*="main.js"]').src.replace(/main\.js.*/, 'systems/creature.js'));
    sc.party.length = 0; sc.party.push(createCreature({ species: 'nibbin', level: 9, uid: 'c-v1' }), createCreature({ species: 'peeplark', level: 7, uid: 'c-v2' }), createCreature({ species: 'tumbloam', level: 8, uid: 'c-v3' }));
    sc.systems.wallet.n = 400; sc.clock.day = 3; sc.clock.min = 600;
    const sp = window.kilumen.scene.systems.state.sports; if (sp) sp.best = 30; else window.kilumen.scene.systems.state.sports = { best: 30 }; // so a NEW RECORD! shows
    sc.player.x = 15; sc.player.y = 29; sc.player.px = 15; sc.player.py = 29; sc.player.facing = 'up';
  });
  await page.mouse.click(5, 5).catch(() => {}); // unlock audio with a gesture
  await page.waitForTimeout(300);
  if (run.touch) await page.evaluate(() => window.kilumen.scene.interact()); else await page.keyboard.press('f');
  for (let i = 0; i < 40; i++) {
    const s = await page.evaluate(() => ({ open: window.kilumen.sports.state().open, dlg: !!window.kilumen.scene.dialog?.active }));
    if (s.open) break; if (s.dlg) await page.keyboard.press('f'); await page.waitForTimeout(250);
  }
  await page.waitForSelector('#sports-venue', { timeout: 10000 });
  const click = async (sel) => { if (run.touch) await page.tap(sel); else await page.click(sel); };
  const coins = () => page.evaluate(() => window.kilumen.scene.systems.wallet.coins);
  const savedCoins = () => page.evaluate(() => { const K = Object.keys(localStorage).find((x) => /save\.v1$/.test(x)); return K ? JSON.parse(localStorage[K]).coins : null; });
  async function playMeet(tag) {
    await page.waitForSelector('#sports-ov .mon'); await click('#sports-ov .mon');
    const tap = async () => { if (run.touch) await page.tap('#sports-ov canvas'); else await page.keyboard.press('Space'); };
    let needStart = false, starts = 0, lockSeen = null, saveMid = null, prevFx = null, race = 0, fpsOn = false; const seen = {};
    for (let g = 0; g < 9000; g++) {
      const s = await page.evaluate(() => window.kilumen.sports.state());
      if (s.phase === 'results') { console.log(run.name, tag, 'inputs', JSON.stringify(s.log)); break; }
      if (s.fx !== prevFx) { if (s.fx === 'intro' || (s.fx === 'countdown' && prevFx !== 'intro')) race++; if (s.fx === 'race') needStart = true; prevFx = s.fx; const k = `${tag}_r${race}_${s.fx}`; r.phases[k] = Date.now() - t0; seen[s.fx] = (seen[s.fx] || 0) + 1;
        if (s.fx === 'race' && !fpsOn) { fpsOn = true; await page.evaluate(() => { window.__fps = { n: 0, t: performance.now(), worst: 0, last: performance.now() }; const f = (now) => { const F = window.__fps; F.n++; F.worst = Math.max(F.worst, now - F.last); F.last = now; if (!F.stop) requestAnimationFrame(f); }; requestAnimationFrame(f); }); }
        const still = { countdown: 450, final_stretch: 500, finish: 300, results: 2600, champion: 2800 }[s.fx];
        if (still && tag === 'tourney' && (s.fx === 'champion' || race === 2 || !fs.existsSync(`${OUT}/${run.name}_${s.fx}.png`))) { await page.waitForTimeout(still); await page.screenshot({ path: `${OUT}/${run.name}_${s.fx}.png` }); }
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
  const c0 = await coins();
  if (run.practice) {
    await click('#sports-ov [data-a=practice]');
    const p = await playMeet('practice');
    ok(p.lockSeen && p.saveMid === false, `practice: save refused mid-race (${p.lockSeen})`);
    ok(await coins() === c0, `practice: gold unchanged ${c0}`);
    ok(!p.seen.champion, 'practice: no champion screen (smaller win celebration on the scoreboard)');
    await click('#sports-ov [data-a=close]'); await page.waitForSelector('#sports-venue');
  }
  const preSave = await savedCoins();
  await click('#sports-ov [data-a=tourney]');
  const tr = await playMeet('tourney');
  const res = await page.evaluate(() => ({ text: document.querySelector('#sports-results')?.innerText, coins: window.kilumen.scene.systems.wallet.coins }));
  ok(/Champion/.test(res.text || ''), 'tourney: forced win (results say Champion)');
  ok(tr.seen.champion >= 1, 'tourney: champion screen shown');
  ok(res.coins === c0 - 150 + 1000, `tourney: gold math ${c0} - 150 + 1000 = ${res.coins}`);
  ok(tr.lockSeen && tr.saveMid === false && (await savedCoins()) === preSave, `tourney: nothing saved mid-race (saved coins still ${preSave})`);
  for (const k of ['intro', 'countdown', 'race', 'final_stretch', 'finish', 'results']) ok(tr.seen[k] >= 1, `tourney: phase ${k} seen`);
  await page.screenshot({ path: `${OUT}/${run.name}_results_table.png` });
  await click('#sports-ov [data-a=close]'); await page.waitForSelector('#sports-venue'); await click('#sports-ov [data-a=close]');
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
