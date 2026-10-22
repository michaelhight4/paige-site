// Autopilot pack (premium pass `autopilot`, part of All Access): pick yearly routines that run automatically every time you age,
// and skip-ahead (pick a routine, choose N years, play them out with a per-year summary).
// Routines are thin wrappers over the SAME actions the player triggers by hand (adapter.quickAction / adapter.interact), so costs, effects,
// skill gains and once-per-year flags are identical. Nothing here has its own balance numbers.
// State lives in the save: s.auto = { on, routines:[ids], floor, last, skipRemaining }.
import { fmtMoney } from './fmt.js';
import { isEsports as isEs } from './franchise.js';
import { D } from './data.js';
import * as Premium from './premium.js';
import * as P from './people.js';
import * as Bk from './bankruptcy.js';
import * as Fame from './fame.js';
import { money } from './rng.js';

export const PASS = 'autopilot';
export const MAX_SKIP = 50;
export const DEFAULT_FLOOR = 5000;
export const unlocked = () => Premium.isUnlocked(PASS);
export const ensure = (s) => { if (!s.auto) s.auto = { on: false, routines: ['train', 'read', 'study', 'workharder', 'practice'], floor: DEFAULT_FLOOR, last: null, skipRemaining: 0 }; if (!s.auto.pages) s.auto.pages = {};
  if (!s.auto.spDef && unlocked()) { s.auto.spDef = 1; if (!s.auto.routines.includes('sponsors_all')) s.auto.routines.push('sponsors_all'); }
  if (!s.auto.brDef && unlocked()) { s.auto.brDef = 1; if (!s.auto.routines.includes('athlete_brand')) s.auto.routines.push('athlete_brand'); }
  if (!s.auto.spUpDef && unlocked()) { s.auto.spUpDef = 1; if (!s.auto.routines.includes('sponsor_upgrade')) s.auto.routines.push('sponsor_upgrade'); } // owning the pass turns sponsor searching on by default (untick it any time)
  if (!s.auto.mtDef && unlocked()) { s.auto.mtDef = 1; if (!s.auto.routines.includes('mt_train')) s.auto.routines.push('mt_train'); } // sport skill training on by default (school, college, pro)
  if (!s.auto.basicsDef && unlocked()) { s.auto.basicsDef = 1; for (const id of ['train', 'read', 'study', 'workharder', 'practice']) if (!s.auto.routines.includes(id)) s.auto.routines.push(id); } // the everyday yearly chips are on by default with the pass (untick any time)
  if (!s.auto.maxDef && unlocked()) { s.auto.maxDef = 1; for (const id of ['spend_all', 'social_max']) if (!s.auto.routines.includes(id)) s.auto.routines.push(id); } // 7c6: keep relationships and post quotas maxed by default (untick any time)
  return s.auto; };

