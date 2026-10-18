// Team ownership: buy a fictional club in any coaching sport (no pack needed, age 18+). Per sport: its own set of 12 teams (each with an initial roll for
// strength, fans, finances, stadium condition) and its own 6-stat set the owner customises (stat weights when buying/any time, training focus, style).
// You choose team type (semi-pro/pro/elite) and the stadium's starting size and tier. You must hire staff (head coach, scout, medical, operations required;
// assistant and marketing optional): missing staff cuts performance, recruiting, injuries and finances. Payroll is paid from team cash; the owner can
// back shortfalls. Results evolve yearly: wins -> fans/attendance/revenue, upgrades. State: s.fr. Data: data/franchise.json, sports/styles from coaching.json.
import { D } from './data.js';
import { rnd, rint, pick, chance, clamp, gauss } from './rng.js';
import { log, earn } from './core.js';
import * as Coach from './coaching.js';

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

// ---- logos: generated slot-svg style emblems (data-slot attributes + baked default fills; colours from the chosen palette)
export const LOGO = { shapes: ['shield', 'circle', 'diamond', 'hex', 'banner'], emblems: ['star', 'bolt', 'crown', 'wave', 'ball', 'paw'], palettes: [['#d94a4a', '#ffffff', '#2b2a3a'], ['#3b6fd1', '#ffffff', '#f2c14e'], ['#f2c14e', '#2b2a3a', '#d94a4a'], ['#4caf6a', '#ffffff', '#2b2a3a'], ['#7e57c2', '#ffffff', '#f2c14e'], ['#2b2a3a', '#f2c14e', '#ffffff'], ['#e8743b', '#ffffff', '#2b2a3a'], ['#2aa7a7', '#ffffff', '#2b2a3a']] };
export const LOOKS = [{ id: 'modern', name: 'Modern glass bowl', gate: 1.02 }, { id: 'classic', name: 'Classic brick ground', gate: 1.0 }, { id: 'bowl', name: 'Open concrete bowl', gate: 0.99 }, { id: 'garden', name: 'Garden park pitch', gate: 1.01 }];
const SHAPE = { shield: 'M32 4 L58 12 V34 C58 48 46 58 32 62 C18 58 6 48 6 34 V12 Z', circle: 'M32 4 A28 28 0 1 1 31.9 4 Z', diamond: 'M32 3 L61 32 L32 61 L3 32 Z', hex: 'M32 3 L57 17 V47 L32 61 L7 47 V17 Z', banner: 'M8 5 H56 V45 L32 61 L8 45 Z' };
const EMBLEM = { star: 'M32 18 L36 28 L47 29 L39 36 L41 47 L32 41 L23 47 L25 36 L17 29 L28 28 Z', bolt: 'M35 16 L22 35 H31 L28 49 L42 29 H33 Z', crown: 'M18 42 V24 L26 33 L32 21 L38 33 L46 24 V42 Z', wave: 'M16 36 C22 26 28 26 32 34 C36 42 42 42 48 30 V44 H16 Z', ball: 'M32 20 A13 13 0 1 1 31.9 20 Z M32 25 L38 30 L36 37 H28 L26 30 Z', paw: 'M32 36 C26 36 22 41 24 45 C26 48 29 46 32 46 C35 46 38 48 40 45 C42 41 38 36 32 36 Z M22 31 A3.5 4.5 0 1 1 22.1 31 Z M42 31 A3.5 4.5 0 1 1 42.1 31 Z M28 24 A3.5 4.5 0 1 1 28.1 24 Z M36 24 A3.5 4.5 0 1 1 36.1 24 Z' };
export function logoSvg(l) { l = normLogo(l); const [c1, c2, c3] = l.colors; return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" data-format="slot-svg-v1" data-logo="${l.shape}-${l.emblem}"><path data-slot="primary" d="${SHAPE[l.shape]}" fill="${c1}" stroke="${c3}" stroke-width="2.5" stroke-linejoin="round" style="fill:var(--primary,${c1});stroke:var(--outline,${c3})"/><path data-slot="shade" d="${SHAPE[l.shape]}" fill="#000" opacity="0.12" transform="translate(2 3) scale(0.94)"/><path data-slot="emblem" d="${EMBLEM[l.emblem]}" fill="${c2}" fill-rule="evenodd" style="fill:var(--secondary,${c2})"/><circle data-slot="accent" cx="32" cy="55" r="2.2" fill="${c3 === c1 ? c2 : c3}" style="fill:var(--accent,${c3})"/></svg>`; }
export function normLogo(l) { l = l || {}; const pal = LOGO.palettes[Math.max(0, Math.min(LOGO.palettes.length - 1, Number.isFinite(l.palette) ? Math.floor(l.palette) : 0))]; return { shape: LOGO.shapes.includes(l.shape) ? l.shape : 'shield', emblem: LOGO.emblems.includes(l.emblem) ? l.emblem : 'star', palette: LOGO.palettes.indexOf(pal), colors: Array.isArray(l.colors) && l.colors.length === 3 && l.colors.every((c) => /^#[0-9a-f]{6}$/i.test(c)) ? l.colors : pal }; }
const autoLogo = (name) => { const h = hashStr(name); return { shape: LOGO.shapes[h % 5], emblem: LOGO.emblems[(h >> 3) % 6], palette: (h >> 6) % LOGO.palettes.length }; };
const cleanName = (n) => String(n || '').replace(/[^\p{L}\p{N} '&.-]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 28);

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

// ---- training + medical facilities (levels 0-3; each level: development +6% / injuries -7%)
export const FAC = [{ id: 'training', name: 'Training centre', icon: '🏋️', effect: 'Player development +6% per level' }, { id: 'medical', name: 'Medical centre', icon: '🏥', effect: 'Injury rate -7% per level' }];
const facLvl = (t, id) => (t.fac && t.fac[id]) || 0;
export const facCost = (t, id) => R(typeDef(t.type).cost * 0.03 * (facLvl(t, id) + 1) / 1000) * 1000;
export function upgradeFacility(s, id) { const t = need(s); if (!t) return { ok: false, msg: 'No team.' }; const f = FAC.find((x) => x.id === id); if (!f) return { ok: false, msg: 'Unknown facility.' }; const lv = facLvl(t, id); if (lv >= 3) return { ok: false, msg: `${f.name} is already at the top level.` }; const c = facCost(t, id); if (s.cash < c) return { ok: false, msg: `Needs ${money(c)}.` }; s.cash -= c; t.fac = { ...(t.fac || {}), [id]: lv + 1 }; log(s, `The ${t.name} upgraded the ${f.name} to level ${lv + 1} (${money(c)}).`, 'biz'); return { ok: true, msg: `${f.name} is now level ${lv + 1} for ${money(c)}.` }; }
export function replacePlayer(s, outId, inId) { const t = need(s); if (!t) return { ok: false, msg: 'No team.' }; const i = t.roster.findIndex((x) => x.id === outId); if (i < 0) return { ok: false, msg: 'No such player.' }; const p = prospects(s).find((x) => x.id === inId); if (!p) return { ok: false, msg: 'That prospect is gone.' }; if (!staffOf(t, 'scout')) return { ok: false, msg: 'Hire a scout/recruiter before signing players.' }; const out = t.roster[i], sev = R(out.salary * 0.3); topUp(s, t, p.fee + sev); if (t.cash < p.fee + sev) return { ok: false, msg: `Needs ${money(p.fee + sev)} in team cash.` }; t.cash -= p.fee + sev; const { fee, ...pl } = p; t.roster.splice(i, 1, pl); return { ok: true, msg: `Replaced ${out.name} (OVR ${out.ovr}) with ${p.name} (OVR ${p.ovr}).` }; }

// ---- staffing effects (missing staff hurts)
export function staffing(t) {
  const hc = staffOf(t, 'head_coach'), sc = staffOf(t, 'scout'), md = staffOf(t, 'medic'), op = staffOf(t, 'ops'), mk = staffOf(t, 'marketing'), as = staffOf(t, 'assistant');
  const missing = F().roles.filter((r) => r.required && !staffOf(t, r.id)).map((r) => r.name);
  return { missing, perf: hc ? 0.9 + 0.2 * hc.skill / 100 : 0.8, dev: (1 + (as ? as.skill / 100 * 0.5 : 0) + (hc ? hc.skill / 100 * 0.25 : -0.2)) * (1 + 0.06 * facLvl(t, 'training')), recruit: sc ? (sc.skill - 50) * 0.2 : -8, fill: sc ? 1 : 0.4, injury: (md ? 1.35 - 0.85 * md.skill / 100 : 1.7) * (1 - 0.07 * facLvl(t, 'medical')), cost: op ? 1.12 - 0.22 * op.skill / 100 : 1.22, attend: mk ? 0.97 + 0.2 * mk.skill / 100 : 0.93 };
}
const payrollOf = (t) => t.roster.reduce((a, p) => a + p.salary, 0) + t.staff.reduce((a, x) => a + x.salary, 0);
export function strengthOf(t) { const healthy = t.roster.filter((p) => !p.inj).map((p) => ovrOf(t, p)).sort((a, b) => b - a), n = coachSport(t.sport).lineup, top = healthy.slice(0, n); const depth = top.length / n, avg = top.length ? top.reduce((a, b) => a + b, 0) / top.length : 20; const st = staffing(t); const sty = (CO().styles.find((x) => x.id === t.style) || { atk: 1, def: 1 }); return avg * st.perf * (0.55 + 0.45 * depth) * (1 + ((sty.atk + sty.def) / 2 - 1) * 0.05) * (t.distress ? 0.9 : 1); }
const gateMult = (t) => tierDef(t.tier).gate * (0.8 + 0.4 * t.condition / 100) * ((LOOKS.find((x) => x.id === t.look) || { gate: 1 }).gate);
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
  const t = { id: tm.id, name: tm.name, sport: o.sport, type: type.id, size: o.size, tier: o.tier, cap: sizeDef(o.size).cap, condition: x.cond, cash: R(q.operating * clamp(1 + x.fin * 0.3, 0.5, 1.6)), debt: R(type.cost * 0.08 * x.debt), fans: R(type.fans * clamp(1 + x.fans * 0.2, 0.5, 1.8)), rep: x.rep, roster: [], staff: [], weights: { ...w }, focus: statIds(o.sport)[0], style: 'balanced', years: 0, wins: 0, losses: 0, titles: 0, hist: [], last: null, league: [], policy: { auto: true, backstop: true, ownerFloor: 50000, payout: false }, weightsYear: age(s), distress: 0, bought: age(s), paid: q.total, look: 'classic', logo: normLogo(autoLogo(tm.name)) };
  t.focus = Object.entries(w).sort((a, b) => b[1] - a[1])[0][0];
  const r = lcg(hashStr(`roster|${s.name}|${tm.id}|${age(s)}`)), base = baseQuality(t) + x.str * 4; for (let i = 0; i < target(t) - 2; i++) t.roster.push(mkPlayer(r, t, base, i > 9));
  t.league = freshLeague(r, t, o.sport); P.team = t; log(s, `I bought the ${t.name} (${sp.stats.length ? coachSport(o.sport).name : o.sport}, ${type.name.toLowerCase()}) for ${money(q.total)}.`, 'biz');
  return { ok: true, msg: `You own the ${t.name}. Hire staff to field a full operation.`, quote: q };
}
// Brand-new club: you name it, design the logo and pick the stadium. Cheaper than buying an established club but it starts unknown (few fans, low reputation, thin squad).
export function quoteNew(s, o = {}) { const t = typeDef(o.type || 'semi'), sz = sizeDef(o.size || 'small'), ti = tierDef(o.tier || 'basic'); if (!t || !sz || !ti) return null; const fee = R(t.cost * 0.35 / 1000) * 1000, st = stadiumCost(sz.id, ti.id); return { team: fee, stadium: st, total: fee + st, operating: R(t.cost * 0.12) }; }
export function create(s, o = {}) {
  const P = ensure(s); if (age(s) < MIN_AGE) return { ok: false, msg: `You must be ${MIN_AGE}+ to own a team.` }; if (P.team) return { ok: false, msg: 'You already own a team. Sell it first.' };
  const sp = sportDef(o.sport); if (!sp) return { ok: false, msg: 'Pick a sport.' }; const name = cleanName(o.name); if (name.length < 3) return { ok: false, msg: 'Name your team (3-28 letters).' };
  if (Object.values(F().sports).some((x) => x.teams.some((tm) => tm.name.toLowerCase() === name.toLowerCase()))) return { ok: false, msg: 'A club with that name already exists. Pick another.' };
  const type = typeDef(o.type || 'semi'); if (!type) return { ok: false, msg: 'Pick a team type.' }; if (!sizeDef(o.size)) return { ok: false, msg: 'Pick a stadium size.' }; if (!tierDef(o.tier)) return { ok: false, msg: 'Pick a stadium tier.' }; const look = LOOKS.find((x) => x.id === (o.look || 'modern')); if (!look) return { ok: false, msg: 'Pick a stadium look.' };
  const w = o.weights || presetWeights(o.sport, o.preset || 'balanced'), bad = validWeights(o.sport, w); if (bad) return { ok: false, msg: bad };
  const q = quoteNew(s, o); if (q.total + q.operating > s.cash) return { ok: false, msg: `Needs ${money(q.total + q.operating)} (registration ${money(q.team)} + stadium ${money(q.stadium)} + operating cash ${money(q.operating)}).` };
  s.cash -= q.total + q.operating; const id = 'new_' + o.sport + '_' + hashStr(name).toString(36);
  const t = { id, name, sport: o.sport, type: type.id, size: o.size, tier: o.tier, look: look.id, cap: sizeDef(o.size).cap, condition: 100, cash: q.operating, debt: 0, fans: R(type.fans * 0.15), rep: 18, roster: [], staff: [], weights: { ...w }, focus: Object.entries(w).sort((a, b) => b[1] - a[1])[0][0], style: 'balanced', years: 0, wins: 0, losses: 0, titles: 0, hist: [], last: null, league: [], policy: { auto: true, backstop: true, ownerFloor: 50000, payout: false }, weightsYear: age(s), distress: 0, bought: age(s), paid: q.total, founded: true, logo: normLogo(o.logo || autoLogo(name)) };
  const r = lcg(hashStr(`new|${s.name}|${id}|${age(s)}`)), base = baseQuality(t) - 6; for (let i = 0; i < target(t) - 4; i++) t.roster.push(mkPlayer(r, t, base, i > 6));
  t.league = freshLeague(r, t, o.sport); P.team = t; log(s, `I founded a new ${coachSport(o.sport).name.toLowerCase()} club: ${name}.`, 'biz');
  return { ok: true, msg: `${name} is registered. Hire staff and sign players to get going.`, quote: q };
}
export function setLogo(s, logo) { const t = need(s); if (!t) return { ok: false, msg: 'No team.' }; t.logo = normLogo(logo); return { ok: true, msg: 'New logo saved.' }; }
export function setLook(s, id) { const t = need(s); if (!t) return { ok: false, msg: 'No team.' }; if (!LOOKS.some((x) => x.id === id)) return { ok: false, msg: 'Unknown look.' }; t.look = id; return { ok: true, msg: 'Stadium look changed.' }; }
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

// ---- the featured match: one major game each season you can play yourself (halves + halftime tactic), replayed on the same 2D pitch as coaching
const poisson = (s, l) => { let k = 0, p = Math.exp(-l), x = p, u = rnd(s); while (u > x && k < 14) { k++; p *= l / k; x += p; } return k; };
const pickOpp = (t) => { const i = t.league.reduce((b, o, k) => (o.str > t.league[b].str ? k : b), 0); return i; };
function halfLam(t, oppIdx, styleId) { const sp = coachSport(t.sport), st = CO().styles.find((x) => x.id === styleId) || CO().styles[1], me = strengthOf(t), op = t.league[oppIdx].str + 1, diff = (me - op) / 40, base = 1.35 * sp.goalScale, counter = styleId === 'counter' && op > me ? 1.15 : 1; return { me, op, lm: clamp(base * Math.exp(diff * 0.7) * st.atk * counter, 0.15, 9 * sp.goalScale) / 2, lo: clamp(base * Math.exp(-diff * 0.7) / st.def, 0.15, 9 * sp.goalScale) / 2 }; }
function ownHalf(s, t, oppIdx, styleId, half) { const L = halfLam(t, oppIdx, styleId), a = poisson(s, L.lm), b = poisson(s, L.lo), lo = half === 1 ? 2 : 52, hi = half === 1 ? 48 : 98, goals = []; for (let i = 0; i < a; i++) goals.push({ t: rint(s, lo, hi), side: 0 }); for (let i = 0; i < b; i++) goals.push({ t: rint(s, lo, hi), side: 1 }); return { a, b, goals: goals.sort((x, y) => x.t - y.t), me: L.me, op: L.op }; }
const featuredOk = (s, t) => { if (t.played && t.played.year === age(s)) return 'The featured game was already played this season.'; return null; };
export function playHalf(s, styleId) { const t = need(s); if (!t) return { ok: false, msg: 'No team.' }; const w = featuredOk(s, t); if (w) return { ok: false, msg: w }; if (t.half) return { ok: false, msg: 'First half already played. Pick the second-half tactic.' }; if (!CO().styles.some((x) => x.id === styleId)) return { ok: false, msg: 'Unknown style.' }; const stf = staffing(t); if (!staffOf(t, 'head_coach')) return { ok: false, msg: 'Hire a head coach to run the touchline.' }; t.style = styleId; const opp = pickOpp(t), h = ownHalf(s, t, opp, styleId, 1); t.half = { opp, style: styleId, ...h }; void stf; return { ok: true, msg: `Halftime: ${h.a}-${h.b} vs ${t.league[opp].name}. Choose your second-half tactic.`, half: { a: h.a, b: h.b, oppName: t.league[opp].name, style: styleId } }; }
export function playMatch(s, styleId, htStyle = null) {
  const t = need(s); if (!t) return { ok: false, msg: 'No team.' }; const w = featuredOk(s, t); if (w) return { ok: false, msg: w }; if (!staffOf(t, 'head_coach')) return { ok: false, msg: 'Hire a head coach to run the touchline.' };
  const pend = t.half; if ((!pend || styleId) && !CO().styles.some((x) => x.id === styleId)) return { ok: false, msg: 'Unknown style.' }; if (htStyle && !CO().styles.some((x) => x.id === htStyle)) return { ok: false, msg: 'Unknown style.' };
  const st1 = pend ? pend.style : styleId, opp = pend ? pend.opp : pickOpp(t), h1 = pend || ownHalf(s, t, opp, st1, 1), st2 = htStyle || st1, h2 = ownHalf(s, t, opp, st2, 2), seed = Math.floor(rnd(s) * 1e9), a = h1.a + h2.a, b = h1.b + h2.b;
  const m = { opp, oppName: t.league[opp].name, a, b, seed, goals: [...h1.goals, ...h2.goals], style: st1, style2: st2, ht: { a: h1.a, b: h1.b, style: st1, changed: st2 !== st1 }, me: R(h1.me), op: R(h1.op), result: a > b ? 'W' : a < b ? 'L' : 'D' };
  t.style = st2; t.half = null; t.match = m; t.played = { year: age(s), result: m.result, a, b, opp: m.oppName, changed: m.ht.changed }; t.fans = R(t.fans * (m.result === 'W' ? 1.01 : m.result === 'L' ? 0.995 : 1)); t.rep = clamp(t.rep + (m.result === 'W' ? 0.8 : m.result === 'L' ? -0.4 : 0.1), 0, 100);
  log(s, `${t.name} ${a}-${b} ${m.oppName} (${m.result === 'W' ? 'win' : m.result === 'L' ? 'loss' : 'draw'}${m.ht.changed ? ', tactics changed at halftime' : ''}).`, 'biz');
  return { ok: true, msg: `Full time: ${t.name} ${a}-${b} ${m.oppName}.`, match: m };
}
export function frames(s) { const t = s.fr && s.fr.team; return t && t.match ? { match: t.match, frames: Coach.frames(t.match, 6, 6) } : null; }
// ---- the year
const winP = (a, b, style) => { const k = style === 'attack' ? 10 : style === 'defend' ? 15 : 12.5; return 1 / (1 + Math.exp(-(a - b) / k)); };
export function yearTick(s) {
  const P = s.fr, t = P && P.team; if (!t) return; const y = age(s); if (t.lastYear === y) return; t.lastYear = y; t.years++; t.half = null;
  const st = staffing(t), ids = statIds(t.sport), sp = coachSport(t.sport);
  // players: develop (focus stat grows faster; young + assistant help), age, injuries, retire
  for (const p of t.roster) { p.age++; p.inj = 0; for (const id of ids) { const young = p.age < 25 ? 2.2 : p.age < 30 ? 0.6 : p.age < 33 ? -1 : -2.4; const f = id === t.focus ? 1.8 : 1; p.stats[id] = clamp(R(p.stats[id] + (young * st.dev * f * 0.5) + gauss(s) * 1.2), 5, 99); } if (chance(s, 0.14 * st.injury)) p.inj = 1; }
  const retiring = t.roster.filter((p) => p.age >= 36 || (p.age > 33 && chance(s, 0.25))); t.roster = t.roster.filter((p) => !retiring.includes(p));
  for (const p of t.roster) { p.ovr = ovrOf(t, p); p.salary = salaryOf(t, p); }
  // recruiting: scouts fill the roster each year (without one only some vacancies are filled and quality drops)
  const notes = []; if (t.policy.auto) { const vac = Math.max(0, target(t) - t.roster.length), n = Math.ceil(vac * st.fill); const r = lcg(hashStr(`rec|${s.rs}|${y}`)); for (let i = 0; i < n; i++) { const p = mkPlayer(r, t, baseQuality(t) + st.recruit + (t.rep - 50) * 0.1, true); t.roster.push(p); } if (n) notes.push(`${n} player${n === 1 ? '' : 's'} signed${st.fill < 1 ? ' (no scout: slow)' : ''}.`); }
  // the season: double round robin vs 7 rivals (14 games, half at home)
  const me = strengthOf(t); for (const o of t.league) o.str = clamp(R(o.str + gauss(s) * 2.5 - (o.str - typeDef(t.type).strength) * 0.05), 15, 95);
  const played = t.played && t.played.year >= y - 1 ? t.played : null; t.played = null; let w = 0, l = 0, d = 0, home = 0, skipped = !!played;
  for (const o of t.league) for (let g = 0; g < 2; g++) { const hv = g === 0; if (hv) home++; if (skipped && hv && o.name === played.opp) { skipped = false; if (played.result === 'W') w++; else if (played.result === 'L') l++; else d++; continue; } if (chance(s, clamp(winP(me + (hv ? 2 : -2), o.str, t.style), 0.03, 0.97))) w++; else l++; }
  if (skipped) { if (played.result === 'W') w++; else if (played.result === 'L') l++; else d++; }
  const table = [{ me: true, w }, ...t.league.map((o) => ({ me: false, w: R(14 * winP(o.str, me * 0.5 + 25 + (typeDef(t.type).strength - 20) * 0.3, 'bal') + gauss(s) * 1.4) }))].sort((a, b) => b.w - a.w), pos = table.findIndex((x) => x.me) + 1, champion = pos === 1;
  t.wins += w; t.losses += l; if (champion) t.titles++; const pct = (w + d * 0.5) / (w + l + d);
  // money
  const att = R(Math.min(t.cap, t.fans * clamp(0.5 + pct * 0.7, 0.3, 1.2) * st.attend)), ticket = typeDef(t.type).ticket * gateMult(t), gate = R(att * ticket * home), sponsors = R((15000 + t.rep * 1800 + (champion ? 80000 : 0)) * typeDef(t.type).payroll * (staffOf(t, 'marketing') ? 1 + staffOf(t, 'marketing').skill / 150 : 0.9)), merch = R(t.fans * 6 * (0.6 + pct)), share = R(typeDef(t.type).cost * 0.05), prize = champion ? R(share * 0.8) : pos <= 3 ? R(share * 0.3) : 0, other = R(att * home * 9), travel = R(7 * (2500 + typeDef(t.type).cost * 0.0004));
  const revenue = gate + sponsors + merch + share + prize + other, wages = t.roster.reduce((a, p) => a + p.salary, 0), staffPay = t.staff.reduce((a, x) => a + x.salary, 0), upkeep = R(stadiumCost(t.size, t.tier) * tierDef(t.tier).upkeep), ops = R((wages + staffPay) * (st.cost - 1)), interest = R(t.debt * 0.06);
  const costs = wages + staffPay + upkeep + ops + interest + travel, before = t.cash; t.cash += revenue - costs; t.debt = Math.max(0, t.debt - Math.max(0, R((revenue - costs) * 0.2)));
  if (t.cash < 0) { topUp(s, t, 0 - t.cash); } let distress = false; if (t.cash < 0) { distress = true; t.distress++; t.cash = Math.max(t.cash, -5e5); t.rep = clamp(t.rep - 6, 0, 100); t.fans = R(t.fans * 0.94); notes.push('The team could not make payroll: reputation and fans fell.'); } else t.distress = 0;
  if (t.distress >= 3) { log(s, `The ${t.name} were taken over by creditors.`, 'biz'); P.history.push({ name: t.name, sport: t.sport, years: t.years, titles: t.titles, sold: 0 }); P.team = null; return; }
  t.condition = clamp(t.condition - 6 + (upkeep > 0 ? 3 : 0), 5, 100);
  t.fans = clamp(R(t.fans * (1 + (pct - 0.5) * 0.22 + (champion ? 0.06 : 0) + (st.missing.length ? -0.02 : 0))), 500, t.cap * 1.6); t.rep = clamp(t.rep + (pct - 0.5) * 9 + (champion ? 4 : 0) - st.missing.length * 1.5, 0, 100);
  if (t.policy.payout && t.cash > typeDef(t.type).cost * 0.2) { const ex = R((t.cash - typeDef(t.type).cost * 0.1) * 0.5); t.cash -= ex; earn(s, ex); notes.push(`Paid you a ${money(ex)} dividend.`); }
  const rev = { year: y, w, l, d, pos, played: played ? { result: played.result, a: played.a, b: played.b, opp: played.opp } : null, champion, att, revenue, costs, profit: R(t.cash - before), gate, sponsors, merch, wages, staffPay, upkeep, broadcast: share, prize, other, travel, ops, interest, staffLines: t.staff.map((x) => ({ role: x.role, name: x.name, salary: x.salary })), home, strength: R(me), missing: st.missing, notes, retired: retiring.length };
  t.last = rev; t.hist.push({ year: y, w, l, d, pos, profit: rev.profit, att }); if (t.hist.length > 15) t.hist.shift();
  log(s, `${t.name}: ${w}-${l}, finished ${pos}${pos === 1 ? 'st (champions!)' : pos === 2 ? 'nd' : pos === 3 ? 'rd' : 'th'}; profit ${money(rev.profit)}.`, 'biz');
}

// ---- team quality and itemised finances (plain labels, yearly amounts, what each depends on)
export function rating(t) { const lg = [strengthOf(t), ...t.league.map((o) => o.str)].sort((a, b) => b - a), me = R(strengthOf(t)), rank = lg.indexOf(strengthOf(t)) + 1, top = t.roster.filter((p) => !p.inj).sort((a, b) => b.ovr - a.ovr).slice(0, coachSport(t.sport).lineup), avg = top.length ? R(top.reduce((a, p) => a + p.ovr, 0) / top.length) : 0, grade = me >= 75 ? 'A' : me >= 62 ? 'B' : me >= 50 ? 'C' : me >= 38 ? 'D' : 'E'; return { overall: me, grade, rank, of: lg.length, lineupAvg: avg, depth: t.roster.length + '/' + target(t), injured: t.roster.filter((p) => p.inj).length }; }
export function finance(t) {
  const L = t.last, tdef = typeDef(t.type), st = staffing(t); const pay = {}; for (const x of (L ? L.staffLines : t.staff.map((y) => ({ role: y.role, salary: y.salary })))) pay[x.role] = (pay[x.role] || 0) + x.salary;
  const payLines = F().roles.map((r) => ({ id: 'pay_' + r.id, label: `Payroll: ${r.name}`, amount: pay[r.id] || 0, note: pay[r.id] ? 'The salary of the person you hired in this role.' : 'Vacant: no salary, but you lose the effect of this role.' }));
  const income = L ? [
    { id: 'tickets', label: 'Ticket sales', amount: L.gate, note: `Home games (${L.home}) × attendance (${L.att.toLocaleString()}, capped by stadium seats) × ticket price (team type and stadium look/tier).` },
    { id: 'merch', label: 'Merchandise', amount: L.merch, note: 'Number of fans and how well the team won.' },
    { id: 'sponsors', label: 'Sponsors', amount: L.sponsors, note: 'Reputation, a title bonus and your marketing manager.' },
    { id: 'broadcast', label: 'Broadcast money', amount: L.broadcast, note: 'League TV deal: a share set by the team type.' },
    { id: 'prize', label: 'Prize money', amount: L.prize, note: 'League finish: champions get most, top 3 some.' },
    { id: 'other', label: 'Concessions & parking', amount: L.other, note: 'Crowd size at home games.' }] : [];
  const expense = L ? [...payLines,
    { id: 'players', label: 'Player salaries', amount: L.wages, note: 'Every rostered player: higher ratings cost more.' },
    { id: 'upkeep', label: 'Stadium & facility upkeep', amount: L.upkeep, note: 'Stadium build value × your tier upkeep rate.' },
    { id: 'travel', label: 'Travel', amount: L.travel, note: 'Seven away games a season; bigger leagues travel further.' },
    { id: 'interest', label: 'Debt payments (interest)', amount: L.interest, note: 'Team debt × 6%. Surplus profit pays the debt down.' },
    { id: 'overheads', label: L.ops >= 0 ? 'Other costs (admin & overheads)' : 'Front-office savings (other costs)', amount: L.ops, note: 'Payroll size and your operations/front-office skill: a strong operations chief turns overheads into savings (shown negative).' }] : payLines;
  const ti = income.reduce((a, x) => a + x.amount, 0), te = expense.reduce((a, x) => a + x.amount, 0);
  return { year: L ? L.year : null, income, expense, totalIncome: ti, totalExpense: te, net: ti - te, hasSeason: !!L, payroll: payrollOf(t), debt: R(t.debt), cash: R(t.cash), costFactor: +st.cost.toFixed(2) };
}
// ---- status for the UI
export function ownedRecords(s) { const t = s.fr && s.fr.team; if (!t) return []; const sp = coachSport(t.sport); return [{ id: 'team_' + t.sport, franchise: true, name: t.name, type: 'franchise', typeName: `${sp.name} · ${typeDef(t.type).name}`, kind: 'franchise', icon: sp.icon, rep: R(t.rep), staff: t.staff.length + t.roster.length, profit: t.last ? t.last.profit : 0, revenue: t.last ? t.last.revenue : 0, valuation: value(s), trust: false, fleet: false, editor: false }]; }
export function status(s) {
  const P = ensure(s), a = age(s), t = P.team, sports = Object.keys(F().sports).map((id) => ({ id, name: coachSport(id).name, icon: coachSport(id).icon, stats: sportDef(id).stats, lineup: coachSport(id).lineup }));
  const base = { age: a, locked: a < MIN_AGE, minAge: MIN_AGE, cash: R(s.cash), sports, types: F().types, sizes: F().sizes, tiers: F().tiers, roles: F().roles, presets: F().presets, looks: LOOKS, logoCfg: LOGO, newFee: F().types.map((x) => ({ id: x.id, fee: R(x.cost * 0.35 / 1000) * 1000 })), weightCfg: F().weights, styles: CO().styles, history: P.history.slice(-5), team: null, noPackNeeded: true };
  if (!t) return base;
  const sp = coachSport(t.sport), stf = staffing(t), cat = sportDef(t.sport).stats;
  return { ...base, team: { id: t.id, name: t.name, sport: t.sport, sportName: sp.name, icon: sp.icon, type: typeDef(t.type).name, typeId: t.type, size: sizeDef(t.size).name, sizeId: t.size, tier: tierDef(t.tier).name, tierId: t.tier, cap: t.cap, condition: R(t.condition), cash: R(t.cash), debt: R(t.debt), fans: t.fans, rep: R(t.rep), value: value(s), strength: R(strengthOf(t)), years: t.years, wins: t.wins, losses: t.losses, titles: t.titles, style: t.style, focus: t.focus, stats: cat, weights: { ...t.weights }, weightsLocked: t.weightsYear === a && !!t.weightsChanged, policy: { ...t.policy }, payroll: payrollOf(t), understaffed: stf.missing, effects: { performance: +stf.perf.toFixed(2), development: +stf.dev.toFixed(2), recruiting: R(stf.recruit), injuries: +stf.injury.toFixed(2), costs: +stf.cost.toFixed(2), attendance: +stf.attend.toFixed(2) }, target: target(t), nextSize: F().sizes[sizeIdx(t.size) + 1] || null, nextTier: F().tiers[tierIdx(t.tier) + 1] || null,
    roster: t.roster.slice().sort((x, y) => y.ovr - x.ovr).map((p) => ({ id: p.id, name: p.name, age: p.age, ovr: p.ovr, salary: p.salary, inj: !!p.inj, stats: p.stats })), logoSvg: logoSvg(t.logo), logo: t.logo, look: t.look, lookName: (LOOKS.find((x) => x.id === t.look) || LOOKS[0]).name, founded: !!t.founded, half: t.half ? { a: t.half.a, b: t.half.b, oppName: t.league[t.half.opp].name, style: t.half.style } : null, played: t.played && t.played.year === a ? t.played : null, canPlay: !!staffOf(t, 'head_coach') && !(t.played && t.played.year === a), hasMatch: !!t.match, nextOpp: t.league.length ? t.league[pickOpp(t)].name : null, staff: t.staff.map((x) => ({ ...x, roleName: F().roles.find((r) => r.id === x.role).name, icon: F().roles.find((r) => r.id === x.role).icon })), last: t.last, rating: rating(t), facilities: FAC.map((f) => ({ ...f, level: facLvl(t, f.id), max: 3, cost: facLvl(t, f.id) >= 3 ? null : facCost(t, f.id) })), finance: finance(t), hist: t.hist, league: t.league.map((o) => ({ name: o.name, str: o.str })) } };
}
