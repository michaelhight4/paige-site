// rtb entry (Oct 29 2026; player option since v0.2.4x, Gary: "give players an option in the battle screen"). openRtBattle(ui, scene, foe)
// replaces the battle screen for WILD encounters when the player picked real-time (src/rtb/flag.js; ui.js wireWild).
// opts.carry {foes:[{species, level, variant, hp}]}: the same fight handed over from the turn battle (mode switch).
// The Turn-based button (R) ends this fight with outcome 'switch' + carry (party state applied, nothing saved). The fight happens right on the overworld map, around the player.
// Results fold back through scene.systems.applyBattleResult (same shape as the turn battle), blackout through onPartyFainted.
// Save lock: a scene.saveGuards entry returns 'rtb' for the whole fight (never save mid-battle; the scene.script checkpoint
// taken before the encounter is what a mid-fight reload restores).
// Controls  PC (v0.2.60, keys.js): WASD / arrows move, Q E R F use skill 1-4, 1-6 switch to party slot 1-6, Z / Space / Enter
//               use the selected skill, C next skill, X / Shift tap = dodge, hold = sprint, Tab team, G crystal, T turn-based, hold Esc = leave.
//           pad: LB / RB / LT / RT skills 1-4, A selected skill, B dodge / sprint, Select next skill.
//           phone: D-pad move, A = selected skill, SEL = next skill, B tap = dodge / hold = sprint, tap a skill chip = use it,
//               Team / Leave (hold) buttons top right, big round Capture button on the right edge.
// Capture tab (rtb-capture, Oct 29 2026): G / the Capture button opens a small tab with the player's crystal types, counts and the
// foe's odds right now (same captureChance the roll uses). 1-n / click / tap launches that crystal (sim.castCrystal, unchanged
// capture logic). Not in trainer fights (button hidden). Fairness for a hard game: the fight does NOT pause. It runs at 40 %
// (CAP_TAB.slow) so foes keep moving and telegraphing, skills are locked while the tab is open (dodge still works), a hit on
// your creature snaps the tab shut, and it closes on its own after 4 s real time. You get time to read the odds, not a free pause.
import { RtBattle } from './sim.js?v=v0.2.65-alpha';
import { RtView } from './view.js?v=v0.2.65-alpha';
import { cooldownFor } from './moves.js?v=v0.2.65-alpha';
import { buildSkills } from '../battle/data/skills.js?v=v0.2.65-alpha';
import { maxEnergy, maxHp, xpForLevel, displayName } from '../systems/creature.js?v=v0.2.65-alpha';
import { BATTLE_ITEMS } from '../systems/items.js?v=v0.2.65-alpha';
import { Col } from '../overworld/constants.js?v=v0.2.65-alpha';
import { reducedMotion } from '../sports/hype.js?v=v0.2.65-alpha';
import { actionFor, SKILL_LABELS, padSkillEdges, capsFlipped } from './keys.js?v=v0.2.65-alpha';
import { modeButton, reactionLines, SHOUT } from './switch.js?v=v0.2.65-alpha';
import { CT, factorsOf, oddsBand, CAP_TAB } from './capture.js?v=v0.2.65-alpha';

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
      : { skills: SKILL_LABELS.slice(), party: true, swap: 'Tab', crystal: 'G', leave: 'Caps', help: 'Move WASD · Skills Q E R F · Switch 1-6 · Z selected · C next · X dodge / hold sprint · Tab team · G capture · T turn-based · Caps run (wild) · hold Esc leave' };
    const view = new RtView({ scene, sim, touch, reduced: reducedMotion(q), keyNames });
    view.skillInfo = (id) => SK[id]; view.cdOf = cooldownFor; view.maxEn = (c) => maxEnergy(c); view.maxHpOf = (c) => maxHp(c);
    view.crystals = () => crystalStock(scene.systems?.bag).reduce((n, c) => n + c.n, 0);
    const bag = () => scene.systems?.bag;
    const capItems = () => crystalStock(bag()).map((c) => { const { p } = sim.oddsFor(sim.target, c.grade); return { ...c, name: BATTLE_ITEMS[c.id]?.name || bag()?.def?.(c.id)?.name || c.id, p, band: oddsBand(p) }; });
    const cap = { open: false, t: 0, hl: 0 };
    const capState = () => { if (!cap.open) return null; const t = sim.target; return { open: true, items: capItems(), hl: cap.hl, foe: t ? displayName(t.c) : '', factors: t ? factorsOf(t, sim.oddsFor(t).rarity) : [] }; };
    view.xpBar = (c) => { const a = xpForLevel(c.level), b = xpForLevel(c.level + 1); return Math.max(0, Math.min(1, ((c.xp || 0) - a) / Math.max(1, b - a))); };
    // hide the follower (it is the one fighting) while the fight runs
    const fol = scene.follower, folSheet = fol?.sheet; if (fol) fol.sheet = null;
    const guard = () => 'rtb'; scene.saveGuards?.push(guard);

    // ---- input
    const inp = { capPick: null, capNext: false, mode: false, fire: null, party: null, select: false, swap: false, crystal: false, dodge: false, retreat: false, flee: false, bDown: null, bHeld: false };
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
      if (cap.open) { // tab open: 1-n / Z Space Enter launch, C next row, skills locked, G closes
        if (a.type === 'party') { inp.capPick = a.slot; return; } if (a.type === 'fire') { inp.capPick = cap.hl; return; }
        if (a.type === 'next') { inp.capNext = true; return; } if (a.type === 'skill') return;
      }
      if (a.type === 'skill') inp.fire = a.slot; else if (a.type === 'party') inp.party = a.slot; else if (a.type === 'fire') inp.fire = 'sel';
      else if (a.type === 'next') inp.select = true; else if (a.type === 'team') inp.swap = true; else if (a.type === 'crystal') inp.crystal = globalThis.KILUMEN_RTB_CAPTURE_OFF !== true; else if (a.type === 'mode') inp.mode = true;
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
    const modeBtn = modeButton('turn', { touch, key: 'T' }); modeBtn.classList.add('in-rtb'); hud.appendChild(modeBtn);
    on(modeBtn, 'pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); inp.mode = true; });
    on(modeBtn, 'click', (e) => { e.preventDefault(); e.stopPropagation(); if (e.detail === 0) inp.mode = true; }); // keyboard Enter / Space on the focused button
    on(hud, 'pointerdown', (e) => {
      const s = e.target.closest?.('.rtb-s'), b = e.target.closest?.('[data-rtb]');
      const cr = e.target.closest?.('.rtb-cr'); if (cr) { inp.capPick = +cr.dataset.cap; e.preventDefault(); return; }
      const pi = e.target.closest?.('.rtb-pi'); if (pi) { inp.party = +pi.dataset.i; e.preventDefault(); return; }
      if (s) { sim.selected = +s.dataset.slot; inp.fire = +s.dataset.slot; e.preventDefault(); return; }
      if (!b) return; e.preventDefault();
      if (b.dataset.rtb === 'swap') inp.swap = true; else if (b.dataset.rtb === 'crystal') inp.crystal = globalThis.KILUMEN_RTB_CAPTURE_OFF !== true; else if (b.dataset.rtb === 'leave') inp.retreat = true;
    });
    const leaveUp = () => { inp.retreat = false; }; on(hud, 'pointerup', leaveUp); on(hud, 'pointercancel', leaveUp);
    const padPrev = new Map();
    const pollPads = () => { // standard-mapping pads: LB / RB / LT / RT = skills 1-4 (edges)
      const pads = navigator.getGamepads?.() || [];
      for (const p of pads) { if (!p || p.mapping !== 'standard') continue; const now = p.buttons.map((b) => !!b?.pressed), prev = padPrev.get(p.index) || [];
        const e = padSkillEdges(now, prev); if (e.length) inp.fire = e[0]; padPrev.set(p.index, now); }
    };
    const moveVec = () => {
      let x = 0, y = 0; for (const d of new Set(scene.input?.held || [])) { const v = DIRV[d]; if (v) { x += v[0]; y += v[1]; } }
      return { mx: x, my: y };
    };

    // ---- loop: fixed 1/60 steps, hitstop freezes the sim, slow-mo on the last KO
    let last = performance.now(), acc = 0, stop = 0, slow = null, finished = false, pick = null;
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
      pollPads();
      if (stop > 0) stop -= dt;
      else {
        // capture tab: open / close / launch (real-time seconds, outside the fixed steps)
        if (inp.crystal) { inp.crystal = false;
          if (cap.open) cap.open = false;
          else if (!sim.trainer) { if (!crystalStock(bag()).length) view.num(sim.ally.x, sim.ally.y - 60, CT.button_none, '#ff8a8a'); else if (sim.canCrystal()) { cap.open = true; cap.t = 0; cap.hl = 0; scene.audio?.sfx('select'); } } }
        if (cap.open) {
          cap.t += dt; const items = capItems();
          if (inp.capNext && items.length) cap.hl = (cap.hl + 1) % items.length;
          if (inp.capPick != null && items[inp.capPick]) { pick = items[inp.capPick]; cap.open = false; }
          else if (cap.t >= CAP_TAB.maxOpen || !sim.canCrystal() || !items.length) cap.open = false;
        }
        inp.capPick = null; inp.capNext = false;
        let scale = cap.open ? CAP_TAB.slow : 1; if (slow) { scale = slow.scale; if ((slow.time -= dt) <= 0) slow = null; }
        acc += dt * scale;
        while (acc >= STEP) {
          acc -= STEP;
          const mv = moveVec(), sprint = inp.bDown != null && (performance.now() - inp.bDown) / 1000 >= B_TAP;
          let crystal = null;
          if (pick && sim.canCrystal()) { crystal = { id: pick.id, grade: pick.grade }; pick = null; }
          if (inp.party != null) { const ok = sim.swap(inp.party); if (!ok && inp.party !== sim.active) view.partyNo?.(inp.party); inp.party = null; }
          const used = crystal; sim.step(STEP, { ...mv, sprint, dodge: inp.dodge, fire: cap.open ? null : inp.fire, select: inp.select, swap: inp.swap, crystal, retreat: inp.retreat, flee: inp.flee }); inp.flee = false;
          if (used && sim.crystalUsed && sim.events.some((e) => e.type === 'crystalCast')) scene.systems.bag.remove(used.id, 1);
          inp.fire = null; inp.select = inp.swap = inp.dodge = false;
          const evs = sim.drain(); if (cap.open && evs.some((e) => e.type === 'hit' && e.who === sim.ally)) { cap.open = false; view.num(sim.ally.x, sim.ally.y - 80, '!', '#ff6b6b'); } const r = view.onEvents(evs); if (r.stop) stop = Math.max(stop, view.reduced ? r.stop / 2 : r.stop); if (r.slow) slow = r.slow;
          if (stop > 0) break;
        }
      }
      view.capOpen = cap.open; view.capTab(capState());
      view.frame(dt);
      if (sim.done) return finish();
      requestAnimationFrame(loop);
    };
    const finish = async (toTurn = false) => {
      if (finished) return; finished = true;
      window.removeEventListener('keydown', kd, true); window.removeEventListener('keyup', ku, true); window.removeEventListener('mousedown', mCaps, true); window.removeEventListener('mousemove', mCaps, true); window.removeEventListener('focus', mCaps); offs.forEach((f) => f());
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
