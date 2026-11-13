// Battles default v1 clips (Oct 23, 2026): the engine battle is the dev default (no ?battle flag in these URLs).
//  wild:  route1, walk east into tall grass -> the encounters.json roll opens a wild battle -> fight to the end
//  ron:   fernwick, face Ron (ron_rival_1), talk -> rival battle 1 -> his line + the Trail Runners hand-over
// Each on PC 1920x1080 (Chromium) and phone landscape 2340x1080 (780x360 CSS @3x, touch). Output:
// shots/battles_default_v1/<clip>_<profile>.mp4 + contact_sheet.png (key frames). Temp frames / raw webm are deleted.
// ?encrate=1 (dev override, see src/ui/ui.js wireWild) makes the first roll after the 3 free grass steps hit, so the clip
// stays short; the real per-step rate is the table's 0.0833 (capped at 0.2).
// RONLV=16 (default 30) + CLIPTAG=_loss records Ron's loss path (battle continues, no blackout).
// Usage: PORT=<http.server port> node tests/battles_default_clips.mjs [wild|ron] [pc|phone]
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const PORT = process.env.PORT || 8080;
const OUT = path.resolve('shots/battles_default_v1'), TMP = path.join(OUT, '_tmp');
fs.mkdirSync(TMP, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PROFILES = {
  pc: { viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, hasTouch: false, isMobile: false, q: '&platform=pc', video: { width: 1920, height: 1080 } },
  phone: { viewport: { width: 780, height: 360 }, deviceScaleFactor: 3, hasTouch: true, isMobile: true, q: '&platform=mobile', video: { width: 1560, height: 720 } },
};
const want = process.argv.slice(2);
const clips = ['wild', 'ron'].filter((c) => !want.some((w) => ['wild', 'ron'].includes(w)) || want.includes(c));
const profs = ['pc', 'phone'].filter((p) => !want.some((w) => ['pc', 'phone'].includes(w)) || want.includes(p));
const report = [];
const browser = await chromium.launch();

async function session(clip, prof, url, body) {
  const P = PROFILES[prof];
  const ctx = await browser.newContext({ viewport: P.viewport, deviceScaleFactor: P.deviceScaleFactor, hasTouch: P.hasTouch, isMobile: P.isMobile,
    recordVideo: { dir: TMP, size: P.video } });
  const page = await ctx.newPage();
  const errs = []; page.on('console', (m) => m.type() === 'error' && errs.push(m.text())); page.on('pageerror', (e) => errs.push(String(e)));
  const t0 = Date.now();
  await page.goto(`http://127.0.0.1:${PORT}/index.html?save=0&hour=12&clouds=0&audio=0&bseed=1,2,3,4${P.q}${url}`);
  await page.waitForFunction(() => window.kilumen?.ui?.sdReady && window.kilumen.scene.systems && window.kilumen.ui.wild?.ready, null, { timeout: 30000 });
  await page.evaluate(() => Promise.all([window.kilumen.ui.sdReady, window.kilumen.ui.wild.ready]));
  await page.waitForFunction(() => !window.kilumen.scene.busy && !window.kilumen.scene.fade, null, { timeout: 15000 }).catch(() => {});
  const state = () => page.evaluate(() => {
    const msg = document.querySelector('#b-msg'), cmds = document.querySelector('#b-cmds'), sc = window.kilumen.scene;
    return { open: !!document.querySelector('.ui-battle'), more: !!msg?.querySelector('.more'), msg: msg?.textContent || '',
      cmds: cmds && !cmds.hidden ? [...cmds.querySelectorAll('.b-cmd')].map((e) => e.textContent) : null, dlg: !!sc.dialog?.active, busy: !!sc.busy };
  });
  // A button: Enter on PC; on the phone profile the on-screen A pad button (touch tap)
  const pressA = async () => { if (prof === 'phone') await page.locator('[data-btn="a"]').first().tap({ timeout: 5000 }).catch(() => {}); else await page.keyboard.press('Enter'); };
  const frames = [];
  const kf = async (label) => { const f = path.join(TMP, `${clip}_${prof}_${frames.length}.png`); await page.screenshot({ path: f }); frames.push({ f, label }); };
  const tap = async (sel) => { const el = page.locator(sel).first(); await el.waitFor({ state: 'visible', timeout: 15000 }); await el.click({ timeout: 15000 }); };
  const waitCmds = async (ms = 20000) => { const t = Date.now(); while (Date.now() - t < ms) { const s = await state(); if (!s.open || s.cmds) return s; if (s.more) { try { await page.locator('#b-msg').first().click({ timeout: 2000 }); } catch {} } await sleep(120); } return state(); };
  const fight = async (shots, max = 40) => {
    for (let n = 0; n < max; n++) {
      let s = await waitCmds(); if (!s.open) return;
      if (n === 1 && shots) await kf('battle: picking a skill');
      if (s.cmds?.length === 4 && /Skills/.test(s.cmds[0])) { await tap('#b-cmds .b-cmd[data-i="0"]'); await sleep(250); s = await state(); }
      if (s.cmds) await tap('#b-cmds .b-cmd:not([style*="opacity"])');
      if (await page.locator('.ui-modal [data-m="0"]').count()) await tap('.ui-modal [data-m="0"]');
      if (n === 2 && shots) { await sleep(500); await kf('battle: hit'); }
    }
  };
  const drain = async (until = () => false, ms = 40000) => {
    const t = Date.now();
    while (Date.now() - t < ms) {
      const s = await state(); if (until(s)) return;
      if (s.dlg) { await sleep(450); await pressA(); await sleep(150); continue; }
      if (!s.busy && !s.open) { await sleep(300); const s2 = await state(); if (!s2.busy && !s2.dlg && !s2.open) return; continue; }
      await sleep(120);
    }
  };
  const setup = (party) => page.evaluate(async (party) => {
    const { createCreature } = await import('/src/systems/creature.js');
    const sc = window.kilumen.scene; sc.party = party.map((p) => createCreature(p)); sc._placeFollower?.(); sc._loadActorSprites?.(); sc._dirty = true;
  }, party);
  let info = {};
  try { info = await body({ page, state, kf, tap, fight, drain, setup, pressA }) || {}; }
  catch (e) { errs.push('script: ' + e.message); }
  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  const vid = page.video(); await ctx.close(); const raw = await vid.path();
  const mp4 = path.join(OUT, `${clip}${clip === 'ron' ? process.env.CLIPTAG || '' : ''}_${prof}.mp4`);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', raw, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '30', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', mp4]);
  fs.rmSync(raw);
  const r = { clip, prof, mp4, kb: Math.round(fs.statSync(mp4).size / 1024), secs, errs: errs.slice(0, 4), frames, ...info };
  report.push(r); console.log(JSON.stringify({ ...r, frames: frames.map((x) => x.label) }));
}

