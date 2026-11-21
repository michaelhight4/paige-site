/**
 * Post-run Summary and More Details (both free).
 *
 * Summary leads with the F1 timing tower: one colour-coded row per sector,
 * GOAL and PR columns, cumulative delta and best-possible. Multi-lap runs
 * show the best sector time first and expand to per-lap times.
 *
 * More Details carries the full map (drawn by app.js on the shared map),
 * elevation, the full sector table and health-app calories. Targets stay
 * even-pace from the goal; elevation is never in the target math.
 *
 * Sector rows use the existing formatSectorTime / formatSectorDelta style
 * from sector_timing.js. Reference: sector_timing.js and the live
 * sector-flash tower in app.js.
 */
import {
  formatDistance,
  formatDuration,
  formatPace,
  escapeHtml,
  haversineMeters,
  METERS_PER_MILE,
  METERS_PER_KM,
} from "./util.js";
import {
  formatSectorTime,
  formatSectorDelta,
  sectorMetersList,
  sectorTimesFromTrack,
  sectorTargets,
  readSectorPbs,
  hasSectorHistory,
  resolveGoal,
  compareSectors,
  applySectorResult,
  bestPossibleSec,
} from "./sector_timing.js";
import { analyzeLapGate } from "./lap_gate.js";

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** Speed for rides (the only sport where speed replaces pace). */
export function formatSpeed(meters, seconds, units = "mi") {
  const m = num(meters);
  const s = num(seconds);
  if (!(m > 0) || !(s > 0)) return "—";
  const perHour = units === "km" ? (m / 1000) / (s / 3600) : (m / METERS_PER_MILE) / (s / 3600);
  if (!Number.isFinite(perHour)) return "—";
  return `${perHour.toFixed(1)} ${units === "km" ? "km/h" : "mph"}`;
}

export function paceOrSpeed(act, meters, units = "mi") {
  if (act && act.type === "ride") return { label: "Avg speed", value: formatSpeed(meters, act.elapsedSec, units) };
  return { label: "Avg pace", value: formatPace(meters, act.elapsedSec, units) };
}

/** Heart rate only when a health app or imported file actually supplied it. */
export function heartRateInfo(act) {
  const h = (act && act.health) || {};
  const direct = [
    h.avgHeartRate, h.averageHeartRate, h.heartRate, h.avgHr, h.hr,
    act && act.avgHeartRate, act && act.averageHeartRate, act && act.heartRate,
  ].map(Number).find((n) => Number.isFinite(n) && n > 0);
  let sum = 0, count = 0, min = Infinity, max = -Infinity;
  for (const p of (act && act.track) || []) {
    const v = Number(p && (p.hr != null ? p.hr : p.heartRate));
    if (!Number.isFinite(v) || v <= 0) continue;
    sum += v; count += 1;
    if (v < min) min = v;
    if (v > max) max = v;
  }
  const avg = direct || (count ? sum / count : null);
  if (!(avg > 0)) return null;
  return {
    avg: Math.round(avg),
    min: count ? Math.round(min) : null,
    max: count ? Math.round(max) : null,
    samples: count,
    from: h.provider || null,
  };
}

/**
 * One F1 row line, exactly the app's tower pattern:
 *   GOAL 5:00.0 / TIME −0:07.7
 *   PR 4:52.3 / TIME −0:03.2
 */
export function formatF1Row(refLabel, refSec, timeSec) {
  const ref = num(refSec);
  const time = num(timeSec);
  const delta = (ref > 0 && time > 0) ? time - ref : null;
  const refTxt = ref > 0 ? formatSectorTime(ref) : "—";
  const deltaTxt = delta == null ? "—" : formatSectorDelta(delta);
  return `${refLabel} ${refTxt} / TIME ${deltaTxt}`;
}

/** green = ahead (minus), red = behind (plus), purple = new sector PB. */
export function sectorColor(deltaSec, isNewPb = false) {
  if (isNewPb) return "purple";
  if (deltaSec == null || !Number.isFinite(Number(deltaSec))) return "neutral";
  if (Math.abs(Number(deltaSec)) < 0.05) return "neutral";
  return Number(deltaSec) < 0 ? "green" : "red";
}

