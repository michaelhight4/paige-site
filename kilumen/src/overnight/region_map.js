// Overnight systems (Oct 23, 2026): region map fast travel (Skylift, FIELD_SKILLS.md 1) behind OVERNIGHT flag
// `regionmap` (default OFF). Open the phone Map (existing scr_map, art/world/world_map.png + zone markers), pick a
// town, A -> Skylift. Data only: world_layout.json fly.destinations + map fly_point; no map names are hard-coded.
// visited_<town> is recorded on every on-foot entry to the town map whether or not the flag is on (FIELD_SKILLS.md 131).
// Lumen Line (rail): railStops() + RegionMap.railTo(stopId) are ready, but NOT bound to any NPC: station_attendant talk is
// Story/quests territory (question for Gary). Whoever owns the clerk calls scene.overnight.region.railTo(id).
import { Col } from '../overworld/constants.js?v=v0.2.35-alpha';

const INDOOR = (n) => /_int$|^house_|^home_|^heal_|^lab_|^shop|^club|^office|^station|^rt_branch|^lantern_rest/.test(n);
const CAVE = (n) => /^greystone/.test(n);

/** Which town zone owns this map (zone.maps lists it first-match; a zone id equal to the map name wins). */
export function townOf(layout, mapName) {
  const fly = layout?.fly?.destinations || {};
  if (fly[mapName]) return mapName;
  return null;
}

/** visited flag to set when walking into mapName (only the town's own outdoor map counts). */
export function visitedFlagFor(layout, mapName) {
  const t = townOf(layout, mapName);
  return t ? layout.fly.destinations[t].visited_flag || `visited_${t}` : null;
}

/** Why take-off is refused here, or null. -> 'indoors' | 'cave' | 'rail_only' | 'on_bike_only_cell' | 'locked' */
export function takeoffBlock(layout, map, flags, x, y) {
  const flag = layout?.fly?.flag || 'has_skylift';
  if (!flags.has(flag)) return 'locked';
  const n = map.name;
  if (CAVE(n)) return 'cave';
  if (INDOOR(n) || map.movement?.bike !== true) return 'indoors'; // FIELD_SKILLS.md 1.1: outdoors = movement.bike true
  const zone = (layout.zones || []).find((z) => z.id === n || (z.maps || [])[0] === n);
  const dest = layout.fly?.destinations?.[zone?.id || n];
  if (dest && dest.fly === false) return 'rail_only';
  const c = map.code(x, y);
  if (c === Col.BIKE_ONLY || map.noDismount?.(x, y)) return 'on_bike_only_cell';
  return null;
}

/** Destination list in a stable order (world_layout order): {id, name, ok, why, spawn}. */
export function destinations(layout, flags) {
  const names = Object.fromEntries((layout.zones || []).map((z) => [z.id, z.name]));
  return Object.entries(layout?.fly?.destinations || {}).map(([id, d]) => {
    const visited = flags.has(d.visited_flag || `visited_${id}`);
    const fp = typeof d.fly_point === 'object' ? d.fly_point : null;
    let why = null;
    if (d.fly === false) why = 'rail_only';
    else if (!visited) why = 'not_visited';
    else if (!fp || !d.map) why = 'not_built';
    return { id, name: names[id] || id, ok: !why, why, spawn: fp && d.map ? { map: d.map, x: fp.x, y: fp.y, facing: fp.facing || 'down' } : null };
  });
}

/** If the landing cell is taken, the nearest walkable free cell (ring search). */
export function landingCell(map, x, y) {
  const free = (cx, cy) => map.inBounds(cx, cy) && map.passable(cx, cy, 'walk') && map.code(cx, cy) !== Col.DOOR;
  if (free(x, y)) return { x, y };
  for (let r = 1; r < 8; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
    if (free(x + dx, y + dy)) return { x: x + dx, y: y + dy };
  }
  return { x, y };
}

/** Lumen Line stops in world_layout.rail order: {id, name, ok, why}. why: no_pass | not_visited | not_built. */
export function railStops(layout, flags, built = new Set(layout?.maps_built || [])) {
  const rail = layout?.rail || {}, names = Object.fromEntries((layout?.zones || []).map((z) => [z.id, z.name]));
  return (rail.stops || []).map((id) => {
    let why = null;
    if (!flags.has(rail.flag || 'has_rail_pass')) why = 'no_pass';
    else if (!flags.has(`visited_${id}`)) why = 'not_visited';
    else if (!built.has(id)) why = 'not_built';
    return { id, name: names[id] || id, ok: !why, why };
  });
}

