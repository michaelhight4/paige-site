// Kilumen ALPHA build (paigegames.net/kilumen/). Loaded before everything else (imported first by landscape.js and
// main.js). Public build: every dev / experimental URL flag is ignored. Only ?reset=1 (the title screen's
// "New game" uses it), ?battle=shell, ?enc=0, ?encrate=, ?contacts=0 and ?cv=0 are kept (plus the =0 kill switches listed below: fishing, feeds, rtbcap, badges, ...), and the query is removed from the address bar at once so a later reload never wipes a save.
export const ALPHA_VERSION = 'v0.2.95-alpha (Oct 2026)';
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
for (const k of ['contacts', 'cv', 'sports', 'ix2', 'ixlight', 'cloudsave', 'rtb', 'fishing', 'feeds', 'rtbcap', 'wind']) if (raw.get(k) === '0') keep.set(k, '0');
if (raw.get('ix2') === '0') globalThis.KILUMEN_IX2_OFF = true; // Interiors v2 kill switch (Oct 29 2026): old interiors
if (raw.get('ixlight') === '0') globalThis.KILUMEN_IXLIGHT_OFF = true; // no ix2 plane lighting / indoor night shade
if (raw.get('rtbcap') === '0') globalThis.KILUMEN_RTB_CAPTURE_OFF = true; // real-time Capture button / tab kill switch (v0.2.65): no crystals in real-time (T to turn-based still captures)
if (raw.get('feeds') === '0') globalThis.KILUMEN_FEEDS = false; // fruit feeds kill switch (v0.2.65)
if (raw.get('rtb') === '0') globalThis.KILUMEN_RTB_OFF = true; // real-time wild battles kill switch (Oct 29 2026): turn-based only, no switch button
globalThis.KILUMEN_BADGES_TAB = raw.get('badges') !== '0'; // Badges tab in the Pack (default ON since v0.2.64; ?badges=0 kill switch)
globalThis.KILUMEN_COIN_ART = raw.get('badges') !== '0' && raw.get('coinart') !== '0'; // Animator's coin art (default ON; ?badges=0 or ?coinart=0 kill switch)
if (raw.get('tasks') === '0') globalThis.KILUMEN_TASKS_OFF = true; // Tasks (quests + milestones) kill switch (Oct 29 2026): old placeholder screen
if (raw.get('hallanim') === '0') globalThis.KILUMEN_HALLANIM = false; // hall animated tiles kill switch (hall overhaul, dev default on; public default off)
if (raw.get('wind') === '0') globalThis.KILUMEN_WIND_OFF = true; // world wind kill switch (Oct 29 2026, wind.js): no tree sway / grass ripple / flower bob
if (raw.get('cidle') === '0') globalThis.KILUMEN_CIDLE_OFF = true; // creature idle off switch (creature_idle.js)
// QoL kill switches (Oct 29 2026): ?qol= (batch A/B, src/qol) and ?qolc= (batch C, src/qol_c) are kept, letters / , / - only.
for (const k of ['qol', 'qolc']) if (raw.has(k) && /^[A-Za-z0-9,-]{1,80}$/.test(raw.get(k))) keep.set(k, raw.get(k));
export const ALPHA_QUERY = keep.toString();
// v0.2.26: ?dev=1 only REQUESTS the dev console. It is read here (the query is stripped just below) and does nothing alone:
// src/dev/devgate.js still needs a signed-in admin account (server check) before any dev code is loaded.
// playtest fixes 3: the query is stripped below, so a hard refresh lost ?dev=1. Remember the request for this tab only
// (sessionStorage; ?dev=0 forgets it). Still only a request: devgate.js keeps the server-side admin check.
const DEV_SS = ALPHA_PREFIX + 'dev_requested';
const ss = (fn) => { try { return fn(globalThis.sessionStorage); } catch { return null; } };
if (raw.get('dev') === '1') ss((s) => s.setItem(DEV_SS, '1'));
else if (raw.get('dev') === '0') ss((s) => s.removeItem(DEV_SS));
export const DEV_REQUESTED = raw.get('dev') === '1' || (raw.get('dev') !== '0' && ss((s) => s.getItem(DEV_SS)) === '1');
// v0.2.88: this replaceState is why the address bar 'dropped to /kilumen/' (playtester report). It is on purpose for every
// other flag (a reload must never re-run ?reset=1 etc.), but ?dev=1 is only a request and harmless on reload, so it stays visible.
if (typeof location !== 'undefined' && location.search) { try { history.replaceState(history.state, '', location.pathname + (raw.get('dev') === '1' ? '?dev=1' : '') + location.hash); } catch { /* ignore */ } }

export function noticeSeen() { try { return localStorage.getItem(ALPHA_NOTICE_KEY) === '1'; } catch { return false; } }
export function markNoticeSeen() { try { localStorage.setItem(ALPHA_NOTICE_KEY, '1'); } catch { /* private mode */ } }



// v0.2.1 cache-busting (_tools/build_alpha.py cache_bust): same-origin data fetches with no query get ?v=<build>, so a returning
// player never mixes new code with a stale cached JSON (GitHub Pages max-age=600, no service worker).
export const ALPHA_FETCH_V = "v0.2.95-alpha";
if (typeof globalThis.fetch === 'function' && typeof location !== 'undefined') {
  const f0 = globalThis.fetch.bind(globalThis);
  globalThis.fetch = (input, init) => {
    try { if ((typeof input === 'string' || input instanceof URL) && !(init && init.method && init.method !== 'GET')) {
      const u = new URL(String(input), location.href);
      if (u.origin === location.origin && !u.search) { u.searchParams.set('v', ALPHA_FETCH_V); input = u.href; } } } catch { /* leave it */ }
    return f0(input, init);
  };
}
