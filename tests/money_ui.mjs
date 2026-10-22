// Money on buy/sell screens: thousands commas + magnitude suffix, readable at 390px. node tests/money_ui.mjs
// Also every owned kind (CEO company, brand, farm, production company) is listed and opens a manage screen with quality + staff swap. node tests/bizpaths_ui.mjs
import { loadPuppeteer } from './_pp.mjs'; import { spawn } from 'node:child_process'; import fs from 'node:fs';
const puppeteer = loadPuppeteer(); const ROOT = new URL('..', import.meta.url).pathname, PORT = 18815, OUT = '/workspace/lifesim_art128/feature_shots8'; fs.mkdirSync(OUT, { recursive: true });
const srv = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' }); await new Promise((r) => setTimeout(r, 800));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); let fails = 0; const errors = [];
const ok = (n, c, i = '') => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : '')); };
const page = await browser.newPage(); await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
page.on('pageerror', (e) => errors.push('pageerror ' + e.message));
await page.goto(`http://127.0.0.1:${PORT}/index.html?fresh=1&nosave=1&seed=5&age=30&cash=9000000`); await page.waitForFunction(() => window.__ready === true, { timeout: 20000 }); await sleep(500);
const A = (code) => page.evaluate(`(async()=>{const {adapter}=await import('/ui/js/adapter.js'); ${code}})()`);
const top = () => page.evaluate(() => (document.querySelector('.panel.top') || document.body).innerText);
const depth = () => page.evaluate(() => document.querySelectorAll('.panel').length);
const click = (sel) => page.evaluate((sel) => { const e = document.querySelector(sel); if (e) { e.scrollIntoView(); e.click(); return true; } return false; }, sel);
const clickRow = (text) => page.evaluate((text) => { const el = [...document.querySelectorAll('.panel.top .row')].find((e) => e.textContent.includes(text)); if (el) { el.scrollIntoView(); el.click(); return true; } return false; }, text);
const closeAll = async () => { for (let i = 0; i < 8 && (await depth()); i++) { await click('.panel.top [data-nav=back]'); await sleep(250); } };
const audit = () => page.evaluate(() => { const t = document.querySelector('.panel.top').innerText; const bad = [], good = []; for (const m of t.matchAll(/\$([\d,]+)(\s\([^)]+\))?/g)) { const v = Number(m[1].replace(/,/g, '')); if (v >= 1e4) { if (!m[2] || !/,/.test(m[1])) bad.push(m[0]); else good.push(m[0]); } } const wide = [...document.querySelectorAll('.panel.top *')].some((e) => e.scrollWidth > 395 && getComputedStyle(e).overflowX === 'visible' && e.children.length === 0); return { bad, good, wide }; });
const screens = [['Finances', 'financesScreen'], ['Auctions', 'auctionsScreen'], ['Shopping', 'shoppingScreen'], ['Properties', 'propertiesScreen'], ['Investments', 'investmentsScreen']];
await A('adapter.impl.s.debt = 1234567; return 1');
for (const [title, fn] of screens) {
  await closeAll(); await A(`const {openPanel}=await import('/ui/js/ui.js'); const x=await import('/ui/js/screens/assets.js'); if (!x.${fn}) return 0; openPanel('${title}', x.${fn}); return 1`); await sleep(900);
  const r = await audit(); ok(`${title}: big amounts have commas + suffix`, r.bad.length === 0, r.bad.slice(0, 4).join(' | ') + ' good:' + r.good.slice(0, 2).join(' | ')); ok(`${title}: no overflowing text at 390px`, !r.wide); await page.screenshot({ path: `${OUT}/money_${title.toLowerCase()}.png` });
}
await closeAll(); await A("const {openPanel}=await import('/ui/js/ui.js'); const x=await import('/ui/js/screens/extra.js'); openPanel('Businesses for sale', x.offersScreen); return 1"); await sleep(700);
const r2 = await audit(); ok('business offers formatted', r2.bad.length === 0, r2.bad.join(' | ')); await page.screenshot({ path: `${OUT}/money_offers.png` });
ok('no page errors', errors.length === 0, errors.join(' | ').slice(0, 300));
await browser.close(); srv.kill(); console.log(fails ? `money_ui: ${fails} FAIL` : 'money_ui: PASS'); process.exit(fails ? 1 : 0);
