// Aurelith Arena (Coder, Oct 29 2026; Gary pt2150u). Map aurelith_arena (tools/city/build_aurelith_arena.py): behind the
// stadium lobby's coin-locked doors (gate_aurelith_arena, flag all_badges). Sign-up clerk in the lobby; 8 Arena fighters in
// the event room, fought BACK TO BACK: talking to fighter 1 starts the run, fighters 1-8 battle in order with no heal in
// between. A loss ends the run (blackout to the last clinic, like Ron 2-6) and the next run starts again from fighter 1.
// Win all 8 -> ARENA.clearFlag. Each fighter is one type (every Kilu carries that type), 6 final-stage Kilu, L59-69,
// ace 67-69. Teams: TRAINER_TEAMS 'aurelith_arena.arena_fighter_N' (trainer_teams.js reads ARENA_TEAMS below).
// Final Ron is NOT here: his key stays aurelith_arena_int.aurelith_arena_ron_final (the tower, not built yet).
// Text: DRAFT keys maps.aurelith_arena.* + system_arena.* (Text Bot; data/textbot_requests_arena.md). Fallbacks below.
export const ARENA = {
  map: 'aurelith_arena', clerk: 'aurelith_arena_clerk', clearFlag: 'arena_cleared', winsCounter: 'arena_wins',
  fighters: [
    { id: 'arena_fighter_1', type: 'water', name: 'Marlo', team: ['torrentpike', 'bulwarkrab', 'ribboneel', 'cascadorn', 'moorcoil', 'hullwhale'], ace: 67 },
    { id: 'arena_fighter_2', type: 'fire', name: 'Sabine', team: ['kilnpaw', 'scorchkite', 'calderock', 'pyrogrim', 'obsidiax', 'calderax'], ace: 67 },
    { id: 'arena_fighter_3', type: 'wind', name: 'Teo', team: ['millwhirl', 'foalgust', 'highkite', 'squallwhirl', 'skyrender', 'stratodrake'], ace: 68 },
    { id: 'arena_fighter_4', type: 'earth', name: 'Hesper', team: ['cragmont', 'delvemaw', 'geodurchin', 'cairnhorn', 'ingotitan', 'geodrake'], ace: 68 },
    { id: 'arena_fighter_5', type: 'grass', name: 'Bram', team: ['thistlehound', 'fernstag', 'toadcap', 'glassvine', 'bramblehog', 'sproutwyrm'], ace: 68 },
    { id: 'arena_fighter_6', type: 'light', name: 'Iona', team: ['prismite', 'glarekit', 'prismwing', 'seaglint', 'halovy', 'northling'], ace: 69 },
    { id: 'arena_fighter_7', type: 'mystic', name: 'Quill', team: ['gearwarden', 'mirrorkin', 'facetarch', 'runeskein', 'pearlisk', 'novarch'], ace: 69 },
    { id: 'arena_fighter_8', type: 'dark', name: 'Corvin', team: ['velvetabby', 'crowkin', 'vesperowl', 'bleachghast', 'wreckwarden', 'maestrix'], ace: 69 },
  ],
  levels: [59, 61, 62, 64, 65], // slots 1-5; slot 6 = the fighter's ace level
};
export const arenaTeam = (f) => [...ARENA.levels.map((level, i) => ({ species: f.team[i], level })), { species: f.team[5], level: f.ace }];
/** TRAINER_TEAMS entries: 'aurelith_arena.arena_fighter_N' -> team. */
export const ARENA_TEAMS = Object.fromEntries(ARENA.fighters.map((f) => [`${ARENA.map}.${f.id}`, arenaTeam(f)]));

export const ARENA_KEYS = {
  clerk: 'maps.aurelith_arena.aurelith_arena_clerk', clerkCleared: 'system_arena.clerk_cleared',
  start: 'system_arena.run_start', next: 'system_arena.next_fighter', lost: 'system_arena.run_lost', won: 'system_arena.run_won', waiting: 'system_arena.fighter_waiting',
  fighter: (id) => `maps.aurelith_arena.${id}`, // .pages = challenge, .battle_lost = after the player wins, .battle_won = player lost
};
// DRAFT code fallbacks (Text Bot replaces); no banned words.
export const ARENA_FALLBACK = {
  clerk: ['Welcome to the Aurelith Arena.', 'Eight Arena fighters, back to back. No breaks, no clinic in between.', 'Talk to the first fighter through that door when you are ready.'],
  clerkCleared: ['All eight, back to back. The board has your name on it now.'],
  start: ['Eight fights, one after another. Ready?'],
  next: ['Next fighter, step up!'],
  lost: ['The run ends here. Come back and start again from the first fighter.'],
  won: ['That is all eight! You cleared the Aurelith Arena.'],
  waiting: ['Start with the first fighter, by the door. We go in order.'],
  challenge: (f) => [`${f.name}, Arena fighter. ${f.type[0].toUpperCase() + f.type.slice(1)} type, all the way.`],
  lostLine: (f) => [`${f.name}: Good fight. Keep going.`],
};
const getPath = (o, p) => p.split('.').reduce((a, k) => a?.[k], o);

