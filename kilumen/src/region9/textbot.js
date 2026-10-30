// Text Bot's final Wellspire lines (data/textbot_*.json) layered over the DRAFT fallbacks in ./text_fallback.js:
// a Text Bot key wins, any key it lacks falls back to FB. Loaded once at startup (fetch, like data/masters.json). Coder Oct 30 2026.
import { FB } from './text_fallback.js?v=v0.2.96-alpha';
export const TEXTBOT_FILES = ['data/textbot_icefall.json', 'data/textbot_r9_fill_items.json'];
export const TB = {};
/** item id -> player display name from Text Bot (item_display_names); ids stay the code keys. */
export const ITEM_NAMES = {};
export function addTextbot(obj) {
  for (const [k, v] of Object.entries(obj || {})) if (!k.startsWith('_') && Array.isArray(v) && v.length) TB[k] = v;
  for (const [id, name] of Object.entries(obj?.item_display_names || {})) if (!id.startsWith('_') && typeof name === 'string') ITEM_NAMES[id] = name;
  return TB;
}
// Older display names still printed by text/overworld_lines.json (Text Bot owns it; Coder doesn't edit it): renamed at load.
const OLD_NAMES = { tonic_small: ['Small Remedy', 'Small Remedies'], tonic_large: ['Big Remedy', 'Big Remedies'], energy_tonic: ['Pep Remedy', 'Pep Remedies'] };
const OLD_DESC = { tonic_small: [/^A small remedy\./, 'A small salve.'], tonic_large: [/^A big remedy\./, 'A large salve.'], energy_tonic: [/^A fizzy remedy\./, 'A fizzy balm.'] };
/** Swap old item display names (and any "Tonic") in one player string for Text Bot's names. */
export function renameItemText(str) {
  if (typeof str !== 'string') return str;
  for (const [id, [one, many]] of Object.entries(OLD_NAMES)) {
    const n = ITEM_NAMES[id]; if (!n) continue;
    str = str.split(many).join(n + 's').split(one).join(n);
  }
  return str;
}
/** Apply Text Bot's item names over a parsed overworld_lines.json (in place): catalogue names/descriptions + every line. */
export function withTextbotItemNames(lines) {
  if (!lines || typeof lines !== 'object') return lines;
  const walk = (o) => {
    if (Array.isArray(o)) { for (let i = 0; i < o.length; i++) o[i] = typeof o[i] === 'string' ? renameItemText(o[i]) : (walk(o[i]), o[i]); return; }
    if (o && typeof o === 'object') for (const k of Object.keys(o)) { if (k === '_meta') continue; o[k] = typeof o[k] === 'string' ? renameItemText(o[k]) : (walk(o[k]), o[k]); }
  };
  walk(lines);
  const cat = lines.system_item_catalogue || {};
  for (const [id, name] of Object.entries(ITEM_NAMES)) {
    if (!cat[id]) continue; cat[id].name = name;
    const d = OLD_DESC[id]; if (d && Array.isArray(cat[id].pages)) cat[id].pages = cat[id].pages.map((p) => (typeof p === 'string' ? p.replace(d[0], d[1]) : p));
  }
  return lines;
}
export function loadTextbot(fetchFn = globalThis.fetch) {
  if (!fetchFn) return Promise.resolve(TB);
  return Promise.all(TEXTBOT_FILES.map((u) => fetchFn(u).then((r) => (r.ok ? r.json() : null)).then(addTextbot).catch(() => null))).then(() => TB);
}
export const fallbackText = (k) => TB[k] || FB[k] || [];
export const textbotReady = typeof window !== 'undefined' ? loadTextbot() : Promise.resolve(TB);
