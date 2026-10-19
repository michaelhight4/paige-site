// Core game state and the turn loop.
import { D, loadData } from './data.js';
import { rnd, rint, pick, gauss, chance, clamp, wpick } from './rng.js';
import { log, earn, spend, addStat, STATS, fill } from './core.js';
import * as Hw from './hardware.js';
import * as Fr from './franchise.js';
import * as Rc from './racing.js';
import * as Market from './market.js';
import * as Biz from './business.js';
import * as Plus from './bizplus.js';
import * as Sports from './sports.js';
import * as P from './people.js';
import * as Ev from './events.js';
import * as Health from './health.js';
import * as Legacy from './legacy.js';
import * as Crime from './crime.js';
import * as SS from './schoolsports.js';
import * as Ribbons from './ribbons.js';
import * as Journal from './journal.js';
import * as Slice from './slice_bridge.js';
import * as Skills from './skills.js';
import * as Passions from './passions.js';
import * as Scholar from './scholarships.js';
import * as Premium from './premium.js';
import * as PFx from './premium_fx.js';
import * as Char from './character.js';
import * as Carry from './schoolcarry.js';
import * as Online from './online.js';
import * as Social from './social.js';
import * as Politics from './politics.js';
import * as Prod from './prodco.js';
import * as Coach from './coaching.js';
import { ALLSTATS } from './core.js';
export { Social, Politics, Coach, Prod, Online, Skills, Passions, Scholar, Ev, P as People, Health, Legacy, Crime, SS as SchoolSports, Ribbons };
export const applyFx = Ev.applyFx, pendingCard = Ev.pendingCard, resolveCard = Ev.resolveCard;

export { loadData, D };
export const STEPS = { yearly: 1, half: 0.5, quarter: 0.25 };
export const LIVING_COST = 16000, DEBT_RATE = 0.07, TAX = 0.22;

export function newGame({ name = null, last = null, gender = null, look = null, seed = Date.now() % 2147483647, sandbox = false, country = null } = {}) {
  const LF = D.life;
  const s = { v: 2, rs: seed | 0, name: name || 'You', age: 0, step: 1, alive: true, stats: {}, cash: 0, debt: 0, edu: 0, school: 'primary', college: null,
    job: null, assets: [], biz: [], hold: {}, nextId: 1, log: [], pending: [], report: [], acted: {}, history: [], sandbox, offers: [], fx: [], ending: null, flags: {}, turns: 0,
    people: [], cand: [], diseases: [], chain: [], evLast: {}, fit: 0, tally: Ribbons.newTally(), record: { sentences: 0, priors: 0 }, prison: null, fugitive: null, sport: null, pro: null,
    will: { mode: 'even', heir: null }, legacy: { gen: 1, gens: [] }, retired: false, yr: [] };
  const c = country ? LF.countries.find((x) => x.id === country) : pick(s, LF.countries); s.country = c.id; s.city = pick(s, c.cities); s.gender = pick(s, LF.genders); if (gender && LF.genders.includes(gender)) s.gender = gender;
  const nm = P.genName(s, s.country, s.gender); s.first = name || nm.first; s.last = last || nm.last; s.name = s.first + ' ' + s.last;
  s.stats = { health: rint(s, 60, 90), happiness: rint(s, 60, 90), smarts: rint(s, 25, 75), looks: rint(s, 25, 75), fame: 0, karma: 50, crazy: rint(s, 0, 30), stress: rint(s, 5, 25) };
  const startAge = sandbox ? LF.startAge.sandbox : LF.startAge.normal;
  s.birthYear = LF.startYear - startAge; s.age = startAge;
  Market.initMarket(s); Sports.initLeague(s);
  P.initFamily(s, startAge);
  if (sandbox) { s.edu = 2; s.school = null; s.stats.smarts = 70; s.cash = 50e6; for (let i = 0; i < 3; i++) P.makeFriend(s, 25 + rint(s, -3, 3)); }
  if (look) s.char = Char.createChar('me' + seed + s.name, look);
  P.refreshCandidates(s);
  Biz.refreshOffers(s);
  log(s, sandbox ? pick(s, LF.journal.sandboxStart) : fill(pick(s, LF.journal.born), { city: s.city, country: c.name, name: s.name }), 'life');
  PFx.applyStart(s);
  snap(s); return s;
}

export const netWorth = (s) => Legacy.netWorthOf(s);
function snap(s) { s.history.push([Math.round(s.age * 4) / 4, Math.round(netWorth(s).total)]); if (s.history.length > 400) s.history.shift(); }

