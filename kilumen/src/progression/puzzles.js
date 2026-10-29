// Hall puzzle runtimes for halls 2-8 (overnight pass, Oct 23, 2026). DRAFT: the hall maps do not exist yet, so each
// puzzle is a small grid in data/hall_puzzles/<zone>.json built from Game dev's outline (design/overnight_gd/halls/*.json).
// Same contract as the Fernwick runtime (src/systems/puzzles.js): pure state, saved as JSON, `solved` never resets, and
// solved_flag is set once. Every layout is proven solvable by solve() (BFS) in tests/progression.test.mjs.
//
// Shared grid legend: '#' wall, '.' floor, 'S' start, 'G' goal (the Master's ring), 'R' reset tile (puts the puzzle
// state back to the start; position kept). Actions: U/D/L/R step, A<dir> = face that way + A (touch a switch).
// Kind-specific cells are documented on each kind below.

const DIRS = { U: [0, -1], D: [0, 1], L: [-1, 0], R: [1, 0] };
const OPP = { U: 'D', D: 'U', L: 'R', R: 'L' };
export const ACTIONS = ['U', 'D', 'L', 'R', 'AU', 'AD', 'AL', 'AR'];

export class Grid {
  constructor(rows) { this.rows = rows; this.h = rows.length; this.w = Math.max(...rows.map((r) => r.length)); }
  at(x, y) { return x < 0 || y < 0 || y >= this.h || x >= this.w ? '#' : this.rows[y][x] || '#'; }
  find(ch) { const out = []; for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) if (this.at(x, y) === ch) out.push([x, y]); return out; }
}
const k2 = (x, y) => `${x},${y}`;

