// Production companies: a record label, film studio, TV studio and game studio you can own (one per medium).
// (a) back OTHER companies' projects for a revenue cut (pitches, flops, royalty income over years), and/or
// (b) run your own company: sign artists (music), hire crew, greenlight projects. With the default policy a company produces by itself every year.
// Reuses src/studio.js genres/themes/trend curves and fame tiers (market trends). State: s.prod. Data: data/prodco.json.
import { D } from './data.js';
import { rnd, rint, pick, chance, clamp, gauss } from './rng.js';
import { log, earn } from './core.js';
import * as Studio from './studio.js';
import * as Ev from './events.js';

const C = () => D.prodco;
export const MEDIA = ['music', 'film', 'tv', 'game'];
const age = (s) => Math.floor(s.age);
const R = (n) => Math.round(n);
export const ensure = (s) => { if (!s.prod) s.prod = { cos: {}, pitches: {}, stakes: [], scandal: null, year: -1, log: [] }; return s.prod; };
const med = (m) => C().media[m];
export const tierDef = (id) => C().tiers.find((t) => t.id === id) || C().tiers[0];
export const budgetOf = (m, tierId) => med(m).tiers[C().tiers.findIndex((t) => t.id === tierId)] || med(m).tiers[0];
// owner backstop: the company draws from your cash (never below your floor) when it is short, so it keeps producing without manual top-ups
function topUp(s, co, needed) { if (co.cash >= needed || !co.policy.backstop) return; const draw = Math.min(needed - co.cash, Math.max(0, s.cash - co.policy.ownerFloor)); if (draw > 0) { s.cash -= draw; co.cash += draw; co.owed = (co.owed || 0) + draw; } }
const wageOf = (skill) => R(C().crewWage.base + skill * C().crewWage.perSkill);

// ---------- market trends (reuse Studio's heat curves; music genres get the same shaped curve) ----------
const hash = (str) => { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return ((h >>> 0) % 10000) / 10000; };
export function genresOf(m) { const d = med(m); return d.genres || D.studio.genres.map((g) => ({ id: g.id, name: g.name, icon: g.icon })); }
export function heat(s, m, genre) {
  const turn = Math.round(s.age * 12);
  if (med(m).genreSource === 'studio') return Studio.heatAt('genres', genre, turn);
  const yrs = turn / 12, ph = hash('m' + genre) * 9, base = 40 + hash('b' + genre) * 30;
  return clamp(base + 18 * (Math.sin((2 * Math.PI / 9) * (yrs + ph)) - Math.sin((2 * Math.PI / 9) * ph)) + (hash('j' + genre + turn) - 0.5) * 6, 0, 100);
}
export function trends(s, m) { return genresOf(m).map((g) => { const h = heat(s, m, g.id), y = (med(m).genreSource === 'studio' ? Studio.heatAt('genres', g.id, Math.round(s.age * 12) + 12) : heat({ age: s.age + 1 }, m, g.id)); return { id: g.id, name: g.name, icon: g.icon, heat: R(h), state: h >= 60 ? 'hot' : h <= 40 ? 'cold' : 'warm', perYear: R(y - h) }; }).sort((a, b) => b.heat - a.heat); }
const bestGenre = (s, m) => trends(s, m)[0].id;

