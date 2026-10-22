import { fmtPrice, fmtPct } from '../../../src/fmt.js';
import { adapter } from '../adapter.js';
import { businessesScreen } from './extra.js';
import { advisorScreen } from './venture.js';
import { store, h, ico, row, section, kv, btn, empty, chip, bar, money, sheet, confirmSheet, act, askNumber, toast } from '../ui.js';

export async function assetsMenu(body, { nav }) {
  const items = await adapter.getAssetsMenu();
  const screens = { advisor: advisorScreen, finances: financesScreen, investments: investmentsScreen, luxury: luxuryScreen, auctions: auctionsScreen, casino: casinoScreen, garage: garageScreen, zoo: zooScreen, belongings: belongingsScreen, properties: propertiesScreen, shopping: shoppingScreen, restoration: restorationScreen, businesses: businessesScreen };
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
// ---------- investments: holdings with cost / value / P&L, tap for Buy more / Sell / History; market list opens a chart + Buy ----------
const pctTxt = (p) => (p == null || !isFinite(p) ? '' : fmtPct(p)); // 7c6: small changes on huge values keep 2 decimals instead of +0%
const pnlCls = (v) => (v >= 0 ? 'pos' : 'neg');
const unitsTxt = (u, dec = 2) => Number(u).toLocaleString('en-US', { maximumFractionDigits: Math.max(dec, 4) });
// a money/units text input that keeps thousands commas while typing
function numInput(def, { decimals = 0 } = {}) {
  const inp = h('input', { type: 'text', inputmode: 'decimal', class: 'numin', 'data-el': 'num-input', style: { width: '100%', fontSize: '18px', padding: '8px', boxSizing: 'border-box' } });
  const fmt = (n) => (n === '' || n == null || isNaN(n) ? '' : Number(n).toLocaleString('en-US', { maximumFractionDigits: decimals }));
  inp.value = fmt(def); inp.num = () => Number(String(inp.value).replace(/[^\d.]/g, '')) || 0;
  inp.addEventListener('input', () => { const raw = String(inp.value).replace(/[^\d.]/g, ''); const [a, b] = raw.split('.'); inp.value = (a ? Number(a).toLocaleString('en-US') : '') + (b != null && decimals ? '.' + b.slice(0, decimals) : ''); inp.dispatchEvent(new Event('change')); });
  inp.setNum = (n) => { inp.value = fmt(n); inp.dispatchEvent(new Event('change')); };
  return inp;
}
// SVG line chart of a price series (readable at 390px, high/low/current, timeframe chosen by the caller)
export function priceChart(series, { w = 340, hgt = 140 } = {}) {
  if (!series || series.length < 2) return h('div', { class: 'hint', text: 'Not enough history yet.' });
  const ps = series.map((x) => x.price), lo = Math.min(...ps), hi = Math.max(...ps), pad = 16, X = (i) => pad + (i * (w - 2 * pad)) / (series.length - 1), Y = (v) => hgt - pad - ((v - lo) / (hi - lo || 1)) * (hgt - 2 * pad);
  const up = ps[ps.length - 1] >= ps[0], col = up ? '#1b7f3b' : '#b3261e', pts = series.map((x, i) => `${X(i).toFixed(1)},${Y(x.price).toFixed(1)}`).join(' ');
  const n = series.length, sx = series.reduce((a, _, i) => a + i, 0) / n, sy = ps.reduce((a, v) => a + v, 0) / n, sl = series.reduce((a, x, i) => a + (i - sx) * (x.price - sy), 0) / (series.reduce((a, _, i) => a + (i - sx) ** 2, 0) || 1), t0 = sy - sl * sx, t1 = t0 + sl * (n - 1);
  const el = h('div', { 'data-el': 'price-chart', style: { padding: '4px 0' } }); el.innerHTML = `<svg viewBox="0 0 ${w} ${hgt}" width="100%" role="img" aria-label="Price history"><rect x="0" y="0" width="${w}" height="${hgt}" rx="10" fill="#ffffff" stroke="#c9d3df"/><line x1="${pad}" y1="${Y(t0).toFixed(1)}" x2="${w - pad}" y2="${Y(t1).toFixed(1)}" stroke="#6b7a8c" stroke-dasharray="4 4" stroke-width="1.5"/><polyline fill="none" stroke="${col}" stroke-width="2.5" points="${pts}"/><text x="${pad}" y="13" font-size="11" fill="#1d2a3a">High ${hi.toLocaleString('en-US', { maximumFractionDigits: 2 })}</text><text x="${pad}" y="${hgt - 4}" font-size="11" fill="#1d2a3a">Low ${lo.toLocaleString('en-US', { maximumFractionDigits: 2 })}</text><text x="${w - pad}" y="13" font-size="11" text-anchor="end" fill="#1d2a3a">Age ${series[0].age}–${series[n - 1].age}</text></svg>`;
  return el;
}
async function buySheet(p, cash) {
  const inp = numInput(Math.min(1000, Math.floor(cash))), info = h('div', { class: 'hint', 'data-el': 'buy-total' });
  const upd = () => { const a = inp.num(), f = Math.pow(10, p.decimals), u = Math.floor((a / p.price) * f) / f; info.textContent = `${unitsTxt(u, p.decimals)} units × ${fmtPrice(p.price)} = ${money(u * p.price)} · cash ${money(cash)}`; };
  inp.addEventListener('change', upd); upd();
  const maxBtn = h('button', { class: 'btn alt sm', 'data-el': 'buy-max', type: 'button', text: 'Buy Max', onclick: async () => { const q = await adapter.investQuoteMax(p.id); if (q) inp.setNum(Math.floor(q.cost * 100) / 100); } });
  const r = await sheet({ title: `Buy ${p.label}`, center: true, body: h('div', null, h('div', { class: 'hint', text: `Price ${fmtPrice(p.price)} per unit · you own ${unitsTxt(p.units || 0, p.decimals)}` }), inp, h('div', { class: 'btns' }, maxBtn), info), buttons: [{ id: 'no', label: 'Cancel', cls: 'alt' }, { id: 'ok', label: 'Buy', cls: 'go' }] });
  if (r !== 'ok') return; const a = inp.num(); if (!(a > 0)) return;
  const q = await adapter.investQuoteMax(p.id); if (q && a >= Math.min(q.cost - 0.005, q.cost * (1 - 1e-9))) { if (await confirmSheet('Buy Max?', `Buy ${unitsTxt(q.units, p.decimals)} units of ${p.label} for ${money(q.cost)}? No loans are used.`, 'Buy', 'go')) await act(adapter.investBuyMax(p.id)); return; }
  await act(adapter.invest(p.id, Math.min(a, cash)));
}
async function sellSheet(x, dec) {
  const inp = numInput(x.units, { decimals: dec }), info = h('div', { class: 'hint', 'data-el': 'sell-total' });
  const upd = () => { const u = Math.min(inp.num(), x.units); info.textContent = `Selling ${unitsTxt(u, dec)} units = ${money(u * x.price)}`; }; inp.addEventListener('change', upd); upd();
  const r = await sheet({ title: `Sell ${x.label}`, center: true, body: h('div', null, h('div', { class: 'hint', text: `You own ${unitsTxt(x.units, dec)} units · ${fmtPrice(x.price)} each · worth ${money(x.value)}` }), inp, h('div', { class: 'btns' }, h('button', { class: 'btn alt sm', type: 'button', 'data-el': 'sell-half', text: 'Sell Half', onclick: () => inp.setNum(Math.floor((x.units / 2) * 10 ** dec) / 10 ** dec) }), h('button', { class: 'btn alt sm', type: 'button', 'data-el': 'sell-all', text: 'Sell All', onclick: () => inp.setNum(x.units) })), info), buttons: [{ id: 'no', label: 'Cancel', cls: 'alt' }, { id: 'ok', label: 'Sell', cls: 'go' }] });
  if (r !== 'ok') return; const u = inp.num(); if (!(u > 0)) return; await act(adapter.investSellUnits(x.id, u >= x.units ? 'all' : u));
}
function historyList(rows, title) {
  if (!rows || !rows.length) return h('div', { class: 'hint', style: { padding: '4px 12px' }, text: 'History starts after your next birthday.' });
  return h('details', { class: 'card', 'data-el': 'yearly-history' }, h('summary', { text: title || 'Yearly history' }), ...rows.slice().reverse().map((r) => h('div', { class: 'kv' }, h('span', { text: `Age ${r.age}: ${money(r.start)} → ${money(r.end)}` }), h('b', { class: pnlCls(r.pct), text: pctTxt(r.pct) }))));
}
export async function productScreen(body, ctx, id) {
  const v = await adapter.getInvestments(), p = v.products.find((x) => x.id === id); if (!p) return body.append(empty('Gone.'));
  let span = 10; const box = h('div');
  const draw = () => { box.replaceChildren(priceChart(span ? p.history.slice(-span - 1) : p.history)); };
  const ps = p.history.map((x) => x.price);
  body.append(h('div', { class: 'card', 'data-el': 'product-card' }, h('h3', { text: `${p.icon} ${p.label}` }), kv('Current price', fmtPrice(p.price)), kv('High / low', `${fmtPrice(Math.max(...ps))} / ${fmtPrice(Math.min(...ps))}`), kv('Last year', pctTxt(p.changePct), pnlCls(p.changePct)), kv('Risk', p.risk),
    h('div', { class: 'tabs-inline', 'data-el': 'chart-span' }, ...[[5, '5y'], [10, '10y'], [0, 'All']].map(([n, l]) => h('button', { class: n === span ? 'on' : '', 'data-span': n, text: l, onclick: (e) => { span = n; e.target.parentNode.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b === e.target)); draw(); } }))), box,
    h('div', { class: 'btns' }, btn('Buy', async () => { await buySheet(p, v.cash); await ctx.refresh(); }, 'go', { 'data-el': 'product-buy' }))));
  draw();
  const nw = (v.news && v.news.items || []).filter((n) => n.id === id || (n.scope === 'sector' && n.sector === (p.sector || ''))); if (nw.length) body.append(section('In the news'), ...nw.map((n) => h('div', { class: 'hint', style: { padding: '2px 14px' }, text: '📰 ' + n.text })));
}
export async function marketNewsScreen(body) {
  const v = await adapter.getInvestments(); const n = v.news;
  body.append(h('div', { class: 'card', 'data-el': 'news-intro' }, h('h3', { text: '📰 Market News' }), h('div', { class: 'hint', text: 'Headlines for the coming year. They are usually right about where prices go, but not always. Read them, then decide.' })));
  if (!n || !n.items.length) return body.append(empty('No headlines yet. Check back after your next birthday.'));
  body.append(...n.items.map((x) => h('div', { class: 'card', 'data-news': x.id }, h('div', { class: 'nm', style: { fontWeight: 800 }, text: x.text }), h('div', { class: 'hint', text: `Hint: ${x.dir === 'up' ? 'could rise' : 'could fall'} · ${x.scope === 'sector' ? 'whole sector' : 'single name'}` }))));
}
export async function investmentsScreen(body, ctx) {
  const v = await adapter.getInvestments(), T = v.total;
  body.append(h('div', { class: 'card', 'data-el': 'portfolio' }, h('h3', { text: 'Portfolio' }), h('div', { class: 'big', text: money(T.value) }), kv('Invested (cost)', money(T.cost)), kv('Profit / loss', `${money(T.pnl)} (${pctTxt(T.pnlPct)})`, pnlCls(T.pnl)), T.lifetime ? h('div', { class: 'kv', 'data-el': 'lifetime-pnl', title: `Sold: ${money(T.lifetime.realized, true)} · yields: ${money(T.lifetime.income, true)} · open: ${money(T.lifetime.unrealized, true)}` }, h('span', { text: 'Lifetime P/L' }), h('b', { class: pnlCls(T.lifetime.pnl), style: { overflowWrap: 'anywhere', textAlign: 'right' }, text: `${T.lifetime.pnl > 0 ? '+' : ''}${money(T.lifetime.pnl, true)} (${pctTxt(T.lifetime.pct)})` })) : null, kv('Cash available', money(v.cash)),
    h('div', { class: 'kv', 'data-el': 'div-balance' }, h('span', { text: 'Dividends to collect' }), h('b', { style: { overflowWrap: 'anywhere', textAlign: 'right' }, text: money(T.dividendBalance || 0, true) })),
    T.dividendBalance > 0 ? h('div', { class: 'btns', style: { flexWrap: 'wrap' } }, btn('Collect', async () => { if (await confirmSheet('Collect dividends?', `Move ${money(T.dividendBalance)} into your cash.`, 'Collect', 'go')) { await act(adapter.investCollectDividends()); await ctx.refresh(); } }, 'go sm', { 'data-el': 'div-collect' }), btn('Reinvest all', async () => { await act(adapter.investReinvestDividends()); await ctx.refresh(); }, 'alt sm', { 'data-el': 'div-reinvest' })) : null,
    historyList(v.portfolioHistory, 'Portfolio yearly history')));
  body.append(row({ id: 'market-news', icon: '📰', title: 'Market News', sub: (v.news && v.news.items[0] && v.news.items[0].text) || 'Yearly headlines that hint at what to buy or avoid', onClick: () => ctx.nav.open('Market News', marketNewsScreen) }));
  if (v.holdings.length) body.append(section('Holdings'), ...v.holdings.map((x) => h('button', { class: 'card holding', 'data-hold': x.id, style: { display: 'block', width: 'calc(100% - 24px)', textAlign: 'left' }, onclick: async () => {
    const dec = (v.products.find((p) => p.id === x.id) || {}).decimals ?? 2; const i = await sheet({ title: x.label, options: [{ label: 'Buy more' }, { label: 'Sell' }, { label: 'View history' }, ...(x.divMode ? [{ label: x.divMode === 'cash' ? 'Dividends: switch to Reinvest' : 'Dividends: switch to Cash out' }] : [])] });
    if (i === 3) { await act(adapter.investDivMode(x.id, x.divMode === 'cash' ? 'reinvest' : 'cash')); await ctx.refresh(); return; }
    if (i === 0) { await buySheet(v.products.find((p) => p.id === x.id), v.cash); await ctx.refresh(); } else if (i === 1) { await sellSheet(x, dec); await ctx.refresh(); } else if (i === 2) ctx.nav.open(x.label + ' history', (b) => { b.append(h('div', { class: 'card' }, h('h3', { text: 'While you held it' }), kv('Cost basis', money(x.costBasis)), kv('Value now', money(x.value)), kv('Profit / loss', `${money(x.pnl)} (${pctTxt(x.pnlPct)})`, pnlCls(x.pnl))), priceChart((v.products.find((p) => p.id === x.id) || {}).history || []), historyList(x.history)); }); } },
    h('div', { class: 'nm', style: { fontWeight: 800 }, text: `${x.icon} ${x.label}` }), h('div', { class: 'hint', text: `${unitsTxt(x.units)} units × ${fmtPrice(x.price)}` }), kv('Cost', money(x.costBasis)), kv('Value', money(x.value)), kv('P/L', `${money(x.pnl)} (${pctTxt(x.pnlPct)})`, pnlCls(x.pnl)), kv('Last year', pctTxt(x.lastYearPct), pnlCls(x.lastYearPct)), x.divMode ? kv('Dividends', x.divMode === 'cash' ? 'Cash out (collect on Portfolio)' : 'Reinvest') : null)));
  body.append(section('Invest'), ...v.products.map((p) => row({ id: p.id, icon: p.icon, title: p.label, sub: `${p.sub} · ${pctTxt(p.changePct)} last year · risk ${p.risk}`, onClick: () => ctx.nav.open(p.label, (b, c) => productScreen(b, c, p.id)) })));
}
// ---------- luxury ----------
export async function luxuryScreen(body) {
  const l = await adapter.getLuxury();
  if (l.owned.length) body.append(section('Owned'), ...l.owned.map(a => assetCard(a, { onTap: () => assetSheet(a) })));
  body.append(section('For sale'), ...l.forSale.map(x => row({ id: x.id, icon: '💎', title: x.name, right: fmtPrice(x.price), onClick: async () => { if (await confirmSheet(x.name, `Buy for ${fmtPrice(x.price)}?`, 'Buy', 'go')) act(adapter.buy({ shopId: 'luxury', itemId: x.id })); } })));
}
// ---------- auctions ----------
// every lot shows a picture: recoloured SVG art when it has a variant, the category art file otherwise, and a category icon as the last fallback
function lotPic(l, size) {
  const pic = h('div', { class: 'lot-pic', 'data-el': 'lot-pic', style: { width: size + 'px', height: size + 'px', flex: `0 0 ${size}px`, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '10px', overflow: 'hidden', background: 'var(--card2, #eef2f7)', margin: size > 60 ? '0 auto 8px' : '0 8px 0 0' } });
  if (l.svg) pic.innerHTML = l.svg; else if (l.artUrl) pic.append(h('img', { src: l.artUrl, alt: l.name, loading: 'lazy', style: { width: '100%', height: '100%', objectFit: 'contain' } })); else pic.append(h('span', { style: { fontSize: Math.round(size * 0.6) + 'px' }, text: l.icon || '🏺' }));
  const svg = pic.querySelector('svg'); if (svg) { svg.setAttribute('width', '100%'); svg.setAttribute('height', '100%'); }
  return pic;
}
function lotThumb(l, el) { const old = el.querySelector('.ic'); if (old) old.replaceWith(lotPic(l, 44)); else el.prepend(lotPic(l, 44)); return el; }
export async function auctionsScreen(body, { nav }) {
  const r = await adapter.getAuctionHouses();
  body.append(...r.houses.flatMap(hs => [section(hs.icon + ' ' + hs.name), ...hs.lots.map(l => lotThumb(l, row({ id: l.id, icon: l.icon, title: l.name, sub: l.sold ? 'Closed' : `Estimate ${money(l.estimate)}${l.rounds ? ' · round ' + (l.rounds + 1) + '/3' : ''}`, disabled: l.sold, onClick: async () => {
    { const go = await sheet({ title: l.name, body: h('div', { 'data-el': 'lot-detail' }, lotPic(l, 160), h('div', { class: 'hint', text: `Estimate ${money(l.estimate)} · rarity ${'★'.repeat(l.rarity || 1)}` })), buttons: [{ id: 'no', label: 'Close', cls: 'alt' }, { id: 'bid', label: 'Bid', cls: 'go' }] }); if (go !== 'bid') return; }
    let amt = Math.min(l.estimate, r.cash);
    for (let round = l.rounds || 0; round < 3; round++) {
      const a = await askNumber('Bid on ' + l.name, { min: 1, max: Math.max(1, r.cash), def: amt, note: `Estimate ${money(l.estimate)}. Live auction: a rival may raise (round ${round + 1}/3).` }); if (a == null) return;
      const res = await act(adapter.bid(l.id, a), { quiet: true }); toast(res.message, res.data && res.data.won ? 'good' : res.ok ? '' : 'bad');
      if (!(res.ok && res.data && res.data.open)) return; amt = res.data.need || a;
    }
  } })))]));
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
