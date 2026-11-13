// Forced switch + model swap e2e (Oct 23, 2026; Gary 3:16 / 3:17 PM CT). Real systems (no uidemo), nothing saved (?save=0).
// 1) 3-creature party vs a Lv.40 wild: each faint shows "Who goes in next?" listing only creatures that can fight, Back/Escape can't
//    leave it, a pick sends that one in; the last faint ends the battle as a loss -> blackout. PC (click) and phone (touch).
// 2) Empty real party: the fallback Rillop joins the real party, a catch is appended, and the next battle still leads with Rillop.
// Usage: PORT=8097 [OUT=shots/capture_fade_fix] node tests/battle_faint_switch_e2e.mjs
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.resolve(ROOT, process.env.OUT || 'shots/capture_fade_fix'); fs.mkdirSync(OUT, { recursive: true });
const URL0 = `http://127.0.0.1:${process.env.PORT || 8097}/index.html?save=0&clouds=0&life=0&map=brookhollow`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const check = (n, ok, info = '') => { console.log(`${ok ? 'PASS' : 'FAIL'} ${n}${info ? ` - ${info}` : ''}`); if (!ok) fails++; };
const state = (page) => page.evaluate(() => { const c = document.querySelector('#b-cmds'), m = document.querySelector('#b-msg');
  return { open: !!c, cmds: !!(c && !c.hidden && c.querySelector('.b-cmd')), more: !!m?.querySelector('.more'), msg: m?.textContent || '', items: c ? [...c.querySelectorAll('.b-cmd')].map((e) => e.textContent) : [],
    p1: document.querySelector('#plate-p1 .name, #plate-p1')?.textContent.replace(/\s+/g, ' ').trim() }; });
