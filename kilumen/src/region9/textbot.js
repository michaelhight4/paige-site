// Text Bot's final Wellspire lines (data/textbot_*.json) layered over the DRAFT fallbacks in ./text_fallback.js:
// a Text Bot key wins, any key it lacks falls back to FB. Loaded once at startup (fetch, like data/masters.json). Coder Oct 30 2026.
import { FB } from './text_fallback.js?v=v0.2.93-alpha';
export const TEXTBOT_FILES = ['data/textbot_icefall.json'];
export const TB = {};
export function addTextbot(obj) {
  for (const [k, v] of Object.entries(obj || {})) if (!k.startsWith('_') && Array.isArray(v) && v.length) TB[k] = v;
  return TB;
}
export function loadTextbot(fetchFn = globalThis.fetch) {
  if (!fetchFn) return Promise.resolve(TB);
  return Promise.all(TEXTBOT_FILES.map((u) => fetchFn(u).then((r) => (r.ok ? r.json() : null)).then(addTextbot).catch(() => null))).then(() => TB);
}
export const fallbackText = (k) => TB[k] || FB[k] || [];
export const textbotReady = typeof window !== 'undefined' ? loadTextbot() : Promise.resolve(TB);
