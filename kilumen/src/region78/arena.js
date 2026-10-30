// Aurelith Arena (Coder, Oct 29 2026; Gary pt2150u, themed rooms 6:04 PM CT pt2156u). Maps (tools/city/build_aurelith_arena.py):
// aurelith_arena = sign-up lobby behind the stadium lobby's coin-locked doors (gate_aurelith_arena, flag all_badges);
// aurelith_arena_room_1..8 = one small battle room per Arena fighter, themed to the fighter's type, in a chain.
// BACK TO BACK: talking to fighter 1 (room 1) starts the run. Beating fighter N sets arena_room_N_won, which opens the
// stairs gate (gate_arena_room_N) to room N+1. No clinic anywhere in the chain; walking back down to the lobby, or a loss
// (blackout to the last clinic, like Ron 2-6), ends the run and clears the room flags, so the next run starts from room 1.
// Win all 8 -> ARENA.clearFlag, then back to the lobby. Each fighter is one type (every Kilu carries that type),
// 6 final-stage Kilu, L59-69, ace 67-69. Teams: TRAINER_TEAMS 'aurelith_arena_room_N.arena_fighter_N' (ARENA_TEAMS below).
// Names come from text (maps.aurelith_arena.arena_fighter_N.name, Text Bot); `name` below is only the DRAFT fallback.
// Final Ron (r78 wiring, Coder Oct 29 2026; story_beats F-0 rev 2 + Q-F11): rooms 1-8 ARE the stadium tower. First full clear:
// Ron at the top says ron.tower_top_wait and heads down, ENDING.tower[0] (floor 8 done) is set, then the stadium full heal
// (system heal, NOT Ron's: Gary dropped Ron's free heal) sets tower_healed via heal.js markTowerHeal. Ron then waits by the
// lobby exit (map NPC aurelith_arena_ron_final, active_when tower_healed): ron.bottom_congrats + ron.ron7_intro, then the
// battle under his key aurelith_arena_int.aurelith_arena_ron_final (ron_team.js RON_FINAL, story.js TRAINER_RESULTS: a win sets
// both Ron 7 win flags, ENDING.tower[1..2]), then ron.ron7_lose / ron.ron7_after and the ending (ending.js endingDue). Loss = blackout.
// Text: DRAFT keys maps.aurelith_arena.* + system_arena.* (Text Bot; data/textbot_requests_arena.md). Fallbacks below.
import { RON_FINAL } from '../battle/data/ron_team.js?v=v0.2.93-alpha';
import { trainerOutcome } from '../battle/story.js?v=v0.2.93-alpha';
import { ENDING, endingDue, runInterimEnding } from '../progression/ending.js?v=v0.2.93-alpha';
import { markTowerHeal } from '../systems/heal.js?v=v0.2.93-alpha';
import { Npc } from '../overworld/npcs.js?v=v0.2.93-alpha';
import { townRonCell } from '../overworld/ron_whereabouts.js?v=v0.2.93-alpha';
export const ARENA = {
  map: 'aurelith_arena', room: (n) => `aurelith_arena_room_${n}`, runFlag: 'arena_run', wonFlag: (n) => `arena_room_${n}_won`, clerk: 'aurelith_arena_clerk', clearFlag: 'arena_cleared', winsCounter: 'arena_wins',
  fighters: [
    { id: 'arena_fighter_1', type: 'water', name: 'Marisol', team: ['torrentpike', 'bulwarkrab', 'ribboneel', 'cascadorn', 'moorcoil', 'hullwhale'], ace: 67 },
    { id: 'arena_fighter_2', type: 'fire', name: 'Ignatia', team: ['kilnpaw', 'scorchkite', 'calderock', 'pyrogrim', 'obsidiax', 'calderax'], ace: 67 },
    { id: 'arena_fighter_3', type: 'wind', name: 'Zephra', team: ['millwhirl', 'foalgust', 'highkite', 'squallwhirl', 'skyrender', 'stratodrake'], ace: 68 },
    { id: 'arena_fighter_4', type: 'earth', name: 'Ottoline', team: ['cragmont', 'delvemaw', 'geodurchin', 'cairnhorn', 'ingotitan', 'geodrake'], ace: 68 },
    { id: 'arena_fighter_5', type: 'grass', name: 'Fennick', team: ['thistlehound', 'fernstag', 'toadcap', 'glassvine', 'bramblehog', 'sproutwyrm'], ace: 68 },
    { id: 'arena_fighter_6', type: 'light', name: 'Iona', team: ['prismite', 'glarekit', 'prismwing', 'seaglint', 'halovy', 'northling'], ace: 69 },
    { id: 'arena_fighter_7', type: 'mystic', name: 'Oriel', team: ['gearwarden', 'mirrorkin', 'facetarch', 'runeskein', 'pearlisk', 'novarch'], ace: 69 },
    { id: 'arena_fighter_8', type: 'dark', name: 'Corvin', team: ['velvetabby', 'crowkin', 'vesperowl', 'bleachghast', 'wreckwarden', 'maestrix'], ace: 69 },
  ],
  levels: [59, 61, 62, 64, 65], // slots 1-5; slot 6 = the fighter's ace level
};
export const arenaTeam = (f) => [...ARENA.levels.map((level, i) => ({ species: f.team[i], level })), { species: f.team[5], level: f.ace }];
/** 1-based room of a fighter. */
export const roomOf = (f) => ARENA.fighters.indexOf(f) + 1;
/** TRAINER_TEAMS entries: 'aurelith_arena_room_N.arena_fighter_N' -> team. */
export const ARENA_TEAMS = Object.fromEntries(ARENA.fighters.map((f, i) => [`${ARENA.room(i + 1)}.${f.id}`, arenaTeam(f)]));

