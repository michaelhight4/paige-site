// Kilumen ALPHA build (paigegames.net/kilumen/). Loaded before everything else (imported first by landscape.js and
// main.js). Public build: every dev / experimental URL flag is ignored. Only ?reset=1 (the title screen's
// "New game" uses it), ?battle=shell, ?enc=0, ?encrate=, ?contacts=0 and ?cv=0 are kept, and the query is removed from the address bar at once so a later reload never wipes a save.
export const ALPHA_VERSION = 'v0.2.22-alpha (Oct 2026)';
export const ALPHA_PREFIX = 'kilumen_alpha_'; // every save / setting key in this build starts with this
export const ALPHA_NOTICE = 'Kilumen is in alpha. Things will change, and saves may be reset between updates.';
export const ALPHA_NOTICE_KEY = ALPHA_PREFIX + 'notice_seen.v1';

const raw = new URLSearchParams(location.search);
const keep = new URLSearchParams();
if (raw.get('reset') === '1') keep.set('reset', '1');
// Hidden fallbacks kept: ?battle=shell (old scripted battles), ?enc=0 (wild encounters off), ?encrate=0..1 (per-step chance; default rate otherwise).
if (raw.get('battle') === 'shell') keep.set('battle', 'shell');
if (raw.get('enc') === '0') keep.set('enc', '0');
if (raw.has('encrate') && Number.isFinite(Number(raw.get('encrate')))) keep.set('encrate', raw.get('encrate'));
// v0.2.0 opt-outs (Gary Oct 23 2026: contacts / RITA are default on, ?contacts=0 / ?cv=0 turn them off). Only the '0' value is kept.
for (const k of ['contacts', 'cv']) if (raw.get(k) === '0') keep.set(k, '0');
export const ALPHA_QUERY = keep.toString();
if (location.search) { try { history.replaceState(history.state, '', location.pathname + location.hash); } catch { /* ignore */ } }

export function noticeSeen() { try { return localStorage.getItem(ALPHA_NOTICE_KEY) === '1'; } catch { return false; } }
export function markNoticeSeen() { try { localStorage.setItem(ALPHA_NOTICE_KEY, '1'); } catch { /* private mode */ } }



// v0.2.1 cache-busting (_tools/build_alpha.py cache_bust): same-origin data fetches with no query get ?v=<build>, so a returning
// player never mixes new code with a stale cached JSON (GitHub Pages max-age=600, no service worker).
export const ALPHA_FETCH_V = "v0.2.22-alpha";
if (typeof globalThis.fetch === 'function' && typeof location !== 'undefined') {
  const f0 = globalThis.fetch.bind(globalThis);
  globalThis.fetch = (input, init) => {
    try { if ((typeof input === 'string' || input instanceof URL) && !(init && init.method && init.method !== 'GET')) {
      const u = new URL(String(input), location.href);
      if (u.origin === location.origin && !u.search) { u.searchParams.set('v', ALPHA_FETCH_V); input = u.href; } } } catch { /* leave it */ }
    return f0(input, init);
  };
}
