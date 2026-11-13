from build import *

def ledges(m, y, x0, x1):
    for x in range(x0, x1 + 1): m.deco[y][x] = 'ledge_' + ('l' if x == x0 else 'r' if x == x1 else 'm')
def cliffs(m, y, x0, x1, dark=False):
    k = 'cliffd_' if dark else 'cliff_'
    for x in range(x0, x1 + 1):
        p = 'l' if x == x0 else 'r' if x == x1 else 'm'
        m.deco[y][x] = k + 'u' + p; m.deco[y + 1][x] = k + 'l' + p
def border(m, dark=False):
    m.trees(0, 0, m.w - 1, 1, dark); m.trees(0, m.h - 2, m.w - 1, m.h - 1, dark); m.trees(0, 0, 1, m.h - 1, dark); m.trees(m.w - 2, 0, m.w - 1, m.h - 1, dark)
def npc(m, id, x, y, facing, kind, note=''): m.npcs.append(dict(id=id, x=x, y=y, facing=facing, kind=kind, note=note))
def sg(m, id, x, y, text): m.signs.append(dict(id=id, x=x, y=y, text=text)); m.deco[y][x] = 'sign'
def item(m, id, x, y, hidden, what): m.items.append(dict(id=id, x=x, y=y, hidden=hidden, item=what))

# ---- puzzle helpers (state lives in map['puzzle']; deco layer shows the START state) ----
def pz(m):
    if m.puzzle is None: m.puzzle = dict(boulders=[], switches=[], gates=[], rules='', solution='')
    return m.puzzle
def boulder(m, id, x, y): m.deco[y][x] = 'push_boulder'; pz(m)['boulders'].append(dict(id=id, x=x, y=y))
def plate(m, id, x, y, ch, mode='latch', style='cave'):
    m.deco[y][x] = f'plate_{style}_off'; pz(m)['switches'].append(dict(id=id, x=x, y=y, type='plate', channel=ch, mode=mode, start_on=False))
def cswitch(m, id, x, y, ch, toggles=None, start_on=False):
    m.deco[y][x] = 'crystal_switch_on' if start_on else 'crystal_switch_off'
    pz(m)['switches'].append(dict(id=id, x=x, y=y, type='crystal', channel=ch, mode='toggle', toggles=toggles or [id], start_on=start_on))
def gate(m, id, x, y, ch, style='cave'): m.deco[y][x] = f'gate_{style}_closed'; pz(m)['gates'].append(dict(id=id, x=x, y=y, channel=ch))


# ---- progression helpers ----
def uncover(m, x, y):
    """make (x,y) visible: a tree directly below would drop its canopy on it -> swap that tree for a bush."""
    if y + 1 < m.h and m.deco[y + 1][x] in ('tree_base', 'treed_base'): m.deco[y + 1][x] = 'bush'
    if m.over[y][x] in ('tree_top', 'treed_top'): m.over[y][x] = None
def story_gate(m, id, cells, flag, earned_at, line_blocked, line_cleared, cleared_state, detour, between, guard=None):
    """cells: [(x, y, blocked_tile, cleared_tile_or_None)]. Deco shows the BLOCKED state; collision is blocked until `flag` is set."""
    for x, y, bt, ct in cells: m.deco[y][x] = bt; uncover(m, x, y)
    m.story_gates.append(dict(id=id, flag=flag, earned_at=earned_at,
        cells=[dict(x=x, y=y, blocked_tile=bt, cleared_tile=ct) for x, y, bt, ct in cells],
        npc=guard, lines=dict(text_file='/workspace/kilumen/text/overworld_lines.json', before=f'blockers.{id}.before', after=f'blockers.{id}.after',
                              guard=(f'maps.{m.name}.{guard["id"]}' if guard else None)),  # final text lives in Text Bot's file; line_* args are dev notes only
        cleared_state=cleared_state, detour=detour, blocks=dict(from_entry=between[0], to_entry=between[1])))
    if guard: npc(m, guard['id'], guard['x'], guard['y'], guard['facing'], guard['kind'], f'story gate {id}: speaks the gate lines')
def forced_grass(m, id, x0, y0, x1, y1, between, table, kind='tall_grass'):
    """a strip of encounter terrain covering the FULL width of the only way through (walls on both sides)."""
    m.clear(x0, y0, x1, y1); m.rect(x0, y0, x1, y1, deco=kind); m.enc_zones.append(dict(x0=x0, y0=y0, x1=x1, y1=y1, table=table, forced=True))
    m.forced_grass.append(dict(id=id, x0=x0, y0=y0, x1=x1, y1=y1, kind=kind, between=list(between)))
def fly(m, x, y, flag):
    m.fly_point = dict(x=x, y=y, facing='down', visited_flag=flag, landing='path tile in front of the heal centre door',
                       skill='Skylift', note='landing cell; set visited flag on first entry to the map')

MAPS = []
# ---------------- Brookhollow ----------------
m = Map('brookhollow', 34, 32, title='Brookhollow', ); MAPS.append(m)   # 26 -> 32 rows (interiors hookup): south lot for the lab
border(m)
m.clear(22, 0, 24, 31, 'water')
m.clear(10, 0, 11, 13, 'path'); m.clear(2, 12, 33, 13, 'path')
for x in (22, 23, 24):
    for y in (12, 13): m.terr[y][x] = 'water'; m.deco[y][x] = 'bridge_h'
