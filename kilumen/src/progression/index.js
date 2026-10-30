// Progression pass entry (Oct 23, 2026, overnight coder): attachProgression(scene, ui, {query, platform}) from src/main.js
// after the UI is mounted (guarded there; a failure never blocks boot). Switches: ./flags.js (?pg=).
//  - masters (on): halls 2-8 Master results registered in TRAINER_RESULTS (src/battle/story.js), GD teams for hall
//    battles, coin record in save.systems.progression.masters, gift behind masterGifts. Dev: ?pg=masters&master=<zone>.
//  - hallPuzzles (off): hall puzzle preview overlay ?pg=hallPuzzles&hall=<zone> (hall maps 2-8 are not built yet).
//  - quests (off): quest book + phone Tasks = quest log + HUD tracker + NPC give / turn-in + rewards.
import { progressionFlags } from './flags.js?v=v0.2.101-alpha';
import { arenaProgress } from '../region78/arena_progress.js?v=v0.2.101-alpha';
import { registerMasterResults, registerHallNpcResults, teamFor, findHallTrainer, hallByZone, awardMaster, hallNpc } from './masters.js?v=v0.2.101-alpha';
import { hallEntry, withOpener, chainAfter, lightAt, litLamps, lampCell } from './halls.js?v=v0.2.101-alpha';
import { QuestBook, QFLAG } from './quests.js?v=v0.2.101-alpha';
import { applyLamps, activeTint } from './hall_lamps.js?v=v0.2.101-alpha'; // batch 3: Mirefen hall tint + reed lamps
import { HallPuzzle } from './puzzles.js?v=v0.2.101-alpha';
import { InMapHall, inmapZone, INMAP_HALLS } from './hall_inmap.js?v=v0.2.101-alpha'; // playtest fixes 3: prism relay / reed lamps in the hall map
import { coinArtOn, showCoinAward } from '../achievements/coin_art.js?v=v0.2.101-alpha'; // v2 badges: in-place coin award card
import { drawGustBoard } from '../region4/gust_draw.js?v=v0.2.101-alpha'; // v6: Frostspire Hall ice + wind overlay theme
import { TRAINER_RESULTS } from '../battle/story.js?v=v0.2.101-alpha';
import { mapTeamFor, playerStarter } from '../overnight/trainer_teams.js?v=v0.2.101-alpha';
import { isBatch3Map } from '../overnight/npc_sprites.js?v=v0.2.101-alpha'; // batch 3: route / rival trainers fight their map team
import { MilestoneBook, deriveValues, RESEARCH, TIER_NAMES, boardPointsFor, creditBoardPoints } from './milestones.js?v=v0.2.101-alpha'; // Tasks > Milestones (approved design, Oct 29 2026)
import { Shop } from '../systems/shop.js?v=v0.2.101-alpha';
import { levelForXp } from '../systems/creature.js?v=v0.2.101-alpha';
import { CONN_NODES } from '../ui/connections.gen.js?v=v0.2.101-alpha';
import { BATTLE_ITEMS } from '../systems/items.js?v=v0.2.101-alpha';
import { applyHeldPicks, heldRoleFor } from '../battle/data/trainer_held.js?v=v0.2.101-alpha';
import { attachHallV2, scaleMasterTeam } from './hall_v2.js?v=v0.2.101-alpha';
import { attachPuzzleTells } from './puzzle_tells.js?v=v0.2.101-alpha';

