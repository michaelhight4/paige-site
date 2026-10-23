// Kilumen ALPHA build (paigegames.net/kilumen/). Loaded before everything else (imported first by landscape.js and
// main.js). Public build: every dev / experimental URL flag is ignored. Only ?reset=1 (the title screen's
// "New game" uses it), ?battle=shell, ?enc=0 and ?encrate= are kept, and the query is removed from the address bar at once so a later reload never wipes a save.
export const ALPHA_VERSION = 'v0.1.2-alpha (Oct 2026)';
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
export const ALPHA_QUERY = keep.toString();
if (location.search) { try { history.replaceState(history.state, '', location.pathname + location.hash); } catch { /* ignore */ } }

export function noticeSeen() { try { return localStorage.getItem(ALPHA_NOTICE_KEY) === '1'; } catch { return false; } }
export function markNoticeSeen() { try { localStorage.setItem(ALPHA_NOTICE_KEY, '1'); } catch { /* private mode */ } }
