/* Paige ad slots (paigegames.net). Placements (Gary, Oct 22): banner ads only. Home (below hero, before the 4 random picks), Games + Webtoons lists (after first row),
   desktop-only inline on long pages. Never in header/nav, sign-in, stats.html or the mini player.
   Until AdSense approval + slot IDs exist, slots stay collapsed; ?adpreview=1 shows labeled placeholders.
   Ad-Free for Life (network no-ads pass) => nothing loads (auth.js fires 'paige:ads' after public.ads_removed). */
(() => {
  const ADSENSE_CLIENT = 'ca-pub-3732476962662887';
  const SLOTS = { home: '', games: '', webtoons: '', inline: '' }; // fill with AdSense slot IDs after approval
  const preview = new URLSearchParams(location.search).get('adpreview') === '1';
  const live = Object.values(SLOTS).some(Boolean);
  if (!preview && !live) return; // live site: no slots, no empty boxes
  const PLACES = [
    { key: 'home', where: () => document.querySelector('#p-home .intro'), how: 'after' },
    { key: 'games', where: () => afterFirstRow('all-games', '.game'), how: 'after' },
    { key: 'webtoons', where: () => afterFirstRow('all-toons', ':scope > *'), how: 'after', list: true },
    { key: 'inline', where: () => document.querySelectorAll('#p-start-of-the-end .s-block')[1], how: 'after', desktop: true }, // long story page, after Roadmap
  ];
  function afterFirstRow(id, sel) {
    const list = document.getElementById(id); if (!list) return null;
    const items = [...list.querySelectorAll(sel)].filter((e) => !e.classList.contains('ad-slot'));
    if (!items.length) return null;
    const cols = getComputedStyle(list).gridTemplateColumns.split(' ').length || 1;
    return items[0].classList.contains('feat') || cols < 2 ? items[0] : items[Math.min(1, items.length - 1)];
  }


  // Launch sale (Gary, Oct 22): Ad-Free for Life $15 (was $35) for everyone until Jan 1, 2027 00:00 CT. Display only until Stripe checkout honors it.
  const SALE_END = Date.parse('2027-01-01T00:00:00-06:00');
  function priceTag() { return Date.now() < SALE_END ? '<s>$35</s> $15 until Jan 1' : '$35'; }
  // Friendly ad notice (Gary, Oct 22): shown on home too; I understand closes for this visit, checkbox remembers forever.
  const NK = 'paige_ad_notice_off';
  function onHome() { const h = location.hash.slice(1); return !h || h === 'home'; }
  function notice() {
    if (!window.__paigeAuth && !notice.authWait) { notice.authWait = true; const go = () => { if (window.__paigeAdsRemoved !== true) notice(); }; addEventListener('paige:auth-ready', go, { once: true }); setTimeout(() => { if (!window.__paigeAuth) go(); }, 4000); return; }
    if (window.paigeInterstitial && window.paigeInterstitial.verified()) return; // Gary, Oct 22: verified-email users never get a full-screen ad overlay (site-ads.js gate)
    // Daily gift (gift.js) goes first: never both at once. The ad notice waits until the gift popup closes or is skipped today.
    if (window.__paigeGiftBusy) { if (!notice.wait) { notice.wait = true; addEventListener('paige:gift-done', () => { notice.wait = false; if (window.__paigeAdsRemoved !== true) notice(); }, { once: true }); } return; }
    try { if (localStorage.getItem(NK) === '1' || sessionStorage.getItem(NK) === '1') return; } catch (e) {}
    if (document.getElementById('ad-notice')) return;
    const d = document.createElement('div'); d.id = 'ad-notice'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true'); d.setAttribute('aria-labelledby', 'ad-n-t');
    d.innerHTML = '<div class="adn-card"><h2 id="ad-n-t">We use ads to keep things free</h2><p>Every Paige Games title is free to play with no download. A few banner ads help keep it that way.</p><div class="adn-row"><button type="button" class="adn-ok">I understand</button><button type="button" class="adn-never">Don\'t show again</button></div><p class="adn-foot">Want to support the website? <a class="adn-free" href="#wallet">Go ad-free with the Ad-Free for Life pack · ' + priceTag() + '</a></p></div>';
    document.body.appendChild(d);
    const ok = d.querySelector('.adn-ok'); ok.focus();
    const close = (forever) => { try { (forever === true ? localStorage : sessionStorage).setItem(NK, '1'); } catch (e) {} d.remove(); };
    ok.addEventListener('click', () => close(false)); d.querySelector('.adn-never').addEventListener('click', () => close(true)); d.querySelector('.adn-free').addEventListener('click', () => close(false)); d.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(false); });
  }
  function noticeWhenReady() { if (window.__paigeAdsRemoved === true) return; notice(); addEventListener('hashchange', () => { if (built && window.__paigeAdsRemoved !== true) notice(); }); }
  let built = false, loaded = false;
  function build() {
    if (built) return; built = true; noticeWhenReady();
    for (const p of PLACES) {
      const ref = p.where(); if (!ref) continue;
      const box = document.createElement('aside');
      box.className = 'ad-slot' + (p.desktop ? ' ad-desk' : '') + (preview && !SLOTS[p.key] ? ' ad-preview' : '');
      box.setAttribute('aria-label', 'Advertisement');
      box.innerHTML = '<span class="ad-lab">Advertisement</span>' + (SLOTS[p.key]
        ? `<ins class="adsbygoogle" style="display:block" data-ad-client="${ADSENSE_CLIENT}" data-ad-slot="${SLOTS[p.key]}" data-ad-format="horizontal" data-full-width-responsive="true"></ins>`
        : '<span class="ad-ph">Ad placeholder · ' + p.key + '</span>');
      ref.after(box);
    }
    if (live && !loaded) {
      loaded = true;
      if (!document.querySelector('script[src*="adsbygoogle.js"]')) { // anchor-ads.js may already have loaded the one Auto ads tag
        const s = document.createElement('script'); s.async = true; s.crossOrigin = 'anonymous';
        s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + ADSENSE_CLIENT;
        document.head.appendChild(s);
      }
      document.querySelectorAll('.ad-slot ins.adsbygoogle').forEach(() => (window.adsbygoogle = window.adsbygoogle || []).push({}));
    }
  }
  function remove() { document.querySelectorAll('.ad-slot').forEach((e) => e.remove()); }
  addEventListener('paige:ads', (e) => { if (e.detail?.removed) { remove(); built = true; } else build(); });
  // Real ads wait for the entitlement check (auth.js); fall back after 4s if auth can't load. Preview shows right away.
  if (window.__paigeAdsRemoved === false || (preview && !live)) build();
  else if (window.__paigeAdsRemoved !== true) setTimeout(() => { if (window.__paigeAdsRemoved !== true) build(); }, 4000);
})();
