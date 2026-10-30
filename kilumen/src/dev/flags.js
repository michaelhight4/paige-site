// Dev console Flags tab logic (Oct 30, 2026). Pure helpers: no DOM, so tests can drive them. Only src/dev/console.js imports this,
// and it only loads behind dev/devgate.js (?dev=1 + site owner/admin). Normal players never reach it.
import { HALL_ORDER } from '../systems/hall_order.js?v=v0.2.93-alpha';

export const FLAG_RE = /^[a-z0-9_:.-]{1,80}$/i;

/** Presets: name -> {label, set[], clear[]}. */
export const FLAG_PRESETS = {
  all_badges: { label: 'All 8 Master coins', set: HALL_ORDER.map((h) => `beat_master_${h}`), clear: [] },
  no_badges: { label: 'Clear all Master coins', set: [], clear: HALL_ORDER.map((h) => `beat_master_${h}`) },
  tower_healed: { label: 'Arena: tower healed (Ron waits in the lobby)', set: ['tower_healed'], clear: [] },
  r9_open: { label: 'Wellspire open (courier done, skylift)', set: ['courier_delivered', 'got_team_postcard', 'read_ho_letter', 'got_nan_thermos', 'r9_unlocked', 'skylift_upper_open'], clear: [] },
  has_bike: { label: 'Bike', set: ['has_bike'], clear: [] },
};

const setF = (scene, f, on) => (scene.setFlag ? scene.setFlag(f, on) : on ? scene.flags.add(f) : scene.flags.delete(f));

/** Master coins 0-8: the first n halls in hall order beaten, the rest cleared. -> flags set. */
export function setBadges(scene, n) {
  n = Math.max(0, Math.min(8, Math.floor(Number(n) || 0)));
  HALL_ORDER.forEach((h, i) => setF(scene, `beat_master_${h}`, i < n));
  return HALL_ORDER.slice(0, n).map((h) => `beat_master_${h}`);
}

/** Set (on=true) or clear one flag by name. -> {ok, why?}. */
export function setFlagByName(scene, name, on = true) {
  const f = String(name || '').trim();
  if (!FLAG_RE.test(f)) return { ok: false, why: 'flag names are letters, digits, _ : . -' };
  setF(scene, f, on); return { ok: true, flag: f, on };
}

export function applyPreset(scene, id) {
  const p = FLAG_PRESETS[id]; if (!p) return { ok: false, why: 'no such preset' };
  for (const f of p.clear) setF(scene, f, false);
  for (const f of p.set) setF(scene, f, true);
  return { ok: true, set: p.set, clear: p.clear };
}