m.place('house_player', 3, 3); m.rect(5, 8, 5, 11, 'path')
for x in (3, 4, 6, 7): m.deco[9][x] = 'fence_h'
m.place('house_a', 13, 3); m.rect(15, 8, 15, 11, 'path')
m.place('office', 25, 3); m.rect(28, 9, 28, 11, 'path')
m.rect(2, 21, 20, 21, 'path'); m.rect(10, 14, 11, 21, 'path')
m.place('heal_centre', 3, 15); m.rect(6, 20, 6, 20, 'path')
m.place('shop', 14, 15); m.rect(16, 20, 16, 20, 'path')
m.place('house_b', 26, 15); m.rect(25, 14, 25, 20, 'path'); m.rect(25, 20, 28, 20, 'path')
for x, y in ((9, 11), (19, 11), (30, 11), (8, 14), (20, 14)): m.deco[y][x] = 'lamp'
for x, y in ((3, 10), (4, 10), (7, 10), (8, 10), (13, 9), (17, 9), (18, 9), (2, 20), (3, 22), (8, 22), (12, 22), (18, 22), (26, 21), (30, 21), (31, 10)): m.deco[y][x] = 'flowers_warm'
for x, y in ((19, 4), (20, 6), (12, 17), (13, 22), (19, 17), (20, 20)): m.deco[y][x] = 'flowers_violet'
for x, y in ((20, 3), (21, 8), (19, 19), (2, 17), (31, 14), (31, 22)): m.deco[y][x] = 'bush'
m.tree(20, 9); m.tree(9, 4); m.tree(9, 6); m.tree(30, 21) if False else None
sg(m, 'sign_town', 12, 10, 'BROOKHOLLOW - where the river begins.')
sg(m, 'sign_office', 27, 10, 'REVIVAL TECH - Brookhollow Field Office')
sg(m, 'sign_home', 4, 8, "Your house (shared with Ron)")
m.warp(5, 7, 'house_1f', 5, 8, 'up'); m.warp(6, 19, 'heal_brookhollow', 6, 8, 'up', 'shared RT heal branch (interiors pool)'); m.warp(16, 19, 'shop_int', 5, 7, 'up')
m.warp(28, 8, 'office_int', 7, 10, 'up', 'Revival Tech field office (promotion cutscene)')
m.warp(15, 7, '@home_pool', 0, 0, 'up', 'shared home (design + recolour set by interiors_merge.hookup)'); m.warp(28, 19, 'home_brookhollow_b', 6, 8, 'up', 'story-unique home: E13 Fireside Book + scholar')
m.clear(32, 14, 33, 14)
m.exit('north', 10, 11, 'route1', -6); m.exit('east', 12, 13, 'route_east', 0, 'TO COME: road east toward Aurelith / Tidewater')
npc(m, 'villager_garden', 18, 13, 'left', 'villager_hooded'); npc(m, 'fisher', 21, 17, 'right', 'villager'); npc(m, 'kid', 12, 20, 'down', 'villager')
item(m, 'hid_feed_1', 29, 22, True, 'feed_bag_small')
# --- PATH_GRASS_STUDY.md §4 fixes (Oct 22 2026) ---
# 1. 6x5 cobble plaza at the crossroads; lamps on its west corners, a lumen crystal as the town landmark (NE corner, cross stays walkable)
m.rect(8, 10, 13, 14, 'path')
for x, y in ((8, 10), (9, 11)): m.deco[y][x] = None
m.deco[10][8] = 'lamp'; m.deco[14][8] = 'lamp'; m.deco[10][13] = 'crystal'
# 2. 3x2 forecourts in front of the heal centre and the shop
m.rect(5, 20, 7, 21, 'path'); m.rect(15, 20, 17, 21, 'path')
# 3. south road 2-wide (rows 21-22) between the service buildings; the east lane (x25) stays a 1-wide lane on purpose
for x, y in ((8, 22), (12, 22)): m.deco[y][x] = None
m.rect(4, 22, 17, 22, 'path')
story_gate(m, 'gate_brookhollow_east', [(32, 12, 'rt_barricade', None), (32, 13, 'rt_barricade', None)], 'beat_master_fernwick', 'fernwick_hall_int (Master of Fernwick)',
           'Revival Tech survey in progress. The east road is closed to unregistered trainers - come back with the Fernwick Master\'s coin.',
           'Survey\'s done and you\'re registered now. Road east is open - mind the bridge.',
           'barricades removed; guard stays at (31,11) and speaks the cleared line', 'player must go north via Route 1 to Fernwick and beat its Master, then come back south',
           ('exit-north', 'exit-east'), guard=dict(id='rt_guard_east', x=31, y=11, facing='down', kind='guard'))
fly(m, 6, 20, 'visited_brookhollow')
# --- interiors hookup (Oct 22 2026): south lot + Lumen Lab (door -> lab_brookhollow, story-unique: starter choice) ---
m.place('lab', 13, 23)                                     # 7x5, door (16,27); arrival (16,28)
m.rect(11, 23, 12, 28, 'path'); m.rect(11, 28, 18, 28, 'path')
m.warp(16, 27, 'lab_brookhollow', 7, 9, 'up', 'Lumen Lab (story-unique: starter choice, lab-tech onboarding 8.1)')
for x, y in ((10, 27), (19, 28)): m.deco[y][x] = 'lamp'
for x, y in ((3, 24), (20, 24), (8, 27)): m.deco[y][x] = 'bush'
for x, y in ((5, 25), (7, 24), (21, 27), (6, 28)): m.deco[y][x] = 'flowers_warm'
for x, y in ((4, 27), (9, 25), (20, 26)): m.deco[y][x] = 'flowers_violet'

# ---------------- Route 1 / Sunmeadow Fields (runs SW -> NE, per world_map.png) ----------------
m = Map('route1', 44, 34, title='Trail 1 - Sunmeadow Fields'); MAPS.append(m)
PATHS = ((4, 26, 5, 33), (4, 0, 5, 27), (4, 26, 14, 27), (13, 18, 14, 27), (13, 18, 24, 19), (23, 10, 24, 19), (23, 10, 33, 11), (32, 4, 33, 11), (32, 4, 43, 5))
pc = set()
for a_, b_, c_, d_ in PATHS:
    for y in range(b_, d_ + 1):
        for x in range(a_, c_ + 1): pc.add((x, y))
for y in range(m.h):             # forest everywhere more than 4 tiles from the trail -> diagonal meadow band
    for x in range(m.w):
        dmin = min(max(abs(x - px), abs(y - py)) for px, py in pc)
        if dmin > 4 or x in (0, 43) or y in (0, 33):
            if (x, y - 1) in pc: m.deco[y][x] = 'bush'      # a canopy here would hide the trail cell above
            else: m.tree(x, y)
for a_, b_, c_, d_ in PATHS: m.clear(a_, b_, c_, d_, 'trail')   # routes: plain dirt trail (towns keep cobbles)
GRASS = ((7, 28, 11, 31), (15, 21, 20, 24), (8, 20, 11, 24), (25, 13, 30, 16), (26, 6, 30, 8), (35, 7, 39, 9), (7, 8, 9, 14))
for a_, b_, c_, d_ in GRASS:
    m.clear(a_, b_, c_, d_); m.rect(a_, b_, c_, d_, deco='tall_grass'); m.enc_zones.append(dict(x0=a_, y0=b_, x1=c_, y1=d_, table='sunmeadow_grass'))
m.clear(17, 13, 21, 16, 'sand'); m.rect(18, 14, 20, 15, 'water')
forced_grass(m, 'r1_north_choke', 1, 2, 9, 4, ('exit-south', 'exit-north'), 'sunmeadow_grass')   # forest on both sides: Fernwick needs a walk through grass
m.clear(10, 10, 18, 11, 'water'); m.rect(10, 10, 18, 10, deco='bike_rail_h')                        # bike-only boardwalk: west meadow -> pond meadow shortcut
m.bike = dict(areas=[dict(id='r1_marsh_boardwalk', cells='x10-18, y10', kind='shortcut', note='narrow boardwalk over a marsh strip; joins the Fernwick trail meadow (in the item grass patch) to the pond meadow, skipping the long trail loop')])
ledges(m, 16, 1, 3); ledges(m, 22, 15, 21); ledges(m, 7, 34, 40); ledges(m, 12, 26, 30)
for x, y in ((6, 31), (12, 25), (16, 20), (22, 21), (21, 12), (27, 9), (31, 13), (36, 3), (40, 8), (7, 6), (2, 20)): m.deco[y][x] = 'flowers_warm'
for x, y in ((10, 26), (22, 17), (29, 12), (35, 6), (2, 9), (41, 7)): m.deco[y][x] = 'flowers_violet'
for x, y in ((12, 29), (25, 17), (31, 7), (6, 18)): m.deco[y][x] = 'rock'
sg(m, 'sign_r1_s', 6, 30, 'TRAIL 1 - Sunmeadow Fields.  NE: Sunmeadow   N: Fernwick   S: Brookhollow')
sg(m, 'sign_r1_fork', 6, 25, 'FORK - North: Fernwick.  East: Sunmeadow Fields')
sg(m, 'sign_r1_ne', 40, 3, 'SUNMEADOW FIELDS - meadows ahead (to come)')
for y in (1, 2, 3, 6, 7, 8, 9, 10):
    if m.deco[y][41] not in ('tree_base',): m.clear(41, y, 41, y); m.deco[y][41] = 'crystal'      # crystal ridge either side of the barrier
