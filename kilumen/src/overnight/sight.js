// Overnight systems (Oct 23, 2026): F17 trainer line of sight + G11 'spotted' intro. OVERNIGHT flag `sight` (default ON:
// it only reacts to map data World Design already ships: npcs[].sight_cells / sight_range + facing).
// Flow: player ends a step inside an undefeated trainer's sight -> violet crystal spark over the trainer (SOUL_PLAYBOOK
// 5.1; never a '!') -> system_trainers.spotted line -> the trainer walks up (A*, npcs.walkTo) -> the normal talk()
// (challenge pages -> battle hook -> outcome). No art yet for the spark: drawn as a small violet diamond (placeholder).
import { Col, DELTA, TILE } from '../overworld/constants.js?v=v0.2.50-alpha';
import { ALL_TRAINERS_ENGAGE, DEFAULT_SIGHT_RANGE } from '../config.js?v=v0.2.50-alpha';

const SEE_THROUGH = new Set([Col.WALK, Col.PLATE, Col.ICE, Col.LEDGE_S]); // the player's own cell is checked separately

/** Cells a trainer watches: its sight_cells, else a straight ray of sight_range in its facing. */
export function sightCells(def, facing = def.facing) {
  if (Array.isArray(def.sight_cells) && def.sight_cells.length) return def.sight_cells.map(([x, y]) => ({ x, y }));
  const r = def.sight_range | 0, d = DELTA[facing || 'down'], out = [];
  for (let k = 1; k <= r; k++) out.push({ x: def.x + d.x * k, y: def.y + d.y * k });
  return out;
}

/** Is the straight line from (ax,ay) to (bx,by) (exclusive of both ends) open? Grass / plates / floor are see-through. */
export function lineClear(m, ax, ay, bx, by) {
  const sx = Math.sign(bx - ax), sy = Math.sign(by - ay);
  if (sx && sy) return false; // sight is straight lines only
  for (let x = ax + sx, y = ay + sy; x !== bx || y !== by; x += sx, y += sy) {
    if (!SEE_THROUGH.has(m.code(x, y)) || m.npcAt(x, y)) return false;
  }
  return true;
}

/** Pure: the first trainer (npc runtime list) that sees the player at (px,py). isDone(npc) -> skip (defeated / no lines). */
export function findSpotter(m, npcs, px, py, isDone) {
  for (const n of npcs) {
    const d0 = n.def || n;
    const def = ALL_TRAINERS_ENGAGE && d0.kind !== 'master' && !(d0.sight_cells?.length || d0.sight_range) ? { ...d0, sight_cells: null, sight_range: DEFAULT_SIGHT_RANGE } : d0;
    if (!(def.sight_cells || def.sight_range) || isDone(n)) continue;
    const nx = n.x, ny = n.y;
    const cells = sightCells({ ...def, x: nx, y: ny }, def.sight_cells ? def.facing : (n.mover?.facing || def.facing));
    if (!cells.some((c) => c.x === px && c.y === py)) continue;
    if (!lineClear(m, nx, ny, px, py)) continue;
    return n;
  }
  return null;
}

export class SightSystem {
  constructor(scene) { this.scene = scene; this.lastCell = null; this.spark = null; this.cooldown = new Set(); this.waiters = []; }

  isDone(n) {
    const s = this.scene, map = s.map.name;
    if (s.seen?.[`defeated:${map}.${n.id}`]) return true;
    if (this.cooldown.has(n.id)) return true;
    const e = s._entryFor?.(map, n.def);
    return !e?.battle_lost; // only real trainers (Text Bot entry with battle_lost) challenge
  }

  onEnter() { this.lastCell = null; this.cooldown.clear(); this.spark = null; }