import { DEV } from '../dev/runtime.js?v=v0.2.101-alpha';
const DEV_KEY = () => !!DEV.masterKey; // dev master key skips the hall puzzle gate
const getJSON = (url) => fetch(url, { cache: 'no-store' }).then((r) => (r.ok ? r.json() : Promise.reject(new Error(url + ' ' + r.status))));
const escH = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export async function attachProgression(scene, ui, { query = null, platform = null } = {}) {
  const flags = progressionFlags(query);
  const sys = scene.systems || null;
  const store = sys ? (sys.state.progression ||= { masters: {}, puzzles: {}, quests: null }) : { masters: {}, puzzles: {}, quests: null };
  const pg = { flags, store, masters: null, quests: null, puzzles: {} };
  scene.progression = pg; if (typeof window !== 'undefined') (window.kilumen ||= {}).progression = pg;

  // ---- (c) Masters ------------------------------------------------------------------------------------------------
  if (flags.masters) {
    pg.masters = await getJSON('data/masters.json');
    pg.registered = registerMasterResults(pg.masters, TRAINER_RESULTS);
    pg.registered.push(...registerHallNpcResults(pg.masters, TRAINER_RESULTS)); // World Design map ids (<hall_map>_master)
    wireHallText(scene, pg.masters); // halls 2-8: NPCs placed + text lookup with clean fallback (./halls.js)
    let pending = null;
    const standIns = await getJSON('data/standins_overnight.json').then((d) => d.trainer_species || {}).catch(() => ({}));
    pg.mapTeam = (who) => { // non-hall trainers on World Design's maps: def.team (Ron: branch for the player's starter)
      const def = who && scene.map?.name === who.map && isBatch3Map(scene.map) ? scene.map.npcs?.find((d) => d.id === who.id) : null;
      const t = def ? mapTeamFor(def, { starter: playerStarter([...(scene.party || []), ...(sys?.archive?.list || [])]), standIns }) : null;
      const role = t && heldRoleFor({ map: who.map, id: who.id }); // held items (Oct 29 2026): Ron 5 / 6 picks (src/battle/data/trainer_held.js)
      return t && role ? { ...t, foes: applyHeldPicks(role, t.foes) } : t;
    };
    if (ui) {
      const open = ui.open.bind(ui);
      ui.trainerTeam = () => pending; // real-time trainer fights (branch rtb-trainer) read the injected Master / map team here
      ui.open = (id, arg) => open(id, id === 'battle' && pending ? { ...(arg || {}), foes: pending.foes, foeName: pending.foeName, masterNumber: pending.masterNumber || 0 } : arg);
    }
    const onBattle = scene.hooks.onBattle;
    if (onBattle) scene.hooks.onBattle = async (who) => {
      if (who?.masterRematch) { // hall v2 rematch: the Master's team x1.3^wins, no coin / Master award (hall_v2 pays the flat 1200 rematch prize)
        const t = teamFor(pg.masters, who.map, who.id, { fernwick: true }) || pg.mapTeam(who);
        pending = t ? { ...t, foes: scaleMasterTeam(t.foes, who.masterWins) } : null;
        try { return await onBattle(who); } finally { pending = null; }
      }
      pending = who ? teamFor(pg.masters, who.map, who.id, { fernwick: flags.masterTeamFernwick }) || pg.mapTeam(who) : null;
      let won;
      try { won = await onBattle(who); } finally { pending = null; }
      const f = who && findHallTrainer(pg.masters, who.map, who.id);
      if (won !== false && f?.isMaster) {
        const r = awardMaster(f.hall, { sys, gifts: flags.masterGifts, record: store.masters });
        pg.lastAward = r;
        const said = scene._entryFor?.(who.map, { id: who.id })?._coinLine; // Text Bot coin_handover already said it
        if (f.hall.zone !== 'fernwick' && !said) scene.toast?.(`${r.coin} received! (placeholder coin name)`); // Fernwick keeps its live text
        if (coinArtOn()) showCoinAward(f.hall.zone, r.coin); // v2 badges: in-place coin spin + shine card (no full-screen zoom)
      }
      return won;
    };
    pg.openMaster = (zone) => { // dev / screenshots: fight a Master's GD team directly (no flags set)
      const h = hallByZone(pg.masters, zone); if (!h || !ui) return false;
      const t = teamFor(pg.masters, h.hall_map, h.master.id, { fernwick: true });
      ui.closeAll(); ui.open('battle', { trainer: true, foes: t.foes, foeName: t.foeName }); return true;
    };
    const mz = query?.get?.('master');
    if (mz && ui) Promise.resolve(ui.sdReady).then(() => pg.openMaster(mz));
  }

  // ---- batch 3: hall map tint (mirefen_hall_int darkness) + reed lamp tiles from the hall puzzle state ----------------
  // Always on (it is World Design map data, not a feature switch). gradeFor reads scene.mapTint() (src/overworld/clock.js).
  pg.tintDefs = {};
  const zoneOfMap = (m) => (m?.json?.tint && /_hall_int$/.test(m.name) ? m.name.replace(/_hall_int$/, '') : null);
  scene.mapTint = () => {
    const m = scene.map, z = zoneOfMap(m); if (!z) return m?.json?.tint || null;
    return pg.tintDefs[z] ? activeTint(m, pg.tintDefs[z], store.puzzles[z], scene.flags) : m.json.tint;
  };
  pg.refreshLamps = async () => {
    const m = scene.map, z = zoneOfMap(m); if (!z || !m.json.tint.lights) return [];
    const def = pg.tintDefs[z] ||= await getJSON(`data/hall_puzzles/${z}.json`).catch(() => null);
    const r = def ? applyLamps(m, def, store.puzzles[z], scene.flags) : [];
    scene._dirty = true; return r;
  };
  if (typeof scene._enterMap === 'function') {
    const enter = scene._enterMap.bind(scene);
    scene._enterMap = async (...a) => { const r = await enter(...a); await pg.refreshLamps().catch((e) => console.error('hall lamps:', e)); return r; };
  }
  await pg.refreshLamps().catch((e) => console.error('hall lamps:', e));

  // ---- playtest fixes 3: hall puzzles played in the hall map (revival_hall_int prisms, mirefen_hall_int reed lamps) --------
  // Old overlay-only state and old saves that already beat the Master load as solved (doors open, lamps lit).
  const hallBeaten = (zone) => {
    const h = pg.masters ? hallByZone(pg.masters, zone) : null;
    return !!(store.masters?.[zone] || (h?.flag && scene.flags?.has(h.flag)) || Object.keys(scene.seen || {}).some((k) => k.startsWith(`defeated:${INMAP_HALLS[zone]}.`) && /_master$/.test(k)));
  };
  pg.inmap = null;
  pg.refreshInMap = async () => {
    const zone = scene.map?.json?.hall_v2 ? null : inmapZone(scene.map?.name); if (!zone) { pg.inmap = null; return null; } // hall_v2 maps replace the in-map puzzles
    const def = pg.puzzles[zone] ||= await getJSON(`data/hall_puzzles/${zone}.json`);
    const already = scene.flags?.has(def.solved_flag) || hallBeaten(zone);
    const hp = pg.inmap = new InMapHall(def, store, already);
    if (already && !store.puzzles[zone]?.solved) hp.save();
    if (hp.solved && def.solved_flag && !scene.flags?.has(def.solved_flag)) scene.setFlag?.(def.solved_flag);
    hp.apply(scene.map, scene.player); scene._dirty = true;
    return hp;
  };
  if (typeof scene._enterMap === 'function') {
    const enter2 = scene._enterMap.bind(scene);
    scene._enterMap = async (...a) => { const r = await enter2(...a); await pg.refreshInMap().catch((e) => console.error('hall in-map puzzle:', e)); try { pg.retroCoins?.(); } catch (e) { console.error('retro coins:', e); } return r; };
  }
  await pg.refreshInMap().catch((e) => console.error('hall in-map puzzle:', e));
  // playtest fixes 3: Master coins for saves that beat a Master but lost the coin flag (the flag used to be set only after
  // the closing lines, so a reload mid-dialogue dropped it): a `defeated:` record for the hall's Master or a coin record
  // grants the flag (= the Key Items coin row) on load. Runs once at attach, not during battles or talks.
  pg.retroCoins = () => {
    const out = [];
    for (const h of pg.masters?.halls || []) {
      if (!h.flag || scene.flags?.has(h.flag)) continue;
      const ids = [h.master?.id, `${h.hall_map}_master`].filter(Boolean);
      if (store.masters?.[h.zone] || ids.some((id) => scene.seen?.[`defeated:${h.hall_map}.${id}`])) {
        scene.setFlag?.(h.flag); store.masters ||= {}; store.masters[h.zone] ||= { coin: h.coin_number, flag: h.flag }; out.push(h.zone);
      }
    }
    if (out.length) scene.log?.push({ tick: scene.tick, type: 'retroCoins', zones: out });
    return out;
  };
  try { pg.retroCoins(); } catch (e) { console.error('retro coins:', e); }
  if (typeof scene.interact === 'function') {
    const interact = scene.interact.bind(scene);
    scene.interact = () => {
      const hp = pg.inmap, p = scene.player;
      if (scene.busy || !hp || !p || scene.map?.name !== hp.def.map) return interact();
      const d = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[p.facing] || [0, 0];
      const r = hp.touch(p.x + d[0], p.y + d[1]);
      if (!r) return interact();
      const pages = (id) => { const e = scene._entryFor?.(scene.map.name, { id: `${scene.map.name}_${id}` }); return e?.pages || null; };
      if (r.kind === 'receiver') { scene.script(() => scene.say(pages(r.lit ? 'receiver_lit' : 'receiver_dim') || [r.lit ? 'The crystal glows violet.' : 'A crystal set in the wall. Dark for now.'])); return; }
      hp.apply(scene.map, p); scene._dirty = true;
      if (r.kind === 'prism') {
        scene.audio?.sfx?.('select');
        if (r.newlyLit) scene.script(() => scene.say(pages('receiver_lit') || ['The crystal glows violet. The door beside it slides open.']));
        else scene.toast?.(`The prism turns to face ${r.facing}.`);
      } else if (r.kind === 'lamp') {
        pg.refreshLamps?.();
        if (r.result === 'lit') scene.script(() => scene.say(pages('reed_lamp_lit') || ['The lamp catches.']));
        else if (r.result === 'wrong') scene.script(() => scene.say(pages('reed_lamp_wrong') || ['The lamps flicker out.']));
      }
      if (r.solvedNow) { scene.setFlag?.(hp.def.solved_flag); const po = r.kind === 'prism' && scene.lines?.system_halls?.prism_open; const pp = po?.pages || (Array.isArray(po) ? po : null); scene.toast?.(pp?.length ? pp.join(' ') : 'The way to the Master is open.'); } // prism solve: Text Bot key system_halls.prism_open
    };
  }

  // ---- (b) hall puzzles ----------------------------------------------------------------------------------------------
  // v6 item 6 (dev/region4-station): the Frostspire hall's gust puzzle is live even while hallPuzzles stays off for the other halls
  const puzzleZone = (z) => flags.hallPuzzles || (z === 'frostspire' && query?.get?.('r4') !== '0');
  {
    pg.loadPuzzle = async (zone) => (pg.puzzles[zone] ||= await getJSON(`data/hall_puzzles/${zone}.json`));
    pg.openPuzzle = async (zone) => { const def = await pg.loadPuzzle(zone); return openPuzzleOverlay(scene, ui, def, store, platform); };
    const hz = query?.get?.('hall');
    if (hz && puzzleZone(hz)) pg.openPuzzle(hz).catch((e) => console.error('hall puzzle:', e));
    // halls 2-8 puzzle start: the hall guide opens the puzzle; the Master only battles once puzzle_<zone>_hall_solved is set
    if (pg.masters && typeof scene.talk === 'function') {
      const talk = scene.talk.bind(scene);
      scene.talk = (n, def) => {
        if (scene.map?.json?.hall_v2) return talk(n, def); // hall_v2: hall_v2.js gates the Master
        const info = def && scene.map && hallNpc(pg.masters, scene.map.name, def.id);
        if (info && INMAP_HALLS[info.hall.zone] && info.role === 'master') { // playtest fixes 3: the in-map puzzle gates the Master
          const z = info.hall.zone, solved = scene.flags?.has(`puzzle_${z}_hall_solved`) || pg.inmap?.solved || hallBeaten(z);
          if (solved || DEV_KEY()) return talk(n, def);
          scene.log?.push({ tick: scene.tick, type: 'hall_puzzle_gate', zone: z });
          const gl = scene.lines?.system_field?.[z === 'mirefen' ? 'hall_gate_mirefen' : 'hall_gate_default']; // Text Bot keys (r56 wiring)
          scene.script(() => scene.say(gl?.pages || [z === 'mirefen' ? 'Light the reed lamps in the right order first. Then we talk.' : 'Open the way first. Then we talk.'], scene.speakerFor?.(n)));
          return;
        }
        if (!info || info.hall.zone === 'fernwick' || info.role === 'trainer' || INMAP_HALLS[info.hall.zone] || !puzzleZone(info.hall.zone)) return talk(n, def);
        const zone = info.hall.zone;
        const solvedFlag = `puzzle_${zone}_hall_solved`;
        if (info.role === 'master' && scene.flags?.has(solvedFlag)) return talk(n, def);
        if (info.role === 'guide' && !scene._entryFor(scene.map.name, def)?._fallback) talk(n, def);
        pg.hallStarts = (pg.hallStarts || 0) + 1; scene.log?.push({ tick: scene.tick, type: 'hall_puzzle', zone, from: info.role });
        return pg.openPuzzle(zone).catch((e) => console.error('hall puzzle:', e));
      };
    }
  }

  // ---- (a) quests + milestones (phone Tasks) ----------------------------------------------------------------------
  // Tasks fix (Oct 29 2026): this block was never reached in the public build (quests:false in ./flags.js, ?pg= ignored by
  // the ALPHA build, and data/quests.json was never shipped). Now on by default; ?tasks=0 (alpha.js) turns it off.
  if (flags.quests && !globalThis.KILUMEN_TASKS_OFF) {
    const data = await getJSON('data/quests.json');
    const qb = pg.quests = new QuestBook(data, store.quests);
    const mb = pg.milestones = new MilestoneBook(store.milestones);
    let boardSynced = false;
    // State lives in systems.state.progression (save v2 `systems` block). We only mark the save dirty: the overworld's
    // saveNow() refuses to write during battles, conversations and cutscenes, so nothing is written mid-interaction.
    const save = () => { store.quests = qb.toJSON(); store.milestones = mb.toJSON(); scene._dirty = true; };
    const quietUntil = Date.now() + 2500; // load + ?flags= catch-up stays silent
    const fin = (q, quiet) => {
      scene.setFlag(QFLAG.done(q.id)); scene.setFlag(QFLAG.on(q.id), false);
      const r = qb.rewards(q), got = [];
      for (const it of r.items) {
        if (sys?.bag?.def?.(it.id)) { const a = sys.bag.add(it.id, it.qty || 1); if (a?.ok) got.push(`${it.id} x${it.qty || 1}`); }
        else console.warn('[quests] PLACEHOLDER reward item not in items.js:', it.id, 'quest', q.id);
      }
      if (r.money && sys?.wallet) sys.wallet.add(r.money);
      for (const f of r.flags) if (!scene.flags.has(f)) scene.setFlag(f);
      if (!quiet) scene.toast?.(tx(ui, 'system_tasks.toast_complete', 'Task complete: {task}', { task: q.title }));
      save();
    };
    const sayLines = async (ls, n) => { for (const l of ls) await scene.say(l.text, l.npc === 'system' || l.npc === 'player_start' ? null : scene.speakerFor?.(n)); };
    const inBattle = () => ui?.top?.scr === 'battle' || ui?.active === 'battle' || !!scene.inBattle;
    const derived = () => milestoneData(scene, sys, mb);
    mb.floor('trainers', retroTrainerWins(scene.flags)); // old saves: retro credit from beaten-trainer flags
    const pops = [];
    let pop = null;
    const tick = () => {
      if (!scene.map) return;
      const quiet = Date.now() < quietUntil; // catch-up on load (old saves): no toasts / no step text
      if (scene.busy || inBattle()) { hud?.update(); return; } // never advance tasks mid battle / talk / cutscene
      const acts = qb.update({ flags: scene.flags, map: scene.map.name, x: scene.player.x, y: scene.player.y });
      const show = [];
      for (const a of acts) {
        if (a.type === 'start') { scene.setFlag(QFLAG.on(a.q.id)); if (!quiet && a.q.type === 'main') scene.toast?.(tx(ui, 'system_tasks.toast_new', 'New task: {task}', { task: a.q.title })); }
        else if (a.type === 'set') scene.setFlag(a.flag);
        else if (a.type === 'step' && !quiet) show.push(...qb.lines(a.q, 'step', a.step.id));
        else if (a.type === 'complete') fin(a.q, quiet);
      }
      let ms = false;
      if (!boardSynced && sys?.rtBenefits?.grantPoints) { boardSynced = true; if (creditBoardPoints(mb, sys.rtBenefits)) ms = true; } // old saves: claimed Gold / Platinum tiers, once
      if (AREA_IDS.has(scene.map.name) && mb.area(scene.map.name)) ms = true;
      const reached = mb.newlyReached(derived());
      if (reached.length) { ms = true; if (!quiet) pops.push(...reached); }
      if (acts.length || ms) save();
      if (pops.length && !pop && !ui?.active) pop = celebrate(ui, pops.shift(), () => { pop = null; });
      if (show.length && !scene.busy) scene.script(() => sayLines(show));
      hud?.update();
    };
    // ---- milestone counters on existing events (scene log, sell terminal, shop sells, battle results) -------------
    if (Array.isArray(scene.log)) { const push = scene.log.push.bind(scene.log); scene.log.push = (...es) => { for (const e of es) { try { if (e?.type === 'battle' && e.won) mb.bump('trainers'); if (e?.type === 'evolve') mb.state.evolved++; } catch { /* never break the game */ } } return push(...es); }; }
    const coins = () => sys?.wallet?.coins ?? 0;
    if (typeof scene._termSell === 'function') { // creature sales (Revival Tech terminal)
      const sell = scene._termSell.bind(scene);
      scene._termSell = async (...a) => { const c0 = coins(); try { return await sell(...a); } finally { const d = coins() - c0; if (d > 0) { mb.bump('merchant', d); save(); } } };
    }
    if (!Shop.prototype.__pgMerchant) { // item sales (shop counter)
      const sell = Shop.prototype.sell;
      Shop.prototype.sell = function (...a) { const c0 = this.wallet?.coins ?? 0, r = sell.apply(this, a); try { const d = (this.wallet?.coins ?? 0) - c0; if (d > 0) pg.onSale?.(d); } catch { /* keep */ } return r; };
      Shop.prototype.__pgMerchant = true;
    }
    pg.onSale = (d) => { mb.bump('merchant', d); save(); };
    if (sys?.applyBattleResult) { // Species Research: first RESEARCH.catches catches of a species give the new catch bonus XP
      const apply = sys.applyBattleResult.bind(sys);
      sys.applyBattleResult = (res) => {
        const before = new Set(allCreatures(scene, sys)); const out = apply(res);
        try {
          const c = allCreatures(scene, sys).find((x) => !before.has(x)), k = scene.overnight?.kilindex?.data?.caught || {};
          const n = c ? Number(k[c.species]) || 0 : 0, xp = n >= 1 && n <= RESEARCH.catches ? RESEARCH.xp[n - 1] : 0;
          if (xp) { c.xp = (c.xp || 0) + xp; c.level = Math.max(c.level || 1, levelForXp(c.xp)); scene.toast?.(tx(ui, 'system_tasks.research_bonus', 'Species research {n}/{max}: +{xp} XP', { n, max: RESEARCH.catches, xp })); }
          save();
        } catch { /* keep */ }
        return out;
      };
    }
    const talk = scene.talk.bind(scene);
    scene.talk = (n, def) => {
      const act = def && qb.talkAction(scene.map.name, def.id, scene.flags);
      if (!act) return talk(n, def);
      const q = act.q;
      scene.script(async () => {
        if (act.type === 'give') { await sayLines(qb.lines(q, 'start'), n); scene.setFlag(QFLAG.on(q.id)); scene.toast?.(tx(ui, 'system_tasks.toast_new', 'New task: {task}', { task: q.title })); }
        else if (act.type === 'nudge') await sayLines(qb.lines(q, 'in_progress'), n);
        else { const last = qb.required(q).at(-1); if (last?.flag && qb.owns(q, last.flag)) scene.setFlag(last.flag); await sayLines(qb.lines(q, 'turn_in'), n); fin(q, false); }
        save(); hud?.update();
      });
    };
    const hud = typeof document !== 'undefined' ? questHud(scene, ui, qb, platform) : null;
    pg.questTick = tick; pg.hud = hud; pg.milestoneData = derived; pg.saveTasks = save;
    if (ui) installQuestLog(ui, scene, sys, qb, mb, save, pg, hud);
    tick(); pg.timer = setInterval(tick, 400);
  }
  attachHallV2(scene, ui, pg); // hall overhaul v2 (outermost talk / worldApi / enterMap wrappers)
  attachPuzzleTells(scene); // puzzle tells + rule-first hall hints (puzzle_hints_audit.md); wraps hall_v2's talk / worldApi
  return pg;
}

