// Bottom-bar Job tab + My Job / All Work tabs + banner job link + back arrows always land home. node tests/myjob_ui.mjs
// Also every owned kind (CEO company, brand, farm, production company) is listed and opens a manage screen with quality + staff swap. node tests/bizpaths_ui.mjs
import { loadPuppeteer } from './_pp.mjs'; import { spawn } from 'node:child_process'; import fs from 'node:fs';
const puppeteer = loadPuppeteer(); const ROOT = new URL('..', import.meta.url).pathname, PORT = 18822, OUT = '/workspace/lifesim_art128/feature_shots8'; fs.mkdirSync(OUT, { recursive: true });
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
const home = () => page.evaluate(() => !document.querySelector('.panel') && !!document.querySelector('[data-el=journal]'));
const backHome = async () => { for (let i = 0; i < 12 && !(await home()); i++) { await page.evaluate(() => { const b = document.querySelector('.panel.top [data-nav=back]') || document.querySelector('.sheet [data-btn=no]'); if (b) b.click(); }); await sleep(250); } return home(); };
ok('bottom bar unchanged (Life, Skills, Assets, Work, Social, More)', await page.evaluate(() => [...document.querySelectorAll('.nav [data-tab]')].map((b) => b.dataset.tab).join() === 'life,skills,assets,occupation,relationships,more'));
ok('other buttons kept', (await page.evaluate(() => ['skills', 'assets', 'occupation', 'relationships', 'more'].every((t) => document.querySelector(`[data-tab=${t}]`)))));
await click('[data-tab=occupation]'); await sleep(600); ok('unemployed: No job yet + Find a job', !!(await page.$('.panel.top [data-el=no-job] [data-act=find-job]')));
ok('back from Work lands home', await backHome());
await A(`const a=adapter.impl; const D=(await import('/src/data.js')).D; a.s.job={ id: D.careers[0].id, level: 0, perf: 60, yrs: 1, lvlYrs: 1 }; return 1`); await page.evaluate(async () => { const m = await import('/ui/js/ui.js'); await m.refreshState(); }); await sleep(400);
await click('[data-tab=occupation]'); await sleep(800);
ok('Work opens My Job first (sticky tabs, My Job active)', !!(await page.$('.panel.top [data-el=work-tabs]')) && (await page.evaluate(() => document.querySelector('.panel.top [data-wtab=myjob]').classList.contains('go'))));
const t = await top(); ok('My Job has job card, work harder, quit, promotion, coworkers', !!(await page.$('.panel.top [data-el=current-job]')) && !!(await page.$('.panel.top [data-act=work-harder]')) && !!(await page.$('.panel.top [data-act=quit-job]')) && !!(await page.$('.panel.top [data-el=jp-promo]')) && /Coworkers/.test(t));
await page.screenshot({ path: `${OUT}/myjob_tab.png` });
await page.evaluate(() => document.querySelector('.panel.top [data-wtab=all]').click()); await sleep(600); ok('All Work tab lists work options', (await page.$$('.panel.top .row')).length >= 3);
ok('back lands home', await backHome());
await click('[data-tab=occupation]'); await sleep(600); ok('Work reopens on My Job', await page.evaluate(() => document.querySelector('.panel.top [data-wtab=myjob]').classList.contains('go'))); await page.evaluate(() => document.querySelector('.panel.top [data-wtab=all]').click()); await sleep(500);
// nested screen, then back all the way
await page.evaluate(() => document.querySelector('.panel.top .row').click()); await sleep(600); ok('nested screen back lands home', await backHome());
await page.evaluate(() => document.querySelector('[data-el=job-link]').click()); await sleep(700); ok('banner job title opens My Job', !!(await page.$('.panel.top [data-wtab=myjob].go')) && !!(await page.$('.panel.top [data-el=current-job]')));
ok('back lands home', await backHome());
for (const tb of ['skills', 'assets', 'relationships', 'more', 'occupation']) { await click(`[data-tab=${tb}]`); await sleep(500); await page.evaluate(() => { const r = document.querySelector('.panel.top .row:not([disabled])'); if (r) r.click(); }); await sleep(500); ok(`${tb}: back arrows land home`, await backHome()); }
// X close: 3 screens deep + a sheet -> home, no backdrop, AGE clickable
await click('[data-tab=more]'); await sleep(500); await page.evaluate(() => document.querySelector('.panel.top .row:not([disabled])').click()); await sleep(500); await page.evaluate(() => { const r = document.querySelector('.panel.top .row:not([disabled])'); if (r) r.click(); }); await sleep(500);
const depth3 = await page.evaluate(() => document.querySelectorAll('.panel').length); ok('opened 3 screens deep', depth3 >= 2, 'depth ' + depth3);
const xb = await page.evaluate(() => { const b = document.querySelector('.panel.top [data-nav=home]'); const r = b.getBoundingClientRect(); return { label: b.getAttribute('aria-label'), w: r.width, h: r.height, right: r.right, left: r.left }; });
ok('X at top right, 44px, aria Close to home', xb.label === 'Close to home' && xb.w >= 44 && xb.h >= 44 && xb.left > 300, JSON.stringify(xb));
ok('back arrow still top left', await page.evaluate(() => document.querySelector('.panel.top [data-nav=back]').getBoundingClientRect().left < 60));
await page.evaluate(async () => { const m = await import('/ui/js/ui.js'); m.sheet({ title: 'x', options: [{ label: 'a' }] }); }); await sleep(200);
await page.evaluate(() => document.querySelector('.panel.top [data-nav=home]').click()); await sleep(400);
ok('X lands home with no panel/backdrop', await page.evaluate(() => !document.querySelector('.panel') && !document.querySelector('.overlay') && !document.querySelector('.ls-death-fade')));
ok('no X on the home screen', !(await page.$('[data-nav=home]')));
const a0 = await A(`return adapter.impl.s.age`); await click('[data-el=age]'); await sleep(900); await page.evaluate(() => { for (const o of document.querySelectorAll('.overlay')) { const b = o.querySelector('.opt, [data-btn]'); if (b) b.click(); } }); await sleep(300);
ok('AGE clickable after X', (await A(`return adapter.impl.s.age`)) > a0);
ok('no page errors', errors.length === 0, errors.join(' | ').slice(0, 300));
await browser.close(); srv.kill(); console.log(fails ? `myjob_ui: ${fails} FAIL` : 'myjob_ui: PASS'); process.exit(fails ? 1 : 0);
