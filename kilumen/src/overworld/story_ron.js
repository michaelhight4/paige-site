// Kilumen: story Ron + Ron's partner on the overworld (DEV, Oct 23 2026).
// Gary 2:21 PM CT: "room mate is missing at work and the lab". Gary 2:22 PM CT: "also need to show which one room mate
// chooses on the map behind him like our mc".
//   - house_1f: after the morning briefing Ron walks to the front door and leaves ("I'll be right behind you"); until
//     job_briefed (new game only) the house_1f Ron is not shown (he is at work / racing you on the test run).
//   - office_int (talked_ron_morning, not promoted): a temporary Ron (house_1f.ron sprite) comes in with you and stands
//     next to you in front of the manager. lab_brookhollow (promoted, until job_briefed, not during the run): same, next
//     to you at the cradles. He faces whoever is speaking.
//   - Lab, "Then I'll take this one": Ron walks to his counter-pick cradle (RON_COUNTER), the case goes dark (taken) and his
//     creature comes out and follows him. After "Race you" / the job briefing he walks out the door and is removed.
//   - Ron's partner: every Ron NPC after got_starter (story Ron, house_1f.ron, fernwick.ron_rival_1, later kind 'rival' /
//     gd_class 'ron' / ron_* NPCs) is trailed by his counter creature exactly like the player's follower (64x64 ow sheet,
//     moves into Ron's previous cell, interpolated with his step). Evolved form when that Ron's authored team uses one and
//     its ow sheet loads; else the base form.
// No map JSON, no overworld.js edit: drawing is an instance wrap of scene.view / scene.render (like src/overnight/index.js).
import { Npc, OPPOSITE } from './npcs.js?v=v0.2.100-alpha';
import { TILE, SHEET_ROW, DELTA } from './constants.js?v=v0.2.100-alpha';
import { gradeImage } from './palette.js?v=v0.2.100-alpha';
import { automoveOn } from './automove.js?v=v0.2.100-alpha';
import { HOME, OPEN } from './intro.js?v=v0.2.100-alpha';
import { RON_COUNTER, STARTER_LINES, partyStarter, starterOf } from '../battle/data/starters.js?v=v0.2.100-alpha';
import { authoredTeam } from '../battle/data/trainer_teams.js?v=v0.2.100-alpha';
import { applyRonWhereabouts } from './ron_whereabouts.js?v=v0.2.100-alpha'; // v0.2.49: Ron home between Masters, in the next town only (Gary 8:54 AM CT Oct 29)

export const STORY_RON = { id: 'ron_story', sprite: 'house_1f.ron', walkMs: 6000 };

/** Any Ron on the map (not the pre-starter "too dangerous" catch, which never has a partner anyway). */
export function isRonNpc(n) {
  const id = n?.id || '', d = n?.def || {};
  if (!id || id === 'ron_catch') return false;
  return id === HOME.ron || id === STORY_RON.id || /^ron_/.test(id) || /_ron(_|\d|$)/.test(id) || d.kind === 'ron' || d.kind === 'rival' || d.gd_class === 'ron';
}

/** Where the temporary story Ron belongs right now ('office' | 'lab' | null). New game only. */
export function storyRonWhere(flags, mapName) {
  if (!flags.has(HOME.started) || flags.has(OPEN.briefed)) return null;
  if (mapName === OPEN.office) return flags.has(HOME.briefed) && !flags.has(OPEN.promoted) ? 'office' : null;
  if (mapName === OPEN.lab && flags.has(OPEN.promoted)) return !flags.has(OPEN.runStarted) || flags.has(OPEN.runDone) ? 'lab' : null;
  return null;
}

/** house_1f's own Ron is away: briefed, until the job briefing (new game only). */
export function homeRonAway(flags, mapName) {
  return mapName === HOME.downstairs && flags.has(HOME.started) && flags.has(HOME.briefed) && !flags.has(OPEN.briefed);
}

const owned = (s) => { const sys = s.systems; return sys ? [...(sys.party?.list || []), ...(sys.archive?.boxes || []).flat()] : [...(s.party || [])]; };

