/**
 * Minimal FIT activity writer for on-device export.
 * Only time, position, elevation and heart rate are written. No Garmin
 * or Heldpath account is used; the file is built entirely on this phone.
 */
const GARMIN_EPOCH = 631065600; // 1989-12-31 UTC
const SEMI = 2147483648 / 180; // 2^31 / 180

const CRC_TABLE = [
  0x0000, 0xCC01, 0xD801, 0x1400, 0xF001, 0x3C00, 0x2800, 0xE401,
  0xA001, 0x6C00, 0x7800, 0xB401, 0x5000, 0x9C01, 0x8801, 0x4400,
];

export function fitCrc(bytes, crc = 0) {
  let c = crc & 0xffff;
  for (let i = 0; i < bytes.length; i++) {
    const byte = bytes[i] & 0xff;
    let tmp = CRC_TABLE[c & 0xf];
    c = (c >> 4) & 0x0fff;
    c = c ^ tmp ^ CRC_TABLE[byte & 0xf];
    tmp = CRC_TABLE[c & 0xf];
    c = (c >> 4) & 0x0fff;
    c = c ^ tmp ^ CRC_TABLE[(byte >> 4) & 0xf];
  }
  return c & 0xffff;
}

function toSemi(deg) {
  return Math.round(Number(deg) * SEMI) | 0;
}

function unixToFit(isoOrMs) {
  const ms = typeof isoOrMs === "number" ? isoOrMs : Date.parse(isoOrMs);
  const unix = Number.isFinite(ms) ? Math.floor(ms / 1000) : Math.floor(Date.now() / 1000);
  return Math.max(0, unix - GARMIN_EPOCH) >>> 0;
}

function pushU8(arr, n) { arr.push(n & 0xff); }
function pushU16(arr, n) { arr.push(n & 0xff, (n >> 8) & 0xff); }
function pushU32(arr, n) {
  const v = n >>> 0;
  arr.push(v & 0xff, (v >> 8) & 0xff, (v >> 16) & 0xff, (v >> 24) & 0xff);
}
function pushI32(arr, n) { pushU32(arr, n); }

function defMsg(local, global, fields) {
  const out = [0x40 | (local & 0x0f), 0, 0];
  pushU16(out, global);
  pushU8(out, fields.length);
  for (const f of fields) {
    pushU8(out, f.num);
    pushU8(out, f.size);
    pushU8(out, f.base);
  }
  return out;
}

function dataMsg(local, write) {
  const out = [local & 0x0f];
  write(out);
  return out;
}

function trackFromActivity(activity) {
  const started = activity && activity.startedAt ? Date.parse(activity.startedAt) : null;
  const src = (activity && (activity.rawTrack || activity.track)) || [];
  return src
    .filter((p) => p && Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lon)))
    .map((p, i) => {
      let at = p.at || null;
      if (!at && Number.isFinite(Number(p.t)) && Number.isFinite(started)) {
        at = started + Number(p.t) * 1000;
      } else if (at) {
        at = Date.parse(at);
      } else {
        at = (Number.isFinite(started) ? started : Date.now()) + i * 1000;
      }
      return {
        at,
        lat: Number(p.lat),
        lon: Number(p.lon),
        ele: Number.isFinite(Number(p.ele)) ? Number(p.ele) : null,
        hr: Number.isFinite(Number(p.hr)) ? Math.round(Number(p.hr)) : null,
      };
    });
}

function sportId(type) {
  if (type === "run") return 1;
  if (type === "ride") return 2;
  return 11; // walking
}

/**
 * Encode a completed activity as a binary FIT file (Uint8Array).
 */