/** Arrival cell for a stop: one tile below the town's door warp into station_int (the shared interior uses $return). */
export function railArrival(townMap, interior = 'station_int') {
  const w = (townMap?.warps || []).find((q) => q.to === interior);
  return w ? { map: townMap.name, x: w.x, y: w.y + 1, facing: 'down' } : null;
}

export class RegionMap {
  constructor(scene, enabled) { this.scene = scene; this.enabled = enabled; this.pendingLanding = false; }
  get layout() { return this.scene.layout; }

  onEnter(m) {
    const s = this.scene, f = visitedFlagFor(this.layout, m.name);
    if (f && !s.flags.has(f)) { s.flags.add(f); s._dirty = true; s.log.push({ tick: s.tick, type: 'flag', flag: f, on: true, opened: [] }); }
    if (this.pendingLanding) { // Skylift lands on foot; nudge off an occupied fly point
      this.pendingLanding = false;
      const p = s.player, c = landingCell(m, p.x, p.y);
      if (c.x !== p.x || c.y !== p.y) p.place(c.x, c.y, p.facing);
    }
  }

  /** Lumen Line ride to a stop (call from the station clerk's talk). Shows the clerk's no_pass / confirm lines. */
  async railTo(stopId) {
    if (!this.enabled) return false;
    const s = this.scene, R = 'rail_only.npcs.station_attendant.';
    const st = railStops(this.layout, s.flags, s.knownMaps || undefined).find((q) => q.id === stopId);
    if (!st) return false;
    await s.script(async () => {
      if (st.why === 'no_pass') { await s.say(this.pages(R + 'no_pass') || ['You need a pass.']); return; }
      if (!st.ok) { await s.say(this.pages('field_skills.skylift.not_visited', { city: st.name }) || [`${st.name}: not yet.`]); return; }
      const town = await s.loadMap(stopId), spawn = railArrival(town);
      if (!spawn) { await s.say([`[PLACEHOLDER] ${st.name} has no station door yet.`]); return; }
      await s.say(this.pages(R + 'confirm', { city: st.name }) || [`Next train to ${st.name}.`]);
      if (s.player.mode !== 'walk') s.player.mode = 'walk';
      s.log.push({ tick: s.tick, type: 'rail', to: stopId });
      s.startWarp(spawn, 'rail');
    });
    return true;
  }

  vars(extra = {}) { const s = this.scene, lead = s.party?.[0]; return { ...s.textVars(), skill: 'Skylift', creature: lead ? lead.nickname || lead.species[0].toUpperCase() + lead.species.slice(1) : 'Your creature', nearest_station: 'Saltmere Central', ...extra }; }
  pages(path, extra) { let v = this.scene.lines; for (const k of path.split('.')) v = v?.[k]; return v ? this.scene.fill([].concat(v), this.vars(extra)) : null; }

  /** Phone Map screen A on a zone. Returns true when handled (the UI closes itself before the script runs). */
  async travelTo(zoneId) {
    if (!this.enabled) return false;
    const s = this.scene, p = s.player;
    const block = takeoffBlock(this.layout, s.map, s.flags, p.x, p.y);
    const SK = 'field_skills.skylift.';
    if (block) {
      const key = block === 'locked' ? SK + 'cant_use_yet' : block === 'rail_only' ? 'rail_only.skylift_blocked.take_off_here' : SK + block;
      await s.script(() => s.say(this.pages(key) || ['Not here.']));
      return true;
    }
    const d = destinations(this.layout, s.flags).find((q) => q.id === zoneId);
    if (!d) return false; // routes / caves: the map just shows them
    if (!s.party?.length) { await s.script(() => s.say(this.pages(SK + 'no_creature') || ['No creature can carry you.'])); return true; }
    await s.script(async () => {
      if (!d.ok) {
        const key = d.why === 'rail_only' ? SK + 'rail_only_destination' : SK + 'not_visited';
        await s.say(this.pages(key, { city: d.name }) || [`${d.name}: not yet.`]);
        return;
      }
      const yes = (await s.ask(this.pages(SK + 'confirm', { city: d.name }) || [`Head to ${d.name}?`], s.lines?.field_skills?.skylift?.choices || ['Yes', 'No'])) === 0;
      if (!yes) return;
      await s.say(this.pages(SK + 'use') || ['Up and away!']);
      if (p.mode !== 'walk') p.mode = 'walk'; // Skylift always leaves the player on foot
      this.pendingLanding = true;
      s.log.push({ tick: s.tick, type: 'skylift', to: d.id });
      s.startWarp({ ...d.spawn }, 'skylift');
    });
    return true;
  }
}
