/**
 * Course builder: unlimited pins, first pin is always the start,
 * later pins are ordered waypoints, and the end is chosen separately
 * (End point pin mode, or Set as end on an existing pin).
 * When the end is an earlier pin, the route visits every placed pin
 * in order and then returns to that end. Pure helpers; works offline.
 */
import { routeLegs, normalizePathMode } from "./routing.js";

export const EXPLAINER_KEY = "heldpath.builder-explainer.v1";

export const EXPLAINER_TITLE = "Build a course";

export const EXPLAINER_BODY =
  "Your first pin is your start. Add as many pins as you like to shape your exact route. To finish, turn on End point pin before placing your last pin, or tap any pin on the route to make it the end.";

export const PATH_MODE_EXPLAINER_KEY = "heldpath.path-mode-explainer.v1";

export const PATH_MODE_EXPLAINER_BODY =
  "The mode you choose is saved on the next pin you place. That pin sets how the leg into it is drawn: on path follows walkable routes, off path goes straight, including across grass and other ground.";

const SAME_M = 0.8;

export function emptyBuilderState() {
  return {
    pins: [],
    endIndex: null,
    endMode: false,
  };
}

export function samePin(a, b, meters = SAME_M) {
  if (!a || !b) return false;
  const dlat = (a.lat - b.lat) * 111320;
  const dlon = (a.lon - b.lon) * 111320 * Math.cos((a.lat * Math.PI) / 180);
  return dlat * dlat + dlon * dlon <= meters * meters;
}

