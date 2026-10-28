// Area name sign (Gary, Oct 23 2026 10:33 AM CT): entering a new outdoor town/route map shows its display name at the
// top-left after the fade-in, holds ~2 s and slides out. Interiors never show it; caves only when they carry a display
// name. Re-entering the map the player just left within REENTRY_MS (edge back-and-forth) does not re-show it, and
// stepping back out of a building into the same town does not either. Pure logic here; overworld.js drives the timing
// from its fade (_finishLoad / _stepFade) and ui.js draws it (hud-banner, sized per platform profile).
import { INDOOR_OR_CAVE } from './clock.js?v=v0.2.33-alpha';

export const REENTRY_MS = 5000;
export const HOLD_MS = 2000;
const CAVE = /^greystone/;

export const isCaveMap = (name) => CAVE.test(name || '');
export const isInteriorMap = (name) => INDOOR_OR_CAVE.test(name || '') && !isCaveMap(name) || /_int$|^(office|shop|club)/.test(name || '');

/** Player-facing name: a text line if Text Bot added one, else the map's display title without dev markers. */
export function areaName(map, text = () => null) {
  const name = map?.name || map?.json?.name || '';
  const line = text(`maps.${name}.area_name`) || text(`system_area_names.${name}`);
  if (line) return { title: line, fromLines: true };
  const raw = map?.json?.title ?? map?.title ?? null;
  if (!raw || raw === name) return { title: null, fromLines: false };
  const title = String(raw).replace(/^\s*DRAFT\s*[-–:]\s*/i, '').replace(/\s*\([^)]*\)\s*$/, '').trim();
  return { title: title || null, fromLines: false };
}

/** Is this map eligible for a sign at all? */
export function signable(map) {
  const name = map?.name || '';
  if (isInteriorMap(name)) return false;
  if (isCaveMap(name)) return !!(map?.json?.title && map.json.title !== name);
  return true;
}

/**
 * Tracks the outdoor maps the player moves through. enter(map, nowMs) -> title to show, or null.
 * cur = the outdoor/cave map the player is "in" (interiors do not change it); prev = the one before, with when it was left.
 */
export class AreaSignTracker {
  constructor({ reentryMs = REENTRY_MS } = {}) { this.reentryMs = reentryMs; this.cur = null; this.prev = null; }
  enter(map, nowMs, text) {
    const name = map?.name;
    if (!name || !signable(map)) return null;               // interiors: keep cur so leaving the building is "same town"
    if (name === this.cur) return null;                       // back out of a building / same map
    const bounce = this.prev && this.prev.name === name && nowMs - this.prev.at < this.reentryMs;
    this.prev = this.cur ? { name: this.cur, at: nowMs } : null;
    this.cur = name;
    if (bounce) return null;
    return areaName(map, text).title;
  }
  toJSON() { return { cur: this.cur, prev: this.prev }; }
}
