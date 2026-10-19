// Racing: NASCAR-style stock cars plus open-wheel, rally, drag and motorbike series (all fictional).
// Careers (driver, pit crew, crew chief, team manager, racing coach) climb three tiers per series type behind a licence ladder;
// team ownership (built on franchise.js logos/hub conventions) has staff, drivers, car/engine/pit/factory upgrades, sponsors, itemised finances and a race season.
// Every race (career or team) uses the same season engine; `frames()` is a pure function that makes the 2D replay.
import { fmtMoney } from './fmt.js';
import { rnd, rint, chance, clamp, gauss } from './rng.js';
import { log, earn } from './core.js';
import { logoSvg, normLogo, autoLogo, cleanName } from './franchise.js';

const R = Math.round, age = (s) => Math.floor(s.age);
const money = (n) => fmtMoney(n);
const hashStr = (str) => { let h = 2166136261; for (const c of String(str)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
const lcg = (seed) => { let t = seed >>> 0; return () => { t += 0x6d2b79f5; let x = Math.imul(t ^ (t >>> 15), 1 | t); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; }; };
const gl = (r) => { let u = 0; for (let i = 0; i < 6; i++) u += r(); return (u - 3) / 0.7071; };

export const MIN_AGE = 16, OWN_AGE = 21;
export const TYPES = [
  { id: 'stock', name: 'Stock car', icon: '🏁', track: 'oval', blurb: 'Heavy fendered cars on banked ovals: draft, pit and survive.' },
  { id: 'open', name: 'Open-wheel', icon: '🏎️', track: 'oval', blurb: 'Light, fast single-seaters on road circuits.' },
  { id: 'rally', name: 'Rally', icon: '🚙', track: 'rally', blurb: 'Gravel and tarmac stages against the clock.' },
  { id: 'drag', name: 'Drag racing', icon: '🔥', track: 'drag', blurb: 'Quarter-mile launches, all about reaction and power.' },
  { id: 'moto', name: 'Motorbike', icon: '🏍️', track: 'oval', blurb: 'Two-wheel circuit racing: fitness and nerve.' }];
const NAMES = { stock: ['Dirt Oval Late Models', 'Heartland Stock Series', 'Apex Stock Cup'], open: ['Nova Junior Formula', 'Nova Formula Series', 'Grand Prix World Championship'], rally: ['Regional Gravel Cup', 'Pro Rally Series', 'World Rally Tour'], drag: ['Street Drag League', 'Pro Quarter-Mile Series', 'Nitro Drag Championship'], moto: ['Junior Moto Cup', 'Superbike Series', 'MotoWorld Grand Prix'] };
export const TIERS = [
  { id: 0, name: 'Grassroots', races: 8, field: 10, str: 38, salary: 30000, purse: 15000, tv: 70000, spons: 50000, run: 5000, travel: 2000, cost: 400000, ts: 0.35, fee: 500 },
  { id: 1, name: 'Regional', races: 10, field: 12, str: 55, salary: 150000, purse: 100000, tv: 900000, spons: 700000, run: 60000, travel: 25000, cost: 6e6, ts: 2.5, fee: 5000 },
  { id: 2, name: 'Premier', races: 12, field: 14, str: 72, salary: 1.2e6, purse: 700000, tv: 9e6, spons: 7e6, run: 500000, travel: 200000, cost: 6e7, ts: 18, fee: 25000 }];
export const SERIES = TYPES.flatMap((t) => TIERS.map((ti) => ({ id: `${t.id}_${ti.id}`, type: t.id, tier: ti.id, name: NAMES[t.id][ti.id], icon: t.icon, track: t.track, races: ti.races, field: ti.field })));
export const seriesDef = (type, tier) => SERIES.find((x) => x.type === type && x.tier === tier) || null;
export const ROLES = [
  { id: 'driver', name: 'Driver', icon: '🏁', minAge: 16, sal: 1, k: 0, desc: 'Race in the series; your stats decide the result.' },
  { id: 'pit_crew', name: 'Pit crew', icon: '🔧', minAge: 16, sal: 0.25, k: 0.10, desc: 'Fast stops win races.' },
  { id: 'crew_chief', name: 'Crew chief', icon: '🧰', minAge: 24, sal: 0.6, k: 0.18, desc: 'Setup and strategy for the car.' },
  { id: 'racing_coach', name: 'Racing coach', icon: '🎓', minAge: 26, sal: 0.5, k: 0.12, desc: 'Sharpens the driver you work with.' },
  { id: 'team_manager', name: 'Team manager', icon: '📋', minAge: 28, sal: 1.0, k: 0.08, desc: 'Runs the team: sponsors, budgets, contracts.' }];
export const STATS = [{ id: 'pace', name: 'Pace', w: 0.3 }, { id: 'racecraft', name: 'Racecraft', w: 0.25 }, { id: 'consistency', name: 'Consistency', w: 0.2 }, { id: 'fitness', name: 'Fitness', w: 0.1 }, { id: 'technical', name: 'Technical feedback', w: 0.15 }];
export const LICENSES = [{ id: 1, name: 'Karting / club licence', fee: 500 }, { id: 2, name: 'Regional licence', fee: 5000 }, { id: 3, name: 'Super licence', fee: 25000 }];
export const TROLES = [
  { id: 'crew_chief', name: 'Crew chief', icon: '🧰', required: true, sal: 50000, desc: 'Car setup and race strategy: car performance' },
  { id: 'engine_builder', name: 'Engine builder', icon: '⚙️', required: true, sal: 45000, desc: 'Power and reliability: fewer breakdowns' },
  { id: 'pit_chief', name: 'Pit chief', icon: '⏱️', required: true, sal: 35000, desc: 'Pit-stop speed' },
  { id: 'team_manager', name: 'Team manager', icon: '📋', required: true, sal: 60000, desc: 'Keeps costs down and sponsors happy' },
  { id: 'engineer', name: 'Aero engineer', icon: '📐', required: false, sal: 40000, desc: 'Extra car performance' },
  { id: 'marketing', name: 'Marketing manager', icon: '📣', required: false, sal: 35000, desc: 'Better sponsor offers and fan growth' }];
export const FACS = [
  { id: 'car', name: 'Chassis shop', icon: '🛠️', effect: 'Car performance +3.2 per level' },
  { id: 'engine', name: 'Engine shop', icon: '⚙️', effect: 'Power +2.8 per level, fewer breakdowns' },
  { id: 'pit', name: 'Pit equipment', icon: '⏱️', effect: 'Faster stops: +0.8 per level' },
  { id: 'factory', name: 'Factory', icon: '🏭', effect: 'Level 2: second car, level 4: third car; raises upkeep' }];
export const STRATS = [{ id: 'safe', name: 'Safe', note: '-1.5 pace, far fewer crashes' }, { id: 'balanced', name: 'Balanced', note: 'No change' }, { id: 'aggressive', name: 'Aggressive', note: '+2 pace, more crashes' }];
const POINTS = [25, 20, 16, 13, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
const TEAM_A = ['Ironclad', 'Redline', 'Blue Ridge', 'Thunder Hollow', 'Summit', 'Granite', 'Falcon', 'Harbor', 'Copperhead', 'Northstar', 'Silverline', 'Prairie', 'Cobalt', 'Ember', 'Black Mesa', 'Lone Pine'];
const TEAM_B = ['Racing', 'Motorsports', 'Competition', 'Performance', 'Speedworks'];
const FIRST = ['Dale', 'Cody', 'Maya', 'Ruben', 'Tess', 'Hank', 'Lena', 'Ozzy', 'Priya', 'Jax', 'Nora', 'Emil', 'Rae', 'Tomas', 'Kira', 'Walt', 'Dina', 'Marco'];
const LAST = ['Calloway', 'Brandt', 'Okafor', 'Vance', 'Lindqvist', 'Reyes', 'Marsh', 'Tanaka', 'Boyd', 'Novak', 'Ellis', 'Duarte', 'Pryce', 'Hale', 'Sorensen', 'Mbeki', 'Quill', 'Rowan'];
const TRACKS = ['Red Clay Speedway', 'Harbor Bend', 'Cedar Flats', 'Thunder Ridge', 'Copper Basin', 'Lakeshore Ring', 'Pine Hollow', 'Salt Mesa', 'Northgate', 'Old Quarry', 'Midland Oval', 'Granite Falls', 'Sunset Bowl', 'Dry Creek'];
const COLORS = ['#d94a4a', '#3b6fd1', '#f2c14e', '#4caf6a', '#7e57c2', '#e8743b', '#2aa7a7', '#e0e0e0', '#ff7ab8', '#8d6e63'];

export const ensure = (s) => { if (!s.rc) s.rc = { license: 0, stats: null, craft: 0, trainedYear: -1, career: null, team: null, history: [], lastYear: -1 }; return s.rc; };
const T = (n) => TIERS[clamp(n, 0, 2)];
const need = (s) => (s.rc && s.rc.team) || null;
export const skillOf = (rc) => { if (!rc.stats) return 0; return R(STATS.reduce((a, x) => a + rc.stats[x.id] * x.w, 0)); };
const drvSkill = (d) => R(STATS.reduce((a, x) => a + d.stats[x.id] * x.w, 0));
const rname = (r) => `${FIRST[Math.floor(r() * FIRST.length)]} ${LAST[Math.floor(r() * LAST.length)]}`;
const tname = (r) => `${TEAM_A[Math.floor(r() * TEAM_A.length)]} ${TEAM_B[Math.floor(r() * TEAM_B.length)]}`;

// ---------- licences, stats, training ----------
export function licenseInfo(s) {
  const rc = ensure(s), a = age(s), lv = rc.license, nx = LICENSES[lv] || null; if (!nx) return { level: lv, names: LICENSES, next: null };
  const sk = rc.career && rc.career.role !== 'driver' ? Math.round(rc.craft) : skillOf(rc), best = rc.career ? (rc.career.best || 99) : 99, yrs = rc.career ? rc.career.years : 0; let reason = '';
  if (a < MIN_AGE) reason = `Needs age ${MIN_AGE}.`; else if (nx.id === 2 && !(rc.career && sk >= 45 && yrs >= 1)) reason = 'Needs skill 45+ and a season in a series.'; else if (nx.id === 3 && !(sk >= 65 && best <= 5 && rc.career && rc.career.tier >= 1)) reason = 'Needs skill 65+ and a top-5 season in a Regional series.';
  return { level: lv, names: LICENSES, next: { id: nx.id, name: nx.name, fee: nx.fee, eligible: !reason, reason } };
}
export function getLicense(s) { const rc = ensure(s), i = licenseInfo(s); if (!i.next) return { ok: false, msg: 'You already hold every licence.' }; if (!i.next.eligible) return { ok: false, msg: i.next.reason }; if (s.cash < i.next.fee) return { ok: false, msg: `The fee is ${money(i.next.fee)}.` }; s.cash -= i.next.fee; rc.license = i.next.id; log(s, `I earned my ${i.next.name}.`, 'job'); return { ok: true, msg: `You earned the ${i.next.name}.` }; }
function initStats(s, rc) { if (rc.stats) return; const h = (s.stats && s.stats.health) || 60; rc.stats = { pace: R(24 + gauss(s) * 4), racecraft: R(24 + gauss(s) * 4), consistency: R(24 + gauss(s) * 4), fitness: R(14 + h * 0.3 + gauss(s) * 3), technical: R(22 + gauss(s) * 4) }; if (!rc.craft) rc.craft = R(24 + gauss(s) * 4); }
export function train(s, what) {
  const rc = ensure(s), c = rc.career; if (!c) return { ok: false, msg: 'Start a racing career first.' }; if (age(s) < MIN_AGE) return { ok: false, msg: 'Too young.' }; if (rc.trainedYear === age(s)) return { ok: false, msg: 'You already trained this year.' };
  const cost = 2000 * (1 + rc.license) * (1 + c.tier * 2); if (s.cash < cost) return { ok: false, msg: `Training costs ${money(cost)}.` };
  const isD = c.role === 'driver', k = isD ? what : 'craft'; if (isD && !STATS.some((x) => x.id === k)) return { ok: false, msg: 'Pick a stat to train.' };
  const cur = isD ? rc.stats[k] : rc.craft, gain = Math.max(1, R((7 - cur / 20) * (0.8 + rnd(s) * 0.5))); s.cash -= cost; if (isD) rc.stats[k] = clamp(cur + gain, 5, 99); else rc.craft = clamp(cur + gain, 5, 99); rc.trainedYear = age(s);
  return { ok: true, msg: `Trained ${isD ? STATS.find((x) => x.id === k).name : 'your craft'} +${gain} (${money(cost)}).` };
}

// ---------- season engine (shared by careers and teams) ----------
const entryFrom = (key, name, team, rating, sd, dnfP, mine, num, color) => ({ key, name, team, rating: +rating.toFixed(1), sd: +sd.toFixed(1), dnfP: +dnfP.toFixed(3), mine: !!mine, num, color, pts: 0, wins: 0, pod: 0, dnf: 0, prize: 0 });
export function newSeason(s, series, mine) {
  const ti = T(series.tier), y = age(s), r = lcg(hashStr(`${s.name}|${s.birthYear}|${series.id}|${y}`)), id = `${series.id}|${y}`, entries = mine.slice();
  const used = new Set(entries.map((e) => e.team));
  while (entries.length < ti.field) { let tn = tname(r); while (used.has(tn)) tn = tname(r); used.add(tn); const car = ti.str + gl(r) * 6, drv = ti.str + gl(r) * 6, nm = rname(r); entries.push(entryFrom(`ai${entries.length}`, nm, tn, 0.55 * car + 0.45 * drv, 6.5, 0.07, false, 1 + Math.floor(r() * 98), COLORS[Math.floor(r() * COLORS.length)])); }
  entries.forEach((e, i) => { e.num = e.num || 1 + ((i * 17 + hashStr(e.name)) % 98); e.color = e.color || COLORS[i % COLORS.length]; });
  const tracks = TRACKS.slice().sort(() => r() - 0.5).slice(0, ti.races);
  return { id, year: y, seriesId: series.id, type: series.type, tier: series.tier, races: ti.races, tracks, next: 0, entries, results: [], last: null, done: false };
}
const standings = (se) => se.entries.slice().sort((a, b) => b.pts - a.pts || b.wins - a.wins || b.pod - a.pod).map((e, i) => ({ pos: i + 1, name: e.name, team: e.team, pts: e.pts, wins: e.wins, mine: e.mine, key: e.key }));
export function runRace(s, se) {
  if (se.done || se.next >= se.races) return null; const n = se.next, ti = T(se.tier);
  const scored = se.entries.map((e) => { const dnf = chance(s, e.dnfP); return { e, perf: e.rating + gauss(s) * e.sd, dnf, at: dnf ? 0.12 + rnd(s) * 0.7 : 1 }; });
  const fin = scored.filter((x) => !x.dnf).sort((a, b) => b.perf - a.perf), out = scored.filter((x) => x.dnf).sort((a, b) => b.at - a.at), order = [...fin, ...out];
  const order2 = order.map((x, i) => { const pos = i + 1; x.e.pts += POINTS[i] || 0; if (pos === 1) x.e.wins++; if (pos <= 3) x.e.pod++; if (x.dnf) x.e.dnf++; const prize = R(ti.purse * 0.3 * Math.pow(0.74, i)); x.e.prize += prize; return { key: x.e.key, name: x.e.name, team: x.e.team, num: x.e.num, color: x.e.color, mine: x.e.mine, pos, dnfAt: x.dnf ? +x.at.toFixed(2) : null, prize }; });
  const seed = Math.floor(rnd(s) * 1e9), track = se.tracks[n], laps = se.type === 'drag' || se.type === 'rally' ? 1 : 6;
  se.last = { n: n + 1, of: se.races, track, type: se.type, laps, seed, order: order2 }; se.results.push({ n: n + 1, track, winner: order2[0].name, mine: order2.filter((x) => x.mine).map((x) => x.pos) }); se.next++; if (se.next >= se.races) se.done = true;
  return se.last;
}
// pure replay frames (no RNG use): u = laps completed (0..laps), lane 0..1
export function frames(race) {
  if (!race) return []; const r = lcg(race.seed), n = race.order.length, cars = race.order.map((o, i) => ({ o, ph: r() * 6.28, fr: 1.2 + r() * 1.6, amp: 0.05 + r() * 0.12, lane: ((i * 7) % n) / Math.max(1, n - 1), speed: 1 - i * 0.011 })), out = [];
  for (let t = 0; t <= 100; t++) { const k = t / 100, cs = cars.map((c) => { const stop = c.o.dnfAt != null ? c.o.dnfAt : 2, tt = Math.min(k, stop), calm = (1 - tt), u = race.laps * (tt * c.speed + Math.sin(c.ph + tt * 6.28 * c.fr) * c.amp * calm * 0.2); return { u: +Math.max(0, u).toFixed(4), lane: +c.lane.toFixed(3), out: k >= stop, mine: c.o.mine, num: c.o.num, color: c.o.color }; }); const lead = cs.reduce((b, c, i) => (c.u > cs[b].u ? i : b), 0); out.push({ t, cars: cs, lead, leader: race.order[lead].name }); }
  return out;
}

// ---------- careers ----------
export function join(s, role, type) {
  const rc = ensure(s), a = age(s), rd = ROLES.find((x) => x.id === role); if (!rd) return { ok: false, msg: 'Unknown role.' }; if (!TYPES.some((x) => x.id === type)) return { ok: false, msg: 'Pick a racing type.' };
  if (a < rd.minAge) return { ok: false, msg: `${rd.name}s must be ${rd.minAge}+.` }; if (rc.career) return { ok: false, msg: 'You already have a racing career. Quit it first.' };
  if (rc.license < 1) { const lic = LICENSES[0]; if (s.cash < lic.fee) return { ok: false, msg: `You need a ${lic.name} (${money(lic.fee)}).` }; s.cash -= lic.fee; rc.license = 1; }
  initStats(s, rc); const ser = seriesDef(type, 0), r = lcg(hashStr(`${s.name}|seat|${type}|${a}`)), team = tname(r);
  rc.career = { role, type, tier: 0, team, car: R(T(0).str - 8 + gl(r) * 4), drv: R(T(0).str - 4 + gl(r) * 4), years: 0, wins: 0, podiums: 0, titles: 0, earnings: 0, best: 99, hist: [], canMove: false, season: null }; rc.career.season = careerSeason(s, rc);
  log(s, `I started a racing career as a ${rd.name.toLowerCase()} in the ${ser.name}.`, 'job'); return { ok: true, msg: `You joined ${team} as a ${rd.name.toLowerCase()} (${ser.name}).` };
}
function myRating(rc) { const c = rc.career; if (c.role === 'driver') return 0.55 * c.car + 0.45 * skillOf(rc); const rd = ROLES.find((x) => x.id === c.role); return 0.55 * c.car + 0.45 * c.drv + (rc.craft - 40) * rd.k; }
function careerSeason(s, rc) { const c = rc.career, ser = seriesDef(c.type, c.tier), sd = c.role === 'driver' ? Math.max(3, 8 - (rc.stats.consistency - 40) * 0.05) : 6.5, dn = c.role === 'driver' ? clamp(0.07 + (50 - rc.stats.consistency) * 0.0012, 0.02, 0.2) : 0.07; return newSeason(s, ser, [entryFrom('me', c.role === 'driver' ? s.name : `${c.team} #1`, c.team, myRating(rc), sd, dn, true, null, '#d94a4a')]); }
export function careerRace(s, all = false) {
  const rc = ensure(s), c = rc.career; if (!c) return { ok: false, msg: 'No racing career.' }; const se = c.season; if (!se || se.done) return { ok: false, msg: 'The season is over. Age up for the next one.' }; let last; do { last = runRace(s, se); } while (all && !se.done);
  const mine = last.order.find((x) => x.mine); return { ok: true, msg: `${last.track}: ${c.role === 'driver' ? 'you finished' : 'your team finished'} P${mine.pos}${mine.dnfAt != null ? ' (did not finish)' : ''}.`, race: last };
}
function finishCareer(s, rc) {
  const c = rc.career, se = c.season; if (!se) return; while (!se.done) runRace(s, se); const st = standings(se), me = st.find((x) => x.mine), e = se.entries.find((x) => x.mine), ti = T(c.tier), rd = ROLES.find((x) => x.id === c.role);
  const salary = R(ti.salary * rd.sal * (0.5 + clamp(c.car, 10, 100) / 100)), bonus = R(e.prize * (c.role === 'driver' ? 0.25 : 0.08) + e.wins * ti.salary * 0.04 * rd.sal), pay = salary + bonus; earn(s, pay); c.earnings += pay; c.years++; c.wins += e.wins; c.podiums += e.pod; c.best = Math.min(c.best, me.pos); if (me.pos === 1) c.titles++;
  c.hist.push({ year: se.year, series: seriesDef(c.type, c.tier).name, pos: me.pos, pts: e.pts, wins: e.wins, pay }); if (c.hist.length > 20) c.hist.shift();
  const top = me.pos <= 3; c.car = clamp(R(c.car + (top ? 4 : me.pos > se.entries.length - 3 ? -4 : 0) + gauss(s) * 2), 12, 95); c.canMove = c.tier < 2 && top && rc.license >= c.tier + 2;
  if (rc.career.role === 'driver') for (const x of STATS) rc.stats[x.id] = clamp(R(rc.stats[x.id] + 1.5 + gauss(s) * 0.8 - (age(s) > 38 ? (x.id === 'fitness' || x.id === 'pace' ? 2.5 : 1) : 0)), 5, 99); else rc.craft = clamp(R(rc.craft + 2 + gauss(s)), 5, 99);
  log(s, `${rd.name} season in the ${seriesDef(c.type, c.tier).name}: P${me.pos}, earned ${money(pay)}.`, 'job'); c.last = { year: se.year, pos: me.pos, pay, salary, bonus };
}
export function moveUp(s) { const rc = ensure(s), c = rc.career; if (!c) return { ok: false, msg: 'No racing career.' }; if (!c.canMove) return { ok: false, msg: 'No promotion offer (finish top 3 and hold the next licence).' }; c.tier++; c.canMove = false; const r = lcg(hashStr(`${s.name}|up|${c.tier}|${age(s)}`)); c.team = tname(r); c.car = R(T(c.tier).str - 7 + gl(r) * 3); c.drv = R(T(c.tier).str - 4 + gl(r) * 3); c.best = 99; c.season = careerSeason(s, rc); log(s, `I moved up to the ${seriesDef(c.type, c.tier).name}.`, 'job'); return { ok: true, msg: `Promoted to ${c.team} in the ${seriesDef(c.type, c.tier).name}.` }; }
export function quit(s) { const rc = ensure(s), c = rc.career; if (!c) return { ok: false, msg: 'No racing career.' }; rc.history.push({ role: c.role, type: c.type, tier: c.tier, years: c.years, titles: c.titles, wins: c.wins, earnings: c.earnings }); rc.career = null; return { ok: true, msg: 'You left racing.' }; }

// ---------- team ownership ----------
export const teamCost = (tier) => T(tier).cost;
export function catalog(s, type, tier) {
  const r = lcg(hashStr(`${s.name}|${s.birthYear}|cat|${type}|${tier}`)), ti = T(tier), out = [], used = new Set();
  for (let i = 0; i < 6; i++) { let nm = tname(r); while (used.has(nm)) nm = tname(r); used.add(nm); const q = gl(r), lv = { car: clamp(R(1.5 + q * 0.8 + gl(r) * 0.5), 0, 4), engine: clamp(R(1.5 + q * 0.8 + gl(r) * 0.5), 0, 4), pit: clamp(R(1 + q * 0.5), 0, 3), factory: clamp(R(1 + q * 0.6), 0, 3) }; out.push({ id: `${type}_${tier}_${i}`, name: nm, type, tier, price: R(ti.cost * clamp(0.9 + q * 0.2, 0.55, 1.5) / 1000) * 1000, rep: clamp(R(40 + q * 12), 15, 80), levels: lv, base: +(q * 2).toFixed(1) }); }
  return out;
}
const genDriver = (r, tier, q, id) => { const st = {}; for (const x of STATS) st[x.id] = clamp(R(q + gl(r) * 7), 8, 97); const sk = R(STATS.reduce((a, x) => a + st[x.id] * x.w, 0)); return { id, name: rname(r), age: 19 + Math.floor(r() * 16), stats: st, salary: R(T(tier).salary * 0.7 * (0.4 + sk / 80) / 1000) * 1000 }; };
export function driverMarket(s) { const t = need(s); if (!t) return []; const r = lcg(hashStr(`${s.name}|drv|${t.id}|${age(s)}|${t.drivers.length}`)), q = T(t.tier).str - 6 + (t.rep - 40) * 0.2; return [0, 1, 2, 3].map((i) => { const d = genDriver(r, t.tier, q + gl(r) * 6, `d${age(s)}_${i}`); return { ...d, skill: drvSkill(d), fee: R(d.salary * 0.25) }; }); }
export function staffMarket(s, roleId) { const t = need(s), rd = TROLES.find((x) => x.id === roleId); if (!t || !rd) return []; const r = lcg(hashStr(`${s.name}|stf|${t.id}|${roleId}|${age(s)}`)), q = 38 + t.rep * 0.25; return [0, 1, 2, 3].map((i) => { const skill = clamp(R(q + gl(r) * 14), 15, 95), salary = R(rd.sal * T(t.tier).ts * (0.6 + skill / 100) / 100) * 100; return { id: `s${age(s)}_${roleId}_${i}`, role: roleId, name: rname(r), skill, salary, fee: R(salary * 0.25) }; }); }
const staffOf = (t, id) => t.staff.find((x) => x.role === id) || null;
const lvl = (t, id) => (t.fac && t.fac[id]) || 0;
const maxCars = (t) => 1 + (lvl(t, 'factory') >= 2 ? 1 : 0) + (lvl(t, 'factory') >= 4 ? 1 : 0);
export const facCost = (t, id) => R(T(t.tier).cost * 0.05 * (lvl(t, id) + 1) / 1000) * 1000;
export function staffing(t) { const f = (id, k) => { const x = staffOf(t, id); return x ? (x.skill - 50) * k : -3; }; const missing = TROLES.filter((r) => r.required && !staffOf(t, r.id)).map((r) => r.name), mg = staffOf(t, 'team_manager'), mk = staffOf(t, 'marketing'); return { missing, car: f('crew_chief', 0.12) + f('engineer', 0.06) * (staffOf(t, 'engineer') ? 1 : 0), engine: f('engine_builder', 0.10), pit: f('pit_chief', 0.06), cost: mg ? 1.12 - 0.22 * mg.skill / 100 : 1.25, spons: mk ? 1 + mk.skill / 250 : 1 }; }
function carRating(t) { const st = staffing(t); return T(t.tier).str - 6 + t.base + 3.2 * lvl(t, 'car') + 2.8 * lvl(t, 'engine') + 0.8 * lvl(t, 'pit') + st.car + st.engine + st.pit + (t.strat === 'aggressive' ? 2 : t.strat === 'safe' ? -1.5 : 0); }
const racers = (t) => t.drivers.slice().sort((a, b) => drvSkill(b) - drvSkill(a)).slice(0, maxCars(t));
function teamEntries(t) { const car = carRating(t), st = staffing(t), eng = lvl(t, 'engine'); return racers(t).map((d, i) => entryFrom(`my${i}`, d.name, t.name, 0.55 * car + 0.45 * drvSkill(d), Math.max(3, 8 - (d.stats.consistency - 40) * 0.05), clamp(0.07 + (50 - d.stats.consistency) * 0.0012 - eng * 0.006 - (st.engine > 0 ? 0.01 : 0) + (t.strat === 'aggressive' ? 0.04 : t.strat === 'safe' ? -0.03 : 0), 0.02, 0.22), true, null, t.logo ? normLogo(t.logo).colors[0] : '#d94a4a')); }
export const value = (s) => { const t = need(s); if (!t) return 0; const fac = FACS.reduce((a, f) => a + lvl(t, f.id), 0); return Math.max(0, R(T(t.tier).cost * (0.4 + fac * 0.05 + t.rep / 250) + t.cash - t.debt)); };
function baseTeam(s, o, nm, ser, extra) { return { id: extra.id, name: nm, type: o.type, tier: o.tier, logo: normLogo(o.logo || autoLogo(nm)), cash: extra.cash, debt: extra.debt || 0, rep: extra.rep, fans: R(1000 * Math.pow(6, o.tier) * (0.4 + extra.rep / 60)), base: extra.base, fac: extra.fac, staff: [], drivers: [], strat: 'balanced', sponsors: [], offers: [], season: null, last: null, hist: [], titles: 0, wins: 0, years: 0, distress: 0, lastYear: -1, founded: !!extra.founded, policy: { auto: true } }; }
export function quote(s, o = {}) { const ti = T(o.tier); return { team: o.teamId ? (catalog(s, o.type, o.tier).find((x) => x.id === o.teamId) || {}).price || 0 : R(ti.cost * 0.3 / 1000) * 1000, operating: R(ti.cost * 0.25) }; }
function start(s, t) { const rc = ensure(s), r = lcg(hashStr(`${s.name}|d0|${t.id}`)); t.drivers.push(genDriver(r, t.tier, T(t.tier).str - 8, 'd0')); rc.team = t; t.season = newSeason(s, seriesDef(t.type, t.tier), teamEntries(t)); t.offers = genOffers(s, t); }
function check(s, o) { const rc = ensure(s); if (age(s) < OWN_AGE) return `You must be ${OWN_AGE}+ to own a racing team.`; if (rc.team) return 'You already own a racing team.'; if (!TYPES.some((x) => x.id === o.type)) return 'Pick a racing type.'; if (!(o.tier >= 0 && o.tier <= 2)) return 'Pick a series tier.'; return null; }
export function buy(s, o = {}) {
  const e = check(s, o); if (e) return { ok: false, msg: e }; const c = catalog(s, o.type, o.tier).find((x) => x.id === o.teamId); if (!c) return { ok: false, msg: 'Pick a team from the list.' }; const q = quote(s, o), total = q.team + q.operating; if (s.cash < total) return { ok: false, msg: `Needs ${money(total)} (team + operating cash).` };
  s.cash -= total; const t = baseTeam(s, o, c.name, null, { id: c.id, cash: q.operating, rep: c.rep, base: c.base, fac: { ...c.levels } }); start(s, t); log(s, `I bought ${t.name} (${seriesDef(o.type, o.tier).name}).`, 'biz'); return { ok: true, msg: `You bought ${t.name}. Hire staff and sign drivers.` };
}
export function create(s, o = {}) {
  const e = check(s, o); if (e) return { ok: false, msg: e }; const nm = cleanName(o.name); if (nm.length < 3) return { ok: false, msg: 'Name your team (3-28 letters).' }; if (TEAM_A.some((a) => TEAM_B.some((b) => `${a} ${b}`.toLowerCase() === nm.toLowerCase()))) return { ok: false, msg: 'That name belongs to an existing team.' };
  const q = quote(s, { ...o, teamId: null }), total = q.team + q.operating; if (s.cash < total) return { ok: false, msg: `Needs ${money(total)} (founding fee + operating cash).` };
  s.cash -= total; const t = baseTeam(s, o, nm, null, { id: `new_${o.type}_${hashStr(nm)}`, cash: q.operating, rep: 15, base: -3, fac: { car: 0, engine: 0, pit: 0, factory: 0 }, founded: true }); start(s, t); log(s, `I founded ${nm} (${seriesDef(o.type, o.tier).name}).`, 'biz'); return { ok: true, msg: `${nm} is on the grid. Hire staff and sign drivers.` };
}
export function hire(s, roleId, id) { const t = need(s); if (!t) return { ok: false, msg: 'No team.' }; const c = staffMarket(s, roleId).find((x) => x.id === id); if (!c) return { ok: false, msg: 'That candidate is gone.' }; if (staffOf(t, roleId)) return { ok: false, msg: 'Let the current one go first.' }; if (t.cash < c.fee) return { ok: false, msg: `Needs ${money(c.fee)} in team cash.` }; t.cash -= c.fee; t.staff.push(c); return { ok: true, msg: `Hired ${c.name} (quality ${c.skill}).` }; }
export function fire(s, id) { const t = need(s); if (!t) return { ok: false, msg: 'No team.' }; const i = t.staff.findIndex((x) => x.id === id); if (i < 0) return { ok: false, msg: 'Not on staff.' }; const [x] = t.staff.splice(i, 1); t.cash -= R(x.salary * 0.25); return { ok: true, msg: `${x.name} let go.` }; }
export function signDriver(s, id) { const t = need(s); if (!t) return { ok: false, msg: 'No team.' }; if (t.drivers.length >= maxCars(t) + 1) return { ok: false, msg: `Roster full (${maxCars(t)} cars + 1 reserve). Upgrade the factory or release a driver.` }; const c = driverMarket(s).find((x) => x.id === id); if (!c) return { ok: false, msg: 'That driver is gone.' }; if (t.cash < c.fee) return { ok: false, msg: `Needs ${money(c.fee)} in team cash.` }; t.cash -= c.fee; const { fee, skill, ...d } = c; t.drivers.push(d); refreshEntries(t); return { ok: true, msg: `Signed ${c.name} (skill ${c.skill}).` }; }
export function releaseDriver(s, id) { const t = need(s); if (!t) return { ok: false, msg: 'No team.' }; if (t.drivers.length <= 1) return { ok: false, msg: 'You need at least one driver.' }; const i = t.drivers.findIndex((x) => x.id === id); if (i < 0) return { ok: false, msg: 'No such driver.' }; const [d] = t.drivers.splice(i, 1); t.cash -= R(d.salary * 0.25); refreshEntries(t); return { ok: true, msg: `${d.name} released.` }; }
function refreshEntries(t) { const se = t.season; if (!se || se.done || se.next > 0) return; const mine = teamEntries(t); se.entries = [...mine, ...se.entries.filter((e) => !e.mine)].slice(0, T(t.tier).field + 2); }
export function upgrade(s, id) { const t = need(s); if (!t) return { ok: false, msg: 'No team.' }; const f = FACS.find((x) => x.id === id); if (!f) return { ok: false, msg: 'Unknown facility.' }; const lv = lvl(t, id); if (lv >= 5) return { ok: false, msg: `${f.name} is at the top level.` }; const c = facCost(t, id); if (t.cash < c && s.cash < c) return { ok: false, msg: `Needs ${money(c)}.` }; if (t.cash >= c) t.cash -= c; else s.cash -= c; t.fac = { ...t.fac, [id]: lv + 1 }; log(s, `${t.name} upgraded the ${f.name} to level ${lv + 1}.`, 'biz'); refreshRatings(t); return { ok: true, msg: `${f.name} is now level ${lv + 1} (${money(c)}).` }; }
function refreshRatings(t) { const se = t.season; if (!se || se.done) return; const mine = teamEntries(t); mine.forEach((m, i) => { const e = se.entries.filter((x) => x.mine)[i]; if (e) { e.rating = m.rating; e.sd = m.sd; e.dnfP = m.dnfP; e.name = m.name; } }); }
export function setStrategy(s, id) { const t = need(s); if (!t) return { ok: false, msg: 'No team.' }; if (!STRATS.some((x) => x.id === id)) return { ok: false, msg: 'Unknown strategy.' }; t.strat = id; refreshRatings(t); return { ok: true, msg: `Race strategy: ${id}.` }; }
export function setLogo(s, logo) { const t = need(s); if (!t) return { ok: false, msg: 'No team.' }; t.logo = normLogo(logo); return { ok: true, msg: 'New logo.' }; }
export function fund(s, amt) { const t = need(s); amt = Math.floor(amt); if (!t) return { ok: false, msg: 'No team.' }; if (!(amt > 0) || amt > s.cash) return { ok: false, msg: 'Not enough cash.' }; s.cash -= amt; t.cash += amt; return { ok: true, msg: `Added ${money(amt)}.` }; }
export function withdraw(s, amt) { const t = need(s); amt = Math.floor(amt); if (!t) return { ok: false, msg: 'No team.' }; if (!(amt > 0) || amt > t.cash) return { ok: false, msg: 'The team does not have that much.' }; t.cash -= amt; earn(s, amt); return { ok: true, msg: `Took ${money(amt)} out.` }; }
export function sell(s) { const t = need(s); if (!t) return { ok: false, msg: 'No team.' }; const v = R(value(s) * 0.85); earn(s, v); log(s, `I sold ${t.name} for ${money(v)}.`, 'biz'); ensure(s).history.push({ team: t.name, years: t.years, titles: t.titles, sold: v }); ensure(s).team = null; return { ok: true, msg: `Sold for ${money(v)}.` }; }
// sponsors
function genOffers(s, t) { const r = lcg(hashStr(`${s.name}|spo|${t.id}|${age(s)}`)), ti = T(t.tier), mk = staffing(t).spons, slots = [['title', 1.0, 40], ['primary', 0.55, 25], ['associate', 0.25, 10]], brands = ['Gulf Coast Fuel', 'Pinecrest Tires', 'Bolt Energy', 'Anvil Tools', 'Redwood Insurance', 'Summit Telecom', 'Ridgeback Trucks', 'Clearwater Foods', 'Lumen Batteries', 'Fortis Steel']; return slots.flatMap(([kind, f, minRep], i) => [0, 1].map((j) => ({ id: `o${age(s)}_${i}${j}`, kind, name: brands[Math.floor(r() * brands.length)], pay: R(ti.spons * f * (0.5 + t.rep / 100) * (0.85 + r() * 0.3) * mk / 1000) * 1000, years: 1 + Math.floor(r() * 3), minRep })).filter((o) => t.rep >= o.minRep)); }
const slotsOf = (t) => ({ title: 1, primary: 1 + (t.rep > 50 ? 1 : 0), associate: 2 + (t.rep > 40 ? 1 : 0) });
export function acceptSponsor(s, id) { const t = need(s); if (!t) return { ok: false, msg: 'No team.' }; const o = t.offers.find((x) => x.id === id); if (!o) return { ok: false, msg: 'That offer expired.' }; if (t.sponsors.filter((x) => x.kind === o.kind).length >= slotsOf(t)[o.kind]) return { ok: false, msg: `No free ${o.kind} slot.` }; if (t.rep < o.minRep) return { ok: false, msg: `Needs reputation ${o.minRep}.` }; t.sponsors.push({ id: o.id, kind: o.kind, name: o.name, pay: o.pay, years: o.years }); t.offers = t.offers.filter((x) => x.id !== id); return { ok: true, msg: `${o.name} signed as ${o.kind} sponsor: ${money(o.pay)}/yr for ${o.years} yr.` }; }
export function dropSponsor(s, id) { const t = need(s); if (!t) return { ok: false, msg: 'No team.' }; const i = t.sponsors.findIndex((x) => x.id === id); if (i < 0) return { ok: false, msg: 'No such sponsor.' }; const [x] = t.sponsors.splice(i, 1); t.rep = clamp(t.rep - 2, 0, 100); return { ok: true, msg: `Dropped ${x.name} (reputation -2).` }; }
// racing the season
export function teamRace(s, all = false) { const t = need(s); if (!t) return { ok: false, msg: 'No team.' }; const se = t.season; if (!se || se.done) return { ok: false, msg: 'The season is over. Age up for the next one.' }; if (staffing(t).missing.length && false) return { ok: false, msg: '' }; let last; do { last = runRace(s, se); } while (all && !se.done); const mine = last.order.filter((x) => x.mine); return { ok: true, msg: `${last.track}: ${mine.map((m) => `${m.name} P${m.pos}`).join(', ')}.`, race: last }; }
function finishTeam(s, t) {
  const rc = ensure(s), se = t.season; if (!se) return; while (!se.done) runRace(s, se); const st = standings(se), ti = T(t.tier), stf = staffing(t), mine = se.entries.filter((e) => e.mine), best = Math.min(...st.filter((x) => x.mine).map((x) => x.pos)), champion = st[0].mine, cars = mine.length;
  const sponsors = t.sponsors.reduce((a, x) => a + x.pay, 0), tv = R(ti.tv * cars * (0.7 + t.rep / 150)), prize = R(mine.reduce((a, e) => a + e.prize, 0)), merch = R(t.fans * 5 * (0.6 + (champion ? 1 : 0.4))), driversPay = R(racers(t).reduce((a, d) => a + d.salary, 0) + t.drivers.filter((d) => !racers(t).includes(d)).reduce((a, d) => a + d.salary * 0.4, 0));
  const staffLines = t.staff.map((x) => ({ role: x.role, name: x.name, salary: x.salary })), staffPay = staffLines.reduce((a, x) => a + x.salary, 0), running = R(cars * ti.races * ti.run * (1 + 0.08 * (lvl(t, 'car') + lvl(t, 'engine'))) * stf.cost), travel = R(ti.races * ti.travel * Math.min(2, 0.6 + cars * 0.4)), upkeep = R(ti.cost * 0.02 * (1 + lvl(t, 'factory') * 0.4)), interest = R(t.debt * 0.06), overheads = R((driversPay + staffPay) * (stf.cost - 1));
  const income = sponsors + tv + prize + merch, costs = driversPay + staffPay + running + travel + upkeep + interest + overheads, before = t.cash; t.cash += income - costs; if (t.debt > 0 && t.cash > 0) t.debt = Math.max(0, t.debt - R(t.cash * 0.1));
  let note = []; if (t.cash < 0) { t.distress++; t.rep = clamp(t.rep - 5, 0, 100); note.push('The team could not cover its bills: reputation fell.'); } else t.distress = 0;
  t.rep = clamp(t.rep + (best <= 3 ? 5 : best <= Math.ceil(se.entries.length / 2) ? 1 : -2) + (champion ? 5 : 0) - stf.missing.length * 1.5, 0, 100); t.fans = clamp(R(t.fans * (1 + (best <= 3 ? 0.12 : best <= 6 ? 0.03 : -0.04))), 300, 1e9);
  t.wins += mine.reduce((a, e) => a + e.wins, 0); if (champion) t.titles++; t.years++; t.sponsors.forEach((x) => { x.years--; }); t.sponsors = t.sponsors.filter((x) => x.years > 0);
  for (const d of t.drivers) { d.age++; for (const x of STATS) d.stats[x.id] = clamp(R(d.stats[x.id] + (d.age < 27 ? 2 : d.age < 33 ? 0.5 : -1.5) + gauss(s) * 1.2), 5, 99); d.salary = R(ti.salary * 0.7 * (0.4 + drvSkill(d) / 80) / 1000) * 1000; } t.drivers = t.drivers.filter((d) => d.age < 46 || t.drivers.length <= 1);
  t.last = { year: se.year, pos: best, champion, standings: st.slice(0, 5), income, costs, profit: R(t.cash - before), sponsors, tv, prize, merch, driversPay, staffPay, staffLines, running, travel, upkeep, interest, overheads, cars, races: ti.races, notes: note, missing: stf.missing, driverLines: racers(t).map((d) => ({ name: d.name, salary: d.salary })) };
  t.hist.push({ year: se.year, pos: best, profit: t.last.profit }); if (t.hist.length > 15) t.hist.shift(); log(s, `${t.name}: ${seriesDef(t.type, t.tier).name} P${best}${champion ? ' (champions!)' : ''}, profit ${money(t.last.profit)}.`, 'biz');
  if (t.distress >= 3) { log(s, `${t.name} went bankrupt and was taken over by creditors.`, 'biz'); rc.history.push({ team: t.name, years: t.years, titles: t.titles, sold: 0 }); rc.team = null; }
}
export function yearTick(s) {
  const rc = s.rc; if (!rc) return; const y = age(s); if (rc.lastYear === y) return; rc.lastYear = y;
  if (rc.career) { finishCareer(s, rc); if (rc.career) rc.career.season = careerSeason(s, rc); }
  const t = rc.team; if (t) { finishTeam(s, t); if (rc.team) { t.offers = genOffers(s, t); t.season = newSeason(s, seriesDef(t.type, t.tier), teamEntries(t)); } }
}

// ---------- status ----------
export function rating(t) { const se = t.season, mine = racers(t), car = carRating(t), me = mine.length ? R(mine.reduce((a, d) => a + 0.55 * car + 0.45 * drvSkill(d), 0) / mine.length) : 0, ai = se ? se.entries.filter((e) => !e.mine).map((e) => e.rating) : [], rank = ai.filter((x) => x > me).length + 1, grade = me >= T(t.tier).str + 12 ? 'A' : me >= T(t.tier).str + 4 ? 'B' : me >= T(t.tier).str - 4 ? 'C' : me >= T(t.tier).str - 12 ? 'D' : 'E'; return { overall: me, car: R(car), grade, rank, of: ai.length + 1, cars: mine.length }; }
export function finance(t) {
  const L = t.last, ti = T(t.tier), stf = staffing(t), pay = {}; for (const x of (L ? L.staffLines : t.staff)) pay[x.role] = (pay[x.role] || 0) + x.salary;
  const payLines = TROLES.map((r) => ({ id: 'pay_' + r.id, label: `Payroll: ${r.name}`, amount: pay[r.id] || 0, note: pay[r.id] ? 'The salary of the person you hired in this role.' : 'Vacant: no salary, but you lose the effect of this role.' }));
  const income = L ? [{ id: 'sponsors', label: 'Sponsors', amount: L.sponsors, note: 'Signed sponsor deals (title, primary, associate); better with reputation and a marketing manager.' }, { id: 'tv', label: 'Series TV & entry money', amount: L.tv, note: 'Paid per car by the series; grows with reputation.' }, { id: 'prize', label: 'Prize money', amount: L.prize, note: 'Race finishing positions of all your cars.' }, { id: 'merch', label: 'Merchandise', amount: L.merch, note: 'Fans, and whether you won the title.' }] : [];
  const expense = L ? [...payLines, { id: 'drivers', label: 'Driver salaries', amount: L.driversPay, note: 'Every driver on the roster; reserves cost 40%.' }, { id: 'running', label: 'Car running costs (parts, tires, fuel)', amount: L.running, note: 'Cars × races × series cost, higher with car/engine upgrades.' }, { id: 'travel', label: 'Travel & transport', amount: L.travel, note: 'Races in the season and the number of cars.' }, { id: 'upkeep', label: 'Factory & facility upkeep', amount: L.upkeep, note: 'Series size and your factory level.' }, { id: 'interest', label: 'Debt payments (interest)', amount: L.interest, note: 'Team debt × 6%.' }, { id: 'overheads', label: L.overheads >= 0 ? 'Other costs (admin & overheads)' : 'Front-office savings (other costs)', amount: L.overheads, note: 'Payroll size and your team manager: a great manager turns it into savings (negative).' }] : payLines;
  const ti2 = income.reduce((a, x) => a + x.amount, 0), te = expense.reduce((a, x) => a + x.amount, 0); return { year: L ? L.year : null, income, expense, totalIncome: ti2, totalExpense: te, net: ti2 - te, hasSeason: !!L, debt: R(t.debt), cash: R(t.cash), costFactor: +stf.cost.toFixed(2), races: ti.races };
}
const seasonView = (se) => se ? { year: se.year, series: seriesDef(se.type, se.tier).name, type: se.type, tier: se.tier, races: se.races, next: se.next, done: se.done, track: se.done ? null : se.tracks[se.next], standings: standings(se).slice(0, 12), results: se.results.slice(-5), last: se.last ? { n: se.last.n, track: se.last.track, winner: se.last.order[0].name, mine: se.last.order.filter((x) => x.mine).map((x) => ({ name: x.name, pos: x.pos, dnf: x.dnfAt != null })) } : null } : null;
export function ownedRecords(s) { const t = need(s); if (!t) return []; const ty = TYPES.find((x) => x.id === t.type); return [{ id: 'racing_team', racing: true, name: t.name, type: 'racing', typeName: `${ty.name} · ${seriesDef(t.type, t.tier).name}`, kind: 'racing', icon: ty.icon, rep: R(t.rep), staff: t.staff.length + t.drivers.length, profit: t.last ? t.last.profit : 0, revenue: t.last ? t.last.income : 0, valuation: value(s), trust: false, fleet: false, editor: false }]; }
export function status(s) {
  const rc = ensure(s), a = age(s), t = rc.team, c = rc.career, rolesOk = ROLES.map((r) => ({ ...r, locked: a < r.minAge }));
  const base = { age: a, locked: a < MIN_AGE, minAge: MIN_AGE, ownAge: OWN_AGE, ownLocked: a < OWN_AGE, cash: R(s.cash), types: TYPES, series: SERIES, tiers: TIERS.map((x) => ({ id: x.id, name: x.name, races: x.races, field: x.field, cost: x.cost })), roles: rolesOk, stats: STATS, license: licenseInfo(s), craft: R(rc.craft), skill: skillOf(rc), statValues: rc.stats ? { ...rc.stats } : null, trainedThisYear: rc.trainedYear === a, trainCost: 2000 * (1 + rc.license) * (1 + (c ? c.tier : 0) * 2), troles: TROLES, facs: FACS, strats: STRATS, history: rc.history.slice(-5), career: null, team: null, noPackNeeded: true };
  if (c) { const rd = ROLES.find((x) => x.id === c.role), se = c.season; base.career = { role: c.role, roleName: rd.name, icon: rd.icon, type: c.type, typeName: TYPES.find((x) => x.id === c.type).name, tier: c.tier, series: seriesDef(c.type, c.tier).name, team: c.team, car: c.car, years: c.years, wins: c.wins, podiums: c.podiums, titles: c.titles, earnings: R(c.earnings), best: c.best === 99 ? null : c.best, canMove: c.canMove, rating: R(myRating(rc)), last: c.last || null, hist: c.hist, season: seasonView(se), hasRace: !!(se && se.last), salaryEst: R(T(c.tier).salary * rd.sal * (0.5 + c.car / 100)) }; }
  if (t) { const ty = TYPES.find((x) => x.id === t.type), stf = staffing(t), se = t.season;
    base.team = { id: t.id, name: t.name, type: t.type, typeName: ty.name, icon: ty.icon, tier: t.tier, series: seriesDef(t.type, t.tier).name, logoSvg: logoSvg(t.logo), logo: t.logo, founded: t.founded, cash: R(t.cash), debt: R(t.debt), rep: R(t.rep), fans: t.fans, value: value(s), years: t.years, wins: t.wins, titles: t.titles, strat: t.strat, rating: rating(t), understaffed: stf.missing, effects: { car: +stf.car.toFixed(1), engine: +stf.engine.toFixed(1), pit: +stf.pit.toFixed(1), costs: +stf.cost.toFixed(2), sponsors: +stf.spons.toFixed(2) },
      staff: t.staff.map((x) => ({ ...x, roleName: TROLES.find((r) => r.id === x.role).name, icon: TROLES.find((r) => r.id === x.role).icon })), drivers: t.drivers.map((d) => ({ id: d.id, name: d.name, age: d.age, skill: drvSkill(d), salary: d.salary, stats: d.stats, racing: racers(t).some((x) => x.id === d.id) })), maxCars: maxCars(t),
      facilities: FACS.map((f) => ({ ...f, level: lvl(t, f.id), max: 5, cost: lvl(t, f.id) >= 5 ? null : facCost(t, f.id) })), sponsors: { deals: t.sponsors, offers: t.offers, slots: slotsOf(t) }, finance: finance(t), season: seasonView(se), canRace: !!(se && !se.done), hasRace: !!(se && se.last), last: t.last, hist: t.hist };
  }
  return base;
}
export const framesFor = (s, which) => { const rc = s.rc; if (!rc) return null; const se = which === 'team' ? (rc.team && rc.team.season) : (rc.career && rc.career.season); return se && se.last ? { race: se.last, frames: frames(se.last) } : null; };
export const logoSvgOf = (l) => logoSvg(l);
