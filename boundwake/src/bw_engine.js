// Boundwake engine: Lifeline's year-turn life loop (src/rng.js + src/core.js forked verbatim from /workspace/lifesim),
// re-written lean around the fantasy pack (data_fantasy/). Event resolve semantics follow lifesim/src/events.js
// (weighted, age-gated, once/cool, chain follow-ups, p/win/fail). Earth systems are reskinned in-pack
// (ailments, law, passions, workshops, notices, court, mentors, patronage, world activities) — see docs/PACK_RESKIN.md.
import { rnd, rint, pick, chance, clamp, wpick } from './rng.js';
import { log, fill } from './core.js';

export let D = null;
export const setPack = (pack) => { D = pack; D.jobsById = pack.occ.jobs; D.skillById = Object.fromEntries(pack.skills.skills.map((k) => [k.id, k])); D.styles = pack.styles || []; D.styleById = Object.fromEntries((pack.styles || []).map((x) => [x.id, x])); };

// ---- stats (Lifeline ids, Boundwake display names from text/ui_strings.md) ----
export const STATS = ['health', 'happiness', 'smarts', 'looks', 'fame', 'karma', 'stress'];
const FX_ALIAS = { spirit: 'happiness', happy: 'happiness', wits: 'smarts', presence: 'looks', renown: 'fame', strain: 'stress', might: 'sk_strength', grace: 'sk_agility', composure: 'sk_composure' };
const NAMES = { m: ['Aren', 'Bram', 'Cael', 'Dorin', 'Edric', 'Fen', 'Garrick', 'Hale', 'Ivo', 'Jory', 'Kestrel', 'Loric', 'Merek', 'Nils', 'Oren', 'Perrin', 'Rowan', 'Tamsin', 'Wil'],
  f: ['Aila', 'Brynn', 'Cerys', 'Dela', 'Elowen', 'Fira', 'Gwen', 'Hesper', 'Isla', 'Junia', 'Kaela', 'Liora', 'Mira', 'Nessa', 'Orla', 'Pell', 'Rhosyn', 'Sorrel', 'Tilde', 'Wren'],
  last: ['Ashdown', 'Brightwater', 'Coldwell', 'Dunmere', 'Emberly', 'Fairholt', 'Greenwell', 'Hollin', 'Ivybank', 'Larkspur', 'Marrow', 'Oakhart', 'Reedley', 'Stonebridge', 'Thorne', 'Willowby'] }; // coder_stub name list (original)
export const race = (s) => D.races.find((r) => r.id === s.race);
export const turnYears = (s) => 1; // Gary Nov 5 2026: 1 turn = 1 year (was lifespan/100)
// hage = human-equivalent (longevity/portrait/death curve). cage = calendar age for ALL player age gates (Gary: 1 turn = 1 year every race).
export const hage = (s, age = s.age) => (age * 90) / race(s).lifespan;
/** Calendar age — Gary Nov 5 ~2:34 PM CT: 1 turn = 1 year for every race; use for adventure/jobs/travel/tournaments/UI age gates. */
export const cage = (s) => Math.floor(s.age || 0);
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
  if (!p.temperament) {
    // Persist a Boundwake temperament (not Bit Tensie). Slight bias by relation.
    let pool = TEMPERAMENTS.map((x) => x.id);
    if (p.rel === 'mother' || p.rel === 'father') pool = ['warm', 'steady', 'stern', 'homebody', 'cordial', 'quiet'];
    if (p.rel === 'sibling') pool = ['bright', 'restless', 'warm', 'reserved', 'quiet', 'cordial', 'prickly'];
    p.temperament = pick(s, pool);
  }
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
    job: null, jobHist: [], region: 'hearthfold', regionsFound: [...new Set(['hearthfold', ...(meta.regions || [])])], route: null, school: null, legacy: { gen: 1 }, tally: { events: 0, ailments: 0, crimes: 0 },
    ailments: [], passions: { active: [], mastered: [] }, workshops: [], notices: { followers: 0, lastBoard: null, posts: 0 },
    court: null, mentor: null, clubs: [], patronage: [], record: { sentences: 0, priors: 0 }, prison: null,
    team: null, guild: null };
  for (const k of STATS) s.stats[k] = k === 'fame' || k === 'stress' ? 0 : k === 'karma' ? 50 : rint(s, 40, 85);
  for (const k of D.skills.skills) s.skills[k.id] = 0;
  s.gold = { poor: 5, common: 30, comfortable: 120, noble: 600 }[s.wealth] ?? 30; s.familyGold = s.gold * 10;
  s.manaMax = Math.max(8, 20 + (race(s).buffs.mana_max || 0) + (race(s).flaws.mana_max || 0)); s.mana = 0;
  if (s.trait === 'trait_spark_born') { s.flags.mana_awakened = 1; s.manaMax = Math.max(s.manaMax || 0, 20); s.mana = Math.max(10, Math.min(s.manaMax, s.mana || 10)); }
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
const MARTIAL_IDS = ['swordsmanship', 'archery', 'shieldwork', 'unarmed'];
const EARLY_OK_CATS = ['physical', 'craft', 'social', 'mental', 'wild']; // trainable from hage ~2 (lighter)
export const skillLocked = (s, id) => {
  const sk = D.skillById[id];
  if (!sk) return true;
  if (sk.cat === 'arcane' && !s.flags.mana_awakened) return true;
  if (id === 'enchanting' && (s.skills.spellcraft || 0) < 20) return true;
  return false;
};
/** Human-readable lock / age gate for Skills UI (Gary Nov 5 ~2:04 PM CT). null = can train. */
export function trainLockReason(s, id) {
  const sk = D.skillById[id]; if (!sk) return 'Unknown skill.';
  const a = cage(s);
  if ((s.budget?.act ?? 0) < 1) return 'No actions left this year.';
  if (sk.cat === 'arcane' && !s.flags.mana_awakened) return 'Needs mana awakening.';
  if (id === 'enchanting' && (s.skills.spellcraft || 0) < 20) return 'Needs Spellcraft 20.';
  if (MARTIAL_IDS.includes(id) && a < 6) return 'Too young for martial drill (age 6+).';
  if (sk.cat === 'arcane' && a < 6) return 'Too young to force the spark (age 6+).';
  if (a < 2) return 'Too young to train.';
  if (a < 4 && !EARLY_OK_CATS.includes(sk.cat)) return 'Too young for this craft.';
  return null;
}
function raceMult(s, id) {
  const r = race(s), cat = D.skillById[id]?.cat; let m = 1 + (r.buffs[id] || 0) + (r.flaws[id] || 0) + (r.buffs['cat_' + cat] || 0);
  if (r.id === 'human' && s.route && primarySkills(s).includes(id)) m += r.buffs.xp_primary || 0;
  if (s.route && primarySkills(s).includes(id)) m += 0.25; if (s.talents.includes(id)) m += 0.3;
  // Sword / magic style bonuses
  if (s.swordStyle && ['swordsmanship', 'strength', 'agility', 'shieldwork'].includes(id)) {
    const st = D.styleById?.[s.swordStyle];
    if (st?.id === 'style_storm' && (id === 'swordsmanship' || id === 'strength')) m += 0.15;
    if (st?.id === 'style_river' && (id === 'swordsmanship' || id === 'shieldwork')) m += 0.15;
    if (st?.id === 'style_thorn' && (id === 'swordsmanship' || id === 'agility')) m += 0.15;
    if (st?.id === 'style_bulwark' && (id === 'shieldwork' || id === 'endurance')) m += 0.15;
  }
  if (s.magicSchool && D.skillById[id]?.cat === 'arcane') m += 0.12;
  return m;
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
  const why = trainLockReason(s, id);
  if (why) return { ok: false, msg: why };
  if (!spendAct(s, 'act')) return { ok: false, msg: 'No activity left this year.' };
  const n = (s.trainCount[id] = (s.trainCount[id] || 0) + 1), curve = D.skills.trainingCurve;
  let mult, postCap = false;
  if (n <= curve.length) mult = curve[n - 1];
  else if (PILLAR_SKILLS.includes(id)) { postCap = true; mult = postCapAgeMult(s); }
  else mult = curve[curve.length - 1];
  // Early years (2–3): lighter gains for soft skills
  if (cage(s) < 4) mult *= 0.55;
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

/** Boundwake-original mana awakening (no Bit Tensie / MT ranks). */
export function seekAwakening(s) {
  if (s.flags.mana_awakened) return { ok: false, msg: 'Mana already answers you.' };
  if (cage(s) < 6) return { ok: false, msg: 'Too young to force the spark (age 6+).' };
  if (!spendAct(s, 'act')) return { ok: false, msg: 'No activity left this year.' };
  const p = clamp(0.18 + (s.skills.focus || 0) / 180 + (s.skills.lore || 0) / 250 + (['light', 'fire', 'shadow', 'water', 'wind', 'earth'].includes(s.affinity) ? 0.06 : 0), 0.08, 0.72);
  if (chance(s, p)) {
    s.flags.mana_awakened = 1; s.mana = Math.max(s.mana, 8); s.manaMax = Math.max(s.manaMax, 20);
    useSkill(s, 'mana_control', 3); useSkill(s, 'spellcraft', 2);
    const msg = 'The spark answered. Mana wakes in me.'; log(s, msg, 'magic'); return { ok: true, msg };
  }
  s.stats.stress = clamp(s.stats.stress + 4, 0, 100);
  useSkill(s, 'focus', 1.2);
  const msg = 'I reached for the spark. It slipped — this year.'; log(s, msg, 'magic'); return { ok: true, msg };
}
export function chooseSwordStyle(s, styleId) {
  const st = D.styleById?.[styleId];
  if (!st || st.type !== 'sword') return { ok: false, msg: 'Unknown blade style.' };
  if (cage(s) < (st.unlock?.age ?? 8)) return { ok: false, msg: 'Too young for a blade school (age 8+).' };
  if ((s.skills.swordsmanship || 0) < (st.unlock?.skills?.swordsmanship ?? 10)) return { ok: false, msg: 'Need more Swordsmanship.' };
  if (s.swordStyle && s.swordStyle !== styleId) return { ok: false, msg: 'Your blade style is already chosen.' };
  s.swordStyle = styleId;
  const msg = `I took up the ${st.name} — ${st.feel}.`; log(s, msg, 'style'); return { ok: true, msg };
}
export function chooseMagicSchool(s, schoolId) {
  const st = D.styleById?.[schoolId];
  if (!st || st.type !== 'school') return { ok: false, msg: 'Unknown magic school.' };
  if (!s.flags.mana_awakened) return { ok: false, msg: 'Needs mana awakening.' };
  if (s.magicSchool && s.magicSchool !== schoolId) return { ok: false, msg: 'Your school is already chosen.' };
  s.magicSchool = schoolId;
  const msg = `I joined the ${st.name}.`; log(s, msg, 'style'); return { ok: true, msg };
}
/** Practice cast — spends mana, grows arcane skills, journal beat. */
export function practiceMagic(s) {
  if (!s.flags.mana_awakened) return { ok: false, msg: 'Needs mana awakening.' };
  if (!s.magicSchool) return { ok: false, msg: 'Choose a magic school first.' };
  if (s.mana < 5) return { ok: false, msg: 'Not enough mana (need 5).' };
  if (!spendAct(s, 'act')) return { ok: false, msg: 'No activity left this year.' };
  s.mana -= 5;
  const school = D.styleById[s.magicSchool]?.name || 'my school';
  const g1 = useSkill(s, 'spellcraft', 4); const g2 = useSkill(s, 'elementalism', 3); useSkill(s, 'mana_control', 2);
  s.stats.stress = clamp(s.stats.stress + 3, 0, 100);
  const msg = `I practiced ${school} forms (mana −5; spellcraft +${g1.toFixed(1)}).`; log(s, msg, 'magic'); return { ok: true, msg };
}
export function swordStyles(s) { return (D.styles || []).filter((x) => x.type === 'sword'); }
export function magicSchools(s) { return (D.styles || []).filter((x) => x.type === 'school'); }
export const attemptManaAwaken = seekAwakening;
export const trainBlockReason = trainLockReason;
export function isSoftSkill(id) {
  const cat = D.skillById[id]?.cat;
  return !!(cat && EARLY_OK_CATS.includes(cat) && !MARTIAL_IDS.includes(id));
}
export function drillSword(s) {
  if (!s.swordStyle) return { ok: false, msg: 'Choose a sword style first (age 8+, Skills).' };
  if (!spendAct(s, 'act')) return { ok: false, msg: 'No activity left this year.' };
  const st = D.styleById?.[s.swordStyle];
  const g = useSkill(s, 'swordsmanship', 2.6);
  useSkill(s, 'strength', 0.7); useSkill(s, 'agility', 0.7);
  if (st?.id === 'style_bulwark') useSkill(s, 'shieldwork', 1.2);
  s.stats.stress = clamp(s.stats.stress + 2, 0, 100);
  const msg = `I drilled ${st?.name || 'my style'} forms (+${g.toFixed(1)} swordsmanship).`;
  log(s, msg, 'train'); return { ok: true, msg };
}



// ---- jobs (occupations.json ladders) ----
export const careerOf = (jobId) => D.occ.careers.find((c) => c.id === D.jobsById[jobId].sector);
export function jobLockReason(s, j, forPromo = false) {
  if (!j) return 'Unknown job.';
  if (s.job && s.job.id === j.id) return 'You already hold this post.';
  const r = j.req || {};
  if (cage(s) < (r.age || 0)) return `Too young (age ${r.age}+).`;
  if (!forPromo && r.prev) return 'Needs prior rank on this track.';
  for (const [k, v] of Object.entries(r.skills || {})) {
    if ((s.skills[k] || 0) < v) return `Needs ${D.skillById[k]?.name || k} ${v}.`;
  }
  for (const f of r.flags || []) {
    if (f === 'route_hybrid' ? s.route !== 'route_hybrid' : !s.flags[f]) {
      if (f === 'route_hybrid') return 'Needs hybrid path.';
      if (f === 'mana_awakened') return 'Needs mana awakening.';
      return `Needs ${String(f).replace(/_/g, ' ')}.`;
    }
  }
  if (j.sector === 'knight' && j.level === 0 && s.wealth !== 'noble' && !s.flags.has_mentor) return 'Needs noble birth or a mentor sponsor.';
  if (j.sector === 'retainer' && j.level === 0 && s.wealth !== 'noble' && !s.flags.has_mentor && !s.flags.school_royal) return 'Needs noble birth, mentor, or royal school.';
  return null;
}
export function meetsReq(s, j, forPromo = false) {
  const r = j.req; if (cage(s) < r.age) return false;
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
export function canAdventure(s) { return cage(s) >= 10 && s.budget.adv > 0 && s.budget.act > 0; }
export function adventure(s) {
  if (!canAdventure(s)) return { ok: false, msg: cage(s) < 10 ? 'Too young for the road.' : 'No adventures left this year.' };
  s.budget.adv--; s.budget.act--;
  // Trained skills + styles color the road (Boundwake growth, not Bit Tensie copy)
  const sword = s.skills.swordsmanship || 0, spell = s.skills.spellcraft || 0, track = s.skills.tracking || 0;
  const style = D.styleById?.[s.swordStyle];
  let combatW = 1 + sword / 50 + (style ? 0.35 : 0);
  let exploreW = 1 + track / 60 + (s.skills.foraging || 0) / 80;
  let dungeonW = 1 + (sword + spell) / 80;
  if (s.route === 'route_sword') combatW *= 1.25;
  if (s.route === 'route_magic') { dungeonW *= 1.15; if (s.flags.mana_awakened) dungeonW *= 1.1; }
  if (s.route === 'route_hybrid') { combatW *= 1.1; dungeonW *= 1.1; }
  const el = eligible(s).filter((e) => ['combat', 'exploration', 'dungeon'].includes(e.cat));
  const e = wpick(s, el, (x) => (x.w || 1) * (x.cat === 'combat' ? combatW : x.cat === 'dungeon' ? dungeonW : exploreW));
  if (e) {
    useSkill(s, e.cat === 'combat' ? 'swordsmanship' : e.cat === 'dungeon' ? (s.flags.mana_awakened ? 'spellcraft' : 'endurance') : 'tracking', 1.5);
    queue(s, e.id); return { ok: true, msg: 'Something finds you on the road…' };
  }
  const loc = pick(s, regionOf(s).locations);
  const coin = rint(s, 0, 6) + Math.floor((s.skills.bartering || 0) / 40);
  s.gold += coin; useSkill(s, 'tracking', 1); useSkill(s, 'endurance', 0.8);
  log(s, `I wandered ${loc.name}. ${loc.flavor}`, 'explore'); discover(s, loc.id); return { ok: true, msg: loc.flavor };
}
export function rest(s) { if (!spendAct(s, 'act')) return { ok: false, msg: 'No activity left this year.' }; s.stats.stress = clamp(s.stats.stress - 12, 0, 100); s.stats.health = clamp(s.stats.health + 3, 0, 100); log(s, 'I took a slow day by the pond with tea and bread.', 'rest'); return { ok: true }; }
export function chooseRoute(s, r) {
  if (cage(s) < 8) return { ok: false, msg: 'Path choice opens at age 8.' };
  if (s.route) return { ok: false, msg: 'Your path is already chosen.' };
  if (!['route_magic', 'route_sword', 'route_hybrid', 'route_craft'].includes(r)) return { ok: false, msg: 'Unknown path.' };
  s.route = r;
  const msg = `I chose my path: ${r.replace('route_', '')}. Primary skills grow faster.`;
  log(s, msg, 'route'); return { ok: true, msg };
}

/** Visit a place in the current realm (Gary Nov 5 ~2:02 PM CT). Spends 1 act; effects by location kind. */
export function visitLocation(s, locId) {
  const reg = regionOf(s);
  const loc = (reg?.locations || []).find((l) => l.id === locId);
  if (!loc) return { ok: false, msg: 'That place is not in this realm.' };
  if (!spendAct(s, 'act')) return { ok: false, msg: 'No activity left this year.' };
  discover(s, loc.id);
  s.flags.last_visit = loc.id;
  s.flags.visit_bias = loc.id; // next event can lean toward this place
  const kind = String(loc.kind || '').toLowerCase();
  let msg = `I visited ${loc.name}.`;
  // Kind effects — pond Visit is NOT the Life-tab "Rest by the pond" (that stays 4-act stress rest).
  if (/park|commons|plaza|harbor park/.test(kind)) {
    s.stats.happiness = clamp(s.stats.happiness + rint(s, 4, 9), 0, 100);
    s.stats.health = clamp(s.stats.health + rint(s, 1, 3), 0, 100);
    msg = `I walked ${loc.name}. The open air eased my spirit.`;
    useSkill(s, 'foraging', 0.4);
  } else if (/pond|tide|water/.test(kind)) {
    s.stats.happiness = clamp(s.stats.happiness + rint(s, 3, 7), 0, 100);
    s.stats.health = clamp(s.stats.health + rint(s, 2, 4), 0, 100);
    s.stats.stress = clamp(s.stats.stress - rint(s, 2, 5), 0, 100);
    msg = `I lingered at ${loc.name}. Water and quiet helped a little.`;
  } else if (/stall|market|civic\/stalls/.test(kind)) {
    const coin = rint(s, 2, 8);
    s.gold += coin;
    useSkill(s, 'bartering', 1.2);
    msg = `I worked the crowd at ${loc.name} and came away with ${coin} gold.`;
  } else if (/academy|primer|training|martial hall/.test(kind)) {
    useSkill(s, 'literacy', 1.4);
    useSkill(s, 'focus', 1.0);
    s.stats.smarts = clamp(s.stats.smarts + rint(s, 1, 3), 0, 100);
    msg = `I studied under the eaves of ${loc.name}.`;
    // Academy visit may nudge awakening
    if (!s.flags.mana_awakened && cage(s) >= 6 && chance(s, 0.22 + (s.skills.focus || 0) / 200)) {
      s.flags.mana_awakened = 1; s.mana = Math.max(s.mana, 8); s.manaMax = Math.max(s.manaMax, 20);
      msg += ' The lessons woke a spark — mana answers me.';
    }
  } else if (/landmark|statue|shrine|bridge/.test(kind)) {
    s.stats.happiness = clamp(s.stats.happiness + rint(s, 3, 6), 0, 100);
    s.stats.fame = clamp(s.stats.fame + (chance(s, 0.25) ? 1 : 0), 0, 100);
    msg = `I paid respects at ${loc.name}. ${loc.flavor || ''}`.trim();
  } else if (/home|cottage|lane|camp/.test(kind)) {
    s.stats.happiness = clamp(s.stats.happiness + rint(s, 2, 5), 0, 100);
    useSkill(s, 'charm', 0.6);
    msg = `I traded gossip along ${loc.name}.`;
  } else if (/civic|guild|watch|fort|travel hub/.test(kind)) {
    s.stats.fame = clamp(s.stats.fame + rint(s, 1, 3), 0, 100);
    msg = `I heard civic rumors at ${loc.name}.`;
  } else if (/dungeon|wild path|ruins/.test(kind)) {
    useSkill(s, 'tracking', 1.0);
    useSkill(s, 'endurance', 0.8);
    s.stats.stress = clamp(s.stats.stress + rint(s, 1, 4), 0, 100);
    if (chance(s, 0.35)) s.gold += rint(s, 1, 5);
    msg = `I probed the edges of ${loc.name}. Danger keeps its own ledgers.`;
  } else if (/healer/.test(kind)) {
    s.stats.health = clamp(s.stats.health + rint(s, 4, 8), 0, 100);
    s.stats.stress = clamp(s.stats.stress - 3, 0, 100);
    msg = `I sought care at ${loc.name}.`;
  } else {
    s.stats.happiness = clamp(s.stats.happiness + rint(s, 2, 4), 0, 100);
    msg = `I spent time at ${loc.name}. ${loc.flavor || ''}`.trim();
  }
  // Tournament meet / guild hall visit hooks (Game Dev venues)
  {
    const k = String(loc.kind || '').toLowerCase();
    if (/tournament|arena|fair/.test(k)) {
      s.flags.meet_venue_ready = loc.name || loc.id;
      msg += ` The lists look open — enter a realm meet from Adventure if you lead a team.`;
    } else if (/guild hall/.test(k)) {
      if (!s.guild && cage(s) >= 18) msg += ` A hall slot could be claimed from Work.`;
      else if (s.guild && s.guild.realmId === s.region) msg += ` My guild hall keeps its board nearby.`;
    }
  }
  log(s, msg, 'explore');
  return { ok: true, msg };
}

export function travel(s, id) { if (!s.regionsFound.includes(id) || cage(s) < 14) return { ok: false, msg: cage(s) < 14 ? 'Travel opens at age 14.' : 'Unknown realm.' }; if (s.region === id) return { ok: false, msg: 'You are already here.' }; if (!spendAct(s, 'act')) return { ok: false, msg: 'No activity left.' }; s.region = id; discover(s, id); log(s, `I travelled to ${regionById(id).name}.`, 'travel'); return { ok: true, msg: `Arrived in ${regionById(id).name}.` }; }
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
  if (love && cage(s) < 16) return { ok: false, msg: 'Too young.' }; if (love && partnerOf(s)) return { ok: false, msg: 'You already have someone.' };
  if (!spendAct(s, 'social')) return { ok: false, msg: 'No social time left this year.' };
  const p = person(s, love ? 'partner' : 'friend', rint(s, -3, 3)); p.race = chance(s, 0.7) ? s.race : pick(s, D.races).id; s.people.push(p);
  const m = love ? `I met ${p.first} at the Lantern Market. Something sparked.` : `I made a new friend: ${p.first}.`; log(s, m, 'social'); return { ok: true, msg: m };
}


// Bond temperaments (original Boundwake set — not Bit Tensie personalities)
export const TEMPERAMENTS = [
  { id: 'warm', name: 'Warm-hearted' },
  { id: 'cordial', name: 'Cordial' },
  { id: 'steady', name: 'Steady' },
  { id: 'homebody', name: 'Homebody' },
  { id: 'restless', name: 'Restless' },
  { id: 'reserved', name: 'Reserved' },
  { id: 'prickly', name: 'Prickly' },
  { id: 'stern', name: 'Stern' },
  { id: 'bright', name: 'Bright' },
  { id: 'quiet', name: 'Quiet' },
];
// Clashes: either direction blocks Passive Relationship Growth
const TEMPER_CLASH = [
  ['restless', 'homebody'], ['restless', 'steady'],
  ['prickly', 'warm'], ['prickly', 'cordial'],
  ['stern', 'warm'], ['stern', 'bright'],
  ['reserved', 'bright'], ['reserved', 'cordial'],
  ['quiet', 'bright'],
];
// Map player birth traits onto temperament space for matching
const PLAYER_TRAIT_TEMPER = {
  trait_spark_born: 'bright',
  trait_iron_bones: 'steady',
  trait_silver_tongue: 'cordial',
  trait_restless: 'restless',
};
export function playerTemperId(s) {
  return PLAYER_TRAIT_TEMPER[s.trait] || 'steady';
}
export function temperamentsClash(a, b) {
  if (!a || !b) return false;
  if (a === b) return false;
  return TEMPER_CLASH.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
}
export function temperamentsMatch(a, b) {
  return !temperamentsClash(a, b);
}
function isChildishJob(title) {
  return !title || title === 'Child' || title === 'Village lessons' || title === 'Helps at home';
}
/** Housemate: partner/spouse/child always; parents & siblings unless movedOut. */
export function livesWithPlayer(s, p) {
  if (!p?.alive) return false;
  if (p.rel === 'partner' || p.rel === 'spouse' || p.rel === 'child') return true;
  if ((p.rel === 'mother' || p.rel === 'father' || p.rel === 'sibling') && !p.movedOut) return true;
  return false;
}
/** Coworker: same career sector or same job title as the player's current job. */
export function isCoworker(s, p) {
  if (!s.job || !p?.alive || isChildishJob(p.jobTitle)) return false;
  const my = D.jobsById[s.job.id];
  if (!my) return false;
  if (p.jobTitle && p.jobTitle === my.title) return true;
  // Match bond jobTitle to any job in same sector
  const sameSectorTitles = Object.values(D.jobsById).filter((j) => j.sector === my.sector).map((j) => j.title);
  return sameSectorTitles.includes(p.jobTitle);
}
/** True if this bond qualifies for Passive Relationship Growth proximity this year. */
export function sharesLifeWith(s, p) {
  return !!(p.inParty || livesWithPlayer(s, p) || isCoworker(s, p));
}

// ---- Passive Relationship Growth (Gary Nov 5 ~1:57–1:58 PM CT) ----
// Party, housemates, and coworkers gain a modest yearly closeness boost when
// temperaments match — without spending Social actions. One boost per person/year.
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
    // Passive Relationship Growth vs yearly fade (one boost max even if party+home+work)
    const near = sharesLifeWith(s, p);
    const match = temperamentsMatch(playerTemperId(s), p.temperament);
    if (near && match) {
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
    const lastPrg = s.flags.prg_log_age || -99;
    if (cage(s) - lastPrg >= 3) {
      log(s, `Roads and shared work kept bonds warm with ${names}.`, 'social');
      s.flags.prg_log_age = cage(s);
    }
  }
}

