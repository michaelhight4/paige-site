// Style & accessibility: palette, text size, reduced motion. Stored in localStorage (`lifesim.style.v1`), separate from saves.
// Palettes are CSS-variable maps from ui/data/styles.json applied as inline vars on <html>, so a theme can override any of them.
const KEY = 'lifesim.style.v1'; let CFG = null;
export const load = () => { try { return { ...CFG.defaults, ...(JSON.parse(localStorage.getItem(KEY)) || {}) }; } catch (e) { return { ...CFG.defaults }; } };
const save = (s) => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* storage unavailable */ } return s; };
export const config = () => CFG;
export function effectiveMotion(s) { return s.motion === 'auto' ? (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches ? 'reduced' : 'normal') : s.motion; }
// Contrast guard: whatever palette is active (including fantasy overrides), push text colours until they pass WCAG AA (4.5:1) on every surface
// they are drawn on, and pick black/white text for every filled button colour. Derived vars: --on-good/--on-bad/--on-warn/--on-navy2/--on-accent/--on-section, --good-text/--bad-text/--warn-text.
const GUARDED = ['--ink', '--mute', '--link', '--head', '--good-text', '--bad-text', '--warn-text', '--on-good', '--on-bad', '--on-warn', '--on-navy2', '--on-accent', '--on-section', '--on-navy'];
const hex2 = (v) => { v = String(v).trim(); let m = v.match(/^#([0-9a-f]{3})$/i); if (m) return m[1].split('').map((c) => parseInt(c + c, 16)); m = v.match(/^#([0-9a-f]{6})/i); if (m) return [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16)); m = v.match(/rgba?\(([^)]+)\)/); if (m) return m[1].split(/[ ,/]+/).slice(0, 3).map(Number); return null; };
const lum = (c) => { const f = (x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const toHex = (c) => '#' + c.map((x) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0')).join('');
const mix = (c, to, k) => c.map((x, i) => x + (to[i] - x) * k);
export function guard(root = document.documentElement) {
  const cs = getComputedStyle(root), get = (k) => hex2(cs.getPropertyValue(k)); for (const k of GUARDED) root.style.removeProperty(k);
  const surf = ['--surface', '--bg', '--surface2', '--surface3'].map(get).filter(Boolean); if (surf.length < 2) return; const dark = surf.reduce((a, c) => a + lum(c), 0) / surf.length < 0.3, toward = dark ? [255, 255, 255] : [0, 0, 0];
  const fix = (name, from, on = surf, min = 4.5) => { let c = get(from) || toward; for (let i = 0; i < 24 && on.some((b) => ratio(c, b) < min); i++) c = mix(c, toward, 0.12); root.style.setProperty(name, toHex(c)); };
  fix('--ink', '--ink'); fix('--mute', '--mute'); fix('--link', '--link'); fix('--head', '--head'); fix('--good-text', '--good'); fix('--bad-text', '--bad'); fix('--warn-text', '--warn');
  const W = [255, 255, 255], K = [20, 24, 36];
  const on = (name, from) => { let c = get(from); if (!c) return; for (let i = 0; i < 24 && Math.max(ratio(c, W), ratio(c, K)) < 4.5; i++) c = mix(c, ratio(c, W) >= ratio(c, K) ? K : W, 0.08); root.style.setProperty(from, toHex(c)); root.style.setProperty(name, ratio(c, W) >= ratio(c, K) ? '#ffffff' : '#141824'); };
  on('--on-good', '--good'); on('--on-bad', '--bad'); on('--on-warn', '--warn'); on('--on-navy2', '--navy2'); on('--on-accent', '--accent'); on('--on-section', '--section'); on('--on-navy', '--navy');
}
export function apply(s = load()) {
  const root = document.documentElement, fant = root.classList.contains('theme-fantasy');
  for (const p of CFG.palettes) for (const k of Object.keys(p.vars)) root.style.removeProperty(k);
  const pal = CFG.palettes.find((p) => p.id === s.palette) || CFG.palettes[0], over = (fant && CFG.fantasy && CFG.fantasy.palettes && CFG.fantasy.palettes[pal.id]) || {};
  for (const [k, v] of Object.entries({ ...pal.vars, ...over })) root.style.setProperty(k, v);
  const tx = CFG.text.find((t) => t.id === s.text) || CFG.text[0]; root.style.setProperty('--zoom', String(tx.zoom));
  root.dataset.style = pal.id; root.dataset.text = tx.id; root.dataset.motion = effectiveMotion(s);
  guard(root);
  const meta = document.querySelector('meta[name=theme-color]'); if (meta) meta.content = getComputedStyle(root).getPropertyValue('--navy').trim() || '#1f3a5f';
}
export function set(patch) { const s = save({ ...load(), ...patch }); apply(s); return s; }
export const reset = () => { try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ } apply(load()); };
export async function init() {
  if (!CFG) CFG = await (await fetch(new URL('../data/styles.json', import.meta.url))).json();
  apply(load()); if (typeof matchMedia === 'function') matchMedia('(prefers-reduced-motion: reduce)').addEventListener?.('change', () => apply(load()));
  return CFG;
}
