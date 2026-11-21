/**
 * Settings > Privacy & Data: inventory, export, deletion, and the
 * off-by-default integration toggles. Everything stays on this phone unless
 * the user turns an integration on or taps Share.
 */
import { zipSync, strToU8 } from "fflate";
import { activityToGpx, activityGpxName, courseToGpx, courseGpxName, exportBinaryFile, exportTextFile } from "./export_activities.js";
import { activityToFit, activityFitName } from "./fit_write.js";
import { tileCacheBytes, packCacheBytes, clearTileCache as wipeTiles } from "./map_storage.js";
import { encryptExport } from "./export_protect.js";

export const SHARE_ONLY_ON_TAP_NOTE = "Sharing only happens when you tap Share. Heldpath never uploads your walks, runs, rides, or location in the background.";

export const GOOGLE_LOCATION_NOTE = "Off by default. When on, Heldpath may use Google Play services for location, which can also use Wi-Fi and cell signals. Google may collect that location data. The default, and the fallback if you turn this off, is the phone’s GPS only. Nothing is sent to Paige Games.";

export const GOOGLE_LOCATION_CONSENT = "Enhanced location uses Google Play services. Google may collect location, Wi-Fi, and cell data. This is optional and off until you turn it on. The default stays GPS on this phone only. Do you want to turn it on?";

export const HEALTH_READ_NOTE = "Off by default. When on, Heldpath may read walks, runs and rides already stored in Health Connect on this phone — including routes, distance, steps, calories and heart rate — and show them in your heat map, Progress and Calendar. You choose which apps to import from. This information stays on your device. Paige Games never receives it.";

export const PHOTON_NOTE = "Off by default. Place search uses maps already on this phone. When this is on, Heldpath may send the place you type to Photon (photon.komoot.io) so results can be found outside a downloaded pack. Photon receives the search text, not your name or activity history. Paige Games never receives it. The app works fully with this off. The first time a search would use Photon, Heldpath will ask before sending anything. Turning this off stops those requests immediately.";

export const PHOTON_CONSENT = "Place search can send the text you type to Photon (photon.komoot.io) when a match is not already on this phone. This is optional and off until you turn it on. Search still works from downloaded maps. Do you want to turn Photon on?";

export const OVERPASS_NOTE = "Off by default. Routing uses walkable paths already on this phone (a downloaded pack or the maps that come with the app). When this is on, Heldpath may send a map area to Overpass (overpass-api.de) or the map provider (OpenFreeMap) to look up tunnels or path data that is not already downloaded. Those services receive a map area, not your name or activity history. Paige Games never receives it. The app works fully with this off. The first time a feature would use it, Heldpath will ask before sending anything. Turning this off stops those requests immediately.";

export const OVERPASS_CONSENT = "Heldpath can send a map area to Overpass (overpass-api.de) or the map provider (OpenFreeMap) when a path is not already on this phone. This is optional and off until you turn it on. Routing still works from maps downloaded on this phone. Do you want to turn it on?";

export const YOUTUBE_NOTE = "Off by default. Stretch follow-along videos play from YouTube only when you turn this on and tap to watch them. YouTube may then receive that you asked to play the video. Heldpath does not load YouTube in the background, and it does not send your walks or location to YouTube. Paige Games never receives it. The first time you tap a video, Heldpath will ask before loading YouTube.";

export const YOUTUBE_CONSENT = "This follow-along video is hosted on YouTube. Opening it loads YouTube, which may see that you asked to play the video. Heldpath does not send your walks or location to YouTube. This is optional and off until you turn it on. Do you want to allow YouTube videos?";

/** @deprecated Use PHOTON_NOTE / OVERPASS_NOTE. Kept so older copy still resolves. */
export const ONLINE_LOOKUP_NOTE = PHOTON_NOTE + " " + OVERPASS_NOTE;
export const ONLINE_LOOKUP_CONSENT = PHOTON_CONSENT;

export const HEALTH_IMPORT_CONSENT = "Heldpath can read walks, runs and rides already stored in Health Connect on this phone, including their routes, so they can appear on your heat map. This is optional and stays on this phone. Paige Games never receives it. Android will ask which Health Connect permissions to allow, and may ask again for individual routes. Do you want to continue?";