// ---- events (lifesim/src/events.js semantics; extra if-keys for the fantasy pack) ----
const evById = (id) => D.events.find((e) => e.id === id);
/** Gate team/guild ownership objects used by events_expansion long-life + cross suite. */
function matchOwnGate(s, own, spec) {
  if (spec === true) return !!(own && !own.seized);
  if (spec === false) return !own;
  if (!spec || typeof spec !== 'object') return true;
  if (spec.owned === false) return !own;
  // Default for object specs: must own an active (non-seized) track unless seized:true
  if (!own) return false;
  if (spec.seized === true) { if (!own.seized) return false; }
  else if (spec.seized === false) { if (own.seized) return false; }
  else if (own.seized) return false;
  if (spec.minRenown != null && (own.renown || 0) < spec.minRenown) return false;
  if (spec.maxRenown != null && (own.renown || 0) > spec.maxRenown) return false;
  const peak = Math.max(own.peakRenown || 0, own.renown || 0);
  if (spec.minPeakRenown != null && peak < spec.minPeakRenown) return false;
  if (spec.stage) {
    const stages = Array.isArray(spec.stage) ? spec.stage : [spec.stage];
    const st = own.stage || ownershipStage(own.renown || 0);
    if (!stages.includes(st)) return false;
  }
  const founded = own.foundedYear;
  const years = founded != null ? Math.max(0, cage(s) - founded) : null;
  if (spec.minFoundedYears != null) {
    if (years == null || years < spec.minFoundedYears) return false;
  }
  // Prefer foundedYear span when available; if missing, ages[] already soft-gates.
  if (spec.preferMinFoundedYears != null && years != null && years < spec.preferMinFoundedYears) return false;
  if (spec.hasRival === true && !(own.rivalId || (own.history || []).some((h) => h && h.kind === 'rival'))) return false;
  if (spec.hasRival === false && (own.rivalId || (own.history || []).some((h) => h && h.kind === 'rival'))) return false;
  if (spec.minHandoffCount != null && (own.handoffCount || 0) < spec.minHandoffCount) return false;
  if (spec.flag && !s.flags[spec.flag]) return false;
  if (spec.notflag && s.flags[spec.notflag]) return false;
  return true;
}

