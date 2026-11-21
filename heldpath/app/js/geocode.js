/**
 * Place search. Looks through maps already on this phone first.
 * Photon is used only when the user turns on Photon place search in
 * Privacy & Data. The app works fully with that setting off.
 */
import { allowsPhoton, confirmOnlineUse } from "./privacy_data.js";
import { searchOfflinePlaces } from "./offline_places.js";
import { listCachedTiles } from "./map_storage.js";

const PHOTON_URL = "https://photon.komoot.io/api/";
const CACHE_LIMIT = 40;
const cache = new Map();

export function formatPlaceLabel(props = {}) {
  const parts = [];
  const name = [props.housenumber, props.street || props.name].filter(Boolean).join(" ").trim();
  if (name) parts.push(name);
  else if (props.name) parts.push(props.name);
  for (const key of ["city", "town", "village", "state", "country"]) {
    const val = props[key];
    if (val && !parts.includes(val)) parts.push(val);
  }
  return parts.join(", ");
}

export function parsePhotonFeature(feature) {
  if (!feature || !feature.geometry || !Array.isArray(feature.geometry.coordinates)) return null;
  const [lon, lat] = feature.geometry.coordinates;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  const props = feature.properties || {};
  const label = formatPlaceLabel(props);
  if (!label) return null;
  return {
    label,
    lat,
    lon,
    type: props.type || props.osm_value || "",
    source: "photon",
  };
}

export function parsePhotonResponse(data) {
  const features = data && Array.isArray(data.features) ? data.features : [];
  const out = [];
  const seen = new Set();
  for (const f of features) {
    const place = parsePhotonFeature(f);
    if (!place) continue;
    const key = `${place.label}|${place.lat.toFixed(5)}|${place.lon.toFixed(5)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(place);
  }
  return out;
}

async function searchPhoton(query, { limit = 5, signal } = {}) {
  const url = `${PHOTON_URL}?q=${encodeURIComponent(query)}&limit=${Math.min(8, Math.max(1, limit))}`;
  const res = await fetch(url, { signal, headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Place search failed (${res.status})`);
  return parsePhotonResponse(await res.json());
}

/**
 * Search places. Always tries the downloaded / visible map pack first.
 * Online Photon lookup runs only if Privacy & Data allows it.
 */
export async function searchPlaces(query, { limit = 5, signal, map, tiles } = {}) {
  const q = String(query || "").trim();
  if (q.length < 2) return [];
  const key = q.toLowerCase();
  if (cache.has(key)) return cache.get(key);

  let cachedTiles = tiles;
  if (!cachedTiles) {
    try { cachedTiles = await listCachedTiles(); } catch { cachedTiles = []; }
  }
  let places = [];
  try {
    places = await searchOfflinePlaces(q, { map, tiles: cachedTiles, limit });
  } catch { places = []; }

  let usePhoton = allowsPhoton();
  if (!usePhoton && places.length === 0) {
    usePhoton = confirmOnlineUse("photon");
  }
  if (usePhoton) {
    try {
      const online = await searchPhoton(q, { limit, signal });
      const seen = new Set(places.map((p) => `${p.label}|${p.lat.toFixed(5)}|${p.lon.toFixed(5)}`));
      for (const p of online) {
        const k = `${p.label}|${p.lat.toFixed(5)}|${p.lon.toFixed(5)}`;
        if (seen.has(k)) continue;
        seen.add(k);
        places.push(p);
      }
      places = places.slice(0, Math.max(1, limit));
    } catch (err) {
      if (!places.length) throw err;
    }
  }

  cache.set(key, places);
  if (cache.size > CACHE_LIMIT) {
    const first = cache.keys().next().value;
    cache.delete(first);
  }
  return places;
}

export function clearPlaceSearchCache() {
  cache.clear();
}
