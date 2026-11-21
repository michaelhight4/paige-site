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
import { geodesicDirect } from "./util.js";

let map = null;
let protocolAdded = false;
let ofmProtocolAdded = false;
let naipProtocolAdded = false;
const overlayIds = [];

/** Global fallback: EOX 2016 cloudless Sentinel-2, CC BY 4.0, keyless, max native zoom 14. */
export const EOX_ATTRIBUTION =
  'EOxCloudless <a href="https://cloudless.eox.at">cloudless.eox.at</a> by EOX IT Services GmbH (Contains modified Copernicus Sentinel data 2016)';
export const EOX_TILES =
  "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless_3857/default/g/{z}/{y}/{x}.jpg";
export const EOX_MAXZOOM = 14;

/** Public-domain USGS/NAIP orthoimagery for the United States (requested credit). */
export const USGS_ATTRIBUTION =
  'Map services and data available from <a href="https://www.usgs.gov/">U.S. Geological Survey</a>, National Geospatial Program (NAIP / USDA orthoimagery, public domain)';
export const USGS_TILES =
  "https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/{z}/{y}/{x}";
export const USGS_MAXZOOM = 16;
// CONUS + Hawaii + Puerto Rico + USVI. Excludes Alaska: the same USGSImageryOnly
// service serves 10 m SPOT there, which is licence-restricted.
export const USGS_BOUNDS = [-161.0, 17.6, -64.5, 49.4];
export const NAIP_MAXZOOM = 18;
export const MERCATOR_ORIGIN = 20037508.342789244;

export const SATELLITE_ATTRIBUTION = USGS_ATTRIBUTION + ". Outside the United States: " + EOX_ATTRIBUTION;
// Kept as aliases so older copy still points at the global fallback.
export const SATELLITE_TILES = EOX_TILES;
export const SATELLITE_MAXZOOM = EOX_MAXZOOM;

const SAT_RASTER_LAYERS = ["s2-sat", "usgs-sat", "naip-sat"];
const SAT_HYBRID_LAYERS = [
  "hy-world-roads-casing", "hy-world-roads",
  "hy-fi-roads-casing", "hy-fi-roads",
  "hy-ofm-roads-minor-casing", "hy-ofm-roads-minor",
  "hy-ofm-roads-major-casing", "hy-ofm-roads-major",
  "hy-ofm-road-labels", "hy-ofm-places",
  "hy-fi-road-labels", "hy-fi-places",
];
const SAT_HIDE_WHEN_ON = [
  "world-earth", "world-landuse", "world-landcover", "world-water", "world-water-line", "world-buildings",
  "world-roads-minor", "world-roads-major",
  "fi-earth", "fi-landuse", "fi-landcover", "fi-water", "fi-water-line", "fi-buildings",
  "fi-roads-minor", "fi-roads-major",
  "ofm-landcover", "ofm-landuse", "ofm-park", "ofm-water", "ofm-waterway", "ofm-building",
  "ofm-roads-minor", "ofm-roads-major",
];

let mapStyle = "map";

export function getMapStyle() {
  return mapStyle;
}

function tileBBox3857(z, x, y) {
  const n = 2 ** z;
  const res = (2 * MERCATOR_ORIGIN) / n;
  const xmin = -MERCATOR_ORIGIN + x * res;
  const ymax = MERCATOR_ORIGIN - y * res;
  return [xmin, ymax - res, xmin + res, ymax];
}

function ensureNaipProtocol() {
  if (naipProtocolAdded) return;
  maplibregl.addProtocol("usgs-naip", async (params, abortController) => {
    const m = String(params.url || "").match(/usgs-naip:\/\/(\d+)\/(\d+)\/(\d+)/);
    if (!m) return { data: new ArrayBuffer(0) };
    const z = Number(m[1]);
    const x = Number(m[2]);
    const y = Number(m[3]);
    const [xmin, ymin, xmax, ymax] = tileBBox3857(z, x, y);
    const url = "https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer/exportImage"
      + "?bbox=" + [xmin, ymin, xmax, ymax].join(",")
      + "&bboxSR=3857&imageSR=3857&size=256,256&format=jpg&f=image";
    const signal = abortController && abortController.signal;
    const res = await fetch(url, { signal });
    if (!res.ok) return { data: new ArrayBuffer(0) };
    return { data: await res.arrayBuffer() };
  });
  naipProtocolAdded = true;
}

