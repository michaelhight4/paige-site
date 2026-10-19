// Production companies: a record label, film studio, TV studio and game studio you can own (one per medium).
// (a) back OTHER companies' projects for a revenue cut (pitches, flops, royalty income over years), and/or
// (b) run your own company: sign artists (music), hire crew, greenlight projects. With the default policy a company produces by itself every year.
// Reuses src/studio.js genres/themes/trend curves and fame tiers (market trends). State: s.prod. Data: data/prodco.json.
import { fmtMoney } from './fmt.js';
import { D } from './data.js';
import { rnd, rint, pick, chance, clamp, gauss } from './rng.js';
import { log, earn } from './core.js';
import * as Studio from './studio.js';
import * as Ev from './events.js';
import * as Hw from './hardware.js';

const C = () => D.prodco;
export const MEDIA = ['music', 'film', 'tv', 'game'];
const age = (s) => Math.floor(s.age);
const R = (n) => Math.round(n);
export const ensure = (s) => { if (!s.prod) s.prod = { cos: {}, pitches: {}, stakes: [], scandal: null, year: -1, log: [] }; return s.prod; };
// per-title marketing: costs a share of the production budget, lifts the score a bit and the take a bit, with diminishing returns
export const MARKETING = { none: { id: 'none', label: 'No campaign', cost: 0, score: 0, rev: 1 }, light: { id: 'light', label: 'Light campaign', cost: 0.08, score: 0.3, rev: 1.06 }, heavy: { id: 'heavy', label: 'Heavy campaign', cost: 0.18, score: 0.6, rev: 1.14 }, blitz: { id: 'blitz', label: 'Media blitz', cost: 0.32, score: 0.8, rev: 1.2 } };
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
const frOf = (co, id) => (co.fran && co.fran[id]) || null;
export const sequelReady = (f) => !!f && f.value >= 30 && f.fatigue <= 70;
const med = (m) => C().media[m];
export const tierDef = (id) => C().tiers.find((t) => t.id === id) || C().tiers[0];
export const budgetOf = (m, tierId) => med(m).tiers[C().tiers.findIndex((t) => t.id === tierId)] || med(m).tiers[0];
// owner backstop: the company draws from your cash (never below your floor) when it is short, so it keeps producing without manual top-ups

// ---- yearly media strategy per company (picked each year like the social post plan; 'steady' has zero scandal risk but is slow) ----
export const MEDIA_PLANS = [
  { id: 'steady', icon: '🧸', name: 'Steady & safe', score: 0, noise: 0.6, rev: 0.95, rep: 0.7, cost: 1, slots: 0, scandal: 0, seq: 0, fresh: 0, heat: 0, fat: 16, desc: 'Predictable output, clean crew. No scandal risk, slower reputation.' },
  { id: 'quality', icon: '💎', name: 'Quality first', score: 0.8, noise: 0.9, rev: 0.92, rep: 1.1, cost: 1.18, slots: -1, scandal: 0.6, seq: 0, fresh: 0, heat: 0, fat: 16, desc: 'Fewer, better titles with bigger budgets. Better scores, fewer releases.' },
  { id: 'quantity', icon: '🏭', name: 'Quantity', score: -0.6, noise: 1, rev: 1.08, rep: 0.8, cost: 0.85, slots: 1, scandal: 1.5, seq: 0, fresh: 0, heat: 0, fat: 16, desc: 'Cheap and fast, an extra slot. More revenue, lower scores, more scandal risk.' },
  { id: 'trend', icon: '🔥', name: 'Trend-chasing', score: 0.2, noise: 1.7, rev: 1.15, rep: 1, cost: 1, slots: 0, scandal: 1.4, seq: 0, fresh: 0, heat: 1.2, fat: 16, desc: 'Ride the hot genres. Big hits and big misses.' },
  { id: 'prestige', icon: '🏆', name: 'Prestige & awards', score: 0.6, noise: 0.9, rev: 0.8, rep: 1.6, cost: 1.25, slots: 0, scandal: 0.7, seq: 0, fresh: 0.2, heat: 0, fat: 16, fame: 1.5, desc: 'Chase critics and awards. Reputation and fame grow, profits shrink.' },
  { id: 'franchise', icon: '♾️', name: 'Franchise-building', score: 0, noise: 1, rev: 1, rep: 1, cost: 1, slots: 0, scandal: 1, seq: 0.9, fresh: -0.5, heat: 0, fat: 11, desc: 'Sequels score higher and tire slower; fresh ideas do worse.' },
];
const STANDARD_PLAN = { id: 'standard', icon: '⚖️', name: 'Unplanned', score: 0, noise: 1, rev: 1, rep: 1, cost: 1, slots: 0, scandal: 1, seq: 0, fresh: 0, heat: 0, fat: 16, desc: 'No strategy chosen this year.' };
export const mediaPlanDef = (id) => MEDIA_PLANS.find((x) => x.id === id) || STANDARD_PLAN;
export const planOfCo = (co) => mediaPlanDef(co && co.strategy);
export const mediaPlanNeeded = (s, m) => { const co = need(s, m); return !!co && !co.strategy; };
export function chooseStrategy(s, m, id) { const co = need(s, m); if (!co) return { ok: false, msg: 'No company.' }; const d = MEDIA_PLANS.find((x) => x.id === id); if (!d) return { ok: false, msg: 'Unknown strategy.' }; co.strategy = id; return { ok: true, msg: `${co.name}: ${d.name}.` }; }
const slotsOf = (co) => clamp(maxSlots(co) + planOfCo(co).slots, 1, 6);
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
export const crewQuality = (co) => crewQ0(co) + (co.crew.length ? (co.q || 0) * 0.3 : 0);
export function genCandidate(s, co, roleId) { const sk = clamp(R(25 + co.rep * 0.4 + gauss(s) * 16 + (co.fame || 0) * 0.15), 5, 95); return { id: 'c' + Math.floor(rnd(s) * 1e9), name: personName(s), role: roleId, skill: sk, wage: wageOf(sk), wild: +(rnd(s) ** 1.5).toFixed(2) }; }
export function genArtist(s, co) { const talent = clamp(R(35 + co.rep * 0.3 + gauss(s) * 17), 10, 98), pot = clamp(talent + rint(s, 0, 20), 10, 99); return { id: 'a' + Math.floor(rnd(s) * 1e9), name: chance(s, 0.5) ? personName(s) : pick(s, C().artistWords) + ' ' + pick(s, C().artistWords), genre: pick(s, genresOf('music')).id, talent, pot, fame: rint(s, 0, 15), wild: +(rnd(s) ** 1.5).toFixed(2), age: rint(s, 18, 30), contract: 0, busy: 0, albums: 0 }; }
const signCost = (a) => R(a.talent * a.talent * 12 + 8000);
const advanceOf = (a) => R(8000 + a.talent * 300 + a.fame * 400);

