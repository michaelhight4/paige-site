# Batch 1 maps: homes (+2F), marts and heal centres.
from ix_mapkit import Room

REG = {
 'brookhollow':     dict(r='brook',   wall='brook',   floor='oak',     rug='red',    plant='i_plant_flower',    plant2='i_plant_fern', st='wood',
                         props=['i_radio', 'i_barrel'], nice='Brookhollow'),
 'fernwick':        dict(r='fern',    wall='fern',    floor='pine',    rug='sand',   plant='i_plant_mushroom',  plant2='i_plant_fern', st='wood',
                         props=['i_log_stool', 'i_river_stones', 'i_fishing_rods'], nice='Fernwick'),
 'saltmere':        dict(r='salt',    wall='salt',    floor='drift',   rug='teal',   plant='i_plant_coral',     plant2='i_plant_succulent', st='wood',
                         props=['i_anchor', 'i_ship_wheel', 'i_net', 'i_salt_jars', 'i_fishing_rods', 'i_barrel'], nice='Saltmere'),
 'cindervale':      dict(r='cinder',  wall='cinder',  floor='slate',   rug='red',    plant='i_plant_succulent', plant2='i_plant_succulent', st='stone',
                         props=['i_anvil', 'i_tool_rack', 'i_brazier', 'i_ore_cart'], nice='Cindervale'),
 'revival_heights': dict(r='revival', wall='revival', floor='ash',     rug='violet', plant='i_plant_succulent', plant2='i_plant_palm', st='steel',
                         props=['i_terminal', 'i_server_rack', 'i_crystal_display'], nice='Revival Heights'),
 'lanternport':     dict(r='lantern', wall='lantern', floor='parquet', rug='teal',   plant='i_plant_palm',      plant2='i_plant_fern', st='wood',
                         props=['i_globe', 'i_telescope', 'i_crates', 'i_lantern_stand', 'i_barrel'], nice='Lanternport'),
 'aurelith':        dict(r='aurelith', wall='aurelith', floor='marble', rug='violet', plant='i_plant_palm',     plant2='i_plant_flower', st='stone',
                         props=['i_statue', 'i_trophy_case', 'i_banner_aurelith', 'i_pillar_marble'], nice='Aurelith'),
}
# existing exterior doors (read from maps/brookhollow.json, maps/fernwick.json; not edited)
EXISTING = {
 ('brookhollow', 'home_a'): dict(door=[15, 7], now='house_int_a'), ('brookhollow', 'home_b'): dict(door=[28, 19], now='house_int_b'),
 ('fernwick', 'home_a'): dict(door=[16, 18], now='house_int_a'), ('fernwick', 'home_b'): dict(door=[5, 17], now='house_int_b'),
 ('fernwick', 'home_c'): dict(door=[22, 6], now='house_int_c'),
}
PAIRS = []   # rows for INTERIORS.md

def street_exit(rm, town, key, x):
    S = REG[town]
    ex = EXISTING.get((town, key))
    if ex:
        dx, dy = ex['door']
        pw = {'map': town, 'door': key, 'door_xy': [dx, dy], 'status': 'existing door; currently warps to shared %s - re-point to %s' % (ex['now'], rm.id)}
        w = rm.exit_mat(x, S['r'], to=town, tx=dx, ty=dy + 1, pair_with=pw, note='exit to %s (%d,%d)' % (town, dx, dy))
    else:
        pw = {'map': town, 'door': key, 'status': 'planned exterior door (exterior map not built yet)'}
        w = rm.exit_mat(x, S['r'], pair_with=pw, note='exit to the %s street door "%s" (planned)' % (S['nice'], key))
    PAIRS.append(dict(interior=rm.id, warp=[w['x'], w['y']], map=town, door=key, door_xy=(ex or {}).get('door'), arrival=[x, rm.h - 2],
                      status='existing (re-point from %s)' % ex['now'] if ex else 'planned'))
    return w

def M(x, ow, w, mirror):  # mirror helper
    return w - x - ow if mirror else x

