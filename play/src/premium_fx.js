// Effects of the premium passes on the engine. Every function checks Premium.isUnlocked(id) at call time (owned OR subscribed).
// Start-of-life bonuses run from applyStart(s) (newGame + continueAs); continuous effects are checked where they matter
// (health onset, crime catch, taxes, fame floor). Pass ids/effects come from data/premium.json.
import * as Premium from './premium.js';
import { D } from './data.js';
import { rnd, rint, pick, clamp } from './rng.js';
import { log, addStat } from './core.js';
import * as P from './people.js';
import * as Biz from './business.js';
import * as SS from './schoolsports.js';
import * as B from './slice_bridge.js';

export const on = (id) => Premium.isUnlocked(id);
export const noTax = () => on('tax_evasion');
export const noDisease = () => on('fountain');
export const noCatch = () => on('golden_gun');

// grant a start bonus once per life (flag survives saves; continueAs resets s.flags)
function once(s, id, fn) { s.flags['prem_' + id] = s.flags['prem_' + id] || 0; if (s.flags['prem_' + id]) return false; s.flags['prem_' + id] = 1; fn(); return true; }

export function applyStart(s) {
  const done = [];
  if (on('midas') && once(s, 'midas', () => { s.cash += 1000000; log(s, 'I was born with a million dollars and no explanation.', 'money'); })) done.push('midas');
  if (on('nepo') && once(s, 'nepo', () => { s.stats.fame = Math.max(s.stats.fame, 80); log(s, 'I was famous before I could walk. Somebody important was related to me.', 'fame'); })) done.push('nepo');
  if (on('free_realestate') && once(s, 'house', () => { B.grantAsset(s, 'mansion', 2000000); log(s, 'I was handed the keys to a $2,000,000 house.', 'asset'); })) done.push('free_realestate');
  if (on('sports_owner') && once(s, 'team', () => { grantTeam(s); })) done.push('sports_owner');
  if (on('fountain')) { if (s.diseases.length) { s.diseases = []; log(s, 'My ailments evaporated overnight.', 'health'); } done.push('fountain'); }
  return done;
}
export function grantTeam(s) {
  if (s.biz.some((b) => b.type === 'sports')) return false;
  Biz.refreshOffers(s); const i = s.offers.findIndex((o) => o.type === 'sports'); if (i < 0) return false;
  s.offers[i].price = 0; const r = Biz.buyOffer(s, i); if (r.ok) log(s, `I became the owner of the ${r.biz.name}. Nobody asked how.`, 'biz'); return r.ok;
}
// fame never decays below the nepo floor
export function fameFloor(s) { if (on('nepo') && s.stats.fame < 60) s.stats.fame = 60; }
// einstein: take any degree/school level instantly (ignores age and prerequisites)
export function instantDegree(s, levelId, major) {
  if (!on('einstein')) return { ok: false, msg: 'Einstein Mode is a Premium pass.' };
  const r = B.call(s, (d, sl) => {
    const sc = d.occ.education.schools.find((x) => x.id === levelId); if (!sc) return { ok: false, msg: 'Unknown school.' };
    const m = major ? (d.occ.education.majors.find((x) => x.id === major || x.name === major) || null) : null;
    sl.edu.degrees[levelId] = { major: m ? m.name : null, age: sl.age }; sl.edu.inSchool = null;
    if (levelId === 'community_college' || levelId === 'university') sl.edu.level = levelId;
    sl.stats.smarts = clamp(sl.stats.smarts + 8, 0, 100);
    return { ok: true, msg: `Degree earned instantly: ${d.occ.education.names[levelId] || sc.name}.` };
  });
  if (r.ok) { s.edu = Math.max(s.edu, /school|graduate/.test(levelId) ? 3 : 2); s.school = s.school === 'college' ? null : s.school; s.college = null; log(s, `I received a ${r.msg.split(': ')[1]} I did not study for.`, 'school'); }
  return r;
}
// baller: skip straight to a first-round draft pick (age 14+)
export function ballerDraft(s) {
  if (!on('baller')) return { ok: false, msg: 'Baller is a Premium pass.' };
  if (s.age < 14) return { ok: false, msg: 'Too young for the draft (14+).' };
  if (s.pro) return { ok: false, msg: 'Already a pro.' };
  s.sport = { id: 'basketball', level: SS.levelOf(s), skill: 92, yrs: 0, seasons: [], scholarship: false, team: 'Premium Prep' };
  const r = SS.draft(s); return r ? { ok: true, msg: `Drafted by the ${r.teamName}.` } : { ok: false, msg: 'No team wanted me. Odd.' };
}
// rabbit: unlimited children - no pregnancy delay, no chance roll, twins/triplets possible
export function rabbitChildren(s) {
  if (!on('rabbit')) return { ok: false, msg: 'Rabbit Like is a Premium pass.' };
  return P.rabbitBirth(s);
}
// golden_gun: kill anyone, no arrest, no karma/stress/happiness cost
export function kill(s, pid) {
  if (!on('golden_gun')) return { ok: false, msg: 'Golden Gun is a Premium pass.' };
  const p = P.byId(s, pid); if (!p || !p.alive) return { ok: false, msg: 'Nobody to kill.' };
  p.alive = false; p.diedAt = s.age; p.cause = 'killed by me'; p.rel === 'spouse' && (p.married = false);
  const m = `I killed ${p.name}. Nobody asked.`; log(s, m, 'crime'); return { ok: true, msg: m };
}
export function killStranger(s) {
  if (!on('golden_gun')) return { ok: false, msg: 'Golden Gun is a Premium pass.' };
  const m = 'I killed a stranger. The case file got lost.'; log(s, m, 'crime'); s.tally.strangersKilled = (s.tally.strangersKilled || 0) + 1; return { ok: true, msg: m };
}
