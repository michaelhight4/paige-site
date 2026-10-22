// First-party analytics for paigegames.net. No third-party trackers, no cookies, no PII.
// Logs: visit (at most once per visitor per page per 30 min), signup, login (from auth.js).
// Skipped entirely when Do Not Track or Global Privacy Control is on. Read access is admin-only (admin_site_stats RPC).
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
  var api = { classify: classify, fromHost: fromHost, isTikTokUA: isTikTokUA, device: device };
  if (typeof module !== 'undefined') { module.exports = api; return; }

  var nav = root.navigator, off = nav.doNotTrack === '1' || root.doNotTrack === '1' || nav.msDoNotTrack === '1' || nav.globalPrivacyControl === true;
  var ls = function (k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } };
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
  if (['src', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].some(function (k) { return q.has(k); })) {
    ['src', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach(function (k) { q.delete(k); });
    var s = q.toString(); history.replaceState(history.state, '', location.pathname + (s ? '?' + s : '') + location.hash);
  }
  var vid = ls('pa_vid'); if (!/^[0-9a-f-]{36}$/.test(vid || '')) { vid = uuid(); if (!off) ls('pa_vid', vid); }
  var dev = device(nav.userAgent, nav.maxTouchPoints || 0);
  function pagePath() { var h = /^#[a-z0-9_-]{1,40}$/i.test(location.hash) ? location.hash : ''; return (location.pathname + h).slice(0, 200); }
  function row(event, userId) {
    return { event: event, path: pagePath(), source: source, first_source: ls('pa_first') || (source !== 'direct' ? source : null), referrer_host: ref && ref !== location.hostname ? ref.slice(0, 120) : null,
      utm_source: utm.utm_source, utm_medium: utm.utm_medium, utm_campaign: utm.utm_campaign, device: dev, visitor_id: vid, user_id: userId || null };
  }
  function post(r, token) {
    if (off) return;
    try { fetch(URL_ + '/rest/v1/site_events', { method: 'POST', keepalive: true, headers: { apikey: KEY, Authorization: 'Bearer ' + (token || KEY), 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify(r) }).catch(function () {}); } catch (e) {}
  }
  function visit() {
    if (off) return; var p = pagePath(), seen = {}; try { seen = JSON.parse(ls('pa_seen') || '{}'); } catch (e) {}
    var now = Date.now(); if (seen[p] && now - seen[p] < 30 * 60 * 1000) return;
    for (var k in seen) if (now - seen[k] > 30 * 60 * 1000) delete seen[k];
    seen[p] = now; ls('pa_seen', JSON.stringify(seen)); post(row('visit'));
  }
  // Auth events (called by auth.js with the user's access token so user_id passes RLS). Deduped.
  function auth(event, user, token) {
    if (off || !user || user.is_anonymous) return;
    var key = event === 'signup' ? 'pa_signup_' + user.id : 'pa_login_' + user.id;
    if (event === 'signup' ? ls(key) : ss(key)) return;
    if (event === 'signup') ls(key, '1'); else ss(key, '1');
    post(row(event, user.id), token);
  }
  root.__paigeAnalytics = { enabled: !off, auth: auth, source: function () { return source; } };
  visit();
  addEventListener('hashchange', function () { if (!/access_token|error_description|type=recovery/.test(location.hash)) visit(); });
})(typeof window !== 'undefined' ? window : this);
