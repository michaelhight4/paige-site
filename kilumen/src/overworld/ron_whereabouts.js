// Kilumen: where Ron (the roommate) is between Masters (v0.2.49, Gary 8:54 AM CT Oct 29 2026: "your room mate shouldn't be in
// every town statically, once you defeat the gym leader he's home, once you get into a town that's next on your punch list
// he's there until you beat it then back home until you get to the next city").
//   - Punch list = Masters in coin order (data/masters.json), then Aurelith (final Ron battle, done = beat_rival_ron_6).
//   - Entering the town whose Master is next sets `ron_in_<zone>`: from then on Ron is in that town (his map NPC there, e.g.
//     saltmere_ron_2, or a spawned `ron_town` beside the hall door when the town has none) and NOT at home.
//   - That Master beaten: the next target changes, so he is home again (house_1f `ron`) until the player reaches the next town.
//   - Ron NPCs on any other town are hidden. Route Rons (frostspire_pass_ron_4) show only while their town is next and that
//     rival battle is not won yet. Rival battles 1-6 keep their own triggers / flags (src/battle/story.js), untouched.
//   - Home Ron: the first talk after each win is a reaction to that Master (Text Bot key maps.house_1f.ron_home_after_<zone>,
//     placeholder below until then); later talks use his normal lines. Town Ron (spawned): maps.<town>.ron_town or placeholder.
// No map JSON edits: applied on map entry from StoryRon.tick (remove / spawn, like the story Ron).
import { Npc } from './npcs.js?v=v0.2.72-alpha';

/** Punch list in order: {zone, town (map), flag (done when set)}. */
export const RON_PUNCH_LIST = [
  { zone: 'fernwick', town: 'fernwick', flag: 'beat_master_fernwick' },
  { zone: 'saltmere', town: 'saltmere', flag: 'beat_master_saltmere' },
  { zone: 'revival_heights', town: 'revival_heights', flag: 'beat_master_revival' },
  { zone: 'frostspire', town: 'frostspire', flag: 'beat_master_frostspire' },
  { zone: 'mirefen', town: 'mirefen', flag: 'beat_master_mirefen' },
  { zone: 'tidewater_coast', town: 'tidewater_coast', flag: 'beat_master_tidewater' },
  { zone: 'lanternport', town: 'lanternport', flag: 'beat_master_lanternport' },
  { zone: 'cindervale', town: 'cindervale', flag: 'beat_master_cindervale' },
  { zone: 'aurelith', town: 'aurelith', flag: 'beat_rival_ron_6', final: true },
];
export const RON_TOWNS = new Set(RON_PUNCH_LIST.map((p) => p.town));
/** Ron NPCs placed on routes: route map -> zone whose Master must be next (and the rival flag that retires him). */
export const RON_ROUTES = { frostspire_pass: { zone: 'frostspire', flag: 'beat_rival_ron_4' } };
export const RON_HOME = { map: 'house_1f', id: 'ron' };
export const RON_TOWN_ID = 'ron_town';
export const ronInFlag = (zone) => `ron_in_${zone}`;
export const ronHeardFlag = (zone) => `ron_home_heard_${zone}`;