export const setStep = (s, k) => { s.step = STEPS[k]; };
export const stageOf = (s) => (s.age < 5 ? 'infant' : s.school === 'primary' ? 'primary' : s.school === 'high' ? 'high' : s.school === 'college' ? 'college' : 'adult');

// ---- effects & events: see events.js (data/events.json) ----

// ---- actions (once each per turn) ----
export const ACTIONS = {
  gym: { name: 'Hit the gym ($300)', cost: 300, fx: { health: 4, looks: 1 } },
  study: { name: 'Study / read', cost: 0, fx: { smarts: 3, happiness: -1 } },
  social: { name: 'Socialize ($100)', cost: 100, fx: { happiness: 4 } },
  doctor: { name: 'Doctor visit ($800)', cost: 800, fx: { health: 6 } },
  cosmetic: { name: 'Cosmetic care ($5,000)', cost: 5000, fx: { looks: 5 } },
  work: { name: 'Work extra hard', cost: 0, fx: { happiness: -2 }, perf: 8, needsJob: true },
};
export function doAction(s, id) {
  const a = ACTIONS[id]; if (!a || s.acted[id] || s.cash < a.cost || (a.needsJob && !s.job)) return false;
  s.cash -= a.cost; applyFx(s, a.fx); if (a.perf) s.job.perf = clamp(s.job.perf + a.perf, 0, 100); s.acted[id] = 1; return true;
}

export function doActivity(s, id) {
  const a = D.life.activities.find((x) => x.id === id); if (!a || s.age < a.min || s.prison) return { ok: false, msg: 'Not available.' };
  if (a.special === 'doctor') return Health.doctorVisit(s);
  if (s.acted[id]) return { ok: false, msg: 'Already did that this turn.' }; if (a.needsJob && !s.job) return { ok: false, msg: 'Needs a job.' };
  if (a.cost && s.cash < a.cost) return { ok: false, msg: 'Cannot afford that.' };
  if (a.cost) s.cash -= a.cost; s.acted[id] = 1; applyFx(s, a.fx); if (a.fit) s.fit = Math.min(5, (s.fit || 0) + a.fit);
  const line = { gym: 'I went to the gym and lifted a tiny couch.', meditate: 'I meditated and thought about lunch.', library: 'I spent an afternoon at the library with a book I understood about half of.', vacation: 'I took a vacation and returned with a sunburn and a souvenir spoon.',
    cosmetic: 'I treated myself to some cosmetic care.', social: 'I socialized, loudly.', study: 'I studied. It was educational.', work: 'I worked extra hard and nobody said a word.', volunteer: 'I volunteered, which made me feel worthy for a week.' }[id];
  if (line) log(s, line, 'act'); return { ok: true, msg: line || '' };
}

// ---- school, career ----
export function eligibleCareers(s) {
  const busy = s.school === 'college' || s.school === 'primary';
  return D.careers.filter((c) => !busy && s.age >= c.minAge && s.edu >= c.edu && s.stats.smarts >= c.smarts && s.stats.looks >= (c.looks || 0)
    && (s.school !== 'high' || c.minAge <= 16)); // 16+ may take entry jobs while in high school
}
export function applyJob(s, id) {
  const c = eligibleCareers(s).find((x) => x.id === id); if (!c) return false;
  s.job = { id, level: 0, perf: 50, yrs: 0, lvlYrs: 0 }; s.retired = false; Skills.outcome(s, 'hired'); P.newCoworkers(s); log(s, `I was hired as a ${c.levels[0][0].toLowerCase()} (${c.name}).`, 'career'); return true;
}
export function quitJob(s) { if (s.job) { log(s, 'I quit my job and told nobody it was dramatic.', 'career'); s.job = null; P.newCoworkers(s); } }
export const salaryNow = (s) => { if (!s.job) return 0; const c = D.careers.find((x) => x.id === s.job.id); return c.levels[s.job.level][1] * (0.9 + 0.2 * s.job.perf / 100) * (1 + (s.job.raise || 0)) * (1 + Passions.perk(s, 'salary')); };
export function enrollCollege(s) { if (s.school === null && s.edu === 1 && s.age < 30) { s.school = 'college'; s.college = { yrs: 0 }; quitJob(s); if (s.carry) Carry.enter(s, 'college'); else if (s.sport) Carry.enter(s, 'college'); return true; } return false; }
export function repay(s, amt) { const x = Math.min(amt, s.cash, s.debt); s.cash -= x; s.debt -= x; return x; }

