// Overnight systems pass (Oct 23, 2026, coder). One entry: attachOvernight(scene, {query}) from src/main.js, right after
// attachSystems. Everything is wired by wrapping scene / systems INSTANCE methods, so overworld.js and systems/index.js
// stay untouched. Switches: src/overnight/flags.js (half-done features default OFF; URL ?ov=...).
//   links      world_links.js  map registry (maps_built + staged), TO COME links open once the target is registered
//   field      field.js        Tideglide / Brushbreak / Stonebreak / boulder push (+ greystone_b1 hold plate)
//   regionmap  region_map.js   phone Map -> Skylift fast travel; visited_<town> always recorded
//   sight      sight.js        trainer line of sight + spotted intro
//   kilindex   kilindex.js     seen / registered logging, save block, new_entry line
//   learnsets  learnsets.js    [PLACEHOLDER] generated learnsets + learn prompt after battles
//   starterLines               G12: system_party.starter_offer / starter_received when Text Bot adds them
import { Col } from '../overworld/constants.js?v=v0.2.90-alpha';
import { isToCome, warpSpawn } from '../overworld/map.js?v=v0.2.90-alpha';
import { overnightFlags } from './flags.js?v=v0.2.90-alpha';
import { buildRegistry, mapUrlFor } from './world_links.js?v=v0.2.90-alpha';
import { ixFlags } from '../overworld/ixlight.js?v=v0.2.90-alpha';
import { FieldSystem } from './field.js?v=v0.2.90-alpha';
import { RegionMap } from './region_map.js?v=v0.2.90-alpha';
import { SightSystem } from './sight.js?v=v0.2.90-alpha';
import { Kilindex } from './kilindex.js?v=v0.2.90-alpha';
import { learnsetFor, learnsBetween, applyLearn } from './learnsets.js?v=v0.2.90-alpha';
import { PLACEHOLDER_SKILLS, EXTRA_SKILL_ROWS } from '../ui/data.js?v=v0.2.90-alpha';
import { toID } from '../battle/data/skills.js?v=v0.2.90-alpha';
import { speciesInfo, speciesName, defaultSkills } from '../systems/creature.js?v=v0.2.90-alpha';
import { withFallbacks } from './npc_sprites.js?v=v0.2.90-alpha'; // batch 3: NPCs on World Design's overnight maps without a mapped sheet still draw

const STAGED_INDEX = 'src/overnight/staged_maps.json';

