/**
 * Kilumen Underground + Guardian side stories (dev/underground, Oct 30 2026).
 * Outline: design/UNDERGROUND_GUARDIAN_SIDESTORIES.md (Story Bot, commit 1e7792c). Built by tools/underground/build_underground.py.
 * The quests, spots and lines are plain data (quests.json, map interact_spots, overworld_lines.json v2 lines); this module only adds
 * the one thing data can't: a "look once per game day" counter (spot.daily_counter), used by Two Pots (R1.1, three days of looking).
 */
export const UG_SEEN_PREFIX = 'ug:';

/** Pure: should this spot look bump its daily counter? (flags: Set, seenDay: {key: day}, day: number) */
export function dailyBump(sp, flags, seenDay, day) {
  if (!sp?.daily_counter) return false;
  if (sp.daily_requires && ![].concat(sp.daily_requires).every((f) => flags.has(f))) return false;
  if (sp.daily_stop && flags.has(sp.daily_stop)) return false;
  return seenDay[UG_SEEN_PREFIX + sp.id] !== day;
}

export function attachUnderground(scene) {
  const ug = {
    /** Never consumes the spot: bumps the counter (once a day) and lets the normal line pick run. */
    async runSpot(sp) {
      if (dailyBump(sp, scene.flags, scene.seenDay, scene.clock?.day ?? 0)) {
        scene.seenDay[UG_SEEN_PREFIX + sp.id] = scene.clock?.day ?? 0;
        scene.bump(sp.daily_counter);
      }
      return false;
    },
  };
  scene.underground = ug;
  return ug;
}