function lifeTick(s, dt) {
  const sq = Math.sqrt(dt), inPrison = !!s.prison;
  // school
  if (s.school === 'primary' && s.age >= 12) { s.school = 'high'; log(s, 'I started high school and was immediately lost.', 'school'); Carry.enter(s, 'high', { inYear: true }); }
  if (s.school === 'primary' || s.school === 'high') addStat(s, 'smarts', (1.2 + (s.acted.study ? 0 : 0)) * dt * (0.5 + s.stats.smarts / 100));
  if (s.school === 'high' && s.age >= 18) { s.school = null; s.edu = 1; log(s, 'I graduated high school.', 'school'); Carry.stash(s); s.pending.push({ kind: 'college' }); s.cash += 2000; }
  if (s.school === 'college') {
    if (!(s.sport && s.sport.scholarship)) s.debt += D.scholarData.collegeTuition * dt * Scholar.tuitionFactor(s); s.college.yrs += dt; addStat(s, 'smarts', 1.5 * dt);
    if (s.college.yrs >= 4 - 1e-9) { s.school = null; s.edu = 2; s.college = null; log(s, 'I graduated college.', 'school'); SS.onCollegeGraduate(s); }
  }
  // work
  if (s.job && !inPrison) {
    const c = D.careers.find((x) => x.id === s.job.id), j = s.job;
    j.perf = clamp(j.perf + ((s.stats.smarts - 50) / 40 + Skills.workBonus(s) + (s.stats.happiness - 50) / 60 + (s.stats.health - 50) / 80 + gauss(s) * 3) * dt - 1.5 * dt * (j.perf > 70 ? 1 : 0), 0, 100);
    j.yrs += dt; j.lvlYrs += dt; s.tally.jobYears += dt;
    const pay = salaryNow(s) * dt; earn(s, pay * (1 - (PFx.noTax() ? 0 : TAX)));
    const secH = c.sector ? s.market.sectors[c.sector].h : 50;
    if (secH < 25 && chance(s, 0.12 * dt)) { log(s, `I was laid off from my ${c.name} job amid a slump in the sector.`, 'career'); s.job = null; P.newCoworkers(s); }
    else if (j.lvlYrs >= 1 && j.level < c.levels.length - 1 && chance(s, clamp((j.perf - 55) / 100, 0, 0.45) * dt * (0.6 + secH / 100))) {
      j.level++; j.lvlYrs = 0; Skills.outcome(s, 'promoted'); log(s, `I was promoted to ${c.levels[j.level][0].toLowerCase()}.`, 'career');
    } else if (j.perf < 15 && chance(s, 0.3 * dt)) { log(s, 'I was fired for poor performance. The cake in the break room was not for me.', 'career'); Skills.outcome(s, 'fired'); s.job = null; P.newCoworkers(s); }
  }
  SS.proYear(s, dt);
  if (s.age >= 65 && !s.job && !inPrison && !s.pro) earn(s, 18000 * dt * (P.country(s).wealth > 0.8 ? 1 : 0.5)); // state pension
  // living costs, assets, debt
  if (s.age >= 18 && !inPrison) { const rent = s.assets.some((a) => a.kind === 'house') ? 0 : LIVING_COST; spend(s, (LIVING_COST * 0.5 + rent * 0.5) * dt); }
  for (const a of s.assets) {
    spend(s, a.upkeep * dt * (1 + Passions.perk(s, 'upkeep')));
    if (a.kind === 'house') a.value *= 1 + (0.03 + 0.08 * (s.market.sectors.realestate.h - 50) / 50) * dt;
    else a.value *= 1 - a.dep * dt;
    addStat(s, 'happiness', a.joy * 0.05 * dt);
  }
  if (s.debt > 0) {
    s.debt *= 1 + DEBT_RATE * dt;
    if (s.cash > 0 && s.school !== 'college') { const x = Math.min(s.cash * 0.25, s.debt); s.cash -= x; s.debt -= x; } // auto-pay 25% of cash
  }
  // stats drift (health: see health.js)
  addStat(s, 'looks', s.age > 30 ? -0.4 * dt : 0);
  addStat(s, 'happiness', (55 - s.stats.happiness) * 0.15 * dt + gauss(s) * 1.5 * sq + (s.cash > 100000 ? 0.5 : s.debt > 100000 ? -1 : 0) * dt);
  addStat(s, 'health', gauss(s) * 1.2 * sq + Skills.healthBonus(s) * 0.4 * dt + (s.age < 45 && s.stats.health < 80 ? (80 - s.stats.health) * 0.06 * dt : 0));
  addStat(s, 'stress', (20 + (s.job ? 10 : 0) + (s.debt > 100000 ? 10 : 0) - s.stats.stress) * 0.25 * dt + gauss(s) * 2 * sq);
  addStat(s, 'fame', -2 * dt * (s.stats.fame > 5 ? 1 : 0)); PFx.fameFloor(s); if (Math.floor(s.age) !== Math.floor(s.age - dt)) PFx.applyStart(s); addStat(s, 'karma', (50 - s.stats.karma) * 0.02 * dt); addStat(s, 'crazy', gauss(s) * 1 * sq);
  if (s.stats.happiness < 15) addStat(s, 'health', -1.5 * dt);
  s.tally.maxFame = Math.max(s.tally.maxFame, s.stats.fame); s.tally.maxSmarts = Math.max(s.tally.maxSmarts, s.stats.smarts);
}
export const die = (s, ...a) => Legacy.die(s, ...a);

