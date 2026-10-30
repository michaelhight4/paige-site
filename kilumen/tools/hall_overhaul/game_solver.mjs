// Hall walk planner on the real game code (Coder, Oct 30 2026). Closed loop: plan a short walk on the hall model
// (puzzles.js HallV2: slides, pushes, warps, plates, gates) with every NPC where the GAME has it right now, press ONE key in
// the headless game (game_sim.mjs: real movement, sight spotting + walk-up, seat-back), look where you really are, plan
// again. Goals in order: battle a trainer (walk into its sight, or face it + F) until the Master's wins are met, then step
// on the dais front, face the Master and press F (or, on a lighthouse floor below the top, step onto the stairs 'G').
import { createHallSim, walkHall } from './game_sim.mjs';
import { HallV2 } from '../../src/progression/puzzles.js';
const D = { U: [0, -1], D: [0, 1], L: [-1, 0], R: [1, 0] };
const isTrainer = (n) => n.kind === 'trainer_hooded' && !n.hint_only;

function bfs(M, s) {
  const key = (x, y, b) => `${x},${y},${b}`, seen = new Map([[key(s.x, s.y, s.b), { prev: null, toks: [], ...s }]]), q = [s];
  for (let i = 0; i < q.length; i++) {
    const { x, y, b } = q[i], here = key(x, y, b);
    for (const [d, [dx, dy]] of Object.entries(D)) {
      const nx = x + dx, ny = y + dy; let r, toks;
      if (M.open(nx, ny, b)) { r = M.enter(nx, ny, b, d); toks = [d]; }
      else if (M.pi.has(`${nx},${ny}`)) { r = { x, y, b: M.turn(nx, ny, b) }; toks = [d, 'A']; }
      else continue;
      const nk = key(r.x, r.y, r.b); if (seen.has(nk)) continue;
      seen.set(nk, { prev: here, toks, x: r.x, y: r.y, b: r.b }); q.push({ x: r.x, y: r.y, b: r.b });
    }
  }
  return seen;
}
const pathTo = (seen, k) => { const out = []; for (let n = seen.get(k); n && n.prev; n = seen.get(n.prev)) out.unshift(...n.toks); return out; };

/** Plan + walk one floor. wins = battles wanted on this floor; top = Master floor. -> {tokens, battles, end, ok, sim} */
export async function solveFloorLive(mapName, { wins, seen = {}, flags = [], maxTokens = 900, skip = new Set() } = {}) {
  const sim = await createHallSim(mapName, { seen, flags }), s = sim.scene, j = sim.json, h = j.hall_v2;
  const master = j.npcs.find((n) => n.kind === 'master'), trs = j.npcs.filter(isTrainer);
  const goals = []; h.grid.forEach((r, y) => [...r].forEach((c, x) => { if (c === 'G') goals.push([x, y]); }));
  const toks = [], beaten = () => trs.filter((t) => s.seen[`defeated:${j.name}.${t.id}`]).map((t) => t.id);
  let warped = false; s.startWarp = () => { warped = true; s.log.push({ type: 'warpStart' }); };
  const masterDone = () => master && s.seen[`defeated:${j.name}.${master.id}`];
  for (let guard = 0; guard < maxTokens; guard++) {
    const p = s.player, onStairs = goals.some(([gx, gy]) => gx === p.x && gy === p.y);
    if (masterDone() || (!master && (warped || onStairs) && beaten().length >= wins)) { warped = true; break; }
    const b = sim.hv.cur?.bits ?? 0;
    // Beaten trainers step aside (trade places) when you walk or slide into them, so they are not walls in the plan.
    const npcs = s.npcs.list.filter((n) => !(master && n.id === master.id) && !s.seen[`defeated:${j.name}.${n.id}`]);
    const M = new HallV2(h.grid, [...npcs.map((n) => [n.x, n.y]), ...(master ? [[master.x, master.y]] : [])], h.prism);
    const seenM = bfs(M, { x: p.x, y: p.y, b });
    const opts = [], done = beaten();
        if (done.length >= wins) {
      if (h.dais_front && master) {
        const [fx, fy] = h.dais_front, d = Object.entries(D).find(([, [dx, dy]]) => fx + dx === master.x && fy + dy === master.y)?.[0] || 'U';
        for (const [k, n] of seenM) if (n.x === fx && n.y === fy) opts.push([...pathTo(seenM, k), d, 'A']);
      } else for (const [k, n] of seenM) if (goals.some(([gx, gy]) => gx === n.x && gy === n.y)) opts.push(pathTo(seenM, k));
      if (!master && !opts.length) { // stairs cell 'G' is a door: the model's enter() never stands there; walk onto it
        for (const [k, n] of seenM) for (const [d, [dx, dy]] of Object.entries(D)) if (goals.some(([gx, gy]) => gx === n.x + dx && gy === n.y + dy)) opts.push([...pathTo(seenM, k), d]);
      }
    }
    if (done.length < wins || !opts.length) {
      for (const t of trs) {
        if (done.includes(t.id) || skip.has(t.id)) continue;
        const n = s.npcs.byId(t.id); if (!n) continue;
        for (const [k, c] of seenM) {
          for (const [d, [dx, dy]] of Object.entries(D)) if (c.x + dx === n.x && c.y + dy === n.y) opts.push([...pathTo(seenM, k), d, 'A']);
          if ((t.sight_cells || []).some(([sx, sy]) => sx === c.x && sy === c.y) && k !== `${p.x},${p.y},${b}`) opts.push(pathTo(seenM, k));
        }
      }
    }
    if (!opts.length) return { ok: false, why: `stuck at ${p.x},${p.y} bits ${b}, wins ${done.length}/${wins}`, tokens: toks, battles: s.battles.slice(), sim };
    opts.sort((a, c) => a.length - c.length);
    // A plan that is just "face it + F" goes in whole (pressing the face key again would only bump); else one key, then replan.
    const best = opts[0], run = best[1] === 'A' ? best.slice(0, 2) : best.slice(0, 1);
    if (process.env.HALL_DEBUG) console.log(p.x, p.y, b, p.facing, done.length, best.join(''));
    for (const t of run) { toks.push(t); await sim.press(t); }
  }
  const st = sim.state();
  const ok = master ? !!masterDone() && beaten().length >= wins : warped;
  return { ok, why: ok ? '' : 'token budget', tokens: toks, battles: s.battles.slice(), end: [st.x, st.y], sim, seen: s.seen, flags: [...s.flags] };
}

/** Whole hall (floors in order). wins spread like the old solver: as many as each floor has until need is met. */
export async function solveRouteLive(maps, loadJson) {
  const js = maps.map(loadJson), top = js.at(-1);
  let left = Math.min(top.hall_v2.need_wins ?? 4, js.reduce((n, m) => n + m.npcs.filter(isTrainer).length, 0));
  let seen = {}, flags = []; const out = [];
  for (const [i, m] of js.entries()) {
    const w = Math.min(left, m.npcs.filter(isTrainer).length);
    const r = await solveFloorLive(maps[i], { wins: w, seen, flags });
    const hallBattles = r.battles.filter((id) => m.npcs.some((n) => n.id === id && isTrainer(n)));
    left -= hallBattles.length; seen = { ...r.sim.scene.seen }; flags = [...r.sim.scene.flags];
    out.push({ map: maps[i], mj: m, need: w, r });
  }
  return out;
}
export { walkHall };
