// SUPERSEDED (Oct 22, 2026): the effects are live and the flags are on, so this script's 'flag off' check no longer holds.
// Use tests/fx_live_shots.mjs for the live effects; keep this one only for ?fxpreview=staging work on future redraws.
// FX prep (Oct 22, 2026): stills + one clip of the staged transparent hit effects WITHOUT swapping files (?fxpreview=staging).
// For each profile (PC 1920x1080 Chromium, iPhone 14 landscape WebKit) x battle (default shell, ?battle=sd) x element
// (?fxel=water|grass|light; fire/magma/devil skipped until Animator confirms) it plays one exchange and captures:
// a travel still (ranged elements), the impact on the foe, and the mirrored impact on the player's creature.
// Checks per impact: natural aspect (img w/h == JSON frame_w/frame_h), scale k == sprite scale, anchor on the sprite's
// opaque centre (mirrored for the player side), shake ('hit' class) and damage number start within 1 frame of the effect,
// effect removed after the JSON total_ms (+/- timer slack), no console errors, nothing shown with the flag off (no preview).
// Usage: PORT=<http.server port> [PROFILES=desktop,iphone14] [CLIP=1] node tests/fx_preview_shots.mjs -> shots/battle_engine/fx_preview/
import { chromium, webkit, devices } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.resolve(ROOT, 'shots/battle_engine/fx_preview'); fs.mkdirSync(OUT, { recursive: true });
const BASE = `http://127.0.0.1:${process.env.PORT}/index.html?save=0&uidemo=1&ui=battle&hour=12&clouds=0&life=0&bseed=1,2,3,4`;
const STAGE = path.join(ROOT, 'art/characters/pixel/effects/_transparent_staging');
const PROFILES = {
  desktop: { type: chromium, ctx: { viewport: { width: 1920, height: 1080 } }, touch: false },
  iphone14: { type: webkit, ctx: { ...devices['iPhone 14 landscape'] }, touch: true },
};
const NOSHOT = process.env.NOSHOT === '1'; // timing-only run: WebKit screenshots stall the page's main thread
const ELS = (process.env.ELS || 'water,grass,light').split(',');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const report = [];
const check = (tag, name, ok, info = '') => { report.push({ tag, name, ok, info }); if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'} [${tag}] ${name}${info ? ` - ${info}` : ''}`); };
const meta = (el, anim) => JSON.parse(fs.readFileSync(path.join(STAGE, el, anim, `${el}_${anim}_battle_2x.json`), 'utf8'));

// page-side event log: effect add/remove, 'hit' class on a creature, damage number
const INIT = () => {
  window.__fx = []; const t = () => performance.now();
  const go = () => new MutationObserver((ms) => { for (const m of ms) {
    if (m.type === 'attributes' && m.target.classList?.contains('b-mon') && m.target.classList.contains('hit') && !m.oldValue?.includes('hit')) window.__fx.push({ ev: 'shake', id: m.target.id, t: t() });
    for (const n of m.addedNodes || []) if (n.nodeType === 1) {
      if (n.classList.contains('b-fx')) {
        const box = n.parentElement, fx = n.dataset.fx, cs = n.style; const tgts = [...box.querySelectorAll('.b-mon')];
        window.__fx.push({ ev: 'fx+', fx, t: t(), w: parseFloat(cs.width), h: parseFloat(cs.height), l: parseFloat(cs.left), tp: parseFloat(cs.top), flip: cs.transform.includes('-1'),
          mons: tgts.map((e) => ({ id: e.id, ow: e.offsetWidth, nw: e.naturalWidth })) });
      }
      if (n.classList.contains('b-dmg')) window.__fx.push({ ev: 'dmg', t: t() });
    }
    for (const n of m.removedNodes || []) if (n.nodeType === 1 && n.classList.contains('b-fx')) window.__fx.push({ ev: 'fx-', fx: n.dataset.fx, t: t() });
  } }).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'], attributeOldValue: true });
  if (document.body) go(); else addEventListener('DOMContentLoaded', go);
};

async function run(prof, P, mode, el, { clip = false } = {}) {
  const tag = `${prof}/${mode}/${el}`;
  const browser = await P.type.launch();
  const ctx = await browser.newContext({ ...P.ctx, ...(clip ? { recordVideo: { dir: OUT, size: P.ctx.viewport } } : {}) });
  const page = await ctx.newPage(); const errs = [];
  page.on('console', (m) => m.type() === 'error' && errs.push(m.text())); page.on('pageerror', (e) => errs.push(String(e)));
  await page.addInitScript(INIT);
  await page.goto(`${BASE}${mode === 'sd' ? '&battle=sd' : ''}&fxpreview=staging&fxel=${el}`);
  await page.waitForSelector('.ui-battle', { timeout: 20000 });
  const tap = async (sel) => { const e = page.locator(sel).first(); if (P.touch) await e.tap({ timeout: 8000 }); else await e.click({ timeout: 8000 }); };
  // advance messages until the command menu shows, then Skills -> first damaging skill
  const t0 = Date.now(); let picked = false;
  while (Date.now() - t0 < 25000 && !picked) {
    const s = await page.evaluate(() => { const c = document.querySelector('#b-cmds'); return { more: !!document.querySelector('#b-msg .more'), cmds: c && !c.hidden ? [...c.querySelectorAll('.b-cmd')].map((e) => e.textContent) : null, skills: !!c?.classList.contains('skills') }; });
    if (s.cmds && !s.skills) await tap('#b-cmds .b-cmd[data-i="0"]');
    else if (s.cmds && s.skills) { await tap('#b-cmds .b-cmd[data-i="0"]'); picked = true; }
    else if (s.more) await tap('#b-msg');
    await sleep(150);
  }
  check(tag, 'picked a skill', picked);
  const shots = {}; const wantTravel = el !== 'grass';
  const grab = async (name, sel, delay) => {
    try { await page.waitForSelector(sel, { timeout: 12000, state: 'attached' }); await sleep(delay); const f = path.join(OUT, `${prof}_${mode}_${el}_${name}.png`); if (!NOSHOT) await page.screenshot({ path: f }); shots[name] = path.relative(ROOT, f); return true; }
    catch { return false; }
  };
  if (wantTravel) check(tag, 'travel effect shown (ranged skill)', await grab('1_travel', '.b-fx[data-fx$="/travel_p2f"]', 220));
  check(tag, 'impact on foe shown', await grab('2_impact_on_foe', '.b-fx[data-fx$="/impact"]', 160));
  await page.waitForFunction(() => !document.querySelector('.b-fx'), null, { timeout: 5000 }).catch(() => {});
  // foe's turn: advance messages until its impact (mirrored) lands on the player's creature
  const t1 = Date.now(); let got = false;
  while (Date.now() - t1 < 20000 && !got) {
    got = await page.evaluate(() => window.__fx.filter((e) => e.ev === 'fx+' && e.fx.endsWith('/impact')).length >= 2);
    if (!got && await page.evaluate(() => !!document.querySelector('#b-msg .more'))) await tap('#b-msg').catch(() => {});
    if (!got) await sleep(40);
  }
  if (got) { await sleep(160); const f = path.join(OUT, `${prof}_${mode}_${el}_3_impact_on_player_mirrored.png`); if (!NOSHOT) await page.screenshot({ path: f }); shots['3_impact_on_player_mirrored'] = path.relative(ROOT, f); }
  check(tag, 'mirrored impact on the player creature shown', got);
  await sleep(1200);
  const log = await page.evaluate(() => window.__fx);
  // ---- checks on the logged impacts
  const M = meta(el, 'impact'); const imps = log.filter((e) => e.ev === 'fx+' && e.fx.endsWith('/impact'));
  for (const [i, e] of imps.slice(0, 2).entries()) {
    const who = e.flip ? 'player' : 'foe';
    const ar = (e.w / e.h) / (M.frame_w / M.frame_h);
    check(tag, `impact ${i + 1} (${who}) natural aspect`, Math.abs(ar - 1) < 0.01, `${e.w.toFixed(1)}x${e.h.toFixed(1)} vs ${M.frame_w}x${M.frame_h}`);
    const mon = e.mons.find((m) => (who === 'player' ? /ally|p1/ : /foe|p2/).test(m.id)); const k = mon.ow / mon.nw;
    check(tag, `impact ${i + 1} (${who}) scaled by the sprite pixel scale k=${k.toFixed(3)}`, Math.abs(e.w / M.frame_w - k) < 0.01);
    check(tag, `impact ${i + 1} mirrored only on the player side`, (who === 'player') === (i === 1));
    const shake = log.find((x) => x.ev === 'shake' && x.t >= e.t - 1), dmg = log.find((x) => x.ev === 'dmg' && x.t >= e.t - 1);
    check(tag, `impact ${i + 1}: shake starts with the effect`, shake && shake.t - e.t < 34, shake ? `${(shake.t - e.t).toFixed(1)} ms` : 'no shake');
    check(tag, `impact ${i + 1}: damage number starts with the effect`, dmg && dmg.t - e.t < 34, dmg ? `${(dmg.t - e.t).toFixed(1)} ms` : 'no dmg');
    const gone = log.find((x) => x.ev === 'fx-' && x.fx === e.fx && x.t > e.t);
    check(tag, `impact ${i + 1}: removed after total_ms=${M.total_ms}`, gone && Math.abs(gone.t - e.t - M.total_ms) < 60, gone ? `${(gone.t - e.t).toFixed(0)} ms` : 'not removed');
  }
  const tr = log.find((e) => e.ev === 'fx+' && e.fx.endsWith('/travel_p2f'));
  if (tr) { const TM = meta(el, 'travel_p2f'); const gone = log.find((x) => x.ev === 'fx-' && x.fx === tr.fx); const imp = imps[0];
    check(tag, 'travel natural aspect', Math.abs((tr.w / tr.h) / (TM.frame_w / TM.frame_h) - 1) < 0.01);
    check(tag, `travel removed after total_ms=${TM.total_ms}, impact follows`, gone && Math.abs(gone.t - tr.t - TM.total_ms) < 60 && imp && imp.t >= gone.t - 1, gone ? `${(gone.t - tr.t).toFixed(0)} ms, impact +${(imp.t - gone.t).toFixed(0)} ms` : ''); }
  check(tag, 'no console errors', errs.length === 0, errs.slice(0, 3).join(' | '));
  const vid = page.video(); await ctx.close(); await browser.close();
  if (clip && vid) { const src = await vid.path(); const dst = path.join(OUT, `${prof}_${mode}_${el}_clip.webm`); fs.renameSync(src, dst); shots.clip = path.relative(ROOT, dst); }
  return { tag, shots };
}

// flag OFF + no preview: the battle must not show any effect (committed default)
async function offCheck(prof, P, mode) {
  const browser = await P.type.launch(); const ctx = await browser.newContext(P.ctx); const page = await ctx.newPage();
  await page.addInitScript(INIT); await page.goto(`${BASE}${mode === 'sd' ? '&battle=sd' : ''}`); await page.waitForSelector('.ui-battle', { timeout: 20000 });
  const tap = async (sel) => { const e = page.locator(sel).first(); if (P.touch) await e.tap({ timeout: 8000 }); else await e.click({ timeout: 8000 }); };
  const t0 = Date.now(); let n = 0;
  while (Date.now() - t0 < 15000 && n < 2) {
    const s = await page.evaluate(() => { const c = document.querySelector('#b-cmds'); return { more: !!document.querySelector('#b-msg .more'), cmds: c && !c.hidden, skills: !!c?.classList.contains('skills') }; });
    if (s.cmds) { await tap('#b-cmds .b-cmd[data-i="0"]'); n++; } else if (s.more) await tap('#b-msg'); await sleep(150);
  }
  await sleep(4000); const log = await page.evaluate(() => window.__fx);
  check(`${prof}/${mode}/default`, 'flag off (no ?fxpreview): no effect drawn, shake + damage still play', !log.some((e) => e.ev === 'fx+') && log.some((e) => e.ev === 'shake') && log.some((e) => e.ev === 'dmg'));
  await browser.close();
}

const out = [];
for (const prof of (process.env.PROFILES || 'desktop,iphone14').split(',')) {
  const P = PROFILES[prof];
  for (const mode of ['default', 'sd']) {
    await offCheck(prof, P, mode);
    for (const el of ELS) out.push(await run(prof, P, mode, el));
  }
}
if (process.env.CLIP !== '0') out.push(await run('desktop', PROFILES.desktop, 'default', 'water', { clip: true }));
fs.writeFileSync(path.join(OUT, 'fx_preview_report.json'), JSON.stringify({ at: new Date().toString(), fails, report, shots: out }, null, 1));
console.log(`\n${report.length - fails}/${report.length} checks passed`);
process.exit(fails ? 1 : 0);
