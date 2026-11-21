/**
 * On-device export of completed activities and courses.
 *
 * GPX 1.1 is the universal interchange format, so a Heldpath walk, run or
 * ride can go to any other tracker without an account or a backend. Track
 * points carry time, elevation and heart rate (the GPX TrackPointExtension
 * shape used by Garmin and Strava). Course export is a GPX route with the
 * saved pins as waypoints plus a track for the routed line.
 *
 * The existing .paceplan export in plans_ui.js keeps working unchanged; this
 * file deliberately does not touch plan files or purchase tokens.
 */
import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { pathLengthMeters } from "./util.js";

export const GPX_CREATOR = "Heldpath";
export const GPX_NS = "http://www.topografix.com/GPX/1/1";
export const GPX_TPX_NS = "http://www.garmin.com/xmlschemas/TrackPointExtension/v1";

function esc(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function slug(text, fallback = "activity") {
  return String(text || fallback)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || fallback;
}

export function xmlStamp(value) {
  const d = value instanceof Date ? value : new Date(value);
  return Number.isFinite(d.getTime()) ? d.toISOString().replace(/\.\d{3}Z$/, "Z") : new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

function trackFromActivity(activity) {
  const started = activity && activity.startedAt ? Date.parse(activity.startedAt) : null;
  return ((activity && activity.track) || [])
    .filter((p) => p && Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lon)))
    .map((p, i) => {
      let at = p.at || null;
      if (!at && Number.isFinite(Number(p.t)) && Number.isFinite(started)) {
        at = new Date(started + Number(p.t) * 1000).toISOString();
      }
      return {
        lat: Number(p.lat),
        lon: Number(p.lon),
        ele: Number.isFinite(Number(p.ele)) ? Number(p.ele) : null,
        hr: Number.isFinite(Number(p.hr)) ? Math.round(Number(p.hr)) : null,
        at,
        t: Number.isFinite(Number(p.t)) ? Number(p.t) : i,
      };
    });
}

function pointXml(p, { indent = "      " } = {}) {
  const bits = [`${indent}<trkpt lat="${p.lat.toFixed(7)}" lon="${p.lon.toFixed(7)}">`];
  if (p.ele != null) bits.push(`${indent}  <ele>${p.ele.toFixed(1)}</ele>`);
  if (p.at) bits.push(`${indent}  <time>${xmlStamp(p.at)}</time>`);
  if (p.hr != null) {
    bits.push(`${indent}  <extensions><gpxtpx:TrackPointExtension><gpxtpx:hr>${p.hr}</gpxtpx:hr></gpxtpx:TrackPointExtension></extensions>`);
  }
  bits.push(`${indent}</trkpt>`);
  return bits.join("\n");
}

/**
 * A completed activity as GPX. Only track, time, elevation and HR travel;
 * health ids, import hashes, notes and any purchase data never do.
 */
