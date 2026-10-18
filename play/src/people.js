// People: family, friends, partners, exes, children, coworkers; name/country generation; interactions; yearly NPC life.
import { D } from './data.js';
import { rnd, rint, pick, gauss, chance, clamp, wpick } from './rng.js';
import { log, earn, spend, addStat, fill } from './core.js';
import * as Premium from './premium.js';

const L = () => D.life;
export const country = (s) => L().countries.find((c) => c.id === s.country) || L().countries[0];
export function genName(s, countryId, gender) {
  const c = L().countries.find((x) => x.id === countryId) || L().countries[0];
  return { first: pick(s, c.first[gender]), last: pick(s, c.last) };
}
export function newPerson(s, rel, o = {}) {
  const gender = o.gender || pick(s, L().genders), c = o.country || s.country;
  const nm = o.first ? { first: o.first, last: o.last || genName(s, c, gender).last } : genName(s, c, gender);
  const p = { id: s.nextId++, rel, first: nm.first, last: o.last || nm.last, name: nm.first + ' ' + (o.last || nm.last), gender, age: o.age ?? 30, alive: true, bar: o.bar ?? rint(s, 45, 80),
    health: rint(s, 40, 95), occ: null, edu: 1, city: o.city || s.city, country: c, cash: 0, kids: 0, married: false, since: s.age, met: s.age };
  const wealth = country(s).wealth, [lo, hi] = L().people.cashByWealth;
  p.cash = Math.round((lo + (hi - lo) * rnd(s) * rnd(s)) * wealth * (o.rich ? 8 : 1));
  refreshOcc(s, p); return p;
}
function refreshOcc(s, p) {
  p.edu = p.age < 18 ? 0 : chance(s, 0.35) ? 2 : chance(s, 0.9) ? 1 : 0;
  p.occ = p.age < 6 ? 'Toddler' : p.age < 18 ? 'Student' : p.age >= 66 ? 'Retired' : pick(s, L().occupations);
}
export const people = (s, rel) => s.people.filter((p) => (rel ? p.rel === rel : true));
export const living = (s, rel) => s.people.filter((p) => p.alive && (rel ? p.rel === rel : true));
export const byId = (s, id) => s.people.find((p) => p.id === id);
export const partnerOf = (s) => living(s, 'spouse')[0] || living(s, 'partner')[0] || null;
export const children = (s) => living(s, 'child');
export const friends = (s) => living(s, 'friend');
export const parents = (s) => s.people.filter((p) => p.rel === 'mother' || p.rel === 'father');
export function maritalOf(s) {
  if (living(s, 'spouse').length) return 'married';
  if (living(s, 'partner').length) return 'dating';
  if (s.people.some((p) => p.rel === 'spouse' && !p.alive)) return 'widowed';
  if (s.people.some((p) => p.rel === 'ex' && p.wasSpouse)) return 'divorced';
  return 'single';
}
export function initFamily(s, myAge) {
  const [lo, hi] = L().people.parentAgeAtBirth;
  const mAge = myAge + rint(s, lo, hi), fAge = myAge + rint(s, lo, hi + 4);
  const last = s.last;
  s.people.push(newPerson(s, 'mother', { gender: 'f', age: mAge, last, bar: rint(s, 60, 95) }), newPerson(s, 'father', { gender: 'm', age: fAge, last, bar: rint(s, 50, 90) }));
  const n = wpick(s, [0, 1, 2, 3], (k) => [0.3, 0.35, 0.25, 0.1][k]);
  for (let i = 0; i < n; i++) { const a = Math.max(0, myAge + rint(s, -6, 6)); s.people.push(newPerson(s, 'sibling', { age: a, last, bar: rint(s, 35, 80) })); }
  for (const p of parents(s)) { if (p.age > 85) p.alive = chance(s, 0.2); } // sandbox: old parents may be gone
  for (const p of s.people.filter((x) => x.rel === 'sibling')) p.alive = true;
}
export function newCoworkers(s) {
  s.people = s.people.filter((p) => p.rel !== 'coworker');
  if (!s.job) return;
  for (let i = 0; i < L().people.coworkers; i++) s.people.push(newPerson(s, 'coworker', { age: rint(s, 22, 60), bar: rint(s, 30, 60) }));
}
export function makeFriend(s, age) { const p = newPerson(s, 'friend', { age: age ?? Math.max(4, Math.round(s.age) + rint(s, -3, 3)), bar: rint(s, 40, 65) }); s.people.push(p); return p; }
export const adjustBar = (p, d) => { p.bar = clamp(p.bar + d, 0, 100); };

