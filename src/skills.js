// Skills: 4 categories (data/skills.json). Grow with use (diminishing returns, passion-boosted), fade slowly when unused, and feed outcomes.
import { D } from './data.js';
import { clamp, rnd } from './rng.js';

export const defs = () => D.skillsData.skills;
export const cats = () => D.skillsData.categories;
export function ensure(s) {
  if (!s.skills) {
    s.skills = {}; const age = Math.floor(s.age), base = Math.min(32, 6 + age * 0.9);
    for (const d of defs()) s.skills[d.id] = Math.round(clamp(base + (((s.rs ^ d.id.length * 2654435761) >>> 0) % 9) - 4, 0, 100) * 10) / 10;
  }
  if (!s.skillUsed) s.skillUsed = {};
  return s.skills;
}
export const get = (s, id) => ensure(s)[id] || 0;
export const avg = (s, cat) => { const l = defs().filter((d) => !cat || d.cat === cat); return l.reduce((a, d) => a + get(s, d.id), 0) / l.length; };
// passion multiplier: an active passion that trains this skill grows it faster
export function passionMult(s, id) {
  const act = (s.passions && s.passions.active) || []; const P = D.passionsData;
  for (const a of act) { const p = P.passions.find((x) => x.id === a.id); if (p && (p.skills[id] || 0) >= 0.4) return D.skillsData.gain.passionMult; }
  for (const m of (s.passions && s.passions.mastered) || []) { const p = P.passions.find((x) => x.id === m.id); if (p && (p.skills[id] || 0) >= 0.4) return 1.25; }
  return 1;
}
export function use(s, id, amt) {
  ensure(s); if (s.skills[id] == null) return 0; const v = s.skills[id];
  const g = amt * Math.max(0.05, 1 - v / 108) * passionMult(s, id); s.skills[id] = Math.round(clamp(v + g, 0, 100) * 100) / 100; s.skillUsed[id] = 1; return g;
}
export function useMap(s, map, scale = 1) { for (const [k, w] of Object.entries(map)) use(s, k, w * scale); }
export function fromActivity(s, label) {
  const l = String(label).toLowerCase();
  for (const [re, m] of D.skillsData.activityMap) if (new RegExp(re).test(l)) { for (const part of m.split(',')) { const [k, w] = part.split(':'); use(s, k, 2.2 * Number(w)); } return true; }
  return false;
}
// outcomes feed skills
export function outcome(s, kind) {
  const M = { hired: { people: 1.5, confidence: 1.5, composure: 1 }, interview: { people: 1, confidence: 1, composure: 0.8 }, promoted: { leadership: 2, confidence: 1.5, business: 1 }, raise: { business: 1.5, leadership: 1, confidence: 1 }, fired: { composure: 1.5, maturity: 1.5 }, sportswin: { strength: 1, endurance: 1, speed: 1, confidence: 1.5, discipline: 1 }, relationship: { empathy: 1.5, people: 1, maturity: 0.8 }, breakup: { maturity: 1.5, composure: 1 }, child: { maturity: 2, empathy: 1.5 }, crime: { composure: 1, problem_solving: 1 }, prison: { discipline: 1.5, composure: 1.5 } };
  if (M[kind]) useMap(s, M[kind]);
}
export function yearTick(s) {
  ensure(s); const age = Math.floor(s.age), sm = clamp(s.stats.smarts / 60, 0.4, 1.5);
  if (s.school === 'primary' || s.school === 'high') useMap(s, { memory: 1.4, literacy: 1.4, math: 1.1, intelligence: 1.0, discipline: 0.7 }, sm);
  if (s.school === 'college') useMap(s, { intelligence: 1.5, problem_solving: 1.3, literacy: 1.0, focus: 1.0, computer: 0.6 }, sm);
  if (s.job) {
    const c = D.careers.find((x) => x.id === s.job.id) || {}, key = ((c.sector || '') + ' ' + (c.name || '')).toLowerCase();
    useMap(s, { people: 1.0, discipline: 1.0, composure: 0.5 });
    if (s.job.level >= 2) use(s, 'leadership', 1.5);
    if (/tech|software|it\b|engineer|program/.test(key)) useMap(s, { computer: 2, problem_solving: 1.2 });
    if (/restaurant|chef|cook|food/.test(key)) use(s, 'cooking', 2);
    if (/construction|mechanic|plumb|electric|trade|factory|fishery/.test(key)) useMap(s, { trades: 2, strength: 1 });
    if (/bank|finance|sales|business|corporate|account/.test(key)) useMap(s, { business: 1.5, math: 1 });
    if (/driver|truck|taxi|pilot|airline/.test(key)) use(s, 'driving', 2);
    if (/hospital|medic|school|teacher|nurse/.test(key)) useMap(s, { empathy: 1.2, focus: 1 });
  }
  if (s.sport) useMap(s, { strength: 1.5, endurance: 1.6, speed: 1.4, coordination: 1.5, flexibility: 0.6 });
  if (s.biz && s.biz.length) useMap(s, { business: 1.5, leadership: 1.0, people: 0.6 });
  const rel = (s.people || []).filter((p) => p.alive && ['friend', 'partner', 'spouse'].includes(p.rel)).length; if (rel) useMap(s, { empathy: 0.7, people: 0.8 }, Math.min(2, rel / 2));
  if ((s.people || []).some((p) => p.alive && p.rel === 'child' && p.age < 18)) useMap(s, { maturity: 1.2, empathy: 0.8 });
  const hasCar = s.assets.some((a) => a.kind === 'car') || (s.sl && s.sl.assets && s.sl.assets.car && s.sl.assets.car.length); if (age >= 16 && hasCar) use(s, 'driving', 1.5);
  if (age < 26) useMap(s, { strength: 0.9, endurance: 0.9, speed: 0.9, coordination: 0.8, flexibility: 0.5, maturity: 0.9 });
  if (s.stats.happiness > 60) use(s, 'confidence', 0.4); if (s.stats.stress > 60) use(s, 'composure', 0.2);
  // fade: unused skills decay slowly (physical faster after 45)
  const dc = D.skillsData.decay;
  for (const d of defs()) {
    if (s.skillUsed[d.id]) continue; const v = s.skills[d.id]; if (v <= 0) continue;
    let loss = dc.base + v * dc.pct; if (d.cat === 'physical' && age > dc.physicalAfter) loss += dc.physicalExtra * (age - dc.physicalAfter) / 15;
    s.skills[d.id] = Math.round(Math.max(0, v - loss) * 100) / 100;
  }
  if (age > 60) for (const k of ['memory', 'speed', 'flexibility']) s.skills[k] = Math.max(0, s.skills[k] - 0.5);
  s.skillUsed = {};
}
// gameplay effects of skills
export const workBonus = (s) => ((get(s, 'people') + get(s, 'leadership') + get(s, 'discipline') + get(s, 'composure')) / 4 - 25) / 50;
export const healthBonus = (s) => (avg(s, 'physical') - 25) / 40;
export const interviewBonus = (s) => (get(s, 'people') + get(s, 'confidence') + get(s, 'composure') - 45) / 300;