export function activityToFit(activity) {
  const act = activity || {};
  const points = trackFromActivity(act);
  const startedAt = act.startedAt ? Date.parse(act.startedAt) : (points[0] && points[0].at) || Date.now();
  const endedAt = act.endedAt ? Date.parse(act.endedAt) : (points[points.length - 1] && points[points.length - 1].at) || startedAt;
  const startFit = unixToFit(startedAt);
  const endFit = unixToFit(endedAt);
  const elapsed = Math.max(0, Math.round(((Number.isFinite(endedAt) ? endedAt : startedAt) - startedAt) / 1000));
  const data = [];

  // local 0: file_id (mesg 0)
  data.push(...defMsg(0, 0, [
    { num: 0, size: 1, base: 0x00 }, // type enum
    { num: 1, size: 2, base: 0x84 }, // manufacturer uint16
    { num: 2, size: 2, base: 0x84 }, // product uint16
    { num: 3, size: 4, base: 0x8c }, // serial uint32z
    { num: 4, size: 4, base: 0x86 }, // time_created uint32
  ]));
  data.push(...dataMsg(0, (out) => {
    pushU8(out, 4); // activity
    pushU16(out, 255); // development
    pushU16(out, 1);
    pushU32(out, 0);
    pushU32(out, startFit);
  }));

  // local 1: record (mesg 20)
  data.push(...defMsg(1, 20, [
    { num: 253, size: 4, base: 0x86 }, // timestamp
    { num: 0, size: 4, base: 0x85 }, // position_lat
    { num: 1, size: 4, base: 0x85 }, // position_long
    { num: 2, size: 2, base: 0x84 }, // altitude (scale 5, offset 500)
    { num: 3, size: 1, base: 0x02 }, // heart_rate
  ]));
  for (const p of points) {
    data.push(...dataMsg(1, (out) => {
      pushU32(out, unixToFit(p.at));
      pushI32(out, toSemi(p.lat));
      pushI32(out, toSemi(p.lon));
      const alt = p.ele != null ? Math.max(0, Math.min(65535, Math.round((p.ele + 500) * 5))) : 0xffff;
      pushU16(out, alt);
      pushU8(out, p.hr != null ? Math.max(0, Math.min(255, p.hr)) : 0xff);
    }));
  }

  // local 2: session (mesg 18)
  data.push(...defMsg(2, 18, [
    { num: 253, size: 4, base: 0x86 },
    { num: 2, size: 4, base: 0x86 }, // start_time
    { num: 5, size: 1, base: 0x00 }, // sport
    { num: 7, size: 4, base: 0x86 }, // total_elapsed_time (ms scale 1000)
  ]));
  data.push(...dataMsg(2, (out) => {
    pushU32(out, endFit);
    pushU32(out, startFit);
    pushU8(out, sportId(act.type));
    pushU32(out, Math.round(elapsed * 1000));
  }));

  // local 3: activity (mesg 34)
  data.push(...defMsg(3, 34, [
    { num: 253, size: 4, base: 0x86 },
    { num: 0, size: 4, base: 0x86 }, // timestamp / total_timer
    { num: 1, size: 2, base: 0x84 }, // num_sessions
    { num: 2, size: 1, base: 0x00 }, // type
  ]));
  data.push(...dataMsg(3, (out) => {
    pushU32(out, endFit);
    pushU32(out, Math.round(elapsed * 1000));
    pushU16(out, 1);
    pushU8(out, 0);
  }));

  const body = Uint8Array.from(data);
  const header = new Uint8Array(14);
  header[0] = 14;
  header[1] = 0x10;
  header[2] = 0x2c; // profile 2092-ish
  header[3] = 0x08;
  header[4] = body.length & 0xff;
  header[5] = (body.length >> 8) & 0xff;
  header[6] = (body.length >> 16) & 0xff;
  header[7] = (body.length >> 24) & 0xff;
  header[8] = 0x2e; // .
  header[9] = 0x46; // F
  header[10] = 0x49; // I
  header[11] = 0x54; // T
  const headerCrc = fitCrc(header.subarray(0, 12));
  header[12] = headerCrc & 0xff;
  header[13] = (headerCrc >> 8) & 0xff;

  const crc = fitCrc(body, fitCrc(header));
  const out = new Uint8Array(header.length + body.length + 2);
  out.set(header, 0);
  out.set(body, 14);
  out[out.length - 2] = crc & 0xff;
  out[out.length - 1] = (crc >> 8) & 0xff;
  return out;
}

export function activityFitName(activity) {
  const when = activity && (activity.startedAt || activity.endedAt);
  const d = when ? new Date(when) : new Date();
  const date = Number.isFinite(d.getTime()) ? d.toISOString().slice(0, 10) : "activity";
  const type = (activity && activity.type) || "activity";
  return `heldpath-${type}-${date}.fit`;
}