// Placeholder text (Text Bot owns overworld_lines.json: see data/textbot_requests_ron_whereabouts.md).
export const RON_HOME_PLACEHOLDER = {
  fernwick: ['One coin, {nick}. Fernwick folds already?', "I'll put the kettle on. You put the coin somewhere I can see it."],
  saltmere: ['You smell like the harbour. And like two coins.', "Saltmere's Master is tough. I heard. From you. Just now."],
  revival_heights: ['Three. I counted twice to make sure.', 'Revival Heights, done. Sit down before you fall down.'],
  frostspire: ['Frostspire. You came back with a coin and half a mountain of snow on your boots.', 'Boots off, {nick}. Please.'],
  mirefen: ['Five coins and you only smell a little bit like the bog.', "I'm proud of you. Don't make it weird."],
  tidewater_coast: ['Six. The coast Master, beaten. By my roommate.', "I'm telling everyone. I'm telling the bins."],
  lanternport: ['Seven, {nick}. Lanternport\'s lights must look dimmer tonight.', 'One more. Then we see what all this was for.'],
  cindervale: ['Eight coins. All of them.', "Go on, then. Aurelith. I'll meet you there."],
  aurelith: ['Home. Both of us. Feels smaller in here than before.', 'Good smaller. Mostly.'],
};
export const RON_TOWN_PLACEHOLDER = {
  fernwick: ['There you are, {nick}. Fernwick first. Try to keep up.'],
  saltmere: ['Saltmere, {nick}. The hall is past the fish market.'],
  revival_heights: ['Revival Heights. Third coin. No pressure.'],
  frostspire: ["Frostspire, {nick}. I can't feel my ears. The hall's up ahead."],
  mirefen: ["Mirefen. Watch your step, {nick}. I didn't."],
  tidewater_coast: ['Tidewater. The Master here likes the long game. Be patient for once.'],
  lanternport: ['Lanternport, {nick}. I got here first. That counts for something.'],
  cindervale: ['Cindervale. Last one, {nick}. Go on. I\'ll be right here.'],
  aurelith: ['Aurelith. This is it, {nick}.'],
};

/** Next stop on the punch list for these flags, or null (all done). */
export function ronTarget(flags) { return RON_PUNCH_LIST.find((p) => !flags.has(p.flag)) || null; }
/** Most recent stop the player finished, or null. */
export function ronLastWin(flags) { let last = null; for (const p of RON_PUNCH_LIST) if (flags.has(p.flag)) last = p; else break; return last; }
/** Ron is out in a town (not home): he reached the next town with the player. */
export function ronAway(flags) { const t = ronTarget(flags); return !!t && flags.has(ronInFlag(t.zone)); }

/** Is a map Ron NPC (not house_1f's, not story Ron) allowed on mapName right now? null = not governed by this rule. */
export function ronAllowedOn(flags, mapName) {
  const t = ronTarget(flags);
  if (RON_TOWNS.has(mapName)) return !!t && t.town === mapName;
  const r = RON_ROUTES[mapName];
  if (r) return !!t && t.zone === r.zone && !flags.has(r.flag);
  return null;
}

/** Where Ron is right now: {where:'home'} | {where:'town', town, zone} | {where:'unset'} (before the opening is over). */
export function ronWhere(flags) {
  const t = ronTarget(flags);
  if (t && flags.has(ronInFlag(t.zone))) return { where: 'town', town: t.town, zone: t.zone };
  return { where: 'home' };
}

/** Past the opening: has a starter (or an old save that is already past a Master). */
export const ronBegun = (s) => s.flags.has('got_starter') || RON_PUNCH_LIST.some((p) => s.flags.has(p.flag)) || !!(s.systems?.party?.list || s.party || []).length;

const pages = (v) => (Array.isArray(v) ? v : v?.pages) || null;

/** Home reaction pages for the last win (Text Bot key or placeholder), or null when already heard / nothing won. */
export function ronHomeReaction(scene) {
  const F = scene.flags, last = ronLastWin(F);
  if (!last || F.has(ronHeardFlag(last.zone))) return null;
  const tb = pages(scene.lines?.maps?.[RON_HOME.map]?.[`ron_home_after_${last.zone}`]);
  return { zone: last.zone, pages: tb || RON_HOME_PLACEHOLDER[last.zone] || null };
}

/** Town Ron's talk pages (spawned `ron_town`). */
export function ronTownPages(scene, zone) {
  const town = RON_PUNCH_LIST.find((p) => p.zone === zone)?.town;
  return pages(scene.lines?.maps?.[town]?.[RON_TOWN_ID]) || RON_TOWN_PLACEHOLDER[zone] || ['...'];
}

/**
 * Apply the rule to the current map (call once per map entry, after NPCs are built). story = StoryRon (remove/spawn helpers).
 * isRon(n) decides which NPCs are Ron. -> {removed:[ids], spawned:id|null, entered:zone|null}
 */
