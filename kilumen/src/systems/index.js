// Kilumen systems entry: attachSystems(scene) wires party / bag / heal / shop / puzzles into the overworld through
// the `// [systems-gd hook]` lines in overworld.js (see src/systems/HOOKS.md). systems-gd pass, Oct 22, 2026.
// Everything here also runs against a stub scene (tests, systems_preview.html).
import { CHEST_PAL, CHEST_PAL_IRON, CHEST_CLOSED, CHEST_OPEN } from './chest_art.js?v=v0.2.101-alpha';
import { systemsConfig, fmtMoney } from './config.js?v=v0.2.101-alpha';
import { giftTalk } from './npc_gifts.js?v=v0.2.101-alpha';
import { Party, Archive } from './party.js?v=v0.2.101-alpha';
import { Bag, pickupAt, visiblePickups, collectPickup, isTbd } from './bag.js?v=v0.2.101-alpha';
import { Heal, setActiveSystems, onPartyFainted } from './heal.js?v=v0.2.101-alpha';
import { diffOf, getDifficulty, PENDING_KEY } from './difficulty.js?v=v0.2.101-alpha';
import { Shop, Wallet, awardPrize as awardPrizeFn, awardBattleMoney as awardBattleMoneyFn, loadShopsData, getShops, newStockAt } from './shop.js?v=v0.2.101-alpha';
import { PuzzleRuntime, applyPuzzleToMap } from './puzzles.js?v=v0.2.101-alpha';
import { applyBattleTeam, displayName, serialise, createCreature, maxHp } from './creature.js?v=v0.2.101-alpha';
import { fillText, coinCount } from '../overworld/lines.js?v=v0.2.101-alpha';
import { gradeImage } from '../overworld/palette.js?v=v0.2.101-alpha';
import { attachRtBenefits } from './rt_benefits.js?v=v0.2.101-alpha'; // RT Employee Benefits (company XP tree, Oct 23 2026)
import { attachLinkBand } from './link_band.js?v=v0.2.101-alpha';
import { migrateHeld, allOwned } from './held.js?v=v0.2.101-alpha'; // held items P2-P5 (Oct 29 2026)
import { injectHiddenSpots, grantFlagRewards, FLAG_REWARDS } from './held_rewards.js?v=v0.2.101-alpha';

export { onPartyFainted };
const BLOCK = 1; // constants.js Col.BLOCK (solid supply satchel)

export class Systems {
  /** opts: {saveData (normalised save), config (overrides or URLSearchParams), puzzleDir} */
  constructor(scene, opts = {}) {
    const sv = opts.saveData || {};
    this.scene = scene;
    this.cfg = systemsConfig(opts.config);
    this.state = { lastHeal: null, heals: 0, blackouts: 0, puzzles: {}, shopLastQty: {}, bagRecent: [], ...(sv.systems || {}) };
    // difficulty: an old save has none -> Normal; a New game picked on the title screen leaves its pick in localStorage once
    if (!this.state.difficulty) { let p = null; try { p = globalThis.localStorage?.getItem(PENDING_KEY); globalThis.localStorage?.removeItem(PENDING_KEY); } catch { p = null; } this.state.difficulty = diffOf(p).id; }
    this.wallet = new Wallet(sv.coins);
    this.company = sv.company || { idLevel: 1, board: {} };
    this.archive = new Archive(sv.archive, this.cfg);
    this.bag = new Bag(sv.bag, { cfg: this.cfg, recent: this.state.bagRecent || [] });
    const flagApi = { has: (f) => scene.flags.has(f), set: (f, on) => (scene.setFlag ? scene.setFlag(f, on) : on ? scene.flags.add(f) : scene.flags.delete(f)) };
    if (!scene.onPartyChange) scene.onPartyChange = (lead) => this._partyChanged(lead);
    this.party = new Party(scene, this.archive, this.cfg, flagApi);
    this.heal = new Heal(this);
    this.puzzleDir = opts.puzzleDir || 'art/world/overworld/puzzles/';
    this.puzzleDefs = opts.puzzleDefs || {}; // tests / preview: {mapName: runtime json}
    this.puzzles = new Map(); // map name -> PuzzleRuntime
    this.ui = null;
    this.ready = loadShopsData(opts.shopsUrl).catch((e) => { console.error('[systems] shops.json', e); });
    // plates fire through the existing hook (overworld worldApi().onArrive); chain whatever was there
    const prevPlate = scene.hooks?.onPlate;
    if (scene.hooks) scene.hooks.onPlate = (x, y) => { this.onPlate(x, y); prevPlate?.(x, y); };
    // held-item rewards (Oct 29 2026): a Master win / quest / post-game flag hands over its earned-only item right away
    const rewardFlags = new Set(FLAG_REWARDS.map((r) => r.flag));
    if (typeof scene.setFlag === 'function') {
      const prevSet = scene.setFlag.bind(scene);
      scene.setFlag = (f, on, ...rest) => { const r = prevSet(f, on, ...rest); if (on !== false && rewardFlags.has(f)) this.grantHeldRewards(); return r; };
    }
    setActiveSystems(this);
  }

