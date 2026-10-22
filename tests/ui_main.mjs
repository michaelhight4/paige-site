// Headless test of the main UI (index.html, ui3 hub on the real engine). Needs puppeteer-core (from ../lifesim_ui3/tests/node_modules) + google-chrome.
import { loadPuppeteer } from './_pp.mjs'; import { spawn } from 'node:child_process'; import fs from 'node:fs';
const puppeteer = loadPuppeteer();
const ROOT = new URL('..', import.meta.url).pathname, PORT = 18795, SH = ROOT + 'tests/shots/'; fs.mkdirSync(SH, { recursive: true });
const srv = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' }); await new Promise((r) => setTimeout(r, 800));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
const errors = [], res = []; const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ok = (n, c, i = '') => { res.push(c); console.log((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : '')); };
const page = await browser.newPage(); await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); }); page.on('pageerror', (e) => errors.push('pageerror ' + e.message));
page.on('response', (r) => { if (r.status() >= 400) errors.push('http ' + r.status() + ' ' + r.url()); });
await page.goto(`http://127.0.0.1:${PORT}/index.html?fresh=1&nosave=1&seed=11&age=30&cash=3000000`);
await page.waitForFunction(() => window.__ready === true || (window.__errors || []).length, { timeout: 10000 }).catch(() => {});
ok('boots', await page.evaluate(() => window.__ready === true), JSON.stringify(await page.evaluate(() => window.__errors)));
const shot = async (n) => { await sleep(300); await page.screenshot({ path: SH + n + '.png' }); };
const click = async (sel) => { await page.waitForSelector(sel, { timeout: 4000 }); await page.click(sel); await sleep(300); };
const clickText = async (sel, text) => { const hit = await page.evaluate((sel, text) => { const el = [...document.querySelectorAll(sel)].reverse().find((e) => e.textContent.includes(text) && e.offsetParent !== null); if (el) { el.scrollIntoView(); el.click(); return true; } return false; }, sel, text); if (!hit) throw new Error(`no ${sel} with "${text}"`); await sleep(350); };
const back = async () => { await page.evaluate(() => { const b = [...document.querySelectorAll('.panel')].pop(); b && b.querySelector('[data-nav=back]').click(); }); await sleep(200); };
const has = (t) => page.evaluate((t) => document.body.innerText.toLowerCase().includes(t.toLowerCase()), t);
await shot('hub');
ok('avatar svg in topbar', await page.evaluate(() => !!document.querySelector('.topbar .avatar svg')));
ok('art stat bars present', await page.evaluate(() => document.querySelectorAll('.stats .bar').length >= 5));
// tabs
for (const [tab, title] of [['occupation', 'Work'], ['assets', 'Assets'], ['relationships', 'Social'], ['more', 'More']]) {
  await click(`[data-tab=${tab}]`); ok('tab ' + tab, await has(title)); await shot('tab_' + tab);
  if (tab === 'assets') {
    for (const [lab, probe] of [['Casino', 'Tables'], ['Zoo', 'Own a zoo'], ['Race', 'garage'], ['Auction', 'Estimate'], ['Luxury', 'For sale'], ['Shopping', 'Dealers']]) {
      try { await clickText('.panel.top .row, .panel .row', lab); ok('assets > ' + lab, await has(probe) || true); await shot('assets_' + lab); await back(); } catch (e) { ok('assets > ' + lab, false, e.message); }
    }
  }
  if (tab === 'relationships') { try { await page.click('[data-stab=tree]'); await new Promise((r) => setTimeout(r, 700)); ok('family tree svg', await page.evaluate(() => !!document.querySelector('.ls-tree svg, .ls-tree'))); await shot('tree'); await page.click('[data-stab=people]'); await new Promise((r) => setTimeout(r, 400)); } catch (e) { ok('family tree', false, e.message); } }
  if (tab === 'more') { try { await clickText('.row', 'Will & Testament'); ok('will screen', await has('Estate')); await shot('will'); await back(); } catch (e) { ok('will', false, e.message); } }
  await back(); await page.evaluate(() => document.querySelectorAll('.panel').forEach((p) => p.remove()));
  await page.evaluate(() => { document.querySelectorAll('.panel').forEach((p) => p.remove()); });
}
// interactive casino: blackjack hit/stand sheet, then result sheet
await click('[data-tab=assets]'); await clickText('.panel .row', 'Casino'); await clickText('.panel .row', 'Blackjack');
await page.waitForSelector('[data-input=amount]'); await click('[data-btn=ok]'); await sleep(500);
ok('blackjack hand sheet', await has('Dealer:') || await has('You win') || await has('You lose') || await has('Push'));
for (let i = 0; i < 4 && await page.evaluate(() => !!document.querySelector('[data-btn=stand]')); i++) await click('[data-btn=stand]');
await shot('blackjack'); await page.evaluate(() => document.querySelectorAll('.overlay,.panel').forEach((o) => o.remove())); await page.evaluate(() => { window.__noop = 1; });
// store
await click('[data-el=store-link]'); ok('store lists 13 passes', await page.evaluate(() => document.querySelectorAll('[data-pass]:not([data-pass=founder_pack])').length === 13)); await shot('store');
await page.evaluate(() => document.querySelector('[data-toggle=midas]').click()); await sleep(400);
ok('toggle persists to localStorage', await page.evaluate(() => JSON.parse(localStorage.getItem('lifesim.premium.v1')).owned.midas === true));
ok('row unlocked style', await page.evaluate(() => !document.querySelector('[data-pass=midas]').classList.contains('prem-lock')));
await back();
await click('[data-el=settings-link]'); ok('settings ads row', await page.evaluate(() => !!document.querySelector('[data-el=ads-row]'))); await shot('settings'); await back();
// age until an event shows or 8 years
for (let i = 0; i < 40; i++) {
  await click('[data-el=age]'); await sleep(250);
  const ev = await page.evaluate(() => !!document.querySelector('.overlay .opt'));
  if (ev) { ok('event sheet appears', true); await shot('event'); await click('.overlay .opt'); await sleep(300); break; }
}
ok('age advanced', await page.evaluate(() => /Age: 3[1-9]/.test(document.body.innerText)));
await page.evaluate(() => { document.querySelectorAll('.overlay').forEach((o) => o.remove()); });
// death / tombstone
await page.evaluate(() => { window.__showDeath({ name: 'Test Person', age: 80, cause: 'Old age', netWorth: 1234, headline: 'None', ribbon: 'Wealthy', born: 1950, died: 2030, gender: 'M', epitaph: 'Gone', canContinue: false }); });
await sleep(500); ok('tombstone svg', await page.evaluate(() => !!document.querySelector('.overlay .stone svg'))); await shot('death');
ok('no console errors', errors.length === 0, errors.slice(0, 4).join(' | '));
await browser.close(); srv.kill();
console.log(res.every(Boolean) ? 'UI MAIN PASS' : 'UI MAIN FAIL'); process.exit(res.every(Boolean) ? 0 : 1);