  /** Called after every scene.step. */
  tick() {
    const s = this.scene, p = s.player;
    this.waiters = this.waiters.filter((w) => !w());
    if (this.spark && --this.spark.t <= 0) this.spark = null;
    if (p.moving || s.busy || s.fade || s.dialog?.active || !s.map) return;
    const key = s.map.name + ':' + p.x + ',' + p.y;
    if (key === this.lastCell) return;
    this.lastCell = key;
    // leaving a trainer's sight clears its re-challenge cooldown (lost battle without a warp)
    for (const id of [...this.cooldown]) { const n = s.npcs.byId(id); if (!n || !sightCells({ ...n.def, x: n.x, y: n.y }).some((c) => c.x === p.x && c.y === p.y)) this.cooldown.delete(id); }
    if (s.map.warpAt?.(p.x, p.y)) return;
    const n = findSpotter(s.map, s.npcs.list, p.x, p.y, (q) => this.isDone(q));
    if (n) this.trigger(n);
  }

  wait(pred, maxTicks = 240) { let t = 0; return new Promise((res) => this.waiters.push(() => { if (pred() || ++t >= maxTicks) { res(); return true; } return false; })); }

  async trigger(n) {
    const s = this.scene, p = s.player;
    this.cooldown.add(n.id);
    s.log.push({ tick: s.tick, type: 'spotted', npc: n.id });
    // save lock (Gary, Oct 23 2026): checkpoint before the walk-up, then no save until the talk + battle script has ended
    s.checkpoint?.('trainer_spotted');
    const release = s.lockSave ? s.lockSave('trainer_approach') : () => {};
    try { await this._approach(n); s.talk(n, n.def); } // the trainer's own pages are the intro (system_trainers.spotted.note)
    catch (e) { console.error(e); }
    finally { if (s.busy) await this.wait(() => !s.busy, Infinity); release(); }
  }

  async _approach(n) {
    const s = this.scene, p = s.player;
    await s.script(async () => {
      n.talking = false; n.faceToward(p.x, p.y);
      this.spark = { id: n.id, t: 36 };
      s.audio?.sfx?.('spotted');
      await this.wait(() => !this.spark, 60);
      const e = s._entryFor?.(s.map.name, n.def);
      const name = e?.name || s.speakerFor?.(n)?.name || 'A trainer';
      const v = s.lines?.system_trainers?.spotted?.pages;
      if (v) await s.say(s.fill(v, { ...s.textVars(), trainer: name }));
      const sx = Math.sign(n.x - p.x), sy = Math.sign(n.y - p.y);
      const tx = p.x + sx, ty = p.y + sy;
      if (n.x !== tx || n.y !== ty) {
        if (s.npcs.walkTo(n.id, tx, ty, { stay: true })) await this.wait(() => n.x === tx && n.y === ty && !n.mover.moving, 300);
      }
      n.faceToward(p.x, p.y);
      p.facing = sx > 0 ? 'right' : sx < 0 ? 'left' : sy > 0 ? 'down' : 'up';
    });
  }

  /** Placeholder spark: violet diamond over the trainer's head (no '!' anywhere). */
  draw() {
    const s = this.scene, ctx = s.renderer?.ctx, cam = s._cam, n = this.spark && s.npcs.byId(this.spark.id);
    if (!ctx || !cam || !n) return;
    const z = s.zoom, { px, py } = n.mover.pixel(), t = this.spark.t;
    const cx = (px + TILE / 2 - cam.x) * z, cy = (py - 14 - (36 - t < 6 ? (36 - t) * 2 : 12) - cam.y) * z, r = 7 * z;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#2a1840'; ctx.beginPath(); ctx.moveTo(cx, cy - r - z); ctx.lineTo(cx + r + z, cy); ctx.lineTo(cx, cy + r + z); ctx.lineTo(cx - r - z, cy); ctx.fill();
    ctx.fillStyle = '#b77cff'; ctx.beginPath(); ctx.moveTo(cx, cy - r); ctx.lineTo(cx + r, cy); ctx.lineTo(cx, cy + r); ctx.lineTo(cx - r, cy); ctx.fill();
    ctx.fillStyle = '#efe0ff'; ctx.fillRect(cx - z * 2, cy - r / 2, z * 2, z * 2);
    ctx.restore();
  }
}