// ---- kinds --------------------------------------------------------------------------------------------------------
// Each kind: init(def,g) -> st ; walk(def,g,st,x,y) -> bool ; touch(def,g,st,x,y) -> st|null ;
// after(def,g,st,x,y,dir) -> {st,x,y} (after a step: slides, timers) ; view(def,g,st,x,y) -> {c: css colour, t: label}
export const KINDS = {
  // Saltmere "Salt-pan sluices": pans 'a'..'e' (walkable only when the pan is at the top height, def.top), wheels 'W'
  // + digit index in def.wheels [{at:[x,y], raise:'a', lower:'b'}]. A wheel raises one pan by 1 and lowers its neighbour by 1.
  sluice: {
    init: (d) => ({ h: { ...d.heights } }),
    walk: (d, g, st, x, y) => { const c = g.at(x, y); return /[a-e]/.test(c) ? st.h[c] >= d.top : c !== 'W'; },
    touch: (d, g, st, x, y) => {
      const w = d.wheels.find((w) => w.at[0] === x && w.at[1] === y); if (!w) return null;
      const h = { ...st.h }; h[w.raise] = Math.min(d.top, h[w.raise] + 1); if (w.lower) h[w.lower] = Math.max(0, h[w.lower] - 1);
      return { h };
    },
    view: (d, g, st, x, y) => { const c = g.at(x, y); return /[a-e]/.test(c) ? { c: ['#2d5f8a', '#5f93b8', '#e8e0c8'][st.h[c]] || '#e8e0c8', t: String(st.h[c]) } : c === 'W' ? { c: '#8a5a2b', t: '⚙' } : null; },
  },
  // Revival "Prism relay": beam sources 'E' (def.sources [{at, dir}]), prisms 'P' (solid; A turns the facing U->R->D->L;
  // the beam leaves a prism in its facing), receivers 'r' (def.receivers [{at, door}]), doors 'D' (def.doors {id:[[x,y]..]})
  // open when every receiver for that door is lit. The beam passes floor and receivers and stops at walls / closed doors.
  prism: {
    init: (d) => ({ f: d.prisms.map((p) => p.facing) }),
    lit(d, g, st) {
      const lit = new Set();
      for (const s of d.sources) {
        let [x, y] = s.at, dir = s.dir; const seen = new Set();
        for (let n = 0; n < 400; n++) {
          const key = `${x},${y},${dir}`; if (seen.has(key)) break; seen.add(key);
          x += DIRS[dir][0]; y += DIRS[dir][1];
          const c = g.at(x, y);
          if (c === '#' || c === 'E' || (c === 'D' && !KINDS.prism.doorOpen(d, g, st, x, y, lit))) break;
          if (c === 'r') lit.add(k2(x, y));
          if (c === 'P') dir = 'URDL'[st.f[d.prisms.findIndex((p) => p.at[0] === x && p.at[1] === y)]];
        }
      }
      return lit;
    },
    doorOpen(d, g, st, x, y, lit) {
      const id = Object.keys(d.doors).find((k) => d.doors[k].some(([a, b]) => a === x && b === y));
      const rs = d.receivers.filter((r) => r.door === id); lit ||= KINDS.prism.lit(d, g, st);
      return rs.length > 0 && rs.every((r) => lit.has(k2(...r.at)));
    },
    walk(d, g, st, x, y) { const c = g.at(x, y); return c === 'D' ? KINDS.prism.doorOpen(d, g, st, x, y) : !'PEr'.includes(c); },
    touch: (d, g, st, x, y) => { const i = d.prisms.findIndex((p) => p.at[0] === x && p.at[1] === y); if (i < 0) return null; const f = st.f.slice(); f[i] = (f[i] + 1) % 4; return { f }; },
    view(d, g, st, x, y) {
      const c = g.at(x, y), lit = KINDS.prism.lit(d, g, st);
      if (c === 'P') return { c: '#b9a6e8', t: '↑→↓←'[st.f[d.prisms.findIndex((p) => p.at[0] === x && p.at[1] === y)]] };
      if (c === 'E') return { c: '#8f5fd6', t: '✦' };
      if (c === 'r') return { c: lit.has(k2(x, y)) ? '#ffe36b' : '#6b5a8a', t: '◆' };
      if (c === 'D') return { c: KINDS.prism.doorOpen(d, g, st, x, y, lit) ? '#cfc6b0' : '#4a3a6a', t: '' };
      return null;
    },
  },
  // Frostspire "Gust lanes": vents '^>v<' blow while the bells are in state 0, vents 'nesw' (n = up) in state 1. Stepping
  // onto a blowing vent slides you until a wall or a windbreak 'X' (vents met on the way take over). Bell ropes 'B' (solid,
  // A) flip the state. Feathers on the floor would show the wind (view only).
  gust: {
    init: () => ({ b: 0 }),
    walk: (d, g, st, x, y) => g.at(x, y) !== 'B',
    touch: (d, g, st, x, y) => (g.at(x, y) === 'B' ? { b: 1 - st.b } : null),
    vent(c, b) { const i = (b ? 'nesw' : '^>v<').indexOf(c); return i < 0 ? null : 'URDL'[i]; },
    after(d, g, st, x, y) {
      let dir = KINDS.gust.vent(g.at(x, y), st.b);
      for (let n = 0; dir && n < 200; n++) {
        const nx = x + DIRS[dir][0], ny = y + DIRS[dir][1], c = g.at(nx, ny);
        if (c === '#' || c === 'B') break;
        x = nx; y = ny;
        if (c === 'X') break;
        dir = KINDS.gust.vent(c, st.b) || dir;
      }
      return { st, x, y };
    },
    view(d, g, st, x, y) {
      const c = g.at(x, y), v = KINDS.gust.vent(c, st.b);
      if (c === 'B') return { c: '#c9a24a', t: st.b ? '🔔' : '♪' };
      if (c === 'X') return { c: '#c0504d', t: '▮' };
      if ('^>v<nesw'.includes(c)) return { c: v ? '#a8d8ea' : '#dfe8ec', t: v ? '↑→↓←'['URDL'.indexOf(v)] : '·' };
      return null;
    },
  },
  // Mirefen "Bog-light boardwalk": water '~' (no), planks '=', hidden planks 'h' (walkable once every lamp is lit in the
  // frogs' order def.order, e.g. ['1','3','2']), lamps '1'..'4' (solid, A; a wrong lamp puts them all out), sinking planks
  // 's': up for 2 steps, down for 2 (global step count); standing on one when it sinks drops you back to 'S'.
  boardwalk: {
    init: () => ({ p: 0, t: 0 }),
    up: (st) => st.t % 4 < 2,
    walk(d, g, st, x, y) {
      const c = g.at(x, y);
      if (c === '~' || /[1-4]/.test(c)) return false;
      if (c === 'h') return st.p >= d.order.length;
      if (c === 's') return KINDS.boardwalk.up({ t: st.t + 1 });
      return true;
    },
    touch(d, g, st, x, y) {
      const c = g.at(x, y); if (!/[1-4]/.test(c)) return null;
      if (st.p >= d.order.length) return st;
      return { ...st, p: d.order[st.p] === c ? st.p + 1 : 0 };
    },
    after(d, g, st, x, y) {
      st = { ...st, t: (st.t + 1) % 4 };
      if (g.at(x, y) === 's' && !KINDS.boardwalk.up(st)) { const [sx, sy] = g.find('S')[0]; return { st, x: sx, y: sy, dropped: true }; }
      return { st, x, y };
    },
    view(d, g, st, x, y) {
      const c = g.at(x, y);
      if (c === '~') return { c: '#2f4a3a', t: '' };
      if (c === 'h') return st.p >= d.order.length ? { c: '#9b7a4a', t: '' } : { c: '#33503f', t: '' };
      if (c === 's') return { c: KINDS.boardwalk.up(st) ? '#8a6a3e' : '#3c5a48', t: KINDS.boardwalk.up(st) ? '' : '~' };
      if (c === '=') return { c: '#9b7a4a', t: '' };
      if (/[1-4]/.test(c)) { const on = d.order.slice(0, st.p).includes(c); return { c: on ? '#ffd56b' : '#5a5a3a', t: c }; }
      return null;
    },
  },
  // Tidewater "Tide clock": the tide runs on a step counter (def.low steps low, then def.high steps high). Tidal floor
  // '_' is walkable at low tide only (caught on it at high: swept back to 'S'); glide lanes '~' only at high tide (Tideglide).
  // Shell switches 'H' / 'O' (solid, A) stop the clock at high / low; touching the same shell again restarts it.
  tide: {
    init: () => ({ t: 0, stop: null }),
    high: (d, st) => (st.stop ? st.stop === 'H' : st.t % (d.low + d.high) >= d.low),
    walk(d, g, st, x, y) {
      const c = g.at(x, y); if (c === 'H' || c === 'O') return false;
      const nxt = st.stop ? st : { ...st, t: st.t + 1 };
      if (c === '_') return !KINDS.tide.high(d, nxt);
      if (c === '~') return KINDS.tide.high(d, nxt);
      return true;
    },
    touch(d, g, st, x, y) { const c = g.at(x, y); if (c !== 'H' && c !== 'O') return null; return { ...st, stop: st.stop === c ? null : c }; },
    after(d, g, st, x, y) {
      if (!st.stop) st = { ...st, t: (st.t + 1) % (d.low + d.high) };
      const hi = KINDS.tide.high(d, st), c = g.at(x, y);
      if (c === '_' && hi) { const [sx, sy] = g.find('S')[0]; return { st, x: sx, y: sy, dropped: true }; }
      return { st, x, y };
    },
    view(d, g, st, x, y) {
      const c = g.at(x, y), hi = KINDS.tide.high(d, st);
      if (c === '_') return { c: hi ? '#2b5d7d' : '#d9c79a', t: '' };
      if (c === '~') return { c: hi ? '#4f9cc9' : '#7d6f55', t: hi ? '≈' : '' };
      if (c === 'H' || c === 'O') return { c: st.stop === c ? '#ffb38a' : '#e9d6c9', t: c === 'H' ? '▲' : '▼' };
      return null;
    },
  },
  // Lanternport "Lens signal": coloured lamp posts 'r','g','b','y' (solid, A) in rooms def.rooms [{rows:[y0,y1], code:'rgby', door:'1'}];
  // lighting a room's lamps in its code order opens that room's stair door (digit cell '1'..'3'). Wrong lamp: all out, no penalty.
  lens: {
    init: (d) => ({ p: d.rooms.map(() => 0) }),
    room: (d, y) => d.rooms.findIndex((r) => y >= r.rows[0] && y <= r.rows[1]),
    walk(d, g, st, x, y) {
      const c = g.at(x, y); if ('rgby'.includes(c)) return false;
      if (/[1-9]/.test(c)) { const i = d.rooms.findIndex((r) => r.door === c); return i >= 0 && st.p[i] >= d.rooms[i].code.length; }
      return true;
    },
    touch(d, g, st, x, y) {
      const c = g.at(x, y); if (!'rgby'.includes(c)) return null;
      const i = KINDS.lens.room(d, y); if (i < 0) return null;
      const p = st.p.slice(), code = d.rooms[i].code; if (p[i] >= code.length) return st;
      p[i] = code[p[i]] === c ? p[i] + 1 : 0; return { p };
    },
    view(d, g, st, x, y) {
      const c = g.at(x, y), col = { r: '#d9534f', g: '#5cb85c', b: '#4a7fd6', y: '#f0c419' };
      if (col[c]) { const i = KINDS.lens.room(d, y), lit = i >= 0 && d.rooms[i].code.slice(0, st.p[i]).includes(c); return { c: lit ? col[c] : '#555', t: '●' }; }
      if (/[1-9]/.test(c)) { const i = d.rooms.findIndex((r) => r.door === c); return { c: st.p[i] >= d.rooms[i].code.length ? '#cfc6b0' : '#4a3a2a', t: '≡' }; }
      return null;
    },
  },
  // Cindervale "Quench channels": lava 'L' (no) until cooled for good; taps 'T' (solid, A; each tap fills the bucket to
  // def.bucket pours once); A on lava pours one (cools it). Bellows 'B' (walkable): stepping on one re-melts cooled tiles
  // next to it (8 neighbours). Reset lever 'R'.
  quench: {
    init: () => ({ b: 0, cool: [], used: [] }),
    walk: (d, g, st, x, y) => { const c = g.at(x, y); return c === 'L' ? st.cool.includes(k2(x, y)) : c !== 'T'; },
    touch(d, g, st, x, y) {
      const c = g.at(x, y), k = k2(x, y);
      if (c === 'T') return st.used.includes(k) ? null : { ...st, b: d.bucket, used: [...st.used, k].sort() };
      if (c === 'L' && !st.cool.includes(k) && st.b > 0) return { ...st, b: st.b - 1, cool: [...st.cool, k].sort() };
      return null;
    },
    after(d, g, st, x, y) {
      if (g.at(x, y) !== 'B') return { st, x, y };
      const near = (k) => { const [a, b] = k.split(',').map(Number); return Math.abs(a - x) <= 1 && Math.abs(b - y) <= 1; };
      return { st: { ...st, cool: st.cool.filter((k) => !near(k)) }, x, y };
    },
    view(d, g, st, x, y) {
      const c = g.at(x, y);
      if (c === 'L') return st.cool.includes(k2(x, y)) ? { c: '#6d6158', t: '' } : { c: '#e2572b', t: '' };
      if (c === 'T') return { c: st.used.includes(k2(x, y)) ? '#5f7a8a' : '#6fc3e8', t: '⛲' };
      if (c === 'B') return { c: '#a8432a', t: '≋' };
      return null;
    },
  },
};