// ---------- naming / people ----------
const nameTitle = (s) => { const n = D.studio.nameGen; return pick(s, [`${pick(s, n.adjectives)} ${pick(s, n.nouns)}`, `The ${pick(s, n.adjectives)} ${pick(s, n.nouns)}`, `${pick(s, n.nouns)} of ${pick(s, n.nouns)}`]); };
const personName = (s) => pick(s, C().firsts) + ' ' + pick(s, C().lasts);
export function genCandidate(s, co, roleId) { const sk = clamp(R(25 + co.rep * 0.4 + gauss(s) * 16 + (co.fame || 0) * 0.15), 5, 95); return { id: 'c' + Math.floor(rnd(s) * 1e9), name: personName(s), role: roleId, skill: sk, wage: wageOf(sk) }; }
export function genArtist(s, co) { const talent = clamp(R(35 + co.rep * 0.3 + gauss(s) * 17), 10, 98), pot = clamp(talent + rint(s, 0, 20), 10, 99); return { id: 'a' + Math.floor(rnd(s) * 1e9), name: chance(s, 0.5) ? personName(s) : pick(s, C().artistWords) + ' ' + pick(s, C().artistWords), genre: pick(s, genresOf('music')).id, talent, pot, fame: rint(s, 0, 15), wild: +(rnd(s) ** 1.5).toFixed(2), age: rint(s, 18, 30), contract: 0, busy: 0, albums: 0 }; }
const signCost = (a) => R(a.talent * a.talent * 12 + 8000);
const advanceOf = (a) => R(8000 + a.talent * 300 + a.fame * 400);

// ---------- company ----------
export function mkCo(s, m) {
  const co = { id: 'pc_' + m, medium: m, name: '', founded: age(s), cash: 0, rep: 15, fame: 0, crew: [], roster: [], slate: [], released: [], tail: [], hist: [], market: { crew: [], artists: [] }, policy: { auto: true, slots: 1, tier: 'small', genre: 'trend', payout: true, reserve: 60000, backstop: true, ownerFloor: 25000 }, totals: { revenue: 0, spent: 0, hits: 0, flops: 0, releases: 0 }, lastYear: null };
  for (const r of med(m).roles) { const c = genCandidate(s, co, r.id); c.skill = clamp(c.skill - 8, 5, 60); c.wage = wageOf(c.skill); co.crew.push(c); }
  refreshMarket(s, co); return co;
}
export function refreshMarket(s, co) { const m = co.medium; co.market = { crew: [], artists: [] }; for (const r of med(m).roles) for (let i = 0; i < 2; i++) co.market.crew.push(genCandidate(s, co, r.id)); if (m === 'music') for (let i = 0; i < 4; i++) co.market.artists.push(genArtist(s, co)); }
export const crewQuality = (co) => co.crew.length ? co.crew.reduce((a, c) => a + c.skill, 0) / Math.max(co.crew.length, 3) * (co.crew.length >= med(co.medium).roles.length ? 1 : co.crew.length / med(co.medium).roles.length) : 0;
export const maxSlots = (co) => clamp(1 + Math.floor(co.crew.length / 3) + Math.floor(co.rep / 45), 1, 5);
const payroll = (co) => co.crew.reduce((a, c) => a + c.wage, 0) + co.roster.reduce((a, x) => a + advanceOf(x), 0) + C().overhead;
const valueOf = (co) => Math.max(0, R(co.cash + (co.totals.revenue > 0 ? Math.max(0, (co.lastYear ? co.lastYear.profit : 0)) * 3 : 0) + co.rep * 5000 + co.fame * 8000));
export const value = (s) => (s.prod ? Object.values(s.prod.cos).reduce((a, c) => a + valueOf(c), 0) : 0);