export function takeTurn(s) {
  if (!s.alive) return false;
  if (s.pending.length) return false;
  if (s.league.finals && !s.league.finals.done) return false;
  const dt = s.step; s.report = []; s.acted = {}; s.turns++;
  const yrBefore = Math.floor(s.age); s.age = Math.round((s.age + dt) * 1000) / 1000;
  const newYear = Math.floor(s.age) > yrBefore;
  Slice.ensure(s);
  Market.tickMarket(s, dt);
  lifeTick(s, dt);
  Slice.tick(s, dt);
  Crime.tick(s, dt);
  Health.tick(s, dt);
  if (!s.alive) { snap(s); return true; }
  for (const b of s.biz) Biz.tickBiz(s, b, dt);
  Sports.tickLeague(s, dt);
  if (newYear) {
    Scholar.yearTick(s); Skills.yearTick(s); Passions.yearTick(s); Market.tickConsolesYear(s); Biz.refreshOffers(s); Plus.yearTick(s); P.yearTick(s); SS.yearTick(s); Slice.yearTick(s); Online.yearTick(s); Social.yearTick(s); Politics.yearTick(s); Coach.yearTick(s); Prod.yearTick(s); Fr.yearTick(s); Rc.yearTick(s);
    for (const b of s.biz) if (b.fame) b.fame = Math.max(0, b.fame - D.studio.balance.sensation.fameDecayPerYear);
    const para = Journal.yearParagraph(s); if (para) log(s, para, 'yearly');
  }
  Ev.draw(s, dt);
  snap(s);
  return true;
}

// ---- assets ----
export function buyAsset(s, id, financed = false) {
  const c = D.assetCatalog.find((x) => x.id === id); if (!c || s.age < 18) return false;
  const down = financed ? c.price * 0.2 : c.price; if (down > s.cash) return false;
  s.cash -= down; if (financed) s.debt += c.price - down;
  s.assets.push({ uid: s.nextId++, id, kind: c.kind, name: c.name, value: c.price, upkeep: c.upkeep, dep: c.dep, joy: c.joy });
  log(s, `Bought ${c.name}.`, 'asset'); return true;
}
export function sellAsset(s, uid) {
  const i = s.assets.findIndex((a) => a.uid === uid); if (i < 0) return false;
  const a = s.assets[i], v = a.value * 0.95; earn(s, v); s.assets.splice(i, 1); log(s, `Sold ${a.name} for ${Math.round(v).toLocaleString()}.`, 'asset'); return true;
}

