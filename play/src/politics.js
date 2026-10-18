// Politics career: elected offices (council, school board, sheriff, mayor, congress, governor, senate, president), judge track (appointed), per-country equivalents,
// campaigns (platform, budget, donors, 4 trick questions, shady money), press digging up your past (incl. old social posts), favors owed, scandals, a simple presidential war,
// and a royalty side (born or marry into a throne, duties, succession). Data: data/politics.json, state: s.pol / s.royal.
import { D } from './data.js';
import { rnd, rint, pick, chance, clamp, gauss } from './rng.js';
import { log, earn, spend, addStat } from './core.js';
import * as Skills from './skills.js';
import * as Social from './social.js';
import * as Scholar from './scholarships.js';
import * as Crime from './crime.js';
import * as P from './people.js';
import * as Ev from './events.js';

const C = () => D.politics, TAX = 0.22, age = (s) => Math.floor(s.age);
const money = (n) => '$' + Math.round(n).toLocaleString('en-US');
export const slotDef = (id) => C().slots.find((x) => x.id === id);
export const titleOf = (s, id) => (C().titles[s.country] || C().titles.us)[id];
export const monarchy = (s) => C().monarchies[s.country] || null;
export const ensure = (s) => { if (!s.pol) s.pol = { office: null, tier: 0, history: [], judgeYears: 0, campaign: null, favors: [], heat: 0, last: null, runYear: -1, wins: 0, runs: 0, losses: 0, terms: {}, acted: {}, war: null, dynasty: false, scandals: [], enemies: 0 }; return s.pol; };
// small local RNG for odds previews: never touches the game RNG
const lr = (seed) => { let a = seed | 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const lg = (r) => { let u = 0; for (let i = 0; i < 6; i++) u += r(); return (u - 3) / 0.7; };
const hashStr = (str) => { let h = 2166136261; for (const c of str) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h | 0; };
const degrees = (s) => (s.sl && s.sl.edu && s.sl.edu.degrees) || {};
export const hasLaw = (s) => !!degrees(s).law_school;
const polsci = (s) => degrees(s).university && degrees(s).university.major === 'Political Science';

// ---------- strength: how well known, liked, schooled and skilled you are ----------
export function familyFame(s) { const p = ensure(s); return clamp(Scholar.familyScore(s) * 0.5 + (p.dynasty ? 0.5 : 0) + (s.royal ? 0.3 : 0), 0, 1); }
export function strengthOf(s, slot) {
  const p = ensure(s), so = Social.ensure(s), sk = (Skills.get(s, 'people') + Skills.get(s, 'leadership') + Skills.get(s, 'confidence')) / 3;
  const parts = { known: s.stats.fame * 0.22, family: familyFame(s) * 14, reputation: so.reputation * 0.12 + s.stats.karma * 0.05 - (s.record && s.record.sentences ? 6 : 0), degrees: Math.min(3, s.edu) * 3 + (hasLaw(s) ? 4 : 0) + (polsci(s) ? 3 : 0), skills: sk * 0.14 + s.stats.smarts * 0.04, following: Math.min(10, Math.log10(Social.totalFollowers(s) + 1) * 2), incumbent: p.office && p.office.slot === slot ? 8 : 0 };
  parts.total = Object.values(parts).reduce((a, b) => a + b, 0); return parts;
}
const oppStrength = (o) => o.fame * 0.22 + o.family * 14 + o.rep * 0.12 + o.edu * 3 + o.skill * 0.14 + o.camp * 0.35 + (o.incumbent ? 8 : 0);
export function genOpponents(r, def, n) {
  const names = C().opponentNames.slice(), out = [], t = def.tier;
  for (let i = 0; i < n; i++) { const nm = names.splice(Math.floor(r() * names.length), 1)[0] || 'Candidate ' + i, o = { name: nm, party: C().party[Math.floor(r() * 4)], fame: clamp(8 + t * 11 + lg(r) * 9, 0, 95), family: clamp(r() * 0.8, 0, 1), rep: clamp(46 + lg(r) * 12, 5, 95), edu: clamp(Math.round(0.8 + t * 0.35 + r() * 1.2), 0, 3), skill: clamp(24 + t * 8 + lg(r) * 9, 5, 95), camp: clamp(38 + t * 9 + lg(r) * 10, 5, 92), money: Math.round((20 + r() * 80) * 1000 * t * t), incumbent: i === 0 && r() < 0.35 }; o.score = oppStrength(o); out.push(o); }
  return out;
}
const eduLabel = (n) => ['none', 'high school', 'college', 'graduate'][n] || '';
export function eligible(s, slot) {
  const def = slotDef(slot), p = ensure(s), a = age(s); if (!def) return 'Unknown office.'; if (s.royal && s.royal.role) return 'Royals stay out of party politics.';
  if (p.office && p.office.slot === slot && def.kind === 'appointed') return 'You already hold this seat.'; if (s.prison) return 'Not from prison.'; if (a < def.minAge) return `Must be ${def.minAge}+.`; if (s.school === 'primary' || s.school === 'high') return 'Finish school first.';
  if (def.clean && s.record && s.record.sentences) return 'Needs a clean record.'; if (def.degree && !degrees(s)[def.degree]) return 'Needs a law degree (Education > Law School).';
  if (p.tier < def.needTier && !(slot === 'president' && s.stats.fame >= 70)) return `Needs experience: hold a tier ${def.needTier} office first.`;
  if (def.years && p.judgeYears < def.years) return `Needs ${def.years} years on the bench (${p.judgeYears} so far).`;
  if (def.termLimit && (p.terms[slot] || 0) >= def.termLimit) return 'Term limit reached.'; if (p.office && p.office.slot === slot && p.office.termEnd > s.age + (def.term > 2 ? 1 : 0.1) && def.kind === 'election') return 'Your term runs longer.';
  if (p.war && slot === 'president') return 'Not during a war.'; if (p.runYear === a && def.kind === 'election') return 'One campaign a year.'; return '';
}
// MC odds with a preview rng (opponents are stable per (seed, slot, age))
export function odds(s, slot, camp) {
  const def = slotDef(slot), p = ensure(s); if (def.kind === 'appointed') return Math.round(appointP(s, slot) * 100);
  const r = lr(s.rs ^ hashStr(slot) ^ (age(s) * 7919)), opps = camp ? camp.opponents : genOpponents(r, def, def.cand - 1), me = strengthOf(s, slot).total + (camp ? camp.score * 0.35 : 40 * 0.35 * 0.5), rr = lr(hashStr(slot) ^ 99); let win = 0; const N = 300;
  for (let i = 0; i < N; i++) { const sc = (x) => x + lg(rr) * 6; const mine = sc(me); let better = 0; for (const o of opps) if (sc(o.score) > mine) better++; if (better < def.seats) win++; }
  return Math.round((win / N) * 100);
}
export function appointP(s, slot) { const def = slotDef(slot), so = Social.ensure(s); return clamp(0.25 + so.reputation / 250 + s.stats.smarts / 330 + familyFame(s) * 0.12 + (def.tier - 2) * -0.06 + (hasLaw(s) ? 0.1 : 0) - (s.record && s.record.sentences ? 0.3 : 0) - dirtRisk(s) * 0.05, 0.03, 0.85); }

// ---------- what the press can dig up ----------
export function dirtList(s) {
  const so = Social.ensure(s), p = ensure(s), out = [];
  if (s.record && s.record.sentences) out.push({ id: 'record', text: `A criminal record (${s.record.sentences} sentence${s.record.sentences > 1 ? 's' : ''}).`, sev: 6 });
  for (const x of so.archive) out.push({ id: 'post:' + x.type + ':' + Math.floor(x.age), text: `An old ${x.name.toLowerCase()} post from age ${Math.floor(x.age)}.`, sev: x.sev * 2, social: true });
  if (so.cancels) out.push({ id: 'cancel', text: `You were cancelled online ${so.cancels} time${so.cancels > 1 ? 's' : ''}.`, sev: 3 * so.cancels });
  for (const sc of p.scandals) out.push({ id: 'scandal:' + sc.id, text: sc.text, sev: sc.sev });
  if (s.debt > 200000) out.push({ id: 'debt', text: 'Crushing personal debt.', sev: 2 });
  return out;
}
const dirtRisk = (s) => dirtList(s).reduce((a, d) => a + d.sev, 0);

// ---------- campaign ----------
export const camp = (s) => ensure(s).campaign;
export function startCampaign(s, slot) {
  const p = ensure(s), def = slotDef(slot), why = eligible(s, slot); if (why) return { ok: false, msg: why }; if (def.kind !== 'election') return { ok: false, msg: 'This seat is by appointment: apply instead.' }; if (p.campaign) return { ok: false, msg: 'You are already campaigning.' }; if (s.cash < def.filing) return { ok: false, msg: `Filing fee ${money(def.filing)}.` };
  s.cash -= def.filing; p.campaign = { slot, platform: null, budget: 0, spent: 0, answers: [], qs: shuffle(s, C().questions).slice(0, 4).map((q) => q.id), donors: [], offers: genDonors(s, def), shady: {}, spun: false, opponents: genOpponents(lr(s.rs ^ hashStr(slot) ^ (age(s) * 31 + 5)), def, def.cand - 1), score: 0, age: s.age }; s.flags.pol_running = 1;
  log(s, `I filed to run for ${titleOf(s, slot)}.`, 'career'); recompute(s); return { ok: true, msg: `Campaign started for ${titleOf(s, slot)}.` };
}
const shuffle = (s, a) => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(rnd(s) * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
function genDonors(s, def) { const out = []; for (let i = 0; i < 3; i++) { const t = pick(s, C().donors), amt = Math.round(def.filing * 6 * t.mult * (0.6 + rnd(s) * 0.9) / 100) * 100 + 500 * def.tier; out.push({ type: t.type, name: pick(s, t.names), amount: amt, favor: pick(s, t.favors) }); } return out; }
export function setPlatform(s, id) { const c = camp(s); if (!c) return { ok: false, msg: 'No campaign.' }; const pl = C().platforms.find((x) => x.id === id); if (!pl) return { ok: false, msg: 'Unknown platform.' }; c.platform = id; recompute(s); return { ok: true, msg: `Platform: ${pl.name}.` }; }
export function addBudget(s, amt) { const c = camp(s); if (!c) return { ok: false, msg: 'No campaign.' }; amt = Math.round(amt); if (amt <= 0 || s.cash < amt) return { ok: false, msg: 'Not enough cash.' }; s.cash -= amt; c.budget += amt; c.spent += amt; recompute(s); return { ok: true, msg: `Added ${money(amt)} to the campaign budget.` }; }
export function takeDonor(s, i) { const c = camp(s); if (!c) return { ok: false, msg: 'No campaign.' }; const d = c.offers[i]; if (!d) return { ok: false, msg: 'Gone.' }; if (c.donors.length >= 3) return { ok: false, msg: 'Three donors is plenty.' }; c.offers.splice(i, 1); c.donors.push(d); c.budget += d.amount; recompute(s); return { ok: true, msg: `${d.name} gave ${money(d.amount)}. They will want ${C().favorKinds[d.favor]} later.` }; }
export function answer(s, ch) { const c = camp(s); if (!c) return { ok: false, msg: 'No campaign.' }; if (c.answers.length >= 4) return { ok: false, msg: 'All questions answered.' }; const q = C().questions.find((x) => x.id === c.qs[c.answers.length]), a = q.choices[ch]; if (!a) return { ok: false, msg: 'Pick an answer.' };
  if (a.cost.cash && s.cash < -a.cost.cash) { /* cost taken as debt-free: skip if broke */ } c.answers.push({ q: q.id, ch, points: a.points }); if (a.cost.cash) spend(s, -a.cost.cash); if (a.cost.rep) Social.ensure(s).reputation = clamp(Social.ensure(s).reputation + a.cost.rep, 0, 100); if (a.cost.karma) addStat(s, 'karma', a.cost.karma);
  if (a.scandal && chance(s, a.scandal)) ensure(s).scandals.push({ id: 'q' + c.answers.length + s.turns, text: `Your answer on "${q.text.slice(0, 30)}…" was fact-checked and found false.`, sev: 4 }); recompute(s); return { ok: true, msg: `${a.points} campaign points. Cost: ${Object.entries(a.cost).filter(([, v]) => v).map(([k, v]) => `${k} ${v}`).join(', ') || 'none'}.` }; }
export function shady(s, kind) { const c = camp(s); if (!c) return { ok: false, msg: 'No campaign.' }; const K = { payoff: { cost: 10000, pts: 12, risk: 0.3, name: 'a payoff to an election official' }, votes: { cost: 25000, pts: 18, risk: 0.5, name: 'vote buying' } }[kind]; if (!K) return { ok: false, msg: 'Unknown.' }; if (c.shady[kind]) return { ok: false, msg: 'Already done.' }; if (s.cash < K.cost) return { ok: false, msg: `Costs ${money(K.cost)}.` };
  s.cash -= K.cost; c.shady[kind] = 1; addStat(s, 'karma', -10); recompute(s); return { ok: true, msg: `You arranged ${K.name}. It could leak.` }; }
export function spin(s) { const c = camp(s); if (!c) return { ok: false, msg: 'No campaign.' }; if (c.spun) return { ok: false, msg: 'Already hired a spin team.' }; const cost = 4000 * slotDef(c.slot).tier; if (s.cash < cost) return { ok: false, msg: `Costs ${money(cost)}.` }; s.cash -= cost; c.spun = true; return { ok: true, msg: 'The spin team will soften whatever the press finds.' }; }
export function withdraw(s) { const p = ensure(s); if (!p.campaign) return { ok: false, msg: 'No campaign.' }; p.campaign = null; delete s.flags.pol_running; return { ok: true, msg: 'You withdrew. The filing fee is gone.' }; }
export function recompute(s) {
  const c = camp(s); if (!c) return; const def = slotDef(c.slot), pl = C().platforms.find((x) => x.id === c.platform);
  const platform = pl ? 4 + pl.fit[c.slot] * 3 : 0, scale = 4000 * def.tier * def.tier + 2000, budgetPts = 25 * (1 - Math.exp(-c.budget / scale)), ans = c.answers.reduce((a, x) => a + x.points, 0) * 1.0, shadyPts = (c.shady.payoff ? 12 : 0) + (c.shady.votes ? 18 : 0);
  c.parts = { platform: Math.round(platform), budget: Math.round(budgetPts), answers: Math.round(ans), shady: shadyPts, charisma: Math.round((Skills.get(s, 'people') + Skills.get(s, 'confidence')) / 20 + s.stats.looks / 25) }; c.score = clamp(Object.values(c.parts).reduce((a, b) => a + b, 0), 0, 100);
}
export function campaignStatus(s) {
  const c = camp(s); if (!c) return null; const def = slotDef(c.slot), qid = c.qs[c.answers.length], q = qid ? C().questions.find((x) => x.id === qid) : null; const st = strengthOf(s, c.slot);
  return { slot: c.slot, title: titleOf(s, c.slot), platform: c.platform, platforms: C().platforms.map((p) => ({ id: p.id, name: p.name, icon: p.icon, fit: p.fit[c.slot], current: c.platform === p.id })), budget: Math.round(c.budget), score: Math.round(c.score), parts: c.parts, offers: c.offers, donors: c.donors, answered: c.answers.length, question: q ? { text: q.text, choices: q.choices.map((x) => ({ label: x.label, points: x.points, cost: x.cost })) } : null, shady: c.shady, spun: c.spun, odds: odds(s, c.slot, c), base: Math.round(st.total), baseParts: st, opponents: c.opponents.map((o) => ({ name: o.name, party: o.party, fame: Math.round(o.fame), rep: Math.round(o.rep), edu: eduLabel(o.edu), skill: Math.round(o.skill), strength: Math.round(o.score), incumbent: o.incumbent })), dirt: dirtList(s), ready: c.answers.length === 4 && !!c.platform, cash: Math.round(s.cash), seats: def.seats };
}
// ---------- election day ----------
export function launch(s) {
  const p = ensure(s), c = p.campaign; if (!c) return { ok: false, msg: 'No campaign.' }; if (!c.platform) return { ok: false, msg: 'Pick a platform first.' }; if (c.answers.length < 4) return { ok: false, msg: 'Answer the four press questions first.' };
  const def = slotDef(c.slot); recompute(s); const press = []; let pen = 0;
  for (const d of dirtList(s)) { const find = clamp((0.3 + 0.08 * def.tier) * (c.spun ? 0.6 : 1) * (d.social ? 1.4 : 1), 0, 0.95); if (chance(s, find)) { press.push(d.text); pen += d.sev * (c.spun ? 0.6 : 1); if (d.social) Social.ensure(s).reputation = clamp(Social.ensure(s).reputation - 3, 0, 100); } }
  // shady money: investigation risk
  let busted = false, prosecuted = false; for (const [k, risk] of [['payoff', 0.3], ['votes', 0.5]]) if (c.shady[k] && chance(s, risk)) { busted = true; press.push(k === 'payoff' ? 'LEAK: a payoff to an election official.' : 'LEAK: vote-buying records.'); pen += 14; p.heat += 20; }
  if (busted && chance(s, 0.55)) prosecuted = true;
  const me = strengthOf(s, c.slot).total + c.score * 0.35 - pen, sc = (x) => x + gauss(s) * 6, mine = sc(me), field = c.opponents.map((o) => ({ ...o, r: sc(o.score) })); const better = field.filter((o) => o.r > mine).length, won = better < def.seats && !prosecuted;
  const res = { slot: c.slot, title: titleOf(s, c.slot), won, rank: better + 1, seats: def.seats, me: Math.round(mine), press, busted, prosecuted, field: field.sort((a, b) => b.r - a.r).slice(0, 5).map((o) => ({ name: o.name, score: Math.round(o.r) })), age: age(s), odds: odds(s, c.slot, c) };
  p.runYear = age(s); p.runs++; p.last = res; p.campaign = null; delete s.flags.pol_running; if (c.donors.length) for (const d of c.donors) p.favors.push({ donor: d.name, kind: d.favor, dueAge: s.age + rint(s, 1, 3), amount: d.amount });
  if (won) { holdOffice(s, c.slot); res.msg = `You won: ${titleOf(s, c.slot)}!`; } else { p.losses++; addStat(s, 'happiness', -8); addStat(s, 'fame', 1); res.msg = prosecuted ? 'The vote-buying scandal ended your run.' : `You lost (finished #${better + 1}).`; log(s, `I lost the race for ${titleOf(s, c.slot)}${busted ? ' amid a vote-buying leak' : ''}.`, 'career'); }
  if (prosecuted) { Crime.arrest(s, 'corruption', false); res.msg += ' You were prosecuted.'; } else if (busted) Ev.queue(s, 'pol_leak');
  return { ok: true, msg: res.msg, won, result: res };
}
export function holdOffice(s, slot) {
  const p = ensure(s), def = slotDef(slot), was = p.office && p.office.slot === slot; if (p.office && !was) p.history.push({ slot: p.office.slot, title: p.office.title, from: p.office.since, to: s.age, how: 'moved on' });
  p.office = { slot, title: titleOf(s, slot), since: was ? p.office.since : s.age, termEnd: s.age + def.term, approval: was ? p.office.approval : 55 }; p.terms[slot] = (p.terms[slot] || 0) + 1; p.tier = Math.max(p.tier, def.tier); p.wins++; if (def.kind === 'appointed') p.office.approval = 60; addStat(s, 'fame', def.tier * 2.5); addStat(s, 'happiness', 8); s.flags.pol_office = 1;
  log(s, `I became ${titleOf(s, slot)}${was ? ' again' : ''}.`, 'career');
}
// judges: apply for an appointment
export function applyJudge(s, slot) {
  const def = slotDef(slot), why = eligible(s, slot); if (why) return { ok: false, msg: why }; if (def.kind !== 'appointed') return { ok: false, msg: 'This seat is elected.' }; const p = ensure(s); if (p.acted['judge' + slot]) return { ok: false, msg: 'You applied this year.' }; p.acted['judge' + slot] = 1; const pr = appointP(s, slot); const press = [];
  if (def.tier >= 3) for (const d of dirtList(s)) if (chance(s, 0.4)) press.push(d.text);
  if (chance(s, pr - press.length * 0.05)) { holdOffice(s, slot); return { ok: true, won: true, msg: `Confirmed as ${titleOf(s, slot)}!`, press }; } log(s, `My nomination for ${titleOf(s, slot)} was turned down.`, 'career'); return { ok: true, won: false, msg: 'Not confirmed.', press };
}
// ---------- in office ----------
export function govern(s, how) {
  const p = ensure(s), o = p.office; if (!o) return { ok: false, msg: 'You hold no office.' }; if (p.acted.govern) return { ok: false, msg: 'One big decision a year.' }; p.acted.govern = 1; const so = Social.ensure(s);
  if (how === 'popular') { o.approval = clamp(o.approval + 6, 0, 100); return { ok: true, msg: 'A popular bill: approval +6.' }; }
  if (how === 'townhall') { o.approval = clamp(o.approval + 3, 0, 100); so.reputation = clamp(so.reputation + 3, 0, 100); return { ok: true, msg: 'Town hall: approval +3, reputation +3.' }; }
  if (how === 'deal') { earn(s, 30000 * (slotDef(o.slot)||{tier:3}).tier); p.heat += 8; addStat(s, 'karma', -6); return { ok: true, msg: 'A backroom deal paid you well. Investigators may notice.' }; }
  return { ok: false, msg: 'Unknown.' };
}
export function grantFavor(s, i, grant) { const p = ensure(s), f = p.favors[i]; if (!f) return { ok: false, msg: 'None.' }; p.favors.splice(i, 1); if (grant) { p.heat += 8; addStat(s, 'karma', -4); return { ok: true, msg: `You delivered ${C().favorKinds[f.kind]} for ${f.donor}.` }; } p.enemies++; if (p.office) p.office.approval = clamp(p.office.approval - 4, 0, 100); return { ok: true, msg: `${f.donor} is furious.` }; }
export function rule(s, i) { const p = ensure(s), o = p.office; if (!o || (slotDef(o.slot)||{}).kind !== 'appointed') return { ok: false, msg: 'Only judges rule on cases.' }; if (p.acted.case) return { ok: false, msg: 'One landmark case a year.' };
  const cs = p.case || (p.case = pick(s, C().cases)), c = cs.choices[i]; if (!c) return { ok: false, msg: 'Pick a ruling.' }; p.acted.case = 1; p.case = null; Social.ensure(s).reputation = clamp(Social.ensure(s).reputation + c.rep, 0, 100); o.approval = clamp(o.approval + c.approval, 0, 100); if (c.cash) { earn(s, c.cash); p.heat += 10; } return { ok: true, msg: `Ruling: ${c.label}.` }; }
export function caseNow(s) { const p = ensure(s); if (!p.office || !slotDef(p.office.slot) || slotDef(p.office.slot).kind !== 'appointed') return null; if (!p.case) p.case = C().cases[Math.abs((s.rs | 0) + age(s)) % C().cases.length]; return { text: p.case.text, choices: p.case.choices.map((c) => ({ label: c.label })) }; }
export function resign(s) { const p = ensure(s); if (!p.office) return { ok: false, msg: 'Nothing to resign.' }; p.history.push({ slot: p.office.slot, title: p.office.title, from: p.office.since, to: s.age, how: 'resigned' }); log(s, `I resigned as ${p.office.title}.`, 'career'); p.office = null; delete s.flags.pol_office; return { ok: true, msg: 'You resigned.' }; }
// ---------- war (presidents/prime ministers; deliberately simple) ----------
export function declareWar(s) { const p = ensure(s), o = p.office; if (!o || o.slot !== 'president') return { ok: false, msg: 'Only the head of government can declare war.' }; if (p.war) return { ok: false, msg: 'Already at war.' }; const foe = pick(s, C().foes); p.war = { foe, progress: 0, years: 0, level: 2, toll: 0 }; o.approval = clamp(o.approval + 6, 0, 100); log(s, `I declared war on ${foe}.`, 'career'); return { ok: true, msg: `War with ${foe}. Set the military budget each year and seek peace when you can.` }; }
export function warBudget(s, lvl) { const p = ensure(s); if (!p.war) return { ok: false, msg: 'Not at war.' }; p.war.level = clamp(lvl, 1, 3); return { ok: true, msg: 'Military budget: ' + ['', 'low', 'medium', 'high'][p.war.level] }; }
export function makePeace(s) { const p = ensure(s), w = p.war; if (!w) return { ok: false, msg: 'Not at war.' }; const good = w.progress >= 0; if (p.office) p.office.approval = clamp(p.office.approval + (good ? 10 : -6), 0, 100); log(s, `I signed a peace deal with ${w.foe}.`, 'career'); p.war = null; return { ok: true, msg: good ? 'A peace deal on good terms.' : 'Peace on bad terms.' }; }
function warYear(s) { const p = ensure(s), w = p.war; if (!w) return; if (!p.office || p.office.slot !== 'president') { p.war = null; return; } w.years++; const step = (w.level - 1.6) * 14 + gauss(s) * 14; w.progress = clamp(w.progress + step, -100, 100); w.toll += Math.round(w.level * 8 + rnd(s) * 10); p.office.approval = clamp(p.office.approval - 3 - w.toll / 60 + (step > 0 ? 2 : -2), 0, 100); addStat(s, 'stress', 5);
  if (w.progress >= 100) { log(s, `We won the war against ${w.foe}.`, 'career'); p.office.approval = clamp(p.office.approval + 20, 0, 100); addStat(s, 'fame', 8); p.war = null; } else if (w.progress <= -100) { log(s, `We lost the war against ${w.foe}.`, 'career'); p.office.approval = clamp(p.office.approval - 25, 0, 100); p.war = null; } else log(s, `War update: ${w.foe}, ${w.progress >= 0 ? 'advancing' : 'retreating'} (${Math.round(w.progress)}).`, 'career'); }
// ---------- royalty ----------
const roy = (s) => s.royal;
function royalName(s, male, jp) { const N = C().royal.names; return pick(s, male ? (jp ? N.jp_male : N.male) : (jp ? N.jp_female : N.female)); }
export function bornRoyal(s) {
  const m = monarchy(s); if (!m) return false; const jp = s.country === 'jp', rank = 2 + (hashStr('r' + s.rs) & 1), g = s.gender === 'male';
  s.royal = { house: m.house, role: g ? 'prince' : 'princess', born: true, line: [{ name: royalName(s, true, jp), age: 62 + rint(s, 0, 10), rel: 'monarch' }, ...(rank > 2 ? [{ name: royalName(s, false, jp), age: 30 + rint(s, 0, 8), rel: 'elder sibling' }] : [])], popularity: 62, rank, duties: 0 };
  s.royal.line[0].name += ' ' + (jp ? '' : 'III'); s.flags.royal = 1; log(s, `I was born into ${m.house}. I am ${rank === 2 ? 'next in line' : 'third in line'} to the throne.`, 'life'); return true;
}
export function marryRoyal(s) {
  const m = monarchy(s); if (!m || s.royal) return false; const jp = s.country === 'jp', sp = P.newPerson(s, 'spouse', { age: clamp(age(s) + rint(s, -3, 3), 20, 60), rich: true }); sp.married = true; sp.royal = true; s.people.push(sp);
  s.royal = { house: m.house, role: 'consort', consort: true, born: false, spouse: sp.name, line: [{ name: royalName(s, true, jp) + (jp ? '' : ' IV'), age: 58 + rint(s, 0, 10), rel: 'monarch' }, { name: sp.name, age: sp.age, rel: 'spouse (heir)' }], popularity: 55, rank: 3, duties: 0 }; s.flags.royal = 1; log(s, `I married ${sp.name} of ${m.house}. The cameras never left.`, 'life'); return true;
}
export function royalDuty(s, id) {
  const r = roy(s); if (!r) return { ok: false, msg: 'You are not royal.' }; if (r.duties >= 3) return { ok: false, msg: 'Three duties a year.' }; const d = C().royal.duties.find((x) => x.id === id); if (!d) return { ok: false, msg: 'Unknown duty.' }; r.duties++;
  addStat(s, 'fame', d.fame); addStat(s, 'karma', d.karma); addStat(s, 'stress', d.stress); if (chance(s, d.gaffe * (Social.ensure(s).archive.length ? 1.5 : 1))) { r.popularity = clamp(r.popularity - 6, 0, 100); return { ok: true, msg: `${d.name}: a gaffe. Popularity -6.` }; } r.popularity = clamp(r.popularity + d.pop, 0, 100); return { ok: true, msg: `${d.name}: popularity +${d.pop}.` };
}
function royalYear(s) {
  const r = roy(s); if (!r) return; const m = monarchy(s), allow = r.role === 'monarch' ? C().royal.allowance.monarch : r.rank === 2 ? C().royal.allowance.heir : r.consort ? C().royal.allowance.consort : C().royal.allowance.royal; earn(s, allow * (1 - TAX)); r.popularity = clamp(r.popularity - 3 + (r.duties >= 2 ? 3 : 0) + (r.role === 'monarch' ? 0 : 0), 0, 100); r.duties = 0;
  for (const n of r.line) n.age++; for (let i = r.line.length - 1; i >= 0; i--) { const n = r.line[i]; if (chance(s, P.npcDeathHazard({ age: n.age, health: 70 })) || (i === 0 && n.age > 84 && chance(s, 0.12))) { r.line.splice(i, 1); log(s, i === 0 && n.age > 84 ? `${n.name} abdicated.` : `${n.name} of ${r.house} died.`, 'life'); if (i === 0) addStat(s, 'happiness', -3); } }
  if (r.role !== 'monarch' && !r.consort && !r.line.length) { r.role = 'monarch'; r.rank = 1; const jp = s.country === 'jp', g = s.gender === 'male'; ensure(s).office = { slot: 'throne', title: g ? m.male : m.female, since: s.age, termEnd: 999, approval: r.popularity }; log(s, `I was crowned ${g ? m.male : m.female}.`, 'career'); addStat(s, 'fame', 20); void jp; }
  else if (r.role !== 'monarch' && !r.consort) r.rank = r.line.length + 1;
  if (r.role === 'monarch' && ensure(s).office) ensure(s).office.approval = r.popularity;
  if (r.popularity < 12 && r.role === 'monarch') { log(s, 'Public anger forced me to abdicate.', 'career'); ensure(s).office = null; s.royal = null; delete s.flags.royal; }
}
// ---------- yearly ----------
export function yearTick(s) {
  const p = ensure(s); p.acted = {}; p.case = p.case; p.runYear = p.runYear; const so = Social.ensure(s); void so;
  if (s.royal === undefined && age(s) <= 3) { s.royal = null; if (monarchy(s) && (hashStr('born' + s.rs) >>> 0) % 1000 < 25) bornRoyal(s); } else if (s.royal === undefined) s.royal = null;
  if (s.royal && s.royal.born === undefined) s.royal = null;
  if (s.royal) royalYear(s); else if (monarchy(s) && age(s) >= 20 && age(s) <= 42 && !P.partnerOf(s) && chance(s, 0.004)) Ev.queue(s, 'pol_royal_suitor');
  const o = p.office; if (!o || o.slot === 'throne') { p.heat = Math.max(0, p.heat - 4); return; }
  const def = slotDef(o.slot); earn(s, def.pay * (1 - TAX)); if (def.kind === 'appointed') p.judgeYears += 1;
  // approval drift: honesty, economy, stress, reputation
  const eco = s.market && s.market.sectors ? Object.values(s.market.sectors).reduce((a, x) => a + x.h, 0) / Object.keys(s.market.sectors).length : 50;
  o.approval = clamp(o.approval + (Social.ensure(s).reputation - 50) / 25 + (eco - 50) / 30 + (s.stats.karma - 50) / 40 + gauss(s) * 3 - (def.kind === 'appointed' ? 0 : 1), 0, 100);
  warYear(s); Social.ensure(s).reputation = clamp(Social.ensure(s).reputation + (o.approval - 50) / 40, 0, 100);
  for (const f of p.favors) if (f.dueAge <= s.age && !f.asked && !s.pending.some((q) => q.id === 'pol_favor')) { f.asked = 1; Ev.queue(s, 'pol_favor', { donor: f.donor, favor: C().favorKinds[f.kind] }); break; }
  if (p.heat > 15 && chance(s, clamp(p.heat / 220, 0, 0.35)) && !s.pending.some((q) => q.id === 'pol_leak')) { Ev.queue(s, 'pol_leak'); p.heat = Math.max(0, p.heat - 10); } p.heat = Math.max(0, p.heat - 3);
  if (def.kind === 'appointed' && o.approval < 20 && def.tier <= 2) { log(s, `I was removed from the bench.`, 'career'); p.history.push({ slot: o.slot, title: o.title, from: o.since, to: s.age, how: 'removed' }); p.office = null; delete s.flags.pol_office; return; }
  if (def.kind === 'election' && s.age >= o.termEnd) { p.history.push({ slot: o.slot, title: o.title, from: o.since, to: s.age, how: 'term ended' }); log(s, `My term as ${o.title} ended. Run again to keep the seat.`, 'career'); p.office = null; delete s.flags.pol_office; p.war = null; }
  else if (def.kind === 'election' && o.approval < 8) { log(s, `I was recalled from ${o.title}.`, 'career'); p.office = null; delete s.flags.pol_office; }
}
export function eventFx(s, o) {
  const p = ensure(s); if (o.approval && p.office) p.office.approval = clamp(p.office.approval + o.approval, 0, 100); if (o.heat) p.heat = Math.max(0, p.heat + o.heat); if (o.rep) Social.ensure(s).reputation = clamp(Social.ensure(s).reputation + o.rep, 0, 100); if (o.enemy) p.enemies++;
  if (o.prosecute && chance(s, o.prosecute)) Crime.arrest(s, 'corruption', false); if (o.resign) resign(s); if (o.royalSuitor) marryRoyal(s); if (o.royalPop && s.royal) s.royal.popularity = clamp(s.royal.popularity + o.royalPop, 0, 100);
  if (o.scandal) p.scandals.push({ id: 's' + s.turns, text: o.scandal, sev: 4 });
}
export const headline = (s) => { const p = s.pol; if (s.royal && s.royal.role === 'monarch' && p && p.office) return p.office.title; if (p && p.office) return p.office.title; if (s.royal) return s.royal.role === 'consort' ? 'Royal consort' : s.royal.role === 'monarch' ? 'Monarch' : 'Royal'; return null; };
export function status(s) {
  const p = ensure(s), a = age(s), o = p.office;
  return { age: a, cash: Math.round(s.cash), country: s.country, office: o ? { ...o, def: slotDef(o.slot) || null, yearsLeft: Math.max(0, Math.round((o.termEnd - s.age) * 10) / 10), approval: Math.round(o.approval) } : null, tier: p.tier, history: p.history, wins: p.wins, losses: p.losses, heat: Math.round(p.heat), favors: p.favors.map((f, i) => ({ i, donor: f.donor, what: C().favorKinds[f.kind], due: Math.max(0, Math.round((f.dueAge - s.age) * 10) / 10) })), last: p.last, war: p.war ? { ...p.war, progress: Math.round(p.war.progress) } : null, campaign: campaignStatus(s), reputation: Math.round(Social.ensure(s).reputation), fame: Math.round(s.stats.fame), familyFame: Math.round(familyFame(s) * 100), judgeYears: p.judgeYears, case: caseNow(s), dirt: dirtList(s), strength: Math.round(strengthOf(s, 'council').total),
    offices: C().slots.map((d) => { const why = eligible(s, d.id); return { id: d.id, title: titleOf(s, d.id), tier: d.tier, kind: d.kind, seats: d.seats, term: d.term, pay: d.pay, scope: d.scope, minAge: d.minAge, filing: d.filing, eligible: !why, why, odds: why ? null : odds(s, d.id), held: !!(o && o.slot === d.id) }; }), canDeclareWar: !!(o && o.slot === 'president'), done: { ...p.acted }, platforms: C().platforms.map((x) => ({ id: x.id, name: x.name, icon: x.icon })), monarchy: monarchy(s), pending: null };
}
export function royalStatus(s) {
  const r = roy(s), m = monarchy(s); const p = ensure(s);
  return { available: !!m, country: s.country, monarchy: m, royal: r ? { ...r, titleNow: r.role === 'monarch' ? (s.gender === 'male' ? m.male : m.female) : r.role === 'consort' ? (s.gender === 'male' ? m.consortM : m.consortF) : r.role === 'prince' ? 'Prince' : 'Princess', allowance: r.role === 'monarch' ? C().royal.allowance.monarch : r.rank === 2 ? C().royal.allowance.heir : r.consort ? C().royal.allowance.consort : C().royal.allowance.royal } : null, duties: C().royal.duties.map((d) => ({ id: d.id, name: d.name, icon: d.icon, pop: d.pop })), office: p.office && p.office.slot === 'throne' ? p.office : null };
}
