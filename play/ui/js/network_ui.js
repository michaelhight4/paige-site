// Store + Settings UI for the Paige network: Blue Bucks, Ad-Free for Life, Account (guest-first), Admin (server-confirmed only).
import { store, h, btn, section, sheet, toast, sfx } from './ui.js';
import * as N from '../../src/network.js';
import { refreshAds } from './shared_ads.js';
import { mountAccountSettings } from '../../vendor/paige-shared/auth/ui.js';
import { creatorTag, mountAdminMenu } from '../../vendor/paige-shared/admin/ui.js';
import * as Premium from '../../src/premium.js';

const C = { section: 'sec', row: 'row', icon: 'ic', text: 'tx', title: 't', sub: 's', button: 'btn alt sm', link: 'row' };
const testBuild = () => !N.netConfigured();
async function needAccount(r) {
  if (!r || !r.needsAccount) return false;
  await sheet({ title: 'Sign in to buy', body: N.SIGN_IN_TO_BUY, center: true, buttons: [{ id: 'ok', label: 'OK', cls: 'go' }] }); return true;
}

/** Pay choice line for a pass: real-money price, struck-through full BB price, discounted BB price and the bright tag.
 *  All numbers come from N.redeemable() -> shared bbPayChoice(), the same amount the wallet charges. */
export function bbPriceLine(sku) {
  const x = N.redeemable(sku); if (!x || x.bb == null) return null;
  return h('span', { class: 's bbline', 'data-el': 'bb-price', 'data-sku': sku, 'data-bb': String(x.bb), 'data-bb-full': String(x.fullBB) },
    x.usd ? h('b', { text: x.usd + ' or ' }) : null,
    x.discounted ? h('s', { 'data-el': 'bb-full', text: x.fullBB.toLocaleString('en-US') }) : null, x.discounted ? ' ' : null,
    h('b', { 'data-el': 'bb-now', text: '🔷 ' + N.formatBB(x.bb) }),
    x.tag ? h('span', { class: 'bbtag', 'data-el': 'bb-tag', text: x.tag, style: TAG_STYLE }) : null);
}
const TAG_STYLE = { background: N.BB_TAG_COLORS.bg, color: N.BB_TAG_COLORS.fg, fontWeight: 800, borderRadius: '6px', padding: '1px 6px', marginLeft: '6px', whiteSpace: 'nowrap', display: 'inline-block' };
/** Blue Bucks button for a pass. Enough Blue Bucks: "Use N Blue Bucks". Short: "Get N Blue Bucks ($Y) & buy" (smallest covering
 *  fixed pack, shared smallestCoveringPack) which opens that pack's purchase and then buys the pass in one tap. */