export function matches(s, e) {
  const c = e.if || {}, a = cage(s); if (a < e.ages[0] || a > e.ages[1]) return false;
  if (e.once && s.flags['once_' + e.id]) return false; if (s.evLast[e.id] != null && s.age - s.evLast[e.id] < (e.cool ?? 4) * turnYears(s)) return false;
  if (c.flag && !s.flags[c.flag]) return false; const nf = c.notflag || c.noflag; if (nf && s.flags[nf]) return false;
  if (c.career && !(s.job && c.career.includes(D.jobsById[s.job.id].sector))) return false;
  if (c.job && !s.job) return false; if (c.partner && !partnerOf(s)) return false;
  if (c.married && !living(s, 'spouse').length) return false; if (c.single_married === false && living(s, 'spouse').length) return false;
  if (c.nochild && living(s, 'child').length) return false;
  if (c.passion && !(s.passions?.active || []).some((p) => p.id === c.passion)) return false;
  if (c.workshop && !(s.workshops || []).length) return false;
  // Long-life / dual-track gates (Gary: elf/dwarf suite IN; cross ON). Ages use cage.
  if (c.race) {
    const races = Array.isArray(c.race) ? c.race : [c.race];
    if (!races.includes(s.race)) return false;
  }
  if (c.team !== undefined && !matchOwnGate(s, s.team, c.team)) return false;
  if (c.guild !== undefined && !matchOwnGate(s, s.guild, c.guild)) return false;
  return true;
}
export const eligible = (s) => D.events.filter((e) => !e.chainOnly && matches(s, e));
export function queue(s, id) { if (!s.pending.includes(id)) s.pending.push(id); }
function drawEvents(s) {
  const due = s.chain.filter((c) => c.due <= s.age); s.chain = s.chain.filter((c) => c.due > s.age); for (const c of due) queue(s, c.id);
  if (s.pending.length) return; const n = cage(s) < 13 ? 1 : 1 + (chance(s, 0.35) ? 1 : 0);
  const bias = s.flags.visit_bias;
  for (let i = 0; i < n; i++) {
    if (!chance(s, 0.75)) continue;
    const el = eligible(s).filter((e) => !s.pending.includes(e.id) && (!['combat', 'dungeon'].includes(e.cat) || (e.cat === 'combat' && chance(s, 0.3))));
    const e = wpick(s, el, (x) => {
      let w = x.w || 1;
      if (bias && (x.cat === 'exploration' || String(x.id || '').includes(bias) || JSON.stringify(x).includes(bias))) w *= 2.5;
      return w;
    });
    if (e) queue(s, e.id);
  }
  if (bias) delete s.flags.visit_bias; // one year of lean, then clear
}
export function pendingCard(s) { const id = s.pending[0]; if (!id) return null; const e = evById(id); return { ...e, choices: e.choices.map((c) => ({ ...c, odds: oddsOf(s, c), locked: c.req && s.gold < c.req })) }; }
function oddsOf(s, c) { if (c.p == null) return null; let p = c.p; const sk = c.skill === 'primary' ? primarySkills(s)[0] : c.skill; if (sk) p += ((s.skills[sk] || 0) + gearBonus(s, sk) - 25) / 120; return clamp(p, 0.08, 0.95); }
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
    else if (k === 'newperson') { const p = person(s, v === 'love' && !partnerOf(s) && cage(s) >= 16 ? 'partner' : 'friend', rint(s, -3, 3)); s.people.push(p); }
    else if (k === 'marry') { const p = partnerOf(s); if (p) { p.rel = 'spouse'; log(s, D.terms.ui.married, 'social'); } }
    else if (k === 'breakup') { const p = partnerOf(s); if (p) p.rel = 'ex'; }
    else if (k === 'child') { const c = person(s, 'child', 0); c.age = v === 'adopted' || v === 'apprentice' ? rint(s, 4, 12) : 0; c.kind = v === 1 ? 'born' : v; c.last = s.last; s.people.push(c); log(s, `${D.terms.ui.child_born} (${c.first}${c.kind !== 'born' ? ', ' + c.kind : ''})`, 'social'); }
    else if (k === 'pm') gainPassionMeter(s, v);
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


// ---- tournaments (Gary Nov 5 ~2:11 PM CT) ----
// Every 3 calendar years (age 3,6,9…): enter sword / magic / trained-skill meets by age bracket.
// Boundwake-original halls — no Bit Tensie / MT / SDS names.
const TOURNEY_ORGS = {
  sword: [
    { id: 'dojo_greenwell', name: 'Greenwell Blade Circle', realm: 'hearthfold', kind: 'dojo', skill: 'swordsmanship' },
    { id: 'dojo_emberlight', name: 'Emberlight Drill Hall', realm: 'emberlight', kind: 'dojo', skill: 'swordsmanship' },
    { id: 'dojo_spireward', name: 'Practice Lawn Circle', realm: 'spireward', kind: 'dojo', skill: 'swordsmanship' },
  ],
  magic: [
    { id: 'master_vale', name: 'Vale Primer Tutors', realm: 'hearthfold', kind: 'master', skill: 'spellcraft' },
    { id: 'academy_spire', name: 'Spireward Collegium', realm: 'spireward', kind: 'academy', skill: 'spellcraft' },
    { id: 'master_tide', name: 'Tidepool Scribes', realm: 'glassmarket', kind: 'master', skill: 'mana_control' },
  ],
  craft: [
    { id: 'hall_market', name: 'Market Row Guild Yard', realm: 'hearthfold', kind: 'guild', skill: 'smithing' },
    { id: 'hall_ledger', name: 'Ledger Hall Patrons', realm: 'glassmarket', kind: 'guild', skill: 'bartering' },
  ],
};
const TOURNEY_SKILL_MEETS = [
  { id: 'meet_sword', cat: 'sword', title: 'Blade Meet', skill: 'swordsmanship', needAwaken: false },
  { id: 'meet_magic', cat: 'magic', title: 'Spark Meet', skill: 'spellcraft', needAwaken: true },
  { id: 'meet_archery', cat: 'other', title: 'Marks Meet', skill: 'archery', needAwaken: false },
  { id: 'meet_smith', cat: 'other', title: 'Forge Meet', skill: 'smithing', needAwaken: false },
  { id: 'meet_cook', cat: 'other', title: 'Hearth Meet', skill: 'cooking', needAwaken: false },
  { id: 'meet_alchemy', cat: 'other', title: 'Vial Meet', skill: 'alchemy', needAwaken: false },
  { id: 'meet_perform', cat: 'other', title: 'Stage Meet', skill: 'performance', needAwaken: false },
  { id: 'meet_track', cat: 'other', title: 'Trail Meet', skill: 'tracking', needAwaken: false },
  { id: 'meet_unarmed', cat: 'other', title: 'Fist Meet', skill: 'unarmed', needAwaken: false },
  { id: 'meet_tailor', cat: 'other', title: 'Loom Meet', skill: 'tailoring', needAwaken: false },
];
export function tourneyBracket(s) {
  const a = cage(s);
  if (a < 1) return null;
  if (a < 8) return { id: 'child', label: '1–8', min: 1, max: 7 }; // age 8 starts youth
  if (a < 16) return { id: 'youth', label: '8–15', min: 8, max: 15 };
  return { id: 'open', label: '16+', min: 16, max: 999 };
}
export function isTournamentYear(s) {
  // Calendar age (Gary: 1 turn = 1 year every race). Ages 3,6,9…
  const a = cage(s);
  return a >= 3 && a % 3 === 0 && !!tourneyBracket(s);
}
function tourneyField(bracketId) {
  return { child: 8, youth: 22, open: 40 }[bracketId] || 20;
}
export function tournamentOffers(s) {
  if (!isTournamentYear(s)) return [];
  const br = tourneyBracket(s);
  if (!br) return [];
  const entered = new Set(s.flags.tour_entered || []);
  const out = [];
  for (const m of TOURNEY_SKILL_MEETS) {
    if (m.needAwaken && !s.flags.mana_awakened) continue;
    const sk = s.skills[m.skill] || 0;
    const drilled = !!(s.trainCount && s.trainCount[m.skill]) || !!(s.skillUsed && s.skillUsed[m.skill]);
    const minSk = br.id === 'child' ? 1 : br.id === 'youth' ? 3 : 5;
    // Prefer trained/used skills; bare talent seeds alone are not enough
    if (sk < minSk) continue;
    if (!drilled && sk < (br.id === 'child' ? 4 : minSk + 4)) continue;
    if (entered.has(m.id)) continue;
    const name = D.skillById[m.skill]?.name || m.skill;
    out.push({
      id: m.id, title: m.title, cat: m.cat, skill: m.skill, skillName: name,
      bracket: br.label, bracketId: br.id, costAct: 1,
      blurb: `${m.title} · bracket ${br.label} · judged on ${name}`,
    });
  }
  return out;
}
export function enterTournament(s, meetId) {
  if (!isTournamentYear(s)) return { ok: false, msg: 'No tournament year — meets open every 3 years.' };
  const br = tourneyBracket(s);
  if (!br) return { ok: false, msg: 'Too young for the lists.' };
  const meet = TOURNEY_SKILL_MEETS.find((m) => m.id === meetId);
  if (!meet) return { ok: false, msg: 'Unknown meet.' };
  if (meet.needAwaken && !s.flags.mana_awakened) return { ok: false, msg: 'Needs mana awakening.' };
  if (!tournamentOffers(s).find((o) => o.id === meetId)) return { ok: false, msg: 'You cannot enter that meet (train the skill, or already entered).' };
  if (!spendAct(s, 'act')) return { ok: false, msg: 'No activity left this year (entry costs 1 action).' };
  (s.flags.tour_entered ||= []).push(meetId);

  const sk = s.skills[meet.skill] || 0;
  let score = sk + rint(s, 0, 14);
  if (meet.cat === 'sword' && s.swordStyle) score += 6;
  if (meet.cat === 'magic' && s.magicSchool) score += 5;
  if (s.route === 'route_sword' && meet.cat === 'sword') score += 4;
  if (s.route === 'route_magic' && meet.cat === 'magic') score += 4;
  if (s.route === 'route_hybrid' && (meet.cat === 'sword' || meet.cat === 'magic')) score += 3;
  if (s.route === 'route_craft' && meet.cat === 'other') score += 3;
  if (meet.skill === 'swordsmanship' && (s.swordStyle === 'style_storm' || s.swordStyle === 'style_river')) score += 2;

  const field = tourneyField(br.id) + rint(s, -4, 8);
  let place = 8;
  if (score >= field + 18) place = 1;
  else if (score >= field + 10) place = 2;
  else if (score >= field + 4) place = 3;
  else if (score >= field - 2) place = 4;
  else if (score >= field - 8) place = 5;
  else place = 6 + (score < field - 14 ? 2 : 0);

  const goldPay = { 1: 28, 2: 16, 3: 9, 4: 4, 5: 2 }[place] || 0;
  const famePay = { 1: 12, 2: 7, 3: 4, 4: 2, 5: 1 }[place] || 0;
  const gMul = br.id === 'child' ? 0.45 : br.id === 'youth' ? 0.75 : 1;
  const gold = Math.round(goldPay * gMul);
  const fame = Math.max(0, Math.round(famePay * (br.id === 'child' ? 0.6 : 1)));
  s.gold += gold;
  s.stats.fame = clamp(s.stats.fame + fame, 0, 100);
  useSkill(s, meet.skill, place <= 3 ? 2.2 : 0.9);
  s.stats.stress = clamp(s.stats.stress + (place <= 3 ? 3 : 5), 0, 100);

  let msg = `I entered the ${meet.title} (${br.label}). Place: ${place}${place <= 3 ? '!' : '.'}`;
  if (gold || fame) msg += ` Purse: ${gold} gold, renown +${fame}.`;
  else msg += ' No purse — but the crowd saw me.';

  let invite = null;
  if (place <= 2 || (place === 3 && chance(s, 0.45))) {
    const pool = TOURNEY_ORGS[meet.cat === 'other' ? 'craft' : meet.cat] || TOURNEY_ORGS.craft;
    const org = pick(s, pool);
    invite = { id: org.id, name: org.name, kind: org.kind, skill: org.skill || meet.skill, meet: meetId, age: Math.floor(s.age) };
    s.flags.tour_invites = [...(s.flags.tour_invites || []).filter((x) => x.id !== org.id), invite];
    s.flags[`invite_${org.id}`] = 1;
    const kindWord = org.kind === 'dojo' ? 'blade hall' : org.kind === 'academy' ? 'academy' : org.kind === 'master' ? 'tutor circle' : 'guild yard';
    msg += ` ${org.name} took notice — a ${kindWord} invitation waits.`;
  }
  log(s, msg, 'tournament');
  return { ok: true, msg, place, gold, fame, invite };
}
export function tournamentInvites(s) {
  return [...(s.flags.tour_invites || [])];
}
export function acceptTournamentInvite(s, orgId) {
  const inv = (s.flags.tour_invites || []).find((x) => x.id === orgId);
  if (!inv) return { ok: false, msg: 'No such invitation.' };
  if (!spendAct(s, 'act')) return { ok: false, msg: 'No activity left this year.' };
  s.flags.tour_invites = (s.flags.tour_invites || []).filter((x) => x.id !== orgId);
  s.flags[`joined_${orgId}`] = 1;
  s.flags.has_mentor = 1;
  if (inv.kind === 'academy' || inv.kind === 'master') {
    if (inv.kind === 'academy' && !s.flags.mana_awakened) {
      s.flags.mana_awakened = 1; s.manaMax = Math.max(s.manaMax || 0, 20); s.mana = Math.max(s.mana, 8);
    }
    useSkill(s, inv.skill || 'spellcraft', 3);
    useSkill(s, 'focus', 1.5);
    if (!s.mentor && D.mentors?.paths?.spell) {
      s.mentor = { path: 'spell', role: 'drill', years: 0, style: (pick(s, D.mentors.styles) || {}).id || 'steady' };
    }
  } else if (inv.kind === 'dojo') {
    useSkill(s, 'swordsmanship', 3);
    useSkill(s, 'endurance', 1.2);
    if (!s.mentor && D.mentors?.paths?.sword) {
      s.mentor = { path: 'sword', role: 'drill', years: 0, style: (pick(s, D.mentors.styles) || {}).id || 'steady' };
    }
  } else {
    useSkill(s, inv.skill || 'smithing', 2.5);
  }
  discover(s, orgId);
  const msg = `I answered ${inv.name}. The yard took me in.`;
  log(s, msg, 'invite'); return { ok: true, msg };
}
function refreshTournamentYear(s) {
  ensureBags(s);
  // Reset per-calendar-year team counters
  const ca = cage(s);
  if (s.flags.team_year_age !== ca) {
    s.flags.team_year_age = ca;
    s.flags.team_meets_count = 0;
    s.flags.team_aff_xp_year = 0;
    s.flags.team_drill_year = 0;
    s.flags.tour_team_entered = 0;
  }
  if (!isTournamentYear(s)) { s.flags.tour_year = 0; return; }
  const a = cage(s);
  if (s.flags.tour_year === a) return;
  s.flags.tour_year = a;
  s.flags.tour_entered = [];
  s.flags.tour_team_entered = 0;
  const br = tourneyBracket(s);
  if (br) log(s, `Tournament year — bracket ${br.label}. Blade, spark, craft, and Teams meets open on Adventure.`, 'tournament');
}

// ---- year tick ----
export function ageUp(s) {
  if (!s.alive || s.pending.length) return false; const yrs = turnYears(s);
  s.age += yrs; const h = hage(s);
  // school (school tracks from JOBS.md; schooling feeds wits/literacy)
  { const ca = cage(s);
  if (ca >= 6 && ca < 16) { useSkill(s, 'literacy', 3 * yrs ** 0.5); s.stats.smarts = clamp(s.stats.smarts + 1, 0, 100); if (!s.school) { s.school = 'school_village'; log(s, 'I started Village lessons at Vale Primer Yard.', 'school'); } }
  if (ca >= 16 && s.school) s.school = null; }
  if (s.flags.mana_awakened) { s.manaMax += yrs * (1 + (s.skills.mana_control || 0) / 40); s.mana = s.manaMax; }
  jobYear(s, yrs); peopleYear(s, yrs);
  if (s.prison) prisonYear(s, yrs); else {
    ailmentsYear(s, yrs); workshopsYear(s, yrs); passionsYear(s, yrs); noticesYear(s, yrs); courtYear(s, yrs);
    guildYear(s, yrs);
  }
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
  if (cage(s) >= 16 && !s.job) s.gold = Math.max(0, s.gold - 4 * yrs); // living costs (calendar)
  if (cage(s) < 16 && s.wealth === 'noble') s.gold += 2;
  log(s, `${D.terms.ui.year_passed} I am ${Math.floor(s.age)}.`, 'year');
  newYearBudget(s);
  refreshTournamentYear(s);
  gearYear(s, yrs);
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
  if (n.lineage === 'blood_spark') { n.flags.mana_awakened = 1; n.manaMax = Math.max(n.manaMax || 0, 20); n.mana = Math.max(10, Math.min(n.manaMax, n.mana || 10)); } if (n.lineage === 'blood_silver') n.gold += 50;
  if (n.lineage === 'blood_iron') n.stats.health = Math.min(100, n.stats.health + 8);
  n.log = []; log(n, `You wake as ${n.first}. The house still smells like them — like you.`, 'birth'); drawEvents(n); return n;
}