for (const prof of profs) {
  if (clips.includes('wild')) await session('wild', prof, '&map=route1&x=14&y=23&encrate=1', async ({ page, state, kf, fight, drain, setup }) => {
    await setup([{ species: 'cindrip', level: 12 }]);
    await sleep(800); await kf('route1: next to the tall grass');
    let bb = null; // phone: hold the on-screen D-pad right arrow; PC: hold the arrow key
    if (prof === 'phone') { bb = await page.locator('[data-dir="right"]').first().boundingBox(); await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2); await page.mouse.down(); }
    else await page.keyboard.down('ArrowRight');
    const t = Date.now(); let s;
    while (Date.now() - t < 15000) { s = await state(); if (s.open || s.busy) break; await sleep(60); }
    if (bb) await page.mouse.up(); else await page.keyboard.up('ArrowRight');
    const wild = await page.evaluate(() => window.kilumen.scene.log.filter((e) => e.type === 'wild').at(-1));
    await sleep(1500); await kf(`wild ${wild?.species} L${wild?.level} appears`);
    await fight(true);
    await sleep(400); await kf('after the battle: back on route1');
    await drain();
    const end = await page.evaluate(() => ({ last: window.kilumen.ui.lastBattle && { outcome: window.kilumen.ui.lastBattle.outcome, turns: window.kilumen.ui.lastBattle.turns }, map: window.kilumen.scene.map.name, pos: [window.kilumen.scene.player.x, window.kilumen.scene.player.y] }));
    return { wild, end };
  });
  if (clips.includes('ron')) await session('ron', prof, '&map=fernwick&x=12&y=13', async ({ page, state, kf, fight, drain, setup, pressA }) => {
    const lv = Number(process.env.RONLV || 30); // placeholder rival team = lead level - 1; RONLV=16 records the loss path
    await setup([{ species: 'cindrip', level: lv }, { species: 'rillop', level: lv - 2 }, { species: 'tumbloam', level: lv - 2 }]);
    if (prof === 'phone') await page.locator('[data-dir="up"]').first().tap(); else await page.keyboard.press('ArrowUp'); // turn to face Ron
    await sleep(400);
    await kf('fernwick: facing Ron');
    for (let k = 0; k < 6; k++) { // retry the talk press until Ron's dialog is up (first press can land while the scene is still settling)
      await pressA();
      if (await page.waitForFunction(() => window.kilumen.scene.dialog?.active || window.kilumen.scene.busy, null, { timeout: 1500 }).then(() => true, () => false)) break;
    }
    await sleep(900); await kf("Ron's challenge");
    await drain((s) => s.open);
    await sleep(1500); await kf('rival battle 1 starts');
    await fight(true);
    await sleep(600); await kf("Ron's line after the battle");
    let gotShot = false;
    const t = Date.now();
    while (Date.now() - t < 40000) {
      const s = await state(); const txt = await page.evaluate(() => window.kilumen.scene.dialog?.active ? window.kilumen.scene.dialog.text.textContent : '');
      if (!gotShot && /Trail Runners/.test(txt)) { await sleep(900); await kf('Trail Runners received'); gotShot = true; }
      if (s.dlg) { await sleep(450); await pressA(); await sleep(150); continue; }
      if (!s.busy && !s.open) break; await sleep(120);
    }
    await page.keyboard.down('Escape'); await page.keyboard.up('Escape');
    const end = await page.evaluate(() => ({ last: window.kilumen.ui.lastBattle && { outcome: window.kilumen.ui.lastBattle.outcome, turns: window.kilumen.ui.lastBattle.turns },
      flags: [...window.kilumen.scene.flags].filter((f) => /ron|run_shoes/.test(f)), map: window.kilumen.scene.map.name, log: window.kilumen.scene.log.filter((e) => ['battle', 'flag'].includes(e.type)).map((e) => e.type + ':' + (e.flag || e.won)) }));
    return { end };
  });
}
await browser.close();
fs.writeFileSync(path.join(TMP, 'frames.json'), JSON.stringify(report.map((r) => ({ clip: r.clip, prof: r.prof, frames: r.frames })), null, 1));
console.log('frames list:', path.join(TMP, 'frames.json'));
