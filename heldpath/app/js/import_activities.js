/**
 * Universal on-device activity import.
 *
 * Accepts .gpx, .tcx, .fit, .fit.gz and zips from any tracker the user can
 * export from. Everything is parsed on the phone: no account, no backend,
 * no third-party API. Zip/gzip uses fflate (already a Heldpath dependency,
 * MIT). GPX and TCX are XML and use the platform DOMParser in the app, with a
 * small tested fallback so the same code runs in Node unit tests. FIT uses
 * fit-file-parser (MIT) with @garmin/fitsdk deliberately excluded.
 *
 * Dedupe is shared with the existing watch/health import: healthId first,
 * then a sha-256 of the raw payload, then a same-sport near match. A richer
 * file (a FIT with a full track) wins over a thin Health Connect copy without
 * deleting the other copy's ids.
 */
import { gunzipSync, unzipSync } from "fflate";
import FitParserModule from "fit-file-parser";

// CJS/ESM interop: esbuild gives the class, Node gives { default: class }.
const FitParser = FitParserModule && FitParserModule.default ? FitParserModule.default : FitParserModule;
import { pathLengthMeters, uid } from "./util.js";

export const IMPORT_ACCEPT = ".gpx,.tcx,.fit,.gz,.zip";
export const IMPORT_MAX_BYTES = 100 * 1024 * 1024;
export const IMPORT_MAX_FILES = 2000;
export const IMPORT_NEAR_START_SEC = 60;
export const IMPORT_NEAR_DISTANCE_FRACTION = 0.02;
export const IMPORT_NEAR_DISTANCE_MIN_M = 30;

const XML_MIME = "application/xml";
const GEO_KEYS = ["lat", "latitude", "position_lat"];
const LON_KEYS = ["lon", "lng", "longitude", "position_long"];

export function toBytes(input) {
  if (input == null) return new Uint8Array();
  if (input instanceof Uint8Array) return input;
  if (input instanceof ArrayBuffer) return new Uint8Array(input);
  if (ArrayBuffer.isView(input)) return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  if (typeof input === "string") return new TextEncoder().encode(input);
  return new Uint8Array();
}

export function toArrayBuffer(bytes) {
  const src = toBytes(bytes);
  const copy = new Uint8Array(src.length);
  copy.set(src);
  return copy.buffer;
}