  /** Earned-only held items due from story flags (src/systems/held_rewards.js). Toasts each one. */
  grantHeldRewards({ quiet = false } = {}) {
    const sc = this.scene, set = (f) => (sc.setFlag ? sc.setFlag(f, true) : sc.flags.add(f));
    const got = grantFlagRewards({ flags: sc.flags, bag: this.bag, setFlag: set });
    if (got.length) sc._dirty = true;
    if (!quiet) for (const g of got) sc.toast?.(`Received the ${this.bag.nameOf(g.item)}! It's in the Gear pocket.`); // PLACEHOLDER line (Text Bot)
    return got;
  }

  get lines() { return this.scene.lines || null; }
  // v0.2.27: region 2 towns have no world_layout zone maps yet, so the shared shop_int entered from Aurelith / Saltmere
  // used Brookhollow's list. Use that town's shops.json region instead (world_layout is untouched: music reads it).
  get zone() {
    const sc = this.scene, from = sc.lastDoor?.map;
    if (sc.map?.name === 'shop_int' && ['aurelith', 'saltmere', 'revival_heights', 'frostspire', 'mirefen', 'tidewater_coast', 'lanternport', 'cindervale'].includes(from)) return from; // + held items P2 shop rows
    // integ8: a unique interior missing from world_layout zones (shop_cairnfold) uses its map's own region when shops.json has that row
    const own = sc.map?.json?.region || sc.map?.def?.region;
    let known = false; try { known = !!(own && getShops().regions?.[own]); } catch { known = false; } // shops.json not loaded yet: no fallback
    return sc.zone?.() || (known ? own : null);
  }
  get badgeCoins() { return coinCount(this.scene.flags); }

  /** Fill pages with the scene's text vars plus `vars`, then show them. */
  fill(pages, vars = {}) { return (pages || []).map((t) => fillText(t, { ...(this.scene.textVars?.() || {}), ...vars })); }
  say(pages, vars, speaker) { return this.scene.say(this.fill(pages, vars), speaker); }
  ask(pages, choices, vars, speaker) { return this.scene.ask(this.fill(pages, vars), choices, speaker); }
  text(path, def) { let v = this.lines; for (const k of path.split('.')) v = v?.[k]; return v ?? def; }

  _partyChanged(leadChanged) {
    const sc = this.scene;
    sc._dirty = true;
    if (leadChanged) { sc._placeFollower?.(); sc._loadActorSprites?.(); }
  }

