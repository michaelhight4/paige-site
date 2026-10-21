// Sports honors (7c): trophy case (rings for US leagues, trophies + medals elsewhere), Hall of Fame popup + legacy entry + family bonus,
// and athlete brand deals (shoes, drinks, apparel, games) priced by fame, performance and pay. Same rules by hand or on Autopilot.
import { rnd, chance, clamp } from './rng.js';
import { log, earn, addStat } from './core.js';
import { fmtMoney } from './fmt.js';
import * as MT from './myteam.js';
const R = Math.round, age = (s) => Math.floor(s.age), money = (n) => fmtMoney(n);
const RING = ['basketball', 'football', 'baseball', 'hockey'];
const SPORT_NAME = (sid) => (sid ? sid[0].toUpperCase() + sid.slice(1) : 'Sport');
export function trophyCase(s) {
  const m = MT.ensure(s), out = [];
  for (const a of m.awards.filter((x) => x.id === 'champion' && x.level !== 'school')) { const ring = RING.includes(a.sid); out.push({ sid: a.sid, year: a.year, level: a.level, kind: ring ? 'ring' : 'trophy', icon: ring ? '💍' : '🏆', label: ring ? `${SPORT_NAME(a.sid)} championship ring` : `${SPORT_NAME(a.sid)} league trophy + winner's medal` }); }
  const by = {}; for (const t of out) { const k = t.sid + t.kind; by[k] = by[k] || { sid: t.sid, kind: t.kind, icon: t.icon, label: t.label, years: [] }; by[k].years.push(t.year); }
  return { items: out, groups: Object.values(by).map((g) => ({ ...g, count: g.years.length })), rings: out.filter((x) => x.kind === 'ring').length, trophies: out.filter((x) => x.kind === 'trophy').length, hof: !!m.career.hof };
}
// Hall of Fame: myteam.hofCheck calls this once on induction.
export function inducted(s, sid) {
  const kids = (s.people || []).filter((p) => p.alive && (p.rel === 'child' || p.rel === 'grandchild'));
  for (const k of kids) k.relation = clamp((k.relation || 50) + 10, 0, 100);
  s.awards = s.awards || []; s.awards.push({ id: 'hall_of_fame', age: age(s), text: `Hall of Fame: inducted (${SPORT_NAME(sid)})` });
  s.flags = s.flags || {}; s.flags.hof_family = 1; // heirs start with +5 fame (legacy.js)
  if (s.pending && !s.pending.some((x) => x.kind === 'hof')) s.pending.push({ kind: 'hof', sid });
}
export function hofCard(s) { const p = s.pending[0], tc = trophyCase(s); return { kind: 'hof', id: 'hof', title: '🏛️ Hall of Fame!', text: `You were inducted into the ${SPORT_NAME(p.sid)} Hall of Fame${tc.items.length ? ` with ${tc.rings ? tc.rings + ' ring' + (tc.rings > 1 ? 's' : '') : ''}${tc.rings && tc.trophies ? ' and ' : ''}${tc.trophies ? tc.trophies + ' troph' + (tc.trophies > 1 ? 'ies' : 'y') : ''}` : ''}. Your family is proud, and your heirs inherit a famous name.`, choices: [{ label: 'Give the speech' }, { label: 'Keep it short' }] }; }
export function hofResolve(s, i) { if (!s.pending[0] || s.pending[0].kind !== 'hof') return null; s.pending.shift(); addStat(s, 'happiness', i === 0 ? 6 : 3); log(s, i === 0 ? 'I gave a long Hall of Fame speech. People cried, some from boredom.' : 'I kept my Hall of Fame speech short and got a standing ovation.', 'sport'); return { ok: true, msg: 'Hall of Fame.' }; }
// Brand deals
export const CATS = [{ id: 'shoes', icon: '👟', name: 'Shoes', brands: ['Strideline', 'Volt Kicks', 'Apex Sole'] }, { id: 'drinks', icon: '🥤', name: 'Drinks', brands: ['Fizzwave', 'Hydro Peak', 'Bolt Water'] }, { id: 'apparel', icon: '👕', name: 'Apparel', brands: ['Northfield', 'Rally Wear', 'Crestline'] }, { id: 'games', icon: '🎮', name: 'Video games', brands: ['Pixelfield Sports', 'Arena Live', 'Pro Rivals'] }];
export const MAX_DEALS = 3;
const B = (s) => { const m = MT.ensure(s); if (!m.brand) m.brand = { deals: [], offers: [], year: -1, nid: 1 }; return m.brand; };
function payBase(s) { const m = MT.ensure(s), fame = clamp(s.stats.fame || 0, 0, 100), pts = Math.min(m.career.pts || 0, 60), sal = (m.contract && m.contract.salary) || 60000; return Math.max(15000, sal * 0.12) * (0.4 + fame / 80) * (1 + pts / 60); }
export function eligible(s) { const mem = MT.membership(s), m = MT.ensure(s); if (mem && (mem.level === 'pro' || mem.level === 'minor')) return true; return !!(m.career.proYears && (s.stats.fame || 0) >= 40); }
export function rollOffers(s) { const b = B(s); if (b.year === age(s)) return; b.year = age(s); b.offers = []; if (!eligible(s)) return; const n = 1 + (chance(s, 0.5) ? 1 : 0) + ((s.stats.fame || 0) > 60 ? 1 : 0), base = payBase(s);
  for (let i = 0; i < n; i++) { const c = CATS[Math.floor(rnd(s) * CATS.length)], brand = c.brands[Math.floor(rnd(s) * c.brands.length)]; b.offers.push({ id: 'bd' + b.nid++, cat: c.id, icon: c.icon, brand, pay: R(base * (0.6 + rnd(s) * 0.9) / 1000) * 1000, years: 2 + Math.floor(rnd(s) * 3) }); } }