// ---------- company ----------
export function mkCo(s, m) {
  const co = { id: 'pc_' + m, medium: m, name: '', founded: age(s), cash: 0, rep: 15, fame: 0, crew: [], roster: [], slate: [], released: [], tail: [], hist: [], market: { crew: [], artists: [] }, policy: { auto: true, slots: 1, tier: 'small', genre: 'trend', payout: true, reserve: 60000, backstop: true, ownerFloor: 25000, marketing: 'light', sequels: true, dealAuto: false }, fran: {}, offers: [], income: 0, totals: { revenue: 0, spent: 0, hits: 0, flops: 0, releases: 0 }, lastYear: null };
  for (const r of med(m).roles) { const c = genCandidate(s, co, r.id); c.skill = clamp(c.skill - 8, 5, 60); c.wage = wageOf(c.skill); co.crew.push(c); }
  refreshMarket(s, co); return co;
}
export function refreshMarket(s, co) { const m = co.medium; co.market = { crew: [], artists: [] }; for (const r of med(m).roles) for (let i = 0; i < 2; i++) co.market.crew.push(genCandidate(s, co, r.id)); if (m === 'music') for (let i = 0; i < 4; i++) co.market.artists.push(genArtist(s, co)); }
const crewQ0 = (co) => co.crew.length ? co.crew.reduce((a, c) => a + c.skill, 0) / Math.max(co.crew.length, 3) * (co.crew.length >= med(co.medium).roles.length ? 1 : co.crew.length / med(co.medium).roles.length) : 0;
export const maxSlots = (co) => clamp(1 + Math.floor(co.crew.length / 3) + Math.floor(co.rep / 45), 1, 5);
const payroll = (co) => co.crew.reduce((a, c) => a + c.wage, 0) + co.roster.reduce((a, x) => a + advanceOf(x), 0) + C().overhead;
const valueOf = (co) => Math.max(0, R(co.cash + (co.totals.revenue > 0 ? Math.max(0, (co.lastYear ? co.lastYear.profit : 0)) * 3 : 0) + co.rep * 5000 + co.fame * 8000));
export const value = (s) => (s.prod ? Object.values(s.prod.cos).reduce((a, c) => a + valueOf(c), 0) : 0);

