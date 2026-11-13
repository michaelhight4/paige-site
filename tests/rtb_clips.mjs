// rtb (DEV ONLY) clips + screenshots -> shots/rtb_v1/. Real input only: PC = keyboard, phone = CDP touch on the on-screen pad.
// Usage: PORT=8093 node tests/rtb_clips.mjs [pc|pc1080|phone]...   (needs a static server on PORT at the repo root)
// Flow: route1 (Trail 1, the grass north of Brookhollow), x=20 y=24, hold Down into tall grass, ?encrate=1 forces the roll.
// &ix2=0 only because another worker's interiors v2 sheet (x_furniture_fix_v2.png) is not on disk yet (Oct 29 2026).
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
const PORT = process.env.PORT || 8093, OUT = new URL('../shots/rtb_v1/', import.meta.url).pathname;
const want = process.argv.slice(2); const profs = want.length ? want : ['pc', 'pc1080', 'phone'];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PROF = { pc: { viewport: { width: 1280, height: 720 } }, pc1080: { viewport: { width: 1920, height: 1080 } },
  phone: { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } };
fs.mkdirSync(OUT, { recursive: true });
const report = {};
for (const prof of profs) {
  const tmp = `/tmp/rtbclip_${prof}`; fs.rmSync(tmp, { recursive: true, force: true });
  const b = await chromium.launch(); const ctx = await b.newContext({ ...PROF[prof], recordVideo: { dir: tmp, size: PROF[prof].viewport } });
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', (e) => errs.push(String(e)));
  const catchRun = prof !== 'pc1080';
  await page.goto(`http://127.0.0.1:${PORT}/index.html?save=0&hour=12&clouds=0&audio=0&map=route1&x=20&y=24&encrate=1&ix2=0&rtb=1&rtbpack=${prof === 'pc1080' ? 1 : 0}${catchRun ? '&rtbcatch=1' : ''}`);
  await page.waitForFunction(() => window.kilumen?.ui?.sdReady && window.kilumen.ui.wild?.ready, null, { timeout: 30000 });
  await page.evaluate(async () => { await Promise.all([window.kilumen.ui.sdReady, window.kilumen.ui.wild.ready]); const { createCreature } = await import('/src/systems/creature.js'); const sc = window.kilumen.scene; sc.party = [createCreature({ species: 'cindrip', level: 9 }), createCreature({ species: 'nibbin', level: 7 })]; sc._placeFollower(); await sc._loadActorSprites(); sc.systems.bag.add('dominance_crystal', 3); });
  const cdp = prof === 'phone' ? await ctx.newCDPSession(page) : null;
  const center = async (sel) => { const bb = await page.locator(sel).first().boundingBox(); return bb && { x: bb.x + bb.width / 2, y: bb.y + bb.height / 2 }; };
  const pts = new Map(); // multi-touch: the D-pad finger stays down while another finger taps A / B / HUD
  const touch = async (type, pt, id = 1) => {
    if (type === 'touchStart') { const first = !pts.size; pts.set(id, { x: pt.x, y: pt.y, id }); await cdp.send('Input.dispatchTouchEvent', { type: first ? 'touchStart' : 'touchStart', touchPoints: [...pts.values()] }); }
    else { if (!pts.has(id)) return; pts.delete(id); await cdp.send('Input.dispatchTouchEvent', { type: pts.size ? 'touchMove' : 'touchEnd', touchPoints: [...pts.values()] }); }
  };
  const tap = async (sel) => { const c = await center(sel); if (!c) return; await touch('touchStart', c, 7); await sleep(50); await touch('touchEnd', c, 7); };
  // hold a direction (keyboard or touch D-pad)
  let heldDir = null;
  const hold = async (d) => {
    if (d === heldDir) return;
    if (heldDir) { if (cdp) await touch('touchEnd', { x: 0, y: 0 }); else await page.keyboard.up('Arrow' + heldDir[0].toUpperCase() + heldDir.slice(1)); }
    heldDir = d; if (!d) return;
    if (cdp) await touch('touchStart', await center(`[data-dir="${d}"]`)); else await page.keyboard.down('Arrow' + d[0].toUpperCase() + d.slice(1));
  };
  await sleep(700); await page.screenshot({ path: `${OUT}${prof}_01_trail.png` });
  await hold('down');
  for (let i = 0; i < 150 && !(await page.evaluate(() => !!window.kilumen.rtb?.active)); i++) await sleep(100);
  await hold(null);
  await sleep(700); await page.screenshot({ path: `${OUT}${prof}_02_jump_out.png` });
  // simple real-input player: face the target, keep ~150px, fire the selected skill, dodge when a telegraph is aimed at us
  const t0 = Date.now(); let shots = 0, dodged = 0, crystalTried = 0, shotAt = { hit: 0 };
  while (Date.now() - t0 < 45000) {
    const s = await page.evaluate(() => { const a = window.kilumen.rtb?.active; if (!a) return null; const { sim } = a; const al = sim.ally, t = sim.target; return { ax: al.x, ay: al.y, tx: t?.x, ty: t?.y, thp: t ? t.c.hp / t.mhp : 1, tele: sim.foes.some((f) => f.tele), done: sim.done }; });
    if (!s || s.done) break;
    if (s.tele && dodged < 6 && Math.random() < 0.6) { dodged++; if (cdp) await tap('[data-btn="b"]'); else await page.keyboard.press('KeyX'); }
    if (catchRun && s.thp < 0.55 && crystalTried < 3) { crystalTried++; if (crystalTried === 1) await page.screenshot({ path: `${OUT}${prof}_04_crystal.png` }); if (cdp) await tap('[data-rtb="crystal"]'); else await page.keyboard.press('KeyE'); await sleep(1600); continue; }
    if (s.tx != null) {
      const dx = s.tx - s.ax, dy = s.ty - s.ay, dist = Math.hypot(dx, dy);
      let d = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
      if (dist < 110) d = Math.abs(dx) > Math.abs(dy) ? (dy > 0 ? 'up' : 'down') : (dx > 0 ? 'left' : 'right');
      await hold(dist > 200 || dist < 110 ? d : null);
      if (dist <= 260) { shots++; if (cdp) await tap('[data-btn="a"]'); else await page.keyboard.press(shots % 5 === 0 ? 'Digit3' : 'KeyZ'); }
      if (shots === 3) await page.screenshot({ path: `${OUT}${prof}_03_fight.png` });
    }
    await sleep(140);
  }
  await hold(null);
  await sleep(900); await page.screenshot({ path: `${OUT}${prof}_05_result.png` });
  await sleep(2200); await page.screenshot({ path: `${OUT}${prof}_06_back.png` });
  const end = await page.evaluate(() => ({ last: window.kilumen.ui.lastBattle && { outcome: window.kilumen.ui.lastBattle.outcome, caught: window.kilumen.ui.lastBattle.caught?.species, xp: window.kilumen.ui.lastBattle.xp }, party: window.kilumen.scene.party.map((c) => `${c.species} L${c.level} ${c.hp}hp`), crystals: window.kilumen.scene.systems.bag.count('dominance_crystal'), active: !!window.kilumen.rtb?.active }));
  const vid = await page.video().path(); await ctx.close(); await b.close();
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', vid, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '23', `${OUT}rtb_${prof}.mp4`]);
  report[prof] = { ...end, shots, dodged, crystalTried, errs };
  console.log(prof, JSON.stringify(report[prof]));
}
fs.writeFileSync(`${OUT}clips_report.json`, JSON.stringify(report, null, 2));
