/**
 * Place search via Photon (Komoot), which is based on OpenStreetMap.
 * Usage: light, on-demand lookups only; debounce in the UI; cache results;
 * do not bulk-query. Attribution: OpenStreetMap contributors and Photon.
 * https://github.com/komoot/photon
 */

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

export async function searchPlaces(query, { limit = 5, signal } = {}) {
  const q = String(query || "").trim();
  if (q.length < 2) return [];
  const key = q.toLowerCase();
  if (cache.has(key)) return cache.get(key);
  const url = `${PHOTON_URL}?q=${encodeURIComponent(q)}&limit=${Math.min(8, Math.max(1, limit))}`;
  const res = await fetch(url, { signal, headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Place search failed (${res.status})`);
  const places = parsePhotonResponse(await res.json());
  cache.set(key, places);
  if (cache.size > CACHE_LIMIT) {
    const first = cache.keys().next().value;
    cache.delete(first);
  }
  return places;
}
