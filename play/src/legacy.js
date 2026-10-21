// Death, ending, tombstone/obituary, ribbons, estate (tax, will, auction), continue-as-child, family legacy, cemetery meta store.
import { fmtMoney } from './fmt.js';
import * as Prod from './prodco.js';
import * as Politics from './politics.js';
import * as Fr from './franchise.js';
import * as Rc from './racing.js';
import * as Brand from './brand.js';
import * as Farm from './farm.js';
import * as Adv from './advisor.js';
import { D } from './data.js';
import { rnd, rint, pick, chance, clamp } from './rng.js';
import { log, fill } from './core.js';
import * as P from './people.js';
import * as Market from './market.js';
import * as Ribbons from './ribbons.js';
import * as Obit from './obituary.js';
import * as Slice from './slice_bridge.js';
import * as Premium from './premium.js';
import * as PFx from './premium_fx.js';
import * as Passions from './passions.js';
import * as Character from './character.js';

const LF = () => D.life;
// ---------- meta store (cemetery: persists across lives; in-memory fallback in Node) ----------
const MKEY = 'lifesim.meta.v1'; let memMeta = null;
const blankMeta = () => ({ graves: [], ribbons: {}, lives: 0, bestNW: 0, longest: 0 });
export function metaGet() {
  try { if (typeof localStorage !== 'undefined') { const t = localStorage.getItem(MKEY); if (t) return JSON.parse(t); return blankMeta(); } } catch (e) { /* ignore */ }
  return memMeta || (memMeta = blankMeta());
}
function metaSet(m) { memMeta = m; try { if (typeof localStorage !== 'undefined') localStorage.setItem(MKEY, JSON.stringify(m)); } catch (e) { /* ignore */ } }
export const metaReset = () => { memMeta = null; try { if (typeof localStorage !== 'undefined') localStorage.removeItem(MKEY); } catch (e) { /* ignore */ } };
export function metaRecord(grave) {
  const m = metaGet(); m.graves.push(grave); if (m.graves.length > LF().meta.cemeteryMax) m.graves.shift();
  m.ribbons[grave.ribbon] = (m.ribbons[grave.ribbon] || 0) + 1; m.lives++; m.bestNW = Math.max(m.bestNW, grave.nw); m.longest = Math.max(m.longest, grave.age); metaSet(m);
}
// ---------- death ----------
export function netWorthOf(s) {
  const assets = s.assets.reduce((a, x) => a + x.value, 0), stocks = Market.portfolioValue(s), biz = s.biz.reduce((a, b) => a + b.valuation, 0) + Prod.value(s) + Fr.value(s) + Rc.value(s) + Brand.value(s) + Farm.value(s) + Adv.value(s);
  const sw = Slice.wealth(s); // careers/shopping slice: assets, investments, zoo minus loans
  return { cash: s.cash, assets: assets + sw, stocks, biz, debt: s.debt, total: s.cash + assets + sw + stocks + biz - s.debt };
}
export function die(s, kind, cause, causeId) {
  if (!s.alive) return; s.alive = false; const nw = netWorthOf(s), age = Math.floor(s.age);
  const titles = s.league.history.filter((h) => s.biz.some((b) => b.kind === 'sports' && h.champion === b.name)).length;
  const jobName = s.job ? D.careers.find((c) => c.id === s.job.id)?.levels[s.job.level][0] : null;
  const ending = { kind, cause, causeId: causeId || cause, age, netWorth: nw, edu: s.edu, job: jobName || 'none', biz: s.biz.map((b) => b.name), releases: s.biz.reduce((a, b) => a + b.released.length, 0), titles,
    score: Math.round(Math.max(0, nw.total) / 10000 + s.stats.happiness + s.biz.length * 50 + titles * 100) };
  const rb = Ribbons.pickRibbon(s, ending); ending.ribbon = { id: rb.id, name: rb.name, icon: rb.icon, desc: rb.desc };
  const born = s.birthYear, died = s.birthYear + age;
  ending.tombstone = { name: s.name, born, died, epitaph: pick(s, LF().death.epitaphs), cause };
  { const ob = Obit.write(s, ending); ending.obituary = ob.text; ending.headline = ob.headline; ending.topAward = ob.topAward; }
  s.ending = ending; ending.creatorUsed = !!s.creatorUsed; ending.heirs = heirsOf(s).map((h) => ({ id: h.id, name: h.name, rel: h.rel, age: Math.floor(h.age) }));
  const prev = s.legacy.gens.find((g) => g.gen === s.legacy.gen);
  if (!prev) s.legacy.gens.push({ gen: s.legacy.gen, name: s.name, born, died, age, nw: Math.round(nw.total), cause, kind, ribbon: rb.id, ribbonName: rb.name, creator: !!s.creatorUsed, job: ending.job, gender: s.gender, kids: s.people.filter((p) => p.rel === 'child').length });
  log(s, fill(pick(s, LF().journal.death), { age, cause }), 'life');
  metaRecord({ creator: !!s.creatorUsed, name: s.name, born, died, age, cause, ribbon: rb.id, nw: Math.round(nw.total), gen: s.legacy.gen, country: s.country });
}
export function surrender(s) { if (s.alive) die(s, 'surrender', 'surrender'); return true; }
function obituary(s, e) {
  const d = LF().death, kids = s.people.filter((p) => p.rel === 'child'), c = P.country(s);
  const kidsTxt = kids.length ? `They are survived by ${kids.filter((k) => k.alive).length} of ${kids.length} children.` : 'They had no children.';
  const t = d.obit[e.kind] || d.obit.disease;
  return fill(t, { name: s.name, age: e.age, cause: e.cause, surround: pick(s, d.surround), country: c.name, job: e.job !== 'none' ? `They worked as a ${e.job.toLowerCase()}.` : 'They never held a job worth mentioning.', kids: kidsTxt });
}
// ---------- estate ----------
// Eligible heirs: any living kin (child, spouse/partner, sibling, parent, other relatives). The will picks who; with no usable will the order is
// children, then spouse/partner, siblings, parents, other relatives. The game only ends when nobody eligible is left.
export const KIN = new Set(['child', 'spouse', 'partner', 'sibling', 'father', 'mother', 'grandparent', 'grandchild', 'uncle', 'aunt', 'cousin', 'niece', 'nephew', 'relative', 'stepchild', 'stepparent']);
const kinOf = (s) => s.people.filter((p) => p.alive && KIN.has(p.rel));
export function defaultHeirs(s) {
  const k = kinOf(s); for (const rels of [['child', 'stepchild'], ['spouse', 'partner'], ['sibling'], ['father', 'mother'], null]) { const g = rels ? k.filter((p) => rels.includes(p.rel)) : k; if (g.length) return g; } return [];
}
export function willShares(s) { const w = s.will || {}; return w.mode === 'shares' && w.shares ? w.shares : null; }
export function heirsOf(s) {
  const w = s.will || { mode: 'even' }, k = kinOf(s), sh = willShares(s);
  if (sh) { const g = k.filter((p) => (sh[p.id] || 0) > 0); if (g.length) return g; }
  if (w.mode === 'one') { const g = k.filter((p) => p.id === w.heir); if (g.length) return g; }
  return defaultHeirs(s);
}
// mode 'even' | 'one' (heirId) | 'shares' (shares: {personId: pct}, charity: {id, pct}); shares may include non-playable kin (their cut leaves the family as cash).
export function setWill(s, mode, heirId, shares, charity) { s.will = { mode: mode === 'one' ? 'one' : mode === 'shares' ? 'shares' : 'even', heir: mode === 'one' ? heirId : null, shares: mode === 'shares' ? shares || {} : null, charityId: charity ? charity.id : null, charityPct: charity ? charity.pct : 0 }; return s.will; }
// Pure plan: returns {gross, debt, tax, net, heirs:[{id,name,age,frac,assets,biz,stocks,cash,auctioned,total}], ...}. Does not mutate s.
export function computeEstate(s) {
  const E = LF().estate, nwv = netWorthOf(s), kids = heirsOf(s);
  const inv = Slice.inventory(s), invNet = inv.reduce((a, x) => a + x.value, 0), sliceRefs = new Set(inv.map((x) => x.a));
  let cash = s.cash + Math.max(0, Slice.wealth(s) - invNet) * E.auctionRate, debt = s.debt, liquidated = 0; // investments/zoo are sold; owned objects are NOT
  const assets = [...s.assets.map((a) => ({ ref: a, value: a.value })), ...inv.map((x) => ({ ref: x.a, value: x.value, slice: true }))], biz = s.biz.map((b) => ({ ref: b, value: b.valuation }));
  const stocks = Object.entries(s.hold).filter(([, h]) => h.sh > 0).map(([t, h]) => ({ tkr: t, sh: h.sh, price: s.market.stocks[t].p, value: h.sh * s.market.stocks[t].p }));
  // pay debts from cash; only if cash is short, auction the cheapest objects
  const sellAssets = (need) => { const sorted = [...assets].sort((x, y) => x.value - y.value); let sold = 0; while (sold < need && sorted.length) { const x = sorted.shift(); const v = x.value * E.auctionRate; cash += v; sold += v; liquidated += v; assets.splice(assets.indexOf(x), 1); } };
  { let need = debt; const c = Math.min(cash, need); cash -= c; need -= c; if (need > 0) { sellAssets(need); cash = Math.max(0, cash - need); } }
  const gross = nwv.total + debt;
  const estateVal = Math.max(0, cash + assets.reduce((a, x) => a + x.value, 0) + biz.reduce((a, x) => a + x.value, 0) + stocks.reduce((a, x) => a + x.value, 0));
  const tax = Premium.isUnlocked('tax_evasion') ? 0 : Math.max(0, estateVal - E.exempt) * E.rate;
  let taxLeft = tax; const pay = Math.min(cash, taxLeft); cash -= pay; taxLeft -= pay;
  while (taxLeft > 0 && stocks.length) { const x = stocks.shift(); const take = Math.min(x.value, taxLeft); taxLeft -= take; if (take < x.value) { const keep = (x.value - take) / x.price; stocks.unshift({ ...x, sh: Math.floor(keep), value: keep * x.price }); break; } }
  if (taxLeft > 0) { sellAssets(taxLeft); const p2 = Math.min(cash, taxLeft); cash -= p2; taxLeft -= p2; }
  const w = s.will || { mode: 'even' }, sh = willShares(s) && kids.some((k) => (willShares(s)[k.id] || 0) > 0) ? willShares(s) : null;
  const named = !sh && w.mode === 'one' && kids.length === 1 && kids[0].id === w.heir ? kids[0] : null;
  const heirs = kids.map((k) => ({ id: k.id, name: k.name, rel: k.rel, age: Math.floor(k.age), frac: sh ? sh[k.id] / 100 : 1 / kids.length, assets: [], biz: [], stocks: {}, cash: 0, auctioned: 0, trust: false, total: 0 }));
  const net = cash + assets.reduce((a, x) => a + x.value, 0) + biz.reduce((a, x) => a + x.value, 0) + stocks.reduce((a, x) => a + x.value, 0);
  if (heirs.length) {
    const items = [...assets.map((x) => ({ k: 'a', x, v: x.value })), ...biz.map((x) => ({ k: 'b', x, v: x.value }))].sort((a, b) => b.v - a.v);
    for (const it of items) { const h = heirs.reduce((m, y) => (y.total / y.frac < m.total / m.frac ? y : m), heirs[0]); (it.k === 'a' ? h.assets : h.biz).push(it.x.ref); h.total += it.v; }
    for (const st of stocks) { heirs.forEach((h) => { const n = Math.floor(st.sh * h.frac); if (n) { h.stocks[st.tkr] = n; h.total += n * st.price; } }); }
    for (const h of heirs) { h.cash = Math.max(0, Math.round(net * h.frac - h.total)); h.total += h.cash; }
    for (const h of heirs) h.trust = h.age < E.minOwnerAge && (h.biz.length > 0 || h.assets.length > 0); // minors keep everything, held in trust until 18
  }
  const shareSum = heirs.reduce((a, h) => a + h.frac, 0), outside = sh ? Math.round(net * Math.max(0, 1 - shareSum)) : 0;
  return { gross, debt, outside, charity: sh && w.charityPct ? Math.round(net * w.charityPct / 100) : 0, charityId: w.charityId || null, tax: Math.round(tax), net: Math.round(net), estateVal: Math.round(estateVal), heirs, sliceRefs, exempt: E.exempt, rate: E.rate, mode: sh ? 'shares' : named ? 'one' : 'even', lostToTax: Math.round(tax) };
}
export function estateSummary(s) { const p = computeEstate(s); return { ...p, heirs: p.heirs.map((h) => ({ id: h.id, name: h.name, age: h.age, frac: h.frac, cash: Math.round(h.cash), assets: h.assets.map((a) => a.name), biz: h.biz.map((b) => b.name), auctioned: Math.round(h.auctioned), rel: h.rel, stocks: Object.keys(h.stocks).length, trust: h.trust, total: Math.round(h.total) })) }; }
function dropBiz(s, b) { // clean handoff of a business that leaves the family: team/market listing released
  if (b.kind === 'sports' && s.league.teams[b.teamIdx]) s.league.my = -1;
  if (b.tkr) s.market.cos = s.market.cos.filter((c) => c.bizId !== b.id);
  s.biz = s.biz.filter((x) => x !== b);
}
export function gameOverSummary(s) { return legacySummary(s); }
export function legacySummary(s) {
  const gens = [...s.legacy.gens]; const cur = s.alive ? { gen: s.legacy.gen, name: s.name, born: s.birthYear, age: Math.floor(s.age), nw: Math.round(netWorthOf(s).total), cause: null, ribbonName: null, current: true, job: s.job ? 'working' : '' } : null;
  const all = cur ? [...gens, cur] : gens;
  const years = all.reduce((a, g) => a + g.age, 0), wealth = all.reduce((a, g) => a + Math.max(0, g.nw), 0);
  return { generations: all.length, years, wealth, best: all.reduce((m, g) => (g.nw > (m?.nw ?? -Infinity) ? g : m), null), gens: all, creatorUsed: all.some((g) => g.creator) || !!s.creatorUsed, rankingEligible: !(all.some((g) => g.creator) || s.creatorUsed || s.creatorLineage), lastName: s.last, over: !s.alive && heirsOf(s).length === 0 };
}
export function canContinue(s) { return !s.alive && s.ending && heirsOf(s).length > 0; }
// Relation of each surviving person to the new player, given who the heir was.
const REMAP = {
  child: {},
  spouse: { mother: 'relative', father: 'relative', sibling: 'relative', ex: null },
  partner: { mother: 'relative', father: 'relative', sibling: 'relative', ex: null },
  sibling: { child: 'relative', spouse: 'relative', partner: 'relative', ex: null },
  mother: { father: 'spouse', sibling: 'child', child: 'relative', spouse: 'spouse', partner: 'spouse', ex: null },
  father: { mother: 'spouse', sibling: 'child', child: 'relative', spouse: 'spouse', partner: 'spouse', ex: null },
};
const lateRel = (heir, gender) => ({ child: gender === 'm' ? 'father' : 'mother', spouse: 'spouse', partner: 'partner', sibling: 'sibling', mother: 'child', father: 'child' }[heir.rel] || 'relative');
// Continue as any heir (child, spouse, sibling, parent, relative): estate settled per will; owned objects, businesses, teams, stocks and cash pass on.
export function continueAs(s, heirId) {
  if (!canContinue(s)) return false;
  const oldRoyal = s.royal ? { royal: JSON.parse(JSON.stringify(s.royal)), name: s.name } : null;
  const kid = P.byId(s, heirId); if (!kid || !kid.alive || !heirsOf(s).some((h) => h.id === heirId)) return false;
  const plan = computeEstate(s), mine = plan.heirs.find((h) => h.id === heirId) || { assets: [], biz: [], stocks: {}, cash: 0, trust: false };
  const heirLook = JSON.parse(JSON.stringify(Character.lookOf(s, kid)));
  const old = { name: s.name, gender: s.gender, people: s.people, biz: s.biz, last: s.last, year: s.birthYear + Math.floor(s.age), gen: s.legacy.gen, passions: s.passions };
  const sliceMine = mine.assets.filter((a) => plan.sliceRefs.has(a)), objMine = mine.assets.filter((a) => !plan.sliceRefs.has(a));
  // businesses and teams that are not mine pass to the other heirs (leave this save); mine stay, in trust under the owner age
  for (const b of [...s.biz]) if (!mine.biz.includes(b)) dropBiz(s, b);
  const age = Math.floor(kid.age); for (const b of s.biz) { b.trust = age < LF().estate.minOwnerAge; b.inherited = (b.inherited || 0) + 1; }
  const ppl = [];
  const me = { rel: lateRel(kid, old.gender), first: old.name.split(' ')[0], last: old.last, name: old.name, gender: old.gender, age: Math.floor(s.age), alive: false, bar: 70, health: 0, occ: s.ending.job, edu: s.edu, city: s.city, country: s.country, cash: 0, kids: 0, id: s.nextId++, diedAt: s.age };
  ppl.push(me);
  if (kid.rel === 'child') { const other = old.people.find((p) => p.id === kid.otherParent); if (other && other.alive && ['spouse', 'ex', 'partner'].includes(other.rel)) ppl.push({ ...other, rel: other.gender === 'm' ? 'father' : 'mother', bar: Math.max(40, other.bar) }); }
  const rm = REMAP[kid.rel] || {};
  for (const k of old.people) {
    if (k.id === kid.id || !k.alive) continue;
    if (kid.rel === 'child') { if (k.rel === 'child') ppl.push({ ...k, rel: 'sibling', cash: k.cash + Math.round(plan.heirs.find((h) => h.id === k.id)?.cash || 0) }); continue; }
    const nr = k.rel in rm ? rm[k.rel] : k.rel; if (nr === null || !(KIN.has(nr))) continue; ppl.push({ ...k, rel: nr, cash: (k.cash || 0) + Math.round(plan.heirs.find((h) => h.id === k.id)?.cash || 0) });
  }
  s.people = ppl;
  s.gender = kid.gender; s.name = kid.name; s.first = kid.first; s.last = kid.last; s.age = age; s.birthYear = old.year - age; s.legacy.gen = old.gen + 1;
  s.cash = Math.round(mine.cash); s.debt = 0; s.assets = objMine; s.hold = {}; for (const [t, n] of Object.entries(mine.stocks)) { const cost = (s.market.stocks[t].p) * n; s.hold[t] = { sh: n, cost }; }
  s.edu = age >= 18 ? Math.max(1, kid.edu || 1) : 0; s.school = age >= 18 ? null : age >= 12 ? 'high' : 'primary'; s.college = null; s.job = null; s.retired = age >= 65; s.postgrad = false;
  const wear = Math.max(0, age - 50);
  s.stats = { health: clamp(rint(s, 70, 95) - wear * 0.8, 20, 100), happiness: clamp(rint(s, 45, 85) - LF().legacy.continueStartHappyHit, 0, 100), smarts: clamp(Math.round(55 + (rnd(s) - 0.5) * 50), 5, 95), looks: clamp(rint(s, 25, 80) - wear * 0.3, 5, 100), fame: 0, karma: 50, crazy: rint(s, 0, 25), stress: rint(s, 10, 30) };
  s.sl = null; s.diseases = []; const hofFam = s.flags && (s.flags.hof_family || s.flags.hof_heir); s.flags = hofFam ? { hof_heir: 1 } : {}; s.chain = []; s.evLast = {}; s.acted = {}; s.pending = []; s.fx = []; s.cand = []; s.prison = null; s.record = { sentences: 0, priors: 0 }; s.sport = null; s.carry = null; s.carryNotes = []; s.pro = null; s.will = { mode: 'even', heir: null }; s.fit = 0;
  if (hofFam && s.stats) s.stats.fame = Math.min(100, (s.stats.fame || 0) + 5); // Hall of Fame family name
  s.creatorLineage = !!(s.creatorLineage || s.creatorUsed); s.creatorUsed = false; s.creatorEdits = 0;
  const royalRes = Politics.passOn(s, oldRoyal, kid); // office/campaign/war end; royalty continues through a child
  s.tally = Ribbons.newTally(); s.alive = true; s.lastEnding = s.ending; s.ending = null; s.yr = [];
  if (sliceMine.length) Slice.grant(s, sliceMine); // after the reset: the actual objects (tpl, art, vseed, condition) move to the heir
  s.char = heirLook; s.char.parts.hat = null;
  s.passions = undefined; s.skills = undefined; if (kid.rel === 'child') Passions.inherit(s, { passions: old.passions });
  s.history = [[Math.round(s.age * 4) / 4, Math.round(netWorthOf(s).total)]];
  s.city = kid.city || s.city;
  const bits = [`${fmtMoney(Math.round(s.cash))}`]; const nObj = objMine.length + sliceMine.length; if (nObj) bits.push(`${nObj} owned item${nObj > 1 ? 's' : ''}`); if (s.biz.length) bits.push(s.biz.map((b) => b.name).join(', '));
  log(s, `Generation ${s.legacy.gen}: I became ${s.name}, ${age} years old, ${kid.rel === 'child' ? 'child' : 'the ' + kid.rel} of ${old.name}. I inherited ${bits.join(', ')}.`, 'life');
  if (plan.tax > 0) log(s, `Estate tax took ${fmtMoney(plan.tax)}.`, 'life');
  PFx.applyStart(s);
  if (royalRes.lost) log(s, `The line of ${royalRes.house} ends with my parent's generation: I am not in the succession.`, 'life');
  s.estateLast = { tax: plan.tax, mode: plan.mode, heirRel: kid.rel, items: nObj, biz: s.biz.length, trust: !!mine.trust };
  return true;
}
