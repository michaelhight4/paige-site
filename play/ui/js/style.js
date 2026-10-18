// Style & accessibility: palette, text size, reduced motion. Stored in localStorage (`lifesim.style.v1`), separate from saves.
// Palettes are CSS-variable maps from ui/data/styles.json applied as inline vars on <html>, so a theme can override any of them.
const KEY = 'lifesim.style.v1'; let CFG = null;
export const load = () => { try { return { ...CFG.defaults, ...(JSON.parse(localStorage.getItem(KEY)) || {}) }; } catch (e) { return { ...CFG.defaults }; } };
const save = (s) => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* storage unavailable */ } return s; };
export const config = () => CFG;
export function effectiveMotion(s) { return s.motion === 'auto' ? (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches ? 'reduced' : 'normal') : s.motion; }
export function apply(s = load()) {
  const root = document.documentElement, fant = root.classList.contains('theme-fantasy');
  for (const p of CFG.palettes) for (const k of Object.keys(p.vars)) root.style.removeProperty(k);
  const pal = CFG.palettes.find((p) => p.id === s.palette) || CFG.palettes[0], over = (fant && CFG.fantasy && CFG.fantasy.palettes && CFG.fantasy.palettes[pal.id]) || {};
  for (const [k, v] of Object.entries({ ...pal.vars, ...over })) root.style.setProperty(k, v);
  const tx = CFG.text.find((t) => t.id === s.text) || CFG.text[0]; root.style.setProperty('--zoom', String(tx.zoom));
  root.dataset.style = pal.id; root.dataset.text = tx.id; root.dataset.motion = effectiveMotion(s);
  const meta = document.querySelector('meta[name=theme-color]'); if (meta) meta.content = getComputedStyle(root).getPropertyValue('--navy').trim() || '#1f3a5f';
}
export function set(patch) { const s = save({ ...load(), ...patch }); apply(s); return s; }
export const reset = () => { try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ } apply(load()); };
export async function init() {
  if (!CFG) CFG = await (await fetch(new URL('../data/styles.json', import.meta.url))).json();
  apply(load()); if (typeof matchMedia === 'function') matchMedia('(prefers-reduced-motion: reduce)').addEventListener?.('change', () => apply(load()));
  return CFG;
}
