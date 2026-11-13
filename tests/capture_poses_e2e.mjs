// Kilumen capture poses bone_v2 wiring check (Oct 23, 2026). For each profile x DPR x phase x outcome, records every
// animation frame of the capture: the pose frame shown, the trainer box, the hand point (bone_v2 hold_px * sprite scale)
// and the crystal FX anchor (held overlays: element centre = anchor [32,32]; beam/absorb/breakout: their hold anchor).
// Passes when the crystal sits on the hand (<= 1.5 css px) in raise/hold/strain while the trainer stands still, and the
// trainer's centre line and feet never move between pose frames.
// Usage: PORT=8097 [CHARS=cal,mira] [OUT=shots/capture_poses_v2_wired] node tests/capture_poses_e2e.mjs
import { chromium, webkit, devices } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.resolve(ROOT, process.env.OUT || 'shots/capture_poses_v2_wired'); fs.mkdirSync(path.join(OUT, 'frames'), { recursive: true });
const BASE = `http://127.0.0.1:${process.env.PORT || 8097}/index.html?save=0&clouds=0&life=0&uidemo=1&map=brookhollow&timescale=0`;
const ip = devices['iPhone 14 landscape'];
const PROFILES = {
  pc1280_1x: { type: chromium, ctx: { viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 }, p: 'pc', touch: false },
  pc1280_2x: { type: chromium, ctx: { viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 }, p: 'pc', touch: false },
  phone844_1x: { type: chromium, ctx: { viewport: { width: 844, height: 390 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true }, p: 'mobile', touch: true },
  phone844_2x: { type: chromium, ctx: { viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, p: 'mobile', touch: true },
  iphone844_2x: { type: webkit, ctx: { ...ip, viewport: { width: 844, height: 390 }, deviceScaleFactor: 2 }, p: 'mobile', touch: true },
};
const ONLYP = process.env.PROFILES ? process.env.PROFILES.split(',') : Object.keys(PROFILES);
const PHASES = (process.env.PHASES || 'day,night').split(',');
const CHARS = (process.env.CHARS || 'cal').split(',');
const OUTCOMES = (process.env.OUTCOMES || 'caught,breakout').split(',');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = []; let fails = 0;
const check = (tag, name, pass, info = '') => { results.push(`${pass ? 'PASS' : 'FAIL'} [${tag}] ${name}${info ? ` - ${info}` : ''}`); if (!pass) fails++; console.log(results.at(-1)); };
const summary = [];
// battle default (src/battle/ui_sd.js, Oct 23, 2026): Pack opens an item list; pick the first Crystal (older builds held one up straight away)
async function pickCrystal(page, tap) {
  for (let n = 0; n < 20; n++) {
    if (await page.$('.ax-catch')) return;
    const i = await page.evaluate(() => [...document.querySelectorAll('#b-cmds .b-cmd')].findIndex((e) => /Crystal/.test(e.textContent)));
    if (i >= 0) { await tap(`#b-cmds .b-cmd[data-i="${i}"]`); return; }
    await sleep(100);
  }
}

async function run(profKey, phase, ch, outcome, extra = '') {
  const P = PROFILES[profKey], tag = `${profKey} ${phase} ${ch} ${outcome}${extra}`;
  const browser = await P.type.launch(); const ctx = await browser.newContext(P.ctx); const page = await ctx.newPage();
  const errs = [], infos = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error' && !/status of 404/.test(m.text())) errs.push(m.text()); if (/capture poses/.test(m.text())) infos.push(m.text()); });
  try {
    await page.goto(`${BASE}&platform=${P.p}&phase=${phase}${ch === 'cal' ? '' : `&posechar=${ch}`}${extra}`);
    await page.waitForFunction(() => window.kilumen?.ui && window.kilumen.scene, null, { timeout: 30000 }); await sleep(900);
    const hp = await page.evaluate(async (ch) => (window.__hp = await (await fetch(`art/characters/pixel/capture_poses/bone_v2/${ch}/hold_points.json`)).json()), ch);
    await page.evaluate(() => { window.__rec = []; const loop = () => { const t = document.querySelector('.ax-trainer'), w = document.querySelector('.ax-catch');
      if (t && w && t.dataset.pose) { const r = t.getBoundingClientRect(), wr = w.getBoundingClientRect(), H = window.__hp, i = H.frames.indexOf(t.dataset.pose), k = r.height / H.frame_h;
        const cs = getComputedStyle(t), m = new DOMMatrixReadOnly(cs.transform === 'none' ? undefined : cs.transform), hs = getComputedStyle(t.parentElement), mh = new DOMMatrixReadOnly(hs.transform === 'none' ? undefined : hs.transform);
        const fx = [...w.querySelectorAll('.fxa')].map((e) => { const b = e.getBoundingClientRect(), tr = /translate\(([-\d.]+)px,\s*([-\d.]+)px\)/.exec(e.style.transform);
          return { anim: e.dataset.anim, f: e.dataset.f, held: e.parentElement.classList.contains('ax-hold'), c: [b.left + b.width / 2, b.top + b.height / 2], a: tr ? [wr.left + +tr[1], wr.top + +tr[2]] : null }; });
        window.__rec.push({ t: performance.now(), pose: t.dataset.pose, char: t.dataset.posechar, step: (window.kilumen.ui.fx.motion.capture || []).at(-1), still: Math.abs(m.e) < 0.5 && Math.abs(mh.e) < 0.5 && +cs.opacity > 0.99 && +hs.opacity > 0.99,
          hand: i >= 0 ? [r.left + (H.hold_px[i][0] + 0.5) * k, r.top + (H.hold_px[i][1] + 0.5) * k] : null, cx: r.left + r.width / 2, bottom: r.bottom, w: r.width, k, fx }); }
      if (!window.__stop) requestAnimationFrame(loop); }; requestAnimationFrame(loop); });
    await page.evaluate((ok) => window.kilumen.ui.open('battle', { forceChance: ok }), outcome === 'caught');
    const tap = async (sel) => { const el = page.locator(sel).first(); await el.waitFor({ state: 'visible', timeout: 15000 }); if (P.touch) await el.tap(); else await el.click(); };
    for (let n = 0; n < 120; n++) { const s = await page.evaluate(() => { const c = document.querySelector('#b-cmds'), m = document.querySelector('#b-msg'); return { cmds: !!(c && !c.hidden && c.querySelector('.b-cmd')), more: !!m?.querySelector('.more') }; });
      if (s.cmds) break; if (s.more) await tap('#b-msg'); await sleep(150); }
    await tap('#b-cmds .b-cmd[data-i="1"]');
    await pickCrystal(page, tap);
    await page.waitForSelector('.ax-catch', { state: 'attached', timeout: 15000 });
    const shots = { raise: 450, hold: 2700, end: outcome === 'caught' ? 5200 : 4600 };
    const t0 = Date.now();
    for (const [nm, at] of Object.entries(shots)) { await sleep(Math.max(0, at - (Date.now() - t0))); await page.screenshot({ path: path.join(OUT, 'frames', `${profKey}_${phase}_${ch}_${outcome}_${nm}.png`) });
      const box = await page.evaluate(() => { const t = document.querySelector('.ax-trainer'); if (!t) return null; const r = t.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height, pose: t.dataset.pose }; });
      fs.writeFileSync(path.join(OUT, 'frames', `${profKey}_${phase}_${ch}_${outcome}_${nm}.json`), JSON.stringify({ box, dpr: P.ctx.deviceScaleFactor, hp })); }
    await page.waitForFunction(() => /with you now|broke free/.test(document.querySelector('#b-msg')?.textContent || ''), null, { timeout: 15000 }).catch(() => {});
    await sleep(600);
    const rec = await page.evaluate(() => { window.__stop = true; return window.__rec; });
    const motion = await page.evaluate(() => ({ pose: window.kilumen.ui.fx.motion.pose, art: window.kilumen.ui.fx.motion.captureArt }));
    // analyse
    const poses = [...new Set(rec.map((r) => r.pose))];
    const still = rec.filter((r) => r.still && r.hand);
    const err = {}; const bump = (pose, kind, e) => { const key = `${pose}/${kind}`; err[key] = Math.max(err[key] || 0, e); };
    for (const r of still) for (const f of r.fx) {
      if (f.held) bump(r.pose, f.anim, Math.hypot(f.c[0] - r.hand[0], f.c[1] - r.hand[1]));
      else if (f.a) bump(r.pose, f.anim, Math.hypot(f.a[0] - r.hand[0], f.a[1] - r.hand[1]));
    }
    const cxs = still.map((r) => r.cx), bots = still.map((r) => r.bottom);
    const spread = (a) => (a.length ? Math.max(...a) - Math.min(...a) : 0);
    const expPoses = hp.frames.length === 4 ? (outcome === 'caught' ? ['raise', 'hold', 'lowered'] : ['raise', 'hold', 'hold_strain', 'lowered']) : ['raise', 'hold'];
    check(tag, 'bone_v2 pose strip used for this character', rec.length > 0 && rec.every((r) => r.char === ch), `${rec.length} frames, char ${[...new Set(rec.map((r) => r.char))]}`);
    check(tag, 'pose frames seen', expPoses.every((p) => poses.includes(p)), `seen ${poses.join(',')}; expected ${expPoses.join(',')}`);
    const worst = Math.max(0, ...Object.values(err));
    check(tag, 'crystal anchor on the hand (<= 1.5 css px) while the trainer stands still', worst <= 1.5 && Object.keys(err).length > 0, JSON.stringify(Object.fromEntries(Object.entries(err).map(([k, v]) => [k, +v.toFixed(2)]))));
    check(tag, 'feet / centre line fixed across pose frames (<= 0.5 px)', spread(cxs) <= 0.5 && spread(bots) <= 0.5, `cx spread ${spread(cxs).toFixed(2)}, bottom spread ${spread(bots).toFixed(2)}`);
    check(tag, 'no console errors', !errs.length, [...new Set(errs)].join(' | ').slice(0, 300));
    summary.push({ tag, profKey, phase, ch, outcome, poses, err, cxSpread: spread(cxs), bottomSpread: spread(bots), k: still[0]?.k, trainerW: still[0]?.w, motion, infos });
  } catch (e) { check(tag, 'ran', false, String(e).slice(0, 300)); }
  await ctx.close(); await browser.close();
}

for (const pk of ONLYP) for (const ph of PHASES) for (const ch of CHARS) for (const oc of OUTCOMES) await run(pk, ph, ch, oc);
if (process.env.ROLLBACK !== '0') { // rollbacks: ?poses=0 -> old placeholder pose + default point; ?fxart=0 -> no art at all
  for (const q of ['&poses=0', '&fxart=0']) {
    const P = PROFILES.pc1280_1x, browser = await P.type.launch(), page = await (await browser.newContext(P.ctx)).newPage();
    await page.goto(`${BASE}&platform=pc&phase=day${q}`); await page.waitForFunction(() => window.kilumen?.ui && window.kilumen.scene, null, { timeout: 30000 }); await sleep(900);
    await page.evaluate(() => window.kilumen.ui.open('battle', { forceChance: true }));
    for (let n = 0; n < 120; n++) { const s = await page.evaluate(() => { const c = document.querySelector('#b-cmds'), m = document.querySelector('#b-msg'); return { cmds: !!(c && !c.hidden && c.querySelector('.b-cmd')), more: !!m?.querySelector('.more') }; }); if (s.cmds) break; if (s.more) await page.click('#b-msg'); await sleep(150); }
    await page.click('#b-cmds .b-cmd[data-i="1"]'); await pickCrystal(page, (sel) => page.click(sel)); await page.waitForSelector('.ax-catch', { state: 'attached', timeout: 15000 }); await sleep(1500);
    const st = await page.evaluate(() => { const t = document.querySelector('.ax-trainer'); return { pose: t?.dataset.pose || '', bg: t?.style.backgroundImage || '', art: window.kilumen.ui.fx.motion.captureArt }; });
    await page.screenshot({ path: path.join(OUT, 'frames', `rollback${q.replace(/[&=]/g, '_')}.png`) });
    check(`pc1280_1x rollback ${q}`, q === '&poses=0' ? 'art capture runs with the old trainer sheet, no pose' : 'placeholder capture (no art), no pose',
      !st.pose && /cal_chibi_sheet/.test(st.bg) && (q === '&poses=0' ? !!st.art : !st.art), JSON.stringify(st));
    await browser.close();
  }
}
fs.writeFileSync(path.join(OUT, `result${process.env.TAG ? `_${process.env.TAG}` : ''}.json`), JSON.stringify({ when: new Date().toString(), fails, results, summary }, null, 1));
console.log(`\n${results.filter((r) => r.startsWith('PASS')).length} pass, ${fails} fail`);
process.exit(fails ? 1 : 0);