// id, label, quick id (adapter.quickAction) or interaction (adapter.interact with a person picker)
// accordion sections in the Autopilot screen (id -> routine ids); anything unlisted falls under 'other'
export const SECTIONS = [
  { id: 'school', icon: '🎓', label: 'School', ids: ['study'] },
  { id: 'job', icon: '💼', label: 'Job', ids: ['workharder', 'job_nurture', 'job_promo'] },
  { id: 'business', icon: '🏢', label: 'Business', ids: ['train_employees', 'hire_all', 'prod_music', 'prod_film', 'prod_tv', 'prod_game', 'prod_back', 'racing_sponsor', 'racing_staff', 'racing_upgrade', 'brand_collection', 'brand_staff', 'brand_line', 'farm_contract', 'farm_staff', 'farm_sell', 'farm_upgrade', 'advisor_hire', 'advisor_setup'] },
  { id: 'hobbies', icon: '🔥', label: 'Hobbies', ids: ['sponsors_all', 'sponsor_upgrade', 'fame_spots', 'practice', 'passion_pick', 'stress_relief', 'social_plan', 'stream_plan', 'media_plan', 'social_post', 'social_max', 'social_reply', 'social_deal', 'stream_start', 'stream_sponsor', 'racing_train', 'racing_license', 'racing_race'] },
  { id: 'activities', icon: '🎯', label: 'Activities (yearly)', ids: [] },
  { id: 'sports', icon: '🏟️', label: 'Sports team', ids: ['mt_train', 'mt_style', 'mt_offers', 'athlete_brand'] },
  { id: 'people', icon: '💞', label: 'Relationships', ids: ['talk_partner', 'date_night', 'gift_partner', 'family_time', 'friend_time', 'spend_all', 'volunteer'] },
  { id: 'health', icon: '🧘', label: 'Health & mind', ids: ['train', 'read', 'meditate'] },
];
export const sectionOf = (id) => (String(id).startsWith('act:') ? 'activities' : String(id).startsWith('gig:') ? 'job' : (SECTIONS.find((x) => x.ids.includes(id)) || { id: 'other' }).id);
export const ROUTINES = [
  { id: 'train', icon: '🏋️', label: 'Train', desc: 'Gym session every year', q: 'train' },
  { id: 'read', icon: '📖', label: 'Read', desc: 'Library visit every year', q: 'read' },
  { id: 'study', icon: '📚', label: 'Try harder in school', desc: 'Study hard once a year (same as the Study button: +smarts, small happiness cost)', q: 'study' },
  { id: 'meditate', icon: '🧘', label: 'Meditate', desc: 'Calm the mind', q: 'meditate' },
  { id: 'workharder', icon: '💼', label: 'Work harder', desc: 'Extra effort at your job', q: 'workharder' },
  { id: 'practice', icon: '🔥', label: 'Train passion (practice)', desc: 'Picks your chosen passion if none is active, then practices every active passion once a year: same as the Practice button, same cost and progress', k: 'passion_practice' },
  { id: 'passion_pick', icon: '🌱', label: 'Pick a passion', desc: 'Fill a free passion slot (your preferred passion, else the best fit for your skills)', k: 'passion_pick' },
  { id: 'talk_partner', icon: '💬', label: 'Talk to partner / spouse', desc: 'A real conversation (free)', i: 'talk', who: 'partner' },
  { id: 'date_night', icon: '🌹', label: 'Date night', desc: 'Romantic night with your partner / spouse ($100)', i: 'romance', who: 'partner' },
  { id: 'gift_partner', icon: '🎁', label: 'Gift for partner / spouse', desc: 'A gift so they stay ($50)', i: 'gift', who: 'partner' },
  { id: 'family_time', icon: '👪', label: 'Family time', desc: 'Spend time with the relative you have neglected most', i: 'spend', who: 'family' },
  { id: 'friend_time', icon: '🍻', label: 'Friend time', desc: 'Spend time with the friend you have neglected most', i: 'spend', who: 'friend' },
  { id: 'spend_all', icon: '🫶', label: 'Spend time with everyone', desc: 'Uses the yearly Spend time with every family member, partner/spouse and friend who has it (once each per year, free)', k: 'spend_all' },
  { id: 'volunteer', icon: '🤝', label: 'Volunteer', desc: 'Service hours (10+)', v: 'volunteer' },
  // social media, streaming and production companies: same adapter calls as the manual screens (see CUSTOM below)
  { id: 'social_plan', icon: '🗓️', label: 'Choose the yearly post plan', desc: 'Sets this year\'s post plan (your preferred plan, default Safe = 0% ban risk): same plan, same risks as the manual popup', k: 'social_plan' },
  { id: 'social_post', icon: '📱', label: 'Post on social media', desc: 'One safe, well-fitting post on your best open platform', k: 'social_post' },
  { id: 'social_max', icon: '📲', label: 'Use every post', desc: 'Fills every remaining post this year on each active account (e.g. 2/5 -> 5/5) with safe, well-fitting posts: same outcomes as posting by hand. Accounts with their own Autopilot page settings keep those.', k: 'social_max' },
  { id: 'social_reply', icon: '💬', label: 'Reply to comments', desc: 'Answer comments on every open platform', k: 'social_reply' },
  { id: 'social_deal', icon: '🤝', label: 'Accept best sponsor deal', desc: 'Take the best-paying sponsor offer you qualify for', k: 'social_deal' },
  { id: 'stress_relief', icon: '🛋️', label: 'Stress relief when strained', desc: 'At stress 70+, takes a mental health day, therapy or a vacation (same costs as by hand). Autopilot also stops at burnout (90+).', k: 'stress_relief' },
  { id: 'stream_plan', icon: '📡', label: 'Choose the yearly stream strategy', desc: 'Sets this year\'s live-streaming strategy (your preferred one, default Consistent & safe = no ban risk)', k: 'stream_plan' },
  { id: 'media_plan', icon: '🎞️', label: 'Choose the yearly media strategy', desc: 'Sets each production company\'s strategy (your preferred one, default Steady & safe = no scandal risk)', k: 'media_plan' },
  { id: 'stream_start', icon: '🎥', label: 'Go live (streamer)', desc: 'Start or keep up your streaming career', k: 'stream_start' },
  { id: 'stream_sponsor', icon: '💰', label: 'Seek a stream sponsor', desc: 'Look for a streaming sponsor', k: 'stream_sponsor' },
  { id: 'prod_music', icon: '🎵', label: 'Greenlight an album', desc: 'Your record label signs and records with your default policy', k: 'prod_greenlight', m: 'music' },
  { id: 'prod_film', icon: '🎬', label: 'Greenlight a movie', desc: 'Your film studio greenlights a film with your default policy', k: 'prod_greenlight', m: 'film' },
  { id: 'prod_tv', icon: '📺', label: 'Greenlight a TV show', desc: 'Your TV studio greenlights a show with your default policy', k: 'prod_greenlight', m: 'tv' },
  { id: 'prod_game', icon: '🎮', label: 'Greenlight a game', desc: 'Your game studio greenlights a game with your default policy', k: 'prod_greenlight', m: 'game' },
  // racing (same adapter calls as the Racing screens)
  { id: 'brand_collection', icon: '👗', label: 'Brand: launch every season\'s collection', desc: 'Launch each unreleased season with your saved plan', k: 'brand_collection' },
  { id: 'brand_staff', icon: '🧵', label: 'Brand: fill vacant staff roles', desc: 'Hire the best affordable designer, marketer, production and sales leads', k: 'brand_staff' },
  { id: 'brand_line', icon: '🧥', label: 'Brand: add the next product line', desc: 'Add one affordable line you qualify for (never intimates)', k: 'brand_line' },
  { id: 'farm_staff', icon: '🧑‍🌾', label: 'Farm: hire enough workers', desc: 'Hire farm hands until the acreage is staffed', k: 'farm_staff' },
  { id: 'farm_sell', icon: '🚚', label: 'Farm: sell stock to the best offer', desc: 'Sell stored crops/animals to the highest-paying distributor', k: 'farm_sell' },
  { id: 'farm_contract', icon: '📜', label: 'Farm: sign a supply contract', desc: 'Sign a 2-year 50% contract for a product with none', k: 'farm_contract' },
  { id: 'farm_upgrade', icon: '🏚️', label: 'Farm: upgrade buildings', desc: 'Buildings +4 when it costs under 5% of your cash', k: 'farm_upgrade' },
  { id: 'advisor_hire', icon: '💼', label: 'Advisor: hire the best advisor', desc: 'Hire the best-rated advisor when you have none', k: 'advisor_hire' },
  { id: 'advisor_setup', icon: '🏦', label: 'Advisor: keep auto-investing on', desc: 'Set a 10% income plan (60/40 stocks/crypto) if none is set', k: 'advisor_setup' },
  { id: 'racing_train', icon: '🏎️', label: 'Racing: train', desc: 'Train your weakest driving stat (or craft) once a year', k: 'racing_train' },
  { id: 'racing_license', icon: '🪪', label: 'Racing: apply for next licence', desc: 'Buy the next racing licence as soon as you qualify', k: 'racing_license' },
  { id: 'racing_race', icon: '🏁', label: 'Racing: run the season', desc: 'Race the rest of the season for your career and your team', k: 'racing_race' },
  { id: 'racing_sponsor', icon: '📣', label: 'Racing: sign best team sponsor', desc: 'Take the best-paying sponsor offer that fits a free slot', k: 'racing_sponsor' },
  { id: 'racing_staff', icon: '🧑‍🔧', label: 'Racing: fill vacant team staff', desc: 'Hire the best affordable candidate for each required role', k: 'racing_staff' },
  { id: 'racing_upgrade', icon: '🛠️', label: 'Racing: upgrade the garage', desc: 'Upgrade the lowest facility if it costs under 10% of team cash', k: 'racing_upgrade' },
  { id: 'sponsor_upgrade', icon: '🔁', label: 'Upgrade sponsors when full', desc: 'When every sponsor slot is taken, swaps your weakest deal for a better offer (stream, influencer, social accounts). Never takes a worse deal; same odds and terms as by hand.', k: 'sponsor_upgrade' },
  { id: 'sponsors_all', icon: '🤝', label: 'Look for sponsors automatically', desc: 'Every year, takes the best sponsor offer on your social accounts, stream and racing team (same offers, caps and terms as searching by hand). On by default with the pass.', k: 'sponsors_all' },
  { id: 'job_nurture', icon: '🤝', label: 'Job: nurture coworkers and the boss', desc: 'Chats with your lowest-relationship coworkers and impresses the boss (same caps and effects as by hand)', k: 'job_nurture' },
  { id: 'job_promo', icon: '📈', label: 'Job: ask for a promotion when ready', desc: 'Asks once a year when promotion readiness is 70%+ (same odds as by hand)', k: 'job_promo' },
  { id: 'mt_train', icon: '🏋️', label: 'Sports: train my lowest 3 skills', desc: 'Trains the 3 lowest skills of your current sport (same cost and effect as the Skills tab; 3 a year at any level)', k: 'mt_train' },
  { id: 'mt_style', icon: '🎽', label: 'Sports: choose the season play style', desc: 'Sets your play style for the season (your preferred style, default Balanced)', k: 'mt_style' },
  { id: 'train_employees', icon: '🎓', label: 'Train employees', desc: 'Once a year per company: pays for staff training (same cost and +skill as the button) at every business and trains untrained production crew. Skips what you cannot afford.', k: 'train_employees' },
  { id: 'hire_all', icon: '🧑‍💼', label: 'Keep all spots filled', desc: 'Every year, fills open staff, crew and roster spots across all your companies and teams at your chosen tier (Businesses > Hire all). Same costs as by hand; skips anything you cannot afford.', k: 'hire_all' },
  { id: 'athlete_brand', icon: '👟', label: 'Sports: brand deals', desc: 'Signs the best shoe, drink, apparel or game deal into a free slot, or swaps out a weaker deal. Never takes a worse one; same terms as by hand.', k: 'athlete_brand' },
  { id: 'mt_offers', icon: '✍️', label: 'Sports: handle offers', desc: 'Accepts the best draft offer or contract that pays at least what you earn now, negotiates once, declines trade requests', k: 'mt_offers' },
  { id: 'fame_spots', icon: '🌟', label: 'Use my fame: take the best spots', desc: 'Goes after the best-paying fame spots you qualify for (up to 3 a year, same odds, pay and risks as by hand; stops at stress 70+)', k: 'fame_spots' },
  { id: 'prod_back', icon: '📨', label: 'Back a pitched project', desc: 'Invest a small slice of spare cash in the best pitch (revenue cut)', k: 'prod_back' },
];
// ---- generic yearly options: every world activity (once a year, with choices) and every freelance gig (max per year) is a routine too ----
let DYN_CACHE = null;
export function dynRoutines() {
  if (DYN_CACHE && DYN_CACHE.n === (D.worldActs ? D.worldActs.categories.length : 0)) return DYN_CACHE.list;
  const list = [];
  for (const c of (D.worldActs && D.worldActs.categories) || []) for (const a of c.activities) list.push({ id: 'act:' + a.id, icon: c.icon || '🎯', label: a.name, cat: c.name, catId: c.id, desc: `${c.name}: once a year${a.minAge ? ' (age ' + a.minAge + '+)' : ''}${a.needsJob ? ', needs a job' : ''}. Choice, cost and risk are the same as by hand.`, k: 'activity', actId: 'w:' + a.id, choices: a.choices.map((x) => ({ label: x.label, cost: x.cost || 0 })) });
  for (const g of (D.sOcc && D.sOcc.freelance) || []) list.push({ id: 'gig:' + g.id, icon: '🧰', label: 'Gig: ' + g.title, cat: 'Freelance Gigs', desc: `Freelance gig, up to ${g.max_per_year} a year (age ${g.min_age}+). Same pay roll as by hand.`, k: 'gig', gigId: g.id, max: g.max_per_year });
  DYN_CACHE = { n: D.worldActs ? D.worldActs.categories.length : 0, list }; return list;
}
export const allRoutines = () => ROUTINES.concat(dynRoutines());
export const routineDef = (id) => ROUTINES.find((r) => r.id === id) || dynRoutines().find((r) => r.id === id);
// page (panel title) -> routine ids shown in that page's yearly checklist
const PAGE_MAP = { 'Use your fame': ['fame_spots'], 'Coworkers & boss': ['job_nurture', 'job_promo'], Skills: ['train', 'read', 'meditate', 'practice', 'passion_pick'], Passions: ['practice', 'passion_pick'], Scholarships: ['volunteer'], Work: ['workharder', 'study', 'train', 'job_nurture', 'job_promo'], Education: ['study', 'volunteer'], 'Part-Time': ['workharder'],
  'Sports Career': ['mt_train', 'mt_style', 'mt_offers', 'athlete_brand', 'sponsors_all'], 'Live Streaming': ['stream_plan', 'stream_start', 'stream_sponsor', 'sponsors_all', 'sponsor_upgrade'], Streamer: ['stream_plan', 'stream_start', 'stream_sponsor', 'sponsors_all'], Influencer: ['social_plan', 'social_post', 'social_reply', 'social_deal', 'sponsors_all', 'sponsor_upgrade'], 'Social Media': ['social_plan', 'social_post', 'social_reply', 'social_deal', 'sponsors_all'], Social: ['social_plan', 'social_post', 'social_reply', 'social_deal', 'sponsors_all'],
  'Racing team': ['sponsors_all', 'racing_sponsor', 'racing_staff', 'racing_upgrade'], Racing: ['racing_train', 'racing_license', 'racing_race', 'racing_sponsor', 'racing_staff', 'racing_upgrade'], 'Clothing Brand': ['brand_collection', 'brand_staff', 'brand_line'], 'Farms & Ranches': ['farm_staff', 'farm_sell', 'farm_contract', 'farm_upgrade'], 'Investment Advisor': ['advisor_hire', 'advisor_setup'],
  'Production Companies': ['prod_music', 'prod_film', 'prod_tv', 'prod_game', 'prod_back', 'media_plan'], 'Time & Stress': ['stress_relief'], Relationships: ['talk_partner', 'date_night', 'gift_partner', 'family_time', 'friend_time'], 'Online Profiles': ['social_plan', 'social_post', 'social_reply', 'social_deal', 'sponsors_all'] };
export function pageRoutineIds(title) {
  if (PAGE_MAP[title]) return PAGE_MAP[title];
  if (title === 'Activities') return dynRoutines().filter((r) => r.k === 'activity').map((r) => r.id);
  if (title === 'Freelance Gigs') return dynRoutines().filter((r) => r.k === 'gig').map((r) => r.id);
  const cat = dynRoutines().filter((r) => r.k === 'activity' && (r.cat === title || r.catId === title)); return cat.map((r) => r.id);
}
export function yearlyOptions(ad, title) {
  const A = ensure(ad.s); return pageRoutineIds(title).map((id) => { const d = routineDef(id); if (!d) return null; const c = ad.s.alive ? check(ad, d) : { ok: false, reason: '' };
    return { id, icon: d.icon, label: d.label, desc: d.desc, selected: A.routines.includes(id), available: c.ok, reason: c.reason || '', cost: c.cost || 0, choices: d.choices || null, choice: (A.actChoice || {})[id] | 0 }; }).filter(Boolean);
}
export function setYearly(s, id, on) { const A = ensure(s); if (!routineDef(id)) return { ok: false, msg: 'Unknown option.' }; const has = A.routines.includes(id); if (on && !has) A.routines.push(id); if (!on && has) A.routines = A.routines.filter((x) => x !== id); return { ok: true, msg: on ? 'Added to Autopilot.' : 'Removed from Autopilot.', routines: [...A.routines] }; }
export function setYearlyChoice(s, id, idx) { const A = ensure(s), d = routineDef(id); if (!d || !d.choices) return { ok: false, msg: 'No choices.' }; A.actChoice = A.actChoice || {}; A.actChoice[id] = Math.max(0, Math.min(d.choices.length - 1, idx | 0)); return { ok: true, msg: 'Choice saved: ' + d.choices[A.actChoice[id]].label }; }

