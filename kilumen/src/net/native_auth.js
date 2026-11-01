// Google sign-in for the Android app (Capacitor 7; Gary approved Oct 31 2026). The WebView cannot do Google OAuth (Google blocks
// embedded WebViews and the page origin is https://localhost), so: Supabase OAuth with PKCE opens in the system browser
// (@capacitor/browser = Custom Tab), Supabase sends it back to the app link NATIVE_REDIRECT (intent filter in the app's
// AndroidManifest), @capacitor/app gives us that URL (appUrlOpen, or getLaunchUrl after a cold start), we swap the code for a
// session (stored in localStorage like the email sign-in), close the tab and reload so the usual cloud-save boot runs.
// Website: nothing here runs (isNativeApp() is false), the existing same-window redirect is unchanged.
// Supabase setting needed (Auth > URL Configuration > Redirect URLs): net.paigegames.kilumen://login-callback
import { SB_URL, SB_KEY, sbLib, isNativeApp } from './cloud_save.js?v=v0.2.116-alpha';

export const NATIVE_REDIRECT = 'net.paigegames.kilumen://login-callback';
const pkceOpts = { auth: { persistSession: true, autoRefreshToken: false, detectSessionInUrl: false, flowType: 'pkce' } };
let sbP = null;
const pkceClient = () => (sbP ||= import(sbLib()).then(({ createClient }) => createClient(SB_URL, SB_KEY, pkceOpts)));
/** A Capacitor plugin proxy (Capacitor 7 native bridge), or null on the web / when the plugin is not in the app. */
export function plugin(name, g = globalThis) {
  const C = g.Capacitor; if (!C) return null;
  try {
    const p = C.Plugins?.[name] || (C.isPluginAvailable?.(name) && C.registerPlugin ? C.registerPlugin(name) : null);
    if (p) return p;
    // No @capacitor/core bundle in the game: talk to the native bridge directly (Capacitor 7 native-bridge.js).
    if (typeof C.nativePromise !== 'function') return null;
    return new Proxy({}, { get: (_, m) => m === 'then' ? undefined
      : m === 'addListener' ? async (ev, fn) => C.addListener(name, ev, fn)
      : (opts = {}) => C.nativePromise(name, m, opts) });
  } catch { return null; }
}

/** The app link Supabase came back with -> { code } | { error } | null (not ours). Reads the query and the #hash. */
export function parseCallback(url) {
  if (typeof url !== 'string' || !url.toLowerCase().startsWith(NATIVE_REDIRECT)) return null;
  const rest = url.slice(NATIVE_REDIRECT.length), p = new URLSearchParams();
  for (const part of rest.split(/[?#]/).slice(1)) for (const [k, v] of new URLSearchParams(part)) p.set(k, v);
  if (p.get('code')) return { code: p.get('code') };
  return { error: p.get('error_description') || p.get('error') || 'Sign-in was cancelled.' };
}

/** Start: PKCE URL from Supabase (skipBrowserRedirect: the WebView stays put), open it in the system browser. */
export async function nativeGoogleSignIn(d = {}) {
  const browser = d.browser || plugin('Browser');
  if (!browser) return { ok: false, error: 'This app version cannot open Google sign-in. Use email and password.' };
  const sb = await (d.client ? d.client() : pkceClient());
  const { data, error } = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: NATIVE_REDIRECT, skipBrowserRedirect: true } });
  if (error || !data?.url) return { ok: false, error: error?.message || 'Could not start Google sign-in.' };
  await browser.open({ url: data.url });
  return { ok: true, url: data.url };
}

const done = new Set(); // a code is used once (appUrlOpen and getLaunchUrl can both report the same link)
/** Finish: swap the code for a session, close the tab, then reload (d.reload) so cloud saves + the owner check run. */
export async function handleCallback(url, d = {}) {
  const cb = parseCallback(url); if (!cb) return { ok: false, ignored: true };
  const browser = d.browser || plugin('Browser');
  try { await browser?.close?.(); } catch { /* already closed */ }
  if (cb.error) { d.toast?.(`Google sign-in: ${cb.error}`); return { ok: false, error: cb.error }; }
  if (done.has(cb.code)) return { ok: false, ignored: true };
  done.add(cb.code);
  try {
    const sb = await (d.client ? d.client() : pkceClient());
    const { data, error } = await sb.auth.exchangeCodeForSession(cb.code);
    if (error || !data?.session) { d.toast?.('Google sign-in did not finish. Please try again.'); return { ok: false, error: error?.message || 'no session' }; }
    (d.reload || (() => location.reload()))();
    return { ok: true };
  } catch (e) { d.toast?.('Could not reach the sign-in server. Check your connection.'); return { ok: false, error: e?.message || String(e) }; }
}

/** Boot hook (main.js). Web: does nothing. App: listen for the app link, and handle one that cold-started the app. */
export async function installNativeAuth(d = {}) {
  if (!(d.native ?? isNativeApp())) return false;
  const app = d.app || plugin('App'); if (!app) return false;
  try { await app.addListener('appUrlOpen', (e) => { handleCallback(e?.url, d); }); } catch (e) { console.warn('native auth listener:', e?.message || e); }
  try { const l = await app.getLaunchUrl?.(); if (l?.url) await handleCallback(l.url, d); } catch { /* none */ }
  return true;
}
export const _resetForTests = () => { done.clear(); sbP = null; };
