import { chromium } from 'playwright';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const OUT = '/workspace/kilumen/shots/rtb_trainer_v3/';
const PROF = { pc: { viewport: { width: 1280, height: 720 } }, phone: { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, portrait: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } };
const prof = process.argv[2] || 'phone';
const b = await chromium.launch(); const ctx = await b.newContext(PROF[prof]);
await ctx.addInitScript(() => { localStorage.setItem('kilumen_alpha_rtb_mode', 'rt'); localStorage.removeItem('kilumen_rtb_xy'); });
const page = await ctx.newPage(); const errs = []; page.on('pageerror', (e) => errs.push(String(e)));
await page.goto(`http://127.0.0.1:8198/index.html?reset=1&enc=0&rtbpack=1&rtbcatch=0`);
await page.waitForFunction(() => window.kilumen?.ui?.sdReady, null, { timeout: 30000 }); await sleep(3000);
const press = async () => { if (prof === 'pc') await page.keyboard.press(await page.evaluate(() => window.kilumen.scene.busy || window.kilumen.scene.dialog?.open) ? 'Enter' : 'KeyF'); else await page.evaluate(() => { const el = document.querySelector('[data-btn="a"]'); el?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); setTimeout(() => el?.dispatchEvent(new PointerEvent('pointerup', { bubbles: true })), 60); }); };
for (let k = 0; k < 4; k++) { await press(); await sleep(800); }
await page.evaluate(async () => { const { createCreature } = await import('/src/systems/creature.js?v=v0.2.64-alpha'); const sc = window.kilumen.scene;
  const p = [createCreature({ species: 'cindrip', level: 16 }), createCreature({ species: 'nibbin', level: 12 }), createCreature({ species: 'rillop', level: 10 })]; sc.party = p; if (sc.systems?.party) sc.systems.party.list = p;
  sc.startWarp({ map: 'route1', x: 20, y: 24, facing: 'up' }, 'dev'); });
await page.waitForFunction(() => window.kilumen.scene.map?.name === 'route1' && !window.kilumen.scene.fade, null, { timeout: 20000 }); await sleep(1500);
if (prof === 'portrait') { await page.screenshot({ path: `${OUT}portrait_overworld.png` }); console.log('portrait', await page.evaluate(() => ({ landscapeOnly: document.body.classList.contains('landscape-only'), rotate: getComputedStyle(document.getElementById('rotate')).display }))); await b.close(); process.exit(0); }
await page.evaluate(async () => { const m = await import('/src/rtb/index.js?v=v0.2.64-alpha'); window.kilumen.rtb = m.RTB_STATE; window._rtbP = m.openRtBattle(window.kilumen.ui, window.kilumen.scene, { species: 'tumbloam', level: 14 }, { q: new URLSearchParams('rtbpack=1&rtbcatch=0') }); });
await page.waitForFunction(() => !!window.kilumen.rtb?.active, null, { timeout: 10000 }); await sleep(2200);
await page.screenshot({ path: `${OUT}${prof}_wild_fight.png` });
// overlap check: HUD rects vs creature screen positions + arena
const ov = await page.evaluate(() => { const A = window.kilumen.rtb.active, s = window.kilumen.scene, z = s.zoom || 1, cam = s._cam || { x: 0, y: 0 }, cv = s.canvas || document.getElementById('world'), k = innerWidth / cv.width * z;
  const hud = [...document.querySelectorAll('.rtb-skbar,.rtb-face,.rtb-me')].map((e) => e.getBoundingClientRect()).filter((r) => r.width);
  const ar = A.sim.arena, arS = { l: (ar.x0 - cam.x) * k, t: (ar.y0 - cam.y) * k, r: (ar.x1 - cam.x) * k, b: (ar.y1 - cam.y) * k };
  const hit = hud.filter((r) => r.left < arS.r && r.right > arS.l && r.top < arS.b && r.bottom > arS.t).length;
  return { arenaCss: arS, hudInArena: hit }; });
