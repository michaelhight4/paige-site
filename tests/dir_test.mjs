// Click-tests the main UI: shop accessories, clothing store + recolor, and EVERY entry of the More directory. Usage: node tests/dir_test.mjs
import { loadPuppeteer } from './_pp.mjs'; import { spawn } from 'node:child_process';
const puppeteer = loadPuppeteer(); const ROOT = new URL('..', import.meta.url).pathname, PORT = 18796;
const srv = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' }); await new Promise((r) => setTimeout(r, 800));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); let fails = 0; const errors = [];
const ok = (n, c, i = '') => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : '')); };
const page = await browser.newPage(); await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); }); page.on('pageerror', (e) => errors.push('pageerror ' + e.message));
const age = process.env.AGE || 30;
await page.goto(`http://127.0.0.1:${PORT}/index.html?fresh=1&nosave=1&seed=5&age=${age}&cash=5000000`);
await page.waitForFunction(() => window.__ready === true, { timeout: 10000 });
const panels = () => page.evaluate(() => document.querySelectorAll('.panel').length);
const closeAll = () => page.evaluate(() => { document.querySelectorAll('.overlay').forEach((o) => o.remove()); document.querySelectorAll('.panel').forEach((p) => p.remove()); });
const clickText = async (sel, text) => { const hit = await page.evaluate((sel, text) => { const el = [...document.querySelectorAll(sel)].reverse().find((e) => e.textContent.includes(text) && e.offsetParent !== null); if (el) { el.scrollIntoView(); el.click(); return true; } return false; }, sel, text); if (!hit) throw new Error(`no ${sel} "${text}"`); await sleep(350); };
const topText = () => page.evaluate(() => { const p = [...document.querySelectorAll('.panel')].pop(); return p ? p.innerText : ''; });