story_gate(m, 'gate_route1_east', [(41, 4, 'crystal_barrier_lit', 'crystal_barrier_dim'), (41, 5, 'crystal_barrier_lit', 'crystal_barrier_dim')],
           'beat_master_frostspire', 'Frostspire (Master of Frostspire, reached through Greystone B1 and the Frostspire pass)',
           'The crystal wall hums. It answers to the Frostspire shrine...',
           'The crystals have gone dim and quiet. The way east is clear.',
           'barrier tiles swap to crystal_barrier_dim (walkable stubs)', 'Sunmeadow proper needs the far north first: Fernwick -> Thornwood -> Greystone B1 -> Frostspire, then back down Route 1',
           ('exit-south', 'exit-east'))
m.exit('south', 4, 5, 'brookhollow', 6); m.exit('north', 4, 5, 'fernwick', 7)
m.exit('east', 4, 5, 'sunmeadow_fields', 0, 'TO COME: Sunmeadow Fields proper (NE meadow) and road to Revival Heights')
npc(m, 'trainer_r1_a', 12, 20, 'left', 'trainer_hooded', 'sight 4 tiles: watches (8-11,20), the top row of its grass patch')
npc(m, 'trainer_r1_b', 31, 13, 'left', 'trainer_hooded', 'sight 3 tiles: watches (28-30,13) inside the pond-meadow patch; optional (moved off the pond gap (22,14))')
npc(m, 'trainer_r1_c', 34, 9, 'left', 'trainer_hooded', 'sight 4 tiles: watches (30-33,9) on the east branch')
item(m, 'r1_feed', 30, 6, True, 'feed_bag_small'); item(m, 'r1_hidden_tonic', 38, 8, True, 'energy_tonic'); item(m, 'r1_crystal', 8, 13, False, 'dominance_crystal')
# --- PATH_GRASS_STUDY.md §4 fixes (Oct 22 2026) ---
# 1. ledge loop: y=16 is a south-only ledge from x1 to x22 (spine included) in 4 capped segments split by rocks,
#    so the trip north goes the long way (fork -> east trail -> pond gap -> grass band) and the trip home hops down.
for a_, b_ in ((1, 7), (9, 12), (14, 16), (18, 22)): ledges(m, 16, a_, b_)
for x in (8, 13, 17): m.deco[16][x] = 'rock'
# grass band north of the ledge that the outbound detour must cross (ragged: (16,15) dropped, (9,15) added)
BAND = [(x, y) for x in range(10, 17) for y in (14, 15) if (x, y) != (16, 15)] + [(9, 15)]
# 5. grow three patches into blobs (~16% of the walkable meadow is grass)
GROW = [(6, 9), (6, 10), (6, 11), (6, 12), (10, 14), (7, 21), (7, 22), (7, 23), (25, 7), (31, 8)]
for x, y in BAND + GROW: m.deco[y][x] = 'tall_grass'
m.enc_zones.append(dict(x0=9, y0=14, x1=16, y1=15, table='sunmeadow_grass', note='pond-meadow band crossed by the outbound loop'))
# 6. notch corners / punch holes so no patch reads as a rectangle (hidden feed (30,6) stays in a visible hole)
for x, y in ((11, 24), (30, 6), (7, 28), (11, 31), (20, 21), (15, 24), (25, 13), (30, 16), (27, 14), (35, 8), (39, 9)): m.deco[y][x] = None
# 7. 3x3 trail aprons at the fork and the two bends (terrain only: the fork sign at (6,25) stays); crystal landmark pulls the eye up the east trail
for x0, y0 in ((4, 25), (23, 18), (32, 10)): m.rect(x0, y0, x0 + 2, y0 + 2, 'trail')
m.deco[19][25] = 'crystal'
# 4. optional side patches beside (never across) the main line, so Route 1 lands at ~16% of map area in tall grass (study target 15-20%)
def blob(x0, y0, x1, y1, notch=()):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            if (x, y) in notch or m.deco[y][x] is not None or m.over[y][x] is not None or m.terr[y][x] != 'grass': continue
            if y + 1 < m.h and m.over[y][x] is None and m.deco[y + 1][x] in ('tree_base',): continue
            m.deco[y][x] = 'tall_grass'
    m.enc_zones.append(dict(x0=x0, y0=y0, x1=x1, y1=y1, table='sunmeadow_grass', note='optional side patch'))
blob(1, 18, 3, 23, notch={(1, 18), (3, 23)}); blob(1, 27, 3, 29, notch={(3, 27), (1, 29)}); blob(1, 9, 2, 13, notch={(1, 9)})
blob(6, 5, 9, 7, notch={(9, 5), (6, 7)}); blob(30, 1, 37, 2, notch={(30, 1), (37, 2)}); blob(34, 12, 37, 14, notch={(34, 12), (37, 14)})

# ---------------- Fernwick ----------------
m = Map('fernwick', 30, 24, title='Fernwick'); MAPS.append(m)
border(m)
m.clear(11, 6, 12, 23, 'path'); m.clear(2, 9, 29, 10, 'path')
m.place('heal_centre', 2, 2); m.rect(5, 7, 5, 8, 'path')
m.place('shop', 14, 2); m.rect(16, 7, 16, 8, 'path')
m.place('house_c', 20, 2); m.rect(22, 7, 22, 8, 'path')
m.place('masters_hall', 20, 13); m.rect(23, 19, 23, 19, 'path'); m.rect(23, 19, 27, 19, 'path'); m.rect(27, 11, 27, 19, 'path')
m.place('house_b', 3, 13); m.rect(5, 18, 5, 19, 'path'); m.rect(5, 19, 10, 19, 'path')
m.place('house_a', 14, 14); m.rect(16, 19, 16, 19, 'path'); m.rect(13, 19, 16, 19, 'path')
m.rect(15, 20, 18, 21, 'water')
for x, y in ((19, 12), (18, 12), (19, 13), (19, 20), (25, 21), (21, 20), (26, 12), (25, 12)): m.deco[y][x] = 'flowers_violet'
for x, y in ((3, 8), (8, 8), (9, 11), (2, 11), (13, 7), (19, 8), (24, 8), (9, 21), (3, 21)): m.deco[y][x] = 'flowers_warm'
for x, y in ((10, 8), (13, 11), (26, 7), (8, 18)): m.deco[y][x] = 'lamp'
for x in range(20, 27): m.deco[12][x] = m.deco[12][x] or None
sg(m, 'sign_fern', 13, 21, 'FERNWICK - a quiet town of ferns and fireflies.')
sg(m, 'sign_hall', 26, 18, "MASTER'S HALL - Master of Fernwick (Earth)")
m.warp(5, 6, 'heal_fernwick', 6, 8, 'up', 'story-unique branch: 8.5-E parent_c becomes a Care Associate here'); m.warp(16, 6, 'shop_int', 5, 7, 'up')
m.warp(22, 6, 'home_fernwick_a', 5, 8, 'up', 'story-unique home: 8.5-E The Kid\'s Last Joke (parent_c, kid_c, TV)')
m.warp(16, 18, '@home_pool', 0, 0, 'up', 'shared home'); m.warp(5, 17, '@home_pool', 0, 0, 'up', 'shared home')
m.warp(23, 18, 'fernwick_hall_int', 7, 16, 'up', "Master's Hall - gating puzzle + helper trainers")
m.clear(28, 11, 29, 11)
m.exit('south', 11, 12, 'route1', -7); m.exit('east', 9, 10, 'thornwood', 0)
npc(m, 'ron_rival_1', 12, 12, 'down', 'ron', 'rival battle 1 on first entry; afterwards gives his old running shoes (has_run_shoes)'); fly(m, 5, 7, 'visited_fernwick'); npc(m, 'villager_f1', 20, 10, 'left', 'villager'); npc(m, 'elder', 7, 20, 'up', 'villager_hooded')

