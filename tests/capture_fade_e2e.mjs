// Capture fade regression (Oct 23, 2026; Gary 3:14 PM CT "after using dominance crystal"): after a FAILED capture
// (forceChance:false) the wild foe sprite must be fully restored (computed opacity 1, no filter, no capture class,
// no inline opacity/filter/transform/visibility). Also checks a successful capture still leaves the foe hidden.
// Runs the art path (default) and the placeholder path (?fxart=0).
// Usage: PORT=8097 [ROOT_DIR=.] [OUT=shots/capture_fade_fix] node tests/capture_fade_e2e.mjs
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.resolve(ROOT, process.env.OUT || 'shots/capture_fade_fix'); fs.mkdirSync(OUT, { recursive: true });
const BASE = `http://127.0.0.1:${process.env.PORT || 8097}/index.html?save=0&clouds=0&life=0&uidemo=1&map=brookhollow&platform=pc`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const check = (n, ok, info = '') => { console.log(`${ok ? 'PASS' : 'FAIL'} ${n}${info ? ` - ${info}` : ''}`); if (!ok) fails++; };
const foeState = (page, sel = '#p2-mon') => page.evaluate((sel) => { const e = document.querySelector(sel), cs = getComputedStyle(e);
  return { op: cs.opacity, filter: cs.filter, vis: cs.visibility, cls: e.className, inl: { opacity: e.style.opacity, filter: e.style.filter, transform: e.style.transform, visibility: e.style.visibility } }; }, sel);
async function run(tag, q, caught) {
  const browser = await chromium.launch(); const page = await (await browser.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(String(e)));
  try {
    await page.goto(BASE + q); await page.waitForFunction(() => window.kilumen?.ui && window.kilumen.scene, null, { timeout: 30000 }); await sleep(900);
    await page.evaluate((ok) => window.kilumen.ui.open('battle', { forceChance: ok }), caught);
    const ready = async () => { for (let n = 0; n < 150; n++) { const s = await page.evaluate(() => { const c = document.querySelector('#b-cmds'), m = document.querySelector('#b-msg');
      return { cmds: !!(c && !c.hidden && c.querySelector('.b-cmd')), more: !!m?.querySelector('.more') }; }); if (s.cmds) return true; if (s.more) await page.click('#b-msg'); await sleep(150); } return false; };
    await ready(); await page.click('#b-cmds .b-cmd[data-i="1"]');
    for (let n = 0; n < 20 && !(await page.$('.ax-catch')); n++) { const i = await page.evaluate(() => [...document.querySelectorAll('#b-cmds .b-cmd')].findIndex((e) => /Crystal/.test(e.textContent)));
      if (i >= 0) { await page.click(`#b-cmds .b-cmd[data-i="${i}"]`); break; } await sleep(100); }
    await page.waitForSelector('.ax-catch', { state: 'attached', timeout: 15000 });
    if (caught) { await page.waitForFunction(() => /with you/.test(document.querySelector('#b-msg')?.textContent || ''), null, { timeout: 20000 });
      const s = await foeState(page); check(`${tag} caught: foe hidden`, s.op === '0', JSON.stringify(s)); await sleep(500);
      const cm = await page.evaluate(() => { const m = document.querySelector('#b-msg'), d = m?.querySelector('.b-caught-mon'); if (!d) return null; const r = d.getBoundingClientRect(), mr = m.getBoundingClientRect(), t = m.firstChild;
        const rg = document.createRange(); rg.selectNodeContents(t); const tr = rg.getBoundingClientRect(); return { below: r.top >= tr.bottom - 1, dx: Math.round((r.left + r.width / 2) - (mr.left + mr.width / 2)), text: m.textContent, bg: d.style.backgroundImage }; });
      check(`${tag} caught: follower sprite centred under the text`, !!cm && cm.below && Math.abs(cm.dx) <= 2 && /is with you now!/.test(cm.text), JSON.stringify(cm));
      await page.screenshot({ path: path.join(OUT, `${tag}_caught_follower_sprite.png`) }); }
    else { await page.waitForFunction(() => /broke free/.test(document.querySelector('#b-msg')?.textContent || ''), null, { timeout: 20000 }); await sleep(400);
      let s = await foeState(page); check(`${tag} broke free: foe restored`, s.op === '1' && s.filter === 'none' && s.vis === 'visible' && !/ax-lit/.test(s.cls) && !s.inl.opacity && !s.inl.filter && !s.inl.transform && !s.inl.visibility, JSON.stringify(s));
      const al = await foeState(page, '#p1-mon'); check(`${tag} broke free: player creature not ghosted`, al.op === '1' && al.filter === 'none' && !al.inl.opacity, JSON.stringify(al));
      await page.screenshot({ path: path.join(OUT, `${tag}_broke_free.png`) });
      await ready(); await sleep(600); s = await foeState(page); check(`${tag} next turn: foe still restored`, s.op === '1' && s.filter === 'none', JSON.stringify(s));
      await page.screenshot({ path: path.join(OUT, `${tag}_next_turn.png`) }); }
    check(`${tag} no page errors`, !errs.length, errs.join(' | '));
  } finally { await browser.close(); }
}
await run('art', '', false); await run('placeholder', '&fxart=0', false); await run('art', '', true);
console.log(fails ? `${fails} FAIL` : 'ALL PASS'); process.exit(fails ? 1 : 0);
