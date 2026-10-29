// Kilumen real-time battles (rtb), the pure simulation. DEV ONLY prototype (Oct 29 2026, behind ?rtb=1; ?rtb=0 kills it).
// No DOM here: node tests drive it with a seeded rng and a fixed 1/60 s step. Structure inspired by fan "real-time battle"
// mods (field arenas, telegraphed foe attacks, one attack token between foes, dodge with i-frames); no code or assets from them.
// Reused Kilumen rules, unchanged: battleStats / maxHp / energyOf / levelForXp (src/systems/creature.js), skills
// (src/battle/data/skills.js), DRAFT_CHART + KILUMEN_RULES (strong 1.5, weak 0.6, affinity 1.3, Clean Strike 1/20 x1.4,
// overuse 0.6 / self 1/8, XP baseXp * L / 7), capture (src/battle/capture.js captureChance / captureRoll).
import { battleStats, maxHp, energyOf, levelForXp, speciesInfo, createCreature, defaultSkills } from '../systems/creature.js?v=v0.2.73-alpha';
import { buildSkills } from '../battle/data/skills.js?v=v0.2.73-alpha';
import { buildCreatures } from '../battle/data/creatures.js?v=v0.2.73-alpha';
import { DRAFT_CHART } from '../battle/data/elements.js?v=v0.2.73-alpha';
import { KILUMEN_RULES } from '../battle/data/rules.js?v=v0.2.73-alpha';
import { captureChance, captureRoll } from '../battle/capture.js?v=v0.2.73-alpha';
import { SHAPE_STATS, shapeOf, cooldownFor, reachOf } from './moves.js?v=v0.2.73-alpha';

let _sk = null, _cr = null;
const SKILLS = () => (_sk ||= buildSkills());
const CREATURES = () => (_cr ||= buildCreatures());

// Real-time tuning, all PLACEHOLDERS for Gary ("games are hard": foes telegraph, but hit as hard as in turn battles).
export const RT = {
  allyWindupMult: 1, foeTelegraph: 0.38, foeTelegraphEnraged: 0.26, foeGap: [0.55, 1.15], foeGapEnraged: [0.3, 0.7],
  enragedAt: 0.35, moveBase: 150, movePerSpe: 1.5, moveMax: 300, sprint: 1.45, foeMoveMult: 0.85,
  dodgeTime: 0.17, dodgeSpeed: 3.1, dodgeIframes: 0.24, dodgeCd: 0.65, nearMiss: 20,
  hitIframes: 0.14, hitstun: 0.16, flinchFrac: 0.12, swapTime: 0.45, swapCd: 2.5, trainerSend: 1.1, trainerRecall: 0.35, retreatHold: 1.0,
  pulse: 0.5, crystalSpeed: 560, crystalRange: 420, alert: 0.55, bodyR: 22, foeDodge: 0.22, foeDodgeCd: 2.2,
  boostTime: 10, drowsyTime: 2.6, scorchTime: 6, scorchTick: 2, buffer: 0.2, outro: 1.1, forcedSwapDelay: 0.9,
};

export const elsOf = (sp) => (speciesInfo(sp)?.el || ['normal']).map((e) => String(e).toLowerCase());
export function effectiveness(atkEl, defEls, chart = DRAFT_CHART, R = KILUMEN_RULES) {
  const row = chart[atkEl] || {};
  let m = 1;
  for (const d of defEls) m *= (row.none || []).includes(d) ? 0 : (row.strong || []).includes(d) ? R.strongMult : (row.weak || []).includes(d) ? R.weakMult : 1;
  return m;
}
const stage = (n) => (n >= 0 ? 1 + 0.5 * n : 1 / (1 - 0.5 * n));

/** One hit, same shape as the turn engine: floor(floor(floor(2L/5+2)*BP*A/D)/50)+2, then affinity, elements, Clean Strike, roll. */
export function damageOf(att, def, sk, rng = Math.random, { overuse = false, R = KILUMEN_RULES } = {}) {
  if (!sk?.basePower) return { dmg: 0, mult: 1, crit: false };
  const phys = sk.category === 'Physical', a = att.stats, d = def.stats;
  const A = (phys ? a.atk : a.spa) * stage(att.boosts?.[phys ? 'atk' : 'spa'] || 0), D = (phys ? d.def : d.spd) * stage(def.boosts?.[phys ? 'def' : 'spd'] || 0);
  const L = att.c.level || 1, el = String(sk.type).toLowerCase();
  let dmg = Math.floor(Math.floor(Math.floor((2 * L) / 5 + 2) * sk.basePower * A / Math.max(1, D)) / 50) + 2;
  const aff = att.els.includes(el) ? R.affinity : 1, mult = effectiveness(el, def.els, DRAFT_CHART, R);
  const crit = rng() < 1 / (R.critStages?.[1] || 20);
  dmg = dmg * aff * mult * (crit ? R.critMult : 1) * (0.85 + rng() * 0.15) * (overuse ? R.overuseDamage : 1);
  return { dmg: mult === 0 ? 0 : Math.max(1, Math.floor(dmg)), mult, crit, aff: aff > 1 };
}
/** XP for beating a foe (engine rule): max(1, floor(baseXp * foeLevel / xpDivisor)). */
export const xpFor = (foeSpecies, foeLevel, R = KILUMEN_RULES) => Math.max(1, Math.floor((CREATURES()[foeSpecies]?.baseXp ?? 50) * foeLevel / R.xpDivisor));