export function attachOvernight(scene, { query = null, saveData = {} } = {}) {
  const flags = overnightFlags(query);
  const ov = { flags, queue: [], registry: null, staged: {} };
  scene.overnight = ov;

  // ---- 1. links: registry + data-driven link targets -----------------------------------------------------------
  const reg = () => (ov.registry ||= buildRegistry(scene.layout, scene.config.mapsDir, ov.staged));
  if (flags.links) {
    scene.mapUrl = (name) => (name === 'house_1f' && ixFlags().ix2 ? scene.config.mapsDir + 'house_1f_v2.json' : mapUrlFor(scene.layout ? reg() : null, scene.config.mapsDir, name)); // Interiors v2 starter house
    let known = null; // init() assigns knownMaps from maps_built: add staged names on top
    Object.defineProperty(scene, 'knownMaps', { configurable: true, get: () => known, set: (v) => { known = v ? new Set([...v, ...Object.keys(ov.staged)]) : v; ov.registry = null; } });
    if (flags.stagedMaps) {
      const init = scene.init.bind(scene);
      scene.init = async (...a) => {
        try { const r = await fetch(STAGED_INDEX, { cache: 'no-store' }); if (r.ok) ov.staged = (await r.json()).maps || {}; } catch { ov.staged = {}; }
        return init(...a);
      };
    }
  }
  const registered = (name) => !!name && name !== 'TO COME' && (scene.knownMaps?.has(name) || name in ov.staged);

  // ---- batch 3: sprite fallback for overnight-map NPCs with no npc_sprite_map entry (else invisible) -----------------
  if (scene.npcs?.build) {
    const build = scene.npcs.build.bind(scene.npcs);
    scene.npcs.build = (map, spriteMap, phase) => build(map, withFallbacks(map, spriteMap), phase);
  }

  // ---- systems ---------------------------------------------------------------------------------------------------
  ov.field = flags.field ? new FieldSystem(scene) : null;
  ov.region = new RegionMap(scene, flags.regionmap);
  ov.sight = flags.sight ? new SightSystem(scene) : null;
  ov.kilindex = flags.kilindex ? new Kilindex(saveData.kilindex, saveData.party || scene.party || []) : null;
  ov.learn = flags.learnsets ? { data: null } : null;

  // ---- worldApi wrap ---------------------------------------------------------------------------------------------
  const worldApi = scene.worldApi.bind(scene);
  scene.worldApi = () => {
    const w = worldApi(), m = scene.map;
    const out = { ...w };
    if (ov.field) {
      out.query = (x, y, dir, mode) => ov.field.query(w.query(x, y, dir, mode), x, y, dir);
      out.onBump = (x, y, dir, who, q) => { if (!ov.field.bump(x, y, dir, q)) w.onBump?.(x, y, dir, who, q); };
    }
    out.onArrive = (x, y, mover, how) => {
      if (flags.links && m.code(x, y) === Col.DOOR) { // a TO COME door whose target map is now registered opens
        const wp = m.warpAt(x, y);
        if (wp && isToCome(wp) && registered(wp.to)) { scene.lastDoor = { map: m.name, x, y }; scene._doorDismount = scene.player.mode === 'bike'; scene.startWarp(warpSpawn(wp, null), 'door'); return 'stop'; }
      }
      const r = w.onArrive?.(x, y, mover, how);
      if (r !== 'stop') ov.field?.arrive(x, y);
      return r;
    };
    out.onEdge = (exit, x, y, dir, mover) => {
      if (flags.links && exit && isToCome(exit) && registered(exit.to)) { scene.startWarp({ exit, fromX: x, fromY: y }, 'edge'); return 'stop'; }
      return w.onEdge?.(exit, x, y, dir, mover);
    };
    return out;
  };

  // ---- interact / step / enter / render ----------------------------------------------------------------------------
  const interact = scene.interact.bind(scene);
  scene.interact = () => {
    if (scene.busy) return;
    if (ov.field?.interact()) return;
    interact();
    ov.field?.refreshHold();
  };
  const step = scene.step.bind(scene);
  scene.step = (snap) => {
    step(snap);
    ov.sight?.tick();
    if (ov.queue.length && !scene.busy && !scene.fade && !scene.dialog?.active && !globalThis.kilumen?.ui?.active) {
      const jobs = ov.queue.splice(0);
      scene.script(async () => { for (const j of jobs) await j(); });
    }
  };
  const enter = scene._enterMap.bind(scene);
  scene._enterMap = async () => {
    await enter();
    const m = scene.map;
    ov.field?.onEnter(m);
    ov.region.onEnter(m);
    ov.sight?.onEnter(m);
  };
  const render = scene.render.bind(scene);
  scene.render = () => { render(); ov.sight?.draw(); };

  // ---- systems wraps: kilindex, learnsets, starter lines, save block -----------------------------------------------
  const sys = scene.systems;
  if (sys) {
    const zoneOf = () => scene.zone?.() || scene.map?.name || null;
    const newEntry = (sp) => ov.queue.push(() => scene.say(scene.fill([].concat(scene.lines?.system_kilindex?.new_entry?.pages || scene.lines?.system_kilindex?.new_entry || ['{creature} added to the Kilindex.']), { ...scene.textVars(), creature: speciesName(sp) })));

    const apply = sys.applyBattleResult.bind(sys);
    sys.applyBattleResult = (res) => {
      const before = new Map((scene.party || []).map((c) => [c.uid, c.level]));
      const out = apply(res);
      try {
        if (ov.kilindex) {
          for (const f of res?.foesSeen || res?.foes || []) if (f?.species) ov.kilindex.markSeen(f.species, zoneOf());
          if (res?.caught?.species && ov.kilindex.markCaught(res.caught.species, { zone: zoneOf(), variant: res.caught.variant })) newEntry(res.caught.species);
        }
        if (ov.learn) for (const c of scene.party || []) {
          const was = before.get(c.uid);
          if (was == null || !(c.level > was)) continue;
          const set = learnsetFor(c.species, speciesInfo(c.species)?.el || ['normal'], defaultSkills(c.species), ov.learn.data);
          for (const skill of learnsBetween(set, was, c.level, c.skills)) ov.queue.push(() => learnPrompt(scene, ov, c, skill));
        }
      } catch (e) { console.error('overnight battle result:', e); }
      return out;
    };

    if (ov.kilindex) {
      const blocks = sys.saveBlocks.bind(sys);
      sys.saveBlocks = () => ({ ...blocks(), kilindex: ov.kilindex.toJSON() });
      sys.kilindex = ov.kilindex; // ui.js scr_kilindex reads scene.systems.kilindex when present
    }

    const starterAt = sys.starterAt.bind(sys);
    sys.starterAt = async (cradle) => {
      let r;
      const P = scene.lines?.system_party || {};
      if (flags.starterLines && P.starter_offer && P.starter_received) { // Text Bot G12 lines (keys proposed: question for Gary)
        const species = sys.cfg.starterCradles[cradle.id], name = speciesName(species);
        const vars = { ...scene.textVars(), creature: name };
        const k = await scene.ask(scene.fill([].concat(P.starter_offer.pages || P.starter_offer), vars), P.starter_offer.choices || ['Yes', 'No']);
        if (k !== 0) return null;
        r = sys.party.chooseStarter(species, { origin: { map: scene.map.name, how: 'starter', day: scene.clock?.day ?? 0 } });
        if (r.ok) await scene.say(scene.fill([].concat(P.starter_received.pages || P.starter_received), vars));
      } else r = await starterAt(cradle);
      if (r?.ok && ov.kilindex) {
        const sp = sys.cfg.starterCradles[cradle.id];
        if (ov.kilindex.markCaught(sp, { zone: zoneOf(), skills: defaultSkills(sp) })) newEntry(sp);
      }
      return r;
    };
  }

  // KilumenBattle.result() has no foe list for wild battles: add foesSeen (species of the p2 side) without editing battle.js.
  if (flags.kilindex) import('../battle/battle.js?v=v0.2.90-alpha').then(({ KilumenBattle }) => patchBattleResult(KilumenBattle)).catch(() => {});

  return ov;
}

