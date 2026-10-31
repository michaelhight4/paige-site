// Text Bot's final Wellspire lines (data/textbot_*.json) layered over the DRAFT fallbacks in ./text_fallback.js:
// a Text Bot key wins, any key it lacks falls back to FB. Loaded once at startup (fetch, like data/masters.json). Coder Oct 30 2026.
import { FB } from './text_fallback.js?v=v0.2.108-alpha';
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
  const p2 = fetchFn(PASS2_FILE).then((r) => (r.ok ? r.json() : null)).then((o) => { if (o?.maps) PASS2.maps = o.maps; }).catch(() => null);
  const p2t = PASS2_TEXT_FILES.map((u) => fetchFn(u).then((r) => (r.ok ? r.json() : null)).then(addPass2Text).catch(() => null));
  return Promise.all([p2, ...p2t, ...TEXTBOT_FILES.map((u) => fetchFn(u).then((r) => (r.ok ? r.json() : null)).then(addTextbot).catch(() => null))]).then(() => TB);
}
// Pass 2 cave pockets (Oct 30 2026): DRAFT lines for the new pocket trainers / Easter eggs, used only where
// text/overworld_lines.json has no maps.<map>.<id> entry yet (Text Bot / Story Bot own the final text).
export const PASS2_FILE = 'data/pass2_caves_fallback.json';
export const PASS2 = { maps: {} };
// Text Bot's pass 2 lines (one file per map, mirrors maps.<map>.<id>, adds battle_won): override the DRAFT fallback.
export const PASS2_TEXT_FILES = ['data/textbot_pass2_switchbacks.json', 'data/textbot_pass2_batch2.json', 'data/textbot_pass2_batch3.json', 'data/textbot_pass2_batch4.json', 'data/textbot_pass2_batch5.json', 'data/textbot_logger_scene.json', 'data/textbot_revival_heights_park.json', 'data/textbot_sunmeadow_strollers.json'];
export const PASS2_TEXT = { maps: {} };
export function addPass2Text(o, into = PASS2_TEXT) {
  for (const [m, ids] of Object.entries(o?.maps || {})) Object.assign((into.maps[m] = into.maps[m] || {}), ids);
  return into;
}
export function withPass2Fallback(lines, fb = PASS2, final = PASS2_TEXT) {
  if (!lines || typeof lines !== 'object') return lines;
  lines.maps = lines.maps || {};
  for (const src of [final, fb]) // Text Bot's file first, then the DRAFT fallback; overworld_lines.json always wins
    for (const [m, ids] of Object.entries(src?.maps || {})) {
      const dst = (lines.maps[m] = lines.maps[m] || {});
      for (const [id, e] of Object.entries(ids || {})) if (!dst[id] && e && typeof e === 'object') { const { status, _status, ...rest } = e; dst[id] = rest; }
    }
  return lines;
}
export const fallbackText = (k) => TB[k] || FB[k] || [];
export const textbotReady = typeof window !== 'undefined' ? loadTextbot() : Promise.resolve(TB);
