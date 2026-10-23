/* anchor-ads.js — paigegames.net: Google's collapsible ANCHOR ad (AdSense Auto ads overlay format) + layout reflow (Gary, Oct 22 2026).
   Same gating as ads.js / site-ads.js: nothing until AdSense approval (ANCHOR_LIVE), ?adpreview=1 => labelled placeholder that mimics
   Google's anchor (open / collapsed), ?adtest=1 => Google's real Auto ads tag in test mode (data-adtest="on"). Ad-Free for Life
   (auth.js 'paige:ads' after public.ads_removed) => nothing. Position: BOTTOM (data-overlays="bottom"): the sticky header and the
   in-page top banner already live at the top, so a top anchor would stack two ads and shove the header; the bottom keeps them apart.
   Layout: anchor-ads.css reads --anchor-top-h / --anchor-bottom-h (+ -pad) published below. Load this BEFORE ads.js / site-ads.js. */
(() => {
  const ANCHOR_LIVE = false; // Gary: flip to true after AdSense approval AND Ads > Auto ads > Anchor ads is ON for paigegames.net
  /* ---- Paige anchor core (shared by paigegames.net, Lifeline web and Riftward web; keep the three copies identical) ----
     Google AdSense Auto ads ANCHOR (overlay format) with GOOGLE'S OWN built-in collapse arrow. We never add a close/hide
     button, never cover or dim the unit, never refresh it and never hide it: Google owns the element.
     What this does:
     1) Loads Google's Auto ads tag only when allowed (o.live, or ?adtest=1 => Google test mode data-adtest="on"); position
        'bottom' adds data-overlays="bottom" (Google's documented "bottom-only anchor" switch); 'auto' lets Google pick top/bottom.
        ?adpreview=1 instead builds a labelled PLACEHOLDER that mimics Google's anchor (open + collapsed heights, data-anchor-status).
     2) Always (even with no ads) watches for the REAL anchor: ins.adsbygoogle carrying data-anchor-status / data-anchor-shown
        (Google inserts it, flips the status and slides it when its arrow collapses it). Mutation + Resize observers + transition
        events measure how many px it covers at the top / bottom edge of the viewport and publish on <html>:
          --anchor-top-h / --anchor-bottom-h   px covered at each edge (0px when absent)   -> fixed/sticky UI, app shells, canvases
          --anchor-top-pad / --anchor-bottom-pad  same minus any padding Google itself put on <html>/<body> -> document padding
          data-anchor="none|top|bottom", data-anchor-state="none|open|collapsed", and a 'paige:anchor' event (detail = state).
     3) Ad-free owners (o.removed() === true, or a later o.onRemoved callback) get nothing: no tag, placeholder/anchor removed. */
  function paigeAnchor(o) {
    if (window.__paigeAnchor) return window.__paigeAnchor;
    const q = new URLSearchParams(location.search);
    const preview = q.get('adpreview') === '1', test = q.get('adtest') === '1';
    const forcePos = q.get('anchorpos'); // QA only: ?adpreview=1&anchorpos=top|bottom
    const root = document.documentElement;
    const SEL = 'ins.adsbygoogle[data-anchor-status],ins.adsbygoogle[data-anchor-shown],[data-paige-anchor]';
    const TAG = 'pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';
    const MAXZ = 2147483647;
    let st = { pos: 'none', state: 'none', top: 0, bottom: 0, topPad: 0, bottomPad: 0, source: 'none', status: null };
    const openMax = new WeakMap();
    let stopped = false;

    // ---------- measuring ----------
    function band(el) {
      if (!el.isConnected) return null;
      const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden') return null;
      let t = Infinity, b = -Infinity; const list = [el];
      for (const c of el.children) { list.push(c); for (const g of c.children) list.push(g); }
      for (const e of list) { const r = e.getBoundingClientRect(); if (r.width < 1 || r.height < 1) continue; if (getComputedStyle(e).visibility === 'hidden') continue; t = Math.min(t, r.top); b = Math.max(b, r.bottom); }
      const vh = innerHeight; t = Math.max(0, t); b = Math.min(vh, b);
      if (!(b - t >= 1) || b - t > vh * 0.5) return null; // nothing on screen, or not an anchor-shaped overlay
      return { t, b, vh };
    }
    function inlinePad(side) { // padding Google may set inline on <html>/<body> for a top anchor: don't double it
      const p = 'padding' + side, m = 'margin' + side; let x = 0;
      for (const e of [root, document.body]) if (e) x += (parseFloat(e.style[p]) || 0) + (parseFloat(e.style[m]) || 0);
      return x;
    }
    function measure() {
      let top = 0, bottom = 0, pos = 'none', state = 'none', source = 'none', status = null;
      for (const el of document.querySelectorAll(SEL)) {
        const r = band(el); if (!r) continue;
        const isTop = r.t <= 1 ? true : r.b >= r.vh - 1 ? false : (r.t + r.b) / 2 < r.vh / 2;
        const h = Math.ceil(isTop ? r.b : r.vh - r.t);
        const s = el.getAttribute('data-anchor-status');
        const mx = Math.max(openMax.get(el) || 0, s === 'dismissed' || s === 'collapsed' ? 0 : h); openMax.set(el, mx);
        const collapsed = s === 'dismissed' || s === 'collapsed' || (mx > 0 && h < mx * 0.6);
        if (isTop) top = Math.max(top, h); else bottom = Math.max(bottom, h);
        pos = isTop ? 'top' : 'bottom'; state = collapsed ? 'collapsed' : 'open'; status = s;
        source = el.hasAttribute('data-paige-anchor') ? 'preview' : 'google';
      }
      const topPad = Math.max(0, top - inlinePad('Top')), bottomPad = Math.max(0, bottom - inlinePad('Bottom'));
      const n = { pos, state, top, bottom, topPad, bottomPad, source, status };
      if (JSON.stringify(n) === JSON.stringify(st)) return;
      st = n;
      root.style.setProperty('--anchor-top-h', top + 'px'); root.style.setProperty('--anchor-bottom-h', bottom + 'px');
      root.style.setProperty('--anchor-top-pad', topPad + 'px'); root.style.setProperty('--anchor-bottom-pad', bottomPad + 'px');
      root.dataset.anchor = pos; root.dataset.anchorState = state;
      dispatchEvent(new CustomEvent('paige:anchor', { detail: { ...st } }));
    }
    let raf = 0, until = 0;
    function settle(ms) { // re-measure every frame for a moment: Google slides the anchor with transforms (no resize event)
      until = Math.max(until, performance.now() + (ms || 700));
      if (raf) return;
      const step = () => { raf = 0; measure(); if (performance.now() < until) raf = requestAnimationFrame(step); };
      raf = requestAnimationFrame(step);
    }
    const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(() => settle()) : null;
    const attrObs = new MutationObserver(() => settle());
    const watched = new WeakSet();
    function watch(el) {
      if (watched.has(el)) return; watched.add(el);
      attrObs.observe(el, { attributes: true, subtree: true, attributeFilter: ['data-anchor-status', 'data-anchor-shown', 'style', 'class', 'hidden', 'aria-hidden'] });
      if (ro) { ro.observe(el); for (const c of el.children) ro.observe(c); }
      settle(1200);
    }
    function scan() { document.querySelectorAll('ins.adsbygoogle,[data-paige-anchor]').forEach(watch); }
    const childObs = new MutationObserver((recs) => {
      for (const r of recs) {
        for (const n of r.addedNodes) if (n.nodeType === 1 && (n.matches('ins.adsbygoogle,[data-paige-anchor]') || n.querySelector?.('ins.adsbygoogle,[data-paige-anchor]'))) { scan(); break; }
        if (r.removedNodes.length) settle(200);
      }
    });
    function observe() {
      childObs.observe(document.body, { childList: true, subtree: true });
      if (document.body.parentNode === root) childObs.observe(root, { childList: true }); // Google may append next to <body>
      scan(); measure();
      addEventListener('resize', () => settle(300)); addEventListener('orientationchange', () => settle(600));
      const onTr = (e) => { if (e.target instanceof Element && e.target.closest(SEL)) settle(150); };
      document.addEventListener('transitionend', onTr, true); document.addEventListener('animationend', onTr, true);
    }

    // ---------- Google tag ----------
    function loadGoogle() {
      let s = document.querySelector('script[src*="' + TAG + '"]');
      if (!s) {
        s = document.createElement('script'); s.async = true; s.crossOrigin = 'anonymous';
        s.src = 'https://' + TAG + '?client=' + o.client;
        if (o.position === 'bottom') s.setAttribute('data-overlays', 'bottom');
        if (test) s.setAttribute('data-adtest', 'on');
        document.head.appendChild(s);
      } else if (o.position === 'bottom' && !s.hasAttribute('data-overlays')) s.setAttribute('data-overlays', 'bottom'); // best effort
      window.adsbygoogle = window.adsbygoogle || [];
    }

    // ---------- preview placeholder (mimics Google's collapsible anchor; QA only, ?adpreview=1) ----------
    let ph = null;
    function placeholder(pos) {
      if (ph) return;
      const phone = innerWidth < 768, w = phone ? 320 : 728, h = phone ? 50 : 90;
      ph = document.createElement('div');
      ph.setAttribute('data-paige-anchor', 'preview'); ph.setAttribute('data-anchor-status', 'displayed'); ph.setAttribute('data-anchor-shown', 'true');
      ph.className = 'pa-ph pa-' + pos; ph.setAttribute('role', 'complementary'); ph.setAttribute('aria-label', 'Advertisement');
      const css = document.createElement('style'); css.id = 'pa-ph-css';
      css.textContent = `.pa-ph{position:fixed;left:0;right:0;${pos}:0;z-index:${MAXZ};display:flex;flex-direction:${pos === 'bottom' ? 'column' : 'column-reverse'};align-items:center;pointer-events:none;transition:transform .25s ease;font:12px/1.3 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
  .pa-ph>*{pointer-events:auto}
  .pa-ph .pa-tab{width:48px;height:24px;margin:0;padding:0;border:0;display:grid;place-items:center;background:#fff;color:#3c4043;cursor:pointer;box-shadow:0 ${pos === 'bottom' ? '-2px' : '2px'} 4px rgba(0,0,0,.18);border-radius:${pos === 'bottom' ? '8px 8px 0 0' : '0 0 8px 8px'}}
  .pa-ph .pa-tab svg{width:20px;height:20px;transition:transform .25s ease}
  .pa-ph .pa-bar{width:100%;height:${h + 10}px;box-sizing:border-box;padding:5px 0;background:#fff;box-shadow:0 0 6px rgba(0,0,0,.25);display:flex;justify-content:center}
  .pa-ph .pa-ad{width:${w}px;max-width:100%;height:${h}px;box-sizing:border-box;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;border:1px dashed #5f6368;background:repeating-linear-gradient(45deg,#f1f3f4 0 10px,#e8eaed 10px 20px);color:#202124;text-align:center}
  .pa-ph .pa-ad b{font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:#3c4043}
  .pa-ph[data-anchor-status="dismissed"]{transform:translateY(${pos === 'bottom' ? '' : '-'}${h + 10}px)}
  .pa-ph[data-anchor-status="dismissed"] .pa-tab svg{transform:rotate(180deg)}
  @media (prefers-reduced-motion:reduce){.pa-ph,.pa-ph .pa-tab svg{transition:none}}`;
      const chev = pos === 'bottom' ? 'M7 10l5 5 5-5' : 'M7 14l5-5 5 5';
      ph.innerHTML = `<button type="button" class="pa-tab" aria-expanded="true" aria-label="Collapse ad"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${chev}" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></button>`
        + `<div class="pa-bar"><div class="pa-ad"><b>Advertisement</b><span>${phone ? `Anchor ad preview · ${w}×${h}` : `Anchor ad preview · ${w}×${h} · Google's own collapse arrow`}</span></div></div>`;
      const tab = ph.firstChild;
      tab.addEventListener('click', () => setPreview(ph.getAttribute('data-anchor-status') === 'dismissed' ? 'open' : 'collapsed'));
      document.head.appendChild(css); document.body.appendChild(ph);
    }
    function setPreview(s) {
      if (s === 'none') { ph?.remove(); document.getElementById('pa-ph-css')?.remove(); ph = null; settle(200); return; }
      if (!ph) placeholder(forcePos === 'top' || forcePos === 'bottom' ? forcePos : o.previewPos || 'bottom');
      const c = s === 'collapsed'; ph.setAttribute('data-anchor-status', c ? 'dismissed' : 'displayed');
      const tab = ph.querySelector('.pa-tab'); tab.setAttribute('aria-expanded', String(!c)); tab.setAttribute('aria-label', c ? 'Expand ad' : 'Collapse ad');
      settle(700);
    }

    // ---------- ad-free + start ----------
    function stop() { // owner of a no-ads pass: no anchor at all
      stopped = true; setPreview('none');
      document.querySelectorAll('ins.adsbygoogle[data-anchor-status],ins.adsbygoogle[data-anchor-shown]').forEach((e) => e.remove());
      settle(200);
    }
    function start() {
      if (stopped || window.Capacitor) return; // native app wrappers use AdMob, never the web anchor
      if (preview && !test) setPreview('open');
      else if (test || o.live) loadGoogle();
    }
    const api = {
      state: () => ({ ...st }),
      measure: () => { measure(); return { ...st }; },
      preview: (s) => { if (preview && !stopped) setPreview(s); return { ...st }; }, // QA: 'open' | 'collapsed' | 'none'
      stop,
    };
    window.__paigeAnchor = api;
    const boot = () => {
      observe();
      if (!preview && !test && !o.live) return; // live site before approval: no tag, no placeholder (observer still reflows if Google adds one)
      Promise.resolve(o.removed ? o.removed() : false).then((r) => (r === true ? stop() : start()), () => start());
      o.onRemoved?.((removed) => (removed ? stop() : (stopped = false, start())));
    };
    if (document.body) boot(); else addEventListener('DOMContentLoaded', boot, { once: true });
    return api;
  }
  const q = new URLSearchParams(location.search);
  const preview = q.get('adpreview') === '1', test = q.get('adtest') === '1';
  paigeAnchor({
    client: 'ca-pub-3732476962662887', live: ANCHOR_LIVE, position: 'bottom', previewPos: 'bottom',
    // Reuse auth.js's Ad-Free for Life hook: window.__paigeAdsRemoved + 'paige:ads'. Preview shows right away (like site-ads.js); real tag waits (4s fallback).
    removed: () => new Promise((res) => {
      const v = window.__paigeAdsRemoved; if (v === true || v === false) return res(v);
      if (preview && !test) return res(false);
      addEventListener('paige:ads', (e) => res(!!e.detail?.removed), { once: true });
      setTimeout(() => res(window.__paigeAdsRemoved === true), 4000);
    }),
    onRemoved: (cb) => addEventListener('paige:ads', (e) => cb(!!e.detail?.removed)),
  });
})();
