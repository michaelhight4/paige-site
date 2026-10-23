// Progression pass (Oct 23, 2026, overnight coder): Masters 2-8, hall puzzles 2-8, quests. Feature switches; anything
// half-done defaults OFF so a new game never breaks. URL: ?pg=quests,hallPuzzles (on), ?pg=-masters (off), ?pg=all. Not saved.
export const PROGRESSION_DEFAULTS = Object.freeze({
  masters: true,             // halls 2-8: story results (beat_master_* flag = coin), GD teams, coin record. Those hall maps are not built, so nothing changes in play today.
  masterTeamFernwick: false, // use Game dev's real team for the LIVE Fernwick Master + hall trainers (changes today's difficulty: Gary to OK)
  masterGifts: false,        // Master gift items (ids are PLACEHOLDERS from Game dev; given only when the id exists in src/systems/items.js)
  hallPuzzles: false,        // generic hall puzzle runtime + preview overlay (?hall=<zone>); hall maps 2-8 not built yet
  quests: false,             // data/quests.json quest system: quest log (phone Tasks), HUD tracker, NPC give / turn-in, rewards
});

export function progressionFlags(query) {
  const f = { ...PROGRESSION_DEFAULTS };
  const raw = ''; // ALPHA build: ?pg= ignored
  for (const t of raw.split(',').map((s) => s.trim()).filter(Boolean)) {
    if (t === 'all') for (const k of Object.keys(f)) f[k] = true;
    else if (t[0] === '-' && t.slice(1) in f) f[t.slice(1)] = false;
    else if (t in f) f[t] = true;
  }
  return f;
}