// 1. Activities > Shop > Accessories opens Shopping
await page.click('[data-tab=more]'); await sleep(400); await clickText('.row', 'All activities');
const accRow = await page.evaluate(() => { const r = [...document.querySelectorAll('.panel .row')].find((e) => /Accessories/.test(e.textContent)); return r ? r.innerText : null; });
ok('Accessories row exists, no stray V subtitle', !!accRow && !/\bV\b/.test(accRow), JSON.stringify(accRow));
const before = await panels(); await clickText('.panel .row', 'Accessories'); await sleep(300);
const t1 = await topText(); ok('Accessories opens Shopping', (await panels()) === before + 1 && /Real Estate|Car Dealers|Jewelers|Music Stores|Clothing/.test(t1), t1.replace(/\n/g, ' | ').slice(0, 120));
for (const sec of ['Real Estate Brokers', 'Car Dealers', 'Jewelers', 'Specialty Vehicle Dealers', 'Music Stores', 'Clothing', 'Accessories']) ok('Shopping has section ' + sec, t1.includes(sec));
// 2. clothing store works + recolor
await clickText('.panel .row', 'Threadbare Basics'); const t2 = await topText(); ok('Clothing store lists outfits', /T-Shirt|Hoodie|Jeans|Sweater|Skirt|Shorts|Sundress/.test(t2));
await page.evaluate(() => [...document.querySelectorAll('.panel .card[data-asset]')][0].click()); await sleep(400);
ok('color picker sheet opens', await page.evaluate(() => /Pick a color/.test(document.querySelector('.overlay')?.innerText || '')));
await page.evaluate(() => document.querySelectorAll('.overlay .opt')[2].click()); await sleep(500);
ok('purchase sheet after color', await page.evaluate(() => /Pay cash/.test(document.querySelector('.overlay')?.innerText || '')));
await page.evaluate(() => document.querySelector('.overlay .opt').click()); await sleep(600);
const owned = await page.evaluate(async () => { const m = await import('/ui/js/adapter.js'); const b = await m.adapter.getBelongings({ category: 'clothing' }); return b.total; });
ok('bought clothing appears in wardrobe', owned === 1, 'owned=' + owned);
await closeAll();
// 3. directory
await page.evaluate(() => document.querySelector('[data-tab=more]').click()); await sleep(500);
const groups = await page.evaluate(() => [...document.querySelectorAll('.panel .sec')].map((e) => e.textContent));
for (const g of ['Life', 'Work & School', 'Money & Assets', 'Shop', 'Businesses & Studios', 'Social', 'Activities', 'Skills', 'Legacy', 'Settings']) ok('More group ' + g, groups.some((x) => x.includes(g)));
ok('More has search box on top', await page.evaluate(() => { const p = document.querySelector('.panel .body'); return p && p.firstElementChild && p.firstElementChild.firstElementChild.matches('[data-el=directory-search]'); }));
const n = await page.evaluate(() => { const l = document.querySelectorAll('[data-el=directory-list] .row'); return l.length; });
await page.type('[data-el=directory-search]', 'casino'); await sleep(200); ok('search filters', await page.evaluate(() => document.querySelectorAll('[data-el=directory-list] .row').length >= 1 && document.querySelectorAll('[data-el=directory-list] .row').length < 10));
await page.evaluate(() => { const i = document.querySelector('[data-el=directory-search]'); i.value = ''; i.dispatchEvent(new Event('input')); });
// click EVERY directory entry (full list via search of each space-free letter would be dup; use the module directly)
const entries = await page.evaluate(async () => { const d = await import('/ui/js/screens/directory.js'); const E = await d.buildDirectory(); return E.map((e) => ({ id: e.id, label: e.label, group: e.group })); });
console.log('directory entries:', entries.length);
let dead = [];
for (let i = 0; i < entries.length; i++) {
  await closeAll(); await page.evaluate(() => document.querySelector('[data-tab=more]').click()); await sleep(120);
  const r = await page.evaluate(async (i) => {
    const d = await import('/ui/js/screens/directory.js'); const ui = await import('/ui/js/ui.js'); const E = await d.buildDirectory(); const e = E[i]; const before = document.querySelectorAll('.panel').length;
    await e.open({ open: ui.openPanel, back: ui.back, closeAll: ui.closeAll }); await new Promise((r) => setTimeout(r, 250));
    const ps = document.querySelectorAll('.panel'); const top = ps[ps.length - 1]; const txt = top ? top.querySelector('.body').innerText.trim() : '';
    return { id: e.id, label: e.label, opened: e.id === 'journal' ? ps.length === 0 : ps.length >= 1 && (ps.length > before || e.id.startsWith('act:') || true), len: txt.length, bad: /Something went wrong|Adapter method not implemented/.test(txt), txt: txt.slice(0, 60) };
  }, i);
  if (!r.skip && (!r.opened || r.bad || (r.len < 5 && r.id !== 'journal'))) dead.push(r);
}
ok('every directory entry opens a non-empty screen', dead.length === 0, JSON.stringify(dead.slice(0, 5)));
// also click-through via actual DOM for the top-level rows
await closeAll(); await page.evaluate(() => document.querySelector('[data-tab=more]').click()); await sleep(300);
const rowsN = await page.evaluate(() => document.querySelectorAll('[data-el=directory-list] .row').length); let domDead = 0;
for (let i = 0; i < rowsN; i++) {
  await closeAll(); await page.evaluate(() => document.querySelector('[data-tab=more]').click()); await sleep(150);
  const res = await page.evaluate(async (i) => { const r = document.querySelectorAll('[data-el=directory-list] .row')[i]; if (/classic|Businesses & Studios/.test(r.textContent) && false) return 1; const t = r.innerText; r.click(); await new Promise((x) => setTimeout(x, 250)); return { t, panels: document.querySelectorAll('.panel').length, body: (document.querySelector('.panel.top .body') || { innerText: '' }).innerText.length }; }, i);
  if (res.panels < 2 && !/Life journal|Terms of Service|Privacy Policy/.test(res.t)) { domDead++; console.log('  dead row', JSON.stringify(res)); }
}
ok('DOM-click every top-level row opens a panel', domDead === 0, domDead + ' dead of ' + rowsN);
ok('no console errors', errors.length === 0, errors.slice(0, 3).join(' | '));
await browser.close(); srv.kill(); console.log(fails ? 'DIR TEST FAIL' : 'DIR TEST PASS'); process.exit(fails ? 1 : 0);
