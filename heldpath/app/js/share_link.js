/**
 * Shareable Heldpath course and plan links.
 * The payload lives in the URL fragment so the course never hits server logs.
 * Format: https://paigegames.net/heldpath/s/#c.<base64url-json>
 *         https://paigegames.net/heldpath/s/#p.<base64url-json>
 */
import { pathLengthMeters, formatDistance } from "./util.js";

export const SHARE_ORIGIN = "https://paigegames.net";
export const SHARE_PATH = "/heldpath/s/";
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

function utf8Bytes(str) {
  return new TextEncoder().encode(str);
}

function bytesToB64url(bytes) {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  const b64 = typeof btoa === "function"
    ? btoa(bin)
    : Buffer.from(bytes).toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function b64urlToBytes(s) {
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

function compactPlan(plan) {
  const clean = stripSecrets(plan || {});
  delete clean.id;
  delete clean.createdAt;
  delete clean.updatedAt;
  if (clean.route && typeof clean.route === "object") {
    const route = { ...clean.route };
    delete route.loop;
    if (Array.isArray(route.pins)) route.pins = compactPins(route.pins);
    clean.route = route;
  }
  if (clean.ownership && typeof clean.ownership === "object") {
    clean.ownership = { state: clean.ownership.state === "imported" ? "imported" : "owned" };
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
  if (course && course.straightLine) body.sl = 1;
  return body;
}

export function planPayload(plan) {
  return { v: SHARE_VERSION, t: "p", plan: compactPlan(plan) };
}

export function encodePayload(payload) {
  const kind = payload && payload.t === "p" ? "p" : "c";
  const hash = `${kind}.${bytesToB64url(utf8Bytes(JSON.stringify(payload)))}`;
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

export function extractHash(input) {
  if (input == null) return "";
  const raw = String(input).trim();
  if (!raw) return "";
  const hashIdx = raw.lastIndexOf("#");
  const part = hashIdx >= 0 ? raw.slice(hashIdx + 1) : raw;
  try {
    return decodeURIComponent(part);
  } catch {
    return part;
  }
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
  if (!payload || payload.v !== SHARE_VERSION) return { ok: false, error: "unsupported_version" };
  if (m[1] === "c" || payload.t === "c") {
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
  if (m[1] === "p" || payload.t === "p") {
    if (!payload.plan || typeof payload.plan !== "object") return { ok: false, error: "bad_plan" };
    const plan = stripSecrets(payload.plan);
    if (!plan.title && !plan.goal && !plan.route) return { ok: false, error: "bad_plan" };
    if (plan.route && Array.isArray(plan.route.pins)) {
      plan.route.pins = expandPins(plan.route.pins);
    }
    return { ok: true, kind: "plan", hash, plan };
  }
  return { ok: false, error: "unknown_kind" };
}

export function shareSummary(decoded, units = "mi") {
  if (!decoded || !decoded.ok) return { title: "Heldpath", sub: "This link could not be read." };
  if (decoded.kind === "course") {
    const n = decoded.course.pins.length;
    const m = decoded.meters || 0;
    const dist = formatDistance(m, units);
    return {
      title: decoded.course.name,
      sub: `${dist} · ${n} pin${n === 1 ? "" : "s"}`,
      meters: m,
    };
  }
  const p = decoded.plan || {};
  const kind = p.activityType === "run" ? "Run" : "Walk";
  const sessions = p.schedule && p.schedule.sessionDates ? p.schedule.sessionDates.length : 0;
  return {
    title: String(p.title || "Shared plan"),
    sub: sessions ? `${kind} plan · ${sessions} sessions · import is free` : `${kind} plan · import is free`,
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
