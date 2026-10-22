// Fame tier on the profile banner (words + %, distinct look per tier, readable), Use your fame screen from banner / Social / More. node tests/fame_ui.mjs
// Also every owned kind (CEO company, brand, farm, production company) is listed and opens a manage screen with quality + staff swap. node tests/bizpaths_ui.mjs
import { loadPuppeteer } from './_pp.mjs'; import { spawn } from 'node:child_process'; import fs from 'node:fs';
const puppeteer = loadPuppeteer(); const ROOT = new URL('..', import.meta.url).pathname, PORT = 18814, OUT = '/workspace/lifesim_art128/feature_shots8'; fs.mkdirSync(OUT, { recursive: true });
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
const lum = (c) => { const m = c.match(/[\d.]+/g).map(Number); const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(m[0]) + 0.7152 * f(m[1]) + 0.0722 * f(m[2]); };
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const looks = new Set();
for (const [fame, name] of [[0, null], [10, 'Local Name'], [30, 'Well Known'], [60, 'A-List'], [90, 'Global Icon']]) {
  await A(`adapter.impl.s.stats.fame=${fame}; const u=await import('/ui/js/ui.js'); await u.refreshState(); document.dispatchEvent(new CustomEvent('statechange',{detail:u.store.state})); return 1`); await sleep(400);
  const info = await page.evaluate(() => { const tb = document.querySelector('[data-el=topbar]'), tag = tb.querySelector('[data-el=fame-tier]'); const cs = tag && getComputedStyle(tag); return { cls: tb.className, bg: getComputedStyle(tb).backgroundImage + getComputedStyle(tb).borderBottomColor, tag: tag ? tag.textContent : null, fg: cs && cs.color, tbg: cs && cs.backgroundColor }; });
  if (!name) ok('unknown: no tier tag', !info.tag); else { ok(`tier ${name} shown in words + %`, info.tag && info.tag.includes(name) && /\d+%/.test(info.tag), info.tag); ok(`${name} tag text contrast >= 4.5`, ratio(info.fg, info.tbg.includes('rgba') ? info.tbg.replace(/,\s*[\d.]+\)$/, ')').replace('rgba', 'rgb') : info.tbg) >= 4.5, info.fg + ' on ' + info.tbg); }
  looks.add(info.bg); await page.screenshot({ path: `${OUT}/fame_banner_${fame}.png`, clip: { x: 0, y: 0, width: 390, height: 140 } });
}
ok('banner look differs per tier', looks.size >= 4, String(looks.size));
await click('[data-el=fame-tier]'); await sleep(700); ok('banner opens Use your fame', /Spots you can go after/.test(await top())); await page.screenshot({ path: `${OUT}/fame_screen.png` });
await clickRow('Talk show appearance'); await sleep(700); ok('taking a spot uses one of the yearly 3', /1\/3/.test(await top()));
await closeAll(); await click('[data-tab=relationships]'); await sleep(600); ok('Social has Use your fame', await click('.panel.top [data-id=use-fame]')); await sleep(600); ok('opens from Social', /Spots you can go after/.test(await top()));
await closeAll(); await click('[data-tab=more]'); await sleep(400); await page.evaluate(() => { const i = document.querySelector('.panel.top input'); i.value = 'fame'; i.dispatchEvent(new Event('input', { bubbles: true })); }); await sleep(400); ok('More directory has it', await clickRow('Use your fame')); await sleep(600); ok('opens from More', /Spots you can go after/.test(await top()));
ok('no page errors', errors.length === 0, errors.join(' | ').slice(0, 300));
await browser.close(); srv.kill(); console.log(fails ? `fame_ui: ${fails} FAIL` : 'fame_ui: PASS'); process.exit(fails ? 1 : 0);
