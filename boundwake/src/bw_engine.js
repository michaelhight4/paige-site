// Boundwake engine: Lifeline's year-turn life loop (src/rng.js + src/core.js forked verbatim from /workspace/lifesim),
// re-written lean around the fantasy pack (data_fantasy/). Event resolve semantics follow lifesim/src/events.js
// (weighted, age-gated, once/cool, chain follow-ups, p/win/fail). Lifeline's Earth systems (business, studio, sports,
// politics, online…) are NOT carried over (standalone plan P0 "pack-optional modules").
import { rnd, rint, pick, chance, clamp, wpick } from './rng.js';
import { log, fill } from './core.js';

export let D = null;
export const setPack = (pack) => { D = pack; D.jobsById = pack.occ.jobs; D.skillById = Object.fromEntries(pack.skills.skills.map((k) => [k.id, k])); };

// ---- stats (Lifeline ids, Boundwake display names from text/ui_strings.md) ----
export const STATS = ['health', 'happiness', 'smarts', 'looks', 'fame', 'karma', 'stress'];
const FX_ALIAS = { spirit: 'happiness', happy: 'happiness', wits: 'smarts', presence: 'looks', renown: 'fame', strain: 'stress', might: 'sk_strength', grace: 'sk_agility', composure: 'sk_composure' };
const NAMES = { m: ['Aren', 'Bram', 'Cael', 'Dorin', 'Edric', 'Fen', 'Garrick', 'Hale', 'Ivo', 'Jory', 'Kestrel', 'Loric', 'Merek', 'Nils', 'Oren', 'Perrin', 'Rowan', 'Tamsin', 'Wil'],
  f: ['Aila', 'Brynn', 'Cerys', 'Dela', 'Elowen', 'Fira', 'Gwen', 'Hesper', 'Isla', 'Junia', 'Kaela', 'Liora', 'Mira', 'Nessa', 'Orla', 'Pell', 'Rhosyn', 'Sorrel', 'Tilde', 'Wren'],
  last: ['Ashdown', 'Brightwater', 'Coldwell', 'Dunmere', 'Emberly', 'Fairholt', 'Greenwell', 'Hollin', 'Ivybank', 'Larkspur', 'Marrow', 'Oakhart', 'Reedley', 'Stonebridge', 'Thorne', 'Willowby'] }; // coder_stub name list (original)
export const race = (s) => D.races.find((r) => r.id === s.race);
export const turnYears = (s) => 1; // Gary Nov 5 2026: 1 turn = 1 year (was lifespan/100)
// human-equivalent age: all gates in the notes are written for humans (age 8 sword, 10 academy…)
export const hage = (s, age = s.age) => (age * 90) / race(s).lifespan;
// Gary Nov 5 2026: longer-lived races take ≥1.5× as long on a few pillar skills only
// (swordsmanship / spellcraft / smithing) so builds stay deliberate. Other skills keep the normal 100/60/25 curve.
export const PILLAR_SKILLS = ['swordsmanship', 'spellcraft', 'smithing'];
export const longevitySkillPace = (s, id) => {
  if (!PILLAR_SKILLS.includes(id)) return 1;
  const ls = race(s).lifespan || 90;
  return ls > 90 ? 1.5 : 1; // longer-lived races need ≥1.5× time on pillar skills only
};
// After the yearly 100/60/25 hard cap, pillar skills can still grow, tapering with human-equivalent age from 50% to 1%.
export const postCapAgeMult = (s) => 0.50 + (0.01 - 0.50) * clamp(hage(s) / 90, 0, 1);
export function stage(s) { const h = hage(s); return h < 3 ? 'baby' : h < 11 ? 'child' : h < 17 ? 'teen' : h < 60 ? 'adult' : 'elder'; }