export function bbBuyButton(sku, refresh, cls = 'alt sm') {
  const x = N.redeemable(sku); if (!x || x.bb == null || x.owned) return null;
  const use = `Use ${N.formatBB(x.bb)}`;
  const b = btn(use, async () => {
    if (!N.canBuy()) { await needAccount({ needsAccount: true }); return; }
    const o = await N.packOfferFor(sku); if (!o) { const r = await N.redeem(sku); toast(r.ok ? `${x.title} is yours` : r.reason === 'insufficient' ? 'Not enough Blue Bucks' : 'Could not redeem: ' + r.reason); if (r.ok) sfx('good'); refreshAds(); await refresh(); return; }
    await shortfallSheet(sku, o, refresh);
  }, cls, { 'data-el': 'bb-buy', 'data-sku': sku, 'data-bb': String(x.bb) });
  N.packOfferFor(sku).then((o) => { if (o) { b.textContent = o.label; b.dataset.pack = o.pack.sku; } }).catch(() => {});
  return b;
}
async function shortfallSheet(sku, o, refresh) {
  const x = N.redeemable(sku); N.trackPack('bb_shortfall_offer', o.pack.sku, sku);
  const live = N.canBuyPacks(), real = N.packCheckoutLive();
  const body = h('div', { 'data-el': 'bb-shortfall' }, h('p', { text: N.shortfallText(o) }),
    h('p', { class: 'hint', text: `${x.title}: ${N.formatBB(x.bb)}. ${o.pack.title} costs ${N.formatUSD(o.pack.priceCents)}.` + (real ? ' Secure checkout by Stripe; come back here to use them.' : live ? ' TEST BUILD: pretend money.' : ' Buying Blue Bucks is coming soon.') }));
  const id = await sheet({ title: 'Not enough Blue Bucks', body, center: true, buttons: [{ id: 'buy', label: real ? o.label : live ? o.label + ' (TEST)' : 'Coming soon', cls: live ? 'go' : 'alt' }, { id: 'no', label: 'Not now', cls: 'alt' }] });
  if (id !== 'buy' || !live) return;
  if (real && !N.canBuy()) { await needAccount({ needsAccount: true }); return; }
  const r = await N.buyPackAndRedeem(sku); if (await needAccount(r)) return;
  if (r.redirecting) { toast('Opening checkout…'); return; }
  toast(r.ok ? `TEST: bought ${o.pack.title} and got ${x.title}` : r.bought ? `TEST: bought ${o.pack.title}; you still need more` : r.comingSoon ? 'Buying Blue Bucks is coming soon' : 'Could not buy: ' + r.reason);
  if (r.ok) sfx('good'); refreshAds(); await refresh();
}
/** Fixed Blue Bucks pack ladder (shared BB_PACKS, flat $1 = 1,000 Blue Bucks) with the bright "Save 10% on every pass" line. */
function packLadder(refresh) {
  const live = N.canBuyPacks(), real = N.packCheckoutLive();
  return h('div', { 'data-el': 'bb-packs' },
    h('div', { class: 'hint', style: { margin: '6px 0' } }, h('span', { 'data-el': 'bb-pack-banner', text: '🔷 ' + N.BB_PACK_BANNER, style: { ...TAG_STYLE, marginLeft: 0, whiteSpace: 'normal', padding: '3px 8px' } })),
    N.BB_PACKS.map((p) => h('div', { class: 'row', 'data-el': 'bb-pack', 'data-sku': p.sku },
      h('span', { class: 'ic', text: '🔷' }), h('span', { class: 'tx' }, h('span', { class: 't', text: p.title }), h('span', { class: 's', text: N.formatUSD(p.priceCents) })),
      h('span', { class: 'rt' }, live ? btn(real ? N.formatUSD(p.priceCents) : `${N.formatUSD(p.priceCents)} (TEST)`, async () => { if (real && !N.canBuy()) { await needAccount({ needsAccount: true }); return; } const r = await N.buyPack(p.sku); if (await needAccount(r)) return; if (r.redirecting) { toast('Opening checkout…'); return; } toast(r.ok ? `TEST: +${p.title}` : r.reason); await refresh(); }, 'go sm', { 'data-el': 'bb-pack-buy', 'data-sku': p.sku })
        : btn('Coming soon', () => { N.trackPack('bb_pack_attempt', p.sku); toast('Buying Blue Bucks is coming soon'); }, 'alt sm', { 'data-el': 'bb-pack-buy', 'data-sku': p.sku, disabled: true })))));
}
/** Store: Blue Bucks balance + redeem, and the Ad-Free for Life $35 card. */
export async function networkStoreCards(body, refresh) {
  const linked = N.canBuy();
  const bal = await N.walletBalance(), kind = N.walletKind();
  const balTxt = bal.ok ? N.formatBB(bal.balance) : kind === 'none' ? 'Not available in this build yet' : bal.reason === 'sign in' ? 'Sign in to see your balance' : 'Balance unavailable offline';
  body.append(section('Blue Bucks'), h('div', { class: 'card gold', 'data-el': 'bluebucks' },
    h('div', { class: 'nm', style: { fontWeight: 800 }, 'data-el': 'bb-balance', text: '🔷 ' + balTxt + (kind === 'test' ? ' (TEST)' : '') }),
    h('div', { class: 'hint', text: `$1 = ${N.BB_PER_USD.toLocaleString('en-US')} Blue Bucks. Use them in any Paige Games title. Your balance is kept on the Paige Games server, not on this device.` + (kind === 'test' ? ' TEST BUILD: pretend money for checking the flow.' : '') }),
    linked ? null : h('div', { class: 'hint', 'data-el': 'bb-signin', text: '🔑 ' + N.SIGN_IN_TO_BUY }),
    h('div', { class: 'btns' }, btn('Redeem', () => redeemSheet(refresh), 'go sm', { 'data-el': 'bb-redeem' }),
      kind === 'test' ? btn('TEST: +10,000', async () => { N.addTestBucks(10000); await refresh(); }, 'alt sm', { 'data-el': 'bb-test-add' }) : null),
    packLadder(refresh)));
  const own = N.adFreeLife();
  body.append(section('Ad-Free for Life'), h('div', { class: 'card gold', 'data-el': 'ad-free-life' },
    h('div', { class: 'nm', style: { fontWeight: 800 }, text: (own ? '★ ' : '☆ ') + `Ad-Free for Life · ${N.formatUSD(N.AD_FREE_LIFE.priceCents)}` }),
    h('div', { class: 'hint', text: 'No ads in every Paige game, now and in the future, and on paigegames.net. One purchase, forever. (No Ads above removes ads in Lifeline only.)' + (own ? ' Owned.' : '') }),
    own ? null : h('div', { class: 'hint' }, bbPriceLine(N.AD_FREE_LIFE.sku)),
    own ? null : h('div', { class: 'btns' }, btn(linked ? `Buy ${N.formatUSD(N.AD_FREE_LIFE.priceCents)}${testBuild() ? ' (TEST)' : ''}` : 'Sign in to buy', async () => {
      const r = await N.buyAdFreeLife(); if (await needAccount(r)) return;
      toast(r.ok ? (r.test ? 'TEST: Ad-Free for Life granted on this device' : r.redirecting ? 'Opening checkout…' : 'Ad-Free for Life is active') : 'Purchase failed: ' + r.reason); if (r.ok) sfx('good'); refreshAds(); await refresh();
    }, 'go sm', { 'data-el': 'afl-buy' }), bbBuyButton(N.AD_FREE_LIFE.sku, refresh)),
    testBuild() && own ? h('div', { class: 'btns' }, btn('TEST: remove', async () => { N.resetTestNetwork(); refreshAds(); await refresh(); }, 'alt sm', { 'data-el': 'afl-test-reset' })) : null));
}
async function redeemSheet(refresh) {
  if (!N.canBuy()) { await needAccount({ needsAccount: true }); return; }
  const list = N.redeemables(), bal = await N.walletBalance();
  const i = await sheet({ title: 'Redeem Blue Bucks', body: bal.ok ? `Balance: ${N.formatBB(bal.balance)}` : 'Balance unavailable', options: list.map((x) => ({ label: `${x.title} · ${N.formatBB(x.bb)}`, sub: x.owned ? 'Owned' : (x.discounted ? `${x.tag} (was ${x.fullBB.toLocaleString('en-US')}) · ` : '') + (x.usd ? `${x.usd} with money · ` : '') + (x.scope === 'network' ? 'Every Paige game + paigegames.net' : 'Lifeline only'), disabled: x.owned })) });
  if (i == null || list[i].owned) return;
  const o = await N.packOfferFor(list[i].sku); if (o) { await shortfallSheet(list[i].sku, o, refresh); return; }
  const r = await N.redeem(list[i].sku); if (await needAccount(r)) return;
  toast(r.ok ? `Redeemed ${list[i].title}` : r.reason === 'insufficient' ? 'Not enough Blue Bucks' : 'Could not redeem: ' + r.reason); if (r.ok) sfx('good'); refreshAds(); await refresh();
}

