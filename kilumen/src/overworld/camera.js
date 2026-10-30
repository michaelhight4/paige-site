// Kilumen overworld: camera (pure). Works in native pixels and always returns whole native pixels,
// so the screen scroll offset is a multiple of the zoom and pixels never shimmer.
// Rules and zoom come from the active platform profile (src/platform/<id>.json, see src/platform.js); the
// defaults below are only for callers with no profile (Node tests) and match how the camera worked before profiles.
import { TILE } from './constants.js?v=v0.2.98-alpha';
import { zoomFromTable } from '../platform.js?v=v0.2.98-alpha';

/** Camera rules when no profile is given: hard follow, clamped to map edges, short axis centred on black. */
export const DEFAULT_CAMERA = Object.freeze({ follow: 'player_tile_centre', deadzonePx: { x: 0, y: 0 }, clampToMapEdges: true, smallMapAxis: 'centre' });

/** "Pin short maps" (README §17.2 / interior_scale_audit REPORT fix 4a): an INTERIOR that is taller than the view by at most
 *  pinShortMaps.slackTiles is pinned to its bottom edge (mat + floor visible, only the top wall-cap rows are cropped) instead of
 *  scrolling. y axis only; off when the profile has no pinShortMaps block or enabled is false. */
export const DEFAULT_PIN_SLACK_TILES = 1.6;
export function pinSlackPx(rules, ctx) {
  const p = rules?.pinShortMaps;
  if (!p || p.enabled === false || !ctx?.indoor) return 0;
  return (Number.isFinite(p.slackTiles) ? p.slackTiles : DEFAULT_PIN_SLACK_TILES) * TILE;
}

/** "Always centre" (Gary, Oct 23, 2026: mobile controls covered the player at map edges): when a profile sets
 *  camera.alwaysCentre true, the player's tile centre is the screen centre on every map (whole native px). No clamp to
 *  the map edges, no short-map centring, no pinShortMaps, no deadzone. Absent or false: the rules below, unchanged. */
/**
 * What the renderer draws outside the map. Gary (10:09 AM CT, Oct 23, 2026): under alwaysCentre anything past the map
 * edge is simply left blank (the renderer's black clear): no edge tiles, no padding. Without alwaysCentre:
 * display.outsideMap as before (mobile 'edge' around short maps, pc undefined = black).
 */
/** Gym master halls (merged hall_overhaul maps): the edge tiles run on past the map instead of black. */
export const MASTER_HALL = /^(cindervale|lanternport|mirefen|tidewater)_hall_int$/;
export function outsideFillFor(rules, display, mapName, indoor, mapFill) {
  // per-map opt-in (dev/seaport, Director art QA #13, Oct 30 2026): a map json "outside_fill": "edge" repeats its edge ground
  // past the map under any camera rule, so its edges never show black. Maps without the field keep Gary's blank rule.
  if (mapFill === 'edge') return 'edge';
  if (MASTER_HALL.test(mapName || '')) return 'edge'; // Director art QA #18 (Oct 30, 2026): no black bands round the merged master halls
  if (rules?.alwaysCentre === true) return undefined;
  return display?.outsideMap;
}

/**
 * @param {number} focusX native px of the point to centre (player tile centre)
 * @param {number} focusY
 * @param {number} mapW map width in tiles
 * @param {number} mapH map height in tiles
 * @param {number} viewW view width in native px (canvas px / zoom; may be fractional)
 * @param {number} viewH
 * @param {object} [rules] profile.camera (alwaysCentre, deadzonePx, clampToMapEdges, smallMapAxis 'centre'|'start')
 * @param {{x:number,y:number}} [prev] last camera on this map (only used when a deadzone is set)
 * @param {{indoor?: boolean}} [ctx] map facts the rules need (indoor: clock.js isIndoor, for pinShortMaps)
 * @returns {{x:number,y:number}} top-left of the view in native px (integers; negative = map centred on black)
 */