function addLayerOnce(layer, beforeId) {
  if (!map || map.getLayer(layer.id)) return;
  const before = beforeId && map.getLayer(beforeId) ? beforeId : undefined;
  if (before) map.addLayer(layer, before);
  else map.addLayer(layer);
}

function firstDrawnOverlay() {
  for (const id of overlayIds) {
    if (map && map.getLayer(id)) return id;
  }
  if (map && map.getLayer("user-accuracy-fill")) return "user-accuracy-fill";
  return undefined;
}

function hybridRoadLayers(source, prefix, sourceLayer, filter, minzoom) {
  const mz = minzoom == null ? {} : { minzoom };
  const flt = filter ? { filter } : {};
  const width = ["interpolate", ["linear"], ["zoom"], 12, 0.8, 16, 2.4, 18, 3.4];
  const casing = ["interpolate", ["linear"], ["zoom"], 12, 1.6, 16, 3.6, 18, 5];
  return [
    {
      id: prefix + "casing",
      type: "line",
      source,
      "source-layer": sourceLayer,
      ...mz,
      ...flt,
      layout: { visibility: "none", "line-cap": "round", "line-join": "round" },
      paint: { "line-color": "rgba(18,22,28,0.62)", "line-width": casing },
    },
    {
      id: prefix,
      type: "line",
      source,
      "source-layer": sourceLayer,
      ...mz,
      ...flt,
      layout: { visibility: "none", "line-cap": "round", "line-join": "round" },
      paint: { "line-color": "#f4f1e6", "line-width": width, "line-opacity": 0.92 },
    },
  ];
}

function ensureSatelliteLayer() {
  if (!map) return;
  ensureNaipProtocol();
  if (!map.getSource("s2cloudless")) {
    map.addSource("s2cloudless", {
      type: "raster",
      tiles: [EOX_TILES],
      tileSize: 256,
      maxzoom: EOX_MAXZOOM,
      attribution: "",
    });
  }
  if (!map.getSource("usgs-imagery")) {
    map.addSource("usgs-imagery", {
      type: "raster",
      tiles: [USGS_TILES],
      tileSize: 256,
      maxzoom: USGS_MAXZOOM,
      bounds: USGS_BOUNDS,
      attribution: "",
    });
  }
  if (!map.getSource("usgs-naip")) {
    map.addSource("usgs-naip", {
      type: "raster",
      tiles: ["usgs-naip://{z}/{x}/{y}"],
      tileSize: 256,
      minzoom: 17,
      maxzoom: NAIP_MAXZOOM,
      bounds: USGS_BOUNDS,
      attribution: "",
    });
  }
  const under = "world-earth";
  addLayerOnce({
    id: "s2-sat",
    type: "raster",
    source: "s2cloudless",
    maxzoom: 22,
    layout: { visibility: "none" },
    paint: { "raster-opacity": 1, "raster-fade-duration": 0 },
  }, under);
  addLayerOnce({
    id: "usgs-sat",
    type: "raster",
    source: "usgs-imagery",
    maxzoom: 22,
    layout: { visibility: "none" },
    paint: { "raster-opacity": 1, "raster-fade-duration": 0 },
  }, under);
  addLayerOnce({
    id: "naip-sat",
    type: "raster",
    source: "usgs-naip",
    minzoom: 17,
    maxzoom: 22,
    layout: { visibility: "none" },
    paint: { "raster-opacity": 1, "raster-fade-duration": 0 },
  }, under);

  const beforeHybrid = firstDrawnOverlay();
  const ofmMinor = ["in", ["get", "class"], ["literal", ["minor", "service", "path", "track", "tertiary", "busway"]]];
  const ofmMajor = ["in", ["get", "class"], ["literal", ["motorway", "trunk", "primary", "secondary"]]];
  for (const layer of [
    ...hybridRoadLayers("world", "hy-world-roads", "roads"),
    ...hybridRoadLayers("firenze", "hy-fi-roads", "roads"),
    ...hybridRoadLayers("ofm", "hy-ofm-roads-minor", "transportation", ofmMinor, 6),
    ...hybridRoadLayers("ofm", "hy-ofm-roads-major", "transportation", ofmMajor, 6),
    {
      id: "hy-ofm-road-labels",
      type: "symbol",
      source: "ofm",
      "source-layer": "transportation_name",
      minzoom: 12,
      layout: {
        visibility: "none",
        "symbol-placement": "line",
        "text-field": ["coalesce", ["get", "name"], ["get", "ref"]],
        "text-font": ["Noto Sans Regular"],
        "text-size": ["interpolate", ["linear"], ["zoom"], 12, 10, 16, 13, 18, 15],
        "text-max-angle": 35,
        "text-optional": true,
      },
      paint: {
        "text-color": "#ffffff",
        "text-halo-color": "rgba(18,22,28,0.86)",
        "text-halo-width": 1.4,
      },
    },
    {
      id: "hy-ofm-places",
      type: "symbol",
      source: "ofm",
      "source-layer": "place",
      minzoom: 9,
      layout: {
        visibility: "none",
        "text-field": ["get", "name"],
        "text-font": ["Noto Sans Bold"],
        "text-size": ["interpolate", ["linear"], ["zoom"], 9, 11, 14, 15, 16, 17],
        "text-optional": true,
        "text-padding": 4,
      },
      paint: {
        "text-color": "#ffffff",
        "text-halo-color": "rgba(18,22,28,0.86)",
        "text-halo-width": 1.5,
      },
    },
    {
      id: "hy-fi-road-labels",
      type: "symbol",
      source: "firenze",
      "source-layer": "roads",
      minzoom: 13,
      layout: {
        visibility: "none",
        "symbol-placement": "line",
        "text-field": ["get", "name"],
        "text-font": ["Noto Sans Regular"],
        "text-size": 12,
        "text-optional": true,
      },
      paint: {
        "text-color": "#ffffff",
        "text-halo-color": "rgba(18,22,28,0.86)",
        "text-halo-width": 1.4,
      },
    },
    {
      id: "hy-fi-places",
      type: "symbol",
      source: "firenze",
      "source-layer": "places",
      minzoom: 11,
      layout: {
        visibility: "none",
        "text-field": ["get", "name"],
        "text-font": ["Noto Sans Bold"],
        "text-size": 13,
        "text-optional": true,
      },
      paint: {
        "text-color": "#ffffff",
        "text-halo-color": "rgba(18,22,28,0.86)",
        "text-halo-width": 1.5,
      },
    },
  ]) {
    addLayerOnce(layer, beforeHybrid);
  }
}

