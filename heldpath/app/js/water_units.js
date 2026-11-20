/**
 * Water display units, bottle size, reminders, logging, and a
 * general-guidance daily target recommendation.
 *
 * How we calculate (also shown in-app as "How we calculate"):
 * - Baseline daily intake is about 2.0 L when body weight is unknown, or
 *   about 32.5 mL per kg when a weight is given (in the commonly cited
 *   30–35 mL/kg range). This sits near EFSA (2010) adequate-intake values
 *   for total water from all sources (~2.0 L/day for women, ~2.5 L/day
 *   for men) and is a general starting point only.
 * - For planned running or walking time we add roughly 12–24 oz per hour.
 *   Mid-range default is 16.9 oz (500 mL) per hour. If an offline-cached
 *   local temperature is available, cool conditions (~10 °C or below)
 *   move toward 12 oz/h and heat (~25 °C or above) toward 24 oz/h.
 *   That band follows ACSM-style exercise fluid-replacement guidance
 *   (Sawka et al., ACSM Position Stand: Exercise and Fluid Replacement,
 *   Medicine & Science in Sports & Exercise, 2007: typical replacement
 *   during activity is often about 0.4–0.8 L/h, i.e. ~12–24 oz/h).
 * This is general guidance, not medical advice. Needs vary with body
 * size, climate, health and medications.
 */
export const ML_PER_OZ = 29.5735;
export const OZ_PER_GAL = 128;
export const DEFAULT_BOTTLE_OZ = 16.9;
export const BOTTLE_PRESETS_OZ = [16.9, 20, 24, 32, 40];
export const WEATHER_CACHE_KEY = "heldpath.weather-cache.v1";
export const WATER_LOG_KEY = "heldpath.water-log.v1";
export const WATER_PREFS_KEY = "heldpath.water-prefs.v1";

export const WATER_CALC_NOTE =
  "Baseline is about 2 L a day, or about 32.5 ml per kg if you enter a weight (in the usual 30–35 ml/kg range, near EFSA 2010 adequate-intake figures). We then add about 12–24 oz per hour of planned running or walking: 16.9 oz (500 ml) per hour as a mid point, closer to 12 oz/h when a cached local temperature is cool and 24 oz/h when it is hot. That band follows ACSM-style exercise fluid-replacement guidance (Sawka et al., 2007). This is general guidance, not medical advice.";

export const WATER_NOT_MEDICAL =
  "This is general guidance, not medical advice. Needs vary with body size, climate, health and medications. Ask a clinician if you are unsure. You can adjust this number.";

const UNITS = new Set(["oz", "bottles", "gal", "ml", "l"]);

export function defaultWaterUnit({ locale, units } = {}) {
  if (units === "km") return "ml";
  const loc = String(locale || "").toLowerCase();
  if (!loc) return "oz";
  const metricish = /^(?=.*\b)(?!en-us|en-ph).*(?:en-gb|en-au|en-nz|en-ie|en-za|fr|de|es|it|nl|sv|nb|da|fi|pl|pt|cs|sk|hu|ro|bg|hr|sl|el|tr|ru|uk|ja|ko|zh|th|vi|id|ms|hi|ar|he|fa)/.test(loc)
    || /^(fr|de|es|it|nl|sv|nb|da|fi|pl|pt|cs|ja|ko|zh|en-gb|en-au)/.test(loc);
  // US customary default is oz; most other locales prefer ml.
  if (/^en-us/.test(loc)) return "oz";
  if (metricish) return "ml";
  return "oz";
}

export function normaliseBottleOz(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 4 || n > 80) return DEFAULT_BOTTLE_OZ;
  return Math.round(n * 10) / 10;
}

export function normaliseWaterPrefs(raw = {}, { locale, units } = {}) {
  const unit = UNITS.has(raw.unit) ? raw.unit : defaultWaterUnit({ locale, units });
  return {
    unit,
    bottleOz: normaliseBottleOz(raw.bottleOz == null ? DEFAULT_BOTTLE_OZ : raw.bottleOz),
  };
}

export function mlToOz(ml) {
  return (Number(ml) || 0) / ML_PER_OZ;
}

export function ozToMl(oz) {
  return Math.round((Number(oz) || 0) * ML_PER_OZ);
}

export function mlToBottles(ml, bottleOz = DEFAULT_BOTTLE_OZ) {
  const size = normaliseBottleOz(bottleOz);
  const bottles = mlToOz(ml) / size;
  return Math.round(bottles * 2) / 2;
}

