// rtb entry (Oct 29 2026; player option since v0.2.4x, Gary: "give players an option in the battle screen"). openRtBattle(ui, scene, foe)
// replaces the battle screen for WILD encounters when the player picked real-time (src/rtb/flag.js; ui.js wireWild).
// opts.carry {foes:[{species, level, variant, hp}]}: the same fight handed over from the turn battle (mode switch).
// The Turn-based button (R) ends this fight with outcome 'switch' + carry (party state applied, nothing saved). The fight happens right on the overworld map, around the player.
// Results fold back through scene.systems.applyBattleResult (same shape as the turn battle), blackout through onPartyFainted.
// Save lock: a scene.saveGuards entry returns 'rtb' for the whole fight (never save mid-battle; the scene.script checkpoint
// taken before the encounter is what a mid-fight reload restores).
// Controls  PC: WASD / arrows move, 1-4 use a skill, Z / Space / Enter / F use the selected skill, C next skill,
//               X / Shift tap = dodge, hold = sprint, Q team, E crystal, hold Esc = leave.
//           phone: D-pad move, A = selected skill, SEL = next skill, B tap = dodge / hold = sprint, tap a skill chip = use it,
//               Team / Crystal / Leave (hold) buttons top right.
import { RtBattle } from './sim.js?v=v0.2.56-alpha';
import { RtView } from './view.js?v=v0.2.56-alpha';
import { cooldownFor } from './moves.js?v=v0.2.56-alpha';
import { buildSkills } from '../battle/data/skills.js?v=v0.2.56-alpha';
import { maxEnergy, xpForLevel, displayName } from '../systems/creature.js?v=v0.2.56-alpha';
import { BATTLE_ITEMS } from '../systems/items.js?v=v0.2.56-alpha';
import { Col } from '../overworld/constants.js?v=v0.2.56-alpha';
import { reducedMotion } from '../sports/hype.js?v=v0.2.56-alpha';
import { modeButton, reactionLines, SHOUT } from './switch.js?v=v0.2.56-alpha';

const TILE = 64, STEP = 1 / 60, B_TAP = 0.18;
let SK = null;
const DIRV = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
export const RTB_STATE = { active: null }; // tests / dev panel: the running session
if (globalThis.window?.kilumen) window.kilumen.rtb = RTB_STATE;

/** crystal ids in the bag, weakest grade first (so better crystals are kept for later) */
export function crystalStock(bag) {
  if (!bag?.counts) return [];
  const g = (id) => BATTLE_ITEMS[id]?.kCrystalGrade ?? bag.def(id)?.kCrystalGrade; // grades live on BATTLE_ITEMS (items.js)
  return Object.keys(bag.counts).filter((id) => bag.count(id) > 0 && Number.isFinite(g(id)))
    .sort((p, q) => g(p) - g(q)).map((id) => ({ id, grade: g(id), n: bag.count(id) }));
}
/** a second wild from the same table (packs of two: PLACEHOLDER 25 %) */
function packMate(ui, scene, foe, rng) {
  const last = scene.log?.filter((e) => e.type === 'wild').at(-1), zone = ui.wild?.roller?.data?.zones?.[last?.table];
  if (!zone?.slots?.length || rng() >= 0.25) return null;
  const s = zone.slots[Math.floor(rng() * zone.slots.length)], lv = Array.isArray(s.level) ? s.level[0] : s.level;
  return { species: s.species, level: Math.max(2, Math.min(foe.level, lv || foe.level)) };
}

