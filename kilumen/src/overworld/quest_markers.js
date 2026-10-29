// Kilumen: which tiles get the golden arrow for quests (Oct 23, 2026; Gary 9:34 AM CT).
// Rule: an arrow over every quest ITEM / pickup object needed by an active quest (main or side), until it is collected:
//  - a map pickup whose pickup flag is the flag of a not-yet-done required step of an active / ready quest;
//  - a map pickup whose `quest` field names an active / ready quest (for future data);
//  - a map pickup of item X while the current step of an active quest needs `has_item X` and the bag has none.
// Side-quest GIVER NPCs never get a marker (no '!', no arrow, no map dot): players find them by talking to people.
// This module never looks at NPCs at all, so a giver can't get one by accident. Main-story NPCs: none either.
// Pure (no DOM): returns [{x, y, id, quest}] for the current map.
import { pickupFlag } from '../systems/bag.js?v=v0.2.54-alpha';

const OPEN = new Set(['active', 'ready']);

/**
 * @param {object} qb    QuestBook (progression ?pg=quests) or null
 * @param {Set} flags    scene flags
 * @param {object} map   current Map (name, items)
 * @param {object} [opt] {bagCount(id) -> n}
 */
export function questItemSpots(qb, flags, map, opt = {}) {
  if (!qb || !map?.items?.length) return [];
  const want = new Map(); // pickup flag -> quest id
  const wantItem = new Map(); // item id -> quest id (has_item steps)
  const byQuest = new Set();
  for (const q of qb.quests || []) {
    if (!OPEN.has(qb.status(q, flags))) continue;
    byQuest.add(q.id);
    for (const s of qb.required(q)) if (s.flag && !qb.stepDone(q, s, flags)) want.set(s.flag, q.id);
    const cur = qb.current(q, flags), m = /^has_item\s+(\S+)$/.exec(cur?.condition || '');
    if (m && !(opt.bagCount?.(m[1]) > 0)) wantItem.set(m[1], q.id);
  }
  if (!want.size && !wantItem.size && !byQuest.size) return [];
  const out = [];
  for (const it of map.items) {
    if (it.hidden) continue; // hidden pickups stay a secret
    const f = it.flag || pickupFlag(map.name, it);
    if (flags.has(f)) continue; // collected
    const quest = want.get(f) || (it.quest && byQuest.has(it.quest) ? it.quest : null) || wantItem.get(it.item) || null;
    if (quest) out.push({ x: it.x, y: it.y, id: it.id, quest });
  }
  return out;
}
