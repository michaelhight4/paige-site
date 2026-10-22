// Ads policy (platform-switchable) + rewarded options. No ad SDK lives here: ads are shown through the adapter in src/adapter_ads.js.
//  android: rewarded ads, unlimited, plus a FORCED full-screen ad every 8-15 years. No Ads / All Access: no forced ads, and rewards are granted
//  instantly without an ad, as often as a normal player could watch it.
//  android(old): rewarded ads, unlimited.    steam: no ads shown; subscribers get the same reward options without an ad, once per option per real-life day.
// Config: data/ads.json (`platform` flag, ?platform=steam on the URL, or setPlatform()). Device-local state (Steam subscription stub, daily usage)
// is kept in localStorage `lifesim.ads.v1`, separate from saves. The reward is granted only after the adapter reports the FULL required duration.
import { fmtMoney } from './fmt.js';
import { D } from './data.js';
import * as Premium from './premium.js';
import { lifelineAdsRemoved } from './network.js';
import { getAdsAdapter } from './adapter_ads.js';

const KEY = 'lifesim.ads.v1', mem = { v: null };
const ls = () => { try { return typeof localStorage !== 'undefined' && localStorage && typeof localStorage.getItem === 'function' ? localStorage : null; } catch (e) { return null; } };
const blank = () => ({ v: 1, platform: null, steamSub: false, used: {} });
export function load() { const st = ls(); let r = null; try { r = st ? JSON.parse(st.getItem(KEY)) : mem.v; } catch (e) { r = null; } return r && r.used ? r : blank(); }
function save(f) { const st = ls(); try { if (st) st.setItem(KEY, JSON.stringify(f)); else mem.v = f; } catch (e) { mem.v = f; } return f; }
export const resetState = () => save(blank());

export const config = () => D.adsCfg;
let platformOverride = null; // ?platform=... (session only)
export const setPlatformOverride = (p) => { platformOverride = p && config().platforms[p] ? p : null; };
export const platform = () => platformOverride || load().platform || config().platform;
export function setPlatform(p) { const f = load(); f.platform = config().platforms[p] ? p : null; save(f); }
export const rules = () => config().platforms[platform()];
export const requiredMs = () => config().requiredMs;
// Steam subscription stub: a local flag, or an active All Access subscription
export const steamSubscribed = () => !!load().steamSub || Premium.subscribed();
export function setSteamSubscription(on) { const f = load(); f.steamSub = !!on; save(f); }
// injectable randomness (never the seeded game RNG, so seeded runs stay reproducible)
let rng = Math.random; export const setRng = (f) => { rng = f || Math.random; };
export const chance = () => rng();
const rint = (a, b) => a + Math.floor(rng() * (b - a + 1));

