"""Town world fill + town inspectables + side-activity spots (Coder, Oct 30 2026).
Reads data/textbot_world_fill.json sections 2-5 and the TOWN_INSPECT / SIDE_SPOTS tables below; writes map JSON
(npcs, interact_spots, 1x1 prop tiles) and text/overworld_lines.json. Idempotent: an id that is already placed is skipped.
Strict grid: every new prop is ONE whole 1x1 tile on a plain square whose 8 neighbours are free (so no one-square gap
can close), the stand square below stays walkable, and reach() from every warp/exit must not lose a square."""
import json, sys, os
sys.path.insert(0, os.path.dirname(__file__))
from maplib import *
HERE = os.path.dirname(__file__)
D = json.load(open(os.path.join(HERE, '../../data/textbot_world_fill.json')))
LP = os.path.join(HERE, '../../text/overworld_lines.json'); L = json.load(open(LP))
MAPS = {}
def M(n): return MAPS.setdefault(n, load(n))
REPORT = []
PH = 'PLACEHOLDER (Coder, Oct 30 2026): Text Bot replaces, see data/textbot_requests_side_activities.md'

PROP_TILE = {  # Text Bot prop id -> 1x1 tile (whole square)
  'lanternport_notice_board': 'x_city_notice', 'lanternport_keeper_log_case': 'club_counter_case',
  'lanternport_signal_crate_1': 'i_crystal_crate', 'lanternport_signal_crate_2': 'i_crystal_crate', 'lanternport_net_rack': 'i_net',
  'cindervale_anvil_statue': 'i_anvil', 'cindervale_foundry_board': 'i_sign_board', 'cindervale_ore_cart': 'i_ore_cart',
  'cindervale_tool_shelf': 'i_tool_rack', 'cindervale_kiln': 'barrel',
  'mirefen_tide_board': 'i_sign_board', 'mirefen_stilt_marks': 'sign', 'mirefen_frog_statue': 'x_city_statue',
  'mirefen_boot_rack': 'i_shelf_salt', 'mirefen_net_shelf': 'i_net',
}

def bound(m):
    return {(c['x'], c['y']) for k in ('signs', 'interact_spots') for c in m.get(k) or []}

def place_prop(mn, pid, sx, sy, tile, reuse=None):
    """Reuse an unbound solid `reuse`/`tile` tile at (sx,sy) with a walkable stand below, else a new prop near it."""
    m = M(mn); P = protected_cells(m); col = m['layers']['collision']
    nm = BYID.get(m['layers']['decoration'][sy][sx], {}).get('name')
    if nm in {tile, reuse} - {None} and (sx, sy) not in bound(m) and col[sy][sx] == 1 and col[sy + 1][sx] == 0 and (sx, sy + 1) not in P:
        return sx, sy, f'reused {nm}'
    before = reach(m)
    pos = find_open(m, sx, sy, P) or find_open(m, sx, sy, P, r=14)
    assert pos, (mn, pid)
    x, y = pos; put_prop(m, x, y, tile)
    lost = before - reach(m) - {(x, y)}; assert not lost, (pid, lost)
    return x, y, f'placed {tile}'

def add_spot(mn, sid, x, y, extra=None, stand=None, face='up'):
    m = M(mn)
    if any(s['id'] == sid for s in m.get('interact_spots') or []): return False
    st = stand or [x, y + 1]
    sp = {'id': sid, 'kind': 'prop', 'x': x, 'y': y, 'stand': st, 'face': face, 'tile': BYID[m['layers']['decoration'][y][x]]['name'], 'text': f'maps.{mn}.{sid}'}
    sp.update(extra or {})
    m.setdefault('interact_spots', []).append(sp); return True

def set_lines(mn, sid, pages, again=None, extra=None):
    L['maps'].setdefault(mn, {})[sid] = spot_lines(pages, again, extra)

# ---- 2) Town NPCs ---------------------------------------------------------------------------------------------
for n in D['section2_town_npcs']:
    mn = n['map']; m = M(mn)
    if not any(d['id'] == n['id'] for d in m.get('npcs') or []):
        P = protected_cells(m) | {(d['x'], d['y']) for d in (m.get('npcs') or []) + ((m.get('text_pending') or {}).get('npcs') or [])}
        sx, sy = n['suggested']
        pos = (sx, sy) if inside(m, sx, sy) and all(plain(m, sx + a, sy + b, P) for a in (-1, 0, 1) for b in (-1, 0, 1)) else (find_open(m, sx, sy, P) or find_open(m, sx, sy, P, r=14))
        assert pos, n['id']
        m['npcs'].append({'id': n['id'], 'x': pos[0], 'y': pos[1], 'facing': 'down', 'kind': 'townsfolk', 'note': n['note'], 'text_ref': f"overworld_lines.json maps.{mn}.{n['id']}"})
        REPORT.append(('npc', mn, n['id'], pos))
    set_lines(mn, n['id'], n['pages'], n.get('after'), {'name': n['name'], 'kind': 'townsfolk', '_src': 'data/textbot_world_fill.json section2 (Text Bot)'})

