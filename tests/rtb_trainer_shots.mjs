// rtb keybinds v0.2.60 HUD shots -> shots/rtb_trainer_v1/. PORT=8197 node tests/rtb_keys_shots.mjs (server at the worktree kilumen/)
import { chromium } from 'playwright';
import fs from 'node:fs';
const PORT = process.env.PORT || 8197, OUT = '/workspace/kilumen/shots/rtb_trainer_v1/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PROF = { pc: { viewport: { width: 1280, height: 720 } }, phone: { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } };
fs.mkdirSync(OUT, { recursive: true });
for (const prof of Object.keys(PROF)) {
  const b = await chromium.launch(); const ctx = await b.newContext(PROF[prof]); await ctx.addInitScript(() => localStorage.setItem('kilumen_alpha_rtb_mode', 'rt')); const page = await ctx.newPage(); const errs = []; page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(`http://127.0.0.1:${PORT}/index.html?reset=1&skipintro=1&title=0&save=0&hour=12&clouds=0&audio=0&map=route1&x=20&y=24&encrate=1&ix2=0&rtb=1&rtbpack=0&rtbcatch=0`);
  await page.waitForFunction(() => window.kilumen?.ui?.sdReady && window.kilumen.ui.wild?.ready, null, { timeout: 30000 }); await sleep(3000);
  for (let k = 0; k < 4; k++) { if (prof === 'pc') await page.keyboard.press('Enter'); else await page.evaluate(() => document.querySelector('[data-btn="a"]')?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))); await sleep(900); }
  await page.evaluate(async () => { const { createCreature } = await import('/src/systems/creature.js'); const sc = window.kilumen.scene; sc.party = [createCreature({ species: 'cindrip', level: 14 }), createCreature({ species: 'nibbin', level: 9 }), createCreature({ species: 'nibbin', level: 7 })]; sc.party[2].hp = 0; sc._placeFollower(); await sc._loadActorSprites(); });
  await sleep(600);
  await page.evaluate(async () => { const m = await import('/src/rtb/index.js?v=v0.2.60-alpha'); window.kilumen.rtb = m.RTB_STATE; m.openRtBattle(window.kilumen.ui, window.kilumen.scene, null, { trainer: { foes: [{ species: 'tumbloam', level: 12 }, { species: 'burlbeetle', level: 12 }, { species: 'rillop', level: 12 }], name: 'Rival' } }); });
  await sleep(300);
  const active = await page.evaluate(() => !!window.kilumen.rtb?.active);
  await sleep(1800);
  if (prof === 'pc') { await page.keyboard.press('KeyQ'); await sleep(900); await page.keyboard.press('KeyE'); await sleep(120); }
  else { await page.evaluate(() => { const a = window.kilumen.rtb?.active; if (a) a.inp.fire = 0; }); await sleep(400); }
  await page.screenshot({ path: `${OUT}${prof}_trainer_fight.png` });
  if (prof === 'pc') { await page.keyboard.press('Digit2'); await sleep(700); await page.screenshot({ path: `${OUT}${prof}_trainer_switch.png` }); await page.keyboard.press('Digit3'); }
  await sleep(2500); await page.screenshot({ path: `${OUT}${prof}_hud_ready.png` });
  await page.evaluate(() => { const s = window.kilumen.rtb.active?.sim || window.kilumen.rtb.active; const f = s?.living?.[0]; if (f) { f.c.hp = 0; f.alive = false; } });
  await sleep(1800); await page.screenshot({ path: `${OUT}${prof}_trainer_sendout.png` });
  const info = await page.evaluate(() => { const a = window.kilumen.rtb?.active; return a && { activeSlot: a.sim.active, keys: [...document.querySelectorAll('.rtb-s .k')].map((e) => e.textContent), party: [...document.querySelectorAll('.rtb-pi .pk')].map((e) => e.textContent) }; });
  console.log(prof, { active, info, errs });
  await b.close();
}
