import {
  OFM_MAX_TILES,
  OFM_MAX_BYTES,
  OFM_PARALLEL,
  OFM_USER_AGENT,
  planDownload,
  tilesInPyramid,
  resolveOfmTemplate,
  tileUrl,
  mapPool,
  normalizeBbox,
} from "./map_tiles.js";
import {
  getTile,
  putTile,
  saveArea,
  listAreas,
  deleteAreaRecord,
  observedAvgTileBytes,
  tileCacheBytes,
  deviceStorage,
} from "./map_storage.js";
import { prefetchDemForBbox } from "./elevation_dem.js";

export { listAreas, deleteAreaRecord, tileCacheBytes, deviceStorage, observedAvgTileBytes, planDownload };

export async function downloadArea(bbox, opt = {}) {
  const box = normalizeBbox(bbox);
  const avgBytes = opt.avgBytes || (await observedAvgTileBytes());
  const plan = planDownload(box, { avgBytes });
  if (plan.tooLarge) return { ok: false, reason: "too-large", plan };
  const tiles = tilesInPyramid(box, plan.minZoom, plan.maxZoom);
  if (tiles.length > OFM_MAX_TILES) return { ok: false, reason: "too-many", plan, tileCount: tiles.length };
  const tmpl = await resolveOfmTemplate();
  const keys = [];
  const result = await mapPool(
    tiles,
    OFM_PARALLEL,
    async (t) => {
      const existing = await getTile(t.z, t.x, t.y);
      if (existing) {
        keys.push(`ofm/${t.z}/${t.x}/${t.y}`);
        return existing.byteLength;
      }
      const res = await fetch(tileUrl(tmpl, t.z, t.x, t.y), {
        headers: { "User-Agent": OFM_USER_AGENT },
      });
      if (!res.ok) return 0;
      const data = await res.arrayBuffer();
      if (data.byteLength) {
        await putTile(t.z, t.x, t.y, data);
        keys.push(`ofm/${t.z}/${t.x}/${t.y}`);
      }
      return data.byteLength;
    },
    opt.onProgress
  );
  if (result.bytes > OFM_MAX_BYTES && keys.length === 0) {
    return { ok: false, reason: "too-large", plan, result };
  }
  const now = new Date().toISOString();
  const area = {
    id: opt.id || "area-" + Date.now().toString(36),
    name: opt.name || defaultAreaName(box),
    west: box.west,
    south: box.south,
    east: box.east,
    north: box.north,
    minZoom: plan.minZoom,
    maxZoom: plan.maxZoom,
    bytes: result.bytes,
    tileCount: result.done,
    tileKeys: keys,
    createdAt: opt.createdAt || now,
    updatedAt: now,
  };
  await saveArea(area);
  try { prefetchDemForBbox(box).catch(() => {}); } catch { /* DEM is optional */ }
  return { ok: true, area, plan, result };
}

export function defaultAreaName(box) {
  const lat = ((box.south + box.north) / 2).toFixed(2);
  const lon = ((box.west + box.east) / 2).toFixed(2);
  return `Area ${lat}, ${lon}`;
}

export async function updateArea(area, onProgress) {
  return downloadArea(area, {
    id: area.id,
    name: area.name,
    createdAt: area.createdAt,
    onProgress,
  });
}
