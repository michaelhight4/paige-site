// rtb entry (Oct 29 2026; player option since v0.2.4x, Gary: "give players an option in the battle screen"). openRtBattle(ui, scene, foe)
// replaces the battle screen for WILD encounters when the player picked real-time (src/rtb/flag.js; ui.js wireWild).
// opts.carry {foes:[{species, level, variant, hp}]}: the same fight handed over from the turn battle (mode switch).
// The Turn-based button (R) ends this fight with outcome 'switch' + carry (party state applied, nothing saved). The fight happens right on the overworld map, around the player.
// Results fold back through scene.systems.applyBattleResult (same shape as the turn battle), blackout through onPartyFainted.
// Save lock: a scene.saveGuards entry returns 'rtb' for the whole fight (never save mid-battle; the scene.script checkpoint
// taken before the encounter is what a mid-fight reload restores).
// Controls  PC (v0.2.60, keys.js): WASD / arrows move, Q E R F use skill 1-4, 1-6 switch to party slot 1-6, Z / Space / Enter
//               use the selected skill, C next skill, X / Shift tap = dodge, hold = sprint, Tab team, G crystal, T turn-based, hold Esc = leave.
//           pad: LB / RB / LT / RT skills 1-4, X / Y = the skills set on X / Y (default 1 + 2), A selected skill, B dodge / sprint, Select next skill.
//           phone: D-pad move, X / Y face buttons = their skills (X/Y set + tap a chip's X or Y half to choose), A = selected skill,
//               SEL = next skill, B tap = dodge / hold = sprint, skill bar at the bottom (tap a chip = use it),
//               Team / Crystal / Leave (hold) buttons top right.
import { RtBattle } from './sim.js?v=v0.2.64-alpha';
import { RtView } from './view.js?v=v0.2.64-alpha';
import { cooldownFor } from './moves.js?v=v0.2.64-alpha';
import { buildSkills } from '../battle/data/skills.js?v=v0.2.64-alpha';
import { maxEnergy, maxHp, xpForLevel, displayName } from '../systems/creature.js?v=v0.2.64-alpha';
import { BATTLE_ITEMS } from '../systems/items.js?v=v0.2.64-alpha';
import { Col } from '../overworld/constants.js?v=v0.2.64-alpha';
import { reducedMotion } from '../sports/hype.js?v=v0.2.64-alpha';
import { actionFor, SKILL_LABELS, padSkillEdges, capsFlipped, padXYEdges, xySlots, assignXY, XY_STORE } from './keys.js?v=v0.2.64-alpha';
import { qolFlags, XP_SHARE } from '../qol/flags.js?v=v0.2.64-alpha';
import { diffOf, getDifficulty, scaleFoes } from '../systems/difficulty.js?v=v0.2.64-alpha';
import { modeButton, reactionLines, SHOUT } from './switch.js?v=v0.2.64-alpha';

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

