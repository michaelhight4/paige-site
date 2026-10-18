// Health, illness, accidents, death hazards, doctor. No age cap: death comes from the hazards below (and health reaching 0).
import { D } from './data.js';
import { rnd, rint, pick, gauss, chance, clamp, wpick } from './rng.js';
import { log, spend, addStat } from './core.js';
import * as P from './people.js';
import * as Premium from './premium.js';
import * as Legacy from './legacy.js';

const H = () => D.life.health;
export const hasDisease = (s, id) => s.diseases.some((d) => d.id === id);
export const diseaseDef = (id) => D.diseases.find((d) => d.id === id);
export function lifestyleFactor(s) {
  const ls = H().lifestyle; let f = 1;
  for (const k of Object.keys(ls)) if (s.flags[k]) f += ls[k];
  return Math.max(0.5, f - 0.1 * Math.min(3, s.fit || 0));
}
// per-year hazards by source (probabilities per year)
export function hazards(s) {
  const h = H(), c = P.country(s), a = s.age, hp = s.stats.health;
  const hf = clamp(1.9 - hp / 60, h.healthFloor, 3);
  const age = h.baseHazard * Math.exp(h.ageRate * a) * hf * lifestyleFactor(s) / c.health + (a < 1 ? h.infantExtra : 0);
  const young = a >= 15 && a <= 30 ? h.accidentYoungBoost : 1;
  return {
    age,
    accident: h.accidentBase * young * (1 + (s.flags.drinker ? 0.5 : 0) + (s.flags.drugs ? 1 : 0) + (s.stats.crazy > 70 ? 0.5 : 0)) * (a > 70 ? 2 : 1),
    murder: h.murder * (s.record?.sentences ? 3 : 1) * (s.flags.drugs ? 2 : 1) * (1 + c.war),
    war: a >= 15 && a <= 60 ? c.war * h.warScale : 0,
    lightning: h.lightning, stress: s.stats.stress > 75 ? h.stressHazard * (s.stats.stress - 75) / 25 : 0,
  };
}
export function tick(s, dt) {
  if (!s.alive) return;
  const h = H(), sq = Math.sqrt(dt);
  // ageing decay, fitness, stress/mood effects on the body
  if (s.age > h.decay.start) addStat(s, 'health', -h.decay.perYear * (1 + h.decay.accel * (s.age - h.decay.start)) * dt * (1 - 0.1 * Math.min(3, s.fit || 0)));
  if (h.regen) addStat(s, 'health', h.regen * (100 - s.stats.health) / 100 * Math.max(0.2, 1 - Math.max(0, s.age - 50) / 50) * dt); // the body heals a little on its own
  s.fit = Math.max(0, (s.fit || 0) - h.fitDecay * dt);
  if (s.stats.stress > 70) addStat(s, 'health', -0.04 * (s.stats.stress - 70) * dt);
  if (s.prison) { const t = D.crimes.tiers.find((x) => x.id === s.prison.tier); addStat(s, 'health', -(t?.healthLoss || 1) * dt); }
  diseasesTick(s, dt);
  if (!s.alive) return;
  // death rolls
  const hz = hazards(s), parts = Object.entries(hz).map(([k, v]) => [k, 1 - Math.pow(1 - Math.min(0.9, v), dt)]);
  const surv = parts.reduce((a, [, p]) => a * (1 - p), 1);
  if (s.stats.health <= 0) return Legacy.die(s, ...deathFromHealth(s));
  if (rnd(s) > surv) {
    const tot = parts.reduce((a, [, p]) => a + p, 0); let r = rnd(s) * tot, k = 'age';
    for (const [name, p] of parts) { r -= p; if (r <= 0) { k = name; break; } }
    return Legacy.die(s, ...deathFrom(s, k));
  }
}
function deathFromHealth(s) { return deathFrom(s, 'age', true); }
function deathFrom(s, k, byHealth) {
  const dc = D.life.death;
  if (k === 'accident') { const opts = dc.accidents.filter((x) => s.age >= x.min && (!x.needsJob || s.job)); const a = wpick(s, opts, (x) => x.w); return ['accident', a.text, a.id]; }
  if (k === 'murder') return ['murder', 'murder'];
  if (k === 'war') return ['war', 'war'];
  if (k === 'lightning') return ['lightning', 'lightning'];
  if (k === 'stress') return ['disease', 'a stress-induced heart attack'];
  if (s.prison) return ['prison', 'prison'];
  // age / poor health
  const worst = [...s.diseases].filter((d) => diseaseDef(d.id)).sort((a, b) => (diseaseDef(b.id).death || 0) - (diseaseDef(a.id).death || 0))[0];
  if (worst && (diseaseDef(worst.id).death > 0 || byHealth)) return ['disease', (diseaseDef(worst.id).death > 0 ? '' : 'complications of ') + diseaseDef(worst.id).name.toLowerCase(), worst.id];
  if (s.flags.drugs && s.age < 60 && chance(s, 0.4)) return ['overdose', 'a drug overdose'];
  return s.age >= 70 ? ['old', 'old age'] : ['disease', 'heart failure'];
}
function diseasesTick(s, dt) {
  const L = D.life.health;
  // existing
  for (const d of [...s.diseases]) {
    const def = diseaseDef(d.id); if (!def) { s.diseases.splice(s.diseases.indexOf(d), 1); continue; }
    if (!d.dx && chance(s, 0.5 * dt)) { d.dx = true; log(s, `I was diagnosed with ${def.name.toLowerCase()}.`, 'health'); }
    const y = d.treated && def.managed != null ? def.managed : def.yearly; if (y) addStat(s, 'health', y * dt);
    if (d.treated && def.cost && def.sev === 'chronic') spend(s, def.cost * 0.4 * dt);
    const dp = d.treated ? def.tdeath : def.death;
    if (dp && chance(s, 1 - Math.pow(1 - dp, dt))) return Legacy.die(s, 'disease', def.name.toLowerCase(), d.id);
    if (def.rem && chance(s, 1 - Math.pow(1 - def.rem, dt))) { s.diseases.splice(s.diseases.indexOf(d), 1); log(s, `My ${def.name.toLowerCase()} went away on its own, which was rude of it not to warn me.`, 'health'); }
  }
  // routine care: people with a job or strong public health get checked and treated now and then, even if you never visit the doctor
  { const c = P.country(s), cov = L.autoCare || { chance: 0.3, minAge: 6 };
    if (s.diseases.length && s.age >= cov.minAge && (c.health >= 1.05 || s.job) && chance(s, cov.chance * dt)) {
      for (const d of [...s.diseases]) { const def = diseaseDef(d.id); if (!def) continue; if (!d.dx) { d.dx = true; log(s, `A routine checkup found ${def.name.toLowerCase()}.`, 'health'); } if (!d.treated && def.cost > 0 && s.cash >= treatCost(s, def) && def.sev !== 'minor') { treat(s, d.id); if (!s.diseases.includes(d)) continue; } }
    } }
  // onset
  if (Premium.isUnlocked('fountain')) return; // Fountain of Youth: never catch disease
  if (!chance(s, L.diseaseBase * dt * (1 + s.age / 50))) return;
  const lifeBad = Object.keys(L.lifestyle).filter((k) => s.flags[k]).length;
  const pool = D.diseases.filter((d) => s.age >= d.ages[0] && s.age <= d.ages[1] && !hasDisease(s, d.id) && !(d.sev === 'instant_death' && s.age < 45));
  const def = wpick(s, pool, (d) => {
    let w = d.w;
    if (d.sev === 'serious' || d.sev === 'deadly' || d.sev === 'can_kill_if_untreated') w *= 1 + s.age / 40 + lifeBad * 0.5;
    if (d.std && s.flags.risky) w *= 8; if (d.stress && s.stats.stress > 60) w *= 3; if (d.cat === 'emotional' && s.stats.stress > 60) w *= 2.5;
    if (s.stats.health < 50) w *= 1 + (50 - s.stats.health) / 60;
    return w * (P.country(s).health < 1 ? 1.2 : 1);
  });
  if (!def) return;
  if (def.instant) return Legacy.die(s, 'disease', def.name.toLowerCase(), def.id);
  const dx = def.sev === 'minor' || chance(s, 0.6);
  s.diseases.push({ id: def.id, since: s.age, dx, treated: false });
  addStat(s, 'health', def.onset); s.tally.diseases++;
  log(s, dx ? `I ${def.verb} ${def.name.toLowerCase()}.` : 'I felt strangely unwell this year, and I did not know why.', 'health');
}
// Treatment price: insured through a job (-60%) or in a country with strong public health (-75%).
export function treatCost(s, def) { const c = P.country(s); return Math.round(def.cost * (c.health >= 1.05 ? 0.25 : s.job ? 0.4 : 1)); }
export function doctorVisit(s) {
  const cfg = H().doctor; if (s.age < cfg.minAge) return { ok: false, msg: 'Too young for a doctor.' };
  if (s.acted.doctor) return { ok: false, msg: 'Already visited this turn.' };
  if (s.cash < cfg.cost) return { ok: false, msg: 'Cannot afford the doctor.' };
  s.acted.doctor = 1; spend(s, cfg.cost); addStat(s, 'health', cfg.fx);
  const lines = [];
  for (const d of s.diseases) {
    const def = diseaseDef(d.id); if (!d.dx) { d.dx = true; lines.push(`The doctor diagnosed me with ${def.name.toLowerCase()}.`); }
  }
  log(s, s.diseases.length ? `I visited a doctor. ${lines.join(' ') || 'Nothing new turned up.'}` : 'I visited a doctor, who told me I was fine and charged me for it.', 'health');
  for (const d of [...s.diseases]) if (d.dx && !d.treated && s.cash >= treatCost(s, diseaseDef(d.id)) && diseaseDef(d.id).cost > 0) treat(s, d.id); // the doctor starts affordable treatment
  return { ok: true, msg: lines.join(' ') || 'Checkup done.' };
}
export function treat(s, id) {
  const d = s.diseases.find((x) => x.id === id); if (!d || !d.dx) return { ok: false, msg: 'Not diagnosed.' };
  const def = diseaseDef(id), cost = treatCost(s, def); if (s.cash < cost) return { ok: false, msg: 'Cannot afford treatment.' };
  spend(s, cost);
  if (chance(s, def.cure)) { s.diseases.splice(s.diseases.indexOf(d), 1); addStat(s, 'health', 4); log(s, `I was treated for ${def.name.toLowerCase()} and cured.`, 'health'); return { ok: true, cured: true, msg: 'Cured!' }; }
  d.treated = true; log(s, `I started treatment for ${def.name.toLowerCase()}. It will not be fun.`, 'health'); return { ok: true, cured: false, msg: 'Treatment started.' };
}