# ---- 3) Town props ----------------------------------------------------------------------------------------------
for p in D['section3_town_props']:
    mn = p['map']; m = M(mn)
    if not any(s['id'] == p['id'] for s in m.get('interact_spots') or []):
        x, y, how = place_prop(mn, p['id'], p['suggested']['x'], p['suggested']['y'], PROP_TILE[p['id']])
        add_spot(mn, p['id'], x, y, {'group': 'town_inspect'}); REPORT.append(('prop', mn, p['id'], (x, y), how))
    set_lines(mn, p['id'], p['inspect'], extra={'kind': 'prop', '_src': 'data/textbot_world_fill.json section3 (Text Bot)'})

# ---- 4) Lanternport 1F lighthouse guide + 5) hall after-lines (old text kept as *_old) ---------------------------
g = D['section4_lanternport_guide']; e = L['maps'][g['map']][g['id']]
e.update(spot_lines(g['pages'], g['pages_again'])); e['pages_old'] = g['pages_old']; e['_src'] = 'data/textbot_world_fill.json section4 (Text Bot)'
for h in D['section5_hall_fixes']:
    e = L['maps'][h['map']][h['id']]
    if 'pages' in h: e.update(spot_lines(h['pages'])); e['pages_old'] = h['pages_old']
    else: e['after'] = h['after']; e['after_2'] = h['after_2']; e['after_old'] = h['after_old']
    e['_src'] = 'data/textbot_world_fill.json section5 (Text Bot)'

# ---- Town inspectables (Gen 1-5 town pattern: sign/notice, bin, bookshelf, TV/radio, notes) -------------------------
# (town, map, id, how, placeholder pages). how: ('tile', name) = existing furniture tile; ('new', tile, anchor_x, anchor_y)
TOWN_INSPECT = [
 ('brookhollow', 'brookhollow', 'brookhollow_notice', ('new', 'x_city_notice', 30, 24), ['NOTICE: "Lost: one red scarf.\nAsk at the office."']),
 ('brookhollow', 'brookhollow', 'brookhollow_bin_2', ('new', 'x_city_bin', 22, 30), ['A bin. Somebody\'s old shopping list:\n"Bread. Milk. Courage."']),
 ('brookhollow', 'home_brookhollow_a', 'brookhollow_a_bookcase', ('tile', 'i_bookcase_brook_1_0'), ['Picture books, a road atlas and\n"Creatures of the Valley".']),
 ('brookhollow', 'home_brookhollow_a', 'brookhollow_a_radio', ('tile', 'i_radio'), ['The radio crackles: "...and a\nsunny week across the valley..."']),
 ('brookhollow', 'home_brookhollow_b', 'brookhollow_b_bookcase', ('tile', 'i_bookcase_brook_1_0'), ['Cookbooks. One is just called\n"Soup, and Why".']),
 ('fernwick', 'fernwick', 'fernwick_notice', ('new', 'x_city_notice', 30, 24), ['FERNWICK NOTICES: "Hall open\ndaily. Please wipe your boots."']),
 ('fernwick', 'fernwick', 'fernwick_bin', ('new', 'x_city_bin', 20, 20), ['A bin full of fern clippings.\nIt smells like rain.']),
 ('fernwick', 'home_fernwick_a', 'fernwick_a_bookcase', ('tile', 'i_bookcase_fern_1_0'), ['Field guides to mosses.\nAll of them well thumbed.']),
 ('fernwick', 'home_fernwick_c', 'fernwick_c_bookcase', ('tile', 'i_bookcase_fern_1_0'), ['Fishing diaries, one per year.\nThe fish get bigger every year.']),
 ('fernwick', 'home_fernwick_c', 'fernwick_c_shelf', ('tile', 'i_shelf_fern'), ['A shelf of jars: fishing hooks,\nbuttons, and one very old biscuit.']),
 ('saltmere', 'saltmere', 'saltmere_notice', ('new', 'x_city_notice', 30, 22), ['SALTMERE NOTICES: "Salt pans\nclosed Tuesdays for raking."']),
 ('saltmere', 'saltmere', 'saltmere_bin', ('new', 'x_city_bin', 34, 30), ['A bin. Salt crusts the lid.\nEverything here is a bit salty.']),
 ('saltmere', 'home_saltmere_a', 'saltmere_a_wheel', ('tile', 'i_ship_wheel'), ['An old ship\'s wheel.\nIt still turns, a little stiffly.']),
 ('saltmere', 'home_saltmere_a', 'saltmere_a_jars', ('tile', 'i_salt_jars'), ['Jars of salt, each labelled\nwith the year it was raked.']),
 ('saltmere', 'saltmere_office_int', 'saltmere_office_bookcase', ('tile', 'bookcase_*'), ['Binders: "Staff Rota",\n"More Staff Rota", "Rota (OLD)".']),
 ('frostspire', 'frostspire', 'frostspire_notice', ('new', 'x_city_notice', 33, 27), ['FROSTSPIRE NOTICES: "Skylift runs\nin all weather. Mostly."']),
 ('frostspire', 'frostspire', 'frostspire_bin', ('new', 'x_city_bin', 22, 30), ['A bin, frozen shut.\nIt will open in spring.']),
 ('frostspire', 'frostspire', 'frostspire_barrel', ('tile', 'barrel'), ['A barrel of grit for the paths.\nSomeone has drawn a face on it.']),
 ('frostspire', 'frostspire_office_int', 'frostspire_office_bookcase', ('tile', 'bookcase_*'), ['Snow reports, filed by year.\nEvery one says "a lot".']),
 ('mirefen', 'mirefen', 'mirefen_bin', ('new', 'x_city_bin', 28, 26), ['A bin with a heavy stone on the\nlid. The ducks know why.']),
 ('lanternport', 'home_lanternport_a', 'lanternport_a_bookcase', ('tile', 'i_bookcase_lantern_1_0'), ['Sea charts and a book of knots.\nThe page for "bowline" is torn.']),
 ('cindervale', 'home_cindervale_a', 'cindervale_a_tool_rack', ('tile', 'i_tool_rack'), ['Pokers and tongs for the fire.\nAll polished. All warm.']),
]

