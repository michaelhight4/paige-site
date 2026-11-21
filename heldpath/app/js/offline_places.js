/**
 * Place names and tunnel hints from map tiles already on this phone.
 * Used so search and routing work without sending queries off-device.
 */
import { VectorTile } from "@mapbox/vector-tile";
import Pbf from "pbf";
import { tileToLonLat } from "./walk_graph_build.js";

const NAME_LAYERS = ["place", "places", "poi", "pois", "transportation_name", "roads", "housenumber"];

function asTile(data) {
  const buf = data instanceof Uint8Array ? data : new Uint8Array(data);
  return new VectorTile(new Pbf(buf));
}

function featurePoint(z, x, y, extent, feature) {
  const geom = feature.loadGeometry();
  if (!geom || !geom.length || !geom[0].length) return null;
  const ring = geom[0];
  const mid = ring[Math.floor(ring.length / 2)] || ring[0];
  return tileToLonLat(x, y, z, extent, mid.x, mid.y);
}

function featureName(props = {}) {
  const name = props.name || props["name:en"] || props.ref || props.street || null;
  if (name) return String(name).trim();
  const num = props.housenumber || props.addr_housenumber;
  const street = props.street || props.addr_street;
  if (num && street) return `${num} ${street}`.trim();
  return "";
}

export function placeFromProps(props, lat, lon) {
  const label = featureName(props);
  if (!label || !Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return {
    label,
    lat,
    lon,
    type: props.class || props["pmap:kind"] || props.type || props.osm_value || "place",
    source: "pack",
  };
}

/** Named places, streets and POIs from one vector tile already on the phone. */
export function extractPlacesFromTile(z, x, y, data) {
  if (!data) return [];
  let tile;
  try { tile = asTile(data); } catch { return []; }
  const out = [];
  for (const layerName of NAME_LAYERS) {
    const layer = tile.layers && tile.layers[layerName];
    if (!layer) continue;
    const extent = layer.extent || 4096;
    for (let i = 0; i < layer.length; i++) {
      const f = layer.feature(i);
      const pt = featurePoint(z, x, y, extent, f);
      if (!pt) continue;
      const place = placeFromProps(f.properties || {}, pt.lat, pt.lon);
      if (place) out.push(place);
    }
  }
  return out;
}

function isTunnelProps(props = {}) {
  const brunnel = String(props.brunnel || "").toLowerCase();
  if (brunnel === "tunnel") return true;
  const tunnel = props.tunnel;
  if (tunnel != null && !["", "no", "false", "0", "none"].includes(String(tunnel).toLowerCase())) return true;
  const covered = props.covered;
  if (covered != null && !["", "no", "false", "0", "none"].includes(String(covered).toLowerCase())) return true;
  return false;
}

/** Tunnel or covered ways from one on-device vector tile. */
export function extractTunnelsFromTile(z, x, y, data) {
  if (!data) return [];
  let tile;
  try { tile = asTile(data); } catch { return []; }
  const out = [];
  for (const layerName of ["transportation", "roads"]) {
    const layer = tile.layers && tile.layers[layerName];
    if (!layer) continue;
    const extent = layer.extent || 4096;
    for (let i = 0; i < layer.length; i++) {
      const f = layer.feature(i);
      const props = f.properties || {};
      if (!isTunnelProps(props) || f.type !== 2) continue;
      const geom = f.loadGeometry() || [];
      for (const ring of geom) {
        if (ring.length < 2) continue;
        const geometry = ring.map((p) => {
          const ll = tileToLonLat(x, y, z, extent, p.x, p.y);
          return { lat: ll.lat, lon: ll.lon };
        });
        out.push({ id: `${z}/${x}/${y}/${i}`, tags: { tunnel: "yes", ...props }, geometry });
      }
    }
  }
  return out;
}

export function normalizeQuery(query) {
  return String(query || "").trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Rank on-device places. Starts-with matches first, then includes.
 */
export function matchPlaces(places, query, { limit = 8 } = {}) {
  const q = normalizeQuery(query);
  if (q.length < 2) return [];
  const seen = new Set();
  const hits = [];
  for (const place of places || []) {
    if (!place || !place.label) continue;
    const label = String(place.label).trim();
    const key = `${label.toLowerCase()}|${Number(place.lat).toFixed(5)}|${Number(place.lon).toFixed(5)}`;
    if (seen.has(key)) continue;
    const hay = label.toLowerCase();
    let score = 0;
    if (hay === q) score = 3;
    else if (hay.startsWith(q) || hay.split(/\s+/).some((w) => w.startsWith(q))) score = 2;
    else if (hay.includes(q)) score = 1;
    if (!score) continue;
    seen.add(key);
    hits.push({ ...place, label, score });
  }
  hits.sort((a, b) => b.score - a.score || a.label.localeCompare(b.label));
  return hits.slice(0, Math.max(1, limit)).map(({ score, ...rest }) => rest);
}

/** Places already loaded in the visible MapLibre sources. */
export function placesFromMap(map) {
  if (!map || typeof map.querySourceFeatures !== "function") return [];
  const out = [];
  const sourceIds = ["firenze", "ofm", "world"];
  const layers = NAME_LAYERS;
  for (const source of sourceIds) {
    try {
      if (!map.getSource(source)) continue;
    } catch { continue; }
    for (const layer of layers) {
      let feats = [];
      try {
        feats = map.querySourceFeatures(source, { sourceLayer: layer });
      } catch {
        try { feats = map.querySourceFeatures(source, { sourceLayer: layer + "s" }); } catch { feats = []; }
      }
      for (const f of feats || []) {
        const coords = f.geometry && f.geometry.coordinates;
        let lon, lat;
        if (Array.isArray(coords) && Number.isFinite(coords[0]) && Number.isFinite(coords[1])) {
          lon = coords[0];
          lat = coords[1];
        } else if (Array.isArray(coords) && Array.isArray(coords[0])) {
          const c = Array.isArray(coords[0][0]) ? coords[0][0] : coords[0];
          lon = c[0];
          lat = c[1];
        }
        const place = placeFromProps(f.properties || {}, lat, lon);
        if (place) out.push(place);
      }
    }
  }
  return out;
}

export function placesFromTiles(tiles) {
  const out = [];
  for (const t of tiles || []) {
    if (!t || !t.data) continue;
    out.push(...extractPlacesFromTile(t.z, t.x, t.y, t.data));
  }
  return out;
}

export function tunnelsFromTiles(tiles) {
  const out = [];
  for (const t of tiles || []) {
    if (!t || !t.data) continue;
    out.push(...extractTunnelsFromTile(t.z, t.x, t.y, t.data));
  }
  return out;
}

export async function searchOfflinePlaces(query, { map, tiles, extra = [], limit = 8 } = {}) {
  const pool = [
    ...extra,
    ...placesFromMap(map),
    ...placesFromTiles(tiles),
  ];
  return matchPlaces(pool, query, { limit });
}