export function found(s, m, name) {
  const P = ensure(s), d = med(m); if (!d) return { ok: false, msg: 'Unknown medium.' }; if (age(s) < 18) return { ok: false, msg: 'You must be 18+.' }; if (P.cos[m]) return { ok: false, msg: `You already own a ${d.name.toLowerCase()}.` };
  if (s.cash < d.found) return { ok: false, msg: `Needs $${d.found.toLocaleString('en-US')} to found.` };
  s.cash -= d.found; const co = mkCo(s, m); co.name = (name && String(name).trim().slice(0, 28)) || `${pick(s, C().studios)} ${d.word}`; co.cash = R(d.found * 0.7); P.cos[m] = co; log(s, `I founded ${co.name}, a ${d.name.toLowerCase()}.`, 'biz'); return { ok: true, msg: `${co.name} is open for business.`, co };
}
const need = (s, m) => { const co = s.prod && s.prod.cos[m]; return co || null; };
export function fundCo(s, m, amt) { const co = need(s, m); if (!co) return { ok: false, msg: 'No company.' }; amt = Math.floor(amt); if (!(amt > 0) || amt > s.cash) return { ok: false, msg: 'Not enough cash.' }; s.cash -= amt; co.cash += amt; return { ok: true, msg: `Moved $${amt.toLocaleString('en-US')} into ${co.name}.` }; }
export function withdraw(s, m, amt) { const co = need(s, m); if (!co) return { ok: false, msg: 'No company.' }; amt = Math.floor(amt); if (!(amt > 0) || amt > co.cash) return { ok: false, msg: 'The company does not have that.' }; co.cash -= amt; earn(s, amt); return { ok: true, msg: `Took $${amt.toLocaleString('en-US')} out of ${co.name}.` }; }
export function sellCo(s, m) { const co = need(s, m); if (!co) return { ok: false, msg: 'No company.' }; const v = valueOf(co); earn(s, v); delete s.prod.cos[m]; log(s, `I sold ${co.name} for $${v.toLocaleString('en-US')}.`, 'biz'); return { ok: true, msg: `Sold for $${v.toLocaleString('en-US')}.` }; }
export function hire(s, m, id) { const co = need(s, m); if (!co) return { ok: false, msg: 'No company.' }; const i = co.market.crew.findIndex((c) => c.id === id); if (i < 0) return { ok: false, msg: 'Candidate left.' }; if (co.crew.length >= 8) return { ok: false, msg: 'Crew is full (8).' }; const c = co.market.crew[i], fee = R(c.wage * C().crewWage.signFrac); if (co.cash < fee) return { ok: false, msg: 'Company cash is too low for the signing fee.' }; co.cash -= fee; co.market.crew.splice(i, 1); co.crew.push(c); return { ok: true, msg: `Hired ${c.name} (skill ${c.skill}).` }; }
export function fire(s, m, id) { const co = need(s, m); if (!co) return { ok: false, msg: 'No company.' }; const i = co.crew.findIndex((c) => c.id === id); if (i < 0) return { ok: false, msg: 'No such crew member.' }; if (co.crew.length <= 2) return { ok: false, msg: 'Keep at least 2 crew.' }; const c = co.crew.splice(i, 1)[0]; return { ok: true, msg: `${c.name} left.` }; }
export function train(s, m, id) { const co = need(s, m); if (!co) return { ok: false, msg: 'No company.' }; const c = co.crew.find((x) => x.id === id); if (!c) return { ok: false, msg: 'No such crew member.' }; if (c.trained === age(s)) return { ok: false, msg: 'Already trained this year.' }; const cost = R(5000 + c.skill * 400); if (co.cash < cost) return { ok: false, msg: 'Company cash is too low.' }; co.cash -= cost; c.trained = age(s); c.skill = clamp(c.skill + rint(s, 3, 6), 5, 98); c.wage = wageOf(c.skill); return { ok: true, msg: `${c.name} trained: skill ${c.skill}.` }; }
export function sign(s, m, id) { const co = need(s, m); if (!co || m !== 'music') return { ok: false, msg: 'Only a record label signs artists.' }; const i = co.market.artists.findIndex((a) => a.id === id); if (i < 0) return { ok: false, msg: 'Artist signed elsewhere.' }; if (co.roster.length >= 6) return { ok: false, msg: 'Roster is full (6).' }; const a = co.market.artists[i], cost = signCost(a); if (co.cash < cost) return { ok: false, msg: `Needs $${cost.toLocaleString('en-US')} in company cash.` }; co.cash -= cost; co.market.artists.splice(i, 1); a.contract = 3; co.roster.push(a); return { ok: true, msg: `Signed ${a.name} for 3 years.` }; }
export function drop(s, m, id) { const co = need(s, m); if (!co) return { ok: false, msg: 'No company.' }; const i = co.roster.findIndex((a) => a.id === id); if (i < 0) return { ok: false, msg: 'No such artist.' }; if (co.roster[i].busy) return { ok: false, msg: 'Finish their album first.' }; const a = co.roster.splice(i, 1)[0]; return { ok: true, msg: `Dropped ${a.name}.` }; }
export function setPolicy(s, m, patch = {}) { const co = need(s, m); if (!co) return { ok: false, msg: 'No company.' }; const p = co.policy; if (patch.auto != null) p.auto = !!patch.auto; if (patch.slots != null) p.slots = clamp(Math.floor(patch.slots), 1, 5); if (patch.tier && C().tiers.some((t) => t.id === patch.tier)) p.tier = patch.tier; if (patch.genre && (patch.genre === 'trend' || genresOf(m).some((g) => g.id === patch.genre))) p.genre = patch.genre; if (patch.payout != null) p.payout = !!patch.payout; if (patch.backstop != null) p.backstop = !!patch.backstop; if (patch.ownerFloor != null) p.ownerFloor = clamp(Math.floor(patch.ownerFloor), 0, 1e9); if (patch.reserve != null) p.reserve = clamp(Math.floor(patch.reserve), 0, 1e8); return { ok: true, msg: 'Policy saved.' }; }

