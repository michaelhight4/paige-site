/**
 * Group Run: a meet-up on a saved course, with a pre-filled SMS invite
 * and a calendar event. Contacts stay in the phone's SMS app — Heldpath
 * never reads the address book.
 */
import { uid, isoDate, etaSeconds, activityMph, pathLengthMeters } from "./util.js";
import { encodeCourse } from "./share_link.js";

export function courseLengthOf(course) {
  if (course && Array.isArray(course.path) && course.path.length >= 2) {
    return pathLengthMeters(course.path);
  }
  return pathLengthMeters((course && course.pins) || []);
}

export function makeGroupRun({ course, startAt, activityType = "walk", now = new Date() } = {}) {
  if (!course || !Array.isArray(course.pins) || course.pins.length < 2) {
    return { ok: false, error: "no_course" };
  }
  const start = startAt instanceof Date ? startAt : new Date(startAt);
  if (Number.isNaN(start.getTime())) return { ok: false, error: "bad_time" };
  const type = activityType === "run" ? "run" : "walk";
  const share = encodeCourse(course);
  const durationSec = Math.max(30 * 60, etaSeconds(courseLengthOf(course), activityMph(type)));
  const created = now instanceof Date ? now : new Date(now);
  const run = {
    id: uid("group"),
    title: `Group ${type} · ${course.name}`,
    activityType: type,
    courseId: course.id || null,
    courseName: String(course.name || "Course").slice(0, 48),
    startAt: start.toISOString(),
    endAt: new Date(start.getTime() + durationSec * 1000).toISOString(),
    shareUrl: share.url,
    createdAt: created.toISOString(),
  };
  return { ok: true, run, share };
}

export function formatWhen(iso, { timeZone } = {}) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const opts = {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  };
  if (timeZone) opts.timeZone = timeZone;
  return d.toLocaleString("en-US", opts);
}

export function formatWhenShort(iso, { timeZone } = {}) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const opts = { hour: "numeric", minute: "2-digit" };
  if (timeZone) opts.timeZone = timeZone;
  return d.toLocaleTimeString("en-US", opts);
}

export function inviteMessage(run, opts = {}) {
  const when = formatWhen(run && run.startAt, opts);
  const verb = run && run.activityType === "run" ? "run" : "walk";
  const name = (run && run.courseName) || "this course";
  const url = (run && run.shareUrl) || "";
  return `Join me for a ${verb} on ${name}, ${when}. ${url}`.trim();
}

export function smsHref(run, { userAgent, timeZone } = {}) {
  const body = encodeURIComponent(inviteMessage(run, { timeZone }));
  const ua = userAgent || (typeof navigator !== "undefined" ? navigator.userAgent : "");
  const ios = /iPhone|iPad|iPod/i.test(ua);
  return ios ? `sms:&body=${body}` : `sms:?body=${body}`;
}

export function icsEscape(text) {
  return String(text || "")
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

export function icsUtcStamp(d) {
  return new Date(d).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function foldIcsLine(line) {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return [line];
  const out = [];
  let raw = line;
  while (raw) {
    let cut = 75;
    if (out.length) cut = 74; // leading space counts
    // Don't split mid-codepoint: walk back if we land in a surrogate or UTF-8-ish char
    let chunk = raw.slice(0, cut);
    while (chunk.length && chunk.charCodeAt(chunk.length - 1) >= 0xD800 && chunk.charCodeAt(chunk.length - 1) <= 0xDBFF) {
      chunk = chunk.slice(0, -1);
    }
    if (!chunk.length) chunk = raw.slice(0, 1);
    out.push((out.length ? " " : "") + chunk);
    raw = raw.slice(chunk.length);
  }
  return out;
}

export function icsText(run, opts = {}) {
  const uid = `${run.id}@paigegames.net`;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Paige Games//Heldpath//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${icsUtcStamp(run.createdAt || run.startAt)}`,
    `DTSTART:${icsUtcStamp(run.startAt)}`,
    `DTEND:${icsUtcStamp(run.endAt)}`,
    `SUMMARY:${icsEscape(run.title)}`,
    `DESCRIPTION:${icsEscape(inviteMessage(run, opts))}`,
    `URL:${run.shareUrl}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  const folded = [];
  for (const line of lines) folded.push(...foldIcsLine(line));
  return folded.join("\r\n") + "\r\n";
}

export function icsFileName(run) {
  const slug = String(run && run.courseName || "group-run")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "group-run";
  return `heldpath-${slug}.ics`;
}

/** A calendar row that sits in state.plans next to ordinary scheduled sessions. */
export function calendarRowFor(run) {
  return {
    id: `gcal_${run.id}`,
    date: isoDate(new Date(run.startAt)),
    courseId: run.courseId || null,
    courseName: run.courseName,
    activityType: run.activityType,
    groupRunId: run.id,
    startAt: run.startAt,
    sourcePlanId: null,
    sourceSessionDate: null,
    targetLengthMeters: null,
    targetSec: null,
    routePins: null,
  };
}

export function addGroupRunToState(state, run) {
  if (!Array.isArray(state.groupRuns)) state.groupRuns = [];
  state.groupRuns = state.groupRuns.filter((g) => g.id !== run.id);
  state.groupRuns.push(run);
  if (!Array.isArray(state.plans)) state.plans = [];
  const row = calendarRowFor(run);
  state.plans = state.plans.filter((p) => p.id !== row.id && p.groupRunId !== run.id);
  state.plans.push(row);
  return { run, row };
}

export function removeGroupRunFromState(state, runId) {
  state.groupRuns = (state.groupRuns || []).filter((g) => g.id !== runId);
  state.plans = (state.plans || []).filter((p) => p.groupRunId !== runId && p.id !== `gcal_${runId}`);
  return state;
}