def find_tile_spot(m, name):
    col = m['layers']['collision']; P = protected_cells(m) | bound(m)
    for y, r in enumerate(m['layers']['decoration']):
        for x, v in enumerate(r):
            nm_ = BYID.get(v, {}).get('name') or ''
            if not (nm_ == name or (name.endswith('*') and nm_.startswith(name[:-1]))) or (x, y) in P or col[y][x] != 1: continue
            for dx, dy, face in ((0, 1, 'up'), (-1, 0, 'right'), (1, 0, 'left')):
                sx, sy = x + dx, y + dy
                if 0 <= sy < len(col) and 0 <= sx < len(col[0]) and col[sy][sx] in PASS and (sx, sy) not in P: return x, y, [sx, sy], face
    raise SystemExit(f'no {name} on {m["name"]}')

for town, mn, sid, how, pages in TOWN_INSPECT:
    m = M(mn)
    if not any(s['id'] == sid for s in m.get('interact_spots') or []):
        st, face = None, 'up'
        if how[0] == 'tile': x, y, st, face = find_tile_spot(m, how[1]); h = f'existing {how[1]}'
        else: x, y, h = place_prop(mn, sid, how[2], how[3], how[1])
        add_spot(mn, sid, x, y, {'group': 'town_inspect', 'town': town}, st, face); REPORT.append(('inspect', mn, sid, (x, y), h))
    if sid not in L['maps'].get(mn, {}): set_lines(mn, sid, pages, extra={'kind': 'prop', 'status': PH})
# section3 props belong to their town too
for p in D['section3_town_props']:
    for s in M(p['map'])['interact_spots']:
        if s['id'] == p['id']: s['town'] = p['map']

# ---- Side-activity spots (src/side) ---------------------------------------------------------------------------------
SIDE = [  # (map, id, activity, step, how)
 ('fernwick', 'side_letters_1', 'fern_letters', 'letter', ('cell', 38, 14)),
 ('fernwick', 'side_letters_2', 'fern_letters', 'letter', ('cell', 22, 15)),
 ('fernwick', 'side_letters_3', 'fern_letters', 'letter', ('cell', 20, 25)),
 ('fernwick', 'side_letters_box', 'fern_letters', 'turn_in', ('new', 'i_suggestion_box', 28, 22)),
 ('frostspire', 'side_frost_lamp_1', 'frost_lamps', 'lamp', ('cell', 11, 25)),
 ('frostspire', 'side_frost_lamp_2', 'frost_lamps', 'lamp', ('cell', 19, 25)),
 ('frostspire', 'side_frost_lamp_3', 'frost_lamps', 'lamp', ('cell', 11, 28)),
 ('frostspire', 'side_frost_lamp_4', 'frost_lamps', 'lamp', ('cell', 38, 28)),
 ('saltmere', 'side_tide_quiz', 'salt_tide_quiz', 'board', ('new', 'i_sign_board', 22, 22)),
 ('cindervale', 'side_ore_weigh', 'cinder_ore_weigh', 'cart', ('cell', 40, 27)),
]
for mn, sid, act, step, how in SIDE:
    m = M(mn)
    if any(s['id'] == sid for s in m.get('interact_spots') or []): continue
    if how[0] == 'cell':
        x, y = how[1], how[2]; assert m['layers']['collision'][y][x] == 1 and m['layers']['collision'][y + 1][x] in PASS and (x, y) not in bound(m), sid; h = 'existing ' + BYID[m['layers']['decoration'][y][x]]['name']
    else: x, y, h = place_prop(mn, sid, how[2], how[3], how[1])
    add_spot(mn, sid, x, y, {'kind': 'side', 'side': act, 'step': step, 'text': f'side.{act}'}); REPORT.append(('side', mn, sid, (x, y), h))

for mn, m in MAPS.items(): save(mn, m)
open(LP, 'w').write(json.dumps(L, indent=1, ensure_ascii=False) + '\n')
for r in REPORT: print(*r)
