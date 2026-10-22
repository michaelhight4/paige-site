/* site-ads.js — top banner + circuit-aware fixed rail ads (Gary, Oct 22 2026):
   "banners on top where its clear, and on the right use the circuit as a spot to split the ad space, don't cover it" + one LEFT-gutter unit.
   Reuses ads.js rules: client id, slot-gated loader, ?adpreview=1 labelled placeholders, nothing until auth.js's ads_removed check ('paige:ads').
   Before AdSense approval: ?adpreview=1 => labelled placeholders; ?adtest=1 => real <ins> with data-adtest="on" (Google test mode).
   Rail units sit only inside empty rectangles the #trace segments bound, >=16px from every segment, never touching content; recomputed on resize.
   Also: interstitial gate (verified email users never get the daily full-screen interstitial; others once per CT day). */
(() => {
  const CLIENT = 'ca-pub-3732476962662887';
  const SLOTS = { top: '', rail: '' }; // AdSense slot IDs after approval
  const q = new URLSearchParams(location.search);
  const preview = q.get('adpreview') === '1', test = q.get('adtest') === '1';
  const live = Object.values(SLOTS).some(Boolean);
  const GAP = 16, NO_TAB = 'start-of-the-end';

  // ---- interstitial gate: wait for auth, verified users never; others once per America/Chicago day
  const ctDay = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago' }).format(new Date());
  const authReady = () => new Promise((r) => { if (window.__paigeAuth) return r(); addEventListener('paige:auth-ready', () => r(), { once: true }); setTimeout(r, 4000); });
  function verified() { const u = window.__paigeAuth?.user?.(); return !!(u && !u.is_anonymous && (u.email_confirmed_at || u.confirmed_at)); }
  window.paigeInterstitial = {
    verified,
    async allowed() { await authReady(); if (verified() || window.__paigeAdsRemoved === true) return false; try { return localStorage.getItem('paige_inter_day') !== ctDay(); } catch (e) { return false; } },
    markShown() { try { localStorage.setItem('paige_inter_day', ctDay()); } catch (e) {} },
  };

  if (!preview && !test && !live) return; // live site with no slot IDs: nothing renders, no empty boxes

  const unit = (key, w, h, cls) => {
    const a = document.createElement('aside'); a.className = 'sa-unit ' + cls; a.setAttribute('aria-label', 'Advertisement');
    a.dataset.w = w; a.dataset.h = h;
    const slot = SLOTS[key];
    a.innerHTML = '<span class="sa-lab">Advertisement</span>' + (slot || test
      ? `<ins class="adsbygoogle" style="display:inline-block;width:${w}px;height:${h}px" data-ad-client="${CLIENT}"${slot ? ` data-ad-slot="${slot}"` : ''}${test || !slot ? ' data-adtest="on"' : ''}></ins>`
      : `<span class="sa-ph" style="width:${w}px;height:${h}px">Ad placeholder · ${w}×${h}</span>`);
    return a;
  };
  let loaded = false;
  function load() {
    if (loaded || !(live || test)) return; loaded = true;
    const s = document.createElement('script'); s.async = true; s.crossOrigin = 'anonymous';
    s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + CLIENT; document.head.appendChild(s);
  }
  const push = (el) => el.querySelectorAll('ins.adsbygoogle:not([data-pushed])').forEach((i) => { i.dataset.pushed = 1; (window.adsbygoogle = window.adsbygoogle || []).push({}); });

  // ---- top banner: first child of the active panel's .wrap, above the heading
  // Sizes tried big-first; at scroll-top the banner box must sit >=16px from every #trace segment, shifted sideways inside the column if needed, else smaller, else hidden.
  function topSizes() { const w = innerWidth; return (w >= 1040 ? [[970, 90]] : []).concat(w >= 768 ? [[728, 90], [468, 60]] : [[320, 100], [320, 50]]).filter(([x, y]) => !(w < 768 && y > 50 && innerHeight < 700)); }
  const topSize = () => topSizes()[0];
  function placeTop() {
    document.querySelectorAll('.sa-top').forEach((e) => e.remove());
    return; // top banner removed: never create or show the unit on any viewport
    const tab = document.body.dataset.tab; if (tab === NO_TAB) return;
    const wrap = document.querySelector(`.panel[data-panel="${tab}"] .wrap`); if (!wrap) return;
    const segs = segments(), sy = scrollY, cs = getComputedStyle(wrap), pl = parseFloat(cs.paddingLeft), pr = parseFloat(cs.paddingRight);
    for (const [w, h] of topSizes()) {
      const a = unit('top', w, h, 'sa-top'); a.style.width = w + 'px'; wrap.prepend(a);
      const wr = wrap.getBoundingClientRect(), x0 = wr.left + pl, x1 = wr.right - pr; if (x1 - x0 < w) { a.remove(); continue; }
      const b = a.getBoundingClientRect(), y = b.top + sy, cx = (x0 + x1 - w) / 2;
      let ok = null; for (let d = 0; d <= x1 - x0 - w && ok === null; d += 8) for (const x of [cx - d, cx + d]) { if (x < x0 - .5 || x + w > x1 + .5) continue; if (!segs.some((s) => hit({ x, y, w, h: b.height }, s, GAP))) { ok = x; break; } }
      if (ok === null) { a.remove(); continue; }
      a.style.marginLeft = (ok - x0) + 'px'; push(a); return;
    }
  }

  // ---- circuit geometry -> screen segments
  function segments() {
    const p = document.getElementById('trace'); const m = p?.getScreenCTM(); if (!m) return [];
    const toks = p.getAttribute('d').match(/[MHV]|-?\d+(\.\d+)?/g); let x = 0, y = 0, c = '', segs = [], i = 0;
    const pt = (X, Y) => ({ x: m.a * X + m.c * Y + m.e, y: m.b * X + m.d * Y + m.f });
    while (i < toks.length) {
      if (/[MHV]/.test(toks[i])) c = toks[i++];
      if (c === 'M') { x = +toks[i++]; y = +toks[i++]; c = 'L'; continue; }
      const nx = c === 'H' ? +toks[i++] : x, ny = c === 'V' ? +toks[i++] : y;
      if (c === 'L') { i++; continue; }
      const A = pt(x, y), B = pt(nx, ny);
      segs.push({ x1: Math.min(A.x, B.x), y1: Math.min(A.y, B.y), x2: Math.max(A.x, B.x), y2: Math.max(A.y, B.y) }); x = nx; y = ny;
    }
    return segs;
  }
  const hit = (r, s, g) => r.x < s.x2 + g && r.x + r.w > s.x1 - g && r.y < s.y2 + g && r.y + r.h > s.y1 - g;
  const SIZES = [[300, 600], [160, 600], [300, 250]];
  // find a rect in [x0,x1]x[y0,y1] clear of every obstacle by >=GAP; prefer largest size, then top-most, then centred
  function fit(x0, x1, y0, y1, obs) {
    for (const [w, h] of SIZES) {
      if (x1 - x0 < w || y1 - y0 < h) continue;
      const xs = []; const cx = Math.round((x0 + x1 - w) / 2);
      for (let d = 0; d <= (x1 - x0 - w); d += 8) { xs.push(cx - d, cx + d); }
      for (let y = y0; y + h <= y1; y += 8) for (const x of xs) {
        if (x < x0 || x + w > x1) continue;
        const r = { x, y, w, h }; if (!obs.some((s) => hit(r, s, GAP))) return r;
      }
    }
    return null;
  }
  let rails = [];
  function placeRails() {
    rails.forEach((e) => e.remove()); rails = [];
    const tab = document.body.dataset.tab; if (tab === NO_TAB || innerWidth < 1200) return;
    const svg = document.getElementById('circuit'); if (!svg || getComputedStyle(svg).display === 'none') return;
    const wrap = document.querySelector(`.panel[data-panel="${tab}"] .wrap`); if (!wrap) return;
    const cr = wrap.getBoundingClientRect(), hb = document.querySelector('header.top')?.getBoundingClientRect().bottom || 0;
    const lab = 18; // label strip above each unit counts as part of the ad box
    const segs = segments();
    const obs = segs.slice();
    const mp = document.querySelector('.mp'); if (mp && mp.offsetParent) { const b = mp.getBoundingClientRect(); obs.push({ x1: b.left, y1: b.top, x2: b.right, y2: b.bottom }); }
    const y0 = hb + GAP, y1 = innerHeight - GAP;
    const sides = [ { cls: 'sa-r', x0: cr.right + GAP, x1: innerWidth - GAP, max: 2 }, { cls: 'sa-l', x0: GAP, x1: cr.left - GAP, max: 1 } ];
    for (const s of sides) for (let n = 0; n < s.max; n++) {
      const f0 = (r) => r && { x: r.x, y: r.y, w: r.w, h: r.h };
      const r = f0(fitBox(s.x0, s.x1, y0, y1, obs, lab)); if (!r) break;
      const a = unit('rail', r.w, r.h - lab, 'sa-rail ' + s.cls);
      Object.assign(a.style, { left: r.x + 'px', top: r.y + 'px', width: r.w + 'px', height: r.h + 'px' });
      document.body.appendChild(a); push(a); rails.push(a);
      obs.push({ x1: r.x, y1: r.y, x2: r.x + r.w, y2: r.y + r.h }); // next unit keeps 16px from this one too
    }
  }
  function fitBox(x0, x1, y0, y1, obs, lab) {
    const save = SIZES.slice(); SIZES.splice(0, 3, ...save.map(([w, h]) => [w, h + lab]));
    const r = fit(x0, x1, y0, y1, obs); SIZES.splice(0, 3, ...save); return r;
  }
  // test hook: line points vs ad rects
  window.__siteAdsReport = () => {
    const segs = segments(), ads = [...document.querySelectorAll('.sa-unit')].filter((e) => e.offsetParent || getComputedStyle(e).position === 'fixed').map((e) => { const b = e.getBoundingClientRect(); return { cls: e.className, x: Math.round(b.left), y: Math.round(b.top), w: Math.round(b.width), h: Math.round(b.height) }; }).filter((a) => a.w);
    let minDist = Infinity, overlaps = 0;
    for (const s of segs) { const len = Math.hypot(s.x2 - s.x1, s.y2 - s.y1); for (let t = 0; t <= len; t += 2) { const px = s.x1 + (s.x2 - s.x1) * (t / (len || 1)), py = s.y1 + (s.y2 - s.y1) * (t / (len || 1));
      for (const a of ads) { const dx = Math.max(a.x - px, 0, px - (a.x + a.w)), dy = Math.max(a.y - py, 0, py - (a.y + a.h)); const d = Math.hypot(dx, dy); if (d === 0) overlaps++; minDist = Math.min(minDist, d); } } }
    const w = document.querySelector(`.panel[data-panel="${document.body.dataset.tab}"] .wrap`)?.getBoundingClientRect();
    const touchContent = ads.some((a) => a.cls.includes('sa-rail') && w && a.x < w.right && a.x + a.w > w.left);
    return { ads, railMinDistToLine: minDist === Infinity ? null : Math.round(minDist), overlaps, touchContent };
  };

  let on = false, t = 0, t2 = 0;
  const placeTopLater = () => { clearTimeout(t2); t2 = setTimeout(() => on && placeTop(), 120); };
  const refresh = () => { if (!on) return; placeTop(); placeRails(); };
  const later = () => { clearTimeout(t); t = setTimeout(() => on && placeRails(), 120); };
  const settle = () => { placeTopLater(); later(); };
  function start() { if (on) return; on = true; load(); refresh(); addEventListener('load', settle); document.fonts?.ready.then(settle); addEventListener('resize', () => { if (on) { placeTopLater(); } later(); }); addEventListener('hashchange', () => setTimeout(refresh, 0)); new MutationObserver(() => setTimeout(refresh, 0)).observe(document.body, { attributes: true, attributeFilter: ['data-tab'] }); }
  function stop() { on = false; document.querySelectorAll('.sa-unit').forEach((e) => e.remove()); rails = []; }
  addEventListener('paige:ads', (e) => (e.detail?.removed ? stop() : start()));
  if (window.__paigeAdsRemoved === false || (preview && !live)) start();
  else if (window.__paigeAdsRemoved !== true) setTimeout(() => { if (window.__paigeAdsRemoved !== true) start(); }, 4000);
})();
