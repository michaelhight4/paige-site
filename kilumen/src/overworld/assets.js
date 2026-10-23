// Kilumen overworld: browser asset loading (images + JSON) with a small cache.
const images = new Map();
const json = new Map();

export function loadImage(url) {
  if (!images.has(url)) {
    images.set(url, new Promise((resolve, reject) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('image failed: ' + url));
      img.src = url;
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

/** Resolve `rel` against the URL of the file that referenced it (e.g. a map's "../tileset.json"). */
export function resolveUrl(rel, baseFileUrl) {
  return new URL(rel, new URL(baseFileUrl, location.href)).href;
}
