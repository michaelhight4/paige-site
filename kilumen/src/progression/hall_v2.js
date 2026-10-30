// Hall overhaul v2 runtime (Phase 2, Oct 29 2026): the 8 rebuilt Master's halls (maps with a `hall_v2` block).
//  - Puzzle: push tiles, slide floor, warp pads, invisible walls and two-switch gates (model: puzzles.js HallV2; the same
//    rules the solver proves). Gate bits live in save.systems.progression.puzzles.v2_<zone>.bits; they reset to 0 when you
//    come in through the door. A forced chain (push / slide) holds lockSave('hall_slide') and freezes input, so no save is
//    ever written mid-slide ("no saves mid-puzzle cutscenes").
//  - Wins gate (Gary): halls with more than 4 trainers open the Master after ANY 4 wins; 4 or fewer need everyone.
//    Counter `hall_<zone>_wins` (scene.counters, saved) = this hall's beaten trainers. The attendant says
//    system_halls.progress / progress_open; the Master says system_halls.master_locked until then.
//  - After the Master (beat_master_<zone>, or a `defeated:` record / coin record for old saves): trainers never spot you and
//    never battle again, even ones you never fought; talking gives their `after` line.
//  - Master rematch: after the first win, talking to the Master asks system_halls.rematch_prompt; 300 gold is paid up front
//    and kept win or lose (the first challenge is free). Under 300 gold: system_halls.rematch_no_gold. The team scales by
//    1.3^wins (wins = counter master_<zone>_wins, at least 1 once beaten), levels capped at KILUMEN_RULES.enemyMaxLevel (68).
//    A rematch win bumps the counter and pays a flat REMATCH_PRIZE (1200 gold, Gary Oct 29 2026; no difficulty / perk
//    multipliers, no coin), said in system_halls.rematch_won ({prize}, bare number). The first Master win keeps its normal prize + coin.
//  - Prism relay (Revival Heights, Gary Oct 29 2026; replaces its light gates): hall_v2.prism + grid 'E' emitter, 'P'
//    prisms (A turns one U->R->D->L), 'r' receiver, 'L' crystal door. The live beam is drawn over the floor every frame
//    (HallV2.beam = the same trace the solver uses); the door opens while the receiver is lit. Turns live in the state bits.
//  - Trainers walk back to their seat after a talk / battle so the walk the solver proved stays open.
import { HallV2, V2_PUSH } from './puzzles.js?v=v0.2.97-alpha';
import { TILE } from '../overworld/constants.js?v=v0.2.97-alpha';
import { KILUMEN_RULES } from '../battle/data/rules.js?v=v0.2.97-alpha';
import { applyHallAnim, hallAnimOn } from './hall_anim.js?v=v0.2.97-alpha';

export const REMATCH_FEE = 300, REMATCH_PRIZE = 1200, WIN_SCALE = 1.3;
const OPP = { up: 'down', down: 'up', left: 'right', right: 'left' };
const NAME = { U: 'up', D: 'down', L: 'left', R: 'right' }, LETTER = { up: 'U', down: 'D', left: 'L', right: 'R' };

