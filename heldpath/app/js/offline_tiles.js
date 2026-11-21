/**
 * Read vector tiles already on this phone: the OFM tile cache, saved
 * PMTiles packs, and the bundled Florence pack. No network.
 */
import { PMTiles } from "pmtiles";
import { getTile, openArchiveSource } from "./map_storage.js";

const packCache = new Map();
const BUNDLED = [{ id: "firenze", file: "firenze.pmtiles", minZoom: 0, maxZoom: 15 }];

function memorySource(id, buf) {
  return {
    getKey: () => id,
    async getBytes(offset, length) {
      return { data: buf.slice(offset, offset + length) };
    },
  };
}

function nodeFileSource(path, id) {
  const fs = awaitImportFs();
  if (!fs) return null;
  const fd = fs.openSync(path, "r");
  return {
    getKey: () => id,
    async getBytes(offset, length) {
      const buf = Buffer.alloc(length);
      fs.readSync(fd, buf, 0, length, offset);
      return { data: buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) };
    },
  };
}

function awaitImportFs() {
  try {
    return require("fs");
  } catch {
    return null;
  }
}

async function fetchBundledBytes(file) {
  if (typeof window !== "undefined" && window.location) {
    const url = new URL("maps/" + file, window.location.href).href;
    const res = await fetch(url);
    if (!res.ok) return null;
    return res.arrayBuffer();
  }
  try {
    const { readFileSync } = await import("fs");
    const { resolve, dirname } = await import("path");
    const { fileURLToPath } = await import("url");
    // tests run from repo root or tests/
    const here = resolve(process.cwd(), "www/maps", file);
    return readFileSync(here).buffer.slice();
  } catch {
    return null;
  }
}

async function openPack(id, file) {
  if (packCache.has(id)) return packCache.get(id);
  const pending = (async () => {
    try {
      const src = await openArchiveSource(id);
      if (src) {
        const pack = new PMTiles(src);
        await pack.getHeader();
        return pack;
      }
    } catch { /* try bundled file */ }
    try {
      if (typeof window === "undefined") {
        const { existsSync, openSync, readSync, fstatSync } = await import("fs");
        const { resolve } = await import("path");
        const here = resolve(process.cwd(), "www/maps", file || `${id}.pmtiles`);
        if (existsSync(here)) {
          const fd = openSync(here, "r");
          const pack = new PMTiles({
            getKey: () => id,
            async getBytes(offset, length) {
              const buf = Buffer.alloc(length);
              readSync(fd, buf, 0, length, offset);
              return { data: buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) };
            },
          });
          await pack.getHeader();
          return pack;
        }
      }
    } catch { /* fall through */ }
    try {
      const buf = await fetchBundledBytes(file || `${id}.pmtiles`);
      if (buf && buf.byteLength) {
        const pack = new PMTiles(memorySource(id, buf));
        await pack.getHeader();
        return pack;
      }
    } catch { /* none */ }
    return null;
  })();
  packCache.set(id, pending);
  return pending;
}

export async function tileFromPacks(z, x, y) {
  for (const spec of BUNDLED) {
    if (z < spec.minZoom || z > spec.maxZoom) continue;
    try {
      const pack = await openPack(spec.id, spec.file);
      if (!pack) continue;
      const header = await pack.getHeader();
      if (z < header.minZoom || z > header.maxZoom) continue;
      const res = await pack.getZxy(z, x, y);
      if (res && res.data && res.data.byteLength) return res.data;
    } catch { /* try next pack */ }
  }
  return null;
}

/** Cached OFM tile or a tile from a bundled/saved pack. Never hits the network. */
export async function loadOfflineMapTile(z, x, y) {
  try {
    const cached = await getTile(z, x, y);
    if (cached && cached.byteLength) return cached;
  } catch { /* continue */ }
  return tileFromPacks(z, x, y);
}

export function clearPackCache() {
  packCache.clear();
}
