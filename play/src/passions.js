// Passions: pick up to `slots` at a time (switch anytime; switching resets that passion's meter). Passion-tied events fire more often and
// build skills/careers. A full meter => permanent mastery (bonuses, frees the slot); at most `masteryCap` masteries per life. Kids get a head start.
import { D } from './data.js';
import { clamp } from './rng.js';
import { log, addStat } from './core.js';
import * as Skills from './skills.js';

const PD = () => D.passionsData, def = (id) => PD().passions.find((p) => p.id === id);
export const ensure = (s) => { if (!s.passions) s.passions = { active: [], mastered: [], hist: {} }; if (!s.awards) s.awards = []; return s.passions; };
export const has = (s, id) => ensure(s).active.some((a) => a.id === id);
export const isMastered = (s, id) => ensure(s).mastered.some((m) => m.id === id);
export const slotsFree = (s) => PD().slots - ensure(s).active.length;
export function status(s) {
  const P = ensure(s), age = Math.floor(s.age), cfg = PD();
  return { slots: cfg.slots, used: P.active.length, masteryCap: cfg.masteryCap, locked: age < cfg.minAge, minAge: cfg.minAge, benchmark: cfg.benchmark,
    active: P.active.map((a) => ({ ...a, ...def(a.id), meter: Math.round(a.meter), practiced: !!s.acted['passion:' + a.id] })), mastered: P.mastered.map((m) => ({ ...m, ...def(m.id) })),
    available: cfg.passions.filter((p) => !has(s, p.id) && !isMastered(s, p.id)).map((p) => ({ id: p.id, name: p.name, icon: p.icon, skills: Object.keys(p.skills) })), capReached: P.mastered.length >= cfg.masteryCap };
}
export function pick(s, id, replaceId) {
  const P = ensure(s), cfg = PD(), p = def(id); if (!p) return { ok: false, msg: 'Unknown passion.' };
  if (Math.floor(s.age) < cfg.minAge) return { ok: false, msg: `Passions start at age ${cfg.minAge}.` };
  if (has(s, id)) return { ok: false, msg: 'Already your passion.' }; if (isMastered(s, id)) return { ok: false, msg: 'You already mastered that.' };
  if (P.mastered.length >= cfg.masteryCap && false) return { ok: false, msg: 'No.' };
  if (P.active.length >= cfg.slots) {
    if (!replaceId || !has(s, replaceId)) return { ok: false, msg: 'All passion slots are full. Choose one to switch away from.', needReplace: true };
    drop(s, replaceId, true);
  }
  P.active.push({ id, meter: P.hist[id] ? 0 : 0, since: Math.floor(s.age) }); log(s, `I decided ${p.name.toLowerCase()} would be my passion.`, 'life'); return { ok: true, msg: `New passion: ${p.name}.` };
}
export function drop(s, id, silent) {
  const P = ensure(s), i = P.active.findIndex((a) => a.id === id); if (i < 0) return { ok: false, msg: 'Not active.' };
  P.active.splice(i, 1); if (!silent) log(s, `I walked away from ${def(id).name.toLowerCase()}. The meter reset.`, 'life'); return { ok: true, msg: 'Dropped (meter reset).' };
}
export function gain(s, id, amt) {
  const P = ensure(s), a = P.active.find((x) => x.id === id); if (!a) return; a.meter = clamp(a.meter + amt, 0, 100); if (a.meter >= PD().benchmark) master(s, a);
}
export function practice(s, id) {
  const a = ensure(s).active.find((x) => x.id === id); if (!a) return { ok: false, msg: 'Not an active passion.' }; if (s.acted['passion:' + id]) return { ok: false, msg: 'Already practiced this year.' };
  s.acted['passion:' + id] = 1; const p = def(id); for (const [k, w] of Object.entries(p.skills)) Skills.use(s, k, 3 * w);
  const g = PD().practiceGain * (1 + Skills.avg(s) / 150); gain(s, id, g); addStat(s, 'stress', 2);
  const line = `I spent the year practicing ${p.name.toLowerCase()}.`; log(s, line, 'act'); return { ok: true, msg: line };
}
function master(s, a) {
  const P = ensure(s), p = def(a.id); P.active = P.active.filter((x) => x !== a);
  if (P.mastered.length >= PD().masteryCap) { P.active.push({ ...a, meter: 99 }); return; }
  P.mastered.push({ id: a.id, age: Math.floor(s.age), title: p.masteryTitle });
  for (const [k, w] of Object.entries(p.skills)) { Skills.ensure(s); s.skills[k] = Math.min(100, Math.max(s.skills[k], 70) + 6 * w); }
  s.awards.push({ id: 'mastery_' + a.id, age: Math.floor(s.age), text: p.masteryTitle }); addStat(s, 'happiness', 12); addStat(s, 'fame', p.perks.fame ? 4 : 1);
  log(s, `I reached mastery in ${p.name.toLowerCase()} and became a ${p.masteryTitle}. A passion slot opened up.`, 'life'); s.flags['mastered_' + a.id] = 1; s.tally.masteries = (s.tally.masteries || 0) + 1;
}
export const perk = (s, key) => ensure(s).mastered.reduce((t, m) => t + ((def(m.id).perks || {})[key] || 0), 0);
export function yearTick(s) {
  const P = ensure(s), cfg = PD();
  for (const a of [...P.active]) { const p = def(a.id); for (const [k, w] of Object.entries(p.skills)) Skills.use(s, k, 1.2 * w); gain(s, a.id, cfg.yearGain * (1 + Skills.avg(s) / 200)); }
  for (const m of P.mastered) { const pk = def(m.id).perks || {}; for (const k of ['happy', 'health', 'smarts', 'looks', 'fame']) if (pk[k]) addStat(s, k === 'happy' ? 'happiness' : k, pk[k] * 0.5); for (const k of Object.keys(def(m.id).skills)) s.skillUsed[k] = 1; }
}
// kids inherit a head start from a parent's passions (mastered, or active with a decent meter)
export function inherit(s, prev) {
  if (!prev || !prev.passions) return; const P = ensure(s), ids = [...prev.passions.mastered.map((m) => m.id), ...prev.passions.active.filter((a) => a.meter >= 40).map((a) => a.id)];
  Skills.ensure(s); s.heritage = [];
  for (const id of ids.slice(0, 2)) { const p = def(id); s.heritage.push(id); for (const [k, w] of Object.entries(p.skills)) s.skills[k] = Math.min(100, s.skills[k] + 8 * w); if (P.active.length < PD().slots && Math.floor(s.age) >= PD().minAge) P.active.push({ id, meter: 25, since: Math.floor(s.age), head: true }); }
  if (s.heritage.length) log(s, `Growing up around ${s.heritage.map((i) => def(i).name.toLowerCase()).join(' and ')} gave me a head start.`, 'life');
}
// events: passion-tied events only when that passion is active; they are boosted and fire more often
export const boost = (s, e) => (e.if && e.if.passion ? 2.6 : 1);
export const rate = (s) => Math.min(2, ensure(s).active.length) * 0.16;
