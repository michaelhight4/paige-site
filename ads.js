/* Paige ad slots (paigegames.net). Placements: home (below hero), Games + Webtoons lists (after first row),
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
  let built = false, loaded = false;
  function build() {
    if (built) return; built = true;
    for (const p of PLACES) {
      const ref = p.where(); if (!ref) continue;
      const box = document.createElement('aside');
      box.className = 'ad-slot' + (p.desktop ? ' ad-desk' : '') + (preview && !SLOTS[p.key] ? ' ad-preview' : '');
      box.setAttribute('aria-label', 'Advertisement');
      box.innerHTML = '<span class="ad-lab">Advertisement</span>' + (SLOTS[p.key]
        ? `<ins class="adsbygoogle" style="display:block" data-ad-client="${ADSENSE_CLIENT}" data-ad-slot="${SLOTS[p.key]}" data-ad-format="auto" data-full-width-responsive="true"></ins>`
        : '<span class="ad-ph">Ad placeholder · ' + p.key + '</span>');
      ref.after(box);
    }
    if (live && !loaded) {
      loaded = true;
      const s = document.createElement('script'); s.async = true; s.crossOrigin = 'anonymous';
      s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + ADSENSE_CLIENT;
      document.head.appendChild(s);
      document.querySelectorAll('.ad-slot ins.adsbygoogle').forEach(() => (window.adsbygoogle = window.adsbygoogle || []).push({}));
    }
  }
  function remove() { document.querySelectorAll('.ad-slot').forEach((e) => e.remove()); }
  addEventListener('paige:ads', (e) => { if (e.detail?.removed) { remove(); built = true; } else build(); });
  // Real ads wait for the entitlement check (auth.js); fall back after 4s if auth can't load. Preview shows right away.
  if (window.__paigeAdsRemoved === false || (preview && !live)) build();
  else if (window.__paigeAdsRemoved !== true) setTimeout(() => { if (window.__paigeAdsRemoved !== true) build(); }, 4000);
})();
