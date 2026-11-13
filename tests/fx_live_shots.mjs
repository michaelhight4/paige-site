// Live hit effects (Oct 22, 2026, after the swap; HIT_EFFECTS_ENABLED + HIT_TRAVEL_FX_ENABLED = true): stills + battle clips.
// For each profile (PC 1920x1080 Chromium, iPhone 14 landscape WebKit, Pixel 7 landscape Chromium) x battle (default
// shell, ?battle=sd) x element (?fxel=..., default water,fire,magma,devil,god,grass,light) it plays one exchange and captures:
// a travel still (ranged elements), the impact on the foe, and the mirrored impact on the player's creature.
// Checks per impact: natural aspect (img w/h == JSON frame_w/frame_h), scale k == sprite scale, anchor on the sprite's
// opaque centre (mirrored for the player side), shake ('hit' class) and damage number start within 1 frame of the effect,
// effect removed after the JSON total_ms (+/- timer slack; NOT checked on WebKit while screenshotting, because Playwright's
// WebKit screenshots stall the page's main thread - run NOSHOT=1 for the timing pass), effect smaller than the scene (no
// scene flash), files read from the LIVE paths (never _transparent_staging), no console errors. Plain battles (no ?fxel)
// must show effects too. Clips: a few turns of a normal battle per CLIPS=<prof>:<mode>,... (default desktop + iphone14).
// Usage: PORT=<http.server port> [PROFILES=desktop,iphone14,pixel7] [ELS=...] [NOSHOT=1] [CLIPS=...|0] node tests/fx_live_shots.mjs
//   -> shots/battle_engine/fx_live/
import { chromium, webkit, devices } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.resolve(ROOT, 'shots/battle_engine/fx_live'); fs.mkdirSync(OUT, { recursive: true });
const BASE = `http://127.0.0.1:${process.env.PORT}/index.html?save=0&uidemo=1&ui=battle&hour=12&clouds=0&life=0&bseed=1,2,3,4`;
const LIVE = path.join(ROOT, 'art/characters/pixel/effects');
const PROFILES = {
  desktop: { type: chromium, ctx: { viewport: { width: 1920, height: 1080 } }, touch: false },
  iphone14: { type: webkit, ctx: { ...devices['iPhone 14 landscape'] }, touch: true },
  pixel7: { type: chromium, ctx: { ...devices['Pixel 7 landscape'] }, touch: true },
};
const NOSHOT = process.env.NOSHOT === '1'; // timing-only run: WebKit screenshots stall the page's main thread
const ELS = (process.env.ELS || 'water,fire,magma,devil,god,grass,light').split(',');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const report = [];
const check = (tag, name, ok, info = '') => { report.push({ tag, name, ok, info }); if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'} [${tag}] ${name}${info ? ` - ${info}` : ''}`); };
const meta = (el, anim) => JSON.parse(fs.readFileSync(path.join(LIVE, el, anim, `${el}_${anim}_battle_2x.json`), 'utf8'));

// page-side event log: effect add/remove, 'hit' class on a creature, damage number
const INIT = () => {
  window.__fx = []; const t = () => performance.now();
  const go = () => new MutationObserver((ms) => { for (const m of ms) {
    if (m.type === 'attributes' && m.target.classList?.contains('b-mon') && m.target.classList.contains('hit') && !m.oldValue?.includes('hit')) window.__fx.push({ ev: 'shake', id: m.target.id, t: t() });
    for (const n of m.addedNodes || []) if (n.nodeType === 1) {
      if (n.classList.contains('b-fx')) {
        const box = n.parentElement, fx = n.dataset.fx, cs = n.style; const tgts = [...box.querySelectorAll('.b-mon')];
        window.__fx.push({ ev: 'fx+', fx, t: t(), w: parseFloat(cs.width), h: parseFloat(cs.height), l: parseFloat(cs.left), tp: parseFloat(cs.top), flip: cs.transform.includes('-1'),
          mons: tgts.map((e) => ({ id: e.id, ow: e.offsetWidth, nw: e.naturalWidth })), boxW: box.offsetWidth, boxH: box.offsetHeight,
          flash: !!document.querySelector('.b-flash') });
      }
      if (n.classList.contains('b-dmg')) window.__fx.push({ ev: 'dmg', t: t() });
    }
    for (const n of m.removedNodes || []) if (n.nodeType === 1 && n.classList.contains('b-fx')) window.__fx.push({ ev: 'fx-', fx: n.dataset.fx, t: t() });
  } }).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'], attributeOldValue: true });
  if (document.body) go(); else addEventListener('DOMContentLoaded', go);
};

async function run(prof, P, mode, el, { clip = false } = {}) {
  const tag = `${prof}/${mode}/${el}`; const strictT = NOSHOT || P.type !== webkit;
  const browser = await P.type.launch();
  const ctx = await browser.newContext({ ...P.ctx, ...(clip ? { recordVideo: { dir: OUT, size: P.ctx.viewport } } : {}) });
  const page = await ctx.newPage(); const errs = [];
  page.on('console', (m) => m.type() === 'error' && errs.push(m.text())); page.on('pageerror', (e) => errs.push(String(e)));
  await page.addInitScript(INIT);
  await page.goto(`${BASE}${mode === 'sd' ? '&battle=sd' : ''}&fxel=${el}`);
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
  const shots = {}; const RANGED = ['fire', 'water', 'light', 'angelic', 'dark', 'ghost', 'mystic', 'spirit', 'wind', 'bird', 'sea', 'magma'];
  // default shell: ranged by element (placeholder rule); sd: by the engine move's category, so travel is optional there
  const wantTravel = mode === 'default' && RANGED.includes(el);
  const grab = async (name, sel, delay) => {
    try { await page.waitForSelector(sel, { timeout: 12000, state: 'attached' }); await sleep(P.type === webkit ? 0 : delay); const f = path.join(OUT, `${prof}_${mode}_${el}_${name}.png`); if (!NOSHOT) await page.screenshot({ path: f }); shots[name] = path.relative(ROOT, f); return true; }
    catch { return false; }
  };
  if (wantTravel) check(tag, 'travel effect shown (ranged skill)', await grab('1_travel', '.b-fx[data-fx$="/travel_p2f"]', Math.min(220, meta(el, 'travel_p2f').total_ms / 2)));
  else if (mode === 'sd') { // only if the move is Special: wait for whichever effect comes first, so a physical move's impact isn't missed
    const first = await page.waitForSelector('.b-fx', { timeout: 12000, state: 'attached' }).then((h) => h.getAttribute('data-fx')).catch(() => '');
    if (first.endsWith('/travel_p2f')) await grab('1_travel', '.b-fx[data-fx$="/travel_p2f"]', Math.min(220, meta(el, 'travel_p2f').total_ms / 2));
  }
  check(tag, 'impact on foe shown', await grab('2_impact_on_foe', '.b-fx[data-fx$="/impact"]', 160));
  await page.waitForFunction(() => !document.querySelector('.b-fx'), null, { timeout: 5000 }).catch(() => {});
  // foe's turn: advance messages until its impact (mirrored) lands on the player's creature
  const t1 = Date.now(); let got = false;
  while (Date.now() - t1 < 20000 && !got) {
    got = await page.evaluate(() => window.__fx.filter((e) => e.ev === 'fx+' && e.fx.endsWith('/impact')).length >= 2);
    if (!got && await page.evaluate(() => !!document.querySelector('#b-msg .more'))) await tap('#b-msg').catch(() => {});
    if (!got) await sleep(40);
  }
  if (got) { await sleep(P.type === webkit ? 0 : 160); const f = path.join(OUT, `${prof}_${mode}_${el}_3_impact_on_player_mirrored.png`); if (!NOSHOT) await page.screenshot({ path: f }); shots['3_impact_on_player_mirrored'] = path.relative(ROOT, f); }
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
    check(tag, `impact ${i + 1}: no scene flash (effect ${e.w.toFixed(0)}x${e.h.toFixed(0)} < scene ${e.boxW}x${e.boxH}, no .b-flash)`, e.w < e.boxW * 0.5 && e.h < e.boxH * 0.8 && !e.flash);
    const shake = log.find((x) => x.ev === 'shake' && x.t >= e.t - 1), dmg = log.find((x) => x.ev === 'dmg' && x.t >= e.t - 1);
    if (strictT) check(tag, `impact ${i + 1}: shake starts with the effect`, shake && shake.t - e.t < 34, shake ? `${(shake.t - e.t).toFixed(1)} ms` : 'no shake');
    if (strictT) check(tag, `impact ${i + 1}: damage number starts with the effect`, dmg && dmg.t - e.t < 34, dmg ? `${(dmg.t - e.t).toFixed(1)} ms` : 'no dmg');
    const gone = log.find((x) => x.ev === 'fx-' && x.fx === e.fx && x.t > e.t);
    if (strictT) check(tag, `impact ${i + 1}: removed after total_ms=${M.total_ms}`, gone && Math.abs(gone.t - e.t - M.total_ms) < 60, gone ? `${(gone.t - e.t).toFixed(0)} ms` : 'not removed');
  }
  const tr = log.find((e) => e.ev === 'fx+' && e.fx.endsWith('/travel_p2f'));
  if (tr) { const TM = meta(el, 'travel_p2f'); const gone = log.find((x) => x.ev === 'fx-' && x.fx === tr.fx); const imp = imps[0];
    check(tag, 'travel natural aspect', Math.abs((tr.w / tr.h) / (TM.frame_w / TM.frame_h) - 1) < 0.01);
    check(tag, 'travel no scene flash', tr.w < tr.boxW * 0.6 && !tr.flash, `${tr.w.toFixed(0)}x${tr.h.toFixed(0)} in ${tr.boxW}x${tr.boxH}`);
    if (strictT) check(tag, `travel removed after total_ms=${TM.total_ms}, impact follows`, gone && Math.abs(gone.t - tr.t - TM.total_ms) < 60 && imp && imp.t >= gone.t - 1, gone ? `${(gone.t - tr.t).toFixed(0)} ms, impact +${(imp.t - gone.t).toFixed(0)} ms` : ''); }
  const res = await page.evaluate(() => performance.getEntriesByType('resource').map((r) => r.name).filter((n) => n.includes('_battle_2x.')));
  check(tag, 'effects read from the live paths', res.length > 0 && !res.some((n) => n.includes('_transparent_staging')), res.map((n) => n.split('/effects/')[1]).join(', '));
  check(tag, 'no console errors', errs.length === 0, errs.slice(0, 3).join(' | '));
  const vid = page.video(); await ctx.close(); await browser.close();
  if (clip && vid) { const src = await vid.path(); const dst = path.join(OUT, `${prof}_${mode}_${el}_clip.webm`); fs.renameSync(src, dst); shots.clip = path.relative(ROOT, dst); }
  return { tag, shots };
}

