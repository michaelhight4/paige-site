// Kilumen overworld: browser asset loading (images + JSON) with a small cache.
import { WEBP_SHEETS } from './webp_sheets.js?v=v0.2.95-alpha';
const images = new Map();
const json = new Map();

const OW_DIR = '/art/world/overworld/';
/** The lossless .webp twin of an overworld tile sheet URL, or null when that sheet ships PNG only. */
export function webpFor(url) {
  const m = /^([^?#]*)\.png([?#].*)?$/.exec(String(url));
  if (!m) return null;
  const i = m[1].lastIndexOf(OW_DIR);
  if (i < 0 || !WEBP_SHEETS.has(m[1].slice(i + OW_DIR.length) + '.png')) return null;
  return m[1] + '.webp' + (m[2] || '');
}

export function loadImage(url) {
  if (!images.has(url)) {
    images.set(url, new Promise((resolve, reject) => {
      const img = new Image();
      img.decoding = 'async';
      const webp = webpFor(url);
      img.onload = () => resolve(img);
      img.onerror = () => {
        if (webp && !img.dataset.pngFallback) { img.dataset.pngFallback = '1'; img.src = url; return; } // WebP failed: PNG
        reject(new Error('image failed: ' + url));
      };
      img.src = webp || url;
    }));
  }
  return images.get(url);
}

export function loadJson(url) {
  if (!json.has(url)) {
    json.set(url, fetch(url).then((r) => {
      if (!r.ok) throw new Error(`${r.status} ${url}`);
      return r.json();
    }));
    json.get(url).catch(() => json.delete(url)); // allow a retry after a failure
  }
  return json.get(url);
}

/** Fetch `url` again past every cache (browser HTTP cache AND the CDN edge: unique query + no-store) and replace the
 *  in-memory copy. Used when a cached file disagrees with a fresh one (exit warp fix, Gary 2:14 PM CT Oct 23 2026: a cached
 *  v0.1.3 unpadded brookhollow.json next to a fresh padded house_1f.json put the player on the RT Supply roof). */
export function reloadJson(url) {
  const busted = url + (url.includes('?') ? '&' : '?') + 'fresh=' + Date.now();
  const p = fetch(busted, { cache: 'no-store' }).then((r) => {
    if (!r.ok) throw new Error(`${r.status} ${url}`);
    return r.json();
  });
  json.set(url, p);
  p.catch(() => json.delete(url));
  return p;
}

/** Resolve `rel` against the URL of the file that referenced it (e.g. a map's "../tileset.json"). */
export function resolveUrl(rel, baseFileUrl) {
  return new URL(rel, new URL(baseFileUrl, location.href)).href;
}