const interactionOf = (rel, id) => (D.life.interactions[rel] || []).find((x) => x.id === id);
function target(s, def) {
  const live = P.living(s);
  if (def.who === 'partner') return P.partnerOf(s);
  const pool = live.filter((p) => (def.who === 'family' ? ['mother', 'father', 'sibling', 'child'].includes(p.rel) : p.rel === 'friend') && P.interactionsFor(s, p).some((i) => i.id === def.i));
  return pool.sort((a, b) => a.bar - b.bar)[0] || null;
}
// ---- custom routines (each returns { ok, reason, cost, run() } and run() calls the SAME adapter method the manual screen calls) ----
const sd = (ad, pid) => ad.getPlatform(pid);
const openPlats = (ad) => (ad.getSocial().platforms || []).filter((p) => p.open && !p.locked && p.status === 'active');
function bestPost(ad, p) { const rank = { Safe: 0, Spicy: 1, Risky: 2 }, fits = { great: 0, good: 1, ok: 2 }; return p.posts.filter((x) => !x.locked && x.tag === 'Safe').sort((x, y) => (fits[x.fit] ?? 3) - (fits[y.fit] ?? 3) || (rank[x.tag] - rank[y.tag]))[0]; }
export const CUSTOM = {
  fame_spots(ad) { const s = ad.s; if ((s.stats.stress || 0) >= 70) return { ok: false, reason: 'Stress is too high for more spots' }; const b = Fame.bestSpot(s); if (!b) return { ok: false, reason: 'No fame spot available' }; return { ok: true, cost: 0, who: b.name, run: () => { let r = { ok: false, message: '' }; for (let i = 0; i < Fame.YEAR_CAP; i++) { const q = Fame.bestSpot(s); if (!q || (s.stats.stress || 0) >= 70) break; r = ad.fameTake(q.id); } return r; } }; },
  passion_practice(ad) {
    const st0 = ad.getPassions(), A = ensure(ad.s); if (st0.locked) return { ok: false, reason: 'Passions start at ' + st0.minAge };
    // nothing active yet, or the chosen passion is not active and a slot is free: pick it first (same adapter call as the Passions screen)
    const pref = A.passion && st0.available.find((p) => p.id === A.passion), needPick = (!st0.active.length || (pref && !st0.active.some((a) => a.id === A.passion))) && st0.used < st0.slots && st0.available.length;
    let pickId = null; if (needPick) { const fit = (p) => p.skills.reduce((a, k) => a + ((ad.s.skills && ad.s.skills[k]) || 0), 0) / p.skills.length; pickId = (pref || st0.available.slice().sort((x, y) => fit(y) - fit(x) || (x.id < y.id ? -1 : 1))[0]).id; }
    if (!pickId && !st0.active.length) return { ok: false, reason: 'No passion to train (no free slot or none left to pick)' };
    const todo = st0.active.filter((a) => !a.practiced); if (!pickId && !todo.length) return { ok: false, reason: 'Already practiced this year' };
    const names = todo.map((a) => a.name); if (pickId) names.unshift((st0.available.find((p) => p.id === pickId) || {}).name);
    return { ok: true, cost: 0, who: names.join(', '), run: () => { const msgs = []; let any = false; if (pickId) { const r = ad.pickPassion(pickId); msgs.push(r.message); any = any || r.ok; }
      for (const a of ad.getPassions().active.filter((x) => !x.practiced)) { const r = ad.practicePassion(a.id); msgs.push(r.message); any = any || r.ok; } return { ok: any, message: msgs.join(' ') }; } };
  },
  passion_pick(ad) { const st = ad.getPassions(), A = ensure(ad.s); if (st.locked) return { ok: false, reason: 'Passions start at ' + st.minAge }; if (st.used >= st.slots) return { ok: false, reason: 'No free passion slot' }; if (!st.available.length) return { ok: false, reason: 'No passion left to pick' }; const fit = (p) => p.skills.reduce((a, k) => a + ((ad.s.skills && ad.s.skills[k]) || 0), 0) / p.skills.length; const pref = A.passion && st.available.find((p) => p.id === A.passion), best = pref || st.available.slice().sort((x, y) => fit(y) - fit(x) || (x.id < y.id ? -1 : 1))[0]; return { ok: true, cost: 0, who: best.name, run: () => ad.pickPassion(best.id) }; },
  racing_train(ad) { const st = ad.getRacing(); if (!st.career) return { ok: false, reason: 'No racing career' }; if (st.trainedThisYear) return { ok: false, reason: 'Already trained this year' }; if (ad.s.cash < st.trainCost) return { ok: false, reason: 'Cannot afford training' }; const weak = st.career.role === 'driver' ? Object.entries(st.statValues).sort((a, b) => a[1] - b[1])[0][0] : null; return { ok: true, cost: st.trainCost, run: () => ad.rcAction('train', weak) }; },
  racing_license(ad) { const st = ad.getRacing(); if (!st.career) return { ok: false, reason: 'No racing career' }; const n = st.license.next; if (!n) return { ok: false, reason: 'All licences held' }; if (!n.eligible) return { ok: false, reason: n.reason }; return { ok: true, cost: n.fee, run: () => ad.rcAction('license') }; },
  racing_race(ad) { const st = ad.getRacing(); const c = st.career && st.career.season && !st.career.season.done, t = st.team && st.team.canRace; if (!c && !t) return { ok: false, reason: 'No race left this season' }; return { ok: true, cost: 0, run: () => { let r = { ok: false, message: '' }; const msgs = []; if (c) { r = ad.rcAction('race', true); msgs.push(r.message); } if (t) { r = ad.rcAction('teamRace', true); msgs.push(r.message); } return { ok: r.ok, message: msgs.join(' ') }; } }; },
  brand_collection(ad) { const b = ad.getBrand().brand; if (!b) return { ok: false, reason: 'No clothing brand' }; if (!b.canSeason) return { ok: false, reason: 'All seasons launched' }; const sn = b.plans.find((p) => !p.done); const e = ad.getBrandEstimate(sn.id); const cost = e.designCost + e.marketCost + e.productionCost; return { ok: true, cost, run: () => ad.brandAction('launchAll') }; },
  brand_staff(ad) { const st = ad.getBrand(), b = st.brand; if (!b) return { ok: false, reason: 'No clothing brand' }; const role = st.roles.find((r) => !b.staff.some((x) => x.role === r.id)); if (!role) return { ok: false, reason: 'All roles filled' }; const c = ad.getBrandStaff(role.id).filter((x) => x.wage <= ad.s.cash * 0.1).sort((x, y) => y.skill - x.skill)[0]; if (!c) return { ok: false, reason: 'No affordable candidate' }; return { ok: true, cost: 0, run: () => ad.brandAction('hire', role.id, c.id) }; },
  brand_line(ad) { const st = ad.getBrand(), b = st.brand; if (!b) return { ok: false, reason: 'No clothing brand' }; const d = st.lineDefs.filter((l) => !b.lines.includes(l.id) && !l.adultsOnly && (l.minRep || 0) <= b.rep && l.dev <= ad.s.cash * 0.05).sort((x, y) => x.dev - y.dev)[0]; if (!d) return { ok: false, reason: 'No new line qualifies' }; return { ok: true, cost: d.dev, run: () => ad.brandAction('addLine', d.id) }; },
  farm_staff(ad) { const f = ad.getFarm().farm; if (!f) return { ok: false, reason: 'No farm' }; if (f.staffing >= 100) return { ok: false, reason: 'Fully staffed' }; const c = ad.getFarmStaff('hand').filter((x) => x.wage <= ad.s.cash * 0.1).sort((x, y) => y.skill - x.skill)[0]; if (!c) return { ok: false, reason: 'No affordable worker' }; return { ok: true, cost: 0, run: () => { let r = { ok: true, message: '' }; for (let i = 0; i < 5 && ad.getFarm().farm.staffing < 100; i++) { const cc = ad.getFarmStaff('hand').filter((x) => !ad.getFarm().farm.staff.some((y) => y.id === x.id))[0]; if (!cc) break; r = ad.farmAction('hire', 'hand', cc.id); if (!r.ok) break; } return r; } }; },
  farm_sell(ad) { const f = ad.getFarm().farm; if (!f) return { ok: false, reason: 'No farm' }; const m = f.market.find((x) => x.stock > 0 && x.offers.length); if (!m) return { ok: false, reason: 'Nothing in storage' }; return { ok: true, cost: 0, run: () => { let r = { ok: true, message: '' }; for (const x of ad.getFarm().farm.market) if (x.stock > 0 && x.offers.length) r = ad.farmAction('sell', x.id, x.offers[0].buyer, 'all'); return r; } }; },
  farm_contract(ad) { const f = ad.getFarm().farm; if (!f) return { ok: false, reason: 'No farm' }; if (f.contracts.length >= 3) return { ok: false, reason: 'Contract slots full' }; const m = f.market.find((x) => !x.contract && x.offers.length); if (!m) return { ok: false, reason: 'Every product has a contract' }; return { ok: true, cost: 0, run: () => ad.farmAction('contract', m.id, m.offers[0].buyer, 2, 50) }; },
  farm_upgrade(ad) { const f = ad.getFarm().farm; if (!f) return { ok: false, reason: 'No farm' }; if (f.bq >= 100) return { ok: false, reason: 'Top quality already' }; const u = f.upgrades[0]; if (u.cost > ad.s.cash * 0.05) return { ok: false, reason: 'Upgrade costs over 5% of cash' }; return { ok: true, cost: u.cost, run: () => ad.farmAction('upgrade', 4) }; },
  advisor_hire(ad) { const a = ad.getAdvisor(); if (a.locked) return { ok: false, reason: 'Advisors start at 18' }; if (a.advisor) return { ok: false, reason: 'You already have an advisor' }; const c = a.market.filter((x) => x.risks.steals <= 2).sort((x, y) => y.quality - x.quality)[0] || a.market.sort((x, y) => y.quality - x.quality)[0]; return { ok: true, cost: 0, run: () => ad.advisorAction('hire', c.id) }; },
  advisor_setup(ad) { const a = ad.getAdvisor(); if (!a.advisor) return { ok: false, reason: 'No advisor' }; if (a.plan) return { ok: false, reason: 'A plan is already set' }; return { ok: true, cost: 0, run: () => ad.advisorAction('plan', { mode: 'pct', value: 10, target: 'split', split: 60 }) }; },
  racing_sponsor(ad) { const t = ad.getRacing().team; if (!t) return { ok: false, reason: 'No racing team' }; const free = (k) => t.sponsors.deals.filter((x) => x.kind === k).length < t.sponsors.slots[k]; const o = t.sponsors.offers.filter((x) => free(x.kind)).sort((a, b) => b.pay - a.pay)[0]; if (!o) return { ok: false, reason: 'No sponsor offer fits a free slot' }; return { ok: true, cost: 0, run: () => ad.rcAction('sponsor', o.id) }; },
  racing_staff(ad) { const st = ad.getRacing(), t = st.team; if (!t) return { ok: false, reason: 'No racing team' }; const role = st.troles.find((r) => r.required && !t.staff.some((x) => x.role === r.id)); if (!role) return { ok: false, reason: 'No vacant required role' }; const c = ad.getRacingStaff(role.id).filter((x) => x.fee <= t.cash * 0.2).sort((a, b) => b.skill - a.skill)[0]; if (!c) return { ok: false, reason: 'No affordable candidate' }; return { ok: true, cost: 0, run: () => ad.rcAction('hire', role.id, c.id) }; },
  racing_upgrade(ad) { const t = ad.getRacing().team; if (!t) return { ok: false, reason: 'No racing team' }; const f = t.facilities.filter((x) => x.cost && x.cost <= t.cash * 0.1).sort((a, b) => a.level - b.level)[0]; if (!f) return { ok: false, reason: 'Nothing affordable to upgrade' }; return { ok: true, cost: 0, run: () => ad.rcAction('upgrade', f.id) }; },
  activity(ad, def) { const s = ad.s, a = ad.findWorld(def.actId.slice(2)); if (!a) return { ok: false, reason: 'Unknown activity' }; if (s.acted[def.actId]) return { ok: false, reason: 'Already done this year' }; if (Math.floor(s.age) < (a.minAge || 0)) return { ok: false, reason: `Unlocks at age ${a.minAge}` }; if (a.needsJob && !s.job) return { ok: false, reason: 'Needs a job' };
    const idx = Math.min(a.choices.length - 1, ((ensure(s).actChoice || {})[def.id] | 0)), c = a.choices[idx]; if (c.cost && s.cash < c.cost) return { ok: false, reason: 'Cannot afford that' }; return { ok: true, cost: c.cost || 0, who: c.label, run: () => ad.doActivity(def.actId, idx) }; },
  gig(ad, def) { const g = ad.getFreelanceGigs().gigs.find((x) => x.id === def.gigId); if (!g) return { ok: false, reason: 'Unknown gig' }; if (!g.eligible) return { ok: false, reason: g.reason || 'Not available' }; const left = g.maxPerYear - g.doneThisYear; return { ok: true, cost: 0, who: left + ' left', run: () => { let r = { ok: false, message: '' }; for (let i = 0; i < left; i++) { const x = ad.doGig(def.gigId); if (!x.ok) break; r = x; } return r; } }; },
  train_employees(ad) { const s = ad.s, jobs = [];
    for (const b of s.biz || []) if (b.staff && b.staff.length && b.trainedAge !== Math.floor(s.age)) jobs.push(() => ad.trainBizStaff(b.id));
    if (s.prod && s.prod.cos) for (const [m, co] of Object.entries(s.prod.cos)) for (const c of co.crew || []) if (c.trained !== Math.floor(s.age)) jobs.push(() => (ad.prodAction ? ad.prodAction(m, 'train', c.id) : null));
    if (!jobs.length) return { ok: false, reason: 'Everyone trained this year' }; return { ok: true, cost: 0, who: jobs.length + ' training' + (jobs.length > 1 ? 's' : ''), run: () => { let r = { ok: false }; for (const j of jobs) { const x = j(); if (x) r = x; } return r; } }; },
  hire_all(ad) { const tier = (ad.s.auto && ad.s.auto.hireAllTier) || 'standard'; const p = ad.hireAllPlan(tier); if (!p.hires) return { ok: false, reason: 'Every spot is filled' }; return { ok: true, cost: p.cost, who: `${p.hires} hires (${p.tier})`, run: () => ad.hireAll(tier) }; },
  athlete_brand(ad) { const H = ad.getBrandDeals(); if (!H.eligible) return { ok: false, reason: 'Not a pro athlete' }; let best = null; const lo = [...H.deals].sort((a, b) => a.pay - b.pay)[0]; for (const o of [...H.offers].sort((a, b) => b.pay - a.pay)) { const same = H.deals.find((d) => d.cat === o.cat); if (same) { if (o.pay > same.pay) { best = [o.id, same.id]; break; } continue; } if (H.deals.length < H.max) { best = [o.id]; break; } if (lo && o.pay > lo.pay) { best = [o.id, lo.id]; break; } } if (!best) return { ok: false, reason: 'No better brand deal' }; return { ok: true, cost: 0, run: () => ad.brandAccept(best[0], best[1]) }; },
  sponsor_upgrade(ad) { const s = ad.s, jobs = [];
    const st = s.stream; if (st && st.active && !(st.acted && st.acted.sponsor)) { try { const S = ad.getStreamer(); if (S.active && S.sponsors && S.maxSponsors && S.sponsors.length >= S.maxSponsors) jobs.push(() => ad.streamerAction('swapSponsor')); } catch (e) {} }
    const f = s.infl; if (f && f.active && f.offers && f.offers.length && f.deals.length) { const lo = Math.min(...f.deals.map((d) => d.pay)), best = [...f.offers].filter((o) => !o.shady).sort((a, b) => b.pay - a.pay)[0]; if (best && best.pay > lo) jobs.push(() => ad.influencerAction('swapDeal', best.id)); }
    const so = s.social; if (so && so.accounts) for (const [pid, a] of Object.entries(so.accounts)) { const offs = (so.offers && so.offers[pid]) || []; if (!a.deals || !a.deals.length || !offs.length) continue; const lo = Math.min(...a.deals.map((d) => d.pay)), best = [...offs].sort((x, y) => y.pay - x.pay)[0]; if (best.pay > lo) jobs.push(() => ad.socialAction(pid, 'accept', best.id, true)); }
    if (!jobs.length) return { ok: false, reason: 'No better sponsor deal to swap in' }; return { ok: true, cost: 0, who: jobs.length + ' swap' + (jobs.length > 1 ? 's' : ''), run: () => { let r = { ok: false }; for (const j of jobs) r = j() || r; return r; } }; },
  sponsors_all(ad) { const parts = ['social_deal', 'stream_sponsor', 'racing_sponsor'].map((k) => [k, CUSTOM[k](ad)]).filter(([, c]) => c.ok); if (!parts.length) return { ok: false, reason: 'No sponsor offers to take right now' }; return { ok: true, cost: parts.reduce((a, [, c]) => a + (c.cost || 0), 0), who: parts.length + ' search' + (parts.length > 1 ? 'es' : ''), run: () => { let r = { ok: false, message: '' }; for (const [, c] of parts) { const x = c.run(); if (x && x.ok) r = x; } return r; } }; },
  job_nurture(ad) { const v = ad.getJobPanel(); if (!v) return { ok: false, reason: 'No job' }; const todo = v.coworkers.filter((c) => !c.done).sort((a, b) => a.rel - b.rel).slice(0, Math.max(0, Math.min(2, v.cap - v.used))); if (!todo.length && v.impressed) return { ok: false, reason: 'Already done this year' }; return { ok: true, cost: 0, who: todo.map((c) => c.name).join(', ') || 'the boss', run: () => { let r = { ok: true, message: '' }; for (const c of todo) r = ad.jobCoworker(c.id, 'chat'); if (!v.impressed) r = ad.jobBoss('impress'); return r; } }; },
  job_promo(ad) { const v = ad.getJobPanel(); if (!v) return { ok: false, reason: 'No job' }; if (v.top) return { ok: false, reason: 'Top of the ladder' }; if (v.promoAsked) return { ok: false, reason: 'Already asked this year' }; if (v.readiness < 70) return { ok: false, reason: `Readiness ${v.readiness}% (waits for 70%)` }; return { ok: true, cost: 0, run: () => ad.jobBoss('promotion') }; },
  mt_train(ad) { const v = ad.getMyTeam(); if (!v.onTeam || v.limbo) return { ok: false, reason: 'Not on a sports team' }; if (v.train.used >= v.train.cap) return { ok: false, reason: 'Already trained 3 skills this year' }; if (ad.s.cash < v.train.cost * (v.train.cap - v.train.used)) return { ok: false, reason: 'Cannot afford training' }; return { ok: true, cost: v.train.cost * (v.train.cap - v.train.used), who: v.train.lowest.join(', '), run: () => ad.mtTrainLowest() }; },
  mt_style(ad) { const v = ad.getMyTeam(); if (!v.onTeam || v.limbo) return { ok: false, reason: 'Not on a sports team' }; const id = ensure(ad.s).mtStyle || 'balanced'; if (v.styleChosen && v.style === id) return { ok: false, reason: 'Style already chosen this year' }; return { ok: true, cost: 0, who: id, run: () => ad.mtStyle(id) }; },
  mt_offers(ad) { const v = ad.getMyTeam(); if (!v.onTeam || !v.offers.length) return { ok: false, reason: 'No offers' }; return { ok: true, cost: 0, who: v.offers.length + ' offer(s)', run: () => handleOffers(ad) }; },
  stress_relief(ad) { const s = ad.s, tb = ad.getTimeBudget(); if (tb.stress < 70) return { ok: false, reason: 'Stress is under control' }; const left = (id) => tb.relief.find((x) => x.id === id), pick = ['vacation', 'therapy', 'rest'].map(left).find((x) => x && x.left > 0 && x.afford && (tb.stress >= 85 || x.id !== 'vacation')); if (!pick) return { ok: false, reason: 'No relief left this year' }; return { ok: true, cost: pick.cost, who: pick.name, run: () => ad.timeAction(pick.id) }; },
  stream_plan(ad) { const s = ad.s, st = ad.getStreamer(); if (st.locked || !st.active) return { ok: false, reason: 'Not streaming' }; if (!st.plan.needed) return { ok: false, reason: 'Strategy already chosen this year' }; const id = ensure(s).streamPlan || 'steady'; return { ok: true, cost: 0, who: (st.plan.options.find((x) => x.id === id) || {}).name, run: () => ad.setStreamPlan(id) }; },
  media_plan(ad) { const s = ad.s, ms = ['music', 'film', 'tv', 'game'].filter((m) => s.prod && s.prod.cos[m] && !s.prod.cos[m].strategy); if (!ms.length) return { ok: false, reason: 'No company needs a strategy' }; const id = ensure(s).mediaPlan || 'steady'; return { ok: true, cost: 0, who: id, run: () => { let r = { ok: false, message: '' }; for (const m of ms) r = ad.setMediaPlan(m, id); return r; } }; },
  social_plan(ad) { const s = ad.s; if (s.age < 13) return { ok: false, reason: 'Social media starts at 13' }; const st = ad.getSocial(); if (!st.postPlan.needed) return { ok: false, reason: Object.keys(s.social ? s.social.accounts : {}).length ? 'Plan already chosen this year' : 'No social account' }; const id = ensure(s).socialPlan || 'safe'; return { ok: true, cost: 0, who: (st.postPlan.options.find((x) => x.id === id) || {}).name, run: () => ad.setPostPlan(id) }; },
  social_post(ad) { const s = ad.s; if (s.age < 13) return { ok: false, reason: 'Social media starts at 13' }; let best = null; for (const sp of openPlats(ad)) { const p = sd(ad, sp.id); if (!p || p.postsLeft <= 0) continue; const post = bestPost(ad, p); if (post && (!best || sp.followers > best.f)) best = { pid: sp.id, post, f: sp.followers }; } if (!best) return { ok: false, reason: 'No open platform with a safe post to make' }; return { ok: true, cost: 0, who: best.pid, run: () => ad.socialAction(best.pid, 'post', best.post.id) }; },
  spend_all(ad) { const s = ad.s, todo = P.living(s).filter((p) => p.rel !== 'ex' && !s.acted['p' + p.id + 'spend'] && P.interactionsFor(s, p).some((i) => i.id === 'spend'));
    if (!todo.length) return { ok: false, reason: 'Spent time with everyone already this year' };
    return { ok: true, cost: 0, who: todo.length + (todo.length === 1 ? ' person' : ' people'), run: () => { let n = 0, last = { ok: false, message: '' }; for (const p of todo) { if (s.acted['p' + p.id + 'spend']) continue; const r = ad.interact(p.id, 'spend'); if (r && r.ok !== false) n++; last = r || last; } return { ok: n > 0, message: `Spent time with ${n} of ${todo.length}` }; } }; },
  social_max(ad) { const s = ad.s, A = ensure(s); if (s.age < 13) return { ok: false, reason: 'Social media starts at 13' };
    const plats = openPlats(ad).filter((sp) => !(A.pages['social_' + sp.id] && A.pages['social_' + sp.id].on)).filter((sp) => { const p = sd(ad, sp.id); return p && p.postsLeft > 0; });
    if (!plats.length) return { ok: false, reason: 'Every account already used all its posts this year' };
    return { ok: true, cost: 0, who: plats.length + (plats.length === 1 ? ' account' : ' accounts'), run: () => { if (ad.getSocial().postPlan.needed) ad.setPostPlan(A.socialPlan || 'safe'); let n = 0; const per = [];
      for (const sp of plats) { let k = 0; for (let i = 0; i < 12; i++) { const q = sd(ad, sp.id); if (!q || q.status !== 'active' || q.postsLeft <= 0) break; const post = bestPost(ad, q) || pickPost(ad, q, 'safe'); if (!post) break; const r = ad.socialAction(sp.id, 'post', post.id); if (!r || r.ok === false) break; k++; } if (k) per.push(`${sp.name || sp.id} +${k}`); n += k; }
      return { ok: n > 0, message: n ? `Posted ${n} times (${per.join(', ')})` : 'No post to make' }; } }; },
  social_reply(ad) { const t = openPlats(ad).filter((sp) => { const p = sd(ad, sp.id); return p && !p.done.reply; })[0]; if (!t) return { ok: false, reason: 'Nothing to reply to' }; return { ok: true, cost: 0, who: t.id, run: () => { let last; for (const sp of openPlats(ad)) { const p = sd(ad, sp.id); if (p && !p.done.reply) last = ad.socialAction(sp.id, 'reply'); } return last; } }; },
  social_deal(ad) { let best = null; for (const sp of openPlats(ad)) { const p = sd(ad, sp.id); if (!p || !p.canSponsor || p.deals.length >= p.maxDeals) continue; for (const o of p.offers) if (o.fit !== 'poor' && (!best || o.pay > best.o.pay)) best = { pid: sp.id, o }; } if (!best) return { ok: false, reason: 'No sponsor offer to take' }; return { ok: true, cost: 0, who: best.o.brand, run: () => ad.socialAction(best.pid, 'accept', best.o.id) }; },
  stream_start(ad) { const st = ad.getStreamer(); if (st.locked) return { ok: false, reason: 'Streaming starts at ' + st.minAge }; if (st.active) return { ok: false, reason: 'Already streaming (it runs every year)' }; if (st.bannedYears) return { ok: false, reason: 'Banned' }; return { ok: true, cost: 0, run: () => ad.streamerAction('start', st.topics[0].id) }; },
  stream_sponsor(ad) { const st = ad.getStreamer(); if (!st.active) return { ok: false, reason: 'You are not streaming' }; if (!st.canSponsor) return { ok: false, reason: 'Needs ' + st.minSubsForSponsor + ' subs' }; if (st.done.sponsor) return { ok: false, reason: 'Already done this year' }; if (st.sponsors.length >= st.maxSponsors) return { ok: false, reason: 'Sponsor slots full' }; return { ok: true, cost: 0, run: () => ad.streamerAction('sponsor') }; },
  prod_greenlight(ad, def) { const co = ad.getProdCos().media.find((x) => x.id === def.m); if (!co || !co.owned) return { ok: false, reason: 'You do not own that company' }; const c = co.company; if (c.slate.length >= Math.min(c.policy.slots, c.maxSlots)) return { ok: false, reason: 'Slate is full' }; const t = c.tiers.find((x) => x.id === c.policy.tier); if (t.locked) return { ok: false, reason: 'Budget tier locked' }; if (def.m === 'music' && !c.roster.some((a) => !a.busy)) return { ok: false, reason: 'No free artist' }; return { ok: true, cost: Math.max(0, t.cost - c.cash), run: () => ad.prodAction(def.m, 'greenlight', {}) }; },
  prod_back(ad, def, floor) { const s = ad.s, room = Math.floor((s.cash - floor) * 0.1); let best = null; for (const m of ad.getProdCos().media) for (const p of m.pitches) { const amt = Math.min(p.ask, room); if (amt < p.min) continue; const q = p.buzz - p.risk * 5 + p.heat / 40; if (!best || q > best.q) best = { m: m.id, p, amt, q }; } if (!best) return { ok: false, reason: 'No pitch fits your spare cash' }; return { ok: true, cost: best.amt, who: best.p.title, run: () => ad.prodAction(best.m, 'invest', best.p.id, best.amt) }; },
};
function handleOffers(ad) {
  let v = ad.getMyTeam(), last = { ok: true, message: '' }, n = 0;
  const draft = v.offers.filter((o) => o.kind === 'draft').sort((a, b) => b.salary - a.salary)[0];
  if (draft && ad.s.school !== 'college') { last = ad.mtOffer(draft.id, 'accept'); n++; v = ad.getMyTeam(); }
  for (const o of v.offers.filter((x) => x.kind !== 'draft')) {
    if (o.kind === 'trade') { if (o.salary >= v.salary * 1.15) last = ad.mtOffer(o.id, 'accept'); else last = ad.mtOffer(o.id, 'decline'); n++; continue; }
    let cur = o; if (cur.salary < v.salary * 1.1) { const r = ad.mtOffer(o.id, 'negotiate'); const again = ad.getMyTeam().offers.find((x) => x.id === o.id); if (!again) { n++; continue; } cur = again; }
    last = cur.salary >= v.salary * 0.95 ? ad.mtOffer(cur.id, 'accept') : ad.mtOffer(cur.id, 'decline'); n++; if (last.ok && cur.kind === 'contract') break;
  }
  return { ok: n > 0, message: last.message || `Handled ${n} offer(s).` };
}
// is the routine runnable right now? -> { ok, reason, cost, pid }
export function check(ad, def, floor) {
  const s = ad.s; if (s.prison) return { ok: false, reason: 'Not in prison' };
  if (def.k) { try { const c = CUSTOM[def.k](ad, def, floor ?? ensure(ad.s).floor); return c.ok ? { ok: true, cost: c.cost || 0, who: c.who, custom: c } : { ok: false, reason: c.reason }; } catch (e) { return { ok: false, reason: 'Not available' }; } }
  if (def.q) {
    const q = ad.getQuickActions('skills').actions.find((a) => a.id === def.q) || ad.getQuickActions('work').actions.find((a) => a.id === def.q);
    if (!q) return { ok: false, reason: 'Not available' };
    return q.disabled ? { ok: false, reason: q.done ? 'Already done this year' : q.reason || 'Not available' } : { ok: true, cost: 0 };
  }
  if (def.v) { if (s.age < 10) return { ok: false, reason: 'Service starts at 10' }; return s.acted.volunteer_hrs ? { ok: false, reason: 'Already done this year' } : { ok: true, cost: 0 }; }
  const p = target(s, def); if (!p) return { ok: false, reason: def.who === 'partner' ? 'No partner or spouse' : 'Nobody to see' };
  const a = interactionOf(p.rel, def.i); if (!a || !P.interactionsFor(s, p).some((i) => i.id === def.i)) return { ok: false, reason: 'Not available' };
  if (s.acted['p' + p.id + def.i]) return { ok: false, reason: 'Already done this year' };
  return { ok: true, cost: a.cost || 0, pid: p.id, who: p.first };
}
function runOne(ad, def, floor) {
  const s = ad.s, c = check(ad, def, floor);
  if (!c.ok) return { id: def.id, label: def.label, icon: def.icon, ran: false, reason: c.reason };
  if (c.cost && s.cash - c.cost < floor) return { id: def.id, label: def.label, icon: def.icon, ran: false, reason: `Would drop cash below your ${money(floor)} floor` };
  const before = s.cash; let r;
  if (def.k) r = c.custom.run(); else if (def.q) r = ad.quickAction(def.q); else if (def.v) r = ad.volunteerHours(); else r = ad.interact(c.pid, def.i);
  return { id: def.id, label: def.label, icon: def.icon, ran: !!r.ok, who: c.who || null, cost: Math.max(0, Math.round(before - s.cash)), msg: r.message || '', reason: r.ok ? '' : r.message || 'Failed' };
}