/** Index of the sector with the biggest gain on goal, for the tower highlight. */
export function bestSectorIndex(rows) {
  let best = -1;
  let gain = null;
  for (const row of rows || []) {
    if (row.vsGoal == null) continue;
    if (gain == null || row.vsGoal < gain) { gain = row.vsGoal; best = row.index; }
  }
  return best;
}

function lapTimesFor(course, act) {
  const track = (act && act.track) || [];
  const analysis = analyzeLapGate(course, track);
  if (analysis.gated && analysis.sectorTimesByLap.some((l) => l.length)) {
    return {
      analysis,
      laps: analysis.sectorTimesByLap.map((times, i) => ({ lap: i + 1, times: times.slice() })),
    };
  }
  return {
    analysis,
    laps: [{ lap: 1, times: sectorTimesFromTrack(course, track) }],
  };
}

/**
 * Build the sector tower model. PBs are read before the run is applied, so
 * the PR column compares against history; `newBests` marks purple rows.
 */
export function buildSectorModel(course, act, { apply = false } = {}) {
  const goal = course && resolveGoal(course);
  if (!course || !act) {
    return { hasGoal: false, hasSectors: false, rows: [], laps: [], computed: null, applied: null };
  }
  const targets = goal ? sectorTargets(course, goal) : [];
  const pbs = readSectorPbs(course);
  const hadHistory = hasSectorHistory(course);
  const { analysis, laps } = lapTimesFor(course, act);
  const lapCount = Math.max(1, laps.length);
  const sectorCount = Math.max(targets.length, ...laps.map((l) => l.times.length), 0);
  const rows = [];
  let cumulative = 0;
  let bestPossibleSum = 0;
  let anyBest = false;
  let hasTargets = false;

  for (let i = 0; i < sectorCount; i++) {
    const target = num(targets[i]);
    if (target > 0) hasTargets = true;
    const perLap = laps.map((l) => ({
      lap: l.lap,
      time: num(l.times[i]),
    }));
    const timed = perLap.filter((l) => l.time > 0);
    const best = timed.length ? Math.min(...timed.map((l) => l.time)) : 0;
    const pb = pbs[String(i)] ? num(pbs[String(i)].seconds) : null;
    const vsGoal = best > 0 && target > 0 ? best - target : null;
    const vsPb = best > 0 && pb > 0 ? best - pb : null;
    let earlierBest = null;
    const lapRows = perLap.map((l) => {
      const isLapPb = l.time > 0 && earlierBest != null && l.time < earlierBest - 0.009;
      if (l.time > 0 && (earlierBest == null || l.time < earlierBest)) earlierBest = l.time;
      const isPb = (hadHistory && l.time > 0 && pb != null && l.time < pb - 0.009) || isLapPb;
      return {
        ...l,
        vsGoal: l.time > 0 && target > 0 ? l.time - target : null,
        vsPb: l.time > 0 && pb > 0 ? l.time - pb : null,
        isNewPb: isPb,
        color: sectorColor(l.time > 0 && target > 0 ? l.time - target : null, isPb),
      };
    });
    const beatHistory = !!(hadHistory && best > 0 && pb != null && best < pb - 0.009);
    const improvedWithin = lapRows.some((l) => l.isNewPb && l.lap > 1);
    const isNewPb = beatHistory || improvedWithin;
    const color = sectorColor(vsGoal, isNewPb);
    if (vsGoal != null) cumulative += vsGoal;
    const possible = pb > 0 ? pb : target;
    if (possible > 0) { bestPossibleSum += possible; anyBest = true; }
    rows.push({
      index: i,
      label: `S${i + 1}`,
      target,
      pb,
      best,
      vsGoal,
      vsPb,
      isNewPb,
      color,
      goalLine: target > 0 ? formatF1Row("GOAL", target, best) : "",
      prLine: hadHistory && pb > 0 ? formatF1Row("PR", pb, best) : "",
      laps: lapRows,
    });
  }

  const hasTimed = rows.some((r) => r.best > 0);
  const result = apply && hasTimed
    ? applySectorResult(course, rows.map((r) => r.best), { activityId: act.id, at: act.endedAt })
    : null;
  if (result && hadHistory) {
    for (const i of result.newBests || []) {
      if (rows[i]) { rows[i].isNewPb = true; rows[i].color = "purple"; }
    }
  }

  const timedLaps = laps.map((l) => l.times.reduce((s, v) => s + num(v), 0)).filter((s) => s > 0);
  return {
    hasGoal: !!goal,
    hasSectors: rows.length > 0,
    hasTargets,
    rows,
    laps,
    lapCount,
    lapTimes: laps.map((l) => ({
      lap: l.lap,
      seconds: l.times.reduce((s, v) => s + num(v), 0),
    })),
    bestLapSec: analysis.bestLapSec != null ? analysis.bestLapSec : (timedLaps.length ? Math.min(...timedLaps) : null),
    analysis,
    cumulative,
    bestPossible: anyBest ? bestPossibleSum : null,
    newBests: result ? result.newBests : [],
    applied: result,
  };
}