# ---------- archetype 1: family home with kitchen + stairs (12x10) ----------
def home_family(town, key, mirror=False, title=''):
    S = REG[town]; r = S['r']; W, Hh = 12, 10
    mid = 'home_%s_%s' % (town, key[-1])
    rm = Room(mid, title or '%s home %s (1F)' % (S['nice'], key[-1].upper()), W, Hh, S['wall'], S['floor'], windows=[M(5, 1, W, mirror), M(8, 1, W, mirror)], region=town)
    f = lambda x, ow=1: M(x, ow, W, mirror)
    rm.put('i_kitchen_fridge', f(1), 1); rm.put('i_kitchen_stove', f(2), 1); rm.put('i_kitchen_sink', f(3), 1)
    rm.put('i_table_' + r, f(2, 2), 5); rm.put('i_chair_' + r, f(2), 6); rm.put('i_chair_' + r, f(3), 6)
    rm.put('i_tv' if r not in ('revival', 'aurelith') else 'i_tv_flat', f(8), 3)
    rm.put('i_sofa_' + r, f(7, 2), 6)
    rm.rug(S['rug'], f(6, 3), 3, 3, 2) if False else None
    rm.put('i_bookcase_' + r, f(6), 1)
    rm.put(S['plant'], f(5), 3); rm.put(S['plant2'], f(0), 3)
    rm.put('i_stairs_up_' + S['st'], f(10), 3)
    rm.put(S['props'][0], f(10), 7)
    mx = f(5)
    street_exit(rm, town, key, mx)
    up = rm.warps[-1]
    rm.c[3][f(10)] = 4
    w = {'x': f(10), 'y': 3, 'to': mid + '_2f', 'tx': (1 if not mirror else 8), 'ty': 4, 'facing': 'down', 'note': 'stairs up'}
    rm.warps.append(w)
    rm.npc(mid + '_parent', f(3), 4, 'down', 'TBD', 'at the kitchen; talks across the table')
    return rm, mid

def home_upstairs(town, key, mirror=False):
    S = REG[town]; r = S['r']; W, Hh = 10, 8
    base = 'home_%s_%s' % (town, key[-1]); mid = base + '_2f'
    rm = Room(mid, '%s home %s (2F)' % (S['nice'], key[-1].upper()), W, Hh, S['wall'], S['floor'], windows=[M(4, 1, W, mirror), M(7, 1, W, mirror)], region=town)
    f = lambda x, ow=1: M(x, ow, W, mirror)
    # stairs down at the same column the 1F arrives to (1F stairs at f1(10); arrive tx 1/8)
    sx = 1 if not mirror else 8
    rm.put('i_stairs_down_' + S['st'], sx, 3); rm.c[3][sx] = 4
    rm.warps.append({'x': sx, 'y': 3, 'to': base, 'tx': (10 if not mirror else 1), 'ty': 4, 'facing': 'down', 'note': 'stairs down'})
    rm.put('i_bed_' + r, f(8), 4); rm.put('i_bed_' + r, f(6), 4)
    rm.put('i_dresser_' + r, f(7), 3) if False else None
    rm.put('i_shelf_' + r, f(3), 3)
    rm.put('i_cupboard_' + r, f(5), 1)
    rm.put('i_pc' if r in ('revival', 'lantern', 'aurelith') else 'i_radio', f(4), 3)
    rm.rug(S['rug'], f(2, 3), 5, 3, 2)
    rm.put(S['plant'] if S['plant'] != 'i_plant_palm' else 'i_plant_fern', f(0), 7)
    rm.item(f(9), 7, 'TBD', 'bedroom find (item TBD by the item worker)')
    rm.npc(base + '_kid', f(5), 6, 'left', 'TBD', 'kid upstairs')
    return rm