// ---- safety stops ----
export const SOFT = ['floor', 'illness', 'burnout', 'crisis'];
export const SAFETY = ['bankruptcy', 'dead', 'event', 'prison', 'illness', 'floor', 'crisis'];
export function safetyBefore(s, floor) {
  if (s.pending && s.pending[0] && s.pending[0].kind === 'bankruptcy') { const a = Bk.autoAnswer(s, ensure(s).bankruptcy || 'pause'); if (!a) return { stop: true, kind: 'bankruptcy', reason: 'You cannot pay your bills. Open the bankruptcy popup: take a loan, sell things or declare bankruptcy.' }; }
  if (!s.alive) return { stop: true, kind: 'dead', reason: 'You have died.' };
  if (s.pending && s.pending.length) return { stop: true, kind: 'event', reason: 'A choice is waiting for you.' };
  if (s.prison) return { stop: true, kind: 'prison', reason: 'You are in prison.' };
  if (s.league && s.league.finals && !s.league.finals.done && false) return null;
  if (s.diseases && s.diseases.length) return { stop: true, kind: 'illness', reason: 'You are ill (' + s.diseases.length + ' condition' + (s.diseases.length > 1 ? 's' : '') + ').' };
  if (s.stats.stress >= 90) return { stop: true, kind: 'burnout', reason: `You are burned out (stress ${Math.round(s.stats.stress)}). Open Time & Stress and cut hours or take a break.` };
  if (s.stats.health < 25) return { stop: true, kind: 'crisis', reason: `Your health is critical (${Math.round(s.stats.health)}).` };
  if (s.cash < floor) return { stop: true, kind: 'floor', reason: `Cash ${money(s.cash)} is below your ${money(floor)} floor.` };
  return null;
}
// what happened during the year that should pause the autopilot (compare snapshots)
export const snapshot = (s) => ({ age: Math.floor(s.age), cash: s.cash, debt: s.debt, stats: { ...s.stats }, job: s.job ? s.job.id : null, diseases: (s.diseases || []).length, prison: !!s.prison, partner: P.partnerOf(s) ? P.partnerOf(s).id : null, logSeq: s.logSeq || 0, online: ((s.stream && s.stream.bans) || 0) + ((s.infl && s.infl.cancelled) || 0) });
export function safetyAfter(s, a, b, floor) {
  const out = [];
  if (!s.alive) out.push({ kind: 'dead', reason: 'You died.' });
  if (s.pending && s.pending.length) out.push({ kind: 'event', reason: 'A big event or choice came up.' });
  if (b.diseases > a.diseases) out.push({ kind: 'illness', reason: 'You fell ill.' });
  if (!a.prison && b.prison) out.push({ kind: 'prison', reason: 'You were arrested.' });
  if (a.job && !b.job) out.push({ kind: 'crisis', reason: 'You lost your job.' });
  if (a.partner && b.partner !== a.partner) out.push({ kind: 'crisis', reason: 'Your partner is gone.' });
  if (b.online > a.online) out.push({ kind: 'crisis', reason: 'Your channel was banned or you were cancelled.' });
  if (a.stats.health - b.stats.health >= 20 || b.stats.health < 25) out.push({ kind: 'crisis', reason: 'Your health dropped sharply.' });
  if (s.cash < floor && s.alive) out.push({ kind: 'floor', reason: `Cash fell below your ${money(floor)} floor.` });
  return out;
}

