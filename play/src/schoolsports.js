import * as Skills from './skills.js';
import * as Passions from './passions.js';
// School sports: elementary -> high school -> college, season stat lines, scholarships, and a draft into the existing pro league (Sports.addDraftee).
import { D } from './data.js';
import { rnd, rint, pick, gauss, chance, clamp, wpick } from './rng.js';
import { log, earn, addStat } from './core.js';
import * as Sports from './sports.js';

const CFG = () => D.life.sports;
export const sportDef = (id) => CFG().list.find((x) => x.id === id);
export const levelOf = (s) => (s.school === 'primary' ? 'elementary' : s.school === 'high' ? 'high' : s.school === 'college' ? 'college' : null);
export function canJoin(s) { return !s.sport && !!levelOf(s) && s.age >= D.life.school.sportAges.elementary[0] && !s.prison; }
export function join(s, id, auto) {
  if (!canJoin(s)) return false;
  const def = id ? sportDef(id) : wpick(s, CFG().list, (x) => (x.id === 'basketball' ? 2 : 1)); if (!def) return false;
  s.sport = { id: def.id, level: levelOf(s), skill: clamp(Math.round(12 + rnd(s) * 22 + (s.stats.health - 50) / 6), 5, 60), yrs: 0, seasons: [], scholarship: false, team: pick(s, CFG().teamNamesSchool) };
  log(s, `I joined the ${levelLabel(s.sport.level).toLowerCase()} ${def.name.toLowerCase()} team, the ${s.sport.team}.`, 'sport'); return true;
}
export const levelLabel = (l) => ({ elementary: 'Elementary', high: 'High school', college: 'College' }[l]);
export function quit(s, why) {
  if (!s.sport) return; const def = sportDef(s.sport.id);
  log(s, why === 'graduated' ? `My ${def.name.toLowerCase()} career ended when school did.` : `I quit ${def.name.toLowerCase()}. The ball was relieved.`, 'sport'); s.sport = null;
}
export function statLine(def, st) {
  return def.stats.map((k) => `${typeof st[k] === 'number' && !Number.isInteger(st[k]) ? (k === 'avg' ? st[k].toFixed(3).slice(1) : st[k].toFixed(1)) : st[k]} ${k}`).join(', ');
}
export function seasonStats(s, def, skill, level) {
  const mult = { elementary: 0.6, high: 1, college: 1.3 }[level] || 1, st = {};
  for (const k of def.stats) {
    const b = def.base[k];
    if (k === 'avg') st[k] = clamp(0.17 + skill / 520 + gauss(s) * 0.015, 0.1, 0.46);
    else if (k === 'best100') st[k] = Math.round((def.id === 'swimming' ? 70 - skill * 0.28 : 14 - skill * 0.045) * 100 + gauss(s) * 15) / 100;
    else if (k === 'medals') st[k] = Math.floor(skill / 40 + rnd(s) * 1.4);
    else { const v = b * (0.35 + skill / 55) * mult * (1 + gauss(s) * 0.12); st[k] = def.id === 'basketball' ? Math.round(v * 10) / 10 : Math.max(0, Math.round(v)); }
  }
  return st;
}
export function yearTick(s) {
  const sp = s.sport; if (!sp) return;
  const lvl = levelOf(s);
  if (!lvl) { quit(s, 'graduated'); return; }
  sp.level = lvl; sp.yrs++;
  const def = sportDef(sp.id), g = CFG().skillGrowth;
  sp.skill = clamp(sp.skill + g * (0.55 + CFG().healthWeight * s.stats.health / 50) * (0.7 + s.stats.smarts / 250) * (sp.skill > 80 ? 0.5 : 1) + gauss(s), 0, 100);
  sp.skill = clamp(sp.skill + (Skills.avg(s, 'physical') - 30) / 40 + (Passions.has(s, 'sports') ? 1.5 : 0), 0, 100);
  const st = seasonStats(s, def, sp.skill, lvl), w = clamp(Math.round(8 + (sp.skill - 50) / 10 + gauss(s) * 1.6), 0, 16);
  const rec = { age: Math.floor(s.age), level: lvl, team: sp.team, w, l: 16 - w, stats: st, mvp: sp.skill > 75 && chance(s, 0.3) };
  sp.seasons.push(rec); if (rec.mvp || w >= 11) Skills.outcome(s, 'sportswin'); if (rec.mvp) { (s.awards = s.awards || []).push({ id: 'mvp', age: rec.age, text: 'Team MVP' }); }
  addStat(s, 'health', 2); addStat(s, 'happiness', 2); addStat(s, 'looks', 0.5); if (lvl !== 'elementary') addStat(s, 'fame', rec.mvp ? 4 : 1);
  log(s, `I played ${def.name.toLowerCase()} for the ${levelLabel(lvl).toLowerCase()} ${sp.team} (${w}-${16 - w}): ${statLine(def, st)}.${rec.mvp ? ' I was named MVP and told nobody on purpose.' : ''}`, 'sport');
  if (lvl === 'high' && s.age >= 17 && sp.skill >= CFG().draft.scholarshipSkill && !sp.offered) { sp.offered = true; log(s, 'A college scout told me I had a future in the sport, or in standing near it.', 'sport'); }
}
// Called when college is completed (senior year): draft into the pro league.
export function onCollegeGraduate(s) {
  const sp = s.sport; if (!sp) return null;
  const def = sportDef(sp.id), d = CFG().draft; let res = null;
  if (def.pro && sp.skill >= d.minSkill) res = draft(s);
  else log(s, `Nobody drafted me. I kept my ${def.name.toLowerCase()} trophies in a box.`, 'sport');
  s.sport = null; return res;
}
export function draftRound(skill) { const d = CFG().draft; return skill >= d.round1 ? 1 : skill >= d.round2 ? 2 : skill >= d.minSkill ? 3 : 0; }
export function draft(s) {
  const sp = s.sport, d = CFG().draft, round = draftRound(sp.skill); if (!round) return null;
  const r = Sports.addDraftee(s, { name: s.name, ovr: d.ovrBase + sp.skill * d.ovrScale, round });
  s.pro = { team: r.team, pid: r.player.id, round, pick: r.pick, season: s.league.season, seasons: [] }; addStat(s, 'fame', 8); addStat(s, 'happiness', 16);
  log(s, `I was drafted ${round === 1 ? 'in the first round' : round === 2 ? 'in the second round' : 'late'} (pick ${r.pick}) by the ${r.teamName}. I cried on live television.`, 'sport'); return r;
}
export const proPlayer = (s) => { if (!s.pro) return null; const t = s.league.teams[s.pro.team]; return t ? t.roster.find((p) => p.id === s.pro.pid) || null : null; };
export function proYear(s, dt) {
  if (!s.pro) return; const p = proPlayer(s);
  if (!p) { log(s, 'I retired from the pro league. My knees sent a thank-you card.', 'sport'); s.pro = null; return; }
  const pay = p.sal * dt; earn(s, pay * 0.78);
}
export function proSeasonLine(s) {
  const p = proPlayer(s); if (!p) return null; const o = Sports.ovr(p);
  return { team: s.league.teams[s.pro.team].name, ovr: o, age: p.age, salary: p.sal, ppg: Math.round((o - 35) * 0.55 * 10) / 10, rpg: Math.round((p.r.re - 25) * 0.15 * 10) / 10, apg: Math.round((p.r.pa - 25) * 0.12 * 10) / 10 };
}