function fighter(c, side, x, y) {
  const skills = (c.skills?.length ? c.skills : defaultSkills(c.species)).slice(0, 4);
  const st = battleStats(c), spe = st.spe;
  return {
    c, side, x, y, vx: 0, vy: 0, r: RT.bodyR, face: { x: side === 'ally' ? 1 : -1, y: 0 }, stats: st, els: elsOf(c.species),
    skills, cds: skills.map(() => 0), mhp: maxHp(c), speed: Math.min(RT.moveMax, RT.moveBase + spe * RT.movePerSpe) * (side === 'foe' ? RT.foeMoveMult : 1),
    boosts: {}, boostT: 0, iframes: 0, stun: 0, dash: null, dodgeCd: 0, act: null, recover: 0, drowsy: 0, scorch: 0, scorchT: 0,
    alive: c.hp > 0, held: null, ai: side === 'foe' ? { state: 'idle', t: 0, gap: 0.8, strafe: 1, last: -1, dodgeCd: 0, wander: null } : null, flash: 0, anim: 0,
  };
}

export class RtBattle {
  /** opts: party (creature records, cloned here), foes [{species, level, variant}], start {x,y} native px, arena {x0,y0,x1,y1},
   *  walk(x,y) -> bool (body may stand), solid(x,y) -> bool (stops shots), rng, foeSkills(sp) */
  constructor({ party, foes, start, arena, walk = () => true, solid = () => false, rng = Math.random, trainer = false, xpShare = 0, foeDamageMult = 1, foeItems = null, foeHealAt = 0.25, foeHealsPer = 1, sendFrom = null, linkBand = 'team_link_band' }) {
    this.rng = rng; this.arena = arena; this.walk = walk; this.solid = solid; this.trainer = trainer; this.xpShare = xpShare; this.foeDamageMult = foeDamageMult;
    // trainer healing items (same rule as the turn battle, src/battle/battle.js foeHeal): Master bag {tonicsmall, toniclarge},
    // the field foe heals at <= foeHealAt HP, at most foeHealsPer items per creature; sendFrom {x,y} = where the trainer stands
    this.foeBag = { ...(foeItems || {}) }; this.foeHealAt = foeHealAt; this.foeHealsPer = foeHealsPer; this.foeHealT = 0; this.sendFrom = sendFrom;
    this.linkBand = linkBand; this.linkXp = [];
    // trainer fights (branch rtb-trainer, Gary Oct 29 2026): one foe on the field at a time, the rest wait in this.reserve;
    // the trainer sends the next one after a faint and may recall a badly hurt one (real-time trainer AI). No capture, no retreat.
    this.reserve = [];
    if (trainer && foes.length > 1) { this.reserve = foes.slice(1).map((f) => createCreature({ species: f.species, level: f.level, variant: f.variant || '' })); foes = foes.slice(0, 1); }
    this.sendT = 0; this.recalls = 0;
    this.party = party.map((c) => ({ ...c, energy: energyOf(c).slice(), skills: (c.skills?.length ? c.skills : defaultSkills(c.species)).slice() }));
    this.active = Math.max(0, this.party.findIndex((c) => c.hp > 0));
    this.ally = fighter(this.party[this.active], 'ally', start.x, start.y);
    this.foes = foes.map((f, i) => {
      const c = createCreature({ species: f.species, level: f.level, variant: f.variant || '' });
      const ang = (i - (foes.length - 1) / 2) * 0.9, d = 150 + i * 10;
      const fx = fighter(c, 'foe', start.x + Math.cos(ang) * d, start.y + Math.sin(ang) * d * 0.7);
      this._place(fx); return fx;
    });
    this.shots = []; this.events = []; this.t = 0; this.state = 'fight'; this.outT = 0; this.outcome = null;
    this.token = null; this.caught = null; this.crystalUsed = 0; this.capture = null; this.swapCd = 0; this.retreatT = 0;
    this.buffer = null; this.xpGained = 0; this.forced = 0; this.selected = 0; this.target = null; this.used = new Set();
    for (const f of this.foes) { f.ai.state = 'alert'; f.ai.t = RT.alert + this.rng() * 0.25; this.emit('alert', { who: f }); }
  }
  emit(type, o = {}) { this.events.push({ type, t: this.t, ...o }); }
  drain() { const e = this.events; this.events = []; return e; }
  get living() { return this.foes.filter((f) => f.alive && !f.caught); }
  _place(f) { const a = this.arena; f.x = Math.max(a.x0 + f.r, Math.min(a.x1 - f.r, f.x)); f.y = Math.max(a.y0 + f.r, Math.min(a.y1 - f.r, f.y)); }
  _canStand(x, y, r) { const a = this.arena; if (x - r < a.x0 || x + r > a.x1 || y - r < a.y0 || y + r > a.y1) return false; return this.walk(x - r * 0.7, y) && this.walk(x + r * 0.7, y) && this.walk(x, y - r * 0.5) && this.walk(x, y + r * 0.7); }
  _move(f, dx, dy) {
    if (dx && this._canStand(f.x + dx, f.y, f.r)) f.x += dx; else if (dx) f.vx *= -0.3;
    if (dy && this._canStand(f.x, f.y + dy, f.r)) f.y += dy; else if (dy) f.vy *= -0.3;
  }
  nearestFoe(from = this.ally) { let b = null, bd = Infinity; for (const f of this.living) { const d = Math.hypot(f.x - from.x, f.y - from.y); if (d < bd) { bd = d; b = f; } } return b; }

