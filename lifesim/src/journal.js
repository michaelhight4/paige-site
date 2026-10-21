// Yearly journal paragraph: first-person, past tense, deadpan; includes job, business and property events from the year.
import { D } from './data.js';
import { rnd, pick, money } from './rng.js';
import { fill } from './core.js';
import * as Biz from './business.js';
import * as P from './people.js';
import * as SS from './schoolsports.js';
import * as Carry from './schoolcarry.js';

export function yearParagraph(s) {
  const J = D.life.journal, out = [], age = Math.floor(s.age), c = P.country(s);
  const job = s.job && D.careers.find((x) => x.id === s.job.id);
  if (s.prison) out.push(fill(pick(s, J.yearPrison), { tier: D.crimes.tiers.find((t) => t.id === s.prison.tier)?.name.toLowerCase() || 'prison' }));
  else if (job) { const sal = Math.round(job.levels[s.job.level][1] * (0.9 + 0.2 * s.job.perf / 100) * (1 + (s.job.raise || 0))); out.push(fill(pick(s, J.yearJob), { job: job.levels[s.job.level][0].toLowerCase(), pay: money(sal) })); }
  else if (s.pro) { const l = SS.proSeasonLine(s); if (l) out.push(`I played pro for the ${l.team}: ${l.ppg} ppg, ${l.rpg} rpg, ${l.apg} apg.`); }
  else if (s.age >= 18 && !s.school && !s.retired) out.push(pick(s, J.yearNoJob));
  if (s.school && !s.prison) out.push(fill(pick(s, J.yearSchool), { school: D.life.school.stages[s.school].toLowerCase() }));
  for (const n of Carry.takeNotes(s)) out.push(n);
  for (const b of s.biz.slice(0, 3)) {
    const f = Biz.annualFinance(s, b), good = f.profit >= 0;
    out.push(fill(pick(s, J.yearBiz), { biz: b.name, profit: (good ? '' : 'a loss of ') + money(Math.abs(f.profit)), mood: pick(s, good ? J.bizGood : J.bizBad).toLowerCase() }));
  }
  const top = [...s.assets].sort((a, b) => b.value - a.value).slice(0, 2);
  for (const a of top) out.push(fill(pick(s, J.yearProp), { asset: 'my ' + a.name, value: money(a.value) }));
  if (s.stats.health < 25) out.push(pick(s, J.yearHealth.low)); else if (s.stats.health > 85 && rnd(s) < 0.3) out.push(pick(s, J.yearHealth.high));
  return out.join(' ');
}
