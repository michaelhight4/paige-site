/**
 * Share-sheet activity cards.
 *
 * Draws a route outline, distance, time, pace or speed and (when a course has
 * a goal) the F1-style sector times onto an image, then hands the image to the
 * system share sheet. Nothing is uploaded: the phone's share sheet decides
 * where the picture goes. The start address is never drawn on the card.
 *
 * Extends the existing sharing systems rather than replacing them:
 * share_link.js keeps the course/plan URL fragment, share_qr.js keeps QR.
 */
import {
  formatDistance,
  formatDuration,
  formatPace,
  pathLengthMeters,
  METERS_PER_KM,
  METERS_PER_MILE,
} from "./util.js";

export const CARD_WIDTH = 1080;
export const CARD_HEIGHT = 1350;
export const THEME = {
  bg: "#12161C",
  panel: "#1A2028",
  blue: "#4EC3F7",
  mint: "#B8F3D0",
  gold: "#F3E0A8",
  text: "#E8EEF3",
  dim: "#8A9AA8",
  line: "#2A333D",
};

function slug(text, fallback = "card") {
  return String(text || fallback)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 36) || fallback;
}

function typeLabel(type) {
  return type === "ride" ? "RIDE" : type === "run" ? "RUN" : "WALK";
}

function speedLabel(meters, seconds, units) {
  if (!(meters > 0) || !(seconds > 0)) return "—";
  const mph = (meters / METERS_PER_MILE) / (seconds / 3600);
  const kmh = (meters / METERS_PER_KM) / (seconds / 3600);
  return units === "km" ? `${kmh.toFixed(1)} km/h avg` : `${mph.toFixed(1)} mph avg`;
}