export function found(s, m, name) {
  const P = ensure(s), d = med(m); if (!d) return { ok: false, msg: 'Unknown medium.' }; if (age(s) < 18) return { ok: false, msg: 'You must be 18+.' }; if (P.cos[m]) return { ok: false, msg: `You already own a ${d.name.toLowerCase()}.` };
  if (s.cash < d.found) return { ok: false, msg: `Needs ${fmtMoney(d.found)} to found.` };
  s.cash -= d.found; const co = mkCo(s, m); co.name = (name && String(name).trim().slice(0, 28)) || `${pick(s, C().studios)} ${d.word}`; co.cash = R(d.found * 0.7); P.cos[m] = co; log(s, `I founded ${co.name}, a ${d.name.toLowerCase()}.`, 'biz'); return { ok: true, msg: `${co.name} is open for business.`, co };
}
const need = (s, m) => { const co = s.prod && s.prod.cos[m]; return co || null; };
export function fundCo(s, m, amt) { const co = need(s, m); if (!co) return { ok: false, msg: 'No company.' }; amt = Math.floor(amt); if (!(amt > 0) || amt > s.cash) return { ok: false, msg: 'Not enough cash.' }; s.cash -= amt; co.cash += amt; return { ok: true, msg: `Moved ${fmtMoney(amt)} into ${co.name}.` }; }
export function withdraw(s, m, amt) { const co = need(s, m); if (!co) return { ok: false, msg: 'No company.' }; amt = Math.floor(amt); if (!(amt > 0) || amt > co.cash) return { ok: false, msg: 'The company does not have that.' }; co.cash -= amt; earn(s, amt); return { ok: true, msg: `Took ${fmtMoney(amt)} out of ${co.name}.` }; }
export function sellCo(s, m) { const co = need(s, m); if (!co) return { ok: false, msg: 'No company.' }; const v = valueOf(co); earn(s, v); delete s.prod.cos[m]; log(s, `I sold ${co.name} for ${fmtMoney(v)}.`, 'biz'); return { ok: true, msg: `Sold for ${fmtMoney(v)}.` }; }
export function hire(s, m, id) { const co = need(s, m); if (!co) return { ok: false, msg: 'No company.' }; const i = co.market.crew.findIndex((c) => c.id === id); if (i < 0) return { ok: false, msg: 'Candidate left.' }; if (co.crew.length >= 8) return { ok: false, msg: 'Crew is full (8).' }; const c = co.market.crew[i], fee = R(c.wage * C().crewWage.signFrac); if (co.cash < fee) return { ok: false, msg: 'Company cash is too low for the signing fee.' }; co.cash -= fee; co.market.crew.splice(i, 1); co.crew.push(c); return { ok: true, msg: `Hired ${c.name} (skill ${c.skill}).` }; }
export function fire(s, m, id) { const co = need(s, m); if (!co) return { ok: false, msg: 'No company.' }; const i = co.crew.findIndex((c) => c.id === id); if (i < 0) return { ok: false, msg: 'No such crew member.' }; if (co.crew.length <= 2) return { ok: false, msg: 'Keep at least 2 crew.' }; const c = co.crew.splice(i, 1)[0]; return { ok: true, msg: `${c.name} left.` }; }
export function train(s, m, id) { const co = need(s, m); if (!co) return { ok: false, msg: 'No company.' }; const c = co.crew.find((x) => x.id === id); if (!c) return { ok: false, msg: 'No such crew member.' }; if (c.trained === age(s)) return { ok: false, msg: 'Already trained this year.' }; const cost = R(5000 + c.skill * 400); if (co.cash < cost) return { ok: false, msg: 'Company cash is too low.' }; co.cash -= cost; c.trained = age(s); c.skill = clamp(c.skill + rint(s, 3, 6), 5, 98); c.wage = wageOf(c.skill); return { ok: true, msg: `${c.name} trained: skill ${c.skill}.` }; }
export function sign(s, m, id) { const co = need(s, m); if (!co || m !== 'music') return { ok: false, msg: 'Only a record label signs artists.' }; const i = co.market.artists.findIndex((a) => a.id === id); if (i < 0) return { ok: false, msg: 'Artist signed elsewhere.' }; if (co.roster.length >= 6) return { ok: false, msg: 'Roster is full (6).' }; const a = co.market.artists[i], cost = signCost(a); if (co.cash < cost) return { ok: false, msg: `Needs ${fmtMoney(cost)} in company cash.` }; co.cash -= cost; co.market.artists.splice(i, 1); a.contract = 3; co.roster.push(a); return { ok: true, msg: `Signed ${a.name} for 3 years.` }; }
export function drop(s, m, id) { const co = need(s, m); if (!co) return { ok: false, msg: 'No company.' }; const i = co.roster.findIndex((a) => a.id === id); if (i < 0) return { ok: false, msg: 'No such artist.' }; if (co.roster[i].busy) return { ok: false, msg: 'Finish their album first.' }; const a = co.roster.splice(i, 1)[0]; return { ok: true, msg: `Dropped ${a.name}.` }; }
export function setPolicy(s, m, patch = {}) { const co = need(s, m); if (!co) return { ok: false, msg: 'No company.' }; const p = co.policy; if (patch.auto != null) p.auto = !!patch.auto; if (patch.slots != null) p.slots = clamp(Math.floor(patch.slots), 1, 5); if (patch.tier && C().tiers.some((t) => t.id === patch.tier)) p.tier = patch.tier; if (patch.genre && (patch.genre === 'trend' || genresOf(m).some((g) => g.id === patch.genre))) p.genre = patch.genre; if (patch.payout != null) p.payout = !!patch.payout; if (patch.backstop != null) p.backstop = !!patch.backstop; if (patch.ownerFloor != null) p.ownerFloor = clamp(Math.floor(patch.ownerFloor), 0, 1e9); if (patch.marketing && MARKETING[patch.marketing]) p.marketing = patch.marketing; if (patch.sequels != null) p.sequels = !!patch.sequels; if (patch.dealAuto != null) p.dealAuto = !!patch.dealAuto; if (patch.reserve != null) p.reserve = clamp(Math.floor(patch.reserve), 0, 1e8); return { ok: true, msg: 'Policy saved.' }; }