// ---- save / load ----
// ---- save slots (2 lives) ----  keys: lifesim.slot.1 / lifesim.slot.2, lifesim.lastSlot; the old single save (lifesim.save.v2) migrates into slot 1.
export const SLOTS = [1, 2];
const LEGACY_KEY = 'lifesim.save.v2', SLOT_KEY = (n) => 'lifesim.slot.' + n, LAST_KEY = 'lifesim.lastSlot', META_KEY = (n) => 'lifesim.slotmeta.' + n;
const mem = {}; // fallback when localStorage is unavailable (node tests, private mode)
const ls = () => { try { return typeof localStorage !== 'undefined' && localStorage && typeof localStorage.getItem === 'function' ? localStorage : null; } catch (e) { return null; } };
const kget = (k) => { const l = ls(); try { if (l) return l.getItem(k); } catch (e) { /* fall through */ } return k in mem ? mem[k] : null; };
const kset = (k, v) => { const l = ls(); try { if (l) { l.setItem(k, v); return true; } } catch (e) { return false; } mem[k] = v; return true; };
const kdel = (k) => { const l = ls(); try { if (l) l.removeItem(k); } catch (e) { /* ignore */ } delete mem[k]; };
let activeSlot = 1;
export const currentSlot = () => activeSlot;
export const setSlot = (n) => { activeSlot = SLOTS.includes(n) ? n : 1; return activeSlot; };
export const lastSlot = () => { const n = Number(kget(LAST_KEY)); return SLOTS.includes(n) ? n : null; };
export const setLastSlot = (n) => { kset(LAST_KEY, String(n)); };
// move an existing single save into slot 1 (or slot 2 when slot 1 is taken); idempotent
export function migrateLegacy() {
  const t = kget(LEGACY_KEY); if (!t) return false;
  const to = !kget(SLOT_KEY(1)) ? 1 : !kget(SLOT_KEY(2)) ? 2 : null;
  if (to) { kset(SLOT_KEY(to), t); try { const g = JSON.parse(t); kset(META_KEY(to), JSON.stringify(slotMeta(g))); } catch (e) { /* meta is cosmetic */ } if (!lastSlot()) setLastSlot(to); kdel(LEGACY_KEY); return true; }
  return false;
}
export function slotMeta(s, headline) { return { name: s.name, age: Math.floor(s.age), alive: s.alive !== false, country: s.country, cash: Math.round(s.cash || 0), gen: (s.legacy && s.legacy.gen) || 1, headline: headline || null, savedAt: Date.now() }; }
// One auto-save + ONE backup per slot (lifesim.slot.N.bak). Before each overwrite the previous save is rotated into the backup if it still looks valid
// (a damaged main file never replaces a good backup). Load falls back to the backup when the main save is missing or corrupt and says so (takeLoadNote).
const BAK_KEY = (n) => 'lifesim.slot.' + n + '.bak', BAKMETA_KEY = (n) => 'lifesim.slotmeta.' + n + '.bak';
const looksValid = (t) => { if (typeof t !== 'string' || t.length < 20 || t[0] !== '{' || t[t.length - 1] !== '}') return false; try { const g = JSON.parse(t); return !!g && g.v === 2 && g.alive !== undefined; } catch (e) { return false; } };
let loadNote = null; export const takeLoadNote = () => { const n = loadNote; loadNote = null; return n; };
export const save = (s, slot = activeSlot, headline) => { try { const json = JSON.stringify(s), prev = kget(SLOT_KEY(slot)); if (prev && prev !== json && looksValid(prev)) { kset(BAK_KEY(slot), prev); const pm = kget(META_KEY(slot)); if (pm) kset(BAKMETA_KEY(slot), pm); } if (!kset(SLOT_KEY(slot), json)) return false; kset(META_KEY(slot), JSON.stringify(slotMeta(s, headline))); setLastSlot(slot); return true; } catch (e) { return false; } };
export const hasBackup = (slot = activeSlot) => looksValid(kget(BAK_KEY(slot)));
function readSlot(slot) { // -> { g, restored }
  const t = kget(SLOT_KEY(slot)); if (t) { try { const g = JSON.parse(t); if (g && g.v === 2) return { g, restored: false }; } catch (e) { /* corrupt: try the backup */ } }
  const b = kget(BAK_KEY(slot)); if (b && looksValid(b)) return { g: JSON.parse(b), restored: true, raw: b };
  return { g: null, restored: false };
}
export const load = (slot = activeSlot) => { try { migrateLegacy(); const r = readSlot(slot); const g = r.g; if (g) { if (r.restored) { kset(SLOT_KEY(slot), r.raw); const bm = kget(BAKMETA_KEY(slot)); if (bm) kset(META_KEY(slot), bm); kdel(BAK_KEY(slot)); kdel(BAKMETA_KEY(slot)); loadNote = 'Your latest save was missing or damaged, so the previous backup was restored (you may lose the last year or action).'; } Slice.ensure(g); Hw.ensure(g); } return g; } catch (e) { return null; } };
export const slotInfo = (slot) => { migrateLegacy(); let t = kget(SLOT_KEY(slot)), mk = META_KEY(slot); if (!t || !looksValid(t)) { const b = kget(BAK_KEY(slot)); if (b && looksValid(b)) { t = b; mk = BAKMETA_KEY(slot); } else return null; } let m = null; try { m = JSON.parse(kget(mk)); } catch (e) { /* ignore */ } if (!m) { try { m = slotMeta(JSON.parse(t)); } catch (e) { return null; } } return m; };
export const wipe = (slot = activeSlot) => { kdel(SLOT_KEY(slot)); kdel(META_KEY(slot)); kdel(BAK_KEY(slot)); kdel(BAKMETA_KEY(slot)); if (lastSlot() === slot) kdel(LAST_KEY); };
