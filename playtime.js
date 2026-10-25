// Server play time for paigegames.net games (Oct 24 2026). Before this, no game on the site ever called the
// play_heartbeat RPC, so public.play_time stayed empty and every account showed 0 / wrong play time.
// Usage: <script type="module" src="/playtime.js?game=kilumen"></script>
// Rules (server: public.play_heartbeat credits only the real time since the previous beat, max 60 s, beats < 50 s apart
// credit nothing, gaps > 120 s start a new session): beat about every 60 s, but ONLY while the page is visible, focused-ish
// (input in the last 5 min), and this tab holds the cross-tab lock, so several tabs / games never stack.
// Time is measured from real timestamps (performance.now deltas, each capped), so throttled timers can't inflate it.
// Guests / signed-out players are skipped (the RPC needs a signed-in account). Existing totals are only ever added to.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
const GAME = new URL(import.meta.url).searchParams.get('game');
if (GAME && !navigator.webdriver) {
  const sb = createClient('https://kjdubkeowcyuoazvpoyt.supabase.co', 'sb_publishable_NZC6vzmXDYRLnRh2vDHWAg_VCDi3FQc', { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } });
  const ID = Math.random().toString(36).slice(2), LOCK = 'paige_pt_lock', IDLE_MS = 5 * 60e3, BEAT_MS = 60e3, MAX_DT = 5e3, LOCK_TTL = 15e3;
  let lastInput = Date.now(), lastTick = performance.now(), activeMs = 0, lastBeatWall = 0, busy = false, signedIn = false;
  const ls = { get: (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch (_) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {} } };
  const active = () => document.visibilityState === 'visible' && Date.now() - lastInput < IDLE_MS;
  const leader = () => { const l = ls.get(LOCK), now = Date.now(); if (!l || l.id === ID || now - l.t > LOCK_TTL) { ls.set(LOCK, { id: ID, t: now }); return ls.get(LOCK)?.id === ID; } return false; };
  const release = () => { if (ls.get(LOCK)?.id === ID) try { localStorage.removeItem(LOCK); } catch (_) {} };
  for (const e of ['pointerdown', 'keydown', 'touchstart', 'wheel', 'gamepadconnected']) addEventListener(e, () => { lastInput = Date.now(); }, { passive: true, capture: true });
  sb.auth.getSession().then(({ data }) => { signedIn = !!(data.session && !data.session.user?.is_anonymous); });
  sb.auth.onAuthStateChange((_e, s) => { signedIn = !!(s && !s.user?.is_anonymous); });
  const beat = async () => {
    if (busy || !signedIn) return; busy = true;
    try { const { error } = await sb.rpc('play_heartbeat', { p_game: GAME }); if (!error) { lastBeatWall = Date.now(); activeMs = 0; } } catch (_) {} finally { busy = false; }
  };
  const tick = () => {
    const now = performance.now(), dt = Math.min(Math.max(0, now - lastTick), MAX_DT); lastTick = now;
    if (!active() || !leader()) return;
    activeMs += dt;
    // first beat of a session (none yet, or the previous one is older than the server's 120 s session gap) opens it;
    // after that, beat once a full minute of real, visible, active time has built up
    if (!lastBeatWall || Date.now() - lastBeatWall > 115e3) { if (activeMs >= 1e3) beat(); }
    else if (activeMs >= BEAT_MS - 2e3 && Date.now() - lastBeatWall >= 52e3) beat();
  };
  setInterval(tick, 1000);
  const pause = () => { lastTick = performance.now(); release(); };
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { lastTick = performance.now(); lastInput = Date.now(); } else { if (activeMs >= 50e3) beat(); pause(); } });
  addEventListener('pagehide', () => { if (activeMs >= 50e3) beat(); pause(); });
}