// ---- tournament teams + adventure guild halls (Gary lock + Game Dev balance Nov 5) ----
// Numbers from docs/TOURNAMENT_TEAMS_BALANCE.md + docs/GUILD_HALLS_BALANCE.md
const TEAM_RECOMMENDED = ['swordsmanship', 'archery', 'shieldwork', 'spellcraft', 'elementalism', 'smithing', 'alchemy', 'performance', 'bartering', 'tracking'];
const TEAM_MAX = 4;
const GUILD_MAX = 6;
const GUILD_FEE = [20, 50, 100]; // Low/Mid/High per adventurer/year
const GUILD_JOBS_PER = [1, 2, 3];
const GUILD_HIRE = [
  { cost: 30, lo: 15, hi: 35, titles: ['Runner', 'Blade-hand'] },
  { cost: 55, lo: 30, hi: 50, titles: ['Pathfinder', 'Ward'] },
  { cost: 90, lo: 45, hi: 70, titles: ['Vault-seeker', 'Hexblade'] },
  { cost: 140, lo: 60, hi: 90, titles: ['Realmward', 'Ashwalker'] },
];
const GUILD_REALM_COST = { hearthfold: 150, glassmarket: 220, thornreed: 180, spireward: 260, emberlight: 300 };
const GUILD_REALM_MULT = { hearthfold: 1.0, glassmarket: 1.1, thornreed: 1.15, spireward: 1.2, emberlight: 1.25 };
const REALM_MEET_TIER = { hearthfold: 1.0, glassmarket: 1.1, thornreed: 1.15, spireward: 1.2, emberlight: 1.25 };

export function ensureTeamGuild(s) {
  if (s.team === undefined) s.team = null;
  if (s.guild === undefined) s.guild = null;
  if (!s.flags) s.flags = {};
  if (s.flags.team_meets_year == null) s.flags.team_meets_year = 0;
  if (s.flags.team_meets_count == null) s.flags.team_meets_count = 0;
  if (s.flags.team_aff_xp_year == null) s.flags.team_aff_xp_year = 0;
  if (s.flags.team_drill_year == null) s.flags.team_drill_year = 0;
  if (!s.flags.team_history) s.flags.team_history = [];
  if (!s.flags.guild_rehire_block) s.flags.guild_rehire_block = {};
  // Gary lock: cross team↔guild bonuses ON for v1 (docs/CROSS_BONUSES.md)
  if (!s.flags.cross) s.flags.cross = { teamFeedsGuild: true, guildHealsTeam: true };
  else { s.flags.cross.teamFeedsGuild = true; s.flags.cross.guildHealsTeam = true; }
  if (s.team && s.team.stage == null) s.team.stage = ownershipStage(s.team.renown || 0);
  if (s.guild && s.guild.stage == null) s.guild.stage = ownershipStage(s.guild.renown || 0);
  if (s.team) { s.team.peakRenown = Math.max(s.team.peakRenown || 0, s.team.renown || 0); if (s.team.handoffCount == null) s.team.handoffCount = 0; }
  if (s.guild) { s.guild.peakRenown = Math.max(s.guild.peakRenown || 0, s.guild.renown || 0); if (s.guild.handoffCount == null) s.guild.handoffCount = 0; }
  if (s.flags.twin_banners_year == null) s.flags.twin_banners_year = -1;
  if (s.flags.meet_blood_reroll_year == null) s.flags.meet_blood_reroll_year = -1;
}

/** Renown ladder: Local 0 / Known 25 / Renowned ≥50 / Famed 75. Stages: founding→proven→renowned→legacy. */
export function ownershipStage(renown, tag) {
  if (tag === 'legacy' || tag === 'disbanded' || tag === 'seized') return tag;
  const r = renown || 0;
  if (r >= 50) return 'renowned';
  if (r >= 25) return 'proven';
  return 'founding';
}
export function isRenowned(renown) { return (renown || 0) >= 50; }
export function crossActive(s) {
  ensureTeamGuild(s);
  return !!(s.team && s.guild && !s.team.seized && !s.guild.seized && s.flags.cross?.teamFeedsGuild && s.flags.cross?.guildHealsTeam);
}
function syncOwnershipStage(own) {
  if (!own || own.seized || own.stage === 'legacy' || own.stage === 'disbanded') return;
  own.peakRenown = Math.max(own.peakRenown || 0, own.renown || 0);
  own.stage = ownershipStage(own.renown || 0);
}

function softRenown(cur, gain) {
  let g = gain;
  if (cur >= 80) g *= 0.5;
  return clamp(cur + g, 0, 100);
}

function memberPower(m, team) {
  const bonus = Math.min(10, Math.floor((team.renown || 0) / 3));
  return clamp((m.power || 0) + (m.isPlayer ? 0 : bonus), 5, 95);
}

/** Guild → team power edge (CROSS_BONUSES.md). Cap +6. */
export function guildToTeamPowerBonus(s, meetRealmId) {
  ensureTeamGuild(s);
  if (!crossActive(s)) return 0;
  const gr = s.guild.renown || 0;
  let bonus = 0;
  if (gr >= 75) bonus = 5;
  else if (gr >= 50) bonus = 4;
  else if (gr >= 25) bonus = 2;
  if (meetRealmId && s.guild.realmId === meetRealmId) bonus += 1;
  return Math.min(6, bonus);
}

/** Team → guild hire discount fraction (0–0.12). */
export function teamHireDiscount(s) {
  ensureTeamGuild(s);
  if (!crossActive(s)) return 0;
  const tr = s.team.renown || 0;
  if (tr >= 75) return 0.12;
  if (tr >= 50) return 0.10;
  if (tr >= 25) return 0.05;
  return 0;
}

/** Team → guild job successChance add (cap +0.03). */
export function teamJobSuccessBonus(s) {
  ensureTeamGuild(s);
  if (!crossActive(s)) return 0;
  const tr = s.team.renown || 0;
  if (tr >= 75) return 0.03;
  if (tr >= 50) return 0.02;
  return 0;
}

function tryTwinBanners(s, reason) {
  ensureTeamGuild(s);
  if (!crossActive(s)) return false;
  if (!isRenowned(s.team.renown) || !isRenowned(s.guild.renown)) return false;
  if (s.flags.twin_banners_year === cage(s)) return false;
  s.flags.twin_banners_year = cage(s);
  s.team.renown = softRenown(s.team.renown, 1);
  s.guild.renown = softRenown(s.guild.renown, 1);
  syncOwnershipStage(s.team); syncOwnershipStage(s.guild);
  s.flags.ui_renown_delta = Math.max(s.flags.ui_renown_delta || 0, 1);
  s.flags.ui_twin_banners = 1;
  log(s, `Twin banners — team and hall renown each +1 (${reason}).`, 'cross');
  return true;
}

export function teamPower(s, meetRealmId) {
  ensureTeamGuild(s);
  const t = s.team; if (!t || !t.roster?.length) return 0;
  const powers = t.roster.map((m) => memberPower(m, t));
  const avg = powers.reduce((a, b) => a + b, 0) / powers.length;
  const mx = Math.max(...powers);
  const base = avg + 0.15 * mx + Math.floor((t.renown || 0) / 20);
  return base + guildToTeamPowerBonus(s, meetRealmId || s.region);
}

export function teamRecommendedAffinities() { return TEAM_RECOMMENDED.slice(); }

export function canFoundTeam(s) {
  ensureTeamGuild(s);
  if (s.team) return { ok: false, msg: 'You already lead a team.' };
  if (cage(s) < 16) return { ok: false, msg: 'Teams unlock at age 16.' };
  return { ok: true };
}

export function foundTeam(s, name, skillId) {
  ensureTeamGuild(s);
  const gate = canFoundTeam(s); if (!gate.ok) return gate;
  const sk = D.skillById[skillId]; if (!sk) return { ok: false, msg: 'Unknown skill affinity.' };
  if ((s.skills[skillId] || 0) < 20) return { ok: false, msg: `Need ${sk.name} 20+ to found on that affinity.` };
  if (s.gold < 80) return { ok: false, msg: 'Need 80 gold to found a team.' };
  if (!spendAct(s, 'act')) return { ok: false, msg: 'No activity left this year.' };
  s.gold -= 80;
  const nm = String(name || '').trim().slice(0, 28) || `${s.last} Circle`;
  s.team = {
    name: nm, affinitySkill: skillId, foundedYear: cage(s),
    roster: [], renown: 0, peakRenown: 0, wins: { realm: 0, grand: 0 }, history: [],
    renames: 0, stage: 'founding', seized: false, rivalId: null, heirId: null, reclaimVia: null, handoffCount: 0,
  };
  const msg = `The Clerk of Meets stamped "${nm}" — affinity: ${sk.name}.`;
  log(s, msg, 'team'); return { ok: true, msg };
}

export function renameTeam(s, name) {
  ensureTeamGuild(s);
  if (!s.team) return { ok: false, msg: 'No team.' };
  const nm = String(name || '').trim().slice(0, 28); if (!nm) return { ok: false, msg: 'Need a name.' };
  if (s.team.renames > 0) {
    if (s.gold < 15) return { ok: false, msg: 'Rename costs 15 gold after the first.' };
    s.gold -= 15;
  }
  s.team.renames = (s.team.renames || 0) + 1;
  s.team.name = nm;
  const msg = `The team now rides as "${nm}".`; log(s, msg, 'team'); return { ok: true, msg };
}

export function disbandTeam(s) {
  ensureTeamGuild(s);
  if (!s.team) return { ok: false, msg: 'No team.' };
  const snap = { name: s.team.name, affinitySkill: s.team.affinitySkill, wins: { ...s.team.wins }, history: [...(s.team.history || [])], foundedYear: s.team.foundedYear };
  s.flags.team_history.push(snap);
  discover(s, 'team_' + snap.name.toLowerCase().replace(/\s+/g, '_'));
  const msg = `I disbanded ${snap.name}. Wins stay in the Codex.`;
  s.team = null;
  log(s, msg, 'team'); return { ok: true, msg };
}

export function hireTeamNpc(s) {
  ensureTeamGuild(s);
  if (!s.team) return { ok: false, msg: 'Found a team first.' };
  if (s.team.roster.length >= TEAM_MAX) return { ok: false, msg: 'Roster full (4).' };
  if (s.gold < 25) return { ok: false, msg: 'Hire costs 25 gold.' };
  s.gold -= 25;
  const aff = s.team.affinitySkill;
  const base = s.skills[aff] || 20;
  const power = clamp(base + rint(s, -10, 10), 5, 95);
  const sex = chance(s, 0.5) ? 'm' : 'f';
  const used = new Set((s.team.roster || []).map((x) => x.bust).filter(Boolean));
  let bust = rint(s, 1, 4); for (let i = 0; i < 4 && used.has(bust); i++) bust = (bust % 4) + 1;
  const m = { id: 'tm' + (s.tid = (s.tid || 0) + 1), name: pick(s, NAMES[sex]), power, hired: cage(s), isPlayer: false, bust };
  s.team.roster.push(m);
  const msg = `I hired ${m.name} for the team (power ${power}).`; log(s, msg, 'team'); return { ok: true, msg, member: m };
}

export function fireTeamNpc(s, mid) {
  ensureTeamGuild(s);
  if (!s.team) return { ok: false, msg: 'No team.' };
  const i = s.team.roster.findIndex((m) => m.id === mid);
  if (i < 0) return { ok: false, msg: 'Not on roster.' };
  const m = s.team.roster[i];
  s.team.roster.splice(i, 1);
  const msg = m.isPlayer ? `I stepped down as captain.` : `I released ${m.name} from the roster.`;
  log(s, msg, 'team'); return { ok: true, msg };
}

export function setTeamCaptain(s, on) {
  ensureTeamGuild(s);
  if (!s.team) return { ok: false, msg: 'No team.' };
  const aff = s.team.affinitySkill;
  const existing = s.team.roster.find((m) => m.isPlayer);
  if (!on) {
    if (!existing) return { ok: false, msg: 'You are not on the roster.' };
    return fireTeamNpc(s, existing.id);
  }
  if (existing) return { ok: false, msg: 'You are already captain.' };
  if ((s.skills[aff] || 0) < 20) return { ok: false, msg: 'Need affinity skill 20+ to captain.' };
  if (s.team.roster.length >= TEAM_MAX) return { ok: false, msg: 'Roster full (4).' };
  const m = { id: 'tm_player', name: s.first, power: Math.floor(s.skills[aff] || 0), hired: cage(s), isPlayer: true, bust: 0 };
  s.team.roster.push(m);
  const msg = `I joined ${s.team.name} as captain.`; log(s, msg, 'team'); return { ok: true, msg };
}

function addAffinityXp(s, amt) {
  ensureTeamGuild(s);
  if (!s.team || amt <= 0) return 0;
  const yearCap = 12;
  const used = s.flags.team_aff_xp_year || 0;
  const room = Math.max(0, yearCap - used);
  const give = Math.min(amt, room);
  if (give <= 0) return 0;
  const sk = s.team.affinitySkill;
  s.skills[sk] = Math.min(100, (s.skills[sk] || 0) + give);
  s.flags.team_aff_xp_year = used + give;
  useSkill(s, sk, 0.01); // mark used so decay skips lightly
  return give;
}

function resetTeamYearFlags(s) {
  const a = cage(s);
  if (s.flags.team_year_age !== a) {
    s.flags.team_year_age = a;
    s.flags.team_meets_count = 0;
    s.flags.team_aff_xp_year = 0;
    s.flags.team_drill_year = 0;
    s.flags.tour_team_entered = 0;
  }
}

export function isMeetVenue(loc) {
  const k = String(loc?.kind || '').toLowerCase();
  return /tournament|arena|fair/.test(k);
}

export function canEnterRealmMeet(s) {
  ensureTeamGuild(s); resetTeamYearFlags(s);
  if (!s.team) return { ok: false, msg: 'Found a tournament team first.' };
  if (s.team.roster.length < 1) return { ok: false, msg: 'Need at least one on the roster.' };
  if ((s.flags.team_meets_count || 0) >= 2) return { ok: false, msg: 'Already entered 2 realm meets this year.' };
  if (!s.flags.meet_venue_ready && !s.flags.notice_team_meet)
    return { ok: false, msg: 'Visit a Tournament/Arena lists venue first, or accept a notice-board meet invite.' };
  if (s.gold < 10) return { ok: false, msg: 'Entry costs 10 gold.' };
  if ((s.budget?.act ?? 0) < 1) return { ok: false, msg: 'No activity left this year.' };
  return { ok: true };
}

function resolveTeamMatch(s, fieldPower, meetRealmId) {
  const tp = teamPower(s, meetRealmId);
  // sync player captain power
  const cap = s.team.roster.find((m) => m.isPlayer);
  if (cap) cap.power = Math.floor(s.skills[s.team.affinitySkill] || 0);
  let wins = 0;
  for (let i = 0; i < 3; i++) {
    const opp = fieldPower + rint(s, -6, 6);
    if (tp + rint(s, -5, 8) >= opp) wins++;
  }
  // place by wins: 3→1, 2→2, 1→3, 0→4
  return wins >= 3 ? 1 : wins === 2 ? 2 : wins === 1 ? 3 : 4;
}