// ---- profile card ----
export function profile(s, p) {
  const kids = p.id === 'me' ? children(s).length + s.people.filter((x) => x.rel === 'child' && !x.alive).length : p.kids || 0;
  return {
    name: p.name, gender: p.gender === 'm' ? 'Male' : 'Female', age: Math.floor(p.age), marital: p.rel === 'spouse' ? 'Married' : p.rel === 'partner' ? 'Dating' : p.rel === 'ex' ? 'Single' : p.age < 18 ? 'Single (minor)' : p.married ? 'Married' : 'Single',
    children: kids, education: L().educations[p.edu ?? 0], occupation: p.occ, location: `${p.city || ''}, ${(L().countries.find((c) => c.id === p.country) || country(s)).name}`, status: p.alive ? 'Alive' : 'Deceased',
  };
}
export function myProfile(s) {
  const j = s.job && D.careers.find((c) => c.id === s.job.id);
  return { name: s.name, gender: s.gender === 'm' ? 'Male' : 'Female', age: Math.floor(s.age), marital: { single: 'Single', dating: 'Dating', married: 'Married', divorced: 'Divorced', widowed: 'Widowed' }[maritalOf(s)],
    children: s.people.filter((p) => p.rel === 'child').length, education: s.school === 'college' ? 'College (in progress)' : s.edu >= 3 ? 'Postgraduate' : L().educations[s.edu], occupation: s.prison ? 'Inmate' : s.pro ? 'Pro athlete' : j ? j.levels[s.job.level][0] : s.age < 6 ? 'Toddler' : s.school ? 'Student' : s.retired ? 'Retired' : 'Unemployed',
    location: `${s.city}, ${country(s).name}`, status: s.alive ? 'Alive' : 'Deceased' };
}

