// Kilumen ALPHA build (paigegames.net/kilumen/). Loaded before everything else (imported first by landscape.js and
// main.js). Public build: every dev / experimental URL flag is ignored. Only ?reset=1 (the title screen's
// "New game" uses it), ?battle=shell, ?enc=0, ?encrate=, ?contacts=0 and ?cv=0 are kept, and the query is removed from the address bar at once so a later reload never wipes a save.
export const ALPHA_VERSION = 'v0.2.52-alpha (Oct 2026)';
export const ALPHA_PREFIX = 'kilumen_alpha_'; // every save / setting key in this build starts with this
export const ALPHA_NOTICE = 'Kilumen is in alpha. Things will change, and saves may be reset between updates.';
export const ALPHA_NOTICE_KEY = ALPHA_PREFIX + 'notice_seen.v1';

const raw = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');
const keep = new URLSearchParams();
if (raw.get('reset') === '1') keep.set('reset', '1');
// Hidden fallbacks kept: ?battle=shell (old scripted battles), ?enc=0 (wild encounters off), ?encrate=0..1 (per-step chance; default rate otherwise).
if (raw.get('battle') === 'shell') keep.set('battle', 'shell');
if (raw.get('enc') === '0') keep.set('enc', '0');
if (raw.has('encrate') && Number.isFinite(Number(raw.get('encrate')))) keep.set('encrate', raw.get('encrate'));
// v0.2.0 opt-outs (Gary Oct 23 2026: contacts / RITA are default on, ?contacts=0 / ?cv=0 turn them off). Only the '0' value is kept.
for (const k of ['contacts', 'cv', 'sports', 'ix2', 'ixlight', 'cloudsave', 'rtb']) if (raw.get(k) === '0') keep.set(k, '0');
if (raw.get('ix2') === '0') globalThis.KILUMEN_IX2_OFF = true; // Interiors v2 kill switch (Oct 29 2026): old interiors
if (raw.get('ixlight') === '0') globalThis.KILUMEN_IXLIGHT_OFF = true; // no ix2 plane lighting / indoor night shade
if (raw.get('rtb') === '0') globalThis.KILUMEN_RTB_OFF = true; // real-time wild battles kill switch (Oct 29 2026): turn-based only, no switch button
if (raw.get('cidle') === '0') globalThis.KILUMEN_CIDLE_OFF = true; // creature idle off switch (creature_idle.js)
export const ALPHA_QUERY = keep.toString();
// v0.2.26: ?dev=1 only REQUESTS the dev console. It is read here (the query is stripped just below) and does nothing alone:
// src/dev/devgate.js still needs a signed-in admin account (server check) before any dev code is loaded.
export const DEV_REQUESTED = raw.get('dev') === '1';
if (typeof location !== 'undefined' && location.search) { try { history.replaceState(history.state, '', location.pathname + location.hash); } catch { /* ignore */ } }

export function noticeSeen() { try { return localStorage.getItem(ALPHA_NOTICE_KEY) === '1'; } catch { return false; } }
export function markNoticeSeen() { try { localStorage.setItem(ALPHA_NOTICE_KEY, '1'); } catch { /* private mode */ } }



// v0.2.1 cache-busting (_tools/build_alpha.py cache_bust): same-origin data fetches with no query get ?v=<build>, so a returning
// player never mixes new code with a stale cached JSON (GitHub Pages max-age=600, no service worker).
export const ALPHA_FETCH_V = "v0.2.52-alpha";
if (typeof globalThis.fetch === 'function' && typeof location !== 'undefined') {
  const f0 = globalThis.fetch.bind(globalThis);
  globalThis.fetch = (input, init) => {
    try { if ((typeof input === 'string' || input instanceof URL) && !(init && init.method && init.method !== 'GET')) {
      const u = new URL(String(input), location.href);
      if (u.origin === location.origin && !u.search) { u.searchParams.set('v', ALPHA_FETCH_V); input = u.href; } } } catch { /* leave it */ }
    return f0(input, init);
  };
}
