// School carry-over: a student on a team or in clubs automatically joins the equivalent team/club at the next school level
// (elementary -> high school -> college; the game has no separate middle-school stage, high school starts at 12). Members skip tryouts
// (flag `tryout: 'skipped'`), keep their skill, and get a new team name for the new school plus a short note in the year summary.
// No RNG is consumed (team names are hashed from the save seed) so seeded lives stay reproducible.
import { D } from './data.js';
import { log } from './core.js';
import * as SS from './schoolsports.js';
import * as Scholar from './scholarships.js';

export const SCHOOL_LABEL = { high: 'high school', college: 'college' };
const hash = (...xs) => { let h = 2166136261 >>> 0; for (const x of xs) for (const ch of String(x)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; };
export function teamName(s, sportId, level, prev) {
  const names = D.life.sports.teamNamesSchool; let i = hash(s.rs, sportId, level, 'team') % names.length;
  if (names[i] === prev) i = (i + 1) % names.length; return names[i];
}
const note = (s, text, inYear) => { if (inYear) (s.carryNotes = s.carryNotes || []).push(text); else log(s, text, 'school'); };
const clubName = (id) => (D.scholarData.clubs.find((c) => c.id === id) || { name: id }).name;
// Move the current member (team + clubs) into level `to` ('high' | 'college'). `inYear` => the note goes into the yearly summary paragraph.
export function enter(s, to, { inYear = false } = {}) {
  const sch = Scholar.ensure(s), age = Math.floor(s.age), where = SCHOOL_LABEL[to] || to, bits = [];
  const carry = s.carry && s.carry.to === to ? s.carry : null;
  if (carry) { s.sport = carry.sport; sch.clubs = [...carry.clubs]; s.carry = null; }
  if (s.sport) {
    const sp = s.sport, def = SS.sportDef(sp.id), prev = sp.team; sp.level = to; sp.team = teamName(s, sp.id, to, prev); sp.carried = true; sp.tryout = 'skipped'; sp.carriedAge = age;
    bits.push(`the ${where} ${def.name.toLowerCase()} team, the ${sp.team}`);
  }
  const ids = sch.clubs.filter((id) => { const c = D.scholarData.clubs.find((x) => x.id === id); return c && age >= c.minAge && age <= c.maxAge; });
  sch.clubs = ids.slice(0, D.scholarData.maxClubs);
  if (sch.clubs.length) bits.push(`the ${where} ${sch.clubs.length > 1 ? 'clubs' : 'club'}: ${sch.clubs.map(clubName).join(', ')}`);
  if (!bits.length) return null;
  const text = `I moved up to ${bits.join(', and ')}. As a returning member I skipped the tryouts.`;
  note(s, text, inYear); return text;
}
// High school graduation: park the team + clubs until the college decision (they would otherwise be dropped because no school is active).
export function stash(s) {
  const sch = Scholar.ensure(s); if (!s.sport && !sch.clubs.length) { s.carry = null; return; }
  s.carry = { to: 'college', age: Math.floor(s.age), sport: s.sport ? JSON.parse(JSON.stringify(s.sport)) : null, clubs: [...sch.clubs] }; s.sport = null; sch.clubs = [];
}
// Skipped college / stale carry: the team days are over.
export function drop(s) {
  const c = s.carry; s.carry = null; if (!c) return;
  if (c.sport) { const def = SS.sportDef(c.sport.id); log(s, `My ${def.name.toLowerCase()} career ended when school did.`, 'sport'); }
}
export const carrySport = (s) => s.sport || (s.carry && s.carry.sport) || null;
export const takeNotes = (s) => { const n = s.carryNotes || []; s.carryNotes = []; return n; };