// ---------- greenlight (manual and policy use this same function) ----------
export function greenlight(s, m, o = {}) {
  const co = need(s, m); if (!co) return { ok: false, msg: 'No company.' }; const p = co.policy;
  if (co.slate.length >= Math.min(p.slots, slotsOf(co)) && !o.force) return { ok: false, msg: `Slate is full (${co.slate.length}/${Math.min(p.slots, slotsOf(co))}).` };
  if (co.slate.length >= slotsOf(co)) return { ok: false, msg: 'No free production slot. Hire more crew or build reputation.' };
  const tid = o.tier || p.tier, t = tierDef(tid); if (co.rep < t.repNeed) return { ok: false, msg: `${t.label} needs company reputation ${t.repNeed}.` };
  const genre0 = o.genre && o.genre !== 'trend' ? o.genre : (p.genre === 'trend' || !p.genre ? bestGenre(s, m) : p.genre); const genre = (o.sequelOf && frOf(co, o.sequelOf)) ? frOf(co, o.sequelOf).genre : genre0; if (!genresOf(m).some((g) => g.id === genre)) return { ok: false, msg: 'Unknown genre.' };
  const fr = o.sequelOf ? frOf(co, o.sequelOf) : null; if (o.sequelOf && !fr) return { ok: false, msg: 'That franchise is gone.' }; if (fr && !sequelReady(fr)) return { ok: false, msg: `${fr.title} is too tired for a sequel right now (fatigue ${R(fr.fatigue)}).` }; if (fr && co.slate.some((x) => x.fid === fr.id)) return { ok: false, msg: 'A sequel is already in production.' };
  const mkId = o.marketing || p.marketing || 'light', mk = MARKETING[mkId]; if (!mk) return { ok: false, msg: 'Unknown marketing plan.' };
  const PLN = planOfCo(co), base = R(budgetOf(m, tid) * PLN.cost), cost = fr ? R(base * (1 + 0.08 * fr.entries)) : base, mcost = R(cost * mk.cost), total = cost + mcost; topUp(s, co, total); if (co.cash < total) return { ok: false, msg: `Needs ${fmtMoney(total)} in company cash (has ${fmtMoney(R(co.cash))}).` };
  let artist = null;
  if (m === 'music') { const fa = fr && fr.artistId && co.roster.find((a) => a.id === fr.artistId && !a.busy); artist = fa || (o.artistId ? co.roster.find((a) => a.id === o.artistId) : co.roster.filter((a) => !a.busy).sort((a, b) => (b.talent + b.fame * 0.5) - (a.talent + a.fame * 0.5))[0]); if (!artist) return { ok: false, msg: 'Sign an available artist first.' }; if (artist.busy) return { ok: false, msg: `${artist.name} is already recording.` }; artist.busy = 1; }
  co.cash -= total; co.totals.spent += total; const title = fr ? `${fr.title} ${ROMAN[Math.min(fr.entries + 1, 12)]}` : (o.title || nameTitle(s));
  const pr = { id: 'p' + Math.floor(rnd(s) * 1e9), title, genre, tier: tid, cost, artistId: artist ? artist.id : null, artistName: artist ? artist.name : null, left: med(m).years, started: age(s), troubled: chance(s, t.risk * 0.5), marketing: mkId, mcost, fid: fr ? fr.id : null, deal: null };
  co.slate.push(pr); log(s, `${co.name} greenlit ${fr ? 'the sequel ' : ''}"${title}" (${m === 'music' ? 'album by ' + artist.name : tid}, ${fmtMoney(cost)}${mcost ? ' + $' + mcost.toLocaleString('en-US') + ' marketing' : ''}).`, 'biz'); return { ok: true, msg: `Greenlit "${title}".`, project: pr };
}
const labelOf = (score) => { let l = C().labels[0][1]; for (const [min, name] of C().labels) if (score >= min) l = name; return l; };
export function score(s, co, pr, noise = true) {
  const PL = planOfCo(co), t = tierDef(pr.tier), a = pr.artistId ? co.roster.find((x) => x.id === pr.artistId) : null, h = heat(s, co.medium, pr.genre), fr0 = pr.fid ? frOf(co, pr.fid) : null;
  const sc = 3.6 + crewQuality(co) / 100 * 2.6 + t.bonus + h / 100 * 1.5 + co.rep / 100 * 0.9 + (a ? a.talent / 100 * 1.6 : 0) + (a ? 0 : 0.8) - (pr.troubled ? 1 : 0) + (MARKETING[pr.marketing] || MARKETING.none).score + (fr0 ? fr0.value / 100 * 1.2 - fr0.fatigue / 100 * 1.5 : 0) + (pr.deal ? pr.deal.scoreDelta || 0 : 0) + PL.score + (pr.fid ? PL.seq : PL.fresh) + (PL.heat ? h / 100 * PL.heat : 0) + (noise ? gauss(s) * 1.1 * PL.noise : 0);
  return clamp(+sc.toFixed(1), 0, 10);
}
function releaseOne(s, co, pr) {
  const t = tierDef(pr.tier), a = pr.artistId ? co.roster.find((x) => x.id === pr.artistId) : null, d = pr.deal, notes = [];
  let sc = score(s, co, pr); if (d && d.risk && chance(s, d.risk)) { sc = clamp(+(sc + d.mishap).toFixed(1), 0, 10); notes.push(d.mishapText || 'The partner dropped the ball.'); }
  const mk = MARKETING[pr.marketing] || MARKETING.none; let mult = t.mean * Math.exp((sc - 6) * 0.42) * (a ? 1 + a.fame / 120 : 1) * mk.rev * (d ? d.revMult : 1) * planOfCo(co).rev;
  if (d && d.console && !Hw.makerOf(s, d.console)) { mult *= 0.6; notes.push(`${d.from} went bankrupt before launch: the exclusive lost most of its audience.`); }
  const gross = R(pr.cost * mult); let revenue = R(gross * (d ? d.keep : 1)); if (d && d.flopPenalty && sc < 5.5) { revenue = Math.max(0, revenue - R(pr.cost * d.flopPenalty)); notes.push('The wide release flopped: extra print and ad costs.'); }
  const now = R(revenue * (d && d.now ? d.now : 0.6)), tail = revenue - now, ty = d && d.tailYears ? d.tailYears : 3;
  co.cash += now; if (tail > 0) co.tail.push({ left: ty, per: R(tail / ty), title: pr.title });
  const label = labelOf(sc), profit = revenue - pr.cost - (pr.mcost || 0) + (d ? d.upfront : 0); co.totals.revenue += revenue; co.totals.releases++; if (sc >= 7.5) co.totals.hits++; if (sc < 4.5) co.totals.flops++;
  const dRep = (sc - 6) * 2.5 + (d ? d.rep || 0 : 0), dFame = (sc >= 7.5 ? 3 + (sc - 7.5) * 3 : sc < 4.5 ? -2 : 0.5) + (d ? d.fame || 0 : 0); const PLN2 = planOfCo(co); co.rep = clamp(co.rep + (dRep > 0 ? dRep * PLN2.rep : dRep), 0, 100); co.fame = clamp(co.fame + dFame + (sc >= 7.5 ? PLN2.fame || 0 : 0), 0, 100);
  if (a) { a.busy = 0; a.albums++; a.fame = clamp(a.fame + (sc >= 7.5 ? 12 : sc >= 6 ? 4 : -2), 0, 100); a.talent = clamp(a.talent + (a.talent < a.pot ? 2 : 0), 1, 99); }
  s.stats.fame = clamp(s.stats.fame + (sc >= 9 ? 4 : sc >= 7.5 ? 2 : 0), 0, 100);
  // franchises: a hit (7+) can be continued; every entry adds fatigue, flops hurt the brand
  co.fran = co.fran || {}; let fr = pr.fid ? frOf(co, pr.fid) : null, fnote = null;
  if (fr) { fr.entries++; fr.fatigue = clamp(fr.fatigue + planOfCo(co).fat, 0, 100); fr.value = clamp(fr.value + (sc >= 7 ? 8 : sc >= 5.5 ? -4 : -18), 0, 100); fr.last = age(s); fr.lastScore = sc; fr.gross += revenue; fnote = sc >= 7 ? `${fr.title}: the franchise keeps its audience.` : `${fr.title}: franchise fatigue shows.`; }
  else if (sc >= 7 && !Object.values(co.fran).some((x) => x.title === pr.title)) { fr = { id: 'f' + Math.floor(rnd(s) * 1e9), title: pr.title, genre: pr.genre, entries: 1, value: clamp(R(40 + (sc - 7) * 16), 35, 95), fatigue: 0, artistId: a ? a.id : null, artist: pr.artistName, last: age(s), lastScore: sc, gross: revenue }; co.fran[fr.id] = fr; fnote = `"${pr.title}" is now a franchise: sequels are possible.`; }
  const rel = { id: 'r' + Math.floor(rnd(s) * 1e9), title: pr.title, genre: pr.genre, tier: pr.tier, artist: pr.artistName, score: sc, label, revenue, gross, cost: pr.cost, marketing: pr.mcost || 0, deal: d ? d.label + ' · ' + d.from : null, sequel: !!pr.fid, profit, year: age(s), notes };
  co.released.push(rel); if (co.released.length > 14) co.released.shift();
  log(s, `${co.name} released "${pr.title}"${a ? ' by ' + a.name : ''}: ${label} (${sc}/10), revenue ${fmtMoney(revenue)} on a ${fmtMoney(pr.cost)} budget${d ? ` (${d.label} deal)` : ''}.${fnote ? ' ' + fnote : ''}`, 'biz');
  if (sc >= 9) (s.market && s.market.news || []).push({ age: s.age, text: `${pr.title} from ${co.name} is a runaway ${med(co.medium).unit} hit!` });
  return rel;
}
// ---------- inbound deals: other studios, streamers and console makers come to YOU about a project in production ----------
const PARTNERS = { streamer: ['Streamline', 'Fluxcast', 'Orbitplay', 'Ripple+'], dist: ['Meridian Pictures', 'Crown Releasing', 'Lantern Films', 'Atlas Distribution'], network: ['Channel Nine-Nine', 'Beacon Network', 'Unity Broadcasting'], label: ['Vinyl Crown', 'Sonata Group', 'Halo Records', 'Northstar Music'], studio: null };
const DEALS = { game: ['exclusive', 'port', 'license', 'publish'], film: ['streaming', 'theatrical', 'festival'], tv: ['streaming', 'network', 'syndication'], music: ['streaming', 'label', 'sync'] };
const money = (n) => fmtMoney(n);
function makeOffer(s, co, pr, type) {
  const m = co.medium, t = tierDef(pr.tier), E = pr.cost * t.mean * Math.exp((score(s, co, pr, false) - 6) * 0.42), o = { id: 'o' + Math.floor(rnd(s) * 1e9), type, projectId: pr.id, projectTitle: pr.title, upfront: 0, keep: 1, revMult: 1, scoreDelta: 0, risk: 0, mishap: 0, fame: 0, rep: 0, now: 0, tailYears: 0, flopPenalty: 0, console: null, mishapText: '', terms: [] };
  const P = (k) => pick(s, PARTNERS[k]); const T = o.terms;
  if (m === 'game' && type === 'exclusive') { const hw = Hw.list(s), mk = pick(s, hw.makers.filter((x) => x.tier === 'major' || rnd(s) < 0.6)) || hw.makers[0]; o.from = mk.name; o.label = 'Console exclusive'; o.console = mk.homeId; o.upfront = R(pr.cost * (0.18 + 0.22 * rnd(s))); o.revMult = +clamp(0.55 + mk.share / 100 * 1.6, 0.6, 1).toFixed(2); o.scoreDelta = 0.3; o.fame = 1; T.push(`Only on ${mk.home} (${mk.share}% of the market).`, `Sales ×${o.revMult} because other consoles are locked out.`, `${mk.name} pays ${money(o.upfront)} up front and co-markets it (+0.3 score).`, `If ${mk.name} goes bankrupt before launch, sales ×0.6.`); }
  else if (m === 'game' && type === 'port') { o.from = pick(s, C().studios) + ' Ports'; o.label = 'Port deal'; o.keep = 0.8; o.revMult = 1.18; o.risk = 0.22; o.mishap = -0.7; o.mishapText = 'The port was buggy and reviews noticed.'; T.push('They port it to every console: sales ×1.18.', 'They keep 20% of revenue.', '22% chance of a sloppy port (-0.7 score).'); }
  else if (m === 'game' && type === 'license') { o.from = pick(s, C().studios) + ' Publishing'; o.label = 'IP license'; o.upfront = R(E * 0.35); o.keep = 0.65; o.fame = 3; T.push(`${money(o.upfront)} up front for a licence on the property.`, 'They take 35% of revenue.', 'Brand fame +3.'); }
  else if (m === 'game' && type === 'publish') { o.from = pick(s, C().studios) + ' Publishing'; o.label = 'Publishing deal'; o.keep = 0.7; o.revMult = 1.2; o.scoreDelta = 0.8; T.push('A big publisher funds a marketing blitz: +0.8 score, sales ×1.2.', 'They take 30% of revenue.'); }
  else if (type === 'streaming') { o.from = P(m === 'music' ? 'streamer' : 'streamer'); o.label = m === 'music' ? 'Streaming push' : 'Streaming buyout'; if (m === 'music') { o.revMult = 1.1; o.now = 0.4; o.tailYears = 5; T.push('Playlist placement: revenue ×1.1, paid slowly over 5 years.'); } else { o.upfront = R(pr.cost * (m === 'film' ? 0.95 : 0.7)); o.revMult = m === 'film' ? 0.55 : 0.6; T.push(`${money(o.upfront)} up front: almost your whole budget back, no flop risk on the buyout.`, `Sales ×${o.revMult}: the streamer owns the upside.`); } }
  else if (type === 'theatrical') { o.from = P('dist'); o.label = 'Wide theatrical release'; o.revMult = 1.25; o.flopPenalty = 0.15; T.push('Sales ×1.25 on a wide release.', 'If it scores under 5.5 you eat 15% of budget in extra print and ad costs.'); }
  else if (type === 'festival') { o.from = P('dist'); o.label = 'Festival circuit'; o.upfront = R(pr.cost * 0.1); o.revMult = 0.85; o.scoreDelta = 0.4; o.rep = 3; T.push(`${money(o.upfront)} advance, prestige: +0.4 score, +3 reputation.`, 'Smaller audience: sales ×0.85.'); }
  else if (type === 'network') { o.from = P('network'); o.label = 'Network pickup'; o.upfront = R(pr.cost * 0.2); o.keep = 0.9; o.revMult = 1.1; o.rep = 2; T.push(`${money(o.upfront)} licence fee, sales ×1.1.`, 'The network keeps 10% of ad revenue.'); }
  else if (type === 'syndication') { o.from = P('network'); o.label = 'Syndication'; o.now = 0.3; o.tailYears = 5; o.revMult = 1.05; T.push('Slow money: only 30% on release, the rest over 5 years (×1.05).'); }
  else if (type === 'label') { o.from = P('label'); o.label = 'Major label distribution'; o.upfront = R(pr.cost * 0.3); o.keep = 0.65; o.scoreDelta = 0.5; o.fame = 2; T.push(`${money(o.upfront)} advance, radio and shelf push (+0.5 score).`, 'The label keeps 35% of revenue.'); }
  else if (type === 'sync') { o.from = P('label'); o.label = 'Sync licensing'; o.upfront = R(pr.cost * 0.15); o.revMult = 1.05; o.fame = 2; T.push(`${money(o.upfront)} for ad and film placements, sales ×1.05, fame +2.`); }
  const yes = o.upfront + E * (o.revMult * o.keep - 1) + o.scoreDelta * E * 0.15 - o.risk * Math.abs(o.mishap) * E * 0.15 - (o.flopPenalty ? o.flopPenalty * pr.cost * 0.3 : 0);
  o.ev = R(yes); o.expected = R(E); return o;
}
export function genOffers(s, co) {
  co.offers = []; const free = co.slate.filter((x) => !x.deal); if (!free.length) return; const r = rnd(s), n = r < 0.25 ? 0 : r < 0.7 ? 1 : 2;
  const types = DEALS[co.medium].slice(); for (let i = 0; i < n && types.length; i++) { const pr = pick(s, free), type = types.splice(Math.floor(rnd(s) * types.length), 1)[0]; if (co.offers.some((x) => x.projectId === pr.id)) continue; co.offers.push(makeOffer(s, co, pr, type)); }
}
export function dealAccept(s, m, offerId, yes = true) {
  const co = need(s, m); if (!co) return { ok: false, msg: 'No company.' }; const i = (co.offers || []).findIndex((o) => o.id === offerId); if (i < 0) return { ok: false, msg: 'That offer has expired.' }; const o = co.offers[i];
  if (!yes) { co.offers.splice(i, 1); return { ok: true, msg: `You turned down ${o.from}.` }; }
  const pr = co.slate.find((x) => x.id === o.projectId); if (!pr) { co.offers.splice(i, 1); return { ok: false, msg: 'That project has already been released.' }; } if (pr.deal) return { ok: false, msg: 'That project already has a deal.' };
  if (o.console && !Hw.makerOf(s, o.console)) { co.offers.splice(i, 1); return { ok: false, msg: `${o.from} is no longer in business.` }; }
  pr.deal = { ...o }; co.cash += o.upfront; co.income = (co.income || 0) + o.upfront; co.totals.revenue += o.upfront; co.offers = co.offers.filter((x) => x.projectId !== pr.id);
  log(s, `${co.name} signed a ${o.label.toLowerCase()} with ${o.from} for "${pr.title}"${o.upfront ? ' (' + money(o.upfront) + ' up front)' : ''}.`, 'biz'); return { ok: true, msg: `Deal signed with ${o.from}.${o.upfront ? ' ' + money(o.upfront) + ' paid to the company.' : ''}` };
}
const bestOffer = (co) => (co.offers || []).filter((o) => o.ev > 0).sort((a, b) => b.ev - a.ev)[0] || null;

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
  const pi = list[i]; amt = Math.floor(Number(amt) || 0); const min = Math.round(pi.ask * 0.1); if (amt < min) return { ok: false, msg: `Minimum investment is ${fmtMoney(min)}.` }; amt = Math.min(amt, pi.ask); if (amt > s.cash) return { ok: false, msg: 'Not enough cash.' };
  s.cash -= amt; list.splice(i, 1); const share = +(pi.cut * amt / pi.ask).toFixed(4);
  P.stakes.push({ id: 's' + Math.floor(rnd(s) * 1e9), medium: m, title: pi.title, studio: pi.studio, genre: pi.genre, tier: pi.tier, ask: pi.ask, invested: amt, share, buzz: pi.buzz, left: pi.years, risk: pi.risk, status: 'development', income: 0, result: null, payments: [] });
  log(s, `I backed "${pi.title}" from ${pi.studio} with ${fmtMoney(amt)} for a ${Math.round(share * 100)}% revenue cut.`, 'biz'); return { ok: true, msg: `Backed "${pi.title}": ${Math.round(share * 100)}% of its revenue is yours.` };
}
function resolveStake(s, st) {
  const t = tierDef(st.tier), h = heat(s, st.medium, st.genre), flop = chance(s, clamp(st.risk, 0.05, 0.6)), sc = clamp(+(3.3 + st.buzz * 0.42 + t.bonus + h / 100 * 1.4 + gauss(s) * 1.0 - (flop ? 2.2 : 0)).toFixed(1), 0, 10);
  const revenue = R(st.ask * t.mean * Math.exp((sc - 6) * 0.42)); st.result = { score: sc, label: labelOf(sc), revenue, year: age(s) }; st.status = 'paying'; st.payLeft = 3; st.pool = R(revenue * st.share);
  log(s, `"${st.title}" (backed by me) was released: ${st.result.label} (${sc}/10). My ${Math.round(st.share * 100)}% cut: ${fmtMoney(st.pool)} over 3 years.`, 'biz'); if (sc < 4.5) st.status = 'paying';
}
// ---------- yearly ----------
export function yearTick(s) {
  const P = s.prod; if (!P) return; const y = age(s); if (P.year === y) return; P.year = y;
  // stakes: develop, release, pay royalties
  for (const st of P.stakes) { if (st.status === 'development') { st.left--; if (st.left <= 0) resolveStake(s, st); } else if (st.status === 'paying' && st.payLeft > 0) { const w = [0.5, 0.3, 0.2][3 - st.payLeft], pay = R(st.pool * w); st.payLeft--; st.income += pay; earn(s, pay); st.payments.push({ year: y, amount: pay }); if (st.payLeft <= 0) { st.status = 'done'; st.net = st.income - st.invested; log(s, `"${st.title}" royalties finished: ${fmtMoney(st.income)} on ${fmtMoney(st.invested)} invested (${st.net >= 0 ? '+' : '-'}${fmtMoney(Math.abs(st.net))}).`, 'biz'); } } }
  P.stakes = P.stakes.filter((st) => st.status !== 'done' || y - (st.result ? st.result.year : y) < 6);
  for (const m of MEDIA) P.pitches[m] = genPitches(s, m);
  for (const co of Object.values(P.cos)) coYear(s, co);
}
function coYear(s, co) {
  const y = age(s), m = co.medium, f = { revenue: 0, wages: 0, budgets: 0, releases: [], notes: [] }, startCash = co.cash;
  co.offers = []; co.fran = co.fran || {};
  // tail income + releases
  for (const t of co.tail) { co.cash += t.per; t.left--; f.revenue += t.per; } co.tail = co.tail.filter((t) => t.left > 0);
  for (const pr of co.slate.slice()) { pr.left--; if (pr.left <= 0) { const rel = releaseOne(s, co, pr); f.releases.push(rel); f.revenue += R(rel.revenue * (pr.deal && pr.deal.now ? pr.deal.now : 0.6)); co.slate.splice(co.slate.indexOf(pr), 1); } }
  // payroll (owner covers a shortfall, otherwise the lowest paid crew walk)
  f.revenue += co.income || 0; co.income = 0;
  const pay = payroll(co); f.wages = pay; topUp(s, co, pay); co.cash -= pay;
  if (co.cash < 0) { const gap = -co.cash; if (co.policy.backstop && s.cash >= gap) { s.cash -= gap; co.cash = 0; f.notes.push(`You covered a ${fmtMoney(gap)} payroll gap.`); log(s, `I covered a ${fmtMoney(gap)} payroll gap at ${co.name}.`, 'biz'); } else { co.cash = 0; co.rep = clamp(co.rep - 6, 0, 100); if (co.crew.length > 2) co.crew.sort((a, b) => a.wage - b.wage).shift(); f.notes.push('Payroll was missed: reputation fell and crew left.'); } }
  for (const a of co.roster) { a.age++; if (!a.busy) a.contract--; }
  const left = co.roster.filter((a) => a.contract <= 0 && !a.busy); for (const a of left) { f.notes.push(`${a.name}'s contract ended.`); co.roster.splice(co.roster.indexOf(a), 1); }
  // scandals
  const folks = [...co.roster.map((x) => ({ x, kind: 'artist' })), ...co.crew.map((x) => ({ x, kind: 'crew' }))]; let hit = null; for (const e of folks) if (!hit && planOfCo(co).scandal > 0 && chance(s, (0.008 + (e.x.wild == null ? 0.2 : e.x.wild) * 0.07) * planOfCo(co).scandal)) hit = e;
  if (hit && !s.prod.scandal) { const roleName = hit.kind === 'artist' ? 'artist' : (med(m).roles.find((r) => r.id === hit.x.role) || { name: 'crew' }).name.toLowerCase(), what = pick(s, C().scandals); s.prod.scandal = { medium: m, id: hit.x.id, name: hit.x.name, role: roleName, what, year: y }; Ev.queue(s, 'prod_scandal', { name: `${hit.x.name} (${roleName})`, company: co.name, what }); f.notes.push(`${hit.x.name} (${roleName}) ${what}.`); }
  // auto production by policy (same greenlight function as manual)
  if (co.policy.auto && m === 'music' && !co.roster.some((x) => !x.busy) && co.roster.length < 6) { const pick1 = co.market.artists.slice().sort((x, y) => (y.talent + y.pot) - (x.talent + x.pot))[0]; if (pick1) { topUp(s, co, signCost(pick1) + 40000); const r = sign(s, m, pick1.id); if (r.ok) f.notes.push('Auto: ' + r.msg); } }
  for (const fr of Object.values(co.fran)) { if (fr.last !== y) { fr.fatigue = clamp(fr.fatigue - 6, 0, 100); fr.value = clamp(fr.value - 2, 0, 100); } if (fr.value < 10) delete co.fran[fr.id]; }
  if (co.policy.auto) { let guard = 0; while (guard++ < 5 && co.slate.length < Math.min(co.policy.slots, slotsOf(co))) { const fr = co.policy.sequels !== false ? Object.values(co.fran).filter((x) => x.value >= 45 && x.fatigue <= 50 && !co.slate.some((p) => p.fid === x.id)).sort((a, b) => b.value - a.value)[0] : null; let r = fr ? greenlight(s, m, { sequelOf: fr.id }) : null; if (!r || !r.ok) r = greenlight(s, m, {}); if (!r.ok) { f.notes.push('Auto: ' + r.msg); break; } f.budgets += r.project.cost + (r.project.mcost || 0); } }
  genOffers(s, co); if (co.policy.dealAuto) { const bo = bestOffer(co); if (bo) { const r = dealAccept(s, m, bo.id, true); if (r.ok) f.notes.push('Auto: ' + r.msg); } }
  for (const c of co.crew) if (rnd(s) < 0.4) c.skill = clamp(c.skill + 1, 5, 98);
  // payout
  if (co.policy.payout && co.cash > co.policy.reserve * 2 + payroll(co)) { const extra = R((co.cash - co.policy.reserve - payroll(co)) * 0.5); if (extra > 0) { co.cash -= extra; earn(s, extra); f.notes.push(`Paid you a ${fmtMoney(extra)} dividend.`); f.dividend = extra; } }
  refreshMarket(s, co); co.rep = clamp(co.rep - 0.5, 0, 100); co.fame = clamp(co.fame - 0.8, 0, 100);
  f.plan = planOfCo(co).id; co.strategy = null;
  f.profit = R(co.cash - startCash + (f.dividend || 0)); f.cash = R(co.cash); f.year = y; f.rep = R(co.rep); f.fame = R(co.fame); co.lastYear = f; co.hist.push({ year: y, revenue: f.revenue, profit: f.profit, rep: f.rep }); if (co.hist.length > 15) co.hist.shift();
  if (co.cash < 1000 && co.crew.length <= 2 && co.rep < 3) { log(s, `${co.name} went bust.`, 'biz'); delete s.prod.cos[m]; }
}
export function eventFx(s, v) {
  const P = s.prod; if (!P || !P.scandal) return; const sc = P.scandal, co = P.cos[sc.medium]; if (!co) { P.scandal = null; return; }
  const who = co.roster.find((a) => a.id === sc.id) || co.crew.find((c) => c.id === sc.id);
  if (v.hush) { const cost = R(20000 + co.rep * 600); if (co.cash >= cost) { co.cash -= cost; co.rep = clamp(co.rep - 1, 0, 100); log(s, `${co.name} quietly settled the ${sc.name} scandal for ${fmtMoney(cost)}.`, 'biz'); } else { co.rep = clamp(co.rep - 6, 0, 100); s.stats.fame = clamp(s.stats.fame + 1, 0, 100); log(s, `${co.name} could not afford to hush up the ${sc.name} scandal.`, 'biz'); } }
  if (v.drop) { co.roster = co.roster.filter((a) => a.id !== sc.id || a.busy); if (!co.roster.find((a) => a.id === sc.id)) co.crew = co.crew.length > 2 ? co.crew.filter((c) => c.id !== sc.id) : co.crew; co.rep = clamp(co.rep + 1, 0, 100); log(s, `${co.name} cut ties with ${sc.name}.`, 'biz'); }
  if (v.ride) { if (chance(s, 0.5)) { co.rep = clamp(co.rep - 8, 0, 100); co.fame = clamp(co.fame - 3, 0, 100); if (!co.roster.some((a) => a.id === sc.id)) co.slate.forEach((p) => (p.troubled = true)); } else { co.fame = clamp(co.fame + 5, 0, 100); if (who && who.fame != null) who.fame = clamp(who.fame + 6, 0, 100); } log(s, `${co.name} rode out the ${sc.name} scandal.`, 'biz'); }
  P.scandal = null;
}