// ---- helpers ----------------------------------------------------------------------------------------------------
const tx = (ui, key, fb, vars = {}) => { let s = ui?.T ? ui.T(key, fb) : fb; if (Array.isArray(s)) s = s[0]; if (typeof s !== 'string') s = fb; return s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m)); };
const AREA_IDS = new Set(CONN_NODES.map((n) => n.id));
const AREA_NAME = Object.fromEntries(CONN_NODES.map((n) => [n.id, n.name]));
/** Player text for a quest step: key system_tasks.steps.<quest>.<step> (Text Bot), else the design desc with dev notes
 * (ids in brackets, 'Text Bot' asides, snake_case ids) cleaned out. */
export function cleanStep(desc) {
  let t = String(desc || '').replace(/\s*\([^)]*_[^)]*\)/g, '').replace(/[^.]*Text Bot[^.]*\.?/g, '');
  t = t.replace(/\btrainer_[a-z0-9_]+\b/g, 'a trainer').replace(/\b[a-z]+_\d*f\b/g, (m) => (/^house_/.test(m) ? 'house' : placeName(m))).replace(/\b[a-z0-9]+(?:_[a-z0-9]+)+\b/g, '');
  return t.replace(/\.{2,}/g, '.').replace(/\s+([.,;:])/g, '$1').replace(/\s{2,}/g, ' ').trim();
}
const stepText = (ui, q, step) => (step ? tx(ui, `system_tasks.steps.${q.id}.${step.id}`, cleanStep(step.desc)) : '');
/** Player-facing place name for a map id (never the internal 'route' ids). */
export function placeName(map) {
  if (!map) return '';
  if (AREA_NAME[map]) return AREA_NAME[map];
  const base = String(map).replace(/_(int|\d*f|b\d+)$/i, '');
  if (AREA_NAME[base]) return AREA_NAME[base];
  const zone = CONN_NODES.find((n) => map.startsWith(n.id + '_'));
  const words = String(map).replace(/^route\d*_?/, '').replace(/_int$/, '').split('_').filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1));
  return zone ? zone.name : words.join(' ') || 'Trail';
}
function allCreatures(scene, sys) {
  const out = [...(scene.party || [])];
  for (const b of sys?.archive?.boxes || []) for (const c of b || []) if (c) out.push(c);
  return out;
}
export function milestoneData(scene, sys, mb) {
  const k = scene.overnight?.kilindex;
  const areas = [...(mb?.state.areas || []), ...(AREA_IDS.has(scene.map?.name) ? [scene.map.name] : [])];
  return deriveValues({ kilindex: k?.data || null, creatures: allCreatures(scene, sys), areas, evolutions: mb?.state.evolved || 0 });
}
/** Retro credit for old saves: trainers already beaten (their beaten flags). */
export const retroTrainerWins = (flags) => [...(flags || [])].filter((f) => /^(beat|defeated|trainer_beat)_/.test(f)).length;
/** Next Master: the first hall (coin order) whose flag is not set yet. */
export function nextMaster(masters, flags) {
  const h = (masters?.halls || []).slice().sort((a, b) => a.coin_number - b.coin_number).find((x) => !flags?.has(x.flag));
  return h ? { zone: h.zone, coin: h.coin_number, place: placeName(h.zone), name: h.master?.name_placeholder || '' } : null;
}
const rewardText = (ui, r) => !r ? '' : [
  ...(r.coins ? [tx(ui, 'system_tasks.reward_coins', '{n} coins', { n: r.coins })] : []),
  ...(r.items || []).map((it) => tx(ui, 'system_tasks.reward_item', '{item} x{n}', { item: itemName(it.item), n: it.qty || 1 })),
  ...(r.title ? [tx(ui, 'system_tasks.reward_title', 'Title: {title}', { title: r.title })] : []),
  ...(r.boardPoints ? [tx(ui, 'system_tasks.reward_board_points', '+{n} Benefits Board pt', { n: r.boardPoints })] : []),
].join(', ');
const itemName = (id) => BATTLE_ITEMS[id]?.name || String(id || '').split('_').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');

