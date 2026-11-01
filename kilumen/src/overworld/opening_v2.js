// Kilumen opening v2 (Gary, Oct 31 2026). Replaces the old cold open (wake in the bedroom) for NEW games:
//   title -> Ondravel (end-game guardian) "Tell me who you are" (name) -> "Show me who you are" (male / female model)
//   -> wake in route1's grass north of Brookhollow (home) in forced rain -> step out of the grass: a scripted battle with a
//   random region-1 cute Kilu, one move "Offer company feed" that always works -> it becomes your secret companion
//   -> walk south home with it -> black -> wake in the bedroom (old HomeStart flow from there: Ron, office, lab...).
// The companion waits in the bedroom (static sprite) until flg_promoted, then joins the party with origin.noQuest so it
// never counts toward the lab's catch quest (intro.js ownedLogged). Walking north toward Fernwick during the rain scene:
// "I really need to get home and out of this rain." and the player turns to face Brookhollow.
// Old saves (no open2_active flag, or open2_done) never run any of this. ?opening=v1 keeps the old bedroom cold open.
// All text: text/overworld_lines.json "opening_v2" (Text Bot owns it); FALLBACK below is used when a key is missing.
import { onTap } from '../shared/tap_guard.js?v=v0.2.113-alpha';
import { runFeedBattle } from './feed_battle.js?v=v0.2.113-alpha';

export const OPEN2 = Object.freeze({
  map: 'route1', home: 'brookhollow', bedroom: 'house_2f',
  spawn: { map: 'route1', x: 21, y: 37, facing: 'down' }, // route1 grass patch x19-23 y35-38, north of Brookhollow (padded frame)
  northCut: 34,                                            // arriving at y <= 34 on route1 = heading north to Fernwick
  active: 'open2_active', fed: 'open2_fed', done: 'open2_done', joined: 'open2_companion_joined',
  nameKey: 'open2:name', modelKey: 'open2:model', compKey: 'open2:companion',
  zone: 'sunmeadow_grass', // data/encounters_wired.json zone whose slots carry cute_r1 (region-1 cute pool)
  nameMax: 12,
});

/** Region-1 cute pool (cute_r1 slots of data/encounters_wired.json sunmeadow_grass). Weights from the file. */
export const CUTE_R1 = Object.freeze([
  { species: 'mossmote', weight: 4 }, { species: 'drizzlebill', weight: 4 }, { species: 'buoyling', weight: 4 },
  { species: 'pandember', weight: 4 }, { species: 'gladlet', weight: 2 }, { species: 'lumoris', weight: 2 },
]);
export const COMPANION_LEVEL = 3;

/** Female model: vil_commuter_f's chibi walk sheet + run/bike sheets built from it on Cal's grids (run 6x4, bike 5x4, 64x96 cells; fix1). */
export const MODELS = Object.freeze({
  male: { label: 'Male', card: 'art/characters/pixel/humans/cal/trainer/cal_trainer_64x128_2x.png', sheets: null },
  female: { label: 'Female', card: 'art/characters/pixel/humans/mira/trainer/mira_trainer_64x128_2x.png',
    sheets: { walk: { 1: 'art/characters/pixel/npcs/vil_commuter_f/overworld/vil_commuter_f_chibi_sheet.png',
      2: 'art/characters/pixel/npcs/vil_commuter_f/overworld/vil_commuter_f_chibi_sheet_2x.png',
      3: 'art/characters/pixel/npcs/vil_commuter_f/overworld/vil_commuter_f_chibi_sheet_3x.png' },
      run: { 1: 'art/characters/pixel/npcs/vil_commuter_f/run_bike/vil_commuter_f_chibi_run_sheet.png', 2: 'art/characters/pixel/npcs/vil_commuter_f/run_bike/vil_commuter_f_chibi_run_sheet_2x.png', 3: 'art/characters/pixel/npcs/vil_commuter_f/run_bike/vil_commuter_f_chibi_run_sheet_3x.png' },
      bike: { 1: 'art/characters/pixel/npcs/vil_commuter_f/run_bike/vil_commuter_f_chibi_bike_sheet.png', 2: 'art/characters/pixel/npcs/vil_commuter_f/run_bike/vil_commuter_f_chibi_bike_sheet_2x.png', 3: 'art/characters/pixel/npcs/vil_commuter_f/run_bike/vil_commuter_f_chibi_bike_sheet_3x.png' },
    } },
});

