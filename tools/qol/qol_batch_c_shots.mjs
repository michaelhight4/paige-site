// QoL batch C shots (phone + PC): phone menu tiles, storage, summary menu, stats, rename, renew prompt, quick save ok/blocked, chain.
// Static server on :8137 from the repo root. Output: shots/qol_v1/batchC/*.png
import { chromium } from 'playwright';
const base = 'http://localhost:8137/index.html', out = 'shots/qol_v1/batchC/';
const devs = [{ n: 'pc', w: 1366, h: 768, dpr: 1, touch: false }, { n: 'phone', w: 844, h: 390, dpr: 3, touch: true }];
const b = await chromium.launch();
for (const d of devs) {
  const ctx = await b.newContext({ viewport: { width: d.w, height: d.h }, deviceScaleFactor: d.dpr, hasTouch: d.touch, isMobile: d.touch });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message)); const ev = (fn, a) => p.evaluate(fn, a);
  await p.goto(`${base}?save=0&timescale=0&hour=12&title=0&ix2=0&map=route1&x=20&y=24&uidemo=1&qolc=chain`);
  await p.waitForFunction(() => window.kilumen?.qolc?.flags, null, { timeout: 30000 }); await p.waitForTimeout(2500);
  await ev(async () => { const { createCreature } = await import('/src/systems/creature.js'); const sc = window.kilumen.scene;
    sc.party = [{ species: 'rillop', level: 22 }, { species: 'rillop', level: 9, variant: 'large' }].map((x) => createCreature(x)); sc._placeFollower?.(); sc._dirty = true; });
  const shot = async (f) => { await p.waitForTimeout(400); await p.screenshot({ path: `${out}${d.n}_${f}.png` }); };
  await ev(() => { const ui = window.kilumen.ui; ui.closeAll(); ui.open('phone'); }); await ev(() => document.querySelector('[data-app="qolc_storage"]')?.scrollIntoView({ block: 'center' })); await shot('01_phone_menu');
  await ev(() => { const ui = window.kilumen.ui; ui.open('qolc_storage'); }); await shot('02_storage');
  await ev(() => { const ui = window.kilumen.ui; ui.closeAll(); ui.open('summary', 0); }); await p.keyboard.press('Enter'); await shot('03_summary_menu'); for (let k = 0; k < 4 && await ev(() => !!window.kilumen.ui.modal); k++) { await p.keyboard.press('Escape'); await p.waitForTimeout(250); }
  await ev(() => { const ui = window.kilumen.ui; ui.closeAll(); ui.open('qolc_stats', 0); }); await shot('04_stats');
  await ev(() => { window.kilumen.ui.closeAll(); window.kilumen.qolc.rename(0, 'Bubbles'); }); await ev(() => window.kilumen.ui.open('summary', 0)); await shot('05_renamed_summary'); console.log(d.n, 'nick:', await ev(() => window.kilumen.ui.party()[0]?.nickname), await ev(() => [...document.querySelectorAll('.ui-note')].map((n) => n.textContent).join('|')));
  await ev(() => { const q = window.kilumen.qolc, ui = window.kilumen.ui; ui.closeAll(); q.cfg.blockerItems.test_spray = 50; const bag = window.kilumen.scene.systems.bag; bag.has = () => true; bag.count = () => 3; bag.remove = () => true; bag.nameOf = () => 'Calm Spray (test item)'; window.kilumen.scene.systems.state.qolc.blocker.item = 'test_spray'; q.offerRenew(); }); await shot('06_renew_prompt');
  await ev(() => { const ui = window.kilumen.ui; ui.modal?.close?.(); ui.closeAll(); window.kilumen.qolc.quickSave(); }); await shot('07_quick_save_ok');
  const blocked = await ev(() => { const s = window.kilumen.scene; const rel = s.lockSave('cutscene'); const r = window.kilumen.qolc.quickSave(); rel(); return r; }); await shot('08_quick_save_blocked');
  await ev(() => { const ui = window.kilumen.ui; ui.closeAll(); window.kilumen.qolc.chain.record('rillop'); window.kilumen.qolc.chain.record('rillop'); ui.open('qolc_chain'); }); await shot('09_chain');
  console.log(d.n, 'blocked:', JSON.stringify(blocked), 'errors:', errs.length, errs.slice(0, 3).join(' / '));
  await ctx.close();
}
await b.close();
