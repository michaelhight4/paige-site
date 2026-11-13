// Company voice (RITA) region 1 release smoke (Oct 23, 2026; DEV). Default ON, no ?cv flag.
// PC 1920x1080 + phone 844x390: new game -> real opening (Enter on PC, taps on phone; map hops between steps are
// startWarp dev shortcuts, as in home_start_shots.mjs) -> starter -> RITA's promotion line -> a real wild battle on
// Trail 1 (?encrate=1) -> crystal until caught -> RITA's first-catch line. A rAF sampler flags any frame where the strip
// is shown while a script / dialogue / fade / battle or menu is up. Then ?cv=0: no strip, no companyVoice.
// Usage: node tests/company_voice_r1_smoke.mjs -> shots/company_voice_r1/*.png + report.json
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'shots/company_voice_r1');
fs.mkdirSync(OUT, { recursive: true });
const PORT = await new Promise((res) => { const sv = net.createServer(); sv.listen(0, '127.0.0.1', () => { const p = sv.address().port; sv.close(() => res(p)); }); });
const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
const base = `http://127.0.0.1:${PORT}/index.html`;
for (let i = 0; i < 50; i++) { try { if ((await fetch(base)).ok) break; } catch {} await new Promise((r) => setTimeout(r, 100)); }

const VIEWS = [
  { plat: 'pc', w: 1920, h: 1080, dpr: 1, touch: false },
  { plat: 'phone', w: 844, h: 390, dpr: 2, touch: true },
];
const BLOCKED = /\bPP\b|shiny|super effective|Pok[eé] ?dex|Pok[eé] ?Ball|Gotcha|nurse|\bweed\b|\broutes?\b|\bthrow/i;
const ONLY = process.env.VIEW || ''; // e.g. VIEW=phone
const results = []; let fails = 0;
const check = (view, name, pass, info = '') => { results.push(`${pass ? 'PASS' : 'FAIL'} [${view}] ${name}${info ? ` - ${info}` : ''}`); if (!pass) fails++; console.log(results.at(-1)); };
const browser = await chromium.launch({ args: ['--disable-dev-shm-usage'] });
const report = [];
try {
  for (const v of VIEWS.filter((x) => !ONLY || x.plat === ONLY)) {
    const ctx = await browser.newContext({ viewport: { width: v.w, height: v.h }, deviceScaleFactor: v.dpr, hasTouch: v.touch, isMobile: v.touch });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => { if (m.type() === 'error' && !/status of 404/.test(m.text())) errors.push(m.text()); });
    const S = (fn, arg) => page.evaluate(fn, arg);
    const shot = async (label) => { const file = `${v.plat}_${v.w}x${v.h}_${label}.png`; await page.screenshot({ path: path.join(OUT, file) }); results.push(`shot shots/company_voice_r1/${file}`); return file; };
    const idle = () => page.waitForFunction(() => { const s = window.kilumen.scene; return !s.busy && !s.fade && !s.dialog?.active; }, null, { timeout: 20000 });
    const dlg = () => page.waitForFunction(() => window.kilumen.scene.dialog?.active, null, { timeout: 20000 }).then(() => page.waitForTimeout(900));
    const press = async () => { if (v.touch) await page.tap('.dlg-box').catch(() => {}); else await page.keyboard.press('Enter'); await page.waitForTimeout(v.touch ? 350 : 250); };
    const finish = async () => { for (let i = 0; i < 60 && (await S(() => window.kilumen.scene.dialog?.active)); i++) await press(); await idle(); };
    const choose = async (k) => { if (v.touch) await page.tap(`.dlg-box li[data-i="${k}"]`); else { for (let i = 0; i < k; i++) await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter'); } await page.waitForTimeout(400); };
    const warpTo = async (sp) => { await S((sp) => window.kilumen.scene.startWarp(sp, 'door'), sp); await page.waitForTimeout(200); await idle(); await page.waitForTimeout(500); };
    const warpBy = (to) => S((to) => { const w = window.kilumen.scene.map.warps.find((x) => x.to === to); return { map: w.to, x: w.tx, y: w.ty, facing: w.facing || 'down' }; }, to);
    const key = async (k) => { await page.keyboard.down(k); await page.waitForTimeout(90); await page.keyboard.up(k); };
    const place = (x, y, f) => S(([x, y, f]) => window.kilumen.scene.player.place(x, y, f), [x, y, f]);
    const tapSel = async (sel) => { const el = page.locator(sel).first(); await el.waitFor({ state: 'visible', timeout: 15000 }); if (v.touch) await el.tap(); else await el.click(); };

    await page.goto(`${base}?save=0&audio=0&online=0&hour=12&timescale=0&encrate=1`);
    await page.waitForFunction(() => window.kilumen && window.kilumen.scene && window.kilumen.scene.tileset, null, { timeout: 20000 });
    // strip-vs-blocker sampler (every animation frame): shown strip while something else owns the screen
    await S(() => {
      const w = window; w.__cv = { bad: [], frames: 0, shownFrames: 0, blockedFrames: 0, run: 0 };
      const f = () => {
        const s = w.kilumen.scene, el = document.querySelector('.cv-strip'), ui = w.kilumen.ui;
        const shown = !!el && !el.hidden && el.classList.contains('show');
        const why = s.busy ? 'script' : s.dialog?.active ? 'dialogue' : s.fade ? 'fade' : ui?.active ? 'ui' : s.intro?.picker?.active ? 'picker' : null;
        w.__cv.frames++; if (shown) w.__cv.shownFrames++; if (why) w.__cv.blockedFrames++;
        // one frame of overlap is the tick that sees the blocker and hides; 3+ in a row = a real overlap
        if (shown && why) { if (++w.__cv.run >= 3) w.__cv.bad.push({ why, t: Math.round(performance.now()), text: el.textContent.slice(0, 80) }); } else w.__cv.run = 0;
        requestAnimationFrame(f);
      };
      requestAnimationFrame(f);
    });
    const cvOn = await S(() => !!window.kilumen.companyVoice);
    check(v.plat, 'company voice attached with no ?cv flag (default on)', cvOn);

    // 1) wake-up -> downstairs -> Ron's briefing -> outside
    await dlg(); await finish();
    await warpTo(await warpBy('house_1f'));
    const ron = await S(() => { const s = window.kilumen.scene, o = s.npcs?.list?.find?.((n) => n.def?.id === 'ron') || null; const d = s.map.npcs.find((n) => n.id === 'ron'); return { x: o?.x ?? d.x, y: o?.y ?? d.y }; });
    await S(([x, y]) => { const s = window.kilumen.scene, sides = [[0, 1, 'up'], [-1, 0, 'right'], [1, 0, 'left'], [0, -1, 'down']]; for (const [dx, dy, f] of sides) { const c = s.map.code(x + dx, y + dy); if (c === 0 || c === undefined) { s.player.place(x + dx, y + dy, f); return; } } s.player.place(x, y + 1, 'up'); }, [ron.x, ron.y]);
    await S(() => { const s = window.kilumen.scene; s.interact(); if (!s.busy) s.talk(null, s.map.npcs.find((n) => n.id === 'ron')); });
    await dlg(); await finish(); await page.waitForTimeout(300);
    const door = await S(() => window.kilumen.scene.map.warps.find((w) => w.to === 'brookhollow'));
    await place(door.x, door.y - 1, 'down');
    await S(() => { const s = window.kilumen.scene; s.player._attempt('down', s.worldApi(), []); });
    await page.waitForTimeout(400); await idle(); await page.waitForTimeout(600);

    // 2) office: manager -> promotion scene -> lab -> starter intro
    await warpTo(await warpBy('office_int'));
    const mgr = await S(() => window.kilumen.scene.map.npcs.find((n) => n.id === 'manager'));
    await S(([x, y]) => { const s = window.kilumen.scene; s.player.place(x, y + 1, 'up'); s.interact(); if (!s.busy) s.talk(null, s.map.npcs.find((n) => n.id === 'manager')); }, [mgr.x, mgr.y]);
    await dlg();
    for (let i = 0; i < 160; i++) {
      const st = await S(() => ({ a: !!window.kilumen.scene.dialog?.active, map: window.kilumen.scene.map.name }));
      if (st.a && st.map === 'lab_brookhollow') break;
      if (st.a) await press(); else await page.waitForTimeout(100);
    }
    await page.waitForTimeout(1200); await finish(); await page.waitForTimeout(400);
    const preStarter = await S(() => ({ shown: window.kilumen.companyVoice.shownLog.length, started: window.kilumen.companyVoice.started() }));
    check(v.plat, 'RITA silent before the starter', preStarter.shown === 0 && !preStarter.started, JSON.stringify(preStarter));

    // 3) cradle -> picker -> confirm -> starter_after (got_starter) -> test run brief
    const cr = await S(() => window.kilumen.scene.map.json.text_pending.interact_spots.find((c) => c.id === 'cradle_1'));
    await S(([x, y]) => { const s = window.kilumen.scene; s.player.place(x, y, 'up'); s.interact(); }, cr.stand);
    await page.waitForFunction(() => window.kilumen.scene.intro?.picker?.active, null, { timeout: 8000 }); await page.waitForTimeout(700);
    if (v.touch) { await page.tap('.sp-tab[data-i="1"]'); await page.waitForTimeout(400); await page.tap('.sp-tab[data-i="1"]'); }
    else { await key('Enter'); }
    await dlg(); await page.waitForTimeout(300); await choose(0);
    await dlg(); await finish(); await page.waitForTimeout(300);
    // 4) the promotion line (held until got_starter, shown once the starter scenes end + burst window)
    await page.waitForFunction(() => !!window.kilumen.companyVoice.current, null, { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(600);
    const promo = await S(() => { const cv = window.kilumen.companyVoice; return { event: cv.current?.name, key: cv.current?.ctx?.key, text: document.querySelector('.cv-strip')?.textContent || '', log: cv.shownLog.map((x) => x.name) }; });
    check(v.plat, 'promotion line shows after the starter (quest_done mq_brookhollow_promotion)', promo.event === 'quest_done' && promo.key === 'mq_brookhollow_promotion', JSON.stringify(promo));
    check(v.plat, 'promotion line: no blocked words', !BLOCKED.test(promo.text), promo.text);
    report.push({ view: v.plat, promotion: promo });
    await shot('1_promotion_line');
    // dismiss: PC = F (A), phone = tap the strip
    if (v.touch) await page.locator('.cv-strip').tap().catch(() => {}); else await key('KeyF');
    await page.waitForTimeout(400);
    if (await S(() => !!window.kilumen.companyVoice.current)) await S(() => window.kilumen.companyVoice.advance('smoke'));
    await page.waitForFunction(() => !window.kilumen.companyVoice.current, null, { timeout: 15000 }).catch(() => {});

    // 5) Trail 1 by the real north exit, then a real wild battle in the grass (?encrate=1)
    await warpTo(await warpBy('brookhollow'));
    await S(() => { const s = window.kilumen.scene, e = s.map.exits.find((x) => x.to === 'route1');
      if (e && s.map.isWalkable(e.start, 0)) { s.player.place(e.start, 0, 'up'); s.player._attempt('up', s.worldApi(), []); } else s.startWarp({ map: 'route1', x: 20, y: 30, facing: 'up' }, 'door'); });
    await page.waitForTimeout(300); await idle(); await page.waitForTimeout(800);
    // the area_new line for Trail 1 (if it queued) - let it play out / dismiss it so the next line is the catch
    for (let i = 0; i < 30 && (await S(() => !!window.kilumen.companyVoice.current || window.kilumen.companyVoice.queue.length || window.kilumen.companyVoice.burst.length)); i++) {
      await S(() => window.kilumen.companyVoice.current && window.kilumen.companyVoice.advance('smoke')); await page.waitForTimeout(500);
    }
    const areaLog = await S(() => window.kilumen.companyVoice.shownLog.map((x) => [x.name, x.pages[0]]));
    const bagInfo = await S(() => { const s = window.kilumen.scene, b = s.systems?.bag; return { crystals: b?.count?.('dominance_crystal'), items: b?.list?.() ?? b?.items ?? null, flags: [...s.flags].filter((f) => /test_run|starter|promoted/.test(f)) }; });
    console.log('bag before Trail 1 battles', v.plat, JSON.stringify(bagInfo).slice(0, 400)); report.push({ view: v.plat, bagInfo });
    let caught = false, battles = 0;
    for (let round = 0; round < 8 && !caught; round++) {
      await S(() => window.kilumen.ui.wild?.ready);
      const spot = await S(() => { const s = window.kilumen.scene, m = s.map, D = [[0, 1, 'up'], [0, -1, 'down'], [1, 0, 'left'], [-1, 0, 'right']], px = s.player.x, py = s.player.y; let best = null;
        for (let y = 1; y < m.height - 1; y++) for (let x = 1; x < m.width - 1; x++) { if (!m.encounter(x, y)) continue;
          for (const [dx, dy, f] of D) { const nx = x + dx, ny = y + dy; if (!m.isWalkable(nx, ny) || m.encounter(nx, ny)) continue; const d = Math.abs(nx - px) + Math.abs(ny - py); if (!best || d < best.d) best = { x: nx, y: ny, f, d }; } }
        return best; });
      if (!spot) { check(v.plat, 'found a grass tile on Trail 1', false); break; }
      const dir = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' }[spot.f];
      const back = { up: 'ArrowDown', down: 'ArrowUp', left: 'ArrowRight', right: 'ArrowLeft' }[spot.f];
      await place(spot.x, spot.y, spot.f); await page.waitForTimeout(300);
      for (let k = 0; k < 12 && !(await S(() => window.kilumen.ui.active)); k++) {
        if (v.touch) await S(([d]) => { const s = window.kilumen.scene; s.player._attempt(d, s.worldApi(), []); }, [k % 2 ? { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' }[back] : spot.f]);
        else await key(k % 2 ? back : dir);
        await page.waitForTimeout(450);
      }
      if (!(await S(() => window.kilumen.ui.active))) continue;
      battles++;
      await S(() => { window.__msgs = []; new MutationObserver(() => { const t = document.querySelector('#b-msg')?.textContent; if (t && window.__msgs.at(-1) !== t) window.__msgs.push(t); }).observe(document.body, { subtree: true, childList: true, characterData: true }); });
      // in battle: Pack -> crystal until it ends
      for (let turn = 0; turn < 40; turn++) {
        let cmds = null;
        for (let k = 0; k < 160; k++) {
          const st = await S(() => { const c = document.querySelector('#b-cmds'), m = document.querySelector('#b-msg'); return { open: !!window.kilumen.ui.active, cmds: c && !c.hidden ? [...c.querySelectorAll('.b-cmd')].map((e) => e.textContent) : null, more: !!m?.querySelector('.more'), msg: m?.textContent || '' }; });
          if (!st.open) break;
          if (st.cmds?.length) { cmds = st.cmds; break; }
          if (st.more) await tapSel('#b-msg').catch(() => {}); // only on the ▼ prompt (never mid capture)
          await page.waitForTimeout(150);
        }
        if (!cmds) break;
        if (cmds.some((t) => /Crystal/.test(t))) { const ci = cmds.findIndex((t) => /Crystal/.test(t)); await tapSel(`#b-cmds .b-cmd[data-i="${ci}"]`); }
        else if (/Skills/.test(cmds[0])) { await tapSel('#b-cmds .b-cmd[data-i="1"]'); await page.waitForTimeout(300); if (/Nothing in the Pack/.test(await S(() => document.querySelector('#b-msg')?.textContent || ''))) { console.log('pack empty (all crystals used this battle), retreating; engine bag', JSON.stringify(await S(() => window.kilumen.ui.currentBattle?.request().bag))); await tapSel('#b-cmds .b-cmd[data-i="3"]').catch(() => {}); continue; } } // Pack; empty: Retreat (the catch net refills between battles)
        else await tapSel('#b-cmds .b-cmd[data-i="0"]');
        await page.waitForTimeout(400);
      }
      await page.waitForFunction(() => !window.kilumen.ui.active, null, { timeout: 20000 }).catch(() => {});
      await page.waitForTimeout(500);
      const msgs = await S(() => window.__msgs || []); report.push({ view: v.plat, battle: battles, msgs: msgs.slice(-12) }); console.log('battle', battles, JSON.stringify(msgs.slice(-8)));
      caught = await S(() => window.kilumen.scene.systems.party.list?.length > 1 || (window.kilumen.scene.party?.length || 0) > 1);
    }
    check(v.plat, 'caught one in a real wild battle', caught, `battles=${battles}`);
    // test-run thought etc.
    if (await S(() => window.kilumen.scene.dialog?.active)) await finish().catch((e) => console.log("finish after battles:", e.message.split("\n")[0]));
    await page.waitForFunction(() => window.kilumen.companyVoice.current?.name === 'first_catch' || window.kilumen.companyVoice.shownLog.some((x) => x.name === 'first_catch'), null, { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(600);
    const fc = await S(() => { const cv = window.kilumen.companyVoice; return { event: cv.current?.name || null, text: document.querySelector('.cv-strip')?.textContent || '', log: cv.shownLog.map((x) => [x.name, x.pages[0]]) }; });
    check(v.plat, 'first catch line shows (first_catch)', fc.log.some(([n]) => n === 'first_catch'), JSON.stringify(fc));
    check(v.plat, 'all lines shown: no blocked words', fc.log.every(([, p]) => !BLOCKED.test(p)), JSON.stringify(fc.log));
    report.push({ view: v.plat, firstCatch: fc, areaLog });
    if (fc.event === 'first_catch') await shot('2_first_catch_line');
    await page.waitForTimeout(500);
    const samp = await S(() => window.__cv);
    check(v.plat, 'strip never shown during script / dialogue / fade / battle / menus', samp.bad.length === 0, JSON.stringify({ frames: samp.frames, shownFrames: samp.shownFrames, blockedFrames: samp.blockedFrames, bad: samp.bad.slice(0, 5) }));
    check(v.plat, 'no console errors', !errors.length, [...new Set(errors)].join(' | ').slice(0, 400));
    report.push({ view: v.plat, sampler: { ...samp, bad: samp.bad.slice(0, 10) }, errors });
    await ctx.close();

    // 6) ?cv=0: nothing attaches
    const c2 = await browser.newContext({ viewport: { width: v.w, height: v.h }, deviceScaleFactor: v.dpr, hasTouch: v.touch, isMobile: v.touch });
    const p2 = await c2.newPage(); const e2 = []; p2.on('pageerror', (e) => e2.push(String(e)));
    await p2.goto(`${base}?save=0&skipintro=1&audio=0&online=0&cv=0`);
    await p2.waitForFunction(() => window.kilumen && window.kilumen.scene && window.kilumen.scene.tileset, null, { timeout: 20000 }); await p2.waitForTimeout(2500);
    const off = await p2.evaluate(() => ({ cv: !!window.kilumen.companyVoice, strip: !!document.querySelector('.cv-strip'), fetched: performance.getEntriesByType('resource').some((r) => /company_voice/.test(r.name)) }));
    check(v.plat, '?cv=0: no companyVoice, no strip, nothing fetched', !off.cv && !off.strip && !off.fetched, JSON.stringify(off));
    check(v.plat, '?cv=0: no page errors', !e2.length, e2.join(' | '));
    await c2.close();
  }
} finally { await browser.close(); server.kill(); }
fs.writeFileSync(path.join(OUT, `report${ONLY ? '_' + ONLY : ''}.json`), JSON.stringify({ results, report }, null, 1));
console.log(`\n${results.filter((r) => r.startsWith('PASS')).length} pass, ${fails} fail`);
process.exit(fails ? 1 : 0);