/** Pure: the run order from fighter 1 (always the full 8; a loss restarts from 1). */
export const runOrder = () => ARENA.fighters.map((f) => f.id);

/** Run the 8 fights back to back. ctx: {battle(id)->won?, say(pages, who), onWin(id), onLoss()}. -> {won, beaten} */
export async function runArena(ctx) {
  let beaten = 0;
  for (const f of ARENA.fighters) {
    if (beaten) await ctx.say(ctx.text('next'), null);
    await ctx.say(ctx.fighter(f, 'pages'), f);
    const won = await ctx.battle(f.id);
    if (won === false) { await ctx.say(ctx.fighter(f, 'battle_won'), f); await ctx.say(ctx.text('lost'), null); await ctx.onLoss?.(f); return { won: false, beaten }; }
    beaten++; await ctx.say(ctx.fighter(f, 'battle_lost'), f); await ctx.onWin?.(f);
  }
  await ctx.say(ctx.text('won'), null);
  return { won: true, beaten };
}

/** overworld.js talkHooks entry: the clerk and the 8 fighters on aurelith_arena. */
export function arenaHook(scene) {
  const look = (k) => { const v = getPath(scene.lines, k); const p = Array.isArray(v) ? v : v?.pages; return p?.length ? p : null; };
  const text = (k) => look(ARENA_KEYS[k]) || ARENA_FALLBACK[k];
  const fighter = (f, part) => {
    const e = getPath(scene.lines, ARENA_KEYS.fighter(f.id));
    const v = part === 'pages' ? (e?.pages || (Array.isArray(e) ? e : null)) : e?.[part];
    return v?.length ? v : part === 'pages' ? ARENA_FALLBACK.challenge(f) : part === 'battle_lost' ? ARENA_FALLBACK.lostLine(f) : [];
  };
  const npcOf = (id) => scene.npcs?.list?.find?.((n) => n.id === id);
  return {
    match: (mapName, def) => mapName === ARENA.map && (def?.id === ARENA.clerk || /^arena_fighter_\d$/.test(def?.id || '')),
    run: async ({ def, speaker }) => {
      if (def.id === ARENA.clerk) return scene.say(scene.flags.has(ARENA.clearFlag) ? text('clerkCleared') : text('clerk'), speaker);
      if (def.id !== ARENA.fighters[0].id) return scene.say(text('waiting'), speaker);
      if (!(scene.systems?.party?.list || scene.party || []).length) return scene.say(['I need a Kilu to fight with.']);
      if ((await scene.ask?.(text('start'), ['Yes', 'No'], speaker)) === 1) return;
      const sp = (f) => (f ? scene.speakerFor?.(npcOf(f.id), true) || { name: f.name } : null);
      const res = await runArena({
        text, fighter,
        say: (pages, f) => (pages?.length ? scene.say(pages, sp(f)) : Promise.resolve()),
        battle: (id) => (scene.hooks?.onBattle ? scene.hooks.onBattle({ map: ARENA.map, id }) : true),
        onWin: async (f) => { scene.seen[`defeated:${ARENA.map}.${f.id}`] = true; await scene.systems?.onTrainerWin?.({ map: ARENA.map, def: { id: f.id, kind: 'trainer' }, speaker: sp(f) }); },
        onLoss: async (f) => { const out = await scene.systems?.onTrainerLoss?.({ map: ARENA.map, def: { id: f.id } }); if (!out) await scene.systems?.onPartyFainted?.(); },
      });
      if (res.won) {
        if (!scene.flags.has(ARENA.clearFlag)) scene.setFlag(ARENA.clearFlag);
        if (scene.bump) scene.bump(ARENA.winsCounter); else if (scene.counters) scene.counters[ARENA.winsCounter] = (scene.counters[ARENA.winsCounter] || 0) + 1;
      }
      return res;
    },
  };
}