  /** input: {mx,my} move (-1..1), sprint (held), dodge / fire (slot 0-3 or 'sel') / select / swap / crystal (edges), retreat (held) */
  step(dt, input = {}) {
    this.t += dt;
    if (this.state !== 'fight') { this.outT -= dt; this._tickBodies(dt, {}); return; }
    const a = this.ally;
    this.target = this.nearestFoe();
    if (input.select) { this.selected = (this.selected + 1) % a.skills.length; this.emit('select', { slot: this.selected }); }
    if (input.fire != null) this.buffer = { slot: input.fire === 'sel' ? this.selected : input.fire, t: RT.buffer };
    if (this.buffer) { if (this._tryFire(a, this.buffer.slot)) this.buffer = null; else if ((this.buffer.t -= dt) <= 0) this.buffer = null; }
    if (input.dodge) this._dodge(a, input.mx || a.face.x, input.my || a.face.y);
    if (input.swap) this.swap();
    if (input.crystal) this.castCrystal(input.crystal);
    if (input.flee && a.alive && !this.trainer) return this._end('retreat'); // v0.2.61: Caps Lock, wild only
    if (input.retreat && a.alive && !this.trainer) {
      this.retreatT += dt; if (this.retreatT >= RT.retreatHold) return this._end('retreat');
    } else this.retreatT = 0;
    this.swapCd = Math.max(0, this.swapCd - dt);
    // ally movement
    if (a.alive && !a.dash && a.stun <= 0 && !a.act) {
      let mx = input.mx || 0, my = input.my || 0; const m = Math.hypot(mx, my);
      if (m > 0) { mx /= m; my /= m; a.face = { x: mx, y: my }; }
      const sp = a.speed * (input.sprint ? RT.sprint : 1) * (a.drowsy > 0 ? 0.5 : 1) * stage(a.boosts.spe || 0) ** 0.5;
      a.vx = mx * sp; a.vy = my * sp; a.anim += m > 0 ? dt * (input.sprint ? 1.6 : 1) : 0;
    } else if (!a.dash) { a.vx *= 0.8; a.vy *= 0.8; }
    for (const f of this.foes) if (f.alive && !f.caught) this._ai(f, dt);
    this._tickBodies(dt, input);
    this._tickShots(dt);
    this._tickCapture(dt);
    if (this.forced > 0 && (this.forced -= dt) <= 0) this._forcedSwap();
    if (this.trainer) this._trainerAi(dt);
    if (this.state === 'fight' && !this.living.length && !this.capture && !this.reserve.some((c) => c.hp > 0)) this._end('win');
  }

  /** trainer: send the next creature after a faint (short pause), recall a foe under 20 % HP sometimes (max 1 per fight per creature) */
  _trainerAi(dt) {
    if (!this.living.length) {
      const next = this.reserve.findIndex((c) => c.hp > 0); if (next < 0) return;
      if ((this.sendT += dt) < RT.trainerSend) return;
      this.sendT = 0; this._sendOut(this.reserve.splice(next, 1)[0]); return;
    }
    const f = this.living[0];
    if (this._foeHeal(f, dt)) return;
    if (!f.recalled && f.c.hp / f.mhp < 0.2 && !f.act && this.reserve.some((c) => c.hp / maxHp(c) > 0.5) && this.rng() < dt * RT.trainerRecall) {
      const i = this.reserve.findIndex((c) => c.hp / maxHp(c) > 0.5), into = this.reserve.splice(i, 1)[0];
      this.foes.splice(this.foes.indexOf(f), 1); f.c._recalled = true; this.reserve.push(f.c); this.recalls++;
      this.emit('recall', { who: f, x: f.x, y: f.y }); const nf = this._sendOut(into, f); nf.recalled = true;
    }
  }
  /** trainer item: Small Remedy 20 HP / Big Remedy 60 HP (Big when 40+ HP is missing or no Small left), short delay so it reads */
  _foeHeal(f, dt) {
    if (!f || f.act || f.dash || !(f.c.hp > 0) || f.c.hp / f.mhp > this.foeHealAt || (f.c._heals || 0) >= this.foeHealsPer) { this.foeHealT = 0; return false; }
    const big = (this.foeBag.toniclarge || 0) > 0, small = (this.foeBag.tonicsmall || 0) > 0, miss = f.mhp - f.c.hp;
    const id = big && (miss >= 40 || !small) ? 'toniclarge' : small ? 'tonicsmall' : null; if (!id) return false;
    if ((this.foeHealT += dt) < 0.35) return false; this.foeHealT = 0;
    this.foeBag[id]--; f.c._heals = (f.c._heals || 0) + 1;
    const n = Math.min(miss, id === 'toniclarge' ? 60 : 20); f.c.hp += n;
    this.emit('foeItem', { who: f, id, n }); this.emit('heal', { who: f, n }); return true;
  }
  _sendOut(c, at = null) {
    const a = this.ally, ang = this.rng() * Math.PI * 2, s = this.sendFrom;
    // out in front of the trainer, a step toward the fight (falls back to around the ally)
    const sx = s ? s.x + (a.x - s.x) * 0.35 : a.x + Math.cos(ang) * 200, sy = s ? s.y + (a.y - s.y) * 0.35 : a.y + Math.sin(ang) * 140;
    const nf = fighter(c, 'foe', at ? at.x : sx, at ? at.y : sy); this._place(nf);
    if (!at && !this._canStand(nf.x, nf.y, nf.r)) for (let k = 1; k < 16; k++) { const t = k * 0.7, x = nf.x + Math.cos(t) * 24 * k, y = nf.y + Math.sin(t) * 18 * k; if (this._canStand(x, y, nf.r)) { nf.x = x; nf.y = y; break; } }
    nf.ai.state = 'alert'; nf.ai.t = RT.alert; nf.iframes = 0.4; if (c._recalled) nf.recalled = true;
    this.foes.push(nf); this.emit('sendOut', { who: nf }); this.emit('alert', { who: nf }); return nf;
  }

