// Hall solver (Coder, Oct 30 2026; tester report: the stored hall_v2.solution_moves had gone stale after map rework -
// Cindervale's "Up 2" hit a wall, Tidewater's path ended under a shut crystal). Pure: given a hall map json it finds a walk
// from the arrival tile that beats enough trainers for the Master (needWins, clamped to the beatable ones) and ends facing
// the Master (or, on a lower lighthouse floor, on the stairs 'G'). Model = puzzles.js HallV2 (slides, pushes, warps, plates,
// gates, prisms). Tokens: U/D/L/R = press that direction (moves, or only turns you when the next cell is solid / a trainer),
// A = the talk button (battle the trainer you face, or turn the prism you face). Beaten trainers keep their seat (stay solid).
import { HallV2 } from './puzzles.js';

const D = { U: [0, -1], D: [0, 1], L: [-1, 0], R: [1, 0] };
const trainersOf = (mj) => (mj.npcs || []).filter((n) => n.kind === 'trainer_hooded' && !n.hint_only);
// every placed NPC stands in the way (the hall guide too, not only trainers)
const blockers = (mj) => (mj.npcs || []).filter((n) => n.kind !== 'master').map((n) => [n.x, n.y]);
const SIGHT = 3; // config.js DEFAULT_SIGHT_RANGE with ALL_TRAINERS_ENGAGE: every hall trainer watches 3 tiles in its facing
const FD = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
/** overnight/sight.js: the first unbeaten trainer that sees (x,y) once you stop there (never on a warp pad), or null. */
// Trainers look around at random (npcs.js 'look'), so who spots you on the way is not fixed. A spot battle never moves
// you (the trainer walks up, battles, walks back), so paths plan every battle as face + talk and the walker's one rule is:
// skip a face + talk whose trainer already battled you (bumping a beaten one swaps places). SIGHT_PLAN stays off.
const SIGHT_PLAN = false;
const ARROW = { '^': 'U', v: 'D', '<': 'L', '>': 'R' };
/** A slide (ice / push tile) that ends against a trainer bumps it; a beaten one swaps places in the game. Paths avoid it. */
function slidesIntoTrainer(M, trs, r, d) {
  const c = M.at(r.x, r.y); if (c !== 'i' && !ARROW[c]) return false;
  const t = r.trail || [], a = t[t.length - 2], z = t[t.length - 1];
  const dir = ARROW[c] || (a && z ? (z[0] > a[0] ? 'R' : z[0] < a[0] ? 'L' : z[1] > a[1] ? 'D' : 'U') : d);
  const [dx, dy] = D[dir]; return trs.some((n) => n.x === r.x + dx && n.y === r.y + dy);
}
function spotter(M, trs, x, y, b, beaten) {
  if (!SIGHT_PLAN) return null;
  if (/[1-6]/.test(M.at(x, y) || '')) return null;
  for (const t of trs) {
    if (beaten.includes(t.id)) continue; const [dx, dy] = FD[t.facing || 'down'];
    for (let k = 1; k <= SIGHT; k++) {
      const cx = t.x + dx * k, cy = t.y + dy * k;
      if (cx === x && cy === y) return t;
      if (!M.open(cx, cy, b) || M.at(cx, cy) === 'L') break; // walls, shut gates and NPCs block the look
    }
  }
  return null;
}

/** BFS over (x,y,bits) from s; returns Map key -> {prev, tok, x, y, b}. Prism turns count as an action (dir + A). */
function bfs(M, s, stop = () => false, trs = []) {
  const key = (x, y, b) => `${x},${y},${b}`, seen = new Map([[key(s.x, s.y, s.b), { prev: null, toks: [], ...s }]]), q = [s];
  for (let i = 0; i < q.length; i++) {
    const { x, y, b } = q[i], here = key(x, y, b); if (i > 0 && stop(x, y, b)) continue; // a trainer saw you here: battle first
    for (const [d, [dx, dy]] of Object.entries(D)) {
      const nx = x + dx, ny = y + dy; let r, toks;
      if (M.open(nx, ny, b)) { r = M.enter(nx, ny, b, d); toks = [d]; if (slidesIntoTrainer(M, trs, r, d)) continue; }
      else if (M.pi.has(`${nx},${ny}`)) { r = { x, y, b: M.turn(nx, ny, b) }; toks = [d, 'A']; }
      else continue;
      const nk = key(r.x, r.y, r.b); if (seen.has(nk)) continue;
      seen.set(nk, { prev: here, toks, x: r.x, y: r.y, b: r.b }); q.push({ x: r.x, y: r.y, b: r.b });
    }
  }
  return seen;
}
const pathTo = (seen, k) => { const out = []; for (let n = seen.get(k); n && n.prev; n = seen.get(n.prev)) out.unshift(...n.toks); return out; };