function dateLabel(iso) {
  const d = iso ? new Date(iso) : new Date();
  if (!Number.isFinite(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function cleanPoints(points) {
  return (points || [])
    .map((p) => ({ lat: Number(p && p.lat), lon: Number(p && (p.lon != null ? p.lon : p.lng)) }))
    .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon));
}

export function cardModel({ activity = null, course = null, units = "mi", sectors = [] } = {}) {
  const act = activity || null;
  const c = course || null;
  const type = (act && act.type) || (c && c.activityType) || "walk";
  const points = cleanPoints(
    act ? (act.track && act.track.length ? act.track : c && (c.path || c.pins)) : (c && (c.path || c.pins))
  );
  const meters = act
    ? Number(act.distanceMeters) || (points.length >= 2 ? pathLengthMeters(points) : 0)
    : (c && pathLengthMeters(c.path || c.pins)) || 0;
  const seconds = act
    ? Number(act.elapsedSec) || 0
    : Number(c && c.goal && c.goal.finishSec) || 0;
  const when = (act && (act.endedAt || act.startedAt)) || (c && c.createdAt) || null;
  const title = (act && (act.courseName || act.name)) || (c && c.name) || `Heldpath ${type}`;
  const pace = type === "ride"
    ? speedLabel(meters, seconds, units)
    : (meters > 0 && seconds > 0 ? `${formatPace(meters, seconds, units)} avg` : "—");
  const sectorRows = (sectors || []).slice(0, 12).map((s, i) => ({
    label: String((s && (s.label || s.name)) || `S${i + 1}`).slice(0, 26),
    time: Number(s && (s.seconds != null ? s.seconds : s.time)) || 0,
  }));
  return {
    title: String(title).slice(0, 60),
    typeLabel: typeLabel(type),
    dateLabel: dateLabel(when),
    distanceLabel: meters > 0 ? formatDistance(meters, units) : "—",
    timeLabel: seconds > 0 ? formatDuration(seconds) : "—",
    paceLabel: pace,
    paceCaption: type === "ride" ? "Speed" : "Pace",
    units: units === "km" ? "km" : "mi",
    points,
    meters,
    seconds,
    sectors: sectorRows,
    hasRoute: points.length >= 2,
  };
}

/** Project lat/lon into a padded box while keeping the true shape. */
export function projectPoints(points, { x = 0, y = 0, width = CARD_WIDTH, height = 560, pad = 64 } = {}) {
  const pts = cleanPoints(points);
  if (pts.length < 2) return [];
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
  const spanX = Math.max((maxLon - minLon) * cos, 1e-9);
  const spanY = Math.max(maxLat - minLat, 1e-9);
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;
  const scale = Math.min(innerW / spanX, innerH / spanY);
  const ox = x + pad + (innerW - spanX * scale) / 2;
  const oy = y + pad + (innerH - spanY * scale) / 2;
  return pts.map((p) => ({
    x: ox + (p.lon - minLon) * cos * scale,
    y: oy + (maxLat - p.lat) * scale,
  }));
}

export function cardSvg(model, { width = CARD_WIDTH, height = CARD_HEIGHT } = {}) {
  const m = model || cardModel({});
  const projected = projectPoints(m.points, { x: 48, y: 170, width: width - 96, height: 520, pad: 10 });
  const d = projected.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const start = projected[0];
  const end = projected[projected.length - 1];
  const sectorRows = m.sectors.map((s, i) => `
    <g transform="translate(48, ${860 + i * 48})">
      <text x="0" y="20" fill="${THEME.dim}" font-family="sans-serif" font-size="26">${escapeText(s.label)}</text>
      <text x="${width - 96}" y="20" text-anchor="end" fill="${THEME.mint}" font-family="sans-serif" font-size="28">${escapeText(formatDuration(s.time))}</text>
    </g>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="Heldpath activity card">
    <rect width="${width}" height="${height}" fill="${THEME.bg}" />
    <text x="48" y="84" fill="${THEME.blue}" font-family="sans-serif" font-size="34" font-weight="700" letter-spacing="4">HELDPATH</text>
    <text x="${width - 48}" y="84" text-anchor="end" fill="${THEME.gold}" font-family="sans-serif" font-size="28">${m.typeLabel}</text>
    <text x="48" y="132" fill="${THEME.text}" font-family="sans-serif" font-size="32">${escapeText(m.title)}</text>
    <text x="${width - 48}" y="132" text-anchor="end" fill="${THEME.dim}" font-family="sans-serif" font-size="24">${escapeText(m.dateLabel)}</text>
    <rect x="48" y="170" width="${width - 96}" height="520" rx="24" fill="${THEME.panel}" />
    ${d ? `<path d="${d}" fill="none" stroke="${THEME.blue}" stroke-width="7" stroke-linejoin="round" stroke-linecap="round" />` : ""}
    ${start ? `<circle cx="${start.x.toFixed(1)}" cy="${start.y.toFixed(1)}" r="11" fill="${THEME.mint}" />` : ""}
    ${end ? `<circle cx="${end.x.toFixed(1)}" cy="${end.y.toFixed(1)}" r="11" fill="${THEME.text}" />` : ""}
    ${m.hasRoute ? "" : `<text x="${width / 2}" y="440" text-anchor="middle" fill="${THEME.dim}" font-family="sans-serif" font-size="28">No GPS track for this session</text>`}
    <text x="48" y="770" fill="${THEME.dim}" font-family="sans-serif" font-size="26">Distance</text>
    <text x="48" y="838" fill="${THEME.text}" font-family="sans-serif" font-size="72" font-weight="700">${escapeText(m.distanceLabel)}</text>
    <text x="${width / 2}" y="770" fill="${THEME.dim}" font-family="sans-serif" font-size="26">Time</text>
    <text x="${width / 2}" y="838" fill="${THEME.text}" font-family="sans-serif" font-size="72" font-weight="700">${escapeText(m.timeLabel)}</text>
    <text x="${width - 48}" y="770" text-anchor="end" fill="${THEME.dim}" font-family="sans-serif" font-size="26">${m.paceCaption}</text>
    <text x="${width - 48}" y="838" text-anchor="end" fill="${THEME.mint}" font-family="sans-serif" font-size="42">${escapeText(m.paceLabel)}</text>
    ${sectorRows}
    <text x="48" y="${height - 40}" fill="${THEME.dim}" font-family="sans-serif" font-size="22">Made with Heldpath. No account, no server relay.</text>
  </svg>`;
}

function escapeText(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/** Draw the card on a canvas. Returns the canvas (or null off-DOM). */
export function drawCard(canvas, model) {
  if (!canvas || !canvas.getContext) return null;
  const m = model || cardModel({});
  const width = canvas.width || CARD_WIDTH;
  const height = canvas.height || CARD_HEIGHT;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = THEME.bg;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = THEME.blue;
  ctx.font = "700 34px system-ui, -apple-system, Segoe UI, sans-serif";
  ctx.fillText("HELDPATH", 48, 84);
  ctx.fillStyle = THEME.gold;
  ctx.textAlign = "right";
  ctx.font = "600 28px system-ui, -apple-system, Segoe UI, sans-serif";
  ctx.fillText(m.typeLabel, width - 48, 84);
  ctx.fillStyle = THEME.text;
  ctx.textAlign = "left";
  ctx.font = "500 32px system-ui, -apple-system, Segoe UI, sans-serif";
  ctx.fillText(clip(ctx, m.title, width - 300), 48, 132);
  ctx.fillStyle = THEME.dim;
  ctx.textAlign = "right";
  ctx.font = "400 24px system-ui, -apple-system, Segoe UI, sans-serif";
  ctx.fillText(m.dateLabel, width - 48, 132);
  ctx.textAlign = "left";

  ctx.fillStyle = THEME.panel;
  roundRect(ctx, 48, 170, width - 96, 520, 24);
  ctx.fill();

  const projected = projectPoints(m.points, { x: 48, y: 170, width: width - 96, height: 520, pad: 16 });
  if (projected.length >= 2) {
    ctx.strokeStyle = THEME.blue;
    ctx.lineWidth = 7;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.beginPath();
    projected.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.stroke();
    const a = projected[0];
    const b = projected[projected.length - 1];
    ctx.fillStyle = THEME.mint;
    ctx.beginPath(); ctx.arc(a.x, a.y, 11, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = THEME.text;
    ctx.beginPath(); ctx.arc(b.x, b.y, 11, 0, Math.PI * 2); ctx.fill();
  } else {
    ctx.fillStyle = THEME.dim;
    ctx.textAlign = "center";
    ctx.font = "400 28px system-ui, -apple-system, Segoe UI, sans-serif";
    ctx.fillText("No GPS track for this session", width / 2, 440);
    ctx.textAlign = "left";
  }

  const third = (width - 96) / 3;
  ctx.fillStyle = THEME.dim;
  ctx.font = "400 26px system-ui, -apple-system, Segoe UI, sans-serif";
  ctx.fillText("Distance", 48, 770);
  ctx.fillText("Time", 48 + third, 770);
  ctx.textAlign = "right";
  ctx.fillText(m.paceCaption, width - 48, 770);
  ctx.textAlign = "left";
  ctx.fillStyle = THEME.text;
  ctx.font = "700 68px system-ui, -apple-system, Segoe UI, sans-serif";
  ctx.fillText(m.distanceLabel, 48, 838);
  ctx.fillText(m.timeLabel, 48 + third, 838);
  ctx.textAlign = "right";
  ctx.fillStyle = THEME.mint;
  ctx.font = "600 40px system-ui, -apple-system, Segoe UI, sans-serif";
  ctx.fillText(m.paceLabel, width - 48, 838);
  ctx.textAlign = "left";

  ctx.font = "400 26px system-ui, -apple-system, Segoe UI, sans-serif";
  m.sectors.slice(0, 12).forEach((s, i) => {
    const y = 916 + i * 46;
    ctx.fillStyle = THEME.dim;
    ctx.fillText(s.label, 48, y);
    ctx.textAlign = "right";
    ctx.fillStyle = THEME.mint;
    ctx.fillText(formatDuration(s.time), width - 48, y);
    ctx.textAlign = "left";
  });

  ctx.fillStyle = THEME.dim;
  ctx.font = "400 22px system-ui, -apple-system, Segoe UI, sans-serif";
  ctx.fillText("Made with Heldpath. No account, no server relay.", 48, height - 40);
  return canvas;
}

function clip(ctx, text, maxWidth) {
  let s = String(text || "");
  if (ctx.measureText(s).width <= maxWidth) return s;
  while (s.length > 4 && ctx.measureText(`${s}…`).width > maxWidth) s = s.slice(0, -1);
  return `${s}…`;
}

export function cardFileName(model) {
  const m = model || {};
  const date = new Date().toISOString().slice(0, 10);
  return `heldpath-${slug(m.title, "activity")}-${date}.png`;
}

export function canvasToBlob(canvas) {
  if (!canvas || !canvas.toBlob) return Promise.resolve(null);
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), "image/png"));
}

function makeCanvas(width, height) {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

/**
 * Build and share an activity or course card.
 * @returns {Promise<{ok:boolean,shared?:boolean,saved?:boolean,name?:string,reason?:string}>}
 */
export async function shareActivityCard({ activity = null, course = null, units = "mi", sectors = [] } = {}) {
  const model = cardModel({ activity, course, units, sectors });
  const name = cardFileName(model);
  const canvas = makeCanvas(CARD_WIDTH, CARD_HEIGHT);
  if (!canvas) return { ok: false, reason: "This device cannot draw a card here." };
  drawCard(canvas, model);
  const blob = await canvasToBlob(canvas);
  if (!blob) return { ok: false, reason: "Could not draw the card." };
  if (typeof File !== "undefined" && typeof navigator !== "undefined" && navigator.canShare) {
    try {
      const file = new File([blob], name, { type: "image/png" });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: model.title,
          text: `${model.distanceLabel} · ${model.timeLabel} · ${model.paceLabel}`,
        });
        return { ok: true, shared: true, name };
      }
    } catch (err) {
      if (err && err.name === "AbortError") return { ok: false, cancelled: true, name };
    }
  }
  if (typeof document !== "undefined" && URL && URL.createObjectURL) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    return { ok: true, saved: true, name };
  }
  return { ok: false, reason: "This device cannot save the card here." };
}
