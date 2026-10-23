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
import { promptScheme, promptVars } from '../platform.js';
import { loadImage, loadJson, resolveUrl } from './assets.js';
import { loadTileset, tilesetFileForZoom, indexTileset } from './tileset.js';
import { Renderer } from './renderer.js';
import { drawDebug } from './debug.js';
import { pickLine, fillText, getPath, inboxEmails, pickNick, coinCount, whenMatches } from './lines.js';
import { freshSave, clampWarmth } from './save.js';
import { GAME_MIN_PER_TICK, phaseForHour, PHASE_HOUR, gradeFor, advanceClock, isIndoor } from './clock.js';
import { prepareGrade, gradeImage, tintImage, warmthStage } from './palette.js';
import { NpcSystem, OPPOSITE } from './npcs.js';
import { LivingWorld } from './living.js';
import { DepthPass, normalizeDepth } from './depth.js';
import { resolveFlagSwaps, isActive } from './props.js';
import { litGreensGrade, wantsLitGreens } from './lighting.js';
import { NightFx } from './nightfx.js';
import { trainerOutcome } from '../battle/story.js'; // battles default v1: trainer story flags (CRITICAL_PATH §2)

const FADE_OUT_TICKS = Math.round(FADE_OUT_MS / TICK_MS);
const FADE_IN_TICKS = Math.round(FADE_IN_MS / TICK_MS);
const MAX_TICKS_PER_FRAME = 6;
const AUTOSAVE_TICKS = 60 * 60;       // + on every flag/counter change, warp end and pagehide
const FOOTPRINT_MAX = 24;
const PHASES = ['dawn', 'day', 'dusk', 'night'];
const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);

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
    this.systems = null; // [systems-gd hook] set by attachSystems (src/systems/index.js)
    this.flags = new Set([...(config.startFlags || []), ...(opts.flags || [])]);
    this.lines = null;          // text/overworld_lines.json (optional; map placeholders are the fallback)
    this._lastBumpMsg = null;   // say a blocked line once per push, not every bump
    this.tilesetIndex = null;   // 1x tileset index for name lookups (ramps, gate tiles); ids match every scale
    this.knownMaps = null;
    this.mapCache = new Map();
    // ---- soul pass: save state, clock, dialogue, NPCs, props, time of day, Warmth follower
    const sv = opts.saveData || freshSave();
    this.store = opts.store || null;          // SaveStore (null = no persistence)
    this.audio = opts.audio || null;          // src/audio/audio.js (music follows the scene; sfx hooks below), optional
    for (const f of sv.flags) this.flags.add(f);
    this.counters = { ...sv.counters };
    this.seen = { ...sv.seen }; this.seenDay = { ...sv.seenDay };
    this.clock = { ...sv.clock };
    this.party = sv.party.map((c) => ({ ...c }));
    if (opts.lead) this.party = [{ species: opts.lead, nickname: opts.nick || null, warmth: clampWarmth(opts.warmth ?? 0), rt: null }, ...this.party.filter((c) => c.species !== opts.lead)];
    else if (opts.warmth != null && this.party[0]) this.party[0].warmth = clampWarmth(opts.warmth);
    if (opts.hour != null) this.clock.min = (opts.hour % 24) * 60;
    else if (opts.phase && PHASE_HOUR[opts.phase] != null) this.clock.min = PHASE_HOUR[opts.phase] * 60;
    this.timescale = opts.timescale ?? 1;     // ?timescale=0 freezes the clock (shots)
    if (sv.lastDoor) this.lastDoor = sv.lastDoor;
    this.dialog = opts.dialog || null;
    this.busy = false;                        // a dialogue script is running
    this.npcs = new NpcSystem(this);
    this.spots = []; this.standCells = new Set();
    this.decals = [];                         // footprints {x, y, name, t0}
    this.overlays = [];                       // engine overlays {x, y, id} (bin flies over the bin)
    this.follower = null;                     // lead creature on the player's previous tile
    this.grades = null; this.spriteMap = null; this.warmth = null; this.layout = null;
    this.healedAt = null; this.stillSince = 0; this._stillKey = '';
    this._bPrev = false; this._dirPrev = null; this._dirty = false; this._sinceSave = 0;
    this.imgCache = new Map();
    this.hooks.onBattle = null; this.hooks.onScriptedEncounter = null;
    this.life = new LivingWorld(this, opts.life || {}); // cloud shadows + ambient life (living.js)
    this.depth = new DepthPass(null, { enabled: opts.depth }); // contact shadows + wall-base shading (depth.js); config loaded in init()
    this.nightfx = new NightFx(this, opts.nightFx); // Night FX v1: moonlight grade, lit windows, lamp pools, night clouds (nightfx.js); all off unless switched on
    this.life.nightClouds = !!opts.nightFx?.clouds; // thin moonlit clouds at night + cloud drift paused under reduced motion (living.js)
    this._gradeImage = this.nightfx.wrapGradeImage(gradeImage);
  }

  get ms() { return this.tick * TICK_MS; }

  async init() {
    this.resize();
    const fit = !!this.opts.platform?.profile?.display?.fitCanvas;
    if (fit) this._watchViewport(); // mobile: watch the viewport from the first frame, not only after the multi-second load
    try {
      this.layout = await loadJson(this.config.worldLayout);
      this.knownMaps = new Set(this.layout.maps_built || []);
    } catch { this.knownMaps = null; }
    try { this.lines = await loadJson(this.config.textLines); } catch { this.lines = null; }
    await Promise.all([this._loadGrades(), this._loadSpriteMap(), this._loadWarmth(), this._loadDepth(), this.nightfx.load(this.config)]);
    const sv = this.opts.saveData;
    const s = this.opts.start || (sv?.pos && (!this.knownMaps || this.knownMaps.has(sv.pos.map)) ? sv.pos : this.config.start);
    this.map = await this.loadMap(s.map);
    await this.ensureAssets();
    this.player.place(s.x, s.y, s.facing);
    await this._enterMap();
    if (!fit) window.addEventListener('resize', () => this.resize()); // pc: unchanged
    else this._settle(); // mobile: re-measure for ~1 s once the game is up (URL bar settles after the first paint)
    window.addEventListener('pagehide', () => this.saveNow());
  }

  async _loadGrades() {
    try {
      const g = await loadJson(this.config.grades), base = this.config.timeOfDayDir;
      this.grades = {};
      await Promise.all(Object.entries(g.grades).map(async ([name, def]) => {
        const lut = def.lut ? await loadImage(base + def.lut.replace(/^time_of_day\//, '')) : null;
        const sl = def.sprite?.lut ? await loadImage(base + def.sprite.lut.replace(/^time_of_day\//, '')).catch(() => null) : null;
        const ll = def.lit?.lut ? await loadImage(base + def.lit.lut.replace(/^time_of_day\//, '')).catch(() => null) : null;
        this.grades[name] = prepareGrade(name, def, lut, sl, ll);
      }));
      // emissive masks (1x, per tile sheet): the only pixels that keep the lit grade at dusk/night (never chosen by colour)
      this.emissiveMasks = new Map();
      await Promise.all(Object.entries(g.emissive?.masks || {}).map(async ([sheet, rel]) => {
        try { this.emissiveMasks.set(sheet, await loadImage(base + rel.replace(/^time_of_day\//, ''))); } catch (e) { console.warn('emissive mask off:', sheet, e.message); }
      }));
    } catch (e) { console.warn('time of day off:', e.message); this.grades = null; }
  }

  async _loadDepth() {
    if (!this.config.depth) return;
    try { this.depth = new DepthPass(normalizeDepth(await loadJson(this.config.depth), this.opts.depthStrength), { enabled: this.opts.depth }); } catch (e) { console.warn('depth pass: default config:', e.message); }
  }

  async _loadSpriteMap() {
    try { this.spriteMap = (await loadJson(this.config.npcSpriteMap)).map || {}; } catch (e) { console.warn('npc sprites off:', e.message); this.spriteMap = {}; }
  }

  async _loadWarmth() {
    try { this.warmth = await loadJson(this.config.warmthTints); } catch (e) { console.warn('warmth off:', e.message); this.warmth = null; }
  }

  /** Cached image load; null (with a warning) if it fails, so one bad sprite never stops the scene. */
  img(url) {
    if (!url) return Promise.resolve(null);
    if (!this.imgCache.has(url)) this.imgCache.set(url, loadImage(url).catch((e) => { console.warn(e.message); return null; }));
    return this.imgCache.get(url);
  }

  /** After a map becomes current: gates, stateful props, NPCs, spots, follower, sprites. */
  async _enterMap() {
    const m = this.map;
    m.applyGates(this.flags);
    this.applyProps();
    this.spots = this._spotsFor(m);
    this.standCells = new Set(this.spots.map((sp) => sp.stand ? sp.stand[0] + ',' + sp.stand[1] : null).filter(Boolean));
    this.npcs.build(m, this.spriteMap, this.phase); // by_phase NPCs (club_int rebel_dj) are placed for the phase on entry
    this.decals = [];
    this.life.enter(m);
    this.nightfx.enter(m);
    this.systems?.onMapEnter(m); // [systems-gd hook] satchels solid, puzzle state onto the map
    this._placeFollower();
    await this._loadActorSprites();
  }

  mapUrl(name) { return this.config.mapsDir + name + '.json'; }

  async loadMap(name) {
    if (!this.mapCache.has(name)) {
      this.mapCache.set(name, loadJson(this.mapUrl(name)).then(async (j) => {
        const c = structuredClone(j); // gates / props mutate layers: never touch the shared JSON
        const lm = this.lines?.maps?.[name];
        if (lm) { // lines exist for the pending NPCs / signs: place them (text_ref is a fallback key)
          c.npcs = [...(c.npcs || []), ...(c.npcs_pending_text || []).filter((d) => this._entryFor(name, d))];
          c.signs = [...(c.signs || []), ...(c.signs_pending_text || []).filter((d) => this._entryFor(name, d))];
          // Batch 3 (Oct 22, 2026): the new interiors keep theirs in text_pending {npcs, signs}; same rule (has lines -> placed,
          // an id already in npcs/signs wins). text_pending.interact_spots are NOT wired (props/cradles: Gary's call).
          const tp = c.text_pending || {};
          const add = (have, extra) => { const ids = new Set(have.map((d) => d.id)); return [...have, ...extra.filter((d) => !ids.has(d.id) && this._entryFor(name, d))]; };
          c.npcs = add(c.npcs, tp.npcs || []);
          c.signs = add(c.signs, tp.signs || []);
        }
        c.npcs = (c.npcs || []).filter((d) => d.kind !== 'spawn'); // house_2f player_start is a spawn, not a person
        const m = new GameMap(c);
        if (!this.tilesetIndex) this.tilesetIndex = indexTileset(await loadJson(resolveUrl(m.tilesetRef, this.mapUrl(name))));
        return m.attachTileset(this.tilesetIndex.byId);
      }));
    }
    try { return await this.mapCache.get(name); } catch (e) { this.mapCache.delete(name); throw e; }
  }

  /** Load the tileset set + player sheets that match the current integer zoom (+ the 1x set for graded draws). */
  ensureAssets() { return (this._assetsLatest = this._ensureAssets()); }

  async _ensureAssets() {
    const want = this.zoom === 2 || this.zoom === 3 ? this.zoom : 1;
    // Rotate zoom fix (Oct 23, 2026): every call gets a ticket; a load that finishes after a newer call (phone turned from
    // portrait zoom 4 / 1x art to landscape zoom 2 / 2x art while the 1x files were still downloading) must not put the old set back.
    const ticket = (this._assetTicket = (this._assetTicket || 0) + 1);
    const tsUrl = resolveUrl(tilesetFileForZoom(this.map.tilesetRef, want), this.mapUrl(this.map.name));
    if (!this.tileset || this.tileset.url !== tsUrl) { const ts = await loadTileset(tsUrl); if (ticket !== this._assetTicket) return this._assetsSettled(); this.tileset = ts; }
    const ts1 = resolveUrl(tilesetFileForZoom(this.map.tilesetRef, 1), this.mapUrl(this.map.name));
    if (this.grades && (!this.tileset1x || this.tileset1x.url !== ts1)) { const t1 = want === 1 ? this.tileset : await loadTileset(ts1); if (ticket !== this._assetTicket) return this._assetsSettled(); this.tileset1x = t1; }
    if (this.playerScale !== want) {
      const sheets = this.config.playerSheets, imgs = {}, imgs1 = {};
      await Promise.all(Object.keys(sheets).map(async (k) => {
        try { imgs[k] = await loadImage(sheets[k][want]); imgs1[k] = want === 1 ? imgs[k] : await loadImage(sheets[k][1]); }
        catch (e) { if (k === 'walk') throw e; console.warn(e.message); }
      }));
      if (ticket !== this._assetTicket) return this._assetsSettled();
      this.playerImgs = imgs; this.playerImgs1 = imgs1;
      this.playerScale = want;
      await this._loadActorSprites();
    }
    if (ticket !== this._assetTicket) return this._assetsSettled();
    if (this.sheetScale !== want) return this.ensureAssets(); // zoom moved on without a new call: load the set it wants now
  }

  /** A superseded ensureAssets() resolves when the newest call has finished (callers that await it still get the right art). */
  _assetsSettled() { return this._assetsLatest; }

  get sheetScale() { return this.zoom === 2 || this.zoom === 3 ? this.zoom : 1; }

  /** NPC sheets (1x + current scale) and the lead creature's sheet + Warmth mask (1x). */
  async _loadActorSprites() {
    const base = this.config.pixelDir, k = this.sheetScale, jobs = [];
    for (const n of this.npcs.list) {
      const sp = n.sprite;
      if (!sp?.overworld_sheet) continue;
      const scaled = k === 1 ? sp.overworld_sheet : sp[`overworld_sheet_${k}x`];
      jobs.push(Promise.all([this.img(base + sp.overworld_sheet), this.img(scaled && base + scaled)]).then(([a, b]) => { n.imgs = { 1: a, [k]: b || null }; }));
    }
    const lead = this.party[0];
    if (lead && this.follower) {
      const rel = `creatures/${lead.species}/overworld/${lead.species}_ow_sheet.png`;
      const hasTint = !!this.warmth?.creatures?.[lead.species];
      jobs.push(Promise.all([this.img(base + rel), hasTint ? this.img(this.config.warmthDir + `masks/${lead.species}/overworld/${lead.species}_ow_sheet.png`) : null])
        .then(([sheet, mask]) => { this.follower.sheet = sheet; this.follower.mask = mask; this.follower.rel = rel; }));
    }
    await Promise.all(jobs);
  }

  /** Mobile (fitCanvas) only. Phone squish fix, Oct 23, 2026: the listeners used to be attached at the END of init(), so a URL bar
   *  collapse or a portrait-to-landscape turn during the load left the backing store at the old size while the CSS box (100vw x 100dvh)
   *  had moved on: the frame was stretched until the next rotation. Now every source of viewport change re-measures from the start. */
  _watchViewport() {
    const re = () => this.resize();
    window.addEventListener('resize', re);
    window.visualViewport?.addEventListener('resize', re);
    window.visualViewport?.addEventListener('scroll', re);
    window.addEventListener('orientationchange', () => { re(); setTimeout(re, 250); this._settle(1500); });
    // Rotate zoom fix (Oct 23, 2026): the 'turn sideways' overlay hides on this media query (landscape.js); re-measure from
    // the same signal for 1.5 s, since iOS can report the landscape box a few frames after the overlay is gone.
    window.matchMedia?.('(orientation: portrait)')?.addEventListener?.('change', () => { re(); this._settle(1500); });
    document.addEventListener('fullscreenchange', re);
    document.addEventListener('webkitfullscreenchange', re);
    window.addEventListener('pageshow', () => this._settle()); // back/forward cache restore, returning from the home screen
    window.addEventListener('load', () => this._settle());
    if (typeof ResizeObserver === 'function') new ResizeObserver(re).observe(this.canvas); // the canvas's own CSS box (100dvh)
    this._settle();
  }

  /** Re-measure every animation frame for ~1 s (iOS reports the final bar state a few frames late, without an event). */
  _settle(ms = 1000) {
    const until = performance.now() + ms;
    if (this._settleUntil > performance.now()) { this._settleUntil = Math.max(this._settleUntil, until); return; }
    this._settleUntil = until;
    const step = () => { this.resize(); if (performance.now() < this._settleUntil) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }

  /** Mobile (fitCanvas) only, every frame. Rotate zoom fix (Oct 23, 2026; Gary's iPhone: after portrait -> landscape the
   *  frame stayed at the portrait backing store and zoom 4, stretched over the landscape box). Events can be missed or arrive
   *  before the new size is laid out, so the loop itself compares the backing store with the CSS box x dpr and re-sizes on any
   *  difference: the landscape view always matches a fresh landscape load. One getBoundingClientRect per frame. */
  _fitCheck() {
    const dpr = window.devicePixelRatio || 1, r = this.canvas.getBoundingClientRect();
    if (r.width > 0 && r.height > 0 && (Math.round(r.width * dpr) !== this.canvas.width || Math.round(r.height * dpr) !== this.canvas.height)) this.resize();
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    let w = Math.round(window.innerWidth * dpr), h = Math.round(window.innerHeight * dpr);
    if (this.opts.platform?.profile?.display?.fitCanvas) { // mobile full screen pass: backing store = the canvas's own CSS box (100dvh), pc unchanged
      const r = this.canvas.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) { w = Math.round(r.width * dpr); h = Math.round(r.height * dpr); }
    }
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w; this.canvas.height = h;
      this.renderer.resetContext(); // resizing a canvas resets imageSmoothingEnabled to true
    }
    const z = this.opts.zoom || pickZoom(h, this.opts.platform?.profile?.zoom); // zoom table from the platform profile (src/platform/*.json)
    if (z !== this.zoom) { this.zoom = z; if (this.map) this.ensureAssets(); }
  }

  // ---- world callbacks for the mover -------------------------------------------------------
  worldApi() {
    const m = this.map;
    return {
      query: (x, y, dir, mode) => m.query(x, y, dir, mode),
      onBump: (x, y, dir, who, q) => this._onBump(q),
      onStepStart: (x, y) => {
        this._onPlayerStep(x, y);
        // grass rustle: the entered cell plus the tips tile above it (README: tips sync with the cell)
        if (m.encounter(x, y) || this._isRustleTile(x, y)) {
          this.audio?.sfx('grass');
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
    if (this.map) this.applyProps();
    if (!this.flags.has('has_bike') && this.player.mode === MoveMode.BIKE) this.player.mode = MoveMode.WALK;
    this.log.push({ tick: this.tick, type: 'flag', flag, on, opened });
    this._dirty = true;
    return opened;
  }

  /** Text Bot line(s) for a dotted path in overworld_lines.json, with {button} names filled in; null if missing. */
  text(path) {
    let v = this.lines;
    for (const k of path.split('.')) v = v?.[k];
    if (v == null) return null;
    const pages = Array.isArray(v) ? v : [String(v)];
    return this.fill(pages).join('\n');
  }

  /** Control words for {run_button}/{bike_button}/{confirm_button}: the active profile's controls.prompts for the last device
   *  used (pc keyboard/controller, mobile touch); CONFIG.buttonNames is the fallback. Re-resolved per page, never saved. */
  promptVars() {
    const profile = this.opts.platform?.profile;
    return promptVars(profile, promptScheme(profile, this.input?.lastDevice), this.config.buttonNames);
  }

  /** Placeholder values (lines _meta.placeholders + button names). {nick} is re-picked per conversation. */
  textVars() {
    const lead = this.party[0];
    const player = this.config.playerName;
    let nick = player;
    if (this.config.ronNicknames) nick = fillText(pickNick(this.lines?.ron_nicknames, this.flags) || player, { player });
    return {
      ...this.promptVars(), player, nick, coins: coinCount(this.flags),
      lead: lead ? lead.nickname || cap(lead.species) : null,
      rt_number: lead?.rt || this.config.rtNumberPlaceholder,
    };
  }

  fill(pages, vars = this.textVars()) { return (pages || []).map((t) => fillText(t, vars)); }

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
    if (kind === 'door') this.audio?.sfx('door');
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
      await this.ensureAssets();
      const wasBike = this.player.mode === MoveMode.BIKE;
      this.player.place(x, y, facing);
      if (wasBike && (this._doorDismount || !target.movement.bike)) {
        this.player.mode = MoveMode.WALK;
        if (!target.movement.bike) this.toast(this.text(this._isCave(target) ? 'items.bike.cave' : 'items.bike.indoors') || 'No riding here.');
      }
      this._doorDismount = false; this._lastBumpMsg = null;
      this.rustles.clear();
      await this._enterMap();
      this._dirty = true;
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

  // ---- stateful props: bin, flag swaps, world props, windows ---------------------------------
  tileId(name) { return this.tilesetIndex && [...this.tilesetIndex.byId.values()].find((t) => t.name === name)?.id; }

  /** Ron's bin stage shown on the tile: 'empty' after finale_done, else coins (all_badges = 8). */
  binStage() {
    if (this.flags.has('finale_done')) return 'empty';
    return this.flags.has('all_badges') ? 8 : coinCount(this.flags);
  }

  /** Re-apply every flag-driven tile on the current map (call on load and on any flag change). */
  applyProps() {
    const m = this.map, j = m.json;
    this.overlays = [];
    const bs = j.bin_stages;
    if (bs) {
      const st = bs.empty_flag && this.flags.has(bs.empty_flag) ? 'empty' : this.binStage();
      m.setTile(bs.layer || 'decoration', bs.x, bs.y, bs.tiles[String(st)]);
      if (st !== 'empty' && st >= (bs.overlay_from_stage ?? 99)) {
        const id = m.tileByName(bs.overlay_tile)?.id;
        if (id) this.overlays.push({ x: bs.x, y: bs.y, id });
      }
      this.binShown = st;
    }
    // flag_swaps (props.js): chained per cell from the map's own tile; "any" + later entries win (club_int flyer wall)
    if (j.flag_swaps?.length) {
      if (!m._swapBase) { // the map's own tiles under every swapped cell, captured once per map instance
        m._swapBase = new Map();
        for (const fs of j.flag_swaps) { const L = fs.layer || 'decoration', k = `${L}|${fs.x}|${fs.y}`; if (!m._swapBase.has(k)) m._swapBase.set(k, m.tile(L, fs.x, fs.y)); }
      }
      const nameOf = (L, x, y) => { const id = m._swapBase.get(`${L}|${x}|${y}`); return id ? this.tilesetIndex?.byId.get(id)?.name ?? null : null; };
      for (const c of resolveFlagSwaps(j.flag_swaps, this.flags, nameOf)) if (c.tile != null && c.tile !== 'any') m.setTile(c.layer, c.x, c.y, c.tile);
    }
    for (const sp of j.interact_spots || []) {
      const wp = sp.world_prop;
      if (!wp?.states) continue; // station_int handcar: new padlock after beat_master_frostspire (state_rule)
      const st = wp.states.new_padlock && this.flags.has('beat_master_frostspire') ? 'new_padlock' : Object.keys(wp.states)[0];
      m.setTile('decoration', wp.x, wp.y, wp.states[st]);
    }
  }

  /** Tile id swaps for the renderer: phase tiles (windows 1185-1192) follow the OUTDOOR phase, even indoors. */
  swapMap() {
    const ph = this.phase;
    if (this._swapFor === ph) return this._swap;
    const sw = new Map();
    for (const t of this.tilesetIndex?.byId.values() || []) {
      const st = t.states;
      if (st && PHASES.every((p) => st[p] != null) && st[ph] !== t.id) sw.set(t.id, st[ph]);
    }
    this._swapFor = ph; this._swap = sw;
    return sw;
  }

  // ---- clock + phase -----------------------------------------------------------------------
  get hour() { return Math.floor(this.clock.min / 60) % 24; }
  get phase() { return phaseForHour(this.hour); }
  get gradeName() { return this.grades ? gradeFor(this.map?.name, this.phase) : 'day'; }
  /** Prepared grade for the map: CONFIG.litGreensAtNight (default off, ?litgreens=) swaps in the lit-greens copy (lighting.js). */
  mapGrade() {
    const g = this.grades?.[this.gradeName] || null, on = this.opts.litGreens ?? this.config.litGreensAtNight;
    return this.nightfx.grade(g && wantsLitGreens(on, this.map?.name, this.gradeName) ? litGreensGrade(g) : g, this.gradeName);
  }
  setHour(h) { this.clock.min = (((h % 24) + 24) % 24) * 60; this._dirty = true; return this.phase; }

  zone() {
    const zs = (this.layout?.zones || []).filter((z) => (z.maps || []).includes(this.map?.name));
    if (zs.length <= 1) return zs[0]?.id || null;
    return zs.find((z) => z.maps.includes(this.lastDoor?.map))?.id || zs[0].id; // shared interior: the town you came from
  }

  // ---- footprints + follower ---------------------------------------------------------------
  _footprintType(x, y) {
    const fp = this.tilesetIndex?.meta.ambient?.footprints;
    const name = this.tilesetIndex?.byId.get(this.map.tile('ground', x, y))?.name;
    if (!fp || !name) return null;
    for (const [type, pre] of Object.entries(fp.ground_prefixes)) if (pre.some((p) => name.startsWith(p))) return type;
    return null;
  }

  /** A walker leaves (x, y) facing dir: drop a fading footprint if the ground takes prints (never on the bike). */
  leavePrint(x, y, dir, bike) {
    if (bike) return;
    const type = this._footprintType(x, y);
    const name = type && this.tilesetIndex.meta.ambient.footprints.tiles[type]?.[dir];
    const id = name && this.map.tileByName(name)?.id;
    if (!id) return;
    this.decals = this.decals.filter((d) => !(d.x === x && d.y === y));
    this.decals.push({ x, y, id, t0: this.ms });
    if (this.decals.length > FOOTPRINT_MAX) this.decals.splice(0, this.decals.length - FOOTPRINT_MAX);
  }

  _decalsView() {
    const out = [];
    this.decals = this.decals.filter((d) => {
      const a = this.tilesetIndex.byId.get(d.id)?.animation, seq = [a?.idle_frame ?? 0, ...(a?.frames || [])], age = this.ms - d.t0;
      const i = Math.floor(age / (a?.frame_ms || 1333));
      if (i >= seq.length) return false;
      out.push({ x: d.x, y: d.y, id: d.id, frame: seq[i] });
      return true;
    });
    return out;
  }

  _onPlayerStep(tx, ty) {
    const p = this.player;
    this.leavePrint(p.x, p.y, p.facing, p.mode === MoveMode.BIKE);
    const f = this.follower;
    if (f && !(f.x === p.x && f.y === p.y)) {
      this.leavePrint(f.x, f.y, f.facing, false);
      f.fromX = f.x; f.fromY = f.y; f.x = p.x; f.y = p.y;
      f.facing = f.x > f.fromX ? 'right' : f.x < f.fromX ? 'left' : f.y > f.fromY ? 'down' : f.y < f.fromY ? 'up' : f.facing;
      f.stepping = true;
    }
  }

  _placeFollower() {
    const lead = this.party[0];
    if (!lead) { this.follower = null; return; }
    const p = this.player, b = DELTA[OPPOSITE[p.facing]], bx = p.x + b.x, by = p.y + b.y;
    const ok = this.map.inBounds(bx, by) && this.map.code(bx, by) === Col.WALK && !this.map.npcAt(bx, by);
    const prev = this.follower;
    this.follower = { species: lead.species, x: ok ? bx : p.x, y: ok ? by : p.y, fromX: null, fromY: null, facing: p.facing, stepping: false,
      sheet: prev?.species === lead.species ? prev.sheet : null, mask: prev?.species === lead.species ? prev.mask : null, rel: prev?.rel };
  }

  /** Lead Warmth 0-100 (saved). Returns the new tint stage. */
  setWarmth(w, i = 0) {
    const c = this.party[i];
    if (!c) return null;
    c.warmth = clampWarmth(w); this._dirty = true;
    return warmthStage(c.warmth);
  }

  async setLead(species, { nickname = null, warmth = 0, rt = null } = {}) {
    const had = this.party.find((c) => c.species === species && (rt == null || c.rt === rt)) || {}; // [systems-gd hook] keep the whole creature (uid/level/hp/xp)
    this.party = [{ ...had, species, nickname, warmth: clampWarmth(warmth), rt }, ...this.party.filter((c) => c !== had)]; // [systems-gd hook]
    this._placeFollower(); await this._loadActorSprites(); this._dirty = true;
  }

  // ---- interaction --------------------------------------------------------------------------
  /** Lines entry for a map NPC/sign: maps.<map>.<id>, else the def's text_ref ("overworld_lines.json <path>"). */
  _entryFor(mapName, def) {
    const e = getPath(this.lines, `maps.${mapName}.${def.id}`);
    if (e) return e;
    const ref = /overworld_lines\.json\s+([\w.]+)/.exec(def.text_ref || '')?.[1];
    return ref ? getPath(this.lines, ref) : null;
  }

  /** Interact spots: map interact_spots (geometry, source of truth) merged over the lines entry. */
  _spotsFor(m) {
    const ls = this.lines?.maps?.[m.name] || {};
    return (m.json.interact_spots || []).filter((sp) => isActive(sp, this.flags)) // active_when: no spot (no text, no stand cell) until the flag
      .map((sp) => ({ ...(ls[sp.id] || {}), ...sp, key: `maps.${m.name}.${sp.id}` }));
  }

  env(extra = {}) {
    const lead = this.party[0], ms = this.ms;
    const element = lead && this.warmth?.creatures?.[lead.species]?.element;
    return {
      phase: this.phase, hour: this.hour, counters: this.counters, zone: this.zone(), facing: this.player.facing,
      isSeen: (k) => !!this.seen[k], seenToday: (k) => this.seenDay[k] === this.clock.day,
      lead: lead ? { species: lead.species, nickname: lead.nickname, type: element || lead.type || null } : null,
      party: this.party, stillS: (ms - this.stillSince) / 1000,
      idleAfterHealS: this.healedAt == null ? -1 : (ms - Math.max(this.healedAt, this.stillSince)) / 1000,
      binStage: this.binShown ?? null,
      ...extra,
    };
  }

  /** Pick + remember a line: once / dream_unseen -> seen, once_per_day -> seenDay. */
  pick(block, key, extra) {
    const line = pickLine(block, this.flags, this.env(extra), key);
    if (line) {
      const lk = key + '#' + line.id;
      if (line.when?.once || line.when?.dream_unseen) this.seen[lk] = true;
      if (line.when?.once_per_day) this.seenDay[lk] = this.clock.day;
      this.log.push({ tick: this.tick, type: 'line', key, id: line.id });
      this._dirty = true;
    }
    return line;
  }

  bump(counter, n = 1) { this.counters[counter] = (this.counters[counter] || 0) + n; this._dirty = true; return this.counters[counter]; }

  /** Show pages in the dialogue box (falls back to a toast without one). */
  say(pages, speaker) {
    pages = this.fill(pages);
    this.log.push({ tick: this.tick, type: 'say', speaker: speaker?.name || null, text: pages.join('\n') });
    if (!this.dialog) { this.toast(pages.join('\n')); return Promise.resolve(); }
    return this.dialog.say(pages, speaker && { zoom: this.zoom, ...speaker });
  }

  ask(pages, choices, speaker) {
    pages = this.fill(pages);
    this.log.push({ tick: this.tick, type: 'ask', text: pages.join('\n') });
    if (!this.dialog) { this.toast(pages.join('\n')); return Promise.resolve(choices.length - 1); }
    return this.dialog.ask(pages, choices, speaker && { zoom: this.zoom, ...speaker });
  }

  /** Run a dialogue script; the player is frozen until it ends. */
  async script(fn) {
    if (this.busy) return;
    this.busy = true; this.player.locked = true;
    try { await fn(); } catch (e) { console.error(e); }
    finally { this.busy = false; this.player.locked = !!this.fade; this.saveNow(); }
  }

  interact() {
    if (this.busy) return;
    const p = this.player, d = DELTA[p.facing];
    const fx = p.x + d.x, fy = p.y + d.y, m = this.map;
    if (this.systems?.onInteract(fx, fy)) return; // [systems-gd hook] pickups, crystal switches, starter cradles
    // 1) interact spots on the faced cell (props; triggers fire by standing, see _checkTriggers)
    const spot = this.spots.find((sp) => sp.kind !== 'trigger' && sp.x === fx && sp.y === fy);
    if (spot) { this.script(() => this.runSpot(spot)); return; }
    // 2) signs / NPCs / gates; reach over a counter or desk (up to 3 cells) like the healer and station clerk
    for (let k = 1; k <= 3; k++) {
      const x = p.x + d.x * k, y = p.y + d.y * k;
      if (!m.inBounds(x, y)) break;
      const sign = m.signs.find((sg) => sg.x === x && sg.y === y);
      if (sign) { this.readSign(sign); return; }
      const occ = m.npcAt(x, y), npcDef = occ?.def || occ;
      const gate = m.storyGates.find((g) => g.npc && npcDef && g.npc.id === npcDef.id) || (k === 1 && m.gateAt(x, y) && !m.gateCleared(m.gateAt(x, y)) ? m.gateAt(x, y) : null);
      if (gate) { this.toast(this.gateText(gate, m.gateCleared(gate))); return; }
      if (occ) { this.talk(occ.def ? occ : null, npcDef); return; }
      const c = m.code(x, y);
      if (c === Col.WALK || c === Col.DOOR || c === Col.PLATE) break; // open floor: nothing further away answers
    }
  }

  readSign(sign) {
    const e = this._entryFor(this.map.name, sign);
    if (!e) { this.toast(sign.text); return; } // no Text Bot line yet: dev label (unchanged behaviour)
    this.script(async () => { const line = this.pick(e, `maps.${this.map.name}.${sign.id}`); await this.say(line?.pages || e.pages); });
  }

  speakerFor(n, battle = false) {
    const sp = n?.sprite, base = this.config.pixelDir, e = n && this._entryFor(this.map.name, n.def);
    const name = e?.name || (n?.id === 'ron' || /^ron_/.test(n?.id || '') ? 'Ron' : null);
    return { name, portrait: sp?.portraits?.neutral ? base + sp.portraits.neutral : null, battle: battle && sp?.trainer_64x128 ? base + sp.trainer_64x128 : null };
  }

  talk(n, def) {
    const mapName = this.map.name, key = `maps.${mapName}.${def.id}`, e = this._entryFor(mapName, def);
    this.log.push({ tick: this.tick, type: 'talk', npc: def.id });
    if (!e) return;
    this.script(async () => {
      if (n) this.npcs.beginTalk(n);
      try {
        const sp = this.speakerFor(n);
        if (e.battle_lost) { // trainer: challenge -> battle hook -> lost line; later talks use `after`
          const dk = `defeated:${mapName}.${def.id}`;
          if (this.seen[dk]) { await this.say(e.after || this.pick(e, key)?.pages, sp); return; }
          const line = this.pick(e, key);
          await this.say(line?.pages || e.pages, this.speakerFor(n, true));
          const won = this.hooks.onBattle ? await this.hooks.onBattle({ map: mapName, id: def.id }) : true; // battles: later pass
          this.log.push({ tick: this.tick, type: 'battle', npc: def.id, won });
          const story = trainerOutcome(mapName, def.id, won !== false); // battles default v1: flags / gift (src/battle/story.js)
          const gift = story.gift && this.lines?.items?.[story.gift];
          const giving = gift && !this.flags.has(gift.flag);
          if (won !== false) {
            this.seen[dk] = true; await this.say(e.battle_lost, sp);
            await this.systems?.onTrainerWin({ map: mapName, def, speaker: sp }); // [systems-gd hook] prize money (awardBattleMoney)
          } else if (story.continueOnLoss) { // Ron 1 (CRITICAL_PATH §2): the story goes on win or lose, no blackout
            this.seen[dk] = true; await this.say(e.battle_won || [], sp);
            if (this.systems) { this.systems.lastBattle = null; this.systems.party?.healAll?.(); } // free patch-up, no copay / warp (question for Gary)
          } else { // the trainer's line comes BEFORE the blackout warp; `defeated:` stays unset so they can be re-challenged
            await this.say(e.battle_won || [], sp);
            await this.systems?.onTrainerLoss({ map: mapName, def }); // [systems-gd hook] wiped team: copay + warp (onPartyFainted)
          }
          if (giving) { await this.say(gift.giver_pages || [], sp); await this.say(gift.received || []); } // items.<gift> text (Text Bot)
          for (const f of story.flags) if (!this.flags.has(f)) this.setFlag(f);
          if (giving) await this.say(gift.tip || []);
          return;
        }
        const line = this.pick(e, key);
        if (this.systems && await this.systems.onTalk({ mapName, def, entry: e, line, speaker: sp })) return; // [systems-gd hook] heal counter, shop clerk
        if (e.after_heal) { // healer: the line ends with the question
          const yes = (await this.ask(line?.pages || e.pages, ['Yes', 'No'], sp)) === 0;
          if (yes) { this.healedAt = this.ms; this.log.push({ tick: this.tick, type: 'heal' }); await this.say(e.after_heal, sp); }
          else await this.say(e.declined, sp);
          return;
        }
        await this.say(line?.pages || e.pages, sp);
        if (def.id === 'company_terminal') await this.openInbox();
      } finally { if (n) this.npcs.endTalk(n); }
    });
  }

  /** One interact spot (props + triggers). */
  async runSpot(sp) {
    if (sp.counter) this.bump(sp.counter);
    if (sp.id === 'bin_ron' && this.flags.has('all_badges') && !this.flags.has('finale_done')) this.bump('bin_inspects_after_8');
    if (sp.prompt_after_line) { // camps: the look line, then the prompt only after that line; Yes sets sets_flag
      const line = this.pick(sp, sp.key);
      await this.say(line?.pages || sp.pages);
      if ((line ? line.id : 'default') !== sp.prompt_after_line) return;
      if ((await this.ask(sp.prompt, sp.choices || ['Yes', 'No'])) !== 0) { if (sp.declined) await this.say(sp.declined); return; }
      if (sp.sets_flag) this.setFlag(sp.sets_flag);
      if (sp.use) await this.say(sp.use);
      return;
    }
    if (sp.prompt) { // bed: look, then "Lie down?" -> dream (once per coin) or nap
      await this.say(this.pick({ lines: (sp.lines || []).filter((l) => !l.when?.slept && !l.when?.dream_unseen) }, sp.key)?.pages || sp.pages);
      if ((await this.ask(sp.prompt, sp.choices || ['Yes', 'No'])) !== 0) return;
      const line = this.pick(sp, sp.key, { slept: true });
      if (line) await this.say(line.pages);
      return;
    }
    const line = this.pick(sp, sp.key);
    if (!line) return;
    await this.say(line.pages);
    const w = /lead \+(\d+) Warmth/.exec(line.effect || '');
    if (w && this.party[0]) this.setWarmth(this.party[0].warmth + +w[1]);
    if (line.id === 'bin_creature') { this.log.push({ tick: this.tick, type: 'encounter', source: sp.key }); this.hooks.onScriptedEncounter?.(sp.key); }
    if (sp.opens === 'company_inbox') await this.openInbox();
  }

  /** house_2f pc / heal centre terminal: company_inbox emails unlocked by flags, newest first; read state saved. */
  async openInbox() {
    const items = inboxEmails(this.lines?.company_inbox, this.flags).map((e) => ({ ...e, subject: fillText(e.subject, this.textVars()), pages: this.fill(e.pages) }));
    this.log.push({ tick: this.tick, type: 'inbox', count: items.length });
    if (!this.dialog) return;
    await this.dialog.inbox('Company inbox', items, (e) => !!this.seen['inbox#' + e.id], (e) => { this.seen['inbox#' + e.id] = true; this._dirty = true; });
  }

  /** Walk-on triggers (bridge_mid): standing on the stand cell while trigger_when holds; once per in-game day. */
  _checkTriggers() {
    const p = this.player;
    if (this.busy || this.fade || p.moving || p.state !== 'idle') return;
    for (const sp of this.spots) {
      if (sp.kind !== 'trigger' || !sp.stand || sp.stand[0] !== p.x || sp.stand[1] !== p.y) continue;
      const tk = 'trigger:' + sp.key;
      if (this.seenDay[tk] === this.clock.day) continue;
      if (!whenMatches(sp.trigger_when, this.env())) continue;
      this.seenDay[tk] = this.clock.day; this._dirty = true;
      this.log.push({ tick: this.tick, type: 'trigger', key: sp.key });
      this.script(() => this.runSpot(sp));
    }
  }

  // ---- text APIs for later passes (battles, catch flow, Vane, options menu) --------------------
  ronBattleOpener(battleId) { const b = this.lines?.ron_battle_openers?.[battleId]; return b ? this.fill(pickLine({ lines: b }, this.flags, this.env())?.pages) : null; }
  vaneLine() { return this.fill(pickLine(this.lines?.vane, this.flags, this.env())?.pages || null); }
  catalogueText(key, vars = {}) { const v = this.lines?.catalogue?.[key]; return Array.isArray(v) ? v.map((t) => fillText(t, { ...this.textVars(), ...vars })) : v ?? null; }
  comfortText(path) { return this.text('comfort.' + path); }
  ronNickname() { return this.textVars().nick; }

  toast(text) { this.opts.toast?.(text); this.log.push({ tick: this.tick, type: 'toast', text }); }

  // ---- save -------------------------------------------------------------------------------------
  saveData() {
    const p = this.player;
    return {
      flags: [...this.flags], counters: this.counters, seen: this.seen, seenDay: this.seenDay, clock: this.clock, party: this.party,
      pos: this.map && !this.fade ? { map: this.map.name, x: p.x, y: p.y, facing: p.facing } : this._lastPos || null, lastDoor: this.lastDoor,
      ...this.systems?.saveBlocks(), // [systems-gd hook] coins, bag, archive, systems
    };
  }

  saveNow() {
    this._dirty = false; this._sinceSave = 0;
    if (this.map && !this.fade) this._lastPos = { map: this.map.name, x: this.player.x, y: this.player.y, facing: this.player.facing };
    return this.store ? this.store.save(this.saveData()) : false;
  }

  // ---- loop -----------------------------------------------------------------------------------
  step(snap) {
    // ALPHA build: the debug overlay (F3 / ` / L3 / DBG) is off.
    const bEdge = (!!snap.b && !this._bPrev) || !!snap.bTap, dirEdge = snap.dir && snap.dir !== this._dirPrev ? snap.dir : null;
    this._bPrev = !!snap.b; this._dirPrev = snap.dir || null;
    const talking = this.dialog?.active;
    if (talking) this.dialog.handle({ a: !!snap.a, bEdge, dirEdge });
    else if (snap.a && !this.fade && !this.player.moving && !this.busy) this.interact();
    const input = talking || this.busy ? { ...snap, dir: null, b: false } : snap;
    if (snap.select && !talking && !this.busy) this.toggleBike();
    if (!input.dir) this._lastBumpMsg = null;
    this._updateMode(input);
    const p = this.player;
    const ev = p.tick(input, this.worldApi());
    for (const e of ev) if (e.type !== 'stepStart' && e.type !== 'stepEnd') this.log.push({ tick: this.tick, ...e });
    if (this.follower && !p.moving) this.follower.stepping = false;
    this.npcs.tick(!!this.fade);
    // standing-still timer (bridge trigger, sofa nap): any move, turn or mode change restarts it
    const sk = `${p.x},${p.y},${p.facing},${p.state},${p.mode}`;
    if (sk !== this._stillKey || p.moving) { this._stillKey = sk; this.stillSince = this.ms; }
    this._checkTriggers();
    if (this.timescale && advanceClock(this.clock, GAME_MIN_PER_TICK * this.timescale)) this._dirty = true;
    this.life.tick();
    if (this.log.length > 200) this.log.splice(0, this.log.length - 200);
    this._stepFade();
    if (++this._sinceSave >= AUTOSAVE_TICKS || (this._dirty && !this.busy && !this.fade)) this.saveNow();
    this.tick++;
  }

  frame(now) {
    if (this.opts.platform?.profile?.display?.fitCanvas) this._fitCheck(); // mobile: backing store always = CSS box x dpr (rotate zoom fix)
    if (!this.last) this.last = now;
    let dt = now - this.last; this.last = now;
    if (dt > 250) dt = 250; // tab was hidden: don't fast-forward
    this.acc += dt;
    const snap = this.input.poll();
    let n = 0;
    while (this.acc >= TICK_MS && n < MAX_TICKS_PER_FRAME) {
      this.step(n === 0 ? snap : { ...snap, a: false, bTap: false, debug: false, select: false });
      this.acc -= TICK_MS; n++;
    }
    if (n === MAX_TICKS_PER_FRAME) this.acc = 0;
    else if (n === 0 && (snap.a || snap.bTap || snap.debug || snap.select)) {
      this.input.aQueued ||= snap.a; this.input.bQueued ||= !!snap.bTap; this.input.debugQueued ||= snap.debug; this.input.selQueued ||= snap.select;
    }
    this._fpsN++; if (now - this._fpsT >= 500) { this.fps = Math.round((this._fpsN * 1000) / (now - this._fpsT)); this._fpsT = now; this._fpsN = 0; }
    this.render();
  }

  view() {
    const p = this.player, { px, py, lift } = p.pixel(), z = this.zoom;
    const prevCam = this._cam?.map === this.map ? this._cam : null; // platform camera rules (deadzone needs the last camera on this map)
    const cam = cameraFor(px + TILE / 2, py + TILE / 2, this.map.width, this.map.height, this.canvas.width / z, this.canvas.height / z, this.opts.platform?.profile?.camera, prevCam, { indoor: isIndoor(this.map.name) });
    this._cam = { map: this.map, x: cam.x, y: cam.y };
    const grade = this.mapGrade();
    const actors = [this._playerActor(px, py, lift, grade)];
    for (const n of this.npcs.list) { const a = this._npcActor(n, grade); if (a) actors.push(a); }
    const fa = this._followerActor(grade, p);
    if (fa) actors.push(fa);
    if (this.systems) actors.push(...this.systems.worldActors(grade)); // [systems-gd hook] supply satchels
    return {
      map: this.map, tileset: this.tileset, tileset1x: this.tileset1x, grade, gradeImage: this._gradeImage, emissive: this.emissiveMasks, swap: this.swapMap(),
      decals: this._decalsView(), overlays: this.overlays,
      zoom: z, cam, ms: this.ms, rustles: this.rustles, actors,
      fade: this.fadeAlpha(), debug: this.debug, drawDebug, player: p, fps: this.fps, lastDoor: this.lastDoor, flags: [...this.flags],
      life: this.life, depth: this.depth, nightfx: this.nightfx,
      outside: this.opts.platform?.profile?.display?.outsideMap, edgeShade: this.opts.platform?.profile?.display?.edgeShade, // mobile: fill around short maps (pc: unset = black)
    };
  }

  /** Pick the sheet: graded -> the 1x sheet through the LUT (cached); day -> the pre-scaled sheet for this zoom. */
  _sheet(imgs, imgs1, grade) {
    const k = this.sheetScale;
    if (grade && !grade.identity && imgs1) return { img: gradeImage(imgs1, grade, 'lut'), sheetScale: 1 };
    if (imgs) return { img: imgs, sheetScale: k };
    return { img: imgs1 || null, sheetScale: 1 };
  }

  _playerActor(px, py, lift, grade) {
    const p = this.player, f = p.frame(), imgs = this.playerImgs || {}, imgs1 = this.playerImgs1 || {};
    const anim = imgs[f.anim] ? f.anim : 'walk'; // a missing run/bike sheet falls back to the walk sheet
    const col = imgs[f.anim] ? f.col : Math.min(f.col, 4);
    return { ...this._sheet(imgs[anim], imgs1[anim], grade), col, row: SHEET_ROW[p.facing], px, py, lift, feet: py + TILE, anim: f.anim };
  }

  _npcActor(n, grade) {
    if (!n.imgs) return null;
    const mv = n.mover, { px, py, lift } = mv.pixel(), f = mv.frame();
    return { ...this._sheet(n.imgs[this.sheetScale], n.imgs[1], grade), col: Math.min(f.col, 4), row: SHEET_ROW[mv.facing], px, py, lift, feet: py + TILE, npc: n.id };
  }

  /** Lead creature, 64x64 ow sheet; Warmth tint (mask-only exact swaps, cached) then the time-of-day grade. */
  _followerActor(grade, p) {
    const f = this.follower;
    if (!f?.sheet) return null;
    let px = f.x * TILE, py = f.y * TILE;
    if (f.stepping && p.moving && f.fromX != null) {
      const pp = p.pixel(), t = Math.min(1, (Math.abs(pp.px - p.x * TILE) + Math.abs(pp.py - p.y * TILE)) / TILE);
      px = f.fromX * TILE + (f.x - f.fromX) * TILE * t; py = f.fromY * TILE + (f.y - f.fromY) * TILE * t;
    }
    const lead = this.party[0], tints = this.warmth?.creatures?.[f.species], stage = warmthStage(lead?.warmth || 0);
    let img = tintImage(f.sheet, f.mask, tints?.stages?.[String(stage)], stage, `${f.species}|${f.rel}|${stage}`);
    if (grade && !grade.identity) img = gradeImage(img, grade, 'lut');
    const col = f.stepping && p.moving ? p.frame().col : 0;
    return { img, sheetScale: 1, w: 64, h: 64, col: Math.min(col, 4), row: SHEET_ROW[f.facing], px: Math.round(px), py: Math.round(py), lift: 0, feet: py + TILE, order: -1, follower: f.species };
  }

  render() { if (this.map && this.tileset) this.renderer.draw(this.view()); }

  run() {
    const loop = (t) => { this.frame(t); this._raf = requestAnimationFrame(loop); };
    this._raf = requestAnimationFrame(loop);
  }

  /** Snapshot for tests and the debug console. */
  state() {
    const p = this.player, v = this.map ? this.view() : null, lead = this.party[0];
    return {
      map: this.map?.name, x: p.x, y: p.y, facing: p.facing, state: p.state, mode: p.mode, stepMode: p.stepMode, speedMultiplier: p.speedMultiplier,
      frame: p.frame(), dur: p.dur, flags: [...this.flags], gatesCleared: this.map ? this.map.storyGates.filter((g) => this.map.gateCleared(g)).map((g) => g.id) : [],
      pixel: p.pixel(), cam: v?.cam, zoom: this.zoom, tileSize: this.tileset?.size, debug: this.debug,
      fading: !!this.fade, warpCount: this.warpCount, lastDoor: this.lastDoor, tick: this.tick,
      canvas: { w: this.canvas.width, h: this.canvas.height }, smoothing: this.renderer.ctx.imageSmoothingEnabled,
      counters: { ...this.counters }, clock: { ...this.clock }, hour: this.hour, phase: this.phase, grade: this.gradeName, litGreens: !!this.mapGrade()?.name?.endsWith('+greens'), zone: this.zone(),
      busy: this.busy, dialog: this.dialog?.active ? { text: this.dialog.text.textContent, name: this.dialog.name.hidden ? null : this.dialog.name.textContent, portrait: !this.dialog.portrait.hidden, battle: !this.dialog.battle.hidden } : null,
      npcs: this.npcs.list.map((n) => ({ id: n.id, x: n.x, y: n.y, facing: n.mover.facing, moving: n.mover.moving, sprite: n.sprite?.sprite_id || null, drawn: !!n.imgs?.[1] })),
      lead: lead ? { ...lead, stage: warmthStage(lead.warmth) } : null, follower: this.follower && { x: this.follower.x, y: this.follower.y, facing: this.follower.facing, loaded: !!this.follower.sheet },
      binStage: this.binShown ?? null, decals: this.decals.length, spots: this.spots.map((sp) => sp.id), life: this.life.state(), depth: this.depth.state(v), nightfx: this.nightfx.state(),
      log: this.log.slice(-30),
    };
  }
}