// ---- generic runtime ----------------------------------------------------------------------------------------------
export class HallPuzzle {
  constructor(def, saved = null) {
    this.def = def; this.kind = KINDS[def.kind]; if (!this.kind) throw new Error('unknown hall puzzle kind ' + def.kind);
    this.g = new Grid(def.grid);
    const [sx, sy] = this.g.find('S')[0];
    this.start = { x: sx, y: sy };
    this.st = saved?.st ? structuredClone(saved.st) : this.kind.init(def, this.g);
    this.x = saved?.x ?? sx; this.y = saved?.y ?? sy;
    this.solved = !!saved?.solved;
  }
  get state() { return { x: this.x, y: this.y, st: this.st }; }
  /** One action (U/D/L/R or A<dir>). -> {ok, solvedNow, dropped} */
  act(a) {
    const r = step(this.def, this.g, this.kind, this.state, a);
    if (!r) return { ok: false, solvedNow: false };
    this.x = r.x; this.y = r.y; this.st = r.st;
    const solvedNow = !this.solved && this.g.at(this.x, this.y) === 'G';
    if (solvedNow) this.solved = true;
    return { ok: true, solvedNow, dropped: !!r.dropped };
  }
  view(x, y) {
    const c = this.g.at(x, y);
    return this.kind.view(this.def, this.g, this.st, x, y) || ({ '#': { c: '#2a2630', t: '' }, G: { c: '#ffd34a', t: '★' }, S: { c: '#b8b0a0', t: '' }, R: { c: '#9a8fd0', t: '↺' } }[c]) || { c: '#cfc6b0', t: '' };
  }
  toJSON() { return { x: this.x, y: this.y, st: this.st, solved: this.solved }; }
}