/** Project a path to an SVG outline (Summary only — not an interactive map). */
export function routeOutlineSvg(coords, { width = 340, height = 190, stroke = "#4EC3F7" } = {}) {
  const pts = (coords || []).filter((p) => p && Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lon)));
  if (pts.length < 2) return "";
  const lats = pts.map((p) => Number(p.lat));
  const lons = pts.map((p) => Number(p.lon));
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLon = Math.min(...lons), maxLon = Math.max(...lons);
  const pad = 18;
  const dLat = Math.max(1e-9, maxLat - minLat);
  const dLon = Math.max(1e-9, maxLon - minLon);
  const scale = Math.min((width - pad * 2) / dLon, (height - pad * 2) / dLat);
  const ox = (width - dLon * scale) / 2;
  const oy = (height - dLat * scale) / 2;
  const xy = (p) => {
    const x = ox + (Number(p.lon) - minLon) * scale;
    const y = height - (oy + (Number(p.lat) - minLat) * scale);
    return [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
  };
  const d = pts.map((p, i) => `${i ? "L" : "M"}${xy(p)[0]} ${xy(p)[1]}`).join(" ");
  const [sx, sy] = xy(pts[0]);
  const [ex, ey] = xy(pts[pts.length - 1]);
  return `<svg class="summary-outline-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Route outline">`
    + `<path d="${d}" fill="none" stroke="#2B8FD4" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" opacity="0.45"/>`
    + `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`
    + `<circle cx="${ex}" cy="${ey}" r="7" fill="#B8F3D0" stroke="#12161C" stroke-width="3"/>`
    + `<circle cx="${sx}" cy="${sy}" r="5" fill="#F3F6FA" stroke="#12161C" stroke-width="2"/>`
    + `</svg>`;
}

/** Split a GPS track into one polyline per sector, for the details map. */
export function sectorTrackSegments(track, meters) {
  const pts = (track || []).filter(Boolean);
  const list = (meters || []).map(num);
  if (pts.length < 2 || !list.length) return [];
  const prefix = [0];
  for (let i = 1; i < pts.length; i++) prefix[i] = prefix[i - 1] + haversineMeters(pts[i - 1], pts[i]);
  const out = [];
  let startM = 0;
  for (let s = 0; s < list.length; s++) {
    const endM = startM + list[s];
    const seg = [];
    for (let i = 0; i < pts.length; i++) {
      if (prefix[i] < startM - 0.01) continue;
      if (prefix[i] > endM + 0.01) break;
      seg.push({ lat: pts[i].lat, lon: pts[i].lon });
    }
    const startPt = pointAt(pts, prefix, startM);
    const endPt = pointAt(pts, prefix, endM);
    if (startPt && (!seg.length || haversineMeters(seg[0], startPt) > 0.5)) seg.unshift(startPt);
    if (endPt && (!seg.length || haversineMeters(seg[seg.length - 1], endPt) > 0.5)) seg.push(endPt);
    if (seg.length >= 2) out.push({ index: s, coords: seg });
    startM = endM;
  }
  return out;
}