# ---------------- Thornwood ----------------
m = Map('thornwood', 36, 30, base='grass_dark', title='Thornwood'); MAPS.append(m)
m.trees(0, 0, 35, 29, True)
cliffs(m, 4, 0, 35, dark=True)
for x in range(36): m.over[3][x] = None; m.over[4][x] = None
m.clear(15, 1, 19, 3); m.trees(15, 0, 19, 1, True)
for x in range(16, 19): m.deco[3][x] = None
m.place('cave_entrance', 16, 4)
# --- light maze + hidden ledge shortcut (plaza -> west corridor -> ledge drop onto the entrance trail) ---
TW = dict(plaza=(15, 6, 20, 8), short=(6, 6, 14, 7), entr=(0, 9, 9, 11), A=(2, 9, 3, 20), B=(7, 11, 8, 13), D=(5, 15, 6, 18), Dlink=(4, 16, 4, 17),
          G1=(10, 12, 14, 18), C=(2, 19, 14, 21), E=(13, 19, 14, 27), SC=(6, 23, 20, 27), F=(20, 21, 35, 23), H=(28, 9, 29, 22),
          G2=(22, 11, 27, 18), I=(21, 6, 31, 9))
for k, (a_, b_, c_, d_) in TW.items(): m.clear(a_, b_, c_, d_, 'trail' if k in ('entr', 'A', 'C', 'E', 'F', 'H', 'plaza', 'short') else None)
m.trees(10, 8, 14, 8, True)                       # tree wall hides the shortcut from the trail below
ledges(m, 8, 6, 9)                                # one-way drop: plaza side -> entrance trail
m.rect(25, 6, 27, 7, 'water')                     # pond on the top corridor
m.rect(23, 14, 26, 16, 'mud')
GR = ((10, 12, 14, 17), (7, 24, 12, 26), (22, 11, 26, 13), (15, 24, 18, 26))
for z in GR: m.rect(*z, deco='tall_grass'); m.enc_zones.append(dict(x0=z[0], y0=z[1], x1=z[2], y1=z[3], table='thornwood_grass'))
forced_grass(m, 'tw_east_choke', 20, 21, 25, 22, ('exit-west', 'warp->greystone_entrance'), 'thornwood_grass')   # 6 deep (study §4 TW-4); row 23 is under canopies
story_gate(m, 'gate_thornwood_east', [(33, 21, 'fallen_log_t', None), (33, 22, 'fallen_log_m', None), (33, 23, 'fallen_log_b', None)],
           'beat_master_saltmere', 'Saltmere (Master of Saltmere, reached via Brookhollow east road)',
           'A huge trunk lies across the trail. Revival Tech has a crew booked... once someone with standing asks.',
           'Only sawdust is left where the trunk was.',
           'log tiles removed (plain trail)', 'Revival Heights is unreachable until Saltmere: back through Fernwick, Route 1, Brookhollow east road',
           ('exit-west', 'exit-east'))
m.clear(16, 13, 19, 16)                                                  # hidden pocket in the trees, bike only
for x in range(16, 20): uncover(m, x, 16)
m.deco[14][15] = 'ramp_e'; uncover(m, 15, 14)                           # jump in from the grass clearing (one-way)
m.terr[16][15] = 'mud'; m.deco[16][15] = 'bike_rail_h'; uncover(m, 15, 16)   # narrow boardwalk back out (two-way)
item(m, 'tw_bike_cache', 18, 15, False, 'vigor_seed')
m.bike = dict(areas=[dict(id='tw_ramp_pocket', cells='x16-19, y13-16', kind='item_area', note='jump the ramp at (15,14) east from the grass clearing; leave over the boardwalk at (15,16)')])
for x, y in ((4, 18), (14, 12), (22, 18), (30, 6), (6, 27), (20, 26), (24, 8)): m.deco[y][x] = 'mushroom_glow'
for x, y in ((8, 13), (6, 15), (27, 11), (19, 23)): m.deco[y][x] = 'crystal'
m.deco[11][4] = 'flowers_violet'; m.deco[17][24] = 'rock'
m.deco[8][1] = 'sign'; m.over[7][1] = None
sg(m, 'sign_tw', 1, 8, 'THORNWOOD - the trail winds. North: Greystone Caverns')
m.warp(17, 5, 'greystone_entrance', 13, 20, 'up')
m.exit('west', 9, 10, 'fernwick', 0); m.exit('east', 21, 22, 'route_revival', 0, 'TO COME: trail to Revival Heights')
npc(m, 'trainer_tw_bug', 11, 15, 'down', 'trainer_hooded', 'bug catcher, in the grass clearing; sight 3 tiles: watches (11,16-18), incl. the clearing entry gap')
npc(m, 'trainer_tw_b', 27, 16, 'right', 'trainer_hooded', 'sight 2 tiles: covers the whole 2-wide north corridor (28-29,16), so it cannot be skipped')
npc(m, 'dissident_hint', 23, 7, 'down', 'villager_hooded', 'opposition group foreshadowing')
item(m, 'tw_feed', 5, 17, True, 'feed_bag'); item(m, 'tw_hidden_seed', 8, 25, True, 'vigor_seed'); item(m, 'tw_crystal', 7, 12, False, 'dominance_crystal_plus'); item(m, 'tw_tonic', 25, 17, False, 'energy_tonic')
# --- PATH_GRASS_STUDY.md §4 fixes (Oct 22 2026) ---
# 1. reopen the shortcut corridor row y=7, x6-14 (canopies of the tree wall at y8 had closed it): trees under it become bushes
for x in range(6, 15): uncover(m, x, 7)
m.rect(6, 7, 14, 7, 'trail')
for x in range(21, 24): m.deco[23][x] = None                              # stray grass under the y24 canopies (zone now ends at y22)
# 5. optional side patch around the hidden feed (5,17), which sits in a visible 1-tile hole
for x, y in ((4, 16), (5, 16), (6, 16), (4, 17), (6, 17), (4, 18), (5, 18), (6, 18)): m.deco[y][x] = 'tall_grass'
m.enc_zones.append(dict(x0=4, y0=16, x1=6, y1=18, table='thornwood_grass', note='optional side patch, hole at (5,17)'))
# 8. de-rectangle: 2 notched corners per patch; hidden seed (8,25) in a visible hole
for x, y in ((7, 24), (12, 26), (8, 25), (18, 24), (15, 26), (22, 11), (26, 13)): m.deco[y][x] = None
# 6. junction aprons (trail) + lumen-thread crystal into the clearing; signs (21,8) and (19,24) are pending Text Bot ids
m.rect(20, 6, 22, 7, 'trail'); m.rect(21, 8, 22, 8, 'trail'); m.rect(18, 23, 20, 24, 'trail')
m.deco[18][13] = 'crystal'