// ---------- greenlight (manual and policy use this same function) ----------
export function greenlight(s, m, o = {}) {
  const co = need(s, m); if (!co) return { ok: false, msg: 'No company.' }; const p = co.policy;
  if (co.slate.length >= Math.min(p.slots, maxSlots(co)) && !o.force) return { ok: false, msg: `Slate is full (${co.slate.length}/${Math.min(p.slots, maxSlots(co))}).` };
  if (co.slate.length >= maxSlots(co)) return { ok: false, msg: 'No free production slot. Hire more crew or build reputation.' };
  const tid = o.tier || p.tier, t = tierDef(tid); if (co.rep < t.repNeed) return { ok: false, msg: `${t.label} needs company reputation ${t.repNeed}.` };
  const genre = o.genre && o.genre !== 'trend' ? o.genre : (p.genre === 'trend' || !p.genre ? bestGenre(s, m) : p.genre); if (!genresOf(m).some((g) => g.id === genre)) return { ok: false, msg: 'Unknown genre.' };
  const cost = budgetOf(m, tid); topUp(s, co, cost); if (co.cash < cost) return { ok: false, msg: `Needs $${cost.toLocaleString('en-US')} in company cash (has $${R(co.cash).toLocaleString('en-US')}).` };
  let artist = null;
  if (m === 'music') { artist = o.artistId ? co.roster.find((a) => a.id === o.artistId) : co.roster.filter((a) => !a.busy).sort((a, b) => (b.talent + b.fame * 0.5) - (a.talent + a.fame * 0.5))[0]; if (!artist) return { ok: false, msg: 'Sign an available artist first.' }; if (artist.busy) return { ok: false, msg: `${artist.name} is already recording.` }; artist.busy = 1; }
  co.cash -= cost; co.totals.spent += cost; const title = o.title || (m === 'music' ? `${nameTitle(s)}` : nameTitle(s));
  const pr = { id: 'p' + Math.floor(rnd(s) * 1e9), title, genre, tier: tid, cost, artistId: artist ? artist.id : null, artistName: artist ? artist.name : null, left: med(m).years, started: age(s), troubled: chance(s, t.risk * 0.5) };
  co.slate.push(pr); log(s, `${co.name} greenlit "${title}" (${m === 'music' ? 'album by ' + artist.name : tid}, $${cost.toLocaleString('en-US')}).`, 'biz'); return { ok: true, msg: `Greenlit "${title}".`, project: pr };
}
const labelOf = (score) => { let l = C().labels[0][1]; for (const [min, name] of C().labels) if (score >= min) l = name; return l; };
export function score(s, co, pr, noise = true) {
  const t = tierDef(pr.tier), a = pr.artistId ? co.roster.find((x) => x.id === pr.artistId) : null, h = heat(s, co.medium, pr.genre);
  const sc = 3.6 + crewQuality(co) / 100 * 2.6 + t.bonus + h / 100 * 1.5 + co.rep / 100 * 0.9 + (a ? a.talent / 100 * 1.6 : 0) + (a ? 0 : 0.8) - (pr.troubled ? 1 : 0) + (noise ? gauss(s) * 1.1 : 0);
  return clamp(+sc.toFixed(1), 0, 10);
}
function releaseOne(s, co, pr) {
  const t = tierDef(pr.tier), a = pr.artistId ? co.roster.find((x) => x.id === pr.artistId) : null, sc = score(s, co, pr), mult = t.mean * Math.exp((sc - 6) * 0.42) * (a ? 1 + a.fame / 120 : 1), revenue = R(pr.cost * mult), now = R(revenue * 0.6), tail = revenue - now;
  co.cash += now; if (tail > 0) co.tail.push({ left: 3, per: R(tail / 3), title: pr.title });
  const label = labelOf(sc), profit = revenue - pr.cost; co.totals.revenue += revenue; co.totals.releases++; if (sc >= 7.5) co.totals.hits++; if (sc < 4.5) co.totals.flops++;
  const dRep = (sc - 6) * 2.5, dFame = sc >= 7.5 ? 3 + (sc - 7.5) * 3 : sc < 4.5 ? -2 : 0.5; co.rep = clamp(co.rep + dRep, 0, 100); co.fame = clamp(co.fame + dFame, 0, 100);
  if (a) { a.busy = 0; a.albums++; a.fame = clamp(a.fame + (sc >= 7.5 ? 12 : sc >= 6 ? 4 : -2), 0, 100); a.talent = clamp(a.talent + (a.talent < a.pot ? 2 : 0), 1, 99); }
  s.stats.fame = clamp(s.stats.fame + (sc >= 9 ? 4 : sc >= 7.5 ? 2 : 0), 0, 100);
  const rel = { id: 'r' + Math.floor(rnd(s) * 1e9), title: pr.title, genre: pr.genre, tier: pr.tier, artist: pr.artistName, score: sc, label, revenue, cost: pr.cost, profit, year: age(s) };
  co.released.push(rel); if (co.released.length > 14) co.released.shift();
  log(s, `${co.name} released "${pr.title}"${a ? ' by ' + a.name : ''}: ${label} (${sc}/10), revenue $${revenue.toLocaleString('en-US')} on a $${pr.cost.toLocaleString('en-US')} budget.`, 'biz');
  if (sc >= 9) (s.market && s.market.news || []).push({ age: s.age, text: `${pr.title} from ${co.name} is a runaway ${med(co.medium).unit} hit!` });
  return rel;
}