// ---- birth / fate card ----
const ORDINARY_JOB_POOL = [
  ['Child', 0, 5], ['Village lessons', 5, 10],
  ['Yard Hand', 6, 99], ['Picker', 6, 99], ['Inn Helper', 8, 99], ['Mill Helper', 8, 99],
  ['Kitchen Help', 8, 99], ['Runner', 8, 99], ['Shore Hand', 8, 99], ['Loom Helper', 8, 99],
  ['Counter Hand', 10, 99], ['Shop Helper', 10, 99], ['Farmhand', 6, 99], ['Stall Hand', 10, 99],
  ['Town Guard', 15, 99], ['Freeholder', 16, 99], ['Merchant', 18, 99], ['Healer', 18, 99],
  ['Blacksmith', 18, 99], ['Scholar', 16, 99], ['Hunter', 14, 99], ['Priest', 16, 99],
];
function personHage(p) {
  const ls = D.races.find((r) => r.id === p.race)?.lifespan || 90;
  return (p.age * 90) / ls;
}
function isChildJobTitle(title) {
  return title === 'Child' || title === 'Village lessons' || title === 'Helps at home';
}
function pickPersonJobTitle(s, p) {
  const h = personHage(p);
  // Bonds: no real occupations before human-equivalent 12 (Gary Nov 5 ~1:55 PM CT)
  if (h < 6) return 'Child';
  if (h < 12) return 'Village lessons';
  const entries = Object.values(D.jobsById || {}).filter((j) => j.entry && (j.req?.age ?? 99) <= h + 0.01);
  const ordinary = entries.filter((j) => (D.occ.careers.find((c) => c.id === j.sector)?.tags || []).includes('ordinary'));
  const pool = (ordinary.length ? ordinary : entries);
  if (pool.length) return pick(s, pool).title;
  const fallback = ORDINARY_JOB_POOL.filter(([, a0, a1]) => h >= a0 && h < a1).map((x) => x[0]);
  return fallback.length ? pick(s, fallback) : 'Laborer';
}
/** Fill stats + jobTitle on a person once; persists on save. Never stores gold. */
export function ensurePersonSheet(s, p) {
  if (!p.stats) {
    p.stats = {
      health: rint(s, 48, 92), happiness: rint(s, 40, 88), smarts: rint(s, 35, 85),
      looks: rint(s, 35, 88), fame: rint(s, 0, 18), stress: rint(s, 0, 28),
    };
    if (p.rel === 'mother' || p.rel === 'father') {
      p.stats.health = rint(s, 55, 85); p.stats.fame = rint(s, 2, 25); p.stats.stress = rint(s, 8, 35);
    }
  }
  const h = personHage(p);
  if (p.jobTitle == null || p.jobTitle === '') p.jobTitle = pickPersonJobTitle(s, p);
  // Re-clamp bad under-12 titles from earlier saves (e.g. 6yo Farmhand)
  if (h < 12 && !isChildJobTitle(p.jobTitle)) p.jobTitle = pickPersonJobTitle(s, p);
  if (h < 6 && p.jobTitle !== 'Child') p.jobTitle = 'Child';
  if ('gold' in p) delete p.gold;
  return p;
}
function person(s, rel, ageOff, raceId) {
  const sex = chance(s, 0.5) ? 'm' : 'f';
  const p = { id: 'p' + (s.pid = (s.pid || 0) + 1), first: pick(s, NAMES[sex]), sex, rel, age: Math.max(0, s.age + ageOff), race: raceId || s.race, bar: rint(s, 55, 85), alive: true };
  return ensurePersonSheet(s, p);
}
export function rollFate(seed, meta = {}, opts = {}) {
  const s = { rs: seed | 0 || (Date.now() & 0x7fffffff), v: 1 };
  s.race = opts.race || pick(s, D.races).id; s.sex = chance(s, 0.5) ? 'm' : 'f';
  s.first = pick(s, NAMES[s.sex]); s.last = opts.last || pick(s, NAMES.last);
  s.affinity = race(s).affinity_bias && chance(s, 0.5) ? race(s).affinity_bias : pick(s, D.traits.affinities);
  s.trait = pick(s, D.traits.rare).id; s.wealth = wpick(s, D.traits.wealth, (w) => (w[0] === 'noble' ? 1 : w[0] === 'poor' ? 3 : 4))[0];
  const ids = D.skills.skills.map((k) => k.id); s.talents = []; while (s.talents.length < 3) { const t = pick(s, ids); if (!s.talents.includes(t)) s.talents.push(t); }
  s.rerolls = opts.rerolls ?? 1; return s;
}
export function begin(fate, meta = {}, carry = null) {
  const s = { ...fate, age: 0, alive: true, stats: {}, skills: {}, flags: {}, log: [], pending: [], chain: [], evLast: {}, people: [], injuries: [], relics: [], codex: [...(meta.codex || [])],
    job: null, jobHist: [], region: 'hearthfold', regionsFound: [...new Set(['hearthfold', ...(meta.regions || [])])], route: null, school: null, legacy: { gen: 1 }, tally: { events: 0 } };
  for (const k of STATS) s.stats[k] = k === 'fame' || k === 'stress' ? 0 : k === 'karma' ? 50 : rint(s, 40, 85);
  for (const k of D.skills.skills) s.skills[k.id] = 0;
  s.gold = { poor: 5, common: 30, comfortable: 120, noble: 600 }[s.wealth] ?? 30; s.familyGold = s.gold * 10;
  s.manaMax = 20 + (race(s).buffs.mana_max || 0) + (race(s).flaws.mana_max || 0); s.mana = 0;
  if (s.trait === 'trait_spark_born') { s.flags.mana_awakened = 1; s.mana = 10; }
  if (s.trait === 'trait_iron_bones') s.stats.health = Math.min(100, s.stats.health + 10);
  for (const t of s.talents) s.skills[t] = 3;
  s.people.push(person(s, 'mother', rint(s, 20, 34)), person(s, 'father', rint(s, 22, 38)));
  for (let i = rint(s, 0, 2); i > 0; i--) s.people.push(person(s, 'sibling', rint(s, 1, 8)));
  if (carry) Object.assign(s, carry(s) || {});
  // Echoes (reincarnation): each echo grants a perm bonus, halved per repeat (SYSTEMS_OVERVIEW "Legacy")
  for (const [id, n] of Object.entries(meta.echoes || {})) applyEcho(s, id, n);
  s.flags.born = 1; log(s, `I was born ${art(race(s).name)} ${race(s).name.toLowerCase()} in Hearthfold Vale. Affinity: ${s.affinity}.`, 'birth');
  newYearBudget(s); return s;
}
const art = (w) => (/^[AEIOU]/.test(w) ? 'an' : 'a');
const ECHO = { echo_might: ['strength', 'endurance'], echo_wits: ['literacy', 'lore'], echo_mana: ['mana_control', 'spellcraft'], echo_grace: ['agility', 'stealth'], echo_presence: ['charm', 'etiquette'] };
function applyEcho(s, id, n) {
  let b = 0; for (let i = 0; i < n; i++) b += 8 / 2 ** i; // 8, +4, +2 …
  if (ECHO[id]) for (const k of ECHO[id]) s.skills[k] = (s.skills[k] || 0) + b; // seeds; arcane still locked until awakening
  if (id === 'echo_mana') s.manaMax += Math.round(b * 2);
  if (id === 'echo_presence') s.stats.looks = clamp(s.stats.looks + b, 0, 100);
  if (id === 'echo_renown') s.stats.fame = clamp(s.stats.fame + b, 0, 100);
  s.flags.reincarnated = 1;
}