export async function sha256Hex(input) {
  const bytes = toBytes(input);
  if (!globalThis.crypto || !globalThis.crypto.subtle) {
    // Deterministic fallback for old webviews. Dedupe still works; it is just
    // not a cryptographic digest. The app path always has subtle crypto.
    let h = 0x811c9dc5;
    for (let i = 0; i < bytes.length; i++) {
      h ^= bytes[i];
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return `fnv1a-${h.toString(16).padStart(8, "0")}-${bytes.length}`;
  }
  const digest = await globalThis.crypto.subtle.digest("SHA-256", toArrayBuffer(bytes));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function extensionOf(name) {
  return String(name || "").toLowerCase().split(/[?#]/)[0].split(".").pop() || "";
}

export function formatFromName(name) {
  const lower = String(name || "").toLowerCase();
  if (lower.endsWith(".gpx")) return "gpx";
  if (lower.endsWith(".tcx")) return "tcx";
  if (lower.endsWith(".fit.gz") || lower.endsWith(".fit")) return "fit";
  if (lower.endsWith(".zip")) return "zip";
  return null;
}

export function sportToType(raw) {
  const s = String(raw || "").toLowerCase();
  if (!s) return null;
  if (/(^|[^a-z])(run|running|trailrun|trail_running|treadmill|track)([^a-z]|$)/.test(s)) return "run";
  if (/(^|[^a-z])(ride|bike|biking|cycling|cycle|ebike|e-bike|e_biking|bicycle|mountainbike|mountain_biking)([^a-z]|$)/.test(s)) return "ride";
  if (/(^|[^a-z])(walk|walking|hike|hiking|step|steps)([^a-z]|$)/.test(s)) return "walk";
  return null;
}

function normalizeType(type) {
  return type === "run" || type === "ride" || type === "walk" ? type : null;
}

function parseDate(value) {
  if (!value) return null;
  if (value instanceof Date && Number.isFinite(value.getTime())) return value;
  const d = new Date(value);
  return Number.isFinite(d.getTime()) ? d : null;
}

function round(n, places = 6) {
  const f = 10 ** places;
  return Math.round(Number(n) * f) / f;
}

function gainLossFromTrack(track) {
  let gain = 0;
  let loss = 0;
  let prev = null;
  for (const p of track) {
    if (!Number.isFinite(p.ele)) continue;
    if (prev != null) {
      const d = p.ele - prev;
      if (d > 0) gain += d;
      else loss -= d;
    }
    prev = p.ele;
  }
  return { climbGainM: Math.round(gain), climbLossM: Math.round(loss) };
}

/* ——— XML ——— */

function xmlNode(tag, attrs) {
  return {
    nodeName: tag,
    localName: tag.split(":").pop(),
    attrs: attrs || {},
    children: [],
    text: "",
    getAttribute(name) {
      if (this.attrs[name] != null) return String(this.attrs[name]);
      const lname = String(name).split(":").pop();
      for (const [k, v] of Object.entries(this.attrs)) {
        if (k.split(":").pop() === lname) return String(v);
      }
      return null;
    },
    get textContent() {
      return this.text + this.children.map((c) => c.textContent).join("");
    },
    getElementsByTagName(name) {
      const want = String(name).split(":").pop();
      const out = [];
      const walk = (node) => {
        for (const child of node.children) {
          if (child.localName === want) out.push(child);
          walk(child);
        }
      };
      walk(this);
      return out;
    },
  };
}

/** Small, forgiving XML tree used only when DOMParser is unavailable (Node). */
export function parseXmlFallback(text) {
  const root = xmlNode("#document");
  const stack = [root];
  const s = String(text || "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<\?[\s\S]*?\?>/g, "")
    .replace(/<!DOCTYPE[\s\S]*?>/gi, "");
  const re = /<(\/?)([A-Za-z_][\w:.-]*)((?:[^>"']|"[^"]*"|'[^']*')*?)(\/?)>|([^<]+)/g;
  let m;
  while ((m = re.exec(s))) {
    if (m[5] != null) {
      const txt = m[5].trim();
      if (txt) stack[stack.length - 1].text += txt;
      continue;
    }
    const closing = m[1] === "/";
    const tag = m[2];
    const attrText = m[3] || "";
    const selfClosing = m[4] === "/";
    if (closing) {
      for (let i = stack.length - 1; i > 0; i--) {
        if (stack[i].localName === tag.split(":").pop()) {
          stack.length = i;
          break;
        }
      }
      continue;
    }
    const attrs = {};
    const are = /([A-Za-z_][\w:.-]*)\s*=\s*("([^"]*)"|'([^']*)')/g;
    let a;
    while ((a = are.exec(attrText))) attrs[a[1]] = a[3] != null ? a[3] : a[4];
    const node = xmlNode(tag, attrs);
    stack[stack.length - 1].children.push(node);
    if (!selfClosing) stack.push(node);
  }
  return root;
}

export function parseXml(text) {
  if (typeof DOMParser !== "undefined") {
    try {
      const doc = new DOMParser().parseFromString(String(text || ""), XML_MIME);
      const err = doc.getElementsByTagName("parsererror");
      if (!err || !err.length) return doc;
    } catch { /* fall through */ }
  }
  return parseXmlFallback(text);
}

function elements(root, name) {
  if (!root) return [];
  if (root.getElementsByTagNameNS) {
    const ns = root.getElementsByTagNameNS("*", name);
    if (ns && ns.length) return Array.from(ns);
  }
  return Array.from(root.getElementsByTagName(name) || []);
}

function first(root, name) {
  return elements(root, name)[0] || null;
}

function childText(node, name) {
  if (!node) return "";
  const kids = node.children ? Array.from(node.children) : [];
  const found = kids.find((c) => (c.localName || c.nodeName || "").split(":").pop() === name);
  return found ? String(found.textContent || "").trim() : "";
}

function directText(root, name) {
  return childText(root, name);
}

function numberIn(node, name) {
  const t = directText(node, name);
  const n = Number(t);
  return t !== "" && Number.isFinite(n) ? n : null;
}

/* ——— GPX / TCX ——— */

function pointsFrom(trackEls, { timeTag = "time", eleTag = "ele", hrTag = null } = {}) {
  const points = [];
  let start = null;
  for (const el of trackEls) {
    const latAttr = el.getAttribute("lat");
    const lonAttr = el.getAttribute("lon");
    let lat = latAttr != null && latAttr !== "" ? Number(latAttr) : NaN;
    let lon = lonAttr != null && lonAttr !== "" ? Number(lonAttr) : NaN;
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      const latEl = elements(el, "LatitudeDegrees")[0];
      const lonEl = elements(el, "LongitudeDegrees")[0];
      lat = latEl ? Number(latEl.textContent) : NaN;
      lon = lonEl ? Number(lonEl.textContent) : NaN;
    }
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    const timeText = directText(el, timeTag);
    const when = parseDate(timeText);
    if (when && !start) start = when;
    const eleText = directText(el, eleTag);
    const ele = eleText !== "" ? Number(eleText) : NaN;
    let hr = null;
    if (hrTag) {
      const hrEls = elements(el, hrTag);
      const rawText = hrEls.length
        ? (directText(hrEls[0], "Value") || String(hrEls[0].textContent || "").trim())
        : "";
      const raw = rawText ? Number(rawText) : null;
      if (Number.isFinite(raw)) hr = raw;
    }
    const p = {
      lat: round(lat),
      lon: round(lon),
      ...(Number.isFinite(ele) ? { ele: round(ele, 2) } : {}),
      ...(hr != null ? { hr } : {}),
    };
    if (when) p.at = when.toISOString();
    points.push(p);
  }
  return { points, start };
}

function timeSecondsFrom(start, points) {
  if (!start) return points.map((p) => 0);
  return points.map((p) => {
    const t = p.at ? (Date.parse(p.at) - start.getTime()) / 1000 : 0;
    return Number.isFinite(t) && t >= 0 ? t : 0;
  });
}

function withTrack(points, start, extra = {}) {
  const times = timeSecondsFrom(start, points);
  const track = points.map((p, i) => ({
    lat: p.lat,
    lon: p.lon,
    t: extra.trackTimes && Number.isFinite(extra.trackTimes[i]) ? extra.trackTimes[i] : times[i],
    ...(p.ele != null ? { ele: p.ele } : {}),
    ...(p.hr != null ? { hr: p.hr } : {}),
    ...(p.at ? { at: p.at } : {}),
  }));
  const lastT = track.length ? track[track.length - 1].t : 0;
  return { track, elapsedSec: Math.max(0, Math.round(lastT)) };
}

export function parseGpx(text) {
  const doc = parseXml(text);
  if (!doc) return { ok: false, error: "xml" };
  const trkpts = elements(doc, "trkpt");
  if (!trkpts.length) {
    const routes = elements(doc, "rtept");
    return { ok: false, error: routes.length ? "route_only" : "no_track" };
  }
  const metaName = first(doc, "name");
  const typeText = (first(doc, "type") || {}).textContent || "";
  const nameText = metaName ? String(metaName.textContent || "").trim() : "";
  const sportRaw = `${typeText} ${nameText}`;
  const { points, start } = pointsFrom(trkpts, { hrTag: "hr" });
  if (!points.length) return { ok: false, error: "no_track" };
  const built = withTrack(points, start);
  const meters = pathLengthMeters(points);
  if (!(meters > 0)) return { ok: false, error: "no_track" };
  return {
    ok: true,
    format: "gpx",
    activity: {
      type: sportToType(sportRaw),
      startedAt: (start || new Date()).toISOString(),
      endedAt: start ? new Date(start.getTime() + built.elapsedSec * 1000).toISOString() : null,
      distanceMeters: round(meters, 1),
      elapsedSec: built.elapsedSec,
      track: built.track,
      name: nameText || null,
      ...gainLossFromTrack(built.track),
      ...heartRateSummary(built.track),
    },
    hasTimes: !!start,
  };
}

export function parseTcx(text) {
  const doc = parseXml(text);
  if (!doc) return { ok: false, error: "xml" };
  const activityEl = first(doc, "Activity");
  const sport = activityEl ? activityEl.getAttribute("Sport") : "";
  const trackpointEls = elements(doc, "Trackpoint");
  const { points, start: firstPointTime } = pointsFrom(trackpointEls, { timeTag: "Time", eleTag: "Altitude", hrTag: "HeartRateBpm" });
  let start = firstPointTime;
  if (!start && activityEl) {
    const id = childText(activityEl, "Id") || (elements(activityEl, "Id")[0] || {}).textContent;
    start = parseDate(id);
  }
  const laps = elements(doc, "Lap");
  let totalSec = 0;
  let totalMeters = 0;
  for (const lap of laps) {
    const t = numberIn(lap, "TotalTimeSeconds");
    const d = numberIn(lap, "DistanceMeters");
    if (t > 0) totalSec += t;
    if (d > 0) totalMeters += d;
  }
  const built = withTrack(points, start);
  const meters = totalMeters > 0 ? totalMeters : (points.length >= 2 ? pathLengthMeters(points) : 0);
  if (!(meters > 0) && !(totalSec > 0)) return { ok: false, error: "no_track" };
  return {
    ok: true,
    format: "tcx",
    activity: {
      type: sportToType(sport),
      startedAt: (start || new Date()).toISOString(),
      endedAt: start ? new Date(start.getTime() + (totalSec || built.elapsedSec) * 1000).toISOString() : null,
      distanceMeters: round(meters, 1),
      elapsedSec: Math.max(0, Math.round(totalSec || built.elapsedSec)),
      track: built.track,
      name: null,
      ...gainLossFromTrack(built.track),
      ...heartRateSummary(built.track),
    },
    hasTimes: !!start && (totalSec > 0 || built.elapsedSec > 0),
  };
}

function heartRateSummary(track) {
  const values = track.map((p) => p.hr).filter((v) => Number.isFinite(v));
  if (!values.length) return {};
  const sum = values.reduce((a, b) => a + b, 0);
  return {
    avgHr: Math.round(sum / values.length),
    maxHr: Math.max(...values),
  };
}

/* ——— FIT ——— */

function fitNumber(v) {
  if (v == null) return null;
  if (v instanceof Date) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function fitPosition(value) {
  const n = fitNumber(value);
  if (n == null) return null;
  // fit-file-parser returns degrees. Some files/branches still expose raw
  // semicircles; a value above 180 is unambiguous, so convert those.
  return Math.abs(n) > 180 ? n * (180 / 2147483648) : n;
}

export async function parseFit(input) {
  const bytes = toBytes(input);
  if (!bytes.length) return { ok: false, error: "fit_empty" };
  let data;
  try {
    data = await new Promise((resolve, reject) => {
      const parser = new FitParser({
        force: true,
        speedUnit: "m/s",
        lengthUnit: "m",
        temperatureUnit: "celsius",
        elapsedRecordField: true,
        mode: "list",
      });
      parser.parse(toArrayBuffer(bytes), (err, parsed) => {
        if (err) reject(new Error(String(err)));
        else resolve(parsed || {});
      });
    });
  } catch (err) {
    return { ok: false, error: "fit_parse", detail: String(err && err.message ? err.message : err) };
  }
  const records = Array.isArray(data.records) ? data.records : [];
  const session = (Array.isArray(data.sessions) && data.sessions[0]) || {};
  const sports = [];
  if (data.sport && data.sport.sport) sports.push(data.sport.sport);
  if (session.sport) sports.push(session.sport);
  if (data.sports && Array.isArray(data.sports)) data.sports.forEach((s) => sports.push(s && s.sport));
  let sportType = null;
  for (const s of sports) {
    sportType = sportToType(s);
    if (sportType) break;
  }
  const track = [];
  let start = null;
  let lastT = 0;
  for (const rec of records) {
    const lat = fitPosition(rec.position_lat);
    const lon = fitPosition(rec.position_long);
    const when = parseDate(rec.timestamp);
    if (when && !start) start = when;
    if (when && start) lastT = Math.max(0, Math.round((when.getTime() - start.getTime()) / 1000));
    const hasPos = Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180;
    if (!hasPos && !when) continue;
    const p = {
      ...(hasPos ? { lat: round(lat), lon: round(lon) } : {}),
      ...(when ? { at: when.toISOString() } : {}),
      t: lastT,
      ...(Number.isFinite(Number(rec.altitude)) ? { ele: round(Number(rec.altitude), 2) } : {}),
      ...(Number.isFinite(Number(rec.heart_rate)) ? { hr: Number(rec.heart_rate) } : {}),
    };
    track.push(p);
  }
  const sessionStart = parseDate(session.start_time) || start;
  if (sessionStart && !start) start = sessionStart;
  const sessionDistance = fitNumber(session.total_distance);
  const lastDistance = records.length ? fitNumber(records[records.length - 1].distance) : null;
  const meters = sessionDistance != null && sessionDistance > 0
    ? sessionDistance
    : lastDistance != null && lastDistance > 0
      ? lastDistance
      : (track.filter((p) => Number.isFinite(p.lat)).length >= 2 ? pathLengthMeters(track) : 0);
  const elapsed = fitNumber(session.total_elapsed_time) || fitNumber(session.total_timer_time) || lastT;
  if (!(meters > 0) && !(elapsed > 0)) return { ok: false, error: "no_track" };
  const pts = track.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon));
  const gl = gainLossFromTrack(pts);
  return {
    ok: true,
    format: "fit",
    activity: {
      type: sportType,
      startedAt: (start || new Date()).toISOString(),
      endedAt: start ? new Date(start.getTime() + Math.max(0, elapsed) * 1000).toISOString() : null,
      distanceMeters: round(meters, 1),
      elapsedSec: Math.max(0, Math.round(elapsed)),
      track: pts.map((p) => ({ ...p, t: Number.isFinite(p.t) ? p.t : 0 })),
      name: session.sport ? null : null,
      ...gl,
      ...heartRateSummary(pts),
      ...(Number.isFinite(Number(session.avg_heart_rate)) ? { avgHr: Number(session.avg_heart_rate) } : {}),
      ...(Number.isFinite(Number(session.max_heart_rate)) ? { maxHr: Number(session.max_heart_rate) } : {}),
    },
    hasTimes: !!start && elapsed > 0,
  };
}

/* ——— files, zips and review ——— */

export function inflateEntries({ name, bytes }, depth = 0) {
  const src = toBytes(bytes);
  const lower = String(name || "").toLowerCase();
  if (lower.endsWith(".fit.gz") || lower.endsWith(".gpx.gz") || lower.endsWith(".tcx.gz")) {
    try {
      const raw = gunzipSync(src);
      return [{ name: lower.replace(/\.gz$/, ""), bytes: raw }];
    } catch {
      return [{ name, bytes: src, error: "gunzip" }];
    }
  }
  if (lower.endsWith(".zip")) {
    if (depth > 2) return [{ name, bytes: src, error: "nested_zip" }];
    let files;
    try {
      files = unzipSync(src);
    } catch {
      return [{ name, bytes: src, error: "unzip" }];
    }
    const out = [];
    for (const [inner, data] of Object.entries(files || {})) {
      if (!inner || inner.endsWith("/")) continue;
      const clean = inner.replace(/\\/g, "/");
      const base = clean.split("/").pop();
      if (!base || base.startsWith(".") || clean.includes("__MACOSX/")) continue;
      if (data.length > IMPORT_MAX_BYTES) continue;
      const fmt = formatFromName(clean);
      if (fmt === "zip" || fmt === "fit" || fmt === "gpx" || fmt === "tcx") {
        out.push(...inflateEntries({ name: clean, bytes: data }, depth + 1));
      } else if (/\.fit\.gz$/i.test(clean)) {
        out.push(...inflateEntries({ name: clean, bytes: data }, depth + 1));
      }
      if (out.length >= IMPORT_MAX_FILES) break;
    }
    return out.slice(0, IMPORT_MAX_FILES);
  }
  return [{ name, bytes: src }];
}

export async function parseOne({ name, bytes }, { typeHint = null } = {}) {
  const format = formatFromName(name);
  if (!format) return { ok: false, error: "unsupported", name };
  const src = toBytes(bytes);
  if (src.length > IMPORT_MAX_BYTES) return { ok: false, error: "too_large", name };
  let parsed;
  if (format === "gpx") parsed = parseGpx(new TextDecoder().decode(src));
  else if (format === "tcx") parsed = parseTcx(new TextDecoder().decode(src));
  else if (format === "fit") parsed = await parseFit(src);
  else return { ok: false, error: "unsupported", name };
  if (!parsed.ok) return { ok: false, error: parsed.error, detail: parsed.detail, name };
  const hash = await sha256Hex(src);
  const hinted = normalizeType(typeHint);
  const activity = {
    ...parsed.activity,
    id: uid("act"),
    type: hinted || normalizeType(parsed.activity.type),
    source: "import",
    importFormat: format,
    importName: String(name || "").split("/").pop().slice(0, 120),
    importHash: hash,
    healthId: hash ? `file:${hash}` : null,
  };
  return {
    ok: true,
    name,
    format,
    activity,
    needsType: !activity.type,
    hasTimes: !!parsed.hasTimes,
  };
}

export async function expandAndParse(files, options = {}) {
  const out = [];
  for (const file of files || []) {
    const entries = inflateEntries(file);
    for (const entry of entries) {
      if (entry.error) {
        out.push({ ok: false, error: entry.error, name: entry.name });
        continue;
      }
      if (!formatFromName(entry.name)) continue;
      out.push(await parseOne(entry, options));
    }
  }
  return out;
}

function startMs(activity) {
  const raw = activity && (activity.startedAt || activity.startTime);
  const t = raw ? Date.parse(raw) : NaN;
  return Number.isFinite(t) ? t : null;
}

export function sameRoughActivity(a, b) {
  if (!a || !b) return false;
  const ta = normalizeType(a.type);
  const tb = normalizeType(b.type);
  if (ta && tb && ta !== tb) return false;
  const sa = startMs(a);
  const sb = startMs(b);
  if (sa == null || sb == null || Math.abs(sa - sb) > IMPORT_NEAR_START_SEC * 1000) return false;
  const da = Number(a.distanceMeters) || 0;
  const db = Number(b.distanceMeters) || 0;
  if (!(da > 0) || !(db > 0)) return false;
  const tol = Math.max(IMPORT_NEAR_DISTANCE_MIN_M, IMPORT_NEAR_DISTANCE_FRACTION * Math.max(da, db));
  return Math.abs(da - db) <= tol;
}

function richness(activity) {
  const track = Array.isArray(activity && activity.track) ? activity.track : [];
  const hasHr = track.some((p) => Number.isFinite(p.hr)) || Number(activity && activity.avgHr) > 0;
  const hasEle = track.some((p) => Number.isFinite(p.ele));
  return track.length + (hasHr ? 10 : 0) + (hasEle ? 5 : 0);
}

/**
 * Compare one parsed candidate with the activities already on the phone.
 * @returns {{status:"new"|"duplicate"|"replace", match?:object, reason?:string}}
 */
export function dedupeDecision(candidate, existing = []) {
  if (!candidate) return { status: "new" };
  for (const act of existing || []) {
    if (!act) continue;
    const merged = Array.isArray(act.mergedIds) ? act.mergedIds : [];
    if (candidate.healthId && (candidate.healthId === act.healthId || merged.includes(candidate.healthId))) {
      return { status: "duplicate", match: act, reason: "same_health_id" };
    }
    if (candidate.importHash && (candidate.importHash === act.importHash || merged.includes(`file:${candidate.importHash}`))) {
      return { status: "duplicate", match: act, reason: "same_file_hash" };
    }
  }
  for (const act of existing || []) {
    if (!act || !sameRoughActivity(candidate, act)) continue;
    const richer = richness(candidate) > richness(act);
    const candidateFromFile = candidate.source === "import" && Array.isArray(candidate.track) && candidate.track.length > 0;
    const existingThin = act.source === "watch" || act.source === "health" || !(act.track && act.track.length);
    if (richer && candidateFromFile && existingThin) {
      return { status: "replace", match: act, reason: "richer_file" };
    }
    return { status: "duplicate", match: act, reason: "near_match" };
  }
  return { status: "new" };
}

/**
 * Parse a batch and return rows for the review sheet. The caller decides
 * which rows to apply and can change an ambiguous row's sport.
 */
export async function reviewImport(files, { existing = [], defaultType = null, typeHints = {} } = {}) {
  const parsed = await expandAndParse(files, { typeHint: defaultType });
  const rows = [];
  const seen = [];
  for (const item of parsed) {
    if (!item.ok) {
      rows.push({ status: "unreadable", name: item.name, error: item.error, detail: item.detail || null });
      continue;
    }
    const activity = item.activity;
    if (!activity.type && item.needsType) {
      const hint = normalizeType(typeHints[item.name]);
      activity.type = hint || normalizeType(defaultType) || "walk";
      item.needsType = !hint && !normalizeType(defaultType);
    }
    const decision = dedupeDecision(activity, [...(existing || []), ...seen]);
    if (decision.status === "new") seen.push(activity);
    rows.push({
      status: decision.status,
      name: item.name,
      format: item.format,
      activity,
      needsType: item.needsType,
      matchId: decision.match ? decision.match.id : null,
      reason: decision.reason || null,
    });
  }
  return {
    rows,
    imported: rows.filter((r) => r.status === "new" || r.status === "replace").length,
    duplicates: rows.filter((r) => r.status === "duplicate").length,
    unreadable: rows.filter((r) => r.status === "unreadable").length,
    needsType: rows.filter((r) => r.status !== "unreadable" && r.needsType).length,
  };
}

/** Apply accepted review rows to an activity list without mutating on failure. */
export function applyImportRows(rows, existing = []) {
  const next = (existing || []).slice();
  const added = [];
  const replaced = [];
  for (const row of rows || []) {
    if (!row || row.status === "duplicate" || row.status === "unreadable" || !row.activity) continue;
    const act = { ...row.activity, type: normalizeType(row.activity.type) || "walk" };
    if (row.status === "replace" && row.matchId) {
      const idx = next.findIndex((a) => a.id === row.matchId);
      if (idx >= 0) {
        const previous = next[idx];
        const keepIds = [
          previous.healthId,
          previous.id,
          previous.importHash ? `file:${previous.importHash}` : null,
        ].filter(Boolean);
        next[idx] = {
          ...act,
          id: previous.id || act.id,
          mergedIds: Array.from(new Set([...(previous.mergedIds || []), ...keepIds])),
          replacedSource: previous.source || null,
        };
        replaced.push(next[idx]);
        continue;
      }
    }
    next.push(act);
    added.push(act);
  }
  return { activities: next, added, replaced };
}

export const IMPORT_HELP = [
  "Strava: on the website, open an activity, then More → Export GPX or Export Original. The full archive is Settings → My Account → Download your account.",
  "Garmin Connect: open the activity on the website and use the gear icon → Export File (FIT, GPX or TCX).",
  "Runkeeper: Settings → Account Settings → Export Data, for a date range.",
  "Polar Flow, COROS, Suunto and Komoot export one workout or route at a time.",
  "Nike Run Club and Samsung Health do not document an in-app GPX export; use Health Connect / Apple Health or files you already have.",
];
