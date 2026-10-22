// Style tab click test + contrast checks. node tests/style_ui.mjs
import fs from 'node:fs'; import { loadPuppeteer } from './_pp.mjs'; import { spawn } from 'node:child_process';
const puppeteer = loadPuppeteer(); const ROOT = new URL('..', import.meta.url).pathname, PORT = 18803;
let fails = 0; const ok = (n, c, i = '') => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : '')); };
// contrast (WCAG) for every palette: ink on bg/card/surface, and white on navy/navy2 (title bars, buttons)
const S = JSON.parse(fs.readFileSync(ROOT + 'ui/data/styles.json', 'utf8')); const base = { '--bg': '#eef1f6', '--card': '#fff', '--surface': '#fff', '--ink': '#1b2433', '--mute': '#6b7689', '--navy': '#1f3a5f', '--navy2': '#2b5086', '--link': '#2b5086', '--head': '#1f3a5f' };
const lum = (h) => { h = h.length === 4 ? '#' + [...h.slice(1)].map((x) => x + x).join('') : h; const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const cr = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
for (const p of S.palettes) { const v = { ...base, ...p.vars }; const min = p.id === 'contrast' ? 7 : 4.5; const pairs = [['ink/bg', v['--ink'], v['--bg']], ['ink/surface', v['--ink'], v['--surface']], ['link/surface', v['--link'], v['--surface']], ['head/surface', v['--head'], v['--surface']], ['white/navy2', '#ffffff', v['--navy2']], ['white/navy', '#ffffff', v['--navy']]];
  const bad = pairs.filter(([, a, b]) => cr(a, b) < min).map(([n, a, b]) => `${n}=${cr(a, b).toFixed(1)}`); ok(`palette ${p.id}: contrast >= ${min}`, bad.length === 0, bad.join(' ')); }
const srv = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' }); await new Promise((r) => setTimeout(r, 800));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); const errors = [];
const page = await browser.newPage(); await page.evaluateOnNewDocument(() => { try { localStorage.setItem('lifesim.terms.v1', JSON.stringify({ v: 999, at: 0 })); } catch (e) {} }); await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); }); page.on('pageerror', (e) => errors.push('pageerror ' + e.message));
const url = `http://127.0.0.1:${PORT}/index.html?fresh=1&seed=5&age=30`;
await page.goto(url); await page.evaluate(() => localStorage.removeItem('lifesim.style.v1')); await page.reload(); await page.waitForFunction(() => window.__ready === true, { timeout: 20000 }); await sleep(400);
const cs = (v) => page.evaluate((v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim(), v);
const clickText = async (text) => page.evaluate((text) => { const el = [...document.querySelectorAll('.panel.top .row')].find((e) => e.textContent.includes(text)); if (el) { el.scrollIntoView(); el.click(); return true; } return false; }, text);
await page.click('[data-tab=more]'); await sleep(300); await page.evaluate(() => { const i = document.querySelector('.panel.top input'); i.value = 'accessibility'; i.dispatchEvent(new Event('input', { bubbles: true })); }); await sleep(300);
ok('Style is in the More directory', await clickText('Style & accessibility')); await sleep(500);
ok('default palette is light (no overrides)', (await page.evaluate(() => document.documentElement.dataset.style)) === 'light' && (await page.evaluate(() => document.documentElement.style.getPropertyValue('--bg'))) === '');
const bgOf = () => page.evaluate(() => getComputedStyle(document.querySelector('.panel.top')).backgroundColor);
const light = await bgOf();
for (const [id, name] of [['dark', 'Dark'], ['dim', 'Low brightness'], ['contrast', 'High contrast'], ['cb_rg', 'red-green'], ['cb_by', 'blue-yellow'], ['pastel', 'pastel']]) { await clickText(name); await sleep(250); ok(`palette ${id} applies`, (await page.evaluate(() => document.documentElement.dataset.style)) === id); }
await clickText('Dark'); await sleep(250); const dark = await bgOf(); ok('dark changes the panel background via CSS vars', dark !== light && (await cs('--bg')) === '#121826', light + ' -> ' + dark);
ok('palette persists in localStorage (separate from the save)', await page.evaluate(() => JSON.parse(localStorage.getItem('lifesim.style.v1')).palette === 'dark' && !localStorage.getItem('lifesim.save.v2')?.includes('"palette"')));
await page.evaluate(() => document.querySelector('[data-text=large]').click()); await sleep(300);
const z = await page.evaluate(() => ({ zoom: getComputedStyle(document.querySelector('#app')).zoom, h: parseFloat(getComputedStyle(document.querySelector('#app')).height), vh: innerHeight, w: parseFloat(getComputedStyle(document.querySelector('#app')).width), vw: innerWidth }));
await page.screenshot({path:'tests/shots/style_large.png'});
ok('large text zooms the app and still fits the screen', z.zoom === '1.15' && Math.abs(z.h - z.vh) < 3 && Math.abs(z.w * 1.15 - z.vw) < 3, JSON.stringify(z));
await clickText('Reduced'); await sleep(250);
ok('reduced motion sets the switch and disables CSS animation', await page.evaluate(() => { const el = document.querySelector('.panel.top'); return document.documentElement.dataset.motion === 'reduced' && getComputedStyle(el).animationName === 'none' && getComputedStyle(el).transitionDuration.startsWith('0'); }));
const fx = await page.evaluate(async () => { const A = window.LifeSimArt || window.Art; return !!document.querySelector('script[src*=fame_fx]'); }); ok('fame_fx loaded (shake/flash gated by data-motion)', fx);
const shakeGate = fs.readFileSync(ROOT + 'art/fame_fx.js', 'utf8').includes("dataset.motion === 'reduced'") ; ok('fame effect skips particles, flash and shake when reduced', shakeGate);
await page.reload(); await page.waitForFunction(() => window.__ready === true); await sleep(300);
ok('settings survive a reload', await page.evaluate(() => { const d = document.documentElement.dataset; return d.style === 'dark' && d.text === 'large' && d.motion === 'reduced'; }));
await page.evaluate(() => document.querySelector('[data-tab=more]').click()); await sleep(300);
await page.evaluate(() => { const i = document.querySelector('.panel.top input'); i.value = 'accessibility'; i.dispatchEvent(new Event('input', { bubbles: true })); }); await sleep(300); await clickText('Style & accessibility'); await sleep(400);
await page.evaluate(() => document.querySelector('[data-el=style-reset]').click()); await sleep(300); ok('reset restores light/normal', await page.evaluate(() => { const d = document.documentElement.dataset; return d.style === 'light' && d.text === 'normal' && d.motion !== 'reduced' || d.motion === 'normal'; }));
await page.screenshot({ path: ROOT + 'tests/shots/style_light.png' }); await clickText('Dark'); await sleep(300); await page.click('[data-tab=life]'); await sleep(300); await page.screenshot({ path: ROOT + 'tests/shots/style_dark_home.png' });
ok('no console errors', errors.length === 0, errors.slice(0, 3).join(' | '));
await browser.close(); srv.kill(); console.log(fails ? 'STYLE UI FAIL' : 'STYLE UI PASS'); process.exit(fails ? 1 : 0);