/** Solve one hall floor. wins = trainers to beat here. -> {start, tokens, battles:[id..], end} | null */
export function solveHallFloor(mj, wins = null) {
  const h = mj.hall_v2, trs = trainersOf(mj), M = new HallV2(h.grid, blockers(mj), h.prism);
  const goalCells = [];
  h.grid.forEach((r, y) => [...r].forEach((c, x) => { if (c === 'G') goalCells.push([x, y]); }));
  const want = Math.min(wins ?? trs.length, trs.length);
  const at = (x, y) => trs.find((n) => n.x === x && n.y === y);
  // depth-first over battle order (greedy nearest first) so one-way ice never strands the walk
  const go = (s, beaten, toks, budget) => {
    const sp = spotter(M, trs, s.x, s.y, s.b, beaten); // stopped in sight: that trainer walks up and battles now
    if (sp) return go(s, [...beaten, sp.id], toks, budget);
    const seen = bfs(M, s, (x, y, b) => !!spotter(M, trs, x, y, b, beaten), trs);
    if (beaten.length >= want) {
      let best = null;
      for (const [k, n] of seen) if (goalCells.some(([gx, gy]) => gx === n.x && gy === n.y)) { const p = pathTo(seen, k); if (!best || p.length < best.p.length) best = { p, n }; }
      if (best) {
      const tail = h.dais_front ? [...best.p, 'U', 'A'] : best.p; // face the Master, talk
      return { tokens: [...toks, ...tail], battles: beaten, end: [best.n.x, best.n.y] };
      } // else: the way to the Master runs through a trainer's sight / past one: more battles first
    }
    const opts = [];
    for (const [k, n] of seen) { const t = spotter(M, trs, n.x, n.y, n.b, beaten); if (t) opts.push({ p: pathTo(seen, k), t, n, sight: true }); }
    for (const [k, n] of seen) if (!spotter(M, trs, n.x, n.y, n.b, beaten)) for (const [d, [dx, dy]] of Object.entries(D)) {
      const t = at(n.x + dx, n.y + dy); if (!t || beaten.includes(t.id)) continue;
      opts.push({ p: [...pathTo(seen, k), d, 'A'], t, n });
    }
    opts.sort((a, b) => a.p.length - b.p.length);
    const tried = new Set();
    for (const o of opts) {
      if (tried.has(o.t.id)) continue; tried.add(o.t.id); if (budget.n-- <= 0) return null;
      const r = o.sight ? go({ x: o.n.x, y: o.n.y, b: o.n.b }, beaten, [...toks, ...o.p], budget) : go({ x: o.n.x, y: o.n.y, b: o.n.b }, [...beaten, o.t.id], [...toks, ...o.p], budget);
      if (r) return r;
    }
    return null;
  };
  const r = go({ x: h.arrival[0], y: h.arrival[1], b: 0 }, [], [], { n: 5000 });
  return r && { start: [...h.arrival], ...r };
}

/** Replay tokens on the model; -> {x, y, b, facing, battles:[ids], ok} (ok = no step needed an illegal move). */
export function replayHall(mj, tokens) {
  const h = mj.hall_v2, trs = trainersOf(mj), M = new HallV2(h.grid, blockers(mj), h.prism);
  let [x, y] = h.arrival, b = 0, f = 'U', trades = 0; const battles = [];
  for (const t of tokens) {
    if (t === 'A') {
      const [dx, dy] = D[f], tr = trs.find((n) => n.x === x + dx && n.y === y + dy);
      if (tr) { if (!battles.includes(tr.id)) battles.push(tr.id); } else if (M.pi.has(`${x + dx},${y + dy}`)) b = M.turn(x + dx, y + dy, b);
      continue;
    }
    f = t; const nx = x + D[t][0], ny = y + D[t][1];
    if (trs.some((n) => n.x === nx && n.y === ny && battles.includes(n.id))) trades++; // the game would swap you past a beaten one
    if (M.open(nx, ny, b)) { const r = M.enter(nx, ny, b, t); if (slidesIntoTrainer(M, trs, r, t)) trades++; ({ x, y, b } = r); }
    const sp = spotter(M, trs, x, y, b, battles); if (sp) battles.push(sp.id);
  }
  return { x, y, b, facing: f, battles, trades };
}

/** Human form: "Up 3, Right 2, face Left + F (battle h3)". */
export function describeTokens(tokens, mj) {
  const N = { U: 'Up', D: 'Down', L: 'Left', R: 'Right' }, out = []; let i = 0;
  const trs = trainersOf(mj), rep = { x: mj.hall_v2.arrival[0], y: mj.hall_v2.arrival[1] };
  while (i < tokens.length) {
    const t = tokens[i];
    if (tokens[i + 1] === 'A') { out.push(`face ${N[t]} + F`); i += 2; continue; }
    let n = 1; while (tokens[i + n] === t && tokens[i + n + 1] !== 'A') n++;
    out.push(`${N[t]} ${n}`); i += n;
  }
  void trs; void rep; return out.join(', ');
}
