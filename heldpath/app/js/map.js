import maplibregl from "maplibre-gl";
import { Protocol, PMTiles } from "pmtiles";
import { getPack, savePack, openArchiveSource, getTile, putTile } from "./map_storage.js";
import {
  FLORENCE_BOUNDS,
  inBounds,
  OFM_USER_AGENT,
  OFM_PARALLEL,
  resolveOfmTemplate,
  tileUrl,
  WORLD_MAXZOOM,
} from "./map_tiles.js";
import { WORLD_VIEW, STREET_ZOOM } from "./locate.js";

let map = null;
let protocolAdded = false;
let ofmProtocolAdded = false;
const overlayIds = [];

const BOUNDS = FLORENCE_BOUNDS;
const ATTRIBUTION =
  '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors · <a href="https://protomaps.com">Protomaps</a> · <a href="https://openfreemap.org/">OpenFreeMap</a> © <a href="https://openmaptiles.org/">OpenMapTiles</a>';

export function defaultCenter() {
  return { lat: WORLD_VIEW.lat, lon: WORLD_VIEW.lon, zoom: WORLD_VIEW.zoom };
}

function packUrl(file) {
  return new URL("maps/" + file, window.location.href).href;
}

/** Load the bundled PMTiles file into memory so we don't need HTTP range requests
 *  (the overlap-check static server and Capacitor WebView are both picky about Byte Serving). */
export async function persistStarterPack() {
  const url = packUrl("firenze.pmtiles");
  const buf = await fetch(url).then((r) => {
    if (!r.ok) throw new Error("map pack missing: " + r.status);
    return r.arrayBuffer();
  });
  return savePack("firenze", buf, { name: "Florence extract" });
}

export async function persistWorldPack() {
  const url = packUrl("world.pmtiles");
  const buf = await fetch(url).then((r) => {
    if (!r.ok) throw new Error("world pack missing: " + r.status);
    return r.arrayBuffer();
  });
  return savePack("world", buf, { name: "World basemap z0-6" });
}

function namedSource(id, inner) {
  return {
    getKey: () => id,
    getBytes(offset, length, signal, etag) {
      return inner.getBytes(offset, length, signal, etag);
    },
  };
}

function memorySource(id, buf) {
  return {
    getKey: () => id,
    async getBytes(offset, length) {
      return { data: buf.slice(offset, offset + length) };
    },
  };
}

async function loadArchive(protocol, id, file, { persist = false } = {}) {
  const url = packUrl(file);
  try {
    const src = await openArchiveSource(id);
    if (src) {
      const pack = new PMTiles(namedSource(id, src));
      await pack.getHeader();
      protocol.add(pack);
      return;
    }
  } catch (err) {
    console.warn(id, "saved pack failed", err && err.message ? err.message : err);
  }
  try {
    const remote = new PMTiles(url);
    await remote.getHeader();
    // Register under the short style id (pmtiles://world), not the HTTP URL.
    const pack = new PMTiles(namedSource(id, remote.source));
    await pack.getHeader();
    protocol.add(pack);
    if (persist) {
      fetch(url)
        .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
        .then((buf) => savePack(id, buf, { name: id }))
        .catch((err) => console.warn(id, "background save", err && err.message ? err.message : err));
    }
    return;
  } catch (err) {
    console.warn(id, "range load failed, fetching whole file", err && err.message ? err.message : err);
  }
  const buf = await fetch(url).then((r) => {
    if (!r.ok) throw new Error(id + " pack missing: " + r.status);
    return r.arrayBuffer();
  });
  try { await savePack(id, buf, { name: id }); } catch { /* still use memory */ }
  const pack = new PMTiles(memorySource(id, buf));
  protocol.add(pack);
}

let protocol = null;

