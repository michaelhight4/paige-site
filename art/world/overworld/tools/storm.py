# Weather variants of built maps (storm_season). Owned by the overworld owner.
# route1_storm = Route 1 with the east lowland flooded (after beat_master_mirefen sets storm_season; the player already has Tideglide then).
# Written to maps/variants/<name>.json (NOT maps/*.json: same npc/sign ids as the base map, text stays maps.route1.*).
import copy, collections
SKIP_GENERIC = {'route1_storm'}
STATION_NOTE = ('station_int (merged from maps_new/station_int.json): one shared interior for every Lumen Line stop. '
                'Exterior: the station building door tile x_station_4_3 (multi-tile x_station, door cell = col 4,row 3) gets a warp '
                'to station_int (9,11) facing up (the two inner mat cells are (9,12),(10,12)). station_int\'s mat warps use to="$return": '
                'the engine sends the player back to the exterior door the player entered by, one tile below it, facing down '
                '(tx/ty are ignored for $return). Stops: saltmere, lanternport, revival_heights, aurelith (none built yet).')
# east lowland flood (route1 coords). Water needs Tideglide; deep water is never crossable; flood = shallow, walkable.
WATER = {(x, y) for x in range(25, 32) for y in range(9, 13)} | {(25, y) for y in range(6, 9)} | {(31, y) for y in (14, 15)} | {(32, y) for y in range(12, 15)}   # (31,13) stays dry: trainer_r1_b stands there
DEEP = {(x, y) for x in range(27, 30) for y in range(10, 12)}
FLOOD = {(25, 10), (25, 11), (31, 10), (31, 11), (32, 10), (32, 11), (33, 10), (33, 11), (31, 9)}

def make_variants(MAPS):
    base = next(m for m in MAPS if m.name == 'route1')
    v = copy.deepcopy(base); v.name = 'route1_storm'; v.title = base.title + ' (storm season: flooded lowland)'
    for (x, y) in WATER | DEEP | FLOOD:
        v.clear(x, y, x, y, 'deep' if (x, y) in DEEP else 'flood' if (x, y) in FLOOD else 'water')
    v.enc_zones = [z for z in v.enc_zones]          # grass patches stay where they are above water
    v.variant_of = dict(map='route1', active_when='storm_season', gate='gate_coast_road_flood', needs='has_tideglide',
                        text='overworld_lines.json blockers.gate_coast_road_flood (prompt/use/cant_use_yet/no_creature/after)',
                        npc_text='same ids as route1: overworld_lines.json maps.route1.<id>',
                        rule='load this file instead of maps/route1.json while storm_season is set. Same size, exits, warps, npcs, signs, items; '
                             'only ground/decoration/overlay/collision/encounter differ. Water (3) = Tideglide, deep_water (11) = never, x_flood (0) = walk.')
    base.variants = [dict(id='storm', map='variants/route1_storm.json', active_when='storm_season', gate='gate_coast_road_flood', needs='has_tideglide',
                          what='east lowland (x25-33, y6-15) floods; the trail east to Sunmeadow needs Tideglide; Brookhollow <-> Fernwick stays dry')]
    return [v]

def _bfs(m, C, start, tide):
    ok = {0, 4, 7} | ({3} if tide else set())
    seen = {start}; q = collections.deque([start])
    while q:
        x, y = q.popleft()
        if C[y][x] == 4 and (x, y) != start: continue
        for dx, dy in ((0, 1), (0, -1), (1, 0), (-1, 0)):
            nx, ny = x + dx, y + dy
            if not (0 <= nx < m.w and 0 <= ny < m.h): continue
            c = C[ny][nx]
            if c == 2:
                if dy == 1 and ny + 1 < m.h and C[ny + 1][nx] in ok: ny += 1
                else: continue
            elif c not in ok: continue
            if (nx, ny) not in seen: seen.add((nx, ny)); q.append((nx, ny))
    return seen

def check(res, bfs=None):
    import progression
    out = {}
    m, G, D, O, C, E = res['route1_storm']
    Cs = progression.state_C(m, C, set(progression.STORY_FLAGS))      # storm_season comes after every earlier gate
    _ox, _oy = getattr(m, 'pad_offset', (0, 0))      # centre_pad: exits moved +pad (corridor cells at the new edge)
    south = (4 + _ox, m.h - 1); north = (4 + _ox, 0); east = (m.w - 1, 4 + _oy)
    dry = _bfs(m, Cs, south, False); wet = _bfs(m, Cs, south, True)
    r = []
    r.append((north in dry, 'storm: Brookhollow <-> Fernwick (south <-> north exits) connected WITHOUT Tideglide' if north in dry else 'storm: south -> north cut by the flood'))
    r.append((east not in dry, 'storm: east exit not reachable without Tideglide (flood really gates)' if east not in dry else 'storm: flood does not gate the east exit'))
    r.append((east in wet, 'storm: east exit reachable WITH Tideglide' if east in wet else 'storm: east exit unreachable even with Tideglide'))
    lost = [n['id'] for n in m.npcs + m.items + m.signs if not any(abs(n['x'] - a) + abs(n['y'] - b) <= 1 for a, b in wet)]
    r.append((not lost, 'storm: every npc/sign/item reachable with Tideglide' if not lost else f'storm: unreachable {lost}'))
    for n in m.npcs + m.items:
        if Cs[n['y']][n['x']] not in (0, 7): r.append((False, f"storm: {n['id']} under water"))
    deep_cross = [p for p in DEEP if Cs[p[1] + _oy][p[0] + _ox] != 11]
    r.append((not deep_cross, 'storm: deep water cells are code 11 (never crossable)'))
    out['route1_storm'] = r
    return out
