import { getMap, setCenter, whenIdle } from "./map.js";
import {
  planDownload,
  formatBytes,
  formatStorageLine,
  bboxFromFrame,
  normalizeBbox,
} from "./map_tiles.js";
import {
  downloadArea,
  updateArea,
  listAreas,
  deleteAreaRecord,
  tileCacheBytes,
  deviceStorage,
  observedAvgTileBytes,
} from "./map_offline.js";

const $ = (id) => document.getElementById(id);

let hooks = { showScreen: () => {}, setHideNav: () => {}, onClose: () => {} };
let dragging = null;
let cropOpen = false;
let downloading = false;

export function initMapDownloadUi(opts) {
  hooks = opts || hooks;
  const openAreas = $("btn-map-pack");
  if (openAreas) openAreas.addEventListener("click", () => showMapAreas());
  const areasBack = $("map-areas-back");
  if (areasBack) areasBack.addEventListener("click", () => hooks.showScreen && hooks.goSettings ? hooks.goSettings() : hooks.showScreen("settings"));
  const startCrop = $("btn-map-download-area");
  if (startCrop) startCrop.addEventListener("click", () => openCrop());
  const cancel = $("btn-map-crop-cancel");
  if (cancel) cancel.addEventListener("click", () => closeCrop());
  const go = $("btn-map-crop-download");
  if (go) go.addEventListener("click", () => confirmDownload());
  bindHandles();
  const list = $("map-areas-list");
  if (list) {
    list.addEventListener("click", (ev) => {
      const btn = ev.target.closest("[data-area-action]");
      if (!btn) return;
      const id = btn.getAttribute("data-id");
      const action = btn.getAttribute("data-area-action");
      if (action === "delete") onDelete(id);
      if (action === "update") onUpdate(id);
      if (action === "show") onShow(id);
    });
  }
}

export async function showMapAreas() {
  cropOpen = false;
  closeCropOverlay();
  await renderAreas();
  if (hooks.showScreen) hooks.showScreen("map-areas");
}

export async function renderAreas() {
  const list = $("map-areas-list");
  const usedEl = $("map-areas-used");
  const stor = await deviceStorage();
  let used = 0;
  try { used = await tileCacheBytes(); } catch { used = 0; }
  if (usedEl) {
    const avail = stor.available != null ? ` · ${formatBytes(stor.available)} free` : "";
    usedEl.textContent = `Downloaded map tiles use ${formatBytes(used)} on this device${avail}. The world basemap (zoom 0–6) is already in the app, so zooming out never goes black.`;
  }
  if (!list) return;
  let areas = [];
  try { areas = await listAreas(); } catch { areas = []; }
  const bundled = `
    <div class="map-area-card" data-testid="area-world">
      <div>
        <strong>World basemap</strong>
        <p class="tiny">Bundled, zoom 0–6. Always available offline so zooming out never goes black.</p>
      </div>
    </div>
    <div class="map-area-card" data-testid="area-florence">
      <div>
        <strong>Florence extract</strong>
        <p class="tiny">Optional bundled street-level pack for Florence, used in tests and if you open that city. It is not the default map.</p>
      </div>
    </div>`;
  const rows = areas.map((a) => `
    <div class="map-area-card" data-testid="area-${a.id}">
      <button type="button" class="map-area-main" data-area-action="show" data-id="${esc(a.id)}">
        <strong>${esc(a.name)}</strong>
        <p class="tiny">${formatBytes(a.bytes || 0)} · ${a.tileCount || 0} tiles · detail to zoom ${a.maxZoom}
          ${a.updatedAt ? " · updated " + esc(String(a.updatedAt).slice(0, 10)) : ""}</p>
      </button>
      <div class="map-area-actions">
        <button type="button" class="btn btn-secondary" data-area-action="update" data-id="${esc(a.id)}">Update</button>
        <button type="button" class="btn btn-danger" data-area-action="delete" data-id="${esc(a.id)}">Delete</button>
      </div>
    </div>`).join("");
  list.innerHTML = bundled + (rows || `<p class="tiny" data-testid="map-areas-empty">No extra areas yet. Download a region to use street-level tiles offline.</p>`);
}

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

let cropReturnTo = "map-areas";

export function openCrop(opt = {}) {
  const root = $("map-crop-root");
  if (!root) return;
  cropReturnTo = opt.afterClose || "map-areas";
  if (opt.lat != null && opt.lon != null) setCenter(opt.lat, opt.lon, opt.zoom == null ? 15 : opt.zoom);
  const fitBox = opt.bbox ? normalizeBbox(opt.bbox) : null;
  if (fitBox) {
    const map0 = getMap();
    if (map0 && typeof map0.fitBounds === "function") {
      map0.fitBounds([[fitBox.west, fitBox.south], [fitBox.east, fitBox.north]], { padding: 80, duration: 0, maxZoom: 16 });
      if (typeof map0.resize === "function") map0.resize();
    }
  }
  if (hooks.showScreen) hooks.showScreen("today");
  if (hooks.setHideNav) hooks.setHideNav(true);
  root.hidden = false;
  document.body.classList.add("map-crop-open");
  cropOpen = true;
  if (fitBox) applyFrameToBbox(fitBox);
  else resetFrame();
  setProgress(false);
  refreshEstimate();
  if (fitBox) {
    const again = () => { applyFrameToBbox(fitBox); refreshEstimate(); };
    requestAnimationFrame(again);
    whenIdle().then(again).catch(() => {});
  }
  const map = getMap();
  if (map) {
    map.on("moveend", onMapMoved);
    map.on("zoomend", onMapMoved);
    map.resize();
  }
}