function refreshAttribution() {
  if (!map || !map._controls) return;
  for (const c of map._controls) {
    if (c && typeof c._updateAttributions === "function") {
      try { c._updateAttributions(); } catch { /* ignore */ }
    }
  }
}

/** Switch between the vector map and online satellite (USGS/NAIP in the US, EOX elsewhere) plus a roads/labels hybrid overlay. */
export function setMapStyle(style, { online = true } = {}) {
  const want = style === "satellite" ? "satellite" : "map";
  mapStyle = want;
  if (!map) return { ok: true, style: mapStyle, online, needsSignal: want === "satellite" && !online };
  try {
    ensureSatelliteLayer();
    const sat = want === "satellite";
    const visSat = sat ? "visible" : "none";
    const visMap = sat ? "none" : "visible";
    for (const id of SAT_RASTER_LAYERS) {
      if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", visSat);
    }
    for (const id of SAT_HYBRID_LAYERS) {
      if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", visSat);
    }
    for (const id of SAT_HIDE_WHEN_ON) {
      if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", visMap);
    }
    const credit = sat ? SATELLITE_ATTRIBUTION : "";
    for (const sid of ["s2cloudless", "usgs-imagery", "usgs-naip"]) {
      const src = map.getSource(sid);
      if (src) src.attribution = sid === "usgs-imagery" ? credit : (sat && sid === "s2cloudless" ? "" : "");
    }
    const usgs = map.getSource("usgs-imagery");
    if (usgs) usgs.attribution = credit;
    refreshAttribution();
    flashAttribution(3500);
  } catch (err) {
    console.warn("map style", err && err.message ? err.message : err);
  }
  return { ok: true, style: mapStyle, online, needsSignal: want === "satellite" && !online };
}