// ---- catalog / status for the UI ----
export function status(ad) {
  const s = ad.s, A = ensure(s), un = unlocked();
  const routines = allRoutines().map((def) => { const c = s.alive ? check(ad, def) : { ok: false, reason: 'Not alive' }; return { id: def.id, sec: sectionOf(def.id), icon: def.icon, label: def.label, cat: def.cat || '', choices: def.choices || null, choice: (A.actChoice || {})[def.id] | 0, desc: def.desc, selected: A.routines.includes(def.id), available: c.ok, reason: c.reason || '', cost: c.cost || 0 }; });
  const safe = safetyBefore(s, A.floor);
  return { pages: s.alive ? pageStatus(ad) : [], bankruptcy: A.bankruptcy || 'pause', passion: A.passion || null, socialPlan: A.socialPlan || 'safe', streamPlan: A.streamPlan || 'steady', mediaPlan: A.mediaPlan || 'steady', unlocked: un, price: 5.99, on: !!A.on && un, wantsOn: !!A.on, routines, floor: A.floor, selected: [...A.routines], sections: SECTIONS.map((x) => ({ id: x.id, icon: x.icon, label: x.label })).concat(ROUTINES.some((r) => sectionOf(r.id) === 'other') ? [{ id: 'other', icon: '⚙️', label: 'Other' }] : []), safety: safe, last: A.last, skipRemaining: A.skipRemaining || 0, maxSkip: MAX_SKIP, nextAge: Math.floor(s.age) + 1 };
}
export function configure(s, o = {}) {
  const A = ensure(s);
  if (o.routines) A.routines = o.routines.filter((id, i, arr) => routineDef(id) && arr.indexOf(id) === i);
  if (o.floor != null) A.floor = Math.max(0, Math.min(1e9, Math.round(Number(o.floor) || 0)));
  if (o.on != null) A.on = !!o.on;
  if (o.bankruptcy !== undefined) A.bankruptcy = ['loan', 'sell'].includes(o.bankruptcy) ? o.bankruptcy : 'pause';
  if (o.mtStyle !== undefined) A.mtStyle = o.mtStyle ? String(o.mtStyle) : null;
  if (o.passion !== undefined) A.passion = o.passion ? String(o.passion) : null;
  if (o.streamPlan !== undefined) A.streamPlan = o.streamPlan ? String(o.streamPlan) : null;
  if (o.mediaPlan !== undefined) A.mediaPlan = o.mediaPlan ? String(o.mediaPlan) : null;
  if (o.socialPlan !== undefined) A.socialPlan = o.socialPlan ? String(o.socialPlan) : null;
  return A;
}