export function openRtBattle(ui, scene, foe, { q = new URLSearchParams(location.search), rng = Math.random, carry = null, trainer = null } = {}) {
  // trainer (branch rtb-trainer, NOT live): {foes:[{species, level}], name} one foe out at a time, AI sends / recalls; no crystals, retreat or mode switch
  return new Promise((resolve) => {
    SK ||= buildSkills();
    const map = scene.map, z = scene.zoom || 1, cam = scene._cam || { x: 0, y: 0 }, cv = scene.canvas || document.getElementById('world');
    const pp = scene.player.pixel(), fd = DIRV[scene.player.facing] || [0, 1];
    const pcx = pp.px + TILE / 2, pcy = pp.py + TILE / 2;
    // arena: what is on screen (minus a margin), inside the map, at most 13 x 8 tiles around the player
    const touch = !document.getElementById('touchpad')?.hidden;
    // phone: the skill bar (bottom) and the X / Y column (right) sit outside the arena, so they never cover the fight
    const cssW = (cv.width / (innerWidth || cv.width)) / z, tr = (q) => document.querySelector(q)?.getBoundingClientRect?.();
    const dpR = touch ? tr('#touchpad .dpad')?.right || 0 : 0, bL = touch ? tr('#touchpad [data-btn="b"]')?.left || innerWidth : innerWidth;
    let padL = touch ? (dpR + 4) * cssW : 0, padR = touch ? (innerWidth - bL + 4) * cssW : 0; const padB = touch ? 48 * cssW : 0;
    if (cv.width / z - padL - padR < 6 * TILE) padL = padR = 0; // tiny screens: keep a usable arena
    const vw = cv.width / z - padR, vh = cv.height / z - padB;
    const arena = { x0: Math.max(0, cam.x + 24 + padL, pcx - 6.5 * TILE), y0: Math.max(0, cam.y + 40, pcy - 4 * TILE),
      x1: Math.min(map.width * TILE, cam.x + vw - 24, pcx + 6.5 * TILE), y1: Math.min(map.height * TILE, cam.y + vh - 24, pcy + 4 * TILE) };
    // trainer fights: the trainer NPC stays standing on its tile (Gary Oct 29: "leave their trainer standing where they are just like ours")
    const tn = trainer?.npc || null, tTile = tn ? { x: tn.x, y: tn.y } : null;
    const walk = (x, y) => { const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE); return !(tTile && tx === tTile.x && ty === tTile.y) && map.isWalkable(tx, ty); };
    const solid = (x, y) => map.code(Math.floor(x / TILE), Math.floor(y / TILE)) === Col.BLOCK;
    const foes = trainer ? scaleFoes(trainer.foes, Math.max(...scene.party.map((c) => c.level || 1)), getDifficulty(scene.systems?.state)).map((f) => ({ species: f.species, level: f.level, variant: f.variant || '' })) : carry?.foes?.length ? carry.foes.map((f) => ({ species: f.species, level: f.level, variant: f.variant || '' })) : [foe]; const mate = carry || trainer ? null : q.get('rtbpack') === '1' ? { species: foe.species, level: foe.level } : q.get('rtbpack') === '0' ? null : packMate(ui, scene, foe, rng); if (mate) foes.push(mate);
    let sx = pcx + fd[0] * TILE, sy = pcy + fd[1] * TILE + 8; if (!walk(sx, sy)) { sx = pcx; sy = pcy + 8; }
    const tFeet = tTile ? { x: tTile.x * TILE + TILE / 2, y: tTile.y * TILE + TILE / 2 + 8 } : null;
    if (tFeet) { // ally steps out beside the player, on the side with room; the foe comes out in front of its trainer on the same side
      const px = -(tFeet.y - pcy), py = tFeet.x - pcx, m = Math.hypot(px, py) || 1;
      for (const sg of [1, -1]) { const x = pcx + (px / m) * TILE * sg * 1.1, y = pcy + 8 + (py / m) * TILE * sg * 1.1; if (walk(x, y) && walk(tFeet.x + (px / m) * TILE * sg, tFeet.y + (py / m) * TILE * sg)) { sx = x; sy = y; break; } }
    }
    const sim = new RtBattle({ party: scene.party, foes, start: { x: sx, y: sy }, arena, walk, solid, rng, trainer: !!trainer, xpShare: qolFlags(q).xpShare ? XP_SHARE : 0, foeDamageMult: trainer ? diffOf(getDifficulty(scene.systems?.state)).damage || 1 : 1,
      foeItems: trainer?.items || null, foeHealAt: diffOf(getDifficulty(scene.systems?.state)).healAt ?? 0.25, foeHealsPer: diffOf(getDifficulty(scene.systems?.state)).healsPer ?? 1, sendFrom: tFeet });
    // put foes ahead of the player, on walkable ground
    if (tFeet) sim.foes.forEach((f) => { // trainer: first creature out in front of the trainer, toward the fight
      const bx = tFeet.x + (sx - tFeet.x) * 0.45, by = tFeet.y + (sy - tFeet.y) * 0.45;
      for (let k = 0; k < 24; k++) { const a = k * 0.9, d = k * 10; f.x = bx + Math.cos(a) * d; f.y = by + Math.sin(a) * d * 0.8; sim._place(f); if (sim._canStand(f.x, f.y, f.r)) break; }
    });
    else sim.foes.forEach((f, i) => {
      const base = Math.atan2(fd[1], fd[0]) + (i ? 0.7 : -0.2);
      for (let k = 0; k < 24; k++) { const a = base + (k % 2 ? 1 : -1) * Math.floor(k / 2) * 0.35, d = 190 - (k % 3) * 30; const x = sx + Math.cos(a) * d, y = sy + Math.sin(a) * d * 0.8; f.x = x; f.y = y; sim._place(f); if (sim._canStand(f.x, f.y, f.r)) break; }
    });
    if (carry) sim.foes.forEach((f, i) => { const h = carry.foes[i]?.hp; if (Number.isFinite(h)) f.c.hp = Math.max(1, Math.min(f.mhp, Math.round(h))); });
    if (q.get('rtbcatch') === '1') sim.forceCatch = true; if (q.get('rtbcatch') === '0') sim.forceCatch = false; // dev / clips only
    const keyNames = touch ? { skills: ['', '', '', ''], swap: '', crystal: '', leave: 'hold', help: '' }
      : { skills: SKILL_LABELS.slice(), party: true, swap: 'Tab', crystal: 'G', leave: 'Caps', help: trainer ? 'Move WASD · Skills Q E R F · Switch 1-6 · Z selected · C next · X dodge / hold sprint · Tab team' // trainer fights: no crystal, mode switch or leave
        : 'Move WASD · Skills Q E R F · Switch 1-6 · Z selected · C next · X dodge / hold sprint · Tab team · G crystal · T turn-based · Caps run (wild) · hold Esc leave' };
    const view = new RtView({ scene, sim, touch, reduced: reducedMotion(q), keyNames });
    if (trainer) { // the overworld trainer reacts + talks (speech bubbles above their head; PH text keys rtb_trainer.*, Text Bot owns the lines)
      const cat = ui.T?.('system_item_catalogue', {}) || {}, IN = { tonicsmall: 'tonic_small', toniclarge: 'tonic_large' };
      view.trainer = { npc: tn, name: trainer.name || 'Trainer', at: tFeet ? { x: tFeet.x, y: tTile.y * TILE + TILE - 120 } : { x: sim.foes[0].x, y: sim.foes[0].y - 120 },
        text: (k, fb, vars) => { const v = ui.T ? ui.T(k, null) : null; const arr = Array.isArray(v) ? v : v?.pages || (Array.isArray(fb) ? fb : [fb]); const out = arr.map((t) => String(t).replace(/\{(\w+)\}/g, (m, w) => vars?.[w] ?? m)); return Array.isArray(fb) ? out : out[0]; },
        itemName: (id) => cat[IN[id]]?.name || BATTLE_ITEMS[IN[id]]?.name || 'Remedy' };
      if (tn) { tn.talking = true; }
    }
    // X / Y face skills, per creature (uid), saved across fights; default skills 1 + 2
    let xyMap = {}; try { xyMap = JSON.parse(localStorage.getItem(XY_STORE) || '{}') || {}; } catch { xyMap = {}; }
    const xyOf = (c, n) => xySlots(xyMap[c.uid], n);
    const setXY = (c, v) => { xyMap[c.uid] = v; try { localStorage.setItem(XY_STORE, JSON.stringify(xyMap)); } catch { /* private mode */ } };
    view.xyOf = xyOf;
    view.skillInfo = (id) => SK[id]; view.cdOf = cooldownFor; view.maxEn = (c) => maxEnergy(c); view.maxHpOf = (c) => maxHp(c);
    view.crystals = () => crystalStock(scene.systems?.bag).reduce((n, c) => n + c.n, 0);
    view.xpBar = (c) => { const a = xpForLevel(c.level), b = xpForLevel(c.level + 1); return Math.max(0, Math.min(1, ((c.xp || 0) - a) / Math.max(1, b - a))); };
    // hide the follower (it is the one fighting) while the fight runs
    const fol = scene.follower, folSheet = fol?.sheet; if (fol) fol.sheet = null;
    const guard = () => 'rtb'; scene.saveGuards?.push(guard);

    // ---- input
    const inp = { mode: false, fire: null, party: null, select: false, swap: false, crystal: false, dodge: false, retreat: false, flee: false, bDown: null, bHeld: false };
    let capsPrev = null; const capsCheck = (e) => { const r = capsFlipped(e, capsPrev); capsPrev = r.now; if (r.flip) inp.flee = true; };
    const BKEY = new Set(['KeyX', 'ShiftLeft', 'ShiftRight']);
    const bPress = () => { if (inp.bDown == null) inp.bDown = performance.now(); };
    const bRelease = () => { if (inp.bDown != null && (performance.now() - inp.bDown) / 1000 < B_TAP) inp.dodge = true; inp.bDown = null; };
    const kd = (e) => {
      capsCheck(e);
      if (e.ctrlKey || e.metaKey || e.altKey) return; // browser shortcuts (Ctrl+R reload, Ctrl+F find) stay the browser's
      const a = actionFor(e.code); if (!a) return;
      if (a.type === 'b') { if (!e.repeat) bPress(); return; } // B keys still reach the overworld input (sprint hold)
      e.preventDefault(); e.stopPropagation();
      if (a.type === 'leave') { inp.retreat = true; return; }
      if (a.type === 'flee') { inp.flee = true; return; }
      if (e.repeat) return;
      if (a.type === 'skill') inp.fire = a.slot; else if (a.type === 'party') inp.party = a.slot; else if (a.type === 'fire') inp.fire = 'sel';
      else if (a.type === 'next') inp.select = true; else if (a.type === 'team') inp.swap = true; else if (a.type === 'crystal') inp.crystal = true; else if (a.type === 'mode') inp.mode = true;
    };
    const ku = (e) => { capsCheck(e); if (e.code === 'Escape') { inp.retreat = false; e.stopPropagation(); } if (BKEY.has(e.code)) bRelease(); };
    window.addEventListener('keydown', kd, true); window.addEventListener('keyup', ku, true);
    const mCaps = (e) => capsCheck(e); window.addEventListener('mousedown', mCaps, true); window.addEventListener('mousemove', mCaps, true); window.addEventListener('focus', mCaps);
    const offs = [];
    const on = (el, ev, fn) => { if (!el) return; el.addEventListener(ev, fn, true); offs.push(() => el.removeEventListener(ev, fn, true)); };
    const pad = document.getElementById('touchpad');
    on(pad?.querySelector('[data-btn="a"]'), 'pointerdown', () => { inp.fire = 'sel'; });
    on(pad?.querySelector('[data-btn="select"]'), 'pointerdown', (e) => { e.stopPropagation(); inp.select = true; });
    const pb = pad?.querySelector('[data-btn="b"]'); on(pb, 'pointerdown', bPress); on(pb, 'pointerup', bRelease); on(pb, 'pointercancel', bRelease); on(pb, 'pointerleave', bRelease);
    const hud = view.hud;
    const modeBtn = modeButton('turn', { touch, key: 'T' }); modeBtn.classList.add('in-rtb'); if (!trainer) hud.appendChild(modeBtn); else hud.querySelectorAll('[data-rtb="crystal"],[data-rtb="leave"]').forEach((b) => { b.hidden = true; b.style.display = 'none'; });
    on(modeBtn, 'pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); inp.mode = true; });
    on(modeBtn, 'click', (e) => { e.preventDefault(); e.stopPropagation(); if (e.detail === 0) inp.mode = true; }); // keyboard Enter / Space on the focused button
    on(hud, 'pointerdown', (e) => {
      const s = e.target.closest?.('.rtb-s'), b = e.target.closest?.('[data-rtb]');
      const pi = e.target.closest?.('.rtb-pi'); if (pi) { inp.party = +pi.dataset.i; e.preventDefault(); return; }
      const fb = e.target.closest?.('.rtb-face'); if (fb) { e.preventDefault(); const k = fb.dataset.face, slot = xyOf(sim.ally.c, sim.ally.skills.length)[k === 'x' ? 0 : 1]; inp.fire = slot; view.facePress(k, true); faceDown = k; return; }
      if (s && view.assigning) { e.preventDefault(); const r = s.getBoundingClientRect(), k = e.clientX < r.left + r.width / 2 ? 'x' : 'y'; setXY(sim.ally.c, assignXY(xyOf(sim.ally.c, sim.ally.skills.length), k, +s.dataset.slot)); view.facePress(k, true); setTimeout(() => view.facePress(k, false), 120); scene.audio?.sfx('cursor'); return; }
      if (s) { sim.selected = +s.dataset.slot; inp.fire = +s.dataset.slot; e.preventDefault(); return; }
      if (b?.dataset.rtb === 'xyset') { e.preventDefault(); view.setAssign(!view.assigning); if (view.assigning) view.banner('Tap the X or Y side of a skill', '', 1300); scene.audio?.sfx('cursor'); return; }
      if (!b) return; e.preventDefault();
      if (b.dataset.rtb === 'swap') inp.swap = true; else if (b.dataset.rtb === 'crystal') inp.crystal = true; else if (b.dataset.rtb === 'leave') inp.retreat = true;
    });
    let faceDown = null;
    const leaveUp = () => { inp.retreat = false; if (faceDown) { view.facePress(faceDown, false); faceDown = null; } }; on(window, 'pointerup', leaveUp); on(window, 'pointercancel', leaveUp);
    const padPrev = new Map();
    const pollPads = () => { // standard-mapping pads: LB / RB / LT / RT = skills 1-4 (edges)
      const pads = navigator.getGamepads?.() || [];
      for (const p of pads) { if (!p || p.mapping !== 'standard') continue; const now = p.buttons.map((b) => !!b?.pressed), prev = padPrev.get(p.index) || [];
        const e = padSkillEdges(now, prev); if (e.length) inp.fire = e[0];
        for (const k of padXYEdges(now, prev)) { inp.fire = xyOf(sim.ally.c, sim.ally.skills.length)[k === 'x' ? 0 : 1]; view.facePress(k, true); setTimeout(() => view.facePress(k, false), 110); }
        padPrev.set(p.index, now); }
    };
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
    } else if (trainer) { view.banner(view.trainer.text('rtb_trainer.start_banner', '{trainer} wants to fight!', { trainer: view.trainer.name }), '', 1300); setTimeout(() => { if (!finished) view.say('send_out', { creature: nameOf(sim.foes[0]) }); }, 250); }
    else view.banner(foes.length > 1 ? 'Two wild creatures jump out!' : `${nameOf(sim.foes[0])} jumps out!`, 'Fight it, catch it, or slip away', 1400);
    scene.audio?.sfx('grass');
    RTB_STATE.active = { sim, view, inp }; if (window.kilumen) window.kilumen.rtb = RTB_STATE;
    const loop = (now) => {
      if (finished) return;
      let dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (inp.mode && trainer) inp.mode = false;
      if (inp.mode) { if (sim.state !== 'fight') inp.mode = false; else if (!sim.capture && sim.foes.some((f) => f.alive && !f.caught)) return finish(true); } // mid crystal: waits for the result
      pollPads();
      if (stop > 0) stop -= dt;
      else {
        let scale = 1; if (slow) { scale = slow.scale; if ((slow.time -= dt) <= 0) slow = null; }
        acc += dt * scale;
        while (acc >= STEP) {
          acc -= STEP;
          const mv = moveVec(), sprint = inp.bDown != null && (performance.now() - inp.bDown) / 1000 >= B_TAP;
          let crystal = null;
          if (inp.crystal) { const st = crystalStock(scene.systems?.bag)[0]; if (!st) view.num(sim.ally.x, sim.ally.y - 60, 'No crystals', '#ff8a8a'); else if (sim.canCrystal()) crystal = st; }
          if (inp.party != null) { const ok = sim.swap(inp.party); if (!ok && inp.party !== sim.active) view.partyNo?.(inp.party); inp.party = null; }
          const used = crystal; sim.step(STEP, { ...mv, sprint, dodge: inp.dodge, fire: inp.fire, select: inp.select, swap: inp.swap, crystal, retreat: inp.retreat, flee: inp.flee }); inp.flee = false;
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
      window.removeEventListener('keydown', kd, true); window.removeEventListener('keyup', ku, true); window.removeEventListener('mousedown', mCaps, true); window.removeEventListener('mousemove', mCaps, true); window.removeEventListener('focus', mCaps); offs.forEach((f) => f());
      const res = sim.result();
      if (trainer) { res.foes = trainer.foes; res.trainer = true; delete res.caught; } // payout level from the authored team (Systems.onTrainerWin)
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