/** Settings > Account (shared UI). Test build: a TEST toggle stands in for linking. */
export function accountSection(refresh) {
  const wrap = h('div');
  if (testBuild()) {
    const s = N.accountState();
    wrap.append(section('Account'), h('div', { class: 'row', 'data-el': 'account-status' }, h('span', { class: 'ic', text: s.guest ? '👤' : '✅' }), h('span', { class: 'tx' }, h('span', { class: 't', text: s.guest ? 'Guest' : 'Account linked (TEST)' }), h('span', { class: 's', text: s.guest ? 'You are playing as a guest; everything works. Create an account to keep progress on every device and to buy items. Linking keeps all your progress.' : 'TEST: purchases unlocked on this device. Real accounts arrive with online features.' }))),
      h('div', { class: 'row', 'data-el': 'account-test' }, h('span', { class: 'ic', text: '🧪' }), h('span', { class: 'tx' }, h('span', { class: 't', text: 'TEST: account link' }), h('span', { class: 's', text: 'No backend in this build. Simulates Create account / Sign out.' })),
        btn(s.guest ? 'Link (test)' : 'Sign out (test)', async () => { N.setTestLinked(s.guest); await refresh(); }, 'alt sm', { 'data-el': 'account-test-toggle' })));
    return wrap;
  }
  mountAccountSettings(wrap, N.auth, {
    askEmail: async (mode) => {
      const em = h('input', { type: 'email', placeholder: 'Email', 'aria-label': 'Email', class: 'numin', 'data-input': 'email' }), pw = h('input', { type: 'password', placeholder: mode === 'signin' ? 'Password (blank = email me a link)' : 'Password (8+ characters)', 'aria-label': 'Password', class: 'numin', 'data-input': 'password' });
      const r = await sheet({ title: mode === 'create' ? 'Create account' : 'Sign in', body: h('div', null, h('p', { class: 'hint', text: mode === 'create' ? 'Your guest progress stays: this links the same player to an account.' : 'Sign in to an existing Paige Games account.' }), em, pw), center: true,
        buttons: [{ id: 'no', label: 'Cancel', cls: 'alt' }, mode === 'create' ? { id: 'google', label: 'Google', cls: 'alt' } : null, { id: 'ok', label: 'Continue', cls: 'go' }].filter(Boolean) });
      if (r === 'google') return { email: 'google' }; return r === 'ok' && em.value ? { email: em.value, password: pw.value || undefined } : null;
    },
    askMerge: async () => { const r = await sheet({ title: 'Merge guest progress?', body: 'This account already exists. What should happen to the progress you made as a guest on this device? Nothing changes until you choose.', center: true,
      buttons: [{ id: 'cancel', label: 'Cancel', cls: 'alt' }, { id: 'keep-account', label: 'Keep account data', cls: 'alt' }, { id: 'use-guest', label: 'Use guest progress', cls: 'go' }] }); return r || 'cancel'; },
    onMerged: async () => { await N.refreshEntitlements(); await refresh(); },
    toast,
  }, { classes: C });
  return wrap;
}

