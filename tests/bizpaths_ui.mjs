// Regression: every way of starting a business lands on the Your-businesses list with the new one opened on its manage screen.
// Also every owned kind (CEO company, brand, farm, production company) is listed and opens a manage screen with quality + staff swap. node tests/bizpaths_ui.mjs
import { loadPuppeteer } from './_pp.mjs'; import { spawn } from 'node:child_process'; import fs from 'node:fs';
const puppeteer = loadPuppeteer(); const ROOT = new URL('..', import.meta.url).pathname, PORT = 18811, OUT = '/workspace/lifesim_art128/feature_shots8'; fs.mkdirSync(OUT, { recursive: true });
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
const manage = async () => { const t = await top(); return /Quality/.test(t) && /Swap/.test(t); };
const paths = {
  assets: async () => { await click('[data-tab=assets]'); await sleep(300); await click('[data-el=biz-tab]'); await sleep(400); await click('[data-el=biz-found]'); await sleep(400); },
  businesses: async () => { await A("const {openPanel}=await import('/ui/js/ui.js'); const x=await import('/ui/js/screens/extra.js'); openPanel('Businesses & Studios', x.businessesScreen); return 1"); await sleep(400); await click('[data-el=biz-found]'); await sleep(400); },
  more: async () => { await A("const {openPanel}=await import('/ui/js/ui.js'); const x=await import('/ui/js/screens/extra.js'); openPanel('Start a business', x.foundScreen); return 1"); await sleep(500); },
};
let n = 0;
for (const [name, go] of Object.entries(paths)) {
  for (const type of ['Gym', 'Bakery']) {
    await closeAll(); await go(); const d0 = await depth(); n++;
    ok(`${name}: found list opens (${type})`, await clickRow(type)); await sleep(1400);
    const t = await top();
    ok(`${name}/${type}: lands on the new business manage screen`, await manage(), t.slice(0, 80).replace(/\n/g, ' | '));
    await page.screenshot({ path: `${OUT}/bizpath_${name}_${type.toLowerCase()}.png` });
    await click('.panel.top [data-nav=back]'); await sleep(500);
    ok(`${name}/${type}: back shows Your businesses with it listed`, await page.evaluate((t) => !!document.querySelector('.panel.top [data-el=biz-summary]') && document.querySelector('.panel.top').innerText.includes(t), type));
    ok(`${name}/${type}: no duplicate list panels`, (await depth()) <= d0);
  }
}
const own = await A('return (await adapter.getBusinesses()).owned.length'); ok('all started businesses are owned', own >= n, String(own));
// other kinds appear in the list and open a manage screen with quality + swap
await A(`const a=adapter.impl; a.s.brand||a.brandAction('found',{name:'Biz Wear',lines:['street']}); a.s.farm||a.farmAction('found',{loc:'plains',product:'corn',acres:60}); await adapter.prodAction('film','found'); return 1`);
await closeAll(); await click('[data-tab=assets]'); await sleep(300); await click('[data-el=biz-tab]'); await sleep(500);
for (const nm of ['Biz Wear', 'farm', 'Film']) {
  const found = await page.evaluate((nm) => { const el = [...document.querySelectorAll('.panel.top .row')].find((e) => (e.dataset.id || '').startsWith('b') && e.textContent.toLowerCase().includes(nm.toLowerCase())); if (el) { el.scrollIntoView(); el.click(); return true; } return false; }, nm);
  ok(`list has ${nm}`, found); await sleep(1000); ok(`${nm}: manage screen has quality + swap`, await manage()); await page.screenshot({ path: `${OUT}/bizpath_owned_${nm.replace(/\W/g, '')}.png` });
  await click('.panel.top [data-nav=back]'); await sleep(500);
}
// teams bought/created via the same state as Work: rows in Assets > Businesses open the team page (header + sticky tabs)
await A(`const a=adapter.impl; a.s.school=null; a.s.cash=5e9; a.frAction('buy',{sport:'soccer',teamId:'soccer_0',type:'pro',size:'small',tier:'basic',preset:'balanced'}); a.rcAction('create',{ type: 'stock', tier: 0, name: 'Lakeside Racing Co', logo: { shape: 'hex', emblem: 'bolt', palette: 3 } }); return 1`);
await closeAll(); await click('[data-tab=assets]'); await sleep(300); await click('[data-el=biz-tab]'); await sleep(600);
for (const [nm, sel] of [['Lakeside Racing', '[data-hub]'], ['soccer', '[data-el=fr-tabs]']]) {
  const found = await page.evaluate((nm) => { const el = [...document.querySelectorAll('.panel.top .row')].find((e) => e.textContent.toLowerCase().includes(nm.toLowerCase()) && (e.dataset.id || '').startsWith('b')); if (el) { el.scrollIntoView(); el.click(); return true; } return false; }, nm);
  ok(`Assets lists ${nm}`, found); await sleep(1000); ok(`${nm}: opens team page with tabs`, !!(await page.$('.panel.top ' + sel))); await page.screenshot({ path: `${OUT}/bizpath_team_${nm.replace(/\W/g, '')}.png` }); await click('.panel.top [data-nav=back]'); await sleep(500);
}
for (const id of ['start:team', 'start:esports', 'start:racing', 'start:prod', 'start:brand', 'start:farm']) { ok(`Assets offers ${id}`, await click(`.panel.top [data-id="${id}"]`)); await sleep(700); ok(`${id} opens a screen`, (await depth()) >= 3 && (await top()).length > 40); await click('.panel.top [data-nav=back]'); await sleep(400); }
ok('no page errors', errors.length === 0, errors.join(' | ').slice(0, 300));
await browser.close(); srv.kill(); console.log(fails ? `bizpaths_ui: ${fails} FAIL` : 'bizpaths_ui: PASS'); process.exit(fails ? 1 : 0);