// ---- platform / entitlement ----
export const showsAds = () => !!rules().ads;                                   // rewarded ads are watched on this platform
export const noAds = () => lifelineAdsRemoved();                                 // No Ads pass OR All Access (Lifeline only) OR network Ad-Free for Life
export const promptsEnabled = () => showsAds() && !noAds();                      // forced ad every 8-15 years (No Ads / All Access turns it off)
export const dayKey = (now = Date.now()) => { const d = new Date(now); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
export const usedToday = (key, now) => load().used[key] === dayKey(now);
export function access(key, now = Date.now()) {
  const r = rules();
  if (r.ads && !noAds()) return { ok: true, mode: 'ad' };
  if (r.ads) return { ok: true, mode: 'direct' }; // No Ads / All Access: instant, same (no) limit as watching the ad
  if (r.subscribersOnly && !steamSubscribed()) return { ok: false, mode: 'locked', reason: 'Subscribers only on this platform' };
  if (r.rewardLimit === 'perOptionPerDay' && usedToday(key, now)) return { ok: false, mode: 'limit', reason: 'Used today. Back tomorrow.' };
  return { ok: true, mode: 'direct' };
}
// Run the gate for one reward option. Android: show the ad; reward only if it completed for the full duration. Steam: subscriber, once per option per real day.
export async function authorize(key, { placement = key, now = Date.now() } = {}) {
  const acc = access(key, now); if (!acc.ok) return { ok: false, reason: acc.reason, mode: acc.mode };
  if (acc.mode === 'direct') { const f = load(); f.used[key] = dayKey(now); save(f); return { ok: true, mode: 'direct' }; }
  const need = requiredMs(); let res;
  try { res = await getAdsAdapter().show({ placement, kind: 'rewarded', requiredMs: need, reward: key }); } catch (e) { return { ok: false, mode: 'ad', reason: 'The ad failed to load.' }; }
  if (!res || res.completed !== true || !(res.watchedMs >= need)) return { ok: false, mode: 'ad', reason: 'Ad not finished: no reward.', incomplete: true };
  return { ok: true, mode: 'ad', watchedMs: res.watchedMs };
}

// ---- reward options ----
export const statKeys = () => config().rewards.stats;
export function options(now = Date.now()) {
  const R = config().rewards, mk = (key, label, sub, icon) => ({ key, label, sub, icon, ...access(key, now) });
  return [mk('cash', '+' + fmtMoney(R.cash) + ' cash', 'Instant cash', '💵'), ...R.stats.map((st) => mk('stat:' + st, `+${R.statPoints}% ${st}`, 'Permanent boost', { health: '❤️', happiness: '😊', smarts: '🧠', looks: '✨', fame: '⭐' }[st] || '⬆️')),
    mk('club', 'Join any school club', 'Skips the age window and the club cap', '🎒'), mk('romance', 'Start a romance instantly', 'Meet someone and start dating, guaranteed', '💘'), mk('rare', 'Unlock a rare choice', 'Appears on some events', '🌟')];
}
export function applyStat(s, st, addStat) { addStat(s, st, config().rewards.statPoints); }

// ---- forced ad: every 8-15 years of play, never before 8. No reward; a failed/unavailable ad never blocks the game. ----
export async function showForced({ placement = 'forced_interval' } = {}) {
  if (!promptsEnabled()) return { shown: false, reason: 'no_ads' };
  try { const r = await getAdsAdapter().show({ placement, kind: 'interstitial', requiredMs: requiredMs() }); return { shown: !!(r && r.completed), reason: r && r.reason }; }
  catch (e) { return { shown: false, reason: 'failed to load' }; }
}
export const ensure = (s) => { if (!s.ads) s.ads = { played: 0, next: null, due: false, prompts: 0, unlockedRare: null }; return s.ads; };
export function schedule(s) { const A = ensure(s), P = config().randomPrompt; A.next = A.played + rint(P.minYears, P.maxYears); A.due = false; return A.next; }
// call once per aged year (dt=1); returns true when a prompt becomes due now
export function yearPassed(s) {
  const A = ensure(s), P = config().randomPrompt; A.played++;
  if (A.next == null) A.next = Math.max(P.firstAfter, rint(P.minYears, P.maxYears));
  if (A.played >= A.next && A.played >= P.firstAfter && !A.due && promptsEnabled()) { A.due = true; A.offer = pickOffer(); }
  else if (A.played >= A.next && !promptsEnabled() && !A.due) schedule(s); // prompts off: just roll the timer
  return !!A.due;
}
export function pickOffer() { const R = config().rewards, all = ['cash', ...R.stats.map((x) => 'stat:' + x)]; return all[Math.floor(rng() * all.length)]; }
export function dismissPrompt(s) { const A = ensure(s); A.prompts++; A.offer = null; rtReset(); return schedule(s); }

// ---- real-time fallback: a forced ad after 20 minutes of VISIBLE play time since the last forced ad (or since the timer started) ----
// Only active time counts (the UI pauses it on visibilitychange hidden). State persists in localStorage (rt.activeMs + rt.lastForcedAt), so a reload
// keeps the accumulated time. The ad itself is shown only at a natural break (next screen change or AGE tap), never while idle/backgrounded.
// Any forced ad (year trigger or this one) resets BOTH the 20-minute timer and the 8-15 year counter.
export const REALTIME_MS = 20 * 60 * 1000, MAX_TICK_MS = 2 * 60 * 1000; // one tick never adds more than 2 min (device sleep without a hidden event)
let clock = () => Date.now(); export const setClock = (f) => { clock = f || (() => Date.now()); rtSession.last = null; };
const rtSession = { last: null, visible: true }; // session-only: when we last accumulated
const rtState = (f) => (f.rt ||= { activeMs: 0, lastForcedAt: null });
export function rtTick(visible = rtSession.visible, now = clock()) {
  const f = load(), R = rtState(f);
  if (rtSession.last != null && rtSession.visible) R.activeMs += Math.max(0, Math.min(MAX_TICK_MS, now - rtSession.last));
  if (R.lastForcedAt == null) R.lastForcedAt = now;
  rtSession.last = now; rtSession.visible = !!visible; save(f); return R.activeMs;
}
export const rtActiveMs = () => rtState(load()).activeMs;
export const rtDue = (now = clock()) => promptsEnabled() && rtTick(rtSession.visible, now) >= REALTIME_MS;
export function rtReset(now = clock()) { const f = load(); f.rt = { activeMs: 0, lastForcedAt: now }; rtSession.last = now; save(f); }
// Full cadence reset after any forced ad: 20-min timer AND the 8-15 year counter restart from now.
export function resetCadence(s) { rtReset(); return schedule(s); }

// ---- legacy hook (kept): per-placement interstitials. The only forced ad is the 8-15 year one (showForced above); rewarded flow is authorize().
export const enabled = () => !Premium.isUnlocked('no_ads');
export async function gate(placement) { return { shown: false, skipped: !enabled(), placement, reason: enabled() ? 'no per-placement interstitials are wired' : 'no_ads' }; }
export const settingsRow = () => ({ id: 'ads', label: 'Ads', value: enabled() ? 'Rewarded + occasional full-screen (' + platform() + ')' : 'Off - No Ads (instant rewards)', locked: enabled() });