function pointAt(pts, prefix, meters) {
  if (!pts.length) return null;
  if (meters <= 0) return { lat: pts[0].lat, lon: pts[0].lon };
  for (let i = 1; i < pts.length; i++) {
    if (prefix[i] >= meters - 0.001) {
      const seg = prefix[i] - prefix[i - 1];
      const f = seg > 0 ? (meters - prefix[i - 1]) / seg : 1;
      return {
        lat: pts[i - 1].lat + (pts[i].lat - pts[i - 1].lat) * f,
        lon: pts[i - 1].lon + (pts[i].lon - pts[i - 1].lon) * f,
      };
    }
  }
  return { lat: pts[pts.length - 1].lat, lon: pts[pts.length - 1].lon };
}

function sectorChips(model) {
  return model.rows.map((r) => `
    <div class="total-box summary-sector-chip ${r.color}">
      <div class="num">${escapeHtml(formatSectorTime(r.best))}</div>
      <div class="lbl">${escapeHtml(r.label)}</div>
    </div>`).join("");
}

function lapRowsHtml(row) {
  if (row.laps.length <= 1) return "";
  return `<div class="sector-lap-list">${row.laps.map((l) => `
    <div class="sector-lap-row ${l.color}">
      <span class="sector-lap-n">Lap ${l.lap}</span>
      <span class="sector-lap-time">${escapeHtml(formatSectorTime(l.time))}</span>
      <span class="sector-lap-delta ${l.color}">${escapeHtml(formatSectorDelta(l.vsGoal))}</span>
    </div>`).join("")}</div>`;
}

function towerRowHtml(row, bestIndex = -1) {
  const pr = row.prLine ? `<div class="sector-f1 pr">${escapeHtml(row.prLine)}</div>` : "";
  const goal = row.goalLine ? `<div class="sector-f1 goal">${escapeHtml(row.goalLine)}</div>` : "";
  const best = row.index === bestIndex ? `<span class="best-sector-badge">BEST</span>` : "";
  return `
    <div class="sector-f1-row ${row.color}${row.index === bestIndex ? " best-sector" : ""}" data-testid="summary-sector-${row.index + 1}">
      <div class="sector-f1-chip">${escapeHtml(row.label)}${best}</div>
      <div class="sector-f1-body">
        <div class="sector-f1-main">${escapeHtml(formatSectorTime(row.best))}${row.isNewPb ? `<span class="pb-badge">PB</span>` : ""}</div>
        ${goal}
        ${pr}
      </div>
    </div>`;
}

export function renderSectorTower(root, model) {
  if (!root) return;
  if (!model || !model.hasSectors || !model.rows.length) {
    root.innerHTML = "";
    root.hidden = true;
    return;
  }
  root.hidden = false;
  const multi = model.lapCount > 1;
  const bestIndex = bestSectorIndex(model.rows);
  const rows = model.rows.map((row) => {
    if (!multi) return towerRowHtml(row, bestIndex);
    return `<details class="sector-expand" data-testid="summary-lap-expand-${row.index + 1}">
      <summary>${towerRowHtml(row, bestIndex)}<span class="sector-expand-hint">${model.lapCount} laps</span></summary>
      ${lapRowsHtml(row)}
    </details>`;
  }).join("");
  const bits = [];
  if (model.hasTargets) bits.push(`Total ${formatSectorDelta(model.cumulative)}`);
  if (model.bestPossible != null) bits.push(`Best possible ${formatSectorTime(model.bestPossible)}`);
  if (model.bestLapSec != null && multi) bits.push(`Best lap ${formatSectorTime(model.bestLapSec)}`);
  root.innerHTML = `<div class="sector-tower">${rows}</div>`
    + (bits.length ? `<p class="summary-delta-line" data-testid="summary-delta-line">${escapeHtml(bits.join(" · "))}</p>` : "");
}

/**
 * Paint the Summary screen. `ctx` carries values app.js already computes so
 * this module does not need app state: units, shown meters, elevation.
 */