// ---------- status for the UI ----------
const planOpts = (co) => MEDIA_PLANS.map((x) => ({ id: x.id, icon: x.icon, name: x.name, desc: x.desc, scandalPct: Math.round(Math.min(0.2, 0.05 * x.scandal) * 1000) / 10, score: x.score + (x.fresh > 0 ? 0 : 0), revenue: Math.round((x.rev - 1) * 100), reputation: Math.round((x.rep - 1) * 100), budget: Math.round((x.cost - 1) * 100), slots: x.slots }));
const coStatus = (s, co) => { const m = co.medium, d = med(m), cap = Math.min(co.policy.slots, slotsOf(co)); const plan = { needed: !co.strategy, current: co.strategy || null, effective: planOfCo(co).id, options: planOpts(co) };
  return { plan, id: co.id, medium: m, name: co.name, icon: d.icon, kind: d.name, unit: d.unit, unitPlural: d.unitPlural, cash: R(co.cash), rep: R(co.rep), fame: R(co.fame), value: valueOf(co), founded: co.founded, quality: R(crewQuality(co)), payroll: payroll(co), slots: cap, maxSlots: maxSlots(co), policy: { ...co.policy },
    crew: co.crew.map((c) => ({ ...c, roleName: d.roles.find((r) => r.id === c.role).name, icon: d.roles.find((r) => r.id === c.role).icon, trainCost: R(5000 + c.skill * 400), trained: c.trained === age(s) })), roster: co.roster.map((a) => ({ ...a, advance: advanceOf(a) })),
    slate: co.slate.map((p) => ({ ...p, expected: score(s, co, p, false), marketingLabel: (MARKETING[p.marketing] || MARKETING.none).label })), offers: (co.offers || []).map((o) => ({ ...o })), franchises: Object.values(co.fran || {}).map((f) => ({ ...f, ready: sequelReady(f), inProduction: co.slate.some((p) => p.fid === f.id) })), marketing: Object.values(MARKETING).map((x) => ({ ...x, amount: 0 })), released: co.released.slice().reverse(), tail: co.tail.reduce((a, t) => a + t.per, 0), totals: { ...co.totals }, last: co.lastYear, hist: co.hist,
    market: { crew: co.market.crew.map((c) => ({ ...c, roleName: d.roles.find((r) => r.id === c.role).name, fee: R(c.wage * C().crewWage.signFrac) })), artists: co.market.artists.map((a) => ({ ...a, cost: signCost(a), advance: advanceOf(a) })) }, tiers: C().tiers.map((t, i) => ({ ...t, cost: d.tiers[i], locked: co.rep < t.repNeed })), genres: trends(s, m), roles: d.roles, scandal: s.prod.scandal && s.prod.scandal.medium === m ? s.prod.scandal : null }; };
