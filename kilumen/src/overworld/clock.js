// Kilumen: in-game clock + time-of-day phase (pure). time_of_day/grades.json schedule:
// dawn 05-07, day 08-16, dusk 17-19, night 20-04. Clock: 1 real minute = 1 game hour (1 real s = 1 game min).
// Indoor rule: interiors and caves (INDOOR_OR_CAVE below: *_int, house_*, home_*, heal_*, lab_*, rt_*, mart_*,
// station_*, hall_*, greystone*) stay on the `day` grade, except FOLLOWS_OUTDOOR_CLOCK (club_int); lantern_rest
// (not an interior) follows the outdoor clock too. Window tiles always
// show the OUTDOOR phase. INDOOR_OR_CAVE is the one list in src (living.js imports it); it mirrors tools/progression.py.

export const GAME_MIN_PER_TICK = 1 / 60; // 60 ticks = 1 real second = 1 game minute

export function phaseForHour(h) {
  if (h >= 5 && h < 8) return 'dawn';
  if (h >= 8 && h < 17) return 'day';
  if (h >= 17 && h < 20) return 'dusk';
  return 'night';
}

/** A representative hour for a phase (debug ?phase=night). */
export const PHASE_HOUR = { dawn: 6, day: 12, dusk: 18, night: 22 };

/** Interiors + caves: the single source of truth for "no outdoor time of day" (maps carry no indoor flag). */
export const INDOOR_OR_CAVE = /_int$|^(house_|greystone|home_|heal_|lab_|rt_|mart_|station_|hall_)/;
export function isIndoor(mapName) { return INDOOR_OR_CAVE.test(mapName || ''); }

/**
 * Interiors that still follow the OUTDOOR clock grade (Oct 22, 2026; CODER_LIST.md item 5): The Firefly (club_int) is
 * a night venue. It stays INDOOR for everything else (depth profile, camera pin, no clouds/birds in living.js);
 * only gradeFor changes. tools/progression.py / grades.json indoor_rule do not know this list yet (World Design).
 */
export const FOLLOWS_OUTDOOR_CLOCK = new Set(['club_int']);
export function followsOutdoorClock(mapName) { return FOLLOWS_OUTDOOR_CLOCK.has(mapName); }

/**
 * Grade to draw a map with. `tint` = the map's top-level tint (World Design, batch 3: mirefen_hall_int is
 * {kind:'darkness', grade:'night', phases:[...]}): when present and the phase is listed (no list = every phase), its
 * grade wins over the indoor 'day' rule. The scene passes null once the tint is cleared (Mirefen: puzzle solved).
 */
export function gradeFor(mapName, phase, tint = null) {
  if (tint?.grade && (!Array.isArray(tint.phases) || tint.phases.includes(phase))) return tint.grade;
  return isIndoor(mapName) && !followsOutdoorClock(mapName) ? 'day' : phase;
}

/** Advance {day, min} by `gameMin` minutes, rolling the day at midnight. Returns true if a new day started. */
export function advanceClock(clock, gameMin) {
  clock.min += gameMin;
  let rolled = false;
  while (clock.min >= 1440) { clock.min -= 1440; clock.day++; rolled = true; }
  return rolled;
}