console.log(prof, 'overlap', JSON.stringify(ov));
if (prof === 'phone' && !process.env.PERFONLY) {
  // X press feedback (finger held)
  await page.evaluate(() => document.querySelector('.rtb-face[data-face="x"]').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 0 })));
  await sleep(60); await page.screenshot({ path: `${OUT}phone_wild_xpress.png` });
  await page.evaluate(() => window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }))); await sleep(500);
  // choose skills: X/Y set, then the Y half of skill 4
  await page.evaluate(() => document.querySelector('[data-rtb="xyset"]').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))); await sleep(400);
  await page.screenshot({ path: `${OUT}phone_wild_assign.png` });
  await page.evaluate(() => { const c = document.querySelectorAll('.rtb-s')[3], r = c.getBoundingClientRect(); c.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: r.right - 4, clientY: r.top + 5 })); });
  await sleep(200); await page.evaluate(() => document.querySelector('[data-rtb="xyset"]').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))); await sleep(500);
  await page.screenshot({ path: `${OUT}phone_wild_assigned.png` });
  console.log('xy after assign', await page.evaluate(() => [localStorage.getItem('kilumen_rtb_xy'), [...document.querySelectorAll('.rtb-face .sn')].map((e) => e.textContent)]));
  // Y fires its skill
  const before = await page.evaluate(() => window.kilumen.rtb.active.sim.ally.c.energy.slice());
  await page.evaluate(() => { const y = document.querySelector('.rtb-face[data-face="y"]'); y.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); }); await sleep(900);
  await page.evaluate(() => window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true })));
  console.log('energy before/after Y', JSON.stringify(before), JSON.stringify(await page.evaluate(() => window.kilumen.rtb.active.sim.ally.c.energy.slice())));
}
// perf: 4x CPU throttle, 6 s of fight with skills firing
const cdp = await ctx.newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
await cdp.send('Performance.enable'); const m0 = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]));
const perf = await page.evaluate(async () => { const A = window.kilumen.rtb.active, v = A.view, of = v.frame.bind(v); const work = []; v.frame = (dt) => { const t = performance.now(); of(dt); work.push(performance.now() - t); };
  const iv = []; let last = performance.now(), go = true; const tick = (n) => { iv.push(n - last); last = n; if (go) requestAnimationFrame(tick); }; requestAnimationFrame(tick);
  const fire = setInterval(() => { A.inp.fire = Math.floor(Math.random() * 4); }, 400);
  await new Promise((r) => setTimeout(r, 6000)); go = false; clearInterval(fire); v.frame = of;
  const st = (a) => { const s = a.slice(1).sort((x, y) => x - y); const q = (p) => +s[Math.min(s.length - 1, Math.floor(p * s.length))].toFixed(2); return { n: s.length, avg: +(s.reduce((x, y) => x + y, 0) / s.length).toFixed(2), p50: q(0.5), p95: q(0.95), p99: q(0.99), max: +s.at(-1).toFixed(2), over16_7: s.filter((x) => x > 16.7).length, over17_5: s.filter((x) => x > 17.5).length }; };
  return { rafInterval: st(iv), viewFrameWork: st(work) }; });
const m1 = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]));
const fr = perf.rafInterval.n + 1; perf.mainThreadPerFrameMs = +(((m1.TaskDuration - m0.TaskDuration) * 1000) / fr).toFixed(2); perf.scriptPerFrameMs = +(((m1.ScriptDuration - m0.ScriptDuration) * 1000) / fr).toFixed(2); perf.layoutStylePerFrameMs = +((((m1.LayoutDuration - m0.LayoutDuration) + (m1.RecalcStyleDuration - m0.RecalcStyleDuration)) * 1000) / fr).toFixed(2);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
console.log(prof, 'perf4x', JSON.stringify(perf));
await page.screenshot({ path: `${OUT}${prof}_wild_after_perf.png` });
console.log(prof, 'errors', errs);
await b.close();