  // ---- overworld hooks --------------------------------------------------------------------------------
  /** _enterMap: puzzle state onto the map, satchels solid. */
  async onMapEnter(m) {
    this.bag.lines = this.lines;
    this.heal.onEnterMap(m); // last-visited heal centre = blackout respawn (bug fix Oct 30 2026)
    migrateHeld(this.bag, allOwned(this.scene.party || [], this.archive), this.state); // v1 saves: holder shared the bag copy
    injectHiddenSpots(m, this.scene.flags); // hidden held-item spots (before visiblePickups)
    this.grantHeldRewards();
    for (const it of visiblePickups(m, this.scene.flags, this.cfg)) if (m.inBounds?.(it.x, it.y)) m.layers.collision[it.y][it.x] = BLOCK;
    const rt = await this.puzzleFor(m);
    if (rt) applyPuzzleToMap(rt, m);
  }

  async puzzleFor(m) {
    if (!m?.puzzle) return null;
    if (this.puzzles.has(m.name)) return this.puzzles.get(m.name);
    let def = this.puzzleDefs[m.name] ? structuredClone(this.puzzleDefs[m.name]) : null;
    if (!def) try { const r = await fetch(new URL(`${this.puzzleDir}${m.name}.runtime.json`, globalThis.location?.href || 'file:///')); if (r.ok) def = await r.json(); } catch { /* fall back to the map's own puzzle block */ }
    def ||= { ...m.puzzle, solved_flag: `puzzle_${m.name}_solved`, initial_state: null };
    def.channels ||= Object.fromEntries([...new Set(def.gates.map((g) => g.channel))].map((ch) => [ch, { switches: def.switches.filter((s) => s.channel === ch).map((s) => s.id), gates: def.gates.filter((g) => g.channel === ch).map((g) => g.id) }]));
    const rt = new PuzzleRuntime(def, this.state.puzzles[m.name] || (this.scene.flags.has(def.solved_flag) ? { solved: true } : null));
    this.puzzles.set(m.name, rt);
    return rt;
  }

  _puzzleChanged(m, rt, r) {
    if (!r?.changed) return;
    applyPuzzleToMap(rt, m);
    this.state.puzzles[m.name] = rt.toJSON();
    if (r.solvedNow) this.scene.setFlag?.(rt.def.solved_flag, true);
    this.scene.log?.push({ tick: this.scene.tick, type: 'puzzle', map: m.name, id: r.id, solved: rt.solved });
    this.scene._dirty = true;
  }

  onPlate(x, y) {
    const m = this.scene.map, rt = this.puzzles.get(m?.name);
    if (rt) this._puzzleChanged(m, rt, rt.step(x, y));
  }

  /** interact(): faced cell (fx,fy). Returns true when a system took the A press. */
  onInteract(fx, fy) {
    const sc = this.scene, m = sc.map;
    const rt = this.puzzles.get(m?.name), crystal = rt?.switchAt(fx, fy, 'crystal');
    if (crystal) { this._puzzleChanged(m, rt, rt.touch(fx, fy)); return true; }
    const it = pickupAt(m, fx, fy);
    if (it && (!isTbd(it) || this.cfg.giveTbdItems)) { sc.script(() => this.pickup(it)); return true; }
    if (m?.name === this.cfg.starterMap && !sc.flags.has(this.cfg.starterFlag)) {
      const cradle = (m.json?.text_pending?.interact_spots || []).find((s) => s.x === fx && s.y === fy && this.cfg.starterCradles[s.id]);
      if (cradle) { sc.script(() => this.starterAt(cradle)); return true; }
    }
    return false;
  }

  async pickup(it) {
    this.bag.lines = this.lines;
    const r = collectPickup(this.scene.map.name, it, { flags: this.scene.flags, bag: this.bag, addMoney: (n) => this.wallet.add(n), cfg: this.cfg, lines: this.lines, setFlag: (f) => this.scene.setFlag?.(f, true) ?? this.scene.flags.add(f) });
    if (r.ok && it.item === 'old_record') r.recordFlag = this.markRecord(); // The Missing Note (fix 4d, Oct 22, 2026)
    this.scene.log?.push({ tick: this.scene.tick, type: 'pickup', item: it.item, kind: r.kind, flag: r.flag });
    const m = this.scene.map;
    if (r.ok && !it.hidden && !this.cfg.emptySatchelStays && m.inBounds?.(it.x, it.y)) m.layers.collision[it.y][it.x] = 0; // satchel gone: walkable again
    await this.say(r.pages, r.vars);
    return r;
  }