// celebratory pop: a small stamped card with a burst of confetti, bottom centre; reduced motion = no confetti / bounce
function celebrate(ui, { m, tier }, done) {
  if (typeof document === 'undefined') { done(); return null; }
  if (!document.getElementById('pg-ms-css')) {
    const st = document.createElement('style'); st.id = 'pg-ms-css';
    st.textContent = `#pg-ms-pop{position:fixed;left:50%;bottom:calc(14% + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:40;pointer-events:none;background:#2b2236;color:#f4ead2;border:3px solid #9f86ff;border-radius:14px;padding:10px 18px 10px 14px;display:flex;gap:10px;align-items:center;font:700 clamp(13px,2.2vh,18px) ui-rounded,"Nunito","Trebuchet MS",system-ui,sans-serif;box-shadow:0 4px 0 rgba(0,0,0,.4);animation:pgmsIn .5s cubic-bezier(.2,1.6,.4,1) both,pgmsOut .4s ease-in 2.4s forwards;max-width:86vw}
#pg-ms-pop .medal{font-size:1.9em;animation:pgmsSpin 1s ease-out both}#pg-ms-pop>span:not(.medal){color:#c0a2ff}#pg-ms-pop small{display:block;font-weight:600;color:#f4ead2;opacity:.9}#pg-ms-pop .pts{color:#c0a2ff}
#pg-ms-pop i{position:absolute;left:50%;top:40%;width:7px;height:11px;border-radius:2px;animation:pgmsBurst 1s ease-out forwards}
@keyframes pgmsIn{from{transform:translate(-50%,40px) scale(.6);opacity:0}to{transform:translate(-50%,0) scale(1);opacity:1}}
@keyframes pgmsOut{to{transform:translate(-50%,20px) scale(.9);opacity:0}}@keyframes pgmsSpin{from{transform:rotate(-200deg) scale(.2)}to{transform:none}}
@keyframes pgmsBurst{from{transform:translate(0,0) rotate(0);opacity:1}to{transform:translate(var(--dx),var(--dy)) rotate(540deg);opacity:0}}
@media (prefers-reduced-motion:reduce){#pg-ms-pop,#pg-ms-pop .medal{animation:pgmsOut .3s ease-in 2.6s forwards}#pg-ms-pop i{display:none}}`;
    document.head.appendChild(st);
  }
  const el = document.createElement('div'); el.id = 'pg-ms-pop'; el.setAttribute('role', 'status');
  const medal = ['🥉', '🥈', '🥇', '💠'][Math.min(3, tier)] || '🏅';
  el.innerHTML = `<span class="medal" aria-hidden="true">${medal}</span><span>${escH(tx(ui, 'system_tasks.milestones.pop_title', 'Milestone reached!'))}<small>${escH(tx(ui, `system_tasks.milestones.${m.id}.title`, m.title))} · ${escH(tx(ui, `system_tasks.milestones.tier_${tier}`, TIER_NAMES[tier] || ''))}${boardPointsFor(tier) ? ` · <b class="pts">${escH(tx(ui, 'system_tasks.reward_board_points', '+{n} Benefits Board pt', { n: boardPointsFor(tier) }))}</b>` : ''}</small></span>` +
    Array.from({ length: 14 }, (_, i) => `<i style="background:${['#ffc928', '#ff7ad2', '#7ad25a', '#6ec8ff'][i % 4]};--dx:${Math.round(Math.cos(i / 14 * 6.28) * 110)}px;--dy:${Math.round(Math.sin(i / 14 * 6.28) * 70 - 30)}px"></i>`).join('');
  document.body.appendChild(el);
  ui?.scene?.audio?.sfx?.('select');
  setTimeout(() => { el.remove(); done(); }, 2900);
  return el;
}

