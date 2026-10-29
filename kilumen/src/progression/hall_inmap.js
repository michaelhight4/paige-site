// Playtest fixes 3 (Oct 29 2026, Coder): hall puzzles played IN the hall map (no overlay). Revival Heights "Prism relay":
// the prisms / receivers / doors on revival_hall_int are the same cells as data/hall_puzzles/revival_heights.json shifted
// by def.map_origin; checking a prism turns it, lit receivers open their crystal barrier. Mirefen "Bog-light boardwalk":
// checking a reed lamp lights it in the frogs' order (a wrong lamp puts them all out). Solved -> def.solved_flag, which
// gates the Master (progression/index.js). Puzzle state lives in save.systems.progression.puzzles[zone] (same as overlay).
import { KINDS, Grid } from './puzzles.js?v=v0.2.72-alpha';

export const INMAP_HALLS = Object.freeze({ revival_heights: 'revival_hall_int', mirefen: 'mirefen_hall_int' });
export const inmapZone = (mapName) => Object.keys(INMAP_HALLS).find((z) => INMAP_HALLS[z] === mapName) || null;
export const mapOrigin = (def) => def?.map_origin || def?.darkness?.map_origin || [0, 0];
const TILE = { doorShut: 'crystal_barrier_lit', doorOpen: 'crystal_barrier_dim', rxOff: 'crystal', rxOn: 'crystal_switch_on' };
const FACE = ['north', 'east', 'south', 'west'];

export class InMapHall {
  /** store = progression store ({puzzles}); solvedAlready = flag set / Master already beaten (old saves) */
  constructor(def, store, solvedAlready = false) {
    this.def = def; this.store = store; this.g = new Grid(def.grid); this.kind = KINDS[def.kind];
    const [ox, oy] = mapOrigin(def); this.ox = ox; this.oy = oy;
    const saved = store.puzzles[def.zone];
    this.st = saved?.st ? structuredClone(saved.st) : this.kind.init(def, this.g);
    this.solved = !!saved?.solved || solvedAlready;
  }
  save() { this.store.puzzles[this.def.zone] = { ...(this.store.puzzles[this.def.zone] || {}), st: this.st, solved: this.solved }; }
  gridAt(mx, my) { return this.g.at(mx - this.ox, my - this.oy); }
  lit() { return this.def.kind === 'prism' ? KINDS.prism.lit(this.def, this.g, this.st) : new Set(); }
  doorsOpen() { return this.solved || Object.keys(this.def.doors || {}).every((id) => this.doorOpen(id)); }
  doorOpen(id, lit = null) {
    if (this.solved) return true;
    const [x, y] = this.def.doors[id][0];
    return KINDS.prism.doorOpen(this.def, this.g, this.st, x, y, lit || this.lit());
  }

  /** Prism hall: barrier + receiver tiles and door collision from the state. playerAt keeps a barrier open under the player. */
  apply(map, playerAt = null) {
    if (this.def.kind !== 'prism' || !map) return;
    const lit = this.lit(), has = (n) => !!map.tileByName?.(n);
    for (const [id, cells] of Object.entries(this.def.doors || {})) {
      const open = this.doorOpen(id, lit);
      for (const [gx, gy] of cells) {
        const x = gx + this.ox, y = gy + this.oy, under = playerAt && playerAt.x === x && playerAt.y === y;
        const o = open || under;
        if (has(TILE.doorShut)) map.setTile('decoration', x, y, o ? TILE.doorOpen : TILE.doorShut);
        map.layers.collision[y][x] = o ? 0 : 1;
      }
    }
    if (has(TILE.rxOn)) for (const r of this.def.receivers || []) map.setTile('decoration', r.at[0] + this.ox, r.at[1] + this.oy, this.solved || lit.has(r.at.join(',')) ? TILE.rxOn : TILE.rxOff);
  }

  /** A on the faced map cell. -> null (not a puzzle cell) | {kind, ...} describing what happened (state already saved). */
  touch(mx, my) {
    const c = this.gridAt(mx, my), gx = mx - this.ox, gy = my - this.oy;
    if (this.def.kind === 'prism') {
      if (c === 'r') return { kind: 'receiver', lit: this.solved || this.lit().has(gx + ',' + gy) };
      if (c !== 'P') return null;
      const before = this.lit(), wasOpen = this.doorsOpen();
      this.st = KINDS.prism.touch(this.def, this.g, this.st, gx, gy) || this.st;
      const i = this.def.prisms.findIndex((p) => p.at[0] === gx && p.at[1] === gy), after = this.lit();
      const newlyLit = [...after].filter((k) => !before.has(k)).length;
      const solvedNow = !this.solved && !wasOpen && this.doorsOpen();
      if (solvedNow) this.solved = true;
      this.save();
      return { kind: 'prism', facing: FACE[this.st.f[i]], newlyLit, solvedNow };
    }
    if (this.def.kind === 'boardwalk') {
      if (!/[1-4]/.test(c)) return null;
      const done = (this.st.p || 0) >= this.def.order.length;
      if (done || this.solved) return { kind: 'lamp', result: 'already' };
      const p0 = this.st.p || 0;
      this.st = KINDS.boardwalk.touch(this.def, this.g, this.st, gx, gy) || this.st;
      const ok = this.st.p > p0, solvedNow = this.st.p >= this.def.order.length;
      if (solvedNow) this.solved = true;
      this.save();
      return { kind: 'lamp', result: ok ? 'lit' : 'wrong', solvedNow };
    }
    return null;
  }
}
