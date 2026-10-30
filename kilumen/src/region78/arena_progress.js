// Aurelith Arena run progress for the quest HUD (Oct 30 2026 playtest: the tracker showed the finale quest 'In Person 0/8'
// through the whole Arena run). Pure, no imports (progression/index.js uses it; arena.js owns the flag names).
export const ARENA_ROOMS = 8;
export const isArenaMap = (name) => /^aurelith_arena(_room_\d+)?$/.test(name || '');
/** -> null off the Arena maps; else {done, total, room}: rooms won this run (all 8 once cleared and no run is going). */
export function arenaProgress(flags, mapName) {
  if (!isArenaMap(mapName) || !flags) return null;
  let done = 0; while (done < ARENA_ROOMS && flags.has(`arena_room_${done + 1}_won`)) done++;
  if (!flags.has('arena_run') && flags.has('arena_cleared')) done = ARENA_ROOMS;
  const m = /_room_(\d+)$/.exec(mapName);
  return { done, total: ARENA_ROOMS, room: m ? +m[1] : 0 };
}