# ---------- archetype 2: cottage with hearth (10x8) ----------
def home_cottage(town, key, mirror=False, hobby=None):
    S = REG[town]; r = S['r']; W, Hh = 10, 8
    mid = 'home_%s_%s' % (town, key[-1])
    rm = Room(mid, '%s home %s' % (S['nice'], key[-1].upper()), W, Hh, S['wall'], S['floor'], windows=[M(1, 1, W, mirror), M(8, 1, W, mirror)], region=town)
    f = lambda x, ow=1: M(x, ow, W, mirror)
    rm.put('i_fireplace', f(4, 2), 1)
    rm.put('i_bookcase_' + r, f(2), 1)
    rm.put('i_bed_' + r, f(8), 3)
    rm.put('i_dresser_' + r, f(7), 3)
    rm.put('i_table_small_' + r, f(2), 5); rm.put('i_chair_' + r, f(1), 5)
    rm.rug(S['rug'], f(4, 3), 3, 3, 2)
    rm.put(S['plant'], f(0), 3)
    hobby = hobby or S['props'][1 % len(S['props'])]
    rm.put(hobby, f(8), 6)
    street_exit(rm, town, key, f(5))
    rm.npc(mid + '_owner', f(3), 4, 'down', 'TBD', 'by the hearth')
    return rm, mid

# ---------- archetype 3: hobby / workshop home (12x9) ----------
def home_hobby(town, key, mirror=False):
    S = REG[town]; r = S['r']; W, Hh = 12, 9
    mid = 'home_%s_%s' % (town, key[-1])
    rm = Room(mid, '%s home %s' % (S['nice'], key[-1].upper()), W, Hh, S['wall'], S['floor'], windows=[M(3, 1, W, mirror), M(7, 1, W, mirror)], region=town)
    f = lambda x, ow=1: M(x, ow, W, mirror)
    P = S['props']
    rm.put('i_bed_' + r, f(1), 3); rm.put('i_shelf_' + r, f(2), 3)
    rm.put('i_cupboard_' + r, f(5), 1); rm.put('i_bookcase_' + r, f(9), 1)
    rm.put('i_table_' + r, f(5, 2), 5); rm.put('i_chair_' + r, f(5), 6); rm.put('i_chair_' + r, f(6), 6)
    if r == 'salt':
        rm.put('i_net', f(10), 1); rm.put('i_anchor', f(10), 3); rm.put('i_ship_wheel', f(11), 3); rm.put('i_salt_jars', f(11), 5); rm.put('i_barrel', f(11), 6)
    elif r == 'cinder':
        rm.put('i_tool_rack', f(10), 1); rm.put('i_anvil', f(10), 3); rm.put('i_forge', f(10, 2), 5) if False else rm.put('i_brazier', f(11), 3)
        rm.put('i_ore_cart', f(11), 6)
    elif r == 'revival':
        rm.put('i_server_rack', f(10), 1); rm.put('i_server_rack', f(11), 1); rm.put('i_terminal', f(10), 3); rm.put('i_crystal_display', f(11), 5)
    elif r == 'lantern':
        rm.put('i_lantern_stand', f(11), 3); rm.put('i_globe', f(10), 3); rm.put('i_telescope', f(11), 6); rm.put('i_crates', f(9, 2), 7) if False else None
    elif r == 'aurelith':
        rm.put('i_trophy_case', f(10, 2), 1); rm.put('i_statue', f(11), 5); rm.put('i_pillar_marble', f(10), 5) if False else None
    elif r == 'fern':
        rm.put('i_fishing_rods', f(10), 1); rm.put('i_river_stones', f(10), 4); rm.put('i_log_stool', f(11), 3); rm.put('i_plant_mushroom', f(11), 6)
    else:
        rm.put('i_radio', f(10), 3); rm.put('i_barrel', f(11), 3)
    rm.rug(S['rug'], f(1, 3), 5, 3, 3)
    rm.put(S['plant'], f(4), 3) if r != 'aurelith' else rm.put('i_plant_palm', f(4), 3)
    street_exit(rm, town, key, f(7))
    rm.npc(mid + '_hobbyist', f(9), 4, 'right' if not mirror else 'left', 'TBD', 'regional hobby corner')
    return rm, mid