// ---- skills (lifesim/src/skills.js use() curve + Boundwake training curve 100/60/25) ----
export const skillLocked = (s, id) => D.skillById[id]?.cat === 'arcane' && !s.flags.mana_awakened || (id === 'enchanting' && (s.skills.spellcraft || 0) < 20);
function raceMult(s, id) {
  const r = race(s), cat = D.skillById[id]?.cat; let m = 1 + (r.buffs[id] || 0) + (r.flaws[id] || 0) + (r.buffs['cat_' + cat] || 0);
  if (r.id === 'human' && s.route && primarySkills(s).includes(id)) m += r.buffs.xp_primary || 0;
  if (s.route && primarySkills(s).includes(id)) m += 0.25; if (s.talents.includes(id)) m += 0.3; return m;
}
export function useSkill(s, id, amt) {
  if (s.skills[id] == null || skillLocked(s, id)) return 0; const v = s.skills[id];
  const g = amt * Math.max(0.05, 1 - v / 108) * raceMult(s, id) / longevitySkillPace(s, id);
  s.skills[id] = Math.round(clamp(v + g, 0, 100) * 100) / 100; (s.skillUsed ||= {})[id] = 1; return g;
}
export const rankOf = (v) => { let r = D.skills.ranks[0][1]; for (const [t, n] of D.skills.ranks) if (v >= t) r = n; return r; };
export function primarySkills(s) {
  if (s.job) return careerOf(s.job.id).skills;
  return { route_magic: ['spellcraft', 'mana_control'], route_sword: ['swordsmanship', 'strength'], route_hybrid: ['swordsmanship', 'spellcraft'], route_craft: ['smithing', 'alchemy'] }[s.route] || [];
}
export function train(s, id) {
  if (!spendAct(s, 'act')) return { ok: false, msg: 'No activity left this year.' };
  if (skillLocked(s, id)) { s.budget.act++; return { ok: false, msg: 'Mana has not answered you yet.' }; }
  const n = (s.trainCount[id] = (s.trainCount[id] || 0) + 1), curve = D.skills.trainingCurve;
  let mult, postCap = false;
  if (n <= curve.length) mult = curve[n - 1];
  else if (PILLAR_SKILLS.includes(id)) { postCap = true; mult = postCapAgeMult(s); }
  else mult = curve[curve.length - 1];
  const before = rankOf(s.skills[id]); const g = useSkill(s, id, 6 * mult * turnYears(s) ** 0.5);
  for (const [re, map] of D.skills.activityMap) if (new RegExp(re).test(id)) for (const kv of map.split(',')) { const [k, w] = kv.split(':'); if (k !== id) useSkill(s, k, +w * 1.5 * (n <= curve.length ? curve[Math.min(n - 1, curve.length - 1)] : curve[curve.length - 1])); }
  if (D.skillById[id].cat === 'arcane') s.mana = Math.min(s.manaMax, s.mana + 2);
  s.stats.stress = clamp(s.stats.stress + 2, 0, 100);
  const after = rankOf(s.skills[id]); const name = D.skillById[id].name;
  const pct = Math.round(mult * 100);
  const extra = postCap ? `, ${pct}% — past cap, slower with age` : (mult < 1 ? `, ${pct}% — diminishing` : '');
  const msg = `I trained ${name} (+${g.toFixed(1)}${extra}).` + (after !== before ? ` Rank up: ${after}!` : '');
  log(s, msg, 'train'); return { ok: true, msg };
}

