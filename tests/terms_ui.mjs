// One-time Terms/Privacy popup: first launch vs returning player, Start disabled until both required boxes, version bump re-asks,
// a new life does not re-ask, Settings links, terms.html/privacy.html at 390px. node tests/terms_ui.mjs
import { open, ok, sleep } from './lib.mjs';
import { contrastOf } from './contrast_lib.mjs';
const T = await open({ fresh: true, terms: false }); const { page, base } = T;
await page.waitForSelector('[data-el=terms]', { timeout: 20000 });
ok('first launch shows the terms popup', !!(await page.$('[data-el=terms]')));
ok('nothing behind it started yet', !(await page.evaluate(() => window.__ready || window.__startReady)));
const dis = () => page.$eval('[data-el=terms-start]', (b) => b.disabled);
ok('START GAME disabled at first', await dis());
await page.click('label[for=tc-tos]'); ok('still disabled with only ToS', await dis());
await page.click('label[for=tc-news]'); ok('optional box does not enable it', await dis());
await page.click('label[for=tc-privacy]'); ok('enabled once both required are checked', !(await dis()));
await page.click('label[for=tc-tos]'); ok('unchecking a required box disables again', await dis());
ok('View links point at the documents', (await page.$$eval('[data-view]', (a) => a.map((x) => x.getAttribute('href')).join(','))) === 'terms.html,privacy.html');
for (const sel of ['.terms-sheet h3', '.terms-tx', '.terms-tag.t-req', '.terms-tag.t-opt', '[data-el=terms-all]', '[data-el=terms-start]']) { const c = await contrastOf(page, sel); ok(`contrast ${sel} ${c.toFixed(2)}`, c >= 4.5); }
const tgt = await page.$$eval('.terms-lab, .terms-view, .terms-btns .btn', (a) => a.every((x) => x.getBoundingClientRect().height >= 44)); ok('44px tap targets', tgt);
ok('fits 390px (no horizontal overflow)', await page.evaluate(() => document.documentElement.scrollWidth <= 390));
await sleep(800); await T.shot('terms_popup');
await page.click('[data-el=terms-all]'); ok('AGREE TO ALL checks everything', await page.$$eval('[data-terms]', (a) => a.every((x) => x.checked)) && !(await dis()));
await page.click('[data-el=terms-start]'); await page.waitForFunction(() => window.__startReady || window.__ready, null, { timeout: 20000 });
const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('lifesim.terms.v1')));
ok('acceptance stored with version, separate from saves', stored && stored.v === 3 && stored.news === true);
// start a life, reload: returning player is not asked again
await page.evaluate(async () => { const { adapter } = await import('/ui/js/adapter.js'); adapter.impl.startLife(1, { first: 'Ada', seed: 3 }); });
await page.reload(); await page.waitForFunction(() => window.__ready, null, { timeout: 20000 }); ok('returning player: no popup', !(await page.$('[data-el=terms]')));
// wiping saves does not re-ask
await page.evaluate(() => { for (const k of Object.keys(localStorage)) if (/^lifesim\.(slot|save|lastSlot|slotmeta|meta)/.test(k)) localStorage.removeItem(k); });
await page.reload(); await page.waitForFunction(() => window.__ready || window.__startReady, null, { timeout: 20000 }); ok('wiped saves: no popup', !(await page.$('[data-el=terms]')));
// version bump re-asks
await page.evaluate(() => localStorage.setItem('lifesim.terms.v1', JSON.stringify({ v: 0, at: 1 }))); await page.reload(); await page.waitForSelector('[data-el=terms]', { timeout: 20000 }); ok('older terms version: asked again', true);
await page.click('[data-el=terms-all]'); await page.click('[data-el=terms-start]'); await page.waitForFunction(() => window.__startReady || window.__ready, null, { timeout: 20000 });
// Settings links (start a life so the hub is up)
if (!(await page.evaluate(() => window.__ready))) { await page.evaluate(async () => { const { adapter } = await import('/ui/js/adapter.js'); adapter.impl.startLife(1, { first: 'Bo', seed: 4 }); }); await page.reload(); await page.waitForFunction(() => window.__ready, null, { timeout: 20000 }); }
await page.click('[data-el=settings-link]'); await sleep(700);
ok('Settings has Terms link', (await page.$eval('[data-el=terms-link]', (a) => a.getAttribute('href')).catch(() => '')) === 'terms.html');
ok('Settings has Privacy link', (await page.$eval('[data-el=privacy-link]', (a) => a.getAttribute('href')).catch(() => '')) === 'privacy.html');
await page.$eval('[data-el=terms-link]', (e) => e.scrollIntoView()); await T.shot('terms_settings_links');
for (const doc of ['terms', 'privacy']) { const r = await page.goto(base + doc + '.html'); ok(`${doc}.html loads`, r.ok()); const t = await page.textContent('body');
  ok(`${doc}.html placeholders filled + full-screen ads disclosed`, !/\[OWNER NAME\]|\[CONTACT EMAIL\]|\[GOVERNING LAW STATE\]/.test(t) && /paigehauling@outlook\.com/.test(t) && /full-screen ad/i.test(t));
  ok(`${doc}.html fits 390px`, await page.evaluate(() => document.documentElement.scrollWidth <= 390)); const c = await contrastOf(page, 'p'); ok(`${doc}.html text contrast ${c.toFixed(2)}`, c >= 7); await T.shot(doc + '_page'); }
await T.done('terms_ui');
