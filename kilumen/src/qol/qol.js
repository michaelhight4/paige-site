// QoL v1 (Oct 29 2026, Gary approved 10:49 AM CT): Battle Pace, Text Speed, Run toggle. Ideas only from fan games; no copied code.
// Kill switches: ?qol=0 (all off), ?qol=-pace / -text / -run (one off). Settings are per device (localStorage), never in the save,
// so changing them never triggers a save (no saving in battles, talks or cutscenes).
// Player-facing labels are PLACEHOLDERS (Text Bot owns lines): keys system_qol.* in design/QOL_TEXT_REQUEST.md.
export const QOL_DEFAULTS = Object.freeze({ pace: true, text: true, run: true });
export const PACES = [1, 2, 3];
export const TEXT_SPEEDS = { slow: 28, normal: 14, fast: 6, instant: 0 }; // ms per character (--reveal-ms)
const KEY = 'kilumen.qol.v1';
const DEF = { pace: 1, text: 'normal', run: 'hold' };

export function qolFlags(query) {
  const f = { ...QOL_DEFAULTS };
  const raw = query?.get?.('qol') ?? '';
  for (const t of String(raw).split(',').map((s) => s.trim()).filter(Boolean)) {
    if (t === '0' || t === 'off') for (const k of Object.keys(f)) f[k] = false;
    else if (t[0] === '-' && t.slice(1) in f) f[t.slice(1)] = false;
  }
  return f;
}

export function loadSettings(store = globalThis.localStorage) {
  let s = {};
  try { s = JSON.parse(store?.getItem(KEY) || '{}') || {}; } catch { s = {}; }
  return { pace: PACES.includes(s.pace) ? s.pace : DEF.pace, text: s.text in TEXT_SPEEDS ? s.text : DEF.text, run: s.run === 'toggle' ? 'toggle' : 'hold' };
}
export function saveSettings(s, store = globalThis.localStorage) { try { store?.setItem(KEY, JSON.stringify(s)); } catch { /* private mode */ } }

/** Battle Pace: scale a battle wait. x1 = unchanged; never below 1 ms so ordering is kept. */
export function paceMs(ms, pace) { return pace > 1 ? Math.max(1, Math.round(ms / pace)) : ms; }

/** Run toggle (uses the existing B / Shift / X button, no new buttons): in 'toggle' mode a B press flips running on/off.
 *  Hold mode = the old behaviour. The latch drops when running is not allowed (no shoes, indoors, bike, menus). */
export class RunLatch {
  constructor() { this.on = false; this.prev = false; }
  step(bHeld, mode, allowed = true) {
    const edge = bHeld && !this.prev; this.prev = !!bHeld;
    if (mode !== 'toggle') { this.on = false; return !!bHeld; }
    if (!allowed) return false; // keep the latch across a door, but don't run here
    if (edge) this.on = !this.on;
    return this.on;
  }
}

const cycle = (list, v) => list[(list.indexOf(v) + 1) % list.length];
const cap = (s) => s[0].toUpperCase() + s.slice(1);

export function installQol(ui, scene, query) {
  const flags = qolFlags(query), st = loadSettings();
  const doc = ui?.body?.ownerDocument || globalThis.document;
  const applyText = () => { if (flags.text && st.text !== 'normal') doc?.documentElement?.style.setProperty('--reveal-ms', `${TEXT_SPEEDS[st.text]}ms`); else doc?.documentElement?.style.removeProperty('--reveal-ms'); };
  applyText();
  const T = (k, fb) => (ui?.T ? ui.T(`system_qol.${k}`, fb) : fb);
  const qol = { flags, settings: st,
    pace: (ms) => (flags.pace ? paceMs(ms, st.pace) : ms),
    latch: new RunLatch(),
    rows: () => [
      ...(flags.pace ? [[T('battle_pace', 'Battle pace'), `x${st.pace}`, () => { st.pace = cycle(PACES, st.pace); saveSettings(st); }]] : []),
      ...(flags.text ? [[T('text_speed', 'Text speed'), T(`text_${st.text}`, cap(st.text)), () => { st.text = cycle(Object.keys(TEXT_SPEEDS), st.text); saveSettings(st); applyText(); }]] : []),
      ...(flags.run ? [[T('run_mode', 'Run'), T(`run_${st.run}`, cap(st.run)), () => { st.run = st.run === 'hold' ? 'toggle' : 'hold'; qol.latch.on = false; saveSettings(st); }]] : []),
    ],
  };
  // Esc guard (Oct 29 2026): Escape is also a B key (input.js KEY_B) and opens / closes the menu. In Run: Toggle an Esc
  // press must not flip running, so while Escape is down the latch treats B as already held. Passive listener: it never
  // stops, prevents or re-dispatches the event, so the menu's own Esc handling is untouched (no open-then-close).
  const win = doc?.defaultView || globalThis.window;
  qol.escHeld = false;
  win?.addEventListener?.('keydown', (e) => { if (e.code === 'Escape') qol.escHeld = true; }, { passive: true, capture: true });
  win?.addEventListener?.('keyup', (e) => { if (e.code === 'Escape') qol.escHeld = false; }, { passive: true, capture: true });
  win?.addEventListener?.('blur', () => { qol.escHeld = false; });
  if (scene) scene.qol = qol;
  if (ui) ui.qol = qol;
  return qol;
}