  /** The Missing Note: a record pickup sets the LOWEST unset flg_record_1..4 (a count, any order; text meta
   * flg_record_N), so the DJ's 'That's one!' always follows the first record found. Flags save with scene.flags. */
  markRecord() {
    const sc = this.scene;
    for (let n = 1; n <= 4; n++) {
      const f = `flg_record_${n}`;
      if (sc.flags.has(f)) continue;
      if (sc.setFlag) sc.setFlag(f, true); else sc.flags.add(f);
      return f;
    }
    return null;
  }

  async starterAt(cradle) {
    const species = this.cfg.starterCradles[cradle.id], name = displayName({ species });
    const k = await this.ask([`Take ${name} as your partner?`], ['Yes', 'No'], {});
    if (k !== 0) return null;
    const r = this.party.chooseStarter(species, { origin: { map: this.scene.map.name, how: 'starter', day: this.scene.clock?.day ?? 0 } });
    if (r.ok) await this.say([`${name} is on your team now.`], {});
    return r;
  }

  /** talk(): parcel/bike gifts (npc_gifts.js); carer -> heal counter; shop_int clerk -> shop. Returns true when handled. */
  async onTalk({ mapName, def, entry, line, speaker }) {
    if (await giftTalk(this, { mapName, def, entry, line, speaker })) return true; // region 2: parcel -> Courier Bike + office gift (npc_gifts.js)
    if (entry?.after_heal || /_carer$/.test(def.id)) return this.heal.carerTalk({ mapName, def, entry, line, speaker });
    if (((mapName === 'shop_int' || this.scene.map?.json?.interior_kind === 'mart') && (def.id === 'clerk' || def.variant_of === 'clerk')) || def.stall_shop) { // GD Oct 30 2026: town market stall keepers (stall_shop) reuse the shop // r78 WD: unique marts (shop_lanternport / shop_cindervale) set interior_kind 'mart'
      // Wellspire fixes (Oct 30 2026): visits are tracked per shop (map + town), so 'Back again' never greets a first-time visitor
      const vk = `${mapName}#${this.zone || ''}`, visits = this.state ? (this.state.shopVisits ||= {}) : (this._shopVisits ||= {}), first = !visits[vk];
      visits[vk] = (visits[vk] || 0) + 1;
      const pages = first && this.text ? this.text('system_shop.first_visit.pages', ['Welcome to RT Supply. First time in this branch? Have a look.']) : (line?.pages || entry.pages);
      await this.scene.say(this.fill ? this.fill(pages) : pages, speaker);
      await this.openShop();
      return true;
    }
    return false;
  }

  /** Open the shop screen (systems_screens.js) and resolve when it closes; no UI = no-op. */
  async openShop() {
    await this.ready;
    if (!this.ui) return;
    if (newStockAt(this.zone, this.badgeCoins) && !this.scene.seen?.[`shop_stock#${this.zone}#${this.badgeCoins}`]) {
      this.scene.seen[`shop_stock#${this.zone}#${this.badgeCoins}`] = true;
      await this.say(this.text('system_shop.new_stock.pages', ['New stock came in.']));
    }
    await new Promise((resolve) => this.ui.open('sys_shop', { onClose: resolve }));
  }

  makeShop() {
    return new Shop({ wallet: this.wallet, bag: this.bag, zone: this.zone, company: this.company, badgeCoins: this.badgeCoins, cfg: this.cfg, lastQty: this.state.shopLastQty });
  }