export function openRtBattle(ui, scene, foe, { q = new URLSearchParams(location.search), rng = Math.random, carry = null } = {}) {
  return new Promise((resolve) => {
    SK ||= buildSkills();
    const map = scene.map, z = scene.zoom || 1, cam = scene._cam || { x: 0, y: 0 }, cv = scene.canvas || document.getElementById('world');
    const pp = scene.player.pixel(), fd = DIRV[scene.player.facing] || [0, 1];
    const pcx = pp.px + TILE / 2, pcy = pp.py + TILE / 2;
    // arena: what is on screen (minus a margin), inside the map, at most 13 x 8 tiles around the player
    const vw = cv.width / z, vh = cv.height / z;
    const arena = { x0: Math.max(0, cam.x + 24, pcx - 6.5 * TILE), y0: Math.max(0, cam.y + 40, pcy - 4 * TILE),
      x1: Math.min(map.width * TILE, cam.x + vw - 24, pcx + 6.5 * TILE), y1: Math.min(map.height * TILE, cam.y + vh - 24, pcy + 4 * TILE) };
    const walk = (x, y) => map.isWalkable(Math.floor(x / TILE), Math.floor(y / TILE));
    const solid = (x, y) => map.code(Math.floor(x / TILE), Math.floor(y / TILE)) === Col.BLOCK;
    const foes = carry?.foes?.length ? carry.foes.map((f) => ({ species: f.species, level: f.level, variant: f.variant || '' })) : [foe]; const mate = carry ? null : q.get('rtbpack') === '1' ? { species: foe.species, level: foe.level } : q.get('rtbpack') === '0' ? null : packMate(ui, scene, foe, rng); if (mate) foes.push(mate);
    let sx = pcx + fd[0] * TILE, sy = pcy + fd[1] * TILE + 8; if (!walk(sx, sy)) { sx = pcx; sy = pcy + 8; }
    const sim = new RtBattle({ party: scene.party, foes, start: { x: sx, y: sy }, arena, walk, solid, rng });
    // put foes ahead of the player, on walkable ground
    sim.foes.forEach((f, i) => {
      const base = Math.atan2(fd[1], fd[0]) + (i ? 0.7 : -0.2);
      for (let k = 0; k < 24; k++) { const a = base + (k % 2 ? 1 : -1) * Math.floor(k / 2) * 0.35, d = 190 - (k % 3) * 30; const x = sx + Math.cos(a) * d, y = sy + Math.sin(a) * d * 0.8; f.x = x; f.y = y; sim._place(f); if (sim._canStand(f.x, f.y, f.r)) break; }
    });
    if (carry) sim.foes.forEach((f, i) => { const h = carry.foes[i]?.hp; if (Number.isFinite(h)) f.c.hp = Math.max(1, Math.min(f.mhp, Math.round(h))); });
    if (q.get('rtbcatch') === '1') sim.forceCatch = true; if (q.get('rtbcatch') === '0') sim.forceCatch = false; // dev / clips only
    const touch = !document.getElementById('touchpad')?.hidden;
    const keyNames = touch ? { skills: ['', '', '', ''], swap: '', crystal: '', leave: 'hold', help: '' }
      : { skills: ['1', '2', '3', '4'], swap: 'Q', crystal: 'E', leave: 'hold Esc', help: 'Move WASD · Skills 1-4 or Z · C next skill · X tap dodge / hold sprint · Q team · E crystal · R turn-based · hold Esc leave' };
    const view = new RtView({ scene, sim, touch, reduced: reducedMotion(q), keyNames });
    view.skillInfo = (id) => SK[id]; view.cdOf = cooldownFor; view.maxEn = (c) => maxEnergy(c);
    view.crystals = () => crystalStock(scene.systems?.bag).reduce((n, c) => n + c.n, 0);
    view.xpBar = (c) => { const a = xpForLevel(c.level), b = xpForLevel(c.level + 1); return Math.max(0, Math.min(1, ((c.xp || 0) - a) / Math.max(1, b - a))); };
    // hide the follower (it is the one fighting) while the fight runs
    const fol = scene.follower, folSheet = fol?.sheet; if (fol) fol.sheet = null;
    const guard = () => 'rtb'; scene.saveGuards?.push(guard);

    // ---- input
    const inp = { mode: false, fire: null, select: false, swap: false, crystal: false, dodge: false, retreat: false, bDown: null, bHeld: false };
    const ACT = { Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3 }, FIRE = new Set(['KeyZ', 'Space', 'Enter', 'KeyF']), BKEY = new Set(['KeyX', 'ShiftLeft', 'ShiftRight']);
    const bPress = () => { if (inp.bDown == null) inp.bDown = performance.now(); };
    const bRelease = () => { if (inp.bDown != null && (performance.now() - inp.bDown) / 1000 < B_TAP) inp.dodge = true; inp.bDown = null; };
    const kd = (e) => {
      const c = e.code; let used = true;
      if (c in ACT) inp.fire = ACT[c]; else if (FIRE.has(c)) { if (!e.repeat) inp.fire = 'sel'; } else if (c === 'KeyC' || c === 'Backspace') { if (!e.repeat) inp.select = true; }
      else if (c === 'KeyQ' || c === 'Tab') { if (!e.repeat) inp.swap = true; } else if (c === 'KeyE') { if (!e.repeat) inp.crystal = true; } else if (c === 'KeyR') { if (!e.repeat) inp.mode = true; } else if (c === 'Escape') inp.retreat = true;
      else if (BKEY.has(c)) { if (!e.repeat) bPress(); used = false; } else used = false;
      if (used) { e.preventDefault(); e.stopPropagation(); }
    };
    const ku = (e) => { if (e.code === 'Escape') { inp.retreat = false; e.stopPropagation(); } if (BKEY.has(e.code)) bRelease(); };
    window.addEventListener('keydown', kd, true); window.addEventListener('keyup', ku, true);
    const offs = [];
    const on = (el, ev, fn) => { if (!el) return; el.addEventListener(ev, fn, true); offs.push(() => el.removeEventListener(ev, fn, true)); };
    const pad = document.getElementById('touchpad');
    on(pad?.querySelector('[data-btn="a"]'), 'pointerdown', () => { inp.fire = 'sel'; });
    on(pad?.querySelector('[data-btn="select"]'), 'pointerdown', (e) => { e.stopPropagation(); inp.select = true; });
    const pb = pad?.querySelector('[data-btn="b"]'); on(pb, 'pointerdown', bPress); on(pb, 'pointerup', bRelease); on(pb, 'pointercancel', bRelease); on(pb, 'pointerleave', bRelease);
    const hud = view.hud;
    const modeBtn = modeButton('turn', { touch }); modeBtn.classList.add('in-rtb'); hud.appendChild(modeBtn);
    on(modeBtn, 'pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); inp.mode = true; });
    on(modeBtn, 'click', (e) => { e.preventDefault(); e.stopPropagation(); if (e.detail === 0) inp.mode = true; }); // keyboard Enter / Space on the focused button
    on(hud, 'pointerdown', (e) => {
      const s = e.target.closest?.('.rtb-s'), b = e.target.closest?.('[data-rtb]');
      if (s) { sim.selected = +s.dataset.slot; inp.fire = +s.dataset.slot; e.preventDefault(); return; }
      if (!b) return; e.preventDefault();
      if (b.dataset.rtb === 'swap') inp.swap = true; else if (b.dataset.rtb === 'crystal') inp.crystal = true; else if (b.dataset.rtb === 'leave') inp.retreat = true;
    });
    const leaveUp = () => { inp.retreat = false; }; on(hud, 'pointerup', leaveUp); on(hud, 'pointercancel', leaveUp);
    const moveVec = () => {
      let x = 0, y = 0; for (const d of new Set(scene.input?.held || [])) { const v = DIRV[d]; if (v) { x += v[0]; y += v[1]; } }
      return { mx: x, my: y };
    };

    // ---- loop: fixed 1/60 steps, hitstop freezes the sim, slow-mo on the last KO
    let last = performance.now(), acc = 0, stop = 0, slow = null, finished = false;
    if (carry) { // creature reactions to the mode switch
      const rl = reactionLines('rt', nameOf(sim.ally), nameOf(sim.foes[0]), rng);
      view.banner(rl.ally, rl.foe, 1500);
      view.bubbles.push({ who: sim.ally, text: SHOUT.ally[Math.floor(rng() * 3) % 3], t: 0, life: 1.1, color: '#9fe8ff' });
      sim.foes.forEach((f) => view.bubbles.push({ who: f, text: SHOUT.foe[Math.floor(rng() * 3) % 3], t: 0, life: 1.1, color: '#ffdf4a' }));
    } else view.banner(foes.length > 1 ? 'Two wild creatures jump out!' : `${nameOf(sim.foes[0])} jumps out!`, 'Fight it, catch it, or slip away', 1400);
    scene.audio?.sfx('grass');
    RTB_STATE.active = { sim, view, inp }; if (window.kilumen) window.kilumen.rtb = RTB_STATE;
    const loop = (now) => {
      if (finished) return;
      let dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (inp.mode) { if (sim.state !== 'fight') inp.mode = false; else if (!sim.capture && sim.foes.some((f) => f.alive && !f.caught)) return finish(true); } // mid crystal: waits for the result
      if (stop > 0) stop -= dt;
      else {
        let scale = 1; if (slow) { scale = slow.scale; if ((slow.time -= dt) <= 0) slow = null; }
        acc += dt * scale;
        while (acc >= STEP) {
          acc -= STEP;
          const mv = moveVec(), sprint = inp.bDown != null && (performance.now() - inp.bDown) / 1000 >= B_TAP;
          let crystal = null;
          if (inp.crystal) { const st = crystalStock(scene.systems?.bag)[0]; if (!st) view.num(sim.ally.x, sim.ally.y - 60, 'No crystals', '#ff8a8a'); else if (sim.canCrystal()) crystal = st; }
          const used = crystal; sim.step(STEP, { ...mv, sprint, dodge: inp.dodge, fire: inp.fire, select: inp.select, swap: inp.swap, crystal, retreat: inp.retreat });
          if (used && sim.crystalUsed && sim.events.some((e) => e.type === 'crystalCast')) scene.systems.bag.remove(used.id, 1);
          inp.fire = null; inp.select = inp.swap = inp.crystal = inp.dodge = false;
          const r = view.onEvents(sim.drain()); if (r.stop) stop = Math.max(stop, view.reduced ? r.stop / 2 : r.stop); if (r.slow) slow = r.slow;
          if (stop > 0) break;
        }
      }
      view.frame(dt);
      if (sim.done) return finish();
      requestAnimationFrame(loop);
    };
    const finish = async (toTurn = false) => {
      if (finished) return; finished = true;
      window.removeEventListener('keydown', kd, true); window.removeEventListener('keyup', ku, true); offs.forEach((f) => f());
      const res = sim.result();
      if (toTurn) { // mode switch: party state goes into the real party now (no outcome effects), the foes' HP rides in carry
        res.outcome = 'switch'; delete res.caught;
        res.carry = { foes: sim.foes.filter((f) => f.alive && !f.caught).map((f) => ({ species: f.c.species, level: f.c.level, variant: f.c.variant || '', hp: f.c.hp })) };
      }
      view.destroy(); RTB_STATE.active = null;
      if (fol) fol.sheet = folSheet;
      const i = scene.saveGuards?.indexOf(guard); if (i >= 0) scene.saveGuards.splice(i, 1);
      const out = scene.systems?.applyBattleResult(res);
      if (!toTurn) ui.lastBattle = { ...res, turns: null, rt: true };
      if (out === 'blackout') await scene.systems?.onPartyFainted();
      scene._dirty = true;
      resolve(res);
    };
    requestAnimationFrame(loop);
  });
}
const nameOf = (f) => displayName(f.c);
