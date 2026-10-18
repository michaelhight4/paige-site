// Studio creator engine for game / film / tv, driven entirely by data/studio_data.json.
// Merges Game dev's creator hooks (getTrends, calcScore, saveRelease, getConsoleShare, setEffort, getHistory, hire, fire)
// with the team-skill duration model:  duration = base(tier) x difficulty(genre, quality) / experience_factor(team skill).
// Hooks take the game state `s` and the studio business `b` explicitly (no globals).
import { D } from './data.js';
import { rnd, gauss, chance, clamp, pick, rint } from './rng.js';
import { log, earn, spend } from './core.js';
import * as Hw from './hardware.js';
import { sectorMult, consoleShares, studioReleaseShock } from './market.js';

export const MEDIA = ['game', 'film', 'tv'];
export const DEFAULT_SKILL = 5; // skill of a role nobody is hired for
const ST = () => D.studio;
const hash = (str) => { let h = 2166136261; for (const c of String(str)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return ((h >>> 0) % 10000) / 10000; };

// ---------- profiles (labels per media/format) ----------
export function profile(medium, format) {
  const base = ST().mediaTypes[medium];
  if (medium !== 'tv') return { ...base, medium, format: null, costMult: 1, difficultyMult: 1, platforms: base.platforms || null };
  const f = base.formats[format || 'live'];
  const roles = base.roles.map((r) => ({ ...r, name: (f.roleNames && f.roleNames[r.id]) || r.name }));
  return { ...base, ...f, medium, format: format || 'live', roles, label: base.label, formatLabel: f.label, platforms: f.platforms || base.platforms, areas: f.areas || base.areas,
    genreLabels: f.genreLabels || base.genreLabels, themeLabels: f.themeLabels || base.themeLabels };
}
export function platforms(medium, format) {
  const p = profile(medium, format);
  return p.platforms || Hw.platformList();
}
export const tierOf = (prof, id) => prof.tiers.find((t) => t.id === id) || prof.tiers[0];

// ---------- time & trends (deterministic from the month index) ----------
export const monthOf = (s) => Math.round(s.age * 12);
export const yearOf = (s) => ST().meta.startYear + Math.floor(s.age);
const PERIOD = 8; // years per trend cycle
export function heatAt(kind, id, turn) { // base + slow sine cycle (per-id phase) + monthly jitter; equals the data's start heat at turn 0
  const t = ST().trends[kind][id], yrs = turn / 12, amp = Math.max(8, Math.abs(t.yearShift) * 4), ph = hash(kind + id) * PERIOD, w = (2 * Math.PI) / PERIOD;
  return clamp(t.heat + amp * (Math.sin(w * (yrs + ph)) - Math.sin(w * ph)) + (hash(kind + id + turn) - 0.5) * 2 * t.turnVolatility, 0, 100);
}
export function getTrends(s, turn) {
  turn = turn == null ? monthOf(s) : turn; const out = { genres: {}, themes: {} };
  for (const kind of ['genres', 'themes']) for (const id in ST().trends[kind]) {
    const h = heatAt(kind, id, turn), p = heatAt(kind, id, turn - 1), y = heatAt(kind, id, turn + 12);
    out[kind][id] = { heat: Math.round(h), state: h >= 60 ? 'hot' : h <= 40 ? 'cold' : 'warm', perTurn: +(h - p).toFixed(1), perYear: +(y - h).toFixed(0) };
  }
  return out;
}
export const getConsoleShare = (s) => consoleShares(s);
export const consoleState = (s, id) => s.market.consoles.find((c) => c.id === id);

// ---------- team ----------
export function teamSkills(prof, b) {
  const out = {};
  for (const r of prof.roles) { const xs = b.staff.filter((p) => p.role === r.id); out[r.id] = { n: xs.length, skill: xs.length ? xs.reduce((a, p) => a + p.skill, 0) / xs.length : DEFAULT_SKILL }; }
  return out;
}
export function seatEff(b) {
  const t = D.bizTypes[b.type], seats = t.equip.reduce((a, e) => a + (b.equip[e.id] || 0) * (e.seats || 0), 0);
  return b.staff.length ? Math.min(1, seats / b.staff.length) : 1;
}
export const specialistById = (id) => ST().specialists.find((x) => x.id === id);
export const specialistWages = (b) => (b.specialists || []).reduce((a, id) => a + specialistById(id).salaryPerTurn * 12, 0);
export function teamEffects(ids) {
  const e = { durationMult: 1, qualityBonus: 0, riskDelta: 0, trendBonus: 0 };
  for (const id of ids) for (const tr of specialistById(id).traits) { const t = ST().balance.traitEffects[tr] || {}; if (t.durationMult) e.durationMult *= t.durationMult; e.qualityBonus += t.qualityBonus || 0; e.riskDelta += t.riskDelta || 0; e.trendBonus += t.trendBonus || 0; }
  return e;
}
export const fameTier = (b) => { let t = ST().fameTiers[0]; for (const x of ST().fameTiers) if ((b.fame || 0) >= x.min) t = x; return t; };
export function availableSpecialists(b, medium) { return ST().specialists.filter((x) => x.media.includes(medium)); }
export function hire(s, b, id) { // specialists (named talent); cap + fame gate + 1 month signing fee
  const sp = specialistById(id), medium = D.bizTypes[b.type].medium; b.specialists ||= [];
  if (!sp || !sp.media.includes(medium) || b.specialists.includes(id) || b.specialists.length >= ST().balance.specialistCap) return false;
  if ((b.fame || 0) < sp.minFame || s.cash < sp.salaryPerTurn) return false;
  s.cash -= sp.salaryPerTurn; b.specialists.push(id); return true;
}
export function fire(s, b, id) { b.specialists = (b.specialists || []).filter((x) => x !== id); }

// ---------- draft ----------
export const idealSplit = (genre) => ({ ...ST().genres.find((g) => g.id === genre).idealSplit });
export function genName(s, draft) {
  const G = ST().nameGen, pat = pick(s, G.patterns), r = () => pick(s, G.adjectives), n = () => pick(s, G.nouns);
  return pat.replace('{adj}', r()).replace('{noun2}', n()).replace('{noun}', n());
}
export function defaultDraft(medium, b) {
  const st = ST(), prof = profile(medium, medium === 'tv' ? 'live' : null), g = st.genres[0].id;
  return { title: '', genre: g, theme: st.themes[0].id, tier: prof.tiers[0].id, platform: platforms(medium, medium === 'tv' ? 'live' : null)[0].id, split: idealSplit(g),
    audience: 'everyone', engine: prof.engines[0].id, marketing: 'std', format: medium === 'tv' ? 'live' : null, episodes: 10, sequelOf: null };
}
export function getDraft(s, b) {
  const medium = D.bizTypes[b.type].medium; if (!b.draft) b.draft = defaultDraft(medium, b);
  return b.draft;
}
export function setEffort(s, b, areaId, val) { // keep the total fixed at effortTotal; step = effortStep
  const sp = getDraft(s, b).split, B = ST().balance, ids = ST().effortAreas.map((a) => a.id), step = B.effortStep;
  val = clamp(Math.round(val / step) * step, 0, B.effortTotal); let delta = val - sp[areaId]; sp[areaId] = val;
  const others = ids.filter((i) => i !== areaId);
  while (delta !== 0) {
    const sg = delta > 0 ? -1 : 1;
    const c = others.filter((i) => (sg < 0 ? sp[i] > 0 : sp[i] < B.effortTotal)).sort((x, y) => (sg < 0 ? sp[y] - sp[x] : sp[x] - sp[y]))[0];
    if (!c) break; sp[c] += sg * step; delta += sg * step;
  }
}
export function balanceInfo(split, genre, prof) {
  const ideal = ST().genres.find((g) => g.id === genre).idealSplit, B = ST().balance, warnings = []; let dev = 0;
  for (const a of ST().effortAreas) {
    const v = split[a.id], i = ideal[a.id]; dev += Math.abs(v - i); const L = prof.areas.find((x) => x.id === a.id).label;
    if (v < B.minAreaPct) warnings.push(`${L} is starved (${v}% < ${B.minAreaPct}%)`);
    else if (v > B.maxAreaPct) warnings.push(`${L} is bloated (${v}% > ${B.maxAreaPct}%)`);
    else if (v - i >= B.imbalanceWarnPct) warnings.push(`Too much ${L} for this genre (+${v - i})`);
    else if (i - v >= B.imbalanceWarnPct) warnings.push(`Too little ${L} for this genre (${v - i})`);
  }
  return { balance: clamp(1 - dev / 200, 0, 1), warnings };
}

// ---------- franchise / sequels ----------
export function sequelOptions(b) {
  const medium = D.bizTypes[b.type].medium;
  if (medium === 'tv') return (b.shows || []).filter((x) => x.status === 'renewed').map((x) => ({ id: x.id, title: `${x.title} - Season ${x.seasons.length + 1}`, genre: x.genre, theme: x.theme, platform: x.platform, format: x.format }));
  return b.released.filter((r) => r.media === medium).map((r) => ({ id: r.id, title: 'Sequel to ' + r.title, genre: r.genre, theme: r.theme, platform: r.platform }));
}
function sequelInfo(b, draft, medium) {
  if (!draft.sequelOf) return null;
  if (medium === 'tv') { const sh = (b.shows || []).find((x) => x.id === draft.sequelOf); return sh ? { prevScore: sh.ratings, entries: sh.seasons.length, sens: sh.seasons.some((x) => x.sensation) } : null; }
  const r = b.released.find((x) => x.id === draft.sequelOf); if (!r) return null;
  const entries = b.released.filter((x) => (x.franchise || x.id) === (r.franchise || r.id)).length;
  return { prevScore: r.score, entries, sens: !!r.sensation };
}

// ---------- scoring / forecast ----------
// opts.expected -> noise-free forecast. Returns everything the creator screen needs.
export function calcScore(s, b, draft, opts = {}) {
  const st = ST(), W = st.balance.weights, medium = D.bizTypes[b.type].medium, prof = profile(medium, draft.format), tier = tierOf(prof, draft.tier);
  const g = st.genres.find((x) => x.id === draft.genre), turn = monthOf(s), tr = getTrends(s, turn), cons = st.balance.consoles;
  const compat = st.compatibility[draft.genre][st.themes.findIndex((t) => t.id === draft.theme)];
  const bi = balanceInfo(draft.split, draft.genre, prof), fx = teamEffects(b.specialists || []);
  const sk = teamSkills(prof, b), ideal = g.idealSplit;
  // specialists: area bonus scaled by effort on the area vs ideal
  let sb = 0; for (const id of b.specialists || []) { const sp = specialistById(id); for (const a in sp.areaBonus) sb += sp.areaBonus[a] * clamp(draft.split[a] / Math.max(ideal[a], 1), 0, 1.5) * 0.35; }
  sb = Math.min(sb, W.specialistCap);
  // staff skill, weighted by where the effort goes
  const skill = ST().effortAreas.reduce((a, ar) => a + (draft.split[ar.id] / 100) * sk[prof.areaRoles[ar.id]].skill / 100, 0);
  const heat = (tr.genres[draft.genre].heat + tr.themes[draft.theme].heat) / 2 / 100, trendMod = 0.85 + 0.3 * clamp(heat + fx.trendBonus * 0.5, 0, 1);
  const aud = st.audiences.find((x) => x.id === draft.audience) || st.audiences[0], audFit = aud.genreFit[draft.genre] ?? 1;
  const eng = prof.engines.find((x) => x.id === draft.engine) || prof.engines[0];
  const risk = clamp(tier.risk + fx.riskDelta + (1 - skill) * 0.1, 0, 1);
  const plats = platforms(medium, draft.format), plat = plats.find((p) => p.id === draft.platform) || plats[0];
  let hardware = 0, share = 0.25, shareFactor = plat.reach ?? 1;
  if (plat.console) {
    const cs = consoleState(s, plat.id), shares = consoleShares(s); share = shares[plat.id] / 100;
    hardware = (cs.power / 100 - 0.6) * W.hardware * clamp(draft.split.graphics / 20, 0, 2);
    shareFactor = (W.shareBase + share * (1 - W.shareBase) * 2) / (W.shareBase + 0.25 * (1 - W.shareBase) * 2);
  }
  const sq = sequelInfo(b, draft, medium), rn = st.mediaTypes.tv.renewal;
  const sequel = sq ? (sq.prevScore - 6) * W.sequel - Math.max(0, sq.entries - 2) * rn.fatigue : 0;
  const noise = opts.expected ? 0 : (rnd(s) - 0.5) * 2 * risk * W.noiseScale * 3;
  const parts = { base: tier.baseQuality, match: (compat - W.matchNeutral) * W.match, balance: (bi.balance - W.balanceNeutral) * W.balance, skill: (skill - W.skillNeutral) * W.skill,
    specialists: sb, trend: (trendMod - 1) * W.trend, engine: eng.qualityBonus, audience: (audFit - 1) * 2, hardware, sequel, traits: fx.qualityBonus, noise };
  const score = +clamp(Object.values(parts).reduce((a, x) => a + x, 0) - (opts.penalty || 0), 1, st.meta.scoreMax).toFixed(1), quality = score * 10;
  // duration (years) = base(tier) x difficulty(genre, quality) / experience(team skill)
  const eps = medium === 'tv' ? draft.episodes || 10 : 10, seasonMult = medium === 'tv' ? 0.5 + 0.5 * eps / 10 : 1;
  const allSkill = prof.roles.reduce((a, r) => a + sk[r.id].skill, 0) / prof.roles.length, n = Math.max(1, b.staff.length);
  const sizeF = Math.min(1.5, 1 + 0.05 * (n - 1)) * Math.min(1, Math.sqrt(n / tier.teamSize));
  const expF = (0.6 + allSkill / 50) * sizeF * Math.max(0.3, seatEff(b)) / (eng.speedMult * fx.durationMult);
  const diff = g.difficulty * prof.difficultyMult * (1 + 0.8 * quality / 100);
  const base = tier.baseYears * seasonMult;
  const duration = clamp((base * diff) / expF, medium === 'tv' ? 0.25 : 0.5, 20);
  const requiredPts = Math.round(base * diff * 12 * 10), teamPts = Math.round(expF * 10);
  // money
  const budget = tier.cost * prof.costMult * (medium === 'tv' ? eps / 10 : 1) + eng.cost;
  const mk = st.marketing.find((m) => m.id === draft.marketing) || st.marketing[0];
  const wages = b.staff.reduce((a, p) => a + p.salary, 0) + specialistWages(b), rent = D.bizTypes[b.type].rent;
  const baseRev = tier.baseRev * prof.costMult * (medium === 'tv' ? eps / 10 : 1);
  const mkCost = (mk.costFrac + (plat.feeFrac || 0)) * baseRev;
  // sales / revenue
  const hype = clamp((b.rep || 0) * 0.4 + (b.fame || 0) * 0.3 + mk.hype + (opts.hype != null ? opts.hype : 15) + (sq ? 10 + (sq.sens ? 10 : 0) : 0) + (sq && medium === 'tv' ? rn.carryHype * sq.prevScore * 4 : 0), 0, 100);
  const sector = sectorMult(s, prof.sector), deal = fameTier(b).dealMult;
  const units0 = tier.baseRev / tier.price * (medium === 'tv' ? eps / 10 : 1);
  const sensChance = sensationChance({ score, hype, heat, share: plat.console ? share : 0.25, sq });
  const sensMult = opts.sensation ? opts.sensation : 1;
  const sales = Math.round(units0 * Math.pow(score / W.scoreRef, W.salesExponent) * trendMod * shareFactor * aud.salesMult * sector * (0.6 + 0.8 * hype / 100) * sensMult * (opts.noiseMult || 1));
  const gross = sales * tier.price * prof.costMult, revenue = gross * prof.studioShare * deal;
  return { score, quality, label: st.balance.reviewLabels.find((r) => score >= r[0])[1], parts, compat, balance: bi.balance, warnings: bi.warnings, trendMod, heat, risk,
    skill, share, shareFactor, hype, sector, deal, sales, revenue, budget, mkCost, wages, rent, durationYears: duration, durationMonths: Math.round(duration * 12), duration,
    requiredPts, teamPts, monthlyCost: Math.round((wages + rent) / 12 + budget / Math.max(1, duration * 12)), totalCost: budget + mkCost + wages * duration,
    profit: Math.round(revenue - budget - mkCost - wages * duration), expF, missing: prof.roles.filter((r) => sk[r.id].n === 0).map((r) => r.name), sensChance, tierIdx: prof.tiers.indexOf(tier), episodes: eps,
    sequel: sq, plat };
}
export function sensationChance({ score, hype, heat, share, sq }) {
  const z = ST().balance.sensation;
  return clamp(z.base + z.qualityWeight * Math.pow(Math.max(0, (score - z.qualityRef) / (ST().meta.scoreMax - z.qualityRef)), 1.2) + z.hypeWeight * hype / 100 + z.trendWeight * (heat - 0.5) + z.shareWeight * (share - 0.25) + (sq && sq.sens ? 0.05 : 0), 0, z.max);
}
// Legacy alias used by tests/UI: forecast without noise
export const preview = (s, b, draft) => calcScore(s, b, draft, { expected: true });

export function startProject(s, b, draft) {
  if (b.project) return { ok: false, err: 'Already in development' };
  const medium = D.bizTypes[b.type].medium, prof = profile(medium, draft.format), eng = prof.engines.find((x) => x.id === draft.engine) || prof.engines[0];
  if ((b.fame || 0) < eng.minFame) return { ok: false, err: `${eng.name} needs fame ${eng.minFame}` };
  if (!b.staff.length) return { ok: false, err: 'Hire staff first' };
  const pv = calcScore(s, b, draft, { expected: true }), upfront = pv.budget * 0.1;
  if (upfront > s.cash) return { ok: false, err: `Need 10% of budget up front (${Math.round(upfront).toLocaleString()})` };
  s.cash -= upfront;
  const d = JSON.parse(JSON.stringify(draft)); d.title = d.title || genName(s, d); d.startTurn = monthOf(s);
  let show = null;
  if (medium === 'tv') {
    show = (b.shows ||= []).find((x) => x.id === d.sequelOf);
    if (!show) { show = { id: 'sh' + s.nextId++, title: d.title, genre: d.genre, theme: d.theme, format: d.format, platform: d.platform, seasons: [], status: 'running', ratings: 0 }; b.shows.push(show); }
    show.status = 'running';
  }
  b.project = { draft: d, name: show ? `${show.title} S${show.seasons.length + 1}` : d.title, show: show ? show.id : null, progress: 0, duration: pv.duration, score: pv.score, risk: pv.risk, budget: pv.budget, budgetSpent: upfront,
    troubled: false, troubleAt: chance(s, pv.risk) ? 0.4 + rnd(s) * 0.4 : null, hype: 0, startedAge: s.age, requiredPts: pv.requiredPts };
  b.draft = { ...JSON.parse(JSON.stringify(d)), title: '', sequelOf: null }; // next draft starts fresh
  log(s, `${b.name} started "${b.project.name}" (est. ${pv.durationMonths} months, score ~${pv.score}).`, 'biz');
  return { ok: true, project: b.project };
}

export function tickProject(s, b, dt) {
  const p = b.project; if (!p) return null;
  const step = Math.min(dt, p.duration - p.progress); p.progress += step;
  const x = Math.min(p.budget - p.budgetSpent, (p.budget / p.duration) * step); spend(s, x); p.budgetSpent += x;
  p.hype = clamp(p.hype + 8 * step + (b.rep + (b.fame || 0)) * 0.015 * step, 0, 60);
  if (p.troubleAt != null && p.progress / p.duration >= p.troubleAt) { p.troubleAt = null; p.troubled = true; p.duration *= 1.25; log(s, `"${p.name}" hit production trouble: +25% time, review score -0.8.`, 'biz'); }
  if (p.progress >= p.duration - 1e-9) return release(s, b);
  return null;
}

// Final release: roll the score with noise, apply sector/console/trend, roll sensation, update fame, tv renewal, franchise.
export function release(s, b) {
  const p = b.project, d = p.draft, medium = D.bizTypes[b.type].medium, prof = profile(medium, d.format), st = ST(), z = st.balance.sensation;
  d.sequelOf = d.sequelOf || null;
  const pre = calcScore(s, b, d, { penalty: p.troubled ? 0.8 : 0, hype: p.hype, noiseMult: Math.exp(gauss(s) * (0.18 + 0.04 * prof.tiers.findIndex((t) => t.id === d.tier))) });
  const sens = chance(s, pre.sensChance), sensMult = sens ? z.salesMultMin + rnd(s) * (z.salesMultMax - z.salesMultMin) : 1;
  const sales = Math.round(pre.sales * sensMult), revenue = pre.revenue * sensMult;
  growSkills(s, b, prof, d);
  spend(s, pre.mkCost);
  const now = revenue * 0.55; earn(s, now); b.tail += revenue - now;
  b.rep = clamp(b.rep + (pre.score - 6) * 3, 0, 100);
  const before = b.fame || 0;
  const fameGain = sens ? z.fameBase + z.fameScale * sensMult : Math.max(0, (pre.score - 7) * 1.5);
  b.fame = clamp(before + fameGain, 0, 100);
  const rel = { id: 'r' + s.nextId++, media: medium, title: p.name, genre: d.genre, theme: d.theme, tier: d.tier, platform: d.platform, audience: d.audience, year: yearOf(s), age: s.age, turn: monthOf(s),
    score: pre.score, label: pre.label, sales, revenue, profit: Math.round(revenue - pre.mkCost - p.budgetSpent), sensation: sens, sensMult: +sensMult.toFixed(2), fameGain: +fameGain.toFixed(1), years: p.progress, troubled: p.troubled, parts: pre.parts,
    franchise: null, format: d.format, episodes: medium === 'tv' ? d.episodes : null };
  if (d.sequelOf && medium !== 'tv') { const prev = b.released.find((x) => x.id === d.sequelOf); rel.franchise = prev ? prev.franchise || prev.id : null; }
  if (medium === 'tv') {
    const show = b.shows.find((x) => x.id === p.show), rn = st.mediaTypes.tv.renewal;
    show.seasons.push({ n: show.seasons.length + 1, episodes: d.episodes, score: pre.score, sales, revenue, sensation: sens, budget: p.budget });
    show.ratings = show.seasons.length === 1 ? pre.score : show.ratings * rn.carryRatings + pre.score * (1 - rn.carryRatings);
    const ok = pre.score >= rn.renewScore || (pre.score >= rn.chanceScore && chance(s, 0.5)) || (sens);
    show.status = ok ? 'renewed' : 'cancelled'; rel.showId = show.id; rel.season = show.seasons.length; rel.renewal = show.status;
    rel.franchise = show.id;
    log(s, `"${show.title}" S${rel.season}: ratings ${pre.score}/10 - ${ok ? 'renewed for another season' : 'CANCELLED by the network'}.`, 'biz');
  }
  b.released.push(rel); b.lastRelease = rel; b.project = null;
  if (b.tkr) { studioReleaseShock(s, b, pre.score); if (sens) { const stk = s.market.stocks[b.tkr]; stk.p *= Math.exp(z.stockShock); } }
  const verdict = sens ? 'SENSATION' : pre.label;
  log(s, `${b.name} released "${rel.title}": ${verdict} (${pre.score}/10), sales ${sales.toLocaleString()}, revenue ${Math.round(revenue).toLocaleString()}${sens ? `, fame +${rel.fameGain.toFixed(0)}` : ''}.`, 'biz');
  if (sens) { s.market.news.push({ age: s.age, text: `SENSATION: ${rel.title} from ${b.name} takes the world by storm!` }); b.sensations = (b.sensations || 0) + 1; }
  (s.fx ||= []).push({ biz: b.id, rel: rel.id, sensation: sens });
  const tn = fameTier(b); if (tn.min > fameTierBefore(before)) log(s, `${b.name} is now "${tn.label}" - new talent, engines and deals unlocked!`, 'biz');
  return rel;
}
const fameTierBefore = (f) => { let t = 0; for (const x of ST().fameTiers) if (f >= x.min) t = x.min; return t; };

// Skills grow on release; harder genre / bigger tier => faster; diminishing near 100.
export const skillGainEstimate = (skill, tierIdx, difficulty, use = 1) => (2.5 + 1.5 * tierIdx) * difficulty * use * (1 - skill / 115);
export function growSkills(s, b, prof, d) {
  const g = ST().genres.find((x) => x.id === d.genre), tierIdx = prof.tiers.findIndex((t) => t.id === d.tier), roleShare = {};
  for (const a of ST().effortAreas) { const r = prof.areaRoles[a.id]; roleShare[r] = (roleShare[r] || 0) + d.split[a.id] / 100; }
  for (const p of b.staff) {
    const use = 0.5 + 0.5 * Math.min(1, (roleShare[p.role] || 0) * 4);
    p.skill = clamp(p.skill + skillGainEstimate(p.skill, tierIdx, g.difficulty * prof.difficultyMult, use), 0, 100); p.xp = (p.xp || 0) + 1;
  }
}
export const getHistory = (b, medium) => b.released.filter((r) => !medium || r.media === medium).slice().sort((x, y) => y.age - x.age || (y.id > x.id ? 1 : -1));
export const saveRelease = release; // hook name from Game dev's spec: persisting a finished release (history, sequel/franchise, fame)
