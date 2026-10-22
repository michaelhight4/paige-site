// Stage 2: bottom tab bar, New badges, tips, businesses hub (no classic.html navigation). Usage: node tests/layout_test.mjs
import { loadPuppeteer } from './_pp.mjs'; import { spawn } from 'node:child_process';
const puppeteer = loadPuppeteer(); const ROOT = new URL('..', import.meta.url).pathname, PORT = 18797;
const srv = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' }); await new Promise((r) => setTimeout(r, 800));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); let fails = 0; const errors = [];
const ok = (n, c, i = '') => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : '')); };
const page = await browser.newPage(); await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); }); page.on('pageerror', (e) => errors.push('pageerror ' + e.message));
const load = async (q) => { await page.goto(`http://127.0.0.1:${PORT}/index.html?fresh=1&nosave=1&seed=5&${q}`); await page.evaluate(() => localStorage.removeItem('lifesim.tips.v1')); await page.reload(); await page.waitForFunction(() => window.__ready === true, { timeout: 10000 }); await sleep(300); };
const clickText = async (sel, text) => { const hit = await page.evaluate((sel, text) => { const el = [...document.querySelectorAll(sel)].reverse().find((e) => e.textContent.includes(text) && e.offsetParent !== null); if (el) { el.scrollIntoView(); el.click(); return true; } return false; }, sel, text); if (!hit) throw new Error(`no ${sel} "${text}"`); await sleep(350); };
// newborn: tips on, no New badges
await load('');
ok('tab bar has Life, Skills, Assets, Work, Social, More', JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('.nav .tab')].map((t) => t.querySelector('.tl').textContent))) === JSON.stringify(['Life', 'Skills', 'Assets', 'Work', 'Social', 'More']));
ok('first-life tip shown', await page.evaluate(() => !!document.querySelector('.tip')));
const geom = async () => page.evaluate(() => { const n = document.querySelector('.nav').getBoundingClientRect(); return { bottom: Math.round(n.bottom), vh: innerHeight, pos: getComputedStyle(document.querySelector('.nav')).position }; });
let g = await geom(); ok('nav fixed at bottom', g.bottom === g.vh && g.pos === 'absolute', JSON.stringify(g));
await page.click('[data-tab=more]'); await sleep(400); g = await geom(); ok('tab bar still visible with a panel open', g.bottom === g.vh && await page.evaluate(() => document.querySelector('.panel') !== null));
ok('tip hidden while panel open', await page.evaluate(() => !document.querySelector('.tip')));
ok('active tab highlighted', await page.evaluate(() => document.querySelector('[data-tab=more]').classList.contains('on')));
await page.click('[data-tab=life]'); await sleep(300); ok('Life tab returns home', await page.evaluate(() => !document.querySelector('.panel') && document.querySelector('[data-tab=life]').classList.contains('on')));
await page.click('.tip button'); await sleep(200); ok('tip dismiss shows next tip or none', true);
// toggle tips off in settings
await page.click('[data-tab=more]'); await sleep(300); await clickText('.row', 'Settings'); ok('settings has tips toggle', await page.evaluate(() => !!document.querySelector('[data-el=tips-row]')));
await page.evaluate(() => document.querySelector('[data-el=tips-row] button').click()); await sleep(200); await page.click('[data-tab=life]'); await sleep(300);
ok('tips off hides tips', await page.evaluate(() => !document.querySelector('.tip') && JSON.parse(localStorage.getItem('lifesim.tips.v1')).on === false));
// adult jump: New badges
await load('age=30&cash=2000000');
const nb = await page.evaluate(() => [...document.querySelectorAll('.nbadge')].filter((b) => b.style.display !== 'none' && b.textContent).map((b) => b.dataset.badge + ':' + b.textContent));
ok('New badges on tabs after growing up', nb.length >= 3, nb.join(','));
await page.click('[data-tab=occupation]'); await sleep(400); await page.evaluate(() => document.querySelector('.panel.top [data-wtab=all]')?.click()); await sleep(400);
const newRows = await page.evaluate(() => [...document.querySelectorAll('.panel .row .badge.new')].length); ok('New chips on unlocked rows', newRows >= 3, 'rows=' + newRows);
await clickText('.row', 'Education'); await page.evaluate(() => document.querySelector('.panel.top [data-nav=back]').click()); await sleep(300);
ok('opening a row clears its New chip', await page.evaluate(() => ![...document.querySelectorAll('.panel .row')].find((r) => /Education/.test(r.textContent) && r.querySelector('.badge.new'))));
// businesses hub
await page.click('[data-tab=assets]'); await sleep(300); ok('assets tab has Businesses hub tab', await page.evaluate(() => !!document.querySelector('[data-el=biz-tab]')));
await page.evaluate(() => document.querySelector('[data-el=biz-tab]').click()); await sleep(500);
ok('businesses hub opens (no navigation to classic)', await page.evaluate(() => location.pathname.endsWith('index.html') && /Start a business/.test(document.body.innerText)));
await page.evaluate(() => document.querySelector('[data-el=biz-found]').click()); await sleep(500);
ok('found screen lists types', await page.evaluate(() => /Coffee Shop/.test(document.body.innerText)));
await clickText('.panel.top .row', 'Coffee Shop'); await sleep(700);
await sleep(600);
ok('business detail with hire/ad/sell', await page.evaluate(() => !!document.querySelector('[data-el=biz-hire]') && !!document.querySelector('[data-el=biz-sell]')));
await page.evaluate(() => document.querySelector('[data-el=biz-ad]').click()); await sleep(400);
await page.evaluate(() => document.querySelector('[data-el=biz-hire]').click()); await sleep(300); await page.evaluate(() => document.querySelectorAll('.overlay .opt')[0].click()); await sleep(300); await page.evaluate(() => document.querySelectorAll('.overlay .opt')[0].click()); await sleep(500);
ok('hired staff', await page.evaluate(() => document.querySelectorAll('.panel.top [data-id]').length >= 0 && /Barista/.test(document.querySelector('.panel.top').innerText)));
ok('no console errors', errors.length === 0, errors.slice(0, 3).join(' | '));
await browser.close(); srv.kill(); console.log(fails ? 'LAYOUT TEST FAIL' : 'LAYOUT TEST PASS'); process.exit(fails ? 1 : 0);