/** Admin row: shown ONLY after the server confirms a role. Release builds ship it; it does nothing client-side alone. */
export async function adminSection(nav) {
  const me = await N.admin.me(); if (!me) return null;
  return h('div', null, section('Admin'), h('div', { class: 'row', 'data-el': 'admin-row', onclick: () => nav.open('Admin', adminScreen) }, h('span', { class: 'ic', text: '🛡️' }), h('span', { class: 'tx' }, h('span', { class: 't', text: 'Admin menu' }), h('span', { class: 's', text: `Role: ${me.role}. Server-checked and audited.` })), h('span', { class: 'chev', text: '›' })));
}
export const ADMIN_OPTS = () => ({ game: 'lifeline', toast,
  skus: [{ sku: N.AD_FREE_LIFE.sku, title: 'Ad-Free for Life (network)', game: null }, ...Premium.passes().map((p) => ({ sku: p.id, title: p.name, game: 'lifeline' })), { sku: 'all_access', title: 'All Access', game: 'lifeline' }],
  currencies: [{ id: 'blue_bucks', label: 'Blue Bucks' }, { id: 'echo_coins', label: 'Echo Coins (Riftward)' }, { id: 'gold', label: 'Gold (Riftward)' }],
  flags: [{ key: 'market_bots', label: 'Simulated market bots (Riftward)', game: 'riftward' }] });
export async function adminScreen(body) { const box = h('div'); body.append(box); mountAdminMenu(box, N.admin, ADMIN_OPTS()); }
/** Staff tag next to the player's own name once the server confirms a role. */
export async function paintCreatorTag() {
  const me = await N.admin.me(); if (!me) return;
  const nm = store.root.querySelector('.topbar .nm'); if (nm && !nm.querySelector('[data-el=creator-tag]')) nm.append(creatorTag(me.tag));
}
