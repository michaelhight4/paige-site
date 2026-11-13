// rtb capture tab shots + clips -> shots/rtb_capture_v1/. PORT=8199 node tests/rtb_capture_shots.mjs (server at the worktree kilumen/)
import { chromium } from 'playwright';
import fs from 'node:fs';
const PORT = process.env.PORT || 8199, OUT = '/workspace/kilumen/shots/rtb_capture_v1/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PROF = { pc: { viewport: { width: 1280, height: 720 } }, phone: { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } };
fs.mkdirSync(OUT, { recursive: true });
for (const prof of Object.keys(PROF)) {
  const tmp = `/tmp/rtbcap_${prof}`; fs.rmSync(tmp, { recursive: true, force: true });
  const b = await chromium.launch(); const ctx = await b.newContext({ ...PROF[prof], recordVideo: { dir: tmp, size: PROF[prof].viewport } }); await ctx.addInitScript(() => localStorage.setItem('kilumen_alpha_rtb_mode', 'rt'));
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(`http://127.0.0.1:${PORT}/index.html?reset=1&skipintro=1&title=0&save=0&hour=12&clouds=0&audio=0&map=route1&x=20&y=24&encrate=1&ix2=0&rtb=1&rtbpack=0&rtbcatch=0`);
  await page.waitForFunction(() => window.kilumen?.ui?.sdReady && window.kilumen.ui.wild?.ready, null, { timeout: 30000 }); await sleep(3000);
  for (let k = 0; k < 4; k++) { if (prof === 'pc') await page.keyboard.press('Enter'); else await page.evaluate(() => document.querySelector('[data-btn="a"]')?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))); await sleep(900); }
  await page.evaluate(async () => { const { createCreature } = await import('/src/systems/creature.js'); const sc = window.kilumen.scene; sc.party = [createCreature({ species: 'cindrip', level: 14 }), createCreature({ species: 'nibbin', level: 9 })]; sc._placeFollower(); await sc._loadActorSprites();
    const bag = sc.systems.bag; for (const id of Object.keys(bag.counts)) if (/crystal/.test(id)) bag.remove(id, bag.count(id)); bag.add('dominance_crystal', 4); bag.add('dominance_crystal_plus', 2); });
  await sleep(500);
  await page.evaluate(async () => { const m = await import('/src/rtb/index.js?v=v0.2.60-alpha'); window.kilumen.rtb = m.RTB_STATE; m.openRtBattle(window.kilumen.ui, window.kilumen.scene, { species: 'tumbloam', level: 6 }); });
  await sleep(1800);
  await page.screenshot({ path: `${OUT}${prof}_01_hud_capture_button.png` });
  await page.evaluate(() => { window.kilumen.rtb.active.sim.forceCatch = false; });
  const calm = () => page.evaluate(() => { if (!window.kilumen.rtb.active) return; const s = window.kilumen.rtb.active.sim, f = s.foes[0]; f.ai.state = 'alert'; f.ai.t = 99; f.act = null; s.ally.iframes = 99; });
  const press = async (key, sel) => { if (prof === 'pc') await page.keyboard.press(key); else await page.tap(sel); };
  // 1: tab at full HP (slim odds)
  await calm(); await press('KeyG', '[data-rtb="crystal"]'); await sleep(350); await page.screenshot({ path: `${OUT}${prof}_02_tab_full_hp.png` });
  await press('KeyG', '[data-rtb="crystal"]'); await sleep(300);
  // 2: weaken + drowsy -> better odds
  await page.evaluate(() => { const s = window.kilumen.rtb.active.sim, f = s.foes[0]; f.c.hp = Math.max(1, Math.floor(f.mhp * 0.2)); f.drowsy = 30; });
  await press('KeyG', '[data-rtb="crystal"]'); await sleep(350); await page.screenshot({ path: `${OUT}${prof}_03_tab_weak_drowsy.png` });
  // 3: launch, break free (rtbcatch=0)
  await press('Digit1', '.rtb-cr[data-cap="0"]'); await sleep(550); await page.screenshot({ path: `${OUT}${prof}_04_crystal_wobble.png` });
  await page.waitForFunction(() => !window.kilumen.rtb.active.sim.capture, null, { timeout: 8000 }).catch(() => {}); await sleep(120); await page.screenshot({ path: `${OUT}${prof}_05_break_free.png` });
  await sleep(1300); await calm();
  // 4: launch the Prime, caught
  await page.evaluate(() => { window.kilumen.rtb.active.sim.forceCatch = true; });
  await press('KeyG', '[data-rtb="crystal"]'); await sleep(300); await press('Digit2', '.rtb-cr[data-cap="1"]');
  await page.waitForFunction(() => window.kilumen.rtb.active?.sim.caught, null, { timeout: 8000 }).catch(() => {}); await sleep(250); await page.screenshot({ path: `${OUT}${prof}_06_caught_sparkle.png` });
  await sleep(2500);
  // 5: trainer fight: button hidden
  await page.evaluate(async () => { const m = await import('/src/rtb/index.js?v=v0.2.60-alpha'); m.openRtBattle(window.kilumen.ui, window.kilumen.scene, { species: 'tumbloam', level: 6 }); });
  await sleep(600); await page.evaluate(() => { window.kilumen.rtb.active.sim.trainer = true; }); await sleep(300);
  const hidden = await page.evaluate(() => document.querySelector('[data-rtb="crystal"]')?.hidden);
  await page.screenshot({ path: `${OUT}${prof}_07_trainer_no_capture.png` });
  const v = page.video(); await ctx.close(); await b.close(); fs.copyFileSync(await v.path(), `${OUT}${prof}_clip.webm`);
  console.log(prof, { hidden, errs });
}