// ---- interactions ----
export const interactionsFor = (s, p) => (L().interactions[p.rel] || []).filter((i) => s.age >= (i.minAge || 0) && p.alive !== false);
const topic = (s) => pick(s, L().topics);
export function interact(s, pid, actId) {
  const p = byId(s, pid); if (!p || !p.alive) return { ok: false, msg: 'Not available.' };
  const a = (L().interactions[p.rel] || []).find((x) => x.id === actId); if (!a || s.age < (a.minAge || 0)) return { ok: false, msg: 'Not available.' };
  const key = 'p' + pid + a.id; if (s.acted[key]) return { ok: false, msg: 'Already did that this turn.' };
  if (a.cost && s.cash < a.cost) return { ok: false, msg: 'Cannot afford that.' };
  s.acted[key] = 1; p.talked = true; if (a.cost) s.cash -= a.cost;
  const ctx = { name: p.first, topic: topic(s), amount: '$0' };
  let msg, ok = true;
  const say = (arr) => fill(pick(s, arr), ctx);
  if (a.special) {
    const r = special(s, p, a, ctx); ok = r.ok; msg = r.msg;
  } else if (a.chance) {
    const pr = a.chance === 'bar' ? p.bar / 100 * 0.8 : a.chance === 'rich' ? clamp((p.bar / 100) * (p.cash > 5000 ? 0.9 : 0.4), 0.05, 0.9) : a.chance;
    ok = chance(s, pr);
    if (ok && a.id === 'askmoney') { const amt = Math.round(Math.min(p.cash * 0.2, 500 + rnd(s) * 3000)); p.cash -= amt; earn(s, amt); ctx.amount = '$' + amt.toLocaleString(); }
    if (a.mooch) s.tally.moochCount++;
    msg = say(ok ? a.ok : a.fail || a.ok); adjustBar(p, ok ? rint(s, 0, 4) : rint(s, -8, -3));
  } else {
    const d = rint(s, a.bar[0], a.bar[1]); adjustBar(p, d); msg = say(a.ok);
    if (a.gift) s.tally.giftCount++;
  }
  if (ok) { if (a.happy) addStat(s, 'happiness', a.happy); if (a.karma) addStat(s, 'karma', a.karma); if (a.stress) addStat(s, 'stress', a.stress); if (a.perf && s.job) s.job.perf = clamp(s.job.perf + a.perf, 0, 100); }
  if (a.id === 'insult' || a.id === 'argue') s.tally.arguments++;
  log(s, msg, 'rel'); return { ok, msg };
}
function special(s, p, a, ctx) {
  const fmt = (arr) => fill(pick(s, arr), ctx);
  const cfg = L().dating;
  switch (a.special) {
    case 'propose': {
      if (partnerOf(s)?.rel === 'spouse') return { ok: false, msg: 'Already married.' };
      const pr = clamp(p.bar / 100 - 0.1, 0.05, 0.95), ok = chance(s, pr);
      if (ok) { p.rel = 'spouse'; p.married = true; s.tally.spouses++; s.flags.engaged = 0; adjustBar(p, 10); addStat(s, 'happiness', 8); return { ok, msg: fmt(a.ok) }; }
      adjustBar(p, -8); return { ok, msg: fmt(a.fail) };
    }
    case 'moveIn': adjustBar(p, 6); return { ok: true, msg: fmt(a.ok) };
    case 'breakup': case 'divorce': {
      if (a.special === 'divorce') { const fee = Math.round(s.cash * cfg.divorceCostFrac); s.cash -= fee; p.cash += fee * 0.5; p.wasSpouse = true; s.tally.divorces++; }
      p.rel = 'ex'; p.married = false; p.bar = Math.min(p.bar, 25); addStat(s, 'happiness', -8); s.flags.pregnant = 0; return { ok: true, msg: fmt(a.ok) };
    }
    case 'baby': {
      if (Premium.isUnlocked('rabbit')) { const r = rabbitBirth(s); return { ok: true, msg: r.msg }; }
      if (s.flags.pregnant) return { ok: false, msg: 'A baby is already on the way.' };
      if (s.gender === p.gender && false) return { ok: false, msg: '' };
      const ok = chance(s, cfg.babyChance); if (ok) { s.flags.pregnant = 1; s.flags.pregnantAt = s.age; }
      return { ok, msg: ok ? 'I was told we were expecting a baby.' : fmt(a.ok) + ' Nothing came of it yet.' };
    }
    case 'cheat': { addStat(s, 'karma', -16); adjustBar(p, -16); s.tally.wickedActs++; s.tally.partners++; if (chance(s, 0.4)) { adjustBar(p, -30); return { ok: false, msg: 'I cheated on ' + p.first + ' and was caught within the week.' }; } return { ok: true, msg: fmt(a.ok) }; }
    case 'reconcile': {
      const ok = chance(s, p.bar / 100 * 0.6); if (ok) { p.rel = 'partner'; p.bar = 50; return { ok, msg: fmt(a.ok) }; } adjustBar(p, -4); return { ok, msg: fmt(a.fail) };
    }
    case 'flirt': {
      const ok = chance(s, p.bar / 100 * 0.6 + 0.1); if (ok) { if (partnerOf(s)) { addStat(s, 'karma', -8); } else { p.rel = 'partner'; s.tally.partners++; p.bar = 55; return { ok, msg: 'I started dating ' + p.first + ' from work.' }; } return { ok, msg: fmt(a.ok) }; }
      adjustBar(p, -12); addStat(s, 'karma', -4); if (s.job) s.job.perf = clamp(s.job.perf - 4, 0, 100); return { ok, msg: fmt(a.fail) };
    }
  }
  return { ok: false, msg: '' };
}
// ---- dating pool ----
export function refreshCandidates(s) {
  s.cand = [];
  if (s.age < L().dating.minAge) return;
  const lo = Math.max(L().dating.minAge, Math.floor(s.age) - 4), hi = Math.floor(s.age) + 5, adult = s.age >= 18;
  for (let i = 0; i < L().dating.candidates; i++) s.cand.push(newPerson(s, 'partner', { age: adult ? Math.max(18, rint(s, lo, hi)) : rint(s, lo, Math.min(hi, 17)), bar: L().dating.bar, rich: chance(s, 0.08) }));
}
export function dateCandidate(s, idx) {
  const c = s.cand[idx]; if (!c || partnerOf(s) || s.age < L().dating.minAge) return { ok: false, msg: 'Not possible right now.' };
  const ok = chance(s, clamp(0.35 + (s.stats.looks - 50) / 160 + (s.stats.happiness - 50) / 300, 0.1, 0.8));
  s.cand.splice(idx, 1);
  if (!ok) { addStat(s, 'happiness', -4); const m = `I asked ${c.first} out. ${c.gender === 'm' ? 'He' : 'She'} laughed and left.`; log(s, m, 'rel'); return { ok, msg: m }; }
  s.people.push(c); s.tally.partners++; const m = `I started dating ${c.name}, a ${c.occ.toLowerCase()} from ${c.city}.`; log(s, m, 'rel'); return { ok, msg: m };
}
// ---- yearly NPC life ----
export function npcDeathHazard(p) { return 0.00012 * Math.exp(0.09 * p.age) * (1.7 - p.health / 70); }
export function yearTick(s) {
  const dec = L().dating.barDecayPerYear;
  for (const p of s.people) {
    if (!p.alive) continue;
    p.age++; p.health = clamp(p.health + gauss(s) * 2 - (p.age > 50 ? 0.6 : 0), 0, 100);
    if (p.age === 18 || p.age === 6 || p.age === 66) refreshOcc(s, p);
    if (p.rel === 'child' && p.age >= 20 && p.age <= 40 && chance(s, 0.12)) p.kids++;
    if (p.rel === 'child' && p.age > 25 && !p.married && chance(s, 0.08)) p.married = true;
    // bar drift: neglect lowers relationships
    const d = dec[p.rel] || 0;
    if (d && !p.talked) adjustBar(p, -rnd(s) * d - (p.rel === 'spouse' || p.rel === 'partner' ? 0 : 0));
    else if (p.talked) adjustBar(p, 0); p.talked = false;
    if (npcDeathHazard(p) > rnd(s)) { p.alive = false; p.diedAt = s.age; npcDied(s, p); }
  }
  // partners/exes stale out
  for (const p of s.people) if (p.alive && p.rel === 'partner' && p.bar < L().dating.breakupBar && chance(s, 0.5)) { p.rel = 'ex'; log(s, `${p.first} broke up with me. ${p.gender === 'm' ? 'He' : 'She'} left a note and my hoodie.`, 'rel'); addStat(s, 'happiness', -8); }
  for (const p of s.people) if (p.alive && p.rel === 'spouse' && p.bar < L().dating.breakupBar && chance(s, 0.35)) { p.rel = 'ex'; p.wasSpouse = true; p.married = false; s.tally.divorces++; const fee = Math.round(s.cash * L().dating.divorceCostFrac); s.cash -= fee; log(s, `${p.first} divorced me. A lawyer took ${'$' + fee.toLocaleString()} for the trouble.`, 'rel'); addStat(s, 'happiness', -16); }
  // friendships
  if (s.age >= 4 && friends(s).length < L().people.friendMax && chance(s, L().people.friendsPerYear)) { const f = makeFriend(s); log(s, `I made a new friend named ${f.name}.`, 'rel'); }
  const fl = friends(s); if (fl.length && chance(s, 0.08)) { const f = pick(s, fl); f.rel = 'ex'; f.wasFriend = true; log(s, `${f.name} and I drifted apart.`, 'rel'); }
  // dating pool
  refreshCandidates(s);
  // pregnancy / birth
  const pr = partnerOf(s);
  if (s.flags.pregnant && s.age - s.flags.pregnantAt >= 0.75) birth(s, pr);
  else if (pr && s.age >= 18 && pr.age < 46 && !s.flags.pregnant && chance(s, L().dating.randomBirth * (pr.rel === 'spouse' ? 1.5 : 0.6))) { s.flags.pregnant = 1; s.flags.pregnantAt = s.age - 0.2; log(s, `${pr.first} told me we were expecting.`, 'rel'); }
}
function birth(s, pr) {
  s.flags.pregnant = 0;
  const kidLast = s.gender === 'm' || !pr ? s.last : s.last;
  const k = newPerson(s, 'child', { age: 0, last: kidLast, bar: 70, first: genName(s, s.country, pick(s, L().genders)).first });
  k.otherParent = pr ? pr.id : null; k.cash = 0; k.occ = 'Baby'; s.people.push(k);
  addStat(s, 'happiness', 16); log(s, `My ${k.gender === 'm' ? 'son' : 'daughter'} ${k.first} was born.`, 'rel');
}
function npcDied(s, p) {
  const kin = ['mother', 'father', 'sibling', 'spouse', 'child', 'partner', 'friend'].includes(p.rel);
  const label = { mother: 'my mother', father: 'my father', sibling: 'my ' + (p.gender === 'm' ? 'brother' : 'sister'), spouse: 'my spouse', child: 'my child', partner: 'my partner', friend: 'my friend', ex: 'my ex', coworker: 'a coworker' }[p.rel];
  log(s, `${p.name}, ${label}, died at ${Math.floor(p.age)}. I tried to be strong about it.`, 'death');
  if (p.rel === 'spouse') { s.flags.pregnant = 0; }
  if (kin) addStat(s, 'happiness', p.rel === 'child' || p.rel === 'spouse' ? -30 : p.rel === 'friend' ? -8 : -16);
  if (p.rel === 'mother' || p.rel === 'father' || p.rel === 'spouse') { addStat(s, 'stress', 8); }
}

// Premium "Rabbit Like": unlimited children - instant birth, no chance roll, no pregnancy block, twins/triplets possible.
export function rabbitBirth(s) {
  const pr = partnerOf(s), n = rnd(s) < 0.15 ? rint(s, 2, 3) : 1, kids = [];
  for (let i = 0; i < n; i++) { const k = newPerson(s, 'child', { age: 0, last: s.last, bar: 70, first: genName(s, s.country, pick(s, L().genders)).first }); k.otherParent = pr ? pr.id : null; k.cash = 0; k.occ = 'Baby'; s.people.push(k); kids.push(k); }
  addStat(s, 'happiness', 8 * n);
  const msg = n > 1 ? `I had ${n} babies at once: ${kids.map((k) => k.first).join(', ')}.` : `My ${kids[0].gender === 'm' ? 'son' : 'daughter'} ${kids[0].first} was born.`;
  log(s, msg, 'rel'); return { ok: true, msg, kids };
}