// ---------- backing other companies (revenue cut) ----------
export function genPitches(s0, m) { // uses a local RNG derived from the game seed so reading the market never moves the game's random stream
  const s = { rs: (s0.rs ^ Math.imul(Math.floor(s0.age) + 1, 2654435761) ^ Math.floor(hash(m) * 1e9)) | 0 }, P = ensure(s0), rep = P.cos[m] ? P.cos[m].rep : 10, out = [];
  for (let i = 0; i < 5; i++) { const tIdx = clamp(Math.floor(rnd(s) * 3 + (rep > 40 ? 1 : 0)), 0, 3), t = C().tiers[tIdx], ask = budgetOf(m, t.id), buzz = clamp(+(3.2 + rnd(s) * 4.5 + rep / 60).toFixed(1), 1, 10), genre = pick(s, genresOf(m)).id;
    out.push({ id: 'pi' + Math.floor(rnd(s) * 1e9), studio: pick(s, C().studios) + ' ' + med(m).word, title: nameTitle(s), genre, tier: t.id, ask, buzz, cut: +(0.5 + rnd(s) * 0.28).toFixed(2), years: rint(s, 1, 3), risk: +(t.risk + (7 - buzz) * 0.02).toFixed(2) }); }
  return out;
}
export function pitchesOf(s, m) { const P = s.prod || ensure(s); if (!P.pitches[m]) P.pitches[m] = genPitches(s, m); return P.pitches[m]; }
export function invest(s, m, pitchId, amt) {
  const P = ensure(s), list = pitchesOf(s, m), i = list.findIndex((x) => x.id === pitchId); if (i < 0) return { ok: false, msg: 'That pitch is gone.' }; if (age(s) < 18) return { ok: false, msg: 'You must be 18+.' };
  const pi = list[i]; amt = Math.floor(Number(amt) || 0); const min = Math.round(pi.ask * 0.1); if (amt < min) return { ok: false, msg: `Minimum investment is $${min.toLocaleString('en-US')}.` }; amt = Math.min(amt, pi.ask); if (amt > s.cash) return { ok: false, msg: 'Not enough cash.' };
  s.cash -= amt; list.splice(i, 1); const share = +(pi.cut * amt / pi.ask).toFixed(4);
  P.stakes.push({ id: 's' + Math.floor(rnd(s) * 1e9), medium: m, title: pi.title, studio: pi.studio, genre: pi.genre, tier: pi.tier, ask: pi.ask, invested: amt, share, buzz: pi.buzz, left: pi.years, risk: pi.risk, status: 'development', income: 0, result: null, payments: [] });
  log(s, `I backed "${pi.title}" from ${pi.studio} with $${amt.toLocaleString('en-US')} for a ${Math.round(share * 100)}% revenue cut.`, 'biz'); return { ok: true, msg: `Backed "${pi.title}": ${Math.round(share * 100)}% of its revenue is yours.` };
}
function resolveStake(s, st) {
  const t = tierDef(st.tier), h = heat(s, st.medium, st.genre), flop = chance(s, clamp(st.risk, 0.05, 0.6)), sc = clamp(+(3.3 + st.buzz * 0.42 + t.bonus + h / 100 * 1.4 + gauss(s) * 1.0 - (flop ? 2.2 : 0)).toFixed(1), 0, 10);
  const revenue = R(st.ask * t.mean * Math.exp((sc - 6) * 0.42)); st.result = { score: sc, label: labelOf(sc), revenue, year: age(s) }; st.status = 'paying'; st.payLeft = 3; st.pool = R(revenue * st.share);
  log(s, `"${st.title}" (backed by me) was released: ${st.result.label} (${sc}/10). My ${Math.round(st.share * 100)}% cut: $${st.pool.toLocaleString('en-US')} over 3 years.`, 'biz'); if (sc < 4.5) st.status = 'paying';
}
// ---------- yearly ----------
export function yearTick(s) {
  const P = s.prod; if (!P) return; const y = age(s); if (P.year === y) return; P.year = y;
  // stakes: develop, release, pay royalties
  for (const st of P.stakes) { if (st.status === 'development') { st.left--; if (st.left <= 0) resolveStake(s, st); } else if (st.status === 'paying' && st.payLeft > 0) { const w = [0.5, 0.3, 0.2][3 - st.payLeft], pay = R(st.pool * w); st.payLeft--; st.income += pay; earn(s, pay); st.payments.push({ year: y, amount: pay }); if (st.payLeft <= 0) { st.status = 'done'; st.net = st.income - st.invested; log(s, `"${st.title}" royalties finished: $${st.income.toLocaleString('en-US')} on $${st.invested.toLocaleString('en-US')} invested (${st.net >= 0 ? '+' : '-'}$${Math.abs(st.net).toLocaleString('en-US')}).`, 'biz'); } } }
  P.stakes = P.stakes.filter((st) => st.status !== 'done' || y - (st.result ? st.result.year : y) < 6);
  for (const m of MEDIA) P.pitches[m] = genPitches(s, m);
  for (const co of Object.values(P.cos)) coYear(s, co);
}
function coYear(s, co) {
  const y = age(s), m = co.medium, f = { revenue: 0, wages: 0, budgets: 0, releases: [], notes: [] }, startCash = co.cash;
  // tail income + releases
  for (const t of co.tail) { co.cash += t.per; t.left--; f.revenue += t.per; } co.tail = co.tail.filter((t) => t.left > 0);
  for (const pr of co.slate.slice()) { pr.left--; if (pr.left <= 0) { const rel = releaseOne(s, co, pr); f.releases.push(rel); f.revenue += R(rel.revenue * 0.6); co.slate.splice(co.slate.indexOf(pr), 1); } }
  // payroll (owner covers a shortfall, otherwise the lowest paid crew walk)
  const pay = payroll(co); f.wages = pay; topUp(s, co, pay); co.cash -= pay;
  if (co.cash < 0) { const gap = -co.cash; if (co.policy.backstop && s.cash >= gap) { s.cash -= gap; co.cash = 0; f.notes.push(`You covered a $${gap.toLocaleString('en-US')} payroll gap.`); log(s, `I covered a $${gap.toLocaleString('en-US')} payroll gap at ${co.name}.`, 'biz'); } else { co.cash = 0; co.rep = clamp(co.rep - 6, 0, 100); if (co.crew.length > 2) co.crew.sort((a, b) => a.wage - b.wage).shift(); f.notes.push('Payroll was missed: reputation fell and crew left.'); } }
  for (const a of co.roster) { a.age++; if (!a.busy) a.contract--; }
  const left = co.roster.filter((a) => a.contract <= 0 && !a.busy); for (const a of left) { f.notes.push(`${a.name}'s contract ended.`); co.roster.splice(co.roster.indexOf(a), 1); }
  // scandals
  const risky = m === 'music' ? co.roster.filter((a) => chance(s, a.wild * 0.1 + 0.01))[0] : (chance(s, 0.03) ? co.crew[Math.floor(rnd(s) * co.crew.length)] : null);
  if (risky && !s.prod.scandal) { s.prod.scandal = { medium: m, id: risky.id, name: risky.name, what: pick(s, C().scandals), year: y }; Ev.queue(s, 'prod_scandal', { name: risky.name, company: co.name, what: s.prod.scandal.what }); f.notes.push(`${risky.name} ${s.prod.scandal.what}.`); }
  // auto production by policy (same greenlight function as manual)
  if (co.policy.auto && m === 'music' && !co.roster.some((x) => !x.busy) && co.roster.length < 6) { const pick1 = co.market.artists.slice().sort((x, y) => (y.talent + y.pot) - (x.talent + x.pot))[0]; if (pick1) { topUp(s, co, signCost(pick1) + 40000); const r = sign(s, m, pick1.id); if (r.ok) f.notes.push('Auto: ' + r.msg); } }
  if (co.policy.auto) { let guard = 0; while (guard++ < 5 && co.slate.length < Math.min(co.policy.slots, maxSlots(co))) { const r = greenlight(s, m, {}); if (!r.ok) { f.notes.push('Auto: ' + r.msg); break; } f.budgets += r.project.cost; } }
  for (const c of co.crew) if (rnd(s) < 0.4) c.skill = clamp(c.skill + 1, 5, 98);
  // payout
  if (co.policy.payout && co.cash > co.policy.reserve * 2 + payroll(co)) { const extra = R((co.cash - co.policy.reserve - payroll(co)) * 0.5); if (extra > 0) { co.cash -= extra; earn(s, extra); f.notes.push(`Paid you a $${extra.toLocaleString('en-US')} dividend.`); f.dividend = extra; } }
  refreshMarket(s, co); co.rep = clamp(co.rep - 0.5, 0, 100); co.fame = clamp(co.fame - 0.8, 0, 100);
  f.profit = R(co.cash - startCash + (f.dividend || 0)); f.cash = R(co.cash); f.year = y; f.rep = R(co.rep); f.fame = R(co.fame); co.lastYear = f; co.hist.push({ year: y, revenue: f.revenue, profit: f.profit, rep: f.rep }); if (co.hist.length > 15) co.hist.shift();
  if (co.cash < 1000 && co.crew.length <= 2 && co.rep < 3) { log(s, `${co.name} went bust.`, 'biz'); delete s.prod.cos[m]; }
}
export function eventFx(s, v) {
  const P = s.prod; if (!P || !P.scandal) return; const sc = P.scandal, co = P.cos[sc.medium]; if (!co) { P.scandal = null; return; }
  const who = co.roster.find((a) => a.id === sc.id) || co.crew.find((c) => c.id === sc.id);
  if (v.hush) { const cost = R(20000 + co.rep * 600); if (co.cash >= cost) { co.cash -= cost; co.rep = clamp(co.rep - 1, 0, 100); log(s, `${co.name} quietly settled the ${sc.name} scandal for $${cost.toLocaleString('en-US')}.`, 'biz'); } else { co.rep = clamp(co.rep - 6, 0, 100); s.stats.fame = clamp(s.stats.fame + 1, 0, 100); log(s, `${co.name} could not afford to hush up the ${sc.name} scandal.`, 'biz'); } }
  if (v.drop) { co.roster = co.roster.filter((a) => a.id !== sc.id || a.busy); if (!co.roster.find((a) => a.id === sc.id)) co.crew = co.crew.length > 2 ? co.crew.filter((c) => c.id !== sc.id) : co.crew; co.rep = clamp(co.rep + 1, 0, 100); log(s, `${co.name} cut ties with ${sc.name}.`, 'biz'); }
  if (v.ride) { if (chance(s, 0.5)) { co.rep = clamp(co.rep - 8, 0, 100); co.fame = clamp(co.fame - 3, 0, 100); } else { co.fame = clamp(co.fame + 5, 0, 100); if (who && who.fame != null) who.fame = clamp(who.fame + 6, 0, 100); } log(s, `${co.name} rode out the ${sc.name} scandal.`, 'biz'); }
  P.scandal = null;
}