// ---- jobs (occupations.json ladders) ----
export const careerOf = (jobId) => D.occ.careers.find((c) => c.id === D.jobsById[jobId].sector);
export function meetsReq(s, j, forPromo = false) {
  const r = j.req; if (hage(s) < r.age) return false;
  if (!forPromo && r.prev) return false;
  for (const [k, v] of Object.entries(r.skills || {})) if ((s.skills[k] || 0) < v) return false;
  for (const f of r.flags || []) if (f === 'route_hybrid' ? s.route !== 'route_hybrid' : !s.flags[f]) return false;
  if (r.race?.length && !r.race.includes(s.race)) return false;
  if (j.sector === 'knight' && j.level === 0 && s.wealth !== 'noble' && !s.flags.has_mentor) return false; // "noble birth or sponsor"
  if (j.sector === 'retainer' && j.level === 0 && s.wealth !== 'noble' && !s.flags.has_mentor && !s.flags.school_royal) return false;
  return true;
}
export const openings = (s) => Object.values(D.jobsById).filter((j) => j.entry).map((j) => ({ job: j, career: careerOf(j.id), ok: meetsReq(s, j) && !(s.job && s.job.id === j.id) }));
export function takeJob(s, id) {
  const j = D.jobsById[id]; if (!meetsReq(s, j)) return { ok: false, msg: 'You do not meet the requirements yet.' };
  if (s.job) s.jobHist.push({ ...s.job, left: s.age });
  s.job = { id, years: 0, perf: 50 }; const m = `I started as ${j.title} (${careerOf(id).name}).`; log(s, m, 'job'); return { ok: true, msg: m };
}
export function quitJob(s) { if (!s.job) return; log(s, `I left my post as ${D.jobsById[s.job.id].title}.`, 'job'); s.jobHist.push({ ...s.job, left: s.age }); s.job = null; }
export function workHard(s) {
  if (!s.job) return { ok: false, msg: 'You have no work.' }; if (!spendAct(s, 'act')) return { ok: false, msg: 'No activity left this year.' };
  s.job.perf = clamp(s.job.perf + 12, 0, 100); for (const k of careerOf(s.job.id).skills) useSkill(s, k, 2.5);
  s.stats.stress = clamp(s.stats.stress + 5, 0, 100); const a = pick(s, careerOf(s.job.id).actions); const m = `Extra work: ${a}.`; log(s, m, 'job'); return { ok: true, msg: m };
}
function jobYear(s, yrs) {
  if (!s.job) return; const j = D.jobsById[s.job.id], c = careerOf(j.id);
  const pay = Math.round(j.wage * yrs * (0.7 + s.job.perf / 170)); s.gold += pay; s.job.years += yrs;
  for (const k of c.skills) useSkill(s, k, 1.6 * yrs ** 0.6);
  s.job.perf = clamp(s.job.perf + rint(s, -6, 6), 0, 100);
  const nx = j.next && D.jobsById[j.next];
  if (nx && s.job.years >= nx.req.years && s.job.perf >= 45 && meetsReq(s, nx, true)) promote(s);
  else if (s.job.perf < 8 && chance(s, 0.5)) { log(s, `I was let go from my post as ${j.title}.`, 'job'); quitJob(s); }
}
export function promote(s) {
  const j = D.jobsById[s.job.id]; if (!j.next) return false; const nx = D.jobsById[j.next];
  s.job = { id: nx.id, years: 0, perf: 55 }; s.stats.fame = clamp(s.stats.fame + 2 + nx.level, 0, 100);
  log(s, `${D.terms.ui.job_promoted} I am now ${nx.title}. ${nx.promo_line}`, 'promo'); return true;
}

