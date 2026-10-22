// Every auction lot shows an image (art, recoloured SVG or category icon) in the list and the detail sheet. node tests/auction_img_ui.mjs
// Also every owned kind (CEO company, brand, farm, production company) is listed and opens a manage screen with quality + staff swap. node tests/bizpaths_ui.mjs
import { loadPuppeteer } from './_pp.mjs'; import { spawn } from 'node:child_process'; import fs from 'node:fs';
const puppeteer = loadPuppeteer(); const ROOT = new URL('..', import.meta.url).pathname, PORT = 18813, OUT = '/workspace/lifesim_art128/feature_shots8'; fs.mkdirSync(OUT, { recursive: true });
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
const data = await A('return (await adapter.getAuctionHouses()).houses.flatMap(h=>h.lots)');
ok('every lot has art, svg or an icon', data.length > 0 && data.every((l) => l.artUrl || l.svg || l.icon), data.filter((l) => !(l.artUrl || l.svg || l.icon)).map((l) => l.name).join(','));
ok('most lots have real art', data.filter((l) => l.artUrl || l.svg).length >= data.length * 0.6, data.filter((l) => !(l.artUrl || l.svg)).map((l) => l.cat).join(','));
await A("const {openPanel}=await import('/ui/js/ui.js'); const x=await import('/ui/js/screens/assets.js'); openPanel('Auctions', x.auctionsScreen); return 1"); await sleep(1200);
const pics = await page.evaluate(() => [...document.querySelectorAll('.panel.top .row')].map((r) => { const p = r.querySelector('[data-el=lot-pic]'); return p ? (p.querySelector('img') ? (p.querySelector('img').complete && p.querySelector('img').naturalWidth > 0 ? 'img' : 'img-broken') : p.querySelector('svg') ? 'svg' : (p.textContent.trim() ? 'icon' : 'blank')) : 'none'; }));
ok('no lot row is blank or broken', pics.length === data.length && pics.every((x) => x === 'img' || x === 'svg' || x === 'icon'), pics.join(','));
await page.screenshot({ path: `${OUT}/auction_list_images.png` });
await page.evaluate(() => document.querySelector('.panel.top .row').click()); await sleep(600);
ok('detail sheet shows the picture', await page.evaluate(() => !!document.querySelector('.sheet [data-el=lot-detail] [data-el=lot-pic]')));
await page.screenshot({ path: `${OUT}/auction_lot_detail.png` });
ok('no page errors', errors.length === 0, errors.join(' | ').slice(0, 300));
await browser.close(); srv.kill(); console.log(fails ? `auction_img_ui: ${fails} FAIL` : 'auction_img_ui: PASS'); process.exit(fails ? 1 : 0);