  /** saveData(): the blocks this module owns (party is saved by the scene itself). */
  saveBlocks() {
    this.state.bagRecent = this.bag.recent.slice(0, 50);
    return { coins: this.wallet.coins, bag: this.bag.toJSON(), archive: this.archive.toJSON(), systems: JSON.parse(JSON.stringify(this.state)) };
  }

  /** view(): placeholder supply satchels (procedural, graded like every other sprite). */
  worldActors(grade) {
    const m = this.scene.map;
    if (!m) return [];
    const out = [];
    for (const it of visiblePickups(m, this.scene.flags, this.cfg)) {
      let img = satchelSprite(it.taken, chestVariantAt(m, it.x, it.y, this.scene.tilesetIndex));
      if (img && grade && !grade.identity) img = gradeImage(img, grade, 'lut'); // time-of-day grade like every sprite
      if (img) out.push({ img, sheetScale: 1, w: 64, h: 64, col: 0, row: 0, px: it.x * 64, py: it.y * 64, lift: 0, feet: it.y * 64 + 64, order: -2, prop: 'satchel' });
    }
    return out;
  }

  // ---- battle-facing API (Coder) ------------------------------------------------------------------
  /** { gameItemId: count } for KilumenBattle opts.bag */
  bagForBattle() {
    const bag = this.bag.toEngine();
    if (!this.cfg.pepRemedyRestoresEnergyInBattle) delete bag.energy_tonic; // flag: config.js (Gary Oct 22: on)
    return bag;
  }
  /** Fold KilumenBattle.result() back: team (by uid) + bag. Returns 'blackout' when the whole party is out cold. */
  applyBattleResult(res) {
    this.lastBattle = res || null; // onTrainerWin reads the foe team (res.foes) for the payout level
    if (res?.team) applyBattleTeam(this.scene.party, res.team);
    if (res?.bag) this.bag.fromEngine(res.bag);
    if (res?.caught?.species) { // a catch joins the team (or the Field Archive when the team is full)
      const c = createCreature({ species: res.caught.species, level: res.caught.level, variant: res.caught.variant, origin: { map: this.scene.map?.name || null, how: 'caught', day: this.scene.clock?.day ?? 0 } });
      if (Number.isFinite(res.caught.hp) && res.caught.hp > 0) c.hp = Math.min(maxHp(c), res.caught.hp);
      res.caughtTo = this.party.add(c, this.company?.idLevel || 1);
      if (res.caughtTo.where === 'archive') this.scene.toast?.('Team full. Sent to company storage.');
      else if (res.caughtTo.where === 'none') this.scene.toast?.('Team and company storage are both full. It slipped away.');
    }
    this.scene._dirty = true;
    return this.party.allFainted() ? 'blackout' : res?.outcome || null;
  }
  awardPrize(o) { return awardPrizeFn(o, { wallet: this.wallet, party: this.scene.party, cfg: this.cfg }); }
  awardBattleMoney(trainer) { return awardBattleMoneyFn(trainer, { mult: diffOf(getDifficulty(this.state)).money, wallet: this.wallet, party: this.scene.party, cfg: this.cfg, lines: this.lines }); }
  onPartyFainted() { return this.heal.blackout(); }

