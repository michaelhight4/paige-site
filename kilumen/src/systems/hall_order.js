// Hall order (Gary, Oct 29 2026 3:52 PM CT): towns and regions stay open, but each hall's entrance is locked until the
// previous hall's Master is beaten (hall N needs beat_master_<N-1>). Existing saves: a hall whose own Master is already
// beaten (or whose next Master is) is never locked. Door prompt: system_field.hall_locked_prev ({master} = previous town).
export const HALL_ORDER = ['fernwick', 'saltmere', 'revival', 'frostspire', 'mirefen', 'tidewater', 'lanternport', 'cindervale'];
export const HALL_LOCK_KEY = 'system_field.hall_locked_prev';

/** Pure: the flag a door into `toMap` still needs, or null when open. flags: Set-like {has}. */
export function hallLockFor(toMap, flags) {
  const m = /^(\w+?)_hall_int$/.exec(toMap || '');
  const i = m ? HALL_ORDER.indexOf(m[1]) : -1;
  if (i <= 0) return null;
  if (HALL_ORDER.slice(i).some((z) => flags.has(`beat_master_${z}`))) return null; // old save already past this hall
  const need = `beat_master_${HALL_ORDER[i - 1]}`;
  return flags.has(need) ? null : need;
}
