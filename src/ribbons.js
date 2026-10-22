// Ribbons: ordered rule list from data/ribbons.json, first match wins (priority = file order). Rules: {all:[...], any:[...]} of [var, op, value] or ['all'|'any', [nested]].
import { D } from './data.js';
import * as P from './people.js';

export const newTally = () => ({ partners: 0, kills: 0, escapes: 0, prisonYears: 0, sentences: 0, theft: 0, gamblingWon: 0, giftCount: 0, wickedActs: 0, heroActs: 0, moochCount: 0, arguments: 0,
  spouses: 0, divorces: 0, maxFame: 0, maxSmarts: 0, jobYears: 0, diseases: 0, crimes: 0, surrendered: 0 });
export function context(s, ending) {
  const kids = s.people.filter((p) => p.rel === 'child'), grand = kids.reduce((a, k) => a + (k.kids || 0), 0), st = s.stats;
  return { ...s.tally, nw: ending.netWorth.total, age: Math.floor(s.age), kids: kids.length, grandkids: grand, fertility: 2 * kids.length + grand, cause: ending.causeId || ending.cause, causeKind: ending.kind,
    karma: st.karma, smarts: st.smarts, avgSL: (st.smarts + st.looks) / 2, edu: s.edu + (s.postgrad ? 1 : 0), addictions: ['smoker', 'drinker', 'drugs'].filter((k) => s.flags[k]).length,
    bizCount: s.biz.length, surrendered: ending.kind === 'surrender' ? 1 : 0 };
}
const OPS = { '>': (a, b) => a > b, '>=': (a, b) => a >= b, '<': (a, b) => a < b, '<=': (a, b) => a <= b, '==': (a, b) => a === b, '!=': (a, b) => a !== b, in: (a, b) => b.includes(a) };
export function evalRule(rule, ctx) {
  if (!rule) return false;
  const one = (t) => (t[0] === 'all' || t[0] === 'any' ? evalRule({ [t[0]]: t[1] }, ctx) : (OPS[t[1]] || OPS['=='])(ctx[t[0]], t[2]));
  const all = rule.all ? rule.all.every(one) : true, any = rule.any ? rule.any.some(one) : true;
  return all && any;
}
export function pickRibbon(s, ending) {
  const ctx = context(s, ending);
  for (const r of [...D.ribbons].sort((a, b) => a.prio - b.prio)) if (!r.locked && r.rule && evalRule(r.rule, ctx)) return r;
  return D.ribbons.find((r) => r.id === 'mediocre');
}
