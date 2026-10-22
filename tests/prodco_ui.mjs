// UI click test: Production Companies (Work menu + More directory) and the extended Autopilot routines. node tests/prodco_ui.mjs
import { loadPuppeteer } from './_pp.mjs'; import { spawn } from 'node:child_process';
const puppeteer = loadPuppeteer(); const ROOT = new URL('..', import.meta.url).pathname, PORT = 18822; const SHOTS = process.env.SHOTS || '/workspace/lifesim_art128/feature_shots4';
const srv = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' }); await new Promise((r) => setTimeout(r, 800));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); let fails = 0; const errors = [];
const ok = (n, c, i = '') => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : '')); };
const page = await browser.newPage(); await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); }); page.on('pageerror', (e) => errors.push('pageerror ' + e.message));
await page.goto(`http://127.0.0.1:${PORT}/index.html?fresh=1&nosave=1&seed=5&age=30&cash=9000000`); await page.waitForFunction(() => window.__ready === true, { timeout: 20000 });
const A = (code) => page.evaluate(`(async()=>{const {adapter}=await import('/ui/js/adapter.js'); ${code}})()`);
const shot = (n) => page.screenshot({ path: `${SHOTS}/${n}.png` });
const clickRow = (text) => page.evaluate((text) => { const el = [...document.querySelectorAll('.panel.top .row')].find((e) => e.textContent.includes(text)); if (el) { el.scrollIntoView(); el.click(); return true; } return false; }, text);
const clickBtn = (sel) => page.evaluate((sel) => { const el = document.querySelector('.panel.top ' + sel) || document.querySelector(sel); if (el) { el.scrollIntoView(); el.click(); return true; } return false; }, sel);
const pickOption = (i) => page.evaluate((i) => { const o = document.querySelectorAll('.sheet .opt, .sheet button.option, .sheet [data-opt]'); if (o[i]) { o[i].click(); return true; } return false; }, i);
await page.click('[data-tab=occupation]'); await sleep(500); await page.evaluate(() => document.querySelector('.panel.top [data-wtab=all]')?.click()); await sleep(400);
ok('Work menu has Production Companies', await clickRow('Production Companies')); await sleep(600);
ok('summary and 4 media rows', await page.evaluate(() => !!document.querySelector('[data-el=prod-summary]') && /Record Label|Film Studio|TV Studio|Game Studio/.test(document.body.innerText) && ['co:music', 'co:film', 'co:tv', 'co:game'].length === 4)); await shot('01_prodco_hub');
ok('open label page', await clickRow('Record Label')); await sleep(600); ok('found button', await clickBtn('[data-act=found]')); await sleep(900);
ok('company dashboard shows cash, rep, crew quality', await page.evaluate(() => !!document.querySelector('[data-el=prod-dash]') && !!document.querySelector('[data-bar=prod-quality]') && !!document.querySelector('[data-el=prod-policy]'))); await shot('02_label_dashboard');
await A('const s=adapter.impl.s; s.prod.cos.music.cash=2e6; return 1'); await page.evaluate(() => [...document.querySelectorAll('.panel.top button')][0]?.click()); await sleep(300); await clickRow('Record Label ·'); await sleep(700);
ok('sign an artist row', await page.evaluate(() => [...document.querySelectorAll('.panel.top .row')].some((e) => /talent/.test(e.textContent) && e.id !== undefined))); 
const artists = await A('const c=(await adapter.getProdCos()).media[0].company; return c.market.artists.length'); ok('artist market has 4', artists === 4);
const sg = await A('const c=(await adapter.getProdCos()).media[0].company; const r=await adapter.prodAction("music","sign",c.market.artists[0].id); const g=await adapter.prodAction("music","greenlight",{tier:"small",genre:"rock"}); return r.message+" | "+g.message'); console.log(sg);
await page.evaluate(() => [...document.querySelectorAll('.panel.top button')][0]?.click()); await sleep(300); await clickRow('Record Label ·'); await sleep(700);
ok('slate and roster visible', await page.evaluate(() => /Slate/.test(document.body.innerText) && /Artists/.test(document.body.innerText) && /recording/.test(document.body.innerText))); await shot('03_label_slate_roster');
await page.evaluate(() => { const e = [...document.querySelectorAll('.panel.top .section, .panel.top h4, .panel.top .row')].find((x) => /Market trends/.test(x.textContent)); e && e.scrollIntoView(); }); await sleep(200); await shot('04_trends_and_pitches');
ok('pitch rows exist', await page.evaluate(() => [...document.querySelectorAll('.panel.top .row')].filter((e) => /buzz/.test(e.textContent)).length === 5));
await A('await adapter.prodAction("film","found"); for(let i=0;i<4;i++){ await adapter.prodAction("film","policy",{auto:true}); } const s=adapter.impl.s; for(let i=0;i<3;i++){ s.pending=[]; const E=await import("/src/engine.js"); E.takeTurn(s);} return 1');
await page.evaluate(() => location.reload()); await page.waitForFunction(() => window.__ready === true, { timeout: 20000 });
await A('adapter.impl.s.age=30; return 1');
// More directory
await page.click('[data-tab=more]'); await sleep(400);
await page.evaluate(() => { const i = document.querySelector('.panel.top input'); if (i) { i.value = 'production'; i.dispatchEvent(new Event('input', { bubbles: true })); } }); await sleep(400);
ok('More directory lists Production Companies', await page.evaluate(() => [...document.querySelectorAll('.panel.top .row')].some((e) => /Production Companies/.test(e.textContent)))); await shot('05_directory');
// Autopilot routines
await page.evaluate(() => location.reload()); await page.waitForFunction(() => window.__ready === true, { timeout: 20000 });
await page.evaluate(async () => { const P = await import('/src/premium.js'); P.setOwned('autopilot'); });
await A('await adapter.prodAction("film","found"); await adapter.socialAction("chirpr","open"); return 1');
await page.click('[data-tab=more]'); await sleep(400);
await page.evaluate(() => { const i = document.querySelector('.panel.top input'); if (i) { i.value = 'autopilot'; i.dispatchEvent(new Event('input', { bubbles: true })); } }); await sleep(400); ok('open Autopilot', await clickRow('Autopilot')); await sleep(700);
await page.evaluate(() => document.querySelectorAll('[data-acc][aria-expanded=false]').forEach((b) => b.click())); await sleep(600);
ok('new routines listed', await page.evaluate(() => /Post on social media/.test(document.body.innerText) && /Greenlight a movie/.test(document.body.innerText) && /Go live/.test(document.body.innerText))); 
await page.evaluate(() => { const e = [...document.querySelectorAll('.panel.top .row')].find((x) => /Post on social media/.test(x.textContent)); e && e.scrollIntoView(); }); await sleep(200); await shot('06_autopilot_routines');
for (const t of ['Post on social media', 'Greenlight a movie']) { await page.evaluate((t) => { const e = [...document.querySelectorAll('.panel.top .row')].find((x) => x.textContent.includes(t)); if (e && /Off/.test(e.textContent)) e.click(); }, t); await sleep(700); }
const sel = await A('return (await adapter.getAutopilot()).selected'); ok('selecting routines saves them', sel.includes('social_post') && sel.includes('prod_film'));
const r = await A('const o = await adapter.skipAhead({years:2}); return JSON.stringify({done:o.done, ran:o.years.map(y=>y.ran.map(x=>x.id))})'); const j = JSON.parse(r); ok('skip ahead runs the new routines', j.done >= 1 && j.ran.flat().some((x) => x === 'social_post' || x === 'prod_film'), r); await shot('07_after_skip');
ok('no console errors', errors.length === 0, errors.slice(0, 3).join(' | '));
await browser.close(); srv.kill(); console.log(fails ? 'PRODCO UI FAIL' : 'PRODCO UI PASS'); process.exit(fails ? 1 : 0);
