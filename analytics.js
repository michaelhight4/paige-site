// First-party analytics for paigegames.net. No third-party trackers, no cookies, no PII.
// Logs: daily_visit (at most ONCE per visitor per America/Chicago calendar day; server also dedupes on (visitor_id, ct_day)),
// interaction (page_view, play, listen, webtoon_open, gift_claim, wallet_open, store_open, social_out; same type+target at most once per 10 s),
// signup, login (from auth.js). Old 'visit' rows (pre Oct 2026) are shown as "Legacy visits".
// Skipped entirely when: Do Not Track / Global Privacy Control, bots/crawlers/link previews, headless or automated browsers
// (navigator.webdriver, HeadlessChrome, Playwright, Puppeteer, Lighthouse), admins (admin_me via auth.js -> pa_admin), or the
// device opt-out pa_ignore=1 (set with ?notrack=1, cleared with ?notrack=0). Read access is admin-only (admin_site_stats RPC).
(function (root) {
  'use strict';
  var URL_ = 'https://kjdubkeowcyuoazvpoyt.supabase.co', KEY = 'sb_publishable_NZC6vzmXDYRLnRh2vDHWAg_VCDi3FQc';
  var HOSTS = [[/(^|\.)tiktok\.com$|(^|\.)tiktokv\.com$/, 'tiktok'], [/(^|\.)youtube\.com$|(^|\.)youtu\.be$/, 'youtube'], [/(^|\.)instagram\.com$/, 'instagram'],
    [/(^|\.)facebook\.com$|(^|\.)fb\.com$|(^|\.)fb\.me$|(^|\.)messenger\.com$/, 'facebook'], [/(^|\.)x\.com$|(^|\.)twitter\.com$|^t\.co$/, 'x'],
    [/(^|\.)discord\.com$|(^|\.)discord\.gg$|(^|\.)discordapp\.(com|net)$/, 'discord'], [/(^|\.)reddit\.com$|(^|\.)redd\.it$/, 'reddit'],
    [/(^|\.)google\.[a-z.]+$/, 'google'], [/(^|\.)bing\.com$/, 'bing'], [/(^|\.)webtoons\.com$/, 'webtoon'], [/(^|\.)linktr\.ee$/, 'linktree']];
  var ALIAS = { tt: 'tiktok', tiktok: 'tiktok', yt: 'youtube', youtube: 'youtube', ig: 'instagram', insta: 'instagram', instagram: 'instagram', fb: 'facebook', facebook: 'facebook',
    x: 'x', twitter: 'x', discord: 'discord', reddit: 'reddit', google: 'google', bing: 'bing', webtoon: 'webtoon', webtoons: 'webtoon', linktree: 'linktree', direct: 'direct' };
  var clean = function (s, n) { return String(s || '').toLowerCase().replace(/[^a-z0-9:._/-]/g, '').slice(0, n || 80); };
  function fromHost(h) { h = clean(h, 120).replace(/^www\.|^m\.|^l\.|^lm\.|^vm\.|^out\./, ''); for (var i = 0; i < HOSTS.length; i++) if (HOSTS[i][0].test(h)) return HOSTS[i][1]; return h ? 'other:' + h : 'direct'; }
  function isTikTokUA(ua) { return /musical_ly|BytedanceWebview|TikTok/i.test(ua || ''); }
  // src param > utm_source > TikTok in-app UA > referrer host > direct
  function classify(o) {
    var p = clean(o.src) || clean(o.utm_source);
    if (p) return ALIAS[p] || (fromHost(p).indexOf('other:') ? fromHost(p) : p);
    if (isTikTokUA(o.ua)) return 'tiktok';
    var h = o.referrerHost; if (!h || h === o.selfHost) return 'direct';
    return fromHost(h);
  }
  function device(ua, touch) { if (/iPad|Tablet|PlayBook|Silk|Kindle/i.test(ua) || (/Macintosh/.test(ua) && touch > 1) || (/Android/i.test(ua) && !/Mobi/i.test(ua))) return 'tablet'; return /Mobi|iPhone|iPod|Android/i.test(ua) ? 'phone' : 'desktop'; }
  var BOT_UA = /\bbot\b|[a-z]bot\/|crawl|spider|slurp|facebookexternalhit|discordbot|tiktokbot|twitterbot|preview|headlesschrome|playwright|puppeteer|lighthouse|chrome-lighthouse/i;
  function isBot(ua, webdriver) { return webdriver === true || !ua || BOT_UA.test(ua); }
  // CT calendar day (YYYY-MM-DD) for a Date; DST-safe via Intl.
  function ctDay(d) {
    var p = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(d || new Date()), o = {};
    p.forEach(function (x) { o[x.type] = x.value; }); return o.year + '-' + o.month + '-' + o.day;
  }
  // Client dedupe: true (and remembers) when this visitor has not yet been counted on CT day `day`. store = {get,set}.
  function claimDaily(store, day) { if (store.get('pa_day') === day) return false; store.set('pa_day', day); return true; }
  // Interaction throttle: same type+target at most once per `ms`. map is mutated (old keys pruned).
  var THROTTLE_MS = 10000;
  function throttleOk(map, key, now, ms) {
    ms = ms || THROTTLE_MS; for (var k in map) if (now - map[k] >= ms) delete map[k];
    if (map[key] !== undefined) return false; map[key] = now; return true;
  }
  var SOCIAL = { tiktok: 1, youtube: 1, instagram: 1, facebook: 1, x: 1, discord: 1, reddit: 1, linktree: 1 };
  // Map a clicked element (duck-typed: closest(), getAttribute(), id) to {type, target} or null. selfHost = location.hostname.
  function classifyClick(el, selfHost) {
    if (!el || !el.closest) return null;
    var t;
    if ((t = el.closest('#gift-claim'))) return { type: 'gift_claim', target: 'daily' };
    if ((t = el.closest('[data-song]'))) return { type: 'listen', target: 'song:' + clean(t.getAttribute('data-song'), 8) };
    if ((t = el.closest('[data-here]'))) return { type: 'listen', target: 'song:' + clean(t.getAttribute('data-here'), 8) };
    if ((t = el.closest('[data-store]'))) return { type: 'store_open', target: clean(t.getAttribute('data-store'), 60) || 'store' };
    var a = el.closest('a[href]'); if (!a) return null;
    var href = a.getAttribute('href') || '', u;
    if (/^#wallet$/.test(href) || a.getAttribute('data-go') === 'wallet') return { type: 'wallet_open', target: 'wallet' };
    try { u = new URL(href, 'https://' + (selfHost || 'paigegames.net') + '/'); } catch (e) { return null; }
    var host = u.hostname.replace(/^www\./, '');
    if (/(^|\.)webtoons\.com$/.test(host)) { var m = u.pathname.match(/\/canvas\/([^/]+)/); return { type: 'webtoon_open', target: clean(m ? m[1] : 'webtoon', 80) }; }
    var cls = ' ' + (a.getAttribute('class') || '') + ' ';
    if (/ play /.test(cls) || (host === selfHost && /^\/(play|games|riftward)(\/|$)/.test(u.pathname))) {
      var seg = u.pathname.replace(/\.html$/, '').split('/').filter(Boolean); return { type: 'play', target: clean(seg[seg.length - 1] || host, 80) };
    }
    if (host !== selfHost) { var p = fromHost(host); if (SOCIAL[p]) return { type: 'social_out', target: p }; }
    if (host === selfHost && /^\/(tiktok|youtube|instagram|facebook|x|discord)(\/|$)/.test(u.pathname)) return { type: 'social_out', target: ALIAS[u.pathname.split('/')[1]] };
    return null;
  }
  var api = { classify: classify, fromHost: fromHost, isTikTokUA: isTikTokUA, device: device, isBot: isBot, ctDay: ctDay, claimDaily: claimDaily, throttleOk: throttleOk, classifyClick: classifyClick, THROTTLE_MS: THROTTLE_MS };
  if (typeof module !== 'undefined') { module.exports = api; return; }

  var ls = function (k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { return null; } };
  var q0 = new URLSearchParams(location.search);
  if (q0.get('notrack') === '1') ls('pa_ignore', '1'); else if (q0.get('notrack') === '0') ls('pa_ignore', null);
  var nav = root.navigator, off = nav.doNotTrack === '1' || root.doNotTrack === '1' || nav.msDoNotTrack === '1' || nav.globalPrivacyControl === true ||
    isBot(nav.userAgent, nav.webdriver) || ls('pa_ignore') === '1' || ls('pa_admin') === '1';
  var ss = function (k, v) { try { if (v === undefined) return sessionStorage.getItem(k); sessionStorage.setItem(k, v); } catch (e) { return null; } };
  var uuid = function () { return root.crypto && crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) { var r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); }); };
  var q = new URLSearchParams(location.search), ref = '';
  try { ref = document.referrer ? new URL(document.referrer).hostname : ''; } catch (e) {}
  var utm = { utm_source: clean(q.get('utm_source')) || null, utm_medium: clean(q.get('utm_medium')) || null, utm_campaign: clean(q.get('utm_campaign'), 120) || null };
  var attributed = classify({ src: q.get('src'), utm_source: q.get('utm_source'), ua: nav.userAgent, referrerHost: ref, selfHost: location.hostname });
  // Session source: first attributed source this tab-session; SPA tab changes inherit it.
  var source = attributed !== 'direct' ? attributed : (ss('pa_src') || 'direct');
  ss('pa_src', source);
  if (!off && attributed !== 'direct' && !ls('pa_first')) ls('pa_first', attributed); // first-touch, for signups by source
  // Remove tracking params from the address bar (the values were captured above).
  var STRIP = ['src', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'notrack'];
  if (STRIP.some(function (k) { return q.has(k); })) {
    STRIP.forEach(function (k) { q.delete(k); });
    var s = q.toString(); history.replaceState(history.state, '', location.pathname + (s ? '?' + s : '') + location.hash);
  }
  var vid = ls('pa_vid'); if (!/^[0-9a-f-]{36}$/.test(vid || '')) { vid = uuid(); if (!off) ls('pa_vid', vid); }
  var dev = device(nav.userAgent, nav.maxTouchPoints || 0);
  function pagePath() { var h = /^#[a-z0-9_-]{1,40}$/i.test(location.hash) ? location.hash : ''; return (location.pathname + h).slice(0, 200); }
  function row(event, userId, it) {
    return { event: event, interaction_type: it ? it.type : null, target: it ? String(it.target || '').toLowerCase().replace(/[^a-z0-9:._\/#-]/g, '').slice(0, 200) || null : null, path: pagePath(), source: source, first_source: ls('pa_first') || (source !== 'direct' ? source : null), referrer_host: ref && ref !== location.hostname ? ref.slice(0, 120) : null,
      utm_source: utm.utm_source, utm_medium: utm.utm_medium, utm_campaign: utm.utm_campaign, device: dev, visitor_id: vid, user_id: userId || null };
  }
  function post(r, token) {
    if (off) return Promise.resolve();
    try { return fetch(URL_ + '/rest/v1/site_events', { method: 'POST', keepalive: true, headers: { apikey: KEY, Authorization: 'Bearer ' + (token || KEY), 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify(r) }).catch(function () {}); } catch (e) { return Promise.resolve(); }
  }
  var store = { get: function (k) { return ls(k); }, set: function (k, v) { ls(k, v); } };
  var dailyReady = Promise.resolve(); // settles once today's daily_visit insert (if any) has finished; visitor-banner.js waits on it
  function daily() { if (!off && claimDaily(store, ctDay(new Date()))) dailyReady = post(row('daily_visit')); }
  var recent = {};
  function interact(type, target) {
    if (off || !type) return; var it = { type: type, target: target };
    if (throttleOk(recent, type + '|' + (target || ''), Date.now())) post(row('interaction', null, it));
  }
  // Auth events (called by auth.js with the user's access token so user_id passes RLS). Deduped.
  function auth(event, user, token) {
    if (off || !user || user.is_anonymous) return;
    var key = event === 'signup' ? 'pa_signup_' + user.id : 'pa_login_' + user.id;
    if (event === 'signup' ? ls(key) : ss(key)) return;
    if (event === 'signup') ls(key, '1'); else ss(key, '1');
    post(row(event, user.id), token);
  }
  // auth.js calls this after admin_me: admins are never counted on this device (remembered until a non-admin signs in here).
  function setAdmin(isAdmin) { if (isAdmin) { ls('pa_admin', '1'); off = true; try { root.dispatchEvent(new CustomEvent('paige:admin')); } catch (e) {} } else if (ls('pa_admin') === '1') ls('pa_admin', null); }
  root.__paigeAnalytics = { enabled: !off, auth: auth, interact: interact, setAdmin: setAdmin, source: function () { return source; },
    // For the "You're our Nth visitor today" line (visitor-banner.js): counted state, this device's random visitor id, CT day.
    counted: function () { return !off; }, visitorId: function () { return off ? null : vid; }, dailyReady: function () { return dailyReady; }, ctDay: ctDay };
  function pageView() { if (!/access_token|error_description|type=recovery/.test(location.hash)) interact('page_view', pagePath()); }
  daily(); pageView();
  addEventListener('hashchange', function () { daily(); pageView(); });
  document.addEventListener('click', function (e) { var c = classifyClick(e.target, location.hostname); if (c) interact(c.type, c.target); }, true);
})(typeof window !== 'undefined' ? window : this);
