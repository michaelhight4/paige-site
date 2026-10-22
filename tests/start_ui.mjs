// Start flow click test: character creation, Lifeline slots, continue/overwrite. node tests/start_ui.mjs  (SHOTS=/dir saves screenshots)
import { loadPuppeteer } from './_pp.mjs'; import { spawn } from 'node:child_process'; import fs from 'node:fs';
const puppeteer = loadPuppeteer(); const ROOT = new URL('..', import.meta.url).pathname, PORT = 18811, SHOTS = process.env.SHOTS;
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const srv = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' }); await new Promise((r) => setTimeout(r, 800));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); let fails = 0; const errors = [];
const ok = (n, c, i = '') => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : '')); };
const page = await browser.newPage(); await page.evaluateOnNewDocument(() => { try { localStorage.setItem('lifesim.terms.v1', JSON.stringify({ v: 999, at: 0 })); } catch (e) {} }); await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); }); page.on('pageerror', (e) => errors.push('pageerror ' + e.message));
const shot = async (n) => { if (SHOTS) await page.screenshot({ path: `${SHOTS}/${n}.png` }); };
const URL0 = `http://127.0.0.1:${PORT}/index.html`;
const startReady = () => page.waitForFunction(() => window.__startReady === true, { timeout: 20000 });
const hubReady = () => page.waitForFunction(() => window.__ready === true, { timeout: 20000 });
const click = async (sel) => { await page.waitForSelector(sel, { timeout: 5000 }); await page.evaluate((s) => document.querySelector(s).click(), sel); await sleep(250); };
const layers = () => page.evaluate(() => [...document.querySelectorAll('[data-el=char-preview] g[data-layer]')].map((g) => g.dataset.layer));
await page.goto(URL0); await page.evaluate(() => localStorage.clear()); await page.goto(URL0); await startReady(); await sleep(900);
// 1. no save => character creation
ok('no save opens character creation', await page.evaluate(() => !!document.querySelector('[data-el=creator-start]') && !document.querySelector('.hub')));
let l0 = await layers(); ok('live preview composed from layers', l0.includes('body:base') && l0.some((x) => x.startsWith('hair:')) && (await page.evaluate(() => document.querySelectorAll('[data-el=char-preview] rect').length)) > 100, l0.join(','));
await shot('creator_top');
await page.evaluate(() => { const i = document.querySelector('[data-el=creator-first]'); i.value = 'Mira'; i.dispatchEvent(new Event('input', { bubbles: true })); const j = document.querySelector('[data-el=creator-last]'); j.value = 'Voss'; j.dispatchEvent(new Event('input', { bubbles: true })); });
await click('[data-opt="gender:m"]'); await sleep(300); ok('facial hair shown for male', await page.evaluate(() => !!document.querySelector('[data-el=facial-block]')));
await click('[data-opt="facial:beard"]'); await sleep(700); ok('facial hair layer in preview', (await layers()).includes('facial:beard'));
await click('[data-opt="hair:mohawk"]'); await sleep(700); ok('hair style changes preview', (await layers()).includes('hair:mohawk'));
const sk0 = await page.evaluate(() => document.querySelector('[data-el=char-preview] g[data-layer="body:base"]').getAttribute('style'));
await page.evaluate(() => { const b = [...document.querySelectorAll('[data-swatch^="skin:"]')].find((x) => !x.classList.contains('on')); b.click(); }); await sleep(700);
ok('skin tone recolors body', sk0 !== (await page.evaluate(() => document.querySelector('[data-el=char-preview] g[data-layer="body:base"]').getAttribute('style'))));
await click('[data-opt="build:broad"]'); await sleep(600);
await click('[data-opt="gender:f"]'); await sleep(700); ok('facial hair removed for female', !(await layers()).includes('facial:beard') && await page.evaluate(() => !document.querySelector('[data-el=facial-block]')));
await click('[data-opt="gender:m"]'); await click('[data-opt="facial:goatee"]');
await page.evaluate(() => { const s = document.querySelector('[data-el=creator-country]'); s.value = 'jp'; s.dispatchEvent(new Event('change', { bubbles: true })); });
await page.evaluate(() => document.querySelector('[data-el=creator-start]').scrollIntoView()); await shot('creator_bottom');
await click('[data-el=creator-start]'); await hubReady(); await sleep(500);
const st = await page.evaluate(() => window.__errors.length === 0 && document.querySelector('.topbar .nm').textContent);
ok('start life enters the game with the chosen name', st === 'Mira Voss', String(st));
const saved = await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('lifesim.slot.1')); return { c: s.country, g: s.gender, h: s.char.parts.hair.id, f: s.char.parts.facial && s.char.parts.facial.id, b: s.char.build }; });
ok('choices saved in slot 1', saved.c === 'jp' && saved.g === 'm' && saved.h === 'mohawk' && saved.f === 'goatee' && saved.b === 'broad', JSON.stringify(saved));
// 2. relaunch => auto-load last slot, no start screen
await page.goto(URL0); await hubReady(); await sleep(400);
ok('relaunch auto-loads last played character', await page.evaluate(() => document.querySelector('.topbar .nm').textContent === 'Mira Voss' && !document.querySelector('.startscr')));
// 3. Lifeline from settings: new life in slot 2
await click('[data-el=settings-link]'); await sleep(300); await click('[data-el=lifeline-row]'); await sleep(900);
ok('Lifeline shows slot 1 (name/summary) and an empty slot 2', await page.evaluate(() => { const c1 = document.querySelector('[data-el=slot-card-1]'), c2 = document.querySelector('[data-el=slot-card-2]'); return /Mira Voss/.test(c1.textContent) && /Age \d+/.test(c1.textContent) && /Empty/.test(c2.textContent) && !!document.querySelector('[data-el=slot-continue]'); }));
await shot('lifeline');
await click('[data-el=slot-new-2]'); await sleep(900); ok('New Life in empty slot opens creator (no confirm)', await page.evaluate(() => !!document.querySelector('[data-el=creator-start]')));
await page.evaluate(() => { const i = document.querySelector('[data-el=creator-first]'); i.value = 'Tomas'; i.dispatchEvent(new Event('input', { bubbles: true })); });
await click('[data-el=creator-start]'); await sleep(900);
ok('slot 2 started a different life', await page.evaluate(() => document.querySelector('.topbar .nm').textContent.startsWith('Tomas') && JSON.parse(localStorage.getItem('lifesim.slot.2')).first === 'Tomas' && JSON.parse(localStorage.getItem('lifesim.slot.1')).first === 'Mira'));
await page.goto(URL0); await hubReady(); await sleep(300); ok('last played = slot 2 after relaunch', await page.evaluate(() => document.querySelector('.topbar .nm').textContent.startsWith('Tomas')));
await click('[data-el=settings-link]'); await sleep(300); await click('[data-el=lifeline-row]'); await sleep(900); await shot('lifeline_two');
await click('[data-el=slot-play-1]'); await sleep(900); ok('Play slot 1 switches character', await page.evaluate(() => document.querySelector('.topbar .nm').textContent === 'Mira Voss' && !document.querySelector('.startscr')));
// 4. overwrite requires confirm
await click('[data-el=settings-link]'); await sleep(300); await click('[data-el=lifeline-row]'); await sleep(900);
await click('[data-el=slot-new-2]'); await sleep(300); ok('overwrite asks for confirmation', await page.evaluate(() => /Overwrite Slot 2/.test(document.querySelector('.overlay').textContent)));
await shot('overwrite_confirm');
await click('.overlay [data-btn=no]'); await sleep(300); ok('cancel keeps the slot', await page.evaluate(() => !document.querySelector('[data-el=creator-start]') && JSON.parse(localStorage.getItem('lifesim.slot.2')).first === 'Tomas'));
await click('[data-el=start-back]'); await sleep(300);
// 5. old URL options
await page.goto(URL0 + '?fresh=1&nosave=1&seed=5'); await hubReady(); ok('?fresh=1&nosave=1 goes straight to the game', await page.evaluate(() => !document.querySelector('.startscr') && !!document.querySelector('.hub')));
await page.goto(URL0 + '?age=30&cash=3000000&nosave=1'); await hubReady(); ok('?age=30&cash=... still jumps in', await page.evaluate(() => /Age: 30/.test(document.querySelector('.agebar').textContent)));
ok('no console errors', errors.length === 0, errors.slice(0, 3).join(' | '));
await browser.close(); srv.kill(); console.log(fails ? 'START UI FAIL' : 'START UI PASS'); process.exit(fails ? 1 : 0);
