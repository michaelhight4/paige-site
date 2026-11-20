/**
 * Offline QR sharing for courses and plans.
 * The payload is the same compact template used by share links, then
 * deflate + base64url. A marathon-size route is split into a short
 * sequence of codes. Scanning works with no signal; nothing is fetched.
 *
 * Libraries (licence-checked):
 *   qrcode-generator 2.0.4 — MIT
 *   fflate 0.8.3 — MIT
 *   jsQR 1.4.0 — Apache-2.0
 */
import qrcode from "qrcode-generator";
import { deflateSync, inflateSync } from "fflate";
import jsQR from "jsqr";
import {
  bytesToB64url,
  b64urlToBytes,
  coursePayload,
  planPayload,
  decodeShare,
  decodeSharePayload,
} from "./share_link.js";

export const QR_PROTOCOL = "HP1";
/** Stay well under QR version-40 byte capacity so a phone can scan it. */
export const QR_CHUNK_CHARS = 900;

export function qrSvg(text, { cell = 4, margin = 2, ecl = "M" } = {}) {
  const qr = qrcode(0, ecl);
  qr.addData(String(text || ""), "Byte");
  qr.make();
  return qr.createSvgTag(cell, margin);
}

export function deflateB64url(text) {
  const bytes = deflateSync(new TextEncoder().encode(String(text)), { level: 9 });
  return bytesToB64url(bytes);
}

export function inflateB64url(token) {
  const bytes = inflateSync(b64urlToBytes(token));
  return new TextDecoder().decode(bytes);
}

/**
 * Build one or more HP1 QR payloads for a course or plan.
 * Course QRs use pins (the dense path is omitted) so a 100+ pin route
 * stays a short sequence. Plans use the template-only compact payload.
 */
export function encodeQrFrames(kind, obj, { maxChars = QR_CHUNK_CHARS, includePath = false } = {}) {
  const k = kind === "plan" ? "p" : "c";
  const payload = k === "p" ? planPayload(obj) : coursePayload(obj, { includePath });
  const token = deflateB64url(JSON.stringify(payload));
  const reserve = `HP1/${k}/999/999/`.length;
  const chunkSize = Math.max(48, (Number(maxChars) || QR_CHUNK_CHARS) - reserve);
  const total = Math.max(1, Math.ceil(token.length / chunkSize));
  const frames = [];
  for (let i = 0; i < total; i++) {
    const chunk = token.slice(i * chunkSize, (i + 1) * chunkSize);
    frames.push(`HP1/${k}/${total}/${i + 1}/${chunk}`);
  }
  return {
    ok: true,
    kind: k === "p" ? "plan" : "course",
    frames,
    total,
    tokenLength: token.length,
  };
}

export function parseQrFrame(text) {
  const raw = String(text || "").trim();
  if (!raw) return { ok: false, error: "empty" };
  const m = /^HP1\/([cp])\/(\d+)\/(\d+)\/([A-Za-z0-9_-]*)$/.exec(raw);
  if (m) {
    const total = Number(m[2]);
    const index = Number(m[3]);
    if (!Number.isFinite(total) || total < 1 || !Number.isFinite(index) || index < 1 || index > total) {
      return { ok: false, error: "bad_index" };
    }
    return {
      ok: true,
      protocol: "HP1",
      kind: m[1] === "p" ? "plan" : "course",
      total,
      index,
      chunk: m[4],
    };
  }
  const decoded = decodeShare(raw);
  if (decoded.ok) {
    return { ok: true, protocol: "link", kind: decoded.kind, total: 1, index: 1, decoded };
  }
  return { ok: false, error: "not_a_heldpath_qr" };
}

export function decodeQrFrames(frames) {
  const parsed = (frames || []).map((text) => parseQrFrame(text));
  if (parsed.length === 1 && parsed[0].ok && parsed[0].protocol === "link") {
    return parsed[0].decoded;
  }
  const parts = parsed.filter((p) => p.ok && p.protocol === "HP1");
  if (!parts.length) return { ok: false, error: "not_a_heldpath_qr" };
  const total = parts[0].total;
  const kind = parts[0].kind;
  if (parts.some((p) => p.total !== total || p.kind !== kind)) {
    return { ok: false, error: "mixed_frames" };
  }
  const slots = Array(total).fill(null);
  for (const p of parts) slots[p.index - 1] = p.chunk;
  const got = slots.filter((c) => c != null).length;
  if (got < total) return { ok: false, error: "incomplete", got, total };
  let json;
  try {
    json = inflateB64url(slots.join(""));
  } catch {
    return { ok: false, error: "bad_encoding" };
  }
  let payload;
  try {
    payload = JSON.parse(json);
  } catch {
    return { ok: false, error: "bad_json" };
  }
  return decodeSharePayload(payload);
}

export function createQrAssembler() {
  let kind = null;
  let total = 0;
  let slots = [];
  const seen = new Set();
  return {
    add(text) {
      const raw = String(text || "").trim();
      if (!raw) return { status: "ignore", error: "empty" };
      if (seen.has(raw)) return { status: "duplicate", got: slots.filter(Boolean).length, total, kind };
      const parsed = parseQrFrame(raw);
      if (!parsed.ok) return { status: "ignore", error: parsed.error };
      if (parsed.protocol === "link") {
        seen.add(raw);
        return { status: "complete", decoded: parsed.decoded, got: 1, total: 1 };
      }
      if (kind && (parsed.kind !== kind || parsed.total !== total)) {
        kind = null;
        total = 0;
        slots = [];
        seen.clear();
      }
      if (!kind) {
        kind = parsed.kind;
        total = parsed.total;
        slots = Array(total).fill(null);
      }
      seen.add(raw);
      slots[parsed.index - 1] = parsed.chunk;
      const got = slots.filter((c) => c != null).length;
      if (got < total) return { status: "need_more", got, total, kind, index: parsed.index };
      const rebuilt = slots.map((chunk, i) => `HP1/${kind === "plan" ? "p" : "c"}/${total}/${i + 1}/${chunk}`);
      const decoded = decodeQrFrames(rebuilt);
      return decoded.ok
        ? { status: "complete", decoded, got, total }
        : { status: "error", error: decoded.error, got, total };
    },
    reset() {
      kind = null;
      total = 0;
      slots = [];
      seen.clear();
    },
  };
}

export function qrMatrixImageData(text, { scale = 6, margin = 4 } = {}) {
  const qr = qrcode(0, "M");
  qr.addData(String(text || ""), "Byte");
  qr.make();
  const n = qr.getModuleCount();
  const size = (n + margin * 2) * scale;
  const data = new Uint8ClampedArray(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const mx = Math.floor(x / scale) - margin;
      const my = Math.floor(y / scale) - margin;
      const dark = mx >= 0 && my >= 0 && mx < n && my < n && qr.isDark(my, mx);
      const v = dark ? 0 : 255;
      const i = (y * size + x) * 4;
      data[i] = data[i + 1] = data[i + 2] = v;
      data[i + 3] = 255;
    }
  }
  return { data, width: size, height: size };
}

export function scanQrImageData(image) {
  const code = jsQR(image.data, image.width, image.height);
  return code && code.data ? String(code.data) : null;
}

/** Render a QR, scan the pixels, and return the recovered text. */
export function pixelRoundTrip(text) {
  return scanQrImageData(qrMatrixImageData(text));
}
