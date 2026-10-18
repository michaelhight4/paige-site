import { adapter } from '../adapter.js';
import { businessesScreen } from './extra.js';
import { store, h, ico, row, section, kv, btn, empty, chip, bar, money, sheet, confirmSheet, act, askNumber, toast } from '../ui.js';

export async function assetsMenu(body, { nav }) {
  const items = await adapter.getAssetsMenu();
  const screens = { finances: financesScreen, investments: investmentsScreen, luxury: luxuryScreen, auctions: auctionsScreen, casino: casinoScreen, garage: garageScreen, zoo: zooScreen, belongings: belongingsScreen, properties: propertiesScreen, shopping: shoppingScreen, restoration: restorationScreen, businesses: businessesScreen };
  body.append(h('div', { class: 'tabs-inline', 'data-el': 'assets-tabs' }, h('button', { class: 'on', text: 'Holdings' }), h('button', { 'data-el': 'biz-tab', text: '🏢 Businesses & Studios', onclick: () => nav.open('Businesses & Studios', businessesScreen) })));
  let cur = null;
  for (const m of items) {
    if (m.section !== cur) { cur = m.section; body.append(section(cur)); }
    body.append(row({ id: m.id, icon: m.icon, title: m.label, sub: m.sub, right: m.badge, onClick: () => nav.open(m.label, screens[m.id]) }));
  }
}

export function assetCard(a, { onTap, price, extraBtns } = {}) {
  const icon = store.cfg.assetIcons[a.type] || '📦';
  const pic = h('div', { class: 'ic pic' });
  if (a.wear && a.wear.layers) import('../character.js').then(async ({ composeSprite }) => { pic.innerHTML = await composeSprite(a.wear, { size: 84, crop: a.wear.crop, shadow: false }); }).catch(() => { if (a.svg) pic.innerHTML = a.svg; });
  else if (a.svg) pic.innerHTML = a.svg; else if (a.artUrl) pic.append(h('img', { src: a.artUrl, alt: a.name, loading: 'lazy' })); else pic.append(ico(icon, 44));
  return h('div', { class: 'card', 'data-asset': a.id, onclick: onTap },
    h('div', { class: 'asset' }, pic,
      h('div', { class: 'main' }, h('div', { class: 'top' }, h('div', { class: 'nm', text: a.name }), h('div', { class: 'pr', text: money(price ?? a.value) })),
        h('div', { class: 'sb', text: [a.subtitle, a.type === 'jewelry' || a.ageYears == null ? null : a.ageYears === 0 ? 'Brand new' : `${a.ageYears} yr old`].filter(Boolean).join(' · ') }),
        a.condition != null ? bar('Condition', a.condition, { thin: true, key: 'condition' }) : null,
        a.hauntedness != null ? bar('Hauntedness', a.hauntedness, { thin: true, neutral: true }) : null,
        h('div', { class: 'chips' }, ...(a.flags || []).map(f => chip(f, f)), a.variant ? chip((a.variant.label || 'Variant') + (a.variant.rarity > 1 ? ' ★' : ''), 'good') : null, a.restoring ? chip(`Restoring: ${a.restoring.monthsLeft} mo left`, 'warn') : null, a.mortgage ? chip('Mortgage ' + money(a.mortgage)) : null, a.upkeep ? chip('Upkeep ' + money(a.upkeep) + '/yr') : null))), extraBtns);
}