// ---- one year of autopilot: routines -> age -> summary ----
// ad = EngineAdapter. opts.routines overrides the saved selection (skip-ahead). Returns { ran, skipped, stopBefore, stops, summary, age result }.

// ---------- "Autopilot this page": generic per-page locked settings ----------
// Each page registers snap(ad) (read the settings currently chosen on the page, null = page not usable), sum(locked) (text) and apply(ad, locked)
// (same shape as a CUSTOM routine: {ok, reason, cost, who, run}); apply reuses the SAME adapter calls as the manual UI. Turning a page on stores the snapshot
// in s.auto.pages[id] = { on, locked, since }; playYear re-applies every enabled page each turn after the routines, behind the same safety stops and cash floor.
const planName = (ad, id) => { const o = ad.getSocial().postPlan.options.find((x) => x.id === id); return o ? o.name : id; };
export const PAGES = {
  social: { section: 'hobbies', icon: '📱', label: 'Social media', snap(ad) { const st = ad.getSocial(); return st.locked || !st.platforms.some((p) => p.open) ? null : { plan: st.postPlan.current || st.postPlan.effective }; }, sum: (ad, l) => `post plan: ${planName(ad, l.plan)}`,
    apply(ad, l) { const st = ad.getSocial(); if (!st.postPlan.needed) return { ok: false, reason: 'Plan already chosen this year' }; return { ok: true, cost: 0, who: planName(ad, l.plan), run: () => ad.setPostPlan(l.plan) }; } },
  passions: { section: 'hobbies', icon: '🔥', label: 'Passions', snap(ad) { const p = ad.getPassions(); return p.locked || !p.active.length ? null : { ids: p.active.map((a) => a.id) }; }, sum: (ad) => { const p = ad.getPassions(), live = p.active.filter((a) => !a.full); return live.length ? 'practise ' + live.map((a) => a.name).join(', ') + ' (whichever is furthest from mastery, once a year)' : 'nothing to practise right now (no open passion)'; },
    // follows the passions you have NOW (not the ones you had when you locked it), lowest meter first
    apply(ad) { const A = ensure(ad.s), keep = A.passion, p = ad.getPassions(), live = p.active.filter((a) => !a.full && !a.practiced).sort((x, y) => x.meter - y.meter); if (!live.length) return { ok: false, message: 'No open passion to practise' }; A.passion = live[0].id; try { return CUSTOM.passion_practice(ad); } finally { A.passion = keep; } } },
  school: { section: 'school', icon: '🎓', label: 'School', snap(ad) { const a = ad.getQuickActions('skills').actions.find((x) => x.id === 'study'); return ad.s.school && a ? { study: true } : null; }, sum: () => 'try harder in school every year',
    apply: (ad) => check(ad, routineDef('study')).ok ? { ok: true, cost: 0, run: () => ad.quickAction('study') } : { ok: false, reason: check(ad, routineDef('study')).reason } },
  job: { section: 'job', icon: '💼', label: 'Job', snap: (ad) => (ad.s.job ? { job: ad.s.job.id } : null), sum: () => 'work harder every year',
    apply: (ad) => { const c = check(ad, routineDef('workharder')); return c.ok ? { ok: true, cost: 0, run: () => ad.quickAction('workharder') } : { ok: false, reason: c.reason }; } },
  racing: { section: 'hobbies', icon: '🏎️', label: 'Racing', snap(ad) { const st = ad.getRacing(); return st.career || st.team ? { strategy: st.team ? st.team.strategy : null, career: !!st.career, team: !!st.team } : null; }, sum: (ad, l) => [l.career && 'train + race career', l.team && 'team strategy ' + l.strategy].filter(Boolean).join(', '),
    apply(ad, l) { const st = ad.getRacing(), steps = [];
      if (st.team && l.strategy && st.team.strategy !== l.strategy) steps.push(() => ad.rcAction('strategy', l.strategy));
      if (st.career) { const c = CUSTOM.racing_train(ad); if (c.ok) steps.push(c.run); }
      const r = CUSTOM.racing_race(ad); if (r.ok) steps.push(r.run);
      if (!steps.length) return { ok: false, reason: 'Nothing to do this year' }; return { ok: true, cost: 0, run: () => { let last = { ok: true, message: '' }; for (const f of steps) last = f(); return last; } }; } },
  prodco: { section: 'business', icon: '🎬', label: 'Production companies', snap(ad) { const l = ad.getProdCos ? null : null; const owned = ['music', 'film', 'tv', 'game'].filter((m) => ad.s.prod && ad.s.prod.cos[m]); return owned.length ? { media: owned, plan: ensure(ad.s).mediaPlan || 'steady' } : null; }, sum: (ad, l) => 'strategy ' + (l.plan || 'steady') + ', greenlight ' + l.media.join(', '),
    apply(ad, l) { for (const m of l.media) if (ad.s.prod && ad.s.prod.cos[m] && !ad.s.prod.cos[m].strategy) ad.setMediaPlan(m, l.plan || 'steady'); const defs = l.media.map((m) => routineDef('prod_' + m)).filter(Boolean), ok = defs.map((d) => check(ad, d)).filter((c) => c.ok); if (!ok.length) return { ok: false, reason: 'No company can greenlight now' }; return { ok: true, cost: ok.reduce((a, c) => a + (c.cost || 0), 0), run: () => { let last = { ok: false, message: '' }; for (const d of defs) { const c = check(ad, d); if (c.ok) last = c.custom.run(); } return last; } }; } },
  brand: { section: 'business', icon: '👗', label: 'Clothing brand', snap(ad) { const b = ad.getBrand().brand; return b ? { policy: JSON.parse(JSON.stringify(b.policy)), plans: Object.fromEntries(b.plans.filter((p) => p.plan).map((p) => [p.id, JSON.parse(JSON.stringify(p.plan))])) } : null; }, sum: (ad, l) => 'launch every collection (spend ' + l.policy.spend + ', marketing ' + l.policy.market + ', ' + l.policy.volume + ' run)',
    apply(ad, l) { const st = ad.getBrand(), b = st.brand; if (!b) return { ok: false, reason: 'No brand' }; if (!b.canSeason) return { ok: false, reason: 'All seasons launched' }; const sn = b.plans.find((p) => !p.done), e = ad.getBrandEstimate(sn.id); return { ok: true, cost: e.designCost + e.marketCost + e.productionCost, run: () => { ad.brandAction('policy', l.policy); for (const [id, pl] of Object.entries(l.plans)) if (!b.plans.find((p) => p.id === id).done) ad.brandAction('plan', id, pl); return ad.brandAction('launchAll'); } }; } },
  farm: { section: 'business', icon: '🌾', label: 'Farm / ranch', snap(ad) { const f = ad.getFarm().farm; return f ? { insured: f.insured, autoSell: f.autoSell, hire: true } : null; }, sum: (ad, l) => 'staff up, ' + (l.insured ? 'insured, ' : '') + (l.autoSell ? 'sell to the best offer' : 'keep stock'),
    apply(ad, l) { const f = ad.getFarm().farm; if (!f) return { ok: false, reason: 'No farm' }; return { ok: true, cost: 0, run: () => { let r = { ok: true, message: '' }; if (f.insured !== l.insured) r = ad.farmAction('insurance', l.insured); if (f.autoSell !== l.autoSell) r = ad.farmAction('autoSell', l.autoSell); const h = CUSTOM.farm_staff(ad); if (h.ok) r = h.run(); if (l.autoSell) { const sl = CUSTOM.farm_sell(ad); if (sl.ok) r = sl.run(); } return r; } }; } },
  advisor: { section: 'business', icon: '💼', label: 'Investment advisor', snap(ad) { const a = ad.getAdvisor(); return a.has && a.plan ? { plan: JSON.parse(JSON.stringify(a.plan)), advisor: a.advisor ? a.advisor.name : null } : null; }, sum: (ad, l) => 'invest ' + (l.plan.mode === 'pct' ? l.plan.value + '% of income' : fmtMoney(l.plan.value) + '/yr') + ' into ' + l.plan.target,
    apply(ad, l) { const a = ad.getAdvisor(); if (!a.has) return { ok: false, reason: 'No portfolio' }; const needHire = !a.advisor, diff = JSON.stringify(a.plan) !== JSON.stringify(l.plan); if (!needHire && !diff) return { ok: false, reason: 'Settings already in place' }; return { ok: true, cost: 0, run: () => { let r = { ok: true, message: '' }; if (needHire) { const h = CUSTOM.advisor_hire(ad); if (h.ok) r = h.run(); } if (diff) r = ad.advisorAction('plan', l.plan); return r; } }; } },
  streaming: { section: 'hobbies', icon: '📡', label: 'Live streaming', snap(ad) { const st = ad.s.stream; return st && st.active ? { plan: ensure(ad.s).streamPlan || 'steady' } : null; }, sum: (ad, l) => 'strategy ' + l.plan,
    apply(ad, l) { const st = ad.getStreamer(); if (!st.active) return { ok: false, reason: 'Not streaming' }; if (!st.plan.needed) return { ok: false, reason: 'Strategy already chosen this year' }; return { ok: true, cost: 0, run: () => ad.setStreamPlan(l.plan) }; } },
  coaching: { section: 'job', icon: '🏆', label: 'Coaching', snap(ad) { const c = ad.s.coach; return c && c.active ? { style: c.style, training: c.training, mode: c.mode || 'auto', head: c.role === 'head' } : null; }, sum: (ad, l) => 'style ' + l.style + ', training ' + l.training + ', play the season',
    apply(ad, l) { const c = ad.s.coach; if (!c || !c.active) return { ok: false, reason: 'No coaching job' }; const st = ad.getCoaching(), diff = l.head && c.role === 'head' && (c.style !== l.style || c.training !== l.training), open = st.season && !st.season.done; if (!diff && !open) return { ok: false, reason: 'Nothing to do this year' };
      return { ok: true, cost: 0, run: () => { let r = { ok: true, message: '' }; if (diff) r = ad.coachAction('plan', l.style, l.training); for (let i = 0; i < 4; i++) { const s2 = ad.getCoaching().season; if (!s2 || s2.done) break; r = ad.coachAction('quarter', l.style); if (!r.ok) break; } return r; } }; } },
  politics: { section: 'job', icon: '🏛️', label: 'Politics', snap(ad) { const p = ad.s.pol; if (!p) return null; const c = p.campaign; return c || p.office ? { platform: c ? c.platform : null, govern: p.govStyle || 'popular', campaign: !!c, office: !!p.office } : null; }, sum: (ad, l) => [l.campaign && 'platform ' + (l.platform || 'none'), l.office && 'govern: ' + l.govern].filter(Boolean).join(', '),
    apply(ad, l) { const p = ad.s.pol; if (!p) return { ok: false, reason: 'No politics' }; const steps = []; if (p.campaign && l.platform && p.campaign.platform !== l.platform) steps.push(() => ad.politicsAction('platform', l.platform)); if (p.office && !(p.acted && p.acted.govern)) steps.push(() => ad.politicsAction('govern', l.govern)); if (!steps.length) return { ok: false, reason: 'Settings already in place' };
      return { ok: true, cost: 0, run: () => { let r = { ok: true, message: '' }; for (const f of steps) r = f(); return r; } }; } },
};
const frPage = (es) => ({ section: 'business', icon: es ? '🎮' : '🏟️', label: es ? 'Esports Teams' : 'Own a Team', snap(ad) { const P = ad.s.fr, ts = ((P && P.teams && P.teams.length ? P.teams : (P && P.team ? [P.team] : [])).filter((t) => !!isEs(t.sport) === es)); if (!ts.length) return null; const o = {}; for (const t of ts) o[t.id] = { policy: JSON.parse(JSON.stringify(t.policy || {})), style: t.style || null, focus: t.focus || null }; return { teams: o }; }, sum: (ad, l) => Object.keys(l.teams || {}).length + ' team(s): policy, style, focus',
  apply(ad, l) { const P = ad.s.fr, ts = ((P && P.teams && P.teams.length ? P.teams : (P && P.team ? [P.team] : [])).filter((t) => !!isEs(t.sport) === es)); if (!ts.length) return { ok: false, reason: 'No team' }; const plan = []; for (const t of ts) { const w = (l.teams || {})[t.id]; if (!w) continue; const dP = JSON.stringify(t.policy || {}) !== JSON.stringify(w.policy), dS = w.style && t.style !== w.style, dF = w.focus && t.focus !== w.focus; if (dP || dS || dF) plan.push({ id: t.id, w, dP, dS, dF }); } if (!plan.length) return { ok: false, reason: 'Settings already in place' };
    return { ok: true, cost: 0, run: () => { const keep = P.team && P.team.id; let r = { ok: true, message: '' }; for (const x of plan) { ad.frAction('switch', x.id); if (x.dP) r = ad.frAction('policy', x.w.policy); if (x.dS) r = ad.frAction('style', x.w.style); if (x.dF) r = ad.frAction('focus', x.w.focus); } if (keep) ad.frAction('switch', keep); return r; } }; } });
