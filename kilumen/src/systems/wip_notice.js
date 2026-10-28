// One-time "story ends here for now" notice (Cut A, Oct 23, 2026, coder; Gary 9:51 + 10:08 AM CT).
// Shown once, right after the script that sets the trigger flag ends (the post-battle flow of the last beatable Master),
// with a single OK choice (keyboard + tap via dialog.ask). Sets seen_wip_notice so it never shows again. No road block:
// nothing is gated on it. v0.2.30: moved to Master 3 (beat_master_revival), Gary Oct 27 2026. Trigger = beat_master_saltmere, the Master 2 win flag (coin 2, saltmere_hall_int; set by the
// win via TRAINER_RESULTS from src/progression/masters.js). Moved off Master 1 (beat_master_fernwick) Oct 23 2026, Gary.
import { DEV } from '../dev/runtime.js?v=v0.2.33-alpha';
export const WIP_KEY = 'system.wip_after_master3'; // Text Bot key (pages wired Oct 27 2026); the old wip_after_master2 text spoke of region 3 as unbuilt
export const WIP_FLAG = 'seen_wip_notice_r3'; // v0.2.30: new flag so saves that saw the Master 2 notice still get this one
export const TRIGGER = 'beat_master_revival'; // Master 3, Revival Heights (v0.2.30; was beat_master_saltmere = Master 2)
export const WIP_TEXT = [
  "That's as far as the story goes for now. Region 4 is still being built.", // fallback = Text Bot's system.wip_after_master3
  "You're free to keep exploring. Just try not to break anything.",
];

export function wipDue(scene) {
  const f = scene?.flags;
  if (DEV.masterKey) return false; // dev master key (runtime only): no early-access notice while quality-checking past Master 2
  return !!(f && f.has(TRIGGER) && !f.has(WIP_FLAG));
}

function pages(scene) {
  let v = scene.lines;
  for (const k of WIP_KEY.split('.')) v = v?.[k];
  const p = Array.isArray(v) ? v : v?.pages;
  return Array.isArray(p) && p.length ? p : WIP_TEXT;
}

/** Wraps scene.script so the notice runs as its own script right after the triggering one. Returns the scene. */
export function attachWipNotice(scene) {
  if (!scene || scene._wipAttached || typeof scene.script !== 'function') return scene;
  scene._wipAttached = true;
  const orig = scene.script.bind(scene);
  let showing = false;
  const show = async () => {
    if (showing || !wipDue(scene) || scene.busy) return;
    showing = true;
    try {
      await orig(async () => {
        scene.setFlag(WIP_FLAG); // set first: a crash or reload mid-notice still never repeats it
        await scene.ask(pages(scene), ['OK']);
      });
    } finally { showing = false; }
  };
  scene.script = async (fn) => { await orig(fn); await show(); };
  scene.showWipNotice = show;
  return scene;
}
