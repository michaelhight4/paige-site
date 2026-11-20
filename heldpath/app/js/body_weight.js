/**
 * Body weight is stored canonically in kilograms.
 * The exact international avoirdupois pound is used for display and input.
 */
export const KG_PER_LB = 0.45359237;

export function lbToKg(lb) {
  const n = Number(lb);
  if (!Number.isFinite(n)) return null;
  return n * KG_PER_LB;
}

export function kgToLb(kg) {
  const n = Number(kg);
  if (!Number.isFinite(n)) return null;
  return n / KG_PER_LB;
}

/**
 * Default unit: pounds for US locale or imperial (mi) units, kilograms otherwise.
 * A remembered "lb" / "kg" choice always wins.
 */
export function defaultWeightUnit({ locale, units, remembered } = {}) {
  if (remembered === "lb" || remembered === "kg") return remembered;
  if (units === "mi") return "lb";
  if (units === "km") return "kg";
  const loc = String(locale || "").toLowerCase().replace(/_/g, "-");
  if (loc === "en-us" || loc.startsWith("en-us") || loc.endsWith("-us")) return "lb";
  return "kg";
}

const MIN_KG = 30;
const MAX_KG = 250;

/** Parse a field value in the given unit and return kilograms, or null. */
export function parseWeightInput(raw, unit) {
  const text = String(raw == null ? "" : raw).trim();
  if (!text) return null;
  const n = Number(text);
  if (!Number.isFinite(n) || n <= 0) return null;
  const kg = unit === "lb" ? lbToKg(n) : n;
  if (!Number.isFinite(kg) || kg < MIN_KG || kg > MAX_KG) return null;
  return kg;
}

/** Display value for an input in the chosen unit. */
export function formatWeightInput(kg, unit) {
  const n = Number(kg);
  if (!Number.isFinite(n) || n <= 0) return "";
  if (unit === "lb") return String(Number(kgToLb(n).toFixed(1)));
  return String(Number(n.toFixed(1)));
}