export const ARENA_KEYS = {
  clerk: 'maps.aurelith_arena.aurelith_arena_clerk', clerkCleared: 'system_arena.clerk_cleared',
  start: 'system_arena.run_start', next: 'system_arena.next_fighter', lost: 'system_arena.run_lost', won: 'system_arena.run_won', waiting: 'system_arena.fighter_waiting', beaten: 'system_arena.fighter_beaten',
  fighter: (id) => `maps.aurelith_arena.${id}`, // .pages = challenge, .battle_lost = after the player wins, .battle_won = player lost
};
// DRAFT code fallbacks (Text Bot replaces); no banned words.
export const ARENA_FALLBACK = {
  clerk: ['Welcome to the Aurelith Arena.', 'Eight Arena fighters, back to back. No breaks, no clinic in between.', 'Take the stairs to the first room when you are ready.'],
  clerkCleared: ['All eight, back to back. The board has your name on it now.'],
  start: ['Eight fights, one after another. Ready?'],
  next: ['The stairs to the next room are open.'],
  lost: ['The run ends here. Come back and start again from the first fighter.'],
  won: ['That is all eight! You cleared the Aurelith Arena.'],
  waiting: ['Start with the first fighter, in the first room. We go in order.'],
  beaten: ['The stairs are open. Keep going!'],
  challenge: (f, name = f.name) => [`${name}, Arena fighter. ${f.type[0].toUpperCase() + f.type.slice(1)} type, all the way.`],
  steward8: ['The last room. Corvin has been waiting all day.', 'Take your time. Nobody rushes the last fight.'],
  fan8: ['I climbed all eight floors just to watch this one.', 'No pressure. Well. Some pressure.'],
  lostLine: (f, name = f.name) => [`${name}: Good fight. Keep going.`],
};
const getPath = (o, p) => p.split('.').reduce((a, k) => a?.[k], o);