/** Pure transition. -> {x, y, st, dropped?} | null (blocked / nothing to touch). */
export function step(def, g, kind, s, a) {
  if (a[0] === 'A') {
    const [dx, dy] = DIRS[a[1]]; const st = kind.touch(def, g, s.st, s.x + dx, s.y + dy);
    return st ? { x: s.x, y: s.y, st } : null;
  }
  const [dx, dy] = DIRS[a]; const nx = s.x + dx, ny = s.y + dy;
  if (g.at(nx, ny) === '#' || !kind.walk(def, g, s.st, nx, ny)) return null;
  let r = kind.after ? kind.after(def, g, s.st, nx, ny, a) : { st: s.st, x: nx, y: ny };
  if (g.at(r.x, r.y) === 'R') r = { ...r, st: kind.init(def, g) };
  return r;
}

/** BFS: shortest action list from the start to 'G', or null. opts.max caps explored states. */
export function solve(def, opts = {}) {
  const kind = KINDS[def.kind], g = new Grid(def.grid), [sx, sy] = g.find('S')[0];
  const s0 = { x: sx, y: sy, st: kind.init(def, g) }, key = (s) => JSON.stringify(s);
  const prev = new Map([[key(s0), null]]), q = [s0], max = opts.max || 400000;
  for (let i = 0; i < q.length && prev.size < max; i++) {
    const s = q[i];
    if (g.at(s.x, s.y) === 'G') {
      const path = []; let k = key(s);
      while (prev.get(k)) { const [pk, a] = prev.get(k); path.unshift(a); k = pk; }
      return { path, explored: prev.size };
    }
    for (const a of ACTIONS) {
      const n = step(def, g, kind, s, a); if (!n) continue;
      const nk = key({ x: n.x, y: n.y, st: n.st }); if (prev.has(nk)) continue;
      prev.set(nk, [key(s), a]); q.push({ x: n.x, y: n.y, st: n.st });
    }
  }
  return null;
}
/** Is the goal reachable WITHOUT using the puzzle (no touches, start state frozen)? Must be false for a real puzzle. */
export function trivial(def) {
  const kind = KINDS[def.kind], g = new Grid(def.grid), [sx, sy] = g.find('S')[0];
  const st = kind.init(def, g), seen = new Set([k2(sx, sy)]), q = [[sx, sy]];
  for (let i = 0; i < q.length; i++) {
    const [x, y] = q[i]; if (g.at(x, y) === 'G') return true;
    for (const [dx, dy] of Object.values(DIRS)) {
      const nx = x + dx, ny = y + dy; if (seen.has(k2(nx, ny)) || g.at(nx, ny) === '#' || !kind.walk(def, g, st, nx, ny)) continue;
      if ('^>v<nesw_~shB'.includes(g.at(nx, ny)) && def.kind !== 'sluice') continue; // conservative: no moving parts
      seen.add(k2(nx, ny)); q.push([nx, ny]);
    }
  }
  return false;
}
export { OPP };

