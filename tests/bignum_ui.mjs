// 7c6 items 13/15 + profit bug: huge values show compact (sign+colour agree), tap reveals the full number, no screen scrolls sideways at 390px; Will "All" button. node tests/bignum_ui.mjs
import { loadPuppeteer } from './_pp.mjs'; import { spawn } from 'node:child_process'; import fs from 'node:fs';
const puppeteer = loadPuppeteer(); const ROOT = new URL('..', import.meta.url).pathname, PORT = 18899, SHOTS = '/workspace/lifesim_shots_7c6'; fs.mkdirSync(SHOTS, { recursive: true });
const srv = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' }); await new Promise((r) => setTimeout(r, 800));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); let fails = 0; const errors = []; const ok = (n, c, i = '') => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : '')); };
const page = await browser.newPage(); await page.setViewport({ width: 390, height: 844, isMobile: true }); page.on('pageerror', (e) => errors.push(e.message));
await page.goto(`http://127.0.0.1:${PORT}/index.html?fresh=1&nosave=1&seed=5&age=40&cash=1000000`); await page.waitForFunction(() => window.__ready === true, { timeout: 20000 }); await sleep(400);
const A = (code) => page.evaluate(`(async()=>{const {adapter}=await import('/ui/js/adapter.js'); ${code}})()`);
const open = (title, mod, fn) => A(`const {openPanel}=await import('/ui/js/ui.js'); const m=await import('${mod}'); openPanel('${title}', m.${fn}); return 1`);
const noScroll = () => page.evaluate(() => { const top = document.querySelector('.panel.top') || document.body; const over = [...top.querySelectorAll('*')].filter((e) => e.getBoundingClientRect().right > innerWidth + 1 && getComputedStyle(e).position !== 'fixed').map((e) => e.className + ':' + e.textContent.slice(0, 30)); return { sx: document.scrollingElement.scrollWidth - innerWidth, px: top.scrollWidth - top.clientWidth, over: over.slice(0, 3) }; });
const chk = async (name) => { const r = await noScroll(); ok(`[${name}] no sideways scroll at 390px`, r.sx <= 0 && r.px <= 0 && !r.over.length, JSON.stringify(r)); };
// portfolio at 1e30
await A(`const a=adapter.impl; a.s.cash=1e30; const {slice}=await import('/src/slice_bridge.js'); const sl=slice(a.s); sl.cash=1e30; sl.market.stk_atlas=100; a.invest('stk_atlas', 6e29); sl.market.stk_atlas=100.01; const {refreshState}=await import('/ui/js/ui.js'); if(refreshState) await refreshState(); return 1`);
await open('Investments', '/ui/js/screens/assets.js', 'investScreen').catch(() => {}); await sleep(900);
let txt = await page.evaluate(() => document.querySelector('[data-el=portfolio]')?.innerText || '');
if (!txt) { await page.click('[data-tab=assets]'); await sleep(500); await page.evaluate(() => [...document.querySelectorAll('.panel.top .row')].find((e) => /Invest/i.test(e.textContent))?.click()); await sleep(900); txt = await page.evaluate(() => document.querySelector('[data-el=portfolio]')?.innerText || ''); }
ok('[portfolio] compact big numbers', /oct|sept|non/.test(txt) && !/\d{1,3}(,\d{3}){6,}/.test(txt), txt.slice(0, 200).replace(/\n/g, ' | '));
ok('[portfolio] small % on huge value is not +0%', /\+0\.01%|\+0\.0\d%/.test(txt), txt.match(/\([^)]*%\)/g)?.join(' '));
const tap = await page.evaluate(() => { const b = [...document.querySelectorAll('[data-el=portfolio] b, [data-el=portfolio] .big')].find((e) => /oct|sept|non/.test(e.textContent)); if (!b) return null; const t0 = b.textContent; b.click(); return [t0, b.textContent]; });
ok('[portfolio] tap reveals the full number', tap && tap[1] !== tap[0] && /,\d{3},\d{3}/.test(tap[1]), JSON.stringify(tap)); await chk('portfolio');
await page.screenshot({ path: `${SHOTS}/after_invest_bignum.png` });
// businesses summary with a negative huge total
await A(`const a=adapter.impl; const g=a.getBusinesses.bind(a); a.getBusinesses=()=>{ const b=g(); b.owned=[{id:'x1',name:'Crash Co',profit:-2.9999e25,valuation:1e26,kind:'shop'},{id:'x2',name:'Steady Ltd',profit:5e6,valuation:1e8,kind:'shop'}].map((o)=>({...(b.owned[0]||{}),...o})); return b; }; return 1`);
await open('Businesses', '/ui/js/screens/extra.js', 'businessesScreen'); await sleep(900);
const biz = await page.evaluate(() => [...document.querySelectorAll('[data-el=biz-summary] .kv')].map((k) => ({ t: k.innerText.replace(/\n/g, ' '), c: k.querySelector('b')?.className })));
const tp = biz.find((x) => /Total profit/.test(x.t)); ok('[biz] negative total profit is red with the minus on the compact form', tp && tp.c === 'neg' && /-\$29\.?\d* sept|-\$30 sept/.test(tp.t), JSON.stringify(tp));
ok('[biz] biggest loser shown', biz.some((x) => /Biggest loser/.test(x.t) && /Crash Co/.test(x.t)), JSON.stringify(biz)); await chk('biz');
await page.screenshot({ path: `${SHOTS}/after_biz_summary.png` });
// will screen: huge estate + All buttons
await A(`const a=adapter.impl,s=a.s; delete a.getBusinesses; s.cash=3.3e30; s.age=60; const P=await import('/src/people.js'); for (const r of ['child','child','sibling']) s.people.push(P.newPerson(s, r, { age: 30 })); return 1`);
await open('Will & Testament', '/ui/js/screens/activities.js', 'willScreen'); await sleep(900);
const est = await page.evaluate(() => document.querySelector('[data-el=will-estate]')?.textContent || ''); ok('[will] estate value compact', /non|oct|dec/.test(est) && est.length < 30, est);
const nAll = await page.evaluate(() => document.querySelectorAll('[data-el=will-all]').length); ok('[will] All button on every beneficiary', nAll >= 3, String(nAll));
const fit = await page.evaluate(() => [...document.querySelectorAll('[data-el=will-all]')].every((b) => { const r = b.getBoundingClientRect(), row = b.closest('.row').getBoundingClientRect(), inp = b.parentElement.querySelector('input').getBoundingClientRect(); return r.right <= row.right + 0.5 && r.left >= inp.right && Math.abs(r.top - inp.top) < 30; }));
ok('[will] All fits next to the % field', fit);
await page.evaluate(() => { const i = document.querySelector('.panel.top [data-el=charity-pct]'); if (i) i.value = 20; document.querySelectorAll('[data-el=will-all]')[1].click(); }); await sleep(300);
const vals = await page.evaluate(() => ({ p: [...document.querySelectorAll('.panel.top input[data-person]')].map((i) => Number(i.value)), c: Number(document.querySelector('[data-el=charity-pct]').value), toast: document.body.innerText.includes('set to 100%') }));
ok('[will] All sets that person to 100% and everyone + charity to 0, with a toast', vals.p[1] === 100 && vals.p.filter((v, i) => i !== 1).every((v) => v === 0) && vals.c === 0 && vals.toast, JSON.stringify(vals));
await chk('will'); await page.screenshot({ path: `${SHOTS}/after_will.png` });
ok('no page errors', errors.length === 0, errors.slice(0, 3).join('|'));
await browser.close(); srv.kill(); console.log(fails ? 'BIGNUM FAIL' : 'BIGNUM PASS'); process.exit(fails ? 1 : 0);