// ---- quest HUD tracker (DOM; per platform position, PC and phone tuned separately here) -----------------------------
function questHud(scene, ui, qb, platform) {
  const mobile = platform?.id === 'mobile';
  const el = document.createElement('div'); el.id = 'pg-quest-hud';
  // Oct 29 2026 (WD r78 review): moved off the top-left (it hid signs / doors there) to a slim strip at the top centre,
  // smaller on both platforms; phone sits under the notch and clear of the d-pad (bottom-left) and menu (top-right).
  const pos = mobile ? 'top:calc(6px + env(safe-area-inset-top,0px));left:50%;transform:translateX(-50%);max-width:44vw;font-size:11px;padding:3px 8px'
    : 'top:10px;left:50%;transform:translateX(-50%);max-width:min(340px,28vw);font-size:clamp(12px,1.25vh,17px);padding:4px 10px';
  el.style.cssText = `position:fixed;${pos};z-index:2;pointer-events:none;background:rgba(28,22,34,.82);color:#f4ead2;border:2px solid #f4ead2;border-radius:10px;line-height:1.2;opacity:.9;text-align:center;font-family:ui-rounded,"Nunito","Trebuchet MS",system-ui,sans-serif;box-shadow:0 2px 0 rgba(0,0,0,.35)`;
  document.body.appendChild(el);
  const update = () => {
    const q = qb.tracked(scene.flags), busy = ui?.active || scene.busy;
    if (!q || busy) { el.hidden = true; return; }
    const st = qb.status(q, scene.flags), cur = qb.current(q, scene.flags), ar = arenaProgress(scene.flags, scene.map?.name);
    if (ar) { // Aurelith Arena: rooms won this run, not the finale quest's steps (Oct 30 2026)
      const lobby = scene.mapCache?.get?.('aurelith_arena')?.json?.title || 'Aurelith Arena', here = scene.map?.json?.title || '';
      el.innerHTML = `<div style="font-weight:800;opacity:.85">★ ${escH(lobby)} <span style="opacity:.7">${ar.done}/${ar.total}</span></div><div>${escH(ar.room ? here : lobby)}</div>`;
      el.hidden = false; return;
    }
    const p = qb.progress(q, scene.flags);
    // Oct 30 2026 playtest: 'In Person 0/8' read as 0 of 8 coins. Quests gated on all_badges show the coins too.
    const coins = (q.prerequisites || []).includes('all_badges') ? (scene.flags.has('all_badges') ? 8 : Math.min(8, [...scene.flags].filter((f) => /^beat_master_/.test(f)).length)) : null;
    const step = st === 'ready' ? tx(ui, 'system_tasks.report_back', 'Report back.') : stepText(ui, q, cur);
    el.innerHTML = `<div style="font-weight:800;opacity:.85">${q.type === 'main' ? '★ ' : '◆ '}${escH(q.title)} <span style="opacity:.7">${coins != null ? `coins ${coins}/8 · step ` : ''}${p.done}/${p.total}</span></div><div>${escH(step)}</div>`;
    el.hidden = false;
  };
  return { el, update };
}