PAGES.myteam = { section: 'sports', icon: '🏟️', label: 'My Team', snap(ad) { const v = ad.getMyTeam(); return v.onTeam && !v.limbo ? { style: v.style } : v.onTeam ? { style: 'balanced' } : null; }, sum: (ad, l) => `train my lowest 3 skills, style ${l.style}, handle offers`,
  apply(ad, l) { const A = ensure(ad.s), keep = A.mtStyle; A.mtStyle = l.style; try { const steps = ['mt_train', 'mt_style', 'mt_offers'].map((k) => CUSTOM[k](ad)).filter((c) => c.ok); if (!steps.length) return { ok: false, reason: 'Nothing to do this year' }; return { ok: true, cost: steps.reduce((a, c) => a + (c.cost || 0), 0), run: () => { let r = { ok: true, message: '' }; for (const c of steps) r = c.run(); return r; } }; } finally { A.mtStyle = keep; } } };
PAGES.franchise = frPage(false); PAGES.esports = frPage(true);

// ---- per-account autopilot (Social > account > Autopilot tab). Each account is a page 'social_<pid>' in the generic page-lock registry. ----
export const ACCT_DEFAULT = { posts: 2, tone: 'safe', sponsor: true, reply: true, collab: false, appeal: true, appealStyle: 1, stream: false };
export const ACCT_PLATS = [['chirpr', 'Chirpr'], ['snapfolio', 'Snapfolio'], ['clipwave', 'Clipwave'], ['vidnest', 'VidNest'], ['liveloop', 'LiveLoop'], ['kinbook', 'Kinbook'], ['velvet', 'Velvet Circle'], ['podcastle', 'Podcastle']];
export const acctSettings = (s, pid) => ({ ...ACCT_DEFAULT, ...((ensure(s).acct || {})[pid] || {}) });
const acctSum = (l) => `${l.posts} post${l.posts === 1 ? '' : 's'}/yr (${l.tone})` + (l.reply ? ', replies' : '') + (l.collab ? ', collabs' : '') + (l.sponsor ? ', sponsors' : '') + (l.appeal ? ', appeal if banned' : '') + (l.stream ? ', streams' : '');
function pickPost(ad, p, tone) { const fits = { great: 0, good: 1, ok: 2 }, ok = p.posts.filter((x) => !x.locked && (x.tag === 'Safe' || (tone === 'spicy' && x.tag === 'Spicy'))); return ok.sort((x, y) => (fits[x.fit] ?? 3) - (fits[y.fit] ?? 3) || (tone === 'spicy' ? (y.tag === 'Spicy') - (x.tag === 'Spicy') : 0))[0]; }
function acctApply(ad, pid, l) {
  const p = ad.getPlatform(pid); if (!p || !p.open) return { ok: false, reason: 'No account' }; if (p.status !== 'active') return { ok: false, reason: 'Account is ' + p.status };
  const todo = Math.min(l.posts, p.postsLeft), canReply = l.reply && !p.done.reply, canCollab = l.collab && !p.done.collab, deal = l.sponsor && p.canSponsor && p.deals.length < p.maxDeals && p.offers.some((o) => o.fit !== 'poor');
  const canStream = l.stream && pid === 'vidnest' && CUSTOM.stream_start(ad).ok;
  if (!todo && !canReply && !canCollab && !deal && !canStream) return { ok: false, reason: p.postsLeft ? 'Nothing to do this year' : 'Post limit reached (5/5)' };
  return { ok: true, cost: 0, run: () => { let last = { ok: true, message: '' }; for (let i = 0; i < todo; i++) { const q = ad.getPlatform(pid); if (!q.postsLeft) break; const post = pickPost(ad, q, l.tone); if (!post) break; last = ad.socialAction(pid, 'post', post.id); if (!last.ok) break; }
    if (canReply) last = ad.socialAction(pid, 'reply'); if (canCollab) last = ad.socialAction(pid, 'collab');
    if (deal) { const q = ad.getPlatform(pid), o = q.offers.filter((x) => x.fit !== 'poor').sort((a, b) => b.pay - a.pay)[0]; if (o && q.deals.length < q.maxDeals) last = ad.socialAction(pid, 'accept', o.id); }
    if (canStream) last = CUSTOM.stream_start(ad).run(); return last; } };
}
for (const [pid, name] of ACCT_PLATS) PAGES['social_' + pid] = { section: 'hobbies', icon: '📱', label: name + ' account', hideIfOff: true, acct: pid,
  snap(ad) { const p = ad.getPlatform(pid); return p && p.open ? { ...acctSettings(ad.s, pid) } : null; }, sum: (ad, l) => acctSum({ ...ACCT_DEFAULT, ...l }), apply: (ad, l) => acctApply(ad, pid, { ...ACCT_DEFAULT, ...l }) };