export const HEALTH_BACKGROUND_NOTE = "Off by default. When on, Heldpath may check Health Connect for new walks, runs and rides from the apps you already imported, and add them to the on-device store. Nothing is uploaded. You can turn this off at any time.";

export const HEALTH_WRITE_NOTE = "Off by default. When on, Heldpath may write a finished walk, run, or ride (distance, time, and route) to Health Connect on this phone so it can appear in your health app. This information stays on your device. Paige Games never receives it.";

export const INTEGRATIONS = [
  {
    key: "googleLocationOptIn",
    id: "privacy-google-location",
    title: "Enhanced location (Google)",
    note: GOOGLE_LOCATION_NOTE,
    consent: GOOGLE_LOCATION_CONSENT,
  },
  {
    key: "healthReadOptIn",
    id: "privacy-health-read",
    title: "Health Connect read",
    note: HEALTH_READ_NOTE,
  },
  {
    key: "healthWriteOptIn",
    id: "privacy-health-write",
    title: "Health Connect write",
    note: HEALTH_WRITE_NOTE,
  },
  {
    key: "photonOptIn",
    id: "privacy-photon",
    title: "Photon place search",
    note: PHOTON_NOTE,
    consent: PHOTON_CONSENT,
  },
  {
    key: "overpassOptIn",
    id: "privacy-overpass",
    title: "Overpass and live map tiles",
    note: OVERPASS_NOTE,
    consent: OVERPASS_CONSENT,
  },
  {
    key: "youtubeOptIn",
    id: "privacy-youtube",
    title: "YouTube videos",
    note: YOUTUBE_NOTE,
    consent: YOUTUBE_CONSENT,
  },
];

const PURCHASE_KEYS = ["planCredits", "planCreditReceipts", "supportReceipt", "supportThanked", "billing", "purchases", "playPurchase", "tokens"];

/** New users stay off. Existing healthOptIn remains honoured for both read and write. */
export function migratePrivacySettings(settings) {
  const next = { ...(settings || {}) };
  if (next.healthReadOptIn == null && next.healthWriteOptIn == null && next.healthOptIn) {
    next.healthReadOptIn = true;
    next.healthWriteOptIn = true;
  }
  if (next.healthReadOptIn == null) next.healthReadOptIn = false;
  if (next.healthWriteOptIn == null) next.healthWriteOptIn = false;
  if (next.googleLocationOptIn == null) next.googleLocationOptIn = false;
  if (next.pathSnapOptIn == null) next.pathSnapOptIn = false;
  if (next.onlineLookupOptIn == null) next.onlineLookupOptIn = false;
  if (next.photonOptIn == null) next.photonOptIn = !!next.onlineLookupOptIn;
  if (next.overpassOptIn == null) next.overpassOptIn = !!next.onlineLookupOptIn;
  if (next.youtubeOptIn == null) next.youtubeOptIn = false;
  next.onlineLookupOptIn = !!(next.photonOptIn || next.overpassOptIn);
  next.healthOptIn = !!(next.healthReadOptIn && next.healthWriteOptIn);
  return next;
}

export function integrationOn(settings, key) {
  return !!(settings && settings[key]);
}

export function setIntegration(settings, key, on) {
  const next = migratePrivacySettings(settings);
  if (key === "healthOptIn") {
    next.healthReadOptIn = !!on;
    next.healthWriteOptIn = !!on;
  } else if (key === "onlineLookupOptIn") {
    next.onlineLookupOptIn = !!on;
    next.photonOptIn = !!on;
    next.overpassOptIn = !!on;
  } else {
    next[key] = !!on;
  }
  next.healthOptIn = !!(next.healthReadOptIn && next.healthWriteOptIn);
  next.onlineLookupOptIn = !!(next.photonOptIn || next.overpassOptIn);
  return next;
}

export function byteLabel(n) {
  const b = Math.max(0, Number(n) || 0);
  if (b < 1000) return `${Math.round(b)} B`;
  if (b < 1000 * 1000) return `${(b / 1000).toFixed(b < 10_000 ? 1 : 0)} KB`;
  return `${(b / 1_000_000).toFixed(b < 10_000_000 ? 1 : 0)} MB`;
}

function utf8Bytes(value) {
  try {
    return new TextEncoder().encode(JSON.stringify(value)).byteLength;
  } catch {
    return String(value == null ? "" : JSON.stringify(value)).length;
  }
}

