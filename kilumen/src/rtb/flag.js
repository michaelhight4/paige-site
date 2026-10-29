// Real-time wild battles: player OPTION (Gary, Oct 29 2026, 2:51 AM CT: "give players an option in the battle screen to change
// from the regular to a real time battle"). WILD battles only; trainer / Master / story battles always stay turn-based.
// The choice is kept twice: in settings (localStorage RTB_KEY, this device) and in the save (story flag RTB_FLAG, so it
// travels with the save / cloud save). Settings win when both exist.
// Kill switch: ?rtb=0 (kept by src/alpha.js on the live host too) -> turn-based for the session, no switch button, and the
// remembered choice is kept (not cleared) for when the switch is back.
export const RTB_KEY = 'kilumen_alpha_rtb_mode';
export const RTB_FLAG = 'pref_rtb_realtime';
const store = () => { try { return globalThis.localStorage || null; } catch { return null; } };
export function rtbKilled(q) {
  return globalThis.KILUMEN_RTB_OFF === true || q?.get?.('rtb') === '0';
}
/** 'rt' | 'turn' (the default) */
export function rtbMode(scene, q) {
  if (rtbKilled(q)) return 'turn'; // kill switch (?rtb=0 or KILUMEN_RTB_OFF): turn-based only, the saved choice is kept for later
  let v = null; try { v = store()?.getItem(RTB_KEY); } catch { /* private mode */ }
  if (v === 'rt' || v === 'turn') return v;
  return scene?.flags?.has?.(RTB_FLAG) ? 'rt' : 'turn';
}
export function setRtbMode(scene, mode) {
  const m = mode === 'rt' ? 'rt' : 'turn';
  try { store()?.setItem(RTB_KEY, m); } catch { /* private mode */ }
  if (scene?.flags) { if (m === 'rt') scene.flags.add(RTB_FLAG); else scene.flags.delete(RTB_FLAG); scene._dirty = true; } // saved on the next normal save (never mid-battle: saveGuards)
  return m;
}
export const rtbEnabled = (q, scene) => rtbMode(scene, q) === 'rt';