function closeCropOverlay() {
  const root = $("map-crop-root");
  if (root) root.hidden = true;
  document.body.classList.remove("map-crop-open");
  const map = getMap();
  if (map) {
    map.off("moveend", onMapMoved);
    map.off("zoomend", onMapMoved);
  }
  cropOpen = false;
}

export function closeCrop() {
  if (downloading) return;
  closeCropOverlay();
  if (hooks.setHideNav) hooks.setHideNav(false);
  const back = cropReturnTo;
  cropReturnTo = "map-areas";
  if (back === "today") {
    if (hooks.showScreen) hooks.showScreen("today");
    return;
  }
  if (back === "builder") {
    if (hooks.showScreen) hooks.showScreen("builder");
    if (hooks.render) hooks.render();
    return;
  }
  if (hooks.showScreen) hooks.showScreen("map-areas");
  renderAreas();
}

function onMapMoved() {
  if (cropOpen && !dragging) refreshEstimate();
}

function resetFrame() {
  const frame = $("map-crop-frame");
  const stage = $("map-crop-stage");
  if (!frame || !stage) return;
  const r = stage.getBoundingClientRect();
  const w = Math.round(r.width * 0.8);
  const h = Math.round(r.height * 0.48);
  const left = Math.round((r.width - w) / 2);
  const top = Math.round(r.height * 0.16);
  frame.style.left = left + "px";
  frame.style.top = top + "px";
  frame.style.width = w + "px";
  frame.style.height = h + "px";
}

/** Size the crop frame to a geographic bbox after the map has been fitted. */
export function applyFrameToBbox(bbox) {
  const map = getMap();
  const frame = $("map-crop-frame");
  const stage = $("map-crop-stage");
  if (!map || !frame || !stage || !bbox) return;
  const box = normalizeBbox(bbox);
  const sr = stage.getBoundingClientRect();
  const mr = map.getCanvas().getBoundingClientRect();
  const sw = map.project([box.west, box.south]);
  const ne = map.project([box.east, box.north]);
  let left = (mr.left - sr.left) + Math.min(sw.x, ne.x);
  let top = (mr.top - sr.top) + Math.min(sw.y, ne.y);
  let width = Math.abs(ne.x - sw.x);
  let height = Math.abs(ne.y - sw.y);
  const minW = 80, minH = 80;
  if (width < minW) {
    left -= (minW - width) / 2;
    width = minW;
  }
  if (height < minH) {
    top -= (minH - height) / 2;
    height = minH;
  }
  left = Math.max(8, Math.min(left, sr.width - 16));
  top = Math.max(8, Math.min(top, sr.height - 16));
  width = Math.max(minW, Math.min(width, sr.width - left - 8));
  height = Math.max(minH, Math.min(height, sr.height - top - 8));
  frame.style.left = Math.round(left) + "px";
  frame.style.top = Math.round(top) + "px";
  frame.style.width = Math.round(width) + "px";
  frame.style.height = Math.round(height) + "px";
}

function currentBbox() {
  return bboxFromFrame(getMap(), $("map-crop-frame"));
}

async function refreshEstimate() {
  const el = $("map-crop-estimate");
  const storEl = $("map-crop-storage");
  const btn = $("btn-map-crop-download");
  const bbox = currentBbox();
  if (!bbox) return;
  let avg = 80 * 1024;
  try { avg = await observedAvgTileBytes(); } catch { /* default */ }
  const p = planDownload(bbox, { avgBytes: avg });
  if (el) {
    if (p.tooLarge) {
      el.textContent = "This area is too large to download at once (OpenFreeMap allows 3,000 tiles or 50 MB per download). Pinch in or shrink the frame.";
    } else {
      el.textContent = `About ${formatBytes(p.estimateBytes)} · ${p.tileCount.toLocaleString()} tiles · street detail to zoom ${p.maxZoom}.`;
    }
  }
  if (storEl) {
    try {
      const stor = await deviceStorage();
      storEl.textContent = formatStorageLine(p.estimateBytes, stor.available);
    } catch {
      storEl.textContent = `About ${formatBytes(p.estimateBytes)} to download.`;
    }
  }
  if (btn) btn.disabled = !!(p.tooLarge || downloading);
}