const BOUNDS = FLORENCE_BOUNDS;
const ATTRIBUTION =
  '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors · <a href="https://protomaps.com">Protomaps</a> · <a href="https://openfreemap.org/">OpenFreeMap</a> © <a href="https://openmaptiles.org/">OpenMapTiles</a>';
export const SEARCH_ATTRIBUTION =
  'Place search uses <a href="https://photon.komoot.io/">Photon</a> and <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>.';
export const ROAD_ATTRIBUTION = 'Roads © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

let attribTimer = null;
let attribBound = false;

function attribEl() {
  return map && map.getContainer ? map.getContainer().querySelector(".maplibregl-ctrl-attrib") : document.querySelector(".maplibregl-ctrl-attrib");
}

function bindAttribToggle() {
  const el = attribEl();
  if (!el || attribBound) return;
  attribBound = true;
  el.addEventListener("click", () => {
    if (attribTimer) {
      clearTimeout(attribTimer);
      attribTimer = null;
    }
  });
}

function skipAttribFlash() {
  try {
    if (typeof location === "undefined") return false;
    const q = new URLSearchParams(location.search);
    return q.has("demo") || q.has("screen") || q.has("empty");
  } catch {
    return false;
  }
}

/** Keep the compact attribution open (no auto-close). Licence credits stay reachable via ⓘ. */
export function showAttribution() {
  const el = attribEl();
  if (!el) return;
  bindAttribToggle();
  if (attribTimer) {
    clearTimeout(attribTimer);
    attribTimer = null;
  }
  el.classList.add("maplibregl-compact");
  el.classList.add("maplibregl-compact-show");
}

/** Collapse attribution to the compact ⓘ button. */
export function collapseAttribution() {
  if (attribTimer) {
    clearTimeout(attribTimer);
    attribTimer = null;
  }
  const el = attribEl();
  if (!el) return;
  el.classList.add("maplibregl-compact");
  el.classList.remove("maplibregl-compact-show");
}

/** Open the compact attribution popup briefly, then collapse to ⓘ. Always reachable. */
export function flashAttribution(ms = 3500, { force = false } = {}) {
  if (!force && skipAttribFlash()) {
    collapseAttribution();
    return;
  }
  const el = attribEl();
  if (!el) return;
  bindAttribToggle();
  el.classList.add("maplibregl-compact");
  el.classList.add("maplibregl-compact-show");
  if (attribTimer) clearTimeout(attribTimer);
  attribTimer = setTimeout(() => {
    attribTimer = null;
    if (el.contains(document.activeElement)) return;
    el.classList.remove("maplibregl-compact-show");
  }, Math.max(2500, Number(ms) || 3500));
}

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
    glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
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
    attributionControl: { compact: true, customAttribution: SEARCH_ATTRIBUTION },
    maxPitch: 0,
    pitchWithRotate: false,
    preserveDrawingBuffer: true, // so headless screenshots capture the WebGL canvas
    fadeDuration: 0,
  });
  map.on("load", () => {
    map.resize();
    if (opt.mapStyle) setMapStyle(opt.mapStyle, { online: typeof navigator === "undefined" || navigator.onLine !== false });
    bindAttribToggle();
    flashAttribution(3500);
  });
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
  const maxZoom = (pad && typeof pad === "object" && pad.maxZoom) || 16;
  const padding = (pad && typeof pad === "object")
    ? { top: pad.top ?? 60, bottom: pad.bottom ?? 60, left: pad.left ?? 60, right: pad.right ?? 60 }
    : pad;
  map.fitBounds(b, { padding, maxZoom, duration: 0 });
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

function accuracyFeature(coord) {
  const acc = Number(coord && coord.accuracy);
  if (!(acc > 2) || !coord) return { type: "FeatureCollection", features: [] };
  const ring = [];
  for (let i = 0; i <= 36; i++) {
    const p = geodesicDirect(coord, i * 10, acc);
    if (p) ring.push([p.lon, p.lat]);
  }
  if (ring.length < 4) return { type: "FeatureCollection", features: [] };
  return {
    type: "FeatureCollection",
    features: [{ type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [ring] } }],
  };
}