// ---- budgets / activities (SYSTEMS_OVERVIEW: 4 activity + 3 social, Adventure capped at 5) ----
function newYearBudget(s) { s.budget = { act: 4, social: 3, adv: 5 }; s.trainCount = {}; }
function spendAct(s, k) { if (s.budget[k] <= 0) return false; s.budget[k]--; return true; }
export function canAdventure(s) { return hage(s) >= 10 && s.budget.adv > 0 && s.budget.act > 0; }
export function adventure(s) {
  if (!canAdventure(s)) return { ok: false, msg: hage(s) < 10 ? 'Too young for the road.' : 'No adventures left this year.' };
  s.budget.adv--; s.budget.act--;
  const el = eligible(s).filter((e) => ['combat', 'exploration', 'dungeon'].includes(e.cat));
  const e = wpick(s, el, (x) => x.w); if (e) { queue(s, e.id); return { ok: true, msg: 'Something finds you on the road…' }; }
  const loc = pick(s, regionOf(s).locations); s.gold += rint(s, 0, 6); log(s, `I wandered ${loc.name}. ${loc.flavor}`, 'explore'); discover(s, loc.id); return { ok: true, msg: loc.flavor };
}
export function rest(s) { if (!spendAct(s, 'act')) return { ok: false, msg: 'No activity left this year.' }; s.stats.stress = clamp(s.stats.stress - 12, 0, 100); s.stats.health = clamp(s.stats.health + 3, 0, 100); log(s, 'I took a slow day by the pond with tea and bread.', 'rest'); return { ok: true }; }
export function chooseRoute(s, r) { if (hage(s) < 8 || s.route) return; s.route = r; log(s, `I chose my path: ${r.replace('route_', '')}.`, 'route'); }
export function travel(s, id) { if (!s.regionsFound.includes(id) || hage(s) < 14) return { ok: false }; if (!spendAct(s, 'act')) return { ok: false, msg: 'No activity left.' }; s.region = id; log(s, `I travelled to ${regionById(id).name}.`, 'travel'); return { ok: true }; }
export const regionById = (id) => D.regions.find((r) => r.id === id);
export const regionOf = (s) => regionById(s.region);
function discover(s, id) { if (!s.codex.includes(id)) s.codex.push(id); }
function unlockRegion(s) { const nx = D.regions.find((r) => !s.regionsFound.includes(r.id)); if (nx) { s.regionsFound.push(nx.id); discover(s, nx.id); log(s, `New realm on my map: ${nx.name}.`, 'explore'); } }

// ---- people / bonds ----
export const living = (s, rel) => s.people.filter((p) => p.alive && (!rel || (Array.isArray(rel) ? rel.includes(p.rel) : p.rel === rel)));
export const partnerOf = (s) => living(s, ['partner', 'spouse'])[0];
export function socialize(s, pid, kind = 'time') {
  const p = s.people.find((x) => x.id === pid); if (!p || !p.alive) return { ok: false }; if (!spendAct(s, 'social')) return { ok: false, msg: 'No social time left this year.' };
  p.bar = clamp(p.bar + rint(s, 4, 12), 0, 100); s.stats.happiness = clamp(s.stats.happiness + 3, 0, 100); useSkill(s, 'charm', 1);
  const m = `I spent time with ${p.first} (${p.rel}).`; log(s, m, 'social'); return { ok: true, msg: m };
}
export function meetSomeone(s, love) {
  if (love && hage(s) < 16) return { ok: false, msg: 'Too young.' }; if (love && partnerOf(s)) return { ok: false, msg: 'You already have someone.' };
  if (!spendAct(s, 'social')) return { ok: false, msg: 'No social time left this year.' };
  const p = person(s, love ? 'partner' : 'friend', rint(s, -3, 3)); p.race = chance(s, 0.7) ? s.race : pick(s, D.races).id; s.people.push(p);
  const m = love ? `I met ${p.first} at the Lantern Market. Something sparked.` : `I made a new friend: ${p.first}.`; log(s, m, 'social'); return { ok: true, msg: m };
}

// ---- Passive Relationship Growth (Gary Nov 5 ~1:57 PM CT) ----
// Companions in your travel/adventure party (and a live partner under the same roof)
// gain a modest yearly closeness boost without spending Social actions.
export const PARTY_CAP = 3;
export const partyOf = (s) => living(s).filter((p) => p.inParty);
export function toggleParty(s, pid) {
  const p = s.people.find((x) => x.id === pid);
  if (!p || !p.alive) return { ok: false, msg: 'They are gone.' };
  if (p.inParty) { p.inParty = false; return { ok: true, msg: `${p.first} left your party.` }; }
  if (partyOf(s).length >= PARTY_CAP) return { ok: false, msg: `Your party is full (${PARTY_CAP}).` };
  p.inParty = true; return { ok: true, msg: `${p.first} joined your party.` };
}

