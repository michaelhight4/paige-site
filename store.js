// Wallet tab store: Blue Bucks packs + Ad-Free for Life -> Stripe Checkout (create-checkout edge function, priced server-side
// from the live Stripe catalog by product.metadata.game + price.metadata.sku). Credits are applied ONLY by stripe-webhook to the
// signed-in account (network scope: Blue Bucks shared by every game). The page never grants anything itself.
(() => {
  const $ = (id) => document.getElementById(id);
  const msg = $('buy-msg');
  const say = (t, bad) => { if (!msg) return; msg.textContent = t || ''; msg.classList.toggle('err', !!bad); };
  // Ad-Free launch sale: create-checkout sells the $15 sale price until 00:00 America/Chicago on 2027-01-01, then $35.
  const SALE_END = Date.parse('2027-01-01T06:00:00Z');
  if (Date.now() >= SALE_END) {
    const p = $('af-price'), b = $('af-buy'), t = $('af-tag');
    if (p) p.innerHTML = '$35 <span>one time</span>'; if (b) b.textContent = 'Get Ad-Free for Life · $35'; if (t) t.remove();
  }
  const A = () => window.__paigeAuth;
  document.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-buy]'); if (!b) return;
    e.preventDefault();
    const auth = A();
    if (!auth) { say('Loading your account… try again in a moment.'); return; }
    const u = auth.user();
    if (!u || u.is_anonymous) { say('Sign in or create a free account to buy. Your purchase is saved to your account.'); auth.open(u && u.is_anonymous ? 'signup' : 'signin', b); return; }
    const all = document.querySelectorAll('[data-buy]'); all.forEach((x) => (x.disabled = true));
    say('Opening secure checkout…');
    try {
      const r = await auth.checkout(b.dataset.buy);
      if (r.needsAccount) { say('Sign in to buy.'); auth.open('signin', b); }
      else if (r.url) { location.assign(r.url); return; }
      else say(r.error || 'Could not start checkout. Please try again.', true);
    } catch (_) { say('Could not start checkout. Please try again.', true); }
    all.forEach((x) => (x.disabled = false));
  });
  // Back from Stripe: /?checkout=success|cancel -> open the wallet tab and refresh balances (webhook credits within seconds).
  const q = new URLSearchParams(location.search).get('checkout');
  if (q) {
    history.replaceState(null, '', location.pathname + '#wallet');
    dispatchEvent(new HashChangeEvent('hashchange'));
    if (q === 'success') {
      say('Thanks! Your purchase is being added to your account…');
      let n = 0; const tick = () => { dispatchEvent(new CustomEvent('paige:gift-state')); dispatchEvent(new CustomEvent('paige:ads-refresh')); if (++n < 6) setTimeout(tick, 2500); else say('Thanks! Your purchase was added to your account.'); };
      addEventListener('paige:auth-ready', () => setTimeout(tick, 500), { once: true }); setTimeout(tick, 3000);
    } else say('Checkout cancelled. Nothing was charged.');
  }
})();