/** Rematch team: every level x 1.3^wins, rounded, capped at enemyMaxLevel 68 (never below 1). Pure; keeps the other fields. */
export function scaleMasterTeam(foes, wins, max = KILUMEN_RULES.enemyMaxLevel || 68) {
  const k = Math.pow(WIN_SCALE, Math.max(0, wins | 0));
  return (foes || []).map((f) => ({ ...f, level: Math.max(1, Math.min(max, Math.round((f.level || 1) * k))) }));
}
/** DRAFT hint pages (Coder, Oct 30 2026; Text Bot to rewrite as system_halls.hint_<zone>). The attendant adds them until the Master is beaten. */
export const HALL_HINTS = {
  fernwick: ['The round plate on the floor opens the gate. Step on it, then walk through.'],
  saltmere: ['Each floor plate swaps which gate is open. One plate, one swap. Watch the gates when you step.'],
  revival_heights: ['Press A on a crystal to turn it. Line the light up with the door and it opens.'],
  mirefen: ['Arrow plates in the bog carry you the way they point. Try the short one by the door first.'],
  frostspire: ['Two hall helpers wait on the ledge above the ice. Slide up the middle lane, by the pillar, to reach them.'],
  tidewater_coast: ['The two shell plates on the floor turn the tide. Step on one and the water gates swap.', 'If a gate blocks you, go back and step on the other plate. Beaten trainers step aside if you walk into them.'],
  cindervale: ['Arrow plates are conveyors. Step on one and it carries you the way it points.', 'Start through the gap on the far right. The belts loop, so if you get carried back, just try a different plate.'],
  lanternport: ['The hall trainers wait on the floors below. The lamp room at the top is where the Master stands.', 'Walk left along the carpet to reach the Master. The stairs by the door lead back down.'],
};
/** DRAFT entry toasts (Text Bot key system_halls.enter_<zone>). */
export const HALL_ENTRY = {
  fernwick: 'Floor plates open gates.',
  saltmere: 'Each plate swaps the gates.',
  revival_heights: 'Turn the crystals to light the door.',
  mirefen: 'Arrow plates carry you.',
  frostspire: 'Ice slides you until you hit something.',
  tidewater_coast: 'Shell plates on the floor turn the tide.',
  cindervale: 'Arrow plates move you. Ask the attendant for tips.',
  lanternport: 'The Master waits at the far end of the carpet.',
};
/** Real hall trainers only: hooded trainers that battle (an NPC marked hint_only, like a hint-giver, never counts). */
export const hallTrainers = (mj) => (mj?.npcs || []).filter((n) => n.kind === 'trainer_hooded' && !n.hint_only);
/** Puzzle done = the player has stood on the dais front (only reachable through the puzzle; tests prove it per hall). */
export const puzzleFlag = (mj) => `hall_${mj.hall_v2.zone}_puzzle_done`;
/** Can the Master be challenged? Needs the puzzle AND the wins (or an old save that already beat the Master). */
export function masterOpen(ctx, mj) {
  if (masterBeaten(ctx, mj)) return { ok: true };
  const wins = hallWins(ctx.seen, mj), need = needWins(mj, ctx.beatable?.[mj.hall_v2.zone]), puzzle = !!ctx.flags?.has?.(puzzleFlag(mj));
  return { ok: puzzle && wins >= need, puzzle, wins, need, left: Math.max(0, need - wins) };
}
/** Beaten trainers of a v2 hall map (defeated: records). */
/** Multi-floor halls (Lanternport lighthouse, Gary Oct 29 2026): hall_v2.members = every floor's trainers as '<map>.<id>', so
 *  wins count across the floors; hall_v2.master_ref = '<map>.<id>' of the Master on the lamp-room floor. */
export const hallMembers = (mj) => mj?.hall_v2?.members || hallTrainers(mj).map((n) => `${mj.name}.${n.id}`);
export const hallWins = (seen, mj) => hallMembers(mj).filter((k) => seen?.[`defeated:${k}`]).length;
/** Wins the Master asks for: hall_v2.need_wins (or min(4, members)), never more than the members that are really placed and
 *  beatable (`beatable` = that count once known, see beatableMembers; Oct 30 2026 lamp-room report: the gate must always be meetable). */
export const needWins = (mj, beatable = null) => { const n = mj?.hall_v2?.need_wins ?? Math.min(4, hallMembers(mj).length); return beatable == null ? n : Math.min(n, beatable); };
/** Members that resolve to a placed, beatable trainer: an NPC with that id on that map, kind trainer_hooded, not hint_only, and
 *  (when `entry` is given) a lines entry with battle_lost. getMap(name) -> map json | null (null = missing map: not beatable). */
export function beatableMembers(mj, getMap, entry = null) {
  return hallMembers(mj).filter((k) => {
    const i = k.lastIndexOf('.'), mn = k.slice(0, i), id = k.slice(i + 1), m = mn === mj.name ? mj : getMap(mn);
    const d = (m?.npcs || []).find((n) => n.id === id);
    return !!(d && d.kind === 'trainer_hooded' && !d.hint_only && (!entry || entry(mn, d)?.battle_lost));
  });
}
/** Gate-bit store key: per floor map for multi-floor halls (each floor has its own gates), per zone otherwise. */
export const bitsKey = (mj) => (mj.hall_v2.floor ? `v2_${mj.name}` : `v2_${mj.hall_v2.zone}`);
/** Has this hall's Master been beaten (flag, defeated record or coin record: old saves too)? */
export function masterBeaten({ flags, seen, store }, mj) {
  const z = mj?.hall_v2?.zone, master = (mj?.npcs || []).find((n) => n.kind === 'master'), ref = mj?.hall_v2?.master_ref || (master && `${mj.name}.${master.id}`);
  return !!(z && (flags?.has?.(`beat_master_${z}`) || store?.masters?.[z] || (ref && seen?.[`defeated:${ref}`])));
}
/** Master wins so far (counter master_<zone>_wins; a beaten Master counts at least 1 for old saves). */
export const masterWins = (ctx, mj) => Math.max(ctx.counters?.[`master_${mj.hall_v2.zone}_wins`] | 0, masterBeaten(ctx, mj) ? 1 : 0);

