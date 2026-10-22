// Click-tests Skills tab, Passions, Scholarships in the main UI. node tests/growth_ui.mjs
import { loadPuppeteer } from './_pp.mjs'; import { spawn } from 'node:child_process';
const puppeteer = loadPuppeteer(); const ROOT = new URL('..', import.meta.url).pathname, PORT = 18798;
const srv = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' }); await new Promise((r) => setTimeout(r, 800));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); let fails = 0; const errors = [];
const ok = (n, c, i = '') => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : '')); };
const page = await browser.newPage(); await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); }); page.on('pageerror', (e) => errors.push('pageerror ' + e.message));
await page.goto(`http://127.0.0.1:${PORT}/index.html?fresh=1&nosave=1&seed=5&age=16&cash=100000`); await page.waitForFunction(() => window.__ready === true);
const clickText = async (sel, text) => { const hit = await page.evaluate((sel, text) => { const el = [...document.querySelectorAll(sel)].reverse().find((e) => e.textContent.includes(text) && e.offsetParent !== null); if (el) { el.scrollIntoView(); el.click(); return true; } return false; }, sel, text); if (!hit) throw new Error(`no ${sel} "${text}"`); await sleep(400); };
const txt = () => page.evaluate(() => (document.querySelector('.panel.top') || { innerText: '' }).innerText);
await page.click('[data-tab=skills]'); await sleep(500); let t = await txt();
for (const k of ['Physical', 'Mental', 'Emotional', 'Practical', 'Strength', 'Endurance', 'Speed', 'Flexibility', 'Coordination', 'Memory', 'Intelligence', 'Focus', 'Creativity', 'Problem solving', 'Composure', 'Maturity', 'Empathy', 'Confidence', 'Discipline', 'Computer', 'People skills', 'Literacy', 'Math', 'Driving', 'Cooking', 'Business', 'Leadership', 'Trades']) ok('skills tab shows ' + k, t.toLowerCase().includes(k.toLowerCase()));
await clickText('.panel.top .row', 'Passions'); t = await txt(); ok('passions screen', /Slots: 0\/2|Passion slots 0\/2/.test(t));
await clickText('.panel.top .row', 'Music'); ok('picked music', await page.evaluate(() => !!document.querySelector('[data-passion=music]')));
await clickText('.panel.top .row', 'Science'); ok('second passion', await page.evaluate(() => !!document.querySelector('[data-passion=science]')));
await clickText('.panel.top .row', 'Art'); ok('full -> replace sheet', await page.evaluate(() => /Replace which passion/.test(document.querySelector('.overlay')?.innerText || '')));
await page.evaluate(() => document.querySelectorAll('.overlay .opt')[0].click()); await sleep(500);
ok('art replaced music; meter reset noted', await page.evaluate(() => !!document.querySelector('[data-passion=art]') && !document.querySelector('[data-passion=music]')));
await page.evaluate(() => document.querySelector('[data-passion=art] [data-act=practice]').click()); await sleep(500);
ok('practice raises meter', await page.evaluate(() => Number(document.querySelector('[data-bar=meter_art]').dataset.value) >= 9));
await page.evaluate(() => document.querySelector('.panel.top [data-nav=back]').click()); await sleep(300); await page.evaluate(() => document.querySelector('.panel.top [data-nav=back]')?.click()); await page.evaluate(() => document.querySelectorAll('.panel').forEach((p) => p.remove()));
// scholarships
await page.click('[data-tab=occupation]'); await sleep(400); await page.evaluate(() => document.querySelector('.panel.top [data-wtab=all]')?.click()); await sleep(400); await clickText('.panel.top .row', 'Scholarships'); t = await txt(); ok('scholarships screen lists awards', /Merit Scholarship/.test(t) && /Build your application/.test(t));
await page.evaluate(() => document.querySelector('[data-act=volunteer]').click()); await sleep(500); await clickText('.panel.top .row', 'Chess Club'); await sleep(300);
ok('joined a club', await page.evaluate(() => /Member/.test(document.querySelector('.panel.top').innerText)));
ok('passion extra visible/locked info', /Studio Art Prize/.test(await txt()));
await page.evaluate(() => { document.querySelector('.panel.top .body').scrollTop = 9999; });
const row = await page.evaluate(() => [...document.querySelectorAll('.panel.top .row')].filter((r) => /Needs:/.test(r.innerText)).length); ok('ineligible awards show missing requirements', row >= 3, 'rows=' + row);
// more directory has entries
await page.evaluate(() => document.querySelectorAll('.panel').forEach((p) => p.remove())); await page.click('[data-tab=more]'); await sleep(400); await page.type('[data-el=directory-search]', 'passion'); await sleep(200);
ok('directory finds Passions', await page.evaluate(() => /Passions/.test(document.querySelector('[data-el=directory-list]').innerText)));
ok('no console errors', errors.length === 0, errors.slice(0, 3).join(' | '));
await browser.close(); srv.kill(); console.log(fails ? 'GROWTH UI FAIL' : 'GROWTH UI PASS'); process.exit(fails ? 1 : 0);
