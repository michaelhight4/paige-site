// Aurelith Arena (Coder, Oct 29 2026; Gary pt2150u, themed rooms 6:04 PM CT pt2156u). Maps (tools/city/build_aurelith_arena.py):
// aurelith_arena = sign-up lobby behind the stadium lobby's coin-locked doors (gate_aurelith_arena, flag all_badges);
// aurelith_arena_room_1..8 = one small battle room per Arena fighter, themed to the fighter's type, in a chain.
// BACK TO BACK: talking to fighter 1 (room 1) starts the run. Beating fighter N sets arena_room_N_won, which opens the
// stairs gate (gate_arena_room_N) to room N+1. No clinic anywhere in the chain; walking back down to the lobby, or a loss
// (blackout to the last clinic, like Ron 2-6), ends the run and clears the room flags, so the next run starts from room 1.
// Win all 8 -> ARENA.clearFlag, then back to the lobby. Each fighter is one type (every Kilu carries that type),
// 6 final-stage Kilu, L59-69, ace 67-69. Teams: TRAINER_TEAMS 'aurelith_arena_room_N.arena_fighter_N' (ARENA_TEAMS below).
// Names come from text (maps.aurelith_arena.arena_fighter_N.name, Text Bot); `name` below is only the DRAFT fallback.
// Final Ron is NOT here: his key stays aurelith_arena_int.aurelith_arena_ron_final (the tower, not built yet).
// Text: DRAFT keys maps.aurelith_arena.* + system_arena.* (Text Bot; data/textbot_requests_arena.md). Fallbacks below.
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
  lostLine: (f, name = f.name) => [`${name}: Good fight. Keep going.`],
};
const getPath = (o, p) => p.split('.').reduce((a, k) => a?.[k], o);

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
    match: (mapName, def) => (mapName === ARENA.map && def?.id === ARENA.clerk)
      || ARENA.fighters.some((f, i) => mapName === ARENA.room(i + 1) && def?.id === f.id),
    run: async ({ def, speaker }) => {
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
          scene.startWarp?.({ map: ARENA.map, x: 8, y: 3, facing: 'down' }, 'door');
        },
      }, f);
    },
  };
}