# ---------- marts ----------
def mart(town, mirror=False, variant=0):
    S = REG[town]; r = S['r']; W, Hh = 12, 9
    mid = 'mart_%s' % town
    rm = Room(mid, '%s RT Supply (mart)' % S['nice'], W, Hh, 'shop', 'shop', windows=[M(4, 1, W, mirror), M(6, 1, W, mirror)], region=town, kind='mart')
    f = lambda x, ow=1: M(x, ow, W, mirror)
    for k, part in enumerate('lmmr'): rm.put('i_counter_shop_' + part, k if not mirror else W - 4 + k, 4)
    for x in (8, 9, 10): rm.put('i_shopshelf_wall', f(x), 1)
    if variant == 0:
        rm.put('i_shopshelf_island', f(6, 2), 4); rm.put('i_shopshelf_island_region', f(6, 2), 6)
    else:
        rm.put('i_shopshelf_island', f(8, 2), 4); rm.put('i_shopshelf_island_region', f(5, 2), 6)
    rm.put(S['plant'], f(11), 7)
    reg_prop = {'salt': 'i_salt_jars', 'cinder': 'i_ore_cart', 'revival': 'i_crystal_display', 'lantern': 'i_lantern_stand', 'aurelith': 'i_statue'}[r]
    rm.put(reg_prop, f(0), 6 if reg_prop not in ('i_crystal_display', 'i_lantern_stand', 'i_statue') else 5)
    rm.put('i_plant_fern', f(5), 3) if variant == 0 else rm.put('i_plant_fern', f(11), 3)
    street_exit(rm, town, 'mart', f(5))
    rm.npc(mid + '_clerk', f(2), 3, 'down', 'clerk', 'mart clerk: talk across the counter from y=5', 'mart.clerk')
    rm.npc(mid + '_shopper', f(9), 5, 'up', 'TBD', 'local shopper with a regional tip')
    rm.sign(f(4), 3, 'stock board (regional goods list)', 'sign.%s.stock' % mid) if False else None
    return rm

# ---------- heal centres ----------
# ---------- Revival Tech branch (heal centre; Gary 2026-10-22: branches are owned by the player's employer) ----------
HEAL_EXISTING = {  # existing exteriors whose door currently warps to the shared maps/heal_centre_int.json (14x10, mats (6,9)+(7,9))
 'brookhollow': dict(door=[6, 19], now='heal_centre_int'), 'fernwick': dict(door=[5, 6], now='heal_centre_int')}
REG_PROP = {'salt': ('i_anchor', 'R7'), 'cinder': ('i_brazier', 'R7'), 'revival': ('i_server_rack', 'L1'), 'lantern': ('i_lantern_stand', 'R6'),
            'aurelith': ('i_banner_aurelith', 'L1'), 'brook': ('i_radio', 'R7'), 'fern': ('i_fishing_rods', 'R7')}

