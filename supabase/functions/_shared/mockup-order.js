// Order Lift Within product photos: front views and print files first, back views last.
// Everything else keeps its original order. Used by the shop page and the Printful proxies.

const VIEW = (word) => new RegExp(`(?:^|[^a-z0-9])${word}(?:[^a-z0-9]|$)`);

export function hasViewWord(text, word) {
  return VIEW(word).test(String(text || "").toLowerCase());
}

/** Hints a Printful file or a mockup record exposes: type, placement, name, url. */
export function mockupHint(input) {
  if (input == null) return "";
  if (typeof input === "string") return input;
  const bits = [];
  for (const key of ["type", "placement", "role", "name", "filename", "title", "display_name", "url", "preview_url", "thumbnail_url", "src"]) {
    const value = input[key];
    if (typeof value === "string" && value) bits.push(value);
  }
  if (Array.isArray(input.options)) {
    for (const option of input.options) {
      if (!option) continue;
      if (typeof option.id === "string") bits.push(option.id);
      if (typeof option.value === "string") bits.push(option.value);
    }
  }
  return bits.join(" ");
}

function placementOf(input) {
  if (!input || typeof input !== "object") return "";
  return String(input.type || input.placement || "").toLowerCase();
}

function isMockupPhoto(input) {
  const type = placementOf(input);
  return type === "preview" || type === "mockup" || type.includes("preview") || type.startsWith("mockup");
}

/** Print artwork (default / front / embroidery / …), not a generated view photo and not a back print. */
export function carriesPrint(input) {
  if (!input || typeof input === "string") return false;
  const type = placementOf(input);
  if (!type || isMockupPhoto(input)) return false;
  if (hasViewWord(type, "back") && !hasViewWord(type, "front")) return false;
  return true;
}

/**
 * 0 = show first (name/type/placement/url says front, or the file is the print).
 * 1 = unspecified, keep stable.
 * 2 = back view, show last. A back wins over "front" only when the hint is not also a front view
 *     (`left-front` stays with the fronts; `right-back` goes last).
 */
export function mockupRank(input) {
  const text = mockupHint(input).toLowerCase();
  const front = hasViewWord(text, "front");
  const back = hasViewWord(text, "back");
  if (back && !front) return 2;
  if (front || carriesPrint(input)) return 0;
  return 1;
}

export function orderByMockupView(items, hintOf = mockupHint) {
  return items
    .map((item, index) => ({ item, index, rank: mockupRank(hintOf(item)) }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map((entry) => entry.item);
}

function imageOf(input) {
  if (typeof input === "string") return input;
  if (!input || typeof input !== "object") return "";
  if (typeof input.preview_url === "string" && input.preview_url) return input.preview_url;
  // Shop records store the display URL on `url`. Printful `url` is the source file (sometimes a PDF), so ignore it when `type` is set.
  if (!input.type && typeof input.url === "string" && input.url) return input.url;
  if (typeof input.src === "string" && input.src) return input.src;
  return typeof input.thumbnail_url === "string" ? input.thumbnail_url : "";
}

export function orderedImageUrls(items) {
  const urls = [];
  for (const item of orderByMockupView(items)) {
    const url = imageOf(item);
    if (url && !urls.includes(url)) urls.push(url);
  }
  return urls;
}

/** List-card hero. Within the best tier, prefer an exact color match (the shop uses Black). */
export function leadingImage(items, preferColor) {
  const ranked = orderByMockupView(items);
  if (!ranked.length) return "";
  const best = mockupRank(ranked[0]);
  if (preferColor) {
    const hit = ranked.find((item) => mockupRank(item) === best && item && item.color === preferColor);
    if (hit) return imageOf(hit);
  }
  return imageOf(ranked[0]);
}

/**
 * Gallery URLs for one Printful sync variant.
 * Mockup photos only, ordered front / print / other / back.
 * A print file is used as the hero only when every mockup is a back (or there is no mockup),
 * so a plain back never leads while the artwork file is present, and a garment preview is never
 * replaced by the flat print.
 */
export function mockupImageUrls(files) {
  const list = Array.isArray(files) ? files : [];
  const mockups = orderByMockupView(list.filter((file) => isMockupPhoto(file) && imageOf(file)));
  const urls = [];
  for (const file of mockups) {
    const url = imageOf(file);
    if (url && !urls.includes(url)) urls.push(url);
  }
  const heroIsBack = !mockups.length || mockupRank(mockups[0]) === 2;
  if (heroIsBack) {
    const prints = orderByMockupView(list.filter((file) => carriesPrint(file) && imageOf(file) && !isMockupPhoto(file)));
    const print = prints.find((file) => mockupRank(file) < 2);
    const url = print ? imageOf(print) : "";
    if (url && !urls.includes(url)) urls.unshift(url);
  }
  return urls;
}