# ---------------- Greystone Caverns entrance ----------------
m = Map('greystone_entrance', 28, 22, base='cave', title='Greystone Caverns - Entrance'); MAPS.append(m)
m.rect(0, 0, 27, 21, 'cavewall')
m.rect(3, 4, 24, 18, 'cave'); m.rect(13, 18, 14, 21, 'cave')
m.rect(9, 9, 11, 11, 'cavewall'); m.rect(19, 13, 21, 14, 'cavewall')
m.rect(17, 5, 21, 8, 'cave_water')
for x, y in ((4, 4), (23, 10), (8, 16), (16, 12), (23, 17)): m.deco[y][x] = 'crystal'
for x, y in ((7, 8), (14, 14), (5, 12), (22, 5), (16, 17)): m.deco[y][x] = 'cave_rock'
m.deco[6][5] = 'cave_stairs'
for x in range(3, 8): m.deco[14][x] = 'cave_ledge_' + ('l' if x == 3 else 'r' if x == 7 else 'm')
m.warp(13, 21, 'thornwood', 17, 6, 'down'); m.warp(14, 21, 'thornwood', 17, 6, 'down')
m.warp(5, 6, 'greystone_b1', 4, 5, 'down', 'stairs down to B1 (boulder puzzle; the way north is through B1)')
forced_grass(m, 'gs_mouth_choke', 13, 19, 14, 20, ('warp->thornwood', 'warp->greystone_b1'), 'greystone_glowfern', kind='cave_fern')
m.clear(21, 15, 24, 16); m.rect(21, 15, 24, 16, deco='cave_fern'); m.enc_zones.append(dict(x0=21, y0=15, x1=24, y1=16, table='greystone_glowfern'))
npc(m, 'hiker', 15, 10, 'down', 'trainer_hooded'); item(m, 'gs_item', 23, 15, True, 'energy_tonic')

# ---------------- interiors ----------------
def interior(name, w, h, wall, floor, title):
    m = Map(name, w, h, base=floor, title=title); m.rect(0, 0, w - 1, 2, wall); MAPS.append(m); return m
m = interior('house_1f', 12, 10, 'iwall_house', 'floor_wood', "Player's house 1F")
m.rect(4, 6, 7, 8, 'rug')
# home start (2026-10-23, tools/home_start.py swaps the i_* kit names below for home_* recolours late in run.py; table -> home_table_toast)
for x, k in enumerate(('fridge', 'counter', 'sink', 'stove')): m.over[1][x] = f'i_kitchen_{k}_0_0'; m.deco[2][x] = f'i_kitchen_{k}_1_0'   # kitchen along the back wall
m.place('shelf', 6, 1); m.deco[3][7] = 'tv'; m.place('table', 1, 5); m.deco[6][1] = 'chair'; m.deco[6][2] = 'chair'; m.deco[9][0] = 'plant'   # breakfast table: toast + milk
m.over[1][9] = 'i_bookcase_cinder_0_0'; m.deco[2][9] = 'i_bookcase_cinder_1_0'; m.deco[5][11] = 'i_radio'; m.deco[6][11] = 'i_fishing_rods'   # Ron's corner
m.deco[8][10] = 'i_crates_0_0'; m.deco[8][11] = 'i_crates_0_1'
m.place('sofa', 7, 6); m.deco[3][10] = 'stairs_up'; m.deco[9][5] = 'door_mat'
m.warp(5, 9, 'brookhollow', 5, 8, 'down'); m.warp(10, 3, 'house_2f', 8, 4, 'down')
npc(m, 'ron', 9, 6, 'up', 'ron', "Roommate Ron - opening dialogue about layoffs; sends you to the Lumen Lab. In his corner, off the stairs (10,4)->row 4->(5,4..8)->door (5,9) path")
m = interior('house_2f', 10, 8, 'iwall_house', 'floor_wood', "Player's house 2F (bedroom)")
m.rect(3, 5, 6, 6, 'rug'); m.place('bed', 1, 3); m.deco[3][4] = 'pc'; m.deco[3][6] = 'plant'; m.place('shelf', 5, 1); m.deco[3][8] = 'stairs_up'
m.deco[3][5] = 'i_lab_desk_0_1'; m.deco[4][5] = 'chair'; m.deco[2][1] = 'i_poster_route'; m.deco[3][0] = 'i_dresser_brook'; m.deco[7][0] = 'i_luggage'; m.deco[7][9] = 'i_globe'   # player's own room (home_start.py recolours)
m.warp(8, 3, 'house_1f', 10, 4, 'down')
npc(m, 'player_start', 2, 4, 'down', 'spawn', 'New game spawn (wake-up after the river dream)')
m = interior('heal_centre_int', 14, 10, 'iwall_heal', 'floor_tile_heal', 'Heal Centre (shared interior)')
m.place('heal_machine', 7, 1); m.deco[4][4] = 'counter_heal_l'
for x in range(5, 9): m.deco[4][x] = 'counter_heal_m'
m.deco[4][9] = 'counter_heal_r'; m.deco[3][1] = 'plant'; m.deco[3][12] = 'plant'; m.deco[3][11] = 'pc'; m.place('sofa', 1, 7); m.place('sofa', 11, 7)
m.rect(5, 6, 8, 8, 'rug'); m.deco[9][6] = 'door_mat'; m.deco[9][7] = 'door_mat'
m.warp(6, 9, '$return', 0, 0, 'down', 'return to the door you came from'); m.warp(7, 9, '$return', 0, 0, 'down')
npc(m, 'healer', 6, 3, 'down', 'healer', 'talk across counter at (6,5)'); npc(m, 'company_terminal', 11, 4, 'up', 'object', 'PC: storage / company tasks')
m = interior('shop_int', 12, 9, 'iwall_shop', 'floor_tile', 'RT Supply shop (shared interior)')
m.deco[4][1] = 'counter_shop_l'; m.deco[4][2] = 'counter_shop_m'; m.deco[4][3] = 'counter_shop_r'
m.place('goods', 6, 4); m.place('goods', 8, 4); m.place('goods', 10, 4); m.place('goods', 10, 1); m.deco[3][7] = 'plant'; m.deco[6][11] = 'plant'; m.deco[8][5] = 'door_mat'   # 3-aisle mart (scale audit C2)
m.warp(5, 8, '$return', 0, 0, 'down')
npc(m, 'clerk', 2, 3, 'down', 'clerk', 'talk across counter at (2,5)')