export function renderSummary(ctx) {
  const {
    act, course, units = "mi", shownMeters = 0, elev = null,
    title = "Activity complete", sub = "", indoorNote = "",
    outline = null, model = null, distanceNote = "",
  } = ctx || {};
  const set = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };
  set("summary-title", title);
  set("summary-sub", sub);
  const note = document.getElementById("summary-indoor-note");
  if (note) {
    note.hidden = !indoorNote;
    note.textContent = indoorNote || "";
  }
  const outlineEl = document.getElementById("summary-outline");
  if (outlineEl) {
    const svg = routeOutlineSvg(outline || (act && act.track) || []);
    outlineEl.innerHTML = svg;
    outlineEl.hidden = !svg;
  }
  const pace = paceOrSpeed(act, shownMeters, units);
  const stats = document.getElementById("summary-stats");
  if (stats) {
    let html = `
      <div class="total-box"><div class="num">${escapeHtml(formatDistance(shownMeters, units))}</div><div class="lbl">Distance</div></div>
      <div class="total-box"><div class="num">${escapeHtml(formatDuration(act.elapsedSec))}</div><div class="lbl">Time</div></div>
      <div class="total-box"><div class="num">${escapeHtml(pace.value)}</div><div class="lbl">${escapeHtml(pace.label)}</div></div>`;
    if (elev && elev.gainM > 15) {
      html += `<div class="total-box"><div class="num">${escapeHtml(formatGainSafe(elev.gainM, units))}</div><div class="lbl">Climb</div></div>`;
    }
    if (model && model.hasSectors && model.rows.length) html += sectorChips(model);
    stats.innerHTML = html;
  }
  renderSectorTower(document.getElementById("summary-sector-tower"), model);
  const distNote = document.getElementById("summary-distance-note");
  if (distNote) {
    distNote.hidden = !distanceNote;
    distNote.textContent = distanceNote || "";
  }
  const detailsBtn = document.getElementById("btn-summary-details");
  if (detailsBtn) detailsBtn.hidden = false;
}

function formatGainSafe(meters, units) {
  const m = Math.round(num(meters));
  return units === "km" ? `${m} m` : `${Math.round(m * 3.28084)} ft`;
}

function healthHtml(act) {
  const h = act && act.health;
  const provider = (h && h.provider) || "your health app";
  const bits = [];
  if (h && Number.isFinite(h.steps)) bits.push(`${h.steps.toLocaleString()} steps`);
  if (h && Number.isFinite(h.calories)) bits.push(`${Math.round(h.calories).toLocaleString()} cal`);
  if (bits.length) {
    return `<div class="pr-row" data-testid="details-health-row"><span>From ${escapeHtml(provider)}</span><span>${escapeHtml(bits.join(" · "))}</span></div>
      <p class="tiny details-note">Calories and steps come from the health app. Heldpath never counts them itself.</p>`;
  }
  return "";
}

