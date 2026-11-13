// Kilumen: platform profiles (DRAFT, local only, Oct 22, 2026). Gary: "make coder have a mobile and pc set up independtly".
// The platform is picked ONCE at start-up and never changes while the page is open:
//   mobile if (pointer: coarse) or the device is touch-capable, otherwise pc.
//   Overrides: ?platform=pc|mobile (wins), ?touch=1 (alias for mobile), ?touch=0 (alias for pc).
// Each platform has its OWN data file (src/platform/pc.json, src/platform/mobile.json): zoom table, camera rules,
// HUD/dialogue layout and controls. Nothing here shares a value between them, so tuning one never changes the other.
// The pure helpers below have no DOM use, so tests/platform.test.mjs can import them in Node.

export const PLATFORM_IDS = Object.freeze(['pc', 'mobile']);
export const PROFILE_URL = (id) => new URL(`./platform/${id}.json`, import.meta.url).href;

/**
 * @param {{search?: string, coarse?: boolean, touchCapable?: boolean}} env
 * @returns {{id: 'pc'|'mobile', reason: string}}
 */
export function choosePlatform({ search = '', coarse = false, touchCapable = false } = {}) {
  const q = new URLSearchParams(search);
  const p = (q.get('platform') || '').toLowerCase();
  if (PLATFORM_IDS.includes(p)) return { id: p, reason: `?platform=${p}` };
  if (q.get('touch') === '1') return { id: 'mobile', reason: '?touch=1' };
  if (q.get('touch') === '0') return { id: 'pc', reason: '?touch=0' };
  if (coarse) return { id: 'mobile', reason: '(pointer: coarse)' };
  if (touchCapable) return { id: 'mobile', reason: 'touch-capable' };
  return { id: 'pc', reason: 'default' };
}

/** Integer zoom for a canvas height (device px) from a profile's zoom block. Never fractional, never below 1. */
export function zoomFromTable(zoom, canvasH) {
  const rows = [...(zoom?.breakpoints || [])].sort((a, b) => a.minHeight - b.minHeight);
  let z = 1;
  for (const r of rows) if (canvasH >= r.minHeight) z = resolveZoom(zoom, r.zoom);
  return z;
}

function resolveZoom(zoom, v) {
  const n = typeof v === 'string' ? zoom[v] : v;
  if (!Number.isInteger(n) || n < 1) throw new Error(`platform zoom: bad value ${JSON.stringify(v)}`);
  return n;
}

/** The dialogue bottom for the current viewport: first matching rule, else the base value. */
export function dialogBottomFor(hud, matches = () => false) {
  return hudOffsetFor(hud, 'dialogBottom', '4vh', matches);
}

/** Today's (pre-profile) toast and trainer-battle-image offsets: the defaults when a profile does not set its own. */
export const DEFAULT_TOAST_BOTTOM = '6vh';
export const DEFAULT_BATTLE_BOTTOM = 'calc(var(--dlg-portrait-bottom, 4vh) + 7.5em)';

/** A hud offset (`key` = dialogBottom | toastBottom | battleBottom): first matching `<key>Rules` media rule, else hud[key], else `fallback`. */
export function hudOffsetFor(hud, key, fallback, matches = () => false) {
  for (const r of hud?.[key + 'Rules'] || []) if (matches(r.media) && r[key] != null) return r[key];
  return hud?.[key] ?? fallback;
}

/**
 * Which prompt set to word dialogue controls with: the last device used if the profile has prompts for it (pc: keyboard or
 * controller; mobile: touch), else the first of profile.controls.inputs that has a prompt set (pc keyboard, mobile touch).
 */
export function promptScheme(profile, lastDevice = null) {
  const prompts = profile?.controls?.prompts || {};
  const usable = (k) => k && k !== 'mouse' && prompts[k] && typeof prompts[k] === 'object';
  if (usable(lastDevice)) return lastDevice;
  return (profile?.controls?.inputs || []).find(usable) || Object.keys(prompts).find((k) => !k.startsWith('_') && usable(k)) || null;
}

/**
 * Text vars for control placeholders ({run_button}, {bike_button}, {confirm_button}, {debug}) from the active profile's
 * controls.prompts[scheme] labels, plus `<name>_glyph` ids. Anything the profile lacks falls back to `fallback`
 * (CONFIG.buttonNames), so a missing profile gives exactly the old words.
 */
export function promptVars(profile, scheme, fallback = {}) {
  const set = (scheme && profile?.controls?.prompts?.[scheme]) || {};
  const out = { ...fallback };
  for (const [k, v] of Object.entries(set)) {
    if (k.startsWith('_') || !v || typeof v !== 'object') continue;
    if (v.label) out[k] = v.label;
    if (v.glyph) out[k + '_glyph'] = v.glyph;
  }
  return out;
}