export const FALLBACK = Object.freeze({
  ondravel_name: ['Tell me who you are.'],
  name_hint: ['Type your name'],
  name_ok: ['OK'],
  ondravel_model: ['Show me who you are.'],
  ondravel_after: ['{player}... Remember that name. We will meet again.'],
  wake_grass: ['...Rain? Why am I lying in the grass?', 'This is route 1. Brookhollow is just south of here.', 'I need to get home.'],
  turn_back: ['I really need to get home and out of this rain.'],
  wild_appears: ['A wild {companion} wandered out of the grass!'],
  move_feed: ['Offer company feed'],
  feed_used: ['{player} offered some company feed.'],
  feed_success: ['{companion} ate every bit! It looks like it wants to come with you.'],
  after_feed: ['{companion} is following me...', 'Using company feed on a wild Kilu... No one can know, or I might lose my job.'],
  walk_home: ['Okay, home. Quietly.'],
  wake_room: ['...Morning already?', '{companion} is still here. So it was not a dream.', 'It has to stay in my room for now.'],
  room_companion: ['{companion} curls up by the bed. It has to stay hidden for now.'],
  companion_joins: ['Now that you are a field researcher, {companion} can come along openly!', '{companion} joined your team.'],
});

/** Line pages from text/overworld_lines.json opening_v2.<key> (array, {pages}, {lines}), else the fallback. */
export function openLines(lines, key) {
  const v = lines?.opening_v2?.[key];
  const p = Array.isArray(v) ? v : Array.isArray(v?.pages) ? v.pages : Array.isArray(v?.lines) ? v.lines : null;
  return p && p.length ? p : FALLBACK[key];
}

/** Weighted roll over the cute pool; rnd in [0,1). */
export function rollCompanion(rnd = Math.random, pool = CUTE_R1) {
  const total = pool.reduce((a, s) => a + s.weight, 0);
  let r = rnd() * total;
  for (const s of pool) { if ((r -= s.weight) < 0) return s.species; }
  return pool[pool.length - 1].species;
}

/** True for the opening companion (never counts for the lab's catch quest). */
export const isNoQuest = (c) => !!(c && c.origin && c.origin.noQuest);

/** Clean a typed name: trim, collapse spaces, strip control/markup chars, cap length. Empty -> fallback. */
export function cleanName(raw, fallback = 'Cal') {
  const s = String(raw ?? '').replace(/[\u0000-\u001f<>{}]/g, '').replace(/\s+/g, ' ').trim().slice(0, OPEN2.nameMax);
  return s || fallback;
}

/** New games run v2 unless ?opening=v1 or ?skipintro=1 (handled by the caller). */
export const opening2On = (q) => q?.get?.('opening') !== 'v1';

/** Which step a route1 arrival means: 'north' (turn back), 'battle' (left the grass), or null. */
export function arrivalBeat({ fed, wasGrass, grass, y }) {
  if (y <= OPEN2.northCut) return 'north';
  if (!fed && wasGrass && !grass) return 'battle';
  return null;
}

/** Identity applied to the frozen config: { ...config, playerName, playerSheets (female walk) }. */
export function identityConfig(config, name, model) {
  const out = { ...config };
  if (name) out.playerName = name;
  const m = MODELS[model];
  if (m?.sheets) out.playerSheets = { ...config.playerSheets, ...m.sheets };
  return out;
}

export class OpeningV2 {
  constructor(scene, { run = false } = {}) {
    this.scene = scene; this.run = !!run; // run: this game plays the sequence (new game or a save mid-opening)
    this.holding = false; this.wx = null; this.wasGrass = true; this._homePending = false; this._joinBusy = false;
  }

  get S() { return this.scene.seen; }
  get companion() { return this.S?.[OPEN2.compKey] || null; }
  lines(key, extra = {}) {
    const s = this.scene, c = this.companion;
    const vars = { ...(s.textVars ? s.textVars() : {}), companion: c ? cap(c.species) : 'it', ...extra };
    return (openLines(s.lines, key) || []).map((t) => String(t).replace(/\{(\w+)\}/g, (m, k) => vars[k] ?? m));
  }
  get inSequence() { const F = this.scene.flags; return F.has(OPEN2.active) && !F.has(OPEN2.done); }

