// Forced low tide at Tidewater (Gary G6 canon, 5:55 PM CT Oct 29 2026; story_beats.md §R6 "Why Ron is here").
// Beating the Tidewater Master forces the low tide: `tidewater_low_tide_forced` is set at the same moment as
// beat_master_tidewater (overworld.js setFlag) and backfilled on load for old saves. It opens the sea-cave lab
// (tidewater_cave_int gate_tidewater_cave_lab also needs it, map `also` field) and makes Ron's boat leave from the
// cove (src/region56/index.js, ron.r6.boat_leave, once: ron_r6_boat_leave_done).
export const LOW_TIDE = {
  master: 'beat_master_tidewater',
  flag: 'tidewater_low_tide_forced',
  done: 'ron_r6_boat_leave_done',
  key: 'ron.r6.boat_leave',
  cove: { map: 'tidewater_coast', x: 43, y: 32, r: 5 }, // cave mouth warp (43,31) and its landing cell
};

/** Pure: should the low-tide flag be set now? flags: Set-like {has}. */
export const lowTideDue = (flags) => flags.has(LOW_TIDE.master) && !flags.has(LOW_TIDE.flag);

/** Set the flag on a scene (setFlag if present) when due. Returns true if it set it. */
export function syncLowTide(scene) {
  if (!lowTideDue(scene.flags)) return false;
  if (scene.setFlag) scene.setFlag(LOW_TIDE.flag, true); else scene.flags.add(LOW_TIDE.flag);
  return true;
}

/** Pure: should Ron's boat-leave scene play? True on the cove (near the cave mouth) after the forced low tide,
 *  once. Covers both "walked out of the lab" (you land at the mouth) and "came back to the cove without going in". */
export function boatLeaveDue(flags, mapName, pos) {
  const c = LOW_TIDE.cove;
  if (!flags.has(LOW_TIDE.flag) || flags.has(LOW_TIDE.done) || mapName !== c.map || !pos) return false;
  return Math.abs(pos.x - c.x) <= c.r && Math.abs(pos.y - c.y) <= c.r;
}