export function renderDetails(ctx) {
  const {
    act, course, units = "mi", shownMeters = 0, elev = null,
    model = null, sub = "", healthOptIn = false, healthSync = null, legResult = null,
    splits = null,
  } = ctx || {};
  const set = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };
  set("summary-details-title", act && act.type === "ride" ? "Ride details" : "More details");
  set("summary-details-sub", sub);
  const stats = document.getElementById("details-stats");
  if (stats) {
    const pace = paceOrSpeed(act, shownMeters, units);
    let html = `
      <div class="total-box"><div class="num">${escapeHtml(formatDistance(shownMeters, units))}</div><div class="lbl">Distance</div></div>
      <div class="total-box"><div class="num">${escapeHtml(formatDuration(act.elapsedSec))}</div><div class="lbl">Time</div></div>
      <div class="total-box"><div class="num">${escapeHtml(pace.value)}</div><div class="lbl">${escapeHtml(pace.label)}</div></div>`;
    if (elev && (elev.gainM > 0 || elev.lossM > 0)) {
      html += `<div class="total-box"><div class="num">${escapeHtml(formatGainSafe(elev.gainM, units))}</div><div class="lbl">Climb</div></div>
      <div class="total-box"><div class="num">${escapeHtml(formatGainSafe(elev.lossM, units))}</div><div class="lbl">Descent</div></div>`;
    }
    const hr = heartRateInfo(act);
    if (hr) html += `<div class="total-box"><div class="num">${hr.avg}</div><div class="lbl">Avg bpm</div></div>`;
    if (model && model.hasSectors && model.rows.length) html += `<div class="total-box"><div class="num">${model.lapCount}</div><div class="lbl">${model.lapCount === 1 ? "Lap" : "Laps"}</div></div>`;
    stats.innerHTML = html;
  }
  const health = document.getElementById("details-health");
  if (health) {
    const body = healthHtml(act);
    const hr = heartRateInfo(act);
    const hrHtml = hr
      ? `<div class="pr-row" data-testid="details-hr-row"><span>Heart rate${hr.from ? ` · ${escapeHtml(hr.from)}` : ""}</span><span>avg ${hr.avg} bpm${hr.min != null && hr.max != null ? ` · ${hr.min}–${hr.max}` : ""}</span></div>`
      : "";
    if (body || hrHtml) health.innerHTML = body + hrHtml;
    else if (!healthOptIn) health.innerHTML = `<p class="tiny details-note">Health sync is off. Turn it on in Settings to show steps and calories from your health app.</p>`;
    else health.innerHTML = `<p class="tiny details-note">No steps or calories were reported by the health app for this activity, so they stay blank. Heldpath never counts them itself.</p>`;
  }
  const sectorRoot = document.getElementById("details-sector-table");
  if (sectorRoot) {
    if (model && model.hasSectors && model.rows.length) {
      const laps = (model.analysis && model.analysis.lapTimes && model.analysis.lapTimes.length)
        ? model.analysis.lapTimes.map((l) => ({ lap: l.lap, seconds: l.seconds }))
        : (model.lapTimes.length > 1 ? model.lapTimes : []);
      const bestLap = model.bestLapSec;
      const lapStrip = laps.length > 1
        ? `<div class="details-lap-times" data-testid="details-lap-times">${laps.map((l) => `
            <div class="details-lap-time${bestLap != null && Math.abs(l.seconds - bestLap) < 0.05 ? " best" : ""}">
              <span>Lap ${l.lap}</span><strong>${escapeHtml(formatSectorTime(l.seconds))}</strong>
            </div>`).join("")}</div>`
        : "";
      sectorRoot.innerHTML = `<div class="sector-table details-sector-table">${model.rows.map((row) => {
        const pr = row.prLine ? `<div class="sector-line pr">${escapeHtml(row.prLine)}</div>` : "";
        const goal = row.goalLine ? `<div class="sector-line goal">${escapeHtml(row.goalLine)}</div>` : "";
        const laps = row.laps.length > 1 ? `<div class="details-lap-grid">${row.laps.map((l) => `
          <div class="details-lap-cell"><span>Lap ${l.lap}</span><strong>${escapeHtml(formatSectorTime(l.time))}</strong></div>`).join("")}</div>` : "";
        return `<div class="sector-block ${row.color}" data-testid="details-sector-${row.index + 1}">
          <div class="sector-block-label"><span>${escapeHtml(row.label)}</span><span class="sector-block-time">${escapeHtml(formatSectorTime(row.best))}</span></div>
          ${goal}
          ${pr}${laps}
        </div>`;
      }).join("")}</div>${lapStrip}
      <p class="tiny details-note">Even pace from the goal time and the full route distance. Elevation is shown as info, not in the target.</p>`;
    } else {
      sectorRoot.innerHTML = course
        ? `<p class="tiny details-note">This route has no saved goal yet, so there are no sector targets. Add a goal time for free in the course card.</p>`
        : `<p class="tiny details-note">Free walk: no course sectors. Pick a saved course next time to see an F1 sector tower, free.</p>`;
    }
  }
  const splitRoot = document.getElementById("details-splits");
  if (splitRoot) {
    if (course && legResult && legResult.legs && legResult.legs.length && splits) {
      const rows = splits.splitRows(course, legResult);
      splitRoot.innerHTML = `<div class="split-head"><span>Leg</span><span class="t">Time</span><span class="t">Pace</span></div>`
        + rows.map((row) => `<div class="split-row"><span>${escapeHtml(row.label)}</span><span class="t">${escapeHtml(splits.formatLegTime(row.seconds))}</span><span class="t">${escapeHtml(row.pace || "—")}</span></div>`).join("");
    } else {
      splitRoot.innerHTML = "";
    }
  }
}

export function detailsMapMeters(course, act) {
  const list = course ? sectorMetersList(course) : [];
  if (list.length) return list;
  return act && act.distanceMeters ? [act.distanceMeters] : [];
}
