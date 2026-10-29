// Overnight systems (Oct 23, 2026): field obstacles from FIELD_SKILLS.md, behind OVERNIGHT flag `field` (default OFF).
//  - Tideglide (F3): face water (code 3) + A -> prompt -> ride across at walk speed (no run / bike); stepping on land
//    gets off. Needs has_tideglide (FIELD_SKILLS.md 13). Deep water (11) stays a wall. Encounters on water: not wired.
//  - Brushbreak (F2): face a tile named `thick_brush` + A -> prompt -> cleared until the map reloads. Unlock flag is TBD
//    in the docs, so this uses the PLACEHOLDER flag `has_brushbreak` (question for Gary). No built map has the tile yet.
//  - Stonebreak: same for tiles named `cracked_rock` with PLACEHOLDER flag `has_stonebreak` (none placed yet either).
//  - Boulders (F1): walk into a `push_boulder` (code 5) and it slides one cell if the next cell is open floor / plate.
//    No skill needed (FIELD_SKILLS.md: Greystone boulders stay push puzzles). Plates with mode 'hold' (greystone_b1)
//    are held by a boulder or the player standing on them; the gates follow (puzzle.gates[].channel may be a list).
//    Boulders reset when the map reloads (puzzle.rules).
import { Col, DELTA, MoveMode } from '../overworld/constants.js?v=v0.2.80-alpha';

export const BRUSH_TILES = { thick_brush: { skill: 'brushbreak', flag: 'has_brushbreak' }, cracked_rock: { skill: 'stonebreak', flag: 'has_stonebreak' } };
export const BOULDER_TILES = new Set(['push_boulder']);
const OPEN = new Set([Col.WALK, Col.PLATE]);

/** Pure: can the boulder at (bx,by) be pushed in dir on map m? -> {x,y} target or null. */
export function boulderTarget(m, bx, by, dir) {
  const d = DELTA[dir], tx = bx + d.x, ty = by + d.y;
  if (!m.inBounds(tx, ty) || m.npcAt(tx, ty)) return null;
  if (!OPEN.has(m.code(tx, ty))) return null;
  if ((m.warps || []).some((w) => w.x === tx && w.y === ty)) return null;
  return { x: tx, y: ty };
}

/** Pure: slide the boulder (decoration tile + collision) from (bx,by) to (tx,ty). Remembers the floor under each. */
export function moveBoulder(m, bx, by, tx, ty, under) {
  const tile = m.tile('decoration', bx, by);
  const k0 = bx + ',' + by, k1 = tx + ',' + ty;
  const prev = under.get(k0) || { code: Col.WALK, deco: 0 };
  m.layers.decoration[by][bx] = prev.deco; m.layers.collision[by][bx] = prev.code; under.delete(k0);
  under.set(k1, { code: m.code(tx, ty), deco: m.tile('decoration', tx, ty) });
  m.layers.decoration[ty][tx] = tile; m.layers.collision[ty][tx] = Col.BOULDER;
}

/** Pure: hold-plate puzzle (greystone_b1 style). Returns {gateId: open}. weighted(x,y) = boulder/player on the cell. */
export function holdGates(puzzle, weighted, isOn = () => false) {
  const sw = puzzle.switches || [];
  const on = (s) => (s.mode === 'hold' ? weighted(s.x, s.y) : isOn(s.id));
  const chanOpen = (ch) => { const list = sw.filter((s) => s.channel === ch); return list.length > 0 && list.every(on); };
  const out = {};
  for (const g of puzzle.gates || []) out[g.id] = [].concat(g.channel).some(chanOpen);
  return out;
}

export class FieldSystem {
  constructor(scene) { this.scene = scene; this.gliding = false; this.under = new Map(); this.toggled = new Set(); this.mapName = null; }

  tileName(layer, x, y) { const s = this.scene, id = s.map?.tile(layer, x, y); return id ? s.tilesetIndex?.byId?.get(id)?.name || null : null; }
  brushAt(x, y) { for (const L of ['decoration', 'overlay', 'ground']) { const n = this.tileName(L, x, y); if (BRUSH_TILES[n]) return { layer: L, ...BRUSH_TILES[n] }; } return null; }
  isPushBoulder(x, y) { return this.scene.map?.code(x, y) === Col.BOULDER && BOULDER_TILES.has(this.tileName('decoration', x, y)); }

  skillText(skill, key) { return this.scene.text(`field_skills.${skill}.${key}`); }
  vars(skill, extra = {}) { const s = this.scene, lead = s.party?.[0]; return { ...s.textVars(), skill: SKILL_NAMES[skill] || skill, creature: lead ? lead.nickname || cap(lead.species) : 'Your creature', ...extra }; }
  pages(skill, key, extra) { const v = this.scene.lines?.field_skills?.[skill]?.[key]; return v ? this.scene.fill([].concat(v), this.vars(skill, extra)) : null; }