// ---- Tasks screen (phone > Tasks): pinned story goal, active tasks, milestones, completed (collapsed) -----------------
/** Pure row model for the Tasks screen (tests use it). */
export function taskRows({ qb, mb, flags, masters, data, open = false }) {
  const log = qb.log(flags), act = log.filter((r) => r.status !== 'done'), done = log.filter((r) => r.status === 'done');
  const main = act.find((r) => r.q.type === 'main') || null, nm = nextMaster(masters, flags);
  const rows = [];
  if (main || nm) rows.push({ kind: 'goal', q: main?.q || null, status: main?.status || null, master: nm });
  if (act.length) rows.push({ kind: 'head', id: 'active', n: act.length });
  for (const r of act) rows.push({ kind: 'quest', ...r });
  if (mb) { const ready = mb.readyCount(data); rows.push({ kind: 'head', id: 'milestones', ready }); if (ready > 1) rows.push({ kind: 'claim_all', n: ready }); for (const r of mb.rows(data)) rows.push({ kind: 'ms', ...r }); }
  if (done.length) { rows.push({ kind: 'done_toggle', n: done.length, open }); if (open) for (const r of done) rows.push({ kind: 'quest', ...r }); }
  const empty = !act.length && !done.length && !main && !nm;
  return { rows, empty };
}

function installQuestLog(ui, scene, sys, qb, mb, save, pg, hud) {
  const T = (k, fb, v) => tx(ui, 'system_tasks.' + k, fb, v);
  ui.scr_tasks = function () {
    let open = false;
    const model = () => taskRows({ qb, mb, flags: scene.flags, masters: pg.masters, data: pg.milestoneData(), open });
    const sel = () => model().rows.filter((r) => r.kind !== 'head'); // selectable rows (headers are not)
    const tag = { ready: T('status_ready', 'Report back'), active: T('status_active', 'Active'), done: T('status_done', 'Done') };
    const where = (q, cur, st) => {
      if (st === 'ready' && q.giver?.map) return T('where_giver', 'Back to {place}', { place: placeName(q.giver.map) });
      if (cur?.map) return T('where_go', 'Go: {place}', { place: placeName(cur.map) });
      return q.giver?.map ? T('where_giver_at', 'From: {place}', { place: placeName(q.giver.map) }) : '';
    };
    const stepOf = (q, st) => st === 'done' ? T('step_done', 'All done.') : st === 'ready' ? T('report_back', 'Report back.') : stepText(ui, q, qb.current(q, scene.flags));
    const bar = (v, t) => { const p = Math.max(0, Math.min(1, t ? v / t : 0)); return `<span class="pg-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${t}" aria-valuenow="${Math.min(v, t)}"><span style="width:${Math.round(p * 100)}%"></span></span>`; };
    const msTitle = (m) => T(`milestones.${m.id}.title`, m.title), msRule = (m) => T(`milestones.${m.id}.rule`, m.rule);
    const tierName = (t) => T(`milestones.tier_${t}`, TIER_NAMES[t]);
    const rowHtml = (r, i) => {
      const trk = r.q && qb.tracked(scene.flags)?.id === r.q.id;
      if (r.kind === 'goal') {
        const g = r.q ? `<b>★ ${escH(r.q.title)}</b><span class="soft pg-step">${escH(stepOf(r.q, r.status))}</span>` : '';
        const m = r.master ? `<span class="pg-next">${escH(T('next_master', 'Next Master: {place} Hall', { place: r.master.place }))}</span>` : `<span class="pg-next">${escH(T('all_masters', 'Every Master beaten.'))}</span>`;
        return `<li class="ui-row pg-goal" data-i="${i}"><span class="pg-pin" aria-hidden="true">📌</span><span class="grow">${escH(T('goal_label', 'Story goal'))}${trk ? ` · <span class="pg-trk">${escH(T('tracked', 'Tracked'))}</span>` : ''}<br>${g}${g ? '<br>' : ''}${m}</span></li>`;
      }
      if (r.kind === 'quest') {
        const cur = qb.current(r.q, scene.flags), w = r.status === 'done' ? '' : where(r.q, cur, r.status);
        return `<li class="ui-row pg-q${r.status === 'done' ? ' pg-done' : ''}" data-i="${i}" data-k="${escH(r.q.id)}"><span class="grow"><b>${r.q.type === 'main' ? '★' : '◆'} ${escH(r.q.title)}</b>${trk ? ` <span class="pg-trk">${escH(T('tracked', 'Tracked'))}</span>` : ''}<br><span class="soft pg-step">${escH(stepOf(r.q, r.status))}</span>${w ? `<br><span class="pg-where">${escH(w)}</span>` : ''}</span><span class="soft">${escH(tag[r.status])}</span></li>`;
      }
      if (r.kind === 'ms') {
        const right = r.maxed ? `<span class="pg-claimed">${escH(T('milestones.maxed', 'Complete'))}</span>` : r.ready ? `<button type="button" class="pg-claim" data-act="claim:${escH(r.m.id)}">${escH(T('milestones.claim', 'Claim'))}</button>` : `<span class="soft">${Math.min(r.value, r.target)}/${r.target}</span>`;
        const stars = r.m.tiers.map((_, t) => `<span class="pg-tier t${t}${t < r.tier ? ' on' : ''}" title="${escH(tierName(t))}">●</span>`).join('');
        const next = r.maxed ? T('milestones.all_tiers', 'All tiers claimed') : r.level ? T('milestones.next_level', 'Next: {tier} · {n} at Lv {lv}', { tier: tierName(r.tier), n: r.target, lv: r.level }) : T('milestones.next', 'Next: {tier} · {n}', { tier: tierName(r.tier), n: r.target });
        return `<li class="ui-row pg-ms${r.ready ? ' pg-ready' : ''}" data-i="${i}" data-k="${escH(r.m.id)}"><span class="grow"><b>${escH(msTitle(r.m))}</b> ${stars}<br><span class="pg-next">${escH(next)}</span><br><span class="soft pg-rule">${escH(msRule(r.m))}</span><br>${bar(r.value, r.target)}${r.reward ? ` <span class="pg-rew">${escH(rewardText(ui, r.reward))}</span>` : ''}</span>${right}</li>`;
      }
      if (r.kind === 'claim_all') return `<li class="ui-row pg-ready" data-i="${i}"><span class="grow"><b>${escH(T('milestones.claim_all_row', '{n} rewards ready', { n: r.n }))}</b></span><button type="button" class="pg-claim" data-act="claimall">${escH(T('milestones.claim_all', 'Claim all'))}</button></li>`;
      if (r.kind === 'done_toggle') return `<li class="ui-row pg-toggle" data-i="${i}"><span class="grow">${r.open ? '▾' : '▸'} ${escH(T('completed', 'Completed ({n})', { n: r.n }))}</span></li>`;
      return '';
    };
    const give = (rw) => {
      if (!rw) return;
      if (rw.coins && sys?.wallet) sys.wallet.add(rw.coins);
      if (rw.boardPoints && rw.id) sys?.rtBenefits?.grantPoints?.(rw.boardPoints, `ms:${rw.id}:${rw.tier}`); // RT Employee Benefits board points
      for (const it of rw.items || []) if (sys?.bag?.def?.(it.item)) sys.bag.add(it.item, it.qty || 1); else console.warn('[milestones] reward item not in items.js:', it.item);
    };
    const claim = (id) => {
      const rw = mb.claim(id, pg.milestoneData()); if (!rw) return;
      give(rw); save(); scene.audio?.sfx?.('select');
      scene.toast?.(T('milestones.claimed', 'Claimed: {reward}', { reward: rewardText(ui, rw) }));
      ui.rerender?.();
    };
    const claimAll = () => {
      const all = mb.claimAll(pg.milestoneData()); if (!all.length) return;
      for (const rw of all) give(rw);
      save(); scene.audio?.sfx?.('select');
      scene.toast?.(T('milestones.claimed_all', 'Claimed {n} rewards', { n: all.length }));
      ui.rerender?.();
    };
    const scr = { scr: 'tasks', pat: 'stripes', title: ui.T('system_phone.menu.labels.tasks', 'Tasks'), glyph: 'tasks', sel: 0, cols: 1, count: () => sel().length,
      render: () => { const md = model();
        if (md.empty && !mb) return `<div class="ui-panel ui-pad ui-grow" data-scr="tasks" data-pat="stripes" data-scroll><div class="plate ui-empty">${escH(T('empty', 'No tasks yet. Revival Tech will text you when there is work.'))}</div></div>`;
        let i = 0;
        return `<div class="ui-panel ui-pad ui-grow ui-scroll" data-scr="tasks" data-pat="stripes" data-scroll><ul class="ui-list pg-tasks" data-aa="pg-tasks">${md.rows.map((r) => r.kind === 'head'
          ? `<li class="pg-head" aria-hidden="false">${r.id === 'active' ? escH(T('head_active', 'Active tasks')) : escH(T('head_milestones', 'Milestones')) + (r.ready ? ` <span class="pg-dot" aria-label="${escH(T('milestones.ready_count', '{n} to claim', { n: r.ready }))}">${r.ready}</span>` : '')}</li>`
          : rowHtml(r, i++)).join('')}${md.empty ? `<li class="plate ui-empty">${escH(T('empty', 'No tasks yet. Revival Tech will text you when there is work.'))}</li>` : ''}</ul></div>`; },
      hint: () => { const r = sel()[scr.sel]; const a = r?.kind === 'claim_all' ? T('milestones.claim_all', 'Claim all') : r?.kind === 'ms' ? (r.ready ? T('hint_claim', 'Claim') : null) : r?.kind === 'done_toggle' ? (r.open ? T('hint_hide', 'Hide') : T('hint_show', 'Show')) : r && (r.q && r.status !== 'done') ? T('hint_track', 'Track') : null;
        return ui.hintText?.([...(a ? [['A', a]] : []), ['B', 'Back']]) || ''; },
      onA: (i) => {
        const r = sel()[i]; if (!r) return;
        if (r.kind === 'done_toggle') { open = !open; ui.rerender?.(); return; }
        if (r.kind === 'claim_all') { claimAll(); return; }
        if (r.kind === 'ms') { if (r.ready) claim(r.m.id); return; }
        if (!r.q || r.status === 'done') return;
        qb.state.tracked = r.q.id; save(); hud?.update(); ui.rerender?.(); scene.toast?.(T('toast_tracking', 'Tracking: {task}', { task: r.q.title }));
      },
      onAct: (a) => { if (a === 'claimall') return claimAll(); const m = /^claim:(.+)$/.exec(a || ''); if (m) claim(m[1]); },
    };
    return scr;
  };
  if (typeof document !== 'undefined' && !document.getElementById('pg-tasks-css')) {
    const st = document.createElement('style'); st.id = 'pg-tasks-css';
    st.textContent = `.pg-tasks{--pg-purple:#6c4cf0}/* brand violet = theme.css [data-scr=phone] --sc-a (5.6:1 on --plate) */
.pg-tasks .pg-head{list-style:none;color:var(--pg-purple);font-weight:800;letter-spacing:.06em;text-transform:uppercase;font-size:.78em;opacity:.75;margin:10px 4px 2px}
.pg-goal .pg-step{display:block}.pg-tasks .ui-row{align-items:center;gap:8px;min-height:44px;line-height:1.3}.pg-tasks .pg-goal{border:2px solid var(--pg-purple);background:rgba(108,76,240,.1)}
.pg-tasks .pg-next{font-weight:700;color:var(--pg-purple)}.pg-tasks .pg-where{font-size:.86em;opacity:.85}.pg-tasks .pg-trk{font-size:.75em;background:var(--pg-purple);color:#fffaf0;border-radius:6px;padding:0 5px;font-weight:800}
.pg-tasks .pg-done{opacity:.6}.pg-bar{display:inline-block;vertical-align:middle;width:min(220px,40%);height:9px;border-radius:5px;background:rgba(0,0,0,.35);overflow:hidden;border:1px solid rgba(255,255,255,.35)}
.pg-bar>span{display:block;height:100%;background:linear-gradient(90deg,#7ad25a,#ffc928)}.pg-tier{opacity:.3;font-size:.7em}.pg-tier.on{opacity:1}.pg-rew{font-size:.8em;opacity:.9}
.pg-claim{min-height:40px;min-width:64px;font:800 1em inherit;border-radius:10px;border:2px solid #2b2236;background:#6c4cf0;color:#fffaf0;cursor:pointer;animation:pgClaim 1.2s ease-in-out infinite}
.pg-dot{display:inline-block;min-width:18px;padding:0 5px;border-radius:9px;background:#e8443a;color:#fff;font-size:.8em;text-align:center}.pg-rule{font-size:.85em}.pg-tier.t0.on{color:#c98a4b}.pg-tier.t1.on{color:#c9d1d9}.pg-tier.t2.on{color:#ffc928}.pg-tier.t3.on{color:#b9f2ff}.pg-ready{background:rgba(122,210,90,.14)}.pg-claimed{font-size:.8em;color:#7ad25a;font-weight:800}@keyframes pgClaim{50%{transform:scale(1.07)}}
@media (prefers-reduced-motion:reduce){.pg-claim{animation:none}}@media (max-height:420px){.pg-tasks .ui-row{font-size:12px;padding-top:4px;padding-bottom:4px}.pg-tasks .pg-head{margin:6px 4px 0}}`;
    document.head.appendChild(st);
  }
}

