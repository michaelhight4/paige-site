// The Creator (premium pass 'creator'): edit stats/age of any character, including your own. Any edit marks the life `creatorUsed`
// (shown in the legacy summary; such lives are excluded from challenges and any future leaderboards via eligibleForRanking()).
import { D } from './data.js';
import { clamp } from './rng.js';
import { log } from './core.js';
import * as P from './people.js';
import * as Premium from './premium.js';

export const unlocked = () => Premium.isUnlocked('creator');
export const SELF_STATS = [['health', 'Health'], ['happiness', 'Happiness'], ['smarts', 'Smarts'], ['looks', 'Looks'], ['karma', 'Karma'], ['stress', 'Stress'], ['crazy', 'Crazy'], ['fame', 'Fame']];
export const OTHER_STATS = [['health', 'Health'], ['bar', 'Relationship']];
export const eligibleForRanking = (s) => !(s && (s.creatorUsed || s.creatorLineage));
export function list(s) {
  const me = { id: 'me', name: s.name, rel: 'You', age: Math.floor(s.age), alive: s.alive, stats: Object.fromEntries(SELF_STATS.map(([k]) => [k, Math.round(s.stats[k] || 0)])) };
  return [me, ...s.people.filter((p) => p.alive).map((p) => ({ id: p.id, name: p.name, rel: p.rel, age: Math.floor(p.age), alive: true, stats: { health: Math.round(p.health || 0), bar: Math.round(p.bar || 0) } }))];
}
// patch: { age?, stats?: {key: value} }
export function edit(s, id, patch) {
  if (!unlocked()) return { ok: false, msg: 'The Creator is a Premium pass.' };
  if (!s.alive) return { ok: false, msg: 'Not while dead.' };
  const age = patch.age == null ? null : clamp(Math.round(patch.age), 0, 120);
  if (id === 'me') {
    for (const [k, v] of Object.entries(patch.stats || {})) if (SELF_STATS.some(([x]) => x === k)) s.stats[k] = clamp(Math.round(v), 0, 100);
    if (age != null && age !== Math.floor(s.age)) {
      const yr = s.birthYear + Math.floor(s.age); s.age = age; s.birthYear = yr - age;
      if (age >= 18) { s.school = null; s.edu = Math.max(s.edu, 1); } else if (age >= 12) s.school = 'high'; else if (age >= 5) s.school = 'primary'; else s.school = null;
      s.retired = age >= 65 ? s.retired : false;
    }
    s.sl = s.sl && (s.sl.age = Math.floor(s.age), s.sl);
  } else {
    const p = P.byId(s, id); if (!p || !p.alive) return { ok: false, msg: 'No such person.' };
    for (const [k, v] of Object.entries(patch.stats || {})) if (OTHER_STATS.some(([x]) => x === k)) p[k] = clamp(Math.round(v), 0, 100);
    if (age != null) p.age = age;
  }
  s.creatorUsed = true; s.creatorEdits = (s.creatorEdits || 0) + 1;
  if (s.creatorEdits === 1) log(s, 'I used The Creator to rewrite a little of reality.', 'life');
  return { ok: true, msg: 'Changed.' };
}