/** Final Ron (Ron 7) at the tower bottom. Fallbacks are DRAFT code text only. */
export const RON7 = {
  id: 'aurelith_arena_ron_final', battleMap: 'aurelith_arena_int', // RON_FINAL.key = `${battleMap}.${id}`
  // Approved text (Gary 5:55 PM CT, text/overworld_lines.json ron.final_tower; story_beats names: ron.tower_top_wait /
  // ron.bottom_congrats / ron.ron7_intro / ron7_lose / ron7_after). Only the heal line is new (data/textbot_requests_r78_ron.md).
  keys: { top: 'ron.final_tower.top_wait', congrats: 'ron.final_tower.intro', intro: 'ron.final_tower.challenge', lose: 'ron.final_tower.battle_lost',
    won: 'ron.final_tower.battle_won', after: 'ron.final_tower.after', heal: 'system_arena.tower_heal' },
  fallback: {
    top: ['Already did this one. See you downstairs.'],
    congrats: ['Congrats. Three hours. I counted.'],
    intro: ['One more, then. You and me.', 'No heal from me this time. You sorted that yourself.'],
    lose: ['...Yeah. That one is yours.'],
    won: ['Ha! Got you. Go heal up. I will still be here.'],
    after: ['Go on. Head Office is waiting, apparently.'],
    heal: ['The stadium staff patch your team up. All Kilu are fully healed.'],
  },
};
/** Pure: what the tower-bottom Ron does now -> 'fight' | 'after' | 'absent'. */
export function ron7State(flags) {
  if (flags.has(RON_FINAL.winFlag)) return 'after';
  return RON_FINAL.requires.every((f) => flags.has(f)) ? 'fight' : 'absent';
}

/** Pure: the run order from fighter 1 (always the full 8; a loss restarts from 1). */
export const runOrder = () => ARENA.fighters.map((f) => f.id);
/** Pure: every flag the run uses (cleared on a loss, on leaving to the lobby and after a full clear). */
export const runFlags = () => [ARENA.runFlag, ...ARENA.fighters.map((f, i) => ARENA.wonFlag(i + 1))];

/** Pure: what talking to fighter n (1-based) does now. flags: Set-like {has}.
 *  -> 'start' (ask, room 1) | 'fight' | 'beaten' (already won this run) | 'waiting' (run not here yet) */
export function fighterState(flags, n) {
  if (flags.has(ARENA.wonFlag(n))) return 'beaten';
  if (!flags.has(ARENA.runFlag)) return n === 1 ? 'start' : 'waiting';
  return n === 1 || flags.has(ARENA.wonFlag(n - 1)) ? 'fight' : 'waiting';
}

/** One room's fight. ctx: {n, battle()->won?, say(pages), set(flag), reset(), onWin(), onLoss(), done()} -> 'won'|'next'|'lost' */
export async function fightRoom(ctx, f) {
  const n = roomOf(f);
  await ctx.say(ctx.fighter(f, 'pages'), f);
  const won = await ctx.battle(f);
  if (won === false) { await ctx.say(ctx.fighter(f, 'battle_won'), f); await ctx.say(ctx.text('lost'), null); ctx.reset(); await ctx.onLoss?.(f); return 'lost'; }
  await ctx.say(ctx.fighter(f, 'battle_lost'), f); await ctx.onWin?.(f);
  if (n < ARENA.fighters.length) { ctx.set(ARENA.wonFlag(n)); await ctx.say(ctx.text('next'), null); return 'next'; }
  await ctx.say(ctx.text('won'), null); ctx.reset(); await ctx.done?.(); return 'won';
}

