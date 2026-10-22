// Job panel: coworkers (role, professionalism, work ethic, personality, relationship), boss relationship, performance, promotion readiness,
// ask for a promotion / raise, yearly-capped interactions with consequences. Works on the main job (s.job; slice jobs mirror into it).
import { D } from './data.js';
import { chance, clamp, rint } from './rng.js';
import { log, addStat } from './core.js';
import * as P from './people.js';
const CAP = 4, ROLES = ['Analyst', 'Coordinator', 'Specialist', 'Senior associate', 'Team lead', 'Assistant', 'Technician', 'Manager'], PERS = ['friendly', 'ambitious', 'gossipy', 'by-the-book', 'lazy', 'funny', 'moody', 'helpful'];
const h = (id, k) => { let x = (Number(id) * 2654435761 + k * 97) >>> 0; x = (x ^ (x >>> 13)) >>> 0; return x; };
const yr = (s) => Math.floor(s.age);
function jobOf(s) { return s.job || null; }
export function ensure(s) { const j = jobOf(s); if (!j) return null; if (!j.boss) j.boss = { name: P.newPerson(s, 'boss', {}).name, rel: 50 }; if (!j.jp || j.jp.y !== yr(s)) j.jp = { y: yr(s), n: 0, done: {}, promo: 0, raise: 0, impress: 0 }; if (!s.people.some((p) => p.rel === 'coworker')) P.newCoworkers(s); return j; }
const cw = (s) => s.people.filter((p) => p.rel === 'coworker' && p.alive);
const traits = (p) => ({ role: ROLES[h(p.id, 1) % ROLES.length], prof: 25 + (h(p.id, 2) % 71), ethic: 20 + (h(p.id, 3) % 76), persona: PERS[h(p.id, 4) % PERS.length] });
export function readiness(s) { const j = jobOf(s); if (!j) return 0; const c = D.careers.find((x) => x.id === j.id); if (c && j.level >= c.levels.length - 1) return 100; return Math.round(clamp((j.perf - 40) / 50, 0, 1) * 55 + Math.min(1, j.lvlYrs || 0) * 25 + clamp(((j.boss && j.boss.rel) || 50) - 40, 0, 40) / 2); }
export function view(s) {
  const j = ensure(s); if (!j) return null; const c = D.careers.find((x) => x.id === j.id), top = c ? j.level >= c.levels.length - 1 : true;
  return { title: c ? c.levels[j.level][0] : 'Job', nextTitle: c && !top ? c.levels[j.level + 1][0] : null, perf: Math.round(j.perf), boss: { ...j.boss }, readiness: readiness(s), top, used: j.jp.n, cap: CAP, promoAsked: !!j.jp.promo, raiseAsked: !!j.jp.raise, impressed: !!j.jp.impress,
    coworkers: cw(s).map((p) => ({ id: p.id, name: p.name, age: Math.floor(p.age), rel: Math.round(p.bar), ...traits(p), done: !!j.jp.done[p.id] })), acts: COACTS.filter((a) => !a.adult || s.age >= 18) };
}
export const COACTS = [{ id: 'chat', label: 'Chat / befriend' }, { id: 'compliment', label: 'Compliment their work' }, { id: 'help', label: 'Help with a project' }, { id: 'gossip', label: 'Gossip about someone' }, { id: 'complain', label: 'Complain to the boss about them' }, { id: 'flirt', label: 'Flirt', adult: true }];
export function coworker(s, id, act) {
  const j = ensure(s); if (!j) return { ok: false, msg: 'You do not have a job.' }; const p = cw(s).find((x) => x.id === Number(id)); if (!p) return { ok: false, msg: 'No such coworker.' };
  if (j.jp.done[p.id]) return { ok: false, msg: `You already dealt with ${p.first} this year.` }; if (j.jp.n >= CAP) return { ok: false, msg: `Coworker interactions: ${CAP}/${CAP} used this year.` };
  const t = traits(p); let line; const A = COACTS.find((a) => a.id === act); if (!A || (A.adult && s.age < 18)) return { ok: false, msg: 'Not available.' };
  j.jp.done[p.id] = 1; j.jp.n++;
  if (act === 'chat') { p.bar = clamp(p.bar + 6, 0, 100); line = `I got to know ${p.name} better.`; }
  else if (act === 'compliment') { p.bar = clamp(p.bar + (t.persona === 'ambitious' ? 8 : 4), 0, 100); line = `I praised ${p.name}'s work.`; }
  else if (act === 'help') { p.bar = clamp(p.bar + 5, 0, 100); j.perf = clamp(j.perf + 4, 0, 100); addStat(s, 'stress', 2); line = `I helped ${p.name} finish a project.`; }
  else if (act === 'gossip') { if (chance(s, t.persona === 'gossipy' ? 0.2 : 0.35)) { p.bar = clamp(p.bar - 12, 0, 100); j.boss.rel = clamp(j.boss.rel - 6, 0, 100); line = `My gossip with ${p.name} got back to the boss.`; } else { p.bar = clamp(p.bar + 5, 0, 100); line = `${p.name} and I traded office gossip.`; } }
  else if (act === 'complain') { if (chance(s, 0.5)) { p.bar = clamp(p.bar - 15, 0, 100); j.boss.rel = clamp(j.boss.rel + 3, 0, 100); line = `I raised concerns about ${p.name}. The boss took note.`; } else { p.bar = clamp(p.bar - 20, 0, 100); j.boss.rel = clamp(j.boss.rel - 5, 0, 100); line = `I complained about ${p.name}. It backfired.`; } }
  else if (act === 'flirt') { if (chance(s, 0.25)) { j.boss.rel = clamp(j.boss.rel - 10, 0, 100); j.perf = clamp(j.perf - 6, 0, 100); line = `My flirting with ${p.name} reached HR. Awkward meeting.`; } else if (p.bar > 60 && chance(s, 0.5)) { p.bar = clamp(p.bar + 10, 0, 100); line = `${p.name} flirted back.`; } else { p.bar = clamp(p.bar - 6, 0, 100); line = `${p.name} was not interested.`; } }
  log(s, line, 'career'); return { ok: true, msg: line };
}
export function boss(s, act) {
  const j = ensure(s); if (!j) return { ok: false, msg: 'You do not have a job.' }; const c = D.careers.find((x) => x.id === j.id); let line;
  if (act === 'impress') { if (j.jp.impress) return { ok: false, msg: 'Already tried to impress the boss this year.' }; j.jp.impress = 1; j.boss.rel = clamp(j.boss.rel + 6, 0, 100); j.perf = clamp(j.perf + 2, 0, 100); line = `I went out of my way to impress ${j.boss.name}.`; }
  else if (act === 'promotion') { if (j.jp.promo) return { ok: false, msg: 'You already asked for a promotion this year.' }; if (!c || j.level >= c.levels.length - 1) return { ok: false, msg: 'You are already at the top of this ladder.' }; j.jp.promo = 1;
    const p = clamp(readiness(s) / 100 - ((s.stats.stress || 0) > 70 ? 0.1 : 0), 0.03, 0.9); if (chance(s, p)) { j.level++; j.lvlYrs = 0; line = `I asked for a promotion and got it: ${c.levels[j.level][0]}.`; } else { j.boss.rel = clamp(j.boss.rel - 5, 0, 100); addStat(s, 'happiness', -3); line = 'I asked for a promotion. Not this year.'; } }
  else if (act === 'raise') { if (j.jp.raise) return { ok: false, msg: 'You already asked for a raise this year.' }; j.jp.raise = 1; const p = clamp(0.15 + (j.perf - 50) / 120 + (j.boss.rel - 50) / 150 + Math.min(j.yrs || 0, 10) / 60, 0.05, 0.8);
    if (chance(s, p)) { const r = [0.04, 0.08][rint(s, 0, 1)]; j.raise = (j.raise || 0) + r; line = `I got a ${Math.round(r * 100)}% raise.`; } else { j.boss.rel = clamp(j.boss.rel - 4, 0, 100); line = 'I asked for a raise and was turned down.'; } }
  else return { ok: false, msg: 'Unknown.' };
  log(s, line, 'career'); return { ok: true, msg: line };
}
