// Kilumen overworld: camera (pure). Works in native pixels and always returns whole native pixels,
// so the screen scroll offset is a multiple of the zoom and pixels never shimmer.
import { TILE } from './constants.js';

/**
 * @param {number} focusX native px of the point to centre (player tile centre)
 * @param {number} focusY
 * @param {number} mapW map width in tiles
 * @param {number} mapH map height in tiles
 * @param {number} viewW view width in native px (canvas px / zoom; may be fractional)
 * @param {number} viewH
 * @returns {{x:number,y:number}} top-left of the view in native px (integers; negative = map centred on black)
 */
export function cameraFor(focusX, focusY, mapW, mapH, viewW, viewH) {
  return { x: axis(focusX, mapW * TILE, viewW), y: axis(focusY, mapH * TILE, viewH) };
}

function axis(focus, mapPx, view) {
  if (mapPx <= view) return Math.round((mapPx - view) / 2); // smaller than the view: centre it on black
  const max = Math.floor(mapPx - view);
  return Math.min(max, Math.max(0, Math.round(focus - view / 2)));
}

/**
 * Integer zoom for a canvas height in device pixels. Matches the kit README:
 * 1080p -> x2, 1440p -> x3, 720p -> x2, 2160p -> x4. Never fractional.
 */
export function pickZoom(canvasH) {
  if (canvasH < 600) return 1;
  return Math.max(2, Math.floor(canvasH / 480));
}
