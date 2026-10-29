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
//    1.3^wins (wins = counter master_<zone>_wins, at least 1 once beaten), levels capped at KILUMEN_RULES.maxLevel (100).
//    A rematch win bumps the counter and pays a flat REMATCH_PRIZE (1200 gold, Gary Oct 29 2026; no difficulty / perk
//    multipliers, no coin), said in system_halls.rematch_won ({prize}, bare number). The first Master win keeps its normal prize + coin.
//  - Prism relay (Revival Heights, Gary Oct 29 2026; replaces its light gates): hall_v2.prism + grid 'E' emitter, 'P'
//    prisms (A turns one U->R->D->L), 'r' receiver, 'L' crystal door. The live beam is drawn over the floor every frame
//    (HallV2.beam = the same trace the solver uses); the door opens while the receiver is lit. Turns live in the state bits.
//  - Trainers walk back to their seat after a talk / battle so the walk the solver proved stays open.
import { HallV2, V2_PUSH } from './puzzles.js?v=v0.2.89-alpha';
import { TILE } from '../overworld/constants.js?v=v0.2.89-alpha';
import { KILUMEN_RULES } from '../battle/data/rules.js?v=v0.2.89-alpha';
import { applyHallAnim, hallAnimOn } from './hall_anim.js?v=v0.2.89-alpha';

export const REMATCH_FEE = 300, REMATCH_PRIZE = 1200, WIN_SCALE = 1.3;
const NAME = { U: 'up', D: 'down', L: 'left', R: 'right' }, LETTER = { up: 'U', down: 'D', left: 'L', right: 'R' };

/** Rematch team: every level x 1.3^wins, rounded, capped at maxLevel (never below 1). Pure; keeps the other fields. */
export function scaleMasterTeam(foes, wins, max = KILUMEN_RULES.maxLevel || 100) {
  const k = Math.pow(WIN_SCALE, Math.max(0, wins | 0));
  return (foes || []).map((f) => ({ ...f, level: Math.max(1, Math.min(max, Math.round((f.level || 1) * k))) }));
}
/** Real hall trainers only: hooded trainers that battle (an NPC marked hint_only, like a hint-giver, never counts). */
export const hallTrainers = (mj) => (mj?.npcs || []).filter((n) => n.kind === 'trainer_hooded' && !n.hint_only);
/** Puzzle done = the player has stood on the dais front (only reachable through the puzzle; tests prove it per hall). */
export const puzzleFlag = (mj) => `hall_${mj.hall_v2.zone}_puzzle_done`;
/** Can the Master be challenged? Needs the puzzle AND the wins (or an old save that already beat the Master). */
export function masterOpen(ctx, mj) {
  if (masterBeaten(ctx, mj)) return { ok: true };
  const wins = hallWins(ctx.seen, mj), need = needWins(mj), puzzle = !!ctx.flags?.has?.(puzzleFlag(mj));
  return { ok: puzzle && wins >= need, puzzle, wins, need, left: Math.max(0, need - wins) };
}
/** Beaten trainers of a v2 hall map (defeated: records). */
/** Multi-floor halls (Lanternport lighthouse, Gary Oct 29 2026): hall_v2.members = every floor's trainers as '<map>.<id>', so
 *  wins count across the floors; hall_v2.master_ref = '<map>.<id>' of the Master on the lamp-room floor. */
export const hallMembers = (mj) => mj?.hall_v2?.members || hallTrainers(mj).map((n) => `${mj.name}.${n.id}`);
export const hallWins = (seen, mj) => hallMembers(mj).filter((k) => seen?.[`defeated:${k}`]).length;
export const needWins = (mj) => mj?.hall_v2?.need_wins ?? Math.min(4, hallMembers(mj).length);
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
  const ctx = () => ({ flags: scene.flags, seen: scene.seen, store, counters: scene.counters });
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
        m.setTile('ground', x, y, pair[open ? 1 : 0]);
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
    c.bits = b; (store.puzzles ||= {})[bitsKey(c.json)] = { bits: b }; hv.apply();
    scene.audio?.sfx?.('select'); scene.log?.push({ tick: scene.tick, type: 'hall_bits', bits: b });
  };
  const startChain = () => { const c = hv.cur; if (c && !c.release) { c.release = scene.lockSave ? scene.lockSave('hall_slide') : () => {}; scene.player.locked = true; } };
  const endChain = () => { const c = hv.cur; if (c?.release) { const r = c.release; c.release = null; scene.player.locked = !!(scene.busy || scene.fade); r(); } };
  hv.chaining = () => !!hv.cur?.release;
  scene.hallQuiet = (n) => !!hv.cur && (hv.chaining() || hv.quiet(n?.def || n));

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
      const oa = w.onArrive, os = w.onStepStart;
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
  if (typeof scene.interact === 'function') {
    const interact = scene.interact.bind(scene);
    scene.interact = (...a) => {
      const p = scene.player, c = hv.cur;
      if (!scene.busy && c?.model.prism && p) {
        const d = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[p.facing] || [0, 0];
        if (hv.turnPrism(p.x + d[0], p.y + d[1])) return;
      }
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
    return hv.cur;
  };
  if (typeof scene._enterMap === 'function') {
    const enter = scene._enterMap.bind(scene);
    scene._enterMap = async (...a) => { const r = await enter(...a); try { hv.enter(); } catch (e) { console.error('hall v2:', e); } return r; };
  }
  try { hv.enter(); } catch (e) { console.error('hall v2:', e); }

  // ---- talk: attendant, wins gate, quiet after the Master, rematch, walk back to the seat ------------------------------
  const seatBack = (def) => {
    const n = scene.npcs?.byId?.(def.id); if (!n || (n.x === def.x && n.y === def.y)) return;
    const go = () => { if (scene.busy || scene.map?.json !== hv.cur?.json) return false; scene.npcs.walkTo(def.id, def.x, def.y, { stay: true }); n.faceDir = def.facing; return true; };
    const iv = setInterval(() => { if (go()) clearInterval(iv); }, 120); setTimeout(() => clearInterval(iv), 20000);
  };
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
      const z = m.hall_v2.zone, wins = syncWins(), need = needWins(m), beaten = masterBeaten(ctx(), m);
      if (def.kind === 'villager_scholar') { // the hall attendant: progress line
        const left = Math.max(0, need - wins), k = beaten || left === 0 ? 'progress_open' : 'progress';
        return scene.script(async () => { n && scene.npcs.beginTalk(n); try { await scene.say(fillv(text(k, ['Hall wins: {wins} of {need}.']), { wins, need, left }), scene.speakerFor?.(n)); } finally { n && scene.npcs.endTalk(n); } });
      }
      if (def.kind === 'master') {
        if (beaten) {
          return scene.script(async () => { n && scene.npcs.beginTalk(n); try { await hv.rematch(n, def, m); } finally { n && scene.npcs.endTalk(n); } });
        }
        const g = masterOpen(ctx(), m);
        if (!g.ok) {
          scene.log?.push({ tick: scene.tick, type: 'hall_wins_gate', zone: z, wins, need, puzzle: g.puzzle });
          const pages = !g.puzzle ? text('master_puzzle', ['Find your way up here properly first.']) : fillv(text('master_locked', ['Win {left} more in my hall first. Then we battle.']), { wins, need, left: Math.max(0, need - wins) });
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