export function bottlesToMl(bottles, bottleOz = DEFAULT_BOTTLE_OZ) {
  return ozToMl((Number(bottles) || 0) * normaliseBottleOz(bottleOz));
}

export function formatBottles(count) {
  const n = Number(count) || 0;
  const sign = n < 0 ? "−" : "";
  const abs = Math.abs(n);
  const whole = Math.floor(abs + 1e-9);
  const half = Math.abs(abs - whole - 0.5) < 1e-6;
  const unit = (abs === 1 || (whole === 1 && !half && abs < 1.25)) && !half && abs === 1
    ? "bottle"
    : "bottles";
  if (half) {
    return whole === 0 ? `${sign}½ ${unit}` : `${sign}${whole}½ ${unit}`;
  }
  const shown = Math.round(abs);
  const u = shown === 1 ? "bottle" : "bottles";
  return `${sign}${shown} ${u}`;
}

const GAL_FRACS = [
  [1, 8], [1, 4], [1, 3], [3, 8], [1, 2], [5, 8], [2, 3], [3, 4], [7, 8],
];

export function formatGallons(oz) {
  const g = (Number(oz) || 0) / OZ_PER_GAL;
  const sign = g < 0 ? "−" : "";
  const abs = Math.abs(g);
  if (abs < 1 / 16) return "0 gal";
  const whole = Math.floor(abs + 1e-9);
  const frac = abs - whole;
  if (frac < 1 / 16) return whole === 0 ? "0 gal" : `${sign}${whole} gal`;
  if (frac > 15 / 16) return `${sign}${whole + 1} gal`;
  let best = GAL_FRACS[0];
  let bestErr = Infinity;
  for (const [n, d] of GAL_FRACS) {
    const err = Math.abs(frac - n / d);
    if (err < bestErr) { best = [n, d]; bestErr = err; }
  }
  const [n, d] = best;
  const piece = `${n}/${d}`;
  return whole === 0 ? `${sign}${piece} gal` : `${sign}${whole} ${piece} gal`;
}

export function formatPrimary(ml, prefs) {
  const p = normaliseWaterPrefs(prefs);
  const oz = mlToOz(ml);
  if (p.unit === "ml") return `${Math.round(Number(ml) || 0)} ml`;
  if (p.unit === "l") {
    const l = (Number(ml) || 0) / 1000;
    const digits = l >= 10 ? 1 : 2;
    return `${l.toFixed(digits)} L`;
  }
  if (p.unit === "bottles") return formatBottles(mlToBottles(ml, p.bottleOz));
  if (p.unit === "gal") return formatGallons(oz);
  const shown = Math.round(oz);
  return `${shown} oz`;
}

/**
 * Companion line, e.g. "64 oz · 4 bottles · 1/2 gal".
 * Always includes the primary unit plus handy companions.
 */
export function formatWaterLine(ml, prefs) {
  const p = normaliseWaterPrefs(prefs);
  const oz = mlToOz(ml);
  const ozLabel = `${Math.round(oz)} oz`;
  const bottleLabel = formatBottles(mlToBottles(ml, p.bottleOz));
  const galLabel = formatGallons(oz);
  const mlLabel = `${Math.round(Number(ml) || 0)} ml`;
  const lLabel = `${((Number(ml) || 0) / 1000).toFixed(2)} L`;
  if (p.unit === "ml" || p.unit === "l") {
    return `${mlLabel} · ${lLabel} · ${bottleLabel}`;
  }
  if (p.unit === "bottles") return `${bottleLabel} · ${ozLabel} · ${galLabel}`;
  if (p.unit === "gal") return `${galLabel} · ${ozLabel} · ${bottleLabel}`;
  return `${ozLabel} · ${bottleLabel} · ${galLabel}`;
}

/** Mid-range 16.9 oz/h, scaled 12–24 oz/h from a cached temperature. */
export function ozPerHourFromTempC(tempC) {
  if (tempC == null || !Number.isFinite(Number(tempC))) return 16.9;
  const t = Number(tempC);
  if (t <= 10) return 12;
  if (t >= 25) return 24;
  // Linear from 12 oz at 10 °C to 24 oz at 25 °C.
  return Math.round((12 + ((t - 10) / 15) * 12) * 10) / 10;
}

/**
 * Suggest a daily target in ml. sessionHours is planned activity on a
 * typical session day; weeklyHours is an alternative when a per-day
 * duration is not available (converted as weeklyHours / sessionDays,
 * or / 3 if session days are unknown).
 */
