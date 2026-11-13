// Headless check of the dev Dash Race (?sports=1) on desktop + phone; records video + results screenshot.
// node tools/sports/verify_race.mjs [baseUrl]   (serve the repo root first, e.g. python3 -m http.server 8137)
import { chromium } from 'playwright';
import fs from 'node:fs';
const BASE = process.argv[2] || 'http://localhost:8137/';
const OUT = 'shots/sports_v1';
const runs = [
  { name: 'desktop', ctx: { viewport: { width: 1280, height: 720 } }, tap: 'key' },
  { name: 'phone', ctx: { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, tap: 'touch' },
];
const browser = await chromium.launch();
const report = {};
for (const run of runs) {
  const ctx = await browser.newContext({ ...run.ctx, recordVideo: { dir: `${OUT}/_video_${run.name}`, size: run.ctx.viewport } });
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', (e) => errors.push(String(e))); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(BASE + '?save=0&sports=1&cv=0', { waitUntil: 'load' });
  await page.waitForFunction(() => window.kilumen?.ready, null, { timeout: 30000 });
  await page.evaluate(() => window.kilumen.ready);
  await page.waitForTimeout(1500);
  // hook in main.js once v0.2.36 has shipped; until then attach here the same way the hook will
  await page.evaluate(async () => {
    const sc = window.kilumen.scene;
    if (!sc.party?.length) { const { createCreature } = await import('./src/systems/creature.js'); sc.party = [createCreature({ species: 'nibbin', level: 8, uid: 'c-demo1' }), createCreature({ species: 'peeplark', level: 7, uid: 'c-demo2' }), createCreature({ species: 'tumbloam', level: 6, uid: 'c-demo3' })]; }
    if (!window.kilumen.sports) { const m = await import('./src/sports/index.js'); window.kilumen.sports = m.attachSports(sc, {}); }
  });
  const t0 = Date.now();
  await page.click('#sports-btn');
  await page.waitForSelector('#sports-ov .mon');
  await page.waitForTimeout(800);
  if (run.name === 'desktop') await page.screenshot({ path: `${OUT}/desktop_picker.png` });
  if (run.tap === 'touch') await page.tap('#sports-ov .mon'); else await page.click('#sports-ov .mon');
  const tap = async () => { if (run.tap === 'touch') await page.tap('#sports-ov canvas'); else await page.keyboard.press('Space'); };
  const marks = []; let shotDone = false, guard = 0, saveBlocked = null;
  while (guard++ < 4000) {
    const s = await page.evaluate(() => window.kilumen.sports.state());
    if (s.phase === 'results') break;
    if (s.phase === 'race') {
      if (saveBlocked === null) saveBlocked = await page.evaluate(() => window.kilumen.scene.saveLockReason?.() ?? 'n/a');
      const st = s.log.filter((x) => x[0] === 'start').length, races = marks.filter((m) => m === 'race').length;
      if (s.clock !== null && s.clock > 0.18 && st === races) { await tap(); marks.push('race'); }
      if (s.prompt && s.promptT0 !== null && s.clock - s.promptT0 > 0.42) { await tap(); await page.waitForTimeout(100); }
      if (!shotDone && s.clock > 9) { await page.screenshot({ path: `${OUT}/${run.name}_race_mid.png` }); shotDone = true; }
      if (s.prompt && run.name === 'desktop' && !fs.existsSync(`${OUT}/desktop_prompt_${s.prompt}.png`)) await page.screenshot({ path: `${OUT}/desktop_prompt_${s.prompt}.png` });
    }
    await page.waitForTimeout(40);
  }
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/${run.name}_results.png`, fullPage: false });
  const fin = await page.evaluate(() => ({ state: window.kilumen.sports.state(), text: document.querySelector('#sports-results')?.innerText.slice(0, 900) }));
  await page.click('#sports-ov [data-a=close]');
  const after = await page.evaluate(() => ({ open: window.kilumen.sports.state().open, ts: window.kilumen.scene.timescale, lock: window.kilumen.scene.saveLockReason?.() ?? null }));
  report[run.name] = { seconds: (Date.now() - t0) / 1000, saveBlockedDuringRace: saveBlocked, log: fin.state.log, results: fin.text, after, errors };
  const vid = await page.video().path(); await ctx.close();
  fs.renameSync(vid, `${OUT}/${run.name}_meet.webm`); fs.rmSync(`${OUT}/_video_${run.name}`, { recursive: true, force: true });
}
await browser.close();
fs.writeFileSync(`${OUT}/verify_report.json`, JSON.stringify(report, null, 1));
console.log(JSON.stringify(report, null, 1));
