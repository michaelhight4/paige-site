// Bankruptcy popup: shown when an adult cannot pay the year, offers loan / sell / declare, sells to cover. node tests/bankruptcy_ui.mjs
// Also every owned kind (CEO company, brand, farm, production company) is listed and opens a manage screen with quality + staff swap. node tests/bizpaths_ui.mjs
import { loadPuppeteer } from './_pp.mjs'; import { spawn } from 'node:child_process'; import fs from 'node:fs';
const puppeteer = loadPuppeteer(); const ROOT = new URL('..', import.meta.url).pathname, PORT = 18816, OUT = '/workspace/lifesim_art128/feature_shots8'; fs.mkdirSync(OUT, { recursive: true });
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
await A(`adapter.impl.debugSetup({age:31,cash:0}); const s=adapter.impl.s; s.cash=0; s.debt=0; s.job=null; s.pending=[]; s.diseases=[]; s.assets=[{uid:'tb1',name:'Lake Cabin',value:90000,kind:'car',upkeep:0,dep:0,joy:0}]; const u=await import('/ui/js/ui.js'); await u.refreshState(); return 1`);
await page.evaluate(() => document.querySelector('[data-el=age]').click()); await sleep(1500); let sheetTxt = ''; for (let i = 0; i < 6; i++) { sheetTxt = await page.evaluate(() => (document.querySelector('.sheet') || {}).innerText || ''); if (/cannot pay your bills/i.test(sheetTxt) || !sheetTxt) break; await page.evaluate(() => document.querySelector('.sheet .opt:not([disabled])').click()); await sleep(900); } // ordinary event cards come first, the bills popup last
ok('bankruptcy popup appears', /cannot pay your bills/i.test(sheetTxt), sheetTxt.slice(0, 160).replace(/\n/g, ' | '));
ok('offers loan, sell (with value) and declare', /loan/i.test(sheetTxt) && /Sell my things \(worth about \$[\d,]+/.test(sheetTxt) && /Declare bankruptcy/.test(sheetTxt));
await page.screenshot({ path: `${OUT}/bankruptcy_popup.png` });
await page.evaluate(() => [...document.querySelectorAll('.sheet .opt, .sheet button')].find((b) => /Sell my things/.test(b.textContent)).click()); await sleep(1200);
let pickTxt = ''; for (let k = 0; k < 10 && !/What do you want/.test(pickTxt); k++) { await sleep(400); pickTxt = await page.evaluate(() => [...document.querySelectorAll('.sheet')].map((e) => e.innerText).join(' ## ')); } ok("sell picker lists items", /What do you want to sell/.test(pickTxt) && /Lake Cabin/.test(pickTxt), pickTxt.slice(0, 400).replace(/\n/g, ' | '));
await page.screenshot({ path: `${OUT}/bankruptcy_sell_picker.png` });
await page.evaluate(() => [...document.querySelectorAll('.sheet .opt, .sheet button')].find((b) => /Sell Lake Cabin/.test(b.textContent)).click()); await sleep(1200);
const st = await A('const s=adapter.impl.s; return {sh:s.shortfall||0, assets:s.assets.length, pend:s.pending.length, debt:Math.round(s.debt)}');
ok('selling covered the bills and cleared the popup', st.sh === 0 && st.assets === 0 && st.pend === 0 && !(await page.$('.sheet')), JSON.stringify(st));
ok('no page errors', errors.length === 0, errors.join(' | ').slice(0, 300));
await browser.close(); srv.kill(); console.log(fails ? `bankruptcy_ui: ${fails} FAIL` : 'bankruptcy_ui: PASS'); process.exit(fails ? 1 : 0);
