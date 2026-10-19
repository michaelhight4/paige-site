// Crime and prison (data/crimes.json): catch odds, trials, sentences that double on repeat, security tiers, parole, escape, appeals.
import { fmtMoney } from './fmt.js';
import { D } from './data.js';
import { rnd, rint, pick, chance, clamp, gauss } from './rng.js';
import { log, earn, spend, addStat } from './core.js';
import * as P from './people.js';
import * as Premium from './premium.js';
import * as Legacy from './legacy.js';

const CR = () => D.crimes, rules = () => D.crimes.rules;
export const crimeDef = (id) => CR().crimes.find((c) => c.id === id);
export const tierDef = (id) => CR().tiers.find((t) => t.id === id);
export function available(s) {
  if (s.prison) return [];
  return CR().crimes.filter((c) => c.menu && s.age >= c.minAge && (!c.if || ((!c.if.job || s.job) && (!c.if.biz || s.biz.length) && (!c.if.minFame || s.stats.fame >= c.if.minFame) && (!c.if.sportsOwner || s.biz.some((b) => b.kind === 'sports')))));
}
export function catchChance(s, c) {
  if (Premium.isUnlocked('golden_gun')) return 0; // Golden Gun: always get away with it
  const rec = s.record.sentences > 0 ? 1.15 : 1;
  return clamp(c.catch * rec * (1 - (s.stats.smarts - 50) * rules().catchSmartsMod), 0.05, 0.95);
}
// Sentence length in years. u in [0,1) picks the point of the crime's range; repeat offenders get multiplier^min(priors, cap) (doubles per prior sentence).
export function sentenceYears(c, priors, u) {
  const base = c.sentence[0] + (c.sentence[1] - c.sentence[0]) * u;
  return Math.min(rules().lifeSentence, base * Math.pow(rules().repeatMultiplier, Math.min(priors, rules().repeatCap)));
}
export function tierFor(c, years, age) {
  if (age < 18) return 'juvie';
  if (c.severity >= 5 || years > 10) return 'maximum';
  return years <= tierDef('minimum').maxSentence ? 'minimum' : years <= tierDef('medium').maxSentence ? 'medium' : 'maximum';
}
const TIER_ORDER = ['juvie', 'minimum', 'medium', 'maximum'];
export function commit(s, id) {
  const c = crimeDef(id); if (!c || s.prison || s.age < c.minAge) return { ok: false, msg: 'Not possible.' };
  s.tally.crimes++;
  if (chance(s, catchChance(s, c))) return arrest(s, id, true);
  return success(s, c);
}
function success(s, c) {
  const loot = c.loot[1] ? Math.round(c.loot[0] + (c.loot[1] - c.loot[0]) * rnd(s)) : 0; if (loot) earn(s, loot);
  addStat(s, 'karma', c.karma); addStat(s, 'happiness', 4);
  if (['shoplift'].includes(c.id)) s.tally.theft += 1; if (['burglary', 'gta', 'bank'].includes(c.id)) s.tally.theft += 2;
  if (c.id === 'murder' || c.id === 'hitman') { s.tally.kills++; s.tally.wickedActs++; }
  s.flags.criminal = 1; log(s, c.ok + (loot ? ` I made ${fmtMoney(loot)}.` : ''), 'crime'); return { ok: true, msg: c.ok, loot };
}
// Called from event choices: caught=null => roll normally; caught=true/false => already decided by the event
export function fromEvent(s, id, caught) {
  const c = crimeDef(id); if (!c) return;
  s.tally.crimes++;
  if (c.id === 'shoplift' || c.id === 'gta') { if (caught === false) { s.tally.theft += c.id === 'gta' ? 2 : 1; } }
  if (caught === true || (caught == null && chance(s, catchChance(s, c)))) { if (c.severity >= 2 || c.id === 'shoplift') arrest(s, id, true); }
}
export function arrest(s, id, fromCommit) {
  const c = crimeDef(id), priors = s.record.sentences;
  let years = sentenceYears(c, priors, rnd(s));
  if (s.age < 18) years = Math.min(years, rules().juvieMaxYears);
  years = Math.max(0.25, Math.round(years * 4) / 4);
  const tier = tierFor(c, years, s.age);
  s.prison = { crime: id, total: years, left: years, tier, beh: 0, served: 0, appeals: 0, escapedThisYear: false, since: s.age };
  s.record.sentences++; s.tally.sentences++; s.flags.criminal = 1;
  if (s.job) { s.job = null; P.newCoworkers(s); }
  s.pending = s.pending.filter((p) => p.kind !== 'event');
  addStat(s, 'happiness', -16); addStat(s, 'karma', Math.min(0, c.karma / 2));
  for (const p of P.living(s)) if (p.rel === 'partner' || p.rel === 'spouse' || p.rel === 'friend') P.adjustBar(p, -8);
  const yrs = years >= 99 ? 'life' : years < 1 ? `${Math.round(years * 12)} months` : `${years} years`;
  const msg = `${c.caught} I was sentenced to ${yrs} in ${tierDef(tier).name.toLowerCase()}${priors ? ', doubled on account of my record' : ''}.`;
  log(s, msg, 'crime'); return { ok: false, msg, caught: true };
}
export function release(s, why = 'served') {
  const pr = s.prison; if (!pr) return; const y = Math.round(pr.served * 10) / 10;
  s.prison = null; log(s, `I was ${why === 'parole' ? 'released on parole' : 'released'} after ${y} years. I spent the first day in the sun doing nothing.`, 'crime');
  s.record.priors++; P.newCoworkers(s);
}
export function tick(s, dt) {
  const pr = s.prison; if (!pr) { fugitiveTick(s, dt); return; }
  pr.left -= dt; pr.served += dt; s.tally.prisonYears += dt; if (pr.left <= 0.001 && pr.total < rules().lifeSentence) { release(s); return; }
  const t = tierDef(pr.tier); addStat(s, 'stress', (t.stress || 4) * dt * 0.4); addStat(s, 'happiness', -1 * dt);
  s.acted.behave = s.acted.behave; s.acted.escape = s.acted.escape;
}
function fugitiveTick(s, dt) {
  if (!s.fugitive) return;
  if (chance(s, 0.25 * dt)) { const f = s.fugitive; s.fugitive = null; const c = crimeDef(f.crime); const years = Math.max(f.left, 0) + rules().escapeAddYears;
    const min = TIER_ORDER.indexOf(rules().escapeMinTier), tier = TIER_ORDER[Math.max(min, TIER_ORDER.indexOf(f.tier))];
    s.prison = { crime: f.crime, total: years, left: years, tier, beh: -1, served: 0, appeals: 0, since: s.age }; s.record.sentences++; s.tally.sentences++;
    if (s.job) { s.job = null; } log(s, `I was recaptured after my escape and returned to ${tierDef(tier).name.toLowerCase()} with ${rules().escapeAddYears} years added.`, 'crime'); }
}
export const parole = (s) => { const pr = s.prison; if (!pr || pr.tier === 'juvie' && false) return { ok: false, msg: 'Not in prison.' }; if (pr.served < pr.total * rules().paroleFraction) return { ok: false, msg: 'Not eligible yet.' };
  if (s.acted.parole) return { ok: false, msg: 'Already tried this turn.' }; s.acted.parole = 1;
  const ok = chance(s, clamp(0.25 + pr.beh * 0.12 - (s.record.priors * 0.05), 0.05, 0.8)); if (ok) { release(s, 'parole'); return { ok, msg: 'Parole granted.' }; } log(s, 'I was denied parole by a board that did not look up from its sandwiches.', 'crime'); return { ok, msg: 'Parole denied.' }; };