export function enterRealmMeet(s, venueName) {
  ensureTeamGuild(s); resetTeamYearFlags(s);
  const gate = canEnterRealmMeet(s); if (!gate.ok) return gate;
  if (s.team.seized) return { ok: false, msg: 'A rival holds your team — reclaim first.' };
  const venue = venueName || s.flags.meet_venue_ready || 'a realm meet';
  if (!spendAct(s, 'act')) return { ok: false, msg: 'No activity left this year.' };
  let entry = 10;
  if (crossActive(s) && (s.guild.renown || 0) >= 75) entry = Math.max(5, entry - 2);
  s.gold -= entry;
  s.flags.team_meets_count = (s.flags.team_meets_count || 0) + 1;
  s.flags.meet_venue_ready = 0;
  s.flags.notice_team_meet = 0;
  const tier = REALM_MEET_TIER[s.region] || 1;
  const field = (18 + cage(s) * 0.4 + rint(s, 0, 15)) * tier;
  const place = resolveTeamMatch(s, field, s.region);
  const pay = { 1: { g: 40, r: 5, xp: 3 }, 2: { g: 25, r: 3, xp: 2 }, 3: { g: 15, r: 2, xp: 1 } }[place] || { g: 0, r: 0, xp: 0 };
  s.gold += pay.g;
  s.team.renown = softRenown(s.team.renown, pay.r);
  const xp = addAffinityXp(s, pay.xp);
  if (place === 1) s.team.wins.realm = (s.team.wins.realm || 0) + 1;
  let msg = `${s.team.name} entered ${venue}. Place: ${place}.`;
  if (pay.g) msg += ` Purse ${pay.g} gold, team renown +${pay.r}.`;
  if (xp) msg += ` Affinity +${xp}.`;
  if (place === 1 && chance(s, 0.15) && s.team.roster.length < TEAM_MAX) {
    msg += ' A hopeful asked to join — hire from the team board.';
    s.flags.team_recruit_hook = 1;
  }
  if (pay.r) s.flags.ui_renown_delta = pay.r;
  if (place === 1) s.flags.ui_victory = 1;
  syncOwnershipStage(s.team);
  if (place <= 3) tryTwinBanners(s, 'after a realm meet');
  s.team.history.push({ y: cage(s), kind: 'realm', place, venue: venue || s.region });
  log(s, msg, 'team'); return { ok: true, msg, place, gold: pay.g };
}

export function canEnterTeamGrand(s) {
  ensureTeamGuild(s); resetTeamYearFlags(s);
  if (!isTournamentYear(s)) return { ok: false, msg: 'Grand Teams bracket opens every 3 years.' };
  if (!s.team) return { ok: false, msg: 'Found a tournament team first.' };
  if (s.team.roster.length < 2) return { ok: false, msg: 'Need roster of 2+.' };
  if ((s.team.renown || 0) < 5 && !(s.team.wins?.realm > 0)) return { ok: false, msg: 'Need team renown 5+ or a realm win.' };
  if (s.flags.tour_team_entered) return { ok: false, msg: 'Already entered Teams this tournament year.' };
  if (s.gold < 20) return { ok: false, msg: 'Entry costs 20 gold.' };
  if ((s.budget?.act ?? 0) < 1) return { ok: false, msg: 'No activity left this year.' };
  return { ok: true };
}

export function enterTeamGrand(s) {
  ensureTeamGuild(s); resetTeamYearFlags(s);
  const gate = canEnterTeamGrand(s); if (!gate.ok) return gate;
  if (s.team.seized) return { ok: false, msg: 'A rival holds your team — reclaim first.' };
  if (!spendAct(s, 'act')) return { ok: false, msg: 'No activity left this year.' };
  s.gold -= 20;
  s.flags.tour_team_entered = 1;
  const tier = REALM_MEET_TIER[s.region] || 1;
  const field = (30 + cage(s) * 0.5 + rint(s, 0, 20)) * tier;
  // 7 AI opponents approximated as 3 matches vs scaled field → place 1–8
  const place = (() => {
    const tp = teamPower(s, s.region);
    let score = 0;
    for (let i = 0; i < 3; i++) {
      const opp = field * (0.85 + i * 0.12) + rint(s, -5, 5);
      if (tp + rint(s, -4, 10) >= opp) score++;
    }
    if (score === 3) return chance(s, 0.55) ? 1 : 2;
    if (score === 2) return chance(s, 0.5) ? 2 : 3;
    if (score === 1) return 4 + rint(s, 0, 2);
    return 6 + rint(s, 0, 2);
  })();
  const table = {
    1: { g: 120, r: 12, xp: 8, hook: 0.4 },
    2: { g: 70, r: 7, xp: 5, hook: 0.2 },
    3: { g: 40, r: 4, xp: 3, hook: 0.1 },
  };
  const pay = table[place] || { g: 10, r: 1, xp: 1, hook: 0 };
  s.gold += pay.g;
  s.team.renown = softRenown(s.team.renown, pay.r);
  const xp = addAffinityXp(s, pay.xp);
  if (place === 1) s.team.wins.grand = (s.team.wins.grand || 0) + 1;
  let msg = `${s.team.name} entered the Grand Teams bracket. Place: ${place}.`;
  msg += ` Purse ${pay.g} gold, team renown +${pay.r}.`;
  if (xp) msg += ` Affinity +${xp}.`;
  if (pay.hook && chance(s, pay.hook) && s.team.roster.length < TEAM_MAX) {
    s.flags.team_recruit_hook = 1;
    msg += ' A strong recruit took notice.';
  }
  if (pay.r) s.flags.ui_renown_delta = pay.r;
  if (place === 1) s.flags.ui_victory = 1;
  if (place <= 3) s.flags.team_grand_top3 = 1;
  syncOwnershipStage(s.team);
  if (place <= 3) tryTwinBanners(s, 'after the Teams bracket');
  s.team.history.push({ y: cage(s), kind: 'grand', place });
  log(s, msg, 'team'); return { ok: true, msg, place, gold: pay.g };
}

export function drillTeam(s) {
  ensureTeamGuild(s); resetTeamYearFlags(s);
  if (!s.team) return { ok: false, msg: 'No team.' };
  if (s.flags.team_drill_year) return { ok: false, msg: 'Already drilled this year.' };
  if (!spendAct(s, 'act')) return { ok: false, msg: 'No activity left this year.' };
  s.flags.team_drill_year = 1;
  const xp = addAffinityXp(s, 1);
  const msg = `The team drilled forms. Affinity +${xp}.`;
  log(s, msg, 'team'); return { ok: true, msg };
}

export function acceptTeamMeetInvite(s) {
  ensureTeamGuild(s);
  if (!s.flags.notice_team_meet) return { ok: false, msg: 'No meet invite waiting.' };
  s.flags.notice_team_meet = 0;
  return enterRealmMeet(s, 'a posted realm meet');
}

// ---- adventure guild halls ----
export function guildHireTier(s) {
  ensureTeamGuild(s);
  const r = s.guild?.renown || 0;
  if (r >= 75) return 3;
  if (r >= 50) return 2;
  if (r >= 25) return 1;
  return 0;
}

export function guildLabel(s) {
  const t = guildHireTier(s);
  return ['Local hall', 'Known hall', 'Renowned hall', 'Famed hall'][t] || 'Local hall';
}

export function canFoundGuild(s, realmId) {
  ensureTeamGuild(s);
  if (s.guild) return { ok: false, msg: 'You already own a guild hall (one per life in v1).' };
  if (cage(s) < 18) return { ok: false, msg: 'Guild halls unlock at age 18.' };
  const rid = realmId || s.region;
  const cost = GUILD_REALM_COST[rid]; if (cost == null) return { ok: false, msg: 'Unknown realm.' };
  if (rid === 'glassmarket' && (s.stats.fame || 0) < 10 && (s.skills.bartering || 0) < 25)
    return { ok: false, msg: 'Glassmarket needs renown 10+ or Bartering 25.' };
  if (rid === 'spireward' && (s.stats.fame || 0) < 25 && (s.skills.etiquette || 0) < 30)
    return { ok: false, msg: 'Spireward needs renown 25+ or Etiquette 30.' };
  if (rid === 'emberlight' && (s.stats.fame || 0) < 40)
    return { ok: false, msg: 'Emberlight needs renown 40+.' };
  if (s.gold < cost) return { ok: false, msg: `Need ${cost} gold.` };
  if ((s.budget?.act ?? 0) < 1) return { ok: false, msg: 'No activity left this year.' };
  return { ok: true, cost, realmId: rid };
}

export function foundGuild(s, realmId) {
  ensureTeamGuild(s);
  const gate = canFoundGuild(s, realmId); if (!gate.ok) return gate;
  if (!spendAct(s, 'act')) return { ok: false, msg: 'No activity left this year.' };
  s.gold -= gate.cost;
  s.guild = {
    realmId: gate.realmId, foundedYear: cage(s), renown: 0, peakRenown: 0, coffer: 0,
    feeTier: 1, roster: [], jobsDone: 0, jobsFailed: 0,
    stage: 'founding', seized: false, rivalId: null, heirId: null, reclaimVia: null, name: 'Hall', handoffCount: 0,
  };
  const reg = regionById(gate.realmId);
  const msg = `A hall-master writ opened my adventure guild hall in ${reg?.name || gate.realmId} (${gate.cost} gold).`;
  log(s, msg, 'guild'); return { ok: true, msg };
}

export function setGuildFee(s, tier) {
  ensureTeamGuild(s);
  if (!s.guild) return { ok: false, msg: 'No guild hall.' };
  const t = clamp(+tier | 0, 0, 2);
  s.guild.feeTier = t;
  const label = ['Low', 'Mid', 'High'][t];
  const msg = `Guild fee set to ${label} (${GUILD_FEE[t]} gold per adventurer / year).`;
  log(s, msg, 'guild'); return { ok: true, msg };
}

export function hireGuildAdventurer(s) {
  ensureTeamGuild(s);
  if (!s.guild) return { ok: false, msg: 'Open a guild hall first.' };
  if (s.guild.roster.length >= GUILD_MAX) return { ok: false, msg: 'Roster full (6).' };
  if (s.guild.seized) return { ok: false, msg: 'A rival holds your hall — reclaim first.' };
  let tier = guildHireTier(s);
  // Meet-blooded: one free tier-0/1 re-roll per year if team grand top-3 this life
  if (crossActive(s) && s.flags.team_grand_top3 && s.flags.meet_blood_reroll_year !== cage(s) && tier > 1 && chance(s, 0.5)) {
    tier = rint(s, 0, 1);
    s.flags.meet_blood_reroll_year = cage(s);
  }
  const pool = GUILD_HIRE[tier];
  const blocked = s.flags.guild_rehire_block || {};
  const disc = teamHireDiscount(s);
  const cost = Math.max(1, Math.floor(pool.cost * (1 - disc)));
  if (s.gold < cost) return { ok: false, msg: `Hire costs ${cost} gold.` };
  s.gold -= cost;
  const sex = chance(s, 0.5) ? 'm' : 'f';
  const title = pick(s, pool.titles);
  const used = new Set((s.guild.roster || []).map((x) => x.bust).filter(Boolean));
  let bust = rint(s, 1, 4); for (let i = 0; i < 4 && used.has(bust); i++) bust = (bust % 4) + 1;
  const m = {
    id: 'ga' + (s.gid = (s.gid || 0) + 1),
    name: `${pick(s, NAMES[sex])} the ${title}`,
    tier, power: rint(s, pool.lo, pool.hi), wagePaid: 0, injuredUntil: 0, jobsOk: 0, bust,
  };
  s.guild.roster.push(m);
  const msg = `I hired ${m.name} (power ${m.power}, pool tier ${tier}) for ${cost} gold${disc ? ` (−${Math.round(disc*100)}% Meet fame)` : ''}.`;
  log(s, msg, 'guild'); return { ok: true, msg, member: m };
}

export function fireGuildAdventurer(s, mid) {
  ensureTeamGuild(s);
  if (!s.guild) return { ok: false, msg: 'No guild hall.' };
  const i = s.guild.roster.findIndex((m) => m.id === mid);
  if (i < 0) return { ok: false, msg: 'Not on roster.' };
  const m = s.guild.roster[i];
  s.guild.roster.splice(i, 1);
  s.flags.guild_rehire_block[m.id] = cage(s) + 2;
  const msg = `I released ${m.name} from the hall.`; log(s, msg, 'guild'); return { ok: true, msg };
}

export function withdrawGuildCoffer(s, amount) {
  ensureTeamGuild(s);
  if (!s.guild) return { ok: false, msg: 'No guild hall.' };
  const amt = Math.min(Math.floor(amount || s.guild.coffer), s.guild.coffer);
  if (amt <= 0) return { ok: false, msg: 'Coffer is empty.' };
  if (!spendAct(s, 'act')) return { ok: false, msg: 'Withdraw costs 1 action.' };
  s.guild.coffer -= amt; s.gold += amt;
  const msg = `I withdrew ${amt} gold from the hall coffer.`; log(s, msg, 'guild'); return { ok: true, msg };
}

export function depositGuildCoffer(s, amount) {
  ensureTeamGuild(s);
  if (!s.guild) return { ok: false, msg: 'No guild hall.' };
  const amt = Math.min(Math.floor(amount || 0), Math.floor(s.gold));
  if (amt <= 0) return { ok: false, msg: 'Nothing to deposit.' };
  s.gold -= amt; s.guild.coffer += amt;
  const msg = `I deposited ${amt} gold into the hall coffer.`; log(s, msg, 'guild'); return { ok: true, msg };
}

export function closeGuild(s) {
  ensureTeamGuild(s);
  if (!s.guild) return { ok: false, msg: 'No guild hall.' };
  s.gold += Math.floor(s.guild.coffer || 0);
  const msg = `I closed the guild hall. Coffer returned to purse.`;
  s.guild = null;
  log(s, msg, 'guild'); return { ok: true, msg };
}

export function relocateGuild(s, realmId) {
  ensureTeamGuild(s);
  if (!s.guild) return { ok: false, msg: 'No guild hall.' };
  const costFull = GUILD_REALM_COST[realmId]; if (costFull == null) return { ok: false, msg: 'Unknown realm.' };
  if (realmId === s.guild.realmId) return { ok: false, msg: 'Already there.' };
  // check realm gates using fame/skills without the "already own" check
  const fake = { ...s, guild: null };
  const gate = canFoundGuild(fake, realmId);
  // canFoundGuild fails on existing — we nulled it on fake; still need age
  if (cage(s) < 18) return { ok: false, msg: 'Too young.' };
  if (realmId === 'glassmarket' && (s.stats.fame || 0) < 10 && (s.skills.bartering || 0) < 25)
    return { ok: false, msg: 'Glassmarket needs renown 10+ or Bartering 25.' };
  if (realmId === 'spireward' && (s.stats.fame || 0) < 25 && (s.skills.etiquette || 0) < 30)
    return { ok: false, msg: 'Spireward needs renown 25+ or Etiquette 30.' };
  if (realmId === 'emberlight' && (s.stats.fame || 0) < 40)
    return { ok: false, msg: 'Emberlight needs renown 40+.' };
  const cost = Math.round(costFull * 0.6);
  if (s.gold < cost) return { ok: false, msg: `Relocate costs ${cost} gold.` };
  if (!spendAct(s, 'act')) return { ok: false, msg: 'No activity left this year.' };
  s.gold -= cost;
  s.guild.realmId = realmId;
  if (s.guild.roster.length) {
    const drop = s.guild.roster.pop();
    const msg = `Hall relocated to ${regionById(realmId)?.name || realmId} (${cost} gold). ${drop.name} left rather than move.`;
    log(s, msg, 'guild'); return { ok: true, msg };
  }
  const msg = `Hall relocated to ${regionById(realmId)?.name || realmId} (${cost} gold).`;
  log(s, msg, 'guild'); return { ok: true, msg };
}

