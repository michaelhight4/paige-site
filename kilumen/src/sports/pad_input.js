// Shared sports-minigame input: arrows + WASD (by physical key, caps-lock safe) + gamepad d-pad / left stick.
// Pure helpers; pollPad is cheap (one getGamepads call per frame, only while a minigame is playing).
export const CODE_DIR = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down' };
export const KEY_DIR = { ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right', ArrowUp: 'up', w: 'up', W: 'up', ArrowDown: 'down', s: 'down', S: 'down' };
export const TAP_KEYS = [' ', 'Enter', 'f', 'F', 'z', 'Z'];
// Direction for a key event, or 'tap', or null. Uses e.code first so AZERTY/caps lock still map by position.
export function keyAction(e) {
  return CODE_DIR[e.code] || KEY_DIR[e.key] || (TAP_KEYS.includes(e.key) ? 'tap' : null);
}
const DEAD = 0.5;
// Standard mapping: buttons 12-15 = d-pad up/down/left/right, 0 = A (south), 1 = B. axes 0/1 = left stick.
export function padState(pads) {
  const o = { left: false, right: false, up: false, down: false, tap: false };
  for (const p of pads || []) {
    if (!p || !p.connected) continue;
    const b = (i) => !!(p.buttons?.[i]?.pressed);
    const ax = p.axes?.[0] || 0, ay = p.axes?.[1] || 0;
    o.up ||= b(12) || ay < -DEAD; o.down ||= b(13) || ay > DEAD;
    o.left ||= b(14) || ax < -DEAD; o.right ||= b(15) || ax > DEAD;
    o.tap ||= b(0) || b(1);
  }
  return o;
}
export function pollPad() {
  try { return padState(typeof navigator !== 'undefined' && navigator.getGamepads ? navigator.getGamepads() : []); }
  catch { return padState([]); }
}
// Feed pad state into a press(k, down) sink, tracking previous state so only changes are sent.
export function feedPad(prev, now, press) {
  for (const k of ['left', 'right', 'up', 'down', 'tap']) if (!!prev[k] !== !!now[k]) press(k, !!now[k]);
  return now;
}