# ---------------- Greystone B1: push-boulder + resonance plate ----------------
m = Map('greystone_b1', 30, 24, base='cave', title='Greystone Caverns - B1'); MAPS.append(m)
m.rect(0, 0, 29, 23, 'cavewall')
m.rect(2, 3, 10, 10, 'cave'); m.rect(10, 7, 14, 8, 'cave'); m.rect(14, 5, 25, 13, 'cave')
m.rect(20, 0, 21, 4, 'cave'); m.rect(19, 14, 20, 15, 'cave'); m.rect(15, 16, 24, 20, 'cave')
m.rect(16, 18, 18, 19, 'cave_water')
m.deco[4][4] = 'cave_stairs'; m.warp(4, 4, 'greystone_entrance', 5, 7, 'down')
for x, y in ((3, 9), (9, 3), (16, 17), (23, 16), (25, 5)): m.deco[y][x] = 'crystal'
for x, y in ((7, 6), (17, 7), (21, 9), (15, 11), (24, 11), (18, 12)): m.deco[y][x] = 'cave_rock'
boulder(m, 'b1', 18, 10)
plate(m, 'p1', 22, 6, 'north_gate', 'hold', 'cave')
gate(m, 'g1', 20, 4, ['north_gate', 'north_release']); gate(m, 'g2', 21, 4, ['north_gate', 'north_release'])
m.rect(22, 1, 22, 1, 'cave'); cswitch(m, 'c_release', 22, 1, 'north_release')   # far-side release crystal (for players arriving from the north)
m.rect(19, 2, 19, 3, 'cave')   # camp_greystone alcove (Story Bot, Oct 22 10:04 PM CT): camp (19,2), stand (19,3); north of gates g1/g2 = past the puzzle (tools/club.py CAMPS)
pz(m)['goal'] = dict(x=20, y=1, what='north passage')
pz(m)['rules'] = ('Gates g1/g2 stay open while plate p1 holds weight. Stepping on it yourself is useless (it releases when you step off), '
                  'so the boulder must be parked on it. Rocks at (17,7) and (21,9) block the direct line, so the boulder must be lined up first. '
                  'A release crystal on the north side opens the gates for players coming south. The boulder resets when the map reloads.')
pz(m)['solution'] = 'Push the boulder east one tile (to 19,10), then north four tiles (to 19,6), then step round to its west side and push it east three tiles onto the plate at (22,6). The shortest verified route is in puzzle.verified.'
m.exit('north', 20, 21, 'frostspire_pass', 0, 'TO COME: passage north to Frostspire')
npc(m, 'hiker_b1', 12, 7, 'left', 'trainer_hooded', 'hint: "That plate hums when something heavy sits on it."')
item(m, 'b1_item', 22, 19, False, 'dominance_crystal_plus'); item(m, 'b1_hidden', 3, 4, True, 'feed_bag')

# ---------------- house interiors (shared, $return) ----------------
m = interior('house_int_a', 11, 9, 'iwall_house2', 'floor_wood', 'House - kitchen layout (shared)')
m.place('stove', 1, 1); m.place('cupboard', 2, 1); m.deco[3][3] = 'kcounter'; m.deco[3][4] = 'kcounter'; m.deco[3][1] = 'barrel'
m.place('table', 5, 5); m.deco[6][5] = 'chair'; m.deco[6][6] = 'chair'; m.deco[3][9] = 'plant'; m.place('shelf', 8, 1)
m.rect(4, 4, 7, 7, 'rug'); m.deco[8][5] = 'door_mat'; m.warp(5, 8, '$return', 0, 0, 'down')
npc(m, 'cook', 2, 5, 'right', 'villager', 'gives a Berry Snack once')
m = interior('house_int_b', 11, 9, 'iwall_house3', 'floor_wood', 'House - library layout (shared)')
m.place('bookcase', 1, 1); m.place('bookcase', 3, 1); m.place('fireplace', 7, 1); m.deco[4][6] = 'armchair'; m.deco[4][9] = 'armchair'
m.rect(5, 5, 8, 6, 'rug'); m.deco[6][1] = 'dresser'; m.deco[3][5] = 'plant'; m.deco[7][9] = 'plant'
m.deco[8][5] = 'door_mat'; m.warp(5, 8, '$return', 0, 0, 'down')
npc(m, 'scholar', 3, 5, 'up', 'villager_hooded', 'lore about the crystals')
m = interior('house_int_c', 11, 9, 'iwall_house', 'floor_wood', 'House - family layout (shared)')
m.place('bed', 1, 1); m.place('bed', 2, 1); m.place('shelf', 4, 1); m.deco[3][6] = 'tv'; m.place('sofa', 6, 5); m.deco[3][9] = 'plant'; m.deco[4][1] = 'dresser'
m.rect(5, 6, 8, 7, 'rug'); m.deco[8][5] = 'door_mat'; m.warp(5, 8, '$return', 0, 0, 'down')
npc(m, 'kid_c', 3, 6, 'down', 'villager'); npc(m, 'parent_c', 8, 4, 'left', 'villager')

# ---------------- Revival Tech office ----------------
m = interior('office_int', 16, 12, 'iwall_office', 'floor_carpet', 'Revival Tech - Brookhollow field office')
m.place('filing', 1, 1); m.place('filing', 2, 1); m.place('bookcase', 8, 1); m.place('cooler', 12, 1); m.place('crystal_display', 14, 1)
m.deco[5][6] = 'counter_shop_l'; m.deco[5][7] = 'counter_shop_m'; m.deco[5][8] = 'counter_shop_m'; m.deco[5][9] = 'counter_shop_r'
m.place('desk_pc', 1, 6); m.place('desk_pc', 1, 9); m.place('desk_pc', 12, 8)
m.deco[7][2] = 'chair'; m.deco[10][2] = 'chair'; m.deco[9][13] = 'chair'; m.deco[3][5] = 'plant'; m.deco[3][10] = 'plant'; m.deco[10][14] = 'plant'
m.rect(6, 8, 9, 10, 'rug'); m.deco[11][7] = 'door_mat'   # one-tile exit mat (scale audit C4): the exterior door is 1 wide
m.warp(7, 11, 'brookhollow', 28, 9, 'down')
npc(m, 'receptionist', 7, 4, 'down', 'clerk', 'talk across the counter'); npc(m, 'manager', 13, 5, 'down', 'manager', 'promotion cutscene trigger')
npc(m, 'coworker', 4, 8, 'left', 'villager')

# ---------------- Fernwick Master's Hall ----------------
m = interior('fernwick_hall_int', 16, 18, 'iwall_hall', 'floor_stone', "Fernwick Master's Hall")
m.rect(1, 3, 14, 8, 'floor_arena')
m.place('dais', 6, 3); m.place('arena_ring', 6, 5)
for x, y in ((2, 3), (13, 3), (2, 6), (13, 6)): m.place('pillar', x, y)
m.deco[3][4] = 'brazier'; m.deco[3][11] = 'brazier'; m.deco[2][3] = 'banner'; m.deco[2][12] = 'banner'
for x in range(16): m.deco[9][x] = 'rail'; m.deco[13][x] = 'rail'
# band 1 (entry): two pressure plates in the corners, both must be latched -> gate A
plate(m, 'pA1', 1, 15, 'A', 'latch', 'hall'); plate(m, 'pA2', 14, 15, 'A', 'latch', 'hall')
gate(m, 'gA1', 7, 13, 'A', 'hall'); gate(m, 'gA2', 8, 13, 'A', 'hall')
m.deco[15][4] = 'rail'; m.deco[15][11] = 'rail'; m.deco[14][4] = 'rail'; m.deco[14][11] = 'rail'
# band 2: resonance crystals - touching one flips itself AND its neighbours in the L-M-R chain. All three lit -> gate B.
cswitch(m, 'cL', 3, 11, 'B', ['cL', 'cM']); cswitch(m, 'cM', 7, 10, 'B', ['cL', 'cM', 'cR'], start_on=True); cswitch(m, 'cR', 12, 11, 'B', ['cM', 'cR'])
gate(m, 'gB1', 7, 9, 'B', 'hall'); gate(m, 'gB2', 8, 9, 'B', 'hall')
pz(m)['rules'] = ('Gate A opens once BOTH corner plates have been stepped on (latching). '
                  'Resonance crystals: touching a crystal toggles it and the crystals linked to it (L<->M<->R). Gate B opens when all three glow. '
                  'Middle starts lit; touching it first makes things worse. Helper trainers watch the band.')