function protomapsLayers(source, prefix, opt = {}) {
  const minzoom = opt.minzoom;
  const mz = minzoom == null ? {} : { minzoom };
  return [
    { id: prefix + "earth", type: "fill", source, "source-layer": "earth", ...mz, paint: { "fill-color": "#1A1F28" } },
    { id: prefix + "landuse", type: "fill", source, "source-layer": "landuse", ...mz, paint: { "fill-color": "#1B2520", "fill-opacity": 0.7 } },
    { id: prefix + "landcover", type: "fill", source, "source-layer": "landcover", ...mz, paint: { "fill-color": "#1C2A24", "fill-opacity": 0.65 } },
    { id: prefix + "water", type: "fill", source, "source-layer": "water", ...mz, paint: { "fill-color": "#1A3554" } },
    { id: prefix + "water-line", type: "line", source, "source-layer": "physical_line", ...mz, paint: { "line-color": "#2A5A80", "line-width": 1.2 } },
    { id: prefix + "buildings", type: "fill", source, "source-layer": "buildings", ...mz, paint: { "fill-color": "#2A313C", "fill-opacity": 0.9 } },
    {
      id: prefix + "roads-minor",
      type: "line",
      source,
      "source-layer": "roads",
      ...mz,
      filter: ["!=", ["get", "pmap:kind"], "major_road"],
      paint: { "line-color": "#3A4554", "line-width": ["interpolate", ["linear"], ["zoom"], 12, 0.6, 16, 2] },
    },
    {
      id: prefix + "roads-major",
      type: "line",
      source,
      "source-layer": "roads",
      ...mz,
      filter: ["in", ["get", "pmap:kind"], ["literal", ["major_road", "highway"]]],
      paint: { "line-color": "#5A7A90", "line-width": ["interpolate", ["linear"], ["zoom"], 11, 1.2, 16, 3.4] },
    },
  ];
}

function openMapTilesLayers(source, prefix) {
  return [
    { id: prefix + "landcover", type: "fill", source, "source-layer": "landcover", minzoom: 6, paint: { "fill-color": "#1C2A24", "fill-opacity": 0.7 } },
    { id: prefix + "landuse", type: "fill", source, "source-layer": "landuse", minzoom: 6, paint: { "fill-color": "#1B2520", "fill-opacity": 0.65 } },
    { id: prefix + "park", type: "fill", source, "source-layer": "park", minzoom: 6, paint: { "fill-color": "#1C2A24", "fill-opacity": 0.7 } },
    { id: prefix + "water", type: "fill", source, "source-layer": "water", minzoom: 6, paint: { "fill-color": "#1A3554" } },
    { id: prefix + "waterway", type: "line", source, "source-layer": "waterway", minzoom: 6, paint: { "line-color": "#2A5A80", "line-width": 1.2 } },
    { id: prefix + "building", type: "fill", source, "source-layer": "building", minzoom: 12, paint: { "fill-color": "#2A313C", "fill-opacity": 0.9 } },
    {
      id: prefix + "roads-minor",
      type: "line",
      source,
      "source-layer": "transportation",
      minzoom: 6,
      filter: ["in", ["get", "class"], ["literal", ["minor", "service", "path", "track", "tertiary", "busway"]]],
      paint: { "line-color": "#3A4554", "line-width": ["interpolate", ["linear"], ["zoom"], 12, 0.6, 16, 2] },
    },
    {
      id: prefix + "roads-major",
      type: "line",
      source,
      "source-layer": "transportation",
      minzoom: 6,
      filter: ["in", ["get", "class"], ["literal", ["motorway", "trunk", "primary", "secondary"]]],
      paint: { "line-color": "#5A7A90", "line-width": ["interpolate", ["linear"], ["zoom"], 11, 1.2, 16, 3.4] },
    },
  ];
}

function darkStyle() {
  return {
    version: 8,
    name: "Heldpath Dark",
    sources: {
      world: {
        type: "vector",
        url: "pmtiles://world",
        maxzoom: WORLD_MAXZOOM,
        attribution: ATTRIBUTION,
      },
      firenze: {
        type: "vector",
        url: "pmtiles://firenze",
        bounds: FLORENCE_BOUNDS,
        maxzoom: 15,
        attribution: ATTRIBUTION,
      },
      ofm: {
        type: "vector",
        tiles: ["ofm://{z}/{x}/{y}"],
        minzoom: 6,
        maxzoom: 14,
        attribution: ATTRIBUTION,
      },
    },
    layers: [
      { id: "bg", type: "background", paint: { "background-color": "#12161C" } },
      // World, then the Florence extract, then OpenFreeMap on top so the
      // extract's opaque earth fill cannot punch a darker rectangle into
      // mid-zoom views when online tiles are present. Offline, OFM layers
      // simply stay empty and the bundled packs still show.
      ...protomapsLayers("world", "world-"),
      ...protomapsLayers("firenze", "fi-"),
      ...openMapTilesLayers("ofm", "ofm-"),
    ],
  };
}