def heal(town, mirror=False):
    """13x9 branch (towns without a heal centre) or 14x10 (Brookhollow/Fernwick: same footprint + warps as heal_centre_int).
    Kept from the pre-restyle layout: size, exit mat(s), arrival tile, carer at (6,3) behind the counter at x4-8,y4."""
    S = REG[town]; r = S['r']
    big = town in HEAL_EXISTING
    W, Hh = (14, 10) if big else (13, 9)
    mid = 'heal_%s' % town
    rm = Room(mid, 'Revival Tech %s branch' % S['nice'], W, Hh, 'rtbranch', 'rtbranch', windows=[1, W - 2], region=town, kind='heal')
    rm.mat = 'i_mat_rtbranch'
    # back wall: posters | crystal-polishing station | logo panel | poster | STAFF door
    rm.put('i_rt_poster_care', 3, 1)
    rm.put('i_crystal_polisher', 5, 1)
    rm.put('i_rt_logo_panel', 7, 1)
    rm.put('i_rt_poster_join', 9, 1)
    rm.put('i_staffdoor_locked', 10, 1)
    rm.put('i_rt_poster_safety', W - 1, 1)
    for x, part in ((4, 'l'), (5, 'm'), (6, 'm'), (7, 'm'), (8, 'r')): rm.put('i_counter_rt_' + part, x, 4)
    rm.put('i_suggestion_box', 3, 3); rm.put('i_newsletter_rack', 9, 3)
    rm.put('i_sofa_' + r, 1, Hh - 3); rm.put(S['plant'], 0, Hh - 3)
    rm.put('i_pc', W - 2, 4)
    prop, where = REG_PROP[r]
    if where == 'L1': rm.put(prop, 2, 1)
    else: rm.put(prop, W - 1, int(where[1:]) + (Hh - 9))
    rm.rug('violet', 5, 5, 3 + (1 if big else 0), 2)
    rm.npc(mid + '_carer', 6, 3, 'down', 'healer', 'Revival Tech branch attendant in company uniform (violet jacket, crystal-mark badge); polishes your team crystals at the station behind; talk across the counter from (6,5)', 'rt_branch.attendant')
    rm.npc(mid + '_technician', 4, 3, 'up', 'rt_staff', 'uniformed polishing technician working the crystal-polishing station; talk across the counter from (4,5)', 'rt_branch.technician')
    rm.npc(mid + '_storage_user', W - 2, 5, 'up', 'TBD', 'using the storage PC (PC at %d,4)' % (W - 2))
    rm.sign(10, 2, 'STAFF ONLY door (locked). Unlocks later via flag rt_backroom_open', 'rt_branch.staff_door_locked')
    rm.sign(3, 3, 'suggestion box: "Tell us how we did!"', 'rt_branch.suggestion_box')
    rm.sign(9, 3, 'newsletter rack: The Revival Tech Bulletin (issue rotates with story progress)', 'rt_branch.newsletter')
    rm.extra['locked_warps'] = [{'x': 10, 'y': 2, 'approach': [10, 3], 'facing': 'up', 'to': 'rt_branch_backroom', 'tx': 4, 'ty': 4,
                                 'locked': True, 'unlock_flag': 'rt_backroom_open', 'collision_when_unlocked': 4,
                                 'note': 'locked STAFF ONLY door. While locked: collision 1 + sign. When unlocked: set collision to 4 and treat as a normal warp; the back room returns here via $return'}]
    rm.extra['branding'] = 'Revival Tech branch (player employer). Restyled 2026-10-22; warps/arrival identical to the pre-restyle layout'
    if big:
        ex = HEAL_EXISTING[town]; dx, dy = ex['door']
        for mx in (6, 7):
            pw = {'map': town, 'door': 'heal', 'door_xy': [dx, dy], 'status': 'existing door; currently warps to shared heal_centre_int - re-point to %s' % mid}
            w = rm.exit_mat(mx, S['r'], to=town, tx=dx, ty=dy + 1, pair_with=pw, note='exit to %s (%d,%d)' % (town, dx, dy))
            PAIRS.append(dict(interior=mid, warp=[mx, Hh - 1], map=town, door='heal', door_xy=[dx, dy], arrival=[mx, Hh - 2], status='existing (re-point from heal_centre_int)'))
    else:
        street_exit(rm, town, 'heal', 6)
    return rm