/** Ron's partner species for this NPC: {species, base}. base = counter of the player's starter; species = the evolved
 *  member of that line if this Ron's authored team uses one (caller falls back to base when its sheet is missing). */
export function ronPalSpecies(scene, npc = null) {
  const mine = partyStarter(owned(scene));
  const base = RON_COUNTER[mine];
  if (!base) return null;
  let species = base;
  const line = STARTER_LINES[base] || [base];
  try {
    const team = npc ? authoredTeam({ map: npc.mapName, id: npc.id }, owned(scene)) : null;
    const rows = team || (Array.isArray(npc?.def?.team) ? npc.def.team : []);
    const hit = rows.map((r) => r?.species).filter((sp) => sp && starterOf(sp) === starterOf(base)).sort((a, b) => line.indexOf(b) - line.indexOf(a))[0];
    if (hit) species = hit;
  } catch { /* no team data: base form */ }
  return { species, base };
}

/** Counter-pick cradle id for the player's species (cfg.starterCradles order). */
export function ronCradleFor(cradles, playerSpecies) {
  const want = RON_COUNTER[starterOf(playerSpecies) || playerSpecies];
  return Object.keys(cradles || {}).find((k) => cradles[k] === want) || null;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
/** Poll until pred() or ms; gives up early when the scene loop is not ticking (headless tests / paused tab): a walk can
 *  never finish then, so the caller's place() fallback runs at once instead of a multi-second stall. */
async function until(pred, ms, s = null) {
  const t0 = Date.now(), k0 = s?.tick;
  while (!pred() && Date.now() - t0 < ms) { await sleep(16); if (s && Date.now() - t0 > 150 && s.tick === k0) break; }
  return !!pred();
}
const dirTo = (a, b) => { const dx = b.x - a.x, dy = b.y - a.y; if (!dx && !dy) return null; return Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'); };
const speakerNpcId = (name) => ({ Manager: OPEN.manager, 'Lab Tech': OPEN.researcher })[name] || null; // lazy: intro.js <-> story_ron.js import cycle

export class StoryRon {
  /** @param {import('./intro.js?v=v0.2.100-alpha').HomeStart} intro */
  constructor(intro) {
    this.intro = intro; this.scene = intro.scene;
    this.pals = new Map();   // Ron Npc -> partner {species, x, y, fromX, fromY, facing, stepping, lead, sheet}
    this.taken = new Set();  // lab cradle ids shown empty (Ron's counter-pick, the player's pick)
    this.focus = null;       // the NPC the current scene is addressed to (manager / lab tech)
    this.leaving = null;     // Ron walking out (kept through the away rule until he is gone)
    this._map = null; this._wrapped = false;
    this._k = null; this.live = false; // live: the scene loop is ticking (headless tests call tick() by hand: walks set down at once)
  }

  _sleep(ms) { return this.live ? sleep(ms) : Promise.resolve(); }

  /** Free for Ron: intro's rule (walk floor, no NPC / warp / player) and not the player's partner either. */
  _free(x, y) {
    const f = this.scene.follower;
    return this.intro._free(x, y) && !(f && f.x === x && f.y === y);
  }

  /** The temporary story Ron on this map, or null. */
  npc() { return this.scene.npcs?.byId?.(STORY_RON.id) || null; }

  tick() {
    const s = this.scene, F = s.flags, map = s.map?.name;
    if (!s.map || !s.npcs) return;
    this.live = this._k != null && s.tick !== this._k; this._k = s.tick;
    this._wrap();
    if (map !== this._map) { this._map = map; this.pals.clear(); this.leaving = null; this.focus = null; this._syncTaken(); this.where = applyRonWhereabouts(this, isRonNpc); }
    if (homeRonAway(F, map)) { const h = s.npcs.byId(HOME.ron); if (h && h !== this.leaving) this.remove(h); }
    const where = storyRonWhere(F, map), cur = this.npc();
    if (where && !cur) this.spawn();
    else if (!where && cur && cur !== this.leaving && !s.busy && !s.fade) this.remove(cur); // flags moved on (dev links): never a stray Ron
    if (F.has(OPEN.starter)) this._tickPals();
    else if (this.pals.size) this.pals.clear();
  }

  /** Cradles shown empty on entering the lab after got_starter: the player's and Ron's. */
  _syncTaken() {
    const s = this.scene, cradles = s.systems?.cfg?.starterCradles || OPEN.cradles;
    this.taken = new Set();
    if (s.map?.name !== OPEN.lab || !s.flags.has(OPEN.starter)) return;
    const mine = partyStarter(owned(s));
    if (!mine) return;
    const pk = Object.keys(cradles).find((k) => cradles[k] === mine), rk = ronCradleFor(cradles, mine);
    if (pk) this.taken.add(pk);
    if (rk) this.taken.add(rk);
  }

  /** Temporary Ron next to the player (he came in through the door with you). */
  spawn() {
    const s = this.scene, m = s.map, p = s.player, it = this.intro;
    const side = { up: ['left', 'right'], down: ['right', 'left'], left: ['up', 'down'], right: ['down', 'up'] }[p.facing] || ['left', 'right'];
    let c = null;
    for (const d of [...side, OPPOSITE[p.facing], p.facing]) { const x = p.x + DELTA[d].x, y = p.y + DELTA[d].y; if (it._free(x, y)) { c = { x, y }; break; } }
    for (let d = 2; d <= 4 && !c; d++) c = it._cellAlong(p.x, p.y, side[0], d) || it._cellAlong(p.x, p.y, side[1], d);
    if (!c) return null;
    const n = new Npc({ id: STORY_RON.id, kind: 'object', x: c.x, y: c.y, facing: p.facing, story: true }, m.name, s.spriteMap?.[STORY_RON.sprite] || null, false);
    n.behaviour = 'static';
    s.npcs.list.push(n); m.occupy?.(n.x, n.y, n);
    loadNpcImgs(s, n);
    s.log.push({ tick: s.tick, type: 'storyRon', step: 'spawn', map: m.name, x: n.x, y: n.y });
    return n;
  }

  loadImgs(n) { loadNpcImgs(this.scene, n); }

  remove(n) {
    const s = this.scene;
    if (!n) return;
    s.npcs.list = s.npcs.list.filter((x) => x !== n);
    s.map?.vacate?.(n.x, n.y, n); s.map?.vacate?.(n.mover.tx, n.mover.ty, n);
    this.pals.delete(n);
    if (this.leaving === n) this.leaving = null;
    s.log.push({ tick: s.tick, type: 'storyRon', step: 'remove', id: n.id, map: s.map?.name });
  }

  /** Walk Ron to (x,y) (pathing walkTo); not there in time / no route: set him down there. */
  async walk(n, x, y, ms = STORY_RON.walkMs) {
    const s = this.scene;
    if (!n || (n.x === x && n.y === y)) return true;
    n.talking = false; n.paused = 0;
    if (this.live && s.npcs.walkTo(n.id, x, y, { stay: true })) await until(() => (n.x === x && n.y === y && !n.mover.moving) || !s.npcs.list.includes(n), ms, s);
    n.goal = null; n.script = [];
    if (!s.npcs.list.includes(n)) return false;
    if (n.x !== x || n.y !== y) { if (!this._free(x, y)) return false; this.scene.map?.vacate?.(n.mover.tx, n.mover.ty, n); this.intro._placeNpc(n, x, y); }
    return true;
  }

  /** Start Ron toward the speaker while the player auto-walks (not awaited): the cell beside the speaker's front. */
  kick(speaker) {
    const n = this.npc(), s = this.scene;
    if (!n || !speaker || !automoveOn(s)) return;
    const f = DELTA[speaker.mover?.facing || 'down'], fx = speaker.x + f.x, fy = speaker.y + f.y;
    for (const [dx, dy] of f.x ? [[0, 1], [0, -1]] : [[1, 0], [-1, 0]]) {
      const x = fx + dx, y = fy + dy;
      if (this._free(x, y)) { s.npcs.walkTo(n.id, x, y, { stay: true }); return; }
    }
  }

  /** Ron next to the player, facing the speaker (walks with automove on, else placed). */
  async join(speaker) {
    const s = this.scene, p = s.player, n = this.npc();
    this.focus = speaker || null;
    if (!n) return null;
    if (n.goal || n.script.length) await until(() => !n.goal && !n.script.length && !n.mover.moving, 3000, s);
    const near = Math.abs(n.x - p.x) + Math.abs(n.y - p.y) === 1 && !(speaker && n.x === speaker.x && n.y === speaker.y);
    if (!near) {
      const perp = p.facing === 'up' || p.facing === 'down' ? ['left', 'right'] : ['up', 'down'];
      const cells = [...perp, OPPOSITE[p.facing]].map((d) => ({ x: p.x + DELTA[d].x, y: p.y + DELTA[d].y })).filter((c) => this._free(c.x, c.y));
      if (speaker) cells.sort((a, b) => (Math.abs(a.x - speaker.x) + Math.abs(a.y - speaker.y)) - (Math.abs(b.x - speaker.x) + Math.abs(b.y - speaker.y)));
      const c = cells[0];
      if (c) { if (automoveOn(s)) await this.walk(n, c.x, c.y, 4000); else this.intro._placeNpc(n, c.x, c.y); }
    }
    n.goal = null; n.script = [];
    if (speaker) n.mover.facing = dirTo(n, speaker) || n.mover.facing;
    s.log.push({ tick: s.tick, type: 'storyRon', step: 'join', map: s.map?.name, x: n.x, y: n.y, facing: n.mover.facing, by: speaker?.id || null });
    return n;
  }

  /** _scene hook, before each speaker run: Ron faces whoever is talking (himself talking: the scene's focus);
   *  the player turns to Ron when he talks, back to the focus otherwise. */
  faceFor(name) {
    const s = this.scene, n = this.npc(), p = s.player;
    if (!n || n.mover.moving) return;
    const who = speakerNpcId(name) ? (s.npcs.byId(speakerNpcId(name)) || (name === 'Manager' && s.npcs.byId('trip_boss')) || this.focus) : this.focus; // trip_boss: the boss who walked you to the lab (escort.js)
    if (name === 'Ron') {
      if (this.focus) n.mover.facing = dirTo(n, this.focus) || n.mover.facing;
      if (!p.moving && Math.abs(n.x - p.x) + Math.abs(n.y - p.y) <= 2) p.facing = dirTo(p, n) || p.facing;
    } else if (who) {
      n.mover.facing = dirTo(n, who) || n.mover.facing;
      if (!p.moving && this.focus) p.facing = dirTo(p, this.focus) || p.facing;
    }
  }

  /** "Then I'll take this one": Ron walks to his counter-pick cradle, the case goes dark, his creature comes out. */
  async takeCradle(playerSpecies) {
    const s = this.scene, cradles = s.systems?.cfg?.starterCradles || OPEN.cradles, n = this.npc();
    const id = ronCradleFor(cradles, playerSpecies);
    const mineId = Object.keys(cradles).find((k) => cradles[k] === playerSpecies);
    if (mineId) this.taken.add(mineId);
    const spot = (s.map?.json?.text_pending?.interact_spots || []).find((sp) => sp.id === id);
    if (!id || !spot) return null;
    const stand = spot.stand ? { x: spot.stand[0], y: spot.stand[1] } : { x: spot.x, y: spot.y + 1 };
    if (n) {
      await this.walk(n, stand.x, stand.y, 5000);
      n.mover.facing = dirTo(n, spot) || 'up';
      await this._sleep(320);
    }
    this.taken.add(id);
    s.log.push({ tick: s.tick, type: 'storyRon', step: 'take', cradle: id, species: cradles[id], at: n ? { x: n.x, y: n.y } : null });
    if (n) {
      this._palFor(n, { x: spot.x, y: spot.y, facing: 'down' }); // out of the case
      await this._sleep(240);
      n.mover.facing = dirTo(n, s.player) || n.mover.facing;
    }
    return id;
  }

  /** Ron walks to the door and is gone (story Ron by default; house_1f's Ron after the briefing). */
  async walkOut(n = this.npc(), to = HOME.outside) {
    const s = this.scene, m = s.map;
    if (!n || !m) return false;
    this.leaving = n;
    const door = (m.warps || m.json?.warps || []).find((w) => w.to === to) || (m.warps || m.json?.warps || [])[0];
    s.log.push({ tick: s.tick, type: 'storyRon', step: 'walkOut', id: n.id, map: m.name });
    if (door) {
      const cells = ['up', 'left', 'right', 'down'].map((d) => ({ x: door.x + DELTA[d].x, y: door.y + DELTA[d].y })).filter((c) => this._free(c.x, c.y) || (c.x === n.x && c.y === n.y));
      const c = cells[0];
      if (c) {
        n.talking = false; n.paused = 0;
        if (this.live && s.npcs.walkTo(n.id, c.x, c.y, { stay: false })) await until(() => (n.x === c.x && n.y === c.y && !n.mover.moving) || !s.npcs.list.includes(n), STORY_RON.walkMs, s);
        if (n.x === c.x && n.y === c.y) { n.mover.facing = dirTo(n, door) || n.mover.facing; await this._sleep(200); }
      }
    }
    this.remove(n);
    return true;
  }

  // ---- Ron's partner (follower) ---------------------------------------------------------------------------------------
  _palFor(n, at = null) {
    const s = this.scene, m = s.map;
    let pal = this.pals.get(n);
    if (pal) return pal;
    const sp = ronPalSpecies(s, n);
    if (!sp) return null;
    let c = at;
    if (!c) {
      const b = DELTA[OPPOSITE[n.mover.facing] || 'up'];
      const ok = (x, y) => m.inBounds?.(x, y) && m.code(x, y) === 0 && !m.npcAt?.(x, y) && !m.warpAt?.(x, y) && !(s.player.x === x && s.player.y === y);
      c = ok(n.x + b.x, n.y + b.y) ? { x: n.x + b.x, y: n.y + b.y } : null;
      for (const d of ['down', 'left', 'right', 'up']) { if (c) break; const x = n.x + DELTA[d].x, y = n.y + DELTA[d].y; if (ok(x, y)) c = { x, y }; }
      c = c ? { ...c, facing: n.mover.facing } : { x: n.x, y: n.y, facing: n.mover.facing };
    }
    pal = { species: sp.species, base: sp.base, x: c.x, y: c.y, fromX: null, fromY: null, facing: c.facing || 'down', stepping: false, lead: `${n.mover.tx},${n.mover.ty}`, sheet: null };
    this.pals.set(n, pal);
    this._loadPal(pal);
    s.log.push({ tick: s.tick, type: 'storyRon', step: 'pal', id: n.id, species: pal.species, x: pal.x, y: pal.y });
    return pal;
  }

  async _loadPal(pal) {
    const s = this.scene;
    if (!s.img) return;
    const base = s.config?.pixelDir || '', url = (sp) => `${base}creatures/${sp}/overworld/${sp}_ow_sheet.png`;
    const get = async (u) => { try { return await s.img(u); } catch { return null; } }; // headless stubs may throw
    let img = await get(url(pal.species));
    if (!img && pal.species !== pal.base) { img = await get(url(pal.base)); if (img) pal.species = pal.base; }
    pal.sheet = img || null;
  }

  _ronTook() {
    const s = this.scene, cradles = s.systems?.cfg?.starterCradles || OPEN.cradles, rk = ronCradleFor(cradles, partyStarter(owned(s)));
    return !!rk && this.taken.has(rk);
  }

  /** Same rule as the player's follower: when Ron starts a step, his partner moves into the cell he is leaving. */
  _tickPals() {
    const s = this.scene;
    for (const n of [...this.pals.keys()]) if (!s.npcs.list.includes(n)) this.pals.delete(n);
    for (const n of s.npcs.list) {
      if (!isRonNpc(n)) continue;
      if (n.id === STORY_RON.id && s.map?.name === OPEN.lab && !this.pals.has(n) && !this._ronTook()) continue; // lab: his comes out of the case
      const pal = this._palFor(n);
      if (!pal) continue;
      const mv = n.mover, lead = `${mv.tx},${mv.ty}`;
      if (mv.moving && lead !== pal.lead) {
        pal.lead = lead;
        if (!(pal.x === n.x && pal.y === n.y)) {
          pal.fromX = pal.x; pal.fromY = pal.y; pal.x = n.x; pal.y = n.y;
          pal.facing = pal.x > pal.fromX ? 'right' : pal.x < pal.fromX ? 'left' : pal.y > pal.fromY ? 'down' : pal.y < pal.fromY ? 'up' : pal.facing;
          pal.stepping = true;
        }
      } else if (!mv.moving) { pal.lead = lead; pal.stepping = false; }
    }
  }

  /** 64x64 actor for one partner (same shape as Overworld._followerActor). */
  palActor(n, pal, grade) {
    if (!pal?.sheet) return null;
    const mv = n.mover;
    let px = pal.x * TILE, py = pal.y * TILE, col = 0;
    if (pal.stepping && mv.moving && pal.fromX != null) {
      const pp = mv.pixel(), t = Math.min(1, (Math.abs(pp.px - mv.x * TILE) + Math.abs(pp.py - mv.y * TILE)) / TILE);
      px = pal.fromX * TILE + (pal.x - pal.fromX) * TILE * t; py = pal.fromY * TILE + (pal.y - pal.fromY) * TILE * t;
      col = mv.frame?.().col || 0;
    }
    let img = pal.sheet;
    if (grade && !grade.identity) { try { img = gradeImage(img, grade, 'lut'); } catch { /* ungraded */ } }
    const cell = Math.round((img.naturalWidth || img.width) / 5) || 64; // 96 px cells for the big ow sheets (else half-cut)
    return { img, sheetScale: 1, w: cell, h: cell, col: Math.min(col, 4), row: SHEET_ROW[pal.facing] ?? 0, px: Math.round(px), py: Math.round(py), lift: 0, feet: py + TILE, order: -1, follower: pal.species, ronPal: n.id };
  }

  /** Instance wraps (overworld.js untouched): partners into view().actors, taken cases darkened after render(). */
  _wrap() {
    const s = this.scene;
    if (this._wrapped || typeof s.view !== 'function') return;
    this._wrapped = true;
    const view = s.view.bind(s);
    s.view = () => {
      const v = view();
      try { for (const [n, pal] of this.pals) { const a = this.palActor(n, pal, v.grade); if (a) v.actors.push(a); } } catch { /* never break a frame */ }
      return v;
    };
    if (typeof s.render === 'function') {
      const render = s.render.bind(s);
      s.render = () => { render(); try { this.drawTaken(); } catch { /* never break a frame */ } };
    }
  }

  /** Taken cradles: the glass goes dark (no light in the case). Screen-space like sight.js's spark. */
  drawTaken() {
    const s = this.scene, ctx = s.renderer?.ctx, cam = s._cam;
    if (!ctx || !cam || !this.taken.size || s.map?.name !== OPEN.lab) return;
    const z = s.zoom || 1, spots = s.map.json?.text_pending?.interact_spots || [];
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    for (const sp of spots) {
      if (!this.taken.has(sp.id)) continue;
      const x = (sp.x * TILE - cam.x) * z, y = ((sp.y - 1) * TILE - cam.y) * z, w = TILE * z;
      ctx.fillStyle = 'rgba(16, 10, 30, 0.55)';
      ctx.fillRect(x + w * 0.22, y + w * 0.18, w * 0.56, w * 1.0);
    }
    ctx.restore();
  }
}

/** Ron's sheet (house_1f.ron in npc_sprite_map), same load as Overworld._loadActorSprites. */
export function loadNpcImgs(s, n) {
  const sp = n.sprite;
  if (!sp?.overworld_sheet || !s.img) return;
  const base = s.config.pixelDir, k = s.sheetScale, scaled = k === 1 ? sp.overworld_sheet : sp[`overworld_sheet_${k}x`];
  Promise.all([s.img(base + sp.overworld_sheet), s.img(scaled && base + scaled)]).then(([a, b]) => { n.imgs = { 1: a, [k]: b || null }; }).catch(() => {});
}
