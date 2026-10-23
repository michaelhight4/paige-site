// "You're our Nth visitor today, thank you for your support!" (Gary, Oct 22 2026). Home tab only (#visitor-banner lives in #p-home).
// N comes from public.visitor_today(p_visitor) (paige-shared migration 019, SECURITY DEFINER, returns ONLY this visitor's ordinal + CT day).
// Hidden when: not counted (bot/headless/test run/admin/DNT/GPC/?notrack), the RPC is missing or fails, or no row for today.
// Preview without the database: ?visitorpreview=37 (admins and test runs are never counted, so this is how to see it).
(function () {
  'use strict';
  var el = document.getElementById('visitor-banner'); if (!el) return;
  var URL_ = 'https://kjdubkeowcyuoazvpoyt.supabase.co', KEY = 'sb_publishable_NZC6vzmXDYRLnRh2vDHWAg_VCDi3FQc', CACHE = 'pa_vn';
  var rm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function ordinal(n) { var t = n % 100, o = n % 10; return n + (t >= 11 && t <= 13 ? 'th' : o === 1 ? 'st' : o === 2 ? 'nd' : o === 3 ? 'rd' : 'th'); }
  window.__paigeOrdinal = ordinal;
  var shown = false;
  function hide() { el.hidden = true; }
  function render(n) {
    if (shown || !(n >= 1)) return; shown = true;
    var fin = ordinal(n), num = el.querySelector('.vb-live'), ghost = el.querySelector('.vb-ghost'), sr = el.querySelector('.vb-sr');
    ghost.textContent = fin; num.textContent = rm ? fin : ordinal(n > 1 ? Math.max(1, Math.floor(n * 0.4)) : 1);
    el.hidden = false;
    // Announce once (polite), after it's visible, with the final number only; the counting digits are aria-hidden.
    setTimeout(function () { sr.textContent = "You're our " + fin + ' visitor today — thank you for your support!'; }, 400);
    if (rm || n === 1) { num.textContent = fin; return; }
    var from = Math.max(1, Math.floor(n * 0.4)), t0 = 0, dur = Math.min(1400, 500 + n * 12);
    requestAnimationFrame(function step(t) { if (!t0) t0 = t; var p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      num.textContent = ordinal(Math.round(from + (n - from) * e)); if (p < 1) requestAnimationFrame(step); });
  }
  var pv = new URLSearchParams(location.search).get('visitorpreview');
  if (pv !== null) { var n = parseInt(pv, 10); if (n >= 1 && n <= 9999999 && String(n) === pv.trim()) render(n); return; }
  addEventListener('paige:admin', function () { hide(); try { localStorage.removeItem(CACHE); } catch (e) {} });
  var A = window.__paigeAnalytics;
  if (!A || !A.counted || !A.counted()) return;
  var vid = A.visitorId(), day = A.ctDay(new Date()); if (!vid) return;
  var c = null; try { c = JSON.parse(localStorage.getItem(CACHE) || 'null'); } catch (e) {}
  if (c && c.day === day && c.vid === vid && c.n >= 1) { render(c.n); return; } // same number on every reload today
  A.dailyReady().then(function () {
    return fetch(URL_ + '/rest/v1/rpc/visitor_today', { method: 'POST', headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ p_visitor: vid }) });
  }).then(function (r) { return r && r.ok ? r.json() : null; }).then(function (j) {
    if (!j || !(j.ordinal >= 1) || j.day !== day || !A.counted()) return hide();
    try { localStorage.setItem(CACHE, JSON.stringify({ day: day, vid: vid, n: j.ordinal })); } catch (e) {}
    render(j.ordinal);
  }).catch(hide);
})();