export function recommendWaterTarget({
  bodyKg = null,
  sessionHours = null,
  weeklyHours = null,
  sessionDaysPerWeek = 3,
  tempC = null,
} = {}) {
  let hours = Number(sessionHours);
  if (!(hours > 0) && weeklyHours > 0) {
    const days = Math.max(1, Number(sessionDaysPerWeek) || 3);
    hours = Number(weeklyHours) / days;
  }
  if (!Number.isFinite(hours) || hours < 0) hours = 0;
  const baseline = bodyKg ? Math.round((32.5 * Number(bodyKg)) / 50) * 50 : 2000;
  const ozH = ozPerHourFromTempC(tempC);
  const extra = Math.round((hours * ozH * ML_PER_OZ) / 50) * 50;
  const dailyMl = Math.max(500, Math.min(10000, baseline + extra));
  return {
    dailyMl,
    baselineMl: baseline,
    exerciseMl: extra,
    ozPerHour: ozH,
    sessionHours: hours,
    usedWeight: bodyKg != null && Number(bodyKg) > 0,
    usedTemp: tempC != null && Number.isFinite(Number(tempC)),
    tempC: tempC == null ? null : Number(tempC),
    source: "efsa-acsm-general",
  };
}

export function readCachedTemperature(storage, now = Date.now()) {
  const store = storage || defaultStorage();
  if (!store) return null;
  try {
    const raw = store.getItem(WEATHER_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const tempC = Number(parsed.tempC);
    const at = Number(parsed.at) || 0;
    if (!Number.isFinite(tempC) || tempC < -60 || tempC > 60) return null;
    if (now - at > 24 * 60 * 60 * 1000) return null; // stale; stay offline, don't fetch
    return { tempC, at, source: parsed.source || "cache" };
  } catch {
    return null;
  }
}

export function reminderDrinkText(ml, prefs, reminderCount = 4) {
  const p = normaliseWaterPrefs(prefs);
  const n = Math.max(1, Number(reminderCount) || 1);
  const sipMl = (Number(ml) || 0) / n;
  let action;
  if (p.unit === "bottles" || p.unit === "oz" || p.unit === "gal") {
    const bottles = mlToBottles(sipMl, p.bottleOz);
    const amount = bottles >= 0.5 ? formatBottles(Math.max(0.5, bottles)) : formatPrimary(sipMl, { unit: "oz", bottleOz: p.bottleOz });
    action = `Drink ${amount} now`;
  } else {
    action = `Drink ${formatPrimary(sipMl, p)} now`;
  }
  return `${action}. Today's target is ${formatWaterLine(ml, p)}. General guidance, not medical advice.`;
}

export function loadWaterPrefs(storage, hints) {
  const store = storage || defaultStorage();
  let raw = {};
  if (store) {
    try { raw = JSON.parse(store.getItem(WATER_PREFS_KEY) || "{}") || {}; } catch { raw = {}; }
  }
  return normaliseWaterPrefs(raw, hints);
}

export function saveWaterPrefs(prefs, storage, hints) {
  const store = storage || defaultStorage();
  const next = normaliseWaterPrefs(prefs, hints);
  if (store) {
    try { store.setItem(WATER_PREFS_KEY, JSON.stringify(next)); } catch { /* quota */ }
  }
  return next;
}

export function todayKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function loadWaterLog(storage) {
  const store = storage || defaultStorage();
  if (!store) return {};
  try { return JSON.parse(store.getItem(WATER_LOG_KEY) || "{}") || {}; } catch { return {}; }
}

export function logWaterMl(ml, { storage, at, bottleOz } = {}) {
  const store = storage || defaultStorage();
  const log = loadWaterLog(store);
  const key = todayKey(at || new Date());
  const row = log[key] || { ml: 0, bottleOz: bottleOz || DEFAULT_BOTTLE_OZ };
  row.ml = Math.max(0, (Number(row.ml) || 0) + (Number(ml) || 0));
  if (bottleOz) row.bottleOz = normaliseBottleOz(bottleOz);
  log[key] = row;
  if (store) {
    try { store.setItem(WATER_LOG_KEY, JSON.stringify(log)); } catch { /* quota */ }
  }
  return row;
}

export function logOneBottle(prefs, opts = {}) {
  const p = normaliseWaterPrefs(prefs);
  return logWaterMl(bottlesToMl(1, p.bottleOz), { ...opts, bottleOz: p.bottleOz });
}

export function todayLoggedMl(storage, at) {
  const row = loadWaterLog(storage)[todayKey(at || new Date())];
  return row ? Number(row.ml) || 0 : 0;
}

function defaultStorage() {
  try {
    if (typeof localStorage !== "undefined") return localStorage;
  } catch { /* ignore */ }
  return null;
}
