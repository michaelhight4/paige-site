// Fame tiers + "Use your fame": land spots (TV roles, shows, movies, game voice/cameos, music features, talk shows, podcasts, book deals,
// endorsements, hosting, award shows) with your fame. Chance and pay scale with fame tier and relevant skills; costs are stress/health/time,
// risks are overexposure (each spot this year lowers the next one's pay and odds), scandal and burnout. 3 spots a year, each kind once a year.
import { log, addStat, earn } from './core.js';
import { chance, clamp } from './rng.js';
import * as Skills from './skills.js';
import { fmtMoney } from './fmt.js';

export const TIERS = [
  { id: 'unknown', name: 'Unknown', min: 0, mult: 0 },
  { id: 'local', name: 'Local Name', min: 5, mult: 1 },
  { id: 'known', name: 'Well Known', min: 25, mult: 3 },
  { id: 'alist', name: 'A-List', min: 50, mult: 9 },
  { id: 'icon', name: 'Global Icon', min: 80, mult: 25 },
];
export const tierOf = (fame) => { let t = TIERS[0]; for (const x of TIERS) if ((fame || 0) >= x.min) t = x; return t; };
export const tierIndex = (fame) => TIERS.indexOf(tierOf(fame));
export const YEAR_CAP = 3;
// tier = minimum tier index; pay = base pay at "Local Name"; skills weight the odds; stress/health are the toll; scandal = base chance
export const SPOTS = [
  { id: 'tv_role', icon: '📺', name: 'Guest TV role', tier: 1, pay: 12000, skills: ['confidence', 'creativity', 'memory'], stress: 6, scandal: 0.02 },
  { id: 'series', icon: '🎞️', name: 'Recurring role in a series', tier: 2, pay: 60000, skills: ['confidence', 'creativity', 'memory', 'discipline'], stress: 10, scandal: 0.03 },
  { id: 'movie', icon: '🎬', name: 'Movie part', tier: 2, pay: 90000, skills: ['confidence', 'creativity', 'composure'], stress: 10, scandal: 0.03 },
  { id: 'voice', icon: '🎮', name: 'Game voice / cameo', tier: 1, pay: 9000, skills: ['creativity', 'confidence'], stress: 4, scandal: 0.01 },
  { id: 'feature', icon: '🎤', name: 'Music feature / collab', tier: 1, pay: 15000, skills: ['creativity', 'confidence', 'people'], stress: 5, scandal: 0.03 },
  { id: 'talk', icon: '🛋️', name: 'Talk show appearance', tier: 1, pay: 5000, skills: ['people', 'confidence', 'composure'], stress: 4, scandal: 0.04 },
  { id: 'podcast', icon: '🎙️', name: 'Podcast guest spot', tier: 1, pay: 2500, skills: ['people', 'intelligence'], stress: 2, scandal: 0.03 },
  { id: 'book', icon: '📚', name: 'Book deal / foreword', tier: 2, pay: 40000, skills: ['literacy', 'creativity', 'discipline'], stress: 8, scandal: 0.01 },
  { id: 'endorse', icon: '🤝', name: 'Endorsement / brand deal', tier: 1, pay: 20000, skills: ['people', 'confidence'], stress: 3, scandal: 0.04 },
  { id: 'host', icon: '🎙️', name: 'Hosting gig', tier: 3, pay: 150000, skills: ['people', 'confidence', 'composure'], stress: 10, scandal: 0.04 },
  { id: 'awards', icon: '🏆', name: 'Award-show appearance', tier: 2, pay: 25000, skills: ['composure', 'confidence'], stress: 4, scandal: 0.05 },
];
export function ensure(s) { if (!s.fame) s.fame = { year: -1, used: [], total: 0, earned: 0, hist: [] }; const F = s.fame; if (F.year !== Math.floor(s.age)) { F.year = Math.floor(s.age); F.used = []; } return F; }
const skillFit = (s, sp) => sp.skills.reduce((a, k) => a + Skills.get(s, k), 0) / sp.skills.length; // 0..100
export function quote(s, id) {
  const sp = SPOTS.find((x) => x.id === id); if (!sp) return null; const F = ensure(s), fame = s.stats.fame || 0, t = tierOf(fame), ti = TIERS.indexOf(t), fit = skillFit(s, sp), over = F.used.length;
  let reason = ''; if (s.age < 16) reason = 'Fame spots start at 16'; else if (s.prison) reason = 'Not from prison'; else if (ti < sp.tier) reason = `Needs ${TIERS[sp.tier].name} fame (you are ${t.name})`; else if (F.used.includes(id)) reason = 'Done this year'; else if (F.used.length >= YEAR_CAP) reason = `Yearly cap reached (${YEAR_CAP})`;
  const odds = clamp(0.35 + (ti - sp.tier) * 0.15 + fit / 250 + fame / 400 - over * 0.12, 0.05, 0.95);
  const pay = Math.round(sp.pay * t.mult * (0.7 + fit / 150) * (1 - over * 0.15) / 100) * 100;
  return { id, icon: sp.icon, name: sp.name, needTier: TIERS[sp.tier].name, ok: !reason, reason, odds: Math.round(odds * 100), pay: Math.max(0, pay), stress: sp.stress, scandal: Math.round((sp.scandal + over * 0.02) * 100), skills: sp.skills };
}
export function status(s) {
  const F = ensure(s), fame = Math.round(s.stats.fame || 0), t = tierOf(fame), ti = TIERS.indexOf(t), nx = TIERS[ti + 1];
  return { fame, tier: t.name, tierId: t.id, tierIndex: ti, next: nx ? { name: nx.name, at: nx.min } : null, used: F.used.length, cap: YEAR_CAP, earned: F.earned, total: F.total, hist: F.hist.slice(-8).reverse(), spots: SPOTS.map((x) => quote(s, x.id)) };
}
export function take(s, id) {
  const q = quote(s, id); if (!q) return { ok: false, msg: 'Unknown spot.' }; if (!q.ok) return { ok: false, msg: q.reason };
  const F = ensure(s), sp = SPOTS.find((x) => x.id === id); F.used.push(id); addStat(s, 'stress', sp.stress);
  for (const k of sp.skills) Skills.use(s, k, 2);
  if (!chance(s, q.odds / 100)) { addStat(s, 'happiness', -3); const line = `I went after a ${sp.name.toLowerCase()} but they went with someone else.`; log(s, line, 'fame'); F.hist.push({ age: F.year, id, ok: false }); return { ok: true, landed: false, msg: line }; }
  earn(s, q.pay); F.earned += q.pay; F.total++; addStat(s, 'fame', 1 + sp.tier); addStat(s, 'happiness', 4);
  let extra = '';
  if (chance(s, q.scandal / 100)) { addStat(s, 'fame', -6); addStat(s, 'happiness', -8); extra = ' Then a clip of me went around for the wrong reasons.'; }
  if ((s.stats.stress || 0) >= 85) { addStat(s, 'health', -4); extra += ' I am running on fumes.'; }
  const line = `I landed a ${sp.name.toLowerCase()} and was paid ${fmtMoney(q.pay)}.${extra}`; log(s, line, 'fame'); F.hist.push({ age: F.year, id, ok: true, pay: q.pay });
  return { ok: true, landed: true, msg: line };
}
// Autopilot: take the best-paying available spot (same odds, pay and risks), skip when stress is already high
export function bestSpot(s) { const l = SPOTS.map((x) => quote(s, x.id)).filter((q) => q && q.ok).sort((a, b) => b.pay * b.odds - a.pay * a.odds); return l[0] || null; }