  /** Name + model from the save onto the config (every load). */
  applyIdentity() {
    const s = this.scene, name = this.S?.[OPEN2.nameKey], model = this.S?.[OPEN2.modelKey];
    if (!name && !model) return;
    const before = s.config.playerSheets;
    s.config = identityConfig(s.config, name, model);
    if (s.config.playerSheets !== before) s.playerScale = null; // ensureAssets reloads the player sheets
  }

  /** Spawn for init (new game): route1 grass. */
  static spawn() { return { ...OPEN2.spawn }; }

  /** After the first map + _enterMap (Overworld.init via HomeStart.begin). */
  begin() {
    const s = this.scene;
    if (!this.run) return;
    if (!s.flags.has(OPEN2.active)) s.setFlag(OPEN2.active);
    if (s.map?.name === 'route1' && s.npcs?.list?.length) { s.npcs.list = []; s.map.resetOccupancy?.([]); } // fix1: no route1 trainers in the rain (back after the bedroom wake)
    if (!s.seen[OPEN2.nameKey]) { // identity first: black until the title closes, then Ondravel
      this.holding = true; s.fade = { phase: 'hold', t: 0, len: 75 }; s.player.locked = true;
      s.log.push({ tick: s.tick, type: 'open2', step: 'hold' });
    }
    this.weather();
  }

  /** Every tick (HomeStart.tick first). Returns true while it owns the frame (HomeStart skips its own beats). */
  tick() {
    const s = this.scene;
    if (this.holding) {
      const g = s.opts?.introGate?.();
      if (g) return true;
      this.holding = false;
      s.script(async () => {
        await this.identity();
        if (s.fade) { s.fade.phase = 'in'; s.fade.t = 0; }
        this.weather();
        await this._until(() => !s.fade, 4000);
        await s.say(this.lines('wake_grass'), THOUGHT_SP);
        s.log.push({ tick: s.tick, type: 'open2', step: 'wake_grass' });
      });
      return true;
    }
    if (this._homePending && !s.busy && !s.fade && s.map?.name === OPEN2.home) { this._homePending = false; s.script(() => this.goHome()); }
    if (this.joinDue() && !this._joinBusy && !s.busy && !s.fade && !s.intro?._tripPending) { this._joinBusy = true; s.script(() => this.joinNow()).finally(() => { this._joinBusy = false; }); } // fallback (a save promoted before joining)
    return this.inSequence && !s.flags.has(OPEN2.fed) ? true : false;
  }

  /** Ondravel's two questions (DOM over black). Headless (no document): defaults. */
  async identity() {
    const s = this.scene;
    const r = globalThis.document && !s.opts?.headlessIdentity ? await identityOverlay(this) : { name: null, model: 'male' };
    const name = cleanName(r.name, s.config.playerName || 'Cal');
    s.seen[OPEN2.nameKey] = name; s.seen[OPEN2.modelKey] = r.model === 'female' ? 'female' : 'male'; s._dirty = true;
    this.applyIdentity();
    try { await s.ensureAssets(); } catch { /* keep Cal's sheet */ }
    s.log.push({ tick: s.tick, type: 'open2', step: 'identity', name, model: s.seen[OPEN2.modelKey] });
  }

  /** Rain on route1/brookhollow while the sequence runs (weather_lite rain layer + living-world wet). */
  weather() {
    const s = this.scene, on = this.inSequence && [OPEN2.map, OPEN2.home].includes(s.map?.name);
    s.life?.setWeather?.(on ? 'rain' : 'fair');
    if (on && !this.wx && globalThis.document) {
      import('../region56/weather_lite.js?v=v0.2.113-alpha').then((m) => {
        if (this.wx || !this.inSequence) return;
        const cv = document.querySelector('canvas');
        const host = cv?.parentNode || document.body, wrap = document.createElement('div'); // wrapper: weather_lite's cls() rewrites .wx's className
        wrap.className = 'wx-open2'; wrap.setAttribute('aria-hidden', 'true'); wrap.innerHTML = '<div class="o2-tint"></div>';
        host.insertBefore(wrap, cv?.nextSibling || null);
        const wx = m.mountWeather(wrap, { weather: 'rain' }), d0 = wx.destroy;
        wx.destroy = () => { d0(); wrap.remove(); }; this.wx = wx;
      }).catch(() => {});
    } else if (!on && this.wx) { this.wx.destroy(); this.wx = null; }
  }

