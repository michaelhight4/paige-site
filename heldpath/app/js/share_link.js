/**
 * Shareable Heldpath course and plan links.
 * Course payload stays in the URL fragment:
 *   https://paigegames.net/heldpath/s/#c.<base64url-json>
 * Plan links use a query string so Android App Links and iOS Universal
 * Links still receive the payload (the OS drops URL fragments):
 *   https://paigegames.net/heldpath/plan/?p=<base64url-json>
 * The plan payload is a self-contained template only — never the sender's
 * runs, progress, metrics, graphs or history.
 */
import { pathLengthMeters, formatDistance } from "./util.js";

export const SHARE_ORIGIN = "https://paigegames.net";
export const SHARE_PATH = "/heldpath/s/";
export const PLAN_SHARE_PATH = "/heldpath/plan/";
export const APP_PATH = "/heldpath/app/";
export const PLAY_PACKAGE = "com.pagegames.heldpath";
export const PLAY_STORE_URL = `https://play.google.com/store/apps/details?id=${PLAY_PACKAGE}`;
export const SHARE_VERSION = 1;

/** Prefer a scannable QR at or under this many characters. */
export const QR_SOFT_LENGTH = 1200;
/** Drop the dense path and keep pins if the link would exceed this. */
export const HARD_LENGTH = 6000;

export function shareBaseUrl() {
  return `${SHARE_ORIGIN}${SHARE_PATH}`;
}

export function planShareBaseUrl() {
  return `${SHARE_ORIGIN}${PLAN_SHARE_PATH}`;
}