function parseOfmUrl(url) {
  const u = String(url);
  const m = u.match(/ofm:\/\/(\d+)\/(\d+)\/(\d+)/);
  if (!m) return null;
  return { z: Number(m[1]), x: Number(m[2]), y: Number(m[3]) };
}

async function ofmHandler(params) {
  const t = parseOfmUrl(params.url || "");
  if (!t) return { data: new ArrayBuffer(0) };
  try {
    const cached = await getTile(t.z, t.x, t.y);
    if (cached && cached.byteLength) return { data: cached };
  } catch { /* continue */ }
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return { data: new ArrayBuffer(0) };
  }
  try {
    const tmpl = await resolveOfmTemplate();
    const res = await fetch(tileUrl(tmpl, t.z, t.x, t.y), {
      headers: { "User-Agent": OFM_USER_AGENT },
    });
    if (!res.ok) return { data: new ArrayBuffer(0) };
    const data = await res.arrayBuffer();
    if (data && data.byteLength) {
      try { await putTile(t.z, t.x, t.y, data); } catch { /* quota */ }
    }
    return { data: data || new ArrayBuffer(0) };
  } catch {
    return { data: new ArrayBuffer(0) };
  }
}

export async function initMap(container, opt = {}) {
  if (map) {
    map.resize();
    return map;
  }
  if (!protocolAdded) {
    protocol = new Protocol();
    maplibregl.addProtocol("pmtiles", protocol.tile);
    protocolAdded = true;
  }
  if (!ofmProtocolAdded) {
    maplibregl.addProtocol("ofm", ofmHandler);
    ofmProtocolAdded = true;
  }
  try {
    await loadArchive(protocol, "firenze", "firenze.pmtiles", { persist: false });
  } catch (err) {
    console.warn("map pack load failed", err && err.message ? err.message : err);
  }
  try {
    await loadArchive(protocol, "world", "world.pmtiles", { persist: true });
  } catch (err) {
    console.warn("world pack load failed", err && err.message ? err.message : err);
  }
  const style = darkStyle();
  const start = opt.center && Number.isFinite(Number(opt.center.lat)) && Number.isFinite(Number(opt.center.lon))
    ? opt.center
    : WORLD_VIEW;
  const startZoom = opt.zoom != null ? opt.zoom : (start.zoom != null ? start.zoom : WORLD_VIEW.zoom);
  map = new maplibregl.Map({
    container,
    style,
    center: [start.lon, start.lat],
    zoom: startZoom,
    minZoom: 0,
    maxZoom: 18,
    attributionControl: { compact: true },
    maxPitch: 0,
    pitchWithRotate: false,
    preserveDrawingBuffer: true, // so headless screenshots capture the WebGL canvas
    fadeDuration: 0,
  });
  map.on("load", () => map.resize());
  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
  map.on("error", (e) => {
    // Missing glyphs or a single tile should not kill the map.
    console.warn("map error", e && e.error ? e.error.message : e);
  });
  return map;
}

export function getMap() {
  return map;
}

export function resizeMap() {
  if (map) map.resize();
}

export function fitBounds(coords, pad = 60) {
  if (!map || !coords.length) return;
  const b = new maplibregl.LngLatBounds();
  coords.forEach((c) => b.extend([c.lon, c.lat]));
  map.fitBounds(b, { padding: pad, maxZoom: 16, duration: 0 });
}

export function setCenter(lat, lon, zoom) {
  if (!map) return;
  map.jumpTo({ center: [lon, lat], zoom: zoom == null ? map.getZoom() : zoom });
}

export function flyTo(lat, lon, zoom, { duration = 900 } = {}) {
  if (!map) return;
  const z = zoom == null ? map.getZoom() : zoom;
  if (!duration) {
    map.jumpTo({ center: [lon, lat], zoom: z });
    return;
  }
  map.flyTo({ center: [lon, lat], zoom: z, duration, essential: true });
}