  onEnter(m) {
    this.gliding = false; this.under = new Map(); this.mapName = m.name;
    this.refreshHold();
  }

  /** A pressed: true if a field obstacle answered (then the scene's own interact is skipped). */
  interact() {
    const s = this.scene, p = s.player, d = DELTA[p.facing], fx = p.x + d.x, fy = p.y + d.y, m = s.map;
    if (!m.inBounds(fx, fy) || m.npcAt(fx, fy)) return false;
    const brush = this.brushAt(fx, fy);
    if (brush) { s.script(() => this.useSkill(brush.skill, brush.flag, () => { s.map.layers[brush.layer][fy][fx] = 0; s.map.layers.collision[fy][fx] = Col.WALK; s._dirty = true; })); return true; }
    if (m.code(fx, fy) === Col.WATER && !this.gliding && OPEN.has(m.code(p.x, p.y)) || (m.code(fx, fy) === Col.WATER && m.code(p.x, p.y) === Col.DOOR)) {
      s.script(() => this.useSkill('tideglide', 'has_tideglide', () => { this.gliding = true; p.mode = MoveMode.WALK; s.log.push({ tick: s.tick, type: 'tideglide', on: true }); }));
      return true;
    }
    return false;
  }

  async useSkill(skill, flag, apply) {
    const s = this.scene;
    const inspect = this.pages(skill, 'inspect');
    if (!s.flags.has(flag)) { await s.say([...(inspect || []), ...(this.pages(skill, 'cant_use_yet') || [])]); return false; }
    if (!s.party?.length) { await s.say(this.pages(skill, 'no_creature') || ['No creature can help here.']); return false; }
    const choices = s.lines?.field_skills?.[skill]?.choices || ['Yes', 'No'];
    if ((await s.ask(this.pages(skill, 'prompt') || ['Use it?'], choices)) !== 0) return false;
    await s.say(this.pages(skill, 'use') || ['...']);
    apply();
    return true;
  }

  /** Wraps worldApi().query: gliding treats plain water as floor. */
  query(q, x, y, dir) {
    const s = this.scene, m = s.map;
    if (this.gliding && q.type === 'block' && q.code === Col.WATER && !q.npc) { const d = DELTA[dir]; return { type: 'walk', x: x + d.x, y: y + d.y }; }
    return q;
  }

  /** Bump into a boulder: push it. */
  bump(x, y, dir, q) {
    const s = this.scene, m = s.map, d = DELTA[dir], bx = x + d.x, by = y + d.y;
    if (q?.type !== 'block' || q.code !== Col.BOULDER || !this.isPushBoulder(bx, by)) return false;
    const t = boulderTarget(m, bx, by, dir);
    if (!t) return false;
    moveBoulder(m, bx, by, t.x, t.y, this.under);
    s.audio?.sfx?.('bump');
    s.log.push({ tick: s.tick, type: 'boulder', from: [bx, by], to: [t.x, t.y] });
    if (m.code(t.x, t.y) === Col.BOULDER && this.under.get(t.x + ',' + t.y)?.code === Col.PLATE) s.hooks.onPlate?.(t.x, t.y);
    this.refreshHold(); s._dirty = true;
    return true;
  }

  arrive(x, y) {
    const s = this.scene;
    if (this.gliding && s.map.code(x, y) !== Col.WATER) { this.gliding = false; s.log.push({ tick: s.tick, type: 'tideglide', on: false }); }
    if (this.gliding) s.player.mode = MoveMode.WALK;
    this.refreshHold();
  }

  /** greystone_b1: gates follow the hold plate (boulder or player on it) or the release crystal (systems runtime). */
  refreshHold() {
    const s = this.scene, m = s.map, pz = m?.def?.puzzle || m?.puzzle;
    if (!pz?.switches?.some((w) => w.mode === 'hold')) return;
    const p = s.player;
    const weighted = (x, y) => (m.code(x, y) === Col.BOULDER) || (p.x === x && p.y === y);
    const rt = s.systems?.puzzles?.get?.(m.name);
    const isOn = (id) => this.toggled.has(m.name + ':' + id) || !!rt?.isOn?.(id);
    const open = holdGates(pz, weighted, isOn);
    for (const g of pz.gates || []) {
      const want = open[g.id] ? Col.WALK : Col.GATE;
      if (p.x === g.x && p.y === g.y) continue; // never close a gate on the player
      m.layers.collision[g.y][g.x] = want;
      const name = open[g.id] ? 'gate_hall_open' : 'gate_hall_closed';
      if (m._byName?.has(name)) m.setTile('decoration', g.x, g.y, name);
    }
  }
}

export const SKILL_NAMES = { tideglide: 'Tideglide', brushbreak: 'Brushbreak', stonebreak: 'Stonebreak', skylift: 'Skylift', glowcall: 'Glowcall' };
function cap(s) { return s ? s[0].toUpperCase() + s.slice(1) : s; }
