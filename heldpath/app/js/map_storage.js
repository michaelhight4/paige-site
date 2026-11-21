/**
 * Web map-pack storage. Prefer Origin Private File System; fall back to IndexedDB.
 * Native builds keep using the bundled www/maps file and the app sandbox.
 */
const DB_NAME = "heldpath-maps";
const STORE = "packs";

function idb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function opfsDir() {
  if (!navigator.storage || !navigator.storage.getDirectory) return null;
  const root = await navigator.storage.getDirectory();
  return root.getDirectoryHandle("maps", { create: true });
}

export async function savePack(id, buffer, meta = {}) {
  let used = "idb";
  try {
    const dir = await opfsDir();
    if (dir) {
      const file = await dir.getFileHandle(`${id}.pmtiles`, { create: true });
      const writable = await file.createWritable();
      await writable.write(buffer);
      await writable.close();
      used = "opfs";
    }
  } catch {
    used = "idb";
  }
  const db = await idb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
    tx.objectStore(STORE).put({ buffer, meta: { ...meta, storedAt: new Date().toISOString(), via: used } }, id);
  });
  db.close();
  return { ok: true, via: used };
}

export async function getPack(id) {
  try {
    const dir = await opfsDir();
    if (dir) {
      const file = await dir.getFileHandle(`${id}.pmtiles`);
      const blob = await (await file.getFile()).arrayBuffer();
      if (blob && blob.byteLength) return blob;
    }
  } catch { /* fall through to IDB */ }
  const db = await idb();
  const rec = await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return rec && rec.buffer ? rec.buffer : null;
}

export async function hasPack(id) {
  const buf = await getPack(id);
  return !!(buf && buf.byteLength);
}

const TILE_DB = "heldpath-tiles";
const TILE_STORE = "tiles";
const AREA_STORE = "areas";
const META_STORE = "meta";

function tileDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(TILE_DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(TILE_STORE)) db.createObjectStore(TILE_STORE);
      if (!db.objectStoreNames.contains(AREA_STORE)) db.createObjectStore(AREA_STORE, { keyPath: "id" });
      if (!db.objectStoreNames.contains(META_STORE)) db.createObjectStore(META_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tileKey(z, x, y) {
  return `ofm/${z}/${x}/${y}`;
}

export async function putTile(z, x, y, buffer) {
  const db = await tileDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(TILE_STORE, "readwrite");
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
    tx.objectStore(TILE_STORE).put({ data: buffer, bytes: buffer.byteLength, storedAt: Date.now() }, tileKey(z, x, y));
  });
  db.close();
}

export async function getTile(z, x, y) {
  const db = await tileDb();
  const rec = await new Promise((resolve, reject) => {
    const tx = db.transaction(TILE_STORE, "readonly");
    const req = tx.objectStore(TILE_STORE).get(tileKey(z, x, y));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return rec && rec.data ? rec.data : null;
}

export async function hasTile(z, x, y) {
  const buf = await getTile(z, x, y);
  return !!(buf && buf.byteLength);
}

export async function deleteTiles(keys) {
  const db = await tileDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(TILE_STORE, "readwrite");
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
    const store = tx.objectStore(TILE_STORE);
    for (const k of keys) store.delete(k);
  });
  db.close();
}

export async function listAreas() {
  const db = await tileDb();
  const recs = await new Promise((resolve, reject) => {
    const tx = db.transaction(AREA_STORE, "readonly");
    const req = tx.objectStore(AREA_STORE).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return recs.sort((a, b) => (b.updatedAt || b.createdAt || "").localeCompare(a.updatedAt || a.createdAt || ""));
}

export async function saveArea(area) {
  const db = await tileDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(AREA_STORE, "readwrite");
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
    tx.objectStore(AREA_STORE).put(area);
  });
  db.close();
  return area;
}

