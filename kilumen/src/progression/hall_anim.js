// Hall animated tiles (hall overhaul phase 2, Oct 29 2026; Animator's kit /workspace/kilumen_anim_halls, DRAFT pending Gary).
// Flag `hallanim`: ON by default in dev (any host but paigegames.net, or a ?dev=1 session), OFF by default on the public alpha.
// Overrides: globalThis.KILUMEN_HALLANIM = true / false (alpha.js sets false for ?hallanim=0, true for ?hallanim=1 in dev only).
// One shared clock: every animated cell draws frame = floor(ms / frame_ms) % n from the renderer's sim ms (renderer.tileFrame),
// so all copies stay in phase. The one-shot sinking slab plays through scene.rustles (start ms per cell), the same path the
// grass rustle uses. Cells come from the map's hall_v2.anim block (tools/hall_overhaul/build.py anim_block):
//   ground: conveyors / currents / rip tide / ice sparkle / warp pads / sluice water / slab; decoration: gusts, ghost shimmer,
//   light gates; overlay + ysort (depth-sorted with the player, renderer row pass): reeds, prism.
import { loadJson, resolveUrl } from '../overworld/assets.js?v=v0.2.105-alpha';

/** Pure flag read (tests pass the pieces). */
export function hallAnimOn({ override = globalThis.KILUMEN_HALLANIM, host = globalThis.location?.hostname ?? '', devRequested = !!globalThis.KILUMEN_DEV_REQUESTED } = {}) {
  if (override === true || override === false) return override;
  return devRequested || !/(^|\.)paigegames\.net$/i.test(String(host));
}

/** Append tileset_hallanim.json (ids 9951+) to a tileset, sheet path moved to this zoom's folder. No-op when the flag is off. */
export async function withHallAnim(ts, url, on = hallAnimOn()) {
  if (!on || ts.tiles.some((t) => t.category === 'hall_anim')) return ts;
  try {
    const kit = await loadJson(resolveUrl('tileset_hallanim.json', url));
    const z = (/tileset_(\d)x\.json$/.exec(url) || [0, '1'])[1];
    return { ...ts, tiles: [...ts.tiles, ...kit.tiles.map((t) => ({ ...t, sheet: t.sheet.replace(/^tiles_1x\//, `tiles_${z}x/`) }))] };
  } catch (e) { console.warn('hall anim kit not loaded', e.message); return ts; }
}

/** Append tileset_hallart.json (ids 9981+: push tiles + warp pads, Character models Oct 29 2026, DRAFT) to a tileset. Always on:
 *  the hall maps' push/warp ground cells point at these ids (tools/hall_overhaul/hall_art_kit.py). */
export async function withHallArt(ts, url) {
  if (ts.tiles.some((t) => t.category === 'hall_art')) return ts;
  try {
    const kit = await loadJson(resolveUrl('tileset_hallart.json', url));
    const z = (/tileset_(\d)x\.json$/.exec(url) || [0, '1'])[1];
    return { ...ts, tiles: [...ts.tiles, ...kit.tiles.map((t) => ({ ...t, sheet: t.sheet.replace(/^tiles_1x\//, `tiles_${z}x/`) }))] };
  } catch (e) { console.warn('hall art kit not loaded', e.message); return ts; }
}

/** Put the animated cells on a hall map (idempotent; skipped when the tiles are not loaded). -> number of cells set. */
export function applyHallAnim(map) {
  const a = map?.json?.hall_v2?.anim; if (!a || !map.tileByName?.('ha_fernwick_sinking_slab')) return 0;
  let n = 0;
  for (const [x, y, name, layer] of a.cells || []) {
    if (!map.layers[layer]) continue;
    if (map.tileByName(name)) { map.setTile(layer, x, y, name); n++; }
  }
  return n;
}