  _tickBodies(dt) {
    for (const f of [this.ally, ...this.foes]) {
      if (!f.alive || f.caught) continue;
      f.iframes = Math.max(0, f.iframes - dt); f.stun = Math.max(0, f.stun - dt); f.recover = Math.max(0, f.recover - dt); f.flash = Math.max(0, f.flash - dt);
      f.dodgeCd = Math.max(0, f.dodgeCd - dt); f.cds = f.cds.map((c) => Math.max(0, c - dt));
      if (f.boostT > 0 && (f.boostT -= dt) <= 0) f.boosts = {};
      if (f.drowsy > 0) f.drowsy = Math.max(0, f.drowsy - dt);
      if (f.scorch > 0) { f.scorch -= dt; if ((f.scorchT -= dt) <= 0) { f.scorchT = RT.scorchTick; this._hurt(f, Math.max(1, Math.floor(f.mhp / 16)), { kind: 'scorch' }); } }
      if (f.held) continue;
      if (f.dash) {
        const d = f.dash; d.t -= dt; this._move(f, d.vx * dt, d.vy * dt);
        if (d.hit) for (const o of this._enemiesOf(f)) if (!d.done.has(o) && Math.hypot(o.x - f.x, o.y - f.y) < f.r + o.r + 6) { d.done.add(o); this._strike(f, o, d.hit.slot, d.vx, d.vy, d.overuse); }
        if (d.t <= 0) { f.dash = null; f.recover = d.recover || 0; f.vx = f.vy = 0; }
        continue;
      }
      if (f.act) { f.act.t -= dt; if (f.act.t <= 0) { const act = f.act; f.act = null; this._release(f, act); } }
      if (f.stun > 0 || f.act || f.recover > 0) { f.vx *= 0.82; f.vy *= 0.82; }
      this._move(f, f.vx * dt, f.vy * dt);
    }
    // bodies push apart (no stacking)
    const all = [this.ally, ...this.foes].filter((f) => f.alive && !f.caught);
    for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) {
      const p = all[i], q = all[j], dx = q.x - p.x, dy = q.y - p.y, d = Math.hypot(dx, dy) || 1, min = p.r + q.r - 6;
      if (d < min) { const push = (min - d) / 2; this._move(p, (-dx / d) * push, (-dy / d) * push); this._move(q, (dx / d) * push, (dy / d) * push); }
    }
  }
  _enemiesOf(f) { return f.side === 'ally' ? this.living : (this.ally.alive ? [this.ally] : []); }

  /** start a skill: cooldown + Energy (0 Energy = overuse: weaker, less accurate, 1/8 self damage, as the turn rules) */
  _tryFire(f, slot) {
    const id = f.skills[slot], sk = SKILLS()[id];
    if (!sk || !f.alive || f.held || f.act || f.dash || f.stun > 0 || f.recover > 0 || f.cds[slot] > 0) return false;
    if (f.side === 'ally' && f.drowsy > 0) return false;
    const en = f.c.energy, overuse = Array.isArray(en) && en[slot] <= 0;
    if (Array.isArray(en) && en[slot] > 0) en[slot]--;
    const sh = shapeOf(id, sk), S = SHAPE_STATS[sh], tgt = f.side === 'ally' ? this.target : this.ally;
    let aim = tgt ? { x: tgt.x - f.x, y: tgt.y - f.y } : { ...f.face };
    if (f.side === 'foe' && tgt && S.speed) { // foes lead their shots a little (harder to just walk sideways)
      const tt = Math.hypot(aim.x, aim.y) / S.speed * 0.6; aim = { x: aim.x + tgt.vx * tt, y: aim.y + tgt.vy * tt };
    }
    const m = Math.hypot(aim.x, aim.y) || 1; aim = { x: aim.x / m, y: aim.y / m }; f.face = { ...aim };
    const telegraph = f.side === 'foe' ? (f.mhp && f.c.hp / f.mhp < RT.enragedAt ? RT.foeTelegraphEnraged : RT.foeTelegraph) : 0;
    f.act = { slot, id, sk, sh, aim, overuse, t: S.windup * RT.allyWindupMult + telegraph, total: S.windup + telegraph };
    f.cds[slot] = cooldownFor(sk) + f.act.t;
    if (f.side === 'ally') this.used.add(slot);
    this.emit(f.side === 'foe' ? 'telegraph' : 'windup', { who: f, slot, shape: sh, el: String(sk.type).toLowerCase(), time: f.act.t, aim });
    return true;
  }
  _release(f, act) {
    const { sk, sh, aim, slot, overuse } = act, S = SHAPE_STATS[sh], el = String(sk.type).toLowerCase();
    if (f.side === 'foe' && this.token === f) this.token = null;
    // accuracy below 100 becomes aim spread (overuse: wider)
    const acc = (sk.accuracy === true ? 100 : sk.accuracy) * (overuse ? KILUMEN_RULES.overuseAccuracy : 1);
    const spread = ((100 - acc) / 100) * 0.9 * (this.rng() - 0.5);
    const dir = { x: aim.x * Math.cos(spread) - aim.y * Math.sin(spread), y: aim.x * Math.sin(spread) + aim.y * Math.cos(spread) };
    if (overuse) { this._hurt(f, Math.max(1, Math.floor(f.mhp * KILUMEN_RULES.overuseSelfDamage)), { kind: 'overuse' }); this.emit('overuse', { who: f }); }
    f.recover = S.recover;
    this.emit('cast', { who: f, slot, shape: sh, el, dir });
    if (sh === 'self') {
      if (sk.heal) { const h = Math.floor(f.mhp * sk.heal[0] / sk.heal[1]); f.c.hp = Math.min(f.mhp, f.c.hp + h); this.emit('heal', { who: f, n: h }); }
      if (sk.boosts) { for (const [k, v] of Object.entries(sk.boosts)) f.boosts[k] = Math.min(6, (f.boosts[k] || 0) + v); f.boostT = RT.boostTime; this.emit('boost', { who: f, boosts: sk.boosts }); }
      return;
    }
    if (S.speed) {
      this.shots.push({ owner: f, slot, sk, el, sh, x: f.x + dir.x * (f.r + 4), y: f.y + dir.y * (f.r + 4) - 6, vx: dir.x * S.speed, vy: dir.y * S.speed, r: S.r, left: S.range, pierce: !!S.pierce, homing: S.homing || 0, splash: S.splash || 0, hit: new Set(), overuse, age: 0, z: sh === 'lob' ? 0 : null, flight: S.range / S.speed });
      return;
    }
    if (sh === 'dash') { f.dash = { vx: dir.x * S.dist / S.time, vy: dir.y * S.dist / S.time, t: S.time, hit: { slot }, done: new Set(), recover: S.recover, overuse }; f.iframes = Math.max(f.iframes, S.time * 0.6); return; }
    // melee / cone / slam: instant area check
    for (const o of this._enemiesOf(f)) {
      const dx = o.x - f.x, dy = o.y - f.y, d = Math.hypot(dx, dy);
      if (d > S.range + o.r) continue;
      if (sh !== 'slam') { const ang = Math.acos(Math.max(-1, Math.min(1, (dx * dir.x + dy * dir.y) / (d || 1)))); if (ang > S.arc && d > o.r) continue; }
      this._strike(f, o, slot, dx, dy, overuse);
    }
    if (sk.self?.boosts) { for (const [k, v] of Object.entries(sk.self.boosts)) f.boosts[k] = (f.boosts[k] || 0) + v; f.boostT = RT.boostTime; this.emit('boost', { who: f, boosts: sk.self.boosts }); }
  }
  _tickShots(dt) {
    for (const s of this.shots) {
      if (s.dead) continue;
      s.age += dt;
      if (s.homing) {
        const t = s.owner.side === 'ally' ? this.target : this.ally;
        if (t?.alive) { const want = Math.atan2(t.y - s.y, t.x - s.x), cur = Math.atan2(s.vy, s.vx); let da = ((want - cur + Math.PI * 3) % (Math.PI * 2)) - Math.PI; da = Math.max(-s.homing * dt, Math.min(s.homing * dt, da)); const sp = Math.hypot(s.vx, s.vy); s.vx = Math.cos(cur + da) * sp; s.vy = Math.sin(cur + da) * sp; }
      }
      // swept circle test: sub-steps no longer than half the shot radius (fast shots never tunnel through a body)
      const dist = Math.hypot(s.vx, s.vy) * dt, n = Math.max(1, Math.ceil(dist / Math.max(4, s.r * 0.5)));
      for (let k = 0; k < n && !s.dead; k++) {
        s.x += (s.vx * dt) / n; s.y += (s.vy * dt) / n; s.left -= dist / n;
        if (s.sh === 'lob') s.z = Math.sin(Math.min(1, s.age / s.flight) * Math.PI) * 40;
        if (s.sh !== 'lob' && this.solid(s.x, s.y)) { s.dead = true; this.emit('fizzle', { x: s.x, y: s.y, el: s.el }); break; }
        if (s.crystal) { this._crystalStep(s); continue; }
        if (s.sh === 'lob') continue; // lands at the end of its arc
        for (const o of this._enemiesOf(s.owner)) {
          if (s.hit.has(o)) continue;
          const d = Math.hypot(o.x - s.x, o.y - s.y);
          if (d < o.r + s.r) { s.hit.add(o); if (o.iframes > 0 && o.dash) { this.emit('dodged', { who: o }); continue; } this._strike(s.owner, o, s.slot, s.vx, s.vy, s.overuse); if (!s.pierce) { s.dead = true; break; } }
          else if (o.iframes > 0 && o.dash && d < o.r + s.r + RT.nearMiss && !s.nm) { s.nm = true; this.emit('nearmiss', { who: o }); if (o.side === 'ally') o.dodgeCd = 0; }
        }
      }
      if (!s.dead && s.left <= 0) {
        s.dead = true;
        if (s.crystal) this.emit('crystalMiss', { x: s.x, y: s.y });
        else if (s.splash) { this.emit('splash', { x: s.x, y: s.y, el: s.el, r: s.splash }); for (const o of this._enemiesOf(s.owner)) if (Math.hypot(o.x - s.x, o.y - s.y) < s.splash + o.r) this._strike(s.owner, o, s.slot, o.x - s.x, o.y - s.y, s.overuse); }
        else this.emit('fizzle', { x: s.x, y: s.y, el: s.el });
      }
    }
    this.shots = this.shots.filter((s) => !s.dead);
  }
  /** a skill lands: status skills apply their status; damaging skills use damageOf + knockback + hitstun */
  _strike(att, o, slot, kx, ky, overuse = false) {
    if (!o.alive || o.caught || o.held) return;
    if (o.iframes > 0) { if (o.dash) this.emit('dodged', { who: o }); return; }
    const sk = SKILLS()[att.skills[slot]], el = String(sk.type).toLowerCase();
    if (!sk.basePower) { // Huff etc.
      if (sk.status === 'drowsy') { o.drowsy = RT.drowsyTime; if (o.act) { o.act = null; if (this.token === o) this.token = null; } this.emit('status', { who: o, status: 'drowsy' }); }
      return;
    }
    const r = damageOf(att, o, sk, this.rng, { overuse });
    if (att.side === 'foe' && this.foeDamageMult !== 1 && r.dmg > 0) r.dmg = Math.max(1, Math.floor(r.dmg * this.foeDamageMult));
    const km = Math.hypot(kx, ky) || 1, kb = SHAPE_STATS[shapeOf(att.skills[slot], sk)].kb * (r.mult > 1 ? 1.3 : 1) * (r.crit ? 1.3 : 1);
    o.vx = (kx / km) * kb; o.vy = (ky / km) * kb; o.iframes = RT.hitIframes; o.flash = 0.12;
    const flinch = r.dmg >= o.mhp * RT.flinchFrac || r.crit;
    o.stun = flinch ? RT.hitstun * 2 : RT.hitstun;
    if (flinch && o.act) { o.act = null; if (this.token === o) this.token = null; this.emit('interrupt', { who: o }); }
    if (o.side === 'ally') this.retreatT = 0;
    this.emit('hit', { who: o, by: att, dmg: r.dmg, mult: r.mult, crit: r.crit, el, x: o.x, y: o.y, flinch });
    if (sk.secondary?.status === 'scorched' && this.rng() * 100 < sk.secondary.chance) { o.scorch = RT.scorchTime; o.scorchT = RT.scorchTick; this.emit('status', { who: o, status: 'scorched' }); }
    this._hurt(o, r.dmg, { kind: 'hit', by: att });
  }
  _hurt(o, n, { by } = {}) {
    if (!o.alive) return;
    o.c.hp = Math.max(0, o.c.hp - n);
    if (o.c.hp > 0) return;
    o.alive = false; o.act = null; o.dash = null; if (this.token === o) this.token = null;
    this.emit('faint', { who: o, x: o.x, y: o.y });
    if (o.side === 'foe') {
      const a = this.ally;
      const n = xpFor(o.c.species, o.c.level);
      if (a.alive) this._gainXp(a, n);
        this._shareXp(n);
    } else {
      if (this.party.some((c) => c.hp > 0)) this.forced = RT.forcedSwapDelay;
      else this._end('lose', RT.outro + 0.4);
    }
  }
  _gainXp(a, n) {
    const c = a.c, before = c.level; c.xp = (c.xp || 0) + n; this.xpGained += n;
    const L = Math.min(KILUMEN_RULES.maxLevel, levelForXp(c.xp));
    this.emit('xp', { who: a, n });
    if (L > before) {
      const oldMax = a.mhp; c.level = L; a.mhp = maxHp(c); c.hp = Math.min(a.mhp, c.hp + (a.mhp - oldMax)); a.stats = battleStats(c);
      this.emit('levelup', { who: a, level: L });
    }
  }
  /** XP share (QoL #4 rule, same rate the turn battle uses): every other conscious party member gets share of the XP */
  // Team Link Band (held, same rules as the turn battle): with the share on, a holder gets share + 25 %; with it off, a holder that sat out gets half
  _shareXp(base) {
    this.party.forEach((c, i) => {
      if (i === this.active || !(c.hp > 0)) return;
      const band = !!this.linkBand && c.held === this.linkBand;
      const n = this.xpShare > 0 ? Math.max(1, Math.floor(base * (this.xpShare + (band ? 0.25 : 0)))) : band ? Math.floor(base / 2) : 0;
      if (!n) return;
      if (band) this.linkXp.push({ i, uid: c.uid, xp: n });
      const before = c.level; c.xp = (c.xp || 0) + n; const L = Math.min(KILUMEN_RULES.maxLevel, levelForXp(c.xp));
      if (L > before) { c.level = L; this.emit('benchLevel', { c, level: L }); }
      this.emit('xpShare', { c, n, band });
    });
  }
  _dodge(f, dx, dy) {
    if (!f.alive || f.held || f.dash || f.dodgeCd > 0 || (f.stun > 0 && f.side === 'foe')) return false;
    const m = Math.hypot(dx, dy) || 1, sp = f.speed * RT.dodgeSpeed;
    if (f.act) { f.act = null; if (this.token === f) this.token = null; } // dodge cancels a windup (the cooldown is still spent)
    f.stun = 0; f.dash = { vx: (dx / m) * sp, vy: (dy / m) * sp, t: RT.dodgeTime, hit: null, recover: 0.05 };
    f.iframes = RT.dodgeIframes; f.dodgeCd = f.side === 'foe' ? RT.foeDodgeCd : RT.dodgeCd;
    this.emit('dodge', { who: f, dx: dx / m, dy: dy / m });
    return true;
  }

  // ---- foe AI: alert -> close to the chosen skill's reach while strafing -> telegraph (one foe at a time) -> recover
  _ai(f, dt) {
    const ai = f.ai, a = this.ally; ai.t -= dt; ai.dodgeCd = Math.max(0, ai.dodgeCd - dt);
    if (ai.state === 'alert') { f.vx = f.vy = 0; f.face = { x: Math.sign(a.x - f.x) || 1, y: 0 }; if (ai.t <= 0) { ai.state = 'engage'; ai.gap = 0.25 + this.rng() * 0.5; } return; }
    if (f.held || f.dash || f.act || f.stun > 0 || f.recover > 0 || !a.alive) { if (!a.alive) { f.vx *= 0.9; f.vy *= 0.9; } return; }
    const enraged = f.c.hp / f.mhp < RT.enragedAt;
    // sidestep an incoming ally shot
    if (ai.dodgeCd <= 0) for (const s of this.shots) {
      if (s.owner.side !== 'ally' || s.crystal) continue;
      const rx = f.x - s.x, ry = f.y - s.y, d = Math.hypot(rx, ry), sp = Math.hypot(s.vx, s.vy) || 1;
      if (d < 150 && (rx * s.vx + ry * s.vy) / (d * sp) > 0.9) {
        ai.dodgeCd = RT.foeDodgeCd;
        if (this.rng() < RT.foeDodge + f.stats.spe / 500) { const side = this.rng() < 0.5 ? 1 : -1; this._dodge(f, (-s.vy / sp) * side, (s.vx / sp) * side); return; }
        break;
      }
    }
    // pick the next skill (rotate fairly: not the same one twice in a row when another is ready)
    if (ai.pick == null || f.cds[ai.pick] > 0) {
      const ready = f.skills.map((id, i) => i).filter((i) => f.cds[i] <= 0 && (SKILLS()[f.skills[i]]?.basePower || this.rng() < 0.15));
      const pool = ready.filter((i) => i !== ai.last); const from = pool.length ? pool : ready;
      ai.pick = from.length ? from[Math.floor(this.rng() * from.length)] : null;
    }
    const dx = a.x - f.x, dy = a.y - f.y, d = Math.hypot(dx, dy) || 1;
    const want = ai.pick != null ? Math.min(reachOf(f.skills[ai.pick], SKILLS()[f.skills[ai.pick]]), 320) * 0.8 : 200;
    if (this.rng() < dt * 0.6) ai.strafe = -ai.strafe;
    let mx = (dx / d) * Math.sign(d - want) * Math.min(1, Math.abs(d - want) / 40), my = (dy / d) * Math.sign(d - want) * Math.min(1, Math.abs(d - want) / 40);
    mx += (-dy / d) * 0.55 * ai.strafe; my += (dx / d) * 0.55 * ai.strafe;
    const m = Math.hypot(mx, my) || 1, sp = f.speed * (enraged ? 1.15 : 1) * (f.drowsy > 0 ? 0.5 : 1);
    f.vx = (mx / m) * sp * Math.min(1, m); f.vy = (my / m) * sp * Math.min(1, m); f.anim += dt; f.face = { x: dx / d, y: dy / d };
    if (f.drowsy > 0) return;
    if (ai.gap > 0) { ai.gap -= dt; return; }
    if (ai.pick != null && d <= want * 1.35 + 30 && (!this.token || this.token === f)) {
      this.token = f;
      if (this._tryFire(f, ai.pick)) { ai.last = ai.pick; ai.pick = null; const g = enraged ? RT.foeGapEnraged : RT.foeGap; ai.gap = g[0] + this.rng() * (g[1] - g[0]); }
      else this.token = null;
    }
  }

  // ---- team
  swap(to = null) {
    if (this.state !== 'fight' || this.swapCd > 0 || this.capture) return false;
    const n = this.party.length; let i = to;
    if (i == null) for (let k = 1; k < n; k++) { const j = (this.active + k) % n; if (this.party[j].hp > 0) { i = j; break; } }
    if (i == null || i === this.active || !(this.party[i]?.hp > 0)) return false;
    const old = this.ally; this.active = i;
    const nf = fighter(this.party[i], 'ally', old.x, old.y); nf.face = old.face; nf.iframes = RT.swapTime; nf.recover = RT.swapTime;
    this.ally = nf; this.swapCd = RT.swapCd; this.selected = Math.min(this.selected, nf.skills.length - 1);
    this.emit('swap', { from: old, to: nf });
    return true;
  }
  _forcedSwap() { this.swapCd = 0; this.swap(); }

  // ---- capture: a Crystal flies at the locked foe; it can be dodged. On contact: hold + 1-4 pulses (captureRoll)
  canCrystal() { return this.state === 'fight' && !this.trainer && !this.caught && !this.capture && this.ally.alive && !!this.target && !this.shots.some((s) => s.crystal); }
  castCrystal({ id, grade = 1 } = {}) {
    if (!this.canCrystal()) return false;
    const a = this.ally, t = this.target, d = Math.hypot(t.x - a.x, t.y - a.y) || 1;
    this.shots.push({ crystal: { id, grade }, owner: a, x: a.x, y: a.y - 8, vx: ((t.x - a.x) / d) * RT.crystalSpeed, vy: ((t.y - a.y) / d) * RT.crystalSpeed, r: 9, left: RT.crystalRange, hit: new Set(), age: 0, sh: 'crystal', el: 'light' });
    this.crystalUsed++; a.recover = 0.3;
    this.emit('crystalCast', { who: a, id });
    return true;
  }
  /** capture odds right now for a foe and a crystal grade (the same numbers _crystalStep rolls against) */
  oddsFor(o = this.target, grade = 1) {
    if (!o) return { p: 0, rarity: 0.5 };
    const sp = CREATURES()[o.c.species] || {}, st = o.drowsy > 0 ? KILUMEN_RULES.catchStatus.drowsy : o.scorch > 0 ? KILUMEN_RULES.catchStatus.scorched : 1;
    const rarity = sp.catchRate ?? 0.5;
    return { p: captureChance({ rarity, hp: o.c.hp, maxHp: o.mhp, status: st, grade }), rarity };
  }
  _crystalStep(s) {
    for (const o of this.living) {
      if (Math.hypot(o.x - s.x, o.y - s.y) >= o.r + s.r) continue;
      s.dead = true;
      if (o.iframes > 0 && o.dash) { this.emit('dodged', { who: o }); return; }
      const { p } = this.oddsFor(o, s.crystal.grade);
      const roll = captureRoll(p, this.rng(), this.forceCatch);
      o.held = true; o.act = null; o.dash = null; o.vx = o.vy = 0; if (this.token === o) this.token = null;
      this.capture = { foe: o, p, roll, n: 0, t: RT.pulse, id: s.crystal.id };
      this.emit('crystalHit', { who: o, p, id: s.crystal.id });
      return;
    }
  }
  _tickCapture(dt) {
    const c = this.capture; if (!c) return;
    if ((c.t -= dt) > 0) return;
    c.n++; c.t = RT.pulse;
    if (c.n <= c.roll.pulses) { this.emit('pulse', { who: c.foe, n: c.n }); return; }
    this.capture = null;
    if (c.roll.caught) {
      c.foe.caught = true; this.caught = c.foe; this.emit('caught', { who: c.foe });
      if (this.ally.alive) this._gainXp(this.ally, xpFor(c.foe.c.species, c.foe.c.level));
    } else {
      c.foe.held = false; c.foe.boosts = { atk: 1, spa: 1 }; c.foe.boostT = 4; c.foe.ai.gap = 0; c.foe.iframes = 0.3;
      this.emit('breakFree', { who: c.foe });
    }
  }

  _end(outcome, delay = RT.outro) { if (this.state !== 'fight') return; this.state = 'over'; this.outcome = outcome; this.outT = delay; this.emit('end', { outcome }); }
  get done() { return this.state === 'over' && this.outT <= 0; }
  /** same shape as KilumenBattle.result() for scene.systems.applyBattleResult */
  result() {
    const out = { outcome: this.outcome, rt: true, xp: this.xpGained,
      team: this.party.map((c) => ({ uid: c.uid, level: c.level, xp: c.xp, hp: c.hp, energy: c.energy.slice(), status: c.status || '' })) };
    if (this.caught) { const c = this.caught.c; out.caught = { species: c.species, level: c.level, variant: c.variant || '', hp: c.hp }; }
    out.foes = this.foes.map((f) => ({ species: f.c.species, level: f.c.level, fainted: !f.alive, caught: !!f.caught }))
      .concat(this.reserve.map((c) => ({ species: c.species, level: c.level, fainted: !(c.hp > 0), caught: false })));
    if (this.trainer) { out.trainer = true; out.foeItemsLeft = { ...this.foeBag }; }
    if (this.linkXp.length) out.linkXp = this.linkXp.slice();
    return out;
  }
}