function ensureUserAccuracyLayer() {
  if (!map) return;
  if (!map.getSource("user-accuracy")) {
    map.addSource("user-accuracy", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
  }
  if (!map.getLayer("user-accuracy-fill")) {
    map.addLayer({
      id: "user-accuracy-fill",
      type: "fill",
      source: "user-accuracy",
      paint: { "fill-color": "#4EC3F7", "fill-opacity": 0.18 },
    });
  }
  if (!map.getLayer("user-accuracy-line")) {
    map.addLayer({
      id: "user-accuracy-line",
      type: "line",
      source: "user-accuracy",
      paint: { "line-color": "#4EC3F7", "line-opacity": 0.45, "line-width": 1 },
    });
  }
}

function paintUserDotChrome(coord) {
  if (!userMarker) return;
  const el = userMarker.getElement();
  if (!el) return;
  const heading = Number(coord && coord.heading);
  if (Number.isFinite(heading) && heading >= 0) {
    el.classList.add("has-heading");
    el.style.setProperty("--user-heading", `${heading}deg`);
  } else {
    el.classList.remove("has-heading");
    el.style.removeProperty("--user-heading");
  }
  ensureUserAccuracyLayer();
  const src = map.getSource("user-accuracy");
  if (src) src.setData(accuracyFeature(coord));
}

export function setUserDot(coord) {
  if (!map || !coord || !Number.isFinite(Number(coord.lat)) || !Number.isFinite(Number(coord.lon))) return;
  const lngLat = [Number(coord.lon), Number(coord.lat)];
  if (userMarker) {
    userMarker.setLngLat(lngLat);
    paintUserDotChrome(coord);
    return userMarker;
  }
  const el = document.createElement("div");
  el.className = "pp-map-marker user-dot";
  el.setAttribute("aria-label", "You are here");
  const rot = document.createElement("span");
  rot.className = "user-heading-rot";
  const ptr = document.createElement("i");
  ptr.className = "user-heading";
  rot.appendChild(ptr);
  el.appendChild(rot);
  userMarker = new maplibregl.Marker({ element: el, anchor: "center" }).setLngLat(lngLat).addTo(map);
  paintUserDotChrome(coord);
  return userMarker;
}

export function clearUserDot() {
  if (userMarker) {
    userMarker.remove();
    userMarker = null;
  }
  if (map && map.getSource("user-accuracy")) {
    try { map.getSource("user-accuracy").setData({ type: "FeatureCollection", features: [] }); } catch { /* ignore */ }
  }
}

export function inStarterPack(lat, lon) {
  return inBounds(lat, lon, BOUNDS);
}

export function onMapClick(handler) {
  if (!map) return () => {};
  const fn = (e) => {
    const t = e.originalEvent && e.originalEvent.target;
    if (t && typeof t.closest === "function" && t.closest(".pp-map-marker")) return;
    handler({ lat: e.lngLat.lat, lon: e.lngLat.lng });
  };
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
  document.querySelectorAll(".pp-map-marker:not(.user-dot)").forEach((el) => el.remove());
  clearLegLabels();
}

const markers = [];

export function clearMarkers() {
  while (markers.length) {
    const m = markers.pop();
    try { m.remove(); } catch { /* ignore */ }
  }
  clearLegLabels();
}

const legLabelMarkers = [];

export function clearLegLabels() {
  while (legLabelMarkers.length) {
    const m = legLabelMarkers.pop();
    try { m.remove(); } catch { /* ignore */ }
  }
}

/** A small distance chip at a point along a builder leg. */
export function addLegLabel(coord, text, { muted = false } = {}) {
  if (!map || !coord || !text) return null;
  const el = document.createElement("div");
  el.className = "pp-leg-label" + (muted ? " muted" : "");
  el.textContent = String(text);
  const marker = new maplibregl.Marker({ element: el, anchor: "center", pitchAlignment: "viewport" })
    .setLngLat([Number(coord.lon), Number(coord.lat)])
    .addTo(map);
  legLabelMarkers.push(marker);
  return marker;
}

export function addPin(coord, { label, kind, onClick } = {}) {
  if (!map) return null;
  const el = document.createElement("div");
  el.className = `pp-map-marker pin pin-${kind || "via"}`;
  el.setAttribute("aria-label", label || kind || "pin");
  const cap = document.createElement("span");
  cap.className = "pp-map-marker-label";
  cap.textContent = label || "";
  if (label) el.appendChild(cap);
  if (onClick) {
    el.style.cursor = "pointer";
    el.addEventListener("click", (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      onClick(ev);
    });
  }
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
