// Text Bot DRAFT lines (Oct 30 2026, not yet approved by Gary) kept in data/textbot_hall_arena.json until they move into
// text/overworld_lines.json. Loaded next to the lines file; each key in the draft replaces the same key in the lines, word for word.
export const DRAFT_URLS = ['data/textbot_hall_arena.json'];

/** Pure: lines with every draft key laid over it (keys starting with '_' are notes). */
export function withDrafts(lines, ...drafts) {
  const put = (dst, src) => {
    for (const [k, v] of Object.entries(src || {})) {
      if (k.startsWith('_')) continue;
      if (v && typeof v === 'object' && !Array.isArray(v) && !('pages' in v) && dst[k] && typeof dst[k] === 'object') put(dst[k], v);
      else if (v && typeof v === 'object' && !Array.isArray(v) && !('pages' in v)) { dst[k] = {}; put(dst[k], v); }
      else dst[k] = v;
    }
    return dst;
  };
  let out = lines || {}; for (const d of drafts) out = put(out, d); return out;
}