  onEnterMap() {
    const s = this.scene;
    this.weather();
    if (this.inSequence && s.flags.has(OPEN2.fed) && s.map?.name === OPEN2.home) this._homePending = true;
    this.wasGrass = !!s.map?.encounter?.(s.player.x, s.player.y);
  }

  /** worldApi.onArrive (route1 only). true = handled (stop). */
  onArrive(x, y) {
    const s = this.scene;
    if (!this.inSequence || s.map?.name !== OPEN2.map) return false;
    const grass = !!s.map.encounter(x, y), beat = arrivalBeat({ fed: s.flags.has(OPEN2.fed), wasGrass: this.wasGrass, grass, y });
    this.wasGrass = grass;
    if (beat === 'north') { this.turnBack(); return true; }
    if (beat === 'battle') { s.script(() => this.battle()); return true; }
    return false;
  }

  /** worldApi.onEdge: 'go' = allowed (home, after the feed), true = refused here, false = not ours. */
  onEdge(exit) {
    const s = this.scene;
    if (!this.inSequence || s.map?.name !== OPEN2.map) return false;
    if (exit?.to === OPEN2.home && s.flags.has(OPEN2.fed)) return 'go';
    if (exit?.to === OPEN2.home) return false;
    this.turnBack(); return true;
  }

  turnBack() {
    const s = this.scene;
    s.log.push({ tick: s.tick, type: 'open2', step: 'turnBack', x: s.player.x, y: s.player.y });
    s.script(async () => {
      await s.say(this.lines('turn_back'), THOUGHT_SP);
      const p = s.player; p.facing = 'down'; // face Brookhollow (home, south)
      p._attempt?.('down', s.worldApi(), []);
      await this._until(() => !p.moving, 1500);
    });
  }

  async battle() {
    const s = this.scene;
    const species = this.companion?.species || rollCompanion(s.opts?.rnd || Math.random);
    s.seen[OPEN2.compKey] = { species, level: COMPANION_LEVEL }; s._dirty = true;
    s.log.push({ tick: s.tick, type: 'open2', step: 'battle', species });
    if (globalThis.document && !s.opts?.headlessIdentity) {
      await runFeedBattle({ scene: s, species, level: COMPANION_LEVEL, name: cap(species), model: this.S[OPEN2.modelKey],
        lines: { appear: this.lines('wild_appears'), move: this.lines('move_feed')[0], used: this.lines('feed_used'), success: this.lines('feed_success') } });
    }
    s.setFlag(OPEN2.fed);
    try { s.systems?.kilindex?.markSeen?.(species); } catch { /* optional */ }
    s._placeFollower(); await s._loadActorSprites();
    await s.say(this.lines('after_feed'), THOUGHT_SP);
    s.log.push({ tick: s.tick, type: 'open2', step: 'fed', species });
  }

  /** Brookhollow reached with the companion: black, wake in the bedroom. */
  async goHome() {
    const s = this.scene;
    await s.say(this.lines('walk_home'), THOUGHT_SP);
    const { bedroomSpawn } = await import('./intro.js?v=v0.2.113-alpha');
    let spawn = null; try { spawn = bedroomSpawn((await s.loadMap(OPEN2.bedroom)).json); } catch { /* fallback below */ }
    const to = spawn || { map: OPEN2.bedroom, x: 12, y: 10, facing: 'down' }, n0 = s.log.length;
    await this._until(() => !s.fade, 4000); // startWarp is a no-op while another fade runs
    s.startWarp(to, 'edge');
    const landed = () => s.log.slice(n0).some((l) => l.type === 'warpEnd' && l.to === OPEN2.bedroom);
    await this._until(landed, 8000); // map is swapped before the player is placed (ensureAssets in between)
    if (s.map?.name === OPEN2.bedroom && (s.player.x !== to.x || s.player.y !== to.y)) s.player.place(to.x, to.y, to.facing || 'down');
    s.setFlag(OPEN2.done); s.seen['home:wake_seen'] = true; s._dirty = true;
    if (s.fade) s.fade.phase = 'hold';
    this.weather();
    s._placeFollower(); await s._loadActorSprites();
    await this._wait(1200);
    if (s.fade) { s.fade.phase = 'in'; s.fade.t = 0; s.fade.len = 75; }
    await this._until(() => !s.fade, 4000);
    await s.say(this.lines('wake_room'), THOUGHT_SP);
    s.log.push({ tick: s.tick, type: 'open2', step: 'wake_room' });
  }