pz(m)['solution'] = 'Step on pA1 and pA2 -> gate A opens. Touch L then R (M stays lit) -> gate B opens. Master waits on the dais.'
pz(m)['goal'] = dict(x=7, y=6, what='battle ring in front of the master')
m.deco[17][7] = 'door_mat'; m.deco[17][8] = 'door_mat'
m.warp(7, 17, 'fernwick', 23, 19, 'down'); m.warp(8, 17, 'fernwick', 23, 19, 'down')
npc(m, 'helper_1', 4, 12, 'right', 'trainer_hooded', 'helper trainer, sight 4 (was 2,12: moved out of the d-pad zone, scale audit)'); npc(m, 'helper_2', 11, 12, 'left', 'trainer_hooded', 'helper trainer, sight 4 (was 13,12: mirror of helper_1)')
npc(m, 'master_fernwick', 7, 4, 'down', 'master', 'Master of Fernwick (Earth) - stands on the dais; battle on the ring')
npc(m, 'guide', 9, 14, 'left', 'villager_scholar', 'stationary (non-wandering kind, keeps facing left: a villager wanders +-1 and could step back under the touch buttons); explains plates/crystals (was 10,16: overlapped the DBG/buttons zone on 2340x1080 @3 with the player at 10,15; 9,14 is beside the entry->gate A path, clear at 844x390 and 2340x1080 from every stand cell)')

# ================= SOUL PASS (SOUL_PLAYBOOK #3 / #12 / #14, STORY_RULINGS_SOUL.md) =================
# Extra map JSON keys live in m.soul and are written by run.py as top-level keys (bin_stages, ambient, flag_swaps).
_M = {mm.name: mm for mm in MAPS}
def _water_spots(m, cells):
    bad = [c for c in cells if m.terr[c[1]][c[0]] not in ('water', 'cave_water')]
    assert not bad, f'{m.name}: fish spots not on water {bad}'
    return [dict(x=x, y=y) for x, y in cells]

# --- #3 Ron's bin: brookhollow (7,8), right of the player-house door path. Map shows stage 0 (no coins yet). ---
m = _M['brookhollow']; m.deco[8][7] = 'bin_ron_0'
m.soul = dict(bin_stages=dict(x=7, y=8, owner='ron', layer='decoration', overlay_tile='bin_flies', overlay_from_stage=6,
    stage_rule='stage = number of Master coins earned (0-8) -> tile bin_ron_<stage>; after flag finale_done -> bin_ron_empty (no flies). States are on the tile (tileset states).',
    tiles={**{str(n): f'bin_ron_{n}' for n in range(9)}, 'empty': 'bin_ron_empty'}, empty_flag='finale_done',
    e5_bin_monument='interactable only while stage == 8 and finale_done is not set (missable on purpose, STORY_RULINGS_SOUL #3)',
    note='No new sign/npc id: the bin is a stateful deco tile. Bin lines are Ron battle openers (Text Bot), not map text.'))
m.soul['ambient'] = dict(fish_spots=_water_spots(m, [(23, 2), (22, 6), (24, 10), (23, 15), (22, 19), (24, 22)]),
    fish_tile='fish_shadow', ripple_tile='fish_ripple', rule='show 2-3 of these at a time; each shadow wanders within 1 tile of its spot, ripple when it turns; hide while it rains (route1_storm style variants)')

# --- #12 ambient: Thornwood pond fish ---
m = _M['thornwood']
m.soul = dict(ambient=dict(fish_spots=_water_spots(m, [(26, 6), (25, 7), (27, 7)]), fish_tile='fish_shadow', ripple_tile='fish_ripple',
    rule='show 1 at a time in this small pond'))
FOOTPRINTS = dict(tiles={s: {d: f'footprint_{s}_{d}' for d in ('up', 'down', 'left', 'right')} for s in ('snow', 'sand', 'mud')},
    ground_prefixes=dict(snow=['snow', 'xs_snow', 'x_snow'], sand=['sand', 'x_sand'], mud=['mud', 'xs_mud', 'x_mud']),
    rule='when the player (or a following creature) leaves a cell whose ground tile name starts with one of these prefixes, spawn the matching footprint decal; '
         'decals fade (3 frames x 1333 ms) and are removed after ~4 s; at most 24 alive; not while biking (bike leaves none)')

# --- #14 Lantern Rest: small sky-lit glade off greystone_entrance (west wall tunnel at row 11) ---
g = _M['greystone_entrance']
g.rect(0, 11, 2, 11, 'cave')
g.warp(0, 11, 'lantern_rest', 7, 12, 'up', 'side tunnel to Lantern Rest (memorial glade)')

m = Map('lantern_rest', 16, 15, title='Lantern Rest'); MAPS.append(m)
border(m)
m.trees(2, 2, 2, 3); m.trees(13, 2, 13, 3); m.trees(2, 12, 3, 12); m.trees(12, 12, 13, 12)
m.clear(7, 13, 7, 14); m.rect(7, 13, 7, 14, 'trail')        # entry gap in the south tree wall
m.rect(6, 6, 9, 12, 'trail'); m.rect(7, 5, 8, 5, 'trail')
m.warp(7, 14, 'greystone_entrance', 1, 11, 'right', 'back through the tunnel')
STONES = [('stone_1', 4, 4, 'a'), ('stone_2', 6, 3, 'b'), ('stone_3', 9, 3, 'c'), ('stone_4', 11, 4, 'a'),
          ('stone_5', 3, 7, 'c'), ('stone_6', 12, 7, 'b'), ('stone_7', 4, 10, 'b'), ('stone_8', 11, 10, 'c')]
m.signs_pending = []; m.npcs_pending = []; m.source = 'tools/maps.py (soul pass, Lantern Rest)'
for sid, x, y, sh in STONES:
    m.deco[y][x] = f'memorial_stone_{sh}'
    m.signs_pending.append(dict(id=sid, x=x, y=y, text='epitaph: a person + a creature, warm and specific (Text Bot; Story Bot checks tone)', tile=f'memorial_stone_{sh}'))
m.deco[3][7] = 'memorial_stone_blank'; m.deco[3][8] = 'keeper_lantern'
for x, y in ((5, 6), (10, 6)): m.deco[y][x] = 'keeper_lantern'
for x, y, k in ((3, 5, 'flowers_warm'), (12, 5, 'flowers_violet'), (5, 11, 'flowers_violet'), (10, 11, 'flowers_warm'), (9, 8, 'flowers_warm'), (5, 8, 'flowers_violet')):
    if k: m.deco[y][x] = k