export function applyRonWhereabouts(story, isRon) {
  const s = story.scene, F = s.flags, m = s.map, name = m?.name, out = { removed: [], spawned: null, entered: null };
  if (!m || !s.npcs) return out;
  const t = ronTarget(F);
  if (t && t.town === name && !F.has(ronInFlag(t.zone)) && ronBegun(s)) { // arrived: he's here until this one is done
    s.setFlag ? s.setFlag(ronInFlag(t.zone)) : F.add(ronInFlag(t.zone));
    out.entered = t.zone;
  }
  if (name === RON_HOME.map) {
    const h = s.npcs.byId(RON_HOME.id);
    if (h && ronAway(F)) { story.remove(h); out.removed.push(h.id); }
    return out;
  }
  const allowed = ronAllowedOn(F, name);
  if (allowed === null) return out;
  const rons = s.npcs.list.filter((n) => isRon(n) && n.id !== 'ron_story');
  if (!allowed) { for (const n of rons) { story.remove(n); out.removed.push(n.id); } return out; }
  if (!rons.length && RON_TOWNS.has(name) && ronBegun(s)) { const n = spawnTownRon(story, t.zone); if (n) out.spawned = n.id; }
  return out;
}

/** Free walkable cell near the hall door (or the town's first warp / the player) for the spawned town Ron. */
export function townRonCell(s) {
  const m = s.map, warps = m.warps || m.json?.warps || [];
  const door = warps.find((w) => /_hall_int$/.test(w.to || '')) || null;
  const free = (x, y) => m.inBounds?.(x, y) && m.code(x, y) === 0 && !m.npcAt?.(x, y) && !m.warpAt?.(x, y)
    && !(s.player && s.player.x === x && s.player.y === y) && !warps.some((w) => w.x === x && w.y === y);
  const near = (c, offs) => { for (const [dx, dy] of offs) if (free(c.x + dx, c.y + dy)) return { x: c.x + dx, y: c.y + dy }; return null; };
  const ring = []; for (let r = 1; r <= 4; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (Math.max(Math.abs(dx), Math.abs(dy)) === r) ring.push([dx, dy]);
  if (door) { const c = near(door, [[2, 1], [-2, 1], [1, 2], [-1, 2], [2, 2], [-2, 2], [0, 3], ...ring.filter(([, dy]) => dy > 0), ...ring]); if (c) return c; }
  if (s.player) return near(s.player, ring);
  return null;
}

export function spawnTownRon(story, zone) {
  const s = story.scene, m = s.map, c = townRonCell(s);
  if (!c) return null;
  const n = new Npc({ id: RON_TOWN_ID, kind: 'object', x: c.x, y: c.y, facing: 'down', story: true, zone }, m.name, s.spriteMap?.['house_1f.ron'] || null, false);
  n.behaviour = 'static';
  if (s.player) n.faceToward(s.player.x, s.player.y);
  s.npcs.list.push(n); m.occupy?.(n.x, n.y, n);
  story.loadImgs?.(n);
  s.log.push({ tick: s.tick, type: 'ronWhere', step: 'spawn', map: m.name, zone, x: n.x, y: n.y });
  return n;
}

/** Talk hook (intro.onTalk): spawned town Ron, home reaction after a win. -> true when handled. */
export function ronWhereTalk(s, n, def) {
  if (def?.id === RON_TOWN_ID) {
    const zone = def.zone || ronTarget(s.flags)?.zone;
    s.script(async () => { if (n) s.npcs.beginTalk(n); try { await s.say(ronTownPages(s, zone), s.speakerFor(n)); } finally { if (n) s.npcs.endTalk(n); } });
    return true;
  }
  if (s.map?.name === RON_HOME.map && def?.id === RON_HOME.id && ronBegun(s)) {
    const r = ronHomeReaction(s);
    if (!r?.pages) return false;
    s.log.push({ tick: s.tick, type: 'ronWhere', step: 'homeReaction', zone: r.zone });
    s.script(async () => {
      if (n) s.npcs.beginTalk(n);
      try { await s.say(r.pages, s.speakerFor(n)); } finally { if (n) s.npcs.endTalk(n); }
      s.setFlag(ronHeardFlag(r.zone)); // after the conversation (script end): never mid-dialogue
    });
    return true;
  }
  return false;
}
