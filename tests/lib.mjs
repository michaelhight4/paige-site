// Minimal test harness: static server + Playwright (system Chrome) at 390px.
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const SHOTS = '/workspace/lifesim_art128/feature_shots8'; fs.mkdirSync(SHOTS, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav' };
export function serve() { return new Promise((res) => { const srv = http.createServer((q, r) => { let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; const f = path.join(ROOT, p); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }); srv.listen(0, () => res(srv)); }); }
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; export const ok = (name, cond, extra = '') => { if (!cond) fails++; console.log(`${cond ? 'ok  ' : 'FAIL'} ${name}${extra ? ' ' + extra : ''}`); return cond; };
// opts.fresh: no life, no terms accepted. opts.terms(default true): pre-accept terms.
export async function open(opts = {}) {
  const srv = await serve(), base = `http://127.0.0.1:${srv.address().port}/`;
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  if (opts.terms !== false) await ctx.addInitScript(() => { try { if (!localStorage.getItem('lifesim.terms.v1')) localStorage.setItem('lifesim.terms.v1', JSON.stringify({ v: 999, at: 0, news: false })); } catch (e) {} });
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(String(e))); page.on('console', (m) => { if (m.type() === 'error' && !/404|Failed to load resource/.test(m.text())) errors.push(m.text()); });
  await page.goto(base + 'index.html'); 
  if (!opts.fresh) {
    await page.waitForFunction(() => window.__ready || window.__startReady, null, { timeout: 30000 });
    if (!(await page.evaluate(() => !!window.__ready))) { await page.evaluate(async (o) => { const { adapter } = await import('/ui/js/adapter.js'); adapter.impl.startLife(1, { first: 'Tess', last: 'Ter', seed: o.seed || 7 }); }, opts); await page.reload(); await page.waitForFunction(() => window.__ready, null, { timeout: 30000 }); }
  }
  const A = (code) => page.evaluate(async (c) => { const { adapter } = await import('/ui/js/adapter.js'); const fn = new Function('adapter', 'return (async()=>{' + c + '})()'); return fn(adapter); }, code);
  const refresh = () => page.evaluate(async () => { const u = await import('/ui/js/ui.js'); await u.refreshState(); u.store.rerender && u.store.rerender(); });
  const shot = (n) => page.screenshot({ path: path.join(SHOTS, n + '.png') });
  const done = async (name) => { await browser.close(); srv.close(); const e = errors.filter((x) => !/favicon/.test(x)); ok('no page errors', e.length === 0, e.slice(0, 3).join(' | ')); console.log(fails ? `FAIL ${name} (${fails})` : `PASS ${name}`); process.exit(fails ? 1 : 0); };
  return { page, A, refresh, shot, done, base, errors, ctx };
}
export const fail = () => fails;
