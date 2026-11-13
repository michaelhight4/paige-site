// Capture sequence + menu motion e2e + clips (Oct 22, 2026). Local only.
//  Capture (no throw; held-up crystal, SOUL_PLAYBOOK 5.3): default shell battle (Pack -> Crystal) and ?battle=sd (Pack -> Crystal, forceChance), both run
//  ui_tools2.js catchFx -> capture_fx.js: trainer slides in, raise, rune beam, absorb, 1-4 pulses, lock + bloom + 'Crystal bound!' banner
//  + 'catch' chime, or break-out (foe re-forms). No stars / shakes / click. Blocked player words are checked.
//  Menus: phone (pause), team + ask() modal, pack, Kilindex, options, shop, dialogue choice box: anime.js open / back / close /
//  selection in 120-220 ms; closing is instant for input (inert clone fades). Reduced motion (OS + ?motion=reduce): none of it,
//  anime.js never fetched, the capture end state (crystal + banner) still shows. Banner contrast is measured (>= 4.5:1).
// Profiles: pc1080 (Chromium 1920x1080), iphone14 (WebKit iPhone 14 landscape), pixel7 (Chromium Pixel 7 landscape).
// Art pass (Oct 22, 2026, Gary approved): Animator capture art (fx_art.js) ON by default -> steps raise,beam,absorb,pulse_N,lock_bloom|breakout_<type>,lower;
//  ?fxart=0 = rollback placeholder (checked once on pc1080). Plus the evolution player (?ui=evolve) and heal_restore at the machine cradle
//  (heal_centre_int). Times of day: PHASES (dawn,day,dusk,night) for the default catch + heal.
// Usage: PORT=<http.server port> [ONLY=<regex>] [PROFILES=pc1080,iphone14,pixel7] [PHASES=dawn,day,dusk,night] [CATCH_OUT=shots/wave2_ui/catch_and_menus] node tests/catch_menus_e2e.mjs
import { chromium, webkit, devices } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.resolve(ROOT, process.env.CATCH_OUT || 'shots/wave2_ui/catch_and_menus');
fs.mkdirSync(OUT, { recursive: true });
const BASE = `http://127.0.0.1:${process.env.PORT || 8093}/index.html?save=0&clouds=0&life=0&uidemo=1`;
const PROFILES = {
  pc1080: { type: chromium, ctx: { viewport: { width: 1920, height: 1080 } }, p: 'pc', touch: false },
  iphone14: { type: webkit, ctx: { ...devices['iPhone 14 landscape'] }, p: 'mobile', touch: true },
  pixel7: { type: chromium, ctx: { ...devices['Pixel 7 landscape'] }, p: 'mobile', touch: true },
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = []; let fails = 0;
const check = (prof, name, pass, info = '') => { results.push(`${pass ? 'PASS' : 'FAIL'} [${prof}] ${name}${info ? ` - ${info}` : ''}`); if (!pass) fails++; console.log(results.at(-1)); };

const ONLY = process.env.ONLY ? new RegExp(process.env.ONLY) : null; // e.g. ONLY='heal|menus' re-runs just those sessions (matched on clip/query/fn name)
async function session(prof, P, { query = '', clip = null, reduced = false }, fn) {
  if (ONLY && !ONLY.test(`${clip || ''} ${query} ${reduced ? 'reduced' : ''} ${fn.toString().slice(0, 120)}`)) return;
  const browser = await P.type.launch();
  const ctx = await browser.newContext({ ...P.ctx, ...(reduced ? { reducedMotion: 'reduce' } : {}), ...(clip ? { recordVideo: { dir: OUT, size: P.ctx.viewport } } : {}) });
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', (e) => errs.push(String(e))); page.on('console', (m) => { if (m.type() === 'error' && !/status of 404/.test(m.text())) errs.push(m.text()); });
  const q2 = (/[?&]map=/.test(query) ? '' : '&map=brookhollow') + (/[?&]phase=/.test(query) ? '&timescale=0' : '&hour=12');
  await page.goto(`${BASE}&platform=${P.p}${q2}${query}`);
  await page.waitForFunction(() => window.kilumen?.ui && window.kilumen.scene, null, { timeout: 30000 }); await sleep(900);
  const tap = async (sel) => { const el = page.locator(sel).first(); await el.waitFor({ state: 'visible', timeout: 15000 }); if (P.touch) await el.tap({ timeout: 15000 }); else await el.click({ timeout: 15000 }); };
  const key = async (k) => { await page.keyboard.down(k); await sleep(70); await page.keyboard.up(k); await sleep(120); };
  const libs = () => page.evaluate(() => performance.getEntriesByType('resource').map((r) => r.name).filter((n) => /animejs|auto-animate/.test(n)).map((n) => n.split('/').slice(-2, -1)[0]));
  try { await fn({ page, tap, key, libs }); } catch (e) { check(prof, `${clip || 'session'} ran`, false, String(e).slice(0, 300)); }
  check(prof, `${clip || 'session'}: no console errors`, !errs.length, [...new Set(errs)].join(' | ').slice(0, 300));
  const vid = page.video(); await ctx.close(); await browser.close();
  if (vid && clip) { const dest = path.join(OUT, `${prof}_${clip}.webm`); fs.renameSync(await vid.path(), dest); results.push(`clip ${path.relative(ROOT, dest)}`); }
}

// WCAG contrast of the banner text against its background (both solid colours)
const contrastJs = () => {
  const b = document.querySelector('.ax-caught'); if (!b) return 0;
  const rgb = (s) => s.match(/[\d.]+/g).slice(0, 3).map(Number), L = (c) => { const [r, g, bl] = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * bl; };
  const cs = getComputedStyle(b), a = L(rgb(cs.color)), c = L(rgb(cs.backgroundColor)), n = L(rgb(getComputedStyle(b.lastElementChild).color));
  return Math.min((Math.max(a, c) + 0.05) / (Math.min(a, c) + 0.05), (Math.max(n, c) + 0.05) / (Math.min(n, c) + 0.05));
};

// Capture in one battle engine (Oct 22, 2026, SOUL_PLAYBOOK 5.3): the trainer holds the crystal up, the foe streams in,
// 1-4 pulses, then rune lock + bloom (caught) or the light bursts back out (ok=false). Returns once the after-message is up.
const BLOCKED = /\bPP\b|shiny|super effective|Pok[eé] ?dex|Pok[eé] ?Ball|Gotcha|nurse/i;
async function catchRun(prof, P, { page, tap, libs }, engine, reduced, ok = true, phase = '', placeholder = false) {
  await page.evaluate(() => { const a = window.kilumen.scene.audio; window.__sfx = []; window.__msgs = []; if (a) { const o = a.sfx.bind(a); a.sfx = (id, ...r) => { window.__sfx.push(id); return o(id, ...r); }; }
    new MutationObserver(() => { const t = document.querySelector('#b-msg')?.textContent; if (t && window.__msgs.at(-1) !== t) window.__msgs.push(t); }).observe(document.body, { subtree: true, childList: true, characterData: true }); });
  if (engine === 'sd') await page.evaluate(() => window.kilumen.ui.sdReady);
  await page.evaluate((ok) => window.kilumen.ui.open('battle', { forceChance: ok }), ok);
  const cmds = async () => { for (let k = 0; k < 120; k++) { const s = await page.evaluate(() => { const c = document.querySelector('#b-cmds'), m = document.querySelector('#b-msg'); return { cmds: c && !c.hidden ? [...c.querySelectorAll('.b-cmd')].map((e) => e.textContent) : null, more: !!m?.querySelector('.more') }; }); if (s.cmds?.length) return s.cmds; if (s.more) await tap('#b-msg'); await sleep(150); } return null; };
  const c0 = await cmds(); if (!c0) { check(prof, `${engine}: battle reached the commands`, false); return; }
  await tap('#b-cmds .b-cmd[data-i="1"]'); // Pack
  if (engine === 'sd') { await sleep(300); const c1 = await cmds(); const ci = c1?.findIndex((t) => /Crystal/.test(t)) ?? -1; if (ci < 0) { check(prof, 'sd: Pack lists a crystal', false, JSON.stringify(c1)); return; } await tap(`#b-cmds .b-cmd[data-i="${ci}"]`); }
  await page.waitForSelector('.ax-catch', { state: 'attached', timeout: 15000 });
  await sleep(reduced ? 150 : placeholder ? 820 : 2700); // mid: light streaming in (art: absorb ~ 2.2-3.3 s; placeholder: first pulse)
  const sample = () => page.evaluate(() => { const q = (s) => document.querySelector(s), vis = (e) => !!e && +getComputedStyle(e).opacity > 0.05;
    return { trainer: vis(q('.ax-trainer')) && getComputedStyle(q('.ax-trainer')).display !== 'none', gem: vis(q('.ax-gem')), beam: !!q('.ax-beam'), runes: !!q('.ax-runes'), stars: document.querySelectorAll('.ax-star').length, fxa: [...document.querySelectorAll('.fxa')].map((e) => e.dataset.anim + ':' + e.dataset.f),
      banner: q('.ax-caught')?.textContent || '', bannerOpacity: q('.ax-caught') ? +getComputedStyle(q('.ax-caught')).opacity : 0, anime: window.kilumen.ui.fx.loaded.anime }; });
  const mid = await sample();
  const tag = `${engine}${reduced ? ' reduced' : ''}${ok ? '' : ' break-out'}${phase ? ` ${phase}` : ''}${placeholder ? ' placeholder' : ''}`, file = `${prof}_${engine}${reduced ? '_reduced' : ''}${ok ? '' : '_breakout'}${phase ? `_${phase}` : ''}${placeholder ? '_placeholder' : ''}`;
  await page.screenshot({ path: path.join(OUT, `${file}_catch_mid.png`) });
  const after = ok ? /with you now/ : /broke free/;
  await page.waitForFunction((src) => new RegExp(src).test(document.querySelector('#b-msg')?.textContent || ''), after.source, { timeout: 14000 }).catch(() => {});
  const fin = await sample(); await page.screenshot({ path: path.join(OUT, `${file}_catch_end.png`) });
  const st = await page.evaluate(() => ({ steps: (window.kilumen.ui.fx.motion.capture || []).join(','), held: window.kilumen.ui.fx.motion.catchHeld, budget: window.kilumen.ui.fx.motion.captureBudget, drift: window.kilumen.ui.fx.motion.holdDrift, msg: document.querySelector('#b-msg')?.textContent || '', sfx: window.__sfx,
    foe: +getComputedStyle(document.querySelector('#foe-mon, #p2-mon')).opacity, msgs: window.__msgs }));
  const cr = ok ? await page.evaluate(contrastJs) : 0;
  await sleep(700); const gone = await page.evaluate(() => !document.querySelector('.ax-trainer'));
  const n = (st.steps.match(/pulse/g) || []).length, budget = placeholder ? 260 + 180 + 360 + 280 * n + (ok ? 560 : 420) + 450 : (st.budget || 0) + 450;
  if (!reduced && !placeholder) {
    check(prof, `${tag}: Animator art: trainer holds the crystal up, absorb canvas over the foe, anime.js (no throw, no stars)`, mid.trainer && mid.fxa.some((f) => /^(absorb|beam)/.test(f)) && !mid.gem && mid.anime && mid.stars === 0 && fin.stars === 0, JSON.stringify(mid));
    check(prof, `${tag}: steps raise > beam > absorb > pulse_N > ${ok ? 'lock_bloom' : 'breakout_<type>'} > lower`, new RegExp(`^raise,beam,absorb,pulse_[1-4],${ok ? 'lock_bloom' : 'breakout_(fire|water|wind|generic)'},lower$`).test(st.steps), st.steps);
    check(prof, `${tag}: input waits only for the art timeline (<= ${budget} ms), trainer slides back out`, st.held > 0 && st.held <= budget && st.msgs.some((m) => after.test(m)) && gone, `held ${st.held} ms, hold drift ${st.drift}px, gone ${gone}, ${st.msg}`);
  } else if (!reduced) {
    check(prof, `${tag}: trainer holds the crystal up, rune beam, anime.js (no throw, no stars)`, mid.trainer && mid.gem && mid.beam && mid.runes && mid.anime && mid.stars === 0 && fin.stars === 0, JSON.stringify(mid));
    check(prof, `${tag}: steps raise > beam > absorb > pulse x1-4 > ${ok ? 'lock > bloom' : 'breakout'} > lower`, new RegExp(`^raise,beam,absorb,(pulse,){1,4}${ok ? 'lock,bloom' : 'breakout'},lower$`).test(st.steps), st.steps);
    check(prof, `${tag}: input waits only for the sequence (${n} pulses, <= ${budget} ms), trainer slides back out`, st.held > 0 && st.held <= budget && st.msgs.some((m) => after.test(m)) && gone, `held ${st.held} ms, gone ${gone}, ${st.msg}`);
  } else {
    check(prof, `${tag}: end state at once (no trainer / motion), anime.js never fetched`, !mid.trainer && st.steps === '' && st.held === 0 && !(await libs()).length && after.test(st.msg) && (!ok || ((mid.gem || mid.fxa.some((f) => /^lock_bloom/.test(f))) && mid.bannerOpacity === 1)), `${JSON.stringify(mid)} ${st.steps} libs ${(await libs()).join(',') || 'none'}`);
    check(prof, `${tag}: no frozen intro bars / exit flash on screen`, await page.evaluate(() => [...document.querySelectorAll('.b-bars, .b-flash')].every((e) => getComputedStyle(e).display === 'none')));
  }
  if (ok) {
    check(prof, `${tag}: 'Crystal bound!' banner with the name, contrast >= 4.5:1`, /^Crystal bound!/.test(fin.banner) && fin.banner.length > 14 && fin.bannerOpacity > 0.95 && cr >= 4.5, `${fin.banner} ${cr.toFixed(2)}`);
    check(prof, `${tag}: 'catch' chime played once (at the lock)`, st.sfx.filter((s) => s === 'catch').length === 1, JSON.stringify(st.sfx));
  } else {
    check(prof, `${tag}: foe re-forms, no banner, no chime`, st.foe > 0.95 && !fin.banner && !st.sfx.includes('catch'), JSON.stringify({ foe: st.foe, banner: fin.banner, sfx: st.sfx }));
  }
  check(prof, `${tag}: player text has no blocked words`, !st.msgs.some((m) => BLOCKED.test(m)) && !BLOCKED.test(fin.banner), JSON.stringify(st.msgs).slice(0, 300));
  if (ok) { await tap('#b-msg').catch(() => {}); await sleep(900); check(prof, `${tag}: battle closes after the message`, await page.evaluate(() => !window.kilumen.ui.active)); }
}

// Evolution (self-contained player; the game has no evolution flow yet): ?ui=evolve&from=cindrip -> emberlunx
async function evolveRun(prof, P, { page, libs }, reduced) {
  await sleep(reduced ? 300 : 2600); await page.screenshot({ path: path.join(OUT, `${prof}${reduced ? '_reduced' : ''}_evolve_mid.png`) });
  const r = await page.evaluate(async () => { const x = await window.kilumen.ui.evolveDone; return x && { from: x.from, to: x.to, steps: x.steps, ms: x.ms, skipped: x.skipped, msg: document.querySelector('.ax-evo-msg')?.textContent }; });
  await page.screenshot({ path: path.join(OUT, `${prof}${reduced ? '_reduced' : ''}_evolve_end.png`) });
  const want = reduced ? 'evo_reduced_motion' : 'evo_veins_grow,evo_veins_hold,evo_veins_hold,evo_reveal_front,evo_ring_burst';
  check(prof, `evolution${reduced ? ' reduced' : ''}: cindrip -> emberlunx, steps ${want}, end text`, r && r.to === 'emberlunx' && r.steps.join(',') === want && /became Emberlunx!/.test(r.msg) && !BLOCKED.test(r.msg), JSON.stringify(r));
  if (reduced) check(prof, 'evolution reduced: anime.js never fetched', !(await libs()).length);
}
// heal_restore at the crystal polisher cradle (heal_brookhollow, map px (383,92); the same call heal.js makes after the machine line)
async function healRun(prof, P, { page }, phase, reduced) {
  // stand at the counter in front of the polisher (where the carer talk happens), like real play; the door spawn puts the camera below it
  await page.evaluate(() => window.kilumen.scene.player.place(5, 4, 'up')); await sleep(400);
  const pr = page.evaluate(() => window.kilumen.ui.fx.healFx(window.kilumen.scene, 3).then((r) => r && { ...r }));
  await sleep(1700); await page.screenshot({ path: path.join(OUT, `${prof}${reduced ? '_reduced' : ''}_heal_${phase || 'day'}_mid.png`) });
  const r = await pr; const vw = await page.evaluate(() => [innerWidth, innerHeight]);
  if (reduced) { check(prof, 'heal reduced: skipped', r?.skipped === 'reduced', JSON.stringify(r)); return; }
  check(prof, `heal ${phase}: cradle_open > float_3 > sweep > glow_3 > done_ping > float back at the i_crystal_polisher cradle, map px (383,92)`, r && !r.skipped && r.steps.join(',') === 'heal_cradle_open,heal_float_3,heal_scanner_sweep,heal_glow_3,heal_done_ping,heal_float_3_back'
    && r.machine.base === 'i_crystal_polisher' && r.mapPx[0] === 383 && r.mapPx[1] === 92 && r.ms < 4917 + 600, JSON.stringify({ ...r, vw }));
  // WARN (not a fail; camera framing is World Design / overworld, not FX): is the cradle point inside the viewport?
  if (!(r.at.x > 0 && r.at.x < vw[0] && r.at.y > 0 && r.at.y < vw[1])) results.push(`WARN [${prof}] heal ${phase}: cradle point off screen at ${r.at.x},${r.at.y} (camera does not show the polisher top)`), console.log(results.at(-1));
}

async function menusRun(prof, P, { page, tap, key, libs }, reduced) {
  const M = () => page.evaluate(() => ({ ...window.kilumen.ui.fx.motion, last: { ...window.kilumen.ui.fx.motion.last } }));
  const open = async () => { if (P.touch) await tap('.hud-menu'); else await key('Escape'); await sleep(420); };
  const back = async () => { if (P.touch) await tap('.ui-stage .ui-x'); else await key('Escape'); await sleep(420); };
  const app = async (i) => { if (P.touch) await tap(`.ui-stage [data-i="${i}"]`); else { await page.evaluate((i) => window.kilumen.ui._select(i), i); await sleep(250); await key('Enter'); } await sleep(450); };
  await open();
  if (!P.touch) { for (const k of ['ArrowRight', 'ArrowRight', 'ArrowDown', 'ArrowLeft']) { await key(k); await sleep(120); } }
  await app(0); // team
  if (!reduced) { const c = page.locator('.ui-stage .ui-card[data-i="1"]').first(); if (P.touch) await c.tap(); else await c.click(); await sleep(500); await page.screenshot({ path: path.join(OUT, `${prof}_menus_ask.png`) }); if (P.touch) await page.evaluate(() => window.kilumen.ui._modalBack()); else await key('Escape'); await sleep(400); }
  await back(); await app(1); // pack
  if (!P.touch) { await key('ArrowDown'); await key('ArrowDown'); } await sleep(200); await back();
  await app(2); await sleep(200); await back(); // kilindex
  await app(7); if (!P.touch) { await key('ArrowDown'); await key('ArrowDown'); } await back(); // options
  await page.evaluate(() => window.kilumen.ui.open('shop')); await sleep(450); if (!P.touch) { await key('ArrowDown'); await key('ArrowDown'); } await sleep(250); await back();
  // close (instant for input: the real root is hidden at once, an inert clone fades)
  const closeNow = await page.evaluate(() => { const ui = window.kilumen.ui; ui.closeAll(); const g = document.querySelector('.ui-root.ax-out'); return { active: ui.active, hidden: ui.root.hidden, ghost: !!g, inert: g ? (g.inert === true && g.getAttribute('aria-hidden') === 'true' && getComputedStyle(g).pointerEvents === 'none') : null, ids: g ? g.querySelectorAll('[id],[data-i],[data-act]').length : 0 }; });
  await sleep(450); const ghostLeft = await page.evaluate(() => document.querySelectorAll('.ax-out').length);
  // dialogue choice box
  await page.evaluate(() => { window.__res = null; window.kilumen.scene.ask(['Want to trade notes?'], ['Sure', 'Not now', 'Ask me later'], { name: 'Kit' }).then((i) => { window.__res = i; }); });
  await sleep(450); await page.screenshot({ path: path.join(OUT, `${prof}${reduced ? '_reduced' : ''}_menus_dialog_choice.png`) });
  if (!P.touch) { await key('ArrowDown'); await sleep(200); await key('Enter'); } else { const rows = await page.$$eval('.dlg-list li', (ls) => ls.map((l) => { const b = l.getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; })); await page.touchscreen.tap(...rows[1]); }
  await sleep(500);
  const res = await page.evaluate(() => window.__res); const m = await M(); const l = await libs();
  const inWin = (v) => v == null || (v >= 120 && v <= 220);
  if (!reduced) {
    check(prof, 'menus: anime.js open / back / close / selection / modal / dialogue ran', m.open >= 5 && m.back >= 4 && m.close >= 1 && (m.sel || 0) >= 2 && (P.touch || m.modalIn >= 1) && m.dlgIn >= 1, JSON.stringify(m));
    check(prof, 'menus: every motion is 120-220 ms', Object.entries(m.last).filter(([k]) => k !== 'catch').every(([, v]) => inWin(v)), JSON.stringify(m.last));
    check(prof, 'menus: close never holds input (root hidden at once, clone inert + id-free, gone in 450 ms)', !closeNow.active && closeNow.hidden && closeNow.ghost && closeNow.inert && closeNow.ids === 0 && ghostLeft === 0, JSON.stringify(closeNow) + ` left ${ghostLeft}`);
  } else {
    check(prof, 'menus reduced: no menu motion, no clone, anime.js / auto-animate never fetched', !m.open && !m.back && !m.close && !m.sel && !m.dlgIn && !closeNow.ghost && !l.length, JSON.stringify(m) + ` libs ${l.join(',') || 'none'}`);
  }
  check(prof, `menus${reduced ? ' reduced' : ''}: dialogue choice still picks (row 2)`, res === 1, `res ${res}`);
}

const PHASES = (process.env.PHASES || 'dawn,day,dusk,night').split(',');
for (const prof of (process.env.PROFILES || 'pc1080,iphone14,pixel7').split(',')) {
  const P = PROFILES[prof];
  for (const ph of PHASES) await session(prof, P, { query: `&phase=${ph}`, clip: `catch_default_${ph}` }, (h) => catchRun(prof, P, h, 'shell', false, true, ph));
  for (const ph of PHASES) await session(prof, P, { query: `&phase=${ph}&map=heal_brookhollow`, clip: ph === 'day' ? 'heal' : null }, (h) => healRun(prof, P, h, ph, false));
  await session(prof, P, { query: '&ui=evolve&from=cindrip', clip: 'evolution' }, (h) => evolveRun(prof, P, h, false));
  if (prof === 'pc1080') {
    await session(prof, P, { query: '&fxart=0', clip: 'catch_placeholder_rollback' }, (h) => catchRun(prof, P, h, 'shell', false, true, '', true));
    // Character models' capture poses (draft, flag OFF by default): ?poses=1 = the one-config switch; hold point per pose frame
    await session(prof, P, { query: '&poses=1', clip: 'catch_poses_flag' }, async (h) => { await catchRun(prof, P, h, 'shell', false, true, 'poses');
      const m = await h.page.evaluate(() => ({ pose: window.kilumen.ui.fx.motion.pose })); check(prof, 'poses flag: trainer shows the pose strip, ends on lowered', m.pose === 'lowered', JSON.stringify(m)); });
    await session(prof, P, { query: '&ui=evolve&from=cindrip', reduced: true }, (h) => evolveRun(prof, P, h, true));
    await session(prof, P, { query: '&map=heal_brookhollow', reduced: true }, (h) => healRun(prof, P, h, 'day', true));
  }
  await session(prof, P, { query: '&battle=sd&phase=night', clip: 'catch_sd' }, (h) => catchRun(prof, P, h, 'sd', false, true, 'night'));
  if (prof !== 'pixel7') { // break-out: the light bursts back out and the foe re-forms (both engines)
    await session(prof, P, { clip: 'breakout_default' }, (h) => catchRun(prof, P, h, 'shell', false, false));
    await session(prof, P, { query: '&battle=sd', clip: 'breakout_sd' }, (h) => catchRun(prof, P, h, 'sd', false, false));
  }
  await session(prof, P, { clip: 'menus' }, (h) => menusRun(prof, P, h, false));
  if (prof !== 'pixel7') {
    await session(prof, P, { query: '&motion=reduce' }, (h) => catchRun(prof, P, h, 'shell', true));
    await session(prof, P, { query: '&battle=sd', reduced: true }, (h) => catchRun(prof, P, h, 'sd', true));
    await session(prof, P, { reduced: true }, (h) => menusRun(prof, P, h, true));
  }
}
console.log(results.filter((r) => r.startsWith('clip')).join('\n')); console.log(`${fails} failures`);
process.exit(fails ? 1 : 0);
