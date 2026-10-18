// Team ownership: buy a fictional club in any coaching sport (no pack needed, age 18+). Per sport: its own set of 12 teams (each with an initial roll for
// strength, fans, finances, stadium condition) and its own 6-stat set the owner customises (stat weights when buying/any time, training focus, style).
// You choose team type (semi-pro/pro/elite) and the stadium's starting size and tier. You must hire staff (head coach, scout, medical, operations required;
// assistant and marketing optional): missing staff cuts performance, recruiting, injuries and finances. Payroll is paid from team cash; the owner can
// back shortfalls. Results evolve yearly: wins -> fans/attendance/revenue, upgrades. State: s.fr. Data: data/franchise.json, sports/styles from coaching.json.
import { D } from './data.js';
import { rnd, rint, pick, chance, clamp, gauss } from './rng.js';
import { log, earn } from './core.js';

const F = () => D.franchise, CO = () => D.coaching;
const age = (s) => Math.floor(s.age), R = Math.round;
const hashStr = (str) => { let h = 2166136261; for (const c of String(str)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
const lcg = (seed) => { let t = seed >>> 0; return () => { t += 0x6d2b79f5; let x = Math.imul(t ^ (t >>> 15), 1 | t); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; }; };
const gl = (r) => { let u = 0; for (let i = 0; i < 6; i++) u += r(); return (u - 3) / 0.7071; }; // ~N(0,1)
const money = (n) => '$' + R(n).toLocaleString('en-US');
export const MIN_AGE = 18;
export const ensure = (s) => { if (!s.fr) s.fr = { team: null, history: [] }; return s.fr; };
const sportDef = (id) => F().sports[id], coachSport = (id) => CO().sports[id];
const typeDef = (id) => F().types.find((t) => t.id === id), sizeDef = (id) => F().sizes.find((t) => t.id === id), tierDef = (id) => F().tiers.find((t) => t.id === id);
const sizeIdx = (id) => F().sizes.findIndex((x) => x.id === id), tierIdx = (id) => F().tiers.findIndex((x) => x.id === id);
const stadiumCost = (sizeId, tierId) => R(sizeDef(sizeId).cost * (1 + tierDef(tierId).cost));

// ---- the catalog: each team's initial roll is stable for this life (hash of the character + team), so listing never touches the game RNG
export function roll(s, teamId) {
  const r = lcg(hashStr(`${s.name}|${s.birthYear}|${teamId}`));
  return { str: +gl(r).toFixed(2), fans: +gl(r).toFixed(2), fin: +gl(r).toFixed(2), cond: clamp(R(62 + gl(r) * 14), 30, 95), debt: Math.max(0, +gl(r).toFixed(2)), rep: clamp(R(45 + gl(r) * 12), 15, 85) };
}
export function priceOf(s, teamId, typeId) { const t = typeDef(typeId), x = roll(s, teamId); return R(t.cost * clamp(1 + x.str * 0.12 + x.fans * 0.08 + x.fin * 0.05, 0.6, 1.6) / 1000) * 1000; }
export function catalog(s, sportId, typeId = 'pro') {
  const sp = sportDef(sportId); if (!sp) return []; const t = typeDef(typeId) || typeDef('pro'), owned = s.fr && s.fr.team;
  return sp.teams.map((tm) => { const x = roll(s, tm.id); return { id: tm.id, name: tm.name, city: tm.city, sport: sportId, price: priceOf(s, tm.id, t.id), strength: R(t.strength + x.str * 6), fans: R(t.fans * clamp(1 + x.fans * 0.2, 0.5, 1.8)), condition: x.cond, finances: x.fin >= 0.6 ? 'Healthy' : x.fin <= -0.6 ? 'Strained' : 'Stable', debt: R(t.cost * 0.08 * x.debt), rep: x.rep, taken: !!(owned && owned.id === tm.id) }; });
}

// ---- players and staff
const statIds = (sportId) => sportDef(sportId).stats.map((x) => x.id);
const wavg = (stats, w) => { let a = 0, b = 0; for (const k of Object.keys(stats)) { const x = w[k] == null ? 5 : w[k]; a += stats[k] * (x + 1); b += x + 1; } return b ? a / b : 0; };
export const ovrOf = (team, p) => R(wavg(p.stats, team.weights));
const playerName = (r) => ['Alex', 'Sam', 'Jordan', 'Riley', 'Casey', 'Morgan', 'Jamie', 'Drew', 'Taylor', 'Quinn', 'Reese', 'Avery', 'Noel', 'Kai', 'Robin', 'Lee'][Math.floor(r() * 16)] + ' ' + ['Hale', 'Brooks', 'Reyes', 'Kim', 'Novak', 'Okafor', 'Silva', 'Lindqvist', 'Moreau', 'Tanaka', 'Walsh', 'Duarte', 'Ito', 'Price', 'Doyle', 'Mensah'][Math.floor(r() * 16)];
function mkPlayer(r, team, base, young) { const stats = {}; for (const id of statIds(team.sport)) stats[id] = clamp(R(base + gl(r) * 9), 5, 98); const p = { id: 'p' + Math.floor(r() * 1e9), name: playerName(r), age: young ? 18 + Math.floor(r() * 5) : 21 + Math.floor(r() * 13), stats, inj: 0 }; p.ovr = ovrOf(team, p); p.salary = salaryOf(team, p); return p; }
const salaryOf = (team, p) => R((Math.pow(Math.max(0, p.ovr - 28), 2) * 420 + 12000) * typeDef(team.type).payroll);
export function genStaff(r, roleId, quality) { const role = F().roles.find((x) => x.id === roleId), skill = clamp(R(quality + gl(r) * 14), 15, 95); return { id: 'f' + Math.floor(r() * 1e9), role: roleId, name: playerName(r), skill, salary: R(role.salary * (0.6 + skill / 100 * 0.9)) }; }
export function staffMarket(s, roleId) { const t = s.fr && s.fr.team; const r = lcg(hashStr(`staff|${s.name}|${roleId}|${age(s)}`)); const q = t ? 38 + t.rep * 0.3 + typeDef(t.type).strength * 0.2 : 50; return [0, 1, 2].map((i) => { const c = genStaff(r, roleId, q + (i - 1) * 8); c.fee = R(c.salary * 0.2); return c; }); }
export function prospects(s) { const t = s.fr && s.fr.team; if (!t) return []; const r = lcg(hashStr(`pros|${s.name}|${age(s)}|${t.roster.length}`)), sc = staffOf(t, 'scout'), base = baseQuality(t) + (sc ? (sc.skill - 50) * 0.2 : -8); return [0, 1, 2, 3, 4, 5].map(() => { const p = mkPlayer(r, t, base + gl(r) * 5, r() < 0.6); p.fee = R(p.salary * 0.25); return p; }); }
const baseQuality = (t) => typeDef(t.type).strength + t.rep * 0.08 - 4;
const staffOf = (t, role) => t.staff.find((x) => x.role === role) || null;
const target = (t) => coachSport(t.sport).lineup + 5;

// ---- staffing effects (missing staff hurts)
export function staffing(t) {
  const hc = staffOf(t, 'head_coach'), sc = staffOf(t, 'scout'), md = staffOf(t, 'medic'), op = staffOf(t, 'ops'), mk = staffOf(t, 'marketing'), as = staffOf(t, 'assistant');
  const missing = F().roles.filter((r) => r.required && !staffOf(t, r.id)).map((r) => r.name);
  return { missing, perf: hc ? 0.9 + 0.2 * hc.skill / 100 : 0.8, dev: 1 + (as ? as.skill / 100 * 0.5 : 0) + (hc ? hc.skill / 100 * 0.25 : -0.2), recruit: sc ? (sc.skill - 50) * 0.2 : -8, fill: sc ? 1 : 0.4, injury: md ? 1.35 - 0.85 * md.skill / 100 : 1.7, cost: op ? 1.12 - 0.22 * op.skill / 100 : 1.22, attend: mk ? 0.97 + 0.2 * mk.skill / 100 : 0.93 };
}
const payrollOf = (t) => t.roster.reduce((a, p) => a + p.salary, 0) + t.staff.reduce((a, x) => a + x.salary, 0);
export function strengthOf(t) { const healthy = t.roster.filter((p) => !p.inj).map((p) => ovrOf(t, p)).sort((a, b) => b - a), n = coachSport(t.sport).lineup, top = healthy.slice(0, n); const depth = top.length / n, avg = top.length ? top.reduce((a, b) => a + b, 0) / top.length : 20; const st = staffing(t); const sty = (CO().styles.find((x) => x.id === t.style) || { atk: 1, def: 1 }); return avg * st.perf * (0.55 + 0.45 * depth) * (1 + ((sty.atk + sty.def) / 2 - 1) * 0.05) * (t.distress ? 0.9 : 1); }
const gateMult = (t) => tierDef(t.tier).gate * (0.8 + 0.4 * t.condition / 100);
const stadiumValue = (t) => stadiumCost(t.size, t.tier) * (0.4 + 0.6 * t.condition / 100);
export const value = (s) => { const t = s.fr && s.fr.team; if (!t) return 0; return Math.max(0, R(typeDef(t.type).cost * (0.6 + 0.8 * t.rep / 100) + stadiumValue(t) * 0.6 + t.fans * 15 + t.cash - t.debt)); };

// ---- buying and managing
export function presetWeights(sportId, presetId) { const ids = statIds(sportId), w = {}; ids.forEach((id, i) => (w[id] = presetId === 'offense' ? (i < 3 ? 8 : 2) : presetId === 'defense' ? (i < 3 ? 2 : 8) : 5)); return w; }
export function validWeights(sportId, w) { const ids = statIds(sportId), cfg = F().weights; if (!w || typeof w !== 'object') return 'Weights missing.'; let sum = 0; for (const id of ids) { const x = w[id]; if (!Number.isFinite(x) || x < cfg.min || x > cfg.max) return `Each stat must be ${cfg.min}-${cfg.max}.`; sum += x; } if (sum > cfg.total) return `Total weight can be at most ${cfg.total} (you used ${sum}).`; return null; }
export function quote(s, o = {}) { const t = typeDef(o.type || 'pro'), sz = sizeDef(o.size || 'small'), ti = tierDef(o.tier || 'basic'); if (!t || !sz || !ti || !o.teamId) return null; const team = priceOf(s, o.teamId, t.id), st = stadiumCost(sz.id, ti.id); return { team, stadium: st, total: team + st, operating: R(t.cost * 0.1) }; }
export function buy(s, o = {}) {
  const P = ensure(s); if (age(s) < MIN_AGE) return { ok: false, msg: `You must be ${MIN_AGE}+ to own a team.` }; if (P.team) return { ok: false, msg: 'You already own a team. Sell it first.' };
  const sp = sportDef(o.sport); if (!sp) return { ok: false, msg: 'Pick a sport.' }; const tm = sp.teams.find((x) => x.id === o.teamId); if (!tm) return { ok: false, msg: 'That team is not in this sport.' };
  const type = typeDef(o.type); if (!type) return { ok: false, msg: 'Pick a team type.' }; if (!sizeDef(o.size)) return { ok: false, msg: 'Pick a stadium size.' }; if (!tierDef(o.tier)) return { ok: false, msg: 'Pick a stadium tier.' };
  const w = o.weights || presetWeights(o.sport, o.preset || 'balanced'), bad = validWeights(o.sport, w); if (bad) return { ok: false, msg: bad };
  const q = quote(s, o), x = roll(s, tm.id); if (q.total + q.operating > s.cash) return { ok: false, msg: `Needs ${money(q.total + q.operating)} (team ${money(q.team)} + stadium ${money(q.stadium)} + operating cash ${money(q.operating)}).` };
  s.cash -= q.total + q.operating;
  const t = { id: tm.id, name: tm.name, sport: o.sport, type: type.id, size: o.size, tier: o.tier, cap: sizeDef(o.size).cap, condition: x.cond, cash: R(q.operating * clamp(1 + x.fin * 0.3, 0.5, 1.6)), debt: R(type.cost * 0.08 * x.debt), fans: R(type.fans * clamp(1 + x.fans * 0.2, 0.5, 1.8)), rep: x.rep, roster: [], staff: [], weights: { ...w }, focus: statIds(o.sport)[0], style: 'balanced', years: 0, wins: 0, losses: 0, titles: 0, hist: [], last: null, league: [], policy: { auto: true, backstop: true, ownerFloor: 50000, payout: false }, weightsYear: age(s), distress: 0, bought: age(s), paid: q.total };
  t.focus = Object.entries(w).sort((a, b) => b[1] - a[1])[0][0];
  const r = lcg(hashStr(`roster|${s.name}|${tm.id}|${age(s)}`)), base = baseQuality(t) + x.str * 4; for (let i = 0; i < target(t) - 2; i++) t.roster.push(mkPlayer(r, t, base, i > 9));
  t.league = freshLeague(r, t, o.sport); P.team = t; log(s, `I bought the ${t.name} (${sp.stats.length ? coachSport(o.sport).name : o.sport}, ${type.name.toLowerCase()}) for ${money(q.total)}.`, 'biz');
  return { ok: true, msg: `You own the ${t.name}. Hire staff to field a full operation.`, quote: q };
}
function freshLeague(r, t, sportId) { const others = sportDef(sportId).teams.filter((x) => x.id !== t.id).slice(0, 7); return others.map((x) => ({ id: x.id, name: x.name, str: clamp(R(typeDef(t.type).strength + gl(r) * 7), 20, 90) })); }
const need = (s) => (s.fr && s.fr.team) || null;
export function setWeights(s, w) { const t = need(s); if (!t) return { ok: false, msg: 'No team.' }; const bad = validWeights(t.sport, w); if (bad) return { ok: false, msg: bad }; if (t.weightsYear === age(s) && t.weightsChanged) return { ok: false, msg: 'You already re-tuned the stat weights this year.' }; t.weights = { ...w }; t.weightsChanged = 1; t.weightsYear = age(s); for (const p of t.roster) { p.ovr = ovrOf(t, p); p.salary = salaryOf(t, p); } return { ok: true, msg: 'Team stat priorities saved.' }; }
export function setFocus(s, statId) { const t = need(s); if (!t) return { ok: false, msg: 'No team.' }; if (!statIds(t.sport).includes(statId)) return { ok: false, msg: 'Unknown stat for this sport.' }; t.focus = statId; return { ok: true, msg: `Training focus: ${sportDef(t.sport).stats.find((x) => x.id === statId).name}.` }; }
export function setStyle(s, styleId) { const t = need(s); if (!t) return { ok: false, msg: 'No team.' }; if (!CO().styles.some((x) => x.id === styleId)) return { ok: false, msg: 'Unknown style.' }; t.style = styleId; return { ok: true, msg: 'Style set.' }; }
export function setPolicy(s, p = {}) { const t = need(s); if (!t) return { ok: false, msg: 'No team.' }; if (p.auto != null) t.policy.auto = !!p.auto; if (p.backstop != null) t.policy.backstop = !!p.backstop; if (p.payout != null) t.policy.payout = !!p.payout; if (p.ownerFloor != null) t.policy.ownerFloor = clamp(Math.floor(p.ownerFloor), 0, 1e9); return { ok: true, msg: 'Saved.' }; }
export function hire(s, roleId, id) { const t = need(s); if (!t) return { ok: false, msg: 'No team.' }; const role = F().roles.find((x) => x.id === roleId); if (!role) return { ok: false, msg: 'Unknown role.' }; if (staffOf(t, roleId)) return { ok: false, msg: `You already have a ${role.name.toLowerCase()}. Let them go first.` }; const c = staffMarket(s, roleId).find((x) => x.id === id); if (!c) return { ok: false, msg: 'That candidate is gone.' }; if (t.cash < c.fee) { topUp(s, t, c.fee); if (t.cash < c.fee) return { ok: false, msg: `Needs ${money(c.fee)} in team cash for the signing fee.` }; } t.cash -= c.fee; const { fee, ...st } = c; t.staff.push(st); log(s, `The ${t.name} hired ${c.name} as ${role.name.toLowerCase()}.`, 'biz'); return { ok: true, msg: `Hired ${c.name} (${role.name}, skill ${c.skill}).` }; }
export function fire(s, id) { const t = need(s); if (!t) return { ok: false, msg: 'No team.' }; const i = t.staff.findIndex((x) => x.id === id); if (i < 0) return { ok: false, msg: 'Not on staff.' }; const [x] = t.staff.splice(i, 1); t.cash -= R(x.salary * 0.25); return { ok: true, msg: `${x.name} let go (severance ${money(x.salary * 0.25)}).` }; }
export function recruit(s, id) { const t = need(s); if (!t) return { ok: false, msg: 'No team.' }; if (t.roster.length >= target(t) + 4) return { ok: false, msg: 'Roster is full.' }; const p = prospects(s).find((x) => x.id === id); if (!p) return { ok: false, msg: 'That prospect is gone.' }; if (!staffOf(t, 'scout')) return { ok: false, msg: 'Hire a scout/recruiter before signing players.' }; topUp(s, t, p.fee); if (t.cash < p.fee) return { ok: false, msg: `Needs ${money(p.fee)} in team cash.` }; t.cash -= p.fee; const { fee, ...pl } = p; t.roster.push(pl); return { ok: true, msg: `Signed ${p.name} (OVR ${p.ovr}).` }; }
export function release(s, id) { const t = need(s); if (!t) return { ok: false, msg: 'No team.' }; if (t.roster.length <= coachSport(t.sport).lineup) return { ok: false, msg: 'You need at least a starting lineup.' }; const i = t.roster.findIndex((x) => x.id === id); if (i < 0) return { ok: false, msg: 'No such player.' }; const [p] = t.roster.splice(i, 1); t.cash -= R(p.salary * 0.3); return { ok: true, msg: `${p.name} released.` }; }
export function upgradeStadium(s, what) {
  const t = need(s); if (!t) return { ok: false, msg: 'No team.' }; let cost, label;
  if (what === 'size') { const n = F().sizes[sizeIdx(t.size) + 1]; if (!n) return { ok: false, msg: 'Already the largest stadium.' }; cost = stadiumCost(n.id, t.tier) - stadiumCost(t.size, t.tier); label = n.name + ' stadium'; if (s.cash < cost) return { ok: false, msg: `Needs ${money(cost)}.` }; s.cash -= cost; t.size = n.id; t.cap = n.cap; }
  else if (what === 'tier') { const n = F().tiers[tierIdx(t.tier) + 1]; if (!n) return { ok: false, msg: 'Already the top tier.' }; cost = stadiumCost(t.size, n.id) - stadiumCost(t.size, t.tier); label = n.name + ' facilities'; if (s.cash < cost) return { ok: false, msg: `Needs ${money(cost)}.` }; s.cash -= cost; t.tier = n.id; }
  else if (what === 'repair') { cost = R(stadiumCost(t.size, t.tier) * 0.04); if (t.condition >= 95) return { ok: false, msg: 'The stadium is in great shape.' }; if (s.cash < cost) return { ok: false, msg: `Needs ${money(cost)}.` }; s.cash -= cost; t.condition = clamp(t.condition + 20, 0, 100); label = 'repairs'; }
  else return { ok: false, msg: 'Unknown upgrade.' };
  if (what !== 'repair') t.condition = clamp(t.condition + 15, 0, 100); log(s, `The ${t.name} invested ${money(cost)} in ${label}.`, 'biz'); return { ok: true, msg: `Done: ${label} for ${money(cost)}.` };
}
export function fund(s, amt) { const t = need(s); if (!t) return { ok: false, msg: 'No team.' }; amt = Math.floor(amt); if (!(amt > 0) || amt > s.cash) return { ok: false, msg: 'Not enough cash.' }; s.cash -= amt; t.cash += amt; return { ok: true, msg: `Added ${money(amt)} to team cash.` }; }
export function withdraw(s, amt) { const t = need(s); if (!t) return { ok: false, msg: 'No team.' }; amt = Math.floor(amt); if (!(amt > 0) || amt > t.cash) return { ok: false, msg: 'The team does not have that much.' }; t.cash -= amt; earn(s, amt); return { ok: true, msg: `Took ${money(amt)} out.` }; }
export function sell(s) { const t = need(s); if (!t) return { ok: false, msg: 'No team.' }; const v = R(value(s) * 0.9); earn(s, v); log(s, `I sold the ${t.name} for ${money(v)}.`, 'biz'); s.fr.history.push({ name: t.name, sport: t.sport, years: t.years, titles: t.titles, sold: v }); s.fr.team = null; return { ok: true, msg: `Sold for ${money(v)}.` }; }
function topUp(s, t, needed) { if (t.cash >= needed || !t.policy.backstop) return; const draw = Math.min(needed - t.cash, Math.max(0, s.cash - t.policy.ownerFloor)); if (draw > 0) { s.cash -= draw; t.cash += draw; } }

// ---- the year
const winP = (a, b, style) => { const k = style === 'attack' ? 10 : style === 'defend' ? 15 : 12.5; return 1 / (1 + Math.exp(-(a - b) / k)); };
export function yearTick(s) {
  const P = s.fr, t = P && P.team; if (!t) return; const y = age(s); if (t.lastYear === y) return; t.lastYear = y; t.years++;
  const st = staffing(t), ids = statIds(t.sport), sp = coachSport(t.sport);
  // players: develop (focus stat grows faster; young + assistant help), age, injuries, retire
  for (const p of t.roster) { p.age++; p.inj = 0; for (const id of ids) { const young = p.age < 25 ? 2.2 : p.age < 30 ? 0.6 : p.age < 33 ? -1 : -2.4; const f = id === t.focus ? 1.8 : 1; p.stats[id] = clamp(R(p.stats[id] + (young * st.dev * f * 0.5) + gauss(s) * 1.2), 5, 99); } if (chance(s, 0.14 * st.injury)) p.inj = 1; }
  const retiring = t.roster.filter((p) => p.age >= 36 || (p.age > 33 && chance(s, 0.25))); t.roster = t.roster.filter((p) => !retiring.includes(p));
  for (const p of t.roster) { p.ovr = ovrOf(t, p); p.salary = salaryOf(t, p); }
  // recruiting: scouts fill the roster each year (without one only some vacancies are filled and quality drops)
  const notes = []; if (t.policy.auto) { const vac = Math.max(0, target(t) - t.roster.length), n = Math.ceil(vac * st.fill); const r = lcg(hashStr(`rec|${s.rs}|${y}`)); for (let i = 0; i < n; i++) { const p = mkPlayer(r, t, baseQuality(t) + st.recruit + (t.rep - 50) * 0.1, true); t.roster.push(p); } if (n) notes.push(`${n} player${n === 1 ? '' : 's'} signed${st.fill < 1 ? ' (no scout: slow)' : ''}.`); }
  // the season: double round robin vs 7 rivals (14 games, half at home)
  const me = strengthOf(t); for (const o of t.league) o.str = clamp(R(o.str + gauss(s) * 2.5 - (o.str - typeDef(t.type).strength) * 0.05), 15, 95);
  let w = 0, l = 0, home = 0; for (const o of t.league) for (let g = 0; g < 2; g++) { const hv = g === 0; if (hv) home++; if (chance(s, clamp(winP(me + (hv ? 2 : -2), o.str, t.style), 0.03, 0.97))) w++; else l++; }
  const table = [{ me: true, w }, ...t.league.map((o) => ({ me: false, w: R(14 * winP(o.str, me * 0.5 + 25 + (typeDef(t.type).strength - 20) * 0.3, 'bal') + gauss(s) * 1.4) }))].sort((a, b) => b.w - a.w), pos = table.findIndex((x) => x.me) + 1, champion = pos === 1;
  t.wins += w; t.losses += l; if (champion) t.titles++; const pct = w / 14;
  // money
  const att = R(Math.min(t.cap, t.fans * clamp(0.5 + pct * 0.7, 0.3, 1.2) * st.attend)), ticket = typeDef(t.type).ticket * gateMult(t), gate = R(att * ticket * home), sponsors = R((15000 + t.rep * 1800 + (champion ? 80000 : 0)) * typeDef(t.type).payroll * (staffOf(t, 'marketing') ? 1 + staffOf(t, 'marketing').skill / 150 : 0.9)), merch = R(t.fans * 6 * (0.6 + pct)), share = R(typeDef(t.type).cost * 0.05);
  const revenue = gate + sponsors + merch + share, wages = t.roster.reduce((a, p) => a + p.salary, 0), staffPay = t.staff.reduce((a, x) => a + x.salary, 0), upkeep = R(stadiumCost(t.size, t.tier) * tierDef(t.tier).upkeep), ops = R((wages + staffPay) * (st.cost - 1)), interest = R(t.debt * 0.06);
  const costs = wages + staffPay + upkeep + ops + interest, before = t.cash; t.cash += revenue - costs; t.debt = Math.max(0, t.debt - Math.max(0, R((revenue - costs) * 0.2)));
  if (t.cash < 0) { topUp(s, t, 0 - t.cash); } let distress = false; if (t.cash < 0) { distress = true; t.distress++; t.cash = Math.max(t.cash, -5e5); t.rep = clamp(t.rep - 6, 0, 100); t.fans = R(t.fans * 0.94); notes.push('The team could not make payroll: reputation and fans fell.'); } else t.distress = 0;
  if (t.distress >= 3) { log(s, `The ${t.name} were taken over by creditors.`, 'biz'); P.history.push({ name: t.name, sport: t.sport, years: t.years, titles: t.titles, sold: 0 }); P.team = null; return; }
  t.condition = clamp(t.condition - 6 + (upkeep > 0 ? 3 : 0), 5, 100);
  t.fans = clamp(R(t.fans * (1 + (pct - 0.5) * 0.22 + (champion ? 0.06 : 0) + (st.missing.length ? -0.02 : 0))), 500, t.cap * 1.6); t.rep = clamp(t.rep + (pct - 0.5) * 9 + (champion ? 4 : 0) - st.missing.length * 1.5, 0, 100);
  if (t.policy.payout && t.cash > typeDef(t.type).cost * 0.2) { const ex = R((t.cash - typeDef(t.type).cost * 0.1) * 0.5); t.cash -= ex; earn(s, ex); notes.push(`Paid you a ${money(ex)} dividend.`); }
  const rev = { year: y, w, l, pos, champion, att, revenue, costs, profit: R(t.cash - before), gate, sponsors, merch, wages, staffPay, upkeep, strength: R(me), missing: st.missing, notes, retired: retiring.length };
  t.last = rev; t.hist.push({ year: y, w, l, pos, profit: rev.profit, att }); if (t.hist.length > 15) t.hist.shift();
  log(s, `${t.name}: ${w}-${l}, finished ${pos}${pos === 1 ? 'st (champions!)' : pos === 2 ? 'nd' : pos === 3 ? 'rd' : 'th'}; profit ${money(rev.profit)}.`, 'biz');
}

// ---- status for the UI
export function ownedRecords(s) { const t = s.fr && s.fr.team; if (!t) return []; const sp = coachSport(t.sport); return [{ id: 'team_' + t.sport, franchise: true, name: t.name, type: 'franchise', typeName: `${sp.name} · ${typeDef(t.type).name}`, kind: 'franchise', icon: sp.icon, rep: R(t.rep), staff: t.staff.length + t.roster.length, profit: t.last ? t.last.profit : 0, revenue: t.last ? t.last.revenue : 0, valuation: value(s), trust: false, fleet: false, editor: false }]; }
export function status(s) {
  const P = ensure(s), a = age(s), t = P.team, sports = Object.keys(F().sports).map((id) => ({ id, name: coachSport(id).name, icon: coachSport(id).icon, stats: sportDef(id).stats, lineup: coachSport(id).lineup }));
  const base = { age: a, locked: a < MIN_AGE, minAge: MIN_AGE, cash: R(s.cash), sports, types: F().types, sizes: F().sizes, tiers: F().tiers, roles: F().roles, presets: F().presets, weightCfg: F().weights, styles: CO().styles, history: P.history.slice(-5), team: null, noPackNeeded: true };
  if (!t) return base;
  const sp = coachSport(t.sport), stf = staffing(t), cat = sportDef(t.sport).stats;
  return { ...base, team: { id: t.id, name: t.name, sport: t.sport, sportName: sp.name, icon: sp.icon, type: typeDef(t.type).name, typeId: t.type, size: sizeDef(t.size).name, sizeId: t.size, tier: tierDef(t.tier).name, tierId: t.tier, cap: t.cap, condition: R(t.condition), cash: R(t.cash), debt: R(t.debt), fans: t.fans, rep: R(t.rep), value: value(s), strength: R(strengthOf(t)), years: t.years, wins: t.wins, losses: t.losses, titles: t.titles, style: t.style, focus: t.focus, stats: cat, weights: { ...t.weights }, weightsLocked: t.weightsYear === a && !!t.weightsChanged, policy: { ...t.policy }, payroll: payrollOf(t), understaffed: stf.missing, effects: { performance: +stf.perf.toFixed(2), development: +stf.dev.toFixed(2), recruiting: R(stf.recruit), injuries: +stf.injury.toFixed(2), costs: +stf.cost.toFixed(2), attendance: +stf.attend.toFixed(2) }, target: target(t), nextSize: F().sizes[sizeIdx(t.size) + 1] || null, nextTier: F().tiers[tierIdx(t.tier) + 1] || null,
    roster: t.roster.slice().sort((x, y) => y.ovr - x.ovr).map((p) => ({ id: p.id, name: p.name, age: p.age, ovr: p.ovr, salary: p.salary, inj: !!p.inj, stats: p.stats })), staff: t.staff.map((x) => ({ ...x, roleName: F().roles.find((r) => r.id === x.role).name, icon: F().roles.find((r) => r.id === x.role).icon })), last: t.last, hist: t.hist, league: t.league.map((o) => ({ name: o.name, str: o.str })) } };
}