def backroom():
    rm = Room('rt_branch_backroom', 'Revival Tech branch back room (staff only)', 8, 6, 'rtbranch', 'rtbranch', windows=[], region='revival', kind='heal_backroom')
    rm.mat = 'i_mat_rtbranch'
    rm.put('i_locker', 1, 1); rm.put('i_locker', 2, 1); rm.put('i_rt_poster_safety', 3, 1); rm.put('i_rt_logo_panel', 4, 1); rm.put('i_terminal', 6, 3)
    rm.put('i_crystal_crate', 0, 3); rm.put('i_crystal_crate', 0, 4); rm.put('i_crystal_crate', 7, 4); rm.put('i_newsletter_rack', 7, 3)
    w = rm.exit_mat(4, 'revival', note='back through the STAFF ONLY door into whichever branch the player came from')
    w['pair_with'] = {'map': '<any heal_* branch>', 'door': 'locked_warps[0] (10,2)', 'status': 'shared back room; $return to the branch STAFF door approach (10,3)', 'interior_arrival': [4, 4]}
    rm.npc('rt_backroom_manager', 3, 3, 'down', 'rt_staff', 'branch manager on break (story hook for when the door unlocks)', 'rt_branch.backroom_manager')
    rm.sign(6, 3, 'shift-roster terminal', 'rt_branch.roster')
    rm.item(5, 3, 'TBD_backroom_reward', 'placeholder pick-up for the unlock event')
    rm.extra['unlock_flag'] = 'rt_backroom_open'
    PAIRS.append(dict(interior='rt_branch_backroom', warp=[4, 5], map='heal_* (any branch)', door='STAFF door (10,2)', door_xy=[10, 2], arrival=[4, 4], status='locked until rt_backroom_open'))
    return rm

def build():
    rooms = []
    T = REG
    # Brookhollow (2): replaces the two shared house interiors
    a, _ = home_cottage('brookhollow', 'home_a', mirror=False, hobby='i_radio'); rooms.append(a)
    b, _ = home_family('brookhollow', 'home_b', mirror=True); rooms.append(b); rooms.append(home_upstairs('brookhollow', 'home_b', mirror=True))
    # Fernwick (3)
    a, _ = home_family('fernwick', 'home_a'); rooms += [a, home_upstairs('fernwick', 'home_a')]
    b, _ = home_cottage('fernwick', 'home_b', mirror=True, hobby='i_log_stool'); rooms.append(b)
    c, _ = home_hobby('fernwick', 'home_c'); rooms.append(c)
    # Saltmere (3)
    a, _ = home_hobby('saltmere', 'home_a', mirror=True); rooms.append(a)
    b, _ = home_family('saltmere', 'home_b'); rooms += [b, home_upstairs('saltmere', 'home_b')]
    c, _ = home_cottage('saltmere', 'home_c', hobby='i_ship_wheel'); rooms.append(c)
    # Cindervale (2)
    a, _ = home_hobby('cindervale', 'home_a'); rooms.append(a)
    b, _ = home_family('cindervale', 'home_b', mirror=True); rooms += [b, home_upstairs('cindervale', 'home_b', mirror=True)]
    # Revival Heights (3)
    a, _ = home_family('revival_heights', 'home_a'); rooms += [a, home_upstairs('revival_heights', 'home_a')]
    b, _ = home_hobby('revival_heights', 'home_b', mirror=True); rooms.append(b)
    c, _ = home_cottage('revival_heights', 'home_c', hobby='i_terminal'); rooms.append(c)
    # Lanternport (3)
    a, _ = home_hobby('lanternport', 'home_a'); rooms.append(a)
    b, _ = home_cottage('lanternport', 'home_b', mirror=True, hobby='i_globe'); rooms.append(b)
    c, _ = home_family('lanternport', 'home_c', mirror=True); rooms += [c, home_upstairs('lanternport', 'home_c', mirror=True)]
    # Aurelith (2)
    a, _ = home_family('aurelith', 'home_a'); rooms += [a, home_upstairs('aurelith', 'home_a')]
    b, _ = home_hobby('aurelith', 'home_b', mirror=True); rooms.append(b)
    # marts and heal centres where missing (Brookhollow + Fernwick already have shop_int / heal_centre_int)
    for i, t in enumerate(('saltmere', 'cindervale', 'revival_heights', 'lanternport', 'aurelith')):
        rooms.append(mart(t, mirror=bool(i % 2), variant=(i // 2) % 2))
        rooms.append(heal(t, mirror=bool((i + 1) % 2)))
    rooms += [heal('brookhollow'), heal('fernwick'), backroom()]
    return rooms
