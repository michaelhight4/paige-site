import maplibregl from "maplibre-gl";
import { Protocol, PMTiles } from "pmtiles";
import { getPack, savePack } from "./map_storage.js";

let map = null;
let protocolAdded = false;
const overlayIds = [];

const FLORENCE = { lon: 11.2543435, lat: 43.7672134, zoom: 14 };
const BOUNDS = [11.221144, 43.745121, 11.287543, 43.789306];

export function defaultCenter() {
  return { ...FLORENCE };
}

function packUrl() {
  return new URL("maps/firenze.pmtiles", window.location.href).href;
}

/** Load the bundled PMTiles file into memory so we don't need HTTP range requests
 *  (the overlap-check static server and Capacitor WebView are both picky about Byte Serving). */
export async function persistStarterPack() {
  const url = packUrl();
  const buf = await fetch(url).then((r) => {
    if (!r.ok) throw new Error("map pack missing: " + r.status);
    return r.arrayBuffer();
  });
  return savePack("firenze", buf, { name: "Florence starter" });
}

async function loadLocalPack() {
  let buf = await getPack("firenze");
  if (!buf) {
    const url = packUrl();
    buf = await fetch(url).then((r) => {
      if (!r.ok) throw new Error("map pack missing: " + r.status);
      return r.arrayBuffer();
    });
  }
  const source = {
    getKey: () => "firenze",
    async getBytes(offset, length) {
      return { data: buf.slice(offset, offset + length) };
    },
  };
  return new PMTiles(source);
}

let protocol = null;

function darkStyle(pmtilesUrl) {
  const src = "offlinemap";
  return {
    version: 8,
    name: "Heldpath Dark",
    sources: {
      [src]: {
        type: "vector",
        url: "pmtiles://" + pmtilesUrl,
        attribution:
          '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      },
    },
    layers: [
      { id: "bg", type: "background", paint: { "background-color": "#12161C" } },
      { id: "earth", type: "fill", source: src, "source-layer": "earth", paint: { "fill-color": "#1A1F28" } },
      { id: "landuse", type: "fill", source: src, "source-layer": "landuse", paint: { "fill-color": "#1B2520", "fill-opacity": 0.7 } },
      { id: "landcover", type: "fill", source: src, "source-layer": "landcover", paint: { "fill-color": "#1C2A24", "fill-opacity": 0.65 } },
      { id: "water", type: "fill", source: src, "source-layer": "water", paint: { "fill-color": "#1A3554" } },
      { id: "water-line", type: "line", source: src, "source-layer": "physical_line", paint: { "line-color": "#2A5A80", "line-width": 1.2 } },
      { id: "buildings", type: "fill", source: src, "source-layer": "buildings", paint: { "fill-color": "#2A313C", "fill-opacity": 0.9 } },
      {
        id: "roads-minor",
        type: "line",
        source: src,
        "source-layer": "roads",
        filter: ["!=", ["get", "pmap:kind"], "major_road"],
        paint: { "line-color": "#3A4554", "line-width": ["interpolate", ["linear"], ["zoom"], 12, 0.6, 16, 2] },
      },
      {
        id: "roads-major",
        type: "line",
        source: src,
        "source-layer": "roads",
        filter: ["in", ["get", "pmap:kind"], ["literal", ["major_road", "highway"]]],
        paint: { "line-color": "#5A7A90", "line-width": ["interpolate", ["linear"], ["zoom"], 11, 1.2, 16, 3.4] },
      },
    ],
  };
}

export async function initMap(container) {
  if (map) {
    map.resize();
    return map;
  }
  if (!protocolAdded) {
    protocol = new Protocol();
    maplibregl.addProtocol("pmtiles", protocol.tile);
    protocolAdded = true;
  }
  try {
    const pack = await loadLocalPack();
    protocol.add(pack);
  } catch (err) {
    console.warn("map pack load failed", err && err.message ? err.message : err);
  }
  const style = darkStyle("firenze");
  map = new maplibregl.Map({
    container,
    style,
    center: [FLORENCE.lon, FLORENCE.lat],
    zoom: FLORENCE.zoom,
    attributionControl: { compact: true },
    maxPitch: 0,
    pitchWithRotate: false,
    preserveDrawingBuffer: true, // so headless screenshots capture the WebGL canvas
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

export function inStarterPack(lat, lon) {
  return lon >= BOUNDS[0] && lat >= BOUNDS[1] && lon <= BOUNDS[2] && lat <= BOUNDS[3];
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
    paint: { "line-color": color, "line-width": width, "line-opacity": 0.95 },
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