export function attachHallV2(scene, ui, pg) {
  const store = pg.store, hv = { cur: null };
  pg.hallV2 = hv;
  hv.beatable = {}; // zone -> beatable member count (resolved on entry; until then the declared need applies)
  const ctx = () => ({ flags: scene.flags, seen: scene.seen, store, counters: scene.counters, beatable: hv.beatable });
  /** Resolve this hall's beatable members (other floors' maps load through scene.loadMap; a map that fails to load counts 0). */
  const resolveBeatable = (m) => {
    const z = m.hall_v2.zone, names = [...new Set(hallMembers(m).map((k) => k.slice(0, k.lastIndexOf('.'))))].filter((n) => n !== m.name);
    const entry = typeof scene._entryFor === 'function' ? (mn, d) => scene._entryFor(mn, d) : null;
    if (!names.length) { hv.beatable[z] = beatableMembers(m, () => null, entry).length; return Promise.resolve(hv.beatable[z]); }
    if (typeof scene.loadMap !== 'function') return Promise.resolve(null);
    return Promise.all(names.map((n) => scene.loadMap(n).then((g) => [n, g?.json || null], () => [n, null]))).then((got) => {
      const by = Object.fromEntries(got); hv.beatable[z] = beatableMembers(m, (n) => by[n] || null, entry).length; return hv.beatable[z];
    });
  };
  hv.resolveBeatable = resolveBeatable;
  const mj = () => scene.map?.json?.hall_v2 ? scene.map.json : null;
  const text = (k, fb) => { const v = scene.lines?.system_halls?.[k]; return v?.pages || (Array.isArray(v) ? v : null) || fb; };
  const fillv = (pages, vars) => pages.map((p) => p.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m)));

  const syncWins = () => {
    const m = mj(); if (!m || !scene.counters) return 0;
    const k = `hall_${m.hall_v2.zone}_wins`, n = hallWins(scene.seen, m);
    if (scene.counters[k] !== n) { scene.counters[k] = n; scene._dirty = true; }
    return n;
  };
  hv.quiet = (def) => { const m = mj(); return !!(m && def && def.kind === 'trainer_hooded' && masterBeaten(ctx(), m)); };

  // ---- gates / plates ------------------------------------------------------------------------------------------------
  const tileOk = (name) => !!scene.map?.tileByName?.(name);
  hv.apply = () => {
    const c = hv.cur; if (!c) return;
    const m = scene.map, h = c.json.hall_v2, T = h.tiles, anim = hallAnimOn() && tileOk('ha_fernwick_sinking_slab') ? h.anim : null, b = c.bits;
    for (let y = 0; y < h.grid.length; y++) for (let x = 0; x < h.grid[y].length; x++) {
      const ch = h.grid[y][x];
      if ('abcd'.includes(ch)) {
        const open = c.model.open(x, y, b) || !!m.npcAt(x, y);
        const pair = 'ab'.includes(ch) ? T.gate0 : T.gate1;
        m.layers.collision[y][x] = open ? 0 : 6;
        // gate art has transparent pixels: on the ground layer they showed as a black block (QA Oct 30 2026, Cindervale
        // Master doorway). Put a floor tile under it and the gate on decoration (same tiles, same collision).
        if (!(anim?.gate0 && 'ab'.includes(ch)) && tileOk('floor_tile')) { m.setTile('ground', x, y, 'floor_tile'); m.setTile('decoration', x, y, pair[open ? 1 : 0]); }
        else m.setTile('ground', x, y, pair[open ? 1 : 0]);
        if (anim?.gate0 && 'ab'.includes(ch)) {
          const g = anim.gate0, L = g.layer;
          if (L === 'ground') { if (!open && g.closed) m.setTile('ground', x, y, g.closed); }
          else m.setTile(L, x, y, open ? g.open || 0 : g.closed);
        }
      } else if (ch === 'L') {
        const open = c.model.beamOpen(b) || (scene.player?.x === x && scene.player?.y === y);
        m.layers.collision[y][x] = open ? 0 : 6;
        if (tileOk('crystal_barrier_lit')) m.setTile('decoration', x, y, open ? 'crystal_barrier_dim' : 'crystal_barrier_lit');
      } else if (ch === 'E') { if (tileOk('i_beam_emitter')) m.setTile('decoration', x, y, 'i_beam_emitter'); m.layers.collision[y][x] = 1; }
      else if (ch === 'r') { if (tileOk('i_beam_receiver_off')) m.setTile('decoration', x, y, c.model.beam(b).lit.has(`${x},${y}`) ? 'i_beam_receiver_on' : 'i_beam_receiver_off'); m.layers.collision[y][x] = 1; }
      else if (ch === 'P') m.layers.collision[y][x] = 1;
      else if (ch === 'T' || ch === 'U') m.setTile('ground', x, y, (ch === 'T' ? T.plate0 : T.plate1)[(ch === 'T' ? b & 1 : (b >> 1) & 1)]);
    }
    scene._dirty = true;
  };
  const setBits = (b) => {
    const c = hv.cur; if (!c || b === c.bits) return;
    const was = c.bits; c.bits = b; (store.puzzles ||= {})[bitsKey(c.json)] = { bits: b }; hv.apply();
    gateNews(c, was, b);
    scene.audio?.sfx?.('select'); scene.log?.push({ tick: scene.tick, type: 'hall_bits', bits: b });
  };
  // visible cause and effect: say which way a gate opened (it may be off-screen) and how the tide stands
  const gateNews = (c, was, b) => {
    const p = scene.player, z = c.json.hall_v2.zone, rows = c.json.hall_v2.grid; let opened = null, closed = 0;
    rows.forEach((r, y) => [...r].forEach((ch, x) => { if (!'abcd'.includes(ch)) return; const o = c.model.openGate(ch, b), w = c.model.openGate(ch, was);
      if (o && !w && (!opened || Math.abs(x - p.x) + Math.abs(y - p.y) < Math.abs(opened[0] - p.x) + Math.abs(opened[1] - p.y))) opened = [x, y]; if (!o && w) closed++; }));
    const dir = opened ? (Math.abs(opened[1] - p.y) >= Math.abs(opened[0] - p.x) ? (opened[1] < p.y ? 'north' : 'south') : (opened[0] < p.x ? 'west' : 'east')) : '';
    const tide = z === 'tidewater_coast' ? ((b & 1) ? 'The tide rises. ' : 'The tide falls. ') : '';
    const msg = opened ? text('gate_open', ['{tide}A gate opened to the {dir}.']) : closed ? text('gate_shut', ['{tide}A gate closed.']) : [];
    if (msg.length) { scene.toast?.(fillv(msg, { tide, dir }).join(' ').trim()); if (opened) scene.audio?.sfx?.('warp'); scene.log?.push({ tick: scene.tick, type: 'hall_gate_news', opened, closed }); }
  };
  const startChain = () => { const c = hv.cur; if (c && !c.release) { c.release = scene.lockSave ? scene.lockSave('hall_slide') : () => {}; scene.player.locked = true; } };
  const endChain = () => { const c = hv.cur; if (c?.release) { const r = c.release; c.release = null; scene.player.locked = !!(scene.busy || scene.fade); r(); } };
  hv.chaining = () => !!hv.cur?.release;
  scene.hallQuiet = (n) => !!hv.cur && (hv.chaining() || hv.quiet(n?.def || n));
  scene.hallBits = () => hv.cur?.bits ?? 0; // probes/debug: live gate bits

  hv.arrive = (x, y, mover, world) => {
    const c = hv.cur; if (!c) return undefined;
    const ch = c.model.at(x, y), d = LETTER[mover.facing], df = c.json.hall_v2.dais_front;
    if (df && x === df[0] && y === df[1] && !scene.flags?.has?.(puzzleFlag(c.json))) { scene.setFlag ? scene.setFlag(puzzleFlag(c.json)) : scene.flags?.add?.(puzzleFlag(c.json)); scene._dirty = true; }
    const r = c.model.land(x, y, c.bits, d);
    if (r.b !== c.bits) setBits(r.b);
    if (r.warp) {
      const [wx, wy] = r.warp;
      if (scene.map.npcAt(wx, wy)) { endChain(); return undefined; }
      mover.place(wx, wy, mover.facing); scene.audio?.sfx?.('warp');
      scene.log?.push({ tick: scene.tick, type: 'hall_warp', from: [x, y], to: [wx, wy] });
      endChain(); scene._dirty = true; return 'stop';
    }
    const nd = V2_PUSH[ch] || (ch === 'i' ? d : null);
    if (!nd) { endChain(); return undefined; }
    startChain();
    mover.facing = NAME[nd]; mover._attempt(NAME[nd], world, []);
    if (mover.state !== 'step') { mover.state = 'idle'; mover.t = 0; endChain(); }
    return 'stop';
  };
  // slab (Fernwick, animated tiles only): leaving a sinking slab plays it once; after 880 ms the cell is water (code 3)
  hv.leave = (fx, fy) => {
    const c = hv.cur, a = c?.json.hall_v2.anim; if (!c || !a?.slab || !hallAnimOn() || !tileOk(a.slab_tile)) return;
    if (!a.slab.some(([x, y]) => x === fx && y === fy) || c.sunk.has(`${fx},${fy}`)) return;
    c.sunk.add(`${fx},${fy}`); scene.rustles?.set(`${fx},${fy}`, scene.ms);
    const map = scene.map;
    c.timers.push(setTimeout(() => { if (scene.map !== map) return; map.setTile('ground', fx, fy, 'water'); map.layers.collision[fy][fx] = 3; scene.rustles?.delete(`${fx},${fy}`); scene._dirty = true; }, a.slab_ms || 880));
  };

  if (typeof scene.worldApi === 'function') {
    const wa = scene.worldApi.bind(scene);
    scene.worldApi = () => {
      const w = wa(); if (!hv.cur) return w;
      const oa = w.onArrive, os = w.onStepStart, ob = w.onBump;
      w.onBump = (x, y, dir, mover, q) => { if ((!mover || mover === scene.player) && stepAside(dir)) return; return ob?.(x, y, dir, mover, q); };
      w.onArrive = (x, y, mover, how) => { const r = oa?.(x, y, mover, how); if (r === 'stop') { endChain(); return r; } if (mover && mover !== scene.player) return r; return hv.arrive(x, y, mover || scene.player, w) ?? r; };
      w.onStepStart = (x, y, mover) => { const p = scene.player; if (!mover || mover === p) hv.leave(p.x, p.y); return os?.(x, y, mover); };
      return w;
    };
  }

  // ---- prism relay: A on a prism turns it; the beam is drawn live ----------------------------------------------------
  hv.turnPrism = (x, y) => {
    const c = hv.cur; if (!c?.model.prism || !c.model.pi.has(`${x},${y}`)) return null;
    const was = c.model.beamOpen(c.bits), nb = c.model.turn(x, y, c.bits);
    c.bits = nb; (store.puzzles ||= {})[bitsKey(c.json)] = { bits: nb }; hv.apply();
    const i = c.model.pi.get(`${x},${y}`), now = c.model.beamOpen(nb);
    scene.audio?.sfx?.('select'); scene.log?.push({ tick: scene.tick, type: 'hall_prism', at: [x, y], facing: 'URDL'[c.model.facing(i, nb)], open: now });
    if (now && !was) { scene.audio?.sfx?.('warp'); scene.toast?.(text('prism_open', ['The crystal door hums open.']).join(' ')); /* Text Bot key system_halls.prism_open */ }
    return { facing: 'URDL'[c.model.facing(i, nb)], open: now };
  };
  /** F on a shut gate / crystal (tester Oct 30 2026, Tidewater: "F does nothing, no hint"): say which plate swaps it, and the
   *  Master's wins so far. Text Bot keys system_halls.gate_hint_plate / gate_hint_crystal (DRAFT fallbacks). -> true if handled. */
  hv.gateHint = (px, py, facing) => {
    const c = hv.cur, m = mj(); if (!c || !m || scene.map?.json !== c.json) return false;
    const d = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[facing]; if (!d) return false;
    const x = px + d[0], y = py + d[1], ch = c.json.hall_v2.grid[y]?.[x];
    if (!ch || !'abcd'.includes(ch) || c.model.open(x, y, c.bits) || scene.map?.npcAt?.(x, y)) return false;
    const wins = syncWins(), need = needWins(m, hv.beatable[m.hall_v2.zone]);
    const k = 'ab'.includes(ch) ? 'gate_hint_plate' : 'gate_hint_crystal';
    const fb = 'ab'.includes(ch) ? ["This gate is shut tight. A floor\nplate somewhere in this hall swaps it.", "Hall wins: {wins} of {need}."]
      : ["This crystal is dark. A crystal\nplate somewhere in this hall wakes it.", "Hall wins: {wins} of {need}."]; // Text Bot DRAFT (data/textbot_hall_arena.json)
    const pages = fillv(text(k, fb), { wins, need, left: Math.max(0, need - wins) });
    scene.log?.push({ tick: scene.tick, type: 'hall_gate_hint', at: [x, y], gate: ch, wins, need });
    scene.script?.(async () => { await scene.say(pages, null); }); return true;
  };
  if (typeof scene.interact === 'function') {
    const interact = scene.interact.bind(scene);
    scene.interact = (...a) => {
      const p = scene.player, c = hv.cur;
      if (!scene.busy && c?.model.prism && p) {
        const d = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[p.facing] || [0, 0];
        if (hv.turnPrism(p.x + d[0], p.y + d[1])) return;
      }
      if (!scene.busy && c && p && hv.gateHint(p.x, p.y, p.facing)) return;
      return interact(...a);
    };
  }
  const drawBeam = (ctx, v) => {
    const c = hv.cur; if (!c?.model.prism || scene.map?.json !== c.json) return;
    const z = v.zoom, P = (gx, gy) => [((gx + 0.5) * TILE - v.cam.x) * z, ((gy + 0.5) * TILE - v.cam.y) * z], { segs, lit } = c.model.beam(c.bits);
    const pulse = 0.75 + 0.25 * Math.sin((v.ms || 0) / 160);
    ctx.save(); ctx.lineCap = 'round'; ctx.globalCompositeOperation = 'lighter';
    for (const [w, col] of [[18, `rgba(170,120,255,${0.25 * pulse})`], [8, `rgba(200,170,255,${0.7 * pulse})`], [3, 'rgba(255,250,255,0.95)']]) {
      ctx.lineWidth = w * z / 2; ctx.strokeStyle = col; ctx.beginPath();
      for (const [x0, y0, x1, y1] of segs) { ctx.moveTo(...P(x0, y0)); ctx.lineTo(...P(x1, y1)); }
      ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
    c.model.prism.prisms.forEach((pr, i) => { // prism body + a notch on its facing side
      const [cx, cy] = P(...pr.at), r = TILE * z * 0.34, f = c.model.facing(i, c.bits), [dx, dy] = [[0, -1], [1, 0], [0, 1], [-1, 0]][f];
      ctx.fillStyle = 'rgba(120,90,200,0.9)'; ctx.strokeStyle = '#efe4ff'; ctx.lineWidth = 2 * z;
      ctx.beginPath(); ctx.moveTo(cx, cy - r); ctx.lineTo(cx + r, cy); ctx.lineTo(cx, cy + r); ctx.lineTo(cx - r, cy); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fff6c8'; ctx.beginPath(); ctx.arc(cx + dx * r * 0.95, cy + dy * r * 0.95, r * 0.28, 0, 7); ctx.fill();
    });
    for (const k of lit) { const [x, y] = k.split(',').map(Number), [cx, cy] = P(x, y); ctx.fillStyle = `rgba(255,240,255,${0.5 * pulse})`; ctx.beginPath(); ctx.arc(cx, cy, TILE * z * 0.45, 0, 7); ctx.fill(); }
    ctx.restore();
  };
  hv.drawBeam = drawBeam;
  if (typeof scene.view === 'function') {
    const view = scene.view.bind(scene);
    scene.view = (...a) => {
      const v = view(...a); if (!hv.cur?.model.prism || !v) return v;
      const under = v.markers; v.markers = (ctx, vv) => { drawBeam(ctx, vv || v); return typeof under === 'function' ? under(ctx, vv) : undefined; };
      return v;
    };
  }

  // ---- map entry -------------------------------------------------------------------------------------------------------
  hv.enter = () => {
    for (const t of hv.cur?.timers || []) clearTimeout(t);
    if (hv.cur?.release) endChain();
    const m = mj(); if (!m) { hv.cur = null; return null; }
    const h = m.hall_v2, z = h.zone, p = scene.player;
    const atDoor = p && ((p.x === h.arrival[0] && p.y === h.arrival[1]) || (p.x === h.door[0] && p.y === h.door[1]));
    const saved = store.puzzles?.[bitsKey(m)]?.bits | 0;
    hv.cur = { json: m, model: new HallV2(h.grid, hallTrainers(m).map((n) => [n.x, n.y]), h.prism), bits: atDoor ? 0 : saved, release: null, sunk: new Set(), timers: [] };
    (store.puzzles ||= {})[bitsKey(m)] = { bits: hv.cur.bits };
    if (hallAnimOn()) applyHallAnim(scene.map);
    hv.apply(); syncWins();
    try { resolveBeatable(m)?.catch?.(() => {}); } catch (e) { console.error('hall v2 beatable:', e); }
    const tip = atDoor && !masterBeaten(ctx(), m) ? text(`enter_${z}`, HALL_ENTRY[z] ? [HALL_ENTRY[z]] : []) : [];
    if (tip.length) scene.toast?.(tip.join(' '));
    return hv.cur;
  };
  if (typeof scene._enterMap === 'function') {
    const enter = scene._enterMap.bind(scene);
    scene._enterMap = async (...a) => { const r = await enter(...a); try { hv.enter(); } catch (e) { console.error('hall v2:', e); } return r; };
  }
  try { hv.enter(); } catch (e) { console.error('hall v2:', e); }

  // ---- talk: attendant, wins gate, quiet after the Master, rematch, walk back to the seat ------------------------------
  // Live v0.2.93 Tidewater soft-lock: a trainer who walked up to you (sight) could not path home past you / the pet in a 1-tile
  // corridor (walkTo -> null), and the old seatBack gave up after one try, so the beaten trainer stood in the only way through.
  // Now: retry the walk while it is blocked; after ~1.2 s blocked, step them straight back onto their seat (snapSeat).
  const DEL = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  hv.snapSeat = (def) => {
    const n = scene.npcs?.byId?.(def.id), m = scene.map, p = scene.player, f = scene.follower; if (!n || !m) return false;
    if (n.x === def.x && n.y === def.y) return true;
    const o = m.npcAt?.(def.x, def.y);
    if ((o && o !== n) || (p && p.x === def.x && p.y === def.y) || (f && f.x === def.x && f.y === def.y)) return false;
    m.vacate(n.x, n.y, n); n.mover.place(def.x, def.y, def.facing || n.mover.facing); m.occupy(def.x, def.y, n);
    n.script = []; n.goal = null; n.home = { x: def.x, y: def.y, facing: def.facing || 'down' };
    scene.log?.push({ tick: scene.tick, type: 'hall_seat_snap', npc: def.id }); scene._dirty = true; return true;
  };
  // Seats owed after a battle: settled on the FIRST game tick the hall is not busy, before that tick reads your keys, so the
  // same key presses always meet the same hall (Oct 30 2026 playtest: a 50-150 ms timer race let a key land first).
  const owed = new Map();
  if (typeof scene.step === 'function') {
    const step0 = scene.step.bind(scene);
    scene.step = (...a) => {
      if (owed.size && !scene.busy) for (const [id, def] of owed) { const n = scene.npcs?.byId?.(id); if (!n || n.talking || n.mover?.moving || hv.snapSeat(def)) owed.delete(id); }
      return step0(...a);
    };
  }
  const seatBack = (def) => {
    owed.set(def.id, def);
    let blocked = 0;
    const iv = setInterval(() => {
      const n = scene.npcs?.byId?.(def.id);
      if (!n || scene.map?.json !== hv.cur?.json) { clearInterval(iv); return; }
      if (n.x === def.x && n.y === def.y && !n.mover.moving) { n.mover.facing = def.facing || n.mover.facing; n.faceDir = def.facing; clearInterval(iv); return; }
      if (scene.busy || n.talking || n.mover.moving) return;
      // Oct 30 2026 playtest (Cindervale/Tidewater walkthroughs desynced): the walk home took the trainer across your next
      // steps, so the same keys led somewhere else depending on timing. A beaten trainer is now back on their seat the moment
      // the battle closes (the battle transition hides the hop); the walk is only the fallback when the seat is taken.
      if (hv.snapSeat(def)) { n.mover.facing = def.facing || n.mover.facing; n.faceDir = def.facing; clearInterval(iv); return; }
      if (n.script?.length) return;
      if (scene.npcs.walkTo(def.id, def.x, def.y, { stay: true })) { blocked = 0; return; }
      if (++blocked >= 8 && hv.snapSeat(def)) clearInterval(iv);
    }, 50);
    setTimeout(() => clearInterval(iv), 120000);
  };
  hv.seatBack = seatBack;
  // A beaten (or quiet, after the Master) hall trainer never blocks you: bumping one sends them to their seat, or, if the seat
  // is taken, you trade places with them (Gary's "defeated trainers step aside or are passable", live v0.2.93 report).
  const stepAside = (dir) => {
    const c = hv.cur, p = scene.player, d = DEL[dir]; if (!c || !p || !d || scene.busy) return false;
    const n = scene.map?.npcAt?.(p.x + d[0], p.y + d[1]); const def = n?.def;
    if (!def || def.kind !== 'trainer_hooded' || !(scene.seen?.[`defeated:${c.json.name}.${def.id}`] || hv.quiet(def))) return false;
    if (n.x !== def.x || n.y !== def.y) { if (hv.snapSeat(def)) return true; }
    const nx = n.x, ny = n.y, m = scene.map;
    m.vacate(nx, ny, n); n.mover.place(p.x, p.y, OPP[dir]); m.occupy(p.x, p.y, n); p.place(nx, ny, dir);
    if (n.x !== def.x || n.y !== def.y) seatBack(def);
    scene.log?.push({ tick: scene.tick, type: 'hall_trade_places', npc: def.id }); scene._dirty = true; return true;
  };
  hv.stepAside = stepAside;
  hv.rematch = async (n, def, m) => {
    const sp = scene.speakerFor?.(n), z = m.hall_v2.zone, e = scene._entryFor?.(m.name, def) || {};
    const wins = masterWins(ctx(), m), w = scene.systems?.wallet;
    const yes = (await scene.ask(fillv(text('rematch_prompt', ['Again? A rematch costs {fee} gold, paid now, win or lose.']), { fee: REMATCH_FEE }), ['Yes', 'No'], sp)) === 0;
    if (!yes) { await scene.say(e.after || ['Come back any time.'], sp); return 'declined'; }
    if (!w || !w.spend(REMATCH_FEE)) { await scene.say(fillv(text('rematch_no_gold', ['A rematch is {fee} gold. Come back when you have it.']), { fee: REMATCH_FEE }), sp); return 'no_gold'; }
    scene.log?.push({ tick: scene.tick, type: 'master_rematch', zone: z, wins, fee: REMATCH_FEE });
    scene._dirty = true;
    await scene.say(e.pages || ['Again, then.'], scene.speakerFor?.(n, true));
    const won = scene.hooks.onBattle ? await scene.hooks.onBattle({ map: m.name, id: def.id, masterRematch: true, masterWins: wins }) : true;
    scene.log?.push({ tick: scene.tick, type: 'battle', npc: def.id, won, rematch: true });
    if (won !== false) {
      scene.counters[`master_${z}_wins`] = wins + 1; scene._dirty = true;
      w.add?.(REMATCH_PRIZE); if (!w.add && 'coins' in w) w.coins += REMATCH_PRIZE;
      scene.log?.push({ tick: scene.tick, type: 'prize', npc: def.id, amount: REMATCH_PRIZE, rematch: true });
      await scene.say(fillv(text('rematch_won', ['Well fought. Here is your {prize} gold.']), { prize: REMATCH_PRIZE }), sp); // Text Bot: {prize} bare number
      return 'won';
    }
    await scene.say(e.battle_won || [], sp);
    const out = await scene.systems?.onTrainerLoss?.({ map: m.name, def });
    if (!out && scene.systems?.onPartyFainted && !(scene.party || []).some((c) => c.hp == null || c.hp > 0)) await scene.systems.onPartyFainted();
    return 'lost';
  };
  if (typeof scene.talk === 'function') {
    const talk = scene.talk.bind(scene);
    scene.talk = (n, def) => {
      const m = mj(); if (!m || !def) return talk(n, def);
      const z = m.hall_v2.zone, wins = syncWins(), need = needWins(m, hv.beatable[m.hall_v2.zone]), beaten = masterBeaten(ctx(), m);
      if (def.kind === 'villager_scholar') { // the hall attendant: progress line
        const left = Math.max(0, need - wins), k = beaten || left === 0 ? 'progress_open' : 'progress';
        const hint = !beaten ? text(`hint_${z}`, HALL_HINTS[z] || []) : []; // live v0.2.93: hall hints while the Master is unbeaten
        return scene.script(async () => { n && scene.npcs.beginTalk(n); try { await scene.say([...fillv(text(k, ['Hall wins: {wins} of {need}.']), { wins, need, left }), ...hint], scene.speakerFor?.(n)); } finally { n && scene.npcs.endTalk(n); } });
      }
      if (def.kind === 'master') {
        if (beaten) {
          return scene.script(async () => { n && scene.npcs.beginTalk(n); try { await hv.rematch(n, def, m); } finally { n && scene.npcs.endTalk(n); } });
        }
        const g = masterOpen(ctx(), m);
        if (!g.ok) {
          scene.log?.push({ tick: scene.tick, type: 'hall_wins_gate', zone: z, wins, need, puzzle: g.puzzle });
          let pages = !g.puzzle ? text('master_puzzle', ['Find your way up here properly first.']) : fillv(text('master_locked', ["Not yet. Beat {left} more in my\nhall, then come and find me.", "Hall wins so far: {wins} of {need}."]), { wins, need, left: Math.max(0, need - wins) });
          // multi-floor hall (Lanternport lamp room): no trainer left on this floor -> add the hall's first hint page (where they wait)
          if (g.puzzle && !hallMembers(m).some((k) => k.startsWith(`${m.name}.`) && !scene.seen?.[`defeated:${k}`])) pages = [...pages, ...text(`hint_${z}`, HALL_HINTS[z] || []).slice(0, 1)];
          return scene.script(async () => { n && scene.npcs.beginTalk(n); try { await scene.say(pages, scene.speakerFor?.(n)); } finally { n && scene.npcs.endTalk(n); } });
        }
        const r = talk(n, def); const iv = setInterval(() => { if (!scene.busy) { clearInterval(iv); if (scene.seen?.[`defeated:${m.name}.${def.id}`]) { const k = `master_${z}_wins`; if (!(scene.counters[k] > 0)) { scene.counters[k] = 1; scene._dirty = true; } } } }, 150);
        return r;
      }
      if (def.kind === 'trainer_hooded') {
        if (beaten && !scene.seen?.[`defeated:${m.name}.${def.id}`]) { // quiet after the Master: after line, no battle
          const e = scene._entryFor?.(m.name, def) || {};
          scene.log?.push({ tick: scene.tick, type: 'hall_quiet', npc: def.id });
          const r = scene.script(async () => { n && scene.npcs.beginTalk(n); try { await scene.say(e.after || e.pages || ['...'], scene.speakerFor?.(n)); } finally { n && scene.npcs.endTalk(n); } });
          seatBack(def); return r;
        }
        const r = talk(n, def); seatBack(def);
        const iv = setInterval(() => { if (!scene.busy) { clearInterval(iv); syncWins(); } }, 150); setTimeout(() => clearInterval(iv), 600000);
        return r;
      }
      return talk(n, def);
    };
  }
  return hv;
}