// ---------- finances ----------
export async function financesScreen(body) {
  const f = await adapter.getFinances();
  body.append(h('div', { class: 'card', 'data-el': 'finance-card' }, h('h3', { text: 'Net worth' }), h('div', { class: 'big' + (f.netWorth < 0 ? ' neg' : ''), text: money(f.netWorth) }),
    kv('Cash', money(f.cash)), kv('Investments', money(f.investmentsValue)), kv('Assets (market value)', money(f.assetsValue)), kv('Debts', '-' + money(f.debts.reduce((s, d) => s + d.balance, 0)), 'neg')));
  body.append(h('div', { class: 'card' }, h('h3', { text: 'Yearly income' }), ...(f.income.length ? f.income.map(i => kv(i.label, money(i.amount), 'pos')) : [h('div', { class: 'hint', text: 'No income.' })])));
  body.append(h('div', { class: 'card' }, h('h3', { text: 'Yearly expenses' }), ...(f.expenses.length ? f.expenses.map(i => kv(i.label, money(i.amount), 'neg')) : [h('div', { class: 'hint', text: 'No upkeep costs.' })])));
  if (f.debts.length) body.append(section('Debts'), ...f.debts.map(d => row({ icon: '🧾', title: d.label, sub: `${d.rate}% interest`, right: money(d.balance), onClick: async () => { const a = await askNumber('Pay toward ' + d.label, { min: 0, max: Math.min(d.balance, f.cash), def: Math.min(d.balance, f.cash) }); if (a) act(adapter.payDebt(d.id, a)); } })));
  body.append(btn('Take a loan', async () => { const a = await askNumber('Loan amount', { min: 1000, max: 100000, def: 10000, note: 'Personal loan at 7.5% interest.' }); if (a) act(adapter.takeLoan(a)); }, 'alt block', { 'data-el': 'take-loan' }));
}
// ---------- investments ----------
export async function investmentsScreen(body) {
  const v = await adapter.getInvestments();
  body.append(h('div', { class: 'card' }, h('h3', { text: 'Portfolio' }), h('div', { class: 'big', text: money(v.holdings.reduce((s, x) => s + x.value, 0)) }), kv('Cash available', money(v.cash))));
  if (v.holdings.length) body.append(section('Holdings'), ...v.holdings.map(x => row({ icon: '📈', title: x.label, sub: `Cost ${money(x.costBasis)} · last year ${x.changePct >= 0 ? '+' : ''}${x.changePct}%`, right: money(x.value), onClick: async () => { const a = await askNumber('Sell how much of ' + x.label + '?', { min: 0, max: x.value, def: x.value }); if (a) act(adapter.divest(x.id, a)); } })));
  body.append(section('Invest'), ...v.products.map(p => row({ id: p.id, icon: p.icon, title: p.label, sub: `${p.sub} · risk: ${p.risk}`, onClick: async () => { const a = await askNumber('Invest in ' + p.label, { min: 1, max: Math.max(1, v.cash), def: Math.min(1000, v.cash) }); if (a) act(adapter.invest(p.id, a)); } })));
}
// ---------- luxury ----------
export async function luxuryScreen(body) {
  const l = await adapter.getLuxury();
  if (l.owned.length) body.append(section('Owned'), ...l.owned.map(a => assetCard(a, { onTap: () => assetSheet(a) })));
  body.append(section('For sale'), ...l.forSale.map(x => row({ id: x.id, icon: '💎', title: x.name, right: money(x.price), onClick: async () => { if (await confirmSheet(x.name, `Buy for ${money(x.price)}?`, 'Buy', 'go')) act(adapter.buy({ shopId: 'luxury', itemId: x.id })); } })));
}
// ---------- auctions ----------
export async function auctionsScreen(body, { nav }) {
  const r = await adapter.getAuctionHouses();
  body.append(...r.houses.flatMap(hs => [section(hs.icon + ' ' + hs.name), ...hs.lots.map(l => row({ id: l.id, icon: '🔨', title: l.name, sub: l.sold ? 'Closed' : `Estimate ${money(l.estimate)}${l.rounds ? ' · round ' + (l.rounds + 1) + '/3' : ''}`, disabled: l.sold, onClick: async () => {
    let amt = Math.min(l.estimate, r.cash);
    for (let round = l.rounds || 0; round < 3; round++) {
      const a = await askNumber('Bid on ' + l.name, { min: 1, max: Math.max(1, r.cash), def: amt, note: `Estimate ${money(l.estimate)}. Live auction: a rival may raise (round ${round + 1}/3).` }); if (a == null) return;
      const res = await act(adapter.bid(l.id, a), { quiet: true }); toast(res.message, res.data && res.data.won ? 'good' : res.ok ? '' : 'bad');
      if (!(res.ok && res.data && res.data.open)) return; amt = res.data.need || a;
    }
  } }))]));
}
// ---------- casino ----------
async function playHand(r, g) {
  // blackjack: interactive hit/stand loop
  while (r.interactive && r.hand) {
    const hd = r.hand, k = await sheet({ title: `🃏 Blackjack (bet ${money(hd.bet)})`, center: true, dismissable: false, body: h('div', null, h('div', { class: 'slot', text: `Dealer: ${hd.dealer.join(' ')}` }), h('div', { class: 'slot', text: `You: ${hd.you.join(' ')} = ${hd.youTotal}` })), buttons: [{ id: 'hit', label: 'Hit', cls: 'alt' }, { id: 'stand', label: 'Stand', cls: 'go' }] });
    r = await act(adapter.blackjackAction(k === 'hit' ? 'hit' : 'stand'), { quiet: true });
  }
  return r;
}
export async function casinoScreen(body) {
  const c = await adapter.getCasino();
  if (c.locked) return body.append(empty(`The casino is for ${c.minAge}+ only.`));
  body.append(h('div', { class: 'card' }, h('h3', { text: c.name || 'Casino' }), h('div', { class: 'hint', text: 'Lifetime result' }), h('div', { class: 'big' + (c.lifetimeNet < 0 ? ' neg' : ''), text: money(c.lifetimeNet) })));
  body.append(section('Tables'), ...c.games.map(g => row({ id: g.id, icon: g.icon, title: g.label, sub: `${g.sub} · bet ${money(g.minBet)}–${money(g.maxBet)}${g.winOdds ? ' · ~' + g.winOdds + '% to win' : ''}`, onClick: async () => {
    let pick = null;
    if (g.choices) { const i = await sheet({ title: g.label + ': pick', options: g.choices.map(x => ({ label: x[0].toUpperCase() + x.slice(1) + (x === 'green' ? ' (35x)' : ' (2x)') })) }); if (i == null) return; pick = g.choices[i]; }
    const bet = await askNumber(g.label + ': place your bet', { min: g.minBet, max: Math.min(g.maxBet, Math.max(g.minBet, c.cash)), def: g.minBet }); if (bet == null) return;
    let r = await act(adapter.gamble(g.id, bet, pick), { quiet: true });
    r = await playHand(r, g);
    await sheet({ title: r.ok ? (r.win ? '🎉 You win!' : r.delta ? '💸 You lose' : 'Push') : 'Hold on', center: true, body: h('div', null, r.detail ? h('div', { class: 'slot', text: r.detail }) : null, h('p', { text: r.message })), buttons: [{ id: 'ok', label: 'OK', cls: 'go' }] });
  } })));
}
// ---------- race car garage ----------
export async function garageScreen(body) {
  const g = await adapter.getGarage();
  if (!g.cars.length) body.append(empty('Your garage is empty.'));
  for (const c of g.cars) {
    body.append(h('div', { class: 'card', 'data-car': c.id }, h('div', { class: 'asset' }, h('div', { class: 'ic', text: '🏎️' }), h('div', { class: 'main' }, h('div', { class: 'nm', text: c.model }), h('div', { class: 'sb', text: `${c.wins} wins / ${c.races} races` }), bar('Rating', c.rating, { thin: true }), h('div', { class: 'chips' }, ...c.upgrades.map(u => chip(g.upgrades.find(x => x.id === u)?.label || u, 'good'))))),
      h('div', { class: 'btns' }, btn('Tune', () => act(adapter.upgradeRaceCar(c.id)), 'alt sm'),
        btn('Race', async () => { const i = await sheet({ title: 'Choose a race', options: g.races.map(r => ({ label: `${r.label} — purse ${money(r.purse)}`, sub: `Entry ${money(r.entry)}${r.minCond ? ' · condition ' + r.minCond + '+' : ''}` })) }); if (i != null) { const r = await act(adapter.race(c.id, g.races[i].id), { quiet: true }); toast(r.message, r.ok ? 'good' : 'bad'); } }, 'go sm'))));
  }
  body.append(section(`Move a car into the garage (${g.cars.length}/${g.slots})`), ...(g.catalog.length ? [] : [empty('Buy a car from a dealer first.')]), ...g.catalog.map(x => row({ id: x.id, icon: '🏁', title: x.model, right: money(x.base), onClick: () => act(adapter.buyRaceCar(x.id)) })));
}
// ---------- zoo ----------
export async function zooScreen(body) {
  const z = await adapter.getZoo();
  if (!z.owned) { body.append(h('div', { class: 'card' }, h('h3', { text: 'Own a zoo' }), h('p', { class: 'hint', text: 'Buy land and start collecting animals. Visitors bring yearly income; upkeep applies.' }), kv('Price', money(z.buyPrice))), btn('Buy a zoo', () => act(adapter.buyZoo()), 'go block', { 'data-el': 'buy-zoo' })); return; }
  body.append(h('div', { class: 'card' }, h('h3', { text: 'My zoo' }), bar('Rating', z.rating, { thin: true }), kv('Visitors / yr', z.visitors.toLocaleString()), kv('Income last year', money(z.yearlyIncome), 'pos'), kv('Upkeep', money(z.yearlyUpkeep), 'neg')));
  if (z.animals.length) body.append(section('Animals'), ...z.animals.map(a => h('div', { class: 'card' }, h('div', { class: 'asset' }, h('div', { class: 'ic', text: a.icon }), h('div', { class: 'main' }, h('div', { class: 'nm', text: a.label }), bar('Health', a.health, { thin: true }), bar('Happiness', a.happy, { thin: true }))), h('div', { class: 'btns' }, btn('Sell', () => act(adapter.sellAnimal(a.id)), 'alt sm')))));
  body.append(kv('Enclosures', `${z.enclosures} (room for ${z.capacity} animals)`), btn(`🏗️ Build enclosure — ${money(z.enclosureCost)}`, () => act(adapter.buildEnclosure()), 'alt block', { 'data-el': 'build-enclosure' }));
  body.append(section('Buy animals'), ...z.catalog.map(a => row({ id: a.id, icon: a.icon, title: a.label, right: money(a.price), onClick: () => act(adapter.buyAnimal(a.id)) })));
}
// ---------- belongings ----------
async function assetSheet(a) {
  const i = await sheet({ title: a.name, body: h('div', null, kv('Value', money(a.value)), a.condition != null ? kv('Condition', a.condition + '%') : null, kv('Paid', money(a.purchasePrice))), options: a.actions.map(x => ({ label: x.label })) });
  if (i == null) return; const id = a.actions[i].id;
  if (id === 'restore') { const { openPanel } = await import('../ui.js'); return openPanel('Restoration', (b, c) => restorationDetail(b, c, a.id)); }
  if (id === 'amenity') { const p = await adapter.getProperties(); const k = await sheet({ title: 'Add an amenity', options: p.amenities.map(x => ({ label: x.name, sub: `+${x.upliftPct}% value · from ${money(x.priceMin)}` })) }); if (k == null) return; return act(adapter.assetAction(a.id, 'amenity:' + p.amenities[k].name)); }
  if (id === 'sell' || id === 'scrap') if (!(await confirmSheet(a.name, `${id === 'sell' ? 'Sell' : 'Scrap'} this? Market value ${money(a.value)}.`, 'Confirm', 'danger'))) return;
  act(adapter.assetAction(a.id, id));
}
export async function belongingsScreen(body) {
  const b = await adapter.getBelongings(); let any = false;
  for (const c of b.categories) { if (!c.items.length) continue; any = true; body.append(section(`${c.icon} ${c.label}`), ...c.items.map(a => assetCard(a, { onTap: () => assetSheet(a) }))); }
  if (!any) body.append(empty('You own nothing yet. Visit Shopping to buy something.'));
}
export async function propertiesScreen(body) {
  const p = await adapter.getProperties();
  if (!p.properties.length) body.append(empty('You do not own any property.'));
  body.append(...p.properties.map(a => assetCard(a, { onTap: () => assetSheet(a) })));
  body.append(section('Amenity catalogue'), ...p.amenities.map(a => row({ icon: '🏊', title: a.name, sub: `+${a.upliftPct}% home value`, right: a.priceMin ? money(a.priceMin) + '+' : '—', chevron: false })));
}
// ---------- shopping ----------
export async function shoppingScreen(body, { nav }) {
  const shops = await adapter.getShops(); let cur = null;
  for (const s of shops) { if (s.section !== cur) { cur = s.section; body.append(section(cur)); } body.append(row({ id: s.id, icon: s.icon, title: s.name, sub: s.sub, onClick: () => nav.open(s.name, (b, c) => shopScreen(b, c, s.id)) })); }
}
export async function shopScreen(body, ctx, shopId) {
  const inv = await adapter.getShopInventory(shopId);
  if (inv.locked) return body.append(empty(inv.lockReason));
  body.append(btn('🔄 Refresh Inventory', () => act(adapter.refreshInventory(shopId)), 'alt block', { 'data-el': 'refresh-inventory' }));
  body.append(...inv.items.map(it => assetCard(it, { price: it.price, onTap: async () => {
    if (it.type === 'clothing') { const cols = await adapter.listingColors(shopId, it.id); if (cols.length) { const k = await sheet({ title: 'Pick a color: ' + it.name, options: cols.map((c) => ({ label: c.label + (c.rarity > 1 ? ' ★' : ''), sub: c.rarity > 1 ? 'Rare color, costs more' : '' })) }); if (k == null) return; await adapter.setListingColor(shopId, it.id, cols[k].seed); it = (await adapter.getShopInventory(shopId)).items.find((x) => x.id === it.id) || it; } }
    const opts = [{ label: `Pay cash — ${money(it.price)}`, sub: it.canAfford ? '' : 'Not enough cash', disabled: !it.canAfford }]; if (it.canMortgage) opts.push({ label: `Mortgage — ${money(Math.round(it.price * 0.2))} down`, sub: 'Pay the rest over time' });
    const i = await sheet({ title: it.name, body: it.subtitle, options: opts }); if (i == null) return; act(adapter.buy({ shopId, itemId: it.id, payment: i === 0 ? 'cash' : 'mortgage' }));
  } })));
}
// ---------- restoration ----------
export async function restorationScreen(body, ctx) {
  const r = await adapter.getRestorationProjects();
  if (!r.projects.length) return body.append(empty('You do not own any cars. Buy one from a car dealer, then restore it here.'));
  body.append(section('Your cars'), ...r.projects.map(p => assetCard({ type: 'car', id: p.assetId, name: p.name, subtitle: p.subtitle, value: p.value, condition: p.condition, flags: p.classic ? ['classic'] : [] }, { onTap: () => ctx.nav.open('Restoration', (b, c) => restorationDetail(b, c, p.assetId)) })));
}
export async function restorationDetail(body, ctx, assetId) {
  const r = await adapter.getRestorationProjects(); const p = r.projects.find(x => x.assetId === assetId);
  if (!p) return body.append(empty('Car not found (maybe sold).'));
  body.append(assetCard({ type: 'car', id: p.assetId, name: p.name, subtitle: p.subtitle, value: p.value, condition: p.condition, flags: p.classic ? ['classic'] : [] }));
  body.append(h('div', { class: 'card', 'data-el': 'restore-estimate' }, kv('Current value', money(p.value)), kv('Value if fully restored', money(p.estimatedValueAfter), 'pos'), kv('Your cash', money(r.cash))));
  body.append(section('Restoration stages'), ...p.stages.map(s => row({ id: s.id, icon: s.done ? '✅' : s.icon, title: s.label, sub: s.done ? 'Complete' : `+${s.gain}% condition`, right: s.done ? null : money(s.cost), disabled: s.done || p.condition >= 100, onClick: () => act(adapter.restoreCar(assetId, s.id)) })));
}