/** KilumenBattle.result() has no foe list for wild battles: add foesSeen = species of every foe that came out. */
export function patchBattleResult(KilumenBattle) {
  if (!KilumenBattle || KilumenBattle.prototype.__ovSeen) return;
  const result = KilumenBattle.prototype.result;
  KilumenBattle.prototype.result = function (...a) {
    const r = result.apply(this, a);
    try {
      const side = this.battle?.sides?.[1];
      r.foesSeen = (side?.creature || side?.pokemon || []).filter((p) => p.previouslySwitchedIn || p.isActive || p.fainted).map((p) => ({ species: p.species?.id || null })).filter((f) => f.species);
    } catch { /* keep r */ }
    return r;
  };
  KilumenBattle.prototype.__ovSeen = true;
}

/** B21 learn prompt (system_skills.*). Runs inside scene.script (queued after the battle closes). */
export async function learnPrompt(scene, ov, c, skill) {
  const S = scene.lines?.system_skills || {};
  const sk = (id) => skillName(id);
  const vars = { ...scene.textVars(), creature: c.nickname || speciesName(c.species), skill: sk(skill) };
  const pg = (k, extra = {}) => scene.fill([].concat(S[k]?.pages || []), { ...vars, ...extra });
  ov.kilindex?.knowSkills(c.species, [skill]);
  if ((c.skills || []).length < 4) { applyLearn(c, skill); await scene.say(pg('learned')); scene._dirty = true; return 'learned'; }
  await scene.say(pg('slots_full'));
  const k = await scene.ask(pg('swap_ask'), S.swap_ask?.choices || ['Swap one out', 'Keep all four']);
  if (k === 0) {
    const pick = await scene.ask(pg('which'), [...c.skills.map(sk), S.swap_ask?.choices?.[1] || 'Keep all four']);
    if (pick >= 0 && pick < 4) {
      const r = applyLearn(c, skill, pick);
      await scene.say(pg('swapped', { old_skill: sk(r.old) }));
      scene._dirty = true; return 'swapped';
    }
  }
  await scene.say(pg('kept'));
  return 'kept';
}

const SKILL_NAMES = Object.fromEntries([...Object.values(PLACEHOLDER_SKILLS).flat(), ...EXTRA_SKILL_ROWS].map(([name]) => [toID(name), name]));
function skillName(id) { return SKILL_NAMES[id] || (id ? id[0].toUpperCase() + id.slice(1) : '?'); }
