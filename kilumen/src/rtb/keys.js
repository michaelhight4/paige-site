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
// Face buttons X / Y (Gary Oct 29 2026: "add x and y buttons for the battle screen and attach each to a skill"): each holds one
// skill of the active creature, player picks which (default skills 1 + 2). Phone: on-screen X / Y above B / A. Pad: X (2) / Y (3).
// Keyboard keeps Q E R F for every skill (KeyX is already dodge), so no extra keys.
export const PAD_X = 2, PAD_Y = 3, XY_STORE = 'kilumen_rtb_xy';
/** pad buttons now / before -> ['x'] / ['y'] edges */
export function padXYEdges(now, prev) { const o = []; if (now[PAD_X] && !prev[PAD_X]) o.push('x'); if (now[PAD_Y] && !prev[PAD_Y]) o.push('y'); return o; }
/** [xSlot, ySlot] for a creature with n skills: the saved pick when valid, else the first two skills (one skill: both on it) */
export function xySlots(saved, n) {
  if (n <= 1) return [0, 0];
  const ok = (i) => Number.isInteger(i) && i >= 0 && i < n;
  const x = ok(saved?.[0]) ? saved[0] : 0; let y = ok(saved?.[1]) ? saved[1] : x === 1 ? 0 : 1; if (y === x) y = x === 0 ? 1 : 0;
  return [x, y];
}
/** put skill slot on face b ('x' | 'y'); when the other face already holds it, the two swap */
export function assignXY([x, y], b, slot) { return b === 'x' ? (slot === y ? [slot, x] : [slot, y]) : (slot === x ? [y, slot] : [x, slot]); }