let userMarker = null;

export function setUserDot(coord) {
  if (!map || !coord || !Number.isFinite(Number(coord.lat)) || !Number.isFinite(Number(coord.lon))) return;
  const lngLat = [Number(coord.lon), Number(coord.lat)];
  if (userMarker) {
    userMarker.setLngLat(lngLat);
    return userMarker;
  }
  const el = document.createElement("div");
  el.className = "pp-map-marker user-dot";
  el.setAttribute("aria-label", "You are here");
  userMarker = new maplibregl.Marker({ element: el, anchor: "center" }).setLngLat(lngLat).addTo(map);
  return userMarker;
}

export function clearUserDot() {
  if (userMarker) {
    userMarker.remove();
    userMarker = null;
  }
}

export function inStarterPack(lat, lon) {
  return inBounds(lat, lon, BOUNDS);
}

export function onMapClick(handler) {
  if (!map) return () => {};
  const fn = (e) => handler({ lat: e.lngLat.lat, lon: e.lngLat.lng });
  map.on("click", fn);
  return () => map.off("click", fn);
}

function lineGeo(coords) {
  return {
    type: "Feature",
    properties: {},
    geometry: { type: "LineString", coordinates: coords.map((c) => [c.lon, c.lat]) },
  };
}

export function drawRoute(coords, opt = {}) {
  if (!map || !coords || coords.length < 2) return;
  const id = opt.id || "route-line";
  const color = opt.color || "#4EC3F7";
  const width = opt.width || 5;
  const data = { type: "FeatureCollection", features: [lineGeo(coords)] };
  if (map.getSource(id)) {
    map.getSource(id).setData(data);
    return;
  }
  map.addSource(id, { type: "geojson", data });
  map.addLayer({
    id,
    type: "line",
    source: id,
    paint: {
      "line-color": color,
      "line-width": width,
      "line-opacity": 0.95,
      ...(opt.dash ? { "line-dasharray": [1.6, 1.4] } : {}),
    },
    layout: { "line-cap": "round", "line-join": "round" },
  });
  overlayIds.push(id);
}

export function clearOverlays() {
  if (!map) return;
  for (const id of overlayIds.splice(0)) {
    if (map.getLayer(id)) map.removeLayer(id);
    if (map.getSource(id)) map.removeSource(id);
  }
  document.querySelectorAll(".pp-map-marker").forEach((el) => el.remove());
}

const markers = [];

export function clearMarkers() {
  while (markers.length) {
    const m = markers.pop();
    try { m.remove(); } catch { /* ignore */ }
  }
}

export function addPin(coord, { label, kind } = {}) {
  if (!map) return null;
  const el = document.createElement("div");
  el.className = `pp-map-marker pin pin-${kind || "via"}`;
  el.setAttribute("aria-label", label || kind || "pin");
  const cap = document.createElement("span");
  cap.className = "pp-map-marker-label";
  cap.textContent = label || "";
  if (label) el.appendChild(cap);
  const marker = new maplibregl.Marker({ element: el, anchor: "bottom" })
    .setLngLat([coord.lon, coord.lat])
    .addTo(map);
  markers.push(marker);
  return marker;
}

export function addDot(coord, cls = "user-dot") {
  if (!map) return null;
  const el = document.createElement("div");
  el.className = `pp-map-marker ${cls}`;
  const marker = new maplibregl.Marker({ element: el, anchor: "center" })
    .setLngLat([coord.lon, coord.lat])
    .addTo(map);
  markers.push(marker);
  return marker;
}

export function whenReady(fn) {
  if (!map) return;
  if (map.loaded()) fn();
  else map.once("load", fn);
}

export function whenIdle() {
  return new Promise((resolve) => {
    if (!map) { resolve(); return; }
    const done = () => resolve();
    const kick = () => {
      map.resize();
      if (map.loaded()) map.once("idle", done);
      else map.once("load", () => { map.resize(); map.once("idle", done); });
    };
    kick();
    // Don't hang screenshots if tiles stall.
    setTimeout(done, 8000);
  });
}

export { OFM_PARALLEL };
