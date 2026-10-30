// Bug 6 (Oct 30, 2026): black screen on a cold load. Root cause: nothing painted until scene.init() had every tile sheet of the
// zoom set (~12 MB, ~220 requests cold) and ui.js mounted the title; a slow first visit sat on a black page for 30 s+.
// Fix: a plain-HTML boot screen in index.html that main.js removes on title mount and turns into an error + Reload on failure.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');

test('boot screen is static HTML before the module scripts and exposes done/fail', () => {
  const at = html.indexOf('id="kboot"');
  assert.ok(at > 0 && at < html.indexOf('src/main.js'), 'boot screen comes before main.js');
  const js = /<script>\s*([\s\S]*?)<\/script>/.exec(html)[1];
  const els = {}; const mk = (id) => (els[id] = { id, style: {}, hidden: true, isConnected: true, textContent: '', remove() { this.isConnected = false; } });
  ['kboot', 'kboot-bar', 'kboot-msg', 'kboot-reload'].forEach(mk);
  const win = {}; const ctx = { window: win, document: { getElementById: (i) => els[i] }, location: { reload() {} }, setTimeout: (f) => f(), PerformanceObserver: undefined };
  vm.runInNewContext(js, ctx);
  win.__kboot.fail('net down');
  assert.match(els['kboot-msg'].textContent, /could not load: net down/);
  assert.equal(els['kboot-reload'].hidden, false);
  win.__kboot.done();
  assert.equal(els.kboot.isConnected, false);
  win.__kboot.done(); win.__kboot.fail('late'); // idempotent after removal
});

test('main.js clears the boot screen on title mount / ui failure / ?ui=0, and fails it on load errors', () => {
  assert.match(main, /uiReady = true; window\.__kboot\?\.done\(\)/);
  assert.match(main, /uiState = 'failed'; window\.__kboot\?\.done\(\)/);
  assert.match(main, /q\.get\('ui'\) === '0'\) window\.kilumen\.ready\.then\(\(\) => window\.__kboot\?\.done\(\)/);
  assert.match(main, /Failed to load: ' \+ e\.message\); window\.__kboot\?\.fail/);
  assert.match(main, /platform profile: ' \+ e\.message\); window\.__kboot\?\.fail/);
});
