// After death: New Life / Play an heir / Family Legacy leave no backdrop or fade; AGE stays clickable. node tests/death_ui.mjs
// Also every owned kind (CEO company, brand, farm, production company) is listed and opens a manage screen with quality + staff swap. node tests/bizpaths_ui.mjs
import { loadPuppeteer } from './_pp.mjs'; import { spawn } from 'node:child_process'; import fs from 'node:fs';
const puppeteer = loadPuppeteer(); const ROOT = new URL('..', import.meta.url).pathname, PORT = 18819, OUT = '/workspace/lifesim_art128/feature_shots8'; fs.mkdirSync(OUT, { recursive: true });
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
const kill = async (heir) => { await closeAll(); await A(`const a=adapter.impl; a.s.cash=1.81e18; a.s.stats.fame=80; const L=await import('/src/legacy.js'); ${heir ? "const s=a.s; s.kids=s.kids||[]; if(!s.people||!s.people.some(p=>p.rel==='child')){ try{ a.debugAddChild&&a.debugAddChild(); }catch(e){} }" : ''} const r=L.die(a.s,'natural','Old age','old'); const d=await adapter.getDeathSummary(); document.dispatchEvent(new CustomEvent('died',{detail:d})); return d.canContinue`); await sleep(1700); };
const clean = () => page.evaluate(() => { const root = document.querySelector('#app') || document.body; const fade = !!document.querySelector('.ls-death-fade'); const ov = [...document.querySelectorAll('.overlay')].filter((o) => o.offsetParent !== null).length; const b = document.querySelector('[data-el=age-btn], .agebtn, #age'); let hit = false; if (b) { const r = b.getBoundingClientRect(); const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); hit = !!el && (b === el || b.contains(el)); } return { fade, ov, hit }; });
// 1) New Life
const can = await kill(false); ok('death sheet shown', !!(await page.$('.overlay [data-btn=new]')));
await page.screenshot({ path: `${OUT}/death_sheet.png` });
{ const fit = await page.evaluate(() => { const e = document.querySelector('.overlay [data-el=death-head]'), sh = document.querySelector('.overlay .sheet'); return !!e && e.scrollWidth <= e.clientWidth + 1 && sh.scrollWidth <= sh.clientWidth + 1 && !/None/.test(e.textContent); }); ok('death headline fits at 390px, no "None"', fit); }
await A(`const s=adapter.impl.s; return 1`);
if (!can) { await click('.overlay [data-btn=new]'); await sleep(1500); if (await page.$('[data-el=creator-start]')) { await page.evaluate(() => document.querySelector('[data-el=creator-start]').scrollIntoView()); await click('[data-el=creator-start]'); await sleep(1800); } }
else { await A(`const a=adapter.impl; return 1`); }
let c = await clean(); ok('New Life: no fade, no backdrop, AGE clickable', !c.fade && c.ov === 0 && c.hit, JSON.stringify(c));
await page.screenshot({ path: `${OUT}/death_newlife_clear.png` });
// 2) Family Legacy then back
await kill(false); await click('.overlay [data-btn=legacy]'); await sleep(900); c = await clean(); ok('Family Legacy: no fade/backdrop over the panel', !c.fade && c.ov === 0, JSON.stringify(c));
await page.screenshot({ path: `${OUT}/death_legacy_clear.png` });
// 3) heir path: if the legacy screen offers an heir, play them
const heir = await page.evaluate(() => { const el = [...document.querySelectorAll('.panel.top button, .panel.top .row')].find((e) => /Play as|Continue as|heir/i.test(e.textContent)); if (el) { el.click(); return true; } return false; }); await sleep(1200);
const sh = await page.$('.overlay .btn.go'); if (sh) { await sh.click(); await sleep(1200); }
if (heir) { c = await clean(); ok('Play an heir: no fade/backdrop, AGE clickable', !c.fade && c.ov === 0 && c.hit, JSON.stringify(c)); }
ok('no page errors', errors.length === 0, errors.join(' | ').slice(0, 300));
await browser.close(); srv.kill(); console.log(fails ? `death_ui: ${fails} FAIL` : 'death_ui: PASS'); process.exit(fails ? 1 : 0);
