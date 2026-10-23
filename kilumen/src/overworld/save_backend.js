// Kilumen: save storage backend (libs pass, Oct 22, 2026). IndexedDB through idb-keyval (Apache-2.0,
// src/vendor/idb-keyval), with localStorage as the fallback.
//
// SaveStore (save.js) and the UI read saves synchronously, so this module preloads the save keys from IndexedDB
// once at boot. After that it serves a sync Storage-like object (getItem/setItem/removeItem) from memory:
//   - writes go to IndexedDB in order through a promise queue (flush() waits for them);
//   - writes are also mirrored to localStorage synchronously, so a phone that kills the tab on pagehide (iOS
//     Safari) before the async IndexedDB write lands still has the latest save;
//   - at load, for each key the copy with the newer savedAt wins (IndexedDB vs the localStorage mirror).
// One-time migration: the first time IndexedDB opens (no MIGRATED_KEY marker yet), any save that exists only in
// localStorage is copied in. If IndexedDB is missing or fails (some private modes, old WebViews), it falls back
// to plain localStorage, the same as before this pass.

export const MIGRATED_KEY = 'kilumen_alpha_save.migrated';

const savedAt = (raw) => { try { return Number(JSON.parse(raw)?.savedAt) || 0; } catch { return -1; } };

/**
 * @param {object} o
 * @param {{getMany:Function,setMany:Function,set:Function,del:Function,get:Function}|null} o.idb  idb-keyval API (or a fake in tests)
 * @param {Storage|null} o.local  window.localStorage (null when blocked)
 * @param {string[]} o.keys  save keys to preload (main + .bak)
 * @param {boolean} [o.mirror=true]  mirror every write to localStorage
 * @param {number} [o.timeoutMs=2500]  give up on IndexedDB (fall back to localStorage) if the preload takes longer
 */
export async function openSaveStorage({ idb, local, keys, mirror = true, timeoutMs = 2500 }) {
  const lsGet = (k) => { try { return local?.getItem(k) ?? null; } catch { return null; } };
  const plain = local ? { backend: 'localStorage', getItem: lsGet, setItem: (k, v) => local.setItem(k, v), removeItem: (k) => local.removeItem(k), flush: async () => {}, lastError: null, migrated: false } : null;
  if (!idb) return plain;
  const cache = new Map();
  let migrated = false;
  try {
    // Some WebKit builds never settle an IndexedDB open: time out and fall back rather than hang the boot.
    let timer;
    const vals = await Promise.race([idb.getMany([...keys, MIGRATED_KEY]),
      new Promise((_, rej) => { timer = setTimeout(() => rej(new Error(`no answer in ${timeoutMs} ms`)), timeoutMs); })])
      .finally(() => clearTimeout(timer));
    const marker = vals.pop();
    const copy = [];
    keys.forEach((k, i) => {
      const fromIdb = typeof vals[i] === 'string' ? vals[i] : null, fromLs = lsGet(k);
      let pick = fromIdb;
      if (fromLs != null && (fromIdb == null || savedAt(fromLs) > savedAt(fromIdb))) { pick = fromLs; copy.push([k, fromLs]); }
      if (pick != null) cache.set(k, pick);
    });
    if (!marker) { copy.push([MIGRATED_KEY, new Date().toISOString()]); migrated = copy.length > 1; }
    if (copy.length) await idb.setMany(copy);
  } catch (e) {
    if (plain) plain.lastError = 'indexeddb: ' + (e?.message || e);
    return plain;
  }
  let queue = Promise.resolve();
  const api = {
    backend: 'indexeddb', lastError: null, migrated,
    getItem: (k) => (cache.has(k) ? cache.get(k) : null),
    setItem(k, v) {
      v = String(v); cache.set(k, v);
      if (mirror) { try { local?.setItem(k, v); } catch (e) { api.lastError = 'mirror: ' + e.message; } }
      queue = queue.then(() => idb.set(k, v)).catch((e) => { api.lastError = 'indexeddb: ' + (e?.message || e); });
    },
    removeItem(k) {
      cache.delete(k);
      if (mirror) { try { local?.removeItem(k); } catch { /* ignore */ } }
      queue = queue.then(() => idb.del(k)).catch((e) => { api.lastError = 'indexeddb: ' + (e?.message || e); });
    },
    flush: () => queue,
  };
  return api;
}
