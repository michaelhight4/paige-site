// Fruit feeds switch. OFF by default (Gary approves shots first). The alpha build (src/alpha.js) strips every URL param, so
// players can't turn it on. Tests / dev: set globalThis.KILUMEN_FEEDS = true before boot (and KILUMEN_FEEDS_KIT = true for a
// starter set of fruit + seedlings). ?feeds=1 / ?feedskit=1 work only in a non-alpha build. To ship: set FEEDS_DEFAULT = true.
export const FEEDS_DEFAULT = false;
export function feedsEnabled(q) {
  if (globalThis.KILUMEN_FEEDS === true) return true;
  const v = q?.get?.('feeds');
  return v === '1' ? true : v === '0' ? false : FEEDS_DEFAULT;
}
