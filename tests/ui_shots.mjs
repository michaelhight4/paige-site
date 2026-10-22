// 11b: 390px screenshots of the main screens + sheets. node tests/ui_shots.mjs <before|after>
import { open, ok, sleep, ROOT } from './lib.mjs';
import fs from 'node:fs'; import path from 'node:path';
const tag = process.argv[2] || 'after', dir = path.join(ROOT, 'ui_shots', tag); fs.mkdirSync(dir, { recursive: true });
const T = await open({ seed: 9 }); const { page, A } = T;
await A('const s = adapter.impl.s; s.age = 34; s.cash = 2500000; adapter.impl.save(); return 1'); await page.reload(); await page.waitForFunction(() => window.__ready);
const snap = async (n) => { await sleep(600); await page.screenshot({ path: path.join(dir, n + '.png') }); };
const home = async () => { await page.evaluate(async () => (await import('/ui/js/ui.js')).closeHome()); await sleep(300); };
await snap('01_home');
const tabs = await page.$$eval('[data-tab]', (a) => a.map((x) => x.dataset.tab)); let i = 2;
for (const t of tabs) { await home(); await page.click(`[data-tab="${t}"]`); await snap(String(i++).padStart(2, '0') + '_tab_' + t);
  if (t === 'occupation') { const w = await page.$('.panel.top [data-wtab=all]'); if (w) { await w.click(); await snap(String(i++).padStart(2, '0') + '_work_all'); } } }
for (const [el, n] of [['settings-link', 'settings'], ['store-link', 'premium'], ['profile-link', 'profile']]) { await home(); const b = await page.$(`[data-el=${el}]`); if (b) { await b.click(); await snap(String(i++).padStart(2, '0') + '_' + n); } }
await home(); page.evaluate(async () => (await import('/ui/js/ui.js')).askNumber('Add money to company', { max: 2000000 })).catch(() => {}); await sleep(400); await page.fill('[data-input=amount]', '125000').catch(() => {}); await snap(String(i++).padStart(2, '0') + '_sheet_money');
await home(); page.evaluate(async () => (await import('/ui/js/ui.js')).confirmSheet('Sell the car?', 'You get about $12,000.', 'Sell')).catch(() => {}); await snap(String(i++).padStart(2, '0') + '_sheet_confirm');
await home(); await page.click('[data-el=age]').catch(() => {}); await sleep(1200); await snap(String(i++).padStart(2, '0') + '_after_age');
ok('shots written', fs.readdirSync(dir).length >= 8, String(fs.readdirSync(dir).length));
await T.done('ui_shots_' + tag);