export function behave(s) { const pr = s.prison; if (!pr || s.acted.behave) return { ok: false, msg: 'No.' }; s.acted.behave = 1; pr.beh++; addStat(s, 'karma', 4); log(s, 'I kept my head down and followed the rules for a while.', 'crime'); return { ok: true, msg: 'Behaved.' }; }
export function escape(s) {
  const pr = s.prison; if (!pr || s.acted.escape) return { ok: false, msg: 'No.' }; s.acted.escape = 1;
  const t = tierDef(pr.tier), pc = clamp(t.escape + (s.stats.smarts - 50) * 0.002, 0.02, 0.5);
  if (chance(s, pc)) { s.fugitive = { crime: pr.crime, left: pr.left, tier: pr.tier }; s.prison = null; s.tally.escapes++; addStat(s, 'karma', -8); log(s, 'I escaped from prison through a laundry cart. I am now technically a fugitive.', 'crime'); return { ok: true, msg: 'Escaped!' }; }
  const idx = Math.max(TIER_ORDER.indexOf(rules().escapeMinTier), TIER_ORDER.indexOf(pr.tier)); if (pr.tier !== 'juvie') pr.tier = TIER_ORDER[idx];
  pr.left += rules().escapeAddYears; pr.total += rules().escapeAddYears; pr.beh -= 2; addStat(s, 'health', -8);
  log(s, `I tried to escape and was caught. I was moved to ${tierDef(pr.tier).name.toLowerCase()} and got ${rules().escapeAddYears} more years.`, 'crime'); return { ok: false, msg: 'Caught.' };
}
export function appeal(s, firm) {
  const pr = s.prison; if (!pr || pr.appeals >= 1 || pr.total >= rules().lifeSentence + 1 && false) return { ok: false, msg: 'No appeal possible.' };
  const cost = rules().appealCost[firm], pc = rules().appealChance[firm]; if (s.cash < cost) return { ok: false, msg: 'Cannot afford the lawyers.' };
  spend(s, cost); pr.appeals++;
  if (chance(s, pc)) { const cut = pr.left * (0.3 + 0.2 * rnd(s)); pr.left -= cut; pr.total -= cut; log(s, `A lawyer got my sentence cut by ${cut.toFixed(1)} years. I tipped him in gratitude.`, 'crime'); return { ok: true, msg: 'Sentence reduced.' }; }
  log(s, 'My appeal was rejected. The lawyers kept the money as a courtesy.', 'crime'); return { ok: false, msg: 'Appeal rejected.' };
}