const ROOM8_LIFE = { arena_steward_8: 'steward8', arena_fan_8: 'fan8' }; // room 8 arrival life (Oct 30)
/** overworld.js talkHooks entry: the clerk (lobby) and fighter N in aurelith_arena_room_N. */
export function arenaHook(scene) {
  const look = (k) => { const v = getPath(scene.lines, k); const p = Array.isArray(v) ? v : v?.pages; return p?.length ? p : null; };
  const text = (k) => look(ARENA_KEYS[k]) || ARENA_FALLBACK[k];
  const nameOf = (f) => getPath(scene.lines, ARENA_KEYS.fighter(f.id))?.name || f.name;
  const fighter = (f, part) => {
    const e = getPath(scene.lines, ARENA_KEYS.fighter(f.id));
    const v = part === 'pages' ? (e?.pages || (Array.isArray(e) ? e : null)) : e?.[part];
    return v?.length ? v : part === 'pages' ? ARENA_FALLBACK.challenge(f, nameOf(f)) : part === 'battle_lost' ? ARENA_FALLBACK.lostLine(f, nameOf(f)) : [];
  };
  const flags = scene.flags;
  const set = (fl, on = true) => (scene.setFlag ? scene.setFlag(fl, on) : on ? flags.add(fl) : flags.delete(fl));
  const reset = () => { for (const fl of runFlags()) if (flags.has(fl)) set(fl, false); };
  // Leaving the chain for the lobby ends the run (no healing between fights).
  if (scene._enterMap && !scene._arenaEnter) {
    scene._arenaEnter = true; const prev = scene._enterMap.bind(scene);
    scene._enterMap = async (...a) => { const r = await prev(...a); if (scene.map?.name === ARENA.map && flags.has(ARENA.runFlag)) reset(); return r; };
  }
  const npcOf = (id) => scene.npcs?.list?.find?.((n) => n.id === id);
  const sp = (f) => (f ? scene.speakerFor?.(npcOf(f.id), true) || { name: nameOf(f) } : null);
  return {
    match: (mapName, def) => (mapName === ARENA.map && (def?.id === ARENA.clerk || def?.id === RON7.id)) || (mapName === ARENA.room(8) && ROOM8_LIFE[def?.id])
      || ARENA.fighters.some((f, i) => mapName === ARENA.room(i + 1) && def?.id === f.id),
    run: async ({ def, speaker }) => {
      if (ROOM8_LIFE[def.id] && scene.map?.name === ARENA.room(8)) return scene.say(look(`maps.${ARENA.room(8)}.${def.id}`) || ARENA_FALLBACK[ROOM8_LIFE[def.id]], speaker);
      if (def.id === RON7.id) return ron7Talk(scene, speaker);
      if (def.id === ARENA.clerk) return scene.say(flags.has(ARENA.clearFlag) ? text('clerkCleared') : text('clerk'), speaker);
      const f = ARENA.fighters.find((x) => x.id === def.id), n = roomOf(f), st = fighterState(flags, n);
      if (st === 'waiting') return scene.say(text('waiting'), speaker);
      if (st === 'beaten') return scene.say(text('beaten'), speaker);
      if (!(scene.systems?.party?.list || scene.party || []).length) return scene.say(['I need a Kilu to fight with.']);
      if (st === 'start') { if ((await scene.ask?.(text('start'), ['Yes', 'No'], speaker)) === 1) return; set(ARENA.runFlag); }
      const map = ARENA.room(n);
      return fightRoom({
        text, fighter, set, reset,
        say: (pages, who) => (pages?.length ? scene.say(pages, sp(who)) : Promise.resolve()),
        battle: () => (scene.hooks?.onBattle ? scene.hooks.onBattle({ map, id: f.id }) : true),
        onWin: async () => { scene.seen[`defeated:${map}.${f.id}`] = true; await scene.systems?.onTrainerWin?.({ map, def: { id: f.id, kind: 'trainer' }, speaker: sp(f) }); },
        onLoss: async () => { const out = await scene.systems?.onTrainerLoss?.({ map, def: { id: f.id } }); if (!out) await scene.systems?.onPartyFainted?.(); },
        done: async () => {
          if (!flags.has(ARENA.clearFlag)) set(ARENA.clearFlag);
          if (scene.bump) scene.bump(ARENA.winsCounter); else if (scene.counters) scene.counters[ARENA.winsCounter] = (scene.counters[ARENA.winsCounter] || 0) + 1;
          if (!flags.has(ENDING.tower[0]) && !flags.has(RON_FINAL.winFlag)) await towerTop(scene, set);
          scene.startWarp?.({ map: ARENA.map, x: 8, y: 3, facing: 'down' }, 'door');
        },
      }, f);
    },
  };
}