m.npcs_pending.append(dict(id='keeper', x=9, y=5, facing='down', kind='villager_elder',
    note='Lantern Rest keeper with a Gloamtick lantern ("the spark of my old friend"). No battle. After field_team_home: "Didn\'t need it. Best kind of stone to lose."'))
m.signs_pending.append(dict(id='stone_blank', x=7, y=3, text='uncarved stone: "for the field team, until they come home" (spoken by the keeper; the stone itself has no carving)', tile='memorial_stone_blank'))
m.soul = dict(flag_swaps=[dict(x=7, y=3, layer='decoration', before='memorial_stone_blank', after='memorial_bench', flag='field_team_home',
                              note='only map change after the reunion (STORY_RULINGS_SOUL #14); text_ref maps.lantern_rest.stone_blank switches to the bench line')],
              mood=dict(battles=False, wild_encounters=False, music='Home motif on music box, slowed and fragmented, whole bars of silence', light='warm, quiet; sky-lit glade, not spooky'),
              note='Signs/keeper are in signs_pending_text / npcs_pending_text until Text Bot adds maps.lantern_rest.* keys.')

# ================= Text Bot v0.4.0: wall windows, handcar, named interact spots =================
# interact_spots are written by run.py as a top-level "interact_spots" list in each map JSON.
# x,y = the cell the player faces; stand = where the player stands; text = Text Bot key (overworld_lines.json maps.<map>.<id>).
def _spot(map_, id_, x, y, stand, face, tile, kind='prop', **kw):
    return dict(id=id_, kind=kind, x=x, y=y, stand=list(stand), face=face, tile=tile, text=f'maps.{map_}.{id_}', **kw)
WINDOWS = {'house_1f': [4, 8], 'house_2f': [3, 7], 'house_int_a': [6], 'house_int_b': [6, 9], 'house_int_c': [3, 8]}
for mn, xs in WINDOWS.items():
    m = _M[mn]; m.interact_spots = []
    for i, x in enumerate(xs, 1):
        assert m.deco[1][x] is None and m.deco[2][x] is None and m.deco[3][x] is None, (mn, x)
        m.deco[1][x] = 'window_day_t'; m.deco[2][x] = 'window_day_b'
        m.interact_spots.append(_spot(mn, f'window_{i}', x, 2, (x, 3), 'up', 'window_',
            states_by_phase={ph: f'window_{ph}_b' for ph in ('dawn', 'day', 'dusk', 'night')},
            note='wall window (rows 1-2). Engine swaps window_<phase>_t/_b to the current time_of_day phase; text = prop_templates.window lines'))
SPOTS = {
 'house_1f': [_spot('house_1f', 'tv', 7, 3, (7, 4), 'up', 'tv'),
              _spot('house_1f', 'door_block', 5, 9, (5, 8), 'down', 'door_mat', note="Coder's front-door block for the start sequence: player at (5,8) facing down onto the exit warp (5,9); text maps.house_1f.door_block (Text Bot)")],
 'house_int_c': [_spot('house_int_c', 'tv', 6, 3, (6, 4), 'up', 'tv')],
 'house_2f': [_spot('house_2f', 'pc', 4, 3, (4, 4), 'up', 'pc', opens='company_inbox'),
              _spot('house_2f', 'bed', 1, 3, (2, 3), 'left', 'bed', note='Yes/No prompt: sleep / dream (Text Bot)')],
 'office_int': [_spot('office_int', 'bookcase', 8, 2, (8, 3), 'up', 'bookcase'),
                _spot('office_int', 'water_cooler', 12, 2, (12, 3), 'up', 'cooler'),
                _spot('office_int', 'crystal_display', 14, 2, (14, 3), 'up', 'crystal_display', counter='office_display_taps'),
                _spot('office_int', 'dana_desk', 12, 8, (12, 9), 'up', 'desk_pc', note="Dana's desk (Text Bot proposal, World confirms: the desk_pc at 12,8)")],
 'house_int_b': [_spot('house_int_b', 'bookcase_left', 1, 2, (1, 3), 'up', 'bookcase'),
                 _spot('house_int_b', 'bookcase_right', 3, 2, (3, 3), 'up', 'bookcase')],
 'heal_centre_int': [_spot('heal_centre_int', 'sofa', 1, 7, (1, 8), 'up', 'sofa')],
 'brookhollow': [_spot('brookhollow', 'bin_ron', 7, 8, (6, 8), 'right', 'bin_ron', states='map.bin_stages'),
                 _spot('brookhollow', 'bridge_mid', 23, 12, (23, 12), 'up', 'bridge_h', kind='trigger',
                       trigger_when=dict(phase='dusk', standing_still_s=10, facing='up', lead_type='water'), note='walk-on trigger, not an inspect; fires once per dusk')],
}
for mn, sp in SPOTS.items(): _M[mn].interact_spots = getattr(_M[mn], 'interact_spots', []) + sp

def apply_v040_imported(maps):
    """station_int comes from maps_new (biome worker, read-only): add the handcar after import, never in maps_new."""
    for m in maps:
        if m.name != 'station_int': continue
        G, D, O, C, E = m.pre
        assert m.deco[3][19].startswith('x_rail_buffer') and m.deco[3][18] is None
        m.deco[3][18] = 'handcar_locked'; D[3][18] = BYNAME['handcar_locked']['id']; C[3][18] = max(C[3][18], 1)
        m.interact_spots = [_spot('station_int', 'rail_buffer', 19, 3, (19, 4), 'up', 'x_rail_buffer',
            world_prop=dict(tile='handcar_locked', x=18, y=3, states={'locked': 'handcar_locked', 'new_padlock': 'handcar_new_padlock'},
                            state_rule='new_padlock after beat_master_frostspire (E8 line); always locked + empty'))]

# ================= Text Bot v0.4.1: ids for the 5 signs that were pending Text Bot ids =================
# Each one is a real 'sign' tile (blocking), listed in the map's signs AND in interact_spots (same spot rules as v0.4.0).
SIGNS_V041 = [  # map, id, sign cell, stand cell, face, dev label (final text = overworld_lines.json maps.<map>.<id>)
 ('route1', 'sign_r1_ledge', (22, 17), (22, 18), 'up', 'Fernwick, via the pond meadow'),
 ('thornwood', 'sign_tw_junction', (21, 8), (22, 8), 'left', 'Greystone (north) / Fernwick (west, ledges)'),
 ('thornwood', 'sign_tw_east', (19, 24), (19, 25), 'up', 'Revival Heights (east)'),
 ('brookhollow', 'sign_bh_north', (12, 2), (12, 3), 'up', 'North: Trail 1'),
 ('brookhollow', 'sign_bh_barricade', (29, 11), (29, 12), 'up', 'Road east closed (Revival Tech barricade)'),
]
for mn, sid, (x, y), st, face, label in SIGNS_V041:
    m = _M[mn]
    assert m.deco[y][x] in (None, 'flowers_violet'), (mn, x, y, m.deco[y][x])
    sg(m, sid, x, y, label)
    m.interact_spots = getattr(m, 'interact_spots', []) + [_spot(mn, sid, x, y, st, face, 'sign', kind='sign', note='map sign (also in signs); kind sign = read like a sign, same stand/face/tile checks as a prop')]
