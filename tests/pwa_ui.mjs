// PWA: manifest + icons, service worker registers, theme-color consistent, JS/HTML network-first (no stale build). node tests/pwa_ui.mjs
import { open, ok, sleep, ROOT } from './lib.mjs';
import fs from 'node:fs';
const T = await open(); const { page, base } = T;
const man = JSON.parse(fs.readFileSync(ROOT + '/manifest.webmanifest', 'utf8'));
ok('manifest linked', await page.$eval('link[rel=manifest]', (l) => l.getAttribute('href')) === 'manifest.webmanifest');
ok('theme-color consistent', (await page.$eval('meta[name=theme-color]', (m) => m.content)).toLowerCase() === man.theme_color.toLowerCase());
for (const i of man.icons) ok('icon exists ' + i.src, fs.existsSync(ROOT + '/' + i.src));
const reg = await page.waitForFunction(() => navigator.serviceWorker.ready.then(() => true), null, { timeout: 15000 }).then(() => true).catch(() => false); ok('service worker active', reg);
await page.reload(); await page.waitForFunction(() => window.__ready); await sleep(500);
ok('page controlled by sw', await page.evaluate(() => !!navigator.serviceWorker.controller));
// network-first: a changed JS file is served fresh while the sw controls the page
const f = ROOT + '/ui/js/terms.js', orig = fs.readFileSync(f, 'utf8'); fs.writeFileSync(f, orig + '\n// pwa-fresh-probe\n');
const txt = await page.evaluate(async () => (await fetch('ui/js/terms.js')).text()); fs.writeFileSync(f, orig);
ok('JS is network-first (fresh after publish)', txt.includes('pwa-fresh-probe'));
const SWV = fs.readFileSync(ROOT + '/sw.js', 'utf8').match(/VERSION = '([^']+)'/)[1];
ok('cache versioned per snapshot', await page.evaluate(async (v) => (await caches.keys()).includes(v), SWV), SWV);
await T.done('pwa_ui');