async function open(prof) {
  const browser = await chromium.launch(); const ctx = await browser.newContext(prof === 'phone' ? { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true } : { viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(`${URL0}&platform=${prof === 'phone' ? 'mobile' : 'pc'}`); await page.waitForFunction(() => window.kilumen?.ui && window.kilumen.scene?.systems, null, { timeout: 30000 }); await sleep(1000);
  const tap = async (sel) => { const el = page.locator(sel).first(); if (prof === 'phone') await el.tap({ timeout: 3000 }).catch(() => {}); else await el.click({ timeout: 3000 }).catch(() => {}); /* the screen may close mid-tap (blackout) */ };
  return { browser, page, errs, tap };
}
async function faintRun(prof) {
  const { browser, page, errs, tap } = await open(prof); const tag = `faint_${prof}`;
  try {
    await page.evaluate(() => { const sc = window.kilumen.scene; sc.party = [{ species: 'rillop', level: 5 }, { species: 'cindrip', level: 5 }, { species: 'nibbin', level: 5 }]; void sc.systems.party.list;
      window.__blackout = 0; const h = sc.systems.heal, f = h.blackout.bind(h); h.blackout = (...a) => { window.__blackout++; return f(...a); }; window.kilumen.ui.open('battle', { foe: 'burlbeetle', foeLevel: 40 }); });
    let pickers = 0, shot = false;
    for (let n = 0; n < 400; n++) {
      const s = await state(page); if (!s.open) break;
      if (s.more) { await tap('#b-msg'); await sleep(150); continue; }
      if (!s.cmds) { await sleep(150); continue; }
      if (/Who goes in next/.test(s.msg)) {
        pickers++; check(`${tag} picker ${pickers}: only creatures that can fight`, s.items.length === 3 - pickers && s.items.every((t) => /HP [1-9]/.test(t)) && !s.items.some((t) => /Out cold/.test(t)), s.items.join(' / '));
        if (!shot) { await page.screenshot({ path: path.join(OUT, `${tag}_switch_picker.png`) }); shot = true; }
        await page.keyboard.press('Escape'); await page.keyboard.press('Backspace'); await sleep(250); const s2 = await state(page);
        check(`${tag} picker ${pickers}: Back does not leave it`, /Who goes in next/.test(s2.msg), s2.msg);
        const pick = s.items[s.items.length - 1].split(' Lv.')[0]; await sleep(400); await tap(`#b-cmds .b-cmd[data-i="${s.items.length - 1}"]`); await sleep(400);
        for (let k = 0; k < 40; k++) { const s3 = await state(page); if (/What will/.test(s3.msg)) { check(`${tag} picker ${pickers}: ${pick} sent in, battle goes on`, s3.msg.includes(pick), s3.msg); break; } if (s3.more) await tap('#b-msg'); await sleep(200); }
        continue;
      }
      if (/What will/.test(s.msg)) { await tap('#b-cmds .b-cmd[data-i="0"]'); await sleep(300); await tap('#b-cmds .b-cmd[data-i="0"]'); await sleep(300); continue; }
      await sleep(150);
    }
    await sleep(2500);
    const end = await page.evaluate(() => ({ outcome: window.kilumen.ui.lastBattle?.outcome, sys: window.kilumen.ui.lastBattle?.systems, blackout: window.__blackout }));
    check(`${tag} 2 pickers then all out cold -> loss + blackout`, pickers === 2 && end.outcome === 'lose' && end.sys === 'blackout' && end.blackout >= 1, JSON.stringify({ pickers, ...end }));
    check(`${tag} no page errors`, !errs.length, errs.join(' | '));
  } finally { await browser.close(); }
}
async function swapRun() {
  const { browser, page, errs } = await open('pc'); const tag = 'model_swap';
  try {
    await page.evaluate(() => { window.kilumen.scene.party = []; window.kilumen.scene.systems.bag.add('dominance_crystal', 3); });
    const battle = async (o, act) => { await page.evaluate((o) => { window.kilumen.ui.closeAll(); window.kilumen.ui.open('battle', o); }, o);
      for (let n = 0; n < 200; n++) { const s = await state(page); if (!s.open) return null; if (s.more) { await page.click('#b-msg'); await sleep(150); continue; }
        if (s.cmds && /What will/.test(s.msg)) { if (!act) return s; await act(s); act = null; } await sleep(200); } return null; };
    const crystal = async () => { await page.click('#b-cmds .b-cmd[data-i="1"]'); await sleep(250); const i = await page.evaluate(() => [...document.querySelectorAll('#b-cmds .b-cmd')].findIndex((e) => /Crystal/.test(e.textContent))); await page.click(`#b-cmds .b-cmd[data-i="${i}"]`); };
    // failed capture: the player's creature, name and HP stay
    let before = null;
    await page.evaluate(() => window.kilumen.ui.open('battle', { foe: 'tumbloam', foeLevel: 3, forceChance: false }));
    for (let n = 0; n < 200; n++) { const s = await state(page); if (s.more) { await page.click('#b-msg'); await sleep(150); continue; } if (s.cmds && /What will/.test(s.msg)) { before = s.p1; break; } await sleep(200); }
    await crystal(); await page.waitForFunction(() => /broke free/.test(document.querySelector('#b-msg')?.textContent || ''), null, { timeout: 20000 }); await sleep(600);
    const after = await page.evaluate(() => ({ p1: document.querySelector('#plate-p1')?.textContent.replace(/\s+/g, ' ').trim(), src: document.querySelector('#p1-mon').src.split('/').pop(), op: getComputedStyle(document.querySelector('#p1-mon')).opacity, party: window.kilumen.scene.party.map((c) => c.species) }));
    check(`${tag} failed capture: player creature unchanged`, /Rillop/.test(after.p1) && /^rillop_back/.test(after.src) && after.op === '1' && after.p1.split(' HP')[0] === before.split(' HP')[0] && after.party.join() === 'rillop', JSON.stringify({ before, after }));
    await page.screenshot({ path: path.join(OUT, `${tag}_failed_capture.png`) });
    // successful capture in a new battle -> party [rillop, tumbloam]; the next battle leads with Rillop
    await battle({ foe: 'tumbloam', foeLevel: 3, forceChance: true }, crystal); await sleep(9000);
    const party = await page.evaluate(() => window.kilumen.scene.party.map((c) => c.species));
    check(`${tag} caught: party is rillop + tumbloam`, party.join() === 'rillop,tumbloam', party.join());
    const s = await battle({ foe: 'tumbloam', foeLevel: 2 }, null);
    const src = await page.evaluate(() => document.querySelector('#p1-mon').src.split('/').pop());
    check(`${tag} next battle: Rillop still leads`, /Rillop/.test(s?.msg || '') && /^rillop_back/.test(src), `${s?.msg} ${src}`);
    await page.screenshot({ path: path.join(OUT, `${tag}_next_battle.png`) });
    check(`${tag} no page errors`, !errs.length, errs.join(' | '));
  } finally { await browser.close(); }
}
await faintRun('pc'); await faintRun('phone'); await swapRun();
console.log(fails ? `${fails} FAIL` : 'ALL PASS'); process.exit(fails ? 1 : 0);
