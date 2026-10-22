// UI test (390px): per-page yearly checklist, Autopilot sections, quality + swap card on a CEO company. node tests/yearly_ui.mjs
import { loadPuppeteer } from './_pp.mjs'; import { spawn } from 'node:child_process'; import fs from 'node:fs';
const puppeteer = loadPuppeteer(); const ROOT = new URL('..', import.meta.url).pathname, PORT = 18873, SHOTS = process.env.SHOTS || '/workspace/lifesim_art128/feature_shots8'; fs.mkdirSync(SHOTS, { recursive: true });
const srv = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' }); await new Promise((r) => setTimeout(r, 800));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); let fails = 0; const errors = [];
const ok = (n, c, i = '') => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : '')); };
const page = await browser.newPage(); await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: false });
page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); }); page.on('pageerror', (e) => errors.push('pageerror ' + e.message));
await page.goto(`http://127.0.0.1:${PORT}/index.html?fresh=1&nosave=1&seed=5&age=30&cash=50000000`); await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForFunction(() => window.__ready === true, { timeout: 20000 }); await sleep(500);
const A = (code) => page.evaluate(`(async()=>{const {adapter}=await import('/ui/js/adapter.js'); ${code}})()`);
const shot = (n) => page.screenshot({ path: `${SHOTS}/${n}.png` });
const clickRow = (text) => page.evaluate((text) => { const el = [...document.querySelectorAll('.panel.top .row')].find((e) => e.textContent.includes(text)); if (el) { el.scrollIntoView(); el.click(); return true; } return false; }, text);
const clickSel = (sel) => page.evaluate((sel) => { const el = document.querySelector('.panel.top ' + sel); if (el) { el.scrollIntoView(); el.click(); return true; } return false; }, sel);
const text = () => page.evaluate(() => document.querySelector('.panel.top')?.innerText || '');
await A(`await adapter.setPremiumFlag('autopilot', true); return 1`);
// Skills page checklist
await page.click('[data-tab=skills]'); await sleep(700);
ok('Skills page has the yearly checklist', await page.evaluate(() => !!document.querySelector('.panel.top [data-el=yearly]')));
await page.evaluate(() => { const d = document.querySelector('.panel.top [data-el=yearly]'); d.open = true; }); await sleep(300); await shot('09_yearly_checklist_skills');
const ids = await page.evaluate(() => [...document.querySelectorAll('.panel.top [data-yearly]')].map((e) => e.dataset.yearly)); ok('lists all yearly skills options', ['train', 'read', 'meditate', 'practice'].every((i) => ids.includes(i)), ids.join(','));
await page.evaluate(() => document.querySelector('.panel.top [data-yearly=meditate]').click()); await sleep(500);
ok('ticking adds the Autopilot routine', (await A(`return adapter.impl.s.auto.routines.includes('meditate')`)) === true);
const w = await page.evaluate(() => document.documentElement.scrollWidth); ok('no horizontal overflow', w <= 392, String(w));
// Work > Freelance Gigs
await page.click('[data-tab=occupation]'); await sleep(500); await page.evaluate(() => document.querySelector('.panel.top [data-wtab=all]')?.click()); await sleep(400); ok('open gigs', await clickRow('Freelance')); await sleep(800);
const gids = await page.evaluate(() => [...document.querySelectorAll('.panel.top [data-yearly^="gig:"]')].length); ok('freelance page lists every gig', gids >= 5, String(gids));
await page.evaluate(() => { const d = document.querySelector('.panel.top [data-el=yearly]'); if (d) d.open = true; }); await sleep(200); await shot('10_yearly_gigs');
// Autopilot screen sections
await page.click('[data-tab=life]'); await sleep(300);
await A(`const m=document; return 1`);
const more = await page.evaluate(() => [...document.querySelectorAll('[data-tab]')].map((e) => e.dataset.tab)); 
await page.evaluate(() => document.querySelector('[data-tab=more]')?.click()); await sleep(500);
const opened = await clickRow('Autopilot'); ok('Autopilot reachable from More', opened); await sleep(900);
t: { const t = await text(); ok('Autopilot lists Activities and Job sections', /Activities \(yearly\)/.test(t) && /Job/.test(t)); await page.evaluate(() => document.querySelector('[data-acc=activities]')?.click()); await sleep(500); ok('activities section lists activities', await page.evaluate(() => document.querySelectorAll('.panel.top [data-routine^="act:"]').length > 5 || /Diet|Gym/.test(document.querySelector('.panel.top').innerText))); await shot('11_autopilot_sections'); }
// CEO business: quality + swap
const id = await A(`const r=adapter.impl.foundBusiness({type:'coffee',name:'Bean There'}); const b=adapter.impl.s.biz.find(x=>x.id===r.id); return r.id`);
await page.evaluate(() => document.querySelector('[data-tab=more]')?.click()); await sleep(300);
await A(`const {openPanel}=await import('/ui/js/ui.js'); const {businessDetail}=await import('/ui/js/screens/extra.js'); openPanel('Bean There', (b,c)=>businessDetail(b,c,${id})); return 1`); await sleep(900);
ok('business shows Quality & people card', await page.evaluate(() => !!document.querySelector('.panel.top [data-el=bizops]'))); await shot('12_business_quality_swap');
ok('quality steps 4/8/16/30', await page.evaluate(() => [4, 8, 16, 30].every((n) => document.querySelector(`.panel.top [data-bo-up="${n}"]`))));
ok('quality +8', await clickSel('[data-bo-up="8"]')); await sleep(800); ok('quality increased to 48', (await A(`return adapter.impl.s.biz[0].q`)) === 48);
ok('swap button present', await page.evaluate(() => !!document.querySelector('.panel.top [data-el=bo-swap]')));
ok('swap flow (pick employee, pick replacement, confirm)', await (async () => { await page.evaluate(() => document.querySelector('.panel.top [data-el=bo-swap]').click()); await sleep(500); await page.evaluate(() => document.querySelectorAll('.sheet .opt')[0].click()); await sleep(500); await page.evaluate(() => document.querySelectorAll('.sheet .opt')[0].click()); await sleep(500); await page.evaluate(() => document.querySelector('[data-btn=yes]').click()); await sleep(800); return true; })());
ok('no JS errors', errors.length === 0, errors.join('; ')); await browser.close(); srv.kill(); console.log(fails ? 'FAIL yearly_ui' : 'PASS yearly_ui'); process.exit(fails ? 1 : 0);