export function appOpenUrl(hash) {
  const h = String(hash || "").replace(/^#/, "");
  return `${SHARE_ORIGIN}${APP_PATH}#${h}`;
}

export function playStoreUrl({ referrer = "utm_source=heldpath_share&utm_medium=link" } = {}) {
  return `${PLAY_STORE_URL}?referrer=${encodeURIComponent(referrer)}`;
}

function round6(n) {
  return Math.round(Number(n) * 1e6) / 1e6;
}

export function utf8Bytes(str) {
  return new TextEncoder().encode(str);
}

export function bytesToB64url(bytes) {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  const b64 = typeof btoa === "function"
    ? btoa(bin)
    : Buffer.from(bytes).toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function b64urlToBytes(s) {
  const b64 = String(s).replace(/-/g, "+").replace(/_/g, "/") + "==".slice(0, (4 - (s.length % 4)) % 4);
  if (typeof atob === "function") {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  return new Uint8Array(Buffer.from(b64, "base64"));
}

function encodeSigned(value) {
  let v = value < 0 ? ~(value << 1) : (value << 1);
  let out = "";
  while (v >= 0x20) {
    out += String.fromCharCode((0x20 | (v & 0x1f)) + 63);
    v >>= 5;
  }
  out += String.fromCharCode(v + 63);
  return out;
}

/** Google encoded polyline, precision 5 (~1 m). Points are {lat, lon}. */
export function encodePolyline(points, precision = 5) {
  const factor = 10 ** precision;
  let plat = 0;
  let plon = 0;
  let out = "";
  for (const p of points || []) {
    const lat = Number(p.lat);
    const lon = Number(p.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    const ilat = Math.round(lat * factor);
    const ilon = Math.round(lon * factor);
    out += encodeSigned(ilat - plat) + encodeSigned(ilon - plon);
    plat = ilat;
    plon = ilon;
  }
  return out;
}

export function decodePolyline(str, precision = 5) {
  const factor = 10 ** precision;
  const points = [];
  let i = 0;
  let lat = 0;
  let lon = 0;
  const s = String(str || "");
  while (i < s.length) {
    const read = () => {
      let shift = 0;
      let result = 0;
      let b;
      do {
        if (i >= s.length) return null;
        b = s.charCodeAt(i++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      return result & 1 ? ~(result >> 1) : (result >> 1);
    };
    const dlat = read();
    const dlon = read();
    if (dlat == null || dlon == null) break;
    lat += dlat;
    lon += dlon;
    points.push({ lat: lat / factor, lon: lon / factor });
  }
  return points;
}

function compactPins(pins) {
  return (pins || []).map((p) => {
    const lat = round6(p.lat);
    const lon = round6(p.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    if (p.role && p.role !== "via") return [lat, lon, p.role];
    return [lat, lon];
  }).filter(Boolean);
}

function expandPins(rows) {
  return (rows || []).map((row, i, arr) => {
    const lat = Number(Array.isArray(row) ? row[0] : row.lat);
    const lon = Number(Array.isArray(row) ? row[1] : row.lon);
    let role = Array.isArray(row) ? row[2] : row.role;
    if (!role) {
      if (i === 0) role = "start";
      else if (i === arr.length - 1) role = "end";
      else role = "via";
    }
    return { lat, lon, role };
  }).filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon));
}

function stripSecrets(value) {
  if (Array.isArray(value)) return value.map(stripSecrets);
  if (!value || typeof value !== "object") return value;
  const out = {};
  for (const [k, v] of Object.entries(value)) {
    if (/token|receipt|secret|credential/i.test(k)) continue;
    out[k] = stripSecrets(v);
  }
  return out;
}

/**
 * A shareable plan is a copy of the plan template only. Sender progress,
 * metrics, graphs, history, PBs and run data must never travel with it.
 * Each recipient starts fresh on their own device; nothing is synced.
 */
export function sanitiseSharedPlan(plan) {
  const clean = stripSecrets(plan || {});
  delete clean.id;
  delete clean.createdAt;
  delete clean.updatedAt;
  const drop = [
    "history", "histories", "results", "sessionResults", "completedSessions",
    "activities", "runs", "tracks", "metrics", "graphs", "graph", "stats",
    "sectorPbs", "sectorHistory", "legPbs", "pb", "bests", "waterLog", "logs",
    "progress", "completed", "completions", "sessionHistory", "legResults",
    "hits", "misses", "activityIds",
  ];
  for (const k of drop) delete clean[k];
  if (clean.water && typeof clean.water === "object") {
    const water = { ...clean.water };
    delete water.log;
    delete water.logs;
    delete water.history;
    delete water.consumed;
    delete water.entries;
    clean.water = water;
  }
  if (clean.progression && typeof clean.progression === "object") {
    const step = Number(clean.progression.step);
    // Only the step size is a plan setting. Current target, dates and
    // results are the sender's progress and must not be shared.
    clean.progression = { step: Number.isFinite(step) && step > 0 ? step : 0.02 };
  }
  delete clean.ownership;
  return clean;
}

export function compactPlan(plan) {
  const clean = sanitiseSharedPlan(plan);
  if (clean.route && typeof clean.route === "object") {
    const route = { ...clean.route };
    delete route.loop;
    if (Array.isArray(route.pins)) route.pins = compactPins(route.pins);
    clean.route = route;
  }
  return clean;
}

export function coursePayload(course, { includePath = true } = {}) {
  const pins = compactPins(course && course.pins);
  const body = {
    v: SHARE_VERSION,
    t: "c",
    n: String((course && course.name) || "Course").slice(0, 48),
    pins,
  };
  if (includePath && course && Array.isArray(course.path) && course.path.length >= 2) {
    body.path = encodePolyline(course.path);
  }
  // Global straight-line (old builder toggle) is no longer encoded.
  return body;
}

export function planPayload(plan) {
  return { v: SHARE_VERSION, t: "p", plan: compactPlan(plan) };
}

export function encodePayload(payload) {
  const kind = payload && payload.t === "p" ? "p" : "c";
  const body = bytesToB64url(utf8Bytes(JSON.stringify(payload)));
  const hash = `${kind}.${body}`;
  if (kind === "p") {
    // Query string, not a fragment: App Links / Universal Links drop '#...'.
    const url = `${planShareBaseUrl()}?p=${body}`;
    return { kind, hash, url, length: url.length };
  }
  return { kind, hash, url: `${shareBaseUrl()}#${hash}`, length: shareBaseUrl().length + 1 + hash.length };
}

/**
 * Build a shareable URL. Drops the dense path if the link would be too long.
 * The QR-friendly URL may be a pins-only variant of the same course.
 */
export function encodeCourse(course) {
  const full = encodePayload(coursePayload(course, { includePath: true }));
  let chosen = full;
  let omittedPath = false;
  if (full.length > HARD_LENGTH && course && course.path && course.path.length) {
    chosen = encodePayload(coursePayload(course, { includePath: false }));
    omittedPath = true;
  }
  let qr = chosen;
  if (chosen.length > QR_SOFT_LENGTH && course && course.path && course.path.length && !omittedPath) {
    qr = encodePayload(coursePayload(course, { includePath: false }));
  }
  return {
    ok: true,
    kind: "course",
    url: chosen.url,
    hash: chosen.hash,
    length: chosen.length,
    omittedPath,
    qrUrl: qr.url,
    qrHash: qr.hash,
  };
}

export function encodePlan(plan) {
  const encoded = encodePayload(planPayload(plan));
  return {
    ok: true,
    kind: "plan",
    url: encoded.url,
    hash: encoded.hash,
    length: encoded.length,
    omittedPath: false,
    qrUrl: encoded.length > QR_SOFT_LENGTH ? encoded.url : encoded.url,
    qrHash: encoded.hash,
    tooLong: encoded.length > HARD_LENGTH,
  };
}

function decodeSafe(part) {
  try {
    return decodeURIComponent(part);
  } catch {
    return part;
  }
}

/**
 * Pull the c.<b64> / p.<b64> token out of a hash, query string, path, or raw token.
 */
export function extractHash(input) {
  if (input == null) return "";
  const raw = String(input).trim();
  if (!raw) return "";
  const hashIdx = raw.lastIndexOf("#");
  if (hashIdx >= 0) {
    const part = decodeSafe(raw.slice(hashIdx + 1));
    if (/^(c|p)\./.test(part)) return part;
  }
  try {
    const u = raw.includes("://") || raw.startsWith("/")
      ? new URL(raw, "https://paigegames.net")
      : null;
    if (u) {
      const q = u.searchParams.get("p") || u.searchParams.get("d") || u.searchParams.get("plan");
      if (q) {
        const v = decodeSafe(q);
        if (/^(c|p)\./.test(v)) return v;
        if (/^[A-Za-z0-9_-]+$/.test(v)) return `p.${v}`;
      }
      const m = /\/((?:c|p)\.[A-Za-z0-9_-]+)/.exec(u.pathname);
      if (m) return m[1];
    }
  } catch { /* ignore */ }
  const part = decodeSafe(hashIdx >= 0 ? raw.slice(hashIdx + 1) : raw);
  return part;
}

export function isShareHash(input) {
  const h = extractHash(input);
  return /^(c|p)\./.test(h);
}

export function decodeShare(input) {
  const hash = extractHash(input);
  const m = /^(c|p)\.([A-Za-z0-9_-]+)$/.exec(hash);
  if (!m) return { ok: false, error: "not_a_share" };
  let json;
  try {
    json = new TextDecoder().decode(b64urlToBytes(m[2]));
  } catch {
    return { ok: false, error: "bad_encoding" };
  }
  let payload;
  try {
    payload = JSON.parse(json);
  } catch {
    return { ok: false, error: "bad_json" };
  }
  return decodeSharePayload(payload, { hash });
}

/** Decode a compact course/plan payload object (link or inflated QR). */
export function decodeSharePayload(payload, { hash = "" } = {}) {
  if (!payload || payload.v !== SHARE_VERSION) return { ok: false, error: "unsupported_version" };
  if (payload.t === "c") {
    const pins = expandPins(payload.pins);
    if (pins.length < 2) return { ok: false, error: "too_few_pins" };
    const path = payload.path ? decodePolyline(payload.path) : null;
    const course = {
      name: String(payload.n || "Shared course").slice(0, 48),
      pins,
      path: path && path.length >= 2 ? path : null,
      straightLine: !!payload.sl,
    };
    return { ok: true, kind: "course", hash, course, meters: pathLengthMeters(course.path || course.pins) };
  }
  if (payload.t === "p") {
    if (!payload.plan || typeof payload.plan !== "object") return { ok: false, error: "bad_plan" };
    // Strip sender data without re-compacting pins (compactPins expects
    // {lat,lon} objects; a share payload already stores [lat,lon] arrays).
    const plan = sanitiseSharedPlan(payload.plan);
    if (!plan.title && !plan.goal && !plan.route) return { ok: false, error: "bad_plan" };
    if (plan.route && Array.isArray(plan.route.pins)) {
      plan.route.pins = expandPins(plan.route.pins);
    }
    return { ok: true, kind: "plan", hash, plan };
  }
  return { ok: false, error: "unknown_kind" };
}

export const SHARE_UNITS_KEY = "heldpath.share-units";

/** Miles are customary in the US, Liberia, and Myanmar; everywhere else, km. */
export function unitsFromLocale(locale = "en-US") {
  const tag = String(locale || "en-US");
  if (/(^en-US|-US$|^en-LR|-LR$|^my-|-MM$)/i.test(tag)) return "mi";
  return "km";
}

export function unitsFromAppSettings(raw) {
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    const u = parsed && parsed.settings && parsed.settings.units;
    if (u === "km" || u === "mi") return u;
  } catch { /* ignore */ }
  return null;
}

/**
 * Units for a shared link preview: an explicit choice, then the Heldpath
 * app setting on this device, then the browser locale.
 */
export function preferredShareUnits({ shareUnits, settingsRaw, locale } = {}) {
  if (shareUnits === "km" || shareUnits === "mi") return shareUnits;
  return unitsFromAppSettings(settingsRaw) || unitsFromLocale(locale);
}

export function shareSummary(decoded, units = "mi") {
  const u = units === "km" ? "km" : "mi";
  if (!decoded || !decoded.ok) return { title: "Heldpath", sub: "This link could not be read.", units: u };
  if (decoded.kind === "course") {
    const n = decoded.course.pins.length;
    const m = decoded.meters || 0;
    const dist = formatDistance(m, u);
    return {
      title: decoded.course.name,
      sub: `${dist} · ${n} pin${n === 1 ? "" : "s"}`,
      meters: m,
      units: u,
    };
  }
  const p = decoded.plan || {};
  const kind = p.activityType === "run" ? "Run" : "Walk";
  const sessions = p.schedule && p.schedule.sessionDates ? p.schedule.sessionDates.length : 0;
  const goalMeters = (p.goal && (p.goal.distanceMeters || p.goal.goalDistanceMeters)) || 0;
  const bits = [`${kind} plan`];
  if (goalMeters > 0) bits.push(formatDistance(goalMeters, u));
  if (sessions) bits.push(`${sessions} sessions`);
  bits.push("import is free");
  return {
    title: String(p.title || "Shared plan"),
    sub: bits.join(" · "),
    units: u,
  };
}

/** Tiny path sketch for the import sheet and the public preview page. */
export function pathPreviewSvg(points, { width = 320, height = 180, pad = 18 } = {}) {
  const pts = (points || []).map((p) => ({ lat: Number(p.lat), lon: Number(p.lon) }))
    .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon));
  if (!pts.length) return "";
  const lats = pts.map((p) => p.lat);
  const lons = pts.map((p) => p.lon);
  let minLat = Math.min(...lats);
  let maxLat = Math.max(...lats);
  let minLon = Math.min(...lons);
  let maxLon = Math.max(...lons);
  if (maxLat === minLat) { minLat -= 0.001; maxLat += 0.001; }
  if (maxLon === minLon) { minLon -= 0.001; maxLon += 0.001; }
  const midLat = (minLat + maxLat) / 2;
  const cos = Math.cos((midLat * Math.PI) / 180) || 1;
  const xspan = Math.max((maxLon - minLon) * cos, 1e-9);
  const yspan = Math.max(maxLat - minLat, 1e-9);
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;
  const s = Math.min(innerW / xspan, innerH / yspan);
  const ox = pad + (innerW - xspan * s) / 2;
  const oy = pad + (innerH - yspan * s) / 2;
  const xy = (p) => [ox + (p.lon - minLon) * cos * s, height - (oy + (p.lat - minLat) * s)];
  const coords = pts.map(xy);
  const d = coords.map((c, i) => `${i ? "L" : "M"}${c[0].toFixed(1)},${c[1].toFixed(1)}`).join(" ");
  const dots = coords.map((c, i) => {
    if (i === coords.length - 1 && i > 0) {
      const a = coords[0];
      if (Math.hypot(c[0] - a[0], c[1] - a[1]) < 4) return "";
    }
    const r = i === 0 || i === coords.length - 1 ? 5 : 3;
    const fill = i === 0 ? "#4FA3C8" : i === coords.length - 1 ? "#E8EEF3" : "#8A9AA8";
    return `<circle cx="${c[0].toFixed(1)}" cy="${c[1].toFixed(1)}" r="${r}" fill="${fill}" />`;
  }).join("");
  return `<svg viewBox="0 0 ${width} ${height}" width="100%" height="${height}" role="img" aria-label="Course path">${d ? `<path d="${d}" fill="none" stroke="#4FA3C8" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" />` : ""}${dots}</svg>`;
}