// ---------- status for the UI ----------
const coStatus = (s, co) => { const m = co.medium, d = med(m), cap = Math.min(co.policy.slots, maxSlots(co));
  return { id: co.id, medium: m, name: co.name, icon: d.icon, kind: d.name, unit: d.unit, unitPlural: d.unitPlural, cash: R(co.cash), rep: R(co.rep), fame: R(co.fame), value: valueOf(co), founded: co.founded, quality: R(crewQuality(co)), payroll: payroll(co), slots: cap, maxSlots: maxSlots(co), policy: { ...co.policy },
    crew: co.crew.map((c) => ({ ...c, roleName: d.roles.find((r) => r.id === c.role).name, icon: d.roles.find((r) => r.id === c.role).icon, trainCost: R(5000 + c.skill * 400), trained: c.trained === age(s) })), roster: co.roster.map((a) => ({ ...a, advance: advanceOf(a) })),
    slate: co.slate.map((p) => ({ ...p, expected: score(s, co, p, false) })), released: co.released.slice().reverse(), tail: co.tail.reduce((a, t) => a + t.per, 0), totals: { ...co.totals }, last: co.lastYear, hist: co.hist,
    market: { crew: co.market.crew.map((c) => ({ ...c, roleName: d.roles.find((r) => r.id === c.role).name, fee: R(c.wage * C().crewWage.signFrac) })), artists: co.market.artists.map((a) => ({ ...a, cost: signCost(a), advance: advanceOf(a) })) }, tiers: C().tiers.map((t, i) => ({ ...t, cost: d.tiers[i], locked: co.rep < t.repNeed })), genres: trends(s, m), roles: d.roles, scandal: s.prod.scandal && s.prod.scandal.medium === m ? s.prod.scandal : null }; };
export function status(s) {
  const P = ensure(s), a = age(s);
  return { age: a, locked: a < 18, cash: R(s.cash), media: MEDIA.map((m) => ({ id: m, ...med(m), owned: !!P.cos[m], found: med(m).found, company: P.cos[m] ? coStatus(s, P.cos[m]) : null, pitches: pitchesOf(s, m).map((p) => ({ ...p, genreName: genresOf(m).find((g) => g.id === p.genre).name, min: R(p.ask * 0.1), heat: R(heat(s, m, p.genre)) })), trends: trends(s, m) })),
    stakes: P.stakes.map((x) => ({ ...x, share: x.share })), backed: P.stakes.reduce((t, x) => t + x.invested, 0), royalties: P.stakes.reduce((t, x) => t + x.income, 0), value: value(s) };
}
export const headline = (s) => null;
