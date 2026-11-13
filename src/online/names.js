// Display names are built from fixed word lists (no typed names), so a name can't be rude or
// carry personal info. The name is derived from the player id; the player can re-roll it.
const ADJ = ['Sunny', 'Brave', 'Misty', 'Mossy', 'Quick', 'Calm', 'Bright', 'Lucky', 'Jolly', 'Gentle', 'Swift', 'Cosy', 'Breezy', 'Starry', 'Pebbly', 'Merry'];
const NOUN = ['Fern', 'Comet', 'Otter', 'Lantern', 'Acorn', 'Puddle', 'Kite', 'Sparrow', 'Pebble', 'Clover', 'Maple', 'Ripple', 'Biscuit', 'Glimmer', 'Thistle', 'Bramble'];
export function hash32(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
export function nameFor(id, roll = 0) {
  const h = hash32(`${id}|${roll}`);
  return `${ADJ[h % ADJ.length]} ${NOUN[(h >>> 4) % NOUN.length]} ${String((h >>> 8) % 100).padStart(2, '0')}`;
}
const NAME_RE = new RegExp(`^(${ADJ.join('|')}) (${NOUN.join('|')}) \\d\\d$`);
/** Receivers re-check names: anything not built from the lists is shown as "Player". */
export function safeName(name) { return typeof name === 'string' && NAME_RE.test(name) ? name : 'Player'; }