// ---- hall puzzle preview overlay (dev; real hall maps later) --------------------------------------------------------
function openPuzzleOverlay(scene, ui, def, store, platform) {
  if (typeof document === 'undefined') return null;
  const rt = new HallPuzzle(def, store.puzzles[def.zone] || (scene.flags?.has(def.solved_flag) ? { solved: true } : null));
  const wrap = document.createElement('div'); wrap.id = 'pg-puzzle';
  wrap.style.cssText = 'position:fixed;inset:0;z-index:50;background:rgba(18,14,24,.94);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;color:#f4ead2;font-family:ui-rounded,"Nunito",system-ui,sans-serif;touch-action:none';
  const head = document.createElement('div'); head.style.cssText = 'font-weight:800;font-size:clamp(14px,2.2vh,24px);text-align:center';
  const cv = document.createElement('canvas'); cv.style.cssText = 'image-rendering:pixelated;border:3px solid #f4ead2;border-radius:8px;max-width:96vw';
  const pad = document.createElement('div'); pad.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;justify-content:center';
  wrap.append(head, cv, pad); document.body.appendChild(wrap);
  let face = 'U', anim = null, raf = 0;
  const mobile = platform?.id === 'mobile';
  const draw = () => {
    const g = rt.g, ts = Math.floor(Math.min((innerWidth * (mobile ? 0.62 : 0.9)) / g.w, (innerHeight * (mobile ? 0.78 : 0.72)) / g.h, 64));
    cv.width = g.w * ts; cv.height = g.h * ts; const c = cv.getContext('2d');
    c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = `bold ${Math.floor(ts * 0.55)}px sans-serif`;
    if (def.kind === 'gust') { // v6 item 6: Frostspire ice + wind theme, animated (see src/region4/gust_draw.js)
      const now = performance.now(), sl = anim && now < anim.t1 ? anim : null, k = sl ? (now - sl.t0) / (sl.t1 - sl.t0) : 1;
      drawGustBoard(c, def, rt, ts, now, sl ? { x: sl.x0 + (rt.x - sl.x0) * k, y: sl.y0 + (rt.y - sl.y0) * k, sliding: true, dx: Math.sign(rt.x - sl.x0) } : { x: rt.x, y: rt.y });
      head.textContent = `${def.name_placeholder}${rt.solved ? ' · SOLVED' : ''}`;
      return;
    }
    for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) {
      const v = rt.view(x, y); c.fillStyle = v.c; c.fillRect(x * ts, y * ts, ts, ts);
      c.strokeStyle = 'rgba(0,0,0,.25)'; c.strokeRect(x * ts + 0.5, y * ts + 0.5, ts - 1, ts - 1);
      if (v.t) { c.fillStyle = '#1c1622'; c.fillText(v.t, x * ts + ts / 2, y * ts + ts / 2 + 1); }
    }
    if (def.darkness) drawDarkness(c, def, rt, ts);
    c.fillStyle = '#f4ead2'; c.strokeStyle = '#1c1622'; c.lineWidth = 3; c.beginPath(); c.arc(rt.x * ts + ts / 2, rt.y * ts + ts / 2, ts * 0.32, 0, 7); c.fill(); c.stroke();
    const d = { U: [0, -1], D: [0, 1], L: [-1, 0], R: [1, 0] }[face];
    c.fillStyle = '#1c1622'; c.beginPath(); c.arc(rt.x * ts + ts / 2 + d[0] * ts * 0.18, rt.y * ts + ts / 2 + d[1] * ts * 0.18, ts * 0.08, 0, 7); c.fill();
    head.textContent = `${def.name_placeholder}${rt.solved ? ' · SOLVED' : ''}`;
  };
  const act = (a) => {
    if (a === 'A') a = 'A' + face; else face = a;
    const x0 = rt.x, y0 = rt.y, b0 = rt.st?.b;
    const r = rt.act(a);
    if (def.kind === 'gust') { const n = Math.abs(rt.x - x0) + Math.abs(rt.y - y0), now = performance.now(); if (n > 1) anim = { x0, y0, t0: now, t1: now + n * 90 }; if (rt.st?.b !== b0) { rt._rung = now; scene.audio?.sfx?.('select'); } } store.puzzles[def.zone] = rt.toJSON();
    if (r.solvedNow) { scene.setFlag?.(def.solved_flag); scene.toast?.('The way to the Master is open.'); }
    scene.progression?.refreshLamps?.(); // batch 3: overworld reed lamps follow the puzzle state
    draw();
  };
  const close = () => { cancelAnimationFrame(raf); removeEventListener('keydown', key, true); wrap.remove(); };
  const KEYS = { ArrowUp: 'U', KeyW: 'U', ArrowDown: 'D', KeyS: 'D', ArrowLeft: 'L', KeyA: 'L', ArrowRight: 'R', KeyD: 'R', KeyZ: 'A', Enter: 'A', Space: 'A', KeyF: 'A' };
  const key = (e) => { if (e.code === 'Escape' || e.code === 'KeyX') { close(); e.preventDefault(); e.stopPropagation(); return; } const a = KEYS[e.code]; if (!a) return; e.preventDefault(); e.stopPropagation(); act(a); };
  addEventListener('keydown', key, true);
  for (const [t, a] of [['◀', 'L'], ['▲', 'U'], ['▼', 'D'], ['▶', 'R'], ['A', 'A'], ['Close', 'X']]) {
    const b = document.createElement('button'); b.textContent = t;
    b.style.cssText = 'min-width:48px;min-height:44px;font:800 18px system-ui;border-radius:10px;border:2px solid #f4ead2;background:#3a2f48;color:#f4ead2';
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); if (a === 'X') close(); else act(a); }); // touch-ok: puzzle d-pad: a press must register instantly
    pad.appendChild(b);
  }
  draw();
  if (def.kind === 'gust' && typeof requestAnimationFrame === 'function') { const loop = () => { if (!wrap.isConnected) return; draw(); raf = requestAnimationFrame(loop); }; raf = requestAnimationFrame(loop); }
  return { rt, act, draw, close, el: wrap };
}

