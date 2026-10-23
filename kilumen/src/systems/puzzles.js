// Fernwick Hall puzzle runtime (art/world/overworld/puzzles/fernwick_hall_int.runtime.json, World Design).
// systems-gd pass, Oct 22, 2026. Pure state machine + a small map adapter:
//   plates (mode latch): ON when stepped on, stay ON;  crystals (mode toggle): face + A flips it and its links;
//   a channel's gates open when every switch on it is ON;  solved = every gate open -> solved_flag, never resets.
// State saves in save.systems.puzzles[<map>] = {on: [ids], solved} (the runtime json's state_schema).

export class PuzzleRuntime {
  constructor(def, saved = null) {
    this.def = def;
    this.sw = new Map(def.switches.map((s) => [s.id, s]));
    const init = def.initial_state || Object.fromEntries(def.switches.map((s) => [s.id, !!s.start_on]));
    this.on = new Set(saved?.on ?? Object.keys(init).filter((k) => init[k]));
    this.solved = !!saved?.solved;
    if (this.solved) this._openAll();
  }
  _openAll() { for (const ch of Object.values(this.def.channels)) for (const id of ch.switches) this.on.add(id); }
  isOn(id) { return this.on.has(id); }
  channelOpen(ch) { return this.solved || this.def.channels[ch].switches.every((id) => this.on.has(id)); }
  gateOpen(g) { return this.channelOpen((typeof g === 'string' ? this.def.gates.find((x) => x.id === g) : g).channel); }
  switchAt(x, y, type) { return this.def.switches.find((s) => s.x === x && s.y === y && (!type || s.type === type)) || null; }

  /** A plate stepped on (player or boulder). -> {changed, solvedNow} */
  step(x, y) {
    const s = this.switchAt(x, y, 'plate');
    if (!s || this.solved) return { changed: false, solvedNow: false };
    if (s.mode === 'latch' && this.on.has(s.id)) return { changed: false, solvedNow: false };
    this.on.add(s.id);
    return { changed: true, solvedNow: this._checkSolved(), id: s.id };
  }
  /** A crystal touched (face + A). -> {changed, solvedNow} ; after solving crystals stay lit. */
  touch(x, y) {
    const s = this.switchAt(x, y, 'crystal');
    if (!s) return null;
    if (this.solved) return { changed: false, solvedNow: false, id: s.id };
    for (const id of s.toggles || [s.id]) if (this.on.has(id)) this.on.delete(id); else this.on.add(id);
    return { changed: true, solvedNow: this._checkSolved(), id: s.id };
  }
  _checkSolved() {
    if (this.solved) return false;
    if (this.def.gates.every((g) => this.gateOpen(g))) { this.solved = true; return true; }
    return false;
  }
  toJSON() { return { on: [...this.on].sort(), solved: this.solved }; }
}

const TILES = { plate: ['plate_hall_off', 'plate_hall_on'], crystal: ['crystal_switch_off', 'crystal_switch_on'], gate: ['gate_hall_closed', 'gate_hall_open'] };

/** Push the runtime state into a GameMap: switch/gate decoration tiles by name + gate collision codes. */
export function applyPuzzleToMap(rt, map) {
  for (const s of rt.def.switches) map.setTile('decoration', s.x, s.y, TILES[s.type][rt.isOn(s.id) ? 1 : 0]);
  for (const g of rt.def.gates) {
    const open = rt.gateOpen(g);
    map.setTile('decoration', g.x, g.y, TILES.gate[open ? 1 : 0]);
    map.layers.collision[g.y][g.x] = open ? (g.open_collision ?? 0) : (g.closed_collision ?? 6);
  }
}

/** Replay a solution string (runtime json 'legend') on a pure grid model: used by the tests. */
export function parseSolution(str) {
  const out = [];
  for (const tok of str.trim().split(/\s+/)) {
    const a = /^A(\w+)$/.exec(tok);
    if (a) { out.push({ touch: a[1] }); continue; }
    const m = /^([UDLR])(\d*)$/.exec(tok);
    if (!m) throw new Error('bad token ' + tok);
    for (let i = 0; i < (Number(m[2]) || 1); i++) out.push({ dir: m[1] });
  }
  return out;
}
