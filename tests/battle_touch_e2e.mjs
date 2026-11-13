// Battle screen e2e for the engine-driven battle behind ?battle=sd (src/battle/ui_sd.js).
// Profiles: desktop 1920x1080 (mouse clicks), Pixel 7 landscape (Chromium touch taps), iPhone 14 landscape (WebKit touch taps),
// and a 844x390 @3x WebKit phone for 2532x1170 shots. Checks: commands/skills/pack/team/retreat respond to taps, a full wild KO,
// a full trainer KO (forced foe switch, retreat refused), a crystal throw, tap targets >= 44 px, no console errors.
// Layout (Oct 22 2026): both creatures stand on ground platforms; no info plate covers a creature or a platform; the plates
// don't touch; menu labels (incl. 16-character names) are never cut; the command menu is hidden while a message plays.
// Layout zones (Oct 22 2026, layout pass): at every layout point (commands, team, pack, skills, 16-char names, each of the first
// turns, after the trainer's foe switch) no info card or party readout intersects a creature sprite box, a platform box, the other
// card or the panel; both creatures' feet sit on their platform's centre; the foe card is top-left and the ally card bottom-right.
// The layout-only sessions repeat this at all 4 times of day (hour 6/12/18/22) for wild + trainer on ?battle=sd and for the old
// default battle shell (same zone rules). Geometry probe: PROBE in tests/battle_layout_ref.mjs.
// Usage: PORT=<http.server port> [PROFILES=desktop,pixel7,iphone14,iphone15,phone3x] [HOURS=6,12,18,22] node tests/battle_touch_e2e.mjs -> shots/battle_engine/
import { chromium, webkit, devices } from 'playwright';
import { PROBE } from './battle_layout_ref.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.resolve(ROOT, process.env.OUT || 'shots/battle_engine');
fs.mkdirSync(OUT, { recursive: true });
const BASE = `http://127.0.0.1:${process.env.PORT}/index.html?save=0&uidemo=1&ui=battle&clouds=0&life=0`; // + &battle=sd and &hour= per session
const PROFILES = {
  desktop: { type: chromium, ctx: { viewport: { width: 1920, height: 1080 } }, touch: false },
  pixel7: { type: chromium, ctx: { ...devices['Pixel 7 landscape'] }, touch: true },
  iphone14: { type: webkit, ctx: { ...devices['iPhone 14 landscape'] }, touch: true },
  iphone15: { type: webkit, ctx: { ...devices['iPhone 15 landscape'] }, touch: true },
  phone3x: { type: webkit, ctx: { ...devices['iPhone 14 landscape'], viewport: { width: 844, height: 390 }, screen: { width: 844, height: 390 } }, touch: true },
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const AXE = new URL('../tools/free_tools/node_modules/axe-core/axe.min.js', import.meta.url).pathname;
const HOURS = (process.env.HOURS || '6,12,18,22').split(',').map(Number); // dawn, day, dusk, night (phaseForHour)
const results = []; let fails = 0;
const check = (prof, name, ok, info = '') => { results.push({ prof, name, ok, info }); if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'} [${prof}] ${name}${info ? ` - ${info}` : ''}`); };

async function session(prof, P, query, fn, screen = 'sd') {
  const SEL = screen === 'sd' ? '.ui-battle[data-engine="sd"]' : '.ui-battle[data-scr="battle"]';
  const browser = await P.type.launch(); const ctx = await browser.newContext(P.ctx); const page = await ctx.newPage();
  const errs = []; page.on('console', (m) => m.type() === 'error' && errs.push(m.text())); page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(`${BASE}${screen === 'sd' ? '&battle=sd' : ''}${/(^|&)hour=/.test(query) ? '' : '&hour=12'}&${query}`);
  await page.waitForSelector(SEL, { timeout: 20000 });
  // locator taps re-resolve the selector, so a menu that re-renders mid-tap (innerHTML swap) is retried instead of
  // failing with "element is not attached" (seen once on WebKit iPhone 14, Oct 22 2026)
  const tap = async (sel) => { const el = page.locator(sel).first(); await el.waitFor({ state: 'visible', timeout: 15000 }); if (P.touch) await el.tap({ timeout: 15000 }); else await el.click({ timeout: 15000 }); };
  // advancing the last message closes the battle (with its exit transition), so #b-msg can detach mid-tap: that is fine
  // when the battle has closed, and still a failure when it hasn't
  const tapMsg = async () => { try { const el = page.locator('#b-msg').first(); if (P.touch) await el.tap({ timeout: 4000 }); else await el.click({ timeout: 4000 }); } catch (e) { if ((await state()).open) throw e; } };
  const state = () => page.evaluate((SEL) => {
    const ui = window.kilumen?.ui || null, msg = document.querySelector('#b-msg'), cmds = document.querySelector('#b-cmds');
    return { open: !!document.querySelector(SEL), msg: msg?.textContent || '', more: !!msg?.querySelector('.more'),
      cmds: cmds && !cmds.hidden ? [...cmds.querySelectorAll('.b-cmd')].map((e) => e.textContent) : null, modal: !!document.querySelector('.ui-modal') };
  }, SEL);
  const waitCmds = async (ms = 20000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const s = await state(); if (!s.open) return s; if (s.cmds) return s; if (s.more) await tapMsg(); await sleep(120); } return state(); };
  // layout check at a resting state (no hit/enter animation in flight)
  const layout = async (where) => {
    await sleep(350);
    // zones (both screens): cards vs sprites/platforms/panel, feet on the platform centre, card corners, party readout in its card
    const Z = await page.evaluate(PROBE);
    check(prof, `${where}: no info card / party readout intersects a creature sprite, a platform, the other card or the panel`, Z.hits.length === 0, Z.hits.join(', '));
    check(prof, `${where}: both creatures' feet on their platform centre`, Z.feet.foe?.ok && Z.feet.ally?.ok, JSON.stringify(Z.feet));
    check(prof, `${where}: foe card top-left, ally card bottom-right above the panel, foe top-right`, !!Z.zones && Object.values(Z.zones).every(Boolean), JSON.stringify(Z.zones));
    if (screen !== 'sd') return;
    check(prof, `${where}: party HP readout inside its card`, Z.partyInside && !!Z.party);
    const L = await page.evaluate(() => {
      const R = (q) => { const e = document.querySelector(q); if (!e) return null; const r = e.getBoundingClientRect(); return r.width && r.height ? { x: r.left, y: r.top, r: r.right, b: r.bottom } : null; };
      const ov = (a, b) => !!a && !!b && a.x < b.r - 1 && b.x < a.r - 1 && a.y < b.b - 1 && b.y < a.b - 1;
      const plates = { p1: R('#plate-p1'), p2: R('#plate-p2') }, things = { 'ally sprite': R('#p1-mon'), 'foe sprite': R('#p2-mon'), 'ally platform': R('#p1-plat'), 'foe platform': R('#p2-plat') };
      const hits = []; for (const [pn, pr] of Object.entries(plates)) for (const [tn, tr] of Object.entries(things)) if (ov(pr, tr)) hits.push(`${pn}/${tn}`);
      if (ov(plates.p1, plates.p2)) hits.push('p1/p2 plates');
      const cut = [...document.querySelectorAll('#b-cmds:not([hidden]) .b-cmd .t')].filter((t) => t.scrollWidth > t.clientWidth + 1 || t.scrollHeight > t.clientHeight + 1 || getComputedStyle(t).textOverflow === 'ellipsis' && t.scrollWidth > t.clientWidth).map((t) => t.textContent);
      // both platforms fully visible: inside the viewport, at least 6px above the message/menu panel, and nothing drawn over them at
      // the centre, the left/right edges and along the bottom rim (elementFromPoint; platforms are pointer-events:none, so
      // they are made hit-testable for the probe only). The creature's own sprite may overlap where its feet rest.
      const bottomTop = R('.b-bottom')?.y ?? innerHeight, hidden = [];
      for (const id of ['p1-plat', 'p2-plat']) {
        const e = document.getElementById(id), r = e?.getBoundingClientRect();
        if (!r || !r.width) { hidden.push(`${id} missing`); continue; }
        if (r.left < 0 || r.top < 0 || r.right > innerWidth || r.bottom > innerHeight) hidden.push(`${id} off screen`);
        if (r.bottom > bottomTop - 6) hidden.push(`${id} reaches the message/menu panel (${Math.round(r.bottom)} > ${Math.round(bottomTop)})`);
        const prev = e.style.pointerEvents; e.style.pointerEvents = 'auto';
        for (const [fx, fy] of [[0.5, 0.5], [0.06, 0.5], [0.94, 0.5], [0.5, 0.92], [0.25, 0.85], [0.75, 0.85]]) {
          const h = document.elementFromPoint(r.left + r.width * fx, r.top + r.height * fy);
          if (h !== e && h !== e.parentElement.querySelector('.b-mon')) hidden.push(`${id} @${fx},${fy} under ${h?.id || h?.className || h?.tagName}`);
        }
        e.style.pointerEvents = prev;
      }
      return { hits, cut, hidden, plats: !!things['ally platform'] && !!things['foe platform'] };
    });
    check(prof, `${where}: both creatures stand on platforms`, L.plats);
    check(prof, `${where}: no plate covers a creature/platform or another plate`, L.hits.length === 0, L.hits.join(', '));
    check(prof, `${where}: no menu label cut`, L.cut.length === 0, L.cut.join(', '));
    check(prof, `${where}: both platforms fully visible (not covered, above the panel)`, L.hidden.length === 0, L.hidden.join(', '));
  };
  // axe-core scan of the battle screen (all rules incl. color-contrast); dev copy under tools/free_tools
  const axe = async (where) => {
    await page.addScriptTag({ path: AXE });
    const v = await page.evaluate(async () => (await window.axe.run('.ui-battle')).violations.map((x) => `${x.id}(${x.impact}) x${x.nodes.length}: ${x.nodes[0]?.target.join(' ')}`));
    check(prof, `${where}: axe-core finds no violations (incl. color-contrast)`, v.length === 0, v.join(' | '));
  };
  const cmdsHidden = () => page.evaluate(() => getComputedStyle(document.querySelector('#b-cmds')).display === 'none');
  const ctxObj = { page, tap, tapMsg, state, waitCmds, layout, axe, cmdsHidden, shot: (n) => page.screenshot({ path: path.join(OUT, `${prof}_${n}.png`) }) };
  try { await fn(ctxObj); } catch (e) { check(prof, `${screen === "sd" ? "" : "old screen "}${query} threw`, false, String(e).slice(0, 300)); }
  check(prof, `${screen === "sd" ? "" : "old screen "}${query}: no console errors`, errs.length === 0, errs.slice(0, 3).join(' | '));
  await browser.close();
}
const lastBattle = (page) => page.evaluate(() => { const r = window.kilumen?.ui?.lastBattle; return r ? { outcome: r.outcome, bag: r.bag, caught: r.caught } : null; });

async function run(prof) {
  const P = PROFILES[prof];
  // 1) wild: menu taps, skills, pack, team, then fight to the KO
  await session(prof, P, 'bseed=1,2,3,4', async ({ page, tap, state, waitCmds, shot, layout }) => {
    let s = await waitCmds(); check(prof, 'wild: command menu shows 4 commands', s.cmds?.length === 4, JSON.stringify(s.cmds));
    const sizes = await page.$$eval('#b-cmds .b-cmd', (els) => els.map((e) => { const r = e.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; }));
    check(prof, 'tap targets >= 44 px', sizes.every(([w, h]) => w >= 44 && h >= 44), JSON.stringify(sizes));
    await layout('commands'); await shot('01_commands');
    await tap('#b-cmds .b-cmd[data-i="2"]'); s = await state(); check(prof, 'Team opens the party list', !!s.cmds && s.cmds.length >= 1 && /HP/.test(s.cmds.join()), JSON.stringify(s.cmds));
    await layout('team'); await shot('02_team');
    if (s.cmds.length > 1) { await tap('#b-cmds .b-cmd[data-i="1"]'); s = await waitCmds(); check(prof, 'switch resolves a turn and returns to commands', !!s.cmds || !s.open, s.msg); }
    await tap('#b-cmds .b-cmd[data-i="1"]'); s = await state(); check(prof, 'Pack lists usable items', !!s.cmds && /×/.test(s.cmds.join()), JSON.stringify(s.cmds));
    await layout('pack'); await shot('03_pack');
    await page.evaluate(() => window.kilumen.ui.back()); s = await state(); check(prof, 'B / back returns to commands', s.cmds?.length === 4);
    await tap('#b-cmds .b-cmd[data-i="0"]'); s = await state(); check(prof, 'Skills shows energy', !!s.cmds && s.cmds.every((t) => /En \d+\/\d+/.test(t)), JSON.stringify(s.cmds));
    await layout('skills');
    // 16-character skill/item names must show in full (wrap or shrink, never an ellipsis)
    const names = await page.evaluate(() => [...document.querySelectorAll('#b-cmds .b-cmd .t')].map((t) => t.textContent));
    await page.evaluate(() => { const L = ['Wwwwwwwwwwwwwwww', 'Mmmmmmm Mmmmmmmm', 'Thundering Quake', 'Prime Crystal ×9']; document.querySelectorAll('#b-cmds .b-cmd .t').forEach((t, i) => { t.textContent = L[i % 4]; }); });
    await layout('16-char names');
    await page.evaluate((n) => document.querySelectorAll('#b-cmds .b-cmd .t').forEach((t, i) => { t.textContent = n[i]; }), names);
    await shot('04_skills');
    let turns = 0, midShot = false;
    while (turns < 40) {
      s = await state(); if (!s.open) break;
      if (s.cmds && s.cmds.length === 4 && /Skills/.test(s.cmds[0])) await tap('#b-cmds .b-cmd[data-i="0"]');
      s = await state(); if (!s.open) break;
      if (s.cmds && /En/.test(s.cmds[0])) { await tap('#b-cmds .b-cmd[data-i="0"]'); turns++; if (s.modal || (await state()).modal) await tap('.ui-modal [data-m="0"]'); }
      else if (s.cmds) await tap('#b-cmds .b-cmd:not([style*="opacity"])');
      if (!midShot) { await sleep(700); await shot('05_hit'); midShot = true; }
      s = await waitCmds();
      if (s.open && s.cmds && turns <= 3) await layout(`turn ${turns}`);
      if (s.open && /grew to Lv|gained/.test(s.msg)) await shot('06_xp');
    }
    const r = await lastBattle(page); check(prof, 'full wild KO ends the battle with a result', !!r && ['win', 'lose'].includes(r.outcome), JSON.stringify(r) + ` turns=${turns}`);
  });
  // 2) wild retreat + crystal
  await session(prof, P, 'bseed=9,9,9,9', async ({ page, tap, state, waitCmds, shot, layout }) => {
    let s = await waitCmds(); await layout('crystal session commands'); await tap('#b-cmds .b-cmd[data-i="1"]'); s = await state();
    const ci = s.cmds?.findIndex((t) => /Crystal/.test(t)) ?? -1; check(prof, 'Pack shows a crystal in a wild battle', ci >= 0, JSON.stringify(s.cmds));
    if (ci >= 0) { await tap(`#b-cmds .b-cmd[data-i="${ci}"]`); await sleep(900); await shot('07_crystal'); s = await waitCmds(); check(prof, 'crystal throw resolves (caught or back to commands)', !s.open || !!s.cmds, s.msg); }
    s = await state();
    for (let k = 0; k < 6 && s.open; k++) { if (s.cmds?.length === 4) await tap('#b-cmds .b-cmd[data-i="3"]'); s = await waitCmds(); }
    const r = await lastBattle(page); check(prof, 'retreat/crystal ends the wild battle', !!r && ['retreat', 'caught', 'win', 'lose'].includes(r.outcome), JSON.stringify(r));
  });
  // layout zones at all 4 times of day: wild + trainer on ?battle=sd, and the old default shell
  for (const hour of HOURS) {
    for (const [q, label] of [[`hour=${hour}&bseed=1,2,3,4`, 'wild'], [`hour=${hour}&trainer=1&bseed=5,6,7,8`, 'trainer']]) {
      await session(prof, P, q, async ({ page, tap, state, waitCmds, layout, axe }) => {
        const tag = `h${hour} ${label}`; let s = await waitCmds();
        await layout(`${tag} commands`); await axe(`${tag} commands`);
        for (const [i, n] of [[0, 'skills'], [1, 'pack'], [2, 'team']]) { await tap(`#b-cmds .b-cmd[data-i="${i}"]`); await layout(`${tag} ${n}`); await page.evaluate(() => window.kilumen.ui.back()); }
        await tap('#b-cmds .b-cmd[data-i="0"]'); await tap('#b-cmds .b-cmd[data-i="0"]'); if ((await state()).modal) await tap('.ui-modal [data-m="0"]');
        s = await waitCmds(); if (s.open && s.cmds) await layout(`${tag} after a turn`);
      });
    }
    await session(prof, P, `hour=${hour}&bseed=1,2,3,4`, async ({ tap, waitCmds, layout, axe }) => {
      await waitCmds(); await layout(`h${hour} old default screen commands`); await axe(`h${hour} old default screen commands`);
      await tap('#b-cmds .b-cmd[data-i="0"]'); await layout(`h${hour} old default screen skills`);
    }, 'default');
  }
  if (prof === 'pixel7' || prof === 'phone3x' || prof === 'iphone15') return;
  // 3) trainer: retreat refused, fight to the end (2 foes, forced foe switch)
  await session(prof, P, 'trainer=1&bseed=5,6,7,8', async ({ page, tap, tapMsg, state, waitCmds, shot, cmdsHidden, layout }) => {
    let laidOut = false;
    let s = await waitCmds(); await tap('#b-cmds .b-cmd[data-i="3"]'); s = await state();
    check(prof, 'trainer: retreat refused with the trainer line', /No walking away/.test(s.msg) && s.cmds?.length === 4, s.msg);
    let n = 0, sawSend = false, menuDuringMsg = 0;
    while (n++ < 60) {
      s = await state(); if (!s.open) break;
      if (/sends out/.test(s.msg)) sawSend = true;
      if (s.cmds?.length === 4 && /Skills/.test(s.cmds[0])) { await tap('#b-cmds .b-cmd[data-i="0"]'); await tap('#b-cmds .b-cmd[data-i="0"]'); if ((await state()).modal) await tap('.ui-modal [data-m="0"]'); }
      else if (s.cmds) await tap('#b-cmds .b-cmd:not([style*="opacity"])');
      const t0 = Date.now(); while (Date.now() - t0 < 20000) { const q = await state(); if (/sends out/.test(q.msg)) { sawSend = true; if (!(await cmdsHidden())) menuDuringMsg++; await shot('08_trainer_send'); } if (!q.open || q.cmds) break; if (q.more) await tapMsg(); await sleep(100); }
      if (sawSend && !laidOut && (await state()).cmds) { laidOut = true; await layout('trainer: after the foe switch'); }
    }
    const r = await lastBattle(page); check(prof, 'full trainer battle ends with win/lose', !!r && ['win', 'lose'].includes(r.outcome), JSON.stringify(r));
    check(prof, 'trainer sent out its second creature (forced switch) or lost first', sawSend || r?.outcome === 'lose');
    check(prof, 'command menu stays hidden while the "sends out" message plays', menuDuringMsg === 0, `visible ${menuDuringMsg}x`);
  });
}

for (const p of (process.env.PROFILES || 'desktop,pixel7,iphone14,iphone15,phone3x').split(',')) await run(p);
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify({ results, fails }, null, 1));
console.log(`\n${results.length - fails}/${results.length} passed`);
process.exit(fails ? 1 : 0);
