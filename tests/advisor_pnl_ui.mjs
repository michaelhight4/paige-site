// 7c6 item 14: Managed portfolio card shows Current P/L and Lifetime P/L (sign+colour agree, compact big numbers), rows never jam, no sideways scroll at 390px.
import { loadPuppeteer } from './_pp.mjs'; import { spawn } from 'node:child_process'; import assert from 'node:assert/strict';
import { pnl } from '../src/advisor.js';
// math
let p = pnl({ stocks: 1500, crypto: 0, invested: 1000, cashed: 0, fees: 0 }); assert.equal(p.current, 500); assert.equal(p.currentPct, 50); assert.equal(p.lifetime, 500); assert.equal(p.lifetimePct, 50);
p = pnl({ stocks: 600, crypto: 0, invested: 1000, cashed: 600, fees: 6 }); assert.equal(p.netContributed, 400); assert.equal(p.current, 200); assert.equal(p.lifetime, 194); // 600 + 594 - 1000
p = pnl({ stocks: 100, crypto: 0, invested: 1000, cashed: 2000, fees: 20 }); assert.equal(p.netContributed, 0); assert.equal(p.current, 100); assert.equal(p.currentPct, null); assert.equal(p.lifetime, 1080);
p = pnl({ stocks: 4e25, crypto: 0, invested: 1e26, cashed: 0, fees: 0 }); assert.ok(p.lifetime < 0 && p.current < 0); assert.equal(Math.round(p.lifetimePct), -60);
console.log('PASS advisor P/L math');
const puppeteer = loadPuppeteer(); const ROOT = new URL('..', import.meta.url).pathname, PORT = 18898;
const srv = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' }); await new Promise((r) => setTimeout(r, 800));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); let fails = 0; const errors = [];
const ok = (n, c, i = '') => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : '')); };
const page = await browser.newPage(); await page.setViewport({ width: 390, height: 844, isMobile: true }); page.on('pageerror', (e) => errors.push(e.message));
const A = (code) => page.evaluate(`(async()=>{const {adapter}=await import('/ui/js/adapter.js'); ${code}})()`);
const open = async () => { await page.click('[data-tab=assets]'); await sleep(400); await page.evaluate(() => { const el = [...document.querySelectorAll('.panel.top .row')].find((e) => e.textContent.includes('Investment Advisor')); el.scrollIntoView(); el.click(); }); await sleep(700); };
await page.goto(`http://127.0.0.1:${PORT}/index.html?fresh=1&nosave=1&seed=7&age=30&cash=50000000`); await page.waitForFunction(() => window.__ready === true, { timeout: 20000 }); await sleep(400);
const card = () => page.evaluate(() => { const c = document.querySelector('[data-el=advisor-summary]'); const g = (el) => { const b = c.querySelector(`[data-el=${el}] b`); return b && { t: b.textContent, cls: b.className, col: getComputedStyle(b).color }; };
  const jam = [...c.querySelectorAll('.kv')].filter((k) => { const s = k.children[0], b = k.children[1]; if (!s || !b) return false; const r1 = s.getBoundingClientRect(), r2 = b.getBoundingClientRect(); return r1.top === r2.top && r2.left - r1.right < 8; }).map((k) => k.textContent);
  return { cur: g('adv-current-pnl'), life: g('adv-lifetime-pnl'), text: c.textContent, jam, sx: document.scrollingElement.scrollWidth - innerWidth }; });
const scenarios = [['gain', `a.s.advisor.stocks=a.s.advisor.invested*1.5;`, 'pos'], ['loss', `a.s.advisor.stocks=a.s.advisor.invested*0.4;`, 'neg'], ['huge loss', `a.s.advisor.invested=1e26; a.s.advisor.stocks=4e25; a.s.advisor.crypto=0;`, 'neg'], ['huge gain', `a.s.advisor.invested=1e10; a.s.advisor.stocks=3.3e30;`, 'pos']];
for (const [name, code, want] of scenarios) {
  await A(`const a=adapter.impl; if(!a.s.advisor||!a.s.advisor.advisor){a.advisorAction('hire', a.getAdvisor().market[0].id); a.advisorAction('invest', 200000,'stocks');} a.s.advisor.crypto=0; ${code}`);
  await open(); const r = await card();
  ok(`[${name}] both P/L rows present`, !!(r.cur && r.life), JSON.stringify(r).slice(0, 200));
  if (!r.cur) continue;
  for (const [k, v] of [['current', r.cur], ['lifetime', r.life]]) { const neg = v.t.startsWith('-'); ok(`[${name}] ${k} sign+colour agree (${v.t})`, v.cls === want && (want === 'neg') === neg && !/e\+|NaN/.test(v.t)); }
  if (name.startsWith('huge')) ok(`[${name}] compact form`, /sept|quint|non|oct|sext/i.test(r.life.t) && r.life.t.length < 40, r.life.t);
  ok(`[${name}] Invested and Cashed out on separate rows, labels never jam values`, /Invested/.test(r.text) && /Cashed out/.test(r.text) && !/Invested \//.test(r.text) && r.jam.length === 0, r.jam.join('|'));
  ok(`[${name}] no sideways scroll at 390px`, r.sx <= 0, String(r.sx));
  if (name === 'huge loss') await page.screenshot({ path: '/workspace/lifesim_shots_7c6/after_advisor_pnl.png', fullPage: false });
}
ok('no page errors', errors.length === 0, errors.slice(0, 2).join('|'));
await browser.close(); srv.kill(); console.log(fails ? 'ADVISOR PNL FAIL' : 'ADVISOR PNL PASS'); process.exit(fails ? 1 : 0);