export function activityToGpx(activity) {
  const act = activity || {};
  const points = trackFromActivity(act);
  const type = act.type === "run" || act.type === "ride" ? act.type : "walk";
  const name = String(act.courseName || act.name || `Heldpath ${type}`).slice(0, 120);
  const start = act.startedAt || (points[0] && points[0].at) || new Date().toISOString();
  const rows = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<gpx version="1.1" creator="${GPX_CREATOR}" xmlns="${GPX_NS}" xmlns:gpxtpx="${GPX_TPX_NS}">`,
    "  <metadata>",
    `    <name>${esc(name)}</name>`,
    `    <time>${xmlStamp(start)}</time>`,
    "  </metadata>",
    `  <trk>`,
    `    <name>${esc(name)}</name>`,
    `    <type>${esc(type === "ride" ? "cycling" : type === "run" ? "running" : "walking")}</type>`,
    "    <trkseg>",
    ...points.map((p) => pointXml(p)),
    "    </trkseg>",
    "  </trk>",
    "</gpx>",
    "",
  ];
  return rows.join("\n");
}

function coursePoints(course) {
  const path = course && Array.isArray(course.path) && course.path.length >= 2 ? course.path : (course && course.pins) || [];
  return path
    .filter((p) => p && Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lon)))
    .map((p) => ({ lat: Number(p.lat), lon: Number(p.lon), ele: Number.isFinite(Number(p.ele)) ? Number(p.ele) : null }));
}

/** A saved course as a GPX route, with its saved pins as waypoints. */
export function courseToGpx(course) {
  const c = course || {};
  const name = String(c.name || "Heldpath course").slice(0, 120);
  const pins = (c.pins || [])
    .filter((p) => p && Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lon)))
    .slice(0, 500);
  const points = coursePoints(c);
  const meters = pathLengthMeters(points);
  const rows = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<gpx version="1.1" creator="${GPX_CREATOR}" xmlns="${GPX_NS}">`,
    "  <metadata>",
    `    <name>${esc(name)}</name>`,
    `    <desc>Heldpath course · ${meters > 0 ? Math.round(meters) : 0} m</desc>`,
    "  </metadata>",
    ...pins.map((p, i) => {
      const role = p.role === "start" ? "Start" : p.role === "end" ? "Finish" : `Pin ${i + 1}`;
      return `  <wpt lat="${Number(p.lat).toFixed(7)}" lon="${Number(p.lon).toFixed(7)}"><name>${esc(role)}</name></wpt>`;
    }),
    "  <rte>",
    `    <name>${esc(name)}</name>`,
    ...points.map((p) => {
      const ele = p.ele != null ? `<ele>${p.ele.toFixed(1)}</ele>` : "";
      return `    <rtept lat="${p.lat.toFixed(7)}" lon="${p.lon.toFixed(7)}">${ele}</rtept>`;
    }),
    "  </rte>",
    "</gpx>",
    "",
  ];
  return rows.join("\n");
}

export function activityGpxName(activity) {
  const when = activity && (activity.startedAt || activity.endedAt);
  const d = when ? new Date(when) : new Date();
  const date = Number.isFinite(d.getTime()) ? d.toISOString().slice(0, 10) : "activity";
  return `heldpath-${slug(activity && (activity.courseName || activity.name), activity && activity.type) || "activity"}-${date}.gpx`;
}

export function courseGpxName(course) {
  return `heldpath-course-${slug(course && course.name, "course")}.gpx`;
}

async function saveBlob({ text, bytes, name, mime }) {
  const blob = bytes ? new Blob([bytes], { type: mime }) : new Blob([text], { type: mime });
  if (Capacitor.isNativePlatform()) {
    try {
      const data = bytes ? await blobToBase64(blob) : text;
      await Filesystem.writeFile({
        path: name,
        data,
        directory: Directory.Documents,
        ...(bytes ? {} : { encoding: Encoding.UTF8 }),
        recursive: true,
      });
      return { ok: true, saved: true, name, where: "Documents" };
    } catch { /* fall through */ }
  }
  if (typeof document !== "undefined") {
    try {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      return { ok: true, saved: true, name, where: "download" };
    } catch { /* fall through */ }
  }
  return { ok: false, saved: false, name, reason: "This device cannot save a file here." };
}

export function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || "").replace(/^data:[^,]*,/, ""));
    reader.onerror = () => reject(reader.error || new Error("read failed"));
    reader.readAsDataURL(blob);
  });
}

/** Save a text file to Documents on a phone, or trigger a browser download. */
export function exportTextFile(text, name, mime = "application/gpx+xml") {
  return saveBlob({ text, name, mime });
}

export function exportActivityGpx(activity) {
  return exportTextFile(activityToGpx(activity), activityGpxName(activity));
}

export function exportCourseGpx(course) {
  return exportTextFile(courseToGpx(course), courseGpxName(course));
}

/**
 * Share a text file through the system share sheet when the WebView supports
 * files, otherwise save it. No Heldpath server is involved.
 */
export async function shareTextFile(text, name, mime = "application/gpx+xml", { title = "Heldpath" } = {}) {
  if (typeof File !== "undefined" && typeof navigator !== "undefined" && navigator.canShare) {
    try {
      const file = new File([text], name, { type: mime });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title });
        return { ok: true, shared: true, name };
      }
    } catch (err) {
      if (err && err.name === "AbortError") return { ok: false, cancelled: true, name };
    }
  }
  const saved = await exportTextFile(text, name, mime);
  return { ...saved, shared: false };
}