function peopleYear(s, yrs) {
  const grew = [];
  for (const p of living(s)) {
    ensurePersonSheet(s, p);
    p.age += yrs; const h = personHage(p);
    if (h > 62 && chance(s, Math.min(0.9, ((h - 62) / 30) ** 2 * yrs * 0.6))) { p.alive = false; p.inParty = false; log(s, `${p.first}, my ${p.rel}, passed away.`, 'death'); s.stats.happiness = clamp(s.stats.happiness - 10, 0, 100); continue; }
    // Passive Relationship Growth vs yearly fade
    const together = p.inParty || p.rel === 'partner';
    if (together) {
      const gain = rint(s, 3, 7) * yrs; // less than Spend time (4–12), no social cost
      p.bar = clamp(p.bar + gain, 0, 100);
      grew.push(p.first);
    } else {
      p.bar = clamp(p.bar - rint(s, 0, 3) * yrs, 0, 100);
    }
    // Light yearly drift — not a full second life sim
    for (const k of ['health', 'happiness', 'smarts', 'looks']) p.stats[k] = clamp(p.stats[k] + rint(s, -2, 2) * yrs, 0, 100);
    p.stats.stress = clamp(p.stats.stress + rint(s, -1, 2) * yrs, 0, 100);
    p.stats.fame = clamp(p.stats.fame + (chance(s, 0.15) ? 1 : 0), 0, 100);
    // Age into school at 6, real work only at 12+
    if (h < 6) p.jobTitle = 'Child';
    else if (h < 12) p.jobTitle = 'Village lessons';
    else if (isChildJobTitle(p.jobTitle)) p.jobTitle = pickPersonJobTitle(s, p);
  }
  if (grew.length) {
    const names = grew.slice(0, 3).join(', ') + (grew.length > 3 ? ' and others' : '');
    log(s, `Roads and shared work kept bonds warm with ${names}. (Passive Relationship Growth)`, 'social');
  }
}

// ---- events (lifesim/src/events.js semantics; extra if-keys for the fantasy pack) ----
const evById = (id) => D.events.find((e) => e.id === id);
export function matches(s, e) {
  const c = e.if || {}, a = Math.floor(hage(s)); if (a < e.ages[0] || a > e.ages[1]) return false;
  if (e.once && s.flags['once_' + e.id]) return false; if (s.evLast[e.id] != null && s.age - s.evLast[e.id] < (e.cool ?? 4) * turnYears(s)) return false;
  if (c.flag && !s.flags[c.flag]) return false; const nf = c.notflag || c.noflag; if (nf && s.flags[nf]) return false;
  if (c.career && !(s.job && c.career.includes(D.jobsById[s.job.id].sector))) return false;
  if (c.job && !s.job) return false; if (c.partner && !partnerOf(s)) return false;
  if (c.married && !living(s, 'spouse').length) return false; if (c.single_married === false && living(s, 'spouse').length) return false;
  if (c.nochild && living(s, 'child').length) return false; return true;
}
export const eligible = (s) => D.events.filter((e) => !e.chainOnly && matches(s, e));
export function queue(s, id) { if (!s.pending.includes(id)) s.pending.push(id); }
function drawEvents(s) {
  const due = s.chain.filter((c) => c.due <= s.age); s.chain = s.chain.filter((c) => c.due > s.age); for (const c of due) queue(s, c.id);
  if (s.pending.length) return; const n = hage(s) < 13 ? 1 : 1 + (chance(s, 0.35) ? 1 : 0);
  for (let i = 0; i < n; i++) { if (!chance(s, 0.75)) continue; const el = eligible(s).filter((e) => !s.pending.includes(e.id) && !['combat', 'dungeon'].includes(e.cat) || e.cat === 'combat' && chance(s, 0.3)); const e = wpick(s, el, (x) => x.w); if (e) queue(s, e.id); }
}
export function pendingCard(s) { const id = s.pending[0]; if (!id) return null; const e = evById(id); return { ...e, choices: e.choices.map((c) => ({ ...c, odds: oddsOf(s, c), locked: c.req && s.gold < c.req })) }; }
function oddsOf(s, c) { if (c.p == null) return null; let p = c.p; const sk = c.skill === 'primary' ? primarySkills(s)[0] : c.skill; if (sk) p += ((s.skills[sk] || 0) - 25) / 120; return clamp(p, 0.08, 0.95); }
export function applyFx(s, fx = {}) {
  for (let [k, v] of Object.entries(fx)) {
    k = FX_ALIAS[k] || k;
    if (STATS.includes(k)) s.stats[k] = clamp(s.stats[k] + v, 0, 100);
    else if (k === 'gold' || k === 'money') s.gold = Math.max(0, s.gold + v);
    else if (k === 'mana') { if (v > 0 && !s.flags.mana_awakened && v >= 15) {} s.mana = clamp(s.mana + v, 0, s.manaMax + (v > 0 ? v : 0)); s.manaMax = Math.max(s.manaMax, s.mana); }
    else if (k.startsWith('sk_')) useSkill(s, k.slice(3), v * 1.2);
    else if (k === 'xp_primary') for (const p of primarySkills(s).length ? primarySkills(s) : ['endurance']) useSkill(s, p, v);
    else if (k === 'injury') { s.injuries.push({ id: v, heal: s.age + 3 * turnYears(s) }); s.stats.health = clamp(s.stats.health - 4, 0, 100); log(s, D.terms.ui.injured, 'injury'); }
    else if (k === 'relic') { if (!s.relics.includes(v)) s.relics.push(v); discover(s, v); }
    else if (k === 'codex') discover(s, v);
    else if (k === 'region') unlockRegion(s);
    else if (k === 'flagset') s.flags[v] = 1;
    else if (k === 'perf' && s.job) s.job.perf = clamp(s.job.perf + v, 0, 100);
    else if (k === 'promote' && s.job) promote(s);
    else if (k === 'newperson') { const p = person(s, v === 'love' && !partnerOf(s) && hage(s) >= 16 ? 'partner' : 'friend', rint(s, -3, 3)); s.people.push(p); }
    else if (k === 'marry') { const p = partnerOf(s); if (p) { p.rel = 'spouse'; log(s, D.terms.ui.married, 'social'); } }
    else if (k === 'breakup') { const p = partnerOf(s); if (p) p.rel = 'ex'; }
    else if (k === 'child') { const c = person(s, 'child', 0); c.age = v === 'adopted' || v === 'apprentice' ? rint(s, 4, 12) : 0; c.kind = v === 1 ? 'born' : v; c.last = s.last; s.people.push(c); log(s, `${D.terms.ui.child_born} (${c.first}${c.kind !== 'born' ? ', ' + c.kind : ''})`, 'social'); }
  }
}
export function resolve(s, i) {
  const id = s.pending[0]; if (!id) return null; const e = evById(id), c = e.choices[i];
  if (c.req && s.gold < c.req) return { ok: false, msg: 'Not enough gold.' };
  const p = oddsOf(s, c), ok = p == null || chance(s, p), branch = c.win ? (ok ? c.win : c.fail || {}) : c;
  if (c.win) applyFx(s, c.fx || {}); applyFx(s, branch.fx || {});
  const flag = branch.flag || (ok && !c.win && c.flag); if (flag) s.flags[flag] = 1;
  const ch = branch.chain || (!c.win && c.chain); if (ch) s.chain.push({ id: ch.id, due: s.age + rint(s, ch.in[0], ch.in[1]) * turnYears(s) });
  const msg = fill(pick(s, branch.journal || c.journal || ['…']), {}); s.pending.shift();
  if (e.once) s.flags['once_' + e.id] = 1; s.evLast[e.id] = s.age; s.tally.events++; discover(s, e.id);
  log(s, msg, 'event'); if (s.stats.health <= 0) die(s, e.cat === 'combat' || e.cat === 'dungeon' ? 'battle' : 'accident');
  return { ok: true, success: ok, msg, title: e.title };
}

