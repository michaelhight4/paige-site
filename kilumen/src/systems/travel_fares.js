// Fast-travel fares (Coder, Oct 29 2026; Gary: "add fares so Commuter Benefit matters").
// Modest gold fares that scale with distance (stops apart in world_layout order), cut by the Commuter Benefit board node.
// Never strands a player: if you can't pay, the Lumen Line gives a free standby seat one stop along the line (the minimum
// route), and every Skylift town was first reached on foot, so walking always works. Short of gold is never a soft-lock.
// Text is [PLACEHOLDER]; Text Bot owns text/*.py (keys under travel_fares.*).
export const FARES = {
  skylift: { base: 60, perStep: 40, max: 400 },  // 1 town apart 100, 3 apart 180, far end 340
  rail: { base: 40, perStep: 30, max: 250 },     // 1 stop 70, 2 stops 100, 3 stops 130
};

export const FARE_TEXT = {
  confirm: '[PLACEHOLDER] Fare to {city}: {fare} coins.',
  confirm_discount: '[PLACEHOLDER] Fare to {city}: {fare} coins ({base} before your Commuter Benefit).',
  wallet: '[PLACEHOLDER] You have {total} coins.',
  short_skylift: '[PLACEHOLDER] You need {fare} coins for that flight. You can always walk there.',
  standby: '[PLACEHOLDER] Short on coins? There is a free standby seat to {city}, the next stop.',
  paid: '[PLACEHOLDER] Paid {fare} coins.',
};

const idx = (list, id) => list.indexOf(id);

/** Raw fare for a hop. kind 'skylift' uses fly.destinations order; 'rail' uses rail.stops order. Unknown -> base. */
export function baseFare(kind, from, to, layout) {
  const cfg = FARES[kind]; if (!cfg) return 0;
  const list = kind === 'rail' ? (layout?.rail?.stops || []) : Object.keys(layout?.fly?.destinations || {});
  const a = idx(list, from), b = idx(list, to);
  const steps = a < 0 || b < 0 ? 1 : Math.max(1, Math.abs(a - b));
  return Math.min(cfg.max, cfg.base + cfg.perStep * steps);
}

/** Fare quote: {base, fare, discounted, afford, standby}. discountFn(base) -> fare (rtBenefits.travelFare). */
export function quote(kind, from, to, layout, coins, discountFn = (n) => n) {
  const base = baseFare(kind, from, to, layout);
  const fare = Math.max(0, Math.round(discountFn(base)));
  const afford = coins >= fare;
  let standby = null;
  if (!afford && kind === 'rail') { const st = layout?.rail?.stops || [], a = idx(st, from); const b = idx(st, to); standby = a >= 0 ? (st[a + 1] || st[a - 1] || null) : b >= 0 ? (st[b - 1] || st[b + 1] || null) : null; }
  return { base, fare, discounted: fare < base, afford, standby };
}

/** Fill {vars} in a FARE_TEXT line. */
export const fareLine = (key, v = {}) => FARE_TEXT[key].replace(/\{(\w+)\}/g, (_, k) => (v[k] ?? `{${k}}`));
