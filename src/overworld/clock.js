// Kilumen: in-game clock + time-of-day phase (pure). time_of_day/grades.json schedule:
// dawn 05-07, day 08-16, dusk 17-19, night 20-04. Clock: 1 real minute = 1 game hour (1 real s = 1 game min).
// Indoor rule: interiors and caves (*_int, house_*, greystone*) stay on the `day` grade; lantern_rest follows
// the outdoor clock. Window tiles always show the OUTDOOR phase.

export const GAME_MIN_PER_TICK = 1 / 60; // 60 ticks = 1 real second = 1 game minute

export function phaseForHour(h) {
  if (h >= 5 && h < 8) return 'dawn';
  if (h >= 8 && h < 17) return 'day';
  if (h >= 17 && h < 20) return 'dusk';
  return 'night';
}

/** A representative hour for a phase (debug ?phase=night). */
export const PHASE_HOUR = { dawn: 6, day: 12, dusk: 18, night: 22 };

export function isIndoor(mapName) { return /_int$|^house_|^greystone/.test(mapName || ''); }

/** Grade to draw a map with. */
export function gradeFor(mapName, phase) { return isIndoor(mapName) ? 'day' : phase; }

/** Advance {day, min} by `gameMin` minutes, rolling the day at midnight. Returns true if a new day started. */
export function advanceClock(clock, gameMin) {
  clock.min += gameMin;
  let rolled = false;
  while (clock.min >= 1440) { clock.min -= 1440; clock.day++; rolled = true; }
  return rolled;
}
