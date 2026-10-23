// Kilumen overworld scene: owns the current map, the player mover, camera, warps/fades and the frame loop.
// Movement modes (MOVEMENT.md): walk; run = hold B with has_run_shoes; bike = Select with has_bike.
// Story gates (CRITICAL_PATH.md 3): maps ship blocked; gates whose flag is set are cleared on load / when the flag is set.
// FIELD_SKILLS.md hooks (NOT implemented, next pass): `hooks.onWater` (Tideglide carry over code 3 / floodwater),
// `hooks.onFieldSkill` (Brushbreak / Stonebreak / Glowcall), Skylift fly points (visited_<town> flags) and the
// Lumen Line rail (has_rail_pass). Water stays a wall until then.
import { TILE, TICK_MS, DELTA, SHEET_ROW, FADE_OUT_MS, FADE_IN_MS, Col, MoveMode } from './constants.js';
import { GameMap, exitSpawn, warpSpawn, isToCome } from './map.js';
import { GridMover } from './movement.js';
import { cameraFor, pickZoom } from './camera.js';
import { loadImage, loadJson, resolveUrl } from './assets.js';
import { loadTileset, tilesetFileForZoom, indexTileset } from './tileset.js';
import { Renderer } from './renderer.js';
import { drawDebug } from './debug.js';

const FADE_OUT_TICKS = Math.round(FADE_OUT_MS / TICK_MS);
const FADE_IN_TICKS = Math.round(FADE_IN_MS / TICK_MS);
const MAX_TICKS_PER_FRAME = 6;

export class Overworld {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {import('./input.js').Input} input
   * @param {object} config CONFIG from src/config.js
   * @param {object} opts {start, debug, zoom (forced), toast(text)}
   */
  constructor(canvas, input, config, opts = {}) {
    this.canvas = canvas; this.input = input; this.config = config; this.opts = opts;
    this.renderer = new Renderer(canvas);
    this.player = new GridMover(opts.start || config.start);
    this.map = null; this.tileset = null; this.zoom = 2;
    this.debug = !!opts.debug;
    this.tick = 0; this.acc = 0; this.last = 0; this.fps = 0; this._fpsT = 0; this._fpsN = 0;
    this.fade = null;           // {phase:'out'|'load'|'in', t, spawn}
    this.lastDoor = null;       // README 7: remembered for "$return" warps
    this.rustles = new Map();   // "x,y" -> sim ms when the grass rustle started
    this.warpCount = 0;
    this.log = [];              // recent events (tests/debug)
    // later: wild encounters, puzzles, field skills (FIELD_SKILLS.md: Tideglide / Skylift / Lumen Line / flooding)
    this.hooks = { onEncounterTile: null, onPlate: null, onWater: null, onFieldSkill: null };
    this.flags = new Set([...(config.startFlags || []), ...(opts.flags || [])]);
    this.lines = null;          // text/overworld_lines.json (optional; map placeholders are the fallback)
    this._lastBumpMsg = null;   // say a blocked line once per push, not every bump
    this.tilesetIndex = null;   // 1x tileset index for name lookups (ramps, gate tiles); ids match every scale
    this.knownMaps = null;
    this.mapCache = new Map();
  }

  get ms() { return this.tick * TICK_MS; }

  async init() {
    this.resize();
    try {
      const layout = await loadJson(this.config.worldLayout);
      this.knownMaps = new Set(layout.maps_built || []);
    } catch { this.knownMaps = null; }
    try { this.lines = await loadJson(this.config.textLines); } catch { this.lines = null; }
    const s = this.opts.start || this.config.start;
    this.map = await this.loadMap(s.map);
    await this.ensureAssets();
    this.player.place(s.x, s.y, s.facing);
    this.map.applyGates(this.flags);
    window.addEventListener('resize', () => this.resize());
  }

  mapUrl(name) { return this.config.mapsDir + name + '.json'; }

  async loadMap(name) {
    if (!this.mapCache.has(name)) {
      this.mapCache.set(name, loadJson(this.mapUrl(name)).then(async (j) => {
        const m = new GameMap(structuredClone(j)); // gates mutate layers: never touch the shared JSON
        if (!this.tilesetIndex) this.tilesetIndex = indexTileset(await loadJson(resolveUrl(m.tilesetRef, this.mapUrl(name))));
        return m.attachTileset(this.tilesetIndex.byId);
      }));
    }
    try { return await this.mapCache.get(name); } catch (e) { this.mapCache.delete(name); throw e; }
  }