export async function deleteAreaRecord(id) {
  const recs = await listAreas();
  const gone = recs.find((a) => a.id === id);
  const others = recs.filter((a) => a.id !== id);
  if (gone && gone.tileKeys && gone.tileKeys.length) {
    const keep = new Set();
    for (const a of others) {
      for (const k of a.tileKeys || []) keep.add(k);
    }
    const drop = gone.tileKeys.filter((k) => !keep.has(k));
    if (drop.length) await deleteTiles(drop);
  }
  const db = await tileDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(AREA_STORE, "readwrite");
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
    tx.objectStore(AREA_STORE).delete(id);
  });
  db.close();
}

export async function tileCacheBytes() {
  const db = await tileDb();
  const recs = await new Promise((resolve, reject) => {
    const tx = db.transaction(TILE_STORE, "readonly");
    const req = tx.objectStore(TILE_STORE).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return recs.reduce((s, r) => s + (r.bytes || (r.data ? r.data.byteLength : 0)), 0);
}

export async function observedAvgTileBytes(fallback = 80 * 1024) {
  const db = await tileDb();
  const recs = await new Promise((resolve, reject) => {
    const tx = db.transaction(TILE_STORE, "readonly");
    const req = tx.objectStore(TILE_STORE).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
  db.close();
  const sized = recs.filter((r) => (r.bytes || 0) > 0);
  if (sized.length < 8) return fallback;
  const sum = sized.reduce((s, r) => s + r.bytes, 0);
  return Math.max(8 * 1024, Math.round(sum / sized.length));
}

export async function deviceStorage() {
  try {
    if (navigator.storage && navigator.storage.estimate) {
      const est = await navigator.storage.estimate();
      const quota = est.quota || 0;
      const usage = est.usage || 0;
      return { quota, usage, available: Math.max(0, quota - usage) };
    }
  } catch { /* ignore */ }
  return { quota: null, usage: null, available: null };
}

/** Random-access source for a saved or bundled PMTiles archive. */
export async function openArchiveSource(id) {
  try {
    const dir = await opfsDir();
    if (dir) {
      const fh = await dir.getFileHandle(`${id}.pmtiles`);
      const file = await fh.getFile();
      if (file && file.size) {
        return {
          getKey: () => id,
          async getBytes(offset, length) {
            const buf = await file.slice(offset, offset + length).arrayBuffer();
            return { data: buf };
          },
        };
      }
    }
  } catch { /* fall through */ }
  const buf = await getPack(id);
  if (!buf) return null;
  return {
    getKey: () => id,
    async getBytes(offset, length) {
      return { data: buf.slice(offset, offset + length) };
    },
  };
}

/** Remove cached street tiles. Downloaded area records are also cleared so sizes stay honest. */
export async function clearTileCache() {
  const db = await tileDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction([TILE_STORE, AREA_STORE], "readwrite");
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
    tx.objectStore(TILE_STORE).clear();
    tx.objectStore(AREA_STORE).clear();
  });
  db.close();
  return { ok: true };
}

export async function packCacheBytes() {
  const db = await idb();
  const recs = await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return recs.reduce((s, r) => s + (r && r.buffer ? r.buffer.byteLength : 0), 0);
}

/** All street tiles already stored on this phone (no network). */
export async function listCachedTiles() {
  const db = await tileDb();
  const recs = await new Promise((resolve, reject) => {
    const tx = db.transaction(TILE_STORE, "readonly");
    const req = tx.objectStore(TILE_STORE).openCursor();
    const out = [];
    req.onsuccess = () => {
      const cursor = req.result;
      if (!cursor) { resolve(out); return; }
      const key = String(cursor.key || "");
      const parts = key.split("/");
      const rec = cursor.value;
      const data = rec && rec.data ? rec.data : rec;
      if (parts.length >= 4 && data) {
        const z = Number(parts[1]);
        const x = Number(parts[2]);
        const y = Number(parts[3]);
        if (Number.isFinite(z) && Number.isFinite(x) && Number.isFinite(y)) {
          out.push({ z, x, y, data });
        }
      }
      cursor.continue();
    };
    req.onerror = () => reject(req.error);
  });
  db.close();
  return recs;
}