export function placePin(state, coord, opts = {}) {
  const lat = Number(coord.lat);
  const lon = Number(coord.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return state;
  const pathMode = normalizePathMode(opts.pathMode != null ? opts.pathMode : coord.pathMode);
  // No pin cap — 100+ stops (marathon-length courses) are allowed.
  if (state.pins.length === 0) {
    state.pins.push({ lat, lon, role: "start", pathMode });
    return state;
  }
  if (state.endMode) {
    const pin = { lat, lon, role: "end", pathMode };
    // Closing a loop onto an earlier pin: that pin is the destination of
    // the return leg, so it takes this placement's mode.
    const match = state.pins.findIndex((p) => samePin(p, pin));
    state.pins.push(pin);
    state.endIndex = state.pins.length - 1;
    if (match >= 0) {
      state.pins[match].pathMode = pathMode;
      state.endIndex = match;
      state.pins.pop();
    }
    state.endMode = false;
    refreshRoles(state);
    return state;
  }
  state.pins.push({ lat, lon, role: "via", pathMode });
  refreshRoles(state);
  return state;
}

export function setPinPathMode(state, index, mode) {
  const i = Number(index);
  if (!state || !state.pins[i]) return state;
  state.pins[i].pathMode = normalizePathMode(mode);
  return state;
}

export function setEndMode(state, on) {
  state.endMode = !!on;
  return state;
}

export function toggleEndMode(state) {
  state.endMode = !state.endMode;
  return state;
}

export function setEndIndex(state, index) {
  const i = Number(index);
  if (!Number.isInteger(i) || i < 0 || i >= state.pins.length) return state;
  state.endIndex = i;
  state.endMode = false;
  refreshRoles(state);
  return state;
}

/**
 * Reuse an existing pin as the next stop in placement order.
 * The same pin can appear more than once (e.g. numbers "2, 5").
 */
export function addNextStop(state, pinIndex, opts = {}) {
  const i = Number(pinIndex);
  const pin = state.pins[i];
  if (!pin || i < 0) return state;
  const pathMode = normalizePathMode(opts && opts.pathMode != null ? opts.pathMode : pin.pathMode);
  const copy = { lat: pin.lat, lon: pin.lon, role: "via", ref: i, pathMode };
  if (state.endMode) {
    state.pins.push(copy);
    state.endIndex = state.pins.length - 1;
    state.endMode = false;
  } else {
    state.pins.push(copy);
  }
  refreshRoles(state);
  return state;
}

/** 1-based visit numbers for a pin, including a return-to-end visit. */
export function pinVisitNumbers(state, pinIndex) {
  const pin = state.pins[pinIndex];
  if (!pin) return [];
  const nums = [];
  routeStops(state).forEach((s, i) => {
    if (s.index === pinIndex || samePin(s, pin)) nums.push(i + 1);
  });
  return [...new Set(nums)];
}

/** Shared placement-order label, e.g. "2, 5". */
export function pinNumberLabel(state, pinIndex) {
  const nums = pinVisitNumbers(state, pinIndex);
  return nums.length ? nums.join(", ") : String(pinIndex + 1);
}

export function undoPin(state) {
  if (!state.pins.length) return state;
  const removed = state.pins.length - 1;
  state.pins.pop();
  if (state.endIndex === removed) state.endIndex = null;
  if (!state.pins.length) {
    state.endIndex = null;
    state.endMode = false;
  } else {
    refreshRoles(state);
  }
  return state;
}

/**
 * Remove one placement (one stop number). Remaining stops keep
 * placement order and are renumbered from 1. If this was the start,
 * the next stop becomes the start. Shared-number copies at the same
 * place are left alone.
 */
export function removePin(state, index) {
  const i = Number(index);
  if (!Number.isInteger(i) || i < 0 || i >= state.pins.length) return state;
  state.pins.splice(i, 1);
  if (state.endIndex == null) {
    /* unchanged */
  } else if (state.endIndex === i) {
    state.endIndex = null;
  } else if (state.endIndex > i) {
    state.endIndex -= 1;
  }
  for (const p of state.pins) {
    if (typeof p.ref === "number") {
      if (p.ref === i) delete p.ref;
      else if (p.ref > i) p.ref -= 1;
    }
  }
  if (!state.pins.length) {
    state.endIndex = null;
    state.endMode = false;
  } else {
    refreshRoles(state);
  }
  return state;
}

/** Clear the chosen end; the pin itself stays on the route. */
export function removeEnd(state) {
  state.endIndex = null;
  state.endMode = false;
  if (state.pins.length) refreshRoles(state);
  return state;
}

/** Snapshot of builder state for Undo (last action). */
export function snapshotBuilder(state) {
  return {
    pins: (state.pins || []).map((p) => ({ ...p })),
    endIndex: state.endIndex == null ? null : state.endIndex,
    endMode: !!state.endMode,
  };
}

export function restoreBuilder(snapshot) {
  if (!snapshot) return emptyBuilderState();
  const state = {
    pins: (snapshot.pins || []).map((p) => ({ ...p })),
    endIndex: snapshot.endIndex == null ? null : snapshot.endIndex,
    endMode: !!snapshot.endMode,
  };
  if (state.pins.length) refreshRoles(state);
  return state;
}

/** Placement-order stop number (1-based) for a pin index, ignoring a return leg. */
export function placementStopNumber(state, index) {
  const i = Number(index);
  if (!Number.isInteger(i) || i < 0) return null;
  return i + 1;
}

/** All placement indices that share this pin's location. */
export function sharedPinIndices(state, index) {
  const pin = state && state.pins && state.pins[index];
  if (!pin) return [];
  return state.pins.map((p, i) => (samePin(p, pin) ? i : -1)).filter((i) => i >= 0);
}

function refreshRoles(state) {
  state.pins.forEach((p, i) => {
    if (i === 0) p.role = "start";
    else if (state.endIndex === i) p.role = "end";
    else p.role = "via";
  });
}

/**
 * Stops the router should visit: every placed pin in order, then a
 * return to the chosen end when that end is not the last-placed pin.
 */
export function routeStops(state) {
  const pins = state.pins || [];
  const stops = pins.map((p, i) => ({
    lat: p.lat, lon: p.lon, role: p.role, index: i, pathMode: normalizePathMode(p.pathMode),
  }));
  if (state.endIndex == null || !pins.length) return stops;
  if (state.endIndex === pins.length - 1) return stops;
  const end = pins[state.endIndex];
  if (!end) return stops;
  stops.push({
    lat: end.lat,
    lon: end.lon,
    role: "end",
    index: state.endIndex,
    returnLeg: true,
    pathMode: normalizePathMode(end.pathMode),
  });
  return stops;
}

export function canSave(state) {
  if (!state || !state.pins || state.pins.length < 2) return false;
  if (state.endIndex == null) return false;
  if (state.endIndex < 0 || state.endIndex >= state.pins.length) return false;
  return true;
}

/** Flattened pin list for storage / sharing (last pin is the end). */
export function savedPins(state) {
  const stops = routeStops(state);
  return stops.map((p, i, arr) => ({
    lat: p.lat,
    lon: p.lon,
    role: i === 0 ? "start" : i === arr.length - 1 ? "end" : "via",
    pathMode: normalizePathMode(p.pathMode),
  }));
}

export function pinLabel(state, index) {
  const nums = pinNumberLabel(state, index);
  const isStart = index === 0 || (state.pins[index] && samePin(state.pins[index], state.pins[0]));
  const isEnd = state.endIndex != null && (
    state.endIndex === index || samePin(state.pins[index], state.pins[state.endIndex])
  );
  if (nums.includes(",") || (!isStart && !isEnd)) return nums;
  if (isStart && isEnd) return nums === "1" ? "Start · End" : `${nums} · Start · End`;
  if (isStart) return nums === "1" ? "Start" : `${nums} · Start`;
  if (isEnd) return `${nums} · End`;
  return nums;
}

export function stopLabel(state, stop) {
  if (stop.returnLeg) {
    return state.endIndex === 0 ? "Start" : pinLabel(state, stop.index);
  }
  return pinLabel(state, stop.index);
}

export function legLabels(state) {
  const stops = routeStops(state);
  const rows = [];
  for (let i = 0; i < stops.length - 1; i++) {
    rows.push({
      from: stopLabel(state, stops[i]),
      to: stopLabel(state, stops[i + 1]),
      returnLeg: !!stops[i + 1].returnLeg,
    });
  }
  return rows;
}

/**
 * Ingest a legacy or saved pin list (last pin often already the end,
 * and a loop may close by repeating the start).
 */
export function ingestPins(pins) {
  const state = emptyBuilderState();
  if (!pins || !pins.length) return state;
  const first = pins[0];
  const last = pins[pins.length - 1];
  const earlier = pins.slice(0, -1);
  const match = earlier.findIndex((p) => samePin(p, last));
  if (pins.length >= 2 && (last.role === "end" || match >= 0) && match >= 0) {
    state.pins = earlier.map((p) => ({
      lat: p.lat, lon: p.lon, role: p.role || "via", pathMode: normalizePathMode(p.pathMode),
    }));
    state.endIndex = match;
    // The closing pin is the destination of the return leg.
    state.pins[match].pathMode = normalizePathMode(last.pathMode || state.pins[match].pathMode);
    refreshRoles(state);
    return state;
  }
  state.pins = pins.map((p) => ({
    lat: p.lat, lon: p.lon, role: p.role || "via", pathMode: normalizePathMode(p.pathMode),
  }));
  if (pins.length >= 2) state.endIndex = state.pins.length - 1;
  refreshRoles(state);
  return state;
}

export function routeCourse(graph, state, opts = {}) {
  const stops = routeStops(state);
  const previous = opts.previous || null;
  const routed = routeLegs(graph, stops, {
    straightLine: !!opts.straightLine,
    previous,
    straightOverrides: opts.straightOverrides,
    maxSnap: opts.maxSnap,
    skipDetourGuard: !!opts.skipDetourGuard,
    skipOpenArea: !!opts.skipOpenArea,
  });
  routed.stops = stops;
  return routed;
}

export function isExplainerSeen(storage) {
  const store = storage || defaultStorage();
  if (!store) return false;
  try {
    return store.getItem(EXPLAINER_KEY) === "1";
  } catch {
    return false;
  }
}

export function markExplainerSeen(storage) {
  const store = storage || defaultStorage();
  if (!store) return;
  try {
    store.setItem(EXPLAINER_KEY, "1");
  } catch {
    /* quota / private mode */
  }
}

export function isPathModeExplainerSeen(storage) {
  const store = storage || defaultStorage();
  if (!store) return false;
  try {
    return store.getItem(PATH_MODE_EXPLAINER_KEY) === "1";
  } catch {
    return false;
  }
}

export function markPathModeExplainerSeen(storage) {
  const store = storage || defaultStorage();
  if (!store) return;
  try {
    store.setItem(PATH_MODE_EXPLAINER_KEY, "1");
  } catch {
    /* quota / private mode */
  }
}

function defaultStorage() {
  try {
    if (typeof localStorage !== "undefined") return localStorage;
  } catch {
    /* ignore */
  }
  return null;
}

export function builderHint(state) {
  const n = state.pins.length;
  if (state.endMode) {
    return n === 0
      ? "Tap the map to place a Start pin first. After that, End point pin will mark the next pin as the end."
      : "The next pin you place will be the End.";
  }
  if (n === 0) {
    return "Tap the map to place a Start pin. Legs follow walkable paths.";
  }
  if (state.endIndex == null) {
    return n === 1
      ? "Start is placed. Add as many pins as you like, then turn on End point pin or tap a pin to set the end."
      : "Keep adding pins to shape the route. Turn on End point pin or tap a pin to set the end before you save.";
  }
  if (state.endIndex === 0) {
    return "This course loops back to the Start. You can still add pins; the route will visit them and then return home.";
  }
  return "End is set. You can still add pins; the route visits them in order and then returns to the end. Distances use the walkable path.";
}