  /** Load the tileset set + player sheet that match the current integer zoom. */
  async ensureAssets() {
    const want = this.zoom === 2 || this.zoom === 3 ? this.zoom : 1;
    const tsUrl = resolveUrl(tilesetFileForZoom(this.map.tilesetRef, want), this.mapUrl(this.map.name));
    if (!this.tileset || this.tileset.url !== tsUrl) this.tileset = await loadTileset(tsUrl);
    if (this.playerScale !== want) {
      const sheets = this.config.playerSheets, imgs = {};
      await Promise.all(Object.keys(sheets).map(async (k) => {
        try { imgs[k] = await loadImage(sheets[k][want]); } catch (e) { if (k === 'walk') throw e; console.warn(e.message); }
      }));
      this.playerImgs = imgs;
      this.playerScale = want;
    }
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const w = Math.round(window.innerWidth * dpr), h = Math.round(window.innerHeight * dpr);
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w; this.canvas.height = h;
      this.renderer.resetContext(); // resizing a canvas resets imageSmoothingEnabled to true
    }
    const z = this.opts.zoom || pickZoom(h);
    if (z !== this.zoom) { this.zoom = z; if (this.map) this.ensureAssets(); }
  }

  // ---- world callbacks for the mover -------------------------------------------------------
  worldApi() {
    const m = this.map;
    return {
      query: (x, y, dir, mode) => m.query(x, y, dir, mode),
      onBump: (x, y, dir, who, q) => this._onBump(q),
      onStepStart: (x, y) => {
        // grass rustle: the entered cell plus the tips tile above it (README: tips sync with the cell)
        if (m.encounter(x, y) || this._isRustleTile(x, y)) {
          this.rustles.set(x + ',' + y, this.ms);
          this.rustles.set(x + ',' + (y - 1), this.ms);
        }
      },
      onArrive: (x, y) => {
        const code = m.code(x, y);
        if (code === Col.DOOR) {
          const w = m.warpAt(x, y);
          if (w && !isToCome(w)) {
            if (w.to !== '$return') this.lastDoor = { map: m.name, x, y };
            this._doorDismount = this.player.mode === MoveMode.BIKE; // MOVEMENT.md 2: doors always dismount
            const spawn = warpSpawn(w, w.to === '$return' ? this.lastDoor : null)
              || { ...this.config.start }; // $return with no stored door (debug start inside): go to the dev start
            this.startWarp(spawn, 'door');
            return 'stop';
          }
          if (w && isToCome(w)) this.toast(this.config.closedPathText);
        }
        if (code === Col.PLATE) this.hooks.onPlate?.(x, y);
        if (m.encounter(x, y)) this.hooks.onEncounterTile?.(x, y, m.encounter(x, y)); // run/bike: same rate (MOVEMENT.md)
        this._lastBumpMsg = null;
      },
      onEdge: (exit, x, y) => {
        if (!exit) return;
        if (isToCome(exit) || (this.knownMaps && !this.knownMaps.has(exit.to))) { this.toast(this.config.closedPathText); return; }
        this.startWarp({ exit, fromX: x, fromY: y }, 'edge');
        return 'stop';
      },
    };
  }

  // ---- flags, gates, run, bike -------------------------------------------------------------
  /** Set a story flag (progression.py names) and clear any gate it opens on the current map right away. */
  setFlag(flag, on = true) {
    if (on) this.flags.add(flag); else this.flags.delete(flag);
    const opened = this.map?.applyGates(this.flags) || [];
    if (!this.flags.has('has_bike') && this.player.mode === MoveMode.BIKE) this.player.mode = MoveMode.WALK;
    this.log.push({ tick: this.tick, type: 'flag', flag, on, opened });
    return opened;
  }

  /** Text Bot line(s) for a dotted path in overworld_lines.json, with {button} names filled in; null if missing. */
  text(path) {
    let v = this.lines;
    for (const k of path.split('.')) v = v?.[k];
    if (v == null) return null;
    const pages = Array.isArray(v) ? v : [String(v)];
    const names = { player: 'Cal', ...this.config.buttonNames };
    return pages.map((t) => t.replace(/\{(\w+)\}/g, (m0, k) => names[k] ?? m0)).join('\n');
  }

  gateText(gate, cleared) {
    return this.text(`blockers.${gate.id}.${cleared ? 'after' : 'before'}`) || gate.lines?.[cleared ? 'cleared' : 'blocked'] || this.config.closedPathText;
  }

  _onBump(q) {
    let msg = null;
    if (q?.gate) msg = this.gateText(q.gate, false);
    else if (q?.code === Col.BIKE_ONLY && this.player.mode !== MoveMode.BIKE) msg = this.text('items.bike.boardwalk_on_foot');
    else if (q?.code === Col.RAMP) msg = this.player.mode === MoveMode.BIKE ? null : this.text('items.bike.ramp_on_foot');
    if (msg && msg !== this._lastBumpMsg) this.toast(msg);
    this._lastBumpMsg = msg;
  }

  /** Mode for the next step: the bike sticks until toggled; otherwise run while B is held (MOVEMENT.md 5.4). */
  _updateMode(snap) {
    const p = this.player;
    if (p.mode === MoveMode.BIKE) return;
    p.mode = snap.b && this.flags.has('has_run_shoes') && this.map.movement.run ? MoveMode.RUN : MoveMode.WALK;
  }

  /** Select: mount / dismount (MOVEMENT.md 5.5). Returns what happened, for tests. */
  toggleBike() {
    const p = this.player, m = this.map;
    if (p.moving || this.fade) return 'busy';
    if (!this.flags.has('has_bike')) return 'no_bike';
    if (p.mode === MoveMode.BIKE) {
      if (m.noDismount(p.x, p.y) || m.code(p.x, p.y) === Col.BIKE_ONLY) {
        this.toast(this.text('items.bike.no_dismount') || "You can't get off here.");
        return 'no_dismount';
      }
      p.mode = MoveMode.WALK; this.log.push({ tick: this.tick, type: 'bike', on: false });
      return 'off';
    }
    if (!m.movement.bike) {
      this.toast(this.text(this._isCave(m) ? 'items.bike.cave' : 'items.bike.indoors') || 'No riding here.');
      return 'not_here';
    }
    p.mode = MoveMode.BIKE; this.log.push({ tick: this.tick, type: 'bike', on: true });
    return 'on';
  }

  _isCave(m) { return /^greystone/.test(m.name); } // only for choosing the line; the rule itself is movement.bike

  _isRustleTile(x, y) {
    for (const layer of ['decoration', 'overlay']) {
      const t = this.tileset?.byId.get(this.map.tile(layer, x, y));
      if (t?.animation?.type === 'rustle') return true;
    }
    return false;
  }

  // ---- warps --------------------------------------------------------------------------------
  startWarp(spawn, kind) {
    if (this.fade) return;
    this.player.locked = true;
    this.fade = { phase: 'out', t: 0, spawn, kind };
    this.log.push({ tick: this.tick, type: 'warpStart', kind, from: this.map.name });
  }

  async _finishLoad() {
    const f = this.fade;
    try {
      let target, x, y, facing;
      if (f.spawn.exit) {
        target = await this.loadMap(f.spawn.exit.to);
        ({ x, y, facing } = exitSpawn(f.spawn.exit, f.spawn.fromX, f.spawn.fromY, target));
      } else {
        target = await this.loadMap(f.spawn.map);
        ({ x, y } = f.spawn); facing = f.spawn.facing;
      }
      this.map = target;
      target.applyGates(this.flags);
      await this.ensureAssets();
      const wasBike = this.player.mode === MoveMode.BIKE;
      this.player.place(x, y, facing);
      if (wasBike && (this._doorDismount || !target.movement.bike)) {
        this.player.mode = MoveMode.WALK;
        if (!target.movement.bike) this.toast(this.text(this._isCave(target) ? 'items.bike.cave' : 'items.bike.indoors') || 'No riding here.');
      }
      this._doorDismount = false; this._lastBumpMsg = null;
      this.rustles.clear();
      this.warpCount++;
      this.log.push({ tick: this.tick, type: 'warpEnd', to: target.name, x, y });
    } catch (e) {
      console.error(e);
      this.toast(this.config.closedPathText);
    }
    f.phase = 'in'; f.t = 0;
  }

  _stepFade() {
    const f = this.fade;
    if (!f) return;
    if (f.phase === 'out' && ++f.t >= FADE_OUT_TICKS) { f.phase = 'load'; this._finishLoad(); }
    else if (f.phase === 'in' && ++f.t >= FADE_IN_TICKS) { this.fade = null; this.player.locked = false; }
  }

  fadeAlpha() {
    const f = this.fade;
    if (!f) return 0;
    if (f.phase === 'out') return f.t / FADE_OUT_TICKS;
    if (f.phase === 'load') return 1;
    return 1 - f.t / FADE_IN_TICKS;
  }

  // ---- interaction --------------------------------------------------------------------------
  interact() {
    const d = DELTA[this.player.facing], x = this.player.x + d.x, y = this.player.y + d.y;
    const sign = this.map.signs.find((s) => s.x === x && s.y === y);
    if (sign) { this.toast(sign.text); return; }
    // story-gate guard NPC or the blocking object itself: blocked / cleared line
    const npc = this.map.npcAt(x, y);
    const gate = this.map.storyGates.find((g) => g.npc && npc && g.npc.id === npc.id) || (this.map.gateAt(x, y) && !this.map.gateCleared(this.map.gateAt(x, y)) ? this.map.gateAt(x, y) : null);
    if (gate) { this.toast(this.gateText(gate, this.map.gateCleared(gate))); return; }
    if (npc) this.log.push({ tick: this.tick, type: 'talk', npc: npc.id }); // NPC dialogue: later task
  }

  toast(text) { this.opts.toast?.(text); this.log.push({ tick: this.tick, type: 'toast', text }); }

  // ---- loop -----------------------------------------------------------------------------------
  step(snap) {
    if (snap.debug) this.debug = !this.debug;
    if (snap.a && !this.fade && !this.player.moving) this.interact();
    if (snap.select) this.toggleBike();
    if (!snap.dir) this._lastBumpMsg = null;
    this._updateMode(snap);
    const ev = this.player.tick(snap, this.worldApi());
    for (const e of ev) if (e.type !== 'stepStart' && e.type !== 'stepEnd') this.log.push({ tick: this.tick, ...e });
    if (this.log.length > 200) this.log.splice(0, this.log.length - 200);
    this._stepFade();
    this.tick++;
  }

  frame(now) {
    if (!this.last) this.last = now;
    let dt = now - this.last; this.last = now;
    if (dt > 250) dt = 250; // tab was hidden: don't fast-forward
    this.acc += dt;
    const snap = this.input.poll();
    let n = 0;
    while (this.acc >= TICK_MS && n < MAX_TICKS_PER_FRAME) {
      this.step(n === 0 ? snap : { ...snap, a: false, debug: false, select: false });
      this.acc -= TICK_MS; n++;
    }
    if (n === MAX_TICKS_PER_FRAME) this.acc = 0;
    else if (n === 0 && (snap.a || snap.debug || snap.select)) {
      this.input.aQueued ||= snap.a; this.input.debugQueued ||= snap.debug; this.input.selQueued ||= snap.select;
    }
    this._fpsN++; if (now - this._fpsT >= 500) { this.fps = Math.round((this._fpsN * 1000) / (now - this._fpsT)); this._fpsT = now; this._fpsN = 0; }
    this.render();
  }

  view() {
    const p = this.player, { px, py, lift } = p.pixel(), z = this.zoom;
    const cam = cameraFor(px + TILE / 2, py + TILE / 2, this.map.width, this.map.height, this.canvas.width / z, this.canvas.height / z);
    return {
      map: this.map, tileset: this.tileset, zoom: z, cam, ms: this.ms, rustles: this.rustles,
      actors: [this._playerActor(px, py, lift)],
      fade: this.fadeAlpha(), debug: this.debug, drawDebug, player: p, fps: this.fps, lastDoor: this.lastDoor, flags: [...this.flags],
    };
  }

  _playerActor(px, py, lift) {
    const p = this.player, f = p.frame(), imgs = this.playerImgs || {};
    const img = imgs[f.anim] || imgs.walk; // a missing run/bike sheet falls back to the walk sheet
    const col = imgs[f.anim] ? f.col : Math.min(f.col, 4);
    return { img, sheetScale: this.playerScale, col, row: SHEET_ROW[p.facing], px, py, lift, feet: py + TILE, anim: f.anim };
  }

  render() { if (this.map && this.tileset) this.renderer.draw(this.view()); }

  run() {
    const loop = (t) => { this.frame(t); this._raf = requestAnimationFrame(loop); };
    this._raf = requestAnimationFrame(loop);
  }

  /** Snapshot for tests and the debug console. */
  state() {
    const p = this.player, v = this.map ? this.view() : null;
    return {
      map: this.map?.name, x: p.x, y: p.y, facing: p.facing, state: p.state, mode: p.mode, stepMode: p.stepMode, speedMultiplier: p.speedMultiplier,
      frame: p.frame(), dur: p.dur, flags: [...this.flags], gatesCleared: this.map ? this.map.storyGates.filter((g) => this.map.gateCleared(g)).map((g) => g.id) : [],
      pixel: p.pixel(), cam: v?.cam, zoom: this.zoom, tileSize: this.tileset?.size, debug: this.debug,
      fading: !!this.fade, warpCount: this.warpCount, lastDoor: this.lastDoor, tick: this.tick,
      canvas: { w: this.canvas.width, h: this.canvas.height }, smoothing: this.renderer.ctx.imageSmoothingEnabled,
      log: this.log.slice(-30),
    };
  }
}