// ---- hall overhaul v2 (Phase 2, Oct 29 2026): the built Master's halls (maps/<hall>_hall_int.json hall_v2.grid) ---------
// Same legend as tools/hall_overhaul/plan.py (the Phase 1 planner Gary approved): '#' wall, 'x' invisible wall, 'M' Master,
// 'S' door, 'G' dais front, 'i' slide floor (slide on until blocked), '^v<>' push tiles (carry you one way until blocked),
// 'T'/'U' plates (flip bit 0 / bit 1 when you land), 'a'/'b' gates open while bit0 is 0/1, 'c'/'d' gates open while bit1
// is 0/1, '1'-'6' warp pad pairs (land -> teleport to the partner pad and stop). Trainers are solid. Reuses Grid + DIRS.
// The runtime (./hall_v2.js) drives the real player through these same rules; the solver proves every hall here.
export const V2_PUSH = { '^': 'U', v: 'D', '<': 'L', '>': 'R' };
const V2_SOLID = new Set(['#', 'x', 'M']);
export class HallV2 {
  constructor(rows, trainers = []) { this.g = new Grid(rows); this.tr = new Set(trainers.map(([x, y]) => k2(x, y))); }
  at(x, y) { return this.g.at(x, y); }
  /** Can you stand on (x,y) with gate bits b? */
  open(x, y, b) {
    const c = this.at(x, y);
    if (V2_SOLID.has(c) || this.tr.has(k2(x, y))) return false;
    if (c === 'a') return (b & 1) === 0; if (c === 'b') return (b & 1) === 1;
    if (c === 'c') return (b & 2) === 0; if (c === 'd') return (b & 2) === 2;
    return true;
  }
  /** One forced-move link: land on (x,y) moving d with bits b -> {b, next:{x,y,d}|null, warp:[x,y]|null} (plates already applied). */
  land(x, y, b, d) {
    const c = this.at(x, y);
    if (c === 'T') b ^= 1; if (c === 'U') b ^= 2;
    if (/[1-6]/.test(c)) { const o = this.g.find(c).find(([px, py]) => px !== x || py !== y); return { b, next: null, warp: o || null }; }
    const nd = V2_PUSH[c] || (c === 'i' ? d : null);
    if (!nd) return { b, next: null, warp: null };
    const nx = x + DIRS[nd][0], ny = y + DIRS[nd][1];
    return { b, next: this.open(nx, ny, b) ? { x: nx, y: ny, d: nd } : null, warp: null };
  }
  /** Resolve a whole move (slides, pushes, warps) -> {x, y, b, trail}. */
  enter(x, y, b, d) {
    const trail = [];
    for (let n = 0; n < 400; n++) {
      trail.push([x, y]); const r = this.land(x, y, b, d); b = r.b;
      if (r.warp) { trail.push(r.warp); return { x: r.warp[0], y: r.warp[1], b, trail }; }
      if (!r.next) return { x, y, b, trail };
      ({ x, y, d } = r.next);
    }
    return { x, y, b, trail };
  }
  *moves([x, y, b]) {
    for (const d of 'UDLR') { const nx = x + DIRS[d][0], ny = y + DIRS[d][1]; if (this.open(nx, ny, b)) { const r = this.enter(nx, ny, b, d); yield [d, [r.x, r.y, r.b], r.trail]; } }
  }
  /** BFS door -> dais front. -> {moves, states, softlocks} | null. Softlock = a reachable state that can not reach both the
   *  dais front and the door again. */
  check() {
    const [S] = this.g.find('S'), [G] = this.g.find('G'), key = (s) => s.join(',');
    const s0 = [S[0], S[1], 0], prev = new Map([[key(s0), null]]), q = [s0], rev = new Map();
    for (let i = 0; i < q.length; i++) for (const [d, v] of this.moves(q[i])) {
      const vk = key(v); (rev.get(vk) || rev.set(vk, []).get(vk)).push(key(q[i]));
      if (!prev.has(vk)) { prev.set(vk, [key(q[i]), d]); q.push(v); }
    }
    const goals = q.filter((s) => s[0] === G[0] && s[1] === G[1]).map(key); if (!goals.length) return null;
    const back = (t) => { const seen = new Set(t), st = [...t]; while (st.length) for (const u of rev.get(st.pop()) || []) if (!seen.has(u)) { seen.add(u); st.push(u); } return seen; };
    const tg = back(goals), td = back(q.filter((s) => s[0] === S[0] && s[1] === S[1]).map(key));
    const path = []; let k = goals[0]; while (prev.get(k)) { const [pk, d] = prev.get(k); path.unshift(d); k = pk; }
    return { moves: path.join(''), states: q.length, softlocks: q.map(key).filter((s) => !tg.has(s) || !td.has(s)).length };
  }
  /** Battle-aware BFS (port of tools/hall_overhaul/battles.py): state (x, y, bits, beaten mask). Coming to rest inside an
   *  unbeaten trainer's sight forces that battle (first in list order, like findSpotter). -> the walk door -> dais front with
   *  at least `need` and at most `cap` battles: {moves, battles, beaten (1-based)} | null. rays: [[[x,y],..], ..]. */
  battles(rays, need, cap) {
    const [S] = this.g.find('S'), [G] = this.g.find('G'), R = rays.map((r) => new Set(r.map(([x, y]) => k2(x, y))));
    const pop = (m) => { let n = 0; for (; m; m &= m - 1) n++; return n; };
    const s0 = [S[0], S[1], 0, 0], key = (s) => s.join(','), prev = new Map([[key(s0), null]]), q = [s0];
    for (let i = 0; i < q.length; i++) {
      const [x, y, b, m] = q[i];
      if (x === G[0] && y === G[1] && pop(m) >= need) {
        const path = []; let k = key(q[i]); while (prev.get(k)) { const [pk, d] = prev.get(k); path.unshift(d); k = pk; }
        return { moves: path.join(''), battles: pop(m), beaten: R.map((_, j) => j + 1).filter((j) => (m >> (j - 1)) & 1) };
      }
      for (const [d, [nx, ny, nb]] of this.moves([x, y, b])) {
        let nm = m; for (let j = 0; j < R.length; j++) if (!((m >> j) & 1) && R[j].has(k2(nx, ny))) { nm = m | (1 << j); break; }
        if (pop(nm) > cap) continue;
        const v = [nx, ny, nb, nm], vk = key(v); if (prev.has(vk)) continue;
        prev.set(vk, [key(q[i]), d]); q.push(v);
      }
    }
    return null;
  }
}
/** The hall_v2 model of a built map JSON: {hall, rays, need, trainers} (trainers = kind trainer_hooded, map order). */
export function hallV2FromMap(m) {
  const tr = (m.npcs || []).filter((n) => n.kind === 'trainer_hooded');
  return { hall: new HallV2(m.hall_v2.grid, tr.map((n) => [n.x, n.y])), rays: tr.map((n) => n.sight_cells || []), need: Math.min(4, tr.length), trainers: tr };
}
