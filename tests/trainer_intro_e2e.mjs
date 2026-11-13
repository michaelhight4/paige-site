// Trainer intro + facing + team crystal pips e2e (Oct 23, 2026; Gary 3:21-3:23 PM CT). Real systems, nothing saved (?save=0).
// Trainer battle (route1.trainer_r1_d) with a Tumbloam lead: intro shows both trainers, '<trainer> wants to battle!' and two
// 6-slot crystal rows; after send-out the foe trainer stays aside, the player's trainer is gone, the Tumbloam back sprite is
// mirrored to face the foe, the trainer name + pip rows sit on the cards. Wild: no intro, no trainer, no foe pips. PC + phone.
// Usage: PORT=8097 [OUT=shots/capture_fade_fix] node tests/trainer_intro_e2e.mjs
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.resolve(ROOT, process.env.OUT || 'shots/capture_fade_fix'); fs.mkdirSync(OUT, { recursive: true });
const URL0 = `http://127.0.0.1:${process.env.PORT || 8097}/index.html?save=0&clouds=0&life=0&map=route1`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const check = (n, ok, info = '') => { console.log(`${ok ? 'PASS' : 'FAIL'} ${n}${info ? ` - ${info}` : ''}`); if (!ok) fails++; };
const until = async (page, fn, ms = 15000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await page.evaluate(fn)) return true; await sleep(150); } return false; };
for (const prof of ['pc', 'phone']) {
  const browser = await chromium.launch(); const ctx = await browser.newContext(prof === 'phone' ? { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true } : { viewport: { width: 1366, height: 768 } });
  await ctx.addInitScript(() => { try { localStorage.setItem('kilumen_alpha_notice_seen.v1', '1'); } catch { /* private mode */ } }); // release: skip the alpha notice
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', (e) => errs.push(String(e)));
  try {
    await page.goto(`${URL0}&platform=${prof === 'phone' ? 'mobile' : 'pc'}`); await page.waitForFunction(() => window.kilumen?.ui && window.kilumen.scene?.systems, null, { timeout: 30000 }); await sleep(1000);
    for (let k = 0; k < 3; k++) { const m = page.locator('.ui-modal button').first(); if (!(await m.count())) break; await m.click().catch(() => {}); await sleep(400); } // release: alpha notice
    await page.evaluate(() => { const sc = window.kilumen.scene; sc.party = [{ species: 'tumbloam', level: 6 }, { species: 'cindrip', level: 5 }, { species: 'nibbin', level: 5 }]; void sc.systems.party.list;
      window.kilumen.ui.open('battle', { trainer: true, who: { map: 'route1', id: 'trainer_r1_d' } }); });
    check(`${prof} intro message`, await until(page, () => /wants to battle/.test(document.querySelector('#b-msg')?.textContent || '')));
    await sleep(700);
    const a = await page.evaluate(() => { const f = (id) => { const e = document.getElementById(id); return e && !e.hidden && e.naturalWidth > 0; };
      return { foeFig: f('tr-p2'), allyFig: f('tr-p1'), msg: document.querySelector('#b-msg').textContent, r2: document.querySelectorAll('#intro-p2 i').length, r1: document.querySelectorAll('#intro-p1 i').length,
        filled2: document.querySelectorAll('#intro-p2 i[data-st=ok]').length, filled1: document.querySelectorAll('#intro-p1 i[data-st=ok]').length, empty1: document.querySelectorAll('#intro-p1 i[data-st=empty]').length }; });
    check(`${prof} intro: both trainer sprites, 6-slot rows`, a.foeFig && a.allyFig && a.r1 === 6 && a.r2 === 6 && a.filled1 === 3 && a.empty1 === 3 && a.filled2 >= 1, JSON.stringify(a));
    await page.screenshot({ path: path.join(OUT, `trainer_intro_${prof}.png`) });
    await page.locator('#b-msg').first().click();
    for (let n = 0; n < 60; n++) { const st = await page.evaluate(() => ({ cmds: !!document.querySelector('#b-cmds:not([hidden]) .b-cmd'), more: !!document.querySelector('#b-msg .more') }));
      if (st.cmds) break; if (st.more) await page.locator('#b-msg').first().click(); await sleep(200); }
    await sleep(600);
    const b = await page.evaluate(() => { const r = (s) => document.querySelector(s)?.getBoundingClientRect(); const box = (s) => { const x = r(s); return x && { l: Math.round(x.left), t: Math.round(x.top), r: Math.round(x.right), b: Math.round(x.bottom) }; };
      const p1 = document.querySelector('#p1-mon');
      return { aside: document.querySelector('#tr-p2')?.classList.contains('aside') && !document.querySelector('#tr-p2').hidden, allyGone: document.querySelector('#tr-p1')?.hidden, flip: p1.classList.contains('b-flip'), scale: getComputedStyle(p1).scale,
        name: document.querySelector('#p2-trname')?.textContent, pips2: document.querySelectorAll('#p2-party i').length, pips1: document.querySelectorAll('#p1-party i').length,
        boxes: { p2party: box('#p2-party'), p1party: box('#p1-party'), p1mon: box('#p1-mon'), p2mon: box('#p2-mon'), cmds: box('#b-cmds'), fig: box('#tr-p2'), vw: innerWidth, vh: innerHeight } }; });
    const B = b.boxes, hit = (x, y) => x && y && x.l < y.r && y.l < x.r && x.t < y.b && y.t < x.b, inV = (x) => x && x.l >= 0 && x.t >= 0 && x.r <= B.vw && x.b <= B.vh;
    check(`${prof} after send-out: foe trainer stays aside, player trainer gone`, b.aside && b.allyGone, JSON.stringify(b));
    check(`${prof} Tumbloam back sprite mirrored to face the foe`, b.flip && /^-1/.test(b.scale), b.scale);
    check(`${prof} trainer name + pip rows`, /Lab Intern Odette/.test(b.name) && b.pips2 >= 1 && b.pips1 === 3, `${b.name} ${b.pips2}/${b.pips1}`);
    check(`${prof} pip rows on screen, clear of sprites and menu`, inV(B.p2party) && inV(B.p1party) && !hit(B.p2party, B.p2mon) && !hit(B.p1party, B.p1mon) && !hit(B.p1party, B.cmds) && !hit(B.p2party, B.p1mon), JSON.stringify(B));
    const tp = await page.evaluate(() => { const b = (s) => { const x = document.querySelector(s)?.getBoundingClientRect(); return x && { l: x.left, t: x.top, r: x.right, b: x.bottom }; };
      return { spot: !document.querySelector('#tr-spot')?.hidden, fig: b('#tr-p2'), plat: b('.b-tr-plat'), foePlat: b('#p2-plat'), mon: b('#p2-mon'), panel: b('#plate-p2'), pips: b('#p2-party'), vw: innerWidth, vh: innerHeight }; });
    const ov = (x, y) => x && y && x.l < y.r - 1 && y.l < x.r - 1 && x.t < y.b - 1 && y.t < x.b - 1, on = (x) => x && x.l >= 0 && x.r <= tp.vw && x.t >= 0 && x.b <= tp.vh;
    check(`${prof} trainer on own platform beside the creature's, on screen, clear of creature/panel/crystals`, tp.spot && on(tp.fig) && on(tp.plat) && tp.plat.l > tp.foePlat.r && Math.abs((tp.plat.t + tp.plat.b) / 2 - (tp.foePlat.t + tp.foePlat.b) / 2) < 6
      && !ov(tp.fig, tp.panel) && !ov(tp.fig, tp.pips) && tp.fig.l >= tp.foePlat.r - 2, JSON.stringify(tp));
    await page.screenshot({ path: path.join(OUT, `trainer_battle_${prof}.png`) });
    await page.evaluate(() => document.querySelector('#p1-mon').classList.remove('b-flip')); await sleep(100);
    await page.screenshot({ path: path.join(OUT, `facing_before_trainer_${prof}.png`) });
    await page.evaluate(() => document.querySelector('#p1-mon').classList.add('b-flip'));
    await page.evaluate(() => { window.kilumen.ui.close?.(); }); await sleep(500);
    await page.evaluate(() => { window.kilumen.ui.closeAll?.(); window.kilumen.ui.open('battle', { foe: 'glintfly', foeLevel: 3 }); });
    await until(page, () => !!document.querySelector('#p2-mon') && document.querySelector('#p2-mon').style.opacity === '1');
    await sleep(500);
    const w = await page.evaluate(() => ({ intro: document.querySelector('.ui-battle')?.classList.contains('b-intro'), figs: document.querySelectorAll('.b-trainer-fig').length, foePips: !!document.querySelector('#p2-party'), name: !!document.querySelector('#p2-trname'), p1pips: !!document.querySelector('#p1-party') }));
    check(`${prof} wild: no intro, no trainer, no foe pips or name`, !w.intro && !w.figs && !w.foePips && !w.name && w.p1pips, JSON.stringify(w));
    if (prof === 'pc') await page.screenshot({ path: path.join(OUT, 'wild_battle_pc.png') });
    check(`${prof} no page errors`, !errs.length, errs.join(' | '));
  } catch (e) { check(`${prof} run`, false, String(e)); }
  await browser.close();
}
console.log(fails ? `${fails} FAIL` : 'ALL PASS'); process.exit(fails ? 1 : 0);