export function guildYear(s, yrs = 1) {
  ensureTeamGuild(s);
  resetTeamYearFlags(s);
  if (!s.guild || !s.guild.roster.length) return;
  const g = s.guild;
  const feeEach = GUILD_FEE[g.feeTier] || 20;
  const jobsEach = GUILD_JOBS_PER[g.feeTier] || 1;
  // pay fees
  let paidMembers = [];
  for (const m of g.roster) {
    if ((m.injuredUntil || 0) > cage(s)) continue;
    let need = feeEach * yrs;
    let fromCoffer = Math.min(g.coffer, need);
    g.coffer -= fromCoffer; need -= fromCoffer;
    if (need > 0) {
      if (s.gold >= need) { s.gold -= need; need = 0; }
    }
    if (need > 0) {
      // unpaid
      if (chance(s, 0.25)) {
        m._quit = true;
        log(s, `${m.name} left the hall after unpaid fees.`, 'guild');
      }
      continue;
    }
    m.wagePaid = (m.wagePaid || 0) + feeEach;
    paidMembers.push(m);
  }
  g.roster = g.roster.filter((m) => !m._quit);
  if (!paidMembers.length) {
    log(s, 'No guild jobs this year — fees unpaid or roster empty.', 'guild');
    return;
  }
  if (g.seized) { log(s, 'A rival holds the hall — no jobs this year.', 'guild'); return; }
  const rosterSize = paidMembers.length;
  let boardCap = 3 + g.feeTier * 2 + Math.floor((g.renown || 0) / 20);
  if (crossActive(s) && (s.team.renown || 0) >= 75) boardCap += 1; // +1 soft-cap once/year (always-on while famed)
  const memberCap = rosterSize * jobsEach;
  let jobsThisYear = Math.min(memberCap, boardCap);
  const mult = GUILD_REALM_MULT[g.realmId] || 1;
  const teamSuc = teamJobSuccessBonus(s);
  let success = 0, fail = 0, gained = 0;
  // assign power-weighted
  const bag = [...paidMembers];
  for (let j = 0; j < jobsThisYear; j++) {
    if (!bag.length) break;
    bag.sort((a, b) => b.power - a.power);
    const m = bag[j % bag.length];
    let chanceOk = clamp(0.45 + m.power / 200 + g.feeTier * 0.05 + (g.renown || 0) / 200 + teamSuc, 0.25, 0.92);
    let base = rint(s, 15, 60) * (1 + (g.renown || 0) / 100) * mult;
    if (g.realmId === 'thornreed') { chanceOk -= 0.05; base *= 1.15; }
    if (g.realmId === 'emberlight') base *= 1.25;
    if (chance(s, chanceOk)) {
      const pay = Math.floor(base);
      g.coffer += pay; gained += pay; success++;
      g.jobsDone = (g.jobsDone || 0) + 1;
      g.renown = softRenown(g.renown, rint(s, 1, 4));
      m.jobsOk = (m.jobsOk || 0) + 1;
      if (m.jobsOk % 5 === 0) m.power = Math.min(95, m.power + 1);
    } else {
      fail++; g.jobsFailed = (g.jobsFailed || 0) + 1;
      g.renown = Math.max(0, (g.renown || 0) - 1);
      if (chance(s, 0.1)) {
        m.injuredUntil = cage(s) + 1;
        log(s, `${m.name} was hurt on a job — out for a year.`, 'guild');
      }
    }
  }
  const feePaid = paidMembers.length * feeEach * yrs;
  const net = gained - feePaid;
  let msg = `Guild year: ${success} jobs done, ${fail} failed. Coffer +${gained} gold (fees ${feePaid}). Renown ${Math.round(g.renown)}.`;
  if (net < 0) msg += ' Fees outpaced the board — lean year.';
  if (success > 0) s.flags.ui_renown_delta = Math.max(1, Math.min(4, success));
  syncOwnershipStage(g);
  if (success > 0) tryTwinBanners(s, 'after guild jobs');
  // Elf/dwarf long-life beat (Gary v1): rare journal when elder owners keep both banners
  if (success > 0 && (s.race === 'elf' || s.race === 'dwarf') && cage(s) >= 60 && crossActive(s) && chance(s, 0.12)) {
    log(s, s.race === 'elf'
      ? 'Another decade under the same banners — the hall still smells of ink and wet rope.'
      : 'Stone remembers: the lists and the job board have shared my long years.', 'cross');
  }
  log(s, msg, 'guild');
}


// ---- seize / reclaim / handoff (Gary locks) ----
export function seizeTeam(s, rivalName) {
  ensureTeamGuild(s);
  if (!s.team || s.team.seized) return { ok: false, msg: 'No active team to seize.' };
  s.team.seized = true; s.team.rivalId = rivalName || 'Rival captain';
  s.team.reclaimVia = null;
  const msg = `A rival captain seized ${s.team.name}. Reclaim by buy-back or a challenge meet.`;
  log(s, msg, 'team'); return { ok: true, msg };
}
export function seizeGuild(s, rivalName) {
  ensureTeamGuild(s);
  if (!s.guild || s.guild.seized) return { ok: false, msg: 'No active hall to seize.' };
  s.guild.seized = true; s.guild.rivalId = rivalName || 'Rival hall-master';
  s.guild.reclaimVia = null;
  const msg = `A rival hall-master seized the guild hall. Reclaim by buy-back or a challenge meet.`;
  log(s, msg, 'guild'); return { ok: true, msg };
}
export function reclaimBuyback(s, kind) {
  ensureTeamGuild(s);
  const own = kind === 'guild' ? s.guild : s.team;
  if (!own?.seized) return { ok: false, msg: 'Nothing seized to buy back.' };
  const cost = kind === 'guild' ? Math.round((GUILD_REALM_COST[own.realmId] || 150) * 0.75) : 60;
  if (s.gold < cost) return { ok: false, msg: `Buy-back costs ${cost} gold.` };
  if (!spendAct(s, 'act')) return { ok: false, msg: 'No activity left this year.' };
  s.gold -= cost; own.seized = false; own.reclaimVia = 'buyback'; own.rivalId = null;
  const msg = `I bought back the ${kind === 'guild' ? 'hall' : 'team'} for ${cost} gold.`;
  log(s, msg, kind); return { ok: true, msg };
}
export function reclaimChallenge(s, kind) {
  ensureTeamGuild(s);
  const own = kind === 'guild' ? s.guild : s.team;
  if (!own?.seized) return { ok: false, msg: 'Nothing seized to challenge.' };
  if (!spendAct(s, 'act')) return { ok: false, msg: 'No activity left this year.' };
  if (s.gold < 15) { s.budget.act++; return { ok: false, msg: 'Challenge filing costs 15 gold.' }; }
  s.gold -= 15;
  const power = kind === 'team' ? teamPower(s, s.region) : 20 + (own.renown || 0) / 2 + (own.roster || []).reduce((a, m) => a + (m.power || 0), 0) / Math.max(1, (own.roster || []).length);
  const rival = 28 + rint(s, 0, 20);
  const win = power + rint(s, -4, 8) >= rival;
  if (!win) {
    const msg = `The challenge meet went against me — the rival still holds the ${kind === 'guild' ? 'hall' : 'team'}.`;
    log(s, msg, kind); return { ok: false, msg };
  }
  own.seized = false; own.reclaimVia = 'challenge'; own.rivalId = null;
  own.renown = softRenown(own.renown || 0, 3);
  syncOwnershipStage(own);
  const msg = `I won the challenge meet and reclaimed the ${kind === 'guild' ? 'hall' : 'team'}.`;
  log(s, msg, kind); return { ok: true, msg };
}
/** Handoff priority: heir → apprentice → captain (Gary). */
export function handoffCandidates(s, kind) {
  ensureTeamGuild(s);
  const out = [];
  const child = living(s, 'child')[0];
  if (child) out.push({ id: child.id, name: child.first, role: 'heir' });
  const own = kind === 'guild' ? s.guild : s.team;
  const apprentice = (own?.roster || []).find((m) => !m.isPlayer);
  if (apprentice) out.push({ id: apprentice.id, name: apprentice.name || apprentice.first, role: 'apprentice' });
  const captain = (own?.roster || []).find((m) => m.isPlayer) || (own?.roster || [])[0];
  if (captain && !out.some((x) => x.id === captain.id)) out.push({ id: captain.id, name: captain.name || s.first, role: 'captain' });
  return out;
}
export function handoffOwnership(s, kind, candidateId) {
  ensureTeamGuild(s);
  const own = kind === 'guild' ? s.guild : s.team;
  if (!own || own.seized) return { ok: false, msg: 'Nothing to hand off.' };
  const cands = handoffCandidates(s, kind);
  const pickC = cands.find((c) => c.id === candidateId) || cands[0];
  if (!pickC) return { ok: false, msg: 'No heir, apprentice, or captain to name.' };
  own.heirId = pickC.id; own.stage = 'legacy';
  own.handoffCount = (own.handoffCount || 0) + 1;
  const snap = { ...own, handedTo: pickC };
  (s.flags.team_history ||= []).push({ kind, legacy: snap, y: cage(s) });
  if (kind === 'team') s.team = null; else s.guild = null;
  const msg = `I named ${pickC.name} (${pickC.role}) successor — the ${kind === 'guild' ? 'hall' : 'team'} passes into legacy.`;
  log(s, msg, kind); return { ok: true, msg };
}

export function teamGuildVisitHook(s, loc) {
  // returns optional follow-up action hint; visitLocation already spent the act
  ensureTeamGuild(s);
  const kind = String(loc?.kind || '').toLowerCase();
  if (isMeetVenue(loc) && s.team) {
    s.flags.meet_venue_ready = loc.name || loc.id;
    return ` Lists are open at ${loc.name} — enter a realm meet from Adventure (10 gold + 1 act; visit already counted as scout).`;
  }
  if (/guild hall/.test(kind)) {
    if (!s.guild && cage(s) >= 18) return ` A hall slot could be yours — open a guild hall from Work (Belongings).`;
    if (s.guild && s.guild.realmId === s.region) return ` Your hall keeps its board here.`;
  }
  return '';
}


// ============================================================
// Pack systems (Lifeline shapes → Boundwake fantasy). Data in data_fantasy/.
// ============================================================

function ensureBags(s) {
  if (!s.ailments) s.ailments = [];
  if (!s.passions) s.passions = { active: [], mastered: [] };
  if (!s.workshops) s.workshops = [];
  if (!s.notices) s.notices = { followers: 0, lastBoard: null, posts: 0 };
  if (!s.record) s.record = { sentences: 0, priors: 0 };
  if (!s.clubs) s.clubs = [];
  if (!s.patronage) s.patronage = [];
  if (!s.tally) s.tally = { events: 0 };
  if (s.team === undefined) s.team = null;
  if (s.guild === undefined) s.guild = null;
  if (!s.flags) s.flags = {};
  if (!s.flags.team_history) s.flags.team_history = [];
  if (!s.flags.guild_rehire_block) s.flags.guild_rehire_block = {};
}

// ---- ailments (diseases.json → ailments.json) ----
export const ailmentDef = (id) => (D.ailments || []).find((d) => d.id === id);
export const hasAilment = (s, id) => (s.ailments || []).some((d) => d.id === id);
export function treatCost(s, def) { return Math.round((def.cost || 0) * (s.job ? 0.5 : 1)); }
export function visitHealer(s) {
  ensureBags(s);
  if (cage(s) < 1) return { ok: false, msg: 'Too young.' };
  if (!spendAct(s, 'act')) return { ok: false, msg: 'No activity left this year.' };
  const fee = 12;
  if (s.gold < fee) { s.budget.act++; return { ok: false, msg: 'Not enough gold for a healer.' }; }
  s.gold -= fee; s.stats.health = clamp(s.stats.health + 3, 0, 100);
  const lines = [];
  for (const d of s.ailments) {
    const def = ailmentDef(d.id); if (!def) continue;
    if (!d.dx) { d.dx = true; lines.push(`Diagnosed: ${def.name}.`); }
  }
  for (const d of [...s.ailments]) {
    const def = ailmentDef(d.id); if (!def || !d.dx || d.treated) continue;
    const cost = treatCost(s, def); if (cost <= 0 || s.gold < cost) continue;
    s.gold -= cost;
    if (chance(s, def.cure || 0.5)) { s.ailments.splice(s.ailments.indexOf(d), 1); s.stats.health = clamp(s.stats.health + 4, 0, 100); lines.push(`Cured of ${def.name}.`); }
    else { d.treated = true; lines.push(`Began treatment for ${def.name}.`); }
  }
  const msg = lines.length ? `I visited a healer. ${lines.join(' ')}` : 'I visited a healer, who told me I was fine and charged me for it.';
  log(s, msg, 'health'); return { ok: true, msg };
}
function ailmentsYear(s, yrs) {
  ensureBags(s); if (!D.ailments) return;
  for (const d of [...s.ailments]) {
    const def = ailmentDef(d.id); if (!def) { s.ailments.splice(s.ailments.indexOf(d), 1); continue; }
    if (!d.dx && chance(s, 0.45 * yrs)) { d.dx = true; log(s, `I was diagnosed with ${def.name.toLowerCase()}.`, 'health'); }
    const y = d.treated && def.managed != null ? def.managed : def.yearly; if (y) s.stats.health = clamp(s.stats.health + y * yrs, 0, 100);
    const dp = d.treated ? def.tdeath : def.death;
    if (dp && chance(s, 1 - Math.pow(1 - dp, yrs))) { die(s, 'illness'); return; }
    if (def.rem && chance(s, 1 - Math.pow(1 - def.rem, yrs))) { s.ailments.splice(s.ailments.indexOf(d), 1); log(s, `My ${def.name.toLowerCase()} faded on its own.`, 'health'); }
  }
  if (!s.alive) return;
  if (!chance(s, 0.085 * yrs * (1 + cage(s) / 70))) return;
  const a = cage(s);
  const pool = D.ailments.filter((d) => a >= d.ages[0] && a <= d.ages[1] && !hasAilment(s, d.id) && !(d.sev === 'instant_death' && a < 45));
  const def = wpick(s, pool, (d) => {
    let w = d.w || 1;
    if (d.stress && s.stats.stress > 60) w *= 2.5;
    if (d.cat === 'spirit' && s.stats.stress > 60) w *= 2;
    if (d.cat === 'arcane' && s.flags.mana_awakened) w *= 1.4;
    if (s.stats.health < 50) w *= 1 + (50 - s.stats.health) / 60;
    return w;
  });
  if (!def) return;
  if (def.instant || def.sev === 'instant_death') { die(s, 'illness'); return; }
  const dx = def.sev === 'minor' || chance(s, 0.6);
  s.ailments.push({ id: def.id, since: s.age, dx, treated: false });
  s.stats.health = clamp(s.stats.health + (def.onset || 0), 0, 100);
  s.tally.ailments = (s.tally.ailments || 0) + 1;
  log(s, dx ? `I ${def.verb} ${def.name.toLowerCase()}.` : 'I felt strangely unwell this year, and I did not know why.', 'health');
}