  // ---- trainer results (overworld talk() hooks, merge Oct 22, 2026) -------------------------------------
  /** Trainer class for shops.json trainerMoney.classes: def.class / def.trainer_class, else from the id. */
  trainerClassOf(def = {}) {
    if (def.class || def.trainer_class) return def.class || def.trainer_class;
    const id = def.id || '';
    return /(^|_)master(_|$)/.test(id) ? 'master' : /(^|_)ron(_|$)/.test(id) ? 'ron' : /^helper_/.test(id) ? 'helper' : null; // null = trainerMoney.default (Gary 2:48 AM CT Oct 29: 'fix money bug' - *_hall_int_master / *_ron_N ids)
  }
  /** Won a trainer battle: pay out and show system_trainers.payout. Foe level from the last battle, else the
   * battle UI's placeholder foe level (lead level - 1, min 2) when no engine battle ran (default / shell path). */
  async onTrainerWin({ map, def, speaker } = {}) {
    const last = this.lastBattle, foes = last?.foes;
    this.lastBattle = null;
    const lead = this.scene.party?.[0];
    const trainer = { id: `${map}.${def.id}`, name: speaker?.name || this.text(`maps.${map}.${def.id}.name`, null) || 'The trainer', class: this.trainerClassOf(def),
      ...(foes?.length ? { team: foes } : { level: Math.max(2, (lead?.level || 5) - 1) }) };
    const r = this.awardBattleMoney(trainer);
    this.scene.log?.push({ tick: this.scene.tick, type: 'prize', npc: def.id, amount: r.amount, coin: r.coin });
    this.scene._dirty = true;
    if (r.amount > 0) await this.say(r.pages, r.vars);
    return r;
  }
  /** Lost a trainer battle: a wiped team blacks out (copay + warp to the last heal point). -> blackout result | null */
  async onTrainerLoss() {
    this.lastBattle = null;
    return this.party.allFainted() ? this.onPartyFainted() : null;
  }
  partyJSON() { return this.scene.party.map(serialise); }
  money() { return fmtMoney(this.wallet.coins); }
}

/** Wood floors (boards, parquet, driftwood, decks, piers): the wooden chest would share their browns, so it is iron there. */
export const WOOD_FLOOR_RE = /^(i_)?floor_(wood|oak|pine|parquet|drift)|(^|_)(wood|plank|planks|boardwalk|dock|pier|deck)(_|$)/;
/** 'iron' when the ground tile under (x,y) is a wood floor, else 'wood'. index = scene.tilesetIndex ({byId}). */
export function chestVariantAt(map, x, y, index) {
  const id = map?.tile?.('ground', x, y) ?? map?.layers?.ground?.[y]?.[x];
  const name = id ? index?.byId?.get(id)?.name : null;
  return name && WOOD_FLOOR_RE.test(name) ? 'iron' : 'wood';
}

let satchels = null;
/** 64x64 supply chest for world pickups: closed, or open once taken (tools/chests/make_chest.py -> chest_art.js;
 * 32 px native art drawn 2x, shared furniture projection: lit lid top, top-left light, outline, drop shadow).
 * variant 'iron' = dark-metal palette (wood floors), 'wood' = the default oak chest. */
export function satchelSprite(empty = false, variant = 'wood') {
  if (typeof document === 'undefined' && typeof OffscreenCanvas === 'undefined') return null;
  satchels ||= {};
  const key = (empty ? 'open' : 'closed') + '|' + variant;
  if (satchels[key]) return satchels[key];
  const c = typeof document !== 'undefined' ? document.createElement('canvas') : new OffscreenCanvas(64, 64);
  c.width = 64; c.height = 64;
  const g = c.getContext('2d'), rows = empty ? CHEST_OPEN : CHEST_CLOSED, pal = variant === 'iron' ? CHEST_PAL_IRON : CHEST_PAL;
  rows.forEach((r, y) => { for (let x = 0; x < r.length; x++) if (r[x] !== '.') { g.fillStyle = pal[r[x]]; g.fillRect(x * 2, y * 2, 2, 2); } });
  return (satchels[key] = c);
}

/** main.js hook: create + attach. Returns the Systems instance (also scene.systems). */
export function attachSystems(scene, opts = {}) {
  const sys = new Systems(scene, opts);
  scene.systems = sys;
  try { attachRtBenefits(scene, sys, { config: opts.config, data: opts.rtBenefits }); } catch (e) { console.error('rt_benefits:', e); } // company XP tree (browser / opts.rtBenefits only)
  try { attachLinkBand(scene, sys); } catch (e) { console.error('link_band:', e); } // Team Link Band from the Saltmere fisher (Oct 29 2026)
  return sys;
}