  /** Follower stand-in while the companion is not in the party: trails on the walk home, sits still in the bedroom. */
  ghostLead() {
    const s = this.scene, c = this.companion, F = s.flags;
    if (!c || F.has(OPEN2.joined) || !F.has(OPEN2.fed)) return null;
    const map = s.map?.name;
    if (!F.has(OPEN2.done)) return [OPEN2.map, OPEN2.home].includes(map) ? { species: c.species, warmth: 0 } : null;
    if (map !== OPEN2.bedroom) return null;
    return { species: c.species, warmth: 0, static: true, ...this.roomSpot() };
  }

  /** A free floor tile next to the bed spawn (the companion's spot). */
  roomSpot() {
    const s = this.scene, m = s.map, e = m?.json?.player_start || (m?.json?.npcs || []).find((n) => n.kind === 'spawn' || n.id === 'player_start');
    const bx = e?.x ?? s.player.x, by = e?.y ?? s.player.y;
    for (const [dx, dy] of [[2, 0], [-2, 0], [1, 1], [-1, 1], [0, 2], [1, 0], [-1, 0]]) {
      const x = bx + dx, y = by + dy;
      if (m?.inBounds?.(x, y) && m.code(x, y) === 0 && !m.npcAt?.(x, y)) return { x, y };
    }
    return { x: bx + 1, y: by };
  }

  joinDue() { const F = this.scene.flags; return !!this.companion && F.has('flg_promoted') && F.has(OPEN2.done) && !F.has(OPEN2.joined); }

  /** flg_promoted (inside the promotion script): the companion joins the party (origin.noQuest) and the lines play. */
  async joinNow() {
    const s = this.scene, c = this.companion;
    if (!this.joinDue()) return false;
    const { createCreature } = await import('../systems/creature.js?v=v0.2.113-alpha');
    const cr = createCreature({ species: c.species, level: c.level || COMPANION_LEVEL, origin: { how: 'companion', noQuest: true, map: OPEN2.map } });
    if (s.systems?.party?.add) s.systems.party.add(cr); else s.party.push(cr);
    try { s.systems?.kilindex?.markCaught?.(c.species, { zone: OPEN2.map }); } catch { /* optional */ }
    s.setFlag(OPEN2.joined); s._dirty = true;
    s._placeFollower(); await s._loadActorSprites();
    s.log.push({ tick: s.tick, type: 'open2', step: 'joined', species: c.species });
    await s.say(this.lines('companion_joins'));
    return true;
  }

  _wait(ms) { return new Promise((r) => setTimeout(r, ms)); }
  async _until(pred, ms) { const t0 = Date.now(); while (!pred() && Date.now() - t0 < ms) await this._wait(16); }
}

const THOUGHT_SP = { name: null, portrait: null, battle: null, thought: true };
const cap = (w) => String(w || '').charAt(0).toUpperCase() + String(w || '').slice(1);