/** CSS custom properties for a profile (dialogue bottom resolved with `matches(media)`). */
export function cssVarsFor(profile, matches = () => false) {
  const hud = profile.hud || {}, c = profile.controls || {};
  const sa = c.safeArea || {};
  const vars = {
    '--safe-top': sa.top || '0px', '--safe-right': sa.right || '0px', '--safe-bottom': sa.bottom || '0px', '--safe-left': sa.left || '0px',
    '--dlg-bottom': dialogBottomFor(hud, matches),
    '--dlg-portrait-bottom': hudOffsetFor(hud, 'dialogPortraitBottom', '4vh', matches),
    '--toast-bottom': hudOffsetFor(hud, 'toastBottom', DEFAULT_TOAST_BOTTOM, matches),
    '--dlg-battle-bottom': hudOffsetFor(hud, 'battleBottom', DEFAULT_BATTLE_BOTTOM, matches),
  };
  // portrait size and the compact toast used while a dialogue is open: only set when the profile asks (pc: CSS defaults)
  if (hud.dialogPortraitHeight) vars['--dlg-portrait-height'] = hud.dialogPortraitHeight;
  if (hud.dialogPortraitMaxWidth) vars['--dlg-portrait-max-w'] = hud.dialogPortraitMaxWidth;
  if (hud.dialogPadLeft) vars['--dlg-pad-left'] = hud.dialogPadLeft; // box left padding beside the portrait (pc: CSS default)
  if (c.dialogFadeMs != null) vars['--tp-fade'] = `${c.dialogFadeMs}ms`; // touch controls hidden during dialogue fade this long
  const td = hud.toastDuringDialog || {};
  if (td.fontSize) vars['--toast-dlg-font'] = td.fontSize;
  if (td.padding) vars['--toast-dlg-pad'] = td.padding;
  const t = c.touchLayout;
  if (c.touch && t) {
    Object.assign(vars, {
      '--tp-dpad-size': `${t.dpad.size}px`, '--tp-dpad-cell': `${t.dpad.size / 3}px`,
      '--tp-dpad-left': `${t.dpad.left}px`, '--tp-dpad-bottom': `${t.dpad.bottom}px`,
      '--tp-btns-right': `${t.buttons.right}px`, '--tp-btns-bottom': `${t.buttons.bottom}px`, '--tp-btns-gap': `${t.buttons.gap}px`,
      '--tp-ab-size': `${t.ab.size}px`, '--tp-small-w': `${t.small.width}px`, '--tp-small-h': `${t.small.height}px`,
    });
  }
  return vars;
}

/**
 * Browser start-up: pick the platform once, load its profile, set body.platform-<id> and the CSS variables,
 * and keep the dialogue bottom rule in step with the viewport (media rules come from the profile).
 * Memoised: landscape.js and main.js share one result.
 */
let started = null;
export function startPlatform(win = window) {
  if (started) return started;
  const choice = choosePlatform({
    search: win.location.search,
    coarse: win.matchMedia('(pointer: coarse)').matches,
    touchCapable: (win.navigator.maxTouchPoints || 0) > 0 || 'ontouchstart' in win,
  });
  const body = win.document.body;
  for (const id of PLATFORM_IDS) body.classList.toggle(`platform-${id}`, id === choice.id);
  started = fetch(PROFILE_URL(choice.id)).then((r) => {
    if (!r.ok) throw new Error(`platform profile ${choice.id}: HTTP ${r.status}`);
    return r.json();
  }).then((profile) => {
    if (profile.id !== choice.id) throw new Error(`platform profile id mismatch: ${profile.id} != ${choice.id}`);
    const apply = () => {
      const vars = cssVarsFor(profile, (m) => win.matchMedia(m).matches);
      for (const [k, v] of Object.entries(vars)) body.style.setProperty(k, v);
    };
    apply();
    const media = new Set(['dialogBottomRules', 'toastBottomRules', 'battleBottomRules', 'dialogPortraitBottomRules'].flatMap((k) => (profile.hud?.[k] || []).map((r) => r.media)));
    for (const m of media) win.matchMedia(m).addEventListener?.('change', apply);
    body.classList.toggle('landscape-only', profile.controls?.orientation === 'landscape');
    body.classList.toggle('touch-ui', !!profile.controls?.touch);
    return Object.freeze({ id: choice.id, reason: choice.reason, profile: deepFreeze(profile) });
  });
  return started;
}

function deepFreeze(o) {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) { Object.freeze(o); for (const v of Object.values(o)) deepFreeze(v); }
  return o;
}
