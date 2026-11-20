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