function setProgress(on, frac = 0, label = "") {
  const wrap = $("map-crop-progress");
  const bar = $("map-crop-progress-bar");
  const text = $("map-crop-progress-label");
  if (!wrap) return;
  wrap.hidden = !on;
  if (bar) bar.style.width = Math.round(Math.max(0, Math.min(1, frac)) * 100) + "%";
  if (text) text.textContent = label;
}

async function confirmDownload() {
  if (downloading) return;
  const bbox = currentBbox();
  if (!bbox) return;
  downloading = true;
  const btn = $("btn-map-crop-download");
  if (btn) btn.disabled = true;
  setProgress(true, 0, "Starting download…");
  try {
    const res = await downloadArea(bbox, {
      onProgress: ({ done, total, bytes }) => {
        setProgress(true, total ? done / total : 0, `Downloading ${done} of ${total} tiles · ${formatBytes(bytes)}`);
      },
    });
    if (!res.ok) {
      setProgress(true, 0, "Could not download this area. Shrink the frame and try again.");
      downloading = false;
      if (btn) btn.disabled = false;
      return;
    }
    setProgress(true, 1, `Saved ${res.area.name} (${formatBytes(res.area.bytes)}).`);
    downloading = false;
    closeCrop();
  } catch (err) {
    console.warn("download area", err);
    setProgress(true, 0, "Download failed. Check the connection and try again.");
    downloading = false;
    if (btn) btn.disabled = false;
  }
}

async function onDelete(id) {
  if (!id) return;
  if (!window.confirm("Delete this downloaded area from the phone?")) return;
  await deleteAreaRecord(id);
  await renderAreas();
}

async function onUpdate(id) {
  const areas = await listAreas();
  const area = areas.find((a) => a.id === id);
  if (!area) return;
  setProgress(false);
  openCrop();
  // Jump the map to the saved bbox and start an update immediately after layout
  const map = getMap();
  if (map) {
    map.fitBounds([[area.west, area.south], [area.east, area.north]], { padding: 40, duration: 0 });
  }
  downloading = true;
  setProgress(true, 0, "Updating…");
  try {
    const res = await updateArea(area, ({ done, total, bytes }) => {
      setProgress(true, total ? done / total : 0, `Updating ${done} of ${total} tiles · ${formatBytes(bytes)}`);
    });
    downloading = false;
    closeCrop();
    if (!res.ok) await renderAreas();
  } catch (err) {
    console.warn("update area", err);
    downloading = false;
    setProgress(true, 0, "Update failed.");
  }
}

function onShow(id) {
  listAreas().then((areas) => {
    const area = areas.find((a) => a.id === id);
    if (!area) return;
    if (hooks.showScreen) hooks.showScreen("today");
    const map = getMap();
    if (map) map.fitBounds([[area.west, area.south], [area.east, area.north]], { padding: 60, duration: 0 });
  });
}

function bindHandles() {
  const frame = $("map-crop-frame");
  const stage = $("map-crop-stage");
  if (!frame || !stage) return;
  stage.addEventListener("pointerdown", (ev) => {
    const handle = ev.target.closest("[data-handle]");
    if (!handle || !cropOpen) return;
    ev.preventDefault();
    ev.stopPropagation();
    const kind = handle.getAttribute("data-handle");
    const fr = frame.getBoundingClientRect();
    const st = stage.getBoundingClientRect();
    dragging = {
      kind,
      startX: ev.clientX,
      startY: ev.clientY,
      left: fr.left - st.left,
      top: fr.top - st.top,
      width: fr.width,
      height: fr.height,
      id: ev.pointerId,
    };
    try { handle.setPointerCapture(ev.pointerId); } catch { /* ignore */ }
    const map = getMap();
    if (map) map.dragPan.disable();
  });
  stage.addEventListener("pointermove", (ev) => {
    if (!dragging) return;
    ev.preventDefault();
    const st = stage.getBoundingClientRect();
    const dx = ev.clientX - dragging.startX;
    const dy = ev.clientY - dragging.startY;
    let { left, top, width, height } = dragging;
    const kind = dragging.kind;
    if (kind.includes("w")) { left += dx; width -= dx; }
    if (kind.includes("e")) { width += dx; }
    if (kind.includes("n")) { top += dy; height -= dy; }
    if (kind.includes("s")) { height += dy; }
    const min = 96;
    if (width < min) {
      if (kind.includes("w")) left = dragging.left + dragging.width - min;
      width = min;
    }
    if (height < min) {
      if (kind.includes("n")) top = dragging.top + dragging.height - min;
      height = min;
    }
    left = Math.max(8, Math.min(left, st.width - width - 8));
    top = Math.max(8, Math.min(top, st.height - height - 8));
    frame.style.left = left + "px";
    frame.style.top = top + "px";
    frame.style.width = width + "px";
    frame.style.height = height + "px";
  });
  const end = (ev) => {
    if (!dragging) return;
    dragging = null;
    const map = getMap();
    if (map) map.dragPan.enable();
    refreshEstimate();
  };
  stage.addEventListener("pointerup", end);
  stage.addEventListener("pointercancel", end);
}

export function isCropOpen() {
  return cropOpen;
}

export { whenIdle };
