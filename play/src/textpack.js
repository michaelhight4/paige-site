// Text Bot content merge point. /workspace/lifesim_text/ (in progress) will provide events + text data. When it ships, copy it to
// lifesim/data/text/ with a manifest.json (schema below); this loader overlays it on the starter data at boot. Until the manifest
// exists nothing happens (starter data stays).
//   data/text/manifest.json : { "version":1, "complete":true, "files": { "events":"events.json", "diseases":"diseases.json", "journal":"journal.json",
//                               "life":"life.json", "voice":"voice.json", "worldActs":"world_activities.json" } }
//   events.json / diseases.json : arrays; entries with an existing id REPLACE the starter entry, new ids are appended (chains must resolve).
//   journal.json / life.json / voice.json / worldActs : objects deep-merged over the starter ones (arrays replace).
import { D } from './data.js';
let info = { loaded: false, reason: 'no text pack found (data/text/manifest.json missing)', events: 0 };
const isNode = typeof window === 'undefined';
async function read(rel) {
  try { if (isNode) { const fs = await import('node:fs'); return JSON.parse(fs.readFileSync(new URL(rel, import.meta.url), 'utf8')); } const r = await fetch(new URL(rel, import.meta.url)); return r.ok ? await r.json() : null; } catch (e) { return null; }
}
const merge = (a, b) => { if (Array.isArray(b) || typeof b !== 'object' || b === null) return b; const o = { ...(a || {}) }; for (const k of Object.keys(b)) o[k] = merge(o[k], b[k]); return o; };
export function overlayList(base, extra) { const m = new Map(base.map((x) => [x.id, x])); for (const e of extra) m.set(e.id, e); return [...m.values()]; }
export async function loadTextPack() {
  const man = await read('../data/text/manifest.json');
  if (!man) return info = { loaded: false, reason: 'no text pack found (data/text/manifest.json missing)', events: 0 };
  if (!man.complete) return info = { loaded: false, reason: 'text pack marked incomplete', events: 0 };
  const ids = new Set(); let ev = 0;
  for (const [key, file] of Object.entries(man.files || {})) {
    const data = await read('../data/text/' + file); if (!data) continue;
    if (key === 'events') { const merged = overlayList(D.events, data); const all = new Set(merged.map((e) => e.id)); const bad = []; for (const e of merged) for (const c of e.choices || []) { const ch = c.chain ? [].concat(c.chain) : []; for (const x of ch) if (!all.has(x.id)) bad.push(x.id); } if (bad.length) return info = { loaded: false, reason: 'unresolved chains: ' + bad.slice(0, 5).join(','), events: 0 }; D.events = merged; ev = data.length; }
    else if (key === 'diseases') D.diseases = overlayList(D.diseases, data);
    else if (key === 'journal') D.life.journal = merge(D.life.journal, data);
    else if (key === 'life') D.life = merge(D.life, data);
    else if (D[key] && typeof D[key] === 'object') D[key] = merge(D[key], data);
    ids.add(key);
  }
  return info = { loaded: true, reason: '', events: ev, keys: [...ids] };
}
export const status = () => info;