// ---- Ondravel identity overlay (DOM) --------------------------------------------------------------------------------
const CSS = `.open2-id{position:fixed;inset:0;z-index:60;background:#05060c;display:grid;place-items:center;font-family:var(--ui-font,inherit);color:#e8f0ff;touch-action:pan-y}
.open2-id .box{display:grid;justify-items:center;gap:14px;max-width:min(92vw,640px);text-align:center}
.open2-id .ond{width:min(30vh,256px);image-rendering:pixelated;filter:drop-shadow(0 0 18px #4692ce88);animation:open2f 3.2s ease-in-out infinite}
@keyframes open2f{50%{transform:translateY(-6px)}}
.open2-id .say{font-size:clamp(18px,3.2vh,28px);letter-spacing:.04em;color:#7ac2e8;text-shadow:0 0 10px #2d5ca0;min-height:1.4em}
.open2-id input{font:inherit;font-size:clamp(18px,3vh,26px);padding:8px 12px;width:min(70vw,320px);background:#101a30;color:#fff;border:2px solid #4692ce;border-radius:10px;text-align:center}
.open2-id .row{display:flex;gap:18px;justify-content:center}
.open2-id button{font:inherit;font-size:clamp(16px,2.6vh,22px);padding:8px 18px;background:#16274a;color:#e8f0ff;border:2px solid #4692ce;border-radius:10px;cursor:pointer}
.open2-id .card{display:grid;justify-items:center;gap:6px;padding:10px 16px}
.open2-id .card img{height:min(30vh,256px);image-rendering:pixelated}
.open2-id .card.sel,.open2-id button:focus-visible{border-color:#7ac2e8;box-shadow:0 0 0 3px #7ac2e866;background:#20386a}`;

function identityOverlay(op) {
  const doc = document, s = op.scene;
  if (!doc.getElementById('open2-css')) { const st = doc.createElement('style'); st.id = 'open2-css'; st.textContent = CSS; doc.head.appendChild(st); }
  const root = doc.createElement('div'); root.className = 'open2-id'; root.dataset.step = 'name';
  root.innerHTML = `<div class="box"><img class="ond" alt="Ondravel" src="art/characters/pixel/creatures/ondravel/anim/ondravel_front_idle_2x.gif"><div class="say"></div><div class="ctl"></div></div>`;
  doc.body.appendChild(root);
  const say = root.querySelector('.say'), ctl = root.querySelector('.ctl');
  const stop = (e) => e.stopPropagation(); // the game's window key handlers (Escape/M/Z/X) never see typing
  for (const t of ['keydown', 'keyup', 'keypress']) root.addEventListener(t, stop);
  const offs = [];
  const ui = globalThis.kilumen?.ui; if (ui) ui._open2 = true;
  return new Promise((resolve) => {
    let name = null, model = 'male';
    const finish = async () => {
      root.dataset.step = 'after'; ctl.innerHTML = ''; say.textContent = op.lines('ondravel_after', { player: name })[0];
      await op._wait(1600); offs.forEach((f) => f()); root.remove(); if (ui) ui._open2 = false; resolve({ name, model });
    };
    const pickModel = () => {
      root.dataset.step = 'model'; say.textContent = op.lines('ondravel_model')[0];
      ctl.innerHTML = `<div class="row">${['male', 'female'].map((k) => `<button class="card${k === model ? ' sel' : ''}" data-model="${k}"><img alt="" src="${MODELS[k].card}"><span>${MODELS[k].label}</span></button>`).join('')}</div>`;
      const sel = (k) => { model = k; ctl.querySelectorAll('.card').forEach((b) => b.classList.toggle('sel', b.dataset.model === k)); };
      let armed = false; setTimeout(() => { armed = true; }, 250);
      offs.push(onTap(ctl, '.card', (e, el) => { if (!armed) return; if (model === el.dataset.model) finish(); else sel(el.dataset.model); }));
      const key = (e) => { if (root.dataset.step !== 'model') return; if (/Arrow(Left|Right)/.test(e.key)) sel(model === 'male' ? 'female' : 'male'); else if (/Enter|^ $|z/i.test(e.key) && armed) finish(); };
      root.addEventListener('keydown', key); root.tabIndex = -1; root.focus();
    };
    say.textContent = op.lines('ondravel_name')[0];
    ctl.innerHTML = `<div class="row"><input maxlength="${OPEN2.nameMax}" autocomplete="off" autocapitalize="words" spellcheck="false" placeholder="${op.lines('name_hint')[0]}"><button class="ok">${op.lines('name_ok')[0]}</button></div>`;
    const inp = ctl.querySelector('input');
    const submit = () => { if (root.dataset.step !== 'name') return; name = cleanName(inp.value, s.config.playerName || 'Cal'); inp.blur(); pickModel(); };
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } });
    offs.push(onTap(ctl, '.ok', submit));
    setTimeout(() => { try { inp.focus({ preventScroll: true }); } catch { /* */ } }, 50);
  });
}