export function status(s) {
  const P = ensure(s), a = age(s);
  return { age: a, locked: a < 18, cash: R(s.cash), media: MEDIA.map((m) => ({ id: m, ...med(m), owned: !!P.cos[m], found: med(m).found, company: P.cos[m] ? coStatus(s, P.cos[m]) : null, pitches: pitchesOf(s, m).map((p) => ({ ...p, genreName: genresOf(m).find((g) => g.id === p.genre).name, min: R(p.ask * 0.1), heat: R(heat(s, m, p.genre)) })), trends: trends(s, m) })),
    stakes: P.stakes.map((x) => ({ ...x, share: x.share })), backed: P.stakes.reduce((t, x) => t + x.invested, 0), royalties: P.stakes.reduce((t, x) => t + x.income, 0), value: value(s) };
}
export const headline = (s) => null;
// Businesses integration: each company shows up in "Your businesses" next to shops and studios (read-only summary; manage it in Production Companies).
export function ownedRecords(s) {
  if (!s.prod) return []; return Object.values(s.prod.cos).map((co) => { const d = med(co.medium); return { id: 'prod_' + co.medium, prodco: co.medium, name: co.name, type: 'prodco_' + co.medium, typeName: d.name, kind: 'prodco', icon: d.icon, rep: R(co.rep), staff: co.crew.length + co.roster.length, profit: co.lastYear ? co.lastYear.profit : 0, revenue: co.lastYear ? co.lastYear.revenue : 0, valuation: valueOf(co), trust: false, fleet: false, editor: false }; });
}