// ---- year tick ----
export function ageUp(s) {
  if (!s.alive || s.pending.length) return false; const yrs = turnYears(s);
  s.age += yrs; const h = hage(s);
  // school (school tracks from JOBS.md; schooling feeds wits/literacy)
  if (h >= 6 && h < 16) { useSkill(s, 'literacy', 3 * yrs ** 0.5); s.stats.smarts = clamp(s.stats.smarts + 1, 0, 100); if (!s.school) { s.school = 'school_village'; log(s, 'I started Village lessons at Vale Primer Yard.', 'school'); } }
  if (h >= 16 && s.school) s.school = null;
  if (s.flags.mana_awakened) { s.manaMax += yrs * (1 + (s.skills.mana_control || 0) / 40); s.mana = s.manaMax; }
  jobYear(s, yrs); peopleYear(s, yrs);
  // skill decay (lifesim decay numbers, physicalAfter scaled by lifespan)
  const dc = D.skills.decay, physAfter = (dc.physicalAfter * race(s).lifespan) / 90;
  for (const k of D.skills.skills) { if (s.skillUsed?.[k.id]) continue; const v = s.skills[k.id]; if (v > 5) s.skills[k.id] = Math.max(0, v - (dc.base * 0.3 + v * dc.pct) * yrs - (k.cat === 'physical' && s.age > physAfter ? dc.physicalExtra * yrs : 0)); }
  s.skillUsed = {};
  // stress, injuries, health, aging
  if (s.trait === 'trait_spark_born' || s.trait === 'trait_restless') s.stats.stress = clamp(s.stats.stress + 1, 0, 100);
  s.injuries = s.injuries.filter((j) => { if (s.age >= j.heal) { log(s, D.terms.ui.healed, 'injury'); return false; } return true; });
  const sd = s.stats.stress > 70 ? -3 : 0, old = h > 55 ? -((h - 55) / 12) * yrs : 0;
  s.stats.health = clamp(s.stats.health + sd + old - s.injuries.length + (h < 30 ? 1 : 0), 0, 100);
  s.stats.stress = clamp(s.stats.stress - 4, 0, 100);
  if (h >= 16 && !s.job) s.gold = Math.max(0, s.gold - 4 * yrs); // living costs
  if (h < 16 && s.wealth === 'noble') s.gold += 2;
  log(s, `${D.terms.ui.year_passed} I am ${Math.floor(s.age)}.`, 'year');
  newYearBudget(s);
  const dieP = s.stats.health <= 0 ? 1 : h > 70 ? Math.min(0.95, ((h - 70) / 28) ** 2.2 * yrs) : 0.0015 * yrs;
  if (chance(s, dieP)) { die(s, s.stats.health <= 0 && s.injuries.length ? 'battle' : h > 70 ? 'old_age' : pick(s, ['illness', 'accident'])); return true; }
  drawEvents(s); return true;
}

