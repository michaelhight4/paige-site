// rtb keybinds (v0.2.60, Gary Oct 29 2026): Q / E / R / F = active creature's skills 1-4, 1-6 = switch to party slot 1-6.
// Pure tables + lookups so tests can check them. Only read while a real-time battle runs (index.js adds / removes the listener).
// Moved to make room: Team list = Tab, Crystal = G, Turn-based switch = T. Unchanged: WASD / arrows move, Z / Space / Enter
// selected skill, C next skill, X / Shift dodge + sprint, hold Esc leave (Esc is also B in the overworld; nothing new uses it).
export const SKILL_KEYS = ['KeyQ', 'KeyE', 'KeyR', 'KeyF'];
export const SKILL_LABELS = ['Q', 'E', 'R', 'F'];
export const PARTY_KEYS = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6'];
export const NUMPAD_PARTY = ['Numpad1', 'Numpad2', 'Numpad3', 'Numpad4', 'Numpad5', 'Numpad6'];
export const TEAM_KEYS = ['Tab'], CRYSTAL_KEYS = ['KeyG'], MODE_KEYS = ['KeyT'];
export const FIRE_KEYS = ['KeyZ', 'Space', 'Enter'], NEXT_KEYS = ['KeyC', 'Backspace'], B_KEYS = ['KeyX', 'ShiftLeft', 'ShiftRight'], LEAVE_KEYS = ['Escape'];
// v0.2.61 (Gary): Caps Lock = run from a WILD real-time fight at once (no hold); nothing in trainer fights. Hold Esc stays as backup.
export const FLEE_KEYS = ['CapsLock'];
// Gamepad (standard mapping): LB / RB / LT / RT = skills 1-4 (A stays selected skill, B dodge / sprint, Select next skill).
export const PAD_SKILL_BUTTONS = [4, 5, 6, 7];

/** keydown code -> action {type:'skill'|'party'|'team'|'crystal'|'mode'|'fire'|'next'|'b'|'leave', slot?} or null */
export function actionFor(code) {
  let i = SKILL_KEYS.indexOf(code); if (i >= 0) return { type: 'skill', slot: i };
  i = PARTY_KEYS.indexOf(code); if (i < 0) i = NUMPAD_PARTY.indexOf(code); if (i >= 0) return { type: 'party', slot: i };
  if (TEAM_KEYS.includes(code)) return { type: 'team' };
  if (CRYSTAL_KEYS.includes(code)) return { type: 'crystal' };
  if (MODE_KEYS.includes(code)) return { type: 'mode' };
  if (FIRE_KEYS.includes(code)) return { type: 'fire' };
  if (NEXT_KEYS.includes(code)) return { type: 'next' };
  if (B_KEYS.includes(code)) return { type: 'b' };
  if (LEAVE_KEYS.includes(code)) return { type: 'leave' };
  if (FLEE_KEYS.includes(code)) return { type: 'flee' };
  return null;
}
/** all codes the rtb listener claims (tests: no duplicates across actions) */
export const ALL_CODES = [...SKILL_KEYS, ...PARTY_KEYS, ...NUMPAD_PARTY, ...TEAM_KEYS, ...CRYSTAL_KEYS, ...MODE_KEYS, ...FIRE_KEYS, ...NEXT_KEYS, ...B_KEYS, ...LEAVE_KEYS, ...FLEE_KEYS];
/** Caps Lock state change seen on any key / mouse event (macOS fires keydown/keyup only when the lock flips): true = flee */
export function capsFlipped(e, prev) { const now = typeof e?.getModifierState === 'function' ? !!e.getModifierState('CapsLock') : null; return { now: now ?? prev, flip: now != null && prev != null && now !== prev }; }
/** pad buttons now / before -> skill slots pressed this frame (edges) */
export function padSkillEdges(now, prev) { return PAD_SKILL_BUTTONS.map((b, i) => (now[b] && !prev[b] ? i : -1)).filter((i) => i >= 0); }
/** cooldown sweep angle (deg, 0 = ready) for a slot; cd remaining / total */
export function sweepDeg(left, total) { return total > 0 ? Math.round(360 * Math.max(0, Math.min(1, left / total))) : 0; }
// Face buttons A / B / X / Y (Gary Oct 29 2026: X / Y first, then "A and B also need skill binds"): each face holds one skill of the
// active creature, the player picks which in 'set' mode (default skills 1-4), saved per creature uid. Phone: the touchpad A / B plus
// on-screen X / Y above them. Pad (standard mapping): A 0 / B 1 / X 2 / Y 3. Keyboard keeps Q E R F for every skill (KeyX is dodge).
// Dodge used to sit on phone B: it moves to its own Dodge button in the skill bar (tap = dodge, hold = sprint); pad dodge = R3 (11).
export const FACES = ['a', 'b', 'x', 'y'], PAD_FACE = { a: 0, b: 1, x: 2, y: 3 }, PAD_X = 2, PAD_Y = 3, PAD_DODGE = 11, XY_STORE = 'kilumen_rtb_faces';
/** pad buttons now / before -> face edges in FACES order, e.g. ['a', 'y'] */
export function padFaceEdges(now, prev) { return FACES.filter((k) => now[PAD_FACE[k]] && !prev[PAD_FACE[k]]); }
/** kept for older callers: X / Y edges only */
export function padXYEdges(now, prev) { return padFaceEdges(now, prev).filter((k) => k === 'x' || k === 'y'); }
/** [a, b, x, y] skill slots for a creature with n skills: the saved pick when valid, else skills 1-4 (fewer skills wrap round) */
export function faceSlots(saved, n) {
  if (n <= 0) return [0, 0, 0, 0];
  const def = FACES.map((_, i) => i % n);
  if (!Array.isArray(saved) || saved.length !== 4 || !saved.every((i) => Number.isInteger(i) && i >= 0 && i < n)) return def;
  if (new Set(saved).size < Math.min(4, n)) return def; // every skill reachable when it fits
  return saved.slice();
}
/** put skill slot on face k; the face that already held it takes the old skill (swap), so no skill drops off */
export function assignFace(slots, k, slot) {
  const o = slots.slice(), f = FACES.indexOf(k); if (f < 0) return o;
  const j = o.indexOf(slot); if (j >= 0 && j !== f) o[j] = o[f]; o[f] = slot; return o;
}
export const faceIndex = (k) => FACES.indexOf(k);