export function storageInventory(state, { tiles = 0, packs = 0 } = {}) {
  const activities = (state && state.activities) || [];
  const courses = (state && state.courses) || [];
  const plans = (state && state.plans) || [];
  const goals = (state && (state.goals || state.targets)) || [];
  const settings = (state && state.settings) || {};
  const rows = [
    { id: "activities", label: "Activities", count: activities.length, bytes: utf8Bytes(activities) },
    { id: "courses", label: "Courses", count: courses.length, bytes: utf8Bytes(courses) },
    { id: "plans", label: "Plans", count: plans.length, bytes: utf8Bytes(plans) },
    { id: "goals", label: "Goals and records", count: Array.isArray(goals) ? goals.length : 0, bytes: utf8Bytes(goals) },
    { id: "settings", label: "Settings", count: Object.keys(settings).length, bytes: utf8Bytes(settings) },
    { id: "tiles", label: "Map tile cache", count: null, bytes: Number(tiles) || 0 },
  ];
  if (packs > 0) rows.push({ id: "packs", label: "Saved map packs", count: null, bytes: Number(packs) || 0 });
  const totalBytes = rows.reduce((s, r) => s + (r.bytes || 0), 0);
  return { rows, totalBytes, totalLabel: byteLabel(totalBytes) };
}

export async function measureInventory(state) {
  let tiles = 0;
  let packs = 0;
  try { tiles = await tileCacheBytes(); } catch { tiles = 0; }
  try { packs = await packCacheBytes(); } catch { packs = 0; }
  return storageInventory(state, { tiles, packs });
}

export function activityInRange(activity, fromMs, toMs) {
  const t = Date.parse(activity && (activity.startedAt || activity.endedAt || activity.at) || "");
  if (!Number.isFinite(t)) return false;
  if (Number.isFinite(fromMs) && t < fromMs) return false;
  if (Number.isFinite(toMs) && t > toMs) return false;
  return true;
}

export function deleteActivityById(state, id) {
  const next = { ...(state || {}), activities: [...((state && state.activities) || [])] };
  const before = next.activities.length;
  next.activities = next.activities.filter((a) => a && a.id !== id);
  return { state: next, removed: before - next.activities.length };
}

export function deleteActivitiesInRange(state, fromIso, toIso) {
  const fromMs = fromIso ? Date.parse(fromIso) : NaN;
  const toMs = toIso ? Date.parse(toIso + (String(toIso).length <= 10 ? "T23:59:59.999Z" : "")) : NaN;
  const next = { ...(state || {}), activities: [...((state && state.activities) || [])] };
  const keep = [];
  let removed = 0;
  for (const a of next.activities) {
    if (activityInRange(a, fromMs, toMs)) removed += 1;
    else keep.push(a);
  }
  next.activities = keep;
  return { state: next, removed };
}

/**
 * Wipe user history on this device. Settings, including integration
 * toggles, stay so the user is not silently re-consented. Purchase records
 * are left alone so a later receipt check can still work.
 */
export function deleteEverything(state) {
  const prev = state || {};
  return {
    state: {
      ...prev,
      activities: [],
      courses: [],
      plans: Array.isArray(prev.plans) ? [] : prev.plans,
      goals: Array.isArray(prev.goals) ? [] : prev.goals,
      lastKnown: null,
      liveSession: null,
      draft: null,
    },
    removed: ((prev.activities || []).length + (prev.courses || []).length),
  };
}

export function backupPayload(state) {
  const raw = state && typeof state === "object" ? state : {};
  const out = { ...raw };
  for (const k of PURCHASE_KEYS) delete out[k];
  if (out.settings && typeof out.settings === "object") {
    const s = { ...out.settings };
    for (const k of PURCHASE_KEYS) delete s[k];
    out.settings = s;
  }
  return {
    app: "Heldpath",
    exportedAt: new Date().toISOString(),
    note: "This file was built on your phone. It is not uploaded anywhere unless you share it.",
    state: out,
  };
}