const ronLines = (scene, k) => { const v = getPath(scene.lines, RON7.keys[k]); const p = Array.isArray(v) ? v : v?.pages; return p?.length ? p : RON7.fallback[k]; };
const ronSpeaker = (scene, n) => scene.speakerFor?.(n || { id: RON7.id, def: { id: RON7.id } }) || { name: 'Ron' };

/** Floor 8 cleared for the first time: Ron's top-of-tower line, the floor 8 flag, then the stadium full heal (-> tower_healed). */
export async function towerTop(scene, set) {
  let ron = null;
  try {
    const m = scene.map, c = m && scene.player && townRonCell(scene);
    if (c && scene.npcs?.list) {
      ron = new Npc({ id: `${RON7.id}_top`, kind: 'object', x: c.x, y: c.y, facing: 'down', story: true }, m.name, scene.spriteMap?.['house_1f.ron'] || null, false);
      ron.behaviour = 'static'; ron.faceToward?.(scene.player.x, scene.player.y);
      scene.npcs.list.push(ron); m.occupy?.(ron.x, ron.y, ron); scene.story?.loadImgs?.(ron);
    }
  } catch { ron = null; }
  await scene.say(ronLines(scene, 'top'), ronSpeaker(scene, ron));
  if (ron) { const i = scene.npcs.list.indexOf(ron); if (i >= 0) scene.npcs.list.splice(i, 1); scene.map?.vacate?.(ron.x, ron.y, ron); }
  set(ENDING.tower[0]);
  scene.systems?.party?.healAll?.();
  markTowerHeal(scene); // sets tower_healed (RON_FINAL.requires[1]): Ron now waits at the bottom
  scene.healedAt = scene.ms; scene.log?.push?.({ tick: scene.tick, type: 'heal', branch: 'aurelith_tower' });
  await scene.say(ronLines(scene, 'heal'), { name: null, portrait: null });
}

/** Tower-bottom Ron: congrats + intro, the Ron 7 battle, then his lines and the ending. */
export async function ron7Talk(scene, speaker) {
  const st = ron7State(scene.flags);
  if (st === 'after') return scene.say(ronLines(scene, 'after'), speaker);
  if (st === 'absent') return undefined;
  if (!(scene.systems?.party?.list || scene.party || []).length) return scene.say(['I need a Kilu to fight with.']);
  await scene.say([...ronLines(scene, 'congrats'), ...ronLines(scene, 'intro')], speaker);
  const map = RON7.battleMap, id = RON7.id, def = { id, kind: 'trainer' };
  const won = scene.hooks?.onBattle ? await scene.hooks.onBattle({ map, id }) : true;
  scene.log?.push?.({ tick: scene.tick, type: 'battle', npc: id, won });
  const story = trainerOutcome(map, id, won !== false);
  if (won !== false) {
    scene.seen[`defeated:${map}.${id}`] = true;
    for (const f of story.flags) if (!scene.flags.has(f)) scene.setFlag(f);
    await scene.say(ronLines(scene, 'lose'), speaker);
    await scene.systems?.onTrainerWin?.({ map, def, speaker });
    await scene.say(ronLines(scene, 'after'), speaker);
    if (endingDue(scene.flags)) await runInterimEnding(scene);
    return 'won';
  }
  await scene.say(ronLines(scene, 'won'), speaker);
  const out = await scene.systems?.onTrainerLoss?.({ map, def });
  if (story.blackoutOnLoss && !out) await scene.systems?.onPartyFainted?.();
  return 'lost';
}