export function cameraFor(focusX, focusY, mapW, mapH, viewW, viewH, rules = DEFAULT_CAMERA, prev = null, ctx = null) {
  const r = rules || DEFAULT_CAMERA, dz = r.deadzonePx || { x: 0, y: 0 };
  if (r.alwaysCentre === true) {
    const x = Math.round(focusX - viewW / 2); let y = Math.round(focusY - viewH / 2); // centre camera rule
    // v0.2.41 (Gary: phone camera cut off the top of the wall indoors): an interior that fits the view (or is at most 3 tiles taller) keeps its top wall on screen until the player nears the bottom
    // (the player can sit up to 1.5 tiles under centre, still clear of the bottom controls); a taller one never scrolls past its
    // bottom by more than 1.5 tiles, so less of the top wall is lost. Outdoors: unchanged.
    // v0.2.86-alpha (bedroom viewport fix): with camera.centreSmallMaps (pc profile), a map narrower / shorter than the view is
    // centred on that axis instead of following the player (house_2f at 1280x800 started at x=427 with black on the left and
    // its stairs cut off on the right), and an interior wider than the view is clamped to its edges on x (no black margin).
    if (r.centreSmallMaps === true) {
      const mw = mapW * TILE, mh = mapH * TILE;
      // v0.2.86-alpha (Fernwick Hall black bottom strip): an interior taller than the view clamps y to the map (no 1.5-tile slack past the bottom).
      const iy = (vy) => (ctx?.indoor ? Math.min(Math.floor(mh - viewH), Math.max(0, vy)) : indoorY(vy, focusY, mh, viewH, ctx));
      if (mw <= viewW) return { x: Math.round((mw - viewW) / 2), y: mh <= viewH ? Math.round((mh - viewH) / 2) : iy(y) };
      const cx = ctx?.indoor ? Math.min(Math.floor(mw - viewW), Math.max(0, x)) : x;
      if (mh <= viewH) return { x: cx, y: Math.round((mh - viewH) / 2) };
      return { x: cx, y: iy(y) };
    }
    return { x, y: indoorY(y, focusY, mapH * TILE, viewH, ctx) };
  }
  return {
    x: axis(focusX, mapW * TILE, viewW, r, dz.x || 0, prev?.x),
    y: axis(focusY, mapH * TILE, viewH, r, dz.y || 0, prev?.y, pinSlackPx(r, ctx)),
  };
}

function indoorY(y, focusY, mapPx, viewH, ctx) {
  {
    if (ctx?.indoor) {
      const slack = 1.5 * TILE;
      if (mapPx <= viewH + 3 * TILE) y = Math.max(Math.min(y, 0), Math.round(focusY + slack - viewH));
      else y = Math.min(y, Math.floor(mapPx - viewH + slack));
    }
    return y;
  }
}

function axis(focus, mapPx, view, r, dz, prev, pinSlack = 0) {
  if (mapPx <= view) return r.smallMapAxis === 'start' ? 0 : Math.round((mapPx - view) / 2); // short interior: centre it on black
  if (mapPx - view <= pinSlack) return Math.floor(mapPx - view); // pinShortMaps: small overflow, pin to the bottom, no scroll
  let c = Math.round(focus - view / 2);
  if (dz > 0 && prev != null) { // deadzone: hold the camera until the focus leaves the box
    const off = focus - (prev + view / 2);
    c = Math.abs(off) <= dz ? prev : Math.round(focus - view / 2 - Math.sign(off) * dz);
  }
  if (r.clampToMapEdges === false) return c;
  return Math.min(Math.floor(mapPx - view), Math.max(0, c));
}

/**
 * Integer zoom for a canvas height in device pixels, from the profile's zoom table (profile.zoom).
 * No profile: the old rule (1 under 600, else max(2, floor(h/480))), which both profiles start from.
 * Never fractional.
 */
export function pickZoom(canvasH, zoomTable = null) {
  if (zoomTable && typeof zoomTable === 'object') return zoomFromTable(zoomTable, canvasH); // object check: [].map(pickZoom) passes an index
  if (canvasH < 600) return 1;
  return Math.max(2, Math.floor(canvasH / 480));
}