// plain battle (no ?fxel, no ?fxpreview): with the flags on, the creatures' own elements play from the live paths.
// clip=true records it (several hits); otherwise it only checks.
async function plain(prof, P, mode, { clip = false } = {}) {
  const tag = `${prof}/${mode}/plain`;
  const browser = await P.type.launch();
  const ctx = await browser.newContext({ ...P.ctx, ...(clip ? { recordVideo: { dir: OUT, size: P.ctx.viewport } } : {}) });
  const page = await ctx.newPage(); const errs = [];
  page.on('console', (m) => m.type() === 'error' && errs.push(m.text())); page.on('pageerror', (e) => errs.push(String(e)));
  await page.addInitScript(INIT); await page.goto(`${BASE}${mode === 'sd' ? '&battle=sd' : ''}`); await page.waitForSelector('.ui-battle', { timeout: 20000 });
  const tap = async (sel) => { const e = page.locator(sel).first(); if (P.touch) await e.tap({ timeout: 8000 }); else await e.click({ timeout: 8000 }); };
  const t0 = Date.now(); let turns = 0; const want = clip ? 4 : 2;
  while (Date.now() - t0 < (clip ? 45000 : 20000) && turns < want) {
    const s = await page.evaluate(() => { const c = document.querySelector('#b-cmds'); return { gone: !document.querySelector('.ui-battle'), more: !!document.querySelector('#b-msg .more'), cmds: c && !c.hidden, skills: !!c?.classList.contains('skills') }; });
    if (s.gone) break;
    if (s.cmds && !s.skills) await tap('#b-cmds .b-cmd[data-i="0"]').catch(() => {});
    else if (s.cmds && s.skills) { await tap(`#b-cmds .b-cmd[data-i="${turns % 2}"]`).catch(() => tap('#b-cmds .b-cmd[data-i="0"]')); turns++; }
    else if (s.more) await tap('#b-msg').catch(() => {});
    await sleep(clip ? 250 : 150);
  }
  await sleep(4000); const log = await page.evaluate(() => window.__fx);
  const res = await page.evaluate(() => performance.getEntriesByType('resource').map((r) => r.name).filter((n) => n.includes('_battle_2x.')));
  const imps = log.filter((e) => e.ev === 'fx+');
  check(tag, `effects play in a normal battle (${imps.length} effect(s): ${[...new Set(imps.map((e) => e.fx))].join(', ')})`, imps.some((e) => e.fx.endsWith('/impact')) && log.some((e) => e.ev === 'shake') && log.some((e) => e.ev === 'dmg'));
  check(tag, 'live paths only', res.length > 0 && !res.some((n) => n.includes('_transparent_staging')));
  check(tag, 'no scene flash during hits', imps.every((e) => e.w < e.boxW * 0.6 && !e.flash));
  check(tag, 'no console errors', errs.length === 0, errs.slice(0, 3).join(' | '));
  const vid = page.video(); await ctx.close(); await browser.close();
  let file = null;
  if (clip && vid) { file = path.join(OUT, `${prof}_${mode}_battle_clip.webm`); fs.renameSync(await vid.path(), file); }
  return { tag, turns, effects: imps.map((e) => e.fx), clip: file && path.relative(ROOT, file) };
}

const out = [];
for (const prof of (process.env.PROFILES || 'desktop,iphone14,pixel7').split(',')) {
  const P = PROFILES[prof];
  for (const mode of ['default', 'sd']) {
    out.push(await plain(prof, P, mode));
    for (const el of ELS) out.push(await run(prof, P, mode, el));
  }
}
const CLIPS = process.env.CLIPS === '0' ? [] : (process.env.CLIPS || 'desktop:default,iphone14:default').split(',');
for (const c of CLIPS) { const [prof, mode] = c.split(':'); out.push(await plain(prof, PROFILES[prof], mode, { clip: true })); }
fs.writeFileSync(path.join(OUT, `fx_live_report${NOSHOT ? '_timing' : ''}.json`), JSON.stringify({ at: new Date().toString(), fails, report, shots: out }, null, 1));
console.log(`\n${report.length - fails}/${report.length} checks passed`);
process.exit(fails ? 1 : 0);