// ---- death + legacy (two paths: Reincarnate (Echoes) / Continue as heir) ----
export function die(s, cause) {
  if (!s.alive) return; s.alive = false; s.cause = cause; s.pending = []; log(s, `${D.terms.causes[cause] || D.terms.causes.unknown}`, 'death');
}
export const heirs = (s) => living(s, 'child');
export function legacyScore(s) { return Math.round(s.stats.fame * 2 + s.gold / 20 + Object.values(s.skills).reduce((a, b) => a + Math.max(0, b - 20), 0) / 5 + s.relics.length * 15 + s.codex.length * 2); }
export function echoChoices(s) {
  const ids = D.terms.echoes.map((e) => e.id), w = { echo_might: s.skills.strength + s.skills.endurance, echo_wits: s.skills.lore + s.skills.literacy, echo_mana: s.skills.spellcraft + s.skills.mana_control + 5, echo_grace: s.skills.agility + s.skills.stealth, echo_presence: s.skills.charm + s.stats.looks / 3, echo_renown: s.stats.fame * 2 };
  const out = []; const tmp = { rs: s.rs }; while (out.length < 3) { const e = wpick(tmp, ids.filter((x) => !out.includes(x)), (x) => 5 + (w[x] || 0)); out.push(e); } return out;
}
export function recordMeta(meta, s, path) {
  meta.cemetery = meta.cemetery || []; meta.cemetery.push({ name: `${s.first} ${s.last}`, race: race(s).name, age: Math.floor(s.age), cause: s.cause, score: legacyScore(s), path, prior: s.priorName || null, link: s.linkKind || null });
  meta.codex = [...new Set([...(meta.codex || []), ...s.codex])]; meta.regions = [...new Set([...(meta.regions || []), ...s.regionsFound])]; return meta;
}
export function reincarnate(meta, s, echoId, seed) {
  meta.echoes = meta.echoes || {}; meta.echoes[echoId] = (meta.echoes[echoId] || 0) + 1; recordMeta(meta, s, 'reincarnate');
  const f = rollFate(seed, meta); const n = begin(f, meta); n.priorName = `${s.first} ${s.last}`; n.linkKind = 'soul'; log(n, D.terms.death.after || 'You open new eyes.', 'birth'); return n;
}
export function continueAsHeir(meta, s, heirId, seed) {
  const h = s.people.find((p) => p.id === heirId); recordMeta(meta, s, 'heir');
  const estate = Math.round(s.gold * 0.85); // estate tax 15% (coder_stub)
  const f = rollFate(seed, meta, { race: h.race, last: s.last, rerolls: 0 }); f.first = h.first; f.sex = h.sex; f.wealth = s.wealth;
  const n = begin(f, { ...meta, echoes: {} }, () => ({}));
  n.age = h.age; n.gold = estate + (h.age < 16 ? 0 : 0); n.people = s.people.filter((p) => p.alive && p.id !== heirId).map((p) => ({ ...p, rel: p.rel === 'child' ? 'sibling' : p.rel === 'spouse' ? 'mother' : p.rel === 'sibling' ? 'aunt/uncle' : p.rel }));
  n.relics = [...s.relics]; n.legacy = { gen: (s.legacy.gen || 1) + 1 }; n.flags.is_heir = 1; n.lineage = pick(n, D.terms.lineage).id; n.priorName = `${s.first} ${s.last}`; n.linkKind = 'heir';
  for (const k of D.skills.skills) n.skills[k.id] = Math.min(30, hage(n) * 0.8 + (n.talents.includes(k.id) ? 5 : 0));
  if (n.lineage === 'blood_spark') { n.flags.mana_awakened = 1; n.mana = 10; } if (n.lineage === 'blood_silver') n.gold += 50;
  if (n.lineage === 'blood_iron') n.stats.health = Math.min(100, n.stats.health + 8);
  n.log = []; log(n, `You wake as ${n.first}. The house still smells like them — like you.`, 'birth'); drawEvents(n); return n;
}