// ---- law (crimes → realm law) ----
export const crimeDef = (id) => (D.law?.crimes || []).find((c) => c.id === id);
export const tierDef = (id) => (D.law?.tiers || []).find((t) => t.id === id);
export function lawAvailable(s) {
  ensureBags(s); if (s.prison || !D.law) return [];
  const a = cage(s);
  return D.law.crimes.filter((c) => c.menu && a >= c.minAge && (!c.if || ((!c.if.job || s.job) && (!c.if.minFame || s.stats.fame >= c.if.minFame))));
}
function catchChance(s, c) {
  const rules = D.law.rules, rec = s.record.sentences > 0 ? 1.15 : 1;
  return clamp(c.catch * rec * (1 - (s.stats.smarts - 50) * (rules.catchSmartsMod || 0.004)), 0.05, 0.95);
}
export function commitCrime(s, id) {
  ensureBags(s);
  const c = crimeDef(id); if (!c || s.prison || cage(s) < c.minAge) return { ok: false, msg: 'Not possible.' };
  if (!spendAct(s, 'act')) return { ok: false, msg: 'No activity left this year.' };
  s.tally.crimes = (s.tally.crimes || 0) + 1;
  if (chance(s, catchChance(s, c))) return arrest(s, id);
  const loot = c.loot?.[1] != null ? Math.round(c.loot[0] + (c.loot[1] - c.loot[0]) * rnd(s)) : 0;
  if (loot) s.gold += loot;
  s.stats.karma = clamp(s.stats.karma + (c.karma || 0), 0, 100);
  s.stats.happiness = clamp(s.stats.happiness + 3, 0, 100);
  s.flags.criminal = 1;
  const msg = c.ok + (loot ? ` I made ${loot} gold.` : '');
  log(s, msg, 'crime'); return { ok: true, msg, loot };
}
function arrest(s, id) {
  const c = crimeDef(id), rules = D.law.rules, priors = s.record.sentences;
  let years = c.sentence[0] + (c.sentence[1] - c.sentence[0]) * rnd(s);
  years *= Math.pow(rules.repeatMultiplier, Math.min(priors, rules.repeatCap));
  years = Math.min(rules.lifeSentence, Math.max(0.25, Math.round(years * 4) / 4));
  if (cage(s) < 18) years = Math.min(years, rules.juvieMaxYears);
  let tier = 'stockade';
  if (cage(s) < 18) tier = 'youth_hold';
  else if (c.severity >= 5 || years > 10) tier = 'deepkeep';
  else if (years > (tierDef('stockade')?.maxSentence || 2)) tier = 'stonehold';
  s.prison = { crime: id, total: years, left: years, tier, served: 0, conduct: 0, appealed: false };
  s.record.sentences++; s.flags.criminal = 1; s.flags.in_prison = 1;
  if (s.job) quitJob(s);
  s.pending = [];
  s.stats.happiness = clamp(s.stats.happiness - 14, 0, 100);
  s.stats.karma = clamp(s.stats.karma + Math.min(0, (c.karma || 0) / 2), 0, 100);
  const yrs = years >= 99 ? 'life' : years < 1 ? `${Math.round(years * 12)} months` : `${years} years`;
  const msg = `${c.caught} I was sentenced to ${yrs} in ${tierDef(tier)?.name || tier}.`;
  log(s, msg, 'crime'); return { ok: false, msg, caught: true };
}
function prisonYear(s, yrs) {
  const pr = s.prison; if (!pr) { delete s.flags.in_prison; return; }
  pr.left -= yrs; pr.served += yrs;
  const t = tierDef(pr.tier);
  s.stats.stress = clamp(s.stats.stress + (t?.stress || 4) * yrs * 0.4, 0, 100);
  s.stats.happiness = clamp(s.stats.happiness - 1 * yrs, 0, 100);
  s.stats.health = clamp(s.stats.health - (t?.healthLoss || 1) * yrs, 0, 100);
  if (pr.left <= 0.001 && pr.total < (D.law?.rules?.lifeSentence || 99)) {
    s.prison = null; delete s.flags.in_prison; s.record.priors++;
    log(s, `I was released after ${Math.round(pr.served * 10) / 10} years. The sky looked larger than I remembered.`, 'crime');
  }
}

// ---- passions ----
export function passionDef(id) { return (D.passions?.passions || []).find((p) => p.id === id); }
export function passionSlots(s) {
  ensureBags(s);
  const base = D.passions?.slots || 2;
  const mastered = s.passions.mastered.length;
  return mastered >= 2 ? Math.min(4, base + mastered) : base;
}
export function passionList(s) {
  ensureBags(s);
  const cfg = D.passions; if (!cfg) return { active: [], available: [], free: 0 };
  const held = new Set([...s.passions.active.map((p) => p.id), ...s.passions.mastered.map((p) => p.id)]);
  return {
    active: s.passions.active.map((p) => ({ ...p, def: passionDef(p.id) })),
    mastered: s.passions.mastered,
    available: cfg.passions.filter((p) => !held.has(p.id) && cage(s) >= (cfg.minAge || 6)),
    free: Math.max(0, passionSlots(s) - s.passions.active.length),
  };
}
export function adoptPassion(s, id) {
  ensureBags(s);
  if (cage(s) < (D.passions?.minAge || 6)) return { ok: false, msg: 'Too young for a pastime.' };
  const list = passionList(s); if (!list.free) return { ok: false, msg: 'No free pastime slots.' };
  if (!list.available.some((p) => p.id === id)) return { ok: false, msg: 'Already held or unknown.' };
  s.passions.active.push({ id, meter: 0 }); const d = passionDef(id);
  const msg = `I took up ${d.name}.`; log(s, msg, 'passion'); return { ok: true, msg };
}
export function practicePassion(s, id) {
  ensureBags(s);
  const p = s.passions.active.find((x) => x.id === id); if (!p) return { ok: false, msg: 'Not an active pastime.' };
  if (!spendAct(s, 'act')) return { ok: false, msg: 'No activity left this year.' };
  const d = passionDef(id), gain = D.passions?.practiceGain || 9;
  p.meter = Math.min(100, p.meter + gain);
  for (const [sk, w] of Object.entries(d.skills || {})) useSkill(s, sk, 1.5 * w);
  if (d.perks) applyFx(s, Object.fromEntries(Object.entries(d.perks).map(([k, v]) => [k === 'happy' ? 'happiness' : k, v])));
  maybeMasterPassion(s, p);
  const msg = `I practiced ${d.name} (meter ${Math.floor(p.meter)}).`; log(s, msg, 'passion'); return { ok: true, msg };
}
function gainPassionMeter(s, amt) {
  ensureBags(s);
  const p = s.passions.active[0]; if (!p) return;
  p.meter = Math.min(100, p.meter + amt); maybeMasterPassion(s, p);
}
function maybeMasterPassion(s, p) {
  if (p.meter < (D.passions?.benchmark || 100)) return;
  const d = passionDef(p.id);
  s.passions.active = s.passions.active.filter((x) => x.id !== p.id);
  s.passions.mastered.push({ id: p.id, at: s.age });
  s.stats.fame = clamp(s.stats.fame + 3, 0, 100);
  log(s, `I mastered ${d.name} and became a ${d.masteryTitle}.`, 'passion');
}
function passionsYear(s, yrs) {
  ensureBags(s); if (!D.passions) return;
  const g = (D.passions.yearGain || 4) * yrs;
  for (const p of s.passions.active) { p.meter = Math.min(100, p.meter + g); maybeMasterPassion(s, p); }
}

// ---- workshops ----
export function workshopTypes(s) {
  if (!D.workshops?.types) return [];
  return Object.entries(D.workshops.types).map(([id, t]) => ({ id, ...t, ok: cage(s) >= t.minAge && s.gold >= t.fee && !(s.workshops || []).some((w) => w.type === id) }));
}
export function buyWorkshop(s, typeId) {
  ensureBags(s);
  const t = D.workshops?.types?.[typeId]; if (!t) return { ok: false, msg: 'Unknown workshop.' };
  if (cage(s) < t.minAge) return { ok: false, msg: 'Too young.' };
  if (s.gold < t.fee) return { ok: false, msg: 'Not enough gold.' };
  if (s.workshops.some((w) => w.type === typeId)) return { ok: false, msg: 'You already run one.' };
  s.gold -= t.fee;
  s.workshops.push({ id: 'w' + (s.wid = (s.wid || 0) + 1), type: typeId, years: 0, renown: 10, stock: 1 });
  s.flags.has_workshop = 1;
  const msg = `I opened a ${t.name} (${t.fee} gold).`; log(s, msg, 'biz'); return { ok: true, msg };
}
function workshopsYear(s, yrs) {
  ensureBags(s); if (!s.workshops.length || !D.workshops) return;
  for (const w of s.workshops) {
    const t = D.workshops.types[w.type]; if (!t) continue;
    w.years += yrs;
    const m = workshopMods(w, t);
    const demand = t.baseDemand * m.demand * m.cap ** 0.5 * (0.7 + w.renown / 100) * yrs / 12; // scale yearly
    const revenue = Math.round(demand * t.ticket * m.ticket * (1 - t.cogs));
    const rent = Math.round(t.rent * yrs / 12) + Math.round(m.wages * yrs);
    const profit = revenue - rent;
    s.gold = Math.max(0, s.gold + profit);
    w.renown = clamp(w.renown + rint(s, -2, 3), 0, 100);
    if (profit > 0) log(s, `My ${t.name} cleared ${profit} gold this year.`, 'biz');
    else if (profit < 0) log(s, `My ${t.name} lost ${-profit} gold to rent and spoilage.`, 'biz');
  }
}

// ---- notices (online/social → boards) ----
export function noticeBoards(s) {
  return (D.notices?.boards || []).filter((b) => cage(s) >= b.minAge);
}
export function postNotice(s, boardId, postId) {
  ensureBags(s);
  if (cage(s) < (D.notices?.minAge || 10)) return { ok: false, msg: 'Too young for the boards.' };
  if (!spendAct(s, 'act')) return { ok: false, msg: 'No activity left this year.' };
  const board = (D.notices.boards || []).find((b) => b.id === boardId);
  const post = (D.notices.posts || []).find((p) => p.id === postId);
  if (!board || !post) { s.budget.act++; return { ok: false, msg: 'Unknown notice.' }; }
  const gain = Math.round(post.base * board.growth * (0.7 + rnd(s)));
  s.notices.followers += gain; s.notices.posts++; s.notices.lastBoard = boardId;
  s.stats.fame = clamp(s.stats.fame + Math.round(gain / 8), 0, 100);
  if (post.stat === 'happiness') s.stats.happiness = clamp(s.stats.happiness + 2, 0, 100);
  if (post.stat === 'smarts') s.stats.smarts = clamp(s.stats.smarts + 1, 0, 100);
  if (post.stat === 'karma') s.stats.karma = clamp(s.stats.karma + 1, 0, 100);
  if (chance(s, (post.risk || 0) * (board.risk || 1) * 0.15)) {
    s.stats.fame = clamp(s.stats.fame - 2, 0, 100); s.stats.stress = clamp(s.stats.stress + 3, 0, 100);
    log(s, `My notice on ${board.name} drew the wrong kind of attention.`, 'notice');
  }
  // rare patronage
  const patron = pick(s, D.notices.patrons || []);
  if (patron && s.notices.followers > 30 && chance(s, 0.12) && cage(s) >= patron.minAge) {
    const pay = rint(s, patron.pay[0], patron.pay[1]); s.gold += pay;
    log(s, `${patron.name} slipped me ${pay} gold after my notice.`, 'notice');
  }
  if (s.team && chance(s, 0.18)) {
    s.flags.notice_team_meet = 1;
    log(s, 'A notice invited my team to a realm meet — answer it on Adventure.', 'team');
  }
  const msg = `I posted "${post.name}" on ${board.name}. (+${gain} readers)`; log(s, msg, 'notice'); return { ok: true, msg };
}
function noticesYear(s, yrs) {
  ensureBags(s);
  if (s.notices.followers > 0) s.notices.followers = Math.max(0, Math.floor(s.notices.followers * (1 - 0.08 * yrs)));
}

// ---- court ----
export function courtOpenings(s) {
  if (!D.court?.slots) return [];
  const tier = s.court?.tier || 0;
  return D.court.slots.filter((x) => cage(s) >= x.minAge && tier >= x.needTier && (!s.court || s.court.seat !== x.id));
}
export function fileForOffice(s, seatId) {
  ensureBags(s);
  const seat = (D.court?.slots || []).find((x) => x.id === seatId); if (!seat) return { ok: false, msg: 'Unknown seat.' };
  if (cage(s) < seat.minAge) return { ok: false, msg: 'Too young.' };
  if ((s.court?.tier || 0) < seat.needTier) return { ok: false, msg: 'Need a higher tier first.' };
  if (s.gold < seat.filing) return { ok: false, msg: 'Cannot afford filing.' };
  if (!spendAct(s, 'act')) return { ok: false, msg: 'No activity left this year.' };
  s.gold -= seat.filing;
  const odds = clamp(0.25 + s.stats.fame / 200 + s.skills.etiquette / 200 + s.skills.charm / 250, 0.1, 0.85);
  if (chance(s, odds)) {
    s.court = { seat: seat.id, tier: seat.tier, termLeft: seat.term, name: seat.name };
    s.stats.fame = clamp(s.stats.fame + 4 + seat.tier, 0, 100);
    const msg = `I won the seat of ${seat.name}.`; log(s, msg, 'court'); return { ok: true, msg };
  }
  const msg = `I filed for ${seat.name} and lost the vote.`; log(s, msg, 'court'); return { ok: false, msg };
}
function courtYear(s, yrs) {
  if (!s.court) return;
  const seat = (D.court?.slots || []).find((x) => x.id === s.court.seat);
  if (seat) s.gold += Math.round((seat.pay || 0) * yrs / 4); // pay scaled down vs LL dollars
  s.court.termLeft -= yrs;
  if (s.court.termLeft <= 0) {
    log(s, `My term as ${s.court.name} ended.`, 'court');
    s.court = { tier: s.court.tier, seat: null, name: null, termLeft: 0 }; // keep tier progress
  }
}

// ---- mentors ----
export function mentorPaths() { return Object.entries(D.mentors?.paths || {}).map(([id, p]) => ({ id, ...p })); }
export function enrollMentor(s, pathId) {
  ensureBags(s);
  const path = D.mentors?.paths?.[pathId]; if (!path) return { ok: false, msg: 'Unknown path.' };
  if (cage(s) < 10) return { ok: false, msg: 'Too young.' };
  if (!spendAct(s, 'act')) return { ok: false, msg: 'No activity left this year.' };
  s.mentor = { path: pathId, role: 'drill', years: 0, style: pick(s, D.mentors.styles).id };
  s.flags.has_mentor = 1;
  const hall = pick(s, D.mentors.halls || ['the yard']);
  const msg = `I enrolled in the ${path.name} under a mentor at ${hall}.`; log(s, msg, 'mentor'); return { ok: true, msg };
}
export function mentorDrill(s) {
  if (!s.mentor) return { ok: false, msg: 'No mentor.' };
  if (!spendAct(s, 'act')) return { ok: false, msg: 'No activity left this year.' };
  const path = D.mentors.paths[s.mentor.path];
  for (const sk of path.skills) useSkill(s, sk, 2.2);
  s.mentor.years++; s.stats.stress = clamp(s.stats.stress + 3, 0, 100);
  if (s.mentor.years >= 3 && s.mentor.role === 'drill') s.mentor.role = 'second';
  if (s.mentor.years >= 8 && s.mentor.role === 'second') s.mentor.role = 'master';
  const msg = `Mentor drill (${path.name}).`; log(s, msg, 'mentor'); return { ok: true, msg };
}

