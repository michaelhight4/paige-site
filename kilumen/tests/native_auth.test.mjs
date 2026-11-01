// Android app Google sign-in (Capacitor, Oct 31 2026): PKCE in the system browser, back through the app link.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as N from '../src/net/native_auth.js';
import { isNativeApp, sbLib, SB_LIB, SB_LIB_LOCAL } from '../src/net/cloud_save.js';

const fakeClient = (log, over = {}) => () => Promise.resolve({ auth: {
  signInWithOAuth: async (o) => { log.push(['oauth', o]); return over.oauth || { data: { url: 'https://kjdubkeowcyuoazvpoyt.supabase.co/auth/v1/authorize?provider=google' }, error: null }; },
  exchangeCodeForSession: async (c) => { log.push(['exchange', c]); return over.exchange || { data: { session: { user: {} } }, error: null }; },
} });
const fakeBrowser = (log) => ({ open: async (o) => log.push(['open', o.url]), close: async () => log.push(['close']) });

test('native detection: web stays web, the app uses the bundled lib', () => {
  assert.equal(isNativeApp({}), false); assert.equal(sbLib({}), SB_LIB);
  assert.equal(isNativeApp({ Capacitor: { isNativePlatform: () => false } }), false);
  const app = { Capacitor: { isNativePlatform: () => true } }; assert.equal(isNativeApp(app), true); assert.equal(sbLib(app), SB_LIB_LOCAL);
  assert.ok(fs.existsSync(new URL(SB_LIB_LOCAL)));
});
test('bundled supabase lib loads offline and has PKCE exchange', async () => {
  const { createClient } = await import(SB_LIB_LOCAL);
  const c = createClient('https://x.supabase.co', 'k', { auth: { flowType: 'pkce', persistSession: false } });
  assert.equal(typeof c.auth.exchangeCodeForSession, 'function');
  assert.doesNotMatch(fs.readFileSync(new URL(SB_LIB_LOCAL), 'utf8'), /from\s*["']https?:/);
});
test('parseCallback: code from query or hash, errors, foreign links ignored', () => {
  assert.deepEqual(N.parseCallback(N.NATIVE_REDIRECT + '?code=abc'), { code: 'abc' });
  assert.deepEqual(N.parseCallback(N.NATIVE_REDIRECT + '#code=xyz'), { code: 'xyz' });
  assert.equal(N.parseCallback(N.NATIVE_REDIRECT + '?error=access_denied&error_description=User+cancelled').error, 'User cancelled');
  assert.equal(N.parseCallback('https://paigegames.net/?code=abc'), null); assert.equal(N.parseCallback(null), null);
});
test('sign-in start: PKCE URL, redirect to the app link, opened in the system browser, WebView not redirected', async () => {
  N._resetForTests(); const log = [];
  const r = await N.nativeGoogleSignIn({ client: fakeClient(log), browser: fakeBrowser(log) });
  assert.equal(r.ok, true); const o = log[0][1];
  assert.equal(o.provider, 'google'); assert.equal(o.options.redirectTo, N.NATIVE_REDIRECT); assert.equal(o.options.skipBrowserRedirect, true);
  assert.deepEqual(log[1], ['open', r.url]);
});
test('sign-in start without the Browser plugin: clear message', async () => {
  const r = await N.nativeGoogleSignIn({ client: fakeClient([]), browser: null }); assert.equal(r.ok, false); assert.match(r.error, /email and password/);
});
test('callback: exchange once, close tab, reload', async () => {
  N._resetForTests(); const log = []; let reloads = 0; const d = { client: fakeClient(log), browser: fakeBrowser(log), reload: () => reloads++ };
  assert.equal((await N.handleCallback(N.NATIVE_REDIRECT + '?code=c1', d)).ok, true);
  assert.deepEqual(log, [['close'], ['exchange', 'c1']]); assert.equal(reloads, 1);
  assert.equal((await N.handleCallback(N.NATIVE_REDIRECT + '?code=c1', d)).ignored, true); assert.equal(reloads, 1);
});
test('callback errors: cancelled, failed exchange -> toast, no reload', async () => {
  N._resetForTests(); const t = []; let reloads = 0;
  const r1 = await N.handleCallback(N.NATIVE_REDIRECT + '?error=access_denied', { client: fakeClient([]), browser: fakeBrowser([]), toast: (x) => t.push(x), reload: () => reloads++ });
  assert.equal(r1.ok, false);
  const r2 = await N.handleCallback(N.NATIVE_REDIRECT + '?code=c2', { client: fakeClient([], { exchange: { data: {}, error: { message: 'bad code' } } }), browser: fakeBrowser([]), toast: (x) => t.push(x), reload: () => reloads++ });
  assert.equal(r2.error, 'bad code'); assert.equal(t.length, 2); assert.equal(reloads, 0);
  assert.equal((await N.handleCallback('https://elsewhere/?code=z', {})).ignored, true);
});
test('install: web no-op; app listens for appUrlOpen and handles a cold-start launch URL', async () => {
  N._resetForTests();
  assert.equal(await N.installNativeAuth({ native: false }), false);
  const log = []; let listener = null; let reloads = 0;
  const app = { addListener: async (ev, fn) => { log.push(ev); listener = fn; }, getLaunchUrl: async () => ({ url: N.NATIVE_REDIRECT + '?code=cold' }) };
  const d = { native: true, app, client: fakeClient(log), browser: fakeBrowser(log), reload: () => reloads++ };
  assert.equal(await N.installNativeAuth(d), true); assert.equal(log[0], 'appUrlOpen'); assert.ok(log.some((x) => x[0] === 'exchange' && x[1] === 'cold'));
  await listener({ url: N.NATIVE_REDIRECT + '?code=warm' }); await new Promise((r) => setTimeout(r, 0));
  assert.ok(log.some((x) => x[0] === 'exchange' && x[1] === 'warm')); assert.equal(reloads, 2);
});
test('plugin lookup: Capacitor.Plugins, registerPlugin fallback, none on web', () => {
  const B = {}; assert.equal(N.plugin('Browser', { Capacitor: { Plugins: { Browser: B } } }), B);
  const R = {}; assert.equal(N.plugin('App', { Capacitor: { Plugins: {}, isPluginAvailable: () => true, registerPlugin: () => R } }), R);
  assert.equal(N.plugin('App', {}), null);
  const calls = []; const C = { Plugins: {}, nativePromise: async (...a) => { calls.push(a); return { url: 'u' }; }, addListener: (...a) => { calls.push(['L', ...a]); return { remove() {} }; } };
  const app = N.plugin('App', { Capacitor: C });
  return Promise.all([app.getLaunchUrl(), app.addListener('appUrlOpen', () => {}), N.plugin('Browser', { Capacitor: C }).open({ url: 'x' })]).then(([r]) => {
    assert.equal(r.url, 'u'); assert.deepEqual(calls[0], ['App', 'getLaunchUrl', {}]); assert.equal(calls[1][0], 'L'); assert.equal(calls[1][1], 'App');
    assert.deepEqual(calls[2], ['Browser', 'open', { url: 'x' }]);
  });
});
test('wiring: account uses native flow only in the app; web Google redirect unchanged; main installs the hook', () => {
  const acc = fs.readFileSync(new URL('../src/net/account.js', import.meta.url), 'utf8');
  assert.match(acc, /if \(isNativeApp\(\)\) \{[^]*nativeGoogleSignIn\(\)/);
  assert.match(acc, /signInWithOAuth\(\{ provider: 'google', options: \{ redirectTo: location\.origin \+ location\.pathname \} \}\)/);
  const main = fs.readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  assert.match(main, /isNativePlatform\?\.\(\)\) import\('\.\/net\/native_auth\.js/);
});