export function view(s) { const b = B(s); rollOffers(s); const lo = b.deals.length ? Math.min(...b.deals.map((d) => d.pay)) : 0; return { eligible: eligible(s), deals: b.deals.map((d) => ({ ...d, left: d.until - age(s) })), offers: b.offers.map((o) => ({ ...o, better: b.deals.length >= MAX_DEALS && o.pay > lo, catTaken: b.deals.some((d) => d.cat === o.cat) })), max: MAX_DEALS, yearly: b.deals.reduce((a, d) => a + d.pay, 0) }; }
export function accept(s, id, swapId) { const b = B(s), o = b.offers.find((x) => x.id === id); if (!o) return { ok: false, msg: 'That offer is gone.' };
  const same = b.deals.find((d) => d.cat === o.cat); let out = swapId ? b.deals.find((d) => d.id === swapId) : same; if (same && out !== same) return { ok: false, msg: `You already wear a ${o.cat} brand. Swap that deal instead.` };
  if (!out && b.deals.length >= MAX_DEALS) return { ok: false, msg: `All ${MAX_DEALS} brand slots are full. Drop or swap one.` };
  if (out) b.deals = b.deals.filter((d) => d !== out); b.offers = b.offers.filter((x) => x !== o); b.deals.push({ ...o, until: age(s) + o.years });
  log(s, `I signed a ${money(o.pay)}/yr ${o.cat} deal with ${o.brand}${out ? ` (replacing ${out.brand})` : ''}.`, 'sport'); return { ok: true, msg: `Signed with ${o.brand}: ${money(o.pay)}/yr for ${o.years} years.` }; }
export function drop(s, id) { const b = B(s), d = b.deals.find((x) => x.id === id); if (!d) return { ok: false, msg: 'No such deal.' }; b.deals = b.deals.filter((x) => x !== d); log(s, `I ended my deal with ${d.brand}.`, 'sport'); return { ok: true, msg: `Dropped ${d.brand}.` }; }
export function bestSwap(s) { const v = view(s), b = B(s); const cand = [...v.offers].sort((x, y) => y.pay - x.pay); for (const o of cand) { const same = b.deals.find((d) => d.cat === o.cat); if (same) { if (o.pay > same.pay) return { offer: o.id, swap: same.id }; continue; } if (b.deals.length < MAX_DEALS) return { offer: o.id }; const lo = [...b.deals].sort((x, y) => x.pay - y.pay)[0]; if (o.pay > lo.pay) return { offer: o.id, swap: lo.id }; } return null; }
export function yearTick(s) { if (!s.mt || !s.mt.brand) return; const b = s.mt.brand, a = age(s); let tot = 0; for (const d of b.deals) tot += d.pay; if (tot) earn(s, tot); const gone = b.deals.filter((d) => d.until <= a); b.deals = b.deals.filter((d) => d.until > a); for (const d of gone) log(s, `My deal with ${d.brand} ran out.`, 'sport'); }