// ---- patronage clubs ----
export function clubList(s) {
  return (D.patronage?.clubs || []).filter((c) => { const a = cage(s); return a >= c.minAge && a <= c.maxAge; });
}
export function joinClub(s, id) {
  ensureBags(s);
  const c = (D.patronage?.clubs || []).find((x) => x.id === id); if (!c) return { ok: false, msg: 'Unknown circle.' };
  if (s.clubs.includes(id)) return { ok: false, msg: 'Already joined.' };
  if (s.clubs.length >= (D.patronage?.maxClubs || 3)) return { ok: false, msg: 'Too many circles.' };
  if (cage(s) < c.minAge || cage(s) > c.maxAge) return { ok: false, msg: 'Wrong age for that circle.' };
  s.clubs.push(id);
  const msg = `I joined ${c.name}.`; log(s, msg, 'school'); return { ok: true, msg };
}

// ---- world activities ----
export function activityCategories(s) { return D.worldActivities?.categories || []; }
export function doActivity(s, actId, choiceIdx = 0) {
  ensureBags(s);
  let found = null, cat = null;
  for (const c of (D.worldActivities?.categories || [])) {
    const a = c.activities.find((x) => x.id === actId); if (a) { found = a; cat = c; break; }
  }
  if (!found) return { ok: false, msg: 'Unknown activity.' };
  if (cage(s) < found.minAge) return { ok: false, msg: 'Too young.' };
  if (!spendAct(s, 'act')) return { ok: false, msg: 'No activity left this year.' };
  const ch = found.choices[choiceIdx] || found.choices[0];
  if ((ch.cost || 0) > s.gold) { s.budget.act++; return { ok: false, msg: 'Not enough gold.' }; }
  if (ch.cost) s.gold -= ch.cost;
  const outcome = wpick(s, ch.outcomes || [{ w: 1, text: 'It passed.', fx: {} }], (o) => o.w || 1);
  applyFx(s, outcome.fx || {});
  // healer activity also nudges diagnosis
  if (actId === 'healer') {
    for (const d of s.ailments) if (!d.dx) { d.dx = true; }
  }
  const msg = outcome.text || ch.label; log(s, msg, 'activity'); return { ok: true, msg };
}


// ---- gear shop (Game Dev data_fantasy/gear.json; docs/GEAR_SHOP.md) ----
export function gearItems() { return Array.isArray(D.gear?.items) ? D.gear.items : []; }
export const gearDef = (id) => gearItems().find((g) => g.id === id);
function ensureGear(s) { if (!s.gear) s.gear = { owned: [], equipped: {} }; if (!s.gear.equipped) s.gear.equipped = {}; if (s.gear.home === undefined) s.gear.home = null; return s.gear; }
const hasFlag = (g, f) => (g?.flags || []).includes(f);
const isEquipped = (gr, g) => g.slot === 'home' ? gr.home === g.id : gr.equipped[g.slot] === g.id;
export function gearBonus(s, sk) {
  if (!s.gear?.equipped) return 0; let b = 0;
  for (const id of [...Object.values(s.gear.equipped), s.gear.home]) { const g = id && gearDef(id); if (g?.bonus?.[sk]) b += g.bonus[sk]; }
  return b;
}
export function gearLockReason(s, g) {
  if (cage(s) < (g.minAge || 0)) return `Age ${g.minAge}+`;
  if ((s.stats.fame || 0) < (g.minRenown || 0)) return `Renown ${g.minRenown}+`;
  if (g.realm && g.realm !== 'hearthfold' && !(s.regionsFound || []).includes(g.realm)) return 'Realm not found';
  if (s.prison) return 'Imprisoned';
  return null;
}
export function gearShop(s) {
  const gr = ensureGear(s);
  return gearItems().map((g) => ({ ...g, owned: gr.owned.includes(g.id), equipped: isEquipped(gr, g), rent: hasFlag(g, 'rent'), lock: gearLockReason(s, g) }));
}
export function buyGear(s, id) {
  const g = gearDef(id); if (!g) return { ok: false, msg: 'Unknown item.' };
  const gr = ensureGear(s); if (gr.owned.includes(id)) return { ok: false, msg: 'Already owned.' };
  const lr = gearLockReason(s, g); if (lr) return { ok: false, msg: lr };
  if (s.gold < g.price) return { ok: false, msg: 'Not enough gold.' };
  s.gold -= g.price; gr.owned.push(id);
  if (g.slot === 'home') {
    // one active home: renting/buying a new one moves you in; old rent is abandoned
    const old = gr.home && gearDef(gr.home); if (old && hasFlag(old, 'rent')) gr.owned = gr.owned.filter((x) => x !== old.id);
    gr.home = id; if (hasFlag(g, 'rent')) gr.rentYearsLeft = 1; else delete gr.rentYearsLeft;
    if (hasFlag(g, 'hall')) s.flags.owns_hall = 1;
    s.flags.has_home = 1;
    const msg = hasFlag(g, 'rent') ? `I rented ${g.name} (${g.price} gold; renews yearly at half).` : `I bought ${g.name} (${g.price} gold) and moved in.`; log(s, msg, 'gear'); return { ok: true, msg };
  }
  if (!gr.equipped[g.slot]) gr.equipped[g.slot] = id;
  if (g.slot === 'mount') s.flags.has_mount = 1;
  const msg = `I bought a ${g.name} (${g.price} gold).`; log(s, msg, 'gear'); return { ok: true, msg };
}
export function equipGear(s, id) {
  const g = gearDef(id), gr = ensureGear(s); if (!g || !gr.owned.includes(id)) return { ok: false, msg: 'Not owned.' };
  if (g.slot === 'home') {
    if (gr.home === id) return { ok: false, msg: 'You already live here.' };
    const old = gr.home && gearDef(gr.home); if (old && hasFlag(old, 'rent')) gr.owned = gr.owned.filter((x) => x !== old.id);
    gr.home = id; delete gr.rentYearsLeft; return { ok: true, msg: `Moved into ${g.name}.` };
  }
  if (gr.equipped[g.slot] === id) { delete gr.equipped[g.slot]; return { ok: true, msg: `Unequipped ${g.name}.` }; }
  gr.equipped[g.slot] = id; return { ok: true, msg: `Equipped ${g.name}.` };
}
export function sellGear(s, id) {
  const g = gearDef(id), gr = ensureGear(s); if (!g || !gr.owned.includes(id)) return { ok: false, msg: 'Not owned.' };
  const pay = hasFlag(g, 'rent') ? 0 : Math.floor(g.price * (D.gear?.sellRate ?? 0.5));
  gr.owned = gr.owned.filter((x) => x !== id); if (gr.equipped[g.slot] === id) delete gr.equipped[g.slot];
  if (gr.home === id) { gr.home = null; delete gr.rentYearsLeft; delete s.flags.has_home; }
  if (hasFlag(g, 'hall')) delete s.flags.owns_hall;
  if (g.slot === 'mount' && !gr.equipped.mount) delete s.flags.has_mount;
  if (hasFlag(g, 'rent')) { log(s, `I gave up the room at ${g.name}.`, 'gear'); return { ok: true, msg: `Ended rent at ${g.name}.` }; }
  s.gold += pay; const msg = `Sold ${g.name} for ${pay} gold.`; log(s, msg, 'gear'); return { ok: true, msg };
}

export function gearYear(s, yrs) {
  const gr = s.gear; if (!gr?.home) return; const g = gearDef(gr.home); if (!hasFlag(g, 'rent')) return;
  const due = Math.ceil(g.price / 2) * yrs;
  if (s.prison) return; // rent held while away
  if (s.gold >= due) { s.gold -= due; log(s, `Paid ${due} gold rent on ${g.name}.`, 'gear'); }
  else { gr.owned = gr.owned.filter((x) => x !== g.id); gr.home = null; delete gr.rentYearsLeft; delete s.flags.has_home; log(s, `I could not pay rent and lost my room at ${g.name}.`, 'gear'); }
}

// ---- prison actions (law.json rules) ----
export function prisonActions(s) {
  if (!s.prison) return null; const R = D.law?.rules || {}, t = tierDef(s.prison.tier) || {};
  const escOk = s.prison.tier !== 'youth_hold' || true;
  return { behave: s.budget.act > 0, appeal: !s.prison.appealed && s.gold >= (R.appealCost || 80) && s.budget.act > 0, appealCost: R.appealCost || 80,
    escape: s.budget.act > 0 && escOk, escapeOdds: t.escape || 0.1, conduct: s.prison.conduct || 0 };
}
function release(s, why) { const pr = s.prison; s.prison = null; delete s.flags.in_prison; s.record.priors++; log(s, why, 'crime'); return pr; }
export function prisonBehave(s) {
  if (!s.prison) return { ok: false, msg: 'Not imprisoned.' };
  if (!spendAct(s, 'act')) return { ok: false, msg: 'No activity left this year.' };
  const pr = s.prison; pr.conduct = (pr.conduct || 0) + 1; s.stats.karma = clamp(s.stats.karma + 1, 0, 100); s.stats.stress = clamp(s.stats.stress - 3, 0, 100);
  const pf = D.law?.rules?.paroleFraction ?? 0.5;
  if (pr.total < (D.law?.rules?.lifeSentence || 99) && pr.served >= pr.total * pf && pr.conduct >= 2 && chance(s, 0.5)) {
    release(s, 'The warden granted parole for steady conduct.'); return { ok: true, msg: 'Paroled for good behavior!' };
  }
  const msg = 'I kept my head down and did my work. The guards noticed.'; log(s, msg, 'crime'); return { ok: true, msg };
}
export function prisonAppeal(s) {
  if (!s.prison) return { ok: false, msg: 'Not imprisoned.' };
  const R = D.law?.rules || {}, cost = R.appealCost || 80;
  if (s.prison.appealed) return { ok: false, msg: 'Appeal already heard.' };
  if (s.gold < cost) return { ok: false, msg: 'Not enough gold for an advocate.' };
  if (!spendAct(s, 'act')) return { ok: false, msg: 'No activity left this year.' };
  s.gold -= cost; s.prison.appealed = true;
  const p = clamp((R.appealChance || 0.25) + (s.skills.etiquette || 0) / 400 + (s.prison.conduct || 0) * 0.03, 0.05, 0.6);
  if (chance(s, p)) { release(s, 'My appeal was upheld. The magistrate struck the sentence.'); return { ok: true, msg: 'Appeal won — released!' }; }
  s.prison.left = Math.max(0.25, s.prison.left * 0.9);
  const msg = 'The appeal failed, though the magistrate trimmed a little time.'; log(s, msg, 'crime'); return { ok: false, msg };
}
export function prisonEscape(s) {
  if (!s.prison) return { ok: false, msg: 'Not imprisoned.' };
  if (!spendAct(s, 'act')) return { ok: false, msg: 'No activity left this year.' };
  const R = D.law?.rules || {}, t = tierDef(s.prison.tier) || {};
  const p = clamp((t.escape || 0.1) + ((s.skills.stealth || 0) + gearBonus(s, 'stealth')) / 500, 0.02, 0.5);
  if (chance(s, p)) { release(s, `I slipped out of ${t.name || 'the cell'} under a moonless sky.`); s.flags.fugitive = 1; s.stats.stress = clamp(s.stats.stress + 10, 0, 100); return { ok: true, msg: 'Escaped!' }; }
  s.prison.left += R.escapeAddYears || 2; s.prison.total += R.escapeAddYears || 2; s.prison.conduct = 0;
  s.stats.health = clamp(s.stats.health - 5, 0, 100);
  const msg = `Caught at the wall. +${R.escapeAddYears || 2} years.`; log(s, msg, 'crime'); return { ok: false, msg };
}

// ---- court campaign questions (court.json questions/platforms) ----
export function campaignQuestion(s) {
  const qs = D.court?.questions || []; if (!qs.length) return null;
  return qs[Math.floor(s.age * 7 + (s.court?.tier || 0)) % qs.length];
}
export function fileWithAnswer(s, seatId, qi) {
  const q = campaignQuestion(s), c = q?.choices?.[qi];
  const pre = s.stats.fame;
  if (c) { applyFx(s, c.fx || {}); log(s, `On the stump I answered: "${c.label}".`, 'court'); }
  const r = fileForOffice(s, seatId);
  if (c && r.ok === false && r.msg && /Too young|Need a higher|afford|No activity|Unknown/.test(r.msg)) s.stats.fame = pre;
  return r;
}

// ---- workshop staff + upgrades (workshops.json equip/staffRoles/upgrades) ----
export function workshopDetail(s, w) { const t = D.workshops?.types?.[w.type] || {}; return { t, staff: w.staff || {}, upgrades: w.upgrades || [] }; }
export function hireStaff(s, wid, roleId) {
  const w = (s.workshops || []).find((x) => x.id === wid); const t = w && D.workshops?.types?.[w.type]; if (!t) return { ok: false, msg: 'Unknown workshop.' };
  const r = (t.staffRoles || []).find((x) => x.id === roleId); if (!r) return { ok: false, msg: 'Unknown role.' };
  w.staff = w.staff || {}; if ((w.staff[roleId] || 0) >= (r.cap || 1)) return { ok: false, msg: 'Fully staffed.' };
  w.staff[roleId] = (w.staff[roleId] || 0) + 1; const msg = `Hired a ${r.name} (${r.wage} gold/yr).`; log(s, msg, 'biz'); return { ok: true, msg };
}
export function fireStaff(s, wid, roleId) {
  const w = (s.workshops || []).find((x) => x.id === wid); if (!w?.staff?.[roleId]) return { ok: false, msg: 'No one to let go.' };
  w.staff[roleId]--; return { ok: true, msg: 'Let one go.' };
}
export function buyUpgrade(s, wid, upId) {
  const w = (s.workshops || []).find((x) => x.id === wid); const t = w && D.workshops?.types?.[w.type]; if (!t) return { ok: false, msg: 'Unknown workshop.' };
  const u = (t.upgrades || []).find((x) => x.id === upId); if (!u) return { ok: false, msg: 'Unknown upgrade.' };
  w.upgrades = w.upgrades || []; if (w.upgrades.includes(upId)) return { ok: false, msg: 'Already built.' };
  if (s.gold < u.cost) return { ok: false, msg: 'Not enough gold.' };
  s.gold -= u.cost; w.upgrades.push(upId); const msg = `Added ${u.name} to my ${t.name}.`; log(s, msg, 'biz'); return { ok: true, msg };
}
function workshopMods(w, t) {
  let demand = 1, ticket = 1, cap = 1, wages = 0, staffN = 0;
  for (const id of w.upgrades || []) { const u = (t.upgrades || []).find((x) => x.id === id); if (!u) continue; demand *= u.demand || 1; ticket *= u.ticket || 1; cap *= u.cap || 1; }
  for (const [rid, n] of Object.entries(w.staff || {})) { const r = (t.staffRoles || []).find((x) => x.id === rid); if (r) { wages += r.wage * n; staffN += n; } }
  return { demand: demand * (1 + 0.12 * staffN), ticket, cap, wages };
}