// ---- halls 2-8: NPC placement + text (Coder halls wiring, Oct 23 2026) -------------------------------------------------
// World Design keeps hall NPCs in npcs_pending_text until Text Bot adds maps.<hall_map>.* keys; the engine places them only
// when lines.maps.<hall_map> exists and _entryFor finds an entry. Here: an empty (runtime-only) maps.<hall_map> block and a
// wrapped _entryFor (normal lookup first, then Text Bot's draft paths, then a clean fallback). Text files are not touched.
function wireHallText(scene, data) {
  if (typeof scene._entryFor !== 'function') return;
  const lines = (scene.lines ||= {}); lines.maps ||= {};
  const base = scene._entryFor.bind(scene);
  scene._entryFor = (mapName, def) => {
    const e = chainAfter(withOpener(scene.lines, base(mapName, def), scene.flags, scene.env?.() || {})); // Ron 2-6 opener link; after_2 follows after
    return hallEntry(scene.lines, data, mapName, def, e, scene.flags) || e;
  };
  for (const h of data.halls) {
    if (h.zone === 'fernwick' || !h.map_built) continue;
    lines.maps[h.hall_map] ||= {};
    if (scene.map?.name !== h.hall_map) scene.mapCache?.delete?.(h.hall_map); // loaded before this hook: place NPCs on next load
  }
}

// ---- Mirefen darkness overlay: dark cells, lit reed lamps cast light circles (no weather effect) -----------------------
function drawDarkness(c, def, rt, ts) {
  const g = rt.g;
  for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) {
    const l = lightAt(def, rt.st, x, y, rt.x, rt.y); if (l >= 1) continue;
    c.fillStyle = `rgba(6,5,14,${(0.9 * (1 - l)).toFixed(3)})`; c.fillRect(x * ts, y * ts, ts, ts);
  }
  if ((rt.st?.p || 0) >= def.order.length) return;
  c.save(); c.globalCompositeOperation = 'lighter';
  for (const id of litLamps(def, rt.st)) {
    const cell = lampCell(def, id); if (!cell) continue;
    const cx = cell[0] * ts + ts / 2, cy = cell[1] * ts + ts / 2, r = (def.darkness.radius || 3) * ts;
    const gr = c.createRadialGradient(cx, cy, 0, cx, cy, r); gr.addColorStop(0, 'rgba(255,200,110,.35)'); gr.addColorStop(1, 'rgba(255,200,110,0)');
    c.fillStyle = gr; c.beginPath(); c.arc(cx, cy, r, 0, 7); c.fill();
  }
  c.restore();
}