// appeal-if-banned: answers an open appeal prompt with the account's chosen style (same socialPrompt call as the popup)
function autoAppeal(ad) { const s = ad.s, so = s.social, A = ensure(s); const pr = so && so.prompt; if (!pr || pr.kind !== 'appeal') return null; const st = A.pages['social_' + pr.pid]; if (!st || !st.on || !(st.locked && st.locked.appeal)) return null; const r = ad.socialPrompt(Math.max(0, Math.min(3, st.locked.appealStyle | 0))); return { id: 'page_social_' + pr.pid + '_appeal', icon: '⚖️', label: 'Appeal the ban', ran: !!r.ok, cost: 0, message: r.message }; }
export function setAccount(ad, pid, patch) {
  const A = ensure(ad.s), cur = acctSettings(ad.s, pid); const n = { ...cur }; patch = patch || {};
  if (patch.posts != null) n.posts = Math.max(0, Math.min(5, Math.round(Number(patch.posts)))); if (patch.tone) n.tone = patch.tone === 'spicy' ? 'spicy' : 'safe'; for (const k of ['sponsor', 'reply', 'collab', 'appeal', 'stream']) if (patch[k] != null) n[k] = !!patch[k]; if (patch.appealStyle != null) n.appealStyle = Math.max(0, Math.min(3, Math.round(Number(patch.appealStyle))));
  A.acct = A.acct || {}; A.acct[pid] = n; const st = A.pages['social_' + pid]; if (st && st.on) st.locked = { ...n };
  if (patch.plan) { A.socialPlan = patch.plan; const sp = A.pages.social; if (sp && sp.on && sp.locked) sp.locked.plan = patch.plan; }
  return { ok: true, msg: 'Autopilot settings saved.', settings: n };
}
export const registerPage = (id, def) => { PAGES[id] = def; };
CUSTOM.__page = (ad, def) => { const A = ensure(ad.s), pg = PAGES[def.pageId], st = A.pages[def.pageId]; if (!pg || !st || !st.on) return { ok: false, reason: 'Off' }; return pg.apply(ad, st.locked); };
export function pageStatus(ad) { const A = ensure(ad.s); return Object.entries(PAGES).filter(([id, pg]) => !pg.hideIfOff || (A.pages[id] && A.pages[id].on) || (() => { try { return !!pg.snap(ad); } catch (e) { return false; } })()).map(([id, pg]) => { let now = null; try { now = ad.s.alive ? pg.snap(ad) : null; } catch (e) { now = null; } const st = A.pages[id]; return { id, section: pg.section, icon: pg.icon, label: pg.label, on: !!(st && st.on), available: !!now || !!(st && st.on), summary: (() => { try { return st && st.on ? pg.sum(ad, st.locked) : now ? pg.sum(ad, now) : 'Not set up yet'; } catch (e) { return 'Not set up yet'; } })(), since: st && st.on ? st.since : null }; }); }
export function setPage(ad, id, on) { const A = ensure(ad.s), pg = PAGES[id]; if (!pg) return { ok: false, msg: 'Unknown page.' }; if (!on) { if (A.pages[id]) A.pages[id].on = false; return { ok: true, msg: pg.label + ': page autopilot off.' }; }
  let now = null; try { now = pg.snap(ad); } catch (e) { now = null; } if (!now) return { ok: false, msg: `Set up ${pg.label.toLowerCase()} first.` }; A.pages[id] = { on: true, locked: JSON.parse(JSON.stringify(now)), since: Math.floor(ad.s.age) }; return { ok: true, msg: `${pg.label}: locked in (${pg.sum(ad, now)}). It re-applies every year.` }; }
export async function playYear(ad, { routines, floor } = {}) {
  const s = ad.s, A = ensure(s), fl = floor ?? A.floor, ids = routines || A.routines;
  const before = snapshot(s), ran = [], skipped = [];
  const stopBefore = safetyBefore(s, fl);
  // soft pauses (cash floor, illness, burnout, health crisis) still run the FREE everyday basics (train, read, study, work harder...):
  // they cost nothing and the player could do them by hand in the same state, so a pause must not leave them undone (7c1 reliability fix)
  const soft = stopBefore && SOFT.includes(stopBefore.kind);
  if (soft) for (const id of ids) { const d = routineDef(id); if (!d || !(d.q || d.v || d.i)) continue; const c = check(ad, d, fl); if (!c.ok || c.cost) continue; const r = runOne(ad, d, fl); (r.ran ? ran : skipped).push(r); }
  if (!stopBefore) for (const id of ids) { const d = routineDef(id); if (!d) continue; const r = runOne(ad, d, fl); (r.ran ? ran : skipped).push(r); }
  if (!stopBefore) { const ap = autoAppeal(ad); if (ap) (ap.ran ? ran : skipped).push(ap); }
  // locked page settings re-apply every year (same safety stops, same cash floor)
  if (!stopBefore) for (const [pid, st] of Object.entries(A.pages)) { if (!st.on || !PAGES[pid]) continue; const d = { id: 'page_' + pid, icon: PAGES[pid].icon, label: 'This page: ' + PAGES[pid].label, k: '__page', pageId: pid }; const r = runOne(ad, d, fl); (r.ran ? ran : skipped).push(r); }
  if (!stopBefore && s.social && ad.getSocial().postPlan.needed) ad.setPostPlan(A.socialPlan || 'safe'); // autopilot years always run a plan: the preferred one, default Safe
  if (!stopBefore && s.stream && ad.getStreamer().plan.needed) ad.setStreamPlan(A.streamPlan || 'steady');
  if (!stopBefore && s.prod) for (const m of ['music', 'film', 'tv', 'game']) if (s.prod.cos[m] && !s.prod.cos[m].strategy) ad.setMediaPlan(m, A.mediaPlan || 'steady');
  return { before, ran, skipped, stopBefore, floor: fl };
}
export function summarize(s, pre, ageRes, floor) {
  const b = snapshot(s), d = (k) => Math.round(b.stats[k] - pre.before.stats[k]);
  const stops = ageRes && ageRes.noAge ? [] : safetyAfter(s, pre.before, b, floor);
  const line = pre.ran.length ? 'Autopilot: ' + pre.ran.map((r) => r.label.toLowerCase() + (r.who ? ' (' + r.who + ')' : '')).join(', ') + '.' : pre.stopBefore ? 'Autopilot paused: ' + pre.stopBefore.reason : 'Autopilot had nothing to do this year.';
  return { fromAge: pre.before.age, toAge: b.age, ran: pre.ran.map((r) => ({ id: r.id, label: r.label, icon: r.icon, who: r.who, cost: r.cost, msg: r.msg })), skipped: pre.skipped.map((r) => ({ id: r.id, label: r.label, icon: r.icon, reason: r.reason })),
    paused: pre.stopBefore ? { kind: pre.stopBefore.kind, reason: pre.stopBefore.reason } : null, stops, cashBefore: Math.round(pre.before.cash), cashAfter: Math.round(s.cash), cashDelta: Math.round(s.cash - pre.before.cash),
    stats: { health: d('health'), happiness: d('happiness'), smarts: d('smarts'), looks: d('looks'), fame: d('fame') }, spent: pre.ran.reduce((t, r) => t + (r.cost || 0), 0), line, died: !s.alive };
}