function fileSafe(name, fallback) {
  return String(name || fallback)
    .replace(/[^\w.\-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || fallback;
}

export function buildExportArchive(state) {
  const files = {};
  const json = JSON.stringify(backupPayload(state), null, 2);
  files["heldpath-backup.json"] = strToU8(json);
  const activities = (state && state.activities) || [];
  activities.forEach((act, i) => {
    const exportable = { ...act, track: act.rawTrack || act.track };
    const base = fileSafe((activityGpxName(exportable) || `activity-${i + 1}.gpx`).replace(/\.gpx$/i, ""), `activity-${i + 1}`);
    files[`activities/${base}.gpx`] = strToU8(activityToGpx(exportable));
    files[`activities/${base}.fit`] = activityToFit(exportable);
  });
  const courses = (state && state.courses) || [];
  courses.forEach((c, i) => {
    const name = fileSafe(courseGpxName(c) || `course-${i + 1}.gpx`, `course-${i + 1}.gpx`);
    files[`courses/${name}`] = strToU8(courseToGpx(c));
  });
  const zipped = zipSync(files, { level: 6 });
  const day = new Date().toISOString().slice(0, 10);
  return {
    name: `heldpath-export-${day}.zip`,
    bytes: zipped,
    files: Object.keys(files),
    count: {
      activities: activities.length,
      courses: courses.length,
      json: 1,
    },
  };
}

export async function exportAllData(state, { password } = {}) {
  const archive = buildExportArchive(state);
  let bytes = archive.bytes;
  let name = archive.name;
  let encrypted = false;
  if (password) {
    const wrapped = await encryptExport(bytes, password);
    bytes = wrapped.bytes;
    encrypted = !!wrapped.encrypted;
    if (encrypted) name = String(name || "heldpath-export.zip").replace(/\.zip$/i, "") + wrapped.ext;
  }
  const type = encrypted ? "application/octet-stream" : "application/zip";
  const saved = await exportBinaryFile(bytes, name, type);
  return { ...saved, archive, encrypted, name };
}

export async function exportAllJson(state) {
  const payload = backupPayload(state);
  const day = new Date().toISOString().slice(0, 10);
  const name = `heldpath-backup-${day}.json`;
  const saved = await exportTextFile(JSON.stringify(payload, null, 2), name, "application/json");
  return { ...saved, name };
}

export async function clearMapTileCache() {
  await wipeTiles();
  return { ok: true };
}


let runtimeSettings = {};
let runtimeChangeHook = null;

/** Keep a live copy so fetchers can check the toggle without importing app state. */
export function setPrivacyRuntime(settings) {
  runtimeSettings = migratePrivacySettings(settings || {});
  return runtimeSettings;
}

export function onPrivacyRuntimeChange(fn) {
  runtimeChangeHook = typeof fn === "function" ? fn : null;
}

function acceptIntegration(key) {
  runtimeSettings = setIntegration(runtimeSettings, key, true);
  try { if (runtimeChangeHook) runtimeChangeHook(runtimeSettings); } catch { /* ignore */ }
  return true;
}

export function allowsPhoton(settings) {
  const s = settings || runtimeSettings;
  return !!(s && s.photonOptIn);
}

export function allowsOverpass(settings) {
  const s = settings || runtimeSettings;
  return !!(s && s.overpassOptIn);
}

export function allowsYouTube(settings) {
  const s = settings || runtimeSettings;
  return !!(s && s.youtubeOptIn);
}

/** True if Photon or Overpass is enabled. Prefer the specific helpers. */
export function allowsOnlineLookup(settings) {
  return allowsPhoton(settings) || allowsOverpass(settings);
}

/**
 * First-time inline prompt. Returns true if the integration is already on,
 * or the user just accepted the disclaimer. Never throws.
 */
export function confirmOnlineUse(kind) {
  const on = kind === "photon" ? allowsPhoton() : kind === "youtube" ? allowsYouTube() : allowsOverpass();
  if (on) return true;
  const message = kind === "photon" ? PHOTON_CONSENT : kind === "youtube" ? YOUTUBE_CONSENT : OVERPASS_CONSENT;
  try {
    if (typeof window === "undefined" || typeof window.confirm !== "function") return false;
    if (!window.confirm(message)) return false;
    const key = kind === "photon" ? "photonOptIn" : kind === "youtube" ? "youtubeOptIn" : "overpassOptIn";
    return acceptIntegration(key);
  } catch {
    return false;
  }
}
